import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { Payment, AuditLog, RecordPaymentInput } from './types';
import { fetchLoanById, updateLoan } from '@/features/loans/api';
import { fetchCustomerById, updateCustomer } from '@/features/customers/api';
import { allocatePaymentWaterfall } from '@/lib/finance/waterfall';
import { recordAuditLogToDb } from '@/features/audit/api';

// In-memory cache for offline operations and newly created payments
let localPaymentsCache: Payment[] = [];

let localAuditLogs: AuditLog[] = [];

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

export async function fetchPayments(adminUid: string, loanId?: string): Promise<Payment[]> {
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  if (!effectiveUid) return localPaymentsCache;

  try {
    const payRef = collection(db, 'users', effectiveUid, 'payments');
    let q = query(payRef, where('isDeleted', '==', false), orderBy('paidOn', 'desc'));
    if (loanId) {
      q = query(payRef, where('loanId', '==', loanId), where('isDeleted', '==', false), orderBy('paidOn', 'desc'));
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list: Payment[] = [];
      snap.forEach((d) => list.push(d.data() as Payment));
      return list;
    }
    return [];
  } catch (e) {
    // offline
  }

  if (loanId) {
    return localPaymentsCache.filter((p) => p.loanId === loanId);
  }
  return localPaymentsCache;
}

export async function recordPaymentTransaction(
  adminUid: string,
  input: RecordPaymentInput
): Promise<{ payment: Payment; updatedLoan: any }> {
  const loan = await fetchLoanById(adminUid, input.loanId);
  if (!loan) {
    throw new Error('Loan account not found');
  }

  // Waterfall Allocation: default order Penalty -> Interest -> Principal
  const interestDueEstimate = Math.round((loan.outstandingPrincipal * (loan.interestRate / 100)) / 12);
  const allocation = allocatePaymentWaterfall(
    input.amountPaise,
    loan.penaltyAccrued,
    interestDueEstimate,
    loan.outstandingPrincipal
  );

  const currentYear = new Date().getFullYear();
  const receiptNum = `REC-${currentYear}-${String(localPaymentsCache.length + 1001).padStart(4, '0')}`;
  const now = new Date().toISOString();
  const paymentId = `pay-${Date.now()}`;

  const paymentDoc: Payment = {
    id: paymentId,
    loanId: loan.id,
    customerId: loan.customerId,
    customerName: loan.customerName,
    loanNumber: loan.loanNumber,
    receiptNumber: receiptNum,
    amount: input.amountPaise,
    paidOn: input.paidOn || now,
    mode: input.mode,
    referenceNo: input.referenceNo,
    allocation: {
      penalty: allocation.allocatedPenalty,
      interest: allocation.allocatedInterest,
      principal: allocation.allocatedPrincipal,
    },
    type: 'INSTALLMENT',
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUid,
    isDeleted: false,
  };

  // Update loan balances
  const newOutstanding = allocation.remainingPrincipal;
  const newTotalPaid = loan.totalPaid + input.amountPaise;
  const newProgress = Math.min(100, Math.round((newTotalPaid / loan.totalPayable) * 100));
  const newPenalty = Math.max(0, loan.penaltyAccrued - allocation.allocatedPenalty);

  const updatedLoan = await updateLoan(adminUid, loan.id, {
    outstandingPrincipal: newOutstanding,
    totalPaid: newTotalPaid,
    progressPercent: newProgress,
    penaltyAccrued: newPenalty,
    daysOverdue: newOutstanding === 0 ? 0 : loan.daysOverdue,
    status: newOutstanding === 0 ? 'CLOSED' : loan.status,
  });

  // Update customer totals
  try {
    const customer = await fetchCustomerById(adminUid, loan.customerId);
    if (customer) {
      await updateCustomer(adminUid, customer.id, {
        totals: {
          ...customer.totals,
          totalOutstanding: Math.max(0, customer.totals.totalOutstanding - allocation.allocatedPrincipal),
          totalPaid: customer.totals.totalPaid + input.amountPaise,
          overdueAmount: Math.max(0, customer.totals.overdueAmount - input.amountPaise),
        },
      });
    }
  } catch (e) {
    // ignore
  }

  // Comprehensive Audit Log Entry
  const auditEntry: any = {
    id: `audit-${Date.now()}`,
    who: adminUid,
    action: 'PAYMENT',
    entityType: 'PAYMENT',
    entityId: paymentId,
    summary: `Collected repayment of ₹${(input.amountPaise / 100).toLocaleString('en-IN')} (${input.mode}) for ${loan.loanNumber} from ${loan.customerName}`,
    before: {
      outstandingPrincipalPaise: loan.outstandingPrincipal,
      penaltyAccruedPaise: loan.penaltyAccrued,
    },
    after: {
      receiptNumber: paymentDoc.receiptNumber,
      amountPaise: input.amountPaise,
      amountFormatted: `₹${(input.amountPaise / 100).toLocaleString('en-IN')}`,
      paymentMode: input.mode,
      paidOn: input.paidOn,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      newOutstandingPaise: newOutstanding,
      allocation: {
        penaltyPaise: allocation.allocatedPenalty,
        interestPaise: allocation.allocatedInterest,
        principalPaise: allocation.allocatedPrincipal,
      },
    },
    metadata: {
      referenceNo: input.referenceNo || 'N/A',
      notes: input.notes || 'Routine collection',
    },
    timestamp: now,
  };
  const effectiveUid = adminUid || auth.currentUser?.uid || '';
  localAuditLogs.unshift(auditEntry);
  recordAuditLogToDb(effectiveUid, auditEntry).catch(() => {});

  if (effectiveUid) {
    try {
      const payRef = doc(db, 'users', effectiveUid, 'payments', paymentId);
      await setDoc(payRef, cleanForFirestore(paymentDoc));

      const auditRef = doc(db, 'users', effectiveUid, 'auditLogs', auditEntry.id);
      await setDoc(auditRef, cleanForFirestore(auditEntry));
      console.info(`[Payments API] Recorded payment ${paymentId} in Firestore at /users/${effectiveUid}/payments/${paymentId}`);
    } catch (e: any) {
      console.error(`[Payments API] Failed to write payment ${paymentId} to Firestore:`, e?.code || e?.message || e);
    }
  } else {
    console.warn('[Payments API] No Firebase Auth UID found. Payment saved in local cache.');
  }

  localPaymentsCache.unshift(paymentDoc);
  return { payment: paymentDoc, updatedLoan };
}
