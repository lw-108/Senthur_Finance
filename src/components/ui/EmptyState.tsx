import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { PillButton } from './PillButton';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  iconName = 'file-tray-outline',
  title,
  description,
  actionTitle,
  onAction,
  style,
}: EmptyStateProps) {
  const { colors: dynamicColors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, { backgroundColor: dynamicColors.primarySoft }]}>
        <Ionicons name={iconName} size={36} color={dynamicColors.primaryDark} />
      </View>
      <Text style={[styles.title, { color: dynamicColors.ink }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: dynamicColors.textSecondary }]}>{description}</Text>}
      {actionTitle && onAction && (
        <PillButton
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={styles.actionBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  actionBtn: {
    marginTop: 18,
  },
});
