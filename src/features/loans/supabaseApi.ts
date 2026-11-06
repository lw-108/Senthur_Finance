import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/supabase/activeOrg';
import { Loan, LoanFilterParams } from './types';
import { ScheduleInstallment } from '@/lib/finance/types';
import { calculateLoanSchedule } from '@/lib/finance/schedule';
import { recordAuditLog } from '@/features/audit/supabaseApi';

let localLoansCache: Loan[] = [];
let localSchedulesCache: Record<string, ScheduleInstallment[]> = {};

export function seedDemoLoans(_adminUid: string): Loan[] {
  return localLoansCache;
}

export function loanRowToDomain(row: any): Loan {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    loanNumber: row.loan_number,
    title: row.title,
    category: row.category,
    principal: Number(row.principal_minor_units),
    currency: row.currency_code || 'INR',
    interestType: row.interest_type,
    interestRate: Number(row.interest_rate),
    ratePeriod: row.rate_period,
    compounding: row.compounding,
    repaymentFrequency: row.repayment_frequency,
    disbursedOn: row.disbursed_on,
    firstDueDate: row.first_due_date,
    tenure: {
      value: row.tenure_value,
      unit: row.tenure_unit,
    },
    maturityDate: row.maturity_date,
    installmentAmount: Number(row.installment_amount_minor_units),
    numberOfInstallments: row.number_of_installments,
    upfrontDeduction: Number(row.upfront_deduction_minor_units || 0),
    advanceInterestDeducted: Boolean(row.advance_interest_deducted),
    effectiveAnnualRate: row.effective_annual_rate ? Number(row.effective_annual_rate) : undefined,
    penalty: row.penalty_config || {},
    collateral: row.collateral || {},
    proofs: Array.isArray(row.proofs) ? row.proofs : [],
    witnesses: Array.isArray(row.witnesses) ? row.witnesses : [],
    status: row.status,
    outstandingPrincipal: Number(row.outstanding_principal_minor_units || 0),
    accruedInterest: Number(row.accrued_interest_minor_units || 0),
    totalPayable: Number(row.total_payable_minor_units || 0),
    totalPaid: Number(row.total_paid_minor_units || 0),
    nextDueDate: row.next_due_date || undefined,
    daysOverdue: Number(row.days_overdue || 0),
    penaltyAccrued: Number(row.penalty_accrued_minor_units || 0),
    progressPercent: Number(row.progress_percent || 0),
    closedOn: row.closed_on || undefined,
    notes: row.notes || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || '',
    isDeleted: Boolean(row.is_deleted),
  };
}

export function loanDomainToRow(l: Partial<Loan>, orgId: string, userId?: string | null): any {
  const row: Record<string, any> = {
    organization_id: orgId,
  };

  if (l.customerId !== undefined) {
    row.customer_id = isValidUUID(l.customerId) ? l.customerId : null;
  }
  if (l.customerName !== undefined) row.customer_name = l.customerName;
  if (l.loanNumber !== undefined) row.loan_number = l.loanNumber;
  if (l.title !== undefined) row.title = l.title;
  if (l.category !== undefined) row.category = l.category;
  if (l.principal !== undefined) row.principal_minor_units = Math.round(l.principal);
  if (l.currency !== undefined) row.currency_code = l.currency;
  if (l.interestType !== undefined) row.interest_type = l.interestType;
  if (l.interestRate !== undefined) row.interest_rate = l.interestRate;
  if (l.ratePeriod !== undefined) row.rate_period = l.ratePeriod;
  if (l.compounding !== undefined) row.compounding = l.compounding;
  if (l.repaymentFrequency !== undefined) row.repayment_frequency = l.repaymentFrequency;
  if (l.disbursedOn !== undefined) row.disbursed_on = l.disbursedOn.split('T')[0];
  if (l.firstDueDate !== undefined) row.first_due_date = l.firstDueDate.split('T')[0];
  if (l.tenure?.value !== undefined) row.tenure_value = l.tenure.value;
  if (l.tenure?.unit !== undefined) row.tenure_unit = l.tenure.unit;
  if (l.maturityDate !== undefined) row.maturity_date = l.maturityDate.split('T')[0];
  if (l.installmentAmount !== undefined) row.installment_amount_minor_units = Math.round(l.installmentAmount);
  if (l.numberOfInstallments !== undefined) row.number_of_installments = l.numberOfInstallments;
  if (l.upfrontDeduction !== undefined) row.upfront_deduction_minor_units = Math.round(l.upfrontDeduction);
  if (l.advanceInterestDeducted !== undefined) row.advance_interest_deducted = l.advanceInterestDeducted;
  if (l.effectiveAnnualRate !== undefined) row.effective_annual_rate = l.effectiveAnnualRate;
  if (l.penalty !== undefined) row.penalty_config = l.penalty;
  if (l.collateral !== undefined) row.collateral = l.collateral;
  if (l.proofs !== undefined) row.proofs = l.proofs;
  if (l.witnesses !== undefined) row.witnesses = l.witnesses;
  if (l.status !== undefined) row.status = l.status;
  if (l.outstandingPrincipal !== undefined) row.outstanding_principal_minor_units = Math.round(l.outstandingPrincipal);
  if (l.accruedInterest !== undefined) row.accrued_interest_minor_units = Math.round(l.accruedInterest);
  if (l.totalPayable !== undefined) row.total_payable_minor_units = Math.round(l.totalPayable);
  if (l.totalPaid !== undefined) row.total_paid_minor_units = Math.round(l.totalPaid);
  if (l.nextDueDate !== undefined) row.next_due_date = l.nextDueDate ? l.nextDueDate.split('T')[0] : null;
  if (l.daysOverdue !== undefined) row.days_overdue = l.daysOverdue;
  if (l.penaltyAccrued !== undefined) row.penalty_accrued_minor_units = Math.round(l.penaltyAccrued);
  if (l.progressPercent !== undefined) row.progress_percent = l.progressPercent;
  if (l.closedOn !== undefined) row.closed_on = l.closedOn ? l.closedOn.split('T')[0] : null;
  if (l.notes !== undefined) row.notes = l.notes;
  if (l.tags !== undefined) row.tags = l.tags;
  if (l.isDeleted !== undefined) row.is_deleted = l.isDeleted;
  if (userId) row.created_by = isValidUUID(userId) ? userId : null;

  return row;
}

