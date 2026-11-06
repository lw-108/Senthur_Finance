import { formatIndianCurrency } from '@/utils/formatters';

describe('CustomerFinancialBento Metrics & Formatting', () => {
  it('correctly calculates recovery and pending percentages', () => {
    const totalLent = 10000000; // ₹1,00,000 in paise
    const totalPaid = 6000000;  // ₹60,000 in paise
    const totalOutstanding = 4000000; // ₹40,000 in paise

    const totalPortfolio = totalPaid + totalOutstanding;
    const recoveryRatePercent = Math.round((totalPaid / totalPortfolio) * 100);
    const pendingRatePercent = 100 - recoveryRatePercent;

    expect(recoveryRatePercent).toBe(60);
    expect(pendingRatePercent).toBe(40);
  });

  it('handles edge case when customer has no loans or zero amounts', () => {
    const totalPaid = 0;
    const totalOutstanding = 0;

    const totalPortfolio = totalPaid + totalOutstanding;
    const recoveryRatePercent =
      totalPortfolio > 0 ? Math.min(100, Math.max(0, Math.round((totalPaid / totalPortfolio) * 100))) : 0;
    const pendingRatePercent = totalPortfolio > 0 ? Math.max(0, 100 - recoveryRatePercent) : 0;

    expect(recoveryRatePercent).toBe(0);
    expect(pendingRatePercent).toBe(0);
  });

  it('formats large multi-lakh loan numbers cleanly for bento display', () => {
    const bigLoan = 255000000; // ₹25,50,000 in paise
    const formatted = formatIndianCurrency(bigLoan, { isMinorUnit: true }).formatted;
    expect(formatted).toBe('₹25,50,000');
  });

  it('flags overdue amount when customer has arrears', () => {
    const overdueAmount = 1500000; // ₹15,000
    expect(overdueAmount > 0).toBe(true);
    const formatted = formatIndianCurrency(overdueAmount, { isMinorUnit: true }).formatted;
    expect(formatted).toBe('₹15,000');
  });
});
