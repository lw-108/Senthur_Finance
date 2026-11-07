import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { usePermanentAvatar } from '@/lib/storage/profileStorage';
import { Avatar } from './Avatar';

interface HeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  showSupportPill?: boolean;
  onSupportPress?: () => void;
  supportLabel?: string;
  showCalculatorButton?: boolean;
  onCalculatorPress?: () => void;
  avatarUrl?: string | null;
  avatarName?: string;
  onAvatarPress?: () => void;
  onMenuPress?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export function Header({
  showBack = false,
  onBack,
  title,
  showSupportPill = false,
  onSupportPress,
  supportLabel = 'Live Chat',
  showCalculatorButton = false,
  onCalculatorPress,
  avatarUrl,
  avatarName,
  onAvatarPress,
  onMenuPress,
  rightAction,
  style,
}: HeaderProps) {
  const router = useRouter();
  const { colors: dynamicColors } = useTheme();
  const { business } = useBusinessSettingsStore();
  const permanentAvatar = usePermanentAvatar();

  const effectiveAvatarUrl = avatarUrl || business.avatarUrl || permanentAvatar;
  const effectiveAvatarName = avatarName !== undefined ? avatarName : (business.businessName || 'Admin');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as any);
    }
  };

  const handleSupport = () => {
    if (onSupportPress) {
      onSupportPress();
    } else {
      router.push('/settings' as any);
    }
  };

  const handleAvatar = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      router.push('/settings' as any);
    }
  };

  const handleCalculator = () => {
    if (onCalculatorPress) {
      onCalculatorPress();
    } else {
      router.push('/calculator' as any);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Left Item */}
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={[
              styles.backButton,
              {
                backgroundColor: dynamicColors.surface,
                borderColor: dynamicColors.border,
                borderWidth: 1,
              },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={dynamicColors.ink} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.hamburgerButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            {/* Signature 2-line hamburger: one ink, one accent */}
            <View style={[styles.hamburgerTopLine, { backgroundColor: dynamicColors.ink }]} />
            <View style={[styles.hamburgerBottomLine, { backgroundColor: dynamicColors.primary }]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Center Title if provided */}
      {title ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.titleText, { color: dynamicColors.ink }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : (
        <View style={styles.centerSpacer} />
      )}

      {/* Right Items */}
      <View style={styles.rightContainer}>
        {rightAction ? (
          rightAction
        ) : (
          <>
            {showSupportPill && (
              <TouchableOpacity
                onPress={handleSupport}
                style={[styles.supportPill, { backgroundColor: dynamicColors.primarySoft, borderColor: dynamicColors.primaryBorder }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Contact support"
              >
                <View style={styles.greenPulse} />
                <Text style={[styles.supportPillText, { color: dynamicColors.primaryDark }]}>{supportLabel}</Text>
              </TouchableOpacity>
            )}

            {showCalculatorButton && (
              <TouchableOpacity
                onPress={handleCalculator}
                style={[
                  styles.calcButton,
                  {
                    backgroundColor: dynamicColors.surface,
                    borderColor: dynamicColors.border,
                  },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Open Financial Calculator"
              >
                <Ionicons name="calculator-outline" size={20} color={dynamicColors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleAvatar}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Admin profile"
            >
              <Avatar
                uri={effectiveAvatarUrl}
                name={effectiveAvatarName}
                size={38}
                borderColor={dynamicColors.primary}
                backgroundColor={dynamicColors.primaryLight}
                textColor={dynamicColors.primaryDark}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leftContainer: {
    minWidth: 44,
    justifyContent: 'center',
  },
  hamburgerButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    gap: 5,
  },
  hamburgerTopLine: {
    width: 20,
    height: 2.5,
    backgroundColor: colors.ink,
    borderRadius: 2,
  },
  hamburgerBottomLine: {
    width: 13,
    height: 2.5,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  centerSpacer: {
    flex: 1,
  },
  titleText: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calcButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  supportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  supportPillText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    color: colors.ink,
    letterSpacing: 0.8,
  },
});
