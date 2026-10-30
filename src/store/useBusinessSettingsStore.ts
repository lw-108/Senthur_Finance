import { Platform } from 'react-native';
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getActiveOrganizationId, DEFAULT_ORG_ID } from '@/lib/supabase/activeOrg';
import { secureStorage } from '@/lib/storage/secureStorage';
import {
  getPermanentAvatarAsync,
  getPermanentAvatarSync,
  setPermanentAvatar,
} from '@/lib/storage/profileStorage';

const BUSINESS_SETTINGS_KEY = 'loanledger_business_profile';
const CURRENCY_SETTINGS_KEY = 'loanledger_currency_settings';

export interface BusinessProfile {
  businessName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  licenseNumber: string;
  avatarUrl: string | null;
}

export interface CurrencySettings {
  currencySymbol: string;
  currencyCode: string;
  numberFormat: 'indian' | 'international';
  financialYearStartMonth: number; // 4 = April
  dateFormat: string;
}

interface BusinessSettingsState {
  business: BusinessProfile;
  currency: CurrencySettings;
  isLoaded: boolean;

  initialize: () => Promise<void>;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => Promise<void>;
  updateCurrencySettings: (updates: Partial<CurrencySettings>) => Promise<void>;
  updateAvatar: (base64OrUri: string) => Promise<void>;
}

const DEFAULT_BUSINESS: BusinessProfile = {
  businessName: '',
  tagline: '',
  ownerName: 'Admin',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  licenseNumber: '',
  avatarUrl: null,
};

function getInitialBusinessSync(): BusinessProfile {
  let profile = { ...DEFAULT_BUSINESS, avatarUrl: getPermanentAvatarSync() };
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(BUSINESS_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          profile = { ...profile, ...parsed };
        }
      }
    } catch {}
  }
  return profile;
}

const DEFAULT_CURRENCY: CurrencySettings = {
  currencySymbol: '₹',
  currencyCode: 'INR',
  numberFormat: 'indian',
  financialYearStartMonth: 4,
  dateFormat: 'dd/MM/yyyy',
};

export const useBusinessSettingsStore = create<BusinessSettingsState>((set, get) => ({
  business: getInitialBusinessSync(),
  currency: DEFAULT_CURRENCY,
  isLoaded: false,

  initialize: async () => {
    try {
      // 1. Load from persistent local storage
      const localBiz = await secureStorage.getItem(BUSINESS_SETTINGS_KEY);
      const localCurr = await secureStorage.getItem(CURRENCY_SETTINGS_KEY);
      const permanentAvatar = await getPermanentAvatarAsync();

      let business = localBiz ? { ...DEFAULT_BUSINESS, ...JSON.parse(localBiz) } : get().business;
      let currency = localCurr ? { ...DEFAULT_CURRENCY, ...JSON.parse(localCurr) } : DEFAULT_CURRENCY;

      if (!business.avatarUrl && permanentAvatar) {
        business.avatarUrl = permanentAvatar;
      }

      // 2. Sync from Supabase organization_settings if configured and active org is resolved
      if (isSupabaseConfigured()) {
        try {
          const orgId = await getActiveOrganizationId();
          if (orgId && orgId !== DEFAULT_ORG_ID) {
            const { data, error } = await (supabase.from('organization_settings') as any)
              .select('business_profile, currency_settings')
              .eq('organization_id', orgId)
              .maybeSingle();

            if (!error && data) {
              if (data.business_profile && typeof data.business_profile === 'object') {
                business = { ...business, ...data.business_profile };
                await secureStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(business));
                if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                  window.localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(business));
                }
              }
              if (data.currency_settings && typeof data.currency_settings === 'object') {
                currency = { ...currency, ...data.currency_settings };
              }
            }

            // Also check name from organizations table if present
            const { data: orgRow } = await (supabase.from('organizations') as any)
              .select('name')
              .eq('id', orgId)
              .maybeSingle();
            if (orgRow?.name && !business.businessName) {
              business.businessName = orgRow.name;
              await secureStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(business));
            }
          }
        } catch {
          // Supabase offline / not reachable
        }
      }

      set({ business, currency, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  updateBusinessProfile: async (updates) => {
    const nextBiz = { ...get().business, ...updates };
    set({ business: nextBiz });

    // Save synchronously for web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(nextBiz));
      } catch {}
    }

    // Save locally
    await secureStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(nextBiz));

    // Sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const orgId = await getActiveOrganizationId();
        if (orgId && orgId !== DEFAULT_ORG_ID) {
          await (supabase.from('organization_settings') as any)
            .upsert({
              organization_id: orgId,
              business_profile: nextBiz,
              updated_at: new Date().toISOString(),
            });

          if (nextBiz.businessName) {
            await (supabase.from('organizations') as any)
              .update({
                name: nextBiz.businessName,
                updated_at: new Date().toISOString(),
              })
              .eq('id', orgId);
          }
        }
      } catch {
        // Offline fallback
      }
    }
  },

  updateCurrencySettings: async (updates) => {
    const nextCurr = { ...get().currency, ...updates };
    set({ currency: nextCurr });

    await secureStorage.setItem(CURRENCY_SETTINGS_KEY, JSON.stringify(nextCurr));

    if (isSupabaseConfigured()) {
      try {
        const orgId = await getActiveOrganizationId();
        if (orgId && orgId !== DEFAULT_ORG_ID) {
          await (supabase.from('organization_settings') as any)
            .upsert({
              organization_id: orgId,
              currency_settings: nextCurr,
              updated_at: new Date().toISOString(),
            });
        }
      } catch {
        // Offline fallback
      }
    }
  },

  updateAvatar: async (base64OrUri: string) => {
    await setPermanentAvatar(base64OrUri);
    await get().updateBusinessProfile({ avatarUrl: base64OrUri });
  },
}));
