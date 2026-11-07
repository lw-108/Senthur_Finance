import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { openPhotoSourcePicker } from '@/utils/photoPicker';
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
  Badge,
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
import { KYCDocumentPicker, isPdfDocument } from '@/features/customers/components/KYCDocumentPicker';
import { IdProofType } from '@/features/customers/types';
import { secureStorage } from '@/lib/storage/secureStorage';
import {
  validateIndianPhone,
  sanitizePhone,
  validatePincode,
  sanitizePincode,
  validateKYCDocument,
  sanitizeKYCDocument,
} from '@/utils/validators';

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
      errors.fullName = 'Full legal name must be at least 2 characters';
    }

    const phoneValidation = validateIndianPhone(draft.phone, {
      required: true,
      fieldName: 'Mobile number',
    });
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error!;
    } else {
      const cleanPhone = sanitizePhone(draft.phone);
      // Check duplicate phone in background
      const dup = await checkDuplicatePhone(adminUid, cleanPhone);
      if (dup) {
        setDuplicateWarning(`Warning: ${dup.fullName} already exists with phone ${cleanPhone}.`);
      } else {
        setDuplicateWarning(null);
      }
    }

    if (draft.altPhone && draft.altPhone.trim().length > 0) {
      const altPhoneVal = validateIndianPhone(draft.altPhone, {
        required: false,
        fieldName: 'Alternate contact number',
      });
      if (!altPhoneVal.isValid) {
        errors.altPhone = altPhoneVal.error!;
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!draft.address.line1 || draft.address.line1.trim().length < 2) {
      errors.line1 = 'Address Line 1 is required';
    }
    if (!draft.address.city || draft.address.city.trim().length < 2) {
      errors.city = 'City / town is required';
    }

    const pinRes = validatePincode(draft.address.pincode, { required: true });
    if (!pinRes.isValid) {
      errors.pincode = pinRes.error!;
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
    draft.idProofs.forEach((proof, idx) => {
      if (proof && proof.number && proof.number.trim().length > 0) {
        const docRes = validateKYCDocument(proof.type, proof.number, { required: false });
        if (!docRes.isValid) {
          errors[`idProofNumber_${idx}`] = docRes.error!;
          if (idx === 0) errors.idProofNumber = docRes.error!;
        }
      }
    });
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep4 = (): boolean => {
    const errors: Record<string, string> = {};
    if (draft.guarantor.phone && draft.guarantor.phone.trim().length > 0) {
      const gPhoneRes = validateIndianPhone(draft.guarantor.phone, {
        required: false,
        fieldName: 'Guarantor phone',
      });
      if (!gPhoneRes.isValid) {
        errors.guarantorPhone = gPhoneRes.error!;
      }
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleQuickSaveFromStep1 = async () => {
    const valid = await validateStep1();
    if (!valid) return;
    saveCustomer();
  };

  const handlePickPhoto = () => {
    openPhotoSourcePicker({
      title: 'Customer Profile Photo',
      hasExistingPhoto: Boolean(draft.photoUrl),
      onPhotoSelected: (avatarUri) => {
        draft.setField('photoUrl', avatarUri);
        showSuccess('Customer photo attached');
      },
      onPhotoRemoved: () => {
        draft.setField('photoUrl', '');
        showSuccess('Customer photo removed');
      },
      onError: showError,
    });
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
      if (!validateStep4()) return;
      draft.setStep(5);
    } else if (draft.currentStep === 5) {
      saveCustomer();
    }
  };

  const prevStep = () => {
    if (draft.currentStep > 1) {
      draft.setStep(draft.currentStep - 1);
    } else {
      // Preserve temporary filled form data in local cache
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/customers' as any);
      }
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
        phone: sanitizePhone(draft.phone),
        altPhone: draft.altPhone ? sanitizePhone(draft.altPhone) : undefined,
        email: draft.email || undefined,
        occupation: draft.occupation || undefined,
        monthlyIncome: draft.monthlyIncome ? draft.monthlyIncome * 100 : undefined,
        photoUrl: draft.photoUrl || undefined,
        address: cleanAddress,
        idProofs: draft.idProofs || [],
        references: draft.references || [],
        guarantor: draft.guarantor.name
          ? {
              name: draft.guarantor.name.trim(),
              phone: draft.guarantor.phone ? sanitizePhone(draft.guarantor.phone) : '',
              address: draft.guarantor.address || '',
            }
          : undefined,
        tags: draft.tags?.length > 0 ? draft.tags : ['Customer'],
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
      await secureStorage.setItem('loanledger_last_active_route', '/');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/customers' as any);
      }
    } catch (e: any) {
      showError(e?.message || 'Failed to save customer');
    }
  };

  return (
    <Screen scrollable>
      <Header
        showBack
        onBack={prevStep}
        title="New Customer"
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
            title="Customer Details"
            subtitle="Enter primary identification and contact numbers"
          />

          {duplicateWarning && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.warningText, { color: colors.warning }]}>{duplicateWarning}</Text>
            </View>
          )}

          {/* Customer Profile Photo Capture & Upload */}
          <View style={styles.photoUploadSection}>
            <TouchableOpacity
              onPress={handlePickPhoto}
              activeOpacity={0.8}
              style={styles.avatarTouchable}
              accessibilityRole="button"
              accessibilityLabel="Upload customer photo"
            >
              <Avatar
                uri={draft.photoUrl}
                name={draft.fullName || 'Customer'}
                size={76}
                borderColor={colors.primary}
                backgroundColor={colors.primaryLight}
                textColor={colors.primaryDark}
              />
              <View style={[styles.avatarCameraBadge, { backgroundColor: colors.primaryDark, borderColor: colors.surface }]}>
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.photoHelperText, { color: colors.textSecondary }]}>
              {draft.photoUrl ? 'Tap photo to change or remove' : 'Tap to take customer photo (Camera / Gallery)'}
            </Text>
          </View>

          <Input
            label="Full Legal Name *"
            placeholder="Enter customer full name"
            value={draft.fullName}
            onChangeText={(val) => draft.setField('fullName', val)}
            error={stepErrors.fullName}
            leadingIcon="person-outline"
          />

          <Input
            label="Mobile Number (Strictly 10 Digits) *"
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            value={draft.phone}
            onChangeText={(val) => {
              const cleaned = sanitizePhone(val);
              draft.setField('phone', cleaned);
              if (stepErrors.phone) {
                setStepErrors((prev) => ({ ...prev, phone: '' }));
              }
            }}
            error={stepErrors.phone}
            leadingIcon="call-outline"
          />

          <Input
            label="Alternate Contact Number (10 Digits)"
            placeholder="e.g. 9443210987"
            keyboardType="phone-pad"
            maxLength={10}
            value={draft.altPhone}
            onChangeText={(val) => {
              const cleaned = sanitizePhone(val);
              draft.setField('altPhone', cleaned);
              if (stepErrors.altPhone) {
                setStepErrors((prev) => ({ ...prev, altPhone: '' }));
              }
            }}
            error={stepErrors.altPhone}
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

      {/* STEP 2: Address (Single Column Layout) */}
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
            onChangeText={(val) => {
              draft.setField('address', { ...draft.address, line1: val });
              if (stepErrors.line1) {
                setStepErrors((prev) => ({ ...prev, line1: '' }));
              }
            }}
            error={stepErrors.line1}
            leadingIcon="home-outline"
          />

          <Input
            label="City / Town *"
            placeholder="Enter city or town"
            value={draft.address.city}
            onChangeText={(val) => {
              draft.setField('address', { ...draft.address, city: val });
              if (stepErrors.city) {
                setStepErrors((prev) => ({ ...prev, city: '' }));
              }
            }}
            error={stepErrors.city}
            leadingIcon="location-outline"
          />

          <Input
            label="State"
            placeholder="Tamil Nadu"
            value={draft.address.state}
            onChangeText={(val) =>
              draft.setField('address', { ...draft.address, state: val })
            }
            leadingIcon="map-outline"
          />

          <Input
            label="Pincode (Strictly 6 Digits) *"
            placeholder="e.g. 641001"
            keyboardType="numeric"
            maxLength={6}
            value={draft.address.pincode}
            onChangeText={(val) => {
              const cleaned = sanitizePincode(val);
              draft.setField('address', { ...draft.address, pincode: cleaned });
              if (stepErrors.pincode) {
                setStepErrors((prev) => ({ ...prev, pincode: '' }));
              }
            }}
            error={stepErrors.pincode}
            leadingIcon="navigate-outline"
          />
        </View>
      )}

      {/* STEP 3: KYC Proofs (Camera Photos, Gallery Images & PDF Documents) */}
      {draft.currentStep === 3 && (
        <View style={styles.stepContainer}>
          <DisplayTitle
            title="ID Proofs (Aadhaar, PAN, Voter, Ration Card)"
            subtitle="Capture camera photo, choose gallery image or upload PDF document"
          />

          {draft.idProofs.map((proof, index) => {
            const errKey = `idProofNumber_${index}`;
            const errorMsg = stepErrors[errKey] || (index === 0 ? stepErrors.idProofNumber : '');

            return (
              <Card
                key={proof.id || index}
                variant="surface"
                style={{
                  marginBottom: 16,
                  padding: 16,
                  borderRadius: radii.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  backgroundColor: colors.surface,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryDark} />
                    <Text style={{ fontFamily: typography.fontHeadline, fontSize: 14, fontWeight: '700', color: colors.ink }}>
                      ID Proof #{index + 1} • {proof.type || 'Document'}
                    </Text>
                  </View>
                  {draft.idProofs.length > 1 && (
                    <TouchableOpacity
                      onPress={() => draft.removeIdProof(proof.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <SelectModal
                  label="ID Card Type *"
                  selectedValue={proof.type || 'Aadhaar'}
                  onSelect={(val) => {
                    const updated = [...draft.idProofs];
                    updated[index] = { ...updated[index], type: val as IdProofType, number: '' };
                    draft.setField('idProofs', updated);
                    setStepErrors((prev) => ({ ...prev, [errKey]: '', idProofNumber: '' }));
                  }}
                  options={[
                    { label: 'Aadhaar Card (12 Digits)', value: 'Aadhaar', icon: 'card-outline' },
                    { label: 'PAN Card (ABCDE1234F - 10 Chars)', value: 'PAN', icon: 'document-text-outline' },
                    { label: 'Voter ID Card (10 Chars)', value: 'Voter', icon: 'finger-print-outline' },
                    { label: 'Driving License', value: 'DrivingLicense', icon: 'car-outline' },
                    { label: 'Ration Card (Smart Card / Family Card)', value: 'RationCard', icon: 'receipt-outline' },
                    { label: 'Passport (8 Chars)', value: 'Passport', icon: 'globe-outline' },
                    { label: 'Other Government / Property Proof', value: 'Other', icon: 'document-attach-outline' },
                  ]}
                />

                <Input
                  label={
                    proof.type === 'Aadhaar'
                      ? 'Aadhaar Number (Strictly 12 Digits)'
                      : proof.type === 'PAN'
                      ? 'PAN Number (Strictly 10 Characters)'
                      : `${proof.type || 'ID'} Number`
                  }
                  placeholder={
                    proof.type === 'Aadhaar'
                      ? 'e.g. 12-digit Aadhaar (123456789012)'
                      : proof.type === 'PAN'
                      ? 'e.g. ABCDE1234F'
                      : 'Enter ID proof number'
                  }
                  keyboardType={proof.type === 'Aadhaar' ? 'numeric' : 'default'}
                  autoCapitalize="characters"
                  maxLength={
                    proof.type === 'Aadhaar'
                      ? 12
                      : proof.type === 'PAN'
                      ? 10
                      : proof.type === 'Passport'
                      ? 8
                      : 16
                  }
                  value={proof.number || ''}
                  onChangeText={(val) => {
                    const cleaned = sanitizeKYCDocument(proof.type || 'Aadhaar', val);
                    const updated = [...draft.idProofs];
                    updated[index] = { ...updated[index], number: cleaned };
                    draft.setField('idProofs', updated);
                    if (stepErrors[errKey] || stepErrors.idProofNumber) {
                      setStepErrors((prev) => ({ ...prev, [errKey]: '', idProofNumber: '' }));
                    }
                  }}
                  error={errorMsg}
                  leadingIcon="keypad-outline"
                />

                <KYCDocumentPicker
                  label={`${proof.type || 'Document'} Proof (Camera, Image or PDF)`}
                  frontUri={proof.frontUrl}
                  backUri={proof.backUrl}
                  hasBackSide={proof.type !== 'PAN'}
                  onChangeFront={(uri) => {
                    const updated = [...draft.idProofs];
                    updated[index] = { ...updated[index], frontUrl: uri };
                    draft.setField('idProofs', updated);
                  }}
                  onChangeBack={(uri) => {
                    const updated = [...draft.idProofs];
                    updated[index] = { ...updated[index], backUrl: uri };
                    draft.setField('idProofs', updated);
                  }}
                />
              </Card>
            );
          })}

          {/* Add Another ID Proof Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 13,
              paddingHorizontal: 16,
              borderRadius: radii.sm + 4,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.primaryDark,
              backgroundColor: colors.primarySoft,
              gap: 8,
              marginTop: 4,
              marginBottom: 14,
            }}
            onPress={() => {
              const typesInUse = draft.idProofs.map((p) => p.type);
              const nextType: IdProofType = !typesInUse.includes('PAN')
                ? 'PAN'
                : !typesInUse.includes('Voter')
                ? 'Voter'
                : !typesInUse.includes('RationCard')
                ? 'RationCard'
                : 'Other';

              draft.addIdProof({
                id: `proof-${Date.now()}`,
                type: nextType,
                number: '',
                verified: false,
              });
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primaryDark} />
            <Text style={{ fontFamily: typography.fontHeadline, fontSize: 13, fontWeight: '700', color: colors.primaryDark }}>
              + Add Another ID Proof (e.g. PAN, Voter, Ration Card)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 4: Guarantor & References (Single Column Layout) */}
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
            label="Guarantor Phone (Strictly 10 Digits)"
            placeholder="e.g. 9443210987"
            keyboardType="phone-pad"
            maxLength={10}
            value={draft.guarantor.phone}
            onChangeText={(val) => {
              const cleaned = sanitizePhone(val);
              draft.setField('guarantor', { ...draft.guarantor, phone: cleaned });
              if (stepErrors.guarantorPhone) {
                setStepErrors((prev) => ({ ...prev, guarantorPhone: '' }));
              }
            }}
            error={stepErrors.guarantorPhone}
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
            subtitle="Verify customer information before creating profile"
          />

          <Card variant="surface" style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.reviewHeader}>
              <Avatar uri={draft.photoUrl} name={draft.fullName} size={54} />
              <View style={styles.reviewInfo}>
                <Text style={[styles.reviewName, { color: colors.ink }]}>{draft.fullName}</Text>
                <Text style={[styles.reviewPhone, { color: colors.textSecondary }]}>+91 {draft.phone}</Text>
                <Text style={[styles.reviewCity, { color: colors.textTertiary }]}>{draft.address.city}, Tamil Nadu</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {draft.idProofs.map((p, idx) => (
              <View key={p.id || idx} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {p.type} Proof:
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.summaryValue, { color: colors.ink }]}>
                    {p.number ? '••••' + p.number.slice(-4) : 'Pending'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 3 }}>
                    {p.frontUrl ? (
                      <Badge
                        size="sm"
                        status="ACTIVE"
                        label={isPdfDocument(p.frontUrl) ? 'Front: PDF' : 'Front: Photo'}
                      />
                    ) : null}
                    {p.backUrl ? (
                      <Badge
                        size="sm"
                        status="ACTIVE"
                        label={isPdfDocument(p.backUrl) ? 'Back: PDF' : 'Back: Photo'}
                      />
                    ) : null}
                  </View>
                </View>
              </View>
            ))}

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
              : 'Save Customer'
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
  photoUploadSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  avatarTouchable: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHelperText: {
    ...typography.caption,
    marginTop: 8,
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
