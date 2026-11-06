import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { PillButton } from '@/components/ui';
import { numberToIndianWords } from '@/utils/numberToWords';
import { useToast } from '@/components/ui/Toast';
import { copyTextToClipboard } from '@/utils/clipboard';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { secureStorage } from '@/lib/storage/secureStorage';

interface CashCounterViewProps {
  colors: any;
  isDark: boolean;
  onSendToCalc?: (amount: number) => void;
  onSendToWords?: (amount: number) => void;
}

interface Denomination {
  value: number;
  label: string;
  color: string;
}

const DENOMINATIONS: Denomination[] = [
  { value: 500, label: '₹500', color: '#6366F1' },
  { value: 200, label: '₹200', color: '#F59E0B' },
  { value: 100, label: '₹100', color: '#8B5CF6' },
  { value: 50, label: '₹50', color: '#06B6D4' },
  { value: 20, label: '₹20', color: '#10B981' },
  { value: 10, label: '₹10', color: '#EC4899' },
  { value: 5, label: '₹5', color: '#64748B' },
  { value: 2, label: '₹2', color: '#64748B' },
  { value: 1, label: '₹1', color: '#64748B' },
];

export function CashCounterView({
  colors: dynamicColors,
  isDark,
  onSendToCalc,
  onSendToWords,
}: CashCounterViewProps) {
  const { showSuccess } = useToast();
  const { business } = useBusinessSettingsStore();
  const [counts, setCounts] = useState<Record<number, number>>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  });

  // Restore cached denomination counts across app switches
  React.useEffect(() => {
    secureStorage.getItem('loanledger_cash_counter').then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setCounts((prev) => ({ ...prev, ...parsed }));
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const updateCount = (denom: number, count: number) => {
    setCounts((prev) => {
      const updated = {
        ...prev,
        [denom]: Math.max(0, count || 0),
      };
      secureStorage.setItem('loanledger_cash_counter', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const increment = (denom: number) => {
    updateCount(denom, (counts[denom] || 0) + 1);
  };

  const decrement = (denom: number) => {
    updateCount(denom, Math.max(0, (counts[denom] || 0) - 1));
  };

  const handleReset = () => {
    secureStorage.deleteItem('loanledger_cash_counter').catch(() => {});
    setCounts({
      500: 0,
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
      5: 0,
      2: 0,
      1: 0,
    });
    showSuccess('Cash counter reset');
  };

  // Computations
  let totalNotes = 0;
  let totalAmount = 0;

  DENOMINATIONS.forEach((d) => {
    const c = counts[d.value] || 0;
    totalNotes += c;
    totalAmount += d.value * c;
  });

  const words = numberToIndianWords(totalAmount);

  const copyCashSlip = async () => {
    const breakdown = DENOMINATIONS.filter((d) => (counts[d.value] || 0) > 0)
      .map((d) => `${d.label} × ${counts[d.value]} = ₹${(d.value * (counts[d.value] || 0)).toLocaleString('en-IN')}`)
      .join('\n');

    const bName = (business.businessName || 'SENTHUR FINANCE').toUpperCase();
    const slip = `--- ${bName} CASH SLIP ---\nDate: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n${breakdown || 'No notes counted'}\n---------------------------------\nTotal Notes: ${totalNotes}\nTotal Cash: ₹${totalAmount.toLocaleString('en-IN')}\nIn Words: ${words}\n---------------------------------`;

    try {
      await copyTextToClipboard(slip);
      showSuccess('Cash breakdown slip copied');
    } catch {
      showSuccess('Copied to clipboard');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Total Tally Card */}
      <View
        style={[
          styles.totalCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: dynamicColors.primary,
          },
        ]}
      >
        <View style={styles.totalHeaderRow}>
          <View>
            <Text style={[styles.totalLabel, { color: dynamicColors.textSecondary }]}>TOTAL CASH VALUE</Text>
            <Text style={[styles.totalAmount, { color: dynamicColors.ink }]}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={[styles.totalNotesBadge, { backgroundColor: dynamicColors.primarySoft }]}>
            <Ionicons name="cash-outline" size={16} color={dynamicColors.primaryDark} />
            <Text style={[styles.totalNotesText, { color: dynamicColors.primaryDark }]}>
              {totalNotes} {totalNotes === 1 ? 'Note' : 'Notes'}
            </Text>
          </View>
        </View>

        <View style={[styles.wordsRow, { borderTopColor: dynamicColors.border }]}>
          <Text style={[styles.wordsPreview, { color: dynamicColors.textSecondary }]} numberOfLines={2}>
            {words}
          </Text>
        </View>

        <View style={styles.quickBarRow}>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: dynamicColors.surfaceMuted }]}
            onPress={copyCashSlip}
            activeOpacity={0.7}
            accessibilityLabel="Copy cash slip"
          >
            <Ionicons name="copy-outline" size={14} color={dynamicColors.ink} />
            <Text style={[styles.smallBtnText, { color: dynamicColors.ink }]} numberOfLines={1}>Copy Slip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: dynamicColors.primarySoft }]}
            onPress={() => onSendToWords?.(totalAmount)}
            activeOpacity={0.7}
            accessibilityLabel="Send to words"
          >
            <Ionicons name="text-outline" size={14} color={dynamicColors.primaryDark} />
            <Text style={[styles.smallBtnText, { color: dynamicColors.primaryDark }]} numberOfLines={1}>Full Words</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: dynamicColors.surfaceMuted }]}
            onPress={handleReset}
            activeOpacity={0.7}
            accessibilityLabel="Reset cash counter"
          >
            <Ionicons name="refresh-outline" size={14} color={dynamicColors.danger} />
            <Text style={[styles.smallBtnText, { color: dynamicColors.danger }]} numberOfLines={1}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Denominations List */}
      <View style={styles.listContainer}>
        {DENOMINATIONS.map((d) => {
          const count = counts[d.value] || 0;
          const subtotal = d.value * count;

          return (
            <View
              key={d.value}
              style={[
                styles.denomRow,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: count > 0 ? dynamicColors.primary : dynamicColors.border,
                },
              ]}
            >
              {/* Note Badge */}
              <View style={[styles.noteBadge, { backgroundColor: d.color }]}>
                <Text style={styles.noteBadgeText}>{d.label}</Text>
              </View>

              {/* Stepper Controls */}
              <View style={styles.stepperWrap}>
                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: dynamicColors.surfaceMuted }]}
                  onPress={() => decrement(d.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={16} color={dynamicColors.ink} />
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.countInput,
                    {
                      color: dynamicColors.ink,
                      backgroundColor: isDark ? '#27272A' : '#F4F4F6',
                    },
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
                  ]}
                  keyboardType="numeric"
                  value={count > 0 ? count.toString() : ''}
                  placeholder="0"
                  placeholderTextColor={dynamicColors.textTertiary}
                  onChangeText={(t) => {
                    const parsed = parseInt(t.replace(/[^0-9]/g, ''), 10);
                    updateCount(d.value, isNaN(parsed) ? 0 : parsed);
                  }}
                />

                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: dynamicColors.primary }]}
                  onPress={() => increment(d.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Subtotal */}
              <View style={styles.subtotalWrap}>
                <Text style={[styles.subtotalText, { color: count > 0 ? dynamicColors.ink : dynamicColors.textTertiary }]}>
                  ₹{subtotal.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Action shortcuts: Stacked Top and Bottom Pill Buttons */}
      <View style={styles.actionButtonsCol}>
        <PillButton
          title="Copy Cash Slip"
          variant="primary"
          iconName="share-outline"
          onPress={copyCashSlip}
          fullWidth
        />
        <PillButton
          title="Send to Calculator"
          variant="outline"
          iconName="calculator-outline"
          onPress={() => onSendToCalc?.(totalAmount)}
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
  totalCard: {
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
  totalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  totalLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  totalAmount: {
    fontFamily: typography.fontAmount,
    fontSize: 34,
    letterSpacing: 1.0,
  },
  totalNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  totalNotesText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  wordsRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  wordsPreview: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    letterSpacing: 0.8,
    lineHeight: 18,
  },
  quickBarRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  smallBtn: {
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  smallBtnText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  listContainer: {
    gap: 8,
    marginBottom: 18,
  },
  denomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  noteBadge: {
    width: 64,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBadgeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countInput: {
    width: 60,
    height: 34,
    borderRadius: 8,
    textAlign: 'center',
    fontFamily: typography.fontAmount,
    fontSize: 16,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  subtotalWrap: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  subtotalText: {
    fontFamily: typography.fontAmount,
    fontSize: 15,
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
