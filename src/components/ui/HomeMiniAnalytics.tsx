import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Card } from './Card';
import { useTheme } from '@/store/useThemeStore';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { formatIndianCurrency } from '@/utils/formatters';
import { Loan } from '@/features/loans/types';
import { Payment } from '@/features/payments/types';

interface HomeMiniAnalyticsProps {
  loans: Loan[];
  payments: Payment[];
}

export function HomeMiniAnalytics({ loans, payments }: HomeMiniAnalyticsProps) {
  const { colors: dynamicColors, chartShades, isDark } = useTheme();

  // 1. Strict mathematical calculations for Collection & Recovery Progress
  const {
    totalReceivedPaise,
    totalPendingPaise,
    totalPortfolioPaise,
    recoveryRatePercent,
    pendingRatePercent,
  } = useMemo(() => {
    // Total Received = sum of all valid payments in paise
    const received = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Total Pending = sum of outstandingPrincipal + accruedInterest + penaltyAccrued on active / overdue loans
    const pending = loans
      .filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE')
      .reduce((acc, l) => acc + (l.outstandingPrincipal || 0) + (l.accruedInterest || 0) + (l.penaltyAccrued || 0), 0);

    const portfolio = received + pending;
    const recRate = portfolio > 0 ? (received / portfolio) * 100 : 0;
    const penRate = portfolio > 0 ? (pending / portfolio) * 100 : 0;

    return {
      totalReceivedPaise: received,
      totalPendingPaise: pending,
      totalPortfolioPaise: portfolio,
      recoveryRatePercent: Math.round(recRate * 10) / 10,
      pendingRatePercent: Math.round(penRate * 10) / 10,
    };
  }, [loans, payments]);

  // 2. Strict mathematical breakdown for Loan Category Pie/Donut Chart
  const categorySlices = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
    const totalActivePrincipal = activeLoans.reduce((sum, l) => sum + (l.principal || 0), 0);

    const map = new Map<string, { count: number; totalPaise: number }>();
    activeLoans.forEach((l) => {
      const cat = l.category || 'General';
      const existing = map.get(cat) || { count: 0, totalPaise: 0 };
      map.set(cat, {
        count: existing.count + 1,
        totalPaise: existing.totalPaise + (l.principal || 0),
      });
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1].totalPaise - a[1].totalPaise);

    let cumulativeAngle = 0;
    return entries.map(([category, info], index) => {
      const sharePercent = totalActivePrincipal > 0 ? (info.totalPaise / totalActivePrincipal) * 100 : 0;
      const angle = (sharePercent / 100) * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;

      const sliceColor = chartShades[index % chartShades.length] || dynamicColors.primary;

      return {
        category,
        count: info.count,
        totalPaise: info.totalPaise,
        sharePercent: Math.round(sharePercent * 10) / 10,
        color: sliceColor,
        startAngle,
        endAngle: cumulativeAngle,
      };
    });
  }, [loans, chartShades, dynamicColors.primary]);

  // SVG Donut Path helper
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.container}>
      {/* 1. Recovery & Collection Progress Bar Card */}
      <Card
        variant="surface"
        style={[
          styles.card,
          { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border, borderWidth: 1 },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: dynamicColors.headingPrimary }]}>
            Portfolio Recovery Rate
          </Text>
          <Text style={[styles.rateBadgeText, { color: dynamicColors.primaryDark }]}>
            {recoveryRatePercent}% Received
          </Text>
        </View>

        {/* Dual Progress Bar using Theme Monochromatic Shades */}
        <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#222222' : '#ECECF0' }]}>
          <View
            style={[
              styles.progressFillReceived,
              { width: `${Math.min(100, Math.max(0, recoveryRatePercent))}%`, backgroundColor: dynamicColors.primary },
            ]}
          />
          <View
            style={[
              styles.progressFillPending,
              { width: `${Math.min(100, Math.max(0, pendingRatePercent))}%`, backgroundColor: dynamicColors.primaryBorder },
            ]}
          />
        </View>

        {/* Subtitle Details with Exact Math */}
        <View style={styles.progressStatsRow}>
          <View style={styles.statCol}>
            <View style={styles.statDotRow}>
              <View style={[styles.statDot, { backgroundColor: dynamicColors.primary }]} />
              <Text style={[styles.statLabel, { color: dynamicColors.textSecondary }]}>Total Received</Text>
            </View>
            <Text
              style={[styles.statAmount, { color: dynamicColors.ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.75}
            >
              {formatIndianCurrency(totalReceivedPaise, { isMinorUnit: true }).formatted}
            </Text>
            <Text style={[styles.statSub, { color: dynamicColors.textTertiary }]}>
              {recoveryRatePercent}% of portfolio
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: dynamicColors.border }]} />

          <View style={styles.statCol}>
            <View style={styles.statDotRow}>
              <View style={[styles.statDot, { backgroundColor: dynamicColors.primaryBorder }]} />
              <Text style={[styles.statLabel, { color: dynamicColors.textSecondary }]}>Total Pending</Text>
            </View>
            <Text
              style={[styles.statAmount, { color: dynamicColors.ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.75}
            >
              {formatIndianCurrency(totalPendingPaise, { isMinorUnit: true }).formatted}
            </Text>
            <Text style={[styles.statSub, { color: dynamicColors.textTertiary }]}>
              {pendingRatePercent}% of portfolio
            </Text>
          </View>
        </View>
      </Card>

      {/* 2. Loan Category Distribution Donut / Pie Chart */}
      <Card
        variant="surface"
        style={[
          styles.card,
          { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border, borderWidth: 1 },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: dynamicColors.headingPrimary }]}>
            Loan Schemes & Category Share
          </Text>
          <Text style={[styles.catCountBadge, { color: dynamicColors.textSecondary }]}>
            {categorySlices.length} Active Types
          </Text>
        </View>

        <View style={styles.donutAndLegendWrap}>
          {/* Donut Chart SVG */}
          <View style={styles.chartWrapper}>
            <Svg width={size} height={size}>
              <G transform={`rotate(-90 ${center} ${center})`}>
                {/* Background Ring */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={isDark ? `${dynamicColors.primary}22` : `${dynamicColors.primary}12`}
                  strokeWidth={strokeWidth}
                  fill="none"
                />

                {/* Slices */}
                {categorySlices.map((slice, i) => {
                  const strokeDasharray = `${(slice.sharePercent / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((slice.startAngle / 360) * circumference);

                  return (
                    <Circle
                      key={slice.category}
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="butt"
                      fill="none"
                    />
                  );
                })}
              </G>

              {/* Center Text */}
              <SvgText
                x={center}
                y={center - 4}
                textAnchor="middle"
                fontSize="22"
                fontFamily="Polymath"
                letterSpacing="1"
                fill={dynamicColors.headingPrimary}
              >
                {loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE').length}
              </SvgText>
              <SvgText
                x={center}
                y={center + 14}
                textAnchor="middle"
                fontSize="11"
                fontFamily="PolymathThin"
                letterSpacing="0.8"
                fill={dynamicColors.textSecondary}
              >
                Active Loans
              </SvgText>
            </Svg>
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            {categorySlices.length === 0 ? (
              <Text style={[styles.emptyChartText, { color: dynamicColors.textSecondary }]}>
                No active loans categorized yet
              </Text>
            ) : (
              categorySlices.map((slice) => (
                <View key={slice.category} style={styles.legendRow}>
                  <View style={[styles.legendColorBox, { backgroundColor: slice.color }]} />
                  <View style={styles.legendInfo}>
                    <Text style={[styles.legendName, { color: dynamicColors.ink }]} numberOfLines={1}>
                      {slice.category}
                    </Text>
                    <Text
                      style={[styles.legendAmounts, { color: dynamicColors.textSecondary }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.75}
                    >
                      {slice.count} loans • {formatIndianCurrency(slice.totalPaise, { isMinorUnit: true }).formatted}
                    </Text>
                  </View>
                  <Text style={[styles.legendPercent, { color: dynamicColors.ink }]}>
                    {slice.sharePercent}%
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: radii.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: typography.fontPolymath,
    fontSize: 15,
    letterSpacing: 0.9,
  },
  rateBadgeText: {
    fontFamily: typography.fontPolymath,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  catCountBadge: {
    fontFamily: typography.fontPolymathThin,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFillReceived: {
    height: '100%',
  },
  progressFillPending: {
    height: '100%',
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  statDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  statAmount: {
    fontFamily: typography.fontPolymath,
    fontSize: 16,
    letterSpacing: 0.9,
  },
  statSub: {
    fontFamily: typography.fontPolymathThin,
    fontSize: 11,
    letterSpacing: 0.7,
    marginTop: 1,
  },
  donutAndLegendWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColorBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendInfo: {
    flex: 1,
  },
  legendName: {
    fontFamily: typography.fontPolymath,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  legendAmounts: {
    fontFamily: typography.fontPolymathThin,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  legendPercent: {
    fontFamily: typography.fontPolymath,
    letterSpacing: 0.9,
    fontSize: 13,
  },
  emptyChartText: {
    ...typography.caption,
  },
});
