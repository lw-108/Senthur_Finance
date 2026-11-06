import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/store/useThemeStore';

interface TileProps {
  label: string;
  value?: string | number;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  hasArrowButton?: boolean;
  arrowIconName?: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
  badgeColor?: string;
  variant?: 'surface' | 'muted' | 'action' | 'dark';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Tile({
  label,
  value,
  subtitle,
  iconName,
  iconColor,
  iconBgColor,
  hasArrowButton = false,
  arrowIconName = 'arrow-forward',
  badgeCount,
  badgeColor,
  variant = 'surface',
  onPress,
  style,
}: TileProps) {
  const { colors: dynamicColors, isDark } = useTheme();
  const isAction = variant === 'action';
  const effectiveBadgeColor = badgeColor || dynamicColors.danger;
  const effectiveIconColor = iconColor || (isAction ? dynamicColors.primary : dynamicColors.ink);

  const getContainerStyle = () => {
    switch (variant) {
      case 'action':
        return {
          backgroundColor: isDark ? dynamicColors.surface : dynamicColors.primarySoft,
          borderColor: isDark ? dynamicColors.border : dynamicColors.primaryBorder,
          borderWidth: 1,
        };
      case 'dark':
        return {
          backgroundColor: dynamicColors.darkCard,
          borderColor: dynamicColors.border,
          borderWidth: 1,
        };
      case 'muted':
        return {
          backgroundColor: dynamicColors.surfaceMuted,
          borderColor: dynamicColors.border,
          borderWidth: 1,
        };
      case 'surface':
      default:
        return {
          backgroundColor: dynamicColors.surface,
          borderColor: dynamicColors.border,
          borderWidth: 1,
          ...shadows.soft,
        };
    }
  };

  const content = (
    <View style={[styles.tile, getContainerStyle(), style]}>
      {/* Top row: Icon / Badge & optional Arrow button */}
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          {iconName && (
            <View style={styles.iconWrap}>
              <Ionicons
                name={iconName}
                size={22}
                color={effectiveIconColor}
              />
            </View>
          )}
          {badgeCount !== undefined && badgeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: effectiveBadgeColor }]}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}
        </View>

        {hasArrowButton && (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Action"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.arrowWrap}
          >
            <Ionicons
              name={arrowIconName}
              size={22}
              color={isAction ? dynamicColors.primary : dynamicColors.ink}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Label and Value */}
      <View style={styles.bottomSection}>
        <Text
          style={[
            styles.label,
            { color: variant === 'dark' ? dynamicColors.onDarkSecondary : dynamicColors.textSecondary },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {value !== undefined && (
          <Text
            style={[
              styles.value,
              { color: variant === 'dark' ? dynamicColors.onDark : dynamicColors.ink },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.75}
          >
            {value}
          </Text>
        )}

        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              { color: variant === 'dark' ? dynamicColors.onDarkSecondary : dynamicColors.textMuted },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress && !hasArrowButton) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        style={styles.touchWrap}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  touchWrap: {
    flex: 1,
  },
  tile: {
    borderRadius: radii.tile,
    padding: 16,
    minHeight: 110,
    justifyContent: 'space-between',
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  bottomSection: {
    marginTop: 4,
  },
  label: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  value: {
    fontFamily: typography.fontPolymath,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 1.0,
  },
  subtitle: {
    ...typography.caption,
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.8,
    marginTop: 4,
  },
});
