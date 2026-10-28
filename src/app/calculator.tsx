import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header } from '@/components/ui';
import { typography } from '@/theme/typography';
import { AccentColor } from '@/theme/colors';
import { useTheme } from '@/store/useThemeStore';
import { StandardCalculator } from '@/components/calculator/StandardCalculator';
import { NumberToWordsView } from '@/components/calculator/NumberToWordsView';
import { TextToNumberView } from '@/components/calculator/TextToNumberView';
import { CashCounterView } from '@/components/calculator/CashCounterView';
import { LoanEmiTool } from '@/components/calculator/LoanEmiTool';

type TabType = 'calc' | 'words' | 'text' | 'cash' | 'emi';

export default function CalculatorScreen() {
  const router = useRouter();
  const { colors: dynamicColors, isDark, themeMode, setThemeMode, accentColor, setAccentColor } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('calc');
  const [sharedAmount, setSharedAmount] = useState<number>(100000);
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Cross-tool data transfer handlers
  const handleSendToWords = (amount: number) => {
    setSharedAmount(amount > 0 ? amount : 100000);
    setActiveTab('words');
  };

  const handleSendToCalc = (amount: number) => {
    setSharedAmount(amount);
    setActiveTab('calc');
  };

  const handleSendToLoan = (amount: number) => {
    setSharedAmount(amount > 0 ? amount : 100000);
    setActiveTab('emi');
  };

  const TABS: {
    id: TabType;
    label: string;
    tagline: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
  }[] = [
    {
      id: 'calc',
      label: 'Standard Calculator',
      tagline: 'Math & History',
      icon: 'calculator-outline',
      description: 'Quick arithmetic, % calculations, history tape & copy',
    },
    {
      id: 'words',
      label: 'Number to Words',
      tagline: 'Financial & Cheque Text',
      icon: 'document-text-outline',
      description: 'Cheque format, Tamil & Indian crore/lakh wording',
    },
    {
      id: 'text',
      label: 'Text to Number',
      tagline: 'Shorthand Converter',
      icon: 'text-outline',
      description: 'Parse 2.5L, 50k, 1.2 Cr shorthand into exact rupees',
    },
    {
      id: 'cash',
      label: 'Cash Denomination Counter',
      tagline: 'Physical Cash Tally',
      icon: 'cash-outline',
      description: '₹500 to ₹1 note counter & printable cash slip',
    },
    {
      id: 'emi',
      label: 'Loan EMI Calculator',
      tagline: 'Interest & Repayment',
      icon: 'pie-chart-outline',
      description: 'Monthly reducing balance & flat interest schedules',
    },
  ];

  const activeTabObj = TABS.find((t) => t.id === activeTab) || TABS[0];

  const ACCENT_COLORS: { name: string; id: AccentColor; color: string }[] = [
    { name: 'Amber Gold', id: 'amber', color: '#F59E0B' },
    { name: 'Emerald', id: 'emerald', color: '#10B981' },
    { name: 'Royal Blue', id: 'blue', color: '#3B82F6' },
    { name: 'Rose', id: 'rose', color: '#F43F5E' },
    { name: 'Lavender', id: 'violet', color: '#8B5CF6' },
  ];

  return (
    <Screen scrollable>
      {/* Header with Title and Theme Customizer */}
      <Header
        showBack
        title="Financial Calculator & Tools"
        showSupportPill={false}
        rightAction={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: dynamicColors.surfaceMuted }]}
              onPress={() => setShowThemePicker(!showThemePicker)}
              accessibilityLabel="Color Theme Selector"
              accessibilityRole="button"
            >
              <Ionicons name="color-palette-outline" size={19} color={dynamicColors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: dynamicColors.surfaceMuted }]}
              onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
              accessibilityLabel="Toggle Dark/Light Mode"
              accessibilityRole="button"
            >
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={19} color={dynamicColors.ink} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Inbuilt Color Theme Picker (Collapsible Banner) */}
      {showThemePicker && (
        <View style={[styles.themeBanner, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: dynamicColors.border }]}>
          <View style={styles.themeBannerHeader}>
            <Text style={[styles.themeBannerTitle, { color: dynamicColors.ink }]}>Choose Calculator Theme Accent</Text>
            <TouchableOpacity onPress={() => setShowThemePicker(false)}>
              <Ionicons name="close" size={18} color={dynamicColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.colorDotsRow}>
            {ACCENT_COLORS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.colorDotBtn,
                  { backgroundColor: item.color },
                  accentColor === item.id && styles.colorDotActive,
                ]}
                onPress={() => setAccentColor(item.id)}
                activeOpacity={0.8}
              >
                {accentColor === item.id && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Financial Tool Dropdown Selector */}
      <View style={styles.dropdownSection}>
        <TouchableOpacity
          style={[
            styles.dropdownTrigger,
            {
              backgroundColor: dynamicColors.surface,
              borderColor: isDropdownOpen
                ? dynamicColors.primary
                : isDark
                ? dynamicColors.border
                : dynamicColors.primaryBorder,
            },
            isDropdownOpen && {
              borderColor: dynamicColors.primary,
              shadowColor: dynamicColors.primary,
            },
          ]}
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Active Tool: ${activeTabObj.label}. Tap to choose a financial tool`}
        >
          <View style={styles.triggerLeft}>
            <View
              style={[
                styles.triggerIconWrap,
                {
                  backgroundColor: isDark ? `${dynamicColors.primary}20` : dynamicColors.primarySoft,
                  borderColor: isDark ? `${dynamicColors.primary}45` : dynamicColors.primaryBorder,
                },
              ]}
            >
              <Ionicons name={activeTabObj.icon} size={20} color={dynamicColors.primary} />
            </View>

            <View style={styles.triggerTextCol}>
              <View style={styles.triggerBadgeRow}>
                <Text style={[styles.triggerCategory, { color: dynamicColors.primary }]}>
                  FINANCIAL TOOL
                </Text>
                <View
                  style={[
                    styles.taglinePill,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : dynamicColors.surfaceMuted,
                    },
                  ]}
                >
                  <Text style={[styles.taglineText, { color: dynamicColors.textSecondary }]}>
                    {activeTabObj.tagline}
                  </Text>
                </View>
              </View>
              <Text style={[styles.triggerTitle, { color: dynamicColors.ink }]} numberOfLines={1}>
                {activeTabObj.label}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.chevronCircle,
              {
                backgroundColor: isDropdownOpen
                  ? dynamicColors.primary
                  : isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : dynamicColors.surfaceMuted,
                borderColor: isDropdownOpen
                  ? dynamicColors.primary
                  : isDark
                  ? dynamicColors.border
                  : 'transparent',
              },
            ]}
          >
            <Ionicons
              name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={isDropdownOpen ? '#FFFFFF' : dynamicColors.primary}
            />
          </View>
        </TouchableOpacity>

        {/* Dropdown Options Menu with Theme Select Highlighter */}
        {isDropdownOpen && (
          <View
            style={[
              styles.dropdownMenu,
              {
                backgroundColor: dynamicColors.surface,
                borderColor: isDark ? dynamicColors.border : dynamicColors.primaryBorder,
              },
            ]}
          >
            <View style={styles.dropdownMenuHeader}>
              <Text style={[styles.dropdownHeaderTitle, { color: dynamicColors.textSecondary }]}>
                SELECT A FINANCIAL TOOL
              </Text>
              <TouchableOpacity
                onPress={() => setIsDropdownOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={dynamicColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.optionItem,
                    {
                      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : dynamicColors.border,
                    },
                    isSelected && [
                      styles.optionItemSelected,
                      {
                        backgroundColor: isDark
                          ? `${dynamicColors.primary}20`
                          : dynamicColors.primarySoft,
                        borderColor: isDark
                          ? `${dynamicColors.primary}45`
                          : dynamicColors.primaryBorder,
                      },
                    ],
                  ]}
                  onPress={() => {
                    setActiveTab(tab.id);
                    setIsDropdownOpen(false);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${tab.label}${isSelected ? ' (Selected)' : ''}`}
                >
                  <View
                    style={[
                      styles.optionIconBox,
                      {
                        backgroundColor: isSelected
                          ? dynamicColors.primary
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : dynamicColors.surfaceMuted,
                      },
                    ]}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={18}
                      color={isSelected ? '#FFFFFF' : dynamicColors.textSecondary}
                    />
                  </View>

                  <View style={styles.optionContent}>
                    <View style={styles.optionTitleRow}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected ? dynamicColors.primary : dynamicColors.ink,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                      {isSelected && (
                        <View
                          style={[
                            styles.activeBadge,
                            {
                              backgroundColor: dynamicColors.primary,
                            },
                          ]}
                        >
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionDescription,
                        {
                          color: isSelected ? dynamicColors.primaryDark : dynamicColors.textSecondary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {tab.description}
                    </Text>
                  </View>

                  {/* Select Highlighter Checkmark */}
                  {isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={dynamicColors.primary}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={dynamicColors.textTertiary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Active Tab View */}
      <View style={styles.contentContainer}>
        {activeTab === 'calc' && (
          <StandardCalculator
            colors={dynamicColors}
            isDark={isDark}
            onSendToWords={handleSendToWords}
            onSendToLoan={handleSendToLoan}
          />
        )}

        {activeTab === 'words' && (
          <NumberToWordsView
            initialAmount={sharedAmount}
            colors={dynamicColors}
            isDark={isDark}
            onSendToCalc={handleSendToCalc}
            onSendToLoan={handleSendToLoan}
          />
        )}

        {activeTab === 'text' && (
          <TextToNumberView
            colors={dynamicColors}
            isDark={isDark}
            onSendToCalc={handleSendToCalc}
            onSendToLoan={handleSendToLoan}
          />
        )}

        {activeTab === 'cash' && (
          <CashCounterView
            colors={dynamicColors}
            isDark={isDark}
            onSendToCalc={handleSendToCalc}
            onSendToWords={handleSendToWords}
          />
        )}

        {activeTab === 'emi' && (
          <LoanEmiTool
            initialPrincipal={sharedAmount}
            colors={dynamicColors}
            isDark={isDark}
            onSendToWords={handleSendToWords}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  themeBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  themeBannerTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  colorDotBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  dropdownSection: {
    marginVertical: 10,
    zIndex: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  triggerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  triggerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  triggerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  triggerCategory: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  taglinePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  taglineText: {
    fontFamily: typography.fontHeadline,
    fontSize: 10,
    fontWeight: '600',
  },
  triggerTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dropdownMenu: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  dropdownHeaderTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderBottomWidth: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  optionItemSelected: {
    borderWidth: 1,
  },
  optionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  optionDescription: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  contentContainer: {
    marginTop: 6,
    flex: 1,
    paddingBottom: 40,
  },
});
