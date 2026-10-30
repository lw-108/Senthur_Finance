import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Header,
  HeroLoanCard,
  SegmentedControl,
  Card,
  ListRow,
  Badge,
  PillButton,
  EmptyState,
  SkeletonLoader,
  useToast,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { useLoan, useLoanSchedule, useUpdateLoan } from '@/features/loans/hooks';
import { usePayments } from '@/features/payments/hooks';
import { formatIndianCurrency, formatDate } from '@/utils/formatters';
import { openWhatsApp } from '@/utils/whatsapp';
import { calculateForeclosureQuote } from '@/lib/finance';

export default function LoanDetailScreen() {
  const router = useRouter();
  const { colors: dynamicColors } = useTheme();
  const { business } = useBusinessSettingsStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showError } = useToast();

  const { data: loan, isLoading } = useLoan(id);
  const { data: schedule } = useLoanSchedule(id);
  const { data: loanPayments } = usePayments(id);
  const updateLoanMutation = useUpdateLoan();

  const [activeTab, setActiveTab] = useState<'schedule' | 'payments' | 'proofs' | 'settlement'>('schedule');

  if (isLoading) {
    return (
      <Screen>
        <Header showBack title="Loan" />
        <SkeletonLoader height={190} style={{ borderRadius: 24, marginVertical: 12 }} />
        <SkeletonLoader height={60} style={{ borderRadius: 20 }} />
      </Screen>
    );
  }

  if (!loan) {
    return (
      <Screen>
        <Header showBack title="Loan Not Found" />
        <EmptyState
          iconName="alert-circle-outline"
          title="Loan Record Not Found"
          description="The requested loan does not exist or has been removed."
          actionTitle="Back to Home"
          onAction={() => router.replace('/' as any)}
        />
      </Screen>
    );
  }

  const outstandingFormatted = formatIndianCurrency(loan.outstandingPrincipal, { isMinorUnit: true }).formatted;
  const emiFormatted = formatIndianCurrency(loan.installmentAmount, { isMinorUnit: true }).formatted;

  // Compute live foreclosure quote as of today
  const foreclosureQuote = calculateForeclosureQuote(
    loan.outstandingPrincipal,
    loan.interestRate / 100,
    loan.disbursedOn,
    new Date(),
    loan.penaltyAccrued,
    0
  );

  const foreclosureFormatted = formatIndianCurrency(foreclosureQuote.totalSettlementAmount, { isMinorUnit: true }).formatted;
  const accruedInterestFormatted = formatIndianCurrency(foreclosureQuote.accruedInterest, { isMinorUnit: true }).formatted;
  const penaltyFormatted = formatIndianCurrency(foreclosureQuote.accruedPenalty, { isMinorUnit: true }).formatted;

  const handleSendReminder = () => {
    openWhatsApp(
      '',
      `Reminder from ${business.businessName || 'Senthur Finance'}: Dear ${loan.customerName}, installment of ${emiFormatted} for loan ${loan.loanNumber} is due on ${loan.nextDueDate || 'soon'}. Please pay promptly.`
    );
  };

  const handleCloseLoan = async () => {
    Alert.alert(
      'Close Loan Account?',
      `Are you sure you want to mark ${loan.loanNumber} as fully CLOSED?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Close',
          onPress: async () => {
            await updateLoanMutation.mutateAsync({
              loanId: loan.id,
              updates: {
                status: 'CLOSED',
                outstandingPrincipal: 0,
                closedOn: new Date().toISOString(),
              },
            });
            showSuccess(`Loan ${loan.loanNumber} closed successfully!`);
          },
        },
      ]
    );
  };

  return (
    <Screen scrollable>
      <Header
        showBack
        title="Loan Account"
        showSupportPill={false}
        rightAction={
          <TouchableOpacity onPress={() => router.push(`/payments/new?loanId=${loan.id}` as any)}>
            <Ionicons name="card-outline" size={26} color={dynamicColors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Signature Dark Hero Loan Card */}
      <HeroLoanCard
        loanNumber={loan.loanNumber}
        customerName={loan.customerName}
        location={`${loan.category} • ${loan.title}`}
        outstandingAmount={outstandingFormatted}
        nextDueDate={loan.nextDueDate ? formatDate(loan.nextDueDate) : undefined}
        daysOverdue={loan.daysOverdue}
        progressPercent={loan.progressPercent}
        bigStat={emiFormatted}
        bigStatCaption="Installment"
      />

      {/* Main Loan Quick Action Buttons */}
      <View style={styles.actionButtonsRow}>
        <PillButton
          title="Collect Payment"
          onPress={() => router.push(`/payments/new?loanId=${loan.id}` as any)}
          variant="primary"
          iconName="cash-outline"
          style={styles.actionBtn}
        />
        <PillButton
          title="Remind"
          onPress={handleSendReminder}
          variant="secondary"
          iconName="notifications-outline"
          style={styles.actionBtn}
        />
      </View>

      {/* Segmented Tabs */}
      <SegmentedControl
        items={[
          { label: 'Schedule', value: 'schedule' },
          { label: 'Payments', value: 'payments' },
          { label: 'Security', value: 'proofs' },
          { label: 'Foreclose', value: 'settlement' },
        ]}
        selectedValue={activeTab}
        onSelect={(val) => setActiveTab(val as any)}
      />

      {/* TAB 1: Amortization Schedule */}
      {activeTab === 'schedule' && (
        <View style={styles.tabContent}>
          <Card variant="surface" style={styles.cardBox}>
            {schedule && schedule.length > 0 ? (
              schedule.map((inst) => {
                const isPaid = inst.status === 'PAID';
                const isOverdue = inst.status === 'OVERDUE';
                const dueAmt = formatIndianCurrency(inst.totalDue, { isMinorUnit: true }).formatted;

                return (
                  <ListRow
                    key={inst.installmentNo}
                    title={`Installment #${inst.installmentNo} • ${formatDate(inst.dueDate)}`}
                    subtitle={`Principal: ${formatIndianCurrency(inst.principalDue, { isMinorUnit: true }).formatted} • Interest: ${formatIndianCurrency(inst.interestDue, { isMinorUnit: true }).formatted}`}
                    rightAmount={dueAmt}
                    rightAmountType={isPaid ? 'positive' : isOverdue ? 'negative' : 'neutral'}
                    rightSubtext={inst.status}
                    showChevron={!isPaid}
                    onPress={
                      !isPaid
                        ? () => router.push(`/payments/new?loanId=${loan.id}` as any)
                        : undefined
                    }
                  />
                );
              })
            ) : (
              <EmptyState
                iconName="calendar-outline"
                title="Generating Schedule..."
              />
            )}
          </Card>
        </View>
      )}

      {/* TAB 2: Payment Receipts */}
      {activeTab === 'payments' && (
        <View style={styles.tabContent}>
          {loanPayments && loanPayments.length > 0 ? (
            <Card variant="surface" style={styles.cardBox}>
              {loanPayments.map((p) => (
                <ListRow
                  key={p.id}
                  title={`Receipt #${p.receiptNumber}`}
                  subtitle={`${formatDate(p.paidOn, 'dd MMM yyyy')} • ${p.mode}`}
                  rightAmount={`+${formatIndianCurrency(p.amount, { isMinorUnit: true }).formatted}`}
                  rightAmountType="positive"
                  rightSubtext="Allocated: P+I"
                  showChevron
                />
              ))}
            </Card>
          ) : (
            <Card variant="surface" style={styles.cardBox}>
              <EmptyState
                iconName="receipt-outline"
                title="No Repayments Yet"
                description="Payments collected on this loan account will be listed here."
              />
            </Card>
          )}
        </View>
      )}

      {/* TAB 3: Collateral & Proofs */}
      {activeTab === 'proofs' && (
        <View style={styles.tabContent}>
          <Card variant="surface" style={styles.cardBox}>
            {loan.collateral.type !== 'None' && (
              <ListRow
                title={`${loan.collateral.type} Collateral`}
                subtitle={loan.collateral.description || 'Pledged collateral on file'}
                metaText={
                  loan.collateral.estimatedValue
                    ? `Estimated Value: ${formatIndianCurrency(loan.collateral.estimatedValue, { isMinorUnit: true }).formatted}`
                    : undefined
                }
                iconName="shield-checkmark"
                iconColor={dynamicColors.primaryDark}
                iconBgColor={dynamicColors.primarySoft}
              />
            )}

            {loan.proofs && loan.proofs.length > 0 ? (
              loan.proofs.map((proof) => (
                <ListRow
                  key={proof.id}
                  title={proof.title || proof.kind}
                  subtitle={`Uploaded on ${formatDate(proof.uploadedAt)}`}
                  iconName="document-text-outline"
                  showChevron
                  onPress={() => router.push(`/proof-viewer?url=${encodeURIComponent(proof.url)}&title=${encodeURIComponent(proof.title)}` as any)}
                />
              ))
            ) : (
              <EmptyState
                iconName="document-attach-outline"
                title="No Documents Uploaded"
                description="Promissory note and collateral photos can be attached during loan creation."
              />
            )}
          </Card>
        </View>
      )}

      {/* TAB 4: Settlement & Foreclosure Quote */}
      {activeTab === 'settlement' && (
        <View style={styles.tabContent}>
          <Card variant="lavender" style={styles.cardBox}>
            <Text style={[styles.settlementTitle, { color: dynamicColors.primaryDark }]}>FULL FORECLOSURE QUOTE AS OF TODAY</Text>

            <ListRow
              title="Outstanding Principal"
              rightAmount={outstandingFormatted}
            />
            <ListRow
              title="Accrued Per-day Interest"
              subtitle="Calculated from disbursement to today"
              rightAmount={accruedInterestFormatted}
            />
            {foreclosureQuote.accruedPenalty > 0 && (
              <ListRow
                title="Overdue Penalties"
                rightAmount={penaltyFormatted}
                rightAmountType="negative"
              />
            )}
            <ListRow
              title="Total Settlement Amount"
              subtitle="Full clearance amount"
              rightAmount={foreclosureFormatted}
              rightAmountType="negative"
            />
          </Card>

          <PillButton
            title="Settle & Close Loan"
            onPress={handleCloseLoan}
            variant="dark"
            fullWidth
            style={styles.closeBtn}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  actionBtn: {
    flex: 1,
  },
  tabContent: {
    marginTop: 10,
    marginBottom: 30,
  },
  cardBox: {
    padding: 8,
  },
  settlementTitle: {
    ...typography.label,
    color: colors.primaryDark,
    marginVertical: 10,
    marginHorizontal: 8,
  },
  closeBtn: {
    marginTop: 14,
  },
});
