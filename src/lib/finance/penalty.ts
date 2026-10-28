import { PenaltyConfig } from './types';
import { getDaysBetween } from './dates';

export function calculateInstallmentPenalty(
  overdueAmountInPaise: number,
  dueDate: Date | string,
  asOfDate: Date | string,
  config?: PenaltyConfig
): { penaltyInPaise: number; daysOverdue: number; isWithinGrace: boolean } {
  const daysOverdue = Math.max(0, getDaysBetween(dueDate, asOfDate));

  if (!config || daysOverdue <= 0 || overdueAmountInPaise <= 0) {
    return { penaltyInPaise: 0, daysOverdue, isWithinGrace: true };
  }

  const { type, value, graceDays } = config;

  if (daysOverdue <= graceDays) {
    return { penaltyInPaise: 0, daysOverdue, isWithinGrace: true };
  }

  const chargeableDays = daysOverdue - graceDays;
  let penalty = 0;

  switch (type) {
    case 'FLAT_PER_DAY':
      // value is flat amount in paise per day (e.g. 50_00 for ₹50/day)
      penalty = value * chargeableDays;
      break;

    case 'PERCENT_PER_MONTH':
      // value is percentage per month (e.g. 2 for 2% per month)
      // daily rate = (value / 100) / 30
      const dailyPercentRate = value / 100 / 30;
      penalty = overdueAmountInPaise * dailyPercentRate * chargeableDays;
      break;

    case 'ONE_TIME':
      // value is one-time penalty in paise
      penalty = value;
      break;
  }

  return {
    penaltyInPaise: Math.round(penalty),
    daysOverdue,
    isWithinGrace: false,
  };
}
