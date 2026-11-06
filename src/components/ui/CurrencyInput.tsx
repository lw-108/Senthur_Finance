import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ViewStyle,
  Platform,
} from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';
import { useKeyboardAware } from './Screen';

interface CurrencyInputProps {
  label?: string;
  value: number | string;
  onChangeValue: (amount: number) => void;
  currencySymbol?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  quickAmounts?: number[];
  containerStyle?: ViewStyle;
}

export const CurrencyInput = forwardRef<TextInput, CurrencyInputProps>(function CurrencyInput(
  {
    label,
    value,
    onChangeValue,
    currencySymbol = '₹',
    required,
    error,
    hint,
    quickAmounts,
    containerStyle,
  },
  forwardedRef
) {
  const { colors: dynamicColors, isDark } = useTheme();
  const keyboardAware = useKeyboardAware();
  const containerRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(forwardedRef, () => inputRef.current as TextInput);

  const [isFocused, setIsFocused] = useState(false);

  const isRequired = required || (label ? label.includes('*') : false);
  const cleanLabel = label ? label.replace(/\s*\*+$/, '') : '';

  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const stringValue = numericValue === 0 ? '' : numericValue.toString();

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    onChangeValue(num);
  };

  const addPreset = (preset: number) => {
    onChangeValue(numericValue + preset);
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <View ref={containerRef} style={[styles.container, containerStyle]}>
      {label && (
        <Pressable onPress={handleContainerPress}>
          <Text style={[styles.label, { color: dynamicColors.ink }]}>
            {cleanLabel}
            {isRequired && (
              <Text style={{ color: dynamicColors.danger, fontWeight: '700' }}> *</Text>
            )}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={handleContainerPress}
        style={[
          styles.inputContainer,
          { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border },
          isFocused && { borderColor: dynamicColors.primary, backgroundColor: dynamicColors.surface },
          Boolean(error) && {
            borderColor: dynamicColors.danger,
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : dynamicColors.dangerLight,
          },
        ]}
      >
        {/* 60% size currency symbol */}
        <Text
          style={[
            styles.currencySymbol,
            { color: isFocused ? dynamicColors.primaryDark : dynamicColors.textSecondary },
          ]}
        >
          {currencySymbol}
        </Text>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: dynamicColors.ink,
              backgroundColor: 'transparent',
            },
          ]}
          selectionColor={dynamicColors.primary}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={dynamicColors.textTertiary}
          value={stringValue}
          onChangeText={handleChangeText}
          onFocus={() => {
            setIsFocused(true);
            if (Platform.OS !== 'web') {
              keyboardAware?.scrollToFocusedInput(containerRef.current);
            }
          }}
          onBlur={() => setIsFocused(false)}
        />

        {numericValue > 0 && (
          <TouchableOpacity
            onPress={() => onChangeValue(0)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.clearBtn, { backgroundColor: dynamicColors.surfaceMuted }]}
          >
            <Text style={[styles.clearText, { color: dynamicColors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </Pressable>

      {/* Optional quick amount presets */}
      {quickAmounts && quickAmounts.length > 0 && (
        <View style={styles.presetsRow}>
          {quickAmounts.map((amt) => (
            <TouchableOpacity
              key={amt}
              onPress={() => addPreset(amt)}
              style={[
                styles.presetChip,
                { backgroundColor: dynamicColors.primarySoft, borderColor: dynamicColors.primaryBorder },
              ]}
            >
              <Text style={[styles.presetText, { color: dynamicColors.primaryDark }]}>
                +{amt.toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error ? (
        <Text style={[styles.errorText, { color: dynamicColors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: dynamicColors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.sm + 4,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  focusedInput: {},
  errorInput: {},
  currencySymbol: {
    fontFamily: typography.fontAmount,
    fontSize: 18,
    marginRight: 6,
    letterSpacing: 0.8,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontAmount,
    fontSize: 24,
    letterSpacing: 0.8,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: 0,
    margin: 0,
    backgroundColor: 'transparent',
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  presetText: {
    fontFamily: typography.fontAmount,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.primaryDark,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
