import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Input,
  PillButton,
  useToast,
  GoogleIcon,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { WelcomeScreen } from '@/components/welcome';

export default function LoginScreen() {
  const router = useRouter();
  const { isDark, colors: dynamicColors } = useTheme();
  const { showSuccess, showError } = useToast();
  const {
    signIn,
    signUp,
    signInWithGoogle,
    setUserPassword,
    resetPassword,
    hasStoredAccount,
    hasPinSet,
  } = useAuthStore();

  // Active form view state ('welcome' | 'login' | 'signup')
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password Setup Modal for First-time Google Auth
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newAppPassword, setNewAppPassword] = useState('');
  const [confirmAppPassword, setConfirmAppPassword] = useState('');
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState('');

  const openLoginForm = () => {
    setIsSignUp(false);
    setAuthSheetVisible(true);
  };

  const openSignUpForm = () => {
    setIsSignUp(true);
    setAuthSheetVisible(true);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.isNewUser) {
        setShowPasswordModal(true);
      } else {
        showSuccess('Signed in with Google successfully');
        router.replace('/' as any);
      }
    } catch (err: any) {
      showError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSaveAppPassword = async () => {
    if (!newAppPassword) {
      setPasswordModalError('Password is required');
      return;
    }
    if (newAppPassword.length < 6) {
      setPasswordModalError('Password must be at least 6 characters');
      return;
    }
    if (newAppPassword !== confirmAppPassword) {
      setPasswordModalError('Passwords do not match');
      return;
    }

    setPasswordModalLoading(true);
    try {
      await setUserPassword(newAppPassword);
      showSuccess('Security unlock password set successfully');
      setShowPasswordModal(false);
      router.replace('/' as any);
    } catch (err: any) {
      setPasswordModalError(err?.message || 'Failed to save password');
    } finally {
      setPasswordModalLoading(false);
    }
  };

  const handleAuth = async () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showError('Please correct the highlighted fields');
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        showSuccess('Admin account created successfully');
      } else {
        await signIn(email.trim(), password);
        showSuccess('Signed in successfully');
      }
      setAuthSheetVisible(false);
      router.replace('/' as any);
    } catch (err: any) {
      showError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showError('Please enter your admin email above first');
      return;
    }
    try {
      await resetPassword(email.trim());
      showSuccess(`Password reset instructions sent to ${email.trim()}`);
    } catch (err: any) {
      showError(err?.message || 'Failed to send password reset email');
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Main Reference Welcome Screen */}
      <WelcomeScreen
        onLogin={openLoginForm}
        onSignUp={openSignUpForm}
        isDarkMode={isDark}
        onPrivacyPolicy={() => showSuccess('Senthur Finance Privacy Policy')}
        onTermsOfUse={() => showSuccess('Senthur Finance Terms of Use')}
      />

      {/* 2. Authentication Bottom Sheet / Modal (Opened by Log In / Sign Up) */}
      <Modal
        visible={authSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAuthSheetVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              },
            ]}
          >
            {/* Sheet Handle Bar & Header */}
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? '#444444' : '#D1D5DB' },
                ]}
              />
              <View style={styles.sheetTopRow}>
                <View>
                  <Text
                    style={[
                      styles.sheetTitle,
                      { color: isDark ? '#FFFFFF' : '#111111' },
                    ]}
                  >
                    {isSignUp ? 'Create Admin Account' : 'Welcome Back'}
                  </Text>
                  <Text
                    style={[
                      styles.sheetSubtitle,
                      { color: isDark ? '#A1A1AA' : '#6B7280' },
                    ]}
                  >
                    {isSignUp
                      ? 'First-time money lender account setup'
                      : 'Sign in to access Senthur Finance portal'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setAuthSheetVisible(false)}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDark ? '#27272A' : '#F3F4F6' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={isDark ? '#FFFFFF' : '#111111'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              {/* Sign in with Google Button */}
              {!isSignUp && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.googleBtn,
                      {
                        backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                        borderColor: isDark ? '#3F3F46' : '#E5E7EB',
                      },
                    ]}
                    onPress={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    activeOpacity={0.8}
                  >
                    {googleLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={dynamicColors.primary}
                      />
                    ) : (
                      <View style={styles.googleBtnContent}>
                        <GoogleIcon size={20} />
                        <Text
                          style={[
                            styles.googleBtnText,
                            { color: isDark ? '#FFFFFF' : '#111111' },
                          ]}
                        >
                          Sign in with Google
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.dividerRow}>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: isDark ? '#3F3F46' : '#E5E7EB' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dividerText,
                        { color: isDark ? '#71717A' : '#9CA3AF' },
                      ]}
                    >
                      OR USE ADMIN EMAIL
                    </Text>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: isDark ? '#3F3F46' : '#E5E7EB' },
                      ]}
                    />
                  </View>
                </>
              )}

              {/* Form Inputs */}
              <Input
                label="Admin Email *"
                placeholder="Enter admin email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                error={errors.email}
                leadingIcon="mail-outline"
              />

              <Input
                label="Password *"
                placeholder="Enter password"
                isPassword
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: '' }));
                }}
                error={errors.password}
                leadingIcon="lock-closed-outline"
              />

              {!isSignUp && (
                <View style={styles.optionsRow}>
                  {hasStoredAccount ? (
                    <TouchableOpacity
                      onPress={() => {
                        setAuthSheetVisible(false);
                        router.push('/auth/lock' as any);
                      }}
                    >
                      <Text
                        style={[
                          styles.pinLinkText,
                          { color: dynamicColors.primary },
                        ]}
                      >
                        Unlock with Password
                      </Text>
                    </TouchableOpacity>
                  ) : hasPinSet ? (
                    <TouchableOpacity
                      onPress={() => {
                        setAuthSheetVisible(false);
                        router.push('/auth/lock' as any);
                      }}
                    >
                      <Text
                        style={[
                          styles.pinLinkText,
                          { color: dynamicColors.primary },
                        ]}
                      >
                        Use 4-digit PIN
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}
                  <TouchableOpacity
                    style={styles.forgotBtn}
                    onPress={handleForgotPassword}
                  >
                    <Text
                      style={[
                        styles.forgotText,
                        { color: dynamicColors.primaryDark },
                      ]}
                    >
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <PillButton
                title={isSignUp ? 'Create Admin Account' : 'Sign In'}
                onPress={handleAuth}
                loading={loading}
                variant="primary"
                fullWidth
                style={styles.submitBtn}
              />

              <TouchableOpacity
                style={styles.toggleModeBtn}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text
                  style={[
                    styles.toggleModeText,
                    { color: dynamicColors.primaryDark },
                  ]}
                >
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : 'First-time setup? Create Admin Account'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. Password Setup Modal for First-time Google Auth */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          router.replace('/' as any);
        }}
      >
        <View style={styles.setupOverlay}>
          <View
            style={[
              styles.setupCard,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: isDark ? '#3F3F46' : '#E5E7EB',
              },
            ]}
          >
            <View style={styles.setupHeader}>
              <View
                style={[
                  styles.setupIconWrap,
                  { backgroundColor: dynamicColors.primaryLight },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={32}
                  color={dynamicColors.primary}
                />
              </View>
              <Text
                style={[
                  styles.setupTitle,
                  { color: isDark ? '#FFFFFF' : '#111111' },
                ]}
              >
                Set Security Password
              </Text>
              <Text
                style={[
                  styles.setupSubtitle,
                  { color: isDark ? '#A1A1AA' : '#6B7280' },
                ]}
              >
                Google account connected! Set a 6+ character password to unlock
                Senthur Finance whenever you reopen the app.
              </Text>
            </View>

            {passwordModalError ? (
              <View style={styles.setupErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.setupErrorText}>{passwordModalError}</Text>
              </View>
            ) : null}

            <Input
              label="New Unlock Password *"
              placeholder="Minimum 6 characters"
              isPassword
              value={newAppPassword}
              onChangeText={(t) => {
                setNewAppPassword(t);
                setPasswordModalError('');
              }}
              leadingIcon="lock-closed-outline"
            />

            <Input
              label="Confirm Password *"
              placeholder="Re-enter password"
              isPassword
              value={confirmAppPassword}
              onChangeText={(t) => {
                setConfirmAppPassword(t);
                setPasswordModalError('');
              }}
              leadingIcon="shield-checkmark-outline"
            />

            <PillButton
              title="Save Password & Continue"
              variant="primary"
              fullWidth
              loading={passwordModalLoading}
              onPress={handleSaveAppPassword}
              style={{ marginTop: 12 }}
            />

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => {
                setShowPasswordModal(false);
                router.replace('/' as any);
              }}
            >
              <Text
                style={[
                  styles.skipBtnText,
                  { color: isDark ? '#A1A1AA' : '#6B7280' },
                ]}
              >
                Set Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  sheetTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sheetTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  sheetSubtitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    marginTop: 3,
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScrollContent: {
    paddingBottom: 20,
  },
  googleBtn: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleBtnText: {
    fontFamily: typography.fontHeadline,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.0,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    letterSpacing: 1.0,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinLinkText: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.8,
  },
  submitBtn: {
    marginTop: 8,
  },
  toggleModeBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  toggleModeText: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.9,
    fontSize: 13,
  },
  setupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  setupCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  setupHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  setupIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  setupTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.0,
    marginBottom: 6,
    textAlign: 'center',
  },
  setupSubtitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  setupErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  setupErrorText: {
    fontFamily: typography.fontHeadline,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  skipBtnText: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
});
