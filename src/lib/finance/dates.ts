import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInCalendarDays,
  isLeapYear,
  lastDayOfMonth,
  getDate,
  setDate,
  format,
  parseISO,
} from 'date-fns';
import { RepaymentFrequency } from './types';

export function toDate(d: Date | string): Date {
  return typeof d === 'string' ? parseISO(d) : new Date(d);
}

export function formatDateIso(d: Date | string): string {
  const dt = toDate(d);
  return format(dt, 'yyyy-MM-dd');
}

export function getDaysBetween(start: Date | string, end: Date | string): number {
  return differenceInCalendarDays(toDate(end), toDate(start));
}

/**
 * Add an installment interval preserving month-end alignment.
 * For example: If original date was 31st of Jan, adding 1 month yields Feb 28 (or 29),
 * and adding 2 months from original anchor retains the 31st (March 31).
 */
export function addRepaymentInterval(
  anchorDate: Date,
  intervalIndex: number,
  frequency: RepaymentFrequency
): Date {
  const anchorDay = getDate(anchorDate);
  const isOriginalMonthEnd = getDate(lastDayOfMonth(anchorDate)) === anchorDay;

  switch (frequency) {
    case 'DAILY':
      return addDays(anchorDate, intervalIndex);

    case 'WEEKLY':
      return addWeeks(anchorDate, intervalIndex);

    case 'BIWEEKLY':
      return addWeeks(anchorDate, intervalIndex * 2);

    case 'MONTHLY': {
      const baseMonth = addMonths(anchorDate, intervalIndex);
      if (isOriginalMonthEnd) {
        return lastDayOfMonth(baseMonth);
      }
      // Check if target month has fewer days than anchor day
      const targetMonthMaxDay = getDate(lastDayOfMonth(baseMonth));
      const targetDay = Math.min(anchorDay, targetMonthMaxDay);
      return setDate(baseMonth, targetDay);
    }

    case 'BULLET':
    default:
      return anchorDate;
  }
}

export { isLeapYear };
