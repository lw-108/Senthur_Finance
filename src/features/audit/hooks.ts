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