export async function fetchLoans(
  _adminUid?: string,
  params?: LoanFilterParams
): Promise<Loan[]> {
  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      let query = supabase
        .from('loans')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (params?.customerId) {
        query = query.eq('customer_id', params.customerId);
      }

      if (params?.status && params.status !== 'ALL') {
        if (params.status === 'ACTIVE_OR_OVERDUE') {
          query = query.in('status', ['ACTIVE', 'OVERDUE']);
        } else {
          query = query.eq('status', params.status);
        }
      }

      if (params?.category) {
        query = query.eq('category', params.category);
      }

      const { data, error } = await query;
      if (!error && data) {
        let domainList = data.map(loanRowToDomain);
        if (params?.search) {
          const s = params.search.toLowerCase().trim();
          domainList = domainList.filter(
            (l) =>
              l.customerName.toLowerCase().includes(s) ||
              l.loanNumber.toLowerCase().includes(s) ||
              l.category.toLowerCase().includes(s)
          );
        }
        return domainList;
      }
    } catch (e) {
      console.warn('[Loans Supabase] Query failed, serving local cache:', e);
    }
  }

  // Fallback to local cache
  let list = localLoansCache.filter((l) => !l.isDeleted);
  if (params?.customerId) {
    list = list.filter((l) => l.customerId === params.customerId);
  }
  if (params?.status && params.status !== 'ALL') {
    if (params.status === 'ACTIVE_OR_OVERDUE') {
      list = list.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
    } else {
      list = list.filter((l) => l.status === params.status);
    }
  }
  if (params?.category) {
    list = list.filter((l) => l.category === params.category);
  }
  if (params?.search) {
    const s = params.search.toLowerCase().trim();
    list = list.filter(
      (l) =>
        l.customerName.toLowerCase().includes(s) ||
        l.loanNumber.toLowerCase().includes(s) ||
        l.category.toLowerCase().includes(s)
    );
  }
  return list;
}

export async function fetchLoanById(_adminUid: string, loanId: string): Promise<Loan | null> {
  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('organization_id', orgId)
        .eq('id', loanId)
        .maybeSingle();

      if (!error && data) {
        return loanRowToDomain(data);
      }
    } catch {}
  }

  return localLoansCache.find((l) => l.id === loanId) || null;
}

export async function fetchLoanSchedule(adminUid: string, loanId: string): Promise<ScheduleInstallment[]> {
  if (localSchedulesCache[loanId]) {
    return localSchedulesCache[loanId];
  }

  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      const { data, error } = await supabase
        .from('loan_schedules')
        .select('*')
        .eq('organization_id', orgId)
        .eq('loan_id', loanId)
        .order('installment_number', { ascending: true });

      if (!error && data && data.length > 0) {
        const schedule: ScheduleInstallment[] = data.map((d: any) => ({
          installmentNo: d.installment_number,
          dueDate: d.due_date,
          openingBalance: 0,
          principalDue: Number(d.principal_due_minor_units),
          interestDue: Number(d.interest_due_minor_units),
          penaltyDue: 0,
          totalDue: Number(d.total_due_minor_units),
          closingBalance: 0,
          remainingPrincipalBalance: 0,
          status: d.status as any,
          paidDate: d.paid_date || undefined,
          paidAmount: Number(d.paid_amount_minor_units || 0),
        }));
        localSchedulesCache[loanId] = schedule;
        return schedule;
      }
    } catch {}
  }

  const loan = await fetchLoanById(adminUid, loanId);
  if (!loan) return [];

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

