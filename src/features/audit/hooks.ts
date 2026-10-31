import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { fetchAuditLogsFromDb, recordAuditLogToDb } from './api';
import { AuditLog, AuditLogFilter } from './types';
import { fuzzySearchAuditLogs } from './auditEngine';

export const AUDIT_LOGS_QUERY_KEY = 'audit_logs';

export function useAuditLogs(filter?: AuditLogFilter) {
  const adminUid = useAuthStore((s) => s.adminUid);

  return useQuery({
    queryKey: [AUDIT_LOGS_QUERY_KEY, adminUid, filter?.search, filter?.action, filter?.entityType],
    queryFn: async () => {
      const allLogs = await fetchAuditLogsFromDb(adminUid);
      let filtered = allLogs;

      if (filter?.action && filter.action !== 'ALL') {
        filtered = filtered.filter((l) => l.action === filter.action);
      }
      if (filter?.entityType && filter.entityType !== 'ALL') {
        filtered = filtered.filter((l) => l.entityType === filter.entityType);
      }
      if (filter?.search) {
        filtered = fuzzySearchAuditLogs(filtered, filter.search);
      }

      return filtered;
    },
  });
}

export function useRecordAuditLog() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (log: AuditLog) => recordAuditLogToDb(adminUid, log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
    },
  });
}

export function useCustomerAuditLogs(customerId: string | undefined, customerLoanIds: string[] = []) {
  const adminUid = useAuthStore((s) => s.adminUid);

  return useQuery({
    queryKey: [AUDIT_LOGS_QUERY_KEY, adminUid, 'customer', customerId, customerLoanIds.join(',')],
    queryFn: async () => {
      if (!customerId) return [];
      const allLogs = await fetchAuditLogsFromDb(adminUid);
      return allLogs.filter((l) => {
        const matchesCustomer =
          l.entityId === customerId ||
          l.metadata?.customerId === customerId ||
          l.before?.customerId === customerId ||
          l.after?.customerId === customerId;

        const matchesLoan =
          (customerLoanIds.length > 0 && customerLoanIds.includes(l.entityId)) ||
          (l.metadata?.loanId && customerLoanIds.includes(l.metadata.loanId)) ||
          (l.before?.loanId && customerLoanIds.includes(l.before.loanId)) ||
          (l.after?.loanId && customerLoanIds.includes(l.after.loanId));

        return matchesCustomer || matchesLoan;
      });
    },
    enabled: Boolean(customerId),
  });
}
