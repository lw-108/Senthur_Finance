export interface AuditLog {
  id: string;
  who: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT' | 'SETTLEMENT' | 'DISBURSEMENT';
  entityType: 'CUSTOMER' | 'LOAN' | 'PAYMENT' | 'SCHEDULE' | 'SETTINGS';
  entityId: string;
  summary: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string; // ISO date
}

export interface AuditLogFilter {
  search?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  loanId?: string;
}
