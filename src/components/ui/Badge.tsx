import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/store/useThemeStore';
import { typography } from '@/theme/typography';

export type BadgeStatus =
  | 'ACTIVE'
  | 'OVERDUE'
  | 'CLOSED'
  | 'DRAFT'
  | 'WRITTEN_OFF'
  | 'RENEWED'
  | 'UPCOMING'
  | 'DUE_TODAY'
  | 'PAID'
  | 'PARTIAL'
  | 'WAIVED';

interface BadgeProps {
  status: BadgeStatus | string;
  label?: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  style?: ViewStyle;
}

export function Badge({
  status,
  label,
  size = 'md',
  showDot = true,
  style,
}: BadgeProps) {
  const { colors: dynamicColors, isDark } = useTheme();

  const getStatusConfig = () => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'PAID':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.2)' : dynamicColors.successLight,
          color: dynamicColors.success,
          displayLabel: label || 'Active',
        };
      case 'OVERDUE':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.2)' : dynamicColors.dangerLight,
          color: dynamicColors.danger,
          displayLabel: label || 'Overdue',
        };
      case 'DUE_TODAY':
      case 'PARTIAL':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.2)' : dynamicColors.warningLight,
          color: dynamicColors.warning,
          displayLabel: label || (status === 'DUE_TODAY' ? 'Due Today' : 'Partial'),
        };
      case 'CLOSED':
        return {
          bg: isDark ? 'rgba(255, 255, 255, 0.08)' : dynamicColors.surfaceMuted,
          color: dynamicColors.textSecondary,
          displayLabel: label || 'Closed',
        };
      case 'DRAFT':
        return {
          bg: isDark ? `${dynamicColors.primary}25` : dynamicColors.primarySoft,
          color: dynamicColors.primaryDark,
          displayLabel: label || 'Draft',
        };
      case 'WRITTEN_OFF':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2',
          color: isDark ? '#FCA5A5' : '#991B1B',
          displayLabel: label || 'Written Off',
        };
      case 'RENEWED':
        return {
          bg: isDark ? 'rgba(59, 130, 246, 0.2)' : dynamicColors.infoLight,
          color: dynamicColors.info,
          displayLabel: label || 'Renewed',
        };
      case 'UPCOMING':
      default:
        return {
          bg: isDark ? 'rgba(255, 255, 255, 0.08)' : dynamicColors.surfaceMuted,
          color: dynamicColors.textSecondary,
          displayLabel: label || status,
        };
    }
  };

  const config = getStatusConfig();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 10,
        },
        style,
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: config.color,
              width: isSmall ? 5 : 6,
              height: isSmall ? 5 : 6,
              borderRadius: 3,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: config.color,
            fontSize: isSmall ? 11 : 12,
          },
        ]}
      >
        {config.displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {},
  text: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.8,
  },
});
