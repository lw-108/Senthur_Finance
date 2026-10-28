import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { radii } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';

export interface SegmentItem<T = string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T = string> {
  items: SegmentItem<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T = string>({
  items,
  selectedValue,
  onSelect,
  style,
}: SegmentedControlProps<T>) {
  const { colors: dynamicColors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: dynamicColors.surfaceMuted,
          borderColor: isDark ? dynamicColors.border : 'transparent',
          borderWidth: isDark ? 1 : 0,
        },
        style,
      ]}
    >
      {items.map((item) => {
        const isSelected = item.value === selectedValue;
        return (
          <TouchableOpacity
            key={String(item.value)}
            onPress={() => onSelect(item.value)}
            activeOpacity={0.8}
            style={[
              styles.segment,
              isSelected && [
                styles.selectedSegment,
                {
                  backgroundColor: dynamicColors.surface,
                  borderColor: isDark ? dynamicColors.borderStrong : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: dynamicColors.textSecondary },
                isSelected && [styles.selectedSegmentText, { color: dynamicColors.ink }],
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    padding: 4,
    marginVertical: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSegment: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
  },
  selectedSegmentText: {
    fontWeight: '600',
  },
});
