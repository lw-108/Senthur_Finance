import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/store/useThemeStore';

interface FABProps {
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  size?: number;
  backgroundColor?: string;
  iconColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function FAB({
  onPress,
  iconName = 'add',
  size = 56,
  backgroundColor,
  iconColor = '#FFFFFF',
  style,
  accessibilityLabel = 'Add',
}: FABProps) {
  const { colors: dynamicColors } = useTheme();
  const effectiveBg = backgroundColor || dynamicColors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.fab,
        shadows.floating,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: effectiveBg,
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={size * 0.52} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 99,
  },
});
