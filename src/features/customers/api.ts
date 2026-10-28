import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { Customer, CustomerFilterParams } from './types';
import { recordAuditLogToDb } from '@/features/audit/api';
import { getDemoCustomers } from './demoData';

// In-memory cache for offline operations and newly created records, initialized with realistic demo data
let localCustomersCache: Customer[] = getDemoCustomers('admin_demo');

export function seedDemoCustomers(adminUid: string): Customer[] {
  localCustomersCache = getDemoCustomers(adminUid || 'admin_demo');
  return localCustomersCache;
}

/**
 * Strips all undefined fields recursively to prevent Firestore validation failures.
 */
function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      clean[key] = cleanForFirestore(value);
    }
  }
  return clean as T;
}

export async function fetchCustomers(
  adminUid: string,
  params?: CustomerFilterParams
): Promise<Customer[]> {
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  if (!effectiveUid) {
    return applyFilters(localCustomersCache, params);
  }

  try {
    const custRef = collection(db, 'users', effectiveUid, 'customers');
    const q = query(custRef, where('isDeleted', '==', false), orderBy('fullName', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const customers: Customer[] = [];
      snapshot.forEach((d) => customers.push(d.data() as Customer));

      // Keep in-memory cache synchronized with remote records
      const remoteMap = new Map<string, Customer>();
      customers.forEach((c) => remoteMap.set(c.id, c));
      localCustomersCache.forEach((c) => {
        if (!remoteMap.has(c.id)) remoteMap.set(c.id, c);
      });
      localCustomersCache = Array.from(remoteMap.values());

      return applyFilters(localCustomersCache, params);
    }
    return applyFilters(localCustomersCache, params);
  } catch (e: any) {
    console.warn('[Customers API] Cloud fetch failed, serving from local cache:', e?.message || e);
  }

  return applyFilters(localCustomersCache, params);
}

function applyFilters(list: Customer[], params?: CustomerFilterParams): Customer[] {
  let filtered = list.filter((c) => !c.isDeleted);

  if (params?.search) {
    const s = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (c) =>
        c.fullName.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.address.city.toLowerCase().includes(s)
    );
  }

  if (params?.status && params.status !== 'ALL') {
    if (params.status === 'OVERDUE_ONLY') {
      filtered = filtered.filter((c) => c.totals.overdueAmount > 0);
    } else {
      filtered = filtered.filter((c) => c.status === params.status);
    }
  }

  if (params?.city) {
    filtered = filtered.filter((c) => c.address.city.toLowerCase() === params.city?.toLowerCase());
  }

  if (params?.tag) {
    filtered = filtered.filter((c) => c.tags.includes(params.tag!));
  }

  if (params?.sortBy) {
    switch (params.sortBy) {
      case 'outstanding':
        filtered.sort((a, b) => b.totals.totalOutstanding - a.totals.totalOutstanding);
        break;
      case 'risk':
        filtered.sort((a, b) => (a.creditScoreInternal || 50) - (b.creditScoreInternal || 50));
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
        break;
    }
  }

  return filtered;
}

export async function fetchCustomerById(adminUid: string, customerId: string): Promise<Customer | null> {
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  if (effectiveUid) {
    try {
      const docRef = doc(db, 'users', effectiveUid, 'customers', customerId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Customer;
      }
    } catch (e: any) {
      console.warn('[Customers API] Cloud fetch by ID failed, trying local cache:', e?.message || e);
    }
  }

  const found = localCustomersCache.find((c) => c.id === customerId);
  return found || null;
}

export async function checkDuplicatePhone(adminUid: string, phone: string): Promise<Customer | null> {
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  const clean = phone.replace(/\D/g, '').slice(-10);

  if (effectiveUid) {
    try {
      const custRef = collection(db, 'users', effectiveUid, 'customers');
      const q = query(custRef, where('isDeleted', '==', false));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as Customer;
        if (data.phone && data.phone.replace(/\D/g, '').slice(-10) === clean) {
          return data;
        }
      }
    } catch (e: any) {
      // fallback to cache
    }
  }

  const found = localCustomersCache.find((c) => c.phone.replace(/\D/g, '').slice(-10) === clean);
  return found || null;
}

export async function createCustomer(
  adminUid: string,
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>
): Promise<Customer> {
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  const newId = `cust-${Date.now()}`;
  const now = new Date().toISOString();

  const newCustomer: Customer = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
    createdBy: effectiveUid,
    isDeleted: false,
  };

  const firestoreData = cleanForFirestore(newCustomer);

  if (effectiveUid) {
    try {
      const docRef = doc(db, 'users', effectiveUid, 'customers', newId);
      await setDoc(docRef, firestoreData);
      console.info(
        `[Customers API] Successfully stored borrower "${newCustomer.fullName}" in Firestore: /users/${effectiveUid}/customers/${newId}`
      );
    } catch (e: any) {
      console.error(`[Customers API] Failed to write customer ${newId} to Firestore:`, e?.code || e?.message || e);
      if (e?.code === 'permission-denied') {
        console.warn(
          `[Customers API] Firestore PERMISSION_DENIED: User is not authenticated with Firebase Auth or uid does not match "${effectiveUid}". Please check Firebase Console -> Authentication & Firestore Rules.`
        );
      }
    }
  } else {
    console.warn(
      '[Customers API] No Firebase Auth UID available (adminUid is empty). Customer preserved in local memory cache.'
    );
  }

  localCustomersCache.unshift(newCustomer);

  recordAuditLogToDb(effectiveUid, {
    id: `audit-${Date.now()}`,
    who: effectiveUid,
    action: 'CREATE',
    entityType: 'CUSTOMER',
    entityId: newId,
    summary: `Registered new borrower ${newCustomer.fullName} (Phone: ${newCustomer.phone}) in ${newCustomer.address?.city || 'Tamil Nadu'}`,
    timestamp: now,
    after: {
      fullName: newCustomer.fullName,
      phone: newCustomer.phone,
      city: newCustomer.address?.city,
      address: `${newCustomer.address?.line1 || ''}, ${newCustomer.address?.city || ''}`,
      occupation: newCustomer.occupation,
      monthlyIncomePaise: newCustomer.monthlyIncome,
      kycType: newCustomer.idProofs?.[0]?.type || 'Aadhaar',
      registeredDate: now.split('T')[0],
    },
    metadata: {
      source: 'Admin Portal',
    },
  }).catch(() => {});

  return newCustomer;
}

export async function updateCustomer(adminUid: string, customerId: string, updates: Partial<Customer>): Promise<Customer> {
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  const now = new Date().toISOString();
  const mergedUpdates = { ...updates, updatedAt: now };
  const cleanUpdates = cleanForFirestore(mergedUpdates);

  if (effectiveUid) {
    try {
      const docRef = doc(db, 'users', effectiveUid, 'customers', customerId);
      await updateDoc(docRef, cleanUpdates);
      console.info(`[Customers API] Successfully updated customer ${customerId} in Firestore`);
    } catch (e: any) {
      console.error(`[Customers API] Failed to update customer ${customerId} in Firestore:`, e?.code || e?.message || e);
    }
  }

  const index = localCustomersCache.findIndex((c) => c.id === customerId);
  if (index >= 0) {
    localCustomersCache[index] = { ...localCustomersCache[index], ...mergedUpdates };
    return localCustomersCache[index];
  }

  throw new Error('Customer not found');
}

export async function softDeleteCustomer(adminUid: string, customerId: string): Promise<void> {
  await updateCustomer(adminUid, customerId, { isDeleted: true });
}
