import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Animated,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';

export interface WelcomeScreenProps {
  onLogin?: () => void;
  onSignUp?: () => void;
  onPrivacyPolicy?: () => void;
  onTermsOfUse?: () => void;
  isDarkMode?: boolean;
  brandName?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLogin,
  onSignUp,
  onPrivacyPolicy,
  onTermsOfUse,
  isDarkMode = false,
  brandName,
}) => {
  const displayBrand = (brandName && brandName.trim().length > 0 ? brandName.trim() : 'FINANCE LEDGER').toUpperCase();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Low-height mobile display breakpoints (e.g. iPhone SE, compact Android devices)
  const isTinyHeight = screenHeight > 0 && screenHeight < 680;
  const isShortHeight = screenHeight > 0 && screenHeight < 760;

  // Entrance animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const sheetTranslateY = useRef(new Animated.Value(280)).current;

  useEffect(() => {
    // 1. Title fades in and slides up
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      // 2. Bottom sheet slides up with clamped spring animation
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 9,
        overshootClamping: true,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [titleOpacity, titleTranslateY, sheetTranslateY]);

  const handlePrivacyPress = () => {
    if (onPrivacyPolicy) {
      onPrivacyPolicy();
    }
  };

  const handleTermsPress = () => {
    if (onTermsOfUse) {
      onTermsOfUse();
    }
  };

  // Dynamic colors for dark/light mode adaptability
  const sheetBg = isDarkMode ? theme.colors.darkCardBackground : theme.colors.white;
  const loginBtnBg = isDarkMode ? theme.colors.white : theme.colors.primary;
  const loginBtnText = isDarkMode ? theme.colors.primary : theme.colors.white;
  const signUpBtnBg = isDarkMode ? theme.colors.darkCardBackground : theme.colors.white;
  const signUpBtnBorder = isDarkMode ? theme.colors.darkBorder : theme.colors.border;
  const signUpBtnText = isDarkMode ? theme.colors.white : theme.colors.primary;
  const legalTextColor = isDarkMode ? theme.colors.textLightGray : theme.colors.textGray;
  const legalLinkColor = isDarkMode ? theme.colors.white : theme.colors.primary;

  // Responsive sizing for low height displays
  const responsiveTitleSize = isTinyHeight ? 28 : isShortHeight ? 32 : theme.typography.titleSize;
  const responsiveTitleLineHeight = isTinyHeight ? 32 : isShortHeight ? 36 : theme.typography.titleLineHeight;
  const responsiveTitleMarginBottom = isTinyHeight ? 20 : isShortHeight ? 26 : 34;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 1. Full-bleed background hero image */}
      <ImageBackground
        source={require('../assets/images/samy.jpg')}
        style={[styles.backgroundImage, { height: screenHeight }]}
        resizeMode="cover"
      >
        {/* Vertical Linear Gradient overlay */}
        <LinearGradient
          colors={[
            theme.colors.overlayTop,
            theme.colors.overlayMid,
            theme.colors.overlayBottom,
          ]}
          locations={[0, 0.40, 0.72]}
          style={StyleSheet.absoluteFill}
        />

        {/* Content Container: Anchors 'SENTHUR FINANCE' at the bottom of the upper half section */}
        <View
          style={[
            styles.mainContent,
            {
              paddingBottom: responsiveTitleMarginBottom,
            },
          ]}
        >
          {/* Brand Block: Clean title positioned at the bottom of the hero section */}
          <Animated.View
            style={[
              styles.brandBlock,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            {/* Title: Organization / Brand Name */}
            <Text
              style={[
                styles.titleText,
                {
                  fontSize: responsiveTitleSize,
                  lineHeight: responsiveTitleLineHeight,
                },
              ]}
            >
              {displayBrand}
            </Text>
          </Animated.View>
        </View>

        {/* 2. Bottom Sheet (Rounded Card with Log In / Sign Up) */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, isTinyHeight ? 12 : 20),
              paddingTop: isTinyHeight ? 18 : isShortHeight ? 22 : 28,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Action Buttons: Log In & Sign Up */}
          <View style={styles.actionBlock}>
            <PrimaryButton
              title="Log In"
              variant="filled"
              onPress={onLogin || (() => {})}
              style={[styles.actionBtn, { backgroundColor: loginBtnBg }]}
              textStyle={{ color: loginBtnText }}
            />
            <PrimaryButton
              title="Sign Up"
              variant="outline"
              onPress={onSignUp || (() => {})}
              style={[
                styles.actionBtn,
                styles.signUpButton,
                {
                  backgroundColor: signUpBtnBg,
                  borderColor: signUpBtnBorder,
                },
              ]}
              textStyle={{ color: signUpBtnText }}
            />
          </View>

          {/* Legal text below buttons */}
          <View style={[styles.legalSection, isTinyHeight && { marginTop: 12 }]}>
            <Text style={[styles.legalText, { color: legalTextColor }]}>
              By continuing, you agree to {brandName && brandName.trim().length > 0 ? `${brandName.trim()}'s` : 'the ledger'}
            </Text>
            <View style={styles.legalLinksRow}>
              <TouchableOpacity onPress={handlePrivacyPress} activeOpacity={0.7}>
                <Text
                  style={[
                    styles.legalLink,
                    { color: legalLinkColor, textDecorationColor: legalLinkColor },
                  ]}
                >
                  Privacy Policy
                </Text>
              </TouchableOpacity>
              <Text style={[styles.legalText, { color: legalTextColor }]}> and </Text>
              <TouchableOpacity onPress={handleTermsPress} activeOpacity={0.7}>
                <Text
                  style={[
                    styles.legalLink,
                    { color: legalLinkColor, textDecorationColor: legalLinkColor },
                  ]}
                >
                  Terms of Use
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    width: '100%',
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandBlock: {
    alignItems: 'center',
    width: '100%',
  },
  titleText: {
    fontFamily: theme.typography.fontTitle,
    letterSpacing: theme.typography.titleLetterSpacing,
    color: theme.colors.white,
    textAlign: 'center',
    fontWeight: '800',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bottomSheet: {
    width: '100%',
    borderTopLeftRadius: theme.spacing.sheetRadius,
    borderTopRightRadius: theme.spacing.sheetRadius,
    paddingHorizontal: theme.spacing.sheetPaddingHorizontal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  actionBlock: {
    width: '100%',
  },
  actionBtn: {
    width: '100%',
  },
  signUpButton: {
    marginTop: 10,
  },
  legalSection: {
    marginTop: 18,
    alignItems: 'center',
  },
  legalText: {
    fontSize: theme.typography.legalTextSize,
    textAlign: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  legalLink: {
    fontSize: theme.typography.legalTextSize,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen;
