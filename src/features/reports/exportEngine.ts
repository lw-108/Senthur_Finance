import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Loan } from '@/features/loans/types';
import { Payment } from '@/features/payments/types';
import { Customer } from '@/features/customers/types';
import { formatIndianCurrency, formatDate } from '@/utils/formatters';

export async function exportDailyCollectionReportPdf(
  payments: Payment[],
  businessName = 'SENTHUR FINANCE'
): Promise<string> {
  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  const rowsHtml = payments
    .map(
      (p) => `
    <tr>
      <td>${p.receiptNumber}</td>
      <td>${p.customerName}</td>
      <td>${p.loanNumber}</td>
      <td>${formatDate(p.paidOn, 'hh:mm a')}</td>
      <td>${p.mode}</td>
      <td style="text-align: right; font-weight: 700;">${formatIndianCurrency(p.amount, { isMinorUnit: true }).formatted}</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Daily Collection Sheet</title>
        <style>
          body { font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #111; }
          .header { border-bottom: 2px solid #B79CE8; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 800; color: #2A2430; margin: 0; }
          .sub { font-size: 12px; color: #8E8E96; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; background: #F5F5F7; }
          td { padding: 10px 8px; border-bottom: 1px solid #ECECF0; font-size: 13px; }
          .total-box { margin-top: 25px; background: #2A2430; color: #fff; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${businessName}</h1>
          <p class="sub">DAILY COLLECTION SHEET • ${formatDate(new Date(), 'dd MMMM yyyy')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Borrower</th>
              <th>Loan #</th>
              <th>Time</th>
              <th>Mode</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="total-box">
          <span>Total Collections Today:</span>
          <span style="font-size: 18px; font-weight: 800;">${formatIndianCurrency(totalCollected, { isMinorUnit: true }).formatted}</span>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function exportCustomerStatementPdf(
  customer: Customer,
  loans: Loan[],
  payments: Payment[],
  businessName = 'SENTHUR FINANCE',
  businessPhone = '',
  businessAddress = ''
): Promise<string> {
  const activeLoans = loans.filter((l) => !l.isDeleted);
  const totalLent = activeLoans.reduce((sum, l) => sum + l.principal, 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
  const totalRepaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const loanRows = activeLoans
    .map(
      (l) => `
      <tr>
        <td><strong>${l.loanNumber}</strong><br><small style="color: #666;">${l.title}</small></td>
        <td>${formatDate(l.disbursedOn)}</td>
        <td>${l.interestRate}% ${l.ratePeriod === 'PER_MONTH' ? 'p.m.' : 'p.a.'} (${l.interestType})</td>
        <td style="text-align: right;">${formatIndianCurrency(l.principal, { isMinorUnit: true }).formatted}</td>
        <td style="text-align: right; font-weight: 700; color: #7C3AED;">${formatIndianCurrency(l.outstandingPrincipal, { isMinorUnit: true }).formatted}</td>
        <td><span style="background: ${l.status === 'OVERDUE' ? '#FEE2E2; color: #DC2626' : '#DCFCE7; color: #16A34A'}; padding: 3px 8px; border-radius: 999px; font-size: 11px;">${l.status}</span></td>
      </tr>
    `
    )
    .join('');

  const paymentRows = payments
    .map(
      (p) => `
      <tr>
        <td>${p.receiptNumber}</td>
        <td>${formatDate(p.paidOn)}</td>
        <td>${p.loanNumber}</td>
        <td>${p.mode}</td>
        <td style="text-align: right; font-weight: 700; color: #16A34A;">+${formatIndianCurrency(p.amount, { isMinorUnit: true }).formatted}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Customer Account Statement</title>
        <style>
          body { font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #111; line-height: 1.4; }
          .header { border-bottom: 3px solid #7C3AED; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          .title { font-size: 24px; font-weight: 800; color: #1E1B4B; margin: 0; }
          .sub { font-size: 12px; color: #6B7280; margin: 2px 0 0 0; }
          .customer-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
          .summary-grid { display: flex; gap: 12px; margin-bottom: 24px; }
          .summary-card { flex: 1; background: #EDE9FE; border-radius: 10px; padding: 12px; text-align: center; }
          .summary-label { font-size: 11px; text-transform: uppercase; color: #6D28D9; font-weight: 700; }
          .summary-val { font-size: 18px; font-weight: 800; color: #1E1B4B; margin-top: 4px; }
          h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin: 20px 0 8px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; background: #F1F5F9; color: #475569; }
          td { padding: 9px 8px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
          .footer { margin-top: 35px; border-top: 1px solid #E2E8F0; padding-top: 12px; font-size: 11px; color: #94A3B8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${businessName}</h1>
            <p class="sub">${businessAddress} • Ph: ${businessPhone}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; font-weight: 700; color: #7C3AED; margin: 0;">ACCOUNT LEDGER STATEMENT</p>
            <p class="sub">Generated on ${formatDate(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
          </div>
        </div>

        <div class="customer-box">
          <table style="margin: 0; border: none;">
            <tr>
              <td style="border: none; width: 50%;"><strong>Borrower:</strong> ${customer.fullName}</td>
              <td style="border: none;"><strong>Phone:</strong> +91 ${customer.phone}</td>
            </tr>
            <tr>
              <td style="border: none;"><strong>Address:</strong> ${customer.address.city}, ${customer.address.state}</td>
              <td style="border: none;"><strong>Occupation:</strong> ${customer.occupation || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Principal Lent</div>
            <div class="summary-val">${formatIndianCurrency(totalLent, { isMinorUnit: true }).formatted}</div>
          </div>
          <div class="summary-card" style="background: #DCFCE7;">
            <div class="summary-label" style="color: #15803D;">Total Amount Repaid</div>
            <div class="summary-val" style="color: #166534;">${formatIndianCurrency(totalRepaid, { isMinorUnit: true }).formatted}</div>
          </div>
          <div class="summary-card" style="background: #FEE2E2;">
            <div class="summary-label" style="color: #B91C1C;">Current Outstanding</div>
            <div class="summary-val" style="color: #991B1B;">${formatIndianCurrency(totalOutstanding, { isMinorUnit: true }).formatted}</div>
          </div>
        </div>

        <h3>Loan Accounts & Pledges</h3>
        <table>
          <thead>
            <tr>
              <th>Loan No & Scheme</th>
              <th>Disbursed On</th>
              <th>Interest Terms</th>
              <th style="text-align: right;">Principal</th>
              <th style="text-align: right;">Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${loanRows || '<tr><td colspan="6" style="text-align: center; color: #94A3B8;">No loan accounts</td></tr>'}
          </tbody>
        </table>

        <h3>Repayment History (Receipts)</h3>
        <table>
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Date</th>
              <th>Loan No</th>
              <th>Mode</th>
              <th style="text-align: right;">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRows || '<tr><td colspan="5" style="text-align: center; color: #94A3B8;">No repayments recorded</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Official computer generated statement for ${customer.fullName}. Authorized signature from ${businessName}.
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function exportOverdueAuditPdf(
  overdueLoans: Loan[],
  businessName = 'SENTHUR FINANCE',
  businessPhone = ''
): Promise<string> {
  const totalOverduePrincipal = overdueLoans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
  const totalPenalty = overdueLoans.reduce((sum, l) => sum + (l.penaltyAccrued || 0), 0);

  const rowsHtml = overdueLoans
    .map(
      (l) => `
      <tr>
        <td><strong>${l.loanNumber}</strong></td>
        <td><strong>${l.customerName}</strong></td>
        <td>${l.category}</td>
        <td>${formatDate(l.disbursedOn)}</td>
        <td style="color: #DC2626; font-weight: 700;">${l.daysOverdue} Days</td>
        <td style="text-align: right; font-weight: 700;">${formatIndianCurrency(l.outstandingPrincipal, { isMinorUnit: true }).formatted}</td>
        <td style="text-align: right; color: #DC2626;">${formatIndianCurrency(l.penaltyAccrued || 0, { isMinorUnit: true }).formatted}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Overdue Loans Audit Sheet</title>
        <style>
          body { font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #111; line-height: 1.4; }
          .header { border-bottom: 3px solid #DC2626; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          .title { font-size: 22px; font-weight: 800; color: #991B1B; margin: 0; }
          .sub { font-size: 12px; color: #6B7280; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; background: #FEF2F2; color: #991B1B; }
          td { padding: 9px 8px; border-bottom: 1px solid #FEE2E2; font-size: 12px; }
          .total-box { margin-top: 25px; background: #991B1B; color: #fff; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${businessName}</h1>
            <p class="sub">DELINQUENT & OVERDUE RECOVERY AUDIT SHEET • Ph: ${businessPhone}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; font-weight: 700; color: #DC2626; margin: 0;">AUDIT REPORT</p>
            <p class="sub">${formatDate(new Date(), 'dd MMMM yyyy')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Loan #</th>
              <th>Borrower</th>
              <th>Category</th>
              <th>Disbursed</th>
              <th>Overdue</th>
              <th style="text-align: right;">Principal Due</th>
              <th style="text-align: right;">Penalty</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align: center; color: #15803D; padding: 20px;">Zero delinquent accounts. All loans in good standing!</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          <div>
            <div style="font-size: 12px; text-transform: uppercase; opacity: 0.85;">Total Overdue Portfolio (${overdueLoans.length} accounts):</div>
            <div style="font-size: 20px; font-weight: 800; margin-top: 4px;">${formatIndianCurrency(totalOverduePrincipal, { isMinorUnit: true }).formatted}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; text-transform: uppercase; opacity: 0.85;">Total Accrued Penalty:</div>
            <div style="font-size: 18px; font-weight: 800; margin-top: 4px;">${formatIndianCurrency(totalPenalty, { isMinorUnit: true }).formatted}</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function exportCsvReport(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<string> {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  try {
    const file = new File(Paths.document, `${filename}.csv`);
    file.create({ overwrite: true });
    file.write(csvContent);
    return file.uri;
  } catch {
    // Fallback using Print / HTML
    const html = `<html><body><pre>${csvContent}</pre></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  }
}

export async function shareFile(uri: string, title: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      dialogTitle: title,
    });
  }
}
