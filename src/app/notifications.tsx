import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, DisplayTitle, Card, ListRow, Badge, useToast } from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { useLoans } from '@/features/loans/hooks';
import { useCustomers } from '@/features/customers/hooks';
import { formatIndianCurrency, formatDate } from '@/utils/formatters';
import {
  openWhatsAppReminder,
  openSmsReminder,
  formatTemplate,
  DEFAULT_REMINDER_TEMPLATES,
} from '@/features/notifications/reminderService';

export default function NotificationsScreen() {
  const { colors: dynamicColors } = useTheme();
  const { business } = useBusinessSettingsStore();
  const { showSuccess } = useToast();
  const { data: loans } = useLoans();
  const { data: customers } = useCustomers();

  const overdueLoans = (loans || []).filter((l) => l.status === 'OVERDUE');
  const activeLoans = (loans || []).filter((l) => l.status === 'ACTIVE');

  const handleRemindBorrower = (loan: any, type: 'UPCOMING_DUE' | 'OVERDUE_NUDGE') => {
    const template =
      type === 'OVERDUE_NUDGE'
        ? DEFAULT_REMINDER_TEMPLATES.OVERDUE_NUDGE
        : DEFAULT_REMINDER_TEMPLATES.UPCOMING_DUE;

    const message = formatTemplate(template, {
      name: loan.customerName,
      amount: formatIndianCurrency(loan.installmentAmount, { isMinorUnit: true }).formatted,
      dueDate: loan.nextDueDate ? formatDate(loan.nextDueDate) : 'today',
      loanNo: loan.loanNumber,
      businessName: business.businessName || 'Finance Ledger',
    });

    const borrower = customers?.find((c) => c.id === loan.customerId);
    const phone = borrower?.phone || borrower?.whatsapp || '';

    openWhatsAppReminder(phone, message);
    showSuccess(`WhatsApp reminder opened for ${loan.customerName}`);
  };

  return (
    <Screen scrollable>
      <Header
        showBack
        title="Alerts & Digest"
        showSupportPill={false}
      />

      <DisplayTitle
        title="Daily Alerts"
        subtitle="Morning collection digest, overdue alerts and customer nudges"
      />

      {/* Morning Digest Card */}
      <Card variant="lavender" style={styles.digestCard}>
        <View style={styles.digestHeader}>
          <Ionicons name="sunny" size={24} color={dynamicColors.warning} />
          <Text style={[styles.digestTitle, { color: dynamicColors.ink }]}>Morning Collection Digest</Text>
        </View>
        <Text style={[styles.digestBody, { color: dynamicColors.textSecondary }]}>
          • {activeLoans.length} active borrower accounts active{'\n'}
          • {overdueLoans.length} loan accounts currently overdue needing follow-up{'\n'}
          • Next automated interest accrual scheduled tonight at 00:30 AM
        </Text>
      </Card>

      {/* Overdue Urgent Action Items */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: dynamicColors.ink }]}>Overdue Follow-up Required</Text>
      </View>

      <Card variant="surface" style={styles.listCard}>
        {overdueLoans.length > 0 ? (
          overdueLoans.map((l) => (
            <View key={l.id} style={[styles.alertRow, { borderBottomColor: dynamicColors.border }]}>
              <View style={styles.alertInfo}>
                <Text style={[styles.borrowerName, { color: dynamicColors.ink }]}>{l.customerName}</Text>
                <Text style={[styles.alertSubtitle, { color: dynamicColors.textSecondary }]}>
                  {l.loanNumber} • {l.daysOverdue} days overdue
                </Text>
                <Text style={styles.overdueAmount}>
                  Pending: {formatIndianCurrency(l.outstandingPrincipal, { isMinorUnit: true }).formatted}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.nudgeBtn}
                onPress={() => handleRemindBorrower(l, 'OVERDUE_NUDGE')}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                <Text style={styles.nudgeBtnText}>Nudge</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <ListRow
            title="All loans in good standing!"
            subtitle="No overdue accounts right now"
            iconName="checkmark-circle-outline"
            iconColor={dynamicColors.success}
          />
        )}
      </Card>

      {/* Upcoming Due Reminders */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: dynamicColors.ink }]}>Upcoming Due Reminders</Text>
      </View>

      <Card variant="surface" style={styles.listCard}>
        {activeLoans.map((l) => (
          <View key={l.id} style={[styles.alertRow, { borderBottomColor: dynamicColors.border }]}>
            <View style={styles.alertInfo}>
              <Text style={[styles.borrowerName, { color: dynamicColors.ink }]}>{l.customerName}</Text>
              <Text style={[styles.alertSubtitle, { color: dynamicColors.textSecondary }]}>
                {l.loanNumber} • Due on {formatDate(l.nextDueDate)}
              </Text>
              <Text style={styles.dueAmount}>
                EMI: {formatIndianCurrency(l.installmentAmount, { isMinorUnit: true }).formatted}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.remindBtn, { backgroundColor: dynamicColors.primarySoft }]}
              onPress={() => handleRemindBorrower(l, 'UPCOMING_DUE')}
            >
              <Ionicons name="notifications-outline" size={15} color={dynamicColors.primaryDark} />
              <Text style={[styles.remindBtnText, { color: dynamicColors.primaryDark }]}>Remind</Text>
            </TouchableOpacity>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  digestCard: {
    padding: 18,
    marginVertical: 10,
  },
  digestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  digestTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: 1.0,
  },
  digestBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  listCard: {
    padding: 8,
    marginBottom: 10,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alertInfo: {
    flex: 1,
  },
  borrowerName: {
    ...typography.bodyMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  alertSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overdueAmount: {
    fontFamily: typography.fontAmount,
    fontSize: 12,
    color: colors.danger,
    marginTop: 2,
    letterSpacing: 0.8,
  },
  dueAmount: {
    fontFamily: typography.fontAmount,
    fontSize: 12,
    color: colors.warning,
    marginTop: 2,
    letterSpacing: 0.8,
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 5,
  },
  nudgeBtnText: {
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 1.0,
  },
  remindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 5,
  },
  remindBtnText: {
    fontFamily: typography.fontHeadline,
    color: colors.primaryDark,
    fontSize: 12,
    letterSpacing: 1.0,
  },
});
