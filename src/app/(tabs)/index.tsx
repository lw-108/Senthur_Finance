import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Header,
  DisplayTitle,
  StackedLoanCards,
  Card,
  ListRow,
  Badge,
  Avatar,
  EmptyState,
  SkeletonLoader,
  useToast,
  HomeMiniAnalytics,
  AuditLogsViewer,
  HomeFinancialBento,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useLoans } from '@/features/loans/hooks';
import { usePayments } from '@/features/payments/hooks';
import { Payment } from '@/features/payments/types';
import { PaymentReceiptModal } from '@/features/payments/components/PaymentReceiptModal';
import { useCustomers } from '@/features/customers/hooks';
import { useAuditLogs } from '@/features/audit/hooks';
import { useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { formatIndianCurrency, formatDate } from '@/utils/formatters';
import { openWhatsApp } from '@/utils/whatsapp';
import { StackedLoanItem } from '@/components/ui/StackedLoanCards';

export default function HomeScreen() {
  const router = useRouter();
  const { showSuccess } = useToast();
  const { colors } = useTheme();
  const { business } = useBusinessSettingsStore();
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const { data: loans, isLoading: loansLoading, refetch: refetchLoans, isRefetching: loansRefetching } = useLoans();
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = usePayments();
  const { data: customers } = useCustomers();
  const { data: auditLogs, isLoading: auditLoading, refetch: refetchAuditLogs } = useAuditLogs();

  const handleRefresh = async () => {
    await Promise.all([refetchLoans(), refetchPayments(), refetchAuditLogs()]);
    showSuccess('Dashboard updated');
  };

  // Compute live aggregates strictly calculated from database
  const activeLoans = (loans || []).filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
  const overdueLoans = (loans || []).filter((l) => l.status === 'OVERDUE');

  // Mathematical Calculations for KPI Cards
  const totalReceivedPaise = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPendingPaise = activeLoans.reduce(
    (sum, l) => sum + (l.outstandingPrincipal || 0) + (l.accruedInterest || 0) + (l.penaltyAccrued || 0),
    0
  );
  const activeLoansCount = activeLoans.length;
  const activePrincipalPaise = activeLoans.reduce((sum, l) => sum + (l.principal || 0), 0);

  const totalOutstandingPaise = activeLoans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
  const overduePaise = overdueLoans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);

  // Compute payments collected today
  const todayStr = new Date().toISOString().split('T')[0];
  const collectedTodayPayments = (payments || []).filter((p) => p.paidOn.startsWith(todayStr));
  const collectedTodayPaise = collectedTodayPayments.reduce((sum, p) => sum + p.amount, 0);
  const collectedTodayCount = collectedTodayPayments.length;

  // Compute installments due today
  const dueTodayLoans = activeLoans.filter((l) => l.nextDueDate && l.nextDueDate.startsWith(todayStr));
  const dueTodayPaise = dueTodayLoans.reduce((sum, l) => sum + l.installmentAmount, 0);
  const dueTodayCount = dueTodayLoans.length;

  // Prepare stacked loan cards dynamically from active loans
  const stackedCards: StackedLoanItem[] = (activeLoans.slice(0, 3)).map((l) => {
    let iconName: keyof typeof Ionicons.glyphMap = 'cash-outline';
    if (l.category.includes('Vehicle')) iconName = 'car-sport-outline';
    else if (l.category.includes('Business')) iconName = 'briefcase-outline';
    else if (l.category.includes('Gold')) iconName = 'diamond-outline';

    const remainingMonths = `${l.tenure.value} ${l.tenure.unit.toLowerCase()}`;

    return {
      id: l.id,
      category: l.category,
      customerName: l.customerName,
      loanNumber: l.loanNumber,
      principalFormatted: formatIndianCurrency(l.outstandingPrincipal, { isMinorUnit: true }).formatted,
      tenureFormatted: `${l.tenure.value} ${l.tenure.unit}`,
      statusBadge: l.status,
      highlightStat: l.status === 'OVERDUE' ? `${l.daysOverdue}d late` : remainingMonths,
      highlightStatCaption: l.status === 'OVERDUE' ? 'Fine added' : 'Loan duration',
      interestRateFormatted: `${l.interestRate}% ${l.ratePeriod === 'PER_MONTH' ? 'p.m.' : 'p.a.'}`,
      iconName,
    };
  });

  // Customers due today or overdue
  const dueCollectionList = activeLoans.filter((l) => l.status === 'OVERDUE' || (l.nextDueDate && l.nextDueDate <= todayStr)).slice(0, 5);

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('Notice', 'No phone number on record for this customer.');
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (phone) {
      openWhatsApp(phone, `Hello ${name}, friendly payment reminder from ${business.businessName || 'Senthur Finance'}.`);
    } else {
      Alert.alert('Notice', 'No phone number on record for this customer.');
    }
  };

  return (
    <Screen
      scrollable
      refreshing={loansRefetching}
      onRefresh={handleRefresh}
    >
      <Header
        avatarUrl={business.avatarUrl}
        avatarName={business.businessName || 'Admin'}
        showCalculatorButton={true}
        onCalculatorPress={() => router.push('/calculator' as any)}
        onMenuPress={() => router.push('/settings' as any)}
        onAvatarPress={() => router.push('/settings' as any)}
      />

      <DisplayTitle
        title="Track Loans in Minutes!"
        subtitle="Track your loans, daily collections & bill receipts"
        highlightText="Minutes!"
        highlightColor={colors.primaryDark}
      />

      {/* Financial Bento Grid: Flexing dynamic values, zero truncation & theme shades */}
      <HomeFinancialBento
        totalReceivedPaise={totalReceivedPaise}
        totalPendingPaise={totalPendingPaise}
        activePrincipalPaise={activePrincipalPaise}
        activeLoansCount={activeLoansCount}
        totalPaymentsCount={payments?.length || 0}
        collectedTodayPaise={collectedTodayPaise}
        collectedTodayCount={collectedTodayCount}
        dueTodayPaise={dueTodayPaise}
        dueTodayCount={dueTodayCount}
        overduePaise={overduePaise}
        overdueCount={overdueLoans.length}
        onNewLoanPress={() => router.push('/loans/new' as any)}
        onRecordPaymentPress={() => router.push('/payments/new' as any)}
        onLoansPress={() => router.push('/(tabs)/loans' as any)}
        onOverduePress={() => router.push('/(tabs)/loans' as any)}
      />

      {/* Mini Analytics: Progress Bar & Category Donut Pie Chart */}
      <HomeMiniAnalytics
        loans={loans || []}
        payments={payments || []}
      />

      {/* Stacked Layered Loan Cards Section */}
      {stackedCards.length > 0 ? (
        <StackedLoanCards
          loans={stackedCards}
          onCalculatePress={() => router.push('/calculator' as any)}
          onLoanPress={(loan) => router.push(`/loans/${loan.id}` as any)}
        />
      ) : (
        <Card variant="surface" style={[styles.emptyLoanCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <EmptyState
            iconName="cash-outline"
            title="No Active Loans Yet"
            description="Add customers and give loans to track daily/weekly collections easily."
            actionTitle="+ Give First Loan"
            onAction={() => router.push('/loans/new' as any)}
          />
        </Card>
      )}

      {/* Today's Collection List */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.headingPrimary }]}>{"Today's Collection List"}</Text>
      </View>

      {dueCollectionList.length > 0 ? (
        <View style={[styles.collectionListBox, { backgroundColor: colors.surface, borderColor: colors.boxBorder, borderWidth: 1 }]}>
          {dueCollectionList.map((item) => {
            const borrower = customers?.find((c) => c.id === item.customerId);
            const borrowerPhone = borrower?.phone || borrower?.whatsapp;

            return (
              <View key={item.id} style={[styles.collectionRow, { borderBottomColor: colors.border }]}>
                <View style={styles.collectionInfo}>
                  <Text style={[styles.collectionName, { color: colors.ink }]}>{item.customerName}</Text>
                  <Text style={[styles.collectionSub, { color: colors.textSecondary }]}>
                    {item.loanNumber} • Due: {formatIndianCurrency(item.installmentAmount, { isMinorUnit: true }).formatted}
                  </Text>
                </View>

                <View style={styles.collectionActions}>
                  <TouchableOpacity
                    style={[styles.actionCircleBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => handleWhatsApp(borrowerPhone, item.customerName)}
                    accessibilityLabel="WhatsApp reminder"
                  >
                    <Ionicons name="logo-whatsapp" size={17} color={colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionCircleBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => handleCall(borrowerPhone)}
                    accessibilityLabel="Call customer"
                  >
                    <Ionicons name="call" size={16} color={colors.primaryDark} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.payPillBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/payments/new?loanId=${item.id}` as any)}
                  >
                    <Text style={styles.payPillText}>Collect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Card variant="surface" style={[styles.emptyCollectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <EmptyState
            iconName="checkmark-done-circle-outline"
            title="All Up to Date"
            description="No pending dues or overdue accounts requiring collection today."
          />
        </Card>
      )}

      {/* Recent Transactions Panel (Lavender Container) */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.headingPrimary }]}>Recent Repayments</Text>
      </View>

      <Card variant="lavender" style={[styles.transactionsCard, { backgroundColor: colors.boxBackground, borderColor: colors.boxBorder, borderWidth: 1 }]}>
        {payments && payments.length > 0 ? (
          payments.slice(0, 4).map((pay) => (
            <ListRow
              key={pay.id}
              title={pay.customerName}
              subtitle={`${pay.receiptNumber} • ${pay.mode}`}
              metaText={formatDate(pay.paidOn, 'dd MMM, hh:mm a')}
              iconName="arrow-down-circle"
              iconColor={colors.primaryDark}
              iconBgColor={colors.primarySoft}
              rightAmount={`+${formatIndianCurrency(pay.amount, { isMinorUnit: true }).formatted}`}
              rightAmountType="neutral"
              rightSubtext="Repayment"
              showChevron
              onPress={() => {
                setSelectedReceiptPayment(pay);
                setReceiptModalOpen(true);
              }}
            />
          ))
        ) : (
          <EmptyState
            iconName="receipt-outline"
            title="No Recent Repayments"
            description="Recorded payments will appear here."
          />
        )}
      </Card>

      {/* Live Database Audit Logs Recordings */}
      <AuditLogsViewer
        logs={auditLogs || []}
        isLoading={auditLoading}
      />

      {/* Interactive Payment Receipt Modal */}
      <PaymentReceiptModal
        visible={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        payment={selectedReceiptPayment}
        loan={loans?.find((l) => l.id === selectedReceiptPayment?.loanId)}
        customerPhone={customers?.find((c) => c.id === selectedReceiptPayment?.customerId)?.phone}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  flexTile: {
    flex: 1,
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
  collectionListBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    ...typography.bodyMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  collectionSub: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    marginTop: 4,
  },
  collectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payPillBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  payPillText: {
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1.0,
  },
  transactionsCard: {
    marginBottom: 34,
    padding: 8,
  },
  emptyLoanCard: {
    padding: 20,
    marginBottom: 14,
  },
  emptyCollectionCard: {
    padding: 16,
    marginBottom: 14,
  },
});
