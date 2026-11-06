import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/useThemeStore';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { formatIndianCurrency } from '@/utils/formatters';

interface CustomerFinancialBentoProps {
  totalLent: number;
  totalOutstanding: number;
  totalPaid: number;
  overdueAmount: number;
  activeLoansCount: number;
  totalLoansCount: number;
  onCollectDue?: () => void;
  onNewLoan?: () => void;
}

export function CustomerFinancialBento({
  totalLent,
  totalOutstanding,
  totalPaid,
  overdueAmount,
  activeLoansCount,
  totalLoansCount,
  onCollectDue,
  onNewLoan,
}: CustomerFinancialBentoProps) {
  const { colors: dynamicColors, chartShades, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;

  // Recovery Rate Calculations
  const totalPortfolio = totalPaid + totalOutstanding;
  const recoveryRatePercent =
    totalPortfolio > 0 ? Math.min(100, Math.max(0, Math.round((totalPaid / totalPortfolio) * 100))) : 0;
  const pendingRatePercent = totalPortfolio > 0 ? Math.max(0, 100 - recoveryRatePercent) : 0;

  // Themed Progress Bar Shades
  const primaryShade = chartShades[0] || dynamicColors.primary;
  const secondaryShade = chartShades[1] || dynamicColors.primaryDark;
  const softShade = chartShades[2] || dynamicColors.primarySoft;
  const mutedShade = isDark ? '#3F3F46' : '#E4E4E7';

  return (
    <View style={styles.container}>
      {/* 1. Hero Bento Card: Active Balance to Pay */}
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
              <Ionicons name="wallet" size={18} color={dynamicColors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroLabel, { color: dynamicColors.textSecondary }]}>
                BALANCE TO PAY
              </Text>
              <Text
                style={[styles.heroValue, { color: dynamicColors.headingPrimary || dynamicColors.ink }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {formatIndianCurrency(totalOutstanding, { isMinorUnit: true }).formatted}
              </Text>
            </View>
          </View>

          {totalOutstanding > 0 && onCollectDue && (
            <TouchableOpacity
              style={[styles.heroActionBtn, { backgroundColor: dynamicColors.primary }]}
              onPress={onCollectDue}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Collect Due Payment"
            >
              <Ionicons name="cash-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.heroActionText}>Collect Due</Text>
              <Ionicons name="chevron-forward" size={13} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Visual Dual Progress Bar (Theme-shaded like in graphs area) */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarTrack, { backgroundColor: mutedShade }]}>
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
                    backgroundColor: softShade,
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
                Cleared:{' '}
                <Text style={{ color: dynamicColors.ink, fontWeight: '700' }}>
                  {formatIndianCurrency(totalPaid, { isMinorUnit: true }).formatted} ({recoveryRatePercent}%)
                </Text>
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: softShade }]} />
              <Text style={[styles.legendText, { color: dynamicColors.textSecondary }]}>
                Remaining:{' '}
                <Text style={{ color: dynamicColors.primaryDark, fontWeight: '700' }}>
                  {formatIndianCurrency(totalOutstanding, { isMinorUnit: true }).formatted}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Secondary Bento Grid Row: Total Loan Given & Total Repaid */}
      <View style={[styles.secondaryRow, isTablet && styles.secondaryRowTablet]}>
        {/* Card A: Total Loan Given */}
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
              <Ionicons name="cash-outline" size={18} color={dynamicColors.primaryDark} />
            </View>
            <View
              style={[
                styles.tileBadge,
                { backgroundColor: isDark ? '#3F3F46' : dynamicColors.surfaceMuted },
              ]}
            >
              <Text style={[styles.tileBadgeText, { color: dynamicColors.textSecondary }]}>
                {activeLoansCount} Active
              </Text>
            </View>
          </View>

          <Text style={[styles.tileLabel, { color: dynamicColors.textSecondary }]}>
            TOTAL LOAN GIVEN
          </Text>
          <Text
            style={[styles.tileValue, { color: dynamicColors.ink }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            {formatIndianCurrency(totalLent, { isMinorUnit: true }).formatted}
          </Text>
          <Text style={[styles.tileSubtext, { color: dynamicColors.textTertiary }]}>
            Across {totalLoansCount} {totalLoansCount === 1 ? 'account' : 'accounts'}
          </Text>
        </View>

        {/* Card B: Total Repaid */}
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
              <Ionicons name="checkmark-circle-outline" size={18} color={dynamicColors.primaryDark} />
            </View>
            <View
              style={[
                styles.tileBadge,
                { backgroundColor: dynamicColors.primarySoft },
              ]}
            >
              <Text style={[styles.tileBadgeText, { color: dynamicColors.primaryDark }]}>
                {recoveryRatePercent}% Paid
              </Text>
            </View>
          </View>

          <Text style={[styles.tileLabel, { color: dynamicColors.textSecondary }]}>
            TOTAL REPAID
          </Text>
          <Text
            style={[styles.tileValue, { color: dynamicColors.primaryDark }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            {formatIndianCurrency(totalPaid, { isMinorUnit: true }).formatted}
          </Text>
          <Text style={[styles.tileSubtext, { color: dynamicColors.textTertiary }]}>
            Principal + Interest collected
          </Text>
        </View>
      </View>

      {/* 3. Conditional Overdue Alert Bento Card */}
      {overdueAmount > 0 && (
        <View
          style={[
            styles.overdueCard,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
            },
          ]}
        >
          <View style={styles.overdueLeft}>
            <View style={[styles.overdueIconWrap, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={18} color={dynamicColors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.overdueLabel, { color: dynamicColors.danger }]}>
                OVERDUE INSTALLMENTS
              </Text>
              <Text
                style={[styles.overdueValue, { color: dynamicColors.danger }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {formatIndianCurrency(overdueAmount, { isMinorUnit: true }).formatted}
              </Text>
              <Text style={[styles.overdueSub, { color: dynamicColors.textSecondary }]}>
                Action required • Collect overdue installments
              </Text>
            </View>
          </View>

          {onCollectDue && (
            <TouchableOpacity
              style={[styles.overdueActionBtn, { backgroundColor: dynamicColors.danger }]}
              onPress={onCollectDue}
              activeOpacity={0.85}
            >
              <Text style={styles.overdueActionText}>Clear Due</Text>
            </TouchableOpacity>
          )}
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
  heroLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontFamily: typography.fontPolymath,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'center',
  },
  heroActionText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryRowTablet: {
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
  tileLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tileValue: {
    fontFamily: typography.fontPolymath,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  overdueValue: {
    fontFamily: typography.fontPolymath,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  overdueSub: {
    fontSize: 11,
    marginTop: 2,
  },
  overdueActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overdueActionText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
