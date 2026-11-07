import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase/client';
import { getActiveOrganizationId, DEFAULT_ORG_ID, setActiveOrganizationId } from '@/lib/supabase/activeOrg';
import { Payment, RecordPaymentInput } from './types';
import { fetchLoanById, updateLoan, fetchLoans } from '@/features/loans/supabaseApi';
import { updateCustomer } from '@/features/customers/supabaseApi';
import { allocatePaymentWaterfall } from '@/lib/finance/waterfall';
import { recordAuditLog } from '@/features/audit/supabaseApi';

let localPaymentsCache: Payment[] = [];

export function seedDemoPayments(_adminUid: string): Payment[] {
  return localPaymentsCache;
}

export function paymentRowToDomain(row: any): Payment {
  return {
    id: row.id,
    loanId: row.loan_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    loanNumber: row.loan_number,
    receiptNumber: row.receipt_number,
    amount: Number(row.amount_minor_units),
    paidOn: row.paid_at,
    mode: row.mode,
    referenceNo: row.reference_no || undefined,
    allocation: row.allocation || { penalty: 0, interest: 0, principal: 0 },
    type: row.type || 'INSTALLMENT',
    receiptUrl: row.receipt_url || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || '',
    isDeleted: Boolean(row.is_deleted),
  };
}

export async function fetchPayments(
  _adminUid?: string,
  loanId?: string,
  customerId?: string
): Promise<Payment[]> {
  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      let query = supabase
        .from('payments')
        .select('*')
        .eq('is_deleted', false)
        .order('paid_at', { ascending: false });

      if (orgId && orgId !== DEFAULT_ORG_ID) {
        query = query.eq('organization_id', orgId);
      }

      if (loanId) {
        query = query.eq('loan_id', loanId);
      }
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (!error && data) {
        if (data.length > 0 && (!orgId || orgId === DEFAULT_ORG_ID)) {
          const detectedOrg = data[0].organization_id;
          if (detectedOrg && detectedOrg !== DEFAULT_ORG_ID && isValidUUID(detectedOrg)) {
            setActiveOrganizationId(detectedOrg);
          }
        }
        return data.map(paymentRowToDomain);
      }
    } catch (e) {
      console.warn('[Payments Supabase] Query failed, serving local cache:', e);
    }
  }

  let list = localPaymentsCache.filter((p) => !p.isDeleted);
  if (loanId) list = list.filter((p) => p.loanId === loanId);
  if (customerId) list = list.filter((p) => p.customerId === customerId);
  return list;
}

export async function fetchPaymentById(_adminUid: string, paymentId: string): Promise<Payment | null> {
  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', orgId)
        .eq('id', paymentId)
        .maybeSingle();

      if (!error && data) {
        return paymentRowToDomain(data);
      }
    } catch {}
  }

  return localPaymentsCache.find((p) => p.id === paymentId) || null;
}

