import { Loan } from '@/features/loans/types';
import { Payment } from '@/features/payments/types';
import { AuditLog } from '@/features/audit/types';
import { formatIndianCurrency } from '@/utils/formatters';

export interface DayTransactionItem {
  id: string;
  type: 'PAYMENT' | 'DISBURSEMENT';
  borrowerName: string;
  loanNumber: string;
  amountPaise: number;
  mode: string;
  receiptNumber?: string;
  timeFormatted: string;
  timestamp: string;
}

export interface DayAnalyticsData {
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "27 Oct 2026"
  dayOfWeek: string; // e.g. "Tuesday"
  totalCollectionsPaise: number;
  totalDisbursedPaise: number;
  netCashflowPaise: number;
  borrowerCount: number;
  transactionsCount: number;
  chartPoints: { label: string; value: number; displayValue: string }[];
  transactions: DayTransactionItem[];
  hasData: boolean;
}

export function formatTimeFromIso(isoString?: string): string {
  if (!isoString) return '10:00 AM';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '10:00 AM';
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // '0' becomes '12'
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minutesStr} ${ampm}`;
  } catch {
    return '10:00 AM';
  }
}

export function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDatesWithActivity(
  loans: Loan[],
  payments: Payment[],
  auditLogs: AuditLog[]
): Set<string> {
  const dates = new Set<string>();

  (payments || []).forEach((p) => {
    if (!p.isDeleted) {
      const d = (p.paidOn || p.createdAt || '').split('T')[0];
      if (d) dates.add(d);
    }
  });

  (loans || []).forEach((l) => {
    if (!l.isDeleted) {
      const d = (l.disbursedOn || l.createdAt || '').split('T')[0];
      if (d) dates.add(d);
    }
  });

  (auditLogs || []).forEach((a) => {
    if (a.action === 'PAYMENT' || a.action === 'DISBURSEMENT') {
      const d = (a.timestamp || '').split('T')[0];
      if (d) dates.add(d);
    }
  });

  return dates;
}

export function computeDayAnalytics(
  selectedDate: string, // YYYY-MM-DD
  loans: Loan[],
  payments: Payment[],
  auditLogs: AuditLog[]
): DayAnalyticsData {
  const transactions: DayTransactionItem[] = [];
  const seenIds = new Set<string>();

  // 1. Process recorded payments from DB
  (payments || []).forEach((p) => {
    if (p.isDeleted) return;
    const pDate = (p.paidOn || p.createdAt || '').split('T')[0];
    if (pDate === selectedDate) {
      seenIds.add(p.id);
      if (p.receiptNumber) seenIds.add(p.receiptNumber);
      transactions.push({
        id: p.id,
        type: 'PAYMENT',
        borrowerName: p.customerName || 'Borrower',
        loanNumber: p.loanNumber || 'Loan',
        amountPaise: p.amount || 0,
        mode: p.mode || 'CASH',
        receiptNumber: p.receiptNumber || `REC-${p.id.slice(-4)}`,
        timeFormatted: formatTimeFromIso(p.paidOn || p.createdAt),
        timestamp: p.paidOn || p.createdAt || `${selectedDate}T10:00:00.000Z`,
      });
    }
  });

  // 2. Process recorded loans disbursed on this date from DB
  (loans || []).forEach((l) => {
    if (l.isDeleted) return;
    const lDate = (l.disbursedOn || l.createdAt || '').split('T')[0];
    if (lDate === selectedDate) {
      seenIds.add(l.id);
      transactions.push({
        id: l.id,
        type: 'DISBURSEMENT',
        borrowerName: l.customerName || 'Borrower',
        loanNumber: l.loanNumber || 'Loan',
        amountPaise: l.principal || 0,
        mode: 'BANK',
        receiptNumber: `DISB-${l.loanNumber}`,
        timeFormatted: formatTimeFromIso(l.disbursedOn || l.createdAt),
        timestamp: l.disbursedOn || l.createdAt || `${selectedDate}T10:00:00.000Z`,
      });
    }
  });

  // 3. Process audit logs for that date to capture any transactions logged
  (auditLogs || []).forEach((a) => {
    const aDate = (a.timestamp || '').split('T')[0];
    if (aDate === selectedDate) {
      if (a.action === 'PAYMENT' && a.after) {
        const receiptNo = a.after.receiptNumber || a.entityId;
        if (!seenIds.has(receiptNo) && !seenIds.has(a.id)) {
          seenIds.add(receiptNo);
          seenIds.add(a.id);
          transactions.push({
            id: a.id,
            type: 'PAYMENT',
            borrowerName: a.after.customerName || 'Borrower',
            loanNumber: a.after.loanNumber || 'Loan',
            amountPaise: a.after.amountPaise || 0,
            mode: a.after.paymentMode || 'CASH',
            receiptNumber: receiptNo,
            timeFormatted: formatTimeFromIso(a.timestamp),
            timestamp: a.timestamp,
          });
        }
      } else if (a.action === 'DISBURSEMENT' && a.after) {
        const loanNo = a.after.loanNumber || a.entityId;
        if (!seenIds.has(loanNo) && !seenIds.has(a.id)) {
          seenIds.add(loanNo);
          seenIds.add(a.id);
          transactions.push({
            id: a.id,
            type: 'DISBURSEMENT',
            borrowerName: a.after.customerName || 'Borrower',
            loanNumber: loanNo,
            amountPaise: a.after.principalPaise || 0,
            mode: 'BANK',
            receiptNumber: `DISB-${loanNo}`,
            timeFormatted: formatTimeFromIso(a.timestamp),
            timestamp: a.timestamp,
          });
        }
      }
    }
  });

  // Sort transactions chronologically
  transactions.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Compute live aggregates
  const dayPaymentItems = transactions.filter((t) => t.type === 'PAYMENT');
  const dayDisbursementItems = transactions.filter((t) => t.type === 'DISBURSEMENT');

  const totalCollectionsPaise = dayPaymentItems.reduce((sum, t) => sum + t.amountPaise, 0);
  const totalDisbursedPaise = dayDisbursementItems.reduce((sum, t) => sum + t.amountPaise, 0);
  const netCashflowPaise = totalCollectionsPaise - totalDisbursedPaise;

  const uniqueBorrowers = new Set(transactions.map((t) => t.borrowerName));
  const borrowerCount = uniqueBorrowers.size;
  const transactionsCount = transactions.length;
  const hasData = transactionsCount > 0;

  // Build Real-Time Graph Points
  let chartPoints: { label: string; value: number; displayValue: string }[] = [];

  if (!hasData) {
    chartPoints = [
      { label: '9 am', value: 0, displayValue: '₹0' },
      { label: '12 pm', value: 0, displayValue: '₹0' },
      { label: '3 pm', value: 0, displayValue: '₹0' },
      { label: '6 pm', value: 0, displayValue: '₹0' },
      { label: '9 pm', value: 0, displayValue: '₹0' },
    ];
  } else {
    // Generate intraday collection curve
    // Check if transactions have different hours
    const intervals = [
      { label: '8 am', hour: 8 },
      { label: '10 am', hour: 10 },
      { label: '12 pm', hour: 12 },
      { label: '2 pm', hour: 14 },
      { label: '4 pm', hour: 16 },
      { label: '6 pm', hour: 18 },
      { label: '8 pm', hour: 20 },
    ];

    let hasHourSpread = false;
    const hours = dayPaymentItems.map((p) => {
      const d = new Date(p.timestamp);
      return isNaN(d.getTime()) ? 10 : d.getHours();
    });
    if (new Set(hours).size > 1) {
      hasHourSpread = true;
    }

    if (hasHourSpread) {
      // Intraday accumulation across 7 standard business hour checkpoints
      chartPoints = intervals.map((interval) => {
        const cumPaise = dayPaymentItems
          .filter((p) => {
            const d = new Date(p.timestamp);
            const h = isNaN(d.getTime()) ? 10 : d.getHours();
            return h <= interval.hour;
          })
          .reduce((sum, p) => sum + p.amountPaise, 0);

        return {
          label: interval.label,
          value: Math.round(cumPaise / 100),
          displayValue: formatIndianCurrency(cumPaise, { isMinorUnit: true }).formatted,
        };
      });
    } else {
      // Step-by-step transaction flow sequence
      chartPoints = [
        { label: 'Open', value: 0, displayValue: '₹0' },
      ];

      let runningPaise = 0;
      dayPaymentItems.forEach((p, idx) => {
        runningPaise += p.amountPaise;
        const label = p.timeFormatted.toLowerCase().replace(' ', '');
        chartPoints.push({
          label: dayPaymentItems.length <= 4 ? `${p.borrowerName.split(' ')[0]} (${label})` : label,
          value: Math.round(runningPaise / 100),
          displayValue: formatIndianCurrency(runningPaise, { isMinorUnit: true }).formatted,
        });
      });

      if (chartPoints.length === 2) {
        // If only 1 payment, pad with closing point for aesthetic area gradient curve
        chartPoints.push({
          label: 'Close',
          value: Math.round(runningPaise / 100),
          displayValue: formatIndianCurrency(runningPaise, { isMinorUnit: true }).formatted,
        });
      }
    }
  }

  // Format Date strings
  const dateObj = new Date(selectedDate);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : selectedDate;

  const dayOfWeek = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-IN', { weekday: 'long' })
    : '';

  return {
    date: selectedDate,
    formattedDate,
    dayOfWeek,
    totalCollectionsPaise,
    totalDisbursedPaise,
    netCashflowPaise,
    borrowerCount,
    transactionsCount,
    chartPoints,
    transactions,
    hasData,
  };
}
