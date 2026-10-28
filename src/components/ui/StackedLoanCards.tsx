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
import { colors } from '@/theme/colors';
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
  const { colors: dynamicColors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  if (!loans || loans.length === 0) {
    return null;
  }

  // Visual card configurations: 0 = Dark hero, 1 = Dynamic Accent, 2 = White / Surface
  const cardThemes = [
    {
      bg: dynamicColors.darkCard,
      text: dynamicColors.onDark,
      subtext: dynamicColors.onDarkSecondary,
      iconBg: 'rgba(255, 255, 255, 0.12)',
      iconColor: dynamicColors.primary,
      accent: dynamicColors.primary,
    },
    {
      bg: dynamicColors.primary,
      text: '#FFFFFF',
      subtext: 'rgba(255, 255, 255, 0.85)',
      iconBg: 'rgba(255, 255, 255, 0.25)',
      iconColor: '#FFFFFF',
      accent: '#FFFFFF',
    },
    {
      bg: dynamicColors.surface,
      text: dynamicColors.ink,
      subtext: dynamicColors.textSecondary,
      iconBg: dynamicColors.primarySoft,
      iconColor: dynamicColors.primaryDark,
      accent: dynamicColors.primaryDark,
    },
  ];

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
                isActive && styles.activeTabItem,
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
                  isActive && styles.activeTabText,
                ]}
                numberOfLines={1}
              >
                {loan.category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stacked Cards Area */}
      <View style={styles.cardsStack}>
        {loans.map((loan, index) => {
          const isActive = index === activeIndex;
          // Calculate relative position from activeIndex
          const offset = (index - activeIndex + loans.length) % loans.length;
          const theme = cardThemes[offset % cardThemes.length];

          // Top front card gets highest zIndex
          const zIndex = loans.length - offset;
          const translateY = offset * 14;
          const scale = 1 - offset * 0.04;
          const opacity = 1 - offset * 0.15;

          return (
            <Animated.View
              key={loan.id}
              style={[
                styles.cardWrapper,
                {
                  zIndex,
                  transform: [{ translateY }, { scale }],
                  opacity,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => {
                  if (isActive) {
                    onLoanPress?.(loan);
                  } else {
                    setActiveIndex(index);
                  }
                }}
                style={[
                  styles.cardBody,
                  { backgroundColor: theme.bg },
                  offset === 0 && shadows.hero,
                  offset === 2 && shadows.card,
                ]}
              >
                {/* Tab Notch Header with SVG curve */}
                <View style={styles.notchHeader}>
                  <View style={styles.categoryPill}>
                    <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
                      <Ionicons name={loan.iconName} size={18} color={theme.iconColor} />
                    </View>
                    <Text style={[styles.categoryTitle, { color: theme.text }]}>
                      {loan.category}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => onCalculatePress?.(loan)}
                    style={styles.calculateLink}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.calculateText, { color: theme.accent }]}>
                      Calculate →
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Main Card Content */}
                <View style={styles.cardContent}>
                  <View style={styles.detailsLeft}>
                    <Text style={[styles.customerName, { color: theme.text }]}>
                      {loan.customerName}
                    </Text>
                    <Text style={[styles.loanSubtitle, { color: theme.subtext }]}>
                      {loan.loanNumber} {loan.location ? `• ${loan.location}` : ''}
                    </Text>

                    <View style={styles.amountsRow}>
                      <Text style={[styles.principalText, { color: theme.text }]}>
                        {loan.principalFormatted}
                      </Text>
                      <Text style={[styles.interestRate, { color: theme.subtext }]}>
                        @{loan.interestRateFormatted}
                      </Text>
                    </View>
                  </View>

                  {/* Right side: Collateral Window or Big Stat Window */}
                  <View style={styles.detailsRight}>
                    {loan.collateralPhotoUrl ? (
                      <View style={styles.collateralWindow}>
                        <Image
                          source={{ uri: loan.collateralPhotoUrl }}
                          style={styles.collateralImage}
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.statCircle,
                          { backgroundColor: theme.iconBg },
                        ]}
                      >
                        <Text style={[styles.highlightStatNumber, { color: theme.text }]}>
                          {loan.highlightStat}
                        </Text>
                        <Text
                          style={[styles.highlightStatCaption, { color: theme.subtext }]}
                          numberOfLines={1}
                        >
                          {loan.highlightStatCaption}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Footer info bar */}
                <View style={styles.cardFooter}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.innerBadge,
                        { backgroundColor: theme.iconBg },
                      ]}
                    >
                      <Text style={[styles.innerBadgeText, { color: theme.text }]}>
                        {loan.statusBadge}
                      </Text>
                    </View>
                    <Text style={[styles.tenureText, { color: theme.subtext }]}>
                      Tenure: {loan.tenureFormatted}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
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
    backgroundColor: colors.surfaceMuted,
    gap: 6,
  },
  activeTabItem: {
    backgroundColor: colors.surface,
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
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.ink,
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
  statCircle: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  highlightStatNumber: {
    fontFamily: typography.fontAmount,
    fontSize: 18,
    letterSpacing: 0.8,
  },
  highlightStatCaption: {
    fontFamily: typography.fontBody,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
});
