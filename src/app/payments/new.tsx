import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  Header,
  DisplayTitle,
  CurrencyInput,
  SelectModal,
  Input,
  PillButton,
  Card,
  Badge,
  DatePickerField,
  EmptyState,
  useToast,
} from '@/components/ui';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useLoans } from '@/features/loans/hooks';
import { useCustomer } from '@/features/customers/hooks';
import { useRecordPayment } from '@/features/payments/hooks';
import { Payment, PaymentMode } from '@/features/payments/types';
import { formatIndianCurrency } from '@/utils/formatters';
import { allocatePaymentWaterfall } from '@/lib/finance';
import { PaymentReceiptModal } from '@/features/payments/components/PaymentReceiptModal';

export default function RecordPaymentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ loanId?: string; customerId?: string }>();
  const { showSuccess, showError } = useToast();

  const { data: allActiveLoans, isLoading: loansLoading } = useLoans({ status: 'ACTIVE_OR_OVERDUE' });
  const { data: customer } = useCustomer(params.customerId);
  const recordPaymentMutation = useRecordPayment();

  // If filtered by customerId, prioritize this customer's active loans
  const availableLoans = useMemo(() => {
    if (!allActiveLoans) return [];
    if (params.customerId) {
      const filtered = allActiveLoans.filter((l) => l.customerId === params.customerId);
      return filtered.length > 0 ? filtered : allActiveLoans;
    }
    return allActiveLoans;
  }, [allActiveLoans, params.customerId]);

  const [selectedLoanId, setSelectedLoanId] = useState<string>(params.loanId || '');

  const effectiveSelectedLoanId =
    selectedLoanId && availableLoans.some((l) => l.id === selectedLoanId)
      ? selectedLoanId
      : availableLoans.length > 0
      ? (params.loanId && availableLoans.some((l) => l.id === params.loanId) ? params.loanId : availableLoans[0].id)
      : '';

  const activeLoan = availableLoans.find((l) => l.id === effectiveSelectedLoanId) || availableLoans[0];

  const defaultEmi = activeLoan ? Math.round(activeLoan.installmentAmount / 100) : 0;
  const [amountRupees, setAmountRupees] = useState<number>(0);
  const effectiveAmountRupees = amountRupees > 0 ? amountRupees : defaultEmi;

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [paidOnDate, setPaidOnDate] = useState<string>(new Date().toISOString());
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Receipt Modal State after successful payment
  const [recordedPayment, setRecordedPayment] = useState<Payment | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  // Live waterfall breakdown
  const amountPaise = effectiveAmountRupees * 100;
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

  const loanOptions = availableLoans.map((l) => ({
    label: `${l.loanNumber} • ${l.customerName}`,
    value: l.id,
    subtitle: `Balance: ${formatIndianCurrency(l.outstandingPrincipal, { isMinorUnit: true }).formatted} • EMI: ${formatIndianCurrency(l.installmentAmount, { isMinorUnit: true }).formatted}`,
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
        paidOn: paidOnDate,
        mode: paymentMode,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      showSuccess(`Repayment of ${formatIndianCurrency(amountPaise, { isMinorUnit: true }).formatted} recorded!`);
      setRecordedPayment(result.payment);
      setReceiptModalVisible(true);
    } catch (e: any) {
      showError(e?.message || 'Failed to record repayment');
    }
  };

  const penaltyFormatted = formatIndianCurrency(allocation.allocatedPenalty, { isMinorUnit: true }).formatted;
  const interestFormatted = formatIndianCurrency(allocation.allocatedInterest, { isMinorUnit: true }).formatted;
  const principalFormatted = formatIndianCurrency(allocation.allocatedPrincipal, { isMinorUnit: true }).formatted;
  const remainingFormatted = formatIndianCurrency(allocation.remainingPrincipal, { isMinorUnit: true }).formatted;

  // Total outstanding across customer's active loans
  const customerTotalOutstanding = !params.customerId
    ? (activeLoan?.outstandingPrincipal || 0)
    : (allActiveLoans || [])
        .filter((l) => l.customerId === params.customerId)
        .reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);

  if (!loansLoading && (!availableLoans || availableLoans.length === 0)) {
    return (
      <Screen>
        <Header showBack title="Record Repayment" showSupportPill={false} />
        <EmptyState
          iconName="cash-outline"
          title="No Active Loans"
          description={
            params.customerId
              ? 'This borrower currently has no active or overdue loans.'
              : 'There are currently no active or overdue loans to collect repayment for.'
          }
          actionTitle="+ Disburse New Loan"
          onAction={() =>
            router.replace(
              params.customerId ? (`/loans/new?customerId=${params.customerId}` as any) : ('/loans/new' as any)
            )
          }
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <Header showBack title="Collect Loan Due" showSupportPill={false} />

      <DisplayTitle
        title="Record Loan Due"
        subtitle={
          customer
            ? `Collect payment from ${customer.fullName}`
            : activeLoan
            ? `${activeLoan.loanNumber} • ${activeLoan.customerName}`
            : 'Admin Loan Due Collection'
        }
      />

      {/* Borrower Account Overview Banner */}
      <View style={[styles.borrowerBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.bannerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerBorrowerLabel, { color: colors.textSecondary }]}>BORROWER ACCOUNT</Text>
            <Text style={[styles.bannerBorrowerName, { color: colors.ink }]}>
              {customer?.fullName || activeLoan?.customerName || 'Borrower'}
            </Text>
            <Text style={[styles.bannerBorrowerPhone, { color: colors.textSecondary }]}>
              +91 {customer?.phone || 'Customer Account'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.bannerDueLabel, { color: colors.textSecondary }]}>Total Active Loan</Text>
            <Text style={[styles.bannerDueValue, { color: colors.primaryDark }]}>
              {formatIndianCurrency(customerTotalOutstanding, { isMinorUnit: true }).formatted}
            </Text>
            <Badge status="ACTIVE" label={`${availableLoans.length} Active Loan${availableLoans.length !== 1 ? 's' : ''}`} />
          </View>
        </View>
      </View>

      {/* Select Loan Dropdown */}
      <SelectModal
        label="Select Loan Account *"
        selectedValue={effectiveSelectedLoanId}
        onSelect={(val) => {
          setSelectedLoanId(val);
          const sel = availableLoans.find((l) => l.id === val);
          if (sel) {
            setAmountRupees(Math.round(sel.installmentAmount / 100));
          }
        }}
        options={loanOptions}
        searchable
        searchPlaceholder="Search by borrower name or loan number..."
      />

      {/* Repayment Amount Input */}
      <CurrencyInput
        label="Repayment Amount *"
        value={effectiveAmountRupees}
        onChangeValue={setAmountRupees}
      />

      {/* Quick Amount Chips */}
      <View style={styles.quickChipsRow}>
        <TouchableOpacity
          style={[styles.quickChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          onPress={() => handleQuickChip('EMI')}
        >
          <Text style={[styles.quickChipText, { color: colors.headingPrimary }]}>
            1 EMI ({formatIndianCurrency(activeLoan?.installmentAmount || 0, { isMinorUnit: true }).formatted})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          onPress={() => handleQuickChip('INTEREST_ONLY')}
        >
          <Text style={[styles.quickChipText, { color: colors.headingPrimary }]}>
            Interest ({formatIndianCurrency(interestDueEstimate, { isMinorUnit: true }).formatted})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          onPress={() => handleQuickChip('FULL_DUE')}
        >
          <Text style={[styles.quickChipText, { color: colors.headingPrimary }]}>Pay Full Balance</Text>
        </TouchableOpacity>
      </View>

      {/* Live Waterfall Allocation Breakdown Card */}
      <Card
        variant="lavender"
        style={[
          styles.breakdownCard,
          { backgroundColor: colors.boxBackground, borderColor: colors.boxBorder, borderWidth: 1 },
        ]}
      >
        <View style={styles.breakdownHeader}>
          <Text style={[styles.breakdownTitle, { color: colors.primaryDark }]}>
            HOW PAYMENT IS SPLIT
          </Text>
          <Text style={[styles.breakdownSubtitle, { color: colors.textSecondary }]}>
            Reduces loan balance instantly
          </Text>
        </View>

        {penaltyDue > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Fine / Late Fee Paid:</Text>
            <Text style={[styles.breakdownValue, { color: colors.danger }]}>{penaltyFormatted}</Text>
          </View>
        )}

        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Interest Paid:</Text>
          <Text style={[styles.breakdownValue, { color: colors.ink }]}>{interestFormatted}</Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Loan Amount Reduced:</Text>
          <Text style={[styles.breakdownValue, { color: colors.success, fontWeight: '700' }]}>
            -{principalFormatted}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabelBold, { color: colors.ink }]}>Remaining Balance to Pay:</Text>
          <Text style={[styles.remainingValue, { color: colors.primaryDark }]}>{remainingFormatted}</Text>
        </View>
      </Card>

      {/* Payment Date & Mode Controls */}
      <DatePickerField
        label="Payment Date *"
        value={paidOnDate}
        onChangeDate={(d) => setPaidOnDate(d.toISOString())}
        maxDate={new Date()}
      />

      <SelectModal
        label="Payment Method (Cash / UPI / Bank) *"
        selectedValue={paymentMode}
        onSelect={(val) => setPaymentMode(val as PaymentMode)}
        options={[
          { label: 'Cash in Hand', value: 'CASH', icon: 'cash-outline' },
          { label: 'UPI (GPay / PhonePe / Paytm / BHIM)', value: 'UPI', icon: 'phone-portrait-outline' },
          { label: 'Bank Transfer (IMPS / NEFT / RTGS)', value: 'BANK', icon: 'business-outline' },
          { label: 'Cheque / Demand Draft', value: 'CHEQUE', icon: 'document-text-outline' },
          { label: 'Other', value: 'OTHER', icon: 'receipt-outline' },
        ]}
      />

      {paymentMode !== 'CASH' && (
        <Input
          label="Transaction Ref / Cheque No."
          placeholder="e.g. UPI Ref # / Cheque #123456"
          value={referenceNo}
          onChangeText={setReferenceNo}
          leadingIcon="barcode-outline"
        />
      )}

      <Input
        label="Notes / Receipt Remarks (Optional)"
        placeholder="e.g. Paid in cash at borrower shop"
        value={notes}
        onChangeText={setNotes}
        leadingIcon="create-outline"
      />

      {/* Record Repayment Button */}
      <PillButton
        title="Save Payment & Create Bill"
        iconName="receipt-outline"
        iconPosition="left"
        onPress={handleRecord}
        loading={recordPaymentMutation.isPending}
        variant="primary"
        fullWidth
        style={styles.recordBtn}
      />

      {/* Interactive Payment Receipt Modal */}
      <PaymentReceiptModal
        visible={receiptModalVisible}
        onClose={() => {
          setReceiptModalVisible(false);
          router.back();
        }}
        payment={recordedPayment}
        loan={activeLoan}
        customerPhone={customer?.phone}
        onDone={() => {
          setReceiptModalVisible(false);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  borrowerBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerBorrowerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  bannerBorrowerName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerBorrowerPhone: {
    fontSize: 12,
  },
  bannerDueLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  bannerDueValue: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownCard: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 16,
  },
  breakdownHeader: {
    marginBottom: 10,
  },
  breakdownTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  breakdownSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  breakdownLabelBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  recordBtn: {
    marginTop: 8,
    marginBottom: 44,
  },
});
