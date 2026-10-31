import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/supabase/activeOrg';
import { Customer, CustomerFilterParams } from './types';
import { recordAuditLog } from '@/features/audit/supabaseApi';
import { secureStorage } from '@/lib/storage/secureStorage';

const LOCAL_CUSTOMERS_KEY = 'sf_local_customers_cache_v2';

// In-memory cache for fast UI updates & offline fallback
let localCustomersCache: Customer[] = [];
let isCacheLoaded = false;

async function ensureLocalCacheLoaded() {
  if (isCacheLoaded) return;
  try {
    const raw = await secureStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localCustomersCache = parsed;
      }
    }
  } catch {}
  isCacheLoaded = true;
}

async function persistLocalCache() {
  try {
    await secureStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(localCustomersCache));
  } catch {}
}

export function seedDemoCustomers(_adminUid: string): Customer[] {
  return localCustomersCache;
}

export function customerRowToDomain(row: any): Customer {
  return {
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname || undefined,
    phone: row.phone,
    altPhone: row.alt_phone || undefined,
    email: row.email || undefined,
    whatsapp: row.whatsapp || undefined,
    photoUrl: row.photo_url || undefined,
    gender: row.gender || undefined,
    dob: row.dob || undefined,
    occupation: row.occupation || undefined,
    monthlyIncome: Number(row.monthly_income_paise || 0),
    address: row.address || { line1: '', city: '', state: '', pincode: '' },
    idProofs: Array.isArray(row.id_proofs) ? row.id_proofs : [],
    references: Array.isArray(row.customer_references) ? row.customer_references : [],
    guarantor: row.guarantor || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || undefined,
    rating: row.rating || undefined,
    creditScoreInternal: row.credit_score_internal || undefined,
    totals: row.totals || {
      activeLoans: 0,
      totalLent: 0,
      totalOutstanding: 0,
      totalPaid: 0,
      overdueAmount: 0,
    },
    status: row.status || 'Active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || '',
    isDeleted: Boolean(row.is_deleted),
  };
}

export function customerDomainToRow(c: Partial<Customer>, orgId: string, userId?: string | null): any {
  const row: Record<string, any> = {
    organization_id: orgId,
  };

  if (c.fullName !== undefined) row.full_name = c.fullName;
  if (c.nickname !== undefined) row.nickname = c.nickname;
  if (c.phone !== undefined) row.phone = c.phone;
  if (c.altPhone !== undefined) row.alt_phone = c.altPhone;
  if (c.email !== undefined) row.email = c.email;
  if (c.whatsapp !== undefined) row.whatsapp = c.whatsapp;
  if (c.photoUrl !== undefined) row.photo_url = c.photoUrl;
  if (c.gender !== undefined) row.gender = c.gender;
  if (c.dob !== undefined) row.dob = c.dob;
  if (c.occupation !== undefined) row.occupation = c.occupation;
  if (c.monthlyIncome !== undefined) row.monthly_income_paise = c.monthlyIncome;
  if (c.address !== undefined) row.address = c.address;
  if (c.idProofs !== undefined) row.id_proofs = c.idProofs;
  if (c.references !== undefined) row.customer_references = c.references;
  if (c.guarantor !== undefined) row.guarantor = c.guarantor;
  if (c.tags !== undefined) row.tags = c.tags;
  if (c.notes !== undefined) row.notes = c.notes;
  if (c.rating !== undefined) row.rating = c.rating;
  if (c.creditScoreInternal !== undefined) row.credit_score_internal = c.creditScoreInternal;
  if (c.status !== undefined) row.status = c.status;
  if (c.totals !== undefined) row.totals = c.totals;
  if (c.isDeleted !== undefined) row.is_deleted = c.isDeleted;
  if (userId) row.created_by = isValidUUID(userId) ? userId : null;

  return row;
}

