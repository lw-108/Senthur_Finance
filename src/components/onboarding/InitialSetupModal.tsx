import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { secureStorage } from '@/lib/storage/secureStorage';
import { AccentColor, ThemeMode, ACCENT_PALETTES } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { Input, PillButton, useToast } from '@/components/ui';

export const SETUP_COMPLETED_KEY = 'loanledger_setup_completed';

export async function isSetupCompleted(): Promise<boolean> {
  try {
    const val = await secureStorage.getItem(SETUP_COMPLETED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setSetupCompleted(completed: boolean): Promise<void> {
  try {
    await secureStorage.setItem(SETUP_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch {}
}

interface InitialSetupModalProps {
  visible: boolean;
  onComplete: () => void;
  /**
   * If true, allows the user to dismiss without saving (e.g. when opened from Settings).
   */
  canDismiss?: boolean;
}

const ACCENT_OPTIONS: { key: AccentColor; label: string; color: string }[] = [
  { key: 'violet', label: 'Violet', color: ACCENT_PALETTES.violet.primary },
  { key: 'blue', label: 'Blue', color: ACCENT_PALETTES.blue.primary },
  { key: 'emerald', label: 'Emerald', color: ACCENT_PALETTES.emerald.primary },
  { key: 'amber', label: 'Amber', color: ACCENT_PALETTES.amber.primary },
  { key: 'rose', label: 'Rose', color: ACCENT_PALETTES.rose.primary },
  { key: 'slate', label: 'Slate', color: ACCENT_PALETTES.slate.primary },
];

export function InitialSetupModal({
  visible,
  onComplete,
  canDismiss = false,
}: InitialSetupModalProps) {
  const { colors: dynamicColors, isDark, themeMode, accentColor, setThemeMode, setAccentColor } = useTheme();
  const { business, updateBusinessProfile } = useBusinessSettingsStore();
  const { showSuccess, showError } = useToast();

  const [orgName, setOrgName] = useState(business.businessName || '');
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(themeMode);
  const [selectedAccent, setSelectedAccent] = useState<AccentColor>(accentColor);

  const [contactsGranted, setContactsGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [mediaGranted, setMediaGranted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setOrgName(business.businessName || '');
      setSelectedTheme(themeMode);
      setSelectedAccent(accentColor);
      checkExistingPermissions();
    }
  }, [visible, business.businessName, themeMode, accentColor]);

  const checkExistingPermissions = async () => {
    if (Platform.OS === 'web') {
      setContactsGranted(true);
      setCameraGranted(true);
      setMediaGranted(true);
      return;
    }

    try {
      const c = await Contacts.getPermissionsAsync();
      setContactsGranted(c.status === 'granted');
    } catch {}

    try {
      const cam = await ImagePicker.getCameraPermissionsAsync();
      setCameraGranted(cam.status === 'granted');
    } catch {}

    try {
      const med = await ImagePicker.getMediaLibraryPermissionsAsync();
      setMediaGranted(med.status === 'granted');
    } catch {}
  };

  const handleSelectTheme = (mode: ThemeMode) => {
    setSelectedTheme(mode);
    setThemeMode(mode);
  };

  const handleSelectAccent = (accent: AccentColor) => {
    setSelectedAccent(accent);
    setAccentColor(accent);
  };

  const handleRequestContacts = async () => {
    if (Platform.OS === 'web') {
      setContactsGranted(true);
      return;
    }
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      const granted = status === 'granted';
      setContactsGranted(granted);
      if (granted) {
        showSuccess('Contacts permission granted');
      } else {
        showError('Contacts permission denied');
      }
    } catch {
      setContactsGranted(false);
    }
  };

  const handleRequestCamera = async () => {
    if (Platform.OS === 'web') {
      setCameraGranted(true);
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      const granted = status === 'granted';
      setCameraGranted(granted);
      if (granted) {
        showSuccess('Camera permission granted');
      } else {
        showError('Camera permission denied');
      }
    } catch {
      setCameraGranted(false);
    }
  };

  const handleRequestMedia = async () => {
    if (Platform.OS === 'web') {
      setMediaGranted(true);
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = status === 'granted';
      setMediaGranted(granted);
      if (granted) {
        showSuccess('Photo library permission granted');
      } else {
        showError('Photo library permission denied');
      }
    } catch {
      setMediaGranted(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const trimmed = orgName.trim();
    if (!trimmed) {
      showError('Please enter an organization name');
      return;
    }

    try {
      setIsSaving(true);
      // 1. Update business organization name across app
      await updateBusinessProfile({ businessName: trimmed });

      // 2. Ensure theme settings are saved
      await setThemeMode(selectedTheme);
      await setAccentColor(selectedAccent);

      // 3. Mark setup as completed in secure storage
      await setSetupCompleted(true);

      showSuccess(`${trimmed} setup saved successfully!`);
      onComplete();
    } catch {
      showError('Failed to save setup');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={canDismiss ? onComplete : undefined}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: dynamicColors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Badge & Title */}
          <View style={styles.headerArea}>
            <View>
              <Text style={[styles.subtitle, { color: dynamicColors.primaryDark }]}>INITIAL APP SETUP</Text>
            </View>

            <Text style={[styles.mainTitle, { color: dynamicColors.ink }]}>Setup Your Workspace</Text>
            <Text style={[styles.subtitle, { color: dynamicColors.textSecondary }]}>
              Configure your organization branding, visual style, and permissions. You can change these anytime in Settings.
            </Text>
          </View>

          {/* 1. Organization Name */}
          <View style={[styles.card, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: dynamicColors.primarySoft }]}>
                <Ionicons name="business" size={18} color={dynamicColors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: dynamicColors.ink }]}>Organization Name</Text>
                <Text style={[styles.cardDescription, { color: dynamicColors.textSecondary }]}>
                  Reflected across all loan agreements, statements, receipts & WhatsApp greetings.
                </Text>
              </View>
            </View>

            <Input
              value={orgName}
              onChangeText={(val) => {
                setOrgName(val);
                if (val.trim()) {
                  // Live-preview: update businessName immediately so background hero title reflects live
                  useBusinessSettingsStore.setState((s) => ({
                    business: { ...s.business, businessName: val },
                  }));
                }
              }}
              placeholder="e.g. Sri Senthur Finance"
              autoCapitalize="words"
              containerStyle={{ marginTop: 12 }}
            />
          </View>

          {/* 2. App Theme Mode */}
          <View style={[styles.card, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: dynamicColors.primarySoft }]}>
                <Ionicons name="contrast-outline" size={18} color={dynamicColors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: dynamicColors.ink }]}>App Theme Mode</Text>
                <Text style={[styles.cardDescription, { color: dynamicColors.textSecondary }]}>
                  Choose your preferred appearance mode.
                </Text>
              </View>
            </View>

            <View style={styles.themeOptionsRow}>
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
                const isSelected = selectedTheme === mode;
                const iconName = mode === 'system' ? 'phone-portrait-outline' : mode === 'light' ? 'sunny-outline' : 'moon-outline';
                const label = mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark';

                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.themeOptionBtn,
                      {
                        backgroundColor: isSelected ? dynamicColors.primarySoft : dynamicColors.background,
                        borderColor: isSelected ? dynamicColors.primary : dynamicColors.border,
                      },
                    ]}
                    onPress={() => handleSelectTheme(mode)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={iconName as any}
                      size={18}
                      color={isSelected ? dynamicColors.primaryDark : dynamicColors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.themeOptionLabel,
                        {
                          color: isSelected ? dynamicColors.primaryDark : dynamicColors.ink,
                          fontFamily: isSelected ? typography.fontHeadline : typography.fontBody,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. Color Theme Accent */}
          <View style={[styles.card, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: dynamicColors.primarySoft }]}>
                <Ionicons name="color-palette-outline" size={18} color={dynamicColors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: dynamicColors.ink }]}>Color Theme</Text>
                <Text style={[styles.cardDescription, { color: dynamicColors.textSecondary }]}>
                  Select your primary accent branding color.
                </Text>
              </View>
            </View>

            <View style={styles.accentGrid}>
              {ACCENT_OPTIONS.map((opt) => {
                const isSelected = selectedAccent === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.accentChip,
                      {
                        backgroundColor: isSelected ? dynamicColors.primarySoft : dynamicColors.background,
                        borderColor: isSelected ? opt.color : dynamicColors.border,
                      },
                    ]}
                    onPress={() => handleSelectAccent(opt.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.accentCircle, { backgroundColor: opt.color }]}>
                      {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    <Text
                      style={[
                        styles.accentLabel,
                        {
                          color: isSelected ? dynamicColors.ink : dynamicColors.textSecondary,
                          fontFamily: isSelected ? typography.fontHeadline : typography.fontBody,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. App Permissions */}
          <View style={[styles.card, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: dynamicColors.primarySoft }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={dynamicColors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: dynamicColors.ink }]}>Required Permissions</Text>
                <Text style={[styles.cardDescription, { color: dynamicColors.textSecondary }]}>
                  Enable permissions to import borrowers and manage verification documents.
                </Text>
              </View>
            </View>

            {/* Contacts permission */}
            <View style={[styles.permissionRow, { borderBottomColor: dynamicColors.border }]}>
              <View style={[styles.permIconBox, { backgroundColor: dynamicColors.primarySoft }]}>
                <Ionicons name="people-outline" size={18} color={dynamicColors.primaryDark} />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.permTitle, { color: dynamicColors.ink }]}>Device Contacts</Text>
                <Text style={[styles.permSubtitle, { color: dynamicColors.textTertiary }]}>
                  Merge contacts into borrower list quickly
                </Text>
              </View>
              {contactsGranted ? (
                <View style={[styles.grantedBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={[styles.grantedText, { color: '#059669' }]}>Allowed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.allowButton, { backgroundColor: dynamicColors.primarySoft, borderColor: dynamicColors.primaryBorder }]}
                  onPress={handleRequestContacts}
                >
                  <Text style={[styles.allowButtonText, { color: dynamicColors.primaryDark }]}>Allow</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Camera permission */}
            <View style={[styles.permissionRow, { borderBottomColor: dynamicColors.border }]}>
              <View style={[styles.permIconBox, { backgroundColor: dynamicColors.primarySoft }]}>
                <Ionicons name="camera-outline" size={18} color={dynamicColors.primaryDark} />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.permTitle, { color: dynamicColors.ink }]}>Camera Access</Text>
                <Text style={[styles.permSubtitle, { color: dynamicColors.textTertiary }]}>
                  Capture KYC document photos & proofs
                </Text>
              </View>
              {cameraGranted ? (
                <View style={[styles.grantedBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={[styles.grantedText, { color: '#059669' }]}>Allowed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.allowButton, { backgroundColor: dynamicColors.primarySoft, borderColor: dynamicColors.primaryBorder }]}
                  onPress={handleRequestCamera}
                >
                  <Text style={[styles.allowButtonText, { color: dynamicColors.primaryDark }]}>Allow</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Media / Photos permission */}
            <View style={[styles.permissionRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.permIconBox, { backgroundColor: dynamicColors.primarySoft }]}>
                <Ionicons name="images-outline" size={18} color={dynamicColors.primaryDark} />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.permTitle, { color: dynamicColors.ink }]}>Photo Library</Text>
                <Text style={[styles.permSubtitle, { color: dynamicColors.textTertiary }]}>
                  Upload borrower profile & ID pictures
                </Text>
              </View>
              {mediaGranted ? (
                <View style={[styles.grantedBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={[styles.grantedText, { color: '#059669' }]}>Allowed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.allowButton, { backgroundColor: dynamicColors.primarySoft, borderColor: dynamicColors.primaryBorder }]}
                  onPress={handleRequestMedia}
                >
                  <Text style={[styles.allowButtonText, { color: dynamicColors.primaryDark }]}>Allow</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <PillButton
              title={isSaving ? 'Saving Preferences...' : 'Save & Continue'}
              iconName="checkmark-outline"
              variant="primary"
              size="lg"
              onPress={handleSaveAndContinue}
              disabled={isSaving}
              fullWidth
            />
            {canDismiss && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onComplete}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: dynamicColors.textSecondary }]}>Close Without Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 40,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  headerArea: {
    marginBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 26,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 15,
  },
  cardDescription: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeOptionLabel: {
    fontSize: 13,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  accentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  accentCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentLabel: {
    fontSize: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  permIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
  },
  permSubtitle: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  allowButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  allowButtonText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  grantedText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
  },
  actionContainer: {
    marginTop: 8,
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 6,
  },
  cancelText: {
    ...typography.caption,
    fontSize: 13,
  },
});
