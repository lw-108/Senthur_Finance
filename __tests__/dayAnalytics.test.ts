import { describe, test, expect } from '@jest/globals';
import {
  computeDayAnalytics,
  getDatesWithActivity,
  formatYMD,
  formatTimeFromIso,
} from '../src/features/analytics/computeDayAnalytics';
import { Loan } from '../src/features/loans/types';
import { Payment } from '../src/features/payments/types';
import { AuditLog } from '../src/features/audit/types';

describe('computeDayAnalytics', () => {
  const samplePayments: Payment[] = [
    {
      id: 'pay-1',
      loanId: 'loan-1',
      customerId: 'cust-1',
      customerName: 'Karthik Raja',
      loanNumber: 'LN-2026-0001',
      receiptNumber: 'REC-2026-0001',
      amount: 1500000, // ₹15,000 in paise
      paidOn: '2026-10-27T10:30:00.000Z',
      mode: 'CASH',
      allocation: { penalty: 0, interest: 300000, principal: 1200000 },
      type: 'INSTALLMENT',
      createdAt: '2026-10-27T10:30:00.000Z',
      updatedAt: '2026-10-27T10:30:00.000Z',
      createdBy: 'admin',
      isDeleted: false,
    },
    {
      id: 'pay-2',
      loanId: 'loan-2',
      customerId: 'cust-2',
      customerName: 'Meenakshi Sundaram',
      loanNumber: 'LN-2026-0002',
      receiptNumber: 'REC-2026-0002',
      amount: 2500000, // ₹25,000 in paise
      paidOn: '2026-10-27T14:15:00.000Z',
      mode: 'UPI',
      allocation: { penalty: 0, interest: 500000, principal: 2000000 },
      type: 'INSTALLMENT',
      createdAt: '2026-10-27T14:15:00.000Z',
      updatedAt: '2026-10-27T14:15:00.000Z',
      createdBy: 'admin',
      isDeleted: false,
    },
    {
      id: 'pay-old',
      loanId: 'loan-3',
      customerId: 'cust-3',
      customerName: 'Suresh Kumar',
      loanNumber: 'LN-2026-0003',
      receiptNumber: 'REC-2026-0000',
      amount: 500000,
      paidOn: '2026-10-20T09:00:00.000Z',
      mode: 'CASH',
      allocation: { penalty: 0, interest: 100000, principal: 400000 },
      type: 'INSTALLMENT',
      createdAt: '2026-10-20T09:00:00.000Z',
      updatedAt: '2026-10-20T09:00:00.000Z',
      createdBy: 'admin',
      isDeleted: false,
    },
  ];

  const sampleLoans: Loan[] = [
    {
      id: 'loan-1',
      customerId: 'cust-1',
      customerName: 'Karthik Raja',
      loanNumber: 'LN-2026-0001',
      title: 'Business Expansion',
      category: 'Business Loan',
      principal: 10000000, // ₹1,00,000
      currency: 'INR',
      interestType: 'REDUCING_BALANCE',
      interestRate: 24,
      ratePeriod: 'PER_YEAR',
      compounding: 'MONTHLY',
      repaymentFrequency: 'MONTHLY',
      disbursedOn: '2026-10-27T08:00:00.000Z',
      firstDueDate: '2026-11-27',
      tenure: { value: 12, unit: 'MONTHS' },
      maturityDate: '2027-10-27',
      installmentAmount: 945600,
      numberOfInstallments: 12,
      upfrontDeduction: 200000,
      advanceInterestDeducted: false,
      penalty: { type: 'PERCENT_PER_MONTH', value: 2, graceDays: 3 },
      collateral: { type: 'None' },
      proofs: [],
      witnesses: [],
      status: 'ACTIVE',
      outstandingPrincipal: 8800000,
      accruedInterest: 0,
      totalPayable: 11347200,
      totalPaid: 1500000,
      daysOverdue: 0,
      penaltyAccrued: 0,
      progressPercent: 13.2,
      tags: [],
      isDeleted: false,
      createdAt: '2026-10-27T08:00:00.000Z',
      updatedAt: '2026-10-27T08:00:00.000Z',
      createdBy: 'admin',
    },
  ];

  const sampleAuditLogs: AuditLog[] = [
    {
      id: 'audit-1',
      who: 'admin',
      action: 'PAYMENT',
      entityType: 'PAYMENT',
      entityId: 'pay-extra',
      summary: 'Cash collection ₹5,000 from Ramesh',
      timestamp: '2026-10-27T16:00:00.000Z',
      after: {
        receiptNumber: 'REC-2026-0099',
        amountPaise: 500000, // ₹5,000
        paymentMode: 'CASH',
        customerName: 'Ramesh Krishnan',
        loanNumber: 'LN-2026-0005',
      },
    },
  ];

  test('correctly calculates total collections, disbursements, and net cashflow for selected date', () => {
    const data = computeDayAnalytics('2026-10-27', sampleLoans, samplePayments, sampleAuditLogs);

    // Collections: ₹15,000 + ₹25,000 (payments) + ₹5,000 (audit log) = ₹45,000 = 4,500,000 paise
    expect(data.totalCollectionsPaise).toBe(4500000);

    // Disbursements: ₹1,00,000 = 10,000,000 paise
    expect(data.totalDisbursedPaise).toBe(10000000);

    // Net cash flow: Collections - Disbursements = 45,000 - 100,000 = -55,000 = -5,500,000 paise
    expect(data.netCashflowPaise).toBe(-5500000);

    // Borrowers: Karthik Raja, Meenakshi Sundaram, Ramesh Krishnan = 3
    expect(data.borrowerCount).toBe(3);

    // Transactions count: 2 payments + 1 loan + 1 audit payment = 4
    expect(data.transactionsCount).toBe(4);
    expect(data.hasData).toBe(true);
  });

  test('generates valid chart points with at least 2 points for AreaChart', () => {
    const data = computeDayAnalytics('2026-10-27', sampleLoans, samplePayments, sampleAuditLogs);
    expect(data.chartPoints.length).toBeGreaterThanOrEqual(2);
    expect(data.chartPoints[0].displayValue).toBeDefined();
  });

  test('returns clean empty chart points when date has no transactions', () => {
    const data = computeDayAnalytics('2026-01-01', sampleLoans, samplePayments, sampleAuditLogs);
    expect(data.totalCollectionsPaise).toBe(0);
    expect(data.totalDisbursedPaise).toBe(0);
    expect(data.netCashflowPaise).toBe(0);
    expect(data.hasData).toBe(false);
    expect(data.chartPoints.length).toBe(5);
    expect(data.chartPoints[0].value).toBe(0);
  });

  test('identifies all dates with activity in DB and audit logs', () => {
    const activeDates = getDatesWithActivity(sampleLoans, samplePayments, sampleAuditLogs);
    expect(activeDates.has('2026-10-27')).toBe(true);
    expect(activeDates.has('2026-10-20')).toBe(true);
    expect(activeDates.has('2026-01-01')).toBe(false);
  });

  test('formats dates and time properly', () => {
    const ymd = formatYMD(new Date(2026, 9, 27)); // Oct is month index 9
    expect(ymd).toBe('2026-10-27');

    const formattedTime = formatTimeFromIso('2026-10-27T14:30:00.000Z');
    expect(formattedTime).toMatch(/AM|PM/);
  });
});
