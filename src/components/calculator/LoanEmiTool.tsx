import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { typography } from '@/theme/typography';
import { CurrencyInput, Input, SelectModal, PillButton, Card } from '@/components/ui';
import { formatIndianCurrency } from '@/utils/formatters';

interface LoanEmiToolProps {
  initialPrincipal?: number;
  colors: any;
  isDark: boolean;
  onSendToWords?: (amount: number) => void;
}

export function LoanEmiTool({
  initialPrincipal = 0,
  colors: dynamicColors,
  isDark,
  onSendToWords,
}: LoanEmiToolProps) {
  const router = useRouter();
  const [principal, setPrincipal] = useState<number>(initialPrincipal);
  const [rate, setRate] = useState<string>('');
  const [tenureMonths, setTenureMonths] = useState<string>('');
  const [interestType, setInterestType] = useState<string>('REDUCING_BALANCE');

  useEffect(() => {
    if (initialPrincipal && initialPrincipal > 0) {
      setPrincipal(initialPrincipal);
    }
  }, [initialPrincipal]);

  // Calculations
  const p = principal || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = parseInt(tenureMonths, 10) || 1;

  let emi = 0;
  let totalInterest = 0;

  if (interestType === 'REDUCING_BALANCE' && r > 0) {
    emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    totalInterest = emi * n - p;
  } else {
    // Simple / Flat / Bullet
    totalInterest = p * (parseFloat(rate) / 100) * (n / 12);
    emi = (p + totalInterest) / n;
  }

  const totalPayable = p + totalInterest;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <CurrencyInput
        label="Principal Loan Amount"
        value={principal}
        onChangeValue={setPrincipal}
        quickAmounts={[50000, 100000, 500000]}
      />

      <SelectModal
        label="Interest Calculation Scheme"
        selectedValue={interestType}
        onSelect={setInterestType}
        options={[
          { label: 'Reducing Balance EMI', value: 'REDUCING_BALANCE', subtitle: 'Standard monthly reducing balance' },
          { label: 'Simple Interest', value: 'SIMPLE', subtitle: 'Interest calculated on principal only' },
          { label: 'Flat Rate Scheme', value: 'FLAT', subtitle: 'Equal interest per installment on initial principal' },
          { label: 'Interest Only (Bullet)', value: 'INTEREST_ONLY', subtitle: 'Monthly interest, principal at end' },
        ]}
      />

      <View style={styles.inputRow}>
        <View style={styles.halfCol}>
          <Input
            label="Annual Rate (% p.a.)"
            keyboardType="numeric"
            value={rate}
            onChangeText={setRate}
            placeholder="24"
          />
        </View>
        <View style={styles.halfCol}>
          <Input
            label="Tenure (Months)"
            keyboardType="numeric"
            value={tenureMonths}
            onChangeText={setTenureMonths}
            placeholder="12"
          />
        </View>
      </View>

      {/* Hero Result Card */}
      <Card variant="dark" style={styles.resultCard}>
        <Text style={[styles.resultLabel, { color: dynamicColors.primary }]}>ESTIMATED MONTHLY INSTALLMENT (EMI)</Text>
        <Text style={styles.resultEmi}>{formatIndianCurrency(emi).formatted}</Text>

        <View style={styles.resultBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Total Interest</Text>
            <Text style={styles.breakdownValue}>{formatIndianCurrency(totalInterest).formatted}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Total Payable</Text>
            <Text style={styles.breakdownValue}>{formatIndianCurrency(totalPayable).formatted}</Text>
          </View>
        </View>
      </Card>

      {/* Action shortcuts: Stacked Top and Bottom Pill Buttons */}
      <View style={styles.actionButtonsCol}>
        <PillButton
          title="Apply to New Loan"
          variant="primary"
          iconName="arrow-forward"
          onPress={() => router.push('/loans/new' as any)}
          fullWidth
        />
        <PillButton
          title="Convert to Words"
          variant="outline"
          iconName="text-outline"
          onPress={() => onSendToWords?.(p)}
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
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  resultCard: {
    marginVertical: 18,
    padding: 22,
  },
  resultLabel: {
    ...typography.label,
    marginBottom: 8,
  },
  resultEmi: {
    fontFamily: typography.fontAmount,
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: 0.9,
  },
  resultBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  breakdownValue: {
    fontFamily: typography.fontAmount,
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 4,
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
