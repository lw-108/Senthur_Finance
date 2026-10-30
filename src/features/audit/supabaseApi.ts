import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/supabase/activeOrg';
import { AuditLog, AuditLogFilter } from './types';

let localAuditLogs: AuditLog[] = [];

export interface RecordAuditParams {
  organizationId?: string;
  actorUserId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT' | 'SETTLEMENT' | 'DISBURSEMENT';
  entityType: 'CUSTOMER' | 'LOAN' | 'PAYMENT' | 'SCHEDULE' | 'SETTINGS';
  entityId?: string;
  summary: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
}

export async function recordAuditLog(params: RecordAuditParams): Promise<void> {
  const orgId = params.organizationId || (await getActiveOrganizationId());
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_events').insert({
        organization_id: orgId,
        actor_user_id: isValidUUID(params.actorUserId) ? params.actorUserId : null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: isValidUUID(params.entityId) ? params.entityId : null,
        summary: params.summary,
        before: params.before || null,
        after: params.after || null,
        metadata: params.metadata || {},
        occurred_at: now,
      });
      return;
    } catch (e) {
      console.warn('[Audit Supabase] Log write failed:', e);
    }
  }

  // Local fallback
  localAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    who: params.actorUserId || 'admin',
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId || '',
    summary: params.summary,
    before: params.before,
    after: params.after,
    metadata: params.metadata,
    timestamp: now,
  });
}

export async function fetchAuditLogs(
  _adminUid?: string,
  filter?: AuditLogFilter
): Promise<AuditLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const orgId = await getActiveOrganizationId();
      let q = supabase
        .from('audit_events')
        .select('*')
        .eq('organization_id', orgId)
        .order('occurred_at', { ascending: false })
        .limit(100);

      if (filter?.action) {
        q = q.eq('action', filter.action);
      }
      if (filter?.entityType) {
        q = q.eq('entity_type', filter.entityType);
      }

      const { data, error } = await q;
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          who: r.actor_user_id || 'System',
          action: r.action,
          entityType: r.entity_type,
          entityId: r.entity_id || '',
          summary: r.summary,
          before: r.before || undefined,
          after: r.after || undefined,
          metadata: r.metadata || undefined,
          timestamp: r.occurred_at,
        }));
      }
    } catch {}
  }

  return localAuditLogs;
}

export async function fetchAuditLogsFromDb(adminUid: string): Promise<AuditLog[]> {
  return fetchAuditLogs(adminUid);
}

export async function recordAuditLogToDb(_adminUid: string, log: AuditLog): Promise<AuditLog> {
  await recordAuditLog({
    action: log.action as any,
    entityType: log.entityType as any,
    entityId: log.entityId,
    summary: log.summary,
    before: log.before,
    after: log.after,
    metadata: log.metadata,
  });
  return log;
}
