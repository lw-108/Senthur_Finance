import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Input,
  PillButton,
  GoogleIcon,
  useToast,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { usePermanentAvatar, DEFAULT_AVATAR_URL } from '@/lib/storage/profileStorage';

export default function LockScreen() {
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { colors: dynamicColors, isDark } = useTheme();
  const { showSuccess, showError, showLockMorph } = useToast();
  const { business } = useBusinessSettingsStore();
  const {
    storedUser,
    unlockWithPassword,
    unlockWithPin,
    unlockWithBiometrics,
    hasPinSet,
    isBiometricAvailable,
    signOut,
  } = useAuthStore();

  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePinMode, setUsePinMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [measuredCardHeight, setMeasuredCardHeight] = useState<number>(0);

  // Monitor keyboard visibility so screen stays locked with zero scroll when closed
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Password Unlock Handler
  const handlePasswordUnlock = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const success = await unlockWithPassword(password);
      if (success) {
        showLockMorph(() => router.replace('/' as any));
      } else {
        setError('Incorrect password. Please verify and try again.');
        showError('Incorrect password');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to unlock application');
      showError(err?.message || 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  // PIN Unlock Handler
  const handleDigit = async (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        setLoading(true);
        try {
          const success = await unlockWithPin(nextPin);
          if (success) {
            showLockMorph(() => router.replace('/' as any));
          } else {
            showError('Incorrect PIN');
            setPin('');
          }
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // Biometric Unlock Handler
  const handleBiometric = async () => {
    try {
      const success = await unlockWithBiometrics();
      if (success) {
        showLockMorph(() => router.replace('/' as any));
      } else {
        showError('Biometric verification failed');
      }
    } catch {
      showError('Biometric verification error');
    }
  };

  const permanentAvatar = usePermanentAvatar();

  const handleSwitchAccount = async () => {
    await signOut();
    router.replace('/auth/login' as any);
  };

  const displayName = storedUser?.displayName || business?.ownerName || business?.businessName || 'Admin User';
  const email = storedUser?.email || business?.email || '';
  const isGoogle = storedUser?.authProvider === 'google';

  // Actual user profile picture (business avatar, stored user photo, permanent avatar, or fallback default)
  const profilePhotoUri = business?.avatarUrl || storedUser?.photoURL || permanentAvatar || DEFAULT_AVATAR_URL;

  // Responsive device classification for small/compact phones
  const isExtraSmall = screenHeight < 620 || screenWidth < 350; // iPhone SE 1st gen (320x568), small Androids
  const isSmall = (screenHeight < 740 || screenWidth < 390) && !isExtraSmall; // iPhone SE 2/3 (375x667), 12/13 Mini, compact Androids
  const isCompact = isExtraSmall || isSmall;

  // Responsive card dimensions (scales down so everything fits within screen with ZERO scroll)
  const cardOverlap = isExtraSmall ? 20 : isSmall ? 26 : 36;
  const cardRadius = isExtraSmall ? 24 : isSmall ? 28 : 36;
  const cardPaddingHorizontal = isExtraSmall ? 14 : isSmall ? 18 : 24;
  const cardPaddingTop = isExtraSmall ? 12 : isSmall ? 16 : 26;
  const cardPaddingBottom = isExtraSmall ? 14 : isSmall ? 18 : 32;

  // Estimated card height for zero-flicker initial render
  const estimatedCardHeight = usePinMode
    ? (isExtraSmall ? 350 : isSmall ? 420 : 490)
    : (isExtraSmall ? 290 : isSmall ? 360 : 430);

  const effectiveCardHeight = measuredCardHeight > 0 ? measuredCardHeight : estimatedCardHeight;
  const topHeroHeight = Math.max(screenHeight - effectiveCardHeight + cardOverlap, isExtraSmall ? 120 : 160);

  // Responsive PIN Numpad dimensions
  const keySize = isExtraSmall ? 40 : isSmall ? 48 : 62;
  const keyGap = isExtraSmall ? 6 : isSmall ? 8 : 14;
  const numpadWidth = keySize * 3 + keyGap * 2;

  // Responsive brand overlay position
  const brandTop = Platform.OS === 'ios'
    ? (isExtraSmall ? 28 : isSmall ? 36 : 48)
    : (isExtraSmall ? 16 : isSmall ? 22 : 32);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F7' }]}>
      <StatusBar style="light" />

      {/* 1. Fully Top Profile Image Showcasing (Dynamically fills remaining space above card) */}
      <View
        style={[styles.topProfileContainer, { height: topHeroHeight }]}
        pointerEvents="none"
      >
        <Image
          source={{ uri: profilePhotoUri }}
          style={styles.heroProfileImage}
          resizeMode="cover"
        />

        {/* Subtle dark gradient overlay to ensure contrast and depth */}
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.15)',
            'rgba(0, 0, 0, 0.42)',
            'rgba(0, 0, 0, 0.88)',
          ]}
          locations={[0, 0.5, 0.96]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Top brand indicator */}
      <View
        style={[
          styles.topBrandOverlay,
          {
            top: brandTop,
            left: isCompact ? 14 : 20,
          },
        ]}
      >
        <View
          style={[
            styles.brandPill,
            {
              paddingHorizontal: isCompact ? 9 : 12,
              paddingVertical: isCompact ? 3.5 : 5,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={isCompact ? 12 : 14} color="#F59E0B" />
          <Text
            style={[
              styles.brandPillText,
              { fontSize: isCompact ? 10.5 : 12 },
            ]}
          >
            Senthur Finance
          </Text>
        </View>
      </View>

      {/* 2. App Locked Card: Anchored firmly at the bottom, shrinks in responsiveness based on display size */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <View style={styles.cardAnchorContainer}>
          <ScrollView
            scrollEnabled={keyboardVisible}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View
              onLayout={(e) => {
                const h = Math.round(e.nativeEvent.layout.height);
                if (h > 0 && Math.abs(h - measuredCardHeight) > 2) {
                  setMeasuredCardHeight(h);
                }
              }}
              style={[
                styles.appLockedCard,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
                  borderTopLeftRadius: cardRadius,
                  borderTopRightRadius: cardRadius,
                  paddingHorizontal: cardPaddingHorizontal,
                  paddingTop: cardPaddingTop,
                  paddingBottom: cardPaddingBottom,
                  maxWidth: 480,
                  width: '100%',
                  alignSelf: 'center',
                },
              ]}
            >
              {/* Left-Aligned Account Identity Header */}
              <View style={styles.leftAlignedHeader}>
                <View
                  style={[
                    styles.accountBadgePill,
                    {
                      backgroundColor: isGoogle
                        ? 'rgba(66, 133, 244, 0.12)'
                        : dynamicColors.primaryLight,
                      paddingHorizontal: isExtraSmall ? 7 : isSmall ? 8 : 10,
                      paddingVertical: isExtraSmall ? 2.5 : isSmall ? 3.5 : 5,
                      marginBottom: isExtraSmall ? 3 : isSmall ? 5 : 8,
                    },
                  ]}
                >
                  {isGoogle ? (
                    <GoogleIcon size={isExtraSmall ? 11 : isSmall ? 12 : 14} />
                  ) : (
                    <Ionicons
                      name="lock-closed"
                      size={isExtraSmall ? 11 : isSmall ? 12 : 13}
                      color={dynamicColors.primary}
                    />
                  )}
                  <Text
                    style={[
                      styles.accountBadgeText,
                      {
                        color: isGoogle ? '#1A73E8' : dynamicColors.primary,
                        fontSize: isExtraSmall ? 9 : isSmall ? 10 : 11,
                      },
                    ]}
                  >
                    {isGoogle ? 'GOOGLE ACCOUNT CONNECTED' : 'SECURED ADMIN SESSION'}
                  </Text>
                </View>

                {/* Bigger User Name (Left-Aligned) */}
                <Text
                  style={[
                    styles.userNameBigger,
                    {
                      color: dynamicColors.ink,
                      fontSize: isExtraSmall ? 18 : isSmall ? 21 : 25,
                      lineHeight: isExtraSmall ? 21 : isSmall ? 24 : 28,
                      marginBottom: isExtraSmall ? 1 : 2,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>

                {/* Bigger User Email (Left-Aligned) */}
                <Text
                  style={[
                    styles.userEmailBigger,
                    {
                      color: dynamicColors.textSecondary,
                      fontSize: isExtraSmall ? 11 : isSmall ? 12 : 13.5,
                      marginBottom: isExtraSmall ? 6 : isSmall ? 8 : 12,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {email}
                </Text>
              </View>

              {/* Subtle Divider */}
              <View
                style={[
                  styles.cardDivider,
                  {
                    backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB',
                    marginBottom: isExtraSmall ? 6 : isSmall ? 8 : 14,
                  },
                ]}
              />

              {/* App Locked Title Section (Left-Aligned & Bigger) */}
              <View
                style={[
                  styles.lockTitleSection,
                  {
                    marginBottom: isExtraSmall ? 6 : isSmall ? 8 : 14,
                  },
                ]}
              >
                <View style={styles.lockTitleRow}>
                  <Ionicons
                    name="lock-closed"
                    size={isExtraSmall ? 16 : isSmall ? 18 : 22}
                    color={dynamicColors.primary}
                  />
                  <Text
                    style={[
                      styles.lockTitleText,
                      {
                        color: dynamicColors.ink,
                        fontSize: isExtraSmall ? 16 : isSmall ? 19 : 22,
                      },
                    ]}
                  >
                    App Locked
                  </Text>
                </View>
                <Text
                  style={[
                    styles.lockSubtitleText,
                    {
                      color: dynamicColors.textSecondary,
                      fontSize: isExtraSmall ? 10.5 : isSmall ? 11.5 : 13,
                      lineHeight: isExtraSmall ? 14 : isSmall ? 15 : 18,
                    },
                  ]}
                >
                  {usePinMode
                    ? 'Enter your 4-digit PIN to access portal'
                    : 'Enter your security password to unlock Senthur Finance'}
                </Text>
              </View>

              {/* Form Mode: Password (Default) or PIN Mode */}
              {!usePinMode ? (
                <View style={styles.formContainer}>
                  <Input
                    label="Security Password *"
                    placeholder="Enter your unlock password"
                    isPassword
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      if (error) setError('');
                    }}
                    error={error}
                    leadingIcon="lock-closed-outline"
                    returnKeyType="done"
                    onSubmitEditing={handlePasswordUnlock}
                    autoFocus={Platform.OS !== 'web'}
                    containerStyle={{
                      marginBottom: isExtraSmall ? 4 : isSmall ? 8 : 12,
                    }}
                    inputContainerStyle={{
                      height: isExtraSmall ? 38 : isSmall ? 44 : 50,
                    }}
                  />

                  <PillButton
                    title="Unlock Application"
                    variant="primary"
                    fullWidth
                    loading={loading}
                    onPress={handlePasswordUnlock}
                    style={[
                      styles.unlockBtn,
                      {
                        height: isExtraSmall ? 38 : isSmall ? 44 : 50,
                        borderRadius: isExtraSmall ? 19 : isSmall ? 22 : 25,
                        marginTop: isExtraSmall ? 4 : isSmall ? 6 : 10,
                      },
                    ]}
                  />

                  {isBiometricAvailable && (
                    <TouchableOpacity
                      style={[
                        styles.biometricBtn,
                        {
                          height: isExtraSmall ? 36 : isSmall ? 42 : 48,
                          borderRadius: isExtraSmall ? 18 : isSmall ? 21 : 24,
                          marginTop: isExtraSmall ? 5 : isSmall ? 7 : 10,
                          borderColor: dynamicColors.borderStrong,
                          backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                        },
                      ]}
                      onPress={handleBiometric}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="finger-print"
                        size={isExtraSmall ? 18 : isSmall ? 20 : 22}
                        color={dynamicColors.primary}
                      />
                      <Text
                        style={[
                          styles.biometricBtnText,
                          {
                            color: dynamicColors.ink,
                            fontSize: isExtraSmall ? 12 : isSmall ? 13 : 14,
                          },
                        ]}
                      >
                        Unlock with Biometrics
                      </Text>
                    </TouchableOpacity>
                  )}

                  {hasPinSet && (
                    <TouchableOpacity
                      style={[
                        styles.modeToggleBtn,
                        {
                          paddingVertical: isExtraSmall ? 3 : isSmall ? 5 : 8,
                          marginTop: isExtraSmall ? 2 : isSmall ? 4 : 6,
                        },
                      ]}
                      onPress={() => setUsePinMode(true)}
                    >
                      <Text
                        style={[
                          styles.modeToggleText,
                          {
                            color: dynamicColors.primaryDark,
                            fontSize: isExtraSmall ? 11 : isSmall ? 12 : 13,
                          },
                        ]}
                      >
                        Use 4-digit PIN instead
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* PIN Mode Fallback */
                <View style={styles.pinContainer}>
                  <View
                    style={[
                      styles.dotsRow,
                      {
                        gap: isExtraSmall ? 8 : isSmall ? 10 : 14,
                        marginVertical: isExtraSmall ? 4 : isSmall ? 8 : 14,
                      },
                    ]}
                  >
                    {[0, 1, 2, 3].map((idx) => {
                      const dotSize = isExtraSmall ? 9 : isSmall ? 11 : 14;
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.dot,
                            {
                              width: dotSize,
                              height: dotSize,
                              borderRadius: dotSize / 2,
                              borderColor: dynamicColors.borderStrong,
                            },
                            idx < pin.length && {
                              backgroundColor: dynamicColors.primary,
                              borderColor: dynamicColors.primary,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  <View style={[styles.numpad, { width: numpadWidth, gap: keyGap }]}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <TouchableOpacity
                        key={digit}
                        style={[
                          styles.keyBtn,
                          {
                            width: keySize,
                            height: keySize,
                            borderRadius: keySize / 2,
                            backgroundColor: isDark ? '#27272A' : dynamicColors.surface,
                            borderColor: dynamicColors.border,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => handleDigit(digit)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.keyText,
                            {
                              color: dynamicColors.ink,
                              fontSize: isExtraSmall ? 18 : isSmall ? 21 : 25,
                            },
                          ]}
                        >
                          {digit}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {isBiometricAvailable ? (
                      <TouchableOpacity
                        style={[
                          styles.keyBtn,
                          {
                            width: keySize,
                            height: keySize,
                            borderRadius: keySize / 2,
                            backgroundColor: isDark ? '#27272A' : dynamicColors.surface,
                            borderColor: dynamicColors.border,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={handleBiometric}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="finger-print"
                          size={isExtraSmall ? 18 : isSmall ? 22 : 26}
                          color={dynamicColors.primary}
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: keySize, height: keySize }} />
                    )}

                    <TouchableOpacity
                      style={[
                        styles.keyBtn,
                        {
                          width: keySize,
                          height: keySize,
                          borderRadius: keySize / 2,
                          backgroundColor: isDark ? '#27272A' : dynamicColors.surface,
                          borderColor: dynamicColors.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => handleDigit('0')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.keyText,
                          {
                            color: dynamicColors.ink,
                            fontSize: isExtraSmall ? 18 : isSmall ? 21 : 25,
                          },
                        ]}
                      >
                        0
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.keyBtn,
                        {
                          width: keySize,
                          height: keySize,
                          borderRadius: keySize / 2,
                          backgroundColor: isDark ? '#27272A' : dynamicColors.surface,
                          borderColor: dynamicColors.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={handleDeleteDigit}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="backspace-outline"
                        size={isExtraSmall ? 17 : isSmall ? 21 : 25}
                        color={dynamicColors.ink}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.modeToggleBtn,
                      {
                        paddingVertical: isExtraSmall ? 3 : isSmall ? 5 : 8,
                        marginTop: isExtraSmall ? 2 : isSmall ? 4 : 6,
                      },
                    ]}
                    onPress={() => setUsePinMode(false)}
                  >
                    <Text
                      style={[
                        styles.modeToggleText,
                        {
                          color: dynamicColors.primaryDark,
                          fontSize: isExtraSmall ? 11 : isSmall ? 12 : 13,
                        },
                      ]}
                    >
                      Use Password instead
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Left-Aligned Switch Account Link */}
              <TouchableOpacity
                onPress={handleSwitchAccount}
                style={[
                  styles.switchAccount,
                  {
                    paddingVertical: isExtraSmall ? 3 : isSmall ? 5 : 8,
                    marginTop: isExtraSmall ? 2 : isSmall ? 4 : 6,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="log-out-outline"
                  size={isExtraSmall ? 14 : isSmall ? 15 : 18}
                  color={dynamicColors.primaryDark}
                />
                <Text
                  style={[
                    styles.switchText,
                    {
                      color: dynamicColors.primaryDark,
                      fontSize: isExtraSmall ? 11 : isSmall ? 12 : 13,
                    },
                  ]}
                >
                  Sign in with a different account
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  keyboardWrap: {
    flex: 1,
    zIndex: 10,
  },
  cardAnchorContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  // 1. Top Profile Image Showcasing
  topProfileContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#000000',
    zIndex: 1,
  },
  heroProfileImage: {
    width: '100%',
    height: '100%',
  },
  topBrandOverlay: {
    position: 'absolute',
    zIndex: 15,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  brandPillText: {
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    letterSpacing: 1.0,
  },
  // 2. App Locked Card: Anchored at bottom, z-index top of profile image with upward shadow
  appLockedCard: {
    zIndex: 20,
    elevation: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    // Upward shadow overlay on top of profile image
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
  },
  leftAlignedHeader: {
    alignItems: 'flex-start',
    width: '100%',
  },
  accountBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
  },
  accountBadgeText: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 1.0,
  },
  userNameBigger: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.9,
    textAlign: 'left',
  },
  userEmailBigger: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.8,
    textAlign: 'left',
  },
  cardDivider: {
    width: '100%',
    height: 1,
  },
  lockTitleSection: {
    alignItems: 'flex-start',
    width: '100%',
  },
  lockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockTitleText: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 1.0,
  },
  lockSubtitleText: {
    fontFamily: typography.fontHeadline,
    textAlign: 'left',
    letterSpacing: 0.8,
  },
  formContainer: {
    width: '100%',
  },
  unlockBtn: {},
  biometricBtn: {
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  biometricBtnText: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 1.0,
  },
  modeToggleBtn: {
    alignItems: 'flex-start',
  },
  modeToggleText: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 1.0,
  },
  pinContainer: {
    alignItems: 'center',
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignSelf: 'center',
  },
  keyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 1.0,
  },
  switchAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  switchText: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 1.0,
  },
});
