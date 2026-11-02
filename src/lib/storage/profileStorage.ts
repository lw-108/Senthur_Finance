import { Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { secureStorage } from './secureStorage';

export const PERMANENT_AVATAR_KEY = 'senthur_permanent_user_avatar';
export const DEFAULT_AVATAR_URL = '';

// In-memory cache for ultra-fast, synchronous access
let memoryAvatarCache: string | null = null;
const listeners = new Set<(uri: string) => void>();

function notifyListeners(uri: string) {
  listeners.forEach((listener) => {
    try {
      listener(uri);
    } catch {}
  });
}

/**
 * Get the permanent profile picture synchronously (on Web via localStorage, or from memory cache)
 */
export function getPermanentAvatarSync(): string {
  if (memoryAvatarCache) {
    return memoryAvatarCache;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      // 1. Check primary permanent avatar key
      const direct = window.localStorage.getItem(PERMANENT_AVATAR_KEY);
      if (direct && direct.trim().length > 0) {
        memoryAvatarCache = direct;
        return direct;
      }

      // 2. Check business profile storage
      const bizStr = window.localStorage.getItem('loanledger_business_profile');
      if (bizStr) {
        const parsed = JSON.parse(bizStr);
        if (parsed?.avatarUrl && typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim().length > 0) {
          memoryAvatarCache = parsed.avatarUrl;
          window.localStorage.setItem(PERMANENT_AVATAR_KEY, parsed.avatarUrl);
          return parsed.avatarUrl;
        }
      }

      // 3. Check stored user profile
      const userStr = window.localStorage.getItem('loanledger_stored_user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed?.photoURL && typeof parsed.photoURL === 'string' && parsed.photoURL.trim().length > 0) {
          memoryAvatarCache = parsed.photoURL;
          window.localStorage.setItem(PERMANENT_AVATAR_KEY, parsed.photoURL);
          return parsed.photoURL;
        }
      }
    } catch {
      // Storage access blocked or parse error
    }
  }

  return DEFAULT_AVATAR_URL;
}

/**
 * Get the permanent profile picture asynchronously (cross-platform)
 */
export async function getPermanentAvatarAsync(): Promise<string> {
  const syncVal = getPermanentAvatarSync();
  if (syncVal !== DEFAULT_AVATAR_URL) {
    return syncVal;
  }

  try {
    const stored = await secureStorage.getItem(PERMANENT_AVATAR_KEY);
    if (stored && stored.trim().length > 0) {
      memoryAvatarCache = stored;
      notifyListeners(stored);
      return stored;
    }

    const bizStr = await secureStorage.getItem('loanledger_business_profile');
    if (bizStr) {
      const parsed = JSON.parse(bizStr);
      if (parsed?.avatarUrl && typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.trim().length > 0) {
        memoryAvatarCache = parsed.avatarUrl;
        await secureStorage.setItem(PERMANENT_AVATAR_KEY, parsed.avatarUrl);
        notifyListeners(parsed.avatarUrl);
        return parsed.avatarUrl;
      }
    }

    const userStr = await secureStorage.getItem('loanledger_stored_user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed?.photoURL && typeof parsed.photoURL === 'string' && parsed.photoURL.trim().length > 0) {
        memoryAvatarCache = parsed.photoURL;
        await secureStorage.setItem(PERMANENT_AVATAR_KEY, parsed.photoURL);
        notifyListeners(parsed.photoURL);
        return parsed.photoURL;
      }
    }
  } catch {}

  return DEFAULT_AVATAR_URL;
}

/**
 * Save profile avatar permanently into local storage lifelong
 */
export async function setPermanentAvatar(avatarUri: string): Promise<void> {
  if (!avatarUri || avatarUri.trim().length === 0) {
    memoryAvatarCache = '';
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(PERMANENT_AVATAR_KEY);
      } catch {}
    }
    try {
      await secureStorage.removeItem(PERMANENT_AVATAR_KEY);
    } catch {}
    notifyListeners('');
    return;
  }

  memoryAvatarCache = avatarUri;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(PERMANENT_AVATAR_KEY, avatarUri);
    } catch {}
  }

  try {
    await secureStorage.setItem(PERMANENT_AVATAR_KEY, avatarUri);
  } catch {}

  notifyListeners(avatarUri);
}

/**
 * React hook to listen for lifelong avatar changes across all pages dynamically
 */
export function usePermanentAvatar(): string {
  const [avatar, setAvatar] = useState<string>(() => getPermanentAvatarSync());

  useEffect(() => {
    // Initial async verification
    getPermanentAvatarAsync().then((stored) => {
      if (stored && stored !== avatar) {
        setAvatar(stored);
      }
    });

    // Subscribe to runtime updates
    const listener = (newUri: string) => {
      setAvatar(newUri);
    };
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return avatar;
}
