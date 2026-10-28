import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Animated,
  useWindowDimensions,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { TypewriterText } from '../components/TypewriterText';
import { Pagination } from '../components/Pagination';
import { PrimaryButton } from '../components/PrimaryButton';

export interface WelcomeScreenProps {
  onLogin?: () => void;
  onSignUp?: () => void;
  onPrivacyPolicy?: () => void;
  onTermsOfUse?: () => void;
  isDarkMode?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLogin,
  onSignUp,
  onPrivacyPolicy,
  onTermsOfUse,
  isDarkMode = false,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Carousel pagination active index (auto-advances every 3s)
  const [activeDot, setActiveDot] = useState<number>(0);

  // Entrance animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const sheetTranslateY = useRef(new Animated.Value(280)).current;

  useEffect(() => {
    // 1. Title fades in and slides up (translateY 20 -> 0, 600ms)
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
      // 2. Bottom sheet slides up with spring animation
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        tension: 45,
        friction: 8,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // 3. Auto-advance pagination dots every 3s
    const carouselTimer = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 5);
    }, 3000);

    return () => {
      clearInterval(carouselTimer);
    };
  }, [titleOpacity, titleTranslateY, sheetTranslateY]);

  const handlePrivacyPress = () => {
    if (onPrivacyPolicy) {
      onPrivacyPolicy();
    } else {
      console.log('Navigating to Privacy Policy');
    }
  };

  const handleTermsPress = () => {
    if (onTermsOfUse) {
      onTermsOfUse();
    } else {
      console.log('Navigating to Terms of Use');
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 1. Full-bleed background hero image with samy.jpg */}
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
          locations={[0, 0.35, 0.62]}
          style={StyleSheet.absoluteFill}
        />

        {/* Content Container */}
        <View style={[styles.mainContent, { paddingTop: insets.top + 30 }]}>
          {/* 2. Brand Block (centered in upper-middle of screen) */}
          <Animated.View
            style={[
              styles.brandBlock,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            {/* Logo mark with wordmark "senthur" */}
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoLetter}>S</Text>
              </View>
              <Text style={styles.wordmark}>senthur</Text>
            </View>

            {/* Title: SENTHUR FINANCE (over two lines) */}
            <Text style={styles.titleText}>SENTHUR{'\n'}FINANCE</Text>

            {/* Auto-typing Tamil Greeting */}
            <TypewriterText
              units={["வ", "ழ", "க", " ", "வ", "ள", "ம", "ட", "ன"]}
              typeSpeed={140}
              eraseSpeed={70}
              pauseDuration={1800}
              delayStart={400}
              containerStyle={styles.tamilContainer}
            />
          </Animated.View>

          {/* 3. Pagination Dots (5 dots, placed above bottom sheet) */}
          <View style={styles.paginationWrapper}>
            <Pagination total={5} activeIndex={activeDot} />
          </View>
        </View>

        {/* 4. Bottom Sheet (Rounded Card with Log In / Sign Up) */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 24),
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Log in Button */}
          <PrimaryButton
            title="Log in"
            variant="filled"
            onPress={onLogin || (() => {})}
            style={{ backgroundColor: loginBtnBg }}
            textStyle={{ color: loginBtnText }}
          />

          {/* Sign up Button */}
          <PrimaryButton
            title="Sign up"
            variant="outline"
            onPress={onSignUp || (() => {})}
            style={[
              styles.signUpButton,
              {
                backgroundColor: signUpBtnBg,
                borderColor: signUpBtnBorder,
              },
            ]}
            textStyle={{ color: signUpBtnText }}
          />

          {/* Legal text below buttons */}
          <View style={styles.legalSection}>
            <Text style={[styles.legalText, { color: legalTextColor }]}>
              By continuing, you agree to Senthur Finance's
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandBlock: {
    alignItems: 'center',
    marginTop: '15%',
    width: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoLetter: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  wordmark: {
    fontFamily: 'Polymath',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 1.0,
  },
  titleText: {
    fontFamily: theme.typography.fontTitle,
    fontSize: theme.typography.titleSize,
    lineHeight: theme.typography.titleLineHeight,
    letterSpacing: theme.typography.titleLetterSpacing,
    color: theme.colors.white,
    textAlign: 'center',
    fontWeight: '800',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tamilContainer: {
    marginTop: 12,
  },
  paginationWrapper: {
    marginBottom: 20,
  },
  bottomSheet: {
    width: '100%',
    borderTopLeftRadius: theme.spacing.sheetRadius,
    borderTopRightRadius: theme.spacing.sheetRadius,
    paddingHorizontal: theme.spacing.sheetPaddingHorizontal,
    paddingTop: theme.spacing.sheetPaddingTop,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  signUpButton: {
    marginTop: 12,
  },
  legalSection: {
    marginTop: 24,
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
