import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Header,
  DisplayTitle,
  CurrencyInput,
  SelectModal,
  Input,
  PillButton,
  Card,
  EmptyState,
  useToast,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useLoans } from '@/features/loans/hooks';
import { useRecordPayment } from '@/features/payments/hooks';
import { PaymentMode } from '@/features/payments/types';
import { formatIndianCurrency } from '@/utils/formatters';
import { allocatePaymentWaterfall } from '@/lib/finance';
import { sharePaymentReceipt } from '@/features/payments/receiptGenerator';

export default function RecordPaymentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ loanId?: string }>();
  const { showSuccess, showError } = useToast();

  const { data: loans } = useLoans({ status: 'ACTIVE_OR_OVERDUE' });
  const recordPaymentMutation = useRecordPayment();

  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    params.loanId || (loans && loans.length > 0 ? loans[0].id : '')
  );

  const activeLoan = loans?.find((l) => l.id === selectedLoanId) || loans?.[0];

  const defaultEmi = activeLoan ? Math.round(activeLoan.installmentAmount / 100) : 0;
  const [amountRupees, setAmountRupees] = useState<number>(defaultEmi);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [shareOnWhatsApp, setShareOnWhatsApp] = useState<boolean>(true);

  // Live waterfall breakdown
  const amountPaise = amountRupees * 100;
  const penaltyDue = activeLoan?.penaltyAccrued || 0;
  const interestDueEstimate = activeLoan
    ? Math.round((activeLoan.outstandingPrincipal * (activeLoan.interestRate / 100)) / 12)
    : 0;
  const principalDue = activeLoan?.outstandingPrincipal || 0;

  const allocation = allocatePaymentWaterfall(
    amountPaise,
    penaltyDue,
    interestDueEstimate,
    principalDue
  );

  const loanOptions = (loans || []).map((l) => ({
    label: `${l.loanNumber} • ${l.customerName}`,
    value: l.id,
    subtitle: `Balance: ${formatIndianCurrency(l.outstandingPrincipal, { isMinorUnit: true }).formatted}`,
  }));

  const handleQuickChip = (type: 'EMI' | 'INTEREST_ONLY' | 'FULL_DUE') => {
    if (!activeLoan) return;
    if (type === 'EMI') {
      setAmountRupees(Math.round(activeLoan.installmentAmount / 100));
    } else if (type === 'INTEREST_ONLY') {
      setAmountRupees(Math.round(interestDueEstimate / 100));
    } else if (type === 'FULL_DUE') {
      setAmountRupees(Math.round(activeLoan.outstandingPrincipal / 100));
    }
  };

  const handleRecord = async () => {
    if (!activeLoan) {
      showError('Please select a loan account');
      return;
    }
    if (amountRupees <= 0) {
      showError('Enter repayment amount greater than 0');
      return;
    }

    try {
      const result = await recordPaymentMutation.mutateAsync({
        loanId: activeLoan.id,
        amountPaise,
        paidOn: new Date().toISOString(),
        mode: paymentMode,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
      });

      showSuccess(`Repayment of ${formatIndianCurrency(amountPaise, { isMinorUnit: true }).formatted} recorded!`);

      if (shareOnWhatsApp) {
        try {
          await sharePaymentReceipt({
            payment: result.payment,
            loan: activeLoan,
          });
        } catch {
          // shared via system
        }
      }

      router.back();
    } catch (e: any) {
      showError(e?.message || 'Failed to record repayment');
    }
  };

  const penaltyFormatted = formatIndianCurrency(allocation.allocatedPenalty, { isMinorUnit: true }).formatted;
  const interestFormatted = formatIndianCurrency(allocation.allocatedInterest, { isMinorUnit: true }).formatted;
  const principalFormatted = formatIndianCurrency(allocation.allocatedPrincipal, { isMinorUnit: true }).formatted;
  const remainingFormatted = formatIndianCurrency(allocation.remainingPrincipal, { isMinorUnit: true }).formatted;

  if (!loans || loans.length === 0) {
    return (
      <Screen>
        <Header showBack title="Record Repayment" showSupportPill={false} />
        <EmptyState
          iconName="cash-outline"
          title="No Active Loans"
          description="There are currently no active or overdue loans to collect repayment for."
          actionTitle="+ Disburse New Loan"
          onAction={() => router.replace('/loans/new' as any)}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <Header
        showBack
        title="Record Repayment"
        showSupportPill={false}
      />

      <DisplayTitle
        title="Collect Repayment"
        subtitle={activeLoan ? `${activeLoan.loanNumber} • ${activeLoan.customerName}` : 'Select loan account'}
      />

      {/* Select Loan Dropdown */}
      <SelectModal
        label="Select Loan Account *"
        selectedValue={selectedLoanId}
        onSelect={(val) => {
          setSelectedLoanId(val);
          const sel = loans?.find((l) => l.id === val);
          if (sel) {
            setAmountRupees(Math.round(sel.installmentAmount / 100));
          }
        }}
        options={loanOptions}
      />

      {/* Amount Input */}
      <CurrencyInput
        label="Repayment Amount *"
        value={amountRupees}
        onChangeValue={setAmountRupees}
      />

      {/* Quick Amount Chips */}
      <View style={styles.quickChipsRow}>
        <TouchableOpacity style={[styles.quickChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => handleQuickChip('EMI')}>
          <Text style={[styles.quickChipText, { color: colors.ink }]}>Full EMI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => handleQuickChip('INTEREST_ONLY')}>
          <Text style={[styles.quickChipText, { color: colors.ink }]}>Interest Only</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => handleQuickChip('FULL_DUE')}>
          <Text style={[styles.quickChipText, { color: colors.ink }]}>Full Settlement</Text>
        </TouchableOpacity>
      </View>

      {/* Live Waterfall Allocation Breakdown Card */}
      <Card variant="lavender" style={[styles.breakdownCard, { backgroundColor: colors.boxBackground, borderColor: colors.boxBorder, borderWidth: 1 }]}>
        <Text style={[styles.breakdownTitle, { color: colors.headingPrimary }]}>AUTOMATIC WATERFALL ALLOCATION</Text>

        {penaltyDue > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Penalty Cleared:</Text>
            <Text style={[styles.breakdownValue, { color: colors.danger }]}>
              {penaltyFormatted}
            </Text>
          </View>
        )}

        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Interest Cleared:</Text>
          <Text style={[styles.breakdownValue, { color: colors.ink }]}>{interestFormatted}</Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Principal Reduction:</Text>
          <Text style={[styles.breakdownValue, { color: colors.success }]}>
            {principalFormatted}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Outstanding After Payment:</Text>
          <Text style={[styles.remainingValue, { color: colors.ink }]}>{remainingFormatted}</Text>
        </View>
      </Card>

      {/* Payment Mode */}
      <SelectModal
        label="Payment Mode *"
        selectedValue={paymentMode}
        onSelect={(val) => setPaymentMode(val as PaymentMode)}
        options={[
          { label: 'Cash in Hand', value: 'CASH', icon: 'cash-outline' },
          { label: 'UPI (GPay / PhonePe / Paytm)', value: 'UPI', icon: 'phone-portrait-outline' },
          { label: 'Bank Transfer (IMPS / NEFT)', value: 'BANK', icon: 'business-outline' },
          { label: 'Cheque', value: 'CHEQUE', icon: 'document-text-outline' },
        ]}
      />

      {paymentMode !== 'CASH' && (
        <Input
          label="Transaction Ref / Cheque No."
          placeholder="e.g. UPI Ref / Cheque #123456"
          value={referenceNo}
          onChangeText={setReferenceNo}
          leadingIcon="barcode-outline"
        />
      )}

      <Input
        label="Notes / Receipt Remarks"
        placeholder="e.g. Paid at borrower office"
        value={notes}
        onChangeText={setNotes}
        leadingIcon="create-outline"
      />

      {/* Share Toggle */}
      <TouchableOpacity
        style={styles.shareToggleRow}
        activeOpacity={0.8}
        onPress={() => setShareOnWhatsApp(!shareOnWhatsApp)}
      >
        <Ionicons
          name={shareOnWhatsApp ? 'checkbox' : 'square-outline'}
          size={22}
          color={colors.primary}
        />
        <Text style={[styles.shareToggleText, { color: colors.ink }]}>
          Generate branded PDF receipt & share to borrower
        </Text>
      </TouchableOpacity>

      <PillButton
        title="Record Repayment"
        onPress={handleRecord}
        loading={recordPaymentMutation.isPending}
        variant="primary"
        fullWidth
        style={styles.recordBtn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  breakdownCard: {
    padding: 18,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    color: colors.primaryDark,
    letterSpacing: 1.0,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    ...typography.captionMedium,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontFamily: typography.fontAmount,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.primaryBorder,
    marginVertical: 10,
  },
  remainingValue: {
    fontFamily: typography.fontAmount,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: 0.8,
  },
  shareToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  shareToggleText: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    flex: 1,
  },
  recordBtn: {
    marginBottom: 40,
  },
});
