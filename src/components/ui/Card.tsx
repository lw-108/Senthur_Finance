import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';

interface CardProps {
  children: React.ReactNode;
  variant?: 'surface' | 'muted' | 'dark' | 'lavender' | 'tinted';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
  noPadding?: boolean;
}

export function Card({
  children,
  variant = 'surface',
  style,
  onPress,
  activeOpacity = 0.9,
  noPadding = false,
}: CardProps) {
  const { colors: dynamicColors } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'muted':
        return dynamicColors.surfaceMuted;
      case 'dark':
        return dynamicColors.darkCard;
      case 'lavender':
      case 'tinted':
        return dynamicColors.boxBackground;
      case 'surface':
      default:
        return dynamicColors.surface;
    }
  };

  const isTinted = variant === 'lavender' || variant === 'tinted';

  const cardStyle = [
    styles.card,
    { backgroundColor: getBackgroundColor() },
    isTinted && {
      backgroundColor: dynamicColors.boxBackground,
      borderColor: dynamicColors.boxBorder,
      borderWidth: 1,
    },
    variant === 'surface' && {
      ...shadows.card,
      borderColor: dynamicColors.border,
      borderWidth: 1,
    },
    variant === 'dark' && shadows.hero,
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={cardStyle}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    padding: 20,
    overflow: 'hidden',
  },
  noPadding: {
    padding: 0,
  },
});
