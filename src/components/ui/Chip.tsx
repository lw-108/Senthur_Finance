import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: 'filter' | 'tag' | 'status';
  color?: string;
  count?: number;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export function Chip({
  label,
  selected = false,
  onPress,
  variant = 'filter',
  color,
  count,
  style,
  labelStyle,
}: ChipProps) {
  const { colors: dynamicColors } = useTheme();

  const getColors = () => {
    if (color) {
      return {
        bg: selected ? color : `${color}18`,
        text: selected ? '#FFFFFF' : color,
        border: selected ? color : `${color}40`,
      };
    }

    if (selected) {
      return {
        bg: dynamicColors.primary,
        text: '#FFFFFF',
        border: dynamicColors.primary,
      };
    }

    return {
      bg: dynamicColors.surface,
      text: dynamicColors.inkLight,
      border: dynamicColors.border,
    };
  };

  const scheme = getColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: scheme.text }, labelStyle]}>
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    letterSpacing: 0.8,
  },
});
