import { LoanCalculationInput, LoanPreviewResult } from './types';
import { calculateLoanSchedule } from './schedule';

export * from './types';
export * from './dates';
export * from './interest';
export * from './penalty';
export * from './waterfall';
export * from './foreclosure';
export * from './xirr';
export * from './schedule';

/**
 * Expose calculateLoanPreview so forms and UI can show live previews
 * (EMI, total interest, total payable, maturity date, amortization preview)
 */
export function calculateLoanPreview(input: LoanCalculationInput): LoanPreviewResult {
  return calculateLoanSchedule(input);
}
