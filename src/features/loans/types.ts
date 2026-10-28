import {
  InterestType,
  RatePeriod,
  CompoundingFrequency,
  RepaymentFrequency,
  TenureUnit,
  PenaltyConfig,
  ScheduleInstallment,
} from '@/lib/finance/types';

export type LoanStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'CLOSED'
  | 'WRITTEN_OFF'
  | 'RENEWED';

export type CollateralType =
  | 'None'
  | 'Gold'
  | 'Vehicle'
  | 'Property'
  | 'Cheque'
  | 'Promissory'
  | 'Other';

export interface CollateralInfo {
  type: CollateralType;
  description?: string;
  estimatedValue?: number; // in paise
  photos?: string[];
  documents?: string[];
}

export type ProofKind =
  | 'PromissoryNote'
  | 'Agreement'
  | 'Cheque'
  | 'Signature'
  | 'ID'
  | 'Receipt'
  | 'Photo'
  | 'Video'
  | 'Other';

export interface LoanProof {
  id: string;
  kind: ProofKind;
  title: string;
  url: string;
  storagePath?: string;
  mime?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface LoanWitness {
  name: string;
  phone?: string;
  address?: string;
}

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  loanNumber: string; // e.g. LN-2026-0001
  title: string; // e.g. "Personal Loan" / "Vehicle Loan" / "Gold Loan"
  category: string;
  principal: number; // in paise
  currency: string;

  // Interest & calculations
  interestType: InterestType;
  interestRate: number; // nominal percentage or rate
  ratePeriod: RatePeriod;
  compounding: CompoundingFrequency;
  repaymentFrequency: RepaymentFrequency;

  // Dates & tenure
  disbursedOn: string; // ISO date
  firstDueDate: string; // ISO date
  tenure: {
    value: number;
    unit: TenureUnit;
  };
  maturityDate: string; // ISO date

  // Financial terms
  installmentAmount: number; // in paise
  numberOfInstallments: number;
  upfrontDeduction: number; // in paise
  advanceInterestDeducted: boolean;
  effectiveAnnualRate?: number; // XIRR %

  // Penalties & Security
  penalty: PenaltyConfig;
  collateral: CollateralInfo;
  proofs: LoanProof[];
  witnesses: LoanWitness[];

  // Computed & Live balances
  status: LoanStatus;
  outstandingPrincipal: number; // in paise
  accruedInterest: number; // in paise
  totalPayable: number; // in paise
  totalPaid: number; // in paise
  nextDueDate?: string;
  daysOverdue: number;
  penaltyAccrued: number; // in paise
  progressPercent: number; // 0 to 100
  closedOn?: string;

  notes?: string;
  tags: string[];

  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isDeleted: boolean;
}

export interface LoanFilterParams {
  customerId?: string;
  status?: LoanStatus | 'ALL' | 'ACTIVE_OR_OVERDUE';
  search?: string;
  category?: string;
}
