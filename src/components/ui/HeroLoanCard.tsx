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
  const { colors: dynamicColors, isDark } = useTheme();
  const isOverdue = daysOverdue > 0;

  // Adapt colors dynamically to active theme mode & accent palette
  const cardBg = isDark ? dynamicColors.surface : dynamicColors.primarySoft;
  const cardBorder = isDark ? dynamicColors.border : dynamicColors.primaryBorder;
  const primaryText = isDark ? '#FFFFFF' : dynamicColors.headingPrimary;
  const secondaryText = isDark ? dynamicColors.textSecondary : dynamicColors.textMuted;
  const trackBg = isDark ? 'rgba(255, 255, 255, 0.12)' : dynamicColors.primaryLight;
  const dividerBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : dynamicColors.primaryBorder;
  const iconWrapBg = isDark ? 'rgba(255, 255, 255, 0.08)' : dynamicColors.primaryLight;
  const dueBadgeBg = isDark ? 'rgba(255, 255, 255, 0.1)' : dynamicColors.surface;
  const dueBadgeBorder = isDark ? 'transparent' : dynamicColors.primaryBorder;
  const dueBadgeTextColor = isDark ? '#FFFFFF' : dynamicColors.primaryDark;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.92}
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          borderWidth: 1.5,
        },
        shadows.card,
        style,
      ]}
    >
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.loanNumber, { color: dynamicColors.primaryDark }]}>{loanNumber}</Text>
          <Text style={[styles.customerName, { color: primaryText }]} numberOfLines={1}>
            {customerName}
          </Text>
          {location && <Text style={[styles.location, { color: secondaryText }]}>{location}</Text>}
        </View>

        {collateralPhotoUrl ? (
          <View style={[styles.collateralWindow, { borderColor: cardBorder }]}>
            <Image
              source={{ uri: collateralPhotoUrl }}
              style={styles.collateralImage}
            />
          </View>
        ) : (
          <View style={[styles.shieldIconWrap, { backgroundColor: iconWrapBg }]}>
            <Ionicons name="shield-checkmark" size={24} color={dynamicColors.primaryDark} />
          </View>
        )}
      </View>

      {/* Big Outstanding Amount */}
      <View style={styles.amountSection}>
        <Text style={[styles.amountLabel, { color: secondaryText }]}>Outstanding Balance</Text>
        <Text style={[styles.outstandingAmount, { color: primaryText }]}>{outstandingAmount}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: trackBg }]}>
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
        <Text style={[styles.progressLabel, { color: secondaryText }]}>{Math.round(progressPercent)}% paid</Text>
      </View>

      {/* Bottom Info Row */}
      <View style={[styles.bottomRow, { borderTopColor: dividerBorder }]}>
        {isOverdue ? (
          <View style={styles.overdueBadge}>
            <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
            <Text style={styles.overdueText}>{daysOverdue} days overdue</Text>
          </View>
        ) : nextDueDate ? (
          <View style={[styles.dueBadge, { backgroundColor: dueBadgeBg, borderColor: dueBadgeBorder, borderWidth: isDark ? 0 : 1 }]}>
            <Ionicons name="time-outline" size={14} color={dueBadgeTextColor} />
            <Text style={[styles.dueText, { color: dueBadgeTextColor }]}>Due: {nextDueDate}</Text>
          </View>
        ) : (
          <View />
        )}

        {bigStat && (
          <View style={styles.bigStatContainer}>
            <Text style={[styles.bigStatNumber, { color: primaryText }]}>{bigStat}</Text>
            {bigStatCaption && (
              <Text style={[styles.bigStatCaption, { color: secondaryText }]}>{bigStatCaption}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
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
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  customerName: {
    fontFamily: typography.fontHeadline,
    fontSize: 22,
    marginTop: 2,
    letterSpacing: 0.9,
  },
  location: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    marginTop: 2,
  },
  collateralWindow: {
    width: 58,
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
  },
  collateralImage: {
    width: '100%',
    height: '100%',
  },
  shieldIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountSection: {
    marginBottom: 16,
  },
  amountLabel: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginBottom: 4,
  },
  outstandingAmount: {
    fontFamily: typography.fontAmount,
    fontSize: 34,
    letterSpacing: 0.9,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    textAlign: 'right',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  dueText: {
    fontFamily: typography.fontBody,
    fontSize: 11,
  },
  bigStatContainer: {
    alignItems: 'flex-end',
  },
  bigStatNumber: {
    fontFamily: typography.fontAmount,
    fontSize: 18,
    letterSpacing: 0.8,
  },
  bigStatCaption: {
    fontFamily: typography.fontBody,
    fontSize: 10,
  },
});
