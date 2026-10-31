import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen,
  Header,
  DisplayTitle,
  Stepper,
  Input,
  SelectModal,
  PillButton,
  Card,
  Avatar,
  useToast,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';
import { useCustomerWizardDraft } from '@/features/customers/CustomerWizardDraft';
import { useCreateCustomer } from '@/features/customers/hooks';
import { checkDuplicatePhone } from '@/features/customers/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useLoanProductsStore } from '@/store/useLoanProductsStore';
import { KYCDocumentPicker } from '@/features/customers/components/KYCDocumentPicker';
import { IdProofType } from '@/features/customers/types';

export default function NewCustomerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;
  const { showSuccess, showError } = useToast();
  const adminUid = useAuthStore((s) => s.adminUid);
  const createCustomerMutation = useCreateCustomer();

  const draft = useCustomerWizardDraft();

  const { products: loanProducts, initialize: initializeProducts } = useLoanProductsStore();

  React.useEffect(() => {
    initializeProducts();
  }, [initializeProducts]);

  const loanProductOptions = loanProducts.map((p) => ({
    label: p.name,
    value: p.name,
    subtitle: `${p.category} • ${p.interestType.replace(/_/g, ' ')}`,
  }));

  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const validateStep1 = async (): Promise<boolean> => {
    const errors: Record<string, string> = {};
    if (!draft.fullName || draft.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    const cleanPhone = draft.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      errors.phone = 'Enter valid 10-digit mobile number';
    } else {
      // Check duplicate phone in background
      const dup = await checkDuplicatePhone(adminUid, cleanPhone);
      if (dup) {
        setDuplicateWarning(`Warning: ${dup.fullName} already exists with phone ${cleanPhone}.`);
      } else {
        setDuplicateWarning(null);
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (draft.address.pincode && draft.address.pincode.trim().length > 0 && draft.address.pincode.trim().length !== 6) {
      errors.pincode = 'Enter valid 6-digit pincode';
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    // KYC proofs optional during initial creation
    return true;
  };

  const handleQuickSaveFromStep1 = async () => {
    const valid = await validateStep1();
    if (!valid) return;
    saveCustomer();
  };

  const nextStep = async () => {
    if (draft.currentStep === 1) {
      const valid = await validateStep1();
      if (!valid) return;
      draft.setStep(2);
    } else if (draft.currentStep === 2) {
      if (!validateStep2()) return;
      draft.setStep(3);
    } else if (draft.currentStep === 3) {
      if (!validateStep3()) return;
      draft.setStep(4);
    } else if (draft.currentStep === 4) {
      draft.setStep(5);
    } else if (draft.currentStep === 5) {
      saveCustomer();
    }
  };

  const prevStep = () => {
    if (draft.currentStep > 1) {
      draft.setStep(draft.currentStep - 1);
    } else {
      router.back();
    }
  };

  const saveCustomer = async () => {
    try {
      const cleanAddress = {
        line1: draft.address.line1?.trim() || 'Main Road',
        line2: draft.address.line2?.trim() || '',
        city: draft.address.city?.trim() || 'Coimbatore',
        state: draft.address.state?.trim() || 'Tamil Nadu',
        pincode: draft.address.pincode?.trim() || '641001',
      };

      await createCustomerMutation.mutateAsync({
        fullName: draft.fullName.trim(),
        nickname: draft.nickname || undefined,
        phone: draft.phone.replace(/\D/g, '').slice(-10),
        altPhone: draft.altPhone || undefined,
        email: draft.email || undefined,
        occupation: draft.occupation || undefined,
        monthlyIncome: draft.monthlyIncome ? draft.monthlyIncome * 100 : undefined,
        photoUrl: draft.photoUrl || undefined,
        address: cleanAddress,
        idProofs: draft.idProofs || [],
        references: draft.references || [],
        guarantor: draft.guarantor.name ? draft.guarantor : undefined,
        tags: draft.tags?.length > 0 ? draft.tags : ['Borrower'],
        notes: draft.notes || undefined,
        rating: 5,
        creditScoreInternal: 80,
        totals: {
          activeLoans: 0,
          totalLent: 0,
          totalOutstanding: 0,
          totalPaid: 0,
          overdueAmount: 0,
        },
        status: 'Active',
      });

      showSuccess(`${draft.fullName} added successfully!`);
      draft.resetDraft();
      router.back();
    } catch (e: any) {
      showError(e?.message || 'Failed to save customer');
    }
  };

  return (
    <Screen scrollable>
      <Header
        showBack
        onBack={prevStep}
        title="New Borrower"
        showSupportPill={false}
      />

      <Stepper
        currentStep={draft.currentStep}
        totalSteps={5}
        stepTitle={
          draft.currentStep === 1
            ? 'Identity & Contact'
            : draft.currentStep === 2
            ? 'Address'
            : draft.currentStep === 3
            ? 'KYC Verification'
            : draft.currentStep === 4
            ? 'Guarantor'
            : 'Review & Save'
        }
        nextStepTitle={
          draft.currentStep === 1
            ? 'Address'
            : draft.currentStep === 2
            ? 'KYC Verification'
            : draft.currentStep === 3
            ? 'Guarantor'
            : draft.currentStep === 4
            ? 'Review & Save'
            : undefined
        }
      />

      {/* STEP 1: Basic Information */}
      {draft.currentStep === 1 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Borrower Details"
            subtitle="Enter primary identification and contact numbers"
          />

          {duplicateWarning && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.warningText, { color: colors.warning }]}>{duplicateWarning}</Text>
            </View>
          )}

          <Input
            label="Full Legal Name *"
            placeholder="Enter borrower full name"
            value={draft.fullName}
            onChangeText={(val) => draft.setField('fullName', val)}
            error={stepErrors.fullName}
            leadingIcon="person-outline"
          />

          <Input
            label="Mobile Number (Primary / WhatsApp) *"
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            value={draft.phone}
            onChangeText={(val) => draft.setField('phone', val)}
            error={stepErrors.phone}
            leadingIcon="call-outline"
          />

          <Input
            label="Alternate Contact Number"
            placeholder="e.g. 9443210987"
            keyboardType="phone-pad"
            value={draft.altPhone}
            onChangeText={(val) => draft.setField('altPhone', val)}
            leadingIcon="call-outline"
          />

          <Input
            label="Job / Business / Shop"
            placeholder="e.g. Textile Merchant"
            value={draft.occupation}
            onChangeText={(val) => draft.setField('occupation', val)}
            leadingIcon="briefcase-outline"
          />

          <SelectModal
            label="Loan Type Needed"
            selectedValue={draft.tags[0] || (loanProductOptions[0]?.value || 'Gold Loan (Jewel Loan)')}
            onSelect={(val) => draft.setField('tags', [val])}
            options={loanProductOptions}
          />

          <Input
            label="Monthly Income / Earnings (₹)"
            placeholder="e.g. 65000"
            keyboardType="numeric"
            value={draft.monthlyIncome ? draft.monthlyIncome.toString() : ''}
            onChangeText={(val) => draft.setField('monthlyIncome', parseInt(val, 10) || 0)}
            leadingIcon="cash-outline"
          />
        </View>
      )}

      {/* STEP 2: Address */}
      {draft.currentStep === 2 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Residential Address"
            subtitle="Permanent place of stay and operation"
          />

          <Input
            label="Address Line 1 (Door / Building / Street) *"
            placeholder="Enter street name, building or door no."
            value={draft.address.line1}
            onChangeText={(val) =>
              draft.setField('address', { ...draft.address, line1: val })
            }
            error={stepErrors.line1}
            leadingIcon="home-outline"
          />

          <Input
            label="City / Town *"
            placeholder="Enter city or town"
            value={draft.address.city}
            onChangeText={(val) =>
              draft.setField('address', { ...draft.address, city: val })
            }
            error={stepErrors.city}
            leadingIcon="location-outline"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="State"
                value={draft.address.state}
                onChangeText={(val) =>
                  draft.setField('address', { ...draft.address, state: val })
                }
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Pincode *"
                placeholder="641012"
                keyboardType="numeric"
                value={draft.address.pincode}
                onChangeText={(val) =>
                  draft.setField('address', { ...draft.address, pincode: val })
                }
                error={stepErrors.pincode}
              />
            </View>
          </View>
        </View>
      )}

      {/* STEP 3: KYC Proofs */}
      {draft.currentStep === 3 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="ID Proofs (Aadhaar / Voter / PAN)"
            subtitle="Photo of Aadhaar card, PAN card or Voter ID"
          />

          <SelectModal
            label="ID Card Type *"
            selectedValue={draft.idProofs[0]?.type || 'Aadhaar'}
            onSelect={(val) => {
              const updated = [...draft.idProofs];
              updated[0] = { ...updated[0], type: val as IdProofType };
              draft.setField('idProofs', updated);
            }}
            options={[
              { label: 'Aadhaar Card (12 Digits)', value: 'Aadhaar', icon: 'card-outline' },
              { label: 'PAN Card (ABCDE1234F)', value: 'PAN', icon: 'document-text-outline' },
              { label: 'Voter ID Card', value: 'Voter', icon: 'finger-print-outline' },
              { label: 'Driving License', value: 'DrivingLicense', icon: 'car-outline' },
              { label: 'Passport', value: 'Passport', icon: 'globe-outline' },
            ]}
          />

          <Input
            label="ID / Card Number *"
            placeholder={
              draft.idProofs[0]?.type === 'Aadhaar'
                ? 'e.g. 12-digit Aadhaar'
                : 'e.g. 10-char PAN'
            }
            value={draft.idProofs[0]?.number || ''}
            onChangeText={(val) => {
              const updated = [...draft.idProofs];
              updated[0] = { ...updated[0], number: val };
              draft.setField('idProofs', updated);
            }}
            error={stepErrors.idProofNumber}
            leadingIcon="keypad-outline"
          />

          <KYCDocumentPicker
            label="Front & Back Document Photo"
            frontUri={draft.idProofs[0]?.frontUrl}
            backUri={draft.idProofs[0]?.backUrl}
            onChangeFront={(uri) => {
              const updated = [...draft.idProofs];
              updated[0] = { ...updated[0], frontUrl: uri };
              draft.setField('idProofs', updated);
            }}
            onChangeBack={(uri) => {
              const updated = [...draft.idProofs];
              updated[0] = { ...updated[0], backUrl: uri };
              draft.setField('idProofs', updated);
            }}
          />
        </View>
      )}

      {/* STEP 4: Guarantor & References */}
      {draft.currentStep === 4 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Surety & Reference Person"
            subtitle="Witness or person who knows the customer"
          />

          <Input
            label="Surety Full Name"
            placeholder="e.g. V. Senthil"
            value={draft.guarantor.name}
            onChangeText={(val) =>
              draft.setField('guarantor', { ...draft.guarantor, name: val })
            }
            leadingIcon="person-outline"
          />

          <Input
            label="Guarantor Phone"
            placeholder="e.g. 9443210987"
            keyboardType="phone-pad"
            value={draft.guarantor.phone}
            onChangeText={(val) =>
              draft.setField('guarantor', { ...draft.guarantor, phone: val })
            }
            leadingIcon="call-outline"
          />

          <Input
            label="Guarantor Address"
            placeholder="e.g. RS Puram, Coimbatore"
            value={draft.guarantor.address}
            onChangeText={(val) =>
              draft.setField('guarantor', { ...draft.guarantor, address: val })
            }
            leadingIcon="location-outline"
          />
        </View>
      )}

      {/* STEP 5: Review & Save */}
      {draft.currentStep === 5 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="Review Profile"
            subtitle="Verify borrower information before creating profile"
          />

          <Card variant="surface" style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.reviewHeader}>
              <Avatar name={draft.fullName} size={54} />
              <View style={styles.reviewInfo}>
                <Text style={[styles.reviewName, { color: colors.ink }]}>{draft.fullName}</Text>
                <Text style={[styles.reviewPhone, { color: colors.textSecondary }]}>+91 {draft.phone}</Text>
                <Text style={[styles.reviewCity, { color: colors.textTertiary }]}>{draft.address.city}, Tamil Nadu</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>KYC Document:</Text>
              <Text style={[styles.summaryValue, { color: colors.ink }]}>
                {draft.idProofs[0]?.type} ({draft.idProofs[0]?.number ? '••••' + draft.idProofs[0]?.number.slice(-4) : 'Pending'})
              </Text>
            </View>

            {draft.guarantor.name && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Guarantor:</Text>
                <Text style={[styles.summaryValue, { color: colors.ink }]}>
                  {draft.guarantor.name} ({draft.guarantor.phone})
                </Text>
              </View>
            )}

            {draft.occupation && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Occupation:</Text>
                <Text style={[styles.summaryValue, { color: colors.ink }]}>{draft.occupation}</Text>
              </View>
            )}
          </Card>
        </View>
      )}

      {/* Wizard Navigation Buttons */}
      <View
        style={[
          styles.footerButtons,
          isTablet && styles.footerButtonsTablet,
        ]}
      >
        {draft.currentStep === 1 ? (
          <PillButton
            title="Quick Save"
            iconName="checkmark"
            iconPosition="left"
            onPress={handleQuickSaveFromStep1}
            loading={createCustomerMutation.isPending}
            variant="secondary"
            size={isSmallScreen ? 'sm' : 'md'}
            style={styles.backBtn}
            textStyle={isSmallScreen ? styles.btnTextSmall : undefined}
          />
        ) : (
          <PillButton
            title="Back"
            iconName="chevron-back"
            iconPosition="left"
            onPress={prevStep}
            variant="secondary"
            size={isSmallScreen ? 'sm' : 'md'}
            style={styles.backBtn}
            textStyle={isSmallScreen ? styles.btnTextSmall : undefined}
          />
        )}
        <PillButton
          title={
            draft.currentStep === 1
              ? 'Next: Address'
              : draft.currentStep === 2
              ? 'KYC Verification'
              : draft.currentStep === 3
              ? 'Guarantor'
              : draft.currentStep === 4
              ? 'Review & Save'
              : 'Save Borrower'
          }
          iconName={draft.currentStep === 5 ? 'checkmark-circle' : 'arrow-forward'}
          iconPosition="right"
          onPress={nextStep}
          loading={createCustomerMutation.isPending}
          variant="primary"
          size={isSmallScreen ? 'sm' : 'md'}
          style={styles.continueBtn}
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
  warningBox: {
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: radii.sm,
    marginBottom: 12,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  reviewCard: {
    padding: 20,
    marginVertical: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontFamily: typography.fontHeadline,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: 1.0,
  },
  reviewPhone: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewCity: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
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
