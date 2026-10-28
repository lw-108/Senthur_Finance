export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'OTHER';

export type PaymentType =
  | 'INSTALLMENT'
  | 'PART_PAYMENT'
  | 'PREPAYMENT'
  | 'INTEREST_ONLY'
  | 'FULL_SETTLEMENT'
  | 'DISBURSEMENT'
  | 'FEE'
  | 'WAIVER'
  | 'ADJUSTMENT';

export interface PaymentAllocation {
  penalty: number; // in paise
  interest: number; // in paise
  principal: number; // in paise
}

export interface Payment {
  id: string;
  loanId: string;
  customerId: string;
  customerName: string;
  loanNumber: string;
  receiptNumber: string; // e.g. REC-2026-0001
  amount: number; // in paise
  paidOn: string; // ISO string
  mode: PaymentMode;
  referenceNo?: string;
  allocation: PaymentAllocation;
  type: PaymentType;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isDeleted: boolean;
}

export interface AuditLog {
  id: string;
  who: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT' | 'SETTLEMENT';
  entityType: 'CUSTOMER' | 'LOAN' | 'PAYMENT' | 'SCHEDULE';
  entityId: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  timestamp: string;
}

export interface RecordPaymentInput {
  loanId: string;
  amountPaise: number;
  paidOn: string;
  mode: PaymentMode;
  referenceNo?: string;
  notes?: string;
  receiptPhotoUri?: string;
}