export async function recordPaymentTransaction(
  adminUid: string,
  input: RecordPaymentInput
): Promise<{ payment: Payment; updatedLoan: any }> {
  if (input.amountPaise <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const orgId = await getActiveOrganizationId();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;
  const now = new Date().toISOString();

  // 1. Fetch loan
  const loan = await fetchLoanById(adminUid, input.loanId);
  if (!loan) {
    throw new Error(`Loan account not found: ${input.loanId}`);
  }

  // 2. Waterfall Allocation: Penalty -> Interest -> Principal
  const interestDueEstimate = Math.round((loan.outstandingPrincipal * (loan.interestRate / 100)) / 12);
  const allocation = allocatePaymentWaterfall(
    input.amountPaise,
    loan.penaltyAccrued,
    interestDueEstimate,
    loan.outstandingPrincipal
  );

  const currentYear = new Date().getFullYear();
  const receiptNumber = `REC-${currentYear}-${String(localPaymentsCache.length + 1001).padStart(4, '0')}`;
  const paymentId = `pay-${Date.now()}`;

  let domainPayment: Payment;
  let updatedLoan: any = null;

  if (isSupabaseConfigured()) {
    try {
      const rowData = {
        organization_id: orgId,
        loan_id: loan.id,
        customer_id: loan.customerId,
        customer_name: loan.customerName,
        loan_number: loan.loanNumber,
        receipt_number: receiptNumber,
        amount_minor_units: input.amountPaise,
        currency_code: loan.currency || 'INR',
        paid_at: input.paidOn || now,
        mode: input.mode,
        type: 'INSTALLMENT',
        allocation: {
          penalty: allocation.allocatedPenalty,
          interest: allocation.allocatedInterest,
          principal: allocation.allocatedPrincipal,
        },
        reference_no: input.referenceNo || null,
        receipt_url: input.receiptPhotoUri || null,
        notes: input.notes || null,
        is_deleted: false,
        created_by: isValidUUID(userId) ? userId : null,
      };

      const { data: inserted, error } = await (supabase.from('payments') as any)
        .insert(rowData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      domainPayment = paymentRowToDomain(inserted);

      // Record receipt document if present
      if (input.receiptPhotoUri) {
        await (supabase.from('documents') as any).insert({
          organization_id: orgId,
          customer_id: isValidUUID(loan.customerId) ? loan.customerId : null,
          loan_id: isValidUUID(loan.id) ? loan.id : null,
          storage_path: input.receiptPhotoUri,
          original_filename: `Receipt-${receiptNumber}.jpg`,
          content_type: 'image/jpeg',
          kind: 'Receipt',
          uploaded_by: isValidUUID(userId) ? userId : null,
        });
      }

      // Update loan balances
      const newOutstanding = allocation.remainingPrincipal;
      const newTotalPaid = loan.totalPaid + input.amountPaise;
      const newProgress = Math.min(100, Math.round((newTotalPaid / (loan.totalPayable || loan.principal)) * 100));
      const newPenalty = Math.max(0, loan.penaltyAccrued - allocation.allocatedPenalty);
      const isFullyClosed = newOutstanding === 0;

      updatedLoan = await updateLoan(adminUid, loan.id, {
        outstandingPrincipal: newOutstanding,
        totalPaid: newTotalPaid,
        progressPercent: newProgress,
        penaltyAccrued: newPenalty,
        daysOverdue: isFullyClosed ? 0 : loan.daysOverdue,
        status: isFullyClosed ? 'CLOSED' : loan.status,
        closedOn: isFullyClosed ? (input.paidOn || now).split('T')[0] : loan.closedOn,
      });

      // Update customer totals accurately based on all loans
      try {
        const customerLoans = await fetchLoans(adminUid, { customerId: loan.customerId });
        const totalOutstanding = customerLoans
          .filter((l) => l.status !== 'CLOSED' && !l.isDeleted)
          .reduce((sum, l) => sum + l.outstandingPrincipal, 0);
        const totalPaid = customerLoans
          .filter((l) => !l.isDeleted)
          .reduce((sum, l) => sum + l.totalPaid, 0);
        const activeLoans = customerLoans
          .filter((l) => (l.status === 'ACTIVE' || l.status === 'OVERDUE') && !l.isDeleted).length;
        const overdueAmount = customerLoans
          .filter((l) => (l.status === 'OVERDUE' || (l.daysOverdue && l.daysOverdue > 0)) && !l.isDeleted)
          .reduce((sum, l) => sum + l.outstandingPrincipal, 0);
        const totalLent = customerLoans
          .filter((l) => !l.isDeleted)
          .reduce((sum, l) => sum + l.principal, 0);

        await updateCustomer(adminUid, loan.customerId, {
          totals: {
            totalLent,
            totalOutstanding,
            totalPaid,
            activeLoans,
            overdueAmount,
          },
        });
      } catch (err) {
        console.warn('[Payments Supabase] Failed to update customer totals:', err);
      }

      // Record audit event with comprehensive checklist and accurate loan reduction details
      await recordAuditLog({
        organizationId: orgId,
        actorUserId: isValidUUID(userId) ? userId : undefined,
        action: isFullyClosed ? 'SETTLEMENT' : 'PAYMENT',
        entityType: 'PAYMENT',
        entityId: isValidUUID(domainPayment.id) ? domainPayment.id : undefined,
        summary: `Admin collected due of ₹${(input.amountPaise / 100).toLocaleString('en-IN')} (${input.mode}) for ${loan.loanNumber} from ${loan.customerName}`,
        before: {
          customerId: loan.customerId,
          customerName: loan.customerName,
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          outstandingPrincipalPaise: loan.outstandingPrincipal,
          penaltyAccruedPaise: loan.penaltyAccrued,
        },
        after: {
          receiptNumber,
          dueAmountReceivedPaise: input.amountPaise,
          principalReducedPaise: allocation.allocatedPrincipal,
          interestClearedPaise: allocation.allocatedInterest,
          penaltyClearedPaise: allocation.allocatedPenalty,
          newOutstandingPaise: newOutstanding,
          paymentMode: input.mode,
          paidOn: input.paidOn || now,
          referenceNo: input.referenceNo,
          notes: input.notes,
        },
        metadata: {
          customerId: loan.customerId,
          customerName: loan.customerName,
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          receiptNumber,
          mode: input.mode,
          isFullyClosed,
          checklist: {
            dueAmountReceived: true,
            receivedAmountPaise: input.amountPaise,
            principalReducedPaise: allocation.allocatedPrincipal,
            interestAllocatedPaise: allocation.allocatedInterest,
            penaltyAllocatedPaise: allocation.allocatedPenalty,
            loanBalanceReducedAccurately: true,
            previousBalancePaise: loan.outstandingPrincipal,
            updatedRemainingBalancePaise: newOutstanding,
            receiptNumber,
            adminConfirmed: true,
          },
        },
      });

      localPaymentsCache.unshift(domainPayment);
      return { payment: domainPayment, updatedLoan };
    } catch (e: any) {
      console.error('[Payments Supabase] recordPaymentTransaction error:', e?.message || e);
    }
  }

  // Fallback offline mock creation
  const newOutstanding = allocation.remainingPrincipal;
  const newTotalPaid = loan.totalPaid + input.amountPaise;
  const newProgress = Math.min(100, Math.round((newTotalPaid / (loan.totalPayable || loan.principal)) * 100));
  const newPenalty = Math.max(0, loan.penaltyAccrued - allocation.allocatedPenalty);
  const isFullyClosed = newOutstanding === 0;

  updatedLoan = await updateLoan(adminUid, loan.id, {
    outstandingPrincipal: newOutstanding,
    totalPaid: newTotalPaid,
    progressPercent: newProgress,
    penaltyAccrued: newPenalty,
    daysOverdue: isFullyClosed ? 0 : loan.daysOverdue,
    status: isFullyClosed ? 'CLOSED' : loan.status,
  });

  // Update customer totals in offline fallback
  try {
    const customerLoans = await fetchLoans(adminUid, { customerId: loan.customerId });
    const totalOutstanding = customerLoans
      .filter((l) => l.status !== 'CLOSED' && !l.isDeleted)
      .reduce((sum, l) => sum + l.outstandingPrincipal, 0);
    const totalPaid = customerLoans
      .filter((l) => !l.isDeleted)
      .reduce((sum, l) => sum + l.totalPaid, 0);
    const activeLoans = customerLoans
      .filter((l) => (l.status === 'ACTIVE' || l.status === 'OVERDUE') && !l.isDeleted).length;
    const overdueAmount = customerLoans
      .filter((l) => (l.status === 'OVERDUE' || (l.daysOverdue && l.daysOverdue > 0)) && !l.isDeleted)
      .reduce((sum, l) => sum + l.outstandingPrincipal, 0);
    const totalLent = customerLoans
      .filter((l) => !l.isDeleted)
      .reduce((sum, l) => sum + l.principal, 0);

    await updateCustomer(adminUid, loan.customerId, {
      totals: {
        totalLent,
        totalOutstanding,
        totalPaid,
        activeLoans,
        overdueAmount,
      },
    });
  } catch {}

  domainPayment = {
    id: paymentId,
    loanId: loan.id,
    customerId: loan.customerId,
    customerName: loan.customerName,
    loanNumber: loan.loanNumber,
    receiptNumber,
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
    receiptUrl: input.receiptPhotoUri,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
    createdBy: userId || 'local_user',
    isDeleted: false,
  };

  await recordAuditLog({
    action: isFullyClosed ? 'SETTLEMENT' : 'PAYMENT',
    entityType: 'PAYMENT',
    entityId: domainPayment.id,
    summary: `Admin collected due of ₹${(input.amountPaise / 100).toLocaleString('en-IN')} (${input.mode}) for ${loan.loanNumber} from ${loan.customerName}`,
    before: {
      customerId: loan.customerId,
      customerName: loan.customerName,
      loanId: loan.id,
      loanNumber: loan.loanNumber,
      outstandingPrincipalPaise: loan.outstandingPrincipal,
      penaltyAccruedPaise: loan.penaltyAccrued,
    },
    after: {
      receiptNumber,
      dueAmountReceivedPaise: input.amountPaise,
      principalReducedPaise: allocation.allocatedPrincipal,
      interestClearedPaise: allocation.allocatedInterest,
      penaltyClearedPaise: allocation.allocatedPenalty,
      newOutstandingPaise: newOutstanding,
      paymentMode: input.mode,
      paidOn: input.paidOn || now,
      referenceNo: input.referenceNo,
      notes: input.notes,
    },
    metadata: {
      customerId: loan.customerId,
      customerName: loan.customerName,
      loanId: loan.id,
      loanNumber: loan.loanNumber,
      receiptNumber,
      mode: input.mode,
      isFullyClosed,
      checklist: {
        dueAmountReceived: true,
        receivedAmountPaise: input.amountPaise,
        principalReducedPaise: allocation.allocatedPrincipal,
        interestAllocatedPaise: allocation.allocatedInterest,
        penaltyAllocatedPaise: allocation.allocatedPenalty,
        loanBalanceReducedAccurately: true,
        previousBalancePaise: loan.outstandingPrincipal,
        updatedRemainingBalancePaise: newOutstanding,
        receiptNumber,
        adminConfirmed: true,
      },
    },
  });

  localPaymentsCache.unshift(domainPayment);
  return { payment: domainPayment, updatedLoan };
}

export async function recordPayment(
  adminUid: string,
  input: RecordPaymentInput
): Promise<Payment> {
  const result = await recordPaymentTransaction(adminUid, input);
  return result.payment;
}
