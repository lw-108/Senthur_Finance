import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, DisplayTitle, Card, ListRow, PillButton } from '@/components/ui';
import { useTheme } from '@/store/useThemeStore';

export default function QuickAddScreen() {
  const router = useRouter();
  const { colors: dynamicColors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;

  return (
    <Screen scrollable>
      <DisplayTitle
        title="Quick Actions"
        subtitle="Disburse loan, collect repayment or add borrower"
      />

      <View style={[styles.actionsList, isTablet && styles.containerTablet]}>
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

        {/* Footer Navigation Buttons */}
        <View
          style={[
            styles.footerButtons,
            isTablet && styles.footerButtonsTablet,
          ]}
        >
          <PillButton
            title="Back"
            iconName="chevron-back"
            iconPosition="left"
            variant="secondary"
            size={isSmallScreen ? 'sm' : 'md'}
            onPress={() => router.replace('/' as any)}
            style={styles.backBtn}
            textStyle={isSmallScreen ? styles.btnTextSmall : undefined}
          />
          <PillButton
            title="Create Loan"
            iconName="arrow-forward"
            iconPosition="right"
            variant="primary"
            size={isSmallScreen ? 'sm' : 'md'}
            onPress={() => router.push('/loans/new' as any)}
            style={styles.continueBtn}
            textStyle={isSmallScreen ? styles.btnTextSmall : undefined}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsList: {
    gap: 12,
    marginTop: 10,
    width: '100%',
  },
  containerTablet: {
    maxWidth: 600,
    alignSelf: 'center',
  },
  actionCard: {
    padding: 4,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 44,
    width: '100%',
  },
  footerButtonsTablet: {
    maxWidth: 520,
    alignSelf: 'center',
  },
  backBtn: {
    flex: 0.38,
    minHeight: 46,
  },
  continueBtn: {
    flex: 0.62,
    minHeight: 46,
  },
  btnTextSmall: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
