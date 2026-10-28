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
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { Loan, LoanFilterParams } from './types';
import { ScheduleInstallment } from '@/lib/finance/types';
import { calculateLoanSchedule } from '@/lib/finance/schedule';
import { recordAuditLogToDb } from '@/features/audit/api';

// In-memory cache for offline operations and newly created loans
let localLoansCache: Loan[] = [];

let localSchedulesCache: Record<string, ScheduleInstallment[]> = {};

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

export async function fetchLoans(adminUid: string, params?: LoanFilterParams): Promise<Loan[]> {
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  if (!effectiveUid) return filterLoans(localLoansCache, params);

  try {
    const loanRef = collection(db, 'users', effectiveUid, 'loans');
    const q = query(loanRef, where('isDeleted', '==', false), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const loans: Loan[] = [];
      snapshot.forEach((d) => loans.push(d.data() as Loan));
      
      const remoteMap = new Map<string, Loan>();
      loans.forEach((l) => remoteMap.set(l.id, l));
      localLoansCache.forEach((l) => {
        if (!remoteMap.has(l.id)) remoteMap.set(l.id, l);
      });
      localLoansCache = Array.from(remoteMap.values());

      return filterLoans(localLoansCache, params);
    }
    return filterLoans(localLoansCache, params);
  } catch (e: any) {
    console.warn('[Loans API] Cloud fetch failed, serving from local cache:', e?.message || e);
  }

  return filterLoans(localLoansCache, params);
}

function filterLoans(list: Loan[], params?: LoanFilterParams): Loan[] {
  let filtered = list.filter((l) => !l.isDeleted);

  if (params?.customerId) {
    filtered = filtered.filter((l) => l.customerId === params.customerId);
  }

  if (params?.status && params.status !== 'ALL') {
    if (params.status === 'ACTIVE_OR_OVERDUE') {
      filtered = filtered.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
    } else {
      filtered = filtered.filter((l) => l.status === params.status);
    }
  }

  if (params?.category) {
    filtered = filtered.filter((l) => l.category === params.category);
  }

  if (params?.search) {
    const s = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (l) =>
        l.loanNumber.toLowerCase().includes(s) ||
        l.customerName.toLowerCase().includes(s) ||
        l.title.toLowerCase().includes(s)
    );
  }

  return filtered;
}

export async function fetchLoanById(adminUid: string, loanId: string): Promise<Loan | null> {
  try {
    const docRef = doc(db, 'users', adminUid, 'loans', loanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Loan;
    }
  } catch (e) {
    // offline
  }

  const found = localLoansCache.find((l) => l.id === loanId);
  return found || null;
}

export async function fetchLoanSchedule(adminUid: string, loanId: string): Promise<ScheduleInstallment[]> {
  if (localSchedulesCache[loanId]) {
    return localSchedulesCache[loanId];
  }

  const loan = await fetchLoanById(adminUid, loanId);
  if (!loan) return [];

  // Generate schedule using the calculation engine
  const preview = calculateLoanSchedule({
    principal: loan.principal,
    interestType: loan.interestType,
    interestRate: loan.interestRate,
    ratePeriod: loan.ratePeriod,
    compounding: loan.compounding,
    disbursedOn: loan.disbursedOn,
    firstDueDate: loan.firstDueDate,
    tenureValue: loan.tenure.value,
    tenureUnit: loan.tenure.unit,
    repaymentFrequency: loan.repaymentFrequency,
    upfrontDeduction: loan.upfrontDeduction,
    advanceInterestDeducted: loan.advanceInterestDeducted,
  });

  localSchedulesCache[loanId] = preview.schedule;
  return preview.schedule;
}

export async function createLoanWithSchedule(
  adminUid: string,
  data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>,
  schedule: ScheduleInstallment[]
): Promise<Loan> {
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  const newId = `ln-${Date.now()}`;
  const now = new Date().toISOString();

  const newLoan: Loan = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
    createdBy: effectiveUid,
    isDeleted: false,
  };

  const firestoreLoan = cleanForFirestore(newLoan);

  if (effectiveUid) {
    try {
      const loanDoc = doc(db, 'users', effectiveUid, 'loans', newId);
      await setDoc(loanDoc, firestoreLoan);

      // Save schedule subcollection
      for (const inst of schedule) {
        const instDoc = doc(db, 'users', effectiveUid, 'loans', newId, 'schedule', `inst-${inst.installmentNo}`);
        await setDoc(instDoc, cleanForFirestore(inst));
      }
      console.info(`[Loans API] Stored loan ${newLoan.loanNumber} in Firestore at /users/${effectiveUid}/loans/${newId}`);
    } catch (e: any) {
      console.error(`[Loans API] Failed to write loan ${newId} to Firestore:`, e?.code || e?.message || e);
    }
  } else {
    console.warn('[Loans API] No Firebase Auth UID found. Loan saved in local memory cache.');
  }

  localLoansCache.unshift(newLoan);
  localSchedulesCache[newId] = schedule;

  // Record audit log for loan disbursement
  recordAuditLogToDb(effectiveUid, {
    id: `audit-${Date.now()}`,
    who: effectiveUid,
    action: 'CREATE',
    entityType: 'LOAN',
    entityId: newId,
    summary: `Disbursed loan ${newLoan.loanNumber} (${newLoan.category}) of ₹${(newLoan.principal / 100).toLocaleString('en-IN')} to ${newLoan.customerName}`,
    timestamp: now,
    after: {
      loanNumber: newLoan.loanNumber,
      customerName: newLoan.customerName,
      category: newLoan.category,
      principalPaise: newLoan.principal,
      interestRate: newLoan.interestRate,
      tenure: newLoan.tenure,
      disbursedOn: newLoan.disbursedOn,
      firstDueDate: newLoan.firstDueDate,
      maturityDate: newLoan.maturityDate,
      installmentAmountPaise: newLoan.installmentAmount,
      totalPayablePaise: newLoan.totalPayable,
    },
    metadata: {
      upfrontDeductionPaise: newLoan.upfrontDeduction,
      repaymentFrequency: newLoan.repaymentFrequency,
    },
  }).catch(() => {});

  return newLoan;
}

export async function updateLoan(
  adminUid: string,
  loanId: string,
  updates: Partial<Loan>
): Promise<Loan> {
  const now = new Date().toISOString();
  const merged = { ...updates, updatedAt: now };

  try {
    const loanDoc = doc(db, 'users', adminUid, 'loans', loanId);
    await updateDoc(loanDoc, merged);
  } catch (e) {
    // offline
  }

  const idx = localLoansCache.findIndex((l) => l.id === loanId);
  if (idx >= 0) {
    localLoansCache[idx] = { ...localLoansCache[idx], ...merged };
    return localLoansCache[idx];
  }
  throw new Error('Loan not found');
}
