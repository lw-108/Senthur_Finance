import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/useThemeStore';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { formatIndianCurrency } from '@/utils/formatters';

export interface HomeFinancialBentoProps {
  totalReceivedPaise: number;
  totalPendingPaise: number;
  activePrincipalPaise: number;
  activeLoansCount: number;
  totalPaymentsCount: number;
  collectedTodayPaise: number;
  collectedTodayCount: number;
  dueTodayPaise: number;
  dueTodayCount: number;
  overduePaise: number;
  overdueCount: number;
  onNewLoanPress: () => void;
  onRecordPaymentPress: () => void;
  onLoansPress?: () => void;
  onOverduePress?: () => void;
}

export function HomeFinancialBento({
  totalReceivedPaise,
  totalPendingPaise,
  activePrincipalPaise,
  activeLoansCount,
  totalPaymentsCount,
  collectedTodayPaise,
  collectedTodayCount,
  dueTodayPaise,
  dueTodayCount,
  overduePaise,
  overdueCount,
  onNewLoanPress,
  onRecordPaymentPress,
  onLoansPress,
  onOverduePress,
}: HomeFinancialBentoProps) {
  const { colors: dynamicColors, chartShades, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Recovery Rate Calculations
  const totalPortfolio = totalReceivedPaise + totalPendingPaise;
  const recoveryRatePercent =
    totalPortfolio > 0 ? Math.min(100, Math.max(0, Math.round((totalReceivedPaise / totalPortfolio) * 100))) : 0;
  const pendingRatePercent = totalPortfolio > 0 ? Math.max(0, 100 - recoveryRatePercent) : 0;

  // Formatted string values
  const totalPendingFormatted = formatIndianCurrency(totalPendingPaise, { isMinorUnit: true }).formatted;
  const totalReceivedFormatted = formatIndianCurrency(totalReceivedPaise, { isMinorUnit: true }).formatted;
  const activePrincipalFormatted = formatIndianCurrency(activePrincipalPaise, { isMinorUnit: true }).formatted;
  const collectedTodayFormatted = formatIndianCurrency(collectedTodayPaise, { isMinorUnit: true }).formatted;
  const dueTodayFormatted = formatIndianCurrency(dueTodayPaise, { isMinorUnit: true }).formatted;
  const overdueFormatted = formatIndianCurrency(overduePaise, { isMinorUnit: true }).formatted;

  // Dynamic value font size and weight adjusting based on character length so NO number ever truncates
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

  // Color theme shades for progress bar and cards
  const primaryShade = chartShades[0] || dynamicColors.primaryDark;
  const secondaryShade = chartShades[1] || dynamicColors.primary;
  const lightShade = chartShades[2] || dynamicColors.primaryBorder;
  const trackShade = isDark ? '#2D2D39' : '#ECECF4';

  return (
    <View style={styles.container}>
      {/* 1. Hero Bento Card: Portfolio Balance to Collect & Recovery Progress */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: dynamicColors.boxBackground || dynamicColors.surface,
            borderColor: dynamicColors.boxBorder || dynamicColors.border,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroLabelGroup}>
            <View style={[styles.heroIconBadge, { backgroundColor: dynamicColors.primarySoft }]}>
              <Ionicons name="hourglass-outline" size={19} color={dynamicColors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.heroTagRow}>
                <Text style={[styles.heroLabel, { color: dynamicColors.textSecondary }]}>
                  TO COLLECT (PENDING)
                </Text>
                <View
                  style={[
                    styles.heroBadge,
                    { backgroundColor: isDark ? '#3F3F46' : dynamicColors.surfaceMuted },
                  ]}
                >
                  <Text style={[styles.heroBadgeText, { color: dynamicColors.headingPrimary }]}>
                    {activeLoansCount} Active
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.heroValue,
                  getDynamicValueStyle(totalPendingFormatted, true),
                  { color: dynamicColors.headingPrimary || dynamicColors.ink },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.65}
              >
                {totalPendingFormatted}
              </Text>
            </View>
          </View>

          {/* Quick Action Button in Hero */}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.heroActionBtn, { backgroundColor: dynamicColors.primary }]}
              onPress={onRecordPaymentPress}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Record Loan Due Payment"
            >
              <Ionicons name="cash-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.heroActionText}>Collect Due</Text>
              <Ionicons name="chevron-forward" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Visual Progress Bar (Themed strictly with active theme shades) */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarTrack, { backgroundColor: trackShade }]}>
            {recoveryRatePercent > 0 && (
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${recoveryRatePercent}%`,
                    backgroundColor: primaryShade,
                  },
                ]}
              />
            )}
            {pendingRatePercent > 0 && (
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${pendingRatePercent}%`,
                    backgroundColor: lightShade,
                  },
                ]}
              />
            )}
          </View>

          {/* Progress Bar Metrics Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: primaryShade }]} />
              <Text style={[styles.legendText, { color: dynamicColors.textSecondary }]}>
                Collected:{' '}
                <Text style={{ color: dynamicColors.ink, fontWeight: '700' }}>
                  {totalReceivedFormatted} ({recoveryRatePercent}%)
                </Text>
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: lightShade }]} />
              <Text style={[styles.legendText, { color: dynamicColors.textSecondary }]}>
                Pending:{' '}
                <Text style={{ color: primaryShade, fontWeight: '700' }}>
                  {totalPendingFormatted} ({pendingRatePercent}%)
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Secondary Bento Grid Row 1: Money Collected & Active Lending */}
      <View style={[styles.gridRow, isTablet && styles.gridRowTablet]}>
        {/* Bento Tile A: Total Money Collected */}
        <View
          style={[
            styles.bentoTile,
            {
              backgroundColor: dynamicColors.surface,
              borderColor: dynamicColors.border,
            },
          ]}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: dynamicColors.primarySoft }]}>
              <Ionicons name="checkmark-done-circle-outline" size={17} color={dynamicColors.primaryDark} />
            </View>
            <View
              style={[
                styles.tileBadge,
                { backgroundColor: dynamicColors.primarySoft },
              ]}
            >
              <Text style={[styles.tileBadgeText, { color: dynamicColors.primaryDark }]}>
                {totalPaymentsCount} Payments
              </Text>
            </View>
          </View>

          <Text style={[styles.tileLabel, { color: dynamicColors.textSecondary }]}>
            MONEY COLLECTED
          </Text>
          <Text
            style={[
              styles.tileValue,
              getDynamicValueStyle(totalReceivedFormatted),
              { color: dynamicColors.primaryDark },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.65}
          >
            {totalReceivedFormatted}
          </Text>
          <Text style={[styles.tileSubtext, { color: dynamicColors.textTertiary }]}>
            Total repayment receipts logged
          </Text>
        </View>

        {/* Bento Tile B: Active Loans Capital Disbursed */}
        <TouchableOpacity
          style={[
            styles.bentoTile,
            {
              backgroundColor: dynamicColors.surface,
              borderColor: dynamicColors.border,
            },
          ]}
          onPress={onLoansPress || onNewLoanPress}
          activeOpacity={0.85}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: dynamicColors.primarySoft }]}>
              <Ionicons name="briefcase-outline" size={17} color={dynamicColors.primaryDark} />
            </View>
            <TouchableOpacity
              style={[
                styles.tileBadgeAction,
                { backgroundColor: dynamicColors.primarySoft, borderColor: dynamicColors.primary },
              ]}
              onPress={onNewLoanPress}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={13} color={dynamicColors.primaryDark} />
              <Text style={[styles.tileBadgeActionText, { color: dynamicColors.primaryDark }]}>
                New Loan
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.tileLabel, { color: dynamicColors.textSecondary }]}>
            ACTIVE LENDING
          </Text>
          <Text
            style={[
              styles.tileValue,
              getDynamicValueStyle(activePrincipalFormatted),
              { color: dynamicColors.ink },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.65}
          >
            {activePrincipalFormatted}
          </Text>
          <Text style={[styles.tileSubtext, { color: dynamicColors.textTertiary }]}>
            {activeLoansCount} active borrowing {activeLoansCount === 1 ? 'account' : 'accounts'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Operational Daily Collections Bento Row: Collected Today & Due Today */}
      <View style={[styles.gridRow, isTablet && styles.gridRowTablet]}>
        {/* Bento Tile C: Collected Today */}
        <View
          style={[
            styles.bentoTile,
            {
              backgroundColor: dynamicColors.surface,
              borderColor: dynamicColors.border,
            },
          ]}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: dynamicColors.primarySoft }]}>
              <Ionicons name="checkmark-done" size={17} color={dynamicColors.primaryDark} />
            </View>
            <View
              style={[
                styles.tileBadge,
                { backgroundColor: isDark ? '#3F3F46' : dynamicColors.surfaceMuted },
              ]}
            >
              <Text style={[styles.tileBadgeText, { color: dynamicColors.textSecondary }]}>
                Today
              </Text>
            </View>
          </View>

          <Text style={[styles.tileLabel, { color: dynamicColors.textSecondary }]}>
            COLLECTED TODAY
          </Text>
          <Text
            style={[
              styles.tileValue,
              getDynamicValueStyle(collectedTodayFormatted),
              { color: secondaryShade },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.65}
          >
            {collectedTodayFormatted}
          </Text>
          <Text style={[styles.tileSubtext, { color: dynamicColors.textTertiary }]}>
            {collectedTodayCount > 0 ? `${collectedTodayCount} collections today` : 'No collections logged yet'}
          </Text>
        </View>

        {/* Bento Tile D: Due Today */}
        <View
          style={[
            styles.bentoTile,
            {
              backgroundColor: dynamicColors.surface,
              borderColor: dynamicColors.border,
            },
          ]}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: isDark ? '#2D2D39' : dynamicColors.surfaceMuted }]}>
              <Ionicons name="time-outline" size={17} color={dynamicColors.textSecondary} />
            </View>
            <View
              style={[
                styles.tileBadge,
                { backgroundColor: isDark ? '#3F3F46' : dynamicColors.surfaceMuted },
              ]}
            >
              <Text style={[styles.tileBadgeText, { color: dynamicColors.textSecondary }]}>
                {dueTodayCount} Due
              </Text>
            </View>
          </View>

          <Text style={[styles.tileLabel, { color: dynamicColors.textSecondary }]}>
            DUE TODAY
          </Text>
          <Text
            style={[
              styles.tileValue,
              getDynamicValueStyle(dueTodayFormatted),
              { color: dynamicColors.ink },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.65}
          >
            {dueTodayFormatted}
          </Text>
          <Text style={[styles.tileSubtext, { color: dynamicColors.textTertiary }]}>
            {dueTodayCount > 0 ? `${dueTodayCount} installments scheduled` : 'No installments scheduled'}
          </Text>
        </View>
      </View>

      {/* 4. Conditional Overdue Alert Bento Card */}
      {overdueCount > 0 ? (
        <TouchableOpacity
          style={[
            styles.overdueCard,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
            },
          ]}
          onPress={onOverduePress || onRecordPaymentPress}
          activeOpacity={0.85}
        >
          <View style={styles.overdueLeft}>
            <View style={[styles.overdueIconWrap, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={18} color={dynamicColors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.overdueLabel, { color: dynamicColors.danger }]}>
                  OVERDUE LOAN DUES
                </Text>
                <View style={[styles.overdueBadge, { backgroundColor: dynamicColors.danger }]}>
                  <Text style={styles.overdueBadgeText}>{overdueCount} Late</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.overdueValue,
                  getDynamicValueStyle(overdueFormatted),
                  { color: dynamicColors.danger },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.65}
              >
                {overdueFormatted}
              </Text>
              <Text style={[styles.overdueSub, { color: dynamicColors.textSecondary }]}>
                Immediate follow-up required across overdue accounts
              </Text>
            </View>
          </View>

          <View style={[styles.overdueActionBtn, { backgroundColor: dynamicColors.danger }]}>
            <Text style={styles.overdueActionText}>Collect</Text>
            <Ionicons name="chevron-forward" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.onTimeCard,
            {
              backgroundColor: dynamicColors.primarySoft,
              borderColor: dynamicColors.primaryBorder,
            },
          ]}
        >
          <View style={[styles.onTimeIconWrap, { backgroundColor: dynamicColors.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={16} color={dynamicColors.primaryDark} />
          </View>
          <Text style={[styles.onTimeText, { color: dynamicColors.primaryDark }]}>
            Portfolio Health Excellent: 0 Overdue Loans
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    gap: 10,
  },
  heroCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroLabelGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  heroLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  heroBadgeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    fontWeight: '700',
  },
  heroValue: {
    fontFamily: typography.fontPolymath,
    lineHeight: 32,
    marginTop: 2,
  },
  heroActions: {
    alignSelf: 'center',
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  heroActionText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  progressContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    fontFamily: typography.fontHeadline,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridRowTablet: {
    flexDirection: 'row',
  },
  bentoTile: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    justifyContent: 'space-between',
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tileBadgeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    fontWeight: '700',
  },
  tileBadgeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  tileBadgeActionText: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    fontWeight: '700',
  },
  tileLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tileValue: {
    fontFamily: typography.fontPolymath,
    lineHeight: 26,
    marginTop: 2,
  },
  tileSubtext: {
    fontSize: 11,
    marginTop: 4,
  },
  overdueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  overdueLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  overdueIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  overdueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  overdueBadgeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overdueValue: {
    fontFamily: typography.fontPolymath,
    lineHeight: 24,
    marginTop: 2,
  },
  overdueSub: {
    fontSize: 11,
    marginTop: 2,
  },
  overdueActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  overdueActionText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  onTimeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onTimeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11.5,
    fontWeight: '700',
  },
});
