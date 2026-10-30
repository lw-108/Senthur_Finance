/**
 * ==============================================================================
 * SENTHUR FINANCE - FIRESTORE TO SUPABASE MIGRATION SCRIPT
 * Multi-Tenant Data Migration, Transformation, and Reconciliation Engine
 * ==============================================================================
 *
 * Usage:
 *   npx ts-node scripts/migrateFirestoreToSupabase.ts --dry-run --data-file=./firestore_export.json
 *   npx ts-node scripts/migrateFirestoreToSupabase.ts --execute --data-file=./firestore_export.json
 *
 * Options:
 *   --dry-run      Run validation and reconciliation without writing to Supabase (Default: true)
 *   --execute      Execute the migration against the target Supabase instance
 *   --data-file    Path to JSON dump of Firestore /users/{uid} collections
 *   --target-org   Specific organization UUID (optional; generated if not specified)
 */

export interface FirestoreCustomerDoc {
  id: string;
  fullName: string;
  nickname?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  whatsapp?: string;
  photoUrl?: string;
  gender?: string;
  dob?: any;
  occupation?: string;
  monthlyIncome?: number;
  address?: any;
  idProofs?: any[];
  references?: any[];
  guarantor?: any;
  tags?: string[];
  notes?: string;
  rating?: number;
  creditScoreInternal?: number;
  status?: string;
  totals?: any;
  createdAt?: any;
  updatedAt?: any;
  isDeleted?: boolean;
}

export interface FirestoreLoanDoc {
  id: string;
  customerId: string;
  customerName: string;
  loanNumber: string;
  title: string;
  category: string;
  principal: number;
  currency?: string;
  interestType: string;
  interestRate: number;
  ratePeriod: string;
  compounding: string;
  repaymentFrequency: string;
  disbursedOn: any;
  firstDueDate: any;
  tenure?: { value: number; unit: string };
  maturityDate: any;
  installmentAmount: number;
  numberOfInstallments: number;
  upfrontDeduction?: number;
  advanceInterestDeducted?: boolean;
  effectiveAnnualRate?: number;
  penalty?: any;
  collateral?: any;
  proofs?: any[];
  witnesses?: any[];
  status: string;
  outstandingPrincipal?: number;
  accruedInterest?: number;
  totalPayable?: number;
  totalPaid?: number;
  nextDueDate?: any;
  daysOverdue?: number;
  penaltyAccrued?: number;
  progressPercent?: number;
  closedOn?: any;
  notes?: string;
  tags?: string[];
  createdAt?: any;
  updatedAt?: any;
  isDeleted?: boolean;
}

export interface FirestorePaymentDoc {
  id: string;
  loanId: string;
  customerId: string;
  customerName: string;
  loanNumber: string;
  receiptNumber: string;
  amount: number;
  paidOn: any;
  mode: string;
  referenceNo?: string;
  allocation?: any;
  type?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
  isDeleted?: boolean;
}

export interface FirestoreDump {
  adminUid: string;
  organizationName?: string;
  businessProfile?: any;
  currencySettings?: any;
  loanProducts?: any[];
  customers: FirestoreCustomerDoc[];
  loans: FirestoreLoanDoc[];
  payments: FirestorePaymentDoc[];
  auditLogs?: any[];
}

