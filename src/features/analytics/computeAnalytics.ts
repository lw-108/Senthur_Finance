import { Loan } from '@/features/loans/types';
import { Payment } from '@/features/payments/types';
import { AnalyticsSummary, AgingBucket } from './types';

export function computeAnalyticsData(
  loans: Loan[],
  payments: Payment[]
): AnalyticsSummary {
  const activeLoans = loans.filter((l) => !l.isDeleted && (l.status === 'ACTIVE' || l.status === 'OVERDUE'));
  const overdueLoans = loans.filter((l) => !l.isDeleted && l.status === 'OVERDUE');

  // Total lent & outstanding
  const totalDisbursedPaise = loans.reduce((acc, l) => acc + l.principal, 0);
  const totalOutstandingPaise = activeLoans.reduce((acc, l) => acc + l.outstandingPrincipal, 0);
  const totalCollectedPaise = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalOverduePaise = overdueLoans.reduce((acc, l) => acc + l.outstandingPrincipal, 0);

  // Average ticket size
  const averageTicketSizePaise = loans.length > 0 ? Math.round(totalDisbursedPaise / loans.length) : 0;

  // Collection efficiency = total collected / (total collected + overdue) * 100
  const collectionEfficiencyPercent =
    totalCollectedPaise + totalOverduePaise > 0
      ? Math.round((totalCollectedPaise / (totalCollectedPaise + totalOverduePaise)) * 1000) / 10
      : 100;

  // NPA Default Rate = overdue / total outstanding * 100
  const defaultRatePercent =
    totalOutstandingPaise > 0
      ? Math.round((totalOverduePaise / totalOutstandingPaise) * 1000) / 10
      : 0;

  // Weighted average portfolio yield
  const weightedInterestSum = activeLoans.reduce(
    (acc, l) => acc + l.interestRate * (l.ratePeriod === 'PER_MONTH' ? 12 : 1) * l.outstandingPrincipal,
    0
  );
  const portfolioYieldPercent =
    totalOutstandingPaise > 0
      ? Math.round((weightedInterestSum / totalOutstandingPaise) * 10) / 10
      : 0;

  // Predicted 30-day inflows (sum of active EMIs)
  const predicted30DaysInflowPaise = activeLoans.reduce((acc, l) => acc + l.installmentAmount, 0);

  // Aging buckets: 0-30, 31-60, 61-90, 90+ days
  const buckets: AgingBucket[] = [
    { range: '0-30 days', amountPaise: 0, count: 0 },
    { range: '31-60 days', amountPaise: 0, count: 0 },
    { range: '61-90 days', amountPaise: 0, count: 0 },
    { range: '90+ days', amountPaise: 0, count: 0 },
  ];

  overdueLoans.forEach((l) => {
    const days = l.daysOverdue;
    if (days <= 30) {
      buckets[0].amountPaise += l.outstandingPrincipal;
      buckets[0].count++;
    } else if (days <= 60) {
      buckets[1].amountPaise += l.outstandingPrincipal;
      buckets[1].count++;
    } else if (days <= 90) {
      buckets[2].amountPaise += l.outstandingPrincipal;
      buckets[2].count++;
    } else {
      buckets[3].amountPaise += l.outstandingPrincipal;
      buckets[3].count++;
    }
  });

  // Top defaulters
  const topDefaulters = overdueLoans
    .sort((a, b) => b.outstandingPrincipal - a.outstandingPrincipal)
    .slice(0, 5)
    .map((l) => ({
      name: l.customerName,
      amountPaise: l.outstandingPrincipal,
      daysOverdue: l.daysOverdue,
    }));

  // Interest type distribution
  const schemeCounts: Record<string, number> = {};
  loans.forEach((l) => {
    schemeCounts[l.interestType] = (schemeCounts[l.interestType] || 0) + 1;
  });

  const totalCount = loans.length || 1;
  const interestTypeDistribution = Object.entries(schemeCounts).map(([type, count]) => ({
    type,
    percentage: Math.round((count / totalCount) * 100),
  }));

  const totalAccruedInterestPaise = activeLoans.reduce(
    (acc, l) => acc + (l.accruedInterest || 0),
    0
  );

  return {
    portfolioYieldPercent,
    yieldDeltaPercent: 0,
    collectionEfficiencyPercent,
    defaultRatePercent,
    averageTicketSizePaise,
    predicted30DaysInflowPaise,
    totalDisbursedPaise,
    totalCollectedPaise,
    totalAccruedInterestPaise,
    agingBuckets: buckets,
    topDefaulters,
    interestTypeDistribution,
  };
}

export interface ChartPoint {
  label: string;
  value: number;
  displayValue: string;
}

export function computePortfolioChartPoints(
  loans: Loan[],
  payments: Payment[],
  timeRange: 'today' | '7d' | '30d' | 'fy'
): ChartPoint[] {
  const activeLoans = (loans || []).filter(
    (l) => !l.isDeleted && (l.status === 'ACTIVE' || l.status === 'OVERDUE')
  );

  // If there are no active loans, return an empty array to show EmptyState instead of mock points
  if (activeLoans.length === 0) {
    return [];
  }

  const now = new Date();

  // Helper to compute weighted annualized yield percent at a given point in time
  const getYieldAtDate = (targetDate: Date): number => {
    const loansAtDate = activeLoans.filter((l) => {
      const d = new Date(l.disbursedOn || l.createdAt);
      return d <= targetDate;
    });

    if (loansAtDate.length === 0) return 0;

    const totalPrincipal = loansAtDate.reduce((acc, l) => acc + l.outstandingPrincipal, 0);
    if (totalPrincipal === 0) return 0;

    const weightedSum = loansAtDate.reduce(
      (acc, l) => acc + l.interestRate * (l.ratePeriod === 'PER_MONTH' ? 12 : 1) * l.outstandingPrincipal,
      0
    );
    return Math.round((weightedSum / totalPrincipal) * 10) / 10;
  };

  if (timeRange === 'today') {
    const currentYield = getYieldAtDate(now);
    return [
      { label: '9 am', value: currentYield, displayValue: `${currentYield}%` },
      { label: '12 pm', value: currentYield, displayValue: `${currentYield}%` },
      { label: '3 pm', value: currentYield, displayValue: `${currentYield}%` },
      { label: '6 pm', value: currentYield, displayValue: `${currentYield}%` },
      { label: '9 pm', value: currentYield, displayValue: `${currentYield}%` },
    ];
  }

  if (timeRange === '7d') {
    const points: ChartPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yieldVal = getYieldAtDate(d);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      points.push({
        label,
        value: yieldVal,
        displayValue: `${yieldVal}%`,
      });
    }
    return points;
  }

  if (timeRange === '30d') {
    const points: ChartPoint[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 6);
      const yieldVal = getYieldAtDate(d);
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      points.push({
        label,
        value: yieldVal,
        displayValue: `${yieldVal}%`,
      });
    }
    return points;
  }

  // 'fy' (Financial Year)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const fyMonths = [3, 5, 7, 9, 11, 1]; // Apr, Jun, Aug, Oct, Dec, Feb
  const monthNames = ['Apr', 'Jun', 'Aug', 'Oct', 'Dec', 'Feb'];

  return fyMonths.map((m, idx) => {
    const year =
      m >= 3
        ? currentMonth >= 3
          ? currentYear
          : currentYear - 1
        : currentMonth >= 3
        ? currentYear + 1
        : currentYear;
    const d = new Date(year, m, 1);
    const yieldVal = getYieldAtDate(d);
    return {
      label: monthNames[idx],
      value: yieldVal,
      displayValue: `${yieldVal}%`,
    };
  });
}
