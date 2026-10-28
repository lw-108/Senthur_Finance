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
import { Input, PillButton } from '@/components/ui';
import { parseTextToNumber } from '@/utils/textToNumber';
import { numberToIndianWords } from '@/utils/numberToWords';
import { useToast } from '@/components/ui/Toast';
import { copyTextToClipboard } from '@/utils/clipboard';

interface TextToNumberViewProps {
  colors: any;
  isDark: boolean;
  onSendToCalc?: (amount: number) => void;
  onSendToLoan?: (amount: number) => void;
}

export function TextToNumberView({
  colors: dynamicColors,
  isDark,
  onSendToCalc,
  onSendToLoan,
}: TextToNumberViewProps) {
  const { showSuccess } = useToast();
  const [inputText, setInputText] = useState<string>('2.5 Lakhs');

  const parsed = parseTextToNumber(inputText);
  const wordsConfirmation = parsed.success ? numberToIndianWords(parsed.value) : '';

  const copyNumber = async () => {
    if (!parsed.success) return;
    try {
      await copyTextToClipboard(parsed.value.toString());
      showSuccess(`Copied: ${parsed.formattedIndian}`);
    } catch {
      showSuccess('Number copied');
    }
  };

  const SAMPLE_CHIPS = [
    '50k',
    '2.5L',
    '1.2 Cr',
    '75 Thousand',
    '3 Lakhs 50k',
    '15 Lakhs',
    'One Crore',
    '250000',
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Search / Text Input */}
      <Input
        label="Enter Written Words or Shorthand"
        placeholder="e.g. 2.5L, 50k, 1.2 Crore, two lakh fifty thousand"
        value={inputText}
        onChangeText={setInputText}
        leadingIcon="text-outline"
        trailingIcon={inputText.length > 0 ? 'close-circle' : undefined}
        onTrailingIconPress={() => setInputText('')}
      />

      {/* Quick Test Chips */}
      <View style={styles.samplesContainer}>
        <Text style={[styles.samplesLabel, { color: dynamicColors.textSecondary }]}>Try Samples:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.samplesScroll}>
          {SAMPLE_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[
                styles.sampleChip,
                {
                  backgroundColor: isDark ? '#27272A' : dynamicColors.surfaceMuted,
                  borderColor: dynamicColors.border,
                },
              ]}
              onPress={() => setInputText(chip)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sampleChipText, { color: dynamicColors.primaryDark }]}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Result Display Box */}
      {parsed.success ? (
        <View
          style={[
            styles.successCard,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: dynamicColors.primary,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: dynamicColors.primarySoft }]}>
              <Ionicons name="checkmark-circle" size={14} color={dynamicColors.primaryDark} />
              <Text style={[styles.statusBadgeText, { color: dynamicColors.primaryDark }]} numberOfLines={1}>
                Successfully Parsed
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: dynamicColors.surfaceMuted }]}
              onPress={copyNumber}
              activeOpacity={0.7}
              accessibilityLabel="Copy parsed number"
            >
              <Ionicons name="copy-outline" size={14} color={dynamicColors.ink} />
              <Text style={[styles.copyBtnText, { color: dynamicColors.ink }]} numberOfLines={1}>Copy</Text>
            </TouchableOpacity>
          </View>

          {/* Formatted Number Headline */}
          <Text style={[styles.amountDisplay, { color: dynamicColors.ink }]}>{parsed.formattedIndian}</Text>

          {/* Raw Numbers Breakdown */}
          <View style={[styles.metaRow, { borderTopColor: dynamicColors.border }]}>
            <View style={styles.metaCol}>
              <Text style={[styles.metaLabel, { color: dynamicColors.textSecondary }]}>Numeric Value</Text>
              <Text style={[styles.metaValue, { color: dynamicColors.ink }]}>{parsed.value.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={[styles.metaLabel, { color: dynamicColors.textSecondary }]}>International</Text>
              <Text style={[styles.metaValue, { color: dynamicColors.ink }]}>{parsed.formattedInternational}</Text>
            </View>
          </View>

          {/* Spoken Word Confirmation */}
          <View style={[styles.confirmationBox, { backgroundColor: dynamicColors.surfaceMuted }]}>
            <Ionicons name="volume-high-outline" size={16} color={dynamicColors.primaryDark} />
            <Text style={[styles.confirmationText, { color: dynamicColors.ink }]} numberOfLines={2}>
              {wordsConfirmation}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: dynamicColors.border,
            },
          ]}
        >
          <Ionicons name="help-circle-outline" size={32} color={dynamicColors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: dynamicColors.ink }]}>Type any financial phrase</Text>
          <Text style={[styles.emptySub, { color: dynamicColors.textSecondary }]}>
            Supports "2.5L", "50k", "1.2 Cr", "ten thousand", "five crore", or Indian lakh formatting.
          </Text>
        </View>
      )}

      {/* Action shortcuts: Stacked Top and Bottom Pill Buttons */}
      {parsed.success && (
        <View style={styles.actionButtonsCol}>
          <PillButton
            title="Send to Loan EMI"
            variant="primary"
            iconName="cash-outline"
            onPress={() => onSendToLoan?.(parsed.value)}
            fullWidth
          />
          <PillButton
            title="Open in Calculator"
            variant="outline"
            iconName="calculator-outline"
            onPress={() => onSendToCalc?.(parsed.value)}
            fullWidth
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 24,
  },
  samplesContainer: {
    marginBottom: 16,
  },
  samplesLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  samplesScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  sampleChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  sampleChipText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  successCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  statusBadgeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  copyBtn: {
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
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  amountDisplay: {
    fontFamily: typography.fontAmount,
    fontSize: 36,
    letterSpacing: 1.0,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: typography.fontAmount,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  confirmationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  confirmationText: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    flex: 1,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.9,
  },
  emptySub: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  actionButtonsCol: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
    marginBottom: 40,
    width: '100%',
  },
});
