import { create } from 'zustand';
import {
  InterestType,
  RatePeriod,
  CompoundingFrequency,
  RepaymentFrequency,
  TenureUnit,
  LoanPreviewResult,
} from '@/lib/finance/types';
import { calculateLoanPreview } from '@/lib/finance';
import { CollateralType } from './types';

interface LoanWizardState {
  currentStep: number;

  // Step 1: Customer
  customerId: string;
  customerName: string;
  title: string;
  category: string;

  // Step 2: Amount & Interest
  principalPaise: number;
  interestType: InterestType;
  interestRate: number;
  ratePeriod: RatePeriod;
  compounding: CompoundingFrequency;
  upfrontDeductionPaise: number;
  advanceInterestDeducted: boolean;

  // Step 3: Tenure & Schedule
  disbursedOn: string;
  firstDueDate: string;
  tenureValue: number;
  tenureUnit: TenureUnit;
  repaymentFrequency: RepaymentFrequency;

  // Step 4: Penalty & Collateral
  penaltyType: 'FLAT_PER_DAY' | 'PERCENT_PER_MONTH' | 'ONE_TIME';
  penaltyValue: number;
  graceDays: number;

  collateralType: CollateralType;
  collateralDescription: string;
  collateralEstimatedValue: number;

  // Step 5: Proofs & Notes
  witnessName: string;
  witnessPhone: string;
  notes: string;

  // Live computed preview
  preview: LoanPreviewResult;

  // Actions
  setStep: (step: number) => void;
  setField: <K extends keyof LoanWizardState>(field: K, value: LoanWizardState[K]) => void;
  recomputePreview: () => void;
  resetDraft: (customerId?: string, customerName?: string) => void;
}

const computePreviewFromState = (state: Partial<LoanWizardState>): LoanPreviewResult => {
  return calculateLoanPreview({
    principal: state.principalPaise || 0,
    interestType: state.interestType || 'REDUCING_BALANCE',
    interestRate: state.interestRate || 0,
    ratePeriod: state.ratePeriod || 'PER_YEAR',
    compounding: state.compounding || 'NONE',
    disbursedOn: state.disbursedOn || new Date().toISOString().split('T')[0],
    firstDueDate: state.firstDueDate,
    tenureValue: state.tenureValue || 1,
    tenureUnit: state.tenureUnit || 'MONTHS',
    repaymentFrequency: state.repaymentFrequency || 'MONTHLY',
    upfrontDeduction: state.upfrontDeductionPaise || 0,
    advanceInterestDeducted: state.advanceInterestDeducted || false,
    rounding: 'NEAREST_RUPEE',
  });
};

const initialDefault = {
  currentStep: 1,
  customerId: '',
  customerName: '',
  title: '',
  category: 'Personal Loan',
  principalPaise: 0,
  interestType: 'REDUCING_BALANCE' as InterestType,
  interestRate: 0,
  ratePeriod: 'PER_YEAR' as RatePeriod,
  compounding: 'NONE' as CompoundingFrequency,
  upfrontDeductionPaise: 0,
  advanceInterestDeducted: false,
  disbursedOn: new Date().toISOString().split('T')[0],
  firstDueDate: '',
  tenureValue: 12,
  tenureUnit: 'MONTHS' as TenureUnit,
  repaymentFrequency: 'MONTHLY' as RepaymentFrequency,
  penaltyType: 'FLAT_PER_DAY' as const,
  penaltyValue: 0,
  graceDays: 3,
  collateralType: 'None' as CollateralType,
  collateralDescription: '',
  collateralEstimatedValue: 0,
  witnessName: '',
  witnessPhone: '',
  notes: '',
};

export const useLoanWizardDraft = create<LoanWizardState>((set, get) => ({
  ...initialDefault,
  preview: computePreviewFromState(initialDefault),

  setStep: (step) => set({ currentStep: step }),

  setField: (field, value) => {
    set({ [field]: value } as any);
    get().recomputePreview();
  },

  recomputePreview: () => {
    const state = get();
    const preview = computePreviewFromState(state);
    set({ preview });
  },

  resetDraft: (customerId = '', customerName = '') => {
    const updated = {
      ...initialDefault,
      customerId,
      customerName,
      disbursedOn: new Date().toISOString().split('T')[0],
    };
    set({ ...updated, preview: computePreviewFromState(updated) });
  },
}));
