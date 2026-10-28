import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, DisplayTitle, Card, ListRow } from '@/components/ui';
import { useTheme } from '@/store/useThemeStore';

export default function QuickAddScreen() {
  const router = useRouter();
  const { colors: dynamicColors, isDark } = useTheme();

  return (
    <Screen>
      <DisplayTitle
        title="Quick Actions"
        subtitle="Disburse loan, collect repayment or add borrower"
      />

      <View style={styles.actionsList}>
        <Card variant="surface" style={styles.actionCard}>
          <ListRow
            title="Record Repayment"
            subtitle="Collect installment, interest or prepayment"
            iconName="cash-outline"
            iconBgColor={isDark ? 'rgba(16, 185, 129, 0.2)' : dynamicColors.successLight}
            iconColor={dynamicColors.success}
            showChevron
            onPress={() => router.push('/payments/new' as any)}
          />
        </Card>

        <Card variant="surface" style={styles.actionCard}>
          <ListRow
            title="Create New Loan"
            subtitle="Disburse with custom interest & tenure"
            iconName="add-circle-outline"
            iconBgColor={isDark ? `${dynamicColors.primary}25` : dynamicColors.primarySoft}
            iconColor={dynamicColors.primaryDark}
            showChevron
            onPress={() => router.push('/loans/new' as any)}
          />
        </Card>

        <Card variant="surface" style={styles.actionCard}>
          <ListRow
            title="Add New Customer"
            subtitle="Record identity proofs, address & guarantor"
            iconName="person-add-outline"
            iconBgColor={isDark ? 'rgba(255, 255, 255, 0.08)' : dynamicColors.surfaceMuted}
            iconColor={dynamicColors.ink}
            showChevron
            onPress={() => router.push('/customers/new' as any)}
          />
        </Card>

        <Card variant="surface" style={styles.actionCard}>
          <ListRow
            title="Loan Calculator"
            subtitle="Calculate EMI, reducing balance & maturity"
            iconName="calculator-outline"
            iconBgColor={isDark ? 'rgba(59, 130, 246, 0.2)' : dynamicColors.infoLight}
            iconColor={dynamicColors.info}
            showChevron
            onPress={() => router.push('/calculator' as any)}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsList: {
    gap: 12,
    marginTop: 10,
  },
  actionCard: {
    padding: 4,
  },
});
