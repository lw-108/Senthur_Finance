import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { PillButton } from '@/components/ui/PillButton';
import { useToast } from '@/components/ui/Toast';
import { copyTextToClipboard } from '@/utils/clipboard';

interface StandardCalculatorProps {
  colors: any;
  isDark: boolean;
  onSendToWords?: (amount: number) => void;
  onSendToLoan?: (amount: number) => void;
}

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

export function StandardCalculator({
  colors: dynamicColors,
  isDark,
  onSendToWords,
  onSendToLoan,
}: StandardCalculatorProps) {
  const { showSuccess } = useToast();

  const [currentValue, setCurrentValue] = useState<string>('0');
  const [operator, setOperator] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [isNewInput, setIsNewInput] = useState<boolean>(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Helper to format display number nicely with Indian numbering system
  const formatDisplay = (valStr: string) => {
    if (valStr === 'Error' || valStr === 'Infinity' || valStr === '-Infinity') return valStr;
    const parts = valStr.split('.');
    let intPart = parts[0];
    const isNegative = intPart.startsWith('-');
    if (isNegative) intPart = intPart.substring(1);

    if (intPart.length > 3) {
      const lastThree = intPart.substring(intPart.length - 3);
      const otherNumbers = intPart.substring(0, intPart.length - 3);
      intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }
    const signed = (isNegative ? '-' : '') + intPart;
    return parts.length > 1 ? signed + '.' + parts[1] : signed;
  };

  // Button actions with standard calculator C (Clear entry) vs AC (All Clear) architecture
  const handleTap = useCallback(
    (
      type: 'number' | 'operator' | 'clear' | 'allClear' | 'posneg' | 'percentage' | 'equal' | 'backspace',
      value?: string
    ) => {
      if (type === 'number' && value !== undefined) {
        if (isNewInput) {
          setCurrentValue(value === '.' ? '0.' : value);
          setIsNewInput(false);
        } else {
          if (value === '.' && currentValue.includes('.')) return;
          if (currentValue === '0' && value !== '.') {
            setCurrentValue(value);
          } else {
            setCurrentValue(currentValue + value);
          }
        }
      }

      // Enhanced Clear: if current entry is non-zero, clear entry (C) while preserving ongoing calculation;
      // if already zero, perform All Clear (AC)
      if (type === 'clear') {
        if (currentValue !== '0') {
          setCurrentValue('0');
          setIsNewInput(true);
        } else {
          setCurrentValue('0');
          setOperator(null);
          setPreviousValue(null);
          setIsNewInput(true);
        }
      }

      // Force All Clear (e.g. on long press)
      if (type === 'allClear') {
        setCurrentValue('0');
        setOperator(null);
        setPreviousValue(null);
        setIsNewInput(true);
        showSuccess('Calculator reset');
      }

      if (type === 'backspace') {
        if (currentValue.length > 1 && currentValue !== '0') {
          setCurrentValue(currentValue.slice(0, -1));
        } else {
          setCurrentValue('0');
          setIsNewInput(true);
        }
      }

      if (type === 'posneg') {
        const num = parseFloat(currentValue);
        if (!isNaN(num)) {
          setCurrentValue((-1 * num).toString());
        }
      }

      if (type === 'percentage') {
        const current = parseFloat(currentValue);
        if (isNaN(current)) return;

        if (previousValue !== null && operator) {
          const prev = parseFloat(previousValue);
          const percentVal = (prev * current) / 100;
          setCurrentValue(percentVal.toString());
        } else {
          setCurrentValue((current / 100).toString());
        }
      }

      if (type === 'operator' && value) {
        if (operator !== null && previousValue !== null && !isNewInput) {
          const current = parseFloat(currentValue);
          const previous = parseFloat(previousValue);
          let evaluated = 0;
          if (operator === '+') evaluated = previous + current;
          if (operator === '-') evaluated = previous - current;
          if (operator === '×') evaluated = previous * current;
          if (operator === '÷') evaluated = current !== 0 ? previous / current : 0;

          evaluated = Math.round(evaluated * 100000000) / 100000000;
          setPreviousValue(evaluated.toString());
          setCurrentValue(evaluated.toString());
        } else {
          setPreviousValue(currentValue);
        }
        setOperator(value);
        setIsNewInput(true);
      }

      if (type === 'equal') {
        if (operator && previousValue !== null) {
          const current = parseFloat(currentValue);
          const previous = parseFloat(previousValue);
          let evaluated = 0;
          if (operator === '+') evaluated = previous + current;
          if (operator === '-') evaluated = previous - current;
          if (operator === '×') evaluated = previous * current;
          if (operator === '÷') {
            if (current === 0) {
              setCurrentValue('Error');
              setOperator(null);
              setPreviousValue(null);
              setIsNewInput(true);
              return;
            }
            evaluated = previous / current;
          }

          evaluated = Math.round(evaluated * 100000000) / 100000000;
          const resultStr = evaluated.toString();
          const exprStr = `${formatDisplay(previousValue)} ${operator} ${formatDisplay(currentValue)}`;

          // Add to calculation history tape
          setHistory((prev) => [
            {
              id: Date.now().toString(),
              expression: exprStr,
              result: resultStr,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
            ...prev.slice(0, 20),
          ]);

          setCurrentValue(resultStr);
          setOperator(null);
          setPreviousValue(null);
          setIsNewInput(true);
        }
      }
    },
    [currentValue, operator, previousValue, isNewInput, showSuccess]
  );

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(currentValue);
      showSuccess(`Copied: ${formatDisplay(currentValue)}`);
    } catch {
      showSuccess('Amount copied');
    }
  };

  const currentNumberVal = parseFloat(currentValue) || 0;
  const isClearEntry = currentValue !== '0';

  return (
    <View style={styles.container}>
      {/* Expression Breadcrumb & Quick Actions Bar */}
      <View style={styles.topToolbar}>
        <View style={styles.expressionContainer}>
          <Text
            style={[
              styles.expressionText,
              {
                color: dynamicColors.textSecondary,
                fontFamily: typography.fontSpaceGrotesk,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="head"
          >
            {previousValue !== null && operator ? `${formatDisplay(previousValue)} ${operator}` : ' '}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: dynamicColors.surfaceMuted }]}
            onPress={handleCopy}
            activeOpacity={0.7}
            accessibilityLabel="Copy current amount"
          >
            <Ionicons name="copy-outline" size={14} color={dynamicColors.ink} />
            <Text style={[styles.actionBtnLabel, { color: dynamicColors.ink }]} numberOfLines={1}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: dynamicColors.primarySoft }]}
            onPress={() => onSendToWords?.(currentNumberVal)}
            activeOpacity={0.7}
            accessibilityLabel="Convert to words"
          >
            <Ionicons name="text-outline" size={14} color={dynamicColors.primaryDark} />
            <Text style={[styles.actionBtnLabel, { color: dynamicColors.primaryDark }]} numberOfLines={1}>Words</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: dynamicColors.surfaceMuted }]}
            onPress={() => setShowHistory(!showHistory)}
            activeOpacity={0.7}
            accessibilityLabel="Calculation history tape"
          >
            <Ionicons name="time-outline" size={14} color={dynamicColors.ink} />
            <Text style={[styles.actionBtnLabel, { color: dynamicColors.ink }]} numberOfLines={1}>Tape ({history.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Numeric Display Area */}
      <View
        style={[
          styles.displayArea,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: dynamicColors.border,
          },
        ]}
      >
        <Text
          style={[styles.displayText, { color: dynamicColors.ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {formatDisplay(currentValue)}
        </Text>
      </View>

      {/* History Tape Drawer (Collapsible) */}
      {showHistory && (
        <View
          style={[
            styles.historyContainer,
            {
              backgroundColor: isDark ? '#181C26' : '#F9FAFB',
              borderColor: dynamicColors.border,
            },
          ]}
        >
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: dynamicColors.ink }]}>Calculation Tape</Text>
            {history.length > 0 && (
              <TouchableOpacity
                onPress={() => setHistory([])}
                style={[
                  styles.clearTapeBtn,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={13} color={dynamicColors.danger} />
                <Text style={[styles.clearTapeText, { color: dynamicColors.danger }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {history.length === 0 ? (
            <Text style={[styles.emptyTapeText, { color: dynamicColors.textTertiary }]}>No recent calculations</Text>
          ) : (
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {history.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.historyRow, { borderBottomColor: dynamicColors.border }]}
                  onPress={() => {
                    setCurrentValue(item.result);
                    setIsNewInput(true);
                    setShowHistory(false);
                  }}
                >
                  <Text
                    style={[
                      styles.historyExpr,
                      {
                        color: dynamicColors.textSecondary,
                        fontFamily: typography.fontSpaceGrotesk,
                      },
                    ]}
                  >
                    {item.expression} =
                  </Text>
                  <Text style={[styles.historyRes, { color: dynamicColors.primary }]}>
                    {formatDisplay(item.result)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Keypad Grid */}
      <View style={styles.keypad}>
        {/* Row 1: Clear (C / AC), +/-, %, ÷ */}
        <View style={styles.row}>
          <CalcButton
            label={isClearEntry ? 'C' : 'AC'}
            variant="clear"
            onPress={() => handleTap('clear')}
            onLongPress={() => handleTap('allClear')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel={isClearEntry ? 'Clear current entry. Press and hold to clear all' : 'All Clear'}
          />
          <CalcButton
            label="+/-"
            variant="secondary"
            onPress={() => handleTap('posneg')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Plus or minus toggle"
          />
          <CalcButton
            label="%"
            variant="secondary"
            onPress={() => handleTap('percentage')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Percentage"
          />
          <CalcButton
            label="÷"
            variant="operator"
            isActive={operator === '÷'}
            onPress={() => handleTap('operator', '÷')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Divide"
          />
        </View>

        {/* Row 2: 7, 8, 9, × */}
        <View style={styles.row}>
          <CalcButton label="7" onPress={() => handleTap('number', '7')} colors={dynamicColors} isDark={isDark} />
          <CalcButton label="8" onPress={() => handleTap('number', '8')} colors={dynamicColors} isDark={isDark} />
          <CalcButton label="9" onPress={() => handleTap('number', '9')} colors={dynamicColors} isDark={isDark} />
          <CalcButton
            label="×"
            variant="operator"
            isActive={operator === '×'}
            onPress={() => handleTap('operator', '×')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Multiply"
          />
        </View>

        {/* Row 3: 4, 5, 6, - */}
        <View style={styles.row}>
          <CalcButton label="4" onPress={() => handleTap('number', '4')} colors={dynamicColors} isDark={isDark} />
          <CalcButton label="5" onPress={() => handleTap('number', '5')} colors={dynamicColors} isDark={isDark} />
          <CalcButton label="6" onPress={() => handleTap('number', '6')} colors={dynamicColors} isDark={isDark} />
          <CalcButton
            label="-"
            variant="operator"
            isActive={operator === '-'}
            onPress={() => handleTap('operator', '-')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Minus"
          />
        </View>

        {/* Row 4: 1, 2, 3, + */}
        <View style={styles.row}>
          <CalcButton label="1" onPress={() => handleTap('number', '1')} colors={dynamicColors} isDark={isDark} />
          <CalcButton label="2" onPress={() => handleTap('number', '2')} colors={dynamicColors} isDark={isDark} />
          <CalcButton label="3" onPress={() => handleTap('number', '3')} colors={dynamicColors} isDark={isDark} />
          <CalcButton
            label="+"
            variant="operator"
            isActive={operator === '+'}
            onPress={() => handleTap('operator', '+')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Plus"
          />
        </View>

        {/* Row 5: 0, ., ⌫, = */}
        <View style={styles.row}>
          <CalcButton label="0" onPress={() => handleTap('number', '0')} colors={dynamicColors} isDark={isDark} />
          <CalcButton
            label="."
            onPress={() => handleTap('number', '.')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Decimal point"
          />
          <CalcButton
            icon="backspace-outline"
            label="Backspace"
            variant="secondary"
            onPress={() => handleTap('backspace')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Backspace"
          />
          <CalcButton
            label="="
            variant="operator"
            onPress={() => handleTap('equal')}
            colors={dynamicColors}
            isDark={isDark}
            accessibilityLabel="Equals"
          />
        </View>
      </View>

      {/* Action shortcuts: Stacked Top and Bottom Pill Buttons */}
      <View style={styles.actionButtonsCol}>
        <PillButton
          title="Send to Number in Words"
          variant="primary"
          iconName="document-text-outline"
          onPress={() => onSendToWords?.(currentNumberVal)}
          fullWidth
        />
        <PillButton
          title="Send to Loan EMI Calculator"
          variant="outline"
          iconName="pie-chart-outline"
          onPress={() => onSendToLoan?.(currentNumberVal)}
          fullWidth
        />
      </View>
    </View>
  );
}

// Individual Calculator Button matching Space Grotesk arithmetic symbols & enhanced Clear
interface CalcButtonProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'number' | 'secondary' | 'operator' | 'clear';
  isActive?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  colors: any;
  isDark: boolean;
  accessibilityLabel?: string;
}

function CalcButton({
  label,
  icon,
  variant = 'number',
  isActive = false,
  onPress,
  onLongPress,
  colors: dynamicColors,
  isDark,
  accessibilityLabel,
}: CalcButtonProps) {
  let bgColor = isDark ? '#2C2C2E' : '#FFFFFF';
  let textColor = dynamicColors.ink;
  let borderColor = dynamicColors.border;

  const isClear = variant === 'clear';
  const isOperator = variant === 'operator';
  const isSecondary = variant === 'secondary';

  if (isClear) {
    if (label === 'C') {
      // Active Clear Entry: high contrast warning/danger highlight
      bgColor = isDark ? 'rgba(239, 68, 68, 0.22)' : '#FEE2E2';
      borderColor = isDark ? 'rgba(239, 68, 68, 0.45)' : '#FCA5A5';
      textColor = isDark ? '#FCA5A5' : '#DC2626';
    } else {
      // AC (All Clear) idle state: distinct soft tone
      bgColor = isDark ? '#363638' : '#F1F1F4';
      borderColor = isDark ? '#4A4A52' : '#E0E0E6';
      textColor = isDark ? '#F87171' : '#E11D48';
    }
  } else if (isSecondary) {
    bgColor = isDark ? '#3A3A3C' : dynamicColors.surfaceMuted;
    textColor = dynamicColors.primaryDark;
  } else if (isOperator) {
    bgColor = dynamicColors.primary;
    textColor = '#FFFFFF';
    borderColor = dynamicColors.primary;
  }

  if (isActive) {
    bgColor = isDark ? '#FFFFFF' : dynamicColors.primaryDark;
    textColor = isDark ? dynamicColors.primary : '#FFFFFF';
  }

  // Arithmetic symbols use Google Fonts Space Grotesk
  const isMathSymbol = label
    ? ['+', '-', '×', '÷', '=', '+/-', '%', '.', 'C', 'AC'].includes(label)
    : false;
  const isArithmeticOp = label ? ['+', '-', '×', '÷', '='].includes(label) : false;

  const fontToUse = isMathSymbol ? typography.fontSpaceGrotesk : typography.fontAmount;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
    >
      {icon ? (
        <Ionicons name={icon} size={22} color={textColor} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color: textColor,
              fontFamily: fontToUse,
              fontSize: isArithmeticOp ? 28 : label === 'AC' || label === '+/-' ? 20 : 24,
              fontWeight: isMathSymbol ? '700' : '600',
            },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 24,
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
    paddingHorizontal: 2,
  },
  expressionContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  expressionText: {
    fontSize: 15,
    letterSpacing: 0.8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
    alignItems: 'center',
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 8,
    flexShrink: 0,
  },
  actionBtnLabel: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  displayArea: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 80,
  },
  displayText: {
    fontFamily: typography.fontAmount,
    fontSize: 42,
    letterSpacing: 1.0,
    textAlign: 'right',
  },
  historyContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    maxHeight: 180,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  clearTapeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  clearTapeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  emptyTapeText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
    letterSpacing: 0.8,
  },
  historyList: {
    maxHeight: 130,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  historyExpr: {
    fontSize: 13,
    letterSpacing: 0.8,
  },
  historyRes: {
    fontFamily: typography.fontAmount,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  keypad: {
    gap: 10,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    aspectRatio: 1.15,
    maxHeight: 74,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  actionButtonsCol: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 20,
    marginBottom: 24,
    width: '100%',
  },
});
