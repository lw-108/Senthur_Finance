import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Database } from './types';

// Hardcoded production fallbacks to ensure standalone native packages (APK / AAB)
// can reach the Supabase backend even if EAS or release build didn't inline .env
const PRODUCTION_SUPABASE_URL = 'https://klkmjgczxzqwtfysfrcy.supabase.co';
const PRODUCTION_SUPABASE_ANON_KEY = 'sb_publishable_uIXLstdjz_y8QWva3pzn_Q_NoQ75mtI';

const rawSupabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  PRODUCTION_SUPABASE_ANON_KEY;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || PRODUCTION_SUPABASE_URL;
const SUPABASE_ANON_KEY = rawSupabaseKey || PRODUCTION_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  if (process.env.NODE_ENV === 'test' && !process.env.EXPO_PUBLIC_SUPABASE_URL) {
    return false;
  }
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('placeholder') &&
    !SUPABASE_ANON_KEY.includes('placeholder')
  );
};

export const isValidUUID = (id: string | null | undefined): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
};

// Android KeyStore has a hard 2048-byte limit per key in EncryptedSharedPreferences.
// Supabase auth sessions (access token JWT + refresh token + user metadata) typically
// measure 2.5KB - 4KB, causing silent storage write failures on native Android unless chunked.
const CHUNK_SIZE = 1800;

// Cross-platform session persistence adapter with automatic chunking for Android
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        if (!isNaN(count) && count > 0) {
          const parts: string[] = [];
          for (let i = 0; i < count; i++) {
            const part = await SecureStore.getItemAsync(`${key}__chunk_${i}`);
            if (part !== null) {
              parts.push(part);
            }
          }
          return parts.join('');
        }
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    try {
      if (value.length <= CHUNK_SIZE) {
        // Clean up old chunks if previously chunked
        const oldCount = await SecureStore.getItemAsync(`${key}__chunks`);
        if (oldCount) {
          const c = parseInt(oldCount, 10);
          for (let i = 0; i < c; i++) {
            await SecureStore.deleteItemAsync(`${key}__chunk_${i}`).catch(() => {});
          }
          await SecureStore.deleteItemAsync(`${key}__chunks`).catch(() => {});
        }
        await SecureStore.setItemAsync(key, value);
      } else {
        const numChunks = Math.ceil(value.length / CHUNK_SIZE);
        for (let i = 0; i < numChunks; i++) {
          const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}__chunk_${i}`, chunk);
        }
        await SecureStore.setItemAsync(`${key}__chunks`, String(numChunks));
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
    } catch (e) {
      console.warn(`[Supabase Storage] setItem failed for "${key}":`, e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}__chunk_${i}`).catch(() => {});
        }
        await SecureStore.deleteItemAsync(`${key}__chunks`).catch(() => {});
      }
      await SecureStore.deleteItemAsync(key).catch(() => {});
    } catch {}
  },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
