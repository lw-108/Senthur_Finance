import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useTheme } from '@/store/useThemeStore';

export interface LockMorphToastProps {
  visible: boolean;
  onComplete?: () => void;
}

export function LockMorphToast({ visible, onComplete }: LockMorphToastProps) {
  const { isDark, colors: dynamicColors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconBounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setIsOpen(false);
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      iconBounceAnim.setValue(0);
      return;
    }

    // 1. Entrance: Spring in and fade in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 130,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // 2. Lock to Unlock morph at 180ms
    const morphTimer = setTimeout(() => {
      setIsOpen(true);

      // Icon bounce & shackle lift animation
      Animated.sequence([
        Animated.timing(iconBounceAnim, {
          toValue: -7,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(iconBounceAnim, {
          toValue: 0,
          friction: 4,
          tension: 140,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }, 180);

    // 3. Smooth exit fade out at 720ms
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        if (onComplete) {
          onComplete();
        }
      });
    }, 720);

    return () => {
      clearTimeout(morphTimer);
      clearTimeout(exitTimer);
    };
  }, [visible, scaleAnim, opacityAnim, iconBounceAnim, onComplete]);

  if (!visible) return null;

  const effectiveBg = isDark ? 'rgba(28, 28, 30, 0.94)' : 'rgba(255, 255, 255, 0.96)';
  const effectiveBorder = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={styles.centerOverlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.toastCard,
          {
            backgroundColor: effectiveBg,
            borderColor: effectiveBorder,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Subtle halo glow when unlocked */}
        {isOpen && (
          <View
            style={[
              styles.haloGlow,
              { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.14)' },
            ]}
          />
        )}

        {/* Lock morphing into unlock */}
        <Animated.View
          style={{
            transform: [{ translateY: iconBounceAnim }],
          }}
        >
          <Ionicons
            name={isOpen ? 'lock-open' : 'lock-closed'}
            size={38}
            color={isOpen ? colors.success : dynamicColors.primary}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  toastCard: {
    width: 92,
    height: 92,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 25,
  },
  haloGlow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
  },
});
