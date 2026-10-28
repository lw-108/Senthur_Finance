export type InterestType =
  | 'SIMPLE'
  | 'COMPOUND'
  | 'FLAT'
  | 'REDUCING_BALANCE'
  | 'INTEREST_ONLY'
  | 'FIXED_AMOUNT'
  | 'ZERO_INTEREST';

export type RatePeriod = 'PER_DAY' | 'PER_WEEK' | 'PER_MONTH' | 'PER_YEAR';

export type CompoundingFrequency =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

export type RepaymentFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'BULLET'
  | 'CUSTOM';

export type TenureUnit = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

export type PenaltyType = 'FLAT_PER_DAY' | 'PERCENT_PER_MONTH' | 'ONE_TIME';

export interface PenaltyConfig {
  type: PenaltyType;
  value: number; // in paise if flat, or percentage e.g. 2 for 2%
  graceDays: number;
}

export type InstallmentStatus =
  | 'UPCOMING'
  | 'DUE_TODAY'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'WAIVED';

export interface ScheduleInstallment {
  installmentNo: number;
  dueDate: string; // ISO string YYYY-MM-DD
  principalDue: number; // in paise
  interestDue: number; // in paise
  penaltyDue: number; // in paise
  totalDue: number; // in paise
  paidAmount: number; // in paise
  status: InstallmentStatus;
  remainingPrincipalBalance: number; // in paise after this installment
}

export interface LoanCalculationInput {
  principal: number; // in paise (e.g. 100000_00 for ₹100,000)
  interestType: InterestType;
  interestRate: number; // percentage or rate
  ratePeriod: RatePeriod;
  compounding?: CompoundingFrequency;
  disbursedOn: Date | string;
  firstDueDate?: Date | string;
  tenureValue: number;
  tenureUnit: TenureUnit;
  repaymentFrequency: RepaymentFrequency;
  customInstallmentAmount?: number; // in paise (optional override)
  upfrontDeduction?: number; // in paise (processing fee or deduction)
  advanceInterestDeducted?: boolean; // if true, first period's interest is deducted upfront
  penaltyConfig?: PenaltyConfig;
  rounding?: 'NEAREST_RUPEE' | 'TWO_DECIMALS';
}

export interface LoanPreviewResult {
  principal: number; // in paise
  disbursedAmount: number; // in paise (principal minus upfront deductions)
  totalInterest: number; // in paise
  totalPayable: number; // in paise (principal + interest)
  installmentAmount: number; // in paise
  numberOfInstallments: number;
  maturityDate: string; // ISO date
  effectiveAnnualRate: number; // percentage (XIRR/EAR)
  schedule: ScheduleInstallment[];
}

export interface PaymentAllocationResult {
  allocatedPenalty: number; // in paise
  allocatedInterest: number; // in paise
  allocatedPrincipal: number; // in paise
  unallocatedExcess: number; // in paise
  remainingPrincipal: number; // in paise
  isFullySettled: boolean;
}

export interface ForeclosureQuote {
  asOfDate: string;
  outstandingPrincipal: number; // in paise
  accruedInterest: number; // in paise
  accruedPenalty: number; // in paise
  foreclosureFee: number; // in paise
  totalSettlementAmount: number; // in paise
}