export async function fetchCustomers(
  _adminUid?: string,
  params?: CustomerFilterParams
): Promise<Customer[]> {
  await ensureLocalCacheLoaded();

  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      let query = supabase
        .from('customers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_deleted', false)
        .order('full_name', { ascending: true });

      if (params?.search) {
        const s = params.search.trim();
        query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%`);
      }

      if (params?.status && params.status !== 'ALL') {
        if (params.status !== 'OVERDUE_ONLY') {
          query = query.eq('status', params.status);
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        let domainList = data.map(customerRowToDomain);
        if (domainList.length > 0) {
          // Merge Supabase records with local cache
          localCustomersCache = domainList;
          persistLocalCache();
        }

        if (params?.status === 'OVERDUE_ONLY') {
          domainList = domainList.filter((c) => c.totals.overdueAmount > 0);
        }
        if (params?.city) {
          domainList = domainList.filter(
            (c) => c.address?.city?.toLowerCase() === params.city?.toLowerCase()
          );
        }
        if (params?.tag) {
          domainList = domainList.filter((c) => c.tags.includes(params.tag!));
        }

        if (domainList.length > 0 || localCustomersCache.length === 0) {
          return domainList;
        }
      }
    } catch (e) {
      console.warn('[Customers Supabase] Query failed, serving local cache:', e);
    }
  }

  // Fallback to local cache
  return applyLocalFilters(localCustomersCache, params);
}

function applyLocalFilters(list: Customer[], params?: CustomerFilterParams): Customer[] {
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
  return filtered;
}

export async function fetchCustomerById(_adminUid: string, customerId: string): Promise<Customer | null> {
  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('id', customerId)
        .maybeSingle();

      if (!error && data) {
        return customerRowToDomain(data);
      }
    } catch {}
  }

  const found = localCustomersCache.find((c) => c.id === customerId);
  return found || null;
}

export async function checkDuplicatePhone(_adminUid: string, phone: string): Promise<Customer | null> {
  const clean = phone.replace(/\D/g, '').slice(-10);

  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_deleted', false);

      if (!error && data) {
        const match = data.find(
          (c) => c.phone && c.phone.replace(/\D/g, '').slice(-10) === clean
        );
        if (match) return customerRowToDomain(match);
      }
    } catch {}
  }

  const found = localCustomersCache.find(
    (c) => c.phone && c.phone.replace(/\D/g, '').slice(-10) === clean
  );
  return found || null;
}

export async function createCustomer(
  _adminUid: string,
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>
): Promise<Customer> {
  await ensureLocalCacheLoaded();
  const orgId = await getActiveOrganizationId();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const rowData = customerDomainToRow(data, orgId, userId);
      const { data: inserted, error } = await (supabase.from('customers') as any)
        .insert(rowData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const domain = customerRowToDomain(inserted);
      localCustomersCache = [domain, ...localCustomersCache.filter((c) => c.id !== domain.id)];
      await persistLocalCache();

      // Audit trail
      await recordAuditLog({
        organizationId: orgId,
        actorUserId: isValidUUID(userId) ? userId : undefined,
        action: 'CREATE',
        entityType: 'CUSTOMER',
        entityId: isValidUUID(domain.id) ? domain.id : undefined,
        summary: `Registered borrower ${domain.fullName} (Phone: ${domain.phone})`,
        after: {
          fullName: domain.fullName,
          phone: domain.phone,
          city: domain.address?.city,
        },
      });

      return domain;
    } catch (e: any) {
      console.warn('[Customers Supabase] createCustomer error, saving locally:', e?.message || e);
    }
  }

  // Fallback persistent local creation
  const mockId = `cust-${Date.now()}`;
  const mockCust: Customer = {
    ...data,
    id: mockId,
    createdAt: now,
    updatedAt: now,
    createdBy: userId || 'local_user',
    isDeleted: false,
  };
  localCustomersCache.unshift(mockCust);
  await persistLocalCache();
  return mockCust;
}

export async function updateCustomer(
  _adminUid: string,
  customerId: string,
  updates: Partial<Customer>
): Promise<Customer> {
  await ensureLocalCacheLoaded();
  const orgId = await getActiveOrganizationId();
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const rowUpdates = customerDomainToRow(updates, orgId);
      rowUpdates.updated_at = now;

      const { data: updated, error } = await (supabase.from('customers') as any)
        .update(rowUpdates)
        .eq('organization_id', orgId)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const domain = customerRowToDomain(updated);
      const idx = localCustomersCache.findIndex((c) => c.id === customerId);
      if (idx >= 0) {
        localCustomersCache[idx] = domain;
      } else {
        localCustomersCache.unshift(domain);
      }
      await persistLocalCache();
      return domain;
    } catch (e: any) {
      console.error('[Customers Supabase] updateCustomer error:', e?.message || e);
    }
  }

  const index = localCustomersCache.findIndex((c) => c.id === customerId);
  if (index >= 0) {
    localCustomersCache[index] = { ...localCustomersCache[index], ...updates, updatedAt: now };
    await persistLocalCache();
    return localCustomersCache[index];
  }
  throw new Error('Customer not found');
}

export async function softDeleteCustomer(adminUid: string, customerId: string): Promise<void> {
  await updateCustomer(adminUid, customerId, { isDeleted: true });
}

export async function bulkDeleteCustomers(
  _adminUid: string,
  customerIds: string[]
): Promise<void> {
  if (customerIds.length === 0) return;
  await ensureLocalCacheLoaded();
  const orgId = await getActiveOrganizationId();
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { error } = await (supabase.from('customers') as any)
        .update({ is_deleted: true, updated_at: now })
        .eq('organization_id', orgId)
        .in('id', customerIds);

      if (error) {
        throw new Error(error.message);
      }

      localCustomersCache = localCustomersCache.filter((c) => !customerIds.includes(c.id));
      await persistLocalCache();

      await recordAuditLog({
        organizationId: orgId,
        action: 'DELETE',
        entityType: 'CUSTOMER',
        summary: `Group deleted ${customerIds.length} borrower records`,
        metadata: { customerIds, count: customerIds.length },
      });
      return;
    } catch (e: any) {
      console.error('[Customers Supabase] bulkDeleteCustomers error:', e?.message || e);
    }
  }

  localCustomersCache = localCustomersCache.filter((c) => !customerIds.includes(c.id));
  await persistLocalCache();
}

/**
 * Merge and import device phone contacts directly into borrower records.
 * Updates matching phone numbers or adds new borrowers.
 */
export async function batchMergePhoneContacts(
  _adminUid: string,
  contactsToMerge: { name: string; phone: string }[]
): Promise<{ added: number; updated: number }> {
  await ensureLocalCacheLoaded();
  const orgId = await getActiveOrganizationId();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;
  const now = new Date().toISOString();

  let addedCount = 0;
  let updatedCount = 0;

  for (const c of contactsToMerge) {
    const cleanPhone = c.phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) continue;
    const name = c.name?.trim() || 'Borrower';

    // Check if customer already exists by phone
    const existingIndex = localCustomersCache.findIndex(
      (item) => item.phone && item.phone.replace(/\D/g, '').slice(-10) === cleanPhone
    );

    if (existingIndex >= 0) {
      const existing = localCustomersCache[existingIndex];
      const updated: Customer = {
        ...existing,
        fullName: existing.fullName || name,
        updatedAt: now,
      };
      localCustomersCache[existingIndex] = updated;
      updatedCount++;

      if (isSupabaseConfigured() && isValidUUID(existing.id)) {
        try {
          await (supabase.from('customers') as any)
            .update({ full_name: updated.fullName, updated_at: now })
            .eq('id', existing.id)
            .eq('organization_id', orgId);
        } catch {}
      }
    } else {
      const newCustData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'> = {
        fullName: name,
        phone: cleanPhone,
        address: {
          line1: 'Local Address',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641001',
        },
        idProofs: [],
        references: [],
        tags: ['Phone Contact'],
        status: 'Active',
        totals: {
          activeLoans: 0,
          totalLent: 0,
          totalOutstanding: 0,
          totalPaid: 0,
          overdueAmount: 0,
        },
      };

      let insertedDomain: Customer | null = null;
      if (isSupabaseConfigured()) {
        try {
          const rowData = customerDomainToRow(newCustData, orgId, userId);
          const { data: inserted, error } = await (supabase.from('customers') as any)
            .insert(rowData)
            .select()
            .single();

          if (!error && inserted) {
            insertedDomain = customerRowToDomain(inserted);
          }
        } catch {}
      }

      if (!insertedDomain) {
        insertedDomain = {
          ...newCustData,
          id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: now,
          updatedAt: now,
          createdBy: userId || 'local_user',
          isDeleted: false,
        };
      }

      localCustomersCache.unshift(insertedDomain);
      addedCount++;
    }
  }

  await persistLocalCache();
  return { added: addedCount, updated: updatedCount };
}