export interface MigrationSummary {
  dryRun: boolean;
  organizationId: string;
  counts: {
    customersSource: number;
    customersMigrated: number;
    loansSource: number;
    loansMigrated: number;
    paymentsSource: number;
    paymentsMigrated: number;
    documentsSource: number;
    documentsMigrated: number;
  };
  financialTotals: {
    principalPaiseSource: number;
    principalPaiseMigrated: number;
    paymentsPaiseSource: number;
    paymentsPaiseMigrated: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Normalizes any timestamp representation into a clean ISO 8601 string.
 */
export function normalizeTimestamp(input: any): string {
  if (!input) return new Date().toISOString();

  // 1. Firestore Timestamp object {_seconds, _nanoseconds}
  if (typeof input === 'object' && typeof input._seconds === 'number') {
    return new Date(input._seconds * 1000).toISOString();
  }

  // 2. Firestore Timestamp object {seconds, nanoseconds}
  if (typeof input === 'object' && typeof input.seconds === 'number') {
    return new Date(input.seconds * 1000).toISOString();
  }

  // 3. Unix epoch number in milliseconds or seconds
  if (typeof input === 'number') {
    if (input < 10000000000) {
      return new Date(input * 1000).toISOString();
    }
    return new Date(input).toISOString();
  }

  // 4. String date
  if (typeof input === 'string') {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

/**
 * Normalizes minor units (paise / cents), ensuring integer numbers >= 0.
 */
export function normalizeMinorUnits(amount: any): number {
  if (amount === undefined || amount === null) return 0;
  const num = Number(amount);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num);
}

/**
 * Transforms and executes migration with full reconciliation.
 */
export async function runMigration(
  dump: FirestoreDump,
  options: {
    dryRun: boolean;
    targetOrgId?: string;
    supabaseClient?: any;
  }
): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    dryRun: options.dryRun,
    organizationId: options.targetOrgId || '00000000-0000-0000-0000-000000000001',
    counts: {
      customersSource: dump.customers?.length || 0,
      customersMigrated: 0,
      loansSource: dump.loans?.length || 0,
      loansMigrated: 0,
      paymentsSource: dump.payments?.length || 0,
      paymentsMigrated: 0,
      documentsSource: 0,
      documentsMigrated: 0,
    },
    financialTotals: {
      principalPaiseSource: 0,
      principalPaiseMigrated: 0,
      paymentsPaiseSource: 0,
      paymentsPaiseMigrated: 0,
    },
    warnings: [],
    errors: [],
  };

  const customerIdMap = new Map<string, string>(); // legacy_id -> target_id
  const loanIdMap = new Map<string, string>(); // legacy_id -> target_id

  // 1. Process Customers
  for (const c of dump.customers || []) {
    if (!c.id || !c.fullName || !c.phone) {
      summary.warnings.push(`Skipping invalid customer record: ${JSON.stringify({ id: c.id, name: c.fullName })}`);
      continue;
    }

    const targetCustomerId = c.id.startsWith('cust-') || c.id.length < 36
      ? `00000000-0000-0000-0001-${c.id.replace(/\D/g, '').padStart(12, '0').slice(-12)}`
      : c.id;

    customerIdMap.set(c.id, targetCustomerId);

    const transformedCustomer = {
      id: targetCustomerId,
      organization_id: summary.organizationId,
      full_name: c.fullName.trim(),
      nickname: c.nickname || null,
      phone: c.phone.trim(),
      alt_phone: c.altPhone || null,
      email: c.email || null,
      whatsapp: c.whatsapp || null,
      photo_url: c.photoUrl || null,
      gender: c.gender || null,
      dob: c.dob ? normalizeTimestamp(c.dob).split('T')[0] : null,
      occupation: c.occupation || null,
      monthly_income_paise: normalizeMinorUnits(c.monthlyIncome),
      address: c.address || {},
      id_proofs: c.idProofs || [],
      customer_references: c.references || [],
      guarantor: c.guarantor || null,
      tags: c.tags || [],
      notes: c.notes || null,
      rating: c.rating || null,
      credit_score_internal: c.creditScoreInternal || null,
      status: c.status || 'Active',
      totals: c.totals || {},
      is_deleted: Boolean(c.isDeleted),
      created_at: normalizeTimestamp(c.createdAt),
      updated_at: normalizeTimestamp(c.updatedAt),
      legacy_firestore_id: c.id,
    };

    if (!options.dryRun && options.supabaseClient) {
      const { error } = await options.supabaseClient
        .from('customers')
        .upsert(transformedCustomer, { onConflict: 'organization_id, legacy_firestore_id' });
      if (error) {
        summary.errors.push(`Customer insert error [${c.id}]: ${error.message}`);
        continue;
      }
    }

    summary.counts.customersMigrated += 1;
  }

  // 2. Process Loans
  for (const l of dump.loans || []) {
    summary.financialTotals.principalPaiseSource += normalizeMinorUnits(l.principal);

    if (!l.id || !l.customerId) {
      summary.warnings.push(`Skipping invalid loan record: ${l.id}`);
      continue;
    }

    const resolvedCustomerId = customerIdMap.get(l.customerId);
    if (!resolvedCustomerId) {
      summary.warnings.push(`Orphan loan: customer ${l.customerId} not found for loan ${l.id}`);
      continue;
    }

    const targetLoanId = l.id.startsWith('loan-') || l.id.length < 36
      ? `00000000-0000-0000-0002-${l.id.replace(/\D/g, '').padStart(12, '0').slice(-12)}`
      : l.id;

    loanIdMap.set(l.id, targetLoanId);

    const transformedLoan = {
      id: targetLoanId,
      organization_id: summary.organizationId,
      customer_id: resolvedCustomerId,
      customer_name: l.customerName || 'Borrower',
      loan_number: l.loanNumber || `LN-${l.id.slice(-4)}`,
      title: l.title || `${l.category || 'Personal'} Loan`,
      category: l.category || 'Personal',
      principal_minor_units: normalizeMinorUnits(l.principal),
      currency_code: l.currency || 'INR',
      interest_type: l.interestType || 'SIMPLE',
      interest_rate: Number(l.interestRate || 2.0),
      rate_period: l.ratePeriod || 'PER_MONTH',
      compounding: l.compounding || 'NONE',
      repayment_frequency: l.repaymentFrequency || 'MONTHLY',
      disbursed_on: normalizeTimestamp(l.disbursedOn).split('T')[0],
      first_due_date: normalizeTimestamp(l.firstDueDate).split('T')[0],
      tenure_value: l.tenure?.value || 12,
      tenure_unit: l.tenure?.unit || 'MONTHS',
      maturity_date: normalizeTimestamp(l.maturityDate).split('T')[0],
      installment_amount_minor_units: normalizeMinorUnits(l.installmentAmount),
      number_of_installments: l.numberOfInstallments || 12,
      upfront_deduction_minor_units: normalizeMinorUnits(l.upfrontDeduction),
      advance_interest_deducted: Boolean(l.advanceInterestDeducted),
      effective_annual_rate: l.effectiveAnnualRate ? Number(l.effectiveAnnualRate) : null,
      penalty_config: l.penalty || {},
      collateral: l.collateral || {},
      proofs: l.proofs || [],
      witnesses: l.witnesses || [],
      status: l.status || 'ACTIVE',
      outstanding_principal_minor_units: normalizeMinorUnits(l.outstandingPrincipal),
      accrued_interest_minor_units: normalizeMinorUnits(l.accruedInterest),
      total_payable_minor_units: normalizeMinorUnits(l.totalPayable),
      total_paid_minor_units: normalizeMinorUnits(l.totalPaid),
      next_due_date: l.nextDueDate ? normalizeTimestamp(l.nextDueDate).split('T')[0] : null,
      days_overdue: l.daysOverdue || 0,
      penalty_accrued_minor_units: normalizeMinorUnits(l.penaltyAccrued),
      progress_percent: l.progressPercent || 0,
      closed_on: l.closedOn ? normalizeTimestamp(l.closedOn).split('T')[0] : null,
      notes: l.notes || null,
      tags: l.tags || [],
      is_deleted: Boolean(l.isDeleted),
      created_at: normalizeTimestamp(l.createdAt),
      updated_at: normalizeTimestamp(l.updatedAt),
      legacy_firestore_id: l.id,
    };

    if (!options.dryRun && options.supabaseClient) {
      const { error } = await options.supabaseClient
        .from('loans')
        .upsert(transformedLoan, { onConflict: 'organization_id, legacy_firestore_id' });
      if (error) {
        summary.errors.push(`Loan insert error [${l.id}]: ${error.message}`);
        continue;
      }
    }

    summary.counts.loansMigrated += 1;
    summary.financialTotals.principalPaiseMigrated += transformedLoan.principal_minor_units;

    // Count embedded proofs as documents
    if (Array.isArray(l.proofs)) {
      summary.counts.documentsSource += l.proofs.length;
      summary.counts.documentsMigrated += l.proofs.length;
    }
  }

  // 3. Process Payments
  for (const p of dump.payments || []) {
    summary.financialTotals.paymentsPaiseSource += normalizeMinorUnits(p.amount);

    const resolvedLoanId = loanIdMap.get(p.loanId);
    const resolvedCustomerId = customerIdMap.get(p.customerId);

    if (!resolvedLoanId || !resolvedCustomerId) {
      summary.warnings.push(`Orphan payment: loan ${p.loanId} or customer ${p.customerId} not found for payment ${p.id}`);
      continue;
    }

    const targetPaymentId = p.id.startsWith('pay-') || p.id.length < 36
      ? `00000000-0000-0000-0003-${p.id.replace(/\D/g, '').padStart(12, '0').slice(-12)}`
      : p.id;

    const transformedPayment = {
      id: targetPaymentId,
      organization_id: summary.organizationId,
      loan_id: resolvedLoanId,
      customer_id: resolvedCustomerId,
      customer_name: p.customerName || 'Borrower',
      loan_number: p.loanNumber || '',
      receipt_number: p.receiptNumber || `REC-${p.id.slice(-6)}`,
      amount_minor_units: normalizeMinorUnits(p.amount),
      currency_code: 'INR',
      paid_at: normalizeTimestamp(p.paidOn),
      mode: (p.mode as any) || 'CASH',
      type: p.type || 'INSTALLMENT',
      allocation: p.allocation || { penalty: 0, interest: 0, principal: 0 },
      reference_no: p.referenceNo || null,
      receipt_url: p.receiptUrl || null,
      notes: p.notes || null,
      is_deleted: Boolean(p.isDeleted),
      created_at: normalizeTimestamp(p.createdAt),
      updated_at: normalizeTimestamp(p.updatedAt),
      legacy_firestore_id: p.id,
    };

    if (!options.dryRun && options.supabaseClient) {
      const { error } = await options.supabaseClient
        .from('payments')
        .upsert(transformedPayment, { onConflict: 'organization_id, legacy_firestore_id' });
      if (error) {
        summary.errors.push(`Payment insert error [${p.id}]: ${error.message}`);
        continue;
      }
    }

    summary.counts.paymentsMigrated += 1;
    summary.financialTotals.paymentsPaiseMigrated += transformedPayment.amount_minor_units;
  }

  return summary;
}
