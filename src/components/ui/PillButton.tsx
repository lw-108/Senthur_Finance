import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface PillButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export function PillButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconName,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}: PillButtonProps) {
  const { colors: dynamicColors } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; spinnerColor: string; iconColor: string } => {
    switch (variant) {
      case 'dark':
        return {
          container: { backgroundColor: dynamicColors.darkCard },
          text: { color: dynamicColors.onDark },
          spinnerColor: dynamicColors.onDark,
          iconColor: dynamicColors.onDark,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: dynamicColors.primarySoft,
            borderWidth: 1,
            borderColor: dynamicColors.primaryBorder,
          },
          text: { color: dynamicColors.headingPrimary },
          spinnerColor: dynamicColors.headingPrimary,
          iconColor: dynamicColors.headingPrimary,
        };
      case 'outline':
        return {
          container: { backgroundColor: dynamicColors.surface, borderWidth: 1.5, borderColor: dynamicColors.primary },
          text: { color: dynamicColors.headingPrimary },
          spinnerColor: dynamicColors.headingPrimary,
          iconColor: dynamicColors.headingPrimary,
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: dynamicColors.ink },
          spinnerColor: dynamicColors.ink,
          iconColor: dynamicColors.ink,
        };
      case 'danger':
        return {
          container: { backgroundColor: dynamicColors.danger },
          text: { color: '#FFFFFF' },
          spinnerColor: '#FFFFFF',
          iconColor: '#FFFFFF',
        };
      case 'primary':
      default:
        return {
          container: { backgroundColor: dynamicColors.primary },
          text: { color: '#FFFFFF' },
          spinnerColor: '#FFFFFF',
          iconColor: '#FFFFFF',
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingVertical: 0, paddingHorizontal: 14, height: 40, minHeight: 40, maxHeight: 40 },
          text: { fontSize: 13, fontWeight: '600' },
          iconSize: 15,
        };
      case 'lg':
        return {
          container: { paddingVertical: 0, paddingHorizontal: 26, height: 52, minHeight: 52, maxHeight: 52 },
          text: { fontSize: 16, fontWeight: '600' },
          iconSize: 20,
        };
      case 'md':
      default:
        return {
          container: { paddingVertical: 0, paddingHorizontal: 20, height: 48, minHeight: 48, maxHeight: 48 },
          text: { fontSize: 14, fontWeight: '600' },
          iconSize: 18,
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.baseButton,
        vStyles.container,
        sStyles.container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vStyles.spinnerColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {iconName && iconPosition === 'left' && (
            <Ionicons
              name={iconName}
              size={sStyles.iconSize}
              color={vStyles.iconColor}
              style={styles.leftIcon}
            />
          )}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.baseText, vStyles.text, sStyles.text, textStyle]}
          >
            {title}
          </Text>
          {iconName && iconPosition === 'right' && (
            <Ionicons
              name={iconName}
              size={sStyles.iconSize}
              color={vStyles.iconColor}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  baseText: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.6,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});
