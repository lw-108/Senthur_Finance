import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { useCustomers, useCreateCustomer } from '@/features/customers/hooks';
import { useLoanProductsStore } from '@/store/useLoanProductsStore';
import { formatIndianCurrency } from '@/utils/formatters';
import { validateIndianPhone, sanitizePhone } from '@/utils/validators';
import { secureStorage } from '@/lib/storage/secureStorage';

export default function NewLoanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;
  const params = useLocalSearchParams<{ customerId?: string; mode?: string }>();
  const { showSuccess, showError } = useToast();

  const draft = useLoanWizardDraft();
  const createLoanMutation = useCreateLoan();
  const createCustomerMutation = useCreateCustomer();
  const { data: customers } = useCustomers();
  const { products: loanProducts, initialize: initializeProducts } = useLoanProductsStore();

  // Unified all-in-one Customer & Loan State backed by persistent draft cache
  const customerMode = draft.customerMode || (params.mode === 'new' || (!params.customerId && (!customers || customers.length === 0)) ? 'new' : 'existing');
  const setCustomerMode = (mode: 'existing' | 'new') => draft.setField('customerMode', mode);

  const newCustomerName = draft.newCustomerName || '';
  const setNewCustomerName = (val: string) => draft.setField('newCustomerName', val);

  const newCustomerPhone = draft.newCustomerPhone || '';
  const setNewCustomerPhone = (val: string) => draft.setField('newCustomerPhone', val);

  const newCustomerCity = draft.newCustomerCity || '';
  const setNewCustomerCity = (val: string) => draft.setField('newCustomerCity', val);

  const newCustomerAddress = draft.newCustomerAddress || '';
  const setNewCustomerAddress = (val: string) => draft.setField('newCustomerAddress', val);

  const newGuarantorName = draft.newGuarantorName || '';
  const setNewGuarantorName = (val: string) => draft.setField('newGuarantorName', val);

  const newGuarantorPhone = draft.newGuarantorPhone || '';
  const setNewGuarantorPhone = (val: string) => draft.setField('newGuarantorPhone', val);

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

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

  const next = async () => {
    if (draft.currentStep === 1) {
      if (customerMode === 'new') {
        if (!newCustomerName || newCustomerName.trim().length < 2) {
          showError('Please enter customer full name');
          return;
        }
        const phoneVal = validateIndianPhone(newCustomerPhone, {
          required: true,
          fieldName: 'Customer mobile phone',
        });
        if (!phoneVal.isValid) {
          showError(phoneVal.error!);
          return;
        }
        const cleanPhone = sanitizePhone(newCustomerPhone);

        if (newGuarantorPhone && newGuarantorPhone.trim().length > 0) {
          const gPhoneVal = validateIndianPhone(newGuarantorPhone, {
            required: false,
            fieldName: 'Guarantor phone',
          });
          if (!gPhoneVal.isValid) {
            showError(gPhoneVal.error!);
            return;
          }
        }

        if (!draft.title && !draft.category) {
          showError('Please select a loan scheme or purpose');
          return;
        }

        try {
          setIsCreatingCustomer(true);
          const newCust = await createCustomerMutation.mutateAsync({
            fullName: newCustomerName.trim(),
            phone: cleanPhone,
            address: {
              line1: newCustomerAddress.trim() || 'Main Road',
              city: newCustomerCity.trim() || 'Coimbatore',
              state: 'Tamil Nadu',
              pincode: '641001',
            },
            guarantor: newGuarantorName.trim()
              ? {
                  name: newGuarantorName.trim(),
                  phone: sanitizePhone(newGuarantorPhone),
                }
              : undefined,
            idProofs: [],
            references: [],
            tags: ['Customer', draft.category || 'General'],
            totals: {
              activeLoans: 0,
              totalLent: 0,
              totalOutstanding: 0,
              totalPaid: 0,
              overdueAmount: 0,
            },
            status: 'Active',
          });

          draft.setField('customerId', newCust.id);
          draft.setField('customerName', newCust.fullName);
          showSuccess(`Customer ${newCust.fullName} added`);
          draft.setStep(2);
        } catch (err: any) {
          showError(err?.message || 'Failed to create customer profile');
        } finally {
          setIsCreatingCustomer(false);
        }
        return;
      } else {
        if (!draft.customerId) {
          showError('Please select a customer first');
          return;
        }
        if (!draft.title && !draft.category) {
          showError('Please select a loan scheme or purpose');
          return;
        }
      }
    }
    if (draft.currentStep === 2) {
      if (!draft.principalPaise || draft.principalPaise <= 0) {
        showError('Please enter a valid loan principal amount');
        return;
      }
    }
    if (draft.currentStep === 4) {
      if (draft.witnessPhone && draft.witnessPhone.trim().length > 0) {
        const wVal = validateIndianPhone(draft.witnessPhone, {
          required: false,
          fieldName: 'Witness phone',
        });
        if (!wVal.isValid) {
          showError(wVal.error!);
          return;
        }
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
      // Preserve filled form draft when user leaves or switches apps
      router.back();
    }
  };

  const handleConfirmDisburse = async () => {
    try {
      if (!draft.customerId) {
        showError('Please select a valid customer before disbursing');
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
      await secureStorage.setItem('loanledger_last_active_route', '/');
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
        title="Give New Loan"
        showSupportPill={false}
      />

      <Stepper
        currentStep={draft.currentStep}
        totalSteps={5}
        stepTitle={
          draft.currentStep === 1
            ? 'Customer'
            : draft.currentStep === 2
            ? 'Amount & Rate'
            : draft.currentStep === 3
            ? 'Duration'
            : draft.currentStep === 4
            ? 'Security'
            : 'Confirm & Save'
        }
        nextStepTitle={
          draft.currentStep === 1
            ? 'Amount & Rate'
            : draft.currentStep === 2
            ? 'Duration'
            : draft.currentStep === 3
            ? 'Security'
            : draft.currentStep === 4
            ? 'Confirm & Save'
            : undefined
        }
      />

      {/* STEP 1: Select or Create Customer & Purpose */}
      {draft.currentStep === 1 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Customer & Purpose"
            subtitle="Select an existing customer or fill up a new profile"
          />

          {/* Customer Selection / New Customer Segmented Switch */}
          <View style={[styles.modeSelectorWrap, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                customerMode === 'existing' && [
                  styles.modeTabActive,
                  { backgroundColor: colors.surface, borderColor: colors.primaryBorder },
                ],
              ]}
              onPress={() => setCustomerMode('existing')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={customerMode === 'existing' ? colors.primaryDark : colors.textTertiary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: customerMode === 'existing' ? colors.headingPrimary : colors.textSecondary },
                ]}
              >
                Existing Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                customerMode === 'new' && [
                  styles.modeTabActive,
                  { backgroundColor: colors.surface, borderColor: colors.primaryBorder },
                ],
              ]}
              onPress={() => setCustomerMode('new')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={customerMode === 'new' ? colors.primaryDark : colors.textTertiary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: customerMode === 'new' ? colors.headingPrimary : colors.textSecondary },
                ]}
              >
                + New Customer
              </Text>
            </TouchableOpacity>
          </View>

          {customerMode === 'existing' ? (
            <SelectModal
              label="Select Customer *"
              selectedValue={draft.customerId}
              onSelect={handleSelectCustomer}
              options={customerOptions}
              searchable
              searchPlaceholder="Search customer by name, phone or city..."
            />
          ) : (
            <Card
              variant="surface"
              style={[
                styles.newCustomerCard,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.sectionSubtitle, { color: colors.primaryDark }]}>
                NEW CUSTOMER DETAILS
              </Text>

              <Input
                label="Customer Full Name *"
                placeholder="e.g. Ramesh Kumar"
                value={newCustomerName}
                onChangeText={setNewCustomerName}
                leadingIcon="person-outline"
              />

              <Input
                label="Mobile Phone (Strictly 10 Digits) *"
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                value={newCustomerPhone}
                onChangeText={(val) => setNewCustomerPhone(sanitizePhone(val))}
                leadingIcon="call-outline"
              />

              <Input
                label="Address Line"
                placeholder="Street / Area / Door No."
                value={newCustomerAddress}
                onChangeText={setNewCustomerAddress}
                leadingIcon="home-outline"
              />

              <Input
                label="City / Town"
                placeholder="e.g. Coimbatore"
                value={newCustomerCity}
                onChangeText={setNewCustomerCity}
                leadingIcon="location-outline"
              />

              <Input
                label="Guarantor Name (Optional)"
                placeholder="e.g. Suresh"
                value={newGuarantorName}
                onChangeText={setNewGuarantorName}
                leadingIcon="people-outline"
              />

              <Input
                label="Guarantor Phone (10 Digits)"
                placeholder="10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
                value={newGuarantorPhone}
                onChangeText={(val) => setNewGuarantorPhone(sanitizePhone(val))}
                leadingIcon="call-outline"
              />
            </Card>
          )}

          <SelectModal
            label="Loan Product & Scheme *"
            selectedValue={draft.title || draft.category}
            onSelect={handleSelectLoanProduct}
            options={loanProductOptions}
          />

          <Input
            label="Loan Reason / Description (Optional)"
            placeholder="e.g. Shop expense, Medical, Vehicle purchase"
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
            title="Loan Amount & Interest"
            subtitle="Set loan amount, interest rate and fees"
          />

          <CurrencyInput
            label="Loan Amount Given *"
            value={draft.principalPaise / 100}
            onChangeValue={(amt) => draft.setField('principalPaise', amt * 100)}
            quickAmounts={[50000, 100000, 200000, 500000]}
          />

          <SelectModal
            label="Interest Type *"
            selectedValue={draft.interestType}
            onSelect={(val) => draft.setField('interestType', val as any)}
            options={[
              { label: 'Monthly Diminishing (Reducing EMI)', value: 'REDUCING_BALANCE', subtitle: 'Interest reduces as principal is paid' },
              { label: 'Simple Interest (Vaddi)', value: 'SIMPLE', subtitle: 'Normal monthly / yearly interest' },
              { label: 'Flat Rate (Equal Due)', value: 'FLAT', subtitle: 'Fixed equal interest added per due' },
              { label: 'Interest Only (Vaddi Only)', value: 'INTEREST_ONLY', subtitle: 'Pay interest every month, principal at end' },
              { label: '0% No Interest (Split Principal)', value: 'ZERO_INTEREST', subtitle: 'Equal installments with 0 interest' },
            ]}
          />

          <Input
            label="Interest Rate (%) *"
            placeholder="e.g. 2"
            keyboardType="numeric"
            value={draft.interestRate.toString()}
            onChangeText={(val) => draft.setField('interestRate', parseFloat(val) || 0)}
            leadingIcon="trending-up-outline"
          />

          <SelectModal
            label="Rate Period *"
            selectedValue={draft.ratePeriod}
            onSelect={(val) => draft.setField('ratePeriod', val as any)}
            options={[
              { label: '% per Month (e.g. ₹2 Vaddi)', value: 'PER_MONTH' },
              { label: '% per Year (Annual)', value: 'PER_YEAR' },
              { label: '% per Week', value: 'PER_WEEK' },
              { label: '% per Day', value: 'PER_DAY' },
            ]}
          />

          <Input
            label="File Charges / Deductions (₹)"
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
            title="Duration & Due Dates"
            subtitle="Repayment cycle and duration"
          />

          <Input
            label="Duration *"
            placeholder="12"
            keyboardType="numeric"
            value={draft.tenureValue.toString()}
            onChangeText={(val) => draft.setField('tenureValue', parseInt(val, 10) || 1)}
            leadingIcon="calendar-outline"
          />

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

          <SelectModal
            label="Due Collection Schedule *"
            selectedValue={draft.repaymentFrequency}
            onSelect={(val) => draft.setField('repaymentFrequency', val as any)}
            options={[
              { label: 'Daily Due (Daily Collection)', value: 'DAILY' },
              { label: 'Weekly Due (Every Week)', value: 'WEEKLY' },
              { label: 'Monthly Due (Every Month)', value: 'MONTHLY' },
              { label: 'One Time (At End of Term)', value: 'BULLET' },
            ]}
          />

          {/* Live Schedule Calculation Summary */}
          <Card variant="lavender" style={[styles.liveSummaryBox, { backgroundColor: colors.boxBackground, borderColor: colors.boxBorder, borderWidth: 1 }]}>
            <Text style={[styles.liveSummaryTitle, { color: colors.headingPrimary }]}>PAYMENT ESTIMATE</Text>

            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Due Amount (EMI):</Text>
              <Text style={[styles.emiHighlight, { color: colors.primary }]}>{emiFormatted}</Text>
            </View>

            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Number of Dues:</Text>
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

          <Input
            label="Overdue Grace Days"
            placeholder="3"
            keyboardType="numeric"
            value={draft.graceDays.toString()}
            onChangeText={(val) => draft.setField('graceDays', parseInt(val, 10) || 0)}
          />

          <Input
            label="Penalty (₹/day)"
            placeholder="50"
            keyboardType="numeric"
            value={(draft.penaltyValue / 100).toString()}
            onChangeText={(val) => draft.setField('penaltyValue', (parseInt(val, 10) || 0) * 100)}
          />

          <Input
            label="Witness Name"
            placeholder="e.g. Ramesh Kumar"
            value={draft.witnessName}
            onChangeText={(val) => draft.setField('witnessName', val)}
            leadingIcon="people-outline"
          />

          <Input
            label="Witness Phone (10 Digits)"
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            value={draft.witnessPhone}
            onChangeText={(val) => draft.setField('witnessPhone', sanitizePhone(val))}
            leadingIcon="call-outline"
          />
        </View>
      )}

      {/* STEP 5: Final Review Card (Signature Dark Card) */}
      {draft.currentStep === 5 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Confirm Loan"
            subtitle="Check loan details before saving"
          />

          <HeroLoanCard
            loanNumber={`LN-${new Date().getFullYear()}-NEW`}
            customerName={draft.customerName}
            location={draft.category}
            outstandingAmount={principalFormatted}
            nextDueDate={draft.preview.schedule[0]?.dueDate}
            bigStat={emiFormatted}
            bigStatCaption="Due Amount"
          />

          <Card variant="surface" style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Customer:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>{draft.customerName}</Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Loan Given:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>{principalFormatted}</Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Interest Type:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>
                {draft.interestType} @ {draft.interestRate}%
              </Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Duration:</Text>
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
            size={isTablet ? 'md' : 'sm'}
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
              ? 'Confirm & Save'
              : 'Give Loan'
          }
          iconName={draft.currentStep === 5 ? 'checkmark-circle' : 'arrow-forward'}
          iconPosition="right"
          onPress={next}
          loading={createLoanMutation.isPending || isCreatingCustomer}
          variant="primary"
          size={isTablet ? 'md' : 'sm'}
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
  modeSelectorWrap: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeTabActive: {
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  newCustomerCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
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
    gap: 12,
    marginTop: 24,
    marginBottom: 44,
    width: '100%',
  },
  footerButtonsTablet: {
    maxWidth: 520,
    alignSelf: 'center',
  },
  backBtn: {
    flex: 1,
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    paddingHorizontal: 10,
  },
  continueBtn: {
    flex: 1.6,
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    paddingHorizontal: 12,
  },
  fullBtn: {
    width: '100%',
    height: 48,
    minHeight: 48,
    maxHeight: 48,
  },
  btnTextSmall: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
