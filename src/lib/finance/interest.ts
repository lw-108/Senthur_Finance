import {
  RatePeriod,
  CompoundingFrequency,
  RepaymentFrequency,
} from './types';
import { getDaysBetween, toDate } from './dates';

/**
 * Convert any nominal interest rate and rate period into an annualized decimal rate.
 * E.g. 2% per month => 24% p.a. => 0.24
 * E.g. "₹2 per ₹100 per month" => 2% per month => 24% p.a.
 */
export function getAnnualizedRateDecimal(rate: number, period: RatePeriod): number {
  switch (period) {
    case 'PER_DAY':
      return (rate / 100) * 365;
    case 'PER_WEEK':
      return (rate / 100) * 52;
    case 'PER_MONTH':
      return (rate / 100) * 12;
    case 'PER_YEAR':
    default:
      return rate / 100;
  }
}

/**
 * Get periodic rate decimal matching the repayment frequency.
 */
export function getPeriodicRateDecimal(
  annualRateDecimal: number,
  frequency: RepaymentFrequency
): number {
  switch (frequency) {
    case 'DAILY':
      return annualRateDecimal / 365;
    case 'WEEKLY':
      return annualRateDecimal / 52;
    case 'BIWEEKLY':
      return annualRateDecimal / 26;
    case 'MONTHLY':
      return annualRateDecimal / 12;
    case 'BULLET':
    default:
      return annualRateDecimal;
  }
}

/**
 * Calculate Simple Interest: I = P * r * t
 * @param principal in paise
 * @param annualRateDecimal decimal e.g. 0.24 for 24%
 * @param years tenure in years (e.g. 1.0, 0.5)
 * @returns total interest in paise
 */
export function calculateSimpleInterest(
  principal: number,
  annualRateDecimal: number,
  years: number
): number {
  return Math.round(principal * annualRateDecimal * years);
}

/**
 * Calculate Compound Interest: A = P * (1 + r/k)^(k*t), I = A - P
 * @param principal in paise
 * @param annualRateDecimal decimal e.g. 0.12
 * @param years tenure in years
 * @param compounding frequency
 * @returns total interest in paise
 */
export function calculateCompoundInterest(
  principal: number,
  annualRateDecimal: number,
  years: number,
  compounding: CompoundingFrequency = 'MONTHLY'
): number {
  let timesPerYear = 12;
  switch (compounding) {
    case 'DAILY':
      timesPerYear = 365;
      break;
    case 'WEEKLY':
      timesPerYear = 52;
      break;
    case 'MONTHLY':
      timesPerYear = 12;
      break;
    case 'QUARTERLY':
      timesPerYear = 4;
      break;
    case 'YEARLY':
      timesPerYear = 1;
      break;
    case 'NONE':
      return calculateSimpleInterest(principal, annualRateDecimal, years);
  }

  const amount = principal * Math.pow(1 + annualRateDecimal / timesPerYear, timesPerYear * years);
  return Math.round(amount - principal);
}

/**
 * Calculate Reducing Balance EMI:
 * EMI = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
 * @param principal in paise
 * @param periodicRateDecimal rate per installment period
 * @param numberOfInstallments n
 * @returns installment amount in paise
 */
export function calculateReducingEmi(
  principal: number,
  periodicRateDecimal: number,
  numberOfInstallments: number
): number {
  if (numberOfInstallments <= 0) return 0;
  if (periodicRateDecimal <= 0) {
    return Math.round(principal / numberOfInstallments);
  }

  const r = periodicRateDecimal;
  const n = numberOfInstallments;
  const factor = Math.pow(1 + r, n);
  const emi = (principal * r * factor) / (factor - 1);

  return Math.round(emi);
}

/**
 * Per-day interest accrual calculation from last payment date to asOfDate.
 * "Outstanding as of today" engine
 * Accrual = (outstandingPrincipal * annualRateDecimal * days) / 365
 * @param principal in paise
 * @param annualRateDecimal decimal
 * @param lastDate Date
 * @param asOfDate Date
 */
export function calculateAccruedInterest(
  principal: number,
  annualRateDecimal: number,
  lastDate: Date | string,
  asOfDate: Date | string
): number {
  const days = Math.max(0, getDaysBetween(lastDate, asOfDate));
  if (days === 0 || principal <= 0) return 0;

  const dailyInterest = (principal * annualRateDecimal * days) / 365;
  return Math.round(dailyInterest);
}

/**
 * Rounding helper for paise
 */
export function applyRounding(amountInPaise: number, rounding?: 'NEAREST_RUPEE' | 'TWO_DECIMALS'): number {
  if (rounding === 'NEAREST_RUPEE') {
    // 100 paise = ₹1. Round to nearest 100 paise
    return Math.round(amountInPaise / 100) * 100;
  }
  return Math.round(amountInPaise);
}
