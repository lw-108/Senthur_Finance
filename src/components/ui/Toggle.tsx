import React from 'react';
import { Switch, SwitchProps, StyleSheet, View } from 'react-native';
import { useTheme } from '@/store/useThemeStore';

export interface ToggleProps extends Omit<SwitchProps, 'thumbColor' | 'trackColor'> {
  value: boolean;
  onValueChange: (val: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  disabled?: boolean;
}

export function Toggle({
  value,
  onValueChange,
  activeColor,
  inactiveColor,
  disabled = false,
  style,
  ...rest
}: ToggleProps) {
  const { colors: dynamicColors } = useTheme();

  const effectiveActiveColor = activeColor || dynamicColors.primary;
  const effectiveInactiveColor = inactiveColor || dynamicColors.borderStrong;

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      thumbColor="#FFFFFF"
      trackColor={{
        false: effectiveInactiveColor,
        true: effectiveActiveColor,
      }}
      ios_backgroundColor={effectiveInactiveColor}
      style={style}
      {...rest}
    />
  );
}
