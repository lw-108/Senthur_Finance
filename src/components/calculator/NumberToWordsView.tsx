import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { CurrencyInput, PillButton } from '@/components/ui';
import {
  numberToIndianWords,
  numberToChequeFormat,
  numberToInternationalWords,
  numberToTamilWords,
} from '@/utils/numberToWords';
import { useToast } from '@/components/ui/Toast';
import { copyTextToClipboard } from '@/utils/clipboard';

interface NumberToWordsViewProps {
  initialAmount?: number;
  colors: any;
  isDark: boolean;
  onSendToCalc?: (amount: number) => void;
  onSendToLoan?: (amount: number) => void;
}

export function NumberToWordsView({
  initialAmount = 100000,
  colors: dynamicColors,
  isDark,
  onSendToCalc,
  onSendToLoan,
}: NumberToWordsViewProps) {
  const { showSuccess } = useToast();
  const [amount, setAmount] = useState<number>(initialAmount);

  const indianWords = numberToIndianWords(amount);
  const chequeWords = numberToChequeFormat(amount);
  const intlWords = numberToInternationalWords(amount);
  const tamilWords = numberToTamilWords(amount);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await copyTextToClipboard(text);
      showSuccess(`Copied: ${label}`);
    } catch {
      showSuccess('Copied to clipboard');
    }
  };

  const PRESETS = [10000, 25000, 50000, 100000, 250000, 500000, 1000000, 10000000];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Amount Input */}
      <CurrencyInput
        label="Enter Numeric Amount (₹)"
        value={amount}
        onChangeValue={(val) => setAmount(val || 0)}
        quickAmounts={[50000, 100000, 500000]}
      />

      {/* Preset Quick Chips */}
      <View style={styles.presetsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
          {PRESETS.map((preset) => {
            const isSelected = amount === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? dynamicColors.primary : isDark ? '#27272A' : dynamicColors.surface,
                    borderColor: isSelected ? dynamicColors.primary : dynamicColors.border,
                  },
                ]}
                onPress={() => setAmount(preset)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: isSelected ? '#FFFFFF' : dynamicColors.ink },
                  ]}
                >
                  {preset >= 10000000
                    ? `₹${preset / 10000000} Cr`
                    : preset >= 100000
                    ? `₹${preset / 100000} Lakh`
                    : `₹${preset / 1000}k`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 1. Indian Words Card */}
      <View
        style={[
          styles.resultCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: dynamicColors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleWrap}>
            <Ionicons name="document-text-outline" size={18} color={dynamicColors.primary} />
            <Text style={[styles.cardTitle, { color: dynamicColors.ink }]} numberOfLines={1}>
              Indian Financial Words
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.copyIconBtn, { backgroundColor: dynamicColors.primarySoft }]}
            onPress={() => copyToClipboard(indianWords, 'Indian Words')}
            activeOpacity={0.7}
            accessibilityLabel="Copy Indian words"
          >
            <Ionicons name="copy-outline" size={14} color={dynamicColors.primaryDark} />
            <Text style={[styles.copyBtnText, { color: dynamicColors.primaryDark }]} numberOfLines={1}>Copy</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.wordsBody, { color: dynamicColors.ink }]}>{indianWords}</Text>
      </View>

      {/* 2. Cheque / Legal Agreement Format */}
      <View
        style={[
          styles.resultCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: dynamicColors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleWrap}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: dynamicColors.ink }]} numberOfLines={1}>
              Cheque & Agreement Format
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.copyIconBtn, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}
            onPress={() => copyToClipboard(chequeWords, 'Cheque Format')}
            activeOpacity={0.7}
            accessibilityLabel="Copy cheque format words"
          >
            <Ionicons name="copy-outline" size={14} color="#059669" />
            <Text style={[styles.copyBtnText, { color: '#059669' }]} numberOfLines={1}>Copy</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.wordsBodyMonospace, { color: dynamicColors.ink }]}>{chequeWords}</Text>
      </View>

      {/* 3. Tamil Financial Words */}
      <View
        style={[
          styles.resultCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: dynamicColors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleWrap}>
            <Ionicons name="language-outline" size={18} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: dynamicColors.ink }]} numberOfLines={1}>
              Tamil Words (தமிழ் வடிவம்)
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.copyIconBtn, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}
            onPress={() => copyToClipboard(tamilWords, 'Tamil Words')}
            activeOpacity={0.7}
            accessibilityLabel="Copy Tamil words"
          >
            <Ionicons name="copy-outline" size={14} color="#D97706" />
            <Text style={[styles.copyBtnText, { color: '#D97706' }]} numberOfLines={1}>Copy</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.wordsBodyTamil, { color: dynamicColors.ink }]}>{tamilWords}</Text>
      </View>

      {/* 4. International Format */}
      <View
        style={[
          styles.resultCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: dynamicColors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleWrap}>
            <Ionicons name="globe-outline" size={18} color="#6366F1" />
            <Text style={[styles.cardTitle, { color: dynamicColors.ink }]} numberOfLines={1}>
              International Format (Millions)
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.copyIconBtn, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}
            onPress={() => copyToClipboard(intlWords, 'International Words')}
            activeOpacity={0.7}
            accessibilityLabel="Copy International format words"
          >
            <Ionicons name="copy-outline" size={14} color="#4F46E5" />
            <Text style={[styles.copyBtnText, { color: '#4F46E5' }]} numberOfLines={1}>Copy</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.wordsBody, { color: dynamicColors.ink }]}>{intlWords}</Text>
      </View>

      {/* Action shortcuts: Two pill buttons top and bottom */}
      <View style={styles.actionButtonsCol}>
        <PillButton
          title="Send to Loan EMI"
          variant="primary"
          iconName="cash-outline"
          onPress={() => onSendToLoan?.(amount)}
          fullWidth
        />
        <PillButton
          title="Send to Calculator"
          variant="outline"
          iconName="calculator-outline"
          onPress={() => onSendToCalc?.(amount)}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 24,
  },
  presetsRow: {
    marginBottom: 16,
  },
  presetsScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetChipText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  resultCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  cardTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  copyIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
    flexShrink: 0,
  },
  copyBtnText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  wordsBody: {
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.9,
  },
  wordsBodyMonospace: {
    fontFamily: typography.fontHeadline,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 1.1,
  },
  wordsBodyTamil: {
    fontFamily: 'NotoSansTamil_600SemiBold',
    fontSize: 15,
    lineHeight: 24,
  },
  actionButtonsCol: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 12,
    marginBottom: 40,
    width: '100%',
  },
});
