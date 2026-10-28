import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Screen, Header, DisplayTitle, Card, ListRow, useToast } from '@/components/ui';
import { colors } from '@/theme/colors';
import { useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { usePayments } from '@/features/payments/hooks';
import { useLoans } from '@/features/loans/hooks';
import { useCustomers } from '@/features/customers/hooks';
import {
  exportDailyCollectionReportPdf,
  exportOverdueAuditPdf,
  exportCsvReport,
  shareFile,
} from '@/features/reports/exportEngine';
import { formatIndianCurrency } from '@/utils/formatters';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { business } = useBusinessSettingsStore();
  const { showSuccess, showError } = useToast();
  const { data: payments } = usePayments();
  const { data: loans } = useLoans();
  const { data: customers } = useCustomers();

  const handleDailyCollectionPdf = async () => {
    try {
      const uri = await exportDailyCollectionReportPdf(payments || []);
      await shareFile(uri, 'Daily Collection Sheet');
      showSuccess('Daily collection sheet ready');
    } catch (e: any) {
      showError('Failed to generate daily collection report');
    }
  };

  const handleDailyCollectionCsv = async () => {
    try {
      const headers = ['Receipt No', 'Customer Name', 'Loan No', 'Date', 'Mode', 'Amount (₹)'];
      const rows = (payments || []).map((p) => [
        p.receiptNumber,
        p.customerName,
        p.loanNumber,
        p.paidOn,
        p.mode,
        (p.amount / 100).toFixed(2),
      ]);
      const uri = await exportCsvReport('Daily_Collections', headers, rows);
      await shareFile(uri, 'Daily Collections CSV');
      showSuccess('CSV exported');
    } catch {
      showError('Failed to export CSV');
    }
  };

  const handleOverduePdf = async () => {
    try {
      const overdueLoans = (loans || []).filter((l) => l.status === 'OVERDUE');
      const uri = await exportOverdueAuditPdf(overdueLoans);
      await shareFile(uri, 'Overdue Loans Audit Sheet');
      showSuccess('Overdue audit PDF ready');
    } catch {
      showError('Failed to generate overdue PDF');
    }
  };

  const handleOverdueCsv = async () => {
    try {
      const overdueLoans = (loans || []).filter((l) => l.status === 'OVERDUE');
      const headers = ['Loan No', 'Customer Name', 'Outstanding (₹)', 'Days Overdue', 'Penalty (₹)'];
      const rows = overdueLoans.map((l) => [
        l.loanNumber,
        l.customerName,
        (l.outstandingPrincipal / 100).toFixed(2),
        l.daysOverdue,
        (l.penaltyAccrued / 100).toFixed(2),
      ]);
      const uri = await exportCsvReport('Overdue_Loans_Report', headers, rows);
      await shareFile(uri, 'Overdue Report CSV');
      showSuccess('Overdue report exported');
    } catch {
      showError('Failed to export report');
    }
  };

  const handleFullBackupJson = async () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        business: business.businessName || 'Senthur Finance',
        customers: customers || [],
        loans: loans || [],
        payments: payments || [],
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const uri = await exportCsvReport('SenthurFinance_Full_Backup', ['data'], [[jsonStr]]);
      await shareFile(uri, 'Full Ledger JSON Backup');
      showSuccess('Full JSON backup generated');
    } catch {
      showError('Failed to generate full backup');
    }
  };

  return (
    <Screen scrollable>
      <Header
        showBack
        title="Reports & Exports"
        showSupportPill={false}
      />

      <DisplayTitle
        title="Business Reports"
        subtitle="Export statements, daily collections, overdue audit & full backups"
      />

      <View style={styles.list}>
        <Card variant="surface" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.boxBorder, borderWidth: 1 }]}>
          <ListRow
            title="Daily Collection Sheet (PDF)"
            subtitle="Formatted PDF with branding for daily cash reconciliation"
            iconName="document-text-outline"
            iconColor={colors.success}
            iconBgColor={colors.successLight}
            showChevron
            onPress={handleDailyCollectionPdf}
          />

          <ListRow
            title="Daily Collection Sheet (Excel / CSV)"
            subtitle="Spreadsheet with receipt number, borrower, mode, amount"
            iconName="grid-outline"
            iconColor={colors.success}
            iconBgColor={colors.successLight}
            showChevron
            onPress={handleDailyCollectionCsv}
          />

          <ListRow
            title="Overdue Audit Sheet (PDF)"
            subtitle="Formal audit document with days overdue, pending principal & penalties"
            iconName="alert-circle-outline"
            iconColor={colors.danger}
            iconBgColor={colors.dangerLight}
            showChevron
            onPress={handleOverduePdf}
          />

          <ListRow
            title="Overdue & Defaulters Aging (CSV)"
            subtitle="Aging buckets (0-30, 31-60, 61-90, 90+ days) and penalties"
            iconName="warning-outline"
            iconColor={colors.danger}
            iconBgColor={colors.dangerLight}
            showChevron
            onPress={handleOverdueCsv}
          />

          <ListRow
            title="Full Data Backup (JSON)"
            subtitle="Complete offline JSON snapshot of all borrowers, loans & ledger"
            iconName="cloud-download-outline"
            iconColor={colors.primaryDark}
            iconBgColor={colors.primarySoft}
            showChevron
            onPress={handleFullBackupJson}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 10,
    marginBottom: 40,
  },
  card: {
    padding: 6,
  },
});
