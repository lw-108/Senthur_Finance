import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/store/useThemeStore';

interface HeroLoanCardProps {
  loanNumber: string;
  customerName: string;
  location?: string;
  outstandingAmount: string;
  nextDueDate?: string;
  daysOverdue?: number;
  progressPercent?: number;
  collateralPhotoUrl?: string | null;
  bigStat?: string;
  bigStatCaption?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function HeroLoanCard({
  loanNumber,
  customerName,
  location,
  outstandingAmount,
  nextDueDate,
  daysOverdue = 0,
  progressPercent = 0,
  collateralPhotoUrl,
  bigStat,
  bigStatCaption,
  onPress,
  style,
}: HeroLoanCardProps) {
  const { colors: dynamicColors } = useTheme();
  const isOverdue = daysOverdue > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.92}
      style={[styles.container, shadows.hero, style]}
    >
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.loanNumber, { color: dynamicColors.primary }]}>{loanNumber}</Text>
          <Text style={styles.customerName} numberOfLines={1}>
            {customerName}
          </Text>
          {location && <Text style={styles.location}>{location}</Text>}
        </View>

        {collateralPhotoUrl ? (
          <View style={styles.collateralWindow}>
            <Image
              source={{ uri: collateralPhotoUrl }}
              style={styles.collateralImage}
            />
          </View>
        ) : (
          <View style={styles.shieldIconWrap}>
            <Ionicons name="shield-checkmark" size={24} color={dynamicColors.primary} />
          </View>
        )}
      </View>

      {/* Big Outstanding Amount */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Outstanding Balance</Text>
        <Text style={styles.outstandingAmount}>{outstandingAmount}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(Math.max(progressPercent, 0), 100)}%`,
                backgroundColor: dynamicColors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>{Math.round(progressPercent)}% paid</Text>
      </View>

      {/* Bottom Info Row */}
      <View style={styles.bottomRow}>
        {isOverdue ? (
          <View style={styles.overdueBadge}>
            <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
            <Text style={styles.overdueText}>{daysOverdue} days overdue</Text>
          </View>
        ) : nextDueDate ? (
          <View style={styles.dueBadge}>
            <Ionicons name="time-outline" size={14} color={colors.primaryLight} />
            <Text style={styles.dueText}>Due: {nextDueDate}</Text>
          </View>
        ) : (
          <View />
        )}

        {bigStat && (
          <View style={styles.bigStatContainer}>
            <Text style={styles.bigStatNumber}>{bigStat}</Text>
            {bigStatCaption && (
              <Text style={styles.bigStatCaption}>{bigStatCaption}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.darkCard,
    borderRadius: radii.card,
    padding: 22,
    marginVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  loanNumber: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  customerName: {
    fontFamily: typography.fontHeadline,
    fontSize: 22,
    color: colors.onDark,
    marginTop: 2,
    letterSpacing: 0.9,
  },
  location: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.onDarkSecondary,
    marginTop: 2,
  },
  collateralWindow: {
    width: 58,
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  collateralImage: {
    width: '100%',
    height: '100%',
  },
  shieldIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountSection: {
    marginBottom: 16,
  },
  amountLabel: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.onDarkSecondary,
    marginBottom: 4,
  },
  outstandingAmount: {
    fontFamily: typography.fontAmount,
    fontSize: 34,
    color: colors.onDark,
    letterSpacing: 0.9,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.onDarkSecondary,
    textAlign: 'right',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  overdueText: {
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    fontSize: 11,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  dueText: {
    fontFamily: typography.fontBody,
    color: colors.onDark,
    fontSize: 11,
  },
  bigStatContainer: {
    alignItems: 'flex-end',
  },
  bigStatNumber: {
    fontFamily: typography.fontAmount,
    fontSize: 18,
    letterSpacing: 0.8,
    color: colors.onDark,
  },
  bigStatCaption: {
    fontFamily: typography.fontBody,
    fontSize: 10,
    color: colors.onDarkSecondary,
  },
});
