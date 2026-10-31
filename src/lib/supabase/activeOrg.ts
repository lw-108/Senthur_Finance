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
      const currentUser = userRes?.user;

      if (currentUser) {
        const { data: memberships, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', currentUser.id)
          .eq('status', 'active')
          .limit(1);

        if (!error && memberships && memberships.length > 0) {
          const orgId = (memberships[0] as any).organization_id as string;
          cachedOrgId = orgId;
          await secureStorage.setItem(ACTIVE_ORG_KEY, orgId);
          return orgId;
        }

        // Fallback: If no active membership found, find any organization in database
        const { data: orgs } = await (supabase.from('organizations') as any)
          .select('id')
          .limit(1);

        if (orgs && orgs.length > 0) {
          const orgId = orgs[0].id as string;
          // Auto-link user to this organization
          try {
            await (supabase.from('organization_members') as any).upsert({
              organization_id: orgId,
              user_id: currentUser.id,
              role: 'owner',
              status: 'active',
            });
          } catch {}
          cachedOrgId = orgId;
          await secureStorage.setItem(ACTIVE_ORG_KEY, orgId);
          return orgId;
        }

        // If no organization exists at all, create one
        const { data: newOrg } = await (supabase.from('organizations') as any)
          .insert({ name: 'Senthur Finance', status: 'active' })
          .select()
          .single();

        if (newOrg?.id) {
          try {
            await (supabase.from('organization_members') as any).insert({
              organization_id: newOrg.id,
              user_id: currentUser.id,
              role: 'owner',
              status: 'active',
            });
          } catch {}
          cachedOrgId = newOrg.id;
          await secureStorage.setItem(ACTIVE_ORG_KEY, newOrg.id);
          return newOrg.id;
        }
      } else {
        // No authenticated session yet, but check if an organization exists in DB
        const { data: orgs } = await (supabase.from('organizations') as any)
          .select('id')
          .limit(1);

        if (orgs && orgs.length > 0) {
          const orgId = orgs[0].id as string;
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
