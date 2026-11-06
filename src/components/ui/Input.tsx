import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Pressable,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';
import { useKeyboardAware } from './Screen';

export interface InputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    required,
    error,
    hint,
    leadingIcon,
    trailingIcon,
    onTrailingIconPress,
    containerStyle,
    inputContainerStyle,
    isPassword = false,
    style,
    value,
    ...rest
  },
  forwardedRef
) {
  const { colors: dynamicColors, isDark } = useTheme();
  const keyboardAware = useKeyboardAware();
  const containerRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(forwardedRef, () => inputRef.current as TextInput);

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = Boolean(error);
  const isRequired = required || (label ? label.includes('*') : false);
  const cleanLabel = label ? label.replace(/\s*\*+$/, '') : '';

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
          hasError && {
            borderColor: dynamicColors.danger,
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : dynamicColors.dangerLight,
          },
          inputContainerStyle,
        ]}
      >
        {leadingIcon && (
          <Ionicons
            name={leadingIcon}
            size={18}
            color={isFocused ? dynamicColors.primaryDark : dynamicColors.textSecondary}
            style={styles.leadingIcon}
          />
        )}

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: dynamicColors.ink,
              backgroundColor: 'transparent',
            },
            style,
          ]}
          selectionColor={dynamicColors.primary}
          placeholderTextColor={dynamicColors.textTertiary}
          secureTextEntry={isPassword && !showPassword}
          value={value}
          {...rest}
          onFocus={(e) => {
            setIsFocused(true);
            if (Platform.OS !== 'web') {
              keyboardAware?.scrollToFocusedInput(containerRef.current);
            }
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.trailingAction}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={dynamicColors.textSecondary}
            />
          </TouchableOpacity>
        ) : trailingIcon ? (
          <TouchableOpacity
            onPress={onTrailingIconPress}
            disabled={!onTrailingIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.trailingAction}
          >
            <Ionicons
              name={trailingIcon}
              size={19}
              color={dynamicColors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </Pressable>

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
    paddingHorizontal: 14,
    minHeight: 52,
  },
  focusedInput: {},
  errorInput: {},
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 15,
    letterSpacing: 0.5,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingHorizontal: 0,
    margin: 0,
    backgroundColor: 'transparent',
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  trailingAction: {
    marginLeft: 8,
    padding: 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 6,
    fontWeight: '500',
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
