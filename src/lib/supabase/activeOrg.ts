import { secureStorage } from '@/lib/storage/secureStorage';
import { supabase, isSupabaseConfigured } from './client';

const ACTIVE_ORG_KEY = 'sf_active_organization_id';
export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

let cachedOrgId: string | null = null;

export async function getActiveOrganizationId(): Promise<string> {
  if (cachedOrgId && cachedOrgId !== DEFAULT_ORG_ID) {
    return cachedOrgId;
  }

  // 1. Check local persistent store
  try {
    const stored = await secureStorage.getItem(ACTIVE_ORG_KEY);
    if (stored && stored.trim().length > 0 && stored.trim() !== DEFAULT_ORG_ID) {
      cachedOrgId = stored.trim();
      return cachedOrgId;
    }
  } catch {}

  // 2. Query user's organizations from Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes?.user) {
        const { data: memberships, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', userRes.user.id)
          .eq('status', 'active')
          .limit(1);

        if (!error && memberships && memberships.length > 0) {
          const orgId = (memberships[0] as any).organization_id as string;
          cachedOrgId = orgId;
          await secureStorage.setItem(ACTIVE_ORG_KEY, orgId);
          return orgId;
        }
      }
    } catch {}
  }

  return DEFAULT_ORG_ID;
}

export async function setActiveOrganizationId(orgId: string): Promise<void> {
  cachedOrgId = orgId;
  await secureStorage.setItem(ACTIVE_ORG_KEY, orgId);
}

export async function clearActiveOrganization(): Promise<void> {
  cachedOrgId = null;
  try {
    await secureStorage.deleteItem(ACTIVE_ORG_KEY);
  } catch {}
}
