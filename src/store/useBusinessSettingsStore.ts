import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { secureStorage } from '@/lib/storage/secureStorage';
import {
  getPermanentAvatarAsync,
  getPermanentAvatarSync,
  setPermanentAvatar,
  DEFAULT_AVATAR_URL,
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
  businessName: 'Senthur Finance',
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

const DEFAULT_CURRENCY: CurrencySettings = {
  currencySymbol: '₹',
  currencyCode: 'INR',
  numberFormat: 'indian',
  financialYearStartMonth: 4,
  dateFormat: 'dd/MM/yyyy',
};

export const useBusinessSettingsStore = create<BusinessSettingsState>((set, get) => ({
  business: { ...DEFAULT_BUSINESS, avatarUrl: getPermanentAvatarSync() },
  currency: DEFAULT_CURRENCY,
  isLoaded: false,

  initialize: async () => {
    try {
      // 1. Load from persistent local storage
      const localBiz = await secureStorage.getItem(BUSINESS_SETTINGS_KEY);
      const localCurr = await secureStorage.getItem(CURRENCY_SETTINGS_KEY);
      const permanentAvatar = await getPermanentAvatarAsync();

      let business = localBiz ? { ...DEFAULT_BUSINESS, ...JSON.parse(localBiz) } : DEFAULT_BUSINESS;
      let currency = localCurr ? { ...DEFAULT_CURRENCY, ...JSON.parse(localCurr) } : DEFAULT_CURRENCY;

      if (!business.avatarUrl && permanentAvatar) {
        business.avatarUrl = permanentAvatar;
      }

      // 2. Sync from Firestore if available
      try {
        const ref = doc(db, 'settings', 'business_profile');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const remoteData = snap.data();
          if (remoteData.business) business = { ...business, ...remoteData.business };
          if (remoteData.currency) currency = { ...currency, ...remoteData.currency };
        }
      } catch (e) {
        // Firestore offline / not reachable
      }

      set({ business, currency, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  updateBusinessProfile: async (updates) => {
    const nextBiz = { ...get().business, ...updates };
    set({ business: nextBiz });

    // Save locally
    await secureStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(nextBiz));

    // Sync to Firestore
    try {
      const ref = doc(db, 'settings', 'business_profile');
      await setDoc(ref, { business: nextBiz }, { merge: true });
    } catch (e) {
      // Offline fallback
    }
  },

  updateCurrencySettings: async (updates) => {
    const nextCurr = { ...get().currency, ...updates };
    set({ currency: nextCurr });

    await secureStorage.setItem(CURRENCY_SETTINGS_KEY, JSON.stringify(nextCurr));

    try {
      const ref = doc(db, 'settings', 'business_profile');
      await setDoc(ref, { currency: nextCurr }, { merge: true });
    } catch (e) {
      // Offline fallback
    }
  },

  updateAvatar: async (base64OrUri: string) => {
    await setPermanentAvatar(base64OrUri);
    await get().updateBusinessProfile({ avatarUrl: base64OrUri });
  },
}));