export async function createLoan(
  adminUid: string,
  loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>,
  scheduleInstallments?: ScheduleInstallment[]
): Promise<Loan> {
  const orgId = await getActiveOrganizationId();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const rowData = loanDomainToRow(loanData, orgId, userId);
      const { data: inserted, error } = await (supabase.from('loans') as any)
        .insert(rowData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const domain = loanRowToDomain(inserted);

      // Insert amortization schedule installments if provided
      if (scheduleInstallments && scheduleInstallments.length > 0) {
        const scheduleRows = scheduleInstallments.map((inst, index) => ({
          organization_id: orgId,
          loan_id: domain.id,
          installment_number: Math.round(inst.installmentNo || index + 1),
          due_date: (inst.dueDate || now).split('T')[0],
          principal_due_minor_units: Math.round(inst.principalDue || 0),
          interest_due_minor_units: Math.round(inst.interestDue || 0),
          total_due_minor_units: Math.round(inst.totalDue || 0),
          status: inst.status || 'PENDING',
        }));

        await (supabase.from('loan_schedules') as any).insert(scheduleRows);
        localSchedulesCache[domain.id] = scheduleInstallments;
      }

      // Record any uploaded proofs in the documents table
      if (domain.proofs && domain.proofs.length > 0) {
        const docRows = domain.proofs.map((proof) => ({
          organization_id: orgId,
          customer_id: isValidUUID(domain.customerId) ? domain.customerId : null,
          loan_id: isValidUUID(domain.id) ? domain.id : null,
          storage_path: proof.storagePath || proof.url,
          original_filename: proof.title || 'LoanProof',
          content_type: proof.mime || 'image/jpeg',
          size_bytes: proof.sizeBytes || null,
          kind: proof.kind || 'LoanProof',
          uploaded_by: isValidUUID(userId) ? userId : null,
        }));
        await (supabase.from('documents') as any).insert(docRows);
      }

      // Audit trail
      await recordAuditLog({
        organizationId: orgId,
        actorUserId: isValidUUID(userId) ? userId : undefined,
        action: 'CREATE',
        entityType: 'LOAN',
        entityId: isValidUUID(domain.id) ? domain.id : undefined,
        summary: `Disbursed new ${domain.category} loan #${domain.loanNumber} to ${domain.customerName} for ₹${(domain.principal / 100).toLocaleString('en-IN')}`,
        after: {
          loanNumber: domain.loanNumber,
          customerName: domain.customerName,
          principalPaise: domain.principal,
          category: domain.category,
        },
        metadata: {
          customerId: domain.customerId,
          customerName: domain.customerName,
          loanId: domain.id,
          loanNumber: domain.loanNumber,
        },
      });

      localLoansCache.unshift(domain);
      return domain;
    } catch (e: any) {
      console.error('[Loans Supabase] createLoan error:', e?.message || e);
    }
  }

  // Fallback offline mock creation
  const mockId = `loan-${Date.now()}`;
  const mockLoan: Loan = {
    ...loanData,
    id: mockId,
    createdAt: now,
    updatedAt: now,
    createdBy: userId || 'local_user',
    isDeleted: false,
  };

  await recordAuditLog({
    action: 'CREATE',
    entityType: 'LOAN',
    entityId: mockId,
    summary: `Disbursed new ${mockLoan.category} loan #${mockLoan.loanNumber} to ${mockLoan.customerName} for ₹${(mockLoan.principal / 100).toLocaleString('en-IN')}`,
    after: {
      loanNumber: mockLoan.loanNumber,
      customerName: mockLoan.customerName,
      principalPaise: mockLoan.principal,
      category: mockLoan.category,
    },
    metadata: {
      customerId: mockLoan.customerId,
      customerName: mockLoan.customerName,
      loanId: mockLoan.id,
      loanNumber: mockLoan.loanNumber,
    },
  });
  localLoansCache.unshift(mockLoan);
  if (scheduleInstallments) {
    localSchedulesCache[mockId] = scheduleInstallments;
  }
  return mockLoan;
}

export async function createLoanWithSchedule(
  adminUid: string,
  loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>,
  schedule: ScheduleInstallment[]
): Promise<Loan> {
  return createLoan(adminUid, loanData, schedule);
}

export async function updateLoan(
  _adminUid: string,
  loanId: string,
  updates: Partial<Loan>
): Promise<Loan> {
  const orgId = await getActiveOrganizationId();
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const rowUpdates = loanDomainToRow(updates, orgId);
      rowUpdates.updated_at = now;

      const { data: updated, error } = await (supabase.from('loans') as any)
        .update(rowUpdates)
        .eq('organization_id', orgId)
        .eq('id', loanId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const domain = loanRowToDomain(updated);
      const idx = localLoansCache.findIndex((l) => l.id === loanId);
      if (idx >= 0) localLoansCache[idx] = domain;
      return domain;
    } catch (e: any) {
      console.error('[Loans Supabase] updateLoan error:', e?.message || e);
    }
  }

  const idx = localLoansCache.findIndex((l) => l.id === loanId);
  if (idx >= 0) {
    localLoansCache[idx] = { ...localLoansCache[idx], ...updates, updatedAt: now };
    return localLoansCache[idx];
  }
  throw new Error('Loan not found');
}

export async function softDeleteLoan(adminUid: string, loanId: string): Promise<void> {
  await updateLoan(adminUid, loanId, { isDeleted: true });
}
