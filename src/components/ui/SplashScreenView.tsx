import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Platform,
  Easing,
} from 'react-native';
import { typography } from '@/theme/typography';

interface SplashScreenViewProps {
  onFinish?: () => void;
  duration?: number; // fallback max duration in milliseconds (default: 2800ms)
  isReady?: boolean; // reactive signal when backend session and fonts are loaded
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SplashScreenView({
  onFinish,
  duration = 2800,
  isReady = false,
}: SplashScreenViewProps) {
  const isCompactScreen = SCREEN_HEIGHT < 700 || SCREEN_WIDTH < 380;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;
  const hasFinishedRef = useRef(false);

  // Loading percentage: 0 to 100
  const [percent, setPercent] = useState(0);

  const triggerExit = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setPercent(100);

    Animated.timing(exitFadeAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onFinish?.();
    });
  };

  useEffect(() => {
    // 1. Entrance fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // 2. Smooth progress counter while loading backend session
    const interval = 40;
    const timer = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 90) {
          return prev; // Hold at 90 until backend session signals isReady
        }
        return prev + 2;
      });
    }, interval);

    // 3. Fallback safety timer
    const safetyTimer = setTimeout(() => {
      triggerExit();
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(safetyTimer);
    };
  }, [duration, fadeAnim]);

  // When backend session signals isReady, finish immediately
  useEffect(() => {
    if (isReady && !hasFinishedRef.current) {
      triggerExit();
    }
  }, [isReady]);

  // Sizing for Vinayagar image: centered, crisp, contained
  const imageSize = Math.min(SCREEN_WIDTH * 0.62, 260);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: exitFadeAnim,
        },
      ]}
      pointerEvents="auto"
    >
      {/* Perfect center at both X and Y axis */}
      <Animated.View
        style={[
          styles.centerContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Image
          source={require('../../../assets/images/vinayagar.jpg')}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: 20,
          }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Very big, high-contrasted, compact loading number at the bottom left corner */}
      <View
        style={[
          styles.bottomLeftContainer,
          {
            bottom: isCompactScreen ? 24 : 34,
            left: isCompactScreen ? 22 : 32,
          },
        ]}
      >
        <View style={styles.numberRow}>
          <Text
            style={[
              styles.loadingNumberText,
              {
                fontSize: isCompactScreen ? 54 : 68,
                lineHeight: isCompactScreen ? 56 : 70,
              },
            ]}
          >
            {percent}
          </Text>
          <Text
            style={[
              styles.percentSymbol,
              {
                fontSize: isCompactScreen ? 20 : 25,
                lineHeight: isCompactScreen ? 26 : 32,
                marginBottom: isCompactScreen ? 5 : 7,
              },
            ]}
          >
            %
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
    // Anti-theme adapting screen: strictly white background
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLeftContainer: {
    position: 'absolute',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  loadingNumberText: {
    fontFamily: typography.fontPolymath,
    color: '#000000',
    letterSpacing: -1.0,
  },
  percentSymbol: {
    fontFamily: typography.fontPolymath,
    color: '#000000',
    letterSpacing: 0,
    marginLeft: 2,
  },
});
