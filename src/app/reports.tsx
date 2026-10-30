import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Header, DisplayTitle, Card, ListRow, useToast } from '@/components/ui';
import { useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { useLoanProductsStore } from '@/store/useLoanProductsStore';
import { usePayments } from '@/features/payments/hooks';
import { useLoans } from '@/features/loans/hooks';
import { useCustomers } from '@/features/customers/hooks';
import {
  exportDailyCollectionReportPdf,
  exportOverdueAuditPdf,
  exportCsvReport,
  exportJsonReport,
  exportBorrowersCsv,
  exportLoansCsv,
  exportPaymentsCsv,
  shareFile,
} from '@/features/reports/exportEngine';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { business, currency } = useBusinessSettingsStore();
  const { products: loanProducts } = useLoanProductsStore();
  const { showSuccess, showError } = useToast();
  const { data: payments } = usePayments();
  const { data: loans } = useLoans();
  const { data: customers } = useCustomers();

  const handleDailyCollectionPdf = async () => {
    try {
      const uri = await exportDailyCollectionReportPdf(payments || [], business.businessName);
      await shareFile(uri, 'Daily Collection Sheet', 'application/pdf');
      showSuccess('Daily collection sheet ready');
    } catch {
      showError('Failed to generate daily collection report');
    }
  };

  const handleDailyCollectionCsv = async () => {
    try {
      const headers = ['Receipt No', 'Customer Name', 'Loan No', 'Date', 'Mode', 'Amount (INR)'];
      const rows = (payments || []).map((p) => [
        p.receiptNumber,
        p.customerName,
        p.loanNumber,
        p.paidOn,
        p.mode,
        (p.amount / 100).toFixed(2),
      ]);
      const uri = await exportCsvReport('Daily_Collections', headers, rows);
      await shareFile(uri, 'Daily Collections CSV', 'text/csv');
      showSuccess('Daily collections CSV downloaded');
    } catch {
      showError('Failed to export daily collections CSV');
    }
  };

  const handleOverduePdf = async () => {
    try {
      const overdueLoans = (loans || []).filter((l) => l.status === 'OVERDUE');
      const uri = await exportOverdueAuditPdf(overdueLoans, business.businessName, business.phone);
      await shareFile(uri, 'Overdue Loans Audit Sheet', 'application/pdf');
      showSuccess('Overdue audit report ready');
    } catch {
      showError('Failed to generate overdue PDF report');
    }
  };

  const handleOverdueCsv = async () => {
    try {
      const overdueLoans = (loans || []).filter((l) => l.status === 'OVERDUE');
      const headers = ['Loan No', 'Customer Name', 'Outstanding (INR)', 'Days Overdue', 'Penalty (INR)'];
      const rows = overdueLoans.map((l) => [
        l.loanNumber,
        l.customerName,
        (l.outstandingPrincipal / 100).toFixed(2),
        l.daysOverdue,
        (l.penaltyAccrued / 100).toFixed(2),
      ]);
      const uri = await exportCsvReport('Overdue_Loans_Report', headers, rows);
      await shareFile(uri, 'Overdue Report CSV', 'text/csv');
      showSuccess('Overdue loans CSV downloaded');
    } catch {
      showError('Failed to export overdue report CSV');
    }
  };

  const handleBorrowersCsv = async () => {
    try {
      const uri = await exportBorrowersCsv(customers || []);
      await shareFile(uri, 'Borrowers List CSV', 'text/csv');
      showSuccess('Borrowers roster CSV downloaded');
    } catch {
      showError('Failed to export borrowers CSV');
    }
  };

  const handleLoansCsv = async () => {
    try {
      const uri = await exportLoansCsv(loans || []);
      await shareFile(uri, 'Loans Ledger CSV', 'text/csv');
      showSuccess('Loans ledger CSV downloaded');
    } catch {
      showError('Failed to export loans CSV');
    }
  };

  const handlePaymentsCsv = async () => {
    try {
      const uri = await exportPaymentsCsv(payments || []);
      await shareFile(uri, 'Repayments Ledger CSV', 'text/csv');
      showSuccess('Repayments history CSV downloaded');
    } catch {
      showError('Failed to export repayments CSV');
    }
  };

  const handleFullBackupJson = async () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        business,
        currency,
        loanProducts: loanProducts || [],
        customers: customers || [],
        loans: loans || [],
        payments: payments || [],
      };
      const safeName = (business.businessName || 'LoanLedger').replace(/[^a-zA-Z0-9]/g, '_');
      const uri = await exportJsonReport(`${safeName}_Full_Backup`, backupData);
      await shareFile(uri, 'Full Ledger JSON Backup', 'application/json');
      showSuccess('Full JSON backup downloaded');
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
        {/* RECONCILIATION & AUDITS */}
        <Card variant="surface" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, marginBottom: 16 }]}>
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
            title="Daily Collection Sheet (CSV / Excel)"
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
        </Card>

        {/* COMPREHENSIVE LEDGER CSVS */}
        <Card variant="surface" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, marginBottom: 16 }]}>
          <ListRow
            title="Export Borrowers Roster (CSV)"
            subtitle="Complete list of all customers, contact, address & active loans"
            iconName="people-outline"
            iconColor={colors.primaryDark}
            iconBgColor={colors.primarySoft}
            showChevron
            onPress={handleBorrowersCsv}
          />

          <ListRow
            title="Export All Loans Ledger (CSV)"
            subtitle="Detailed loan account records, principal, rates, balance & status"
            iconName="cash-outline"
            iconColor={colors.primaryDark}
            iconBgColor={colors.primarySoft}
            showChevron
            onPress={handleLoansCsv}
          />

          <ListRow
            title="Export Repayments History (CSV)"
            subtitle="All transaction receipts, cash/UPI modes, date/time & collector"
            iconName="receipt-outline"
            iconColor={colors.primaryDark}
            iconBgColor={colors.primarySoft}
            showChevron
            onPress={handlePaymentsCsv}
          />
        </Card>

        {/* FULL DATA SNAPSHOT */}
        <Card variant="surface" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <ListRow
            title="Full Data Backup (JSON)"
            subtitle="Complete offline JSON snapshot of all borrowers, loans & settings"
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
