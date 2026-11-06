import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/store/useThemeStore';

export interface StackedLoanItem {
  id: string;
  category: string;
  customerName: string;
  loanNumber: string;
  location?: string;
  principalFormatted: string;
  tenureFormatted: string;
  statusBadge: string;
  collateralPhotoUrl?: string | null;
  highlightStat: string; // e.g. "12+ mos" or "Due in 3d"
  highlightStatCaption: string; // e.g. "Remaining tenure" or "Next repayment"
  interestRateFormatted: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

interface StackedLoanCardsProps {
  loans: StackedLoanItem[];
  onCalculatePress?: (loan: StackedLoanItem) => void;
  onLoanPress?: (loan: StackedLoanItem) => void;
}

export function StackedLoanCards({
  loans,
  onCalculatePress,
  onLoanPress,
}: StackedLoanCardsProps) {
  const { colors: dynamicColors, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  if (!loans || loans.length === 0) {
    return null;
  }

  const activeLoan = loans[activeIndex] || loans[0];

  return (
    <View style={styles.container}>
      {/* Tab Selectors Row */}
      <View style={styles.tabBar}>
        {loans.map((loan, idx) => {
          const isActive = idx === activeIndex;
          return (
            <TouchableOpacity
              key={loan.id}
              onPress={() => setActiveIndex(idx)}
              activeOpacity={0.8}
              style={[
                styles.tabItem,
                {
                  backgroundColor: isActive ? dynamicColors.surface : dynamicColors.surfaceMuted,
                  borderColor: isActive ? dynamicColors.primary : dynamicColors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <View
                style={[
                  styles.tabDot,
                  { backgroundColor: isActive ? dynamicColors.primary : dynamicColors.textTertiary },
                ]}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? dynamicColors.primary : dynamicColors.textSecondary },
                  isActive && { fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {loan.category} • {loan.customerName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Clean Borrower Due Card (Theme Mode Based Surface, Non-Clumsy, Color Themed Texts) */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onLoanPress?.(activeLoan)}
        style={[
          styles.cardBody,
          {
            backgroundColor: dynamicColors.surface,
            borderColor: dynamicColors.border,
            borderWidth: 1,
          },
          shadows.card,
        ]}
      >
        {/* Card Header: Category & Calculate Link */}
        <View style={styles.notchHeader}>
          <View style={styles.categoryPill}>
            <View style={[styles.iconBox, { backgroundColor: dynamicColors.surfaceMuted }]}>
              <Ionicons name={activeLoan.iconName} size={18} color={dynamicColors.primary} />
            </View>
            <Text style={[styles.categoryTitle, { color: dynamicColors.headingPrimary }]}>
              {activeLoan.category}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => onCalculatePress?.(activeLoan)}
            style={styles.calculateLink}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.calculateText, { color: dynamicColors.primary }]}>
              Calculate →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Card Content */}
        <View style={styles.cardContent}>
          <View style={styles.detailsLeft}>
            <Text style={[styles.customerName, { color: dynamicColors.ink }]}>
              {activeLoan.customerName}
            </Text>
            <Text style={[styles.loanSubtitle, { color: dynamicColors.textSecondary }]}>
              {activeLoan.loanNumber} {activeLoan.location ? `• ${activeLoan.location}` : ''}
            </Text>

            <View style={styles.amountsRow}>
              <Text style={[styles.principalText, { color: dynamicColors.headingPrimary }]}>
                {activeLoan.principalFormatted}
              </Text>
              <Text style={[styles.interestRate, { color: dynamicColors.textSecondary }]}>
                @{activeLoan.interestRateFormatted}
              </Text>
            </View>
          </View>

          {/* Right side: Non-highlighted Loan Duration division with color themed text */}
          <View style={styles.detailsRight}>
            {activeLoan.collateralPhotoUrl ? (
              <View style={[styles.collateralWindow, { borderColor: dynamicColors.border }]}>
                <Image
                  source={{ uri: activeLoan.collateralPhotoUrl }}
                  style={styles.collateralImage}
                />
              </View>
            ) : (
              <View style={styles.statDivision}>
                <Text style={[styles.highlightStatNumber, { color: dynamicColors.primary }]}>
                  {activeLoan.highlightStat}
                </Text>
                <Text
                  style={[styles.highlightStatCaption, { color: dynamicColors.textSecondary }]}
                  numberOfLines={1}
                >
                  {activeLoan.highlightStatCaption}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer info bar */}
        <View style={[styles.cardFooter, { borderTopColor: dynamicColors.border }]}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.innerBadge,
                {
                  backgroundColor: dynamicColors.surfaceMuted,
                  borderColor: dynamicColors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.innerBadgeText, { color: dynamicColors.primary }]}>
                {activeLoan.statusBadge}
              </Text>
            </View>
            <Text style={[styles.tenureText, { color: dynamicColors.textSecondary }]}>
              Tenure: {activeLoan.tenureFormatted}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Pagination dots if multiple loans */}
      {loans.length > 1 && (
        <View style={styles.pagerDotsRow}>
          {loans.map((_, dotIdx) => (
            <TouchableOpacity
              key={dotIdx}
              onPress={() => setActiveIndex(dotIdx)}
              style={[
                styles.pagerDot,
                dotIdx === activeIndex
                  ? [styles.pagerDotActive, { backgroundColor: dynamicColors.primary }]
                  : { backgroundColor: dynamicColors.border },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 6,
  },
  activeTabItem: {
    ...shadows.soft,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '700',
  },
  cardsStack: {
    height: 230,
    position: 'relative',
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  cardBody: {
    borderRadius: radii.card,
    padding: 20,
    minHeight: 200,
  },
  notchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 15,
    letterSpacing: 0.9,
  },
  calculateLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  calculateText: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsLeft: {
    flex: 1,
    paddingRight: 12,
  },
  customerName: {
    fontFamily: typography.fontHeadline,
    fontSize: 19,
    letterSpacing: 0.9,
  },
  loanSubtitle: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    marginTop: 2,
    marginBottom: 10,
  },
  amountsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  principalText: {
    fontFamily: typography.fontAmount,
    fontSize: 24,
    letterSpacing: 0.9,
  },
  interestRate: {
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  detailsRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  collateralWindow: {
    width: 68,
    height: 68,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  collateralImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statDivision: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  highlightStatNumber: {
    fontFamily: typography.fontAmount,
    fontSize: 18,
    letterSpacing: 0.8,
  },
  highlightStatCaption: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  innerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  innerBadgeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
  },
  tenureText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  pagerDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pagerDotActive: {
    width: 18,
    borderRadius: 3,
  },
});
