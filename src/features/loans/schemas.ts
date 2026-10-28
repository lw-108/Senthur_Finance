import { z } from 'zod';

export const loanCreationSchema = z.object({
  customerId: z.string().min(1, 'Please select a borrower'),
  customerName: z.string().min(1, 'Customer name is required'),
  title: z.string().min(2, 'Loan title / purpose is required'),
  category: z.string().default('Personal Loan'),
  principal: z.number().min(10000, 'Minimum principal is ₹100'),
  currency: z.string().default('INR'),

  interestType: z.enum([
    'SIMPLE',
    'COMPOUND',
    'FLAT',
    'REDUCING_BALANCE',
    'INTEREST_ONLY',
    'FIXED_AMOUNT',
    'ZERO_INTEREST',
  ]),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  ratePeriod: z.enum(['PER_DAY', 'PER_WEEK', 'PER_MONTH', 'PER_YEAR']),
  compounding: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('NONE'),
  repaymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BULLET', 'CUSTOM']),

  disbursedOn: z.string(),
  firstDueDate: z.string().optional(),
  tenureValue: z.number().min(1, 'Tenure must be at least 1'),
  tenureUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']),

  upfrontDeduction: z.number().default(0),
  advanceInterestDeducted: z.boolean().default(false),

  penaltyType: z.enum(['FLAT_PER_DAY', 'PERCENT_PER_MONTH', 'ONE_TIME']).default('FLAT_PER_DAY'),
  penaltyValue: z.number().default(0),
  graceDays: z.number().default(3),

  collateralType: z.enum(['None', 'Gold', 'Vehicle', 'Property', 'Cheque', 'Promissory', 'Other']).default('None'),
  collateralDescription: z.string().optional(),
  collateralValue: z.number().optional(),

  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type LoanCreationFormData = z.infer<typeof loanCreationSchema>;
