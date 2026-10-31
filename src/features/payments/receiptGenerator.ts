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

export function generateReceiptHtml(data: ReceiptData): string {
  const {
    payment,
    loan,
    businessName = 'SENTHUR FINANCE',
    businessAddress = '',
    businessPhone = '',
  } = data;

  const totalAmountFormatted = formatIndianCurrency(payment.amount, { isMinorUnit: true }).formatted;
  const principalAllocated = formatIndianCurrency(payment.allocation.principal, { isMinorUnit: true }).formatted;
  const interestAllocated = formatIndianCurrency(payment.allocation.interest, { isMinorUnit: true }).formatted;
  const penaltyAllocated = formatIndianCurrency(payment.allocation.penalty, { isMinorUnit: true }).formatted;
  const balanceAfter = formatIndianCurrency(
    Math.max(0, loan.outstandingPrincipal - payment.allocation.principal),
    { isMinorUnit: true }
  ).formatted;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Receipt - ${payment.receiptNumber}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            padding: 36px;
            margin: 0;
            background: #ffffff;
          }
          .header {
            border-bottom: 2px solid #0F172A;
            padding-bottom: 20px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 800;
            color: #0F172A;
            margin: 0 0 5px 0;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            font-size: 12px;
            color: #64748B;
            margin: 0;
            line-height: 16px;
          }
          .receipt-badge {
            text-align: right;
          }
          .receipt-number {
            font-size: 16px;
            font-weight: 800;
            color: #0F172A;
            margin: 0 0 4px 0;
          }
          .receipt-tag {
            display: inline-block;
            background: #DCFCE7;
            color: #166534;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .receipt-date {
            font-size: 12px;
            color: #64748B;
            margin: 0;
          }
          .customer-box {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 24px;
          }
          .box-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .customer-name {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
            margin: 0 0 4px 0;
          }
          .customer-sub {
            font-size: 12px;
            color: #475569;
            margin: 2px 0;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          .table th {
            text-align: left;
            padding: 10px 12px;
            font-size: 11px;
            text-transform: uppercase;
            color: #64748B;
            background: #F1F5F9;
            border-bottom: 1px solid #E2E8F0;
          }
          .table td {
            padding: 12px;
            font-size: 14px;
            border-bottom: 1px solid #E2E8F0;
          }
          .amount-total {
            font-size: 22px;
            font-weight: 800;
            color: #16A34A;
          }
          .summary-card {
            background: #0F172A;
            color: #ffffff;
            border-radius: 14px;
            padding: 18px 22px;
            margin-bottom: 24px;
          }
          .summary-title {
            font-size: 11px;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 8px 0;
            font-weight: 700;
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
            color: #94A3B8;
            margin-top: 36px;
            border-top: 1px solid #E2E8F0;
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
            <span class="receipt-tag">PAYMENT RECEIVED</span>
            <p class="receipt-number">${payment.receiptNumber}</p>
            <p class="receipt-date">${formatDate(payment.paidOn, 'dd MMM yyyy, hh:mm a')}</p>
          </div>
        </div>

        <div class="customer-box">
          <div class="box-label">Received With Thanks From</div>
          <div class="customer-name">${payment.customerName}</div>
          <div class="customer-sub">Loan Account: <strong>${payment.loanNumber}</strong> (${loan.title || loan.category})</div>
          <div class="customer-sub">Mode: <strong>${payment.mode}</strong> ${payment.referenceNo ? `• Ref: ${payment.referenceNo}` : ''}</div>
          ${payment.notes ? `<div class="customer-sub">Remarks: <em>${payment.notes}</em></div>` : ''}
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Loan Balance Reduced</td>
              <td style="text-align: right; font-weight: 600;">${principalAllocated}</td>
            </tr>
            <tr>
              <td>Interest Paid</td>
              <td style="text-align: right; font-weight: 600;">${interestAllocated}</td>
            </tr>
            ${payment.allocation.penalty > 0 ? `
            <tr>
              <td>Fine / Late Fee Paid</td>
              <td style="text-align: right; font-weight: 600; color: #DC2626;">${penaltyAllocated}</td>
            </tr>` : ''}
            <tr style="background: #F8FAFC;">
              <td style="font-weight: 700; font-size: 15px;">Total Amount Received</td>
              <td style="text-align: right;" class="amount-total">${totalAmountFormatted}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary-card">
          <div class="summary-title">Loan Balance Status</div>
          <div class="summary-row">
            <span>Balance to Pay:</span>
            <span style="font-weight: 800; font-size: 15px;">${balanceAfter}</span>
          </div>
          <div class="summary-row">
            <span>Next Due Date:</span>
            <span>${loan.nextDueDate ? formatDate(loan.nextDueDate) : 'Fully Cleared'}</span>
          </div>
        </div>

        <div class="footer">
          This is an official computer-generated receipt issued by ${businessName}.<br>
          For queries or statement copy, contact admin at ${businessPhone}.
        </div>
      </body>
    </html>
  `;
}

export async function generatePaymentReceiptPdf(data: ReceiptData): Promise<string> {
  const html = generateReceiptHtml(data);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function sharePaymentReceipt(data: ReceiptData): Promise<void> {
  const fileUri = await generatePaymentReceiptPdf(data);
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Receipt ${data.payment.receiptNumber} - ${data.payment.customerName}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

export async function printPaymentReceipt(data: ReceiptData): Promise<void> {
  const html = generateReceiptHtml(data);
  await Print.printAsync({ html });
}

export function getReceiptWhatsAppText(data: ReceiptData): string {
  const { payment, loan, businessName = 'SENTHUR FINANCE', businessPhone = '' } = data;
  const amountFormatted = formatIndianCurrency(payment.amount, { isMinorUnit: true }).formatted;
  const principalAllocated = formatIndianCurrency(payment.allocation.principal, { isMinorUnit: true }).formatted;
  const interestAllocated = formatIndianCurrency(payment.allocation.interest, { isMinorUnit: true }).formatted;
  const penaltyAllocated = formatIndianCurrency(payment.allocation.penalty, { isMinorUnit: true }).formatted;
  const balanceAfter = formatIndianCurrency(
    Math.max(0, loan.outstandingPrincipal - payment.allocation.principal),
    { isMinorUnit: true }
  ).formatted;

  let msg = `*${businessName}* - Payment Receipt\n\n`;
  msg += `Receipt No: *${payment.receiptNumber}*\n`;
  msg += `Date: ${formatDate(payment.paidOn, 'dd MMM yyyy, hh:mm a')}\n`;
  msg += `Borrower: *${payment.customerName}*\n`;
  msg += `Loan Account: *${payment.loanNumber}* (${loan.title || loan.category})\n\n`;
  msg += `--------------------------------\n`;
  msg += `*Amount Received: ${amountFormatted}*\n`;
  msg += `Payment Mode: ${payment.mode}${payment.referenceNo ? ` (Ref: ${payment.referenceNo})` : ''}\n`;
  msg += `Loan Amount Reduced: ${principalAllocated}\n`;
  msg += `Interest Paid: ${interestAllocated}\n`;
  if (payment.allocation.penalty > 0) {
    msg += `Fine / Late Fee Paid: ${penaltyAllocated}\n`;
  }
  msg += `--------------------------------\n`;
  msg += `*Balance to Pay: ${balanceAfter}*\n`;
  msg += `Next Due Date: ${loan.nextDueDate ? formatDate(loan.nextDueDate) : 'Fully Cleared'}\n\n`;
  msg += `Thank you for your payment! For queries: ${businessPhone}`;

  return msg;
}
