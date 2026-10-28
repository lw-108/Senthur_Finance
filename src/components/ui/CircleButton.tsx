import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useTheme } from '@/store/useThemeStore';

interface CircleButtonProps {
  onPress?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  size?: number;
  backgroundColor?: string;
  iconColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function CircleButton({
  onPress,
  iconName = 'arrow-forward-outline',
  size = 36,
  backgroundColor,
  iconColor = '#FFFFFF',
  style,
  accessibilityLabel = 'Action',
  disabled = false,
}: CircleButtonProps) {
  const { colors: dynamicColors } = useTheme();
  const effectiveBg = backgroundColor || dynamicColors.primary;
  const iconSize = Math.floor(size * 0.52);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled ? dynamicColors.border : effectiveBg,
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
