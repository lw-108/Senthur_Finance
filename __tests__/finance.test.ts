import { describe, test, expect } from '@jest/globals';
import {
  calculateLoanPreview,
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateReducingEmi,
  calculateAccruedInterest,
  calculateInstallmentPenalty,
  allocatePaymentWaterfall,
  reAmortizeAfterPrepayment,
  calculateForeclosureQuote,
  calculateXIRR,
  getAnnualizedRateDecimal,
  getPeriodicRateDecimal,
  addRepaymentInterval,
  getDaysBetween,
  isLeapYear,
} from '../src/lib/finance';

describe('Finance Engine - 45 Comprehensive Unit Tests', () => {
  // ==========================================
  // 1. SIMPLE INTEREST (Tests 1-5)
  // ==========================================
  describe('Simple Interest Calculations', () => {
    test('1. Standard simple interest: ₹100,000 at 12% p.a. for 1 year', () => {
      // P = 100,000_00 paise, r = 0.12, t = 1 yr => I = 12,000_00 paise
      const interest = calculateSimpleInterest(10000000, 0.12, 1);
      expect(interest).toBe(1200000);
    });

    test('2. Simple interest for 6 months: ₹50,000 at 24% p.a.', () => {
      // P = 50,000_00 paise, r = 0.24, t = 0.5 yr => I = 6,000_00 paise
      const interest = calculateSimpleInterest(5000000, 0.24, 0.5);
      expect(interest).toBe(600000);
    });

    test('3. Simple interest with zero rate', () => {
      const interest = calculateSimpleInterest(10000000, 0, 1);
      expect(interest).toBe(0);
    });

    test('4. Simple interest with 3 years tenure: ₹200,000 at 15% p.a.', () => {
      // 200,000 * 0.15 * 3 = 90,000
      const interest = calculateSimpleInterest(20000000, 0.15, 3);
      expect(interest).toBe(9000000);
    });

    test('5. Simple interest small fractional amount and rounding', () => {
      const interest = calculateSimpleInterest(1234567, 0.1375, 1.25);
      expect(interest).toBeGreaterThan(0);
      expect(Number.isInteger(interest)).toBe(true);
    });
  });

  // ==========================================
  // 2. COMPOUND INTEREST (Tests 6-10)
  // ==========================================
  describe('Compound Interest Calculations', () => {
    test('6. Annual compounding: ₹100,000 at 10% for 2 years', () => {
      // A = 100000 * 1.10^2 = 121000 => I = 21000
      const interest = calculateCompoundInterest(10000000, 0.10, 2, 'YEARLY');
      expect(interest).toBe(2100000);
    });

    test('7. Monthly compounding: ₹100,000 at 12% for 1 year', () => {
      // A = 100000 * (1 + 0.12/12)^12 = 100000 * (1.01)^12 = 112682.50
      const interest = calculateCompoundInterest(10000000, 0.12, 1, 'MONTHLY');
      expect(interest).toBe(1268250);
    });

    test('8. Quarterly compounding: ₹100,000 at 12% for 1 year', () => {
      // A = 100000 * (1 + 0.12/4)^4 = 100000 * (1.03)^4 = 112550.88
      const interest = calculateCompoundInterest(10000000, 0.12, 1, 'QUARTERLY');
      expect(interest).toBe(1255088);
    });

    test('9. Daily compounding: ₹100,000 at 10% for 1 year', () => {
      const interest = calculateCompoundInterest(10000000, 0.10, 1, 'DAILY');
      expect(interest).toBeGreaterThan(1000000); // More than simple 10%
    });

    test('10. Compounding NONE falls back to simple interest', () => {
      const compNone = calculateCompoundInterest(10000000, 0.12, 2, 'NONE');
      const simple = calculateSimpleInterest(10000000, 0.12, 2);
      expect(compNone).toBe(simple);
    });
  });

  // ==========================================
  // 3. REDUCING BALANCE EMI (Tests 11-16)
  // ==========================================
  describe('Reducing Balance EMI & Amortization', () => {
    test('11. Standard ₹100,000 at 12% p.a. for 12 months EMI', () => {
      // P = 100,000_00, r = 0.01 per month, n = 12
      // EMI = 100000 * 0.01 * (1.01^12) / (1.01^12 - 1) = ₹8,884.88 => 888488 paise
      const emi = calculateReducingEmi(10000000, 0.01, 12);
      expect(emi).toBe(888488);
    });

    test('12. ₹500,000 at 18% p.a. for 24 months EMI', () => {
      const monthlyRate = 0.18 / 12;
      const emi = calculateReducingEmi(50000000, monthlyRate, 24);
      expect(emi).toBe(2496205); // ₹24,962.05
    });

    test('13. Zero interest rate reducing balance splits principal equally', () => {
      const emi = calculateReducingEmi(12000000, 0, 12);
      expect(emi).toBe(1000000); // ₹10,000 per month
    });

    test('14. Single installment reducing balance equals principal + 1 period interest', () => {
      const emi = calculateReducingEmi(10000000, 0.02, 1);
      expect(emi).toBe(10200000); // ₹102,000
    });

    test('15. Reducing schedule amortizes principal exactly to zero', () => {
      const preview = calculateLoanPreview({
        principal: 10000000,
        interestType: 'REDUCING_BALANCE',
        interestRate: 12,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 12,
        tenureUnit: 'MONTHS',
        repaymentFrequency: 'MONTHLY',
      });

      expect(preview.schedule).toHaveLength(12);
      const last = preview.schedule[11];
      expect(last.remainingPrincipalBalance).toBe(0);

      const totalPrincipalPaid = preview.schedule.reduce((acc, row) => acc + row.principalDue, 0);
      expect(totalPrincipalPaid).toBe(10000000);
    });

    test('16. High interest informal lending: 3% per month (36% p.a.)', () => {
      const emi = calculateReducingEmi(5000000, 0.03, 6);
      expect(emi).toBeGreaterThan(5000000 / 6);
    });
  });

  // ==========================================
  // 4. FLAT RATE LOANS (Tests 17-20)
  // ==========================================
  describe('Flat Rate Loan Calculations', () => {
    test('17. Flat rate ₹100,000 at 12% p.a. for 1 year', () => {
      const preview = calculateLoanPreview({
        principal: 10000000,
        interestType: 'FLAT',
        interestRate: 12,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 12,
        tenureUnit: 'MONTHS',
        repaymentFrequency: 'MONTHLY',
      });

      // Total interest = 100,000 * 0.12 * 1 = 12,000_00
      expect(preview.totalInterest).toBe(1200000);
      expect(preview.totalPayable).toBe(11200000);
      expect(preview.schedule[11].remainingPrincipalBalance).toBe(0);
    });

    test('18. Flat rate weekly repayment: 10 weeks at 20% p.a.', () => {
      const preview = calculateLoanPreview({
        principal: 5000000,
        interestType: 'FLAT',
        interestRate: 20,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 10,
        tenureUnit: 'WEEKS',
        repaymentFrequency: 'WEEKLY',
      });

      expect(preview.schedule).toHaveLength(10);
    });

    test('19. ₹2 per ₹100 per month style rate period conversion', () => {
      // 2% per month => 24% per year
      const annualDecimal = getAnnualizedRateDecimal(2, 'PER_MONTH');
      expect(annualDecimal).toBeCloseTo(0.24, 4);
    });

    test('20. Per-day rate period conversion', () => {
      // 0.1% per day => 36.5% p.a.
      const annualDecimal = getAnnualizedRateDecimal(0.1, 'PER_DAY');
      expect(annualDecimal).toBeCloseTo(0.365, 4);
    });
  });

  // ==========================================
  // 5. INTEREST-ONLY & BULLET LOANS (Tests 21-23)
  // ==========================================
  describe('Interest-Only & Bullet Loans', () => {
    test('21. Interest-only bullet: ₹100,000 at 24% for 6 months', () => {
      const preview = calculateLoanPreview({
        principal: 10000000,
        interestType: 'INTEREST_ONLY',
        interestRate: 24,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 6,
        tenureUnit: 'MONTHS',
        repaymentFrequency: 'MONTHLY',
      });

      // 6 installments: first 5 are interest only (₹2,000), 6th has principal (₹100,000 + ₹2,000)
      expect(preview.schedule).toHaveLength(6);
      expect(preview.schedule[0].principalDue).toBe(0);
      expect(preview.schedule[0].interestDue).toBe(200000);
      expect(preview.schedule[5].principalDue).toBe(10000000);
    });

    test('22. Bullet principal at end of term', () => {
      const preview = calculateLoanPreview({
        principal: 5000000,
        interestType: 'SIMPLE',
        interestRate: 15,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 1,
        tenureUnit: 'YEARS',
        repaymentFrequency: 'BULLET',
      });

      expect(preview.schedule).toHaveLength(1);
      expect(preview.schedule[0].principalDue).toBe(5000000);
      expect(preview.schedule[0].interestDue).toBe(750000);
    });

    test('23. Zero interest loan schedule', () => {
      const preview = calculateLoanPreview({
        principal: 6000000,
        interestType: 'ZERO_INTEREST',
        interestRate: 0,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 6,
        tenureUnit: 'MONTHS',
        repaymentFrequency: 'MONTHLY',
      });

      expect(preview.totalInterest).toBe(0);
      expect(preview.schedule[0].totalDue).toBe(1000000);
    });
  });

  // ==========================================
  // 6. DAILY & INFORMAL SCHEMES (Tests 24-26)
  // ==========================================
  describe('Daily Collections & Advance Deductions', () => {
    test('24. 100-day daily collection scheme with advance interest deduction', () => {
      const preview = calculateLoanPreview({
        principal: 10000000,
        interestType: 'FLAT',
        interestRate: 10,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 100,
        tenureUnit: 'DAYS',
        repaymentFrequency: 'DAILY',
        advanceInterestDeducted: true,
      });

      expect(preview.schedule).toHaveLength(100);
      expect(preview.disbursedAmount).toBeLessThan(10000000);
    });

    test('25. Upfront processing fee deduction', () => {
      const preview = calculateLoanPreview({
        principal: 20000000,
        interestType: 'REDUCING_BALANCE',
        interestRate: 18,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 12,
        tenureUnit: 'MONTHS',
        repaymentFrequency: 'MONTHLY',
        upfrontDeduction: 200000, // ₹2,000 fee
      });

      expect(preview.disbursedAmount).toBe(19800000);
    });

    test('26. XIRR is higher than nominal rate when fees or advance interest are deducted', () => {
      const preview = calculateLoanPreview({
        principal: 10000000,
        interestType: 'FLAT',
        interestRate: 15,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-01-01',
        tenureValue: 12,
        tenureUnit: 'MONTHS',
        repaymentFrequency: 'MONTHLY',
        upfrontDeduction: 500000, // ₹5,000 fee
      });

      expect(preview.effectiveAnnualRate).toBeGreaterThan(15);
    });
  });

  // ==========================================
  // 7. PER-DAY ACCRUAL & DATES (Tests 27-31)
  // ==========================================
  describe('Per-day Accrual & Date Handling (Leap Years & Month-Ends)', () => {
    test('27. Per-day interest accrual for exactly 30 days', () => {
      // 100,000 at 36.5% p.a. for 30 days => (100,000 * 0.365 * 30) / 365 = ₹3,000
      const accrued = calculateAccruedInterest(10000000, 0.365, '2026-01-01', '2026-01-31');
      expect(accrued).toBe(300000);
    });

    test('28. Per-day interest on same day is 0', () => {
      const accrued = calculateAccruedInterest(10000000, 0.24, '2026-05-10', '2026-05-10');
      expect(accrued).toBe(0);
    });

    test('29. Leap year detection: 2024 is leap, 2025 and 2026 are not', () => {
      expect(isLeapYear(new Date('2024-01-01'))).toBe(true);
      expect(isLeapYear(new Date('2025-01-01'))).toBe(false);
      expect(isLeapYear(new Date('2026-01-01'))).toBe(false);
    });

    test('30. Month-end preservation: Jan 31 + 1 month => Feb 28 (non-leap)', () => {
      const d = addRepaymentInterval(new Date('2026-01-31'), 1, 'MONTHLY');
      expect(d.getDate()).toBe(28);
      expect(d.getMonth()).toBe(1); // February
    });

    test('31. Month-end preservation: Jan 31 + 1 month in leap year 2024 => Feb 29', () => {
      const d = addRepaymentInterval(new Date('2024-01-31'), 1, 'MONTHLY');
      expect(d.getDate()).toBe(29);
      expect(d.getMonth()).toBe(1);
    });
  });

  // ==========================================
  // 8. PENALTY ENGINE (Tests 32-35)
  // ==========================================
  describe('Penalty Engine with Grace Days', () => {
    test('32. Within grace days produces 0 penalty', () => {
      const result = calculateInstallmentPenalty(
        1000000, // ₹10,000 overdue
        '2026-05-01',
        '2026-05-04', // 3 days late
        { type: 'FLAT_PER_DAY', value: 5000, graceDays: 5 } // 5 grace days
      );
      expect(result.penaltyInPaise).toBe(0);
      expect(result.isWithinGrace).toBe(true);
    });

    test('33. FLAT_PER_DAY penalty after grace days: 10 days late with 3 grace days = 7 days charged', () => {
      const result = calculateInstallmentPenalty(
        1000000,
        '2026-05-01',
        '2026-05-11', // 10 days late
        { type: 'FLAT_PER_DAY', value: 5000, graceDays: 3 } // ₹50 per day
      );
      expect(result.penaltyInPaise).toBe(5000 * 7); // ₹350 = 35,000 paise
      expect(result.isWithinGrace).toBe(false);
    });

    test('34. PERCENT_PER_MONTH penalty computation', () => {
      const result = calculateInstallmentPenalty(
        10000000, // ₹100,000 overdue
        '2026-05-01',
        '2026-06-01', // 31 days late
        { type: 'PERCENT_PER_MONTH', value: 3, graceDays: 1 } // 3% per month, 1 grace day => 30 chargeable days
      );
      expect(result.penaltyInPaise).toBe(300000); // 3% of 100,000 = ₹3,000
    });

    test('35. ONE_TIME penalty fixed fee after grace period expires', () => {
      const result = calculateInstallmentPenalty(
        500000,
        '2026-05-01',
        '2026-05-10',
        { type: 'ONE_TIME', value: 25000, graceDays: 2 } // ₹250 flat
      );
      expect(result.penaltyInPaise).toBe(25000);
    });
  });

  // ==========================================
  // 9. PAYMENT ALLOCATION WATERFALL (Tests 36-39)
  // ==========================================
  describe('Payment Allocation Waterfall', () => {
    test('36. Exact installment payment clears interest and reduces principal', () => {
      // Due: penalty = 0, interest = 1,000_00, principal = 5,000_00
      // Pay: 6,000_00
      const allocation = allocatePaymentWaterfall(600000, 0, 100000, 500000);
      expect(allocation.allocatedPenalty).toBe(0);
      expect(allocation.allocatedInterest).toBe(100000);
      expect(allocation.allocatedPrincipal).toBe(500000);
      expect(allocation.remainingPrincipal).toBe(0);
      expect(allocation.isFullySettled).toBe(true);
    });

    test('37. Partial payment clears penalty first, then interest, then principal', () => {
      // Dues: penalty = 500_00, interest = 1,500_00, principal = 10,000_00
      // Pay: 1,000_00
      const allocation = allocatePaymentWaterfall(100000, 50000, 150000, 1000000);
      expect(allocation.allocatedPenalty).toBe(50000); // clears full 500 penalty
      expect(allocation.allocatedInterest).toBe(50000); // 500 towards interest
      expect(allocation.allocatedPrincipal).toBe(0);
      expect(allocation.remainingPrincipal).toBe(1000000);
      expect(allocation.isFullySettled).toBe(false);
    });

    test('38. Prepayment in excess of dues leaves unallocated excess', () => {
      const allocation = allocatePaymentWaterfall(2000000, 10000, 40000, 1500000);
      expect(allocation.allocatedPenalty).toBe(10000);
      expect(allocation.allocatedInterest).toBe(40000);
      expect(allocation.allocatedPrincipal).toBe(1500000);
      expect(allocation.unallocatedExcess).toBe(450000); // 2,000,000 - 1,550,000 = 450,000
      expect(allocation.isFullySettled).toBe(true);
    });

    test('39. Re-amortization after part payment: Reduce EMI vs Reduce Tenure', () => {
      // ₹100,000 remaining, 10 installments left, monthly rate 1%
      const reduceEmi = reAmortizeAfterPrepayment(5000000, 0.01, 10, 1055800, 'REDUCE_EMI');
      expect(reduceEmi.newInstallmentsCount).toBe(10);
      expect(reduceEmi.newEmiInPaise).toBeLessThan(1055800);

      const reduceTenure = reAmortizeAfterPrepayment(5000000, 0.01, 10, 1055800, 'REDUCE_TENURE');
      expect(reduceTenure.newInstallmentsCount).toBeLessThan(10);
      expect(reduceTenure.newEmiInPaise).toBe(1055800);
    });
  });

  // ==========================================
  // 10. FORECLOSURE & XIRR (Tests 40-45)
  // ==========================================
  describe('Foreclosure Quotes & XIRR', () => {
    test('40. Foreclosure quote as of today with accrued interest', () => {
      // Principal = 100,000, 36.5% p.a., 20 days since last payment
      const quote = calculateForeclosureQuote(
        10000000,
        0.365,
        '2026-05-01',
        '2026-05-21',
        50000, // ₹500 penalty
        2 // 2% foreclosure fee
      );

      // Daily interest = (100,000 * 0.365 * 20)/365 = ₹2,000
      // Fee = 2% of 100,000 = ₹2,000
      // Total = 100,000 + 2,000 + 500 + 2,000 = ₹104,500
      expect(quote.accruedInterest).toBe(200000);
      expect(quote.foreclosureFee).toBe(200000);
      expect(quote.totalSettlementAmount).toBe(10450000);
    });

    test('41. Foreclosure with zero fee and zero penalty', () => {
      const quote = calculateForeclosureQuote(5000000, 0.24, '2026-05-01', '2026-05-01');
      expect(quote.accruedInterest).toBe(0);
      expect(quote.totalSettlementAmount).toBe(5000000);
    });

    test('42. XIRR calculation with standard monthly cash flows', () => {
      const cashFlows = [
        { date: '2026-01-01', amount: -100000 },
        { date: '2026-02-01', amount: 8884.88 },
        { date: '2026-03-01', amount: 8884.88 },
        { date: '2026-04-01', amount: 8884.88 },
        { date: '2026-05-01', amount: 8884.88 },
        { date: '2026-06-01', amount: 8884.88 },
        { date: '2026-07-01', amount: 8884.88 },
        { date: '2026-08-01', amount: 8884.88 },
        { date: '2026-09-01', amount: 8884.88 },
        { date: '2026-10-01', amount: 8884.88 },
        { date: '2026-11-01', amount: 8884.88 },
        { date: '2026-12-01', amount: 8884.88 },
        { date: '2027-01-01', amount: 8884.88 },
      ];
      const rate = calculateXIRR(cashFlows);
      expect(rate).toBeGreaterThan(10);
      expect(rate).toBeLessThan(15);
    });

    test('43. Periodic rate conversion for weekly loans', () => {
      const rate = getPeriodicRateDecimal(0.52, 'WEEKLY');
      expect(rate).toBeCloseTo(0.01, 4);
    });

    test('44. Periodic rate conversion for biweekly loans', () => {
      const rate = getPeriodicRateDecimal(0.26, 'BIWEEKLY');
      expect(rate).toBeCloseTo(0.01, 4);
    });

    test('45. Full live preview integration check', () => {
      const preview = calculateLoanPreview({
        principal: 5000000,
        interestType: 'REDUCING_BALANCE',
        interestRate: 15,
        ratePeriod: 'PER_YEAR',
        disbursedOn: '2026-06-01',
        tenureValue: 6,
        tenureUnit: 'MONTHS',
        repaymentFrequency: 'MONTHLY',
        rounding: 'NEAREST_RUPEE',
      });

      expect(preview.schedule).toHaveLength(6);
      expect(preview.installmentAmount % 100).toBe(0); // Nearest rupee
      expect(preview.maturityDate).toBe('2026-12-01');
    });
  });
});
