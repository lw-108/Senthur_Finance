import { getDaysBetween, toDate } from './dates';

export interface CashFlow {
  date: Date | string;
  amount: number; // negative for outflow (disbursement), positive for inflows (repayments)
}

/**
 * Calculate XIRR (Extended Internal Rate of Return) using Newton-Raphson algorithm.
 * Returns annualized percentage (e.g. 18.5 for 18.5% p.a.).
 */
export function calculateXIRR(cashFlows: CashFlow[], guess: number = 0.1): number {
  if (cashFlows.length < 2) return 0;

  const startDate = toDate(cashFlows[0].date);
  const maxIterations = 100;
  const tolerance = 1e-6;

  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let fValue = 0;
    let fDerivative = 0;

    for (const cf of cashFlows) {
      const days = getDaysBetween(startDate, cf.date);
      const years = days / 365;
      const factor = Math.pow(1 + rate, years);

      if (factor === 0 || isNaN(factor)) continue;

      fValue += cf.amount / factor;
      fDerivative -= (years * cf.amount) / (factor * (1 + rate));
    }

    if (Math.abs(fDerivative) < 1e-12) {
      break;
    }

    const nextRate = rate - fValue / fDerivative;

    if (Math.abs(nextRate - rate) < tolerance) {
      return Math.round(nextRate * 10000) / 100; // e.g. 18.45%
    }

    rate = nextRate;
  }

  // Fallback return nominal estimate
  return Math.max(0, Math.round(rate * 10000) / 100);
}
