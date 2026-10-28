export type AnalyticsTimeRange = 'today' | '7d' | '30d' | 'fy' | 'custom';

export type AnalyticsMetric =
  | 'yield'
  | 'collections'
  | 'disbursements'
  | 'interest'
  | 'outstanding'
  | 'overdue';

export interface AgingBucket {
  range: '0-30 days' | '31-60 days' | '61-90 days' | '90+ days';
  amountPaise: number;
  count: number;
}

export interface AnalyticsSummary {
  portfolioYieldPercent: number; // e.g. 18.9
  yieldDeltaPercent: number; // e.g. -0.062
  collectionEfficiencyPercent: number; // e.g. 94.2
  defaultRatePercent: number; // e.g. 1.8
  averageTicketSizePaise: number; // in paise
  predicted30DaysInflowPaise: number; // in paise
  totalDisbursedPaise: number;
  totalCollectedPaise: number;
  totalAccruedInterestPaise: number;
  agingBuckets: AgingBucket[];
  topDefaulters: { name: string; amountPaise: number; daysOverdue: number }[];
  interestTypeDistribution: { type: string; percentage: number }[];
}
