import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  Screen,
  DisplayTitle,
  Card,
  ListRow,
  PillButton,
  SegmentedControl,
  Input,
  SelectModal,
  Badge,
  useToast,
  PinCodeInput,
} from '@/components/ui';
import { colors, AccentColor, ThemeMode, ACCENT_PALETTES } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore, useTheme } from '@/store/useThemeStore';
import { Toggle } from '@/components/ui/Toggle';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { useLoanProductsStore } from '@/store/useLoanProductsStore';
import { exportCsvReport, shareFile } from '@/features/reports/exportEngine';
import { useCustomers } from '@/features/customers/hooks';
import { useLoans } from '@/features/loans/hooks';
import { usePayments } from '@/features/payments/hooks';
import { usePermanentAvatar, setPermanentAvatar } from '@/lib/storage/profileStorage';

export default function SettingsScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const {
    user,
    isLockEnabled,
    setLockEnabled,
    setupPin,
    signOut,
    isBiometricAvailable,
    unlockWithBiometrics,
    setUserPassword,
    updatePhotoURL,
  } = useAuthStore();

  const permanentAvatar = usePermanentAvatar();

  const {
    themeMode,
    accentColor,
    isDark,
    setThemeMode,
    setAccentColor,
    colors,
  } = useTheme();

  const {
    business,
    currency,
    initialize: initializeBusiness,
    updateBusinessProfile,
    updateCurrencySettings,
    updateAvatar,
  } = useBusinessSettingsStore();

  const { products: loanProducts, initialize: initializeProducts } = useLoanProductsStore();

  const { data: customers } = useCustomers();
  const { data: loans } = useLoans();
  const { data: payments } = usePayments();

  // Modals state
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Business Profile Form
  const [bizName, setBizName] = useState(business.businessName);
  const [bizTagline, setBizTagline] = useState(business.tagline);
  const [bizOwner, setBizOwner] = useState(business.ownerName);
  const [bizPhone, setBizPhone] = useState(business.phone);
  const [bizEmail, setBizEmail] = useState(business.email);
  const [bizCity, setBizCity] = useState(business.city);
  const [bizAddress, setBizAddress] = useState(business.address);
  const [bizLicense, setBizLicense] = useState(business.licenseNumber);

  // Currency & Locale Form
  const [currSymbol, setCurrSymbol] = useState(currency.currencySymbol);
  const [numFormat, setNumFormat] = useState(currency.numberFormat);
  const [fyMonth, setFyMonth] = useState(currency.financialYearStartMonth.toString());

  // Security PIN Form
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    useThemeStore.getState().initializeTheme();
    initializeBusiness();
    initializeProducts();
  }, [initializeBusiness, initializeProducts]);

  useEffect(() => {
    setBizName(business.businessName);
    setBizTagline(business.tagline);
    setBizOwner(business.ownerName);
    setBizPhone(business.phone);
    setBizEmail(business.email);
    setBizCity(business.city);
    setBizAddress(business.address);
    setBizLicense(business.licenseNumber);
  }, [business]);

  useEffect(() => {
    setCurrSymbol(currency.currencySymbol);
    setNumFormat(currency.numberFormat);
    setFyMonth(currency.financialYearStartMonth.toString());
  }, [currency]);

  // Avatar Image Picker
  const handlePickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        let avatarUri = asset.uri;

        try {
          const manip = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 300, height: 300 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (manip.base64) {
            avatarUri = `data:image/jpeg;base64,${manip.base64}`;
          }
        } catch { }

        await setPermanentAvatar(avatarUri);
        await updateAvatar(avatarUri);
        await updatePhotoURL(avatarUri);
        showSuccess('Profile photo updated');
      }
    } catch {
      showError('Failed to pick profile image');
    }
  };

  const safelyCloseModal = (setter: (val: boolean) => void) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.();
    }
    setter(false);
  };

  // Save Business Profile
  const handleSaveBusinessProfile = async () => {
    if (!bizName.trim()) {
      showError('Please enter a business name');
      return;
    }
    await updateBusinessProfile({
      businessName: bizName.trim(),
      tagline: bizTagline.trim(),
      ownerName: bizOwner.trim(),
      phone: bizPhone.trim(),
      email: bizEmail.trim(),
      city: bizCity.trim(),
      address: bizAddress.trim(),
      licenseNumber: bizLicense.trim(),
    });
    safelyCloseModal(setProfileModalVisible);
    showSuccess('Business profile saved');
  };

  // Save Currency Settings
  const handleSaveCurrencySettings = async () => {
    await updateCurrencySettings({
      currencySymbol: currSymbol,
      numberFormat: numFormat as 'indian' | 'international',
      financialYearStartMonth: parseInt(fyMonth, 10) || 4,
    });
    safelyCloseModal(setCurrencyModalVisible);
    showSuccess('Currency & locale settings saved');
  };

  // Save New PIN
  const handleSavePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      showError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      showError('PIN confirmation does not match');
      return;
    }
    await setupPin(newPin);
    setNewPin('');
    setConfirmPin('');
    safelyCloseModal(setPinModalVisible);
    showSuccess('App lock PIN changed successfully');
  };

  // Save New Password
  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    try {
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, newPassword);
        } catch (authErr: any) {
          console.warn('Firebase updatePassword notice:', authErr?.message);
        }
      }
      await setUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      safelyCloseModal(setPasswordModalVisible);
      showSuccess('Security unlock password updated successfully');
    } catch (err: any) {
      showError(err?.message || 'Failed to update password');
    }
  };

  // Biometric Unlock — validates fingerprint/FaceID and unlocks the app
  const handleBiometricUnlock = async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      showSuccess('Biometrics verified — app unlocked!');
      router.replace('/' as any);
    } else {
      showError('Biometric verification cancelled or failed');
    }
  };

  // Full Ledger Backup
  const handleExportFullBackup = async () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        business,
        currency,
        loanProducts,
        customers: customers || [],
        loans: loans || [],
        payments: payments || [],
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const uri = await exportCsvReport('SenthurFinance_Complete_Backup', ['full_ledger_json'], [[jsonStr]]);
      await shareFile(uri, 'Senthur Finance Complete Ledger JSON');
      showSuccess('Backup exported successfully');
    } catch {
      showError('Failed to generate full backup');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of the admin session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          showSuccess('Logged out successfully');
          router.replace('/auth/login' as any);
        },
      },
    ]);
  };

  const colorSwatches: { key: AccentColor; label: string; color: string }[] = [
    { key: 'violet', label: 'Violet', color: '#8B5CF6' },
    { key: 'blue', label: 'Blue', color: '#3B82F6' },
    { key: 'emerald', label: 'Green', color: '#10B981' },
    { key: 'amber', label: 'Gold', color: '#F59E0B' },
    { key: 'rose', label: 'Rose', color: '#F43F5E' },
    { key: 'slate', label: 'Slate', color: '#64748B' },
  ];

  return (
    <Screen scrollable>
      <DisplayTitle
        title="Settings"
        subtitle="Business profile, color themes & lending rules"
      />

      {/* ADMIN PROFILE CARD WITH AVATAR */}
      <View style={styles.section}>
        <Card variant="surface" style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.profileHeaderRow}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
              {business.avatarUrl || user?.photoURL || permanentAvatar ? (
                <Image
                  source={{ uri: business.avatarUrl || user?.photoURL || permanentAvatar }}
                  style={[styles.avatarImage, { borderColor: colors.primary }]}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[styles.avatarInitial, { color: colors.primaryDark }]}>
                    {(business.ownerName || business.businessName || 'Admin').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.cameraIconBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.profileTextWrap}>
              <Text style={[styles.profileBizName, { color: colors.ink }]}>{business.businessName}</Text>

              {/* Admin Identity with Shifted Verified Shield Badge */}
              <View style={styles.adminRow}>
                <Text style={[styles.profileOwnerName, { color: colors.textSecondary }]}>
                  {business.ownerName || 'Admin'}
                </Text>
                <View
                  style={[
                    styles.verifiedBadge,
                    {
                      backgroundColor: isDark ? `${colors.primary}20` : colors.primarySoft,
                      borderColor: isDark ? `${colors.primary}45` : colors.primaryBorder,
                    },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                  <Text style={[styles.verifiedBadgeText, { color: colors.primaryDark }]}>
                    {business.ownerName?.trim().toLowerCase() === 'admin' ? 'Verified' : 'Verified Admin'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.profileEmail, { color: colors.textTertiary }]}>{user?.email || business.email}</Text>

              {business.licenseNumber ? (
                <View
                  style={[
                    styles.licenseBadge,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.surfaceMuted,
                      borderColor: isDark ? colors.border : 'transparent',
                      borderWidth: isDark ? 1 : 0,
                    },
                  ]}
                >
                  <Ionicons name="ribbon-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.licenseText, { color: colors.textSecondary }]}>{business.licenseNumber}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>
      </View>

      {/* APPEARANCE & THEME SECTION */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.headingPrimary }]}>APPEARANCE & THEME</Text>
        <Card variant="surface" style={styles.card}>
          <View style={styles.themeModeWrap}>
            <Text style={[styles.cardItemTitle, { color: colors.headingPrimary }]}>Display Theme</Text>
            <SegmentedControl
              items={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System', value: 'system' },
              ]}
              selectedValue={themeMode}
              onSelect={(val) => setThemeMode(val as ThemeMode)}
            />
          </View>

          <View style={styles.colorPaletteWrap}>
            <Text style={[styles.cardItemTitle, { color: colors.headingPrimary }]}>Color Theme (Accent Palette)</Text>
            <Text style={styles.cardItemSub}>
              Changes primary accent across buttons, headers, tiles & graphs
            </Text>

            <View style={styles.swatchesRow}>
              {colorSwatches.map((swatch) => {
                const isSelected = accentColor === swatch.key;
                return (
                  <TouchableOpacity
                    key={swatch.key}
                    style={styles.swatchItem}
                    onPress={() => setAccentColor(swatch.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.swatchCircle, { backgroundColor: swatch.color }]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.swatchLabel,
                        isSelected && { color: colors.headingPrimary, fontWeight: '700' },
                      ]}
                    >
                      {swatch.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>
      </View>

      {/* SECURITY & AUTHENTICATION */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.headingPrimary }]}>SECURITY & ACCESS CONTROL</Text>
        <Card variant="surface" style={styles.card}>
          <ListRow
            title="Biometric & PIN App Lock"
            subtitle="Require FaceID / Fingerprint / PIN on open"
            iconName="finger-print-outline"
            rightNode={
              <Toggle
                value={isLockEnabled}
                onValueChange={(val) => setLockEnabled(val)}
              />
            }
          />

          <ListRow
            title="Setup / Change Security PIN"
            subtitle="4-digit quick passcode for admin access"
            iconName="lock-closed-outline"
            showChevron
            onPress={() => setPinModalVisible(true)}
          />

          <ListRow
            title="Change Admin Password"
            subtitle="Update Firebase account master password"
            iconName="key-outline"
            showChevron
            onPress={() => setPasswordModalVisible(true)}
          />

          {isBiometricAvailable && (
            <ListRow
              title="Unlock with Fingerprint / FaceID"
              subtitle="Use biometrics to unlock and open the app"
              iconName="finger-print-outline"
              iconColor={colors.primaryDark}
              iconBgColor={colors.primarySoft}
              showChevron
              onPress={handleBiometricUnlock}
            />
          )}
        </Card>
      </View>

      {/* BUSINESS & LENDING CONFIGURATION */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.headingPrimary }]}>BUSINESS & LENDING PROFILE</Text>
        <Card variant="surface" style={styles.card}>
          <ListRow
            title="Business Profile"
            subtitle={`${business.businessName} • ${business.city}`}
            iconName="business-outline"
            showChevron
            onPress={() => setProfileModalVisible(true)}
          />

          <ListRow
            title="Currency & Regional Settings"
            subtitle={`${currency.currencySymbol} ${currency.currencyCode} • ${currency.numberFormat === 'indian' ? 'Lakhs & Crores' : 'Millions & Billions'}`}
            iconName="cash-outline"
            showChevron
            onPress={() => setCurrencyModalVisible(true)}
          />

          <ListRow
            title="Default Loan Rules & Schemes"
            subtitle={`${loanProducts.length} active schemes • Gold, Vehicle RC, Property, Hand Loan`}
            iconName="calculator-outline"
            showChevron
            onPress={() => router.push('/settings/loan-types' as any)}
          />
        </Card>
      </View>

      {/* DATA, BACKUP & EXPORTS */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.headingPrimary }]}>DATA & BACKUP</Text>
        <Card variant="surface" style={styles.card}>
          <ListRow
            title="Reports & PDF Exports"
            subtitle="Daily collection sheets, overdue audits & statement PDFs"
            iconName="document-text-outline"
            showChevron
            onPress={() => router.push('/reports' as any)}
          />

          <ListRow
            title="Full Ledger Backup (JSON)"
            subtitle="Complete offline snapshot of all borrowers, loans & settings"
            iconName="cloud-download-outline"
            iconColor={colors.primaryDark}
            iconBgColor={colors.primarySoft}
            showChevron
            onPress={handleExportFullBackup}
          />
        </Card>
      </View>

      {/* ADMIN SIGN OUT */}
      <View style={styles.section}>
        <Card variant="surface" style={styles.card}>
          <ListRow
            title="Sign Out Session"
            subtitle="Close admin session and lock app"
            iconName="log-out-outline"
            iconColor={colors.danger}
            iconBgColor={colors.dangerLight}
            onPress={handleSignOut}
          />
        </Card>
      </View>

      {/* LEGAL DISCLAIMER */}
      <View style={[styles.disclaimerBox, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={[styles.disclaimerTitle, { color: colors.headingPrimary }]}>LEGAL DISCLAIMER</Text>
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          Senthur Finance is a private record-keeping and audit tool for money lenders. The admin is solely responsible for compliance with the Moneylenders Act and local financial guidelines.
        </Text>
      </View>

      {/* MODAL 1: BUSINESS PROFILE MODAL */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => safelyCloseModal(setProfileModalVisible)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Edit Business Profile</Text>
              <TouchableOpacity onPress={() => safelyCloseModal(setProfileModalVisible)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Input
                label="Business / Enterprise Name *"
                value={bizName}
                onChangeText={setBizName}
                placeholder="e.g. Senthur Finance"
              />
              <Input
                label="Business Tagline"
                value={bizTagline}
                onChangeText={setBizTagline}
                placeholder="e.g. Asset Finance & Money Lending"
              />
              <Input
                label="Owner / Lender Name *"
                value={bizOwner}
                onChangeText={setBizOwner}
                placeholder="Enter lender name"
              />
              <Input
                label="Contact Phone / WhatsApp *"
                value={bizPhone}
                onChangeText={setBizPhone}
                keyboardType="phone-pad"
                placeholder="Enter contact mobile number"
              />
              <Input
                label="Official Email"
                value={bizEmail}
                onChangeText={setBizEmail}
                keyboardType="email-address"
                placeholder="Enter official email"
              />
              <Input
                label="Office Address"
                value={bizAddress}
                onChangeText={setBizAddress}
                placeholder="Enter office address"
              />
              <Input
                label="City / District"
                value={bizCity}
                onChangeText={setBizCity}
                placeholder="Enter city / district"
              />
              <Input
                label="Moneylending License / Reg. No"
                value={bizLicense}
                onChangeText={setBizLicense}
                placeholder="Enter registration or license number"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <PillButton
                title="Save Business Profile"
                onPress={handleSaveBusinessProfile}
                variant="primary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CURRENCY & LOCALE MODAL */}
      <Modal
        visible={currencyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => safelyCloseModal(setCurrencyModalVisible)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Currency & Locale</Text>
              <TouchableOpacity onPress={() => safelyCloseModal(setCurrencyModalVisible)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <SelectModal
                label="Currency Symbol & Code"
                selectedValue={currSymbol}
                onSelect={(val) => setCurrSymbol(val)}
                options={[
                  { label: 'Indian Rupee (₹ INR)', value: '₹' },
                  { label: 'US Dollar ($ USD)', value: '$' },
                  { label: 'Euro (€ EUR)', value: '€' },
                  { label: 'British Pound (£ GBP)', value: '£' },
                  { label: 'UAE Dirham (AED)', value: 'AED' },
                ]}
              />

              <SelectModal
                label="Number Number System"
                selectedValue={numFormat}
                onSelect={(val) => setNumFormat(val as any)}
                options={[
                  { label: 'Indian System (Lakhs & Crores: 1,00,000)', value: 'indian' },
                  { label: 'International System (Millions & Billions: 100,000)', value: 'international' },
                ]}
              />

              <SelectModal
                label="Financial Year Starting Month"
                selectedValue={fyMonth}
                onSelect={(val) => setFyMonth(val)}
                options={[
                  { label: 'April (Standard Indian Financial Year)', value: '4' },
                  { label: 'January (Calendar Year)', value: '1' },
                ]}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <PillButton
                title="Save Regional Settings"
                onPress={handleSaveCurrencySettings}
                variant="primary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: SECURITY PIN MODAL */}
      <Modal
        visible={pinModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setNewPin('');
          setConfirmPin('');
          safelyCloseModal(setPinModalVisible);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Setup / Change Security PIN</Text>
              <TouchableOpacity
                onPress={() => {
                  setNewPin('');
                  setConfirmPin('');
                  safelyCloseModal(setPinModalVisible);
                }}
              >
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScroll}>
              <View style={styles.pinModalHero}>
                <View style={[styles.pinIconCircle, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="shield-checkmark" size={26} color={colors.primaryDark} />
                </View>
                <Text style={[styles.pinHeroTitle, { color: colors.ink }]}>Set 4-Digit Passcode</Text>
                <Text style={[styles.pinHeroSubtitle, { color: colors.textSecondary }]}>
                  Use this passcode for rapid device lock and borrower record security.
                </Text>
              </View>

              <PinCodeInput
                label="New Security PIN"
                value={newPin}
                onChangeValue={setNewPin}
                autoFocus
              />

              <PinCodeInput
                label="Confirm Security PIN"
                value={confirmPin}
                onChangeValue={setConfirmPin}
              />

              {confirmPin.length === 4 && (
                <View
                  style={[
                    styles.pinMatchBadge,
                    {
                      backgroundColor:
                        newPin === confirmPin ? colors.successLight : colors.dangerLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={newPin === confirmPin ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={newPin === confirmPin ? colors.success : colors.danger}
                  />
                  <Text
                    style={[
                      styles.pinMatchText,
                      { color: newPin === confirmPin ? colors.success : colors.danger },
                    ]}
                  >
                    {newPin === confirmPin ? 'PINs match perfectly' : 'PINs do not match'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <PillButton
                title="Save Security PIN"
                onPress={handleSavePin}
                variant="primary"
                fullWidth
                disabled={newPin.length !== 4 || confirmPin.length !== 4 || newPin !== confirmPin}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: PASSWORD CHANGE MODAL */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => safelyCloseModal(setPasswordModalVisible)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Change Admin Password</Text>
              <TouchableOpacity onPress={() => safelyCloseModal(setPasswordModalVisible)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScroll}>
              <Input
                label="New Password (min 6 characters) *"
                placeholder="Enter new password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Input
                label="Confirm New Password *"
                placeholder="Re-enter new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <View style={styles.modalFooter}>
              <PillButton
                title="Update Password"
                onPress={handleSavePassword}
                variant="primary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    padding: 6,
  },
  profileCard: {
    padding: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarInitial: {
    fontFamily: typography.fontHeadline,
    fontSize: 28,
    color: colors.primaryDark,
    letterSpacing: 1.0,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileTextWrap: {
    flex: 1,
  },
  profileBizName: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    fontSize: 18,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  verifiedBadgeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  profileOwnerName: {
    ...typography.captionMedium,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
  },
  profileEmail: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.textTertiary,
    marginTop: 1,
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  licenseText: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  themeModeWrap: {
    padding: 10,
  },
  cardItemTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    marginBottom: 8,
  },
  cardItemSub: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  colorPaletteWrap: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  swatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  swatchItem: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
  },
  swatchItemSelected: {
    backgroundColor: colors.surfaceMuted,
  },
  swatchCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  swatchLabel: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 11,
  },
  disclaimerBox: {
    backgroundColor: colors.surfaceMuted,
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  disclaimerText: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    fontSize: 18,
  },
  modalScroll: {
    maxHeight: 460,
  },
  modalFooter: {
    marginTop: 16,
  },
  pinModalHero: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  pinIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pinHeroTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 1.0,
  },
  pinHeroSubtitle: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  pinMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginTop: 8,
    alignSelf: 'center',
  },
  pinMatchText: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
