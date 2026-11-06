import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Header,
  DisplayTitle,
  Tile,
  AreaChartWrapper,
  SegmentedControl,
  Card,
  ListRow,
  Badge,
  EmptyState,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useLoans } from '@/features/loans/hooks';
import { usePayments } from '@/features/payments/hooks';
import { useAuditLogs } from '@/features/audit/hooks';
import { useTheme } from '@/store/useThemeStore';
import { computeAnalyticsData, computePortfolioChartPoints } from '@/features/analytics/computeAnalytics';
import {
  computeDayAnalytics,
  getDatesWithActivity,
  formatYMD,
} from '@/features/analytics/computeDayAnalytics';
import { CalendarPickerModal } from '@/components/analytics/CalendarPickerModal';
import { formatIndianCurrency } from '@/utils/formatters';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { colors, chartShades } = useTheme();
  const [activeTab, setActiveTab] = useState<'day' | 'yield'>('day');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'fy'>('today');

  // Selected date defaults to today
  const [selectedDate, setSelectedDate] = useState<string>(() => formatYMD(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: loans, isLoading: loansLoading, refetch: refetchLoans } = useLoans();
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = usePayments();
  const { data: auditLogs, isLoading: auditLoading, refetch: refetchAuditLogs } = useAuditLogs();

  const isRefreshing = loansLoading || paymentsLoading || auditLoading;
  const handleRefresh = async () => {
    await Promise.all([refetchLoans(), refetchPayments(), refetchAuditLogs()]);
  };

  // 1. Precise real-time calculations for the selected date from DB and audit logs
  const dayAnalytics = computeDayAnalytics(
    selectedDate,
    loans || [],
    payments || [],
    auditLogs || []
  );

  // 2. Dates with DB activity to highlight in calendar
  const activeDatesSet = getDatesWithActivity(loans || [], payments || [], auditLogs || []);

  // 3. Macro portfolio analytics
  const analytics = computeAnalyticsData(loans || [], payments || []);
  const portfolioChartData = computePortfolioChartPoints(loans || [], payments || [], timeRange);

  return (
    <Screen
      scrollable
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    >
      <Header
        showSupportPill={false}
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/calculator' as any)}
            style={styles.calcBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Open Financial Calculator"
          >
            <Ionicons name="calculator-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Page Title */}
      <DisplayTitle
        title="Analytics"
        subtitle="Portfolio yield, recoveries & prediction analytics"
        size="large"
      />

      {/* Top Date Selection Button - Shifted Below Page Title as Requested */}
      <View style={styles.dateSelectorWrapper}>
        <TouchableOpacity
          onPress={() => setCalendarOpen(true)}
          style={[
            styles.dateSelectorBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Select date to draw analytics calendar"
        >
          <View style={styles.dateSelectorLeft}>
            <View style={[styles.calendarIconBubble, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
            </View>
            <View>
              <Text style={[styles.dateSelectorSub, { color: colors.textSecondary }]}>
                {dayAnalytics.dayOfWeek ? `${dayAnalytics.dayOfWeek} • ` : ''}Filter By Date
              </Text>
              <Text
                style={[
                  styles.dateSelectorMain,
                  { color: colors.ink, fontFamily: typography.fontHeadline, letterSpacing: 0.8 },
                ]}
              >
                {dayAnalytics.formattedDate}
              </Text>
            </View>
          </View>

          <View style={styles.dateSelectorRight}>
            <Badge
              status={dayAnalytics.hasData ? 'ACTIVE' : 'DRAFT'}
              label={dayAnalytics.hasData ? `${dayAnalytics.transactionsCount} Tx` : '0 Tx'}
              size="sm"
              showDot={false}
            />
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Analytics View Switcher */}
      <View style={styles.segmentedWrapper}>
        <SegmentedControl
          items={[
            { label: 'Day Cash Flow', value: 'day' },
            { label: 'Portfolio Yield', value: 'yield' },
          ]}
          selectedValue={activeTab}
          onSelect={(val) => setActiveTab(val as any)}
        />
      </View>

      {/* TAB 1: Selected Date Real-Time Graph & Transaction Breakdown */}
      {activeTab === 'day' && (
        <>
          {/* Day Collections Hero Header */}
          <View style={styles.yieldContainer}>
            <Text style={[styles.yieldLabel, { color: colors.textSecondary }]}>
              Total Collections on {dayAnalytics.formattedDate}
            </Text>
            <View style={styles.yieldValueRow}>
              <Text
                style={[
                  styles.yieldValue,
                  { color: colors.headingPrimary, fontFamily: typography.fontAmount, letterSpacing: 0.8 },
                ]}
              >
                {formatIndianCurrency(dayAnalytics.totalCollectionsPaise, { isMinorUnit: true }).formatted}
              </Text>
              {dayAnalytics.transactionsCount > 0 && (
                <View
                  style={[
                    styles.netBadge,
                    {
                      backgroundColor:
                        dayAnalytics.netCashflowPaise >= 0 ? colors.successLight : colors.warningLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={dayAnalytics.netCashflowPaise >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={13}
                    color={dayAnalytics.netCashflowPaise >= 0 ? colors.success : colors.warning}
                  />
                  <Text
                    style={[
                      styles.netBadgeText,
                      {
                        color: dayAnalytics.netCashflowPaise >= 0 ? colors.success : colors.warning,
                        fontFamily: typography.fontAmount,
                        letterSpacing: 0.6,
                      },
                    ]}
                  >
                    Net:{' '}
                    {formatIndianCurrency(dayAnalytics.netCashflowPaise, { isMinorUnit: true }).formatted}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Real-time Dynamic Area Chart */}
          {dayAnalytics.chartPoints.length >= 2 && (
            <AreaChartWrapper
              data={dayAnalytics.chartPoints}
              height={200}
              chartColor={colors.primary}
              currencyPrefix="₹"
            />
          )}

          {!dayAnalytics.hasData && (
            <Card
              variant="surface"
              style={[
                styles.emptyDayNotice,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <EmptyState
                iconName="calendar-clear-outline"
                title={`No Activity on ${dayAnalytics.formattedDate}`}
                description="Tap the calendar button above to pick a date with customer collections or disburse new loans."
              />
            </Card>
          )}

          {/* Day KPI Tiles Calculated Mathematically */}
          <View style={styles.tilesGrid}>
            <View style={styles.tilesRow}>
              <Tile
                label="Day Collections"
                value={formatIndianCurrency(dayAnalytics.totalCollectionsPaise, { isMinorUnit: true }).formatted}
                subtitle={`${dayAnalytics.transactions.filter((t) => t.type === 'PAYMENT').length} payments`}
                iconName="arrow-down-circle-outline"
                iconColor={colors.success}
                iconBgColor={colors.successLight}
              />
              <Tile
                label="Disbursements"
                value={formatIndianCurrency(dayAnalytics.totalDisbursedPaise, { isMinorUnit: true }).formatted}
                subtitle={`${dayAnalytics.transactions.filter((t) => t.type === 'DISBURSEMENT').length} new loans`}
                iconName="arrow-up-circle-outline"
                iconColor={colors.primaryDark}
                iconBgColor={colors.primarySoft}
              />
            </View>

            <View style={styles.tilesRow}>
              <Tile
                label="Net Cash Flow"
                value={formatIndianCurrency(dayAnalytics.netCashflowPaise, { isMinorUnit: true }).formatted}
                subtitle={dayAnalytics.netCashflowPaise >= 0 ? 'Surplus Inflow' : 'Disbursement Outflow'}
                iconName="swap-horizontal-outline"
                iconColor={dayAnalytics.netCashflowPaise >= 0 ? colors.success : colors.warning}
              />
              <Tile
                label="Active Customers"
                value={`${dayAnalytics.borrowerCount}`}
                subtitle="Transacted today"
                iconName="people-outline"
                iconColor={colors.ink}
              />
            </View>
          </View>

          {/* Day's Customer Transaction History from DB & Audit Logs */}
          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.headingPrimary, fontFamily: typography.fontHeadline, letterSpacing: 0.8 },
                ]}
              >
                Customer Transactions
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {dayAnalytics.formattedDate} • {dayAnalytics.transactions.length} record(s) in DB
              </Text>
            </View>
          </View>

          <Card
            variant="surface"
            style={[
              styles.transactionsCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            {dayAnalytics.transactions.length > 0 ? (
              dayAnalytics.transactions.map((tx) => (
                <ListRow
                  key={tx.id}
                  title={tx.borrowerName}
                  subtitle={`${tx.loanNumber} • ${tx.mode} • ${tx.timeFormatted}${tx.receiptNumber ? ` • ${tx.receiptNumber}` : ''}`}
                  iconName={tx.type === 'PAYMENT' ? 'cash-outline' : 'send-outline'}
                  iconColor={tx.type === 'PAYMENT' ? colors.success : colors.primaryDark}
                  iconBgColor={tx.type === 'PAYMENT' ? colors.successLight : colors.primarySoft}
                  rightAmount={`${tx.type === 'PAYMENT' ? '+' : '-'}${formatIndianCurrency(tx.amountPaise, { isMinorUnit: true }).formatted}`}
                  rightAmountType={tx.type === 'PAYMENT' ? 'positive' : 'negative'}
                  rightSubtext={tx.type === 'PAYMENT' ? 'Collection' : 'Disbursed'}
                />
              ))
            ) : (
              <EmptyState
                iconName="receipt-outline"
                title="Zero Transactions Recorded"
                description={`No collections or payments recorded in the database for ${dayAnalytics.formattedDate}.`}
              />
            )}
          </Card>
        </>
      )}

      {/* TAB 2: Portfolio Yield Trend & Macro Performance */}
      {activeTab === 'yield' && (
        <>
          {/* Yield Section */}
          <View style={styles.yieldContainer}>
            <Text style={[styles.yieldLabel, { color: colors.textSecondary }]}>Portfolio Yield</Text>
            <View style={styles.yieldValueRow}>
              <Text
                style={[
                  styles.yieldValue,
                  { color: colors.headingPrimary, fontFamily: typography.fontAmount, letterSpacing: 0.8 },
                ]}
              >
                {analytics.portfolioYieldPercent}%
              </Text>
              {analytics.yieldDeltaPercent !== 0 && (
                <View style={styles.deltaBadge}>
                  <Ionicons
                    name={analytics.yieldDeltaPercent >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={12}
                    color={analytics.yieldDeltaPercent >= 0 ? colors.success : colors.danger}
                  />
                  <Text
                    style={[
                      styles.deltaText,
                      { color: analytics.yieldDeltaPercent >= 0 ? colors.success : colors.danger },
                    ]}
                  >
                    {analytics.yieldDeltaPercent}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Portfolio Yield Chart */}
          {portfolioChartData.length >= 2 ? (
            <AreaChartWrapper
              data={portfolioChartData}
              height={200}
              chartColor={colors.primary}
              currencyPrefix=""
            />
          ) : (
            <Card
              variant="surface"
              style={[
                styles.emptyChartCard,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <EmptyState
                iconName="trending-up-outline"
                title="No Performance Chart Data"
                description="Portfolio yield curves and trends will plot automatically once active loans are disbursed."
              />
            </Card>
          )}

          {/* Segmented Range Control */}
          <SegmentedControl
            items={[
              { label: 'Today', value: 'today' },
              { label: '7 Days', value: '7d' },
              { label: '30 Days', value: '30d' },
              { label: 'This FY', value: 'fy' },
            ]}
            selectedValue={timeRange}
            onSelect={(val) => setTimeRange(val as any)}
          />

          {/* KPI Tiles */}
          <View style={styles.tilesGrid}>
            <View style={styles.tilesRow}>
              <Tile
                label="Collection Rate"
                value={`${analytics.collectionEfficiencyPercent}%`}
                subtitle="Efficiency score"
                iconName="trending-up-outline"
                iconColor={colors.success}
                iconBgColor={colors.successLight}
              />
              <Tile
                label="Default Rate (NPA)"
                value={`${analytics.defaultRatePercent}%`}
                subtitle="Low risk tier"
                iconName="shield-outline"
                iconColor={colors.primaryDark}
                iconBgColor={colors.primarySoft}
              />
            </View>

            <View style={styles.tilesRow}>
              <Tile
                label="Avg Ticket Size"
                value={formatIndianCurrency(analytics.averageTicketSizePaise, { isMinorUnit: true }).formatted}
                subtitle="Across loans"
                iconName="receipt-outline"
              />
              <Tile
                label="Predicted 30d Inflow"
                value={formatIndianCurrency(analytics.predicted30DaysInflowPaise, { isMinorUnit: true }).formatted}
                subtitle="From active schedule"
                iconName="calendar-outline"
              />
            </View>
          </View>
        </>
      )}

      {/* Delinquency / Overdue Aging Buckets */}
      <View style={styles.sectionHeader}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.headingPrimary, fontFamily: typography.fontHeadline, letterSpacing: 0.8 },
          ]}
        >
          Delinquency Aging Buckets
        </Text>
      </View>
      <Card
        variant="surface"
        style={[
          styles.agingCard,
          { backgroundColor: colors.surface, borderColor: colors.boxBorder, borderWidth: 1 },
        ]}
      >
        {analytics.agingBuckets.some((b) => b.amountPaise > 0) ? (
          analytics.agingBuckets.map((bucket, idx) => (
            <View key={bucket.range} style={[styles.agingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.agingLeft}>
                <View
                  style={[
                    styles.agingDot,
                    { backgroundColor: chartShades[(idx * 2) % chartShades.length] || colors.primary },
                  ]}
                />
                <Text style={[styles.agingLabel, { color: colors.ink }]}>{bucket.range}</Text>
              </View>
              <Text
                style={[
                  styles.agingValue,
                  { color: colors.ink, fontFamily: typography.fontAmount, letterSpacing: 0.6 },
                ]}
              >
                {formatIndianCurrency(bucket.amountPaise, { isMinorUnit: true }).formatted}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState
            iconName="shield-checkmark-outline"
            title="Zero Delinquencies"
            description="No loans are currently past their due date. Portfolio health is 100%."
          />
        )}
      </Card>

      {/* High Attention Defaulters */}
      <View style={styles.sectionHeader}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.headingPrimary, fontFamily: typography.fontHeadline, letterSpacing: 0.8 },
          ]}
        >
          High Attention Defaulters
        </Text>
      </View>
      <Card
        variant="surface"
        style={[
          styles.defaultersCard,
          { backgroundColor: colors.surface, borderColor: colors.boxBorder, borderWidth: 1 },
        ]}
      >
        {analytics.topDefaulters.length > 0 ? (
          analytics.topDefaulters.map((item) => (
            <ListRow
              key={item.name}
              title={item.name}
              subtitle={`${item.daysOverdue} days overdue`}
              iconName="alert-circle"
              iconColor={colors.danger}
              iconBgColor={colors.dangerLight}
              rightAmount={formatIndianCurrency(item.amountPaise, { isMinorUnit: true }).formatted}
              rightAmountType="negative"
              rightSubtext="Overdue"
            />
          ))
        ) : (
          <EmptyState
            iconName="checkmark-circle-outline"
            title="Zero Delinquencies"
            description="All customer accounts are current and in good standing."
          />
        )}
      </Card>

      {/* Interactive Calendar Drawer Modal */}
      <CalendarPickerModal
        visible={calendarOpen}
        selectedDate={selectedDate}
        activeDates={activeDatesSet}
        onClose={() => setCalendarOpen(false)}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setActiveTab('day'); // Automatically switch to Day Cash Flow view for that date
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  calcBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelectorWrapper: {
    marginVertical: 10,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelectorSub: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateSelectorMain: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentedWrapper: {
    marginVertical: 8,
  },
  yieldContainer: {
    marginVertical: 12,
  },
  yieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  yieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  yieldValue: {
    fontFamily: typography.fontAmount,
    fontSize: 34,
    color: colors.ink,
    letterSpacing: 0.8,
  },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  netBadgeText: {
    fontFamily: typography.fontPolymath,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 3,
  },
  deltaText: {
    fontFamily: typography.fontPolymath,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  emptyChartCard: {
    padding: 20,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDayNotice: {
    padding: 16,
    marginVertical: 12,
  },
  tilesGrid: {
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionsCard: {
    padding: 6,
    marginBottom: 14,
  },
  agingCard: {
    padding: 16,
    marginBottom: 14,
  },
  agingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  agingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  agingLabel: {
    ...typography.bodyMedium,
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.8,
    color: colors.ink,
  },
  agingValue: {
    fontFamily: typography.fontPolymath,
    letterSpacing: 0.9,
    fontSize: 14,
    color: colors.ink,
  },
  defaultersCard: {
    padding: 6,
    marginBottom: 40,
  },
});
