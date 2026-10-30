import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  Header,
  DisplayTitle,
  Stepper,
  Input,
  CurrencyInput,
  SelectModal,
  PillButton,
  Card,
  HeroLoanCard,
  useToast,
  Badge,
  ListRow,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';
import { useLoanWizardDraft } from '@/features/loans/LoanWizardDraft';
import { useCreateLoan } from '@/features/loans/hooks';
import { useCustomers } from '@/features/customers/hooks';
import { useLoanProductsStore } from '@/store/useLoanProductsStore';
import { formatIndianCurrency } from '@/utils/formatters';

export default function NewLoanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;
  const params = useLocalSearchParams<{ customerId?: string }>();
  const { showSuccess, showError } = useToast();

  const draft = useLoanWizardDraft();
  const createLoanMutation = useCreateLoan();
  const { data: customers } = useCustomers();
  const { products: loanProducts, initialize: initializeProducts } = useLoanProductsStore();

  React.useEffect(() => {
    initializeProducts();
  }, [initializeProducts]);

  React.useEffect(() => {
    if (params.customerId && customers && customers.length > 0) {
      const found = customers.find((c) => c.id === params.customerId);
      if (found) {
        draft.setField('customerId', found.id);
        draft.setField('customerName', found.fullName);
      }
    }
  }, [params.customerId, customers]);

  const customerOptions = (customers || []).map((c) => ({
    label: `${c.fullName} (${c.phone})`,
    value: c.id,
    subtitle: c.address.city,
  }));

  const loanProductOptions = loanProducts.map((p) => ({
    label: p.name,
    value: p.name,
    subtitle: `${p.interestType.replace(/_/g, ' ')} • ${p.defaultRate}% ${p.ratePeriod === 'PER_MONTH' ? 'p.m.' : 'p.a.'}`,
    icon:
      p.category === 'Gold'
        ? ('diamond-outline' as const)
        : p.category === 'Vehicle'
        ? ('car-outline' as const)
        : p.category === 'Property'
        ? ('home-outline' as const)
        : p.category === 'Weekly'
        ? ('calendar-outline' as const)
        : p.category === 'Daily'
        ? ('today-outline' as const)
        : ('cash-outline' as const),
  }));

  const handleSelectLoanProduct = (productName: string) => {
    const selected = loanProducts.find((p) => p.name === productName);
    if (selected) {
      draft.setField('category', selected.category);
      draft.setField('title', selected.name);
      draft.setField('interestType', selected.interestType);
      draft.setField('interestRate', selected.defaultRate);
      draft.setField('ratePeriod', selected.ratePeriod);
      draft.setField('repaymentFrequency', selected.repaymentFrequency);
      draft.setField('tenureValue', selected.defaultTenureValue);
      draft.setField('tenureUnit', selected.defaultTenureUnit);
      draft.setField('collateralType', selected.collateralType);
      if (selected.requiredDocuments && selected.requiredDocuments.length > 0) {
        draft.setField('collateralDescription', 'Documents: ' + selected.requiredDocuments.join(', '));
      }
      draft.setField('graceDays', selected.graceDays);
      draft.setField('penaltyValue', selected.penaltyRatePercent);
    }
  };

  const handleSelectCustomer = (custId: string) => {
    const found = customers?.find((c) => c.id === custId);
    if (found) {
      draft.setField('customerId', found.id);
      draft.setField('customerName', found.fullName);
    }
  };

  const next = () => {
    if (draft.currentStep === 1) {
      if (!draft.customerId) {
        showError('Please select a borrower first');
        return;
      }
      if (!draft.title && !draft.category) {
        showError('Please select a loan scheme or purpose');
        return;
      }
    }
    if (draft.currentStep === 2) {
      if (!draft.principalPaise || draft.principalPaise <= 0) {
        showError('Please enter a valid loan principal amount');
        return;
      }
    }
    if (draft.currentStep < 5) {
      draft.setStep(draft.currentStep + 1);
    } else {
      handleConfirmDisburse();
    }
  };

  const prev = () => {
    if (draft.currentStep > 1) {
      draft.setStep(draft.currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleConfirmDisburse = async () => {
    try {
      if (!draft.customerId) {
        showError('Please select a valid borrower before disbursing');
        draft.setStep(1);
        return;
      }

      const currentYear = new Date().getFullYear();
      const loanNumber = `LN-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;

      await createLoanMutation.mutateAsync({
        data: {
          customerId: draft.customerId,
          customerName: draft.customerName,
          loanNumber,
          title: draft.title,
          category: draft.category,
          principal: draft.principalPaise,
          currency: 'INR',
          interestType: draft.interestType,
          interestRate: draft.interestRate,
          ratePeriod: draft.ratePeriod,
          compounding: draft.compounding,
          repaymentFrequency: draft.repaymentFrequency,
          disbursedOn: draft.disbursedOn,
          firstDueDate: draft.firstDueDate || draft.preview.schedule[0]?.dueDate || draft.disbursedOn,
          tenure: {
            value: draft.tenureValue,
            unit: draft.tenureUnit,
          },
          maturityDate: draft.preview.maturityDate,
          installmentAmount: draft.preview.installmentAmount,
          numberOfInstallments: draft.preview.numberOfInstallments,
          upfrontDeduction: draft.upfrontDeductionPaise,
          advanceInterestDeducted: draft.advanceInterestDeducted,
          effectiveAnnualRate: draft.preview.effectiveAnnualRate,
          penalty: {
            type: draft.penaltyType,
            value: draft.penaltyValue,
            graceDays: draft.graceDays,
          },
          collateral: {
            type: draft.collateralType,
            description: draft.collateralDescription || undefined,
            estimatedValue: draft.collateralEstimatedValue ? draft.collateralEstimatedValue * 100 : undefined,
          },
          proofs: [],
          witnesses: draft.witnessName ? [{ name: draft.witnessName, phone: draft.witnessPhone }] : [],
          status: 'ACTIVE',
          outstandingPrincipal: draft.principalPaise,
          accruedInterest: 0,
          totalPayable: draft.preview.totalPayable,
          totalPaid: 0,
          nextDueDate: draft.preview.schedule[0]?.dueDate,
          daysOverdue: 0,
          penaltyAccrued: 0,
          progressPercent: 0,
          tags: [draft.category],
          notes: draft.notes || undefined,
        },
        schedule: draft.preview.schedule,
      });

      showSuccess(`Loan ${loanNumber} disbursed to ${draft.customerName}!`);
      draft.resetDraft();
      router.back();
    } catch (e: any) {
      showError(e?.message || 'Failed to disburse loan');
    }
  };

  const emiFormatted = formatIndianCurrency(draft.preview.installmentAmount, { isMinorUnit: true }).formatted;
  const principalFormatted = formatIndianCurrency(draft.principalPaise, { isMinorUnit: true }).formatted;
  const interestFormatted = formatIndianCurrency(draft.preview.totalInterest, { isMinorUnit: true }).formatted;
  const payableFormatted = formatIndianCurrency(draft.preview.totalPayable, { isMinorUnit: true }).formatted;

  return (
    <Screen scrollable>
      <Header
        showBack
        onBack={prev}
        title="Disburse Loan"
        showSupportPill={false}
      />

      <Stepper
        currentStep={draft.currentStep}
        totalSteps={5}
        stepTitle={
          draft.currentStep === 1
            ? 'Borrower'
            : draft.currentStep === 2
            ? 'Amount & Rate'
            : draft.currentStep === 3
            ? 'Schedule'
            : draft.currentStep === 4
            ? 'Security'
            : 'Confirm & Disburse'
        }
        nextStepTitle={
          draft.currentStep === 1
            ? 'Amount & Rate'
            : draft.currentStep === 2
            ? 'Schedule'
            : draft.currentStep === 3
            ? 'Security'
            : draft.currentStep === 4
            ? 'Confirm & Disburse'
            : undefined
        }
      />

      {/* STEP 1: Select Customer & Purpose */}
      {draft.currentStep === 1 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Borrower & Purpose"
            subtitle="Choose customer and specify the loan purpose"
          />

          <SelectModal
            label="Select Borrower *"
            selectedValue={draft.customerId}
            onSelect={handleSelectCustomer}
            options={customerOptions}
            searchable
            searchPlaceholder="Search borrower by name, phone or city..."
          />

          <SelectModal
            label="Loan Product & Scheme *"
            selectedValue={draft.title || draft.category}
            onSelect={handleSelectLoanProduct}
            options={loanProductOptions}
          />

          <Input
            label="Specific Loan Purpose / Description"
            placeholder="e.g. Working capital for raw material inventory"
            value={draft.title}
            onChangeText={(val) => draft.setField('title', val)}
            leadingIcon="create-outline"
          />
        </View>
      )}

      {/* STEP 2: Amount & Interest Calculation */}
      {draft.currentStep === 2 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Principal & Rate"
            subtitle="Configure interest scheme, rates and deductions"
          />

          <CurrencyInput
            label="Disbursement Principal *"
            value={draft.principalPaise / 100}
            onChangeValue={(amt) => draft.setField('principalPaise', amt * 100)}
            quickAmounts={[50000, 100000, 200000, 500000]}
          />

          <SelectModal
            label="Interest Calculation Scheme *"
            selectedValue={draft.interestType}
            onSelect={(val) => draft.setField('interestType', val as any)}
            options={[
              { label: 'Reducing Balance EMI', value: 'REDUCING_BALANCE', subtitle: 'Standard periodic reducing balance' },
              { label: 'Simple Interest', value: 'SIMPLE', subtitle: 'P × R × T on principal' },
              { label: 'Flat Rate', value: 'FLAT', subtitle: 'Equal interest per installment on initial principal' },
              { label: 'Interest Only (Bullet Principal)', value: 'INTEREST_ONLY', subtitle: 'Periodic interest, principal at end' },
              { label: 'Zero Interest (Direct Installments)', value: 'ZERO_INTEREST', subtitle: 'Split principal equally' },
            ]}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Rate Value *"
                placeholder="14"
                keyboardType="numeric"
                value={draft.interestRate.toString()}
                onChangeText={(val) => draft.setField('interestRate', parseFloat(val) || 0)}
                leadingIcon="trending-up-outline"
              />
            </View>
            <View style={styles.col}>
              <SelectModal
                label="Rate Period *"
                selectedValue={draft.ratePeriod}
                onSelect={(val) => draft.setField('ratePeriod', val as any)}
                options={[
                  { label: '% per Year (p.a.)', value: 'PER_YEAR' },
                  { label: '% per Month (e.g. ₹2/₹100)', value: 'PER_MONTH' },
                  { label: '% per Week', value: 'PER_WEEK' },
                  { label: '% per Day', value: 'PER_DAY' },
                ]}
              />
            </View>
          </View>

          <Input
            label="Upfront Processing Fee / Deduction (₹)"
            placeholder="0"
            keyboardType="numeric"
            value={draft.upfrontDeductionPaise ? (draft.upfrontDeductionPaise / 100).toString() : ''}
            onChangeText={(val) =>
              draft.setField('upfrontDeductionPaise', (parseInt(val, 10) || 0) * 100)
            }
            leadingIcon="cut-outline"
          />
        </View>
      )}

      {/* STEP 3: Tenure, Frequency & Live Preview */}
      {draft.currentStep === 3 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Tenure & Schedule"
            subtitle="Repayment cycle and duration"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Tenure Duration *"
                placeholder="12"
                keyboardType="numeric"
                value={draft.tenureValue.toString()}
                onChangeText={(val) => draft.setField('tenureValue', parseInt(val, 10) || 1)}
                leadingIcon="calendar-outline"
              />
            </View>
            <View style={styles.col}>
              <SelectModal
                label="Unit *"
                selectedValue={draft.tenureUnit}
                onSelect={(val) => draft.setField('tenureUnit', val as any)}
                options={[
                  { label: 'Months', value: 'MONTHS' },
                  { label: 'Weeks', value: 'WEEKS' },
                  { label: 'Days (Daily)', value: 'DAYS' },
                  { label: 'Years', value: 'YEARS' },
                ]}
              />
            </View>
          </View>

          <SelectModal
            label="Repayment Frequency *"
            selectedValue={draft.repaymentFrequency}
            onSelect={(val) => draft.setField('repaymentFrequency', val as any)}
            options={[
              { label: 'Monthly Repayment', value: 'MONTHLY' },
              { label: 'Weekly Repayment', value: 'WEEKLY' },
              { label: 'Daily Collection (e.g. 100-day)', value: 'DAILY' },
              { label: 'Bullet (End of Term)', value: 'BULLET' },
            ]}
          />

          {/* Live Schedule Calculation Summary */}
          <Card variant="lavender" style={[styles.liveSummaryBox, { backgroundColor: colors.boxBackground, borderColor: colors.boxBorder, borderWidth: 1 }]}>
            <Text style={[styles.liveSummaryTitle, { color: colors.headingPrimary }]}>LIVE REPAYMENT ESTIMATE</Text>

            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Installment (EMI):</Text>
              <Text style={[styles.emiHighlight, { color: colors.primary }]}>{emiFormatted}</Text>
            </View>

            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Installments:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>{draft.preview.numberOfInstallments}</Text>
            </View>

            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Interest:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>{interestFormatted}</Text>
            </View>

            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Payable:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>{payableFormatted}</Text>
            </View>

            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Maturity Date:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>{draft.preview.maturityDate}</Text>
            </View>

            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Effective Annual Rate (XIRR):</Text>
              <Text style={[styles.summaryValue, { color: colors.headingPrimary }]}>
                {draft.preview.effectiveAnnualRate}% p.a.
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* STEP 4: Penalty & Collateral */}
      {draft.currentStep === 4 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Security & Penalty"
            subtitle="Pledge collateral and configure overdue grace terms"
          />

          <SelectModal
            label="Collateral Type"
            selectedValue={draft.collateralType}
            onSelect={(val) => draft.setField('collateralType', val as any)}
            options={[
              { label: 'None (Unsecured)', value: 'None' },
              { label: 'Gold Ornaments / Bullion', value: 'Gold', icon: 'diamond-outline' },
              { label: 'Vehicle (RC Book)', value: 'Vehicle', icon: 'car-outline' },
              { label: 'Property / Land Documents', value: 'Property', icon: 'business-outline' },
              { label: 'Signed Blank Cheque', value: 'Cheque', icon: 'document-text-outline' },
              { label: 'Promissory Note Only', value: 'Promissory', icon: 'document-attach-outline' },
            ]}
          />

          {draft.collateralType !== 'None' && (
            <>
              <Input
                label="Collateral Description"
                placeholder="e.g. 50g 22k Gold Bangles / Honda Activa TN38"
                value={draft.collateralDescription}
                onChangeText={(val) => draft.setField('collateralDescription', val)}
                leadingIcon="shield-outline"
              />
              <Input
                label="Estimated Collateral Value (₹)"
                placeholder="e.g. 250000"
                keyboardType="numeric"
                value={draft.collateralEstimatedValue ? draft.collateralEstimatedValue.toString() : ''}
                onChangeText={(val) =>
                  draft.setField('collateralEstimatedValue', parseInt(val, 10) || 0)
                }
                leadingIcon="cash-outline"
              />
            </>
          )}

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Overdue Grace Days"
                placeholder="3"
                keyboardType="numeric"
                value={draft.graceDays.toString()}
                onChangeText={(val) => draft.setField('graceDays', parseInt(val, 10) || 0)}
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Penalty (₹/day)"
                placeholder="50"
                keyboardType="numeric"
                value={(draft.penaltyValue / 100).toString()}
                onChangeText={(val) => draft.setField('penaltyValue', (parseInt(val, 10) || 0) * 100)}
              />
            </View>
          </View>

          <Input
            label="Witness Name"
            placeholder="e.g. Ramesh Kumar"
            value={draft.witnessName}
            onChangeText={(val) => draft.setField('witnessName', val)}
            leadingIcon="people-outline"
          />
        </View>
      )}

      {/* STEP 5: Final Review Card (Signature Dark Card) */}
      {draft.currentStep === 5 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Confirm Loan"
            subtitle="Verify loan parameters before recording disbursement"
          />

          <HeroLoanCard
            loanNumber={`LN-${new Date().getFullYear()}-NEW`}
            customerName={draft.customerName}
            location={draft.category}
            outstandingAmount={principalFormatted}
            nextDueDate={draft.preview.schedule[0]?.dueDate}
            bigStat={emiFormatted}
            bigStatCaption="Monthly EMI"
          />

          <Card variant="surface" style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Borrower:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>{draft.customerName}</Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Disbursed Principal:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>{principalFormatted}</Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Interest Scheme:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>
                {draft.interestType} @ {draft.interestRate}%
              </Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tenure:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>
                {draft.tenureValue} {draft.tenureUnit} ({draft.repaymentFrequency})
              </Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Payable:</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {payableFormatted}
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* Navigation Buttons */}
      <View
        style={[
          styles.footerButtons,
          isTablet && styles.footerButtonsTablet,
        ]}
      >
        {draft.currentStep > 1 && (
          <PillButton
            title="Back"
            iconName="chevron-back"
            iconPosition="left"
            onPress={prev}
            variant="secondary"
            size={isSmallScreen ? 'sm' : 'md'}
            style={styles.backBtn}
            textStyle={isSmallScreen ? styles.btnTextSmall : undefined}
          />
        )}
        <PillButton
          title={
            draft.currentStep === 1
              ? 'Amount & Rate'
              : draft.currentStep === 2
              ? 'Schedule'
              : draft.currentStep === 3
              ? 'Security'
              : draft.currentStep === 4
              ? 'Confirm & Disburse'
              : 'Confirm & Disburse'
          }
          iconName={draft.currentStep === 5 ? 'checkmark-circle' : 'arrow-forward'}
          iconPosition="right"
          onPress={next}
          loading={createLoanMutation.isPending}
          variant="primary"
          size={isSmallScreen ? 'sm' : 'md'}
          style={draft.currentStep === 1 ? styles.fullBtn : styles.continueBtn}
          textStyle={isSmallScreen ? styles.btnTextSmall : undefined}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  liveSummaryBox: {
    padding: 16,
    marginVertical: 12,
  },
  liveSummaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    ...typography.captionMedium,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  emiHighlight: {
    fontFamily: typography.fontAmount,
    fontSize: 18,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  confirmCard: {
    padding: 16,
    marginVertical: 10,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 44,
    width: '100%',
  },
  footerButtonsTablet: {
    maxWidth: 520,
    alignSelf: 'center',
  },
  backBtn: {
    flex: 0.38,
    minHeight: 46,
  },
  continueBtn: {
    flex: 0.62,
    minHeight: 46,
  },
  fullBtn: {
    width: '100%',
    minHeight: 46,
  },
  btnTextSmall: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
