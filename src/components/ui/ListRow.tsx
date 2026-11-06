import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';

interface ListRowProps {
  title: string;
  subtitle?: string;
  metaText?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconBgColor?: string;
  iconColor?: string;
  leftNode?: React.ReactNode;
  rightAmount?: string;
  rightAmountType?: 'positive' | 'negative' | 'neutral';
  rightSubtext?: string;
  rightNode?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  showChevron?: boolean;
}

export function ListRow({
  title,
  subtitle,
  metaText,
  iconName,
  iconBgColor,
  iconColor,
  leftNode,
  rightAmount,
  rightAmountType = 'neutral',
  rightSubtext,
  rightNode,
  onPress,
  style,
  showChevron = false,
}: ListRowProps) {
  const { colors: dynamicColors } = useTheme();

  const effectiveIconBgColor = iconBgColor || dynamicColors.surfaceMuted;
  const effectiveIconColor = iconColor || dynamicColors.ink;

  const getAmountColor = () => {
    switch (rightAmountType) {
      case 'positive':
        return dynamicColors.success;
      case 'negative':
        return dynamicColors.danger;
      case 'neutral':
      default:
        return dynamicColors.ink;
    }
  };

  const content = (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        {leftNode ? (
          leftNode
        ) : iconName ? (
          <View style={[styles.iconContainer, { backgroundColor: effectiveIconBgColor }]}>
            <Ionicons name={iconName} size={18} color={effectiveIconColor} />
          </View>
        ) : null}

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: dynamicColors.ink }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: dynamicColors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {metaText && (
            <Text style={[styles.metaText, { color: dynamicColors.textTertiary }]} numberOfLines={1}>
              {metaText}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {rightNode ? (
          rightNode
        ) : (
          <View style={styles.amountCol}>
            {rightAmount && (
              <Text
                style={[
                  styles.amount,
                  { color: getAmountColor() },
                ]}
              >
                {rightAmount}
              </Text>
            )}
            {rightSubtext && (
              <Text style={[styles.rightSubtext, { color: dynamicColors.textSecondary }]} numberOfLines={1}>
                {rightSubtext}
              </Text>
            )}
          </View>
        )}
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={dynamicColors.textTertiary}
            style={styles.chevron}
          />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.sm + 4,
    backgroundColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.bodyMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metaText: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 3,
  },
  rightSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: typography.fontPolymath,
    fontSize: 16,
    letterSpacing: 1.0,
  },
  rightSubtext: {
    fontFamily: typography.fontPolymathThin,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  chevron: {
    marginLeft: 4,
  },
});
