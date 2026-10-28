import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';

export interface PinCodeInputProps {
  label?: string;
  value: string;
  onChangeValue: (pin: string) => void;
  length?: number;
  required?: boolean;
  secure?: boolean;
  allowToggleVisibility?: boolean;
  error?: string;
  autoFocus?: boolean;
  containerStyle?: ViewStyle;
}

export function PinCodeInput({
  label,
  value,
  onChangeValue,
  required,
  length = 4,
  secure = true,
  allowToggleVisibility = true,
  error,
  autoFocus = false,
  containerStyle,
}: PinCodeInputProps) {
  const { colors: dynamicColors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(!secure);

  const isRequired = required || (label ? label.includes('*') : false);
  const cleanLabel = label ? label.replace(/\s*\*+$/, '') : '';

  const cleanVal = (value || '').replace(/\D/g, '').slice(0, length);

  const handleCellPress = () => {
    inputRef.current?.focus();
  };

  const handleChangeText = (text: string) => {
    const sanitized = text.replace(/\D/g, '').slice(0, length);
    onChangeValue(sanitized);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Top Label & Show/Hide Eye Action */}
      <View style={styles.headerRow}>
        {label && (
          <Text style={[styles.label, { color: dynamicColors.ink }]}>
            {cleanLabel}
            {isRequired && (
              <Text style={{ color: dynamicColors.danger, fontWeight: '700' }}> *</Text>
            )}
          </Text>
        )}
        {allowToggleVisibility && cleanVal.length > 0 && (
          <TouchableOpacity
            onPress={() => setIsRevealed(!isRevealed)}
            style={styles.visibilityToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
              size={17}
              color={dynamicColors.primaryDark}
            />
            <Text style={[styles.visibilityText, { color: dynamicColors.primaryDark }]}>
              {isRevealed ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 4 Cell Boxes Container */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleCellPress}
        style={styles.cellsContainer}
      >
        {Array.from({ length }).map((_, index) => {
          const char = cleanVal[index];
          const isFilled = char !== undefined;
          const isCurrentActive = isFocused && index === cleanVal.length;

          return (
            <View
              key={index}
              style={[
                styles.cell,
                {
                  backgroundColor: dynamicColors.surfaceMuted,
                  borderColor: dynamicColors.border,
                },
                isFilled && {
                  borderColor: dynamicColors.primaryBorder,
                  backgroundColor: dynamicColors.surface,
                },
                isCurrentActive && {
                  borderColor: dynamicColors.primary,
                  backgroundColor: dynamicColors.primarySoft,
                  borderWidth: 2,
                },
                error && {
                  borderColor: dynamicColors.danger,
                  backgroundColor: dynamicColors.dangerLight,
                },
              ]}
            >
              {isFilled ? (
                isRevealed ? (
                  <Text style={[styles.digitText, { color: dynamicColors.ink }]}>
                    {char}
                  </Text>
                ) : (
                  <View
                    style={[
                      styles.bulletDot,
                      { backgroundColor: dynamicColors.primaryDark },
                    ]}
                  />
                )
              ) : isCurrentActive ? (
                <View
                  style={[
                    styles.cursorBar,
                    { backgroundColor: dynamicColors.primary },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.emptyDot,
                    { backgroundColor: dynamicColors.borderStrong },
                  ]}
                />
              )}
            </View>
          );
        })}

        {/* Hidden underlying TextInput completely removing browser rings */}
        <TextInput
          ref={inputRef}
          value={cleanVal}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          caretHidden
          style={styles.hiddenInput}
          accessibilityLabel={label || 'PIN Input'}
        />
      </TouchableOpacity>

      {error ? (
        <Text style={[styles.errorText, { color: dynamicColors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  visibilityText: {
    ...typography.caption,
    fontFamily: typography.fontHeadline,
    fontSize: 12,
  },
  cellsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    height: 58,
    borderRadius: radii.sm + 6,
    borderWidth: 1.5,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  digitText: {
    fontFamily: typography.fontAmount,
    fontSize: 26,
    letterSpacing: 0.9,
  },
  bulletDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.4,
  },
  cursorBar: {
    width: 2,
    height: 22,
    borderRadius: 1,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.001,
    fontSize: 1,
    color: 'transparent',
    ...(Platform.OS === 'web'
      ? {
          outlineStyle: 'none' as any,
          outlineWidth: 0 as any,
        }
      : {}),
  },
  errorText: {
    ...typography.caption,
    marginTop: 6,
    fontWeight: '500',
  },
});
