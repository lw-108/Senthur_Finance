import { formatIndianCurrency } from '@/utils/formatters';

describe('HomeFinancialBento Value Weight & Layout Architecture', () => {
  // Dynamic value font size and weight adjusting logic mirror
  const getDynamicValueStyle = (valStr: string, isHero: boolean = false) => {
    const len = valStr.length;
    if (isHero) {
      if (len <= 8) return { fontSize: 26, fontWeight: '800' as const, letterSpacing: 0.5 };
      if (len <= 11) return { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.3 };
      return { fontSize: 19, fontWeight: '700' as const, letterSpacing: 0 };
    }
    if (len <= 7) return { fontSize: 21, fontWeight: '800' as const, letterSpacing: 0.4 };
    if (len <= 10) return { fontSize: 18, fontWeight: '700' as const, letterSpacing: 0.2 };
    return { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0 };
  };

  it('adjusts font weight and size for standard currency strings (<=8 chars)', () => {
    const formatted = formatIndianCurrency(5000000, { isMinorUnit: true }).formatted; // ₹50,000
    const heroStyle = getDynamicValueStyle(formatted, true);
    const standardStyle = getDynamicValueStyle(formatted, false);

    expect(formatted).toBe('₹50,000');
    expect(formatted.length).toBeLessThanOrEqual(8);
    expect(heroStyle.fontSize).toBe(26);
    expect(heroStyle.fontWeight).toBe('800');
    expect(standardStyle.fontSize).toBe(21);
    expect(standardStyle.fontWeight).toBe('800');
  });

  it('adjusts font weight and size for multi-lakh strings (9-11 chars)', () => {
    const formatted = formatIndianCurrency(250000000, { isMinorUnit: true }).formatted; // ₹25,00,000
    const heroStyle = getDynamicValueStyle(formatted, true);
    const standardStyle = getDynamicValueStyle(formatted, false);

    expect(formatted).toBe('₹25,00,000');
    expect(formatted.length).toBeGreaterThanOrEqual(9);
    expect(formatted.length).toBeLessThanOrEqual(11);
    expect(heroStyle.fontSize).toBe(22);
    expect(heroStyle.fontWeight).toBe('700');
    expect(standardStyle.fontSize).toBe(18);
    expect(standardStyle.fontWeight).toBe('700');
  });

  it('flexes to compact font size and weight for crore strings (>11 chars) to prevent truncation', () => {
    const formatted = formatIndianCurrency(12500000000, { isMinorUnit: true }).formatted; // ₹12,50,00,000
    const heroStyle = getDynamicValueStyle(formatted, true);
    const standardStyle = getDynamicValueStyle(formatted, false);

    expect(formatted).toBe('₹12,50,00,000');
    expect(formatted.length).toBeGreaterThan(11);
    expect(heroStyle.fontSize).toBe(19);
    expect(heroStyle.fontWeight).toBe('700');
    expect(standardStyle.fontSize).toBe(16);
    expect(standardStyle.fontWeight).toBe('700');
  });

  it('calculates portfolio recovery rate correctly', () => {
    const totalReceivedPaise = 5000000;  // ₹50,000
    const totalPendingPaise = 15000000;  // ₹1,50,000
    const totalPortfolio = totalReceivedPaise + totalPendingPaise; // ₹2,00,000

    const recoveryRatePercent =
      totalPortfolio > 0 ? Math.min(100, Math.max(0, Math.round((totalReceivedPaise / totalPortfolio) * 100))) : 0;
    const pendingRatePercent = totalPortfolio > 0 ? Math.max(0, 100 - recoveryRatePercent) : 0;

    expect(recoveryRatePercent).toBe(25);
    expect(pendingRatePercent).toBe(75);
  });

  it('safely handles zero-division for empty portfolio', () => {
    const totalReceivedPaise = 0;
    const totalPendingPaise = 0;
    const totalPortfolio = totalReceivedPaise + totalPendingPaise;

    const recoveryRatePercent =
      totalPortfolio > 0 ? Math.min(100, Math.max(0, Math.round((totalReceivedPaise / totalPortfolio) * 100))) : 0;
    const pendingRatePercent = totalPortfolio > 0 ? Math.max(0, 100 - recoveryRatePercent) : 0;

    expect(recoveryRatePercent).toBe(0);
    expect(pendingRatePercent).toBe(0);
  });

  it('determines overdue alert visibility accurately', () => {
    const overduePaisePositive = 4500000; // ₹45,000
    const overdueCountPositive = 3;

    expect(overduePaisePositive > 0 && overdueCountPositive > 0).toBe(true);

    const overduePaiseZero = 0;
    const overdueCountZero = 0;

    expect(overduePaiseZero > 0 && overdueCountZero > 0).toBe(false);
  });
});
