import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Payment } from './types';
import { Loan } from '@/features/loans/types';
import { formatIndianCurrency, formatDate } from '@/utils/formatters';

export interface ReceiptData {
  payment: Payment;
  loan: Loan;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
}

export async function generatePaymentReceiptPdf(data: ReceiptData): Promise<string> {
  const {
    payment,
    loan,
    businessName = 'SENTHUR FINANCE',
    businessAddress = 'Crosscut Road, Gandhipuram, Coimbatore - 641012',
    businessPhone = '+91 98765 00000',
  } = data;

  const totalAmountFormatted = formatIndianCurrency(payment.amount, { isMinorUnit: true }).formatted;
  const principalAllocated = formatIndianCurrency(payment.allocation.principal, { isMinorUnit: true }).formatted;
  const interestAllocated = formatIndianCurrency(payment.allocation.interest, { isMinorUnit: true }).formatted;
  const penaltyAllocated = formatIndianCurrency(payment.allocation.penalty, { isMinorUnit: true }).formatted;
  const balanceAfter = formatIndianCurrency(loan.outstandingPrincipal - payment.allocation.principal, {
    isMinorUnit: true,
  }).formatted;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Receipt - ${payment.receiptNumber}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #111111;
            padding: 40px;
            margin: 0;
            background: #ffffff;
          }
          .header {
            border-bottom: 2px solid #B79CE8;
            padding-bottom: 20px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 800;
            color: #2A2430;
            margin: 0 0 5px 0;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            font-size: 12px;
            color: #8E8E96;
            margin: 0;
            line-height: 16px;
          }
          .receipt-badge {
            text-align: right;
          }
          .receipt-number {
            font-size: 16px;
            font-weight: 700;
            color: #B79CE8;
            margin: 0 0 4px 0;
          }
          .receipt-date {
            font-size: 12px;
            color: #8E8E96;
            margin: 0;
          }
          .customer-box {
            background: #F8F7FA;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 25px;
          }
          .box-label {
            font-size: 10px;
            font-weight: 700;
            color: #8E8E96;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .customer-name {
            font-size: 18px;
            font-weight: 700;
            color: #111111;
            margin: 0 0 2px 0;
          }
          .customer-sub {
            font-size: 12px;
            color: #686873;
            margin: 0;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
          }
          .table th {
            text-align: left;
            padding: 10px;
            font-size: 11px;
            text-transform: uppercase;
            color: #8E8E96;
            border-bottom: 1px solid #ECECF0;
          }
          .table td {
            padding: 12px 10px;
            font-size: 14px;
            border-bottom: 1px solid #ECECF0;
          }
          .amount-total {
            font-size: 24px;
            font-weight: 800;
            color: #2FA36B;
          }
          .summary-card {
            background: #2A2430;
            color: #ffffff;
            border-radius: 14px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .summary-title {
            font-size: 11px;
            color: #B79CE8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 8px 0;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 13px;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #B8B8C0;
            margin-top: 40px;
            border-top: 1px solid #ECECF0;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">${businessName}</h1>
            <p class="brand-subtitle">${businessAddress}<br>Phone: ${businessPhone}</p>
          </div>
          <div class="receipt-badge">
            <p class="receipt-number">${payment.receiptNumber}</p>
            <p class="receipt-date">${formatDate(payment.paidOn, 'dd MMM yyyy, hh:mm a')}</p>
          </div>
        </div>

        <div class="customer-box">
          <div class="box-label">Received With Thanks From</div>
          <div class="customer-name">${payment.customerName}</div>
          <div class="customer-sub">Loan Account: <strong>${payment.loanNumber}</strong> (${loan.title})</div>
          <div class="customer-sub">Mode: <strong>${payment.mode}</strong> ${payment.referenceNo ? `• Ref: ${payment.referenceNo}` : ''}</div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount Allocated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Principal Repayment</td>
              <td style="text-align: right; font-weight: 600;">${principalAllocated}</td>
            </tr>
            <tr>
              <td>Interest Payment</td>
              <td style="text-align: right; font-weight: 600;">${interestAllocated}</td>
            </tr>
            ${payment.allocation.penalty > 0 ? `
            <tr>
              <td>Overdue Penalty Cleared</td>
              <td style="text-align: right; font-weight: 600; color: #E5384F;">${penaltyAllocated}</td>
            </tr>` : ''}
            <tr style="background: #F4F4F6;">
              <td style="font-weight: 700; font-size: 16px;">Total Amount Received</td>
              <td style="text-align: right;" class="amount-total">${totalAmountFormatted}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary-card">
          <div class="summary-title">Updated Account Status</div>
          <div class="summary-row">
            <span>Remaining Loan Balance:</span>
            <span style="font-weight: 700; font-size: 15px;">${balanceAfter}</span>
          </div>
          <div class="summary-row">
            <span>Next Repayment Due:</span>
            <span>${loan.nextDueDate || 'Fully Cleared'}</span>
          </div>
        </div>

        <div class="footer">
          This is a computer-generated electronic receipt issued by ${businessName}.<br>
          For queries, contact support at ${businessPhone}.
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function sharePaymentReceipt(data: ReceiptData): Promise<void> {
  const fileUri = await generatePaymentReceiptPdf(data);
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Receipt ${data.payment.receiptNumber}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
