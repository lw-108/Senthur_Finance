import { Platform } from 'react-native';
import { create } from 'zustand';
import { secureStorage } from '@/lib/storage/secureStorage';
import {
  getPermanentAvatarAsync,
  setPermanentAvatar,
} from '@/lib/storage/profileStorage';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { setActiveOrganizationId, clearActiveOrganization } from '@/lib/supabase/activeOrg';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import type { User } from '@supabase/supabase-js';

const PIN_KEY = 'loanledger_user_pin';
const LOCK_ENABLED_KEY = 'loanledger_lock_enabled';
const BIOMETRIC_ENABLED_KEY = 'loanledger_biometric_enabled';
const USER_PASSWORD_KEY = 'loanledger_user_password';
const STORED_USER_KEY = 'loanledger_stored_user';
const SESSION_ACTIVE_KEY = 'loanledger_session_active';

export interface StoredUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  authProvider: 'google' | 'password';
}

interface AuthState {
  user: User | null;
  storedUser: StoredUserProfile | null;
  hasStoredAccount: boolean;
  hasPasswordSet: boolean;
  adminUid: string;
  isInitialized: boolean;
  isLocked: boolean;
  isAuthenticatedSession: boolean;
  hasPinSet: boolean;
  isBiometricAvailable: boolean;
  isLockEnabled: boolean;
  isBiometricEnabled: boolean;
  lastActiveTime: number;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser?: boolean }>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePhotoURL: (photoURL: string) => Promise<void>;

  // App Lock & Password Security
  setUserPassword: (password: string) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  setLockEnabled: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  lockApp: () => void;
  requireReauth: () => void;
  setSessionAuthenticated: (auth: boolean) => void;
  recordActivity: () => void;
  verifyBiometricsForSensitiveAction: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  storedUser: null,
  hasStoredAccount: false,
  hasPasswordSet: false,
  adminUid: '',
  isInitialized: false,
  isLocked: true,
  isAuthenticatedSession: false,
  hasPinSet: false,
  isBiometricAvailable: false,
  isLockEnabled: true,
  isBiometricEnabled: true,
  lastActiveTime: Date.now(),

  initialize: async () => {
    try {
      // Check biometrics hardware safely
      let isBiometricAvailable = false;
      if (Platform.OS !== 'web') {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          isBiometricAvailable = hasHardware && isEnrolled;
        } catch {
          isBiometricAvailable = false;
        }
      }

      // Check stored PIN via cross-platform storage
      const storedPin = await secureStorage.getItem(PIN_KEY);
      const hasPinSet = Boolean(storedPin);

      // Check stored user password
      const storedPassword = await secureStorage.getItem(USER_PASSWORD_KEY);
      const hasPasswordSet = Boolean(storedPassword);

      // Check stored user profile from previous sign-in
      const storedUserStr = await secureStorage.getItem(STORED_USER_KEY);
      let storedUser: StoredUserProfile | null = null;
      if (storedUserStr) {
        try {
          storedUser = JSON.parse(storedUserStr);
        } catch {}
      }
      const permanentAvatar = await getPermanentAvatarAsync();
      if (storedUser) {
        if (!storedUser.photoURL && permanentAvatar) {
          storedUser.photoURL = permanentAvatar;
        }
      }
      const hasStoredAccount = Boolean(storedUser);

      // Check lock preference
      const lockPref = await secureStorage.getItem(LOCK_ENABLED_KEY);
      const isLockEnabled = lockPref !== null ? lockPref === 'true' : true;

      // Check biometric preference
      const bioPref = await secureStorage.getItem(BIOMETRIC_ENABLED_KEY);
      const isBiometricEnabled = bioPref !== null ? bioPref === 'true' : true;

      // Check persistent active session state
      const sessionActiveStr = await secureStorage.getItem(SESSION_ACTIVE_KEY);
      const isSessionActive = sessionActiveStr !== null ? sessionActiveStr === 'true' : true;
      const shouldBeUnlocked = hasStoredAccount && (isSessionActive || !isLockEnabled);

      // Supabase Auth Session Initialization & Subscription
      if (isSupabaseConfigured()) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const sbUser = sessionData.session.user;
            (sbUser as any).uid = sbUser.id;
            const activeAvatar = (await getPermanentAvatarAsync()) || sbUser.user_metadata?.avatar_url || null;
            const profile: StoredUserProfile = {
              uid: sbUser.id,
              email: sbUser.email || null,
              displayName: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
              photoURL: activeAvatar,
              authProvider: 'password',
            };
            await secureStorage.setItem(STORED_USER_KEY, JSON.stringify(profile));
            await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');

            // Attempt to resolve and activate user's tenant organization
            try {
              const { data: membership } = await supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', sbUser.id)
                .limit(1)
                .maybeSingle();

              if (membership?.organization_id) {
                await setActiveOrganizationId(membership.organization_id);
              }
            } catch {}

            set({
              user: sbUser,
              storedUser: profile,
              hasStoredAccount: true,
              adminUid: sbUser.id,
              isLocked: false,
              isAuthenticatedSession: true,
              isInitialized: true,
            });
          }

          // Listen for live Supabase Auth state changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
              const u = session.user;
              (u as any).uid = u.id;
              const activeAvatar = (await getPermanentAvatarAsync()) || u.user_metadata?.avatar_url || null;
              const profile: StoredUserProfile = {
                uid: u.id,
                email: u.email || null,
                displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
                photoURL: activeAvatar,
                authProvider: 'password',
              };
              await secureStorage.setItem(STORED_USER_KEY, JSON.stringify(profile));
              await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');

              set({
                user: u,
                storedUser: profile,
                hasStoredAccount: true,
                adminUid: u.id,
                isLocked: false,
                isAuthenticatedSession: true,
                isInitialized: true,
              });
            }
          });
        } catch (err: any) {
          console.warn('[Supabase Auth] Session init check notice:', err?.message || err);
        }
      }

      set({
        storedUser,
        adminUid: storedUser?.uid || '',
        hasStoredAccount,
        hasPasswordSet,
        hasPinSet,
        isBiometricAvailable,
        isLockEnabled,
        isBiometricEnabled,
        isLocked: !shouldBeUnlocked,
        isAuthenticatedSession: shouldBeUnlocked,
        isInitialized: true,
      });
    } catch (e) {
      set({ isInitialized: true });
    }
  },

  signInWithGoogle: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: Platform.OS === 'web' ? window.location.origin : 'senthurfinance://auth/callback',
          },
        });
        if (error) {
          throw error;
        }
        return { isNewUser: false };
      }
      throw new Error('Supabase client is not configured. Please supply EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    } catch (err: any) {
      throw err;
    }
  },

  signIn: async (email: string, pass: string) => {
    const trimmedEmail = email.trim();

    // 1. Authenticate via Supabase Auth
    if (isSupabaseConfigured()) {
      const { data: sbRes, error: sbErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });

      if (sbErr) {
        // If Supabase returns invalid login credentials or error, throw it
        throw new Error(sbErr.message || 'Invalid email or password.');
      }

      if (sbRes?.user) {
        const sbUser = sbRes.user;
        (sbUser as any).uid = sbUser.id;
        const activeAvatar = (await getPermanentAvatarAsync()) || sbUser.user_metadata?.avatar_url || null;
        const storedProfile: StoredUserProfile = {
          uid: sbUser.id,
          email: sbUser.email || null,
          displayName: sbUser.user_metadata?.full_name || trimmedEmail.split('@')[0],
          photoURL: activeAvatar,
          authProvider: 'password',
        };
        await secureStorage.setItem(STORED_USER_KEY, JSON.stringify(storedProfile));
        await secureStorage.setItem(USER_PASSWORD_KEY, pass);
        await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');

        // Resolve active organization for tenant scoping
        try {
          const { data: membership } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', sbUser.id)
            .limit(1)
            .maybeSingle();

          if (membership?.organization_id) {
            await setActiveOrganizationId(membership.organization_id);
            // Sync user's configured organization name with database
            try {
              const currentName = useBusinessSettingsStore.getState().business.businessName?.trim();
              if (currentName) {
                await (supabase.from('organizations') as any)
                  .update({ name: currentName, updated_at: new Date().toISOString() })
                  .eq('id', membership.organization_id);
                await (supabase.from('organization_settings') as any)
                  .upsert({
                    organization_id: membership.organization_id,
                    business_profile: {
                      ...useBusinessSettingsStore.getState().business,
                      businessName: currentName,
                    },
                    updated_at: new Date().toISOString(),
                  });
              } else {
                await useBusinessSettingsStore.getState().initialize();
              }
            } catch {}
          }
        } catch {}

        set({
          user: sbUser,
          storedUser: storedProfile,
          hasStoredAccount: true,
          hasPasswordSet: true,
          adminUid: sbUser.id,
          isLocked: false,
          isAuthenticatedSession: true,
          lastActiveTime: Date.now(),
        });
        return;
      }
    }

    // 2. Offline / local fallback for zero-network development and testing
    if (trimmedEmail.length > 0 && pass.length >= 6) {
      const activeAvatar = await getPermanentAvatarAsync();
      const localUid = `user-${Date.now()}`;
      const fallbackUser: StoredUserProfile = {
        uid: localUid,
        email: trimmedEmail,
        displayName: trimmedEmail.split('@')[0],
        photoURL: activeAvatar,
        authProvider: 'password',
      };
      await secureStorage.setItem(STORED_USER_KEY, JSON.stringify(fallbackUser));
      await secureStorage.setItem(USER_PASSWORD_KEY, pass);
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');

      set({
        user: fallbackUser as any,
        storedUser: fallbackUser,
        hasStoredAccount: true,
        hasPasswordSet: true,
        adminUid: localUid,
        isLocked: false,
        isAuthenticatedSession: true,
        lastActiveTime: Date.now(),
      });
      return;
    }

    throw new Error('Please enter a valid email and password (minimum 6 characters).');
  },

  signUp: async (email: string, pass: string) => {
    const trimmedEmail = email.trim();

    if (isSupabaseConfigured()) {
      const { data: sbRes, error: sbErr } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: pass,
      });

      if (sbErr) {
        // If user already registered, fallback gracefully to signIn
        if (sbErr.message?.toLowerCase().includes('already registered')) {
          await get().signIn(trimmedEmail, pass);
          return;
        }
        throw new Error(sbErr.message || 'Sign up failed.');
      }

      if (sbRes?.user) {
        const sbUser = sbRes.user;
        (sbUser as any).uid = sbUser.id;
        const activeAvatar = await getPermanentAvatarAsync();
        const storedProfile: StoredUserProfile = {
          uid: sbUser.id,
          email: sbUser.email || null,
          displayName: trimmedEmail.split('@')[0],
          photoURL: activeAvatar,
          authProvider: 'password',
        };
        await secureStorage.setItem(STORED_USER_KEY, JSON.stringify(storedProfile));
        await secureStorage.setItem(USER_PASSWORD_KEY, pass);
        await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');

        // Provision initial tenant organization if trigger did not auto-run
        try {
          const configuredName = useBusinessSettingsStore.getState().business.businessName?.trim();
          const orgName = configuredName || `${trimmedEmail.split('@')[0]}'s Finance`;
          const { data: org } = await (supabase.from('organizations') as any)
            .insert({ name: orgName, status: 'active' })
            .select()
            .single();

          if (org) {
            await (supabase.from('organization_members') as any).insert({
              organization_id: org.id,
              user_id: sbUser.id,
              role: 'owner',
              status: 'active',
            });
            await (supabase.from('organization_settings') as any).insert({
              organization_id: org.id,
              business_profile: {
                ...useBusinessSettingsStore.getState().business,
                businessName: orgName,
                email: trimmedEmail,
              },
            });
            await setActiveOrganizationId(org.id);
          }
        } catch {}

        // Resolve active organization created by database trigger or insert
        try {
          const { data: membership } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', sbUser.id)
            .limit(1)
            .maybeSingle();

          if (membership?.organization_id) {
            await setActiveOrganizationId(membership.organization_id);
            // Sync user's configured organization name with database
            try {
              const currentName = useBusinessSettingsStore.getState().business.businessName?.trim();
              if (currentName) {
                await (supabase.from('organizations') as any)
                  .update({ name: currentName, updated_at: new Date().toISOString() })
                  .eq('id', membership.organization_id);
                await (supabase.from('organization_settings') as any)
                  .upsert({
                    organization_id: membership.organization_id,
                    business_profile: {
                      ...useBusinessSettingsStore.getState().business,
                      businessName: currentName,
                    },
                    updated_at: new Date().toISOString(),
                  });
              } else {
                await useBusinessSettingsStore.getState().initialize();
              }
            } catch {}
          }
        } catch {}

        set({
          user: sbUser,
          storedUser: storedProfile,
          hasStoredAccount: true,
          hasPasswordSet: true,
          adminUid: sbUser.id,
          isLocked: false,
          isAuthenticatedSession: true,
          lastActiveTime: Date.now(),
        });
        return;
      }
    }

    // Offline / local fallback for development
    if (trimmedEmail.length > 0 && pass.length >= 6) {
      const activeAvatar = await getPermanentAvatarAsync();
      const localUid = `user-${Date.now()}`;
      const fallbackUser: StoredUserProfile = {
        uid: localUid,
        email: trimmedEmail,
        displayName: trimmedEmail.split('@')[0] || 'User',
        photoURL: activeAvatar,
        authProvider: 'password',
      };
      await secureStorage.setItem(STORED_USER_KEY, JSON.stringify(fallbackUser));
      await secureStorage.setItem(USER_PASSWORD_KEY, pass);
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');

      set({
        user: fallbackUser as any,
        storedUser: fallbackUser,
        hasStoredAccount: true,
        hasPasswordSet: true,
        adminUid: localUid,
        isLocked: false,
        isAuthenticatedSession: true,
        lastActiveTime: Date.now(),
      });
      return;
    }

    throw new Error('Please enter a valid email and password (minimum 6 characters).');
  },

  signOut: async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    await clearActiveOrganization();
    await secureStorage.deleteItem(STORED_USER_KEY);
    await secureStorage.deleteItem(SESSION_ACTIVE_KEY);
    set({
      user: null,
      storedUser: null,
      hasStoredAccount: false,
      adminUid: '',
      isLocked: true,
      isAuthenticatedSession: false,
    });
  },

  resetPassword: async (email: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        throw new Error(error.message);
      }
      return;
    }
    throw new Error('Supabase client is not configured to send password reset email.');
  },

  updatePhotoURL: async (photoURL: string) => {
    await setPermanentAvatar(photoURL);
    const current = get().storedUser;
    const updated: StoredUserProfile = current
      ? { ...current, photoURL }
      : {
          uid: get().adminUid || `user-${Date.now()}`,
          email: '',
          displayName: 'Admin User',
          photoURL,
          authProvider: 'password',
        };
    await secureStorage.setItem(STORED_USER_KEY, JSON.stringify(updated));
    set({ storedUser: updated });
  },

  setUserPassword: async (password: string) => {
    await secureStorage.setItem(USER_PASSWORD_KEY, password);
    set({ hasPasswordSet: true });
  },

  unlockWithPassword: async (password: string) => {
    const stored = await secureStorage.getItem(USER_PASSWORD_KEY);
    if (!stored) {
      return false;
    }
    if (password === stored) {
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      set({
        isLocked: false,
        isAuthenticatedSession: true,
        lastActiveTime: Date.now(),
      });
      return true;
    }
    return false;
  },

  setupPin: async (pin: string) => {
    await secureStorage.setItem(PIN_KEY, pin);
    await secureStorage.setItem(LOCK_ENABLED_KEY, 'true');
    set({ hasPinSet: true, isLockEnabled: true });
  },

  unlockWithPin: async (pin: string) => {
    const storedPin = await secureStorage.getItem(PIN_KEY);
    if (!storedPin) {
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      set({ isLocked: false, isAuthenticatedSession: true, lastActiveTime: Date.now() });
      return true;
    }
    if (storedPin === pin) {
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      set({ isLocked: false, isAuthenticatedSession: true, lastActiveTime: Date.now() });
      return true;
    }
    return false;
  },

  unlockWithBiometrics: async () => {
    if (Platform.OS === 'web') {
      return false;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Administrator Portal',
        fallbackLabel: 'Use Password',
      });
      if (result.success) {
        await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
        set({ isLocked: false, isAuthenticatedSession: true, lastActiveTime: Date.now() });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  setLockEnabled: async (enabled: boolean) => {
    await secureStorage.setItem(LOCK_ENABLED_KEY, String(enabled));
    if (!enabled) {
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      set({ isLockEnabled: false, isLocked: false, isAuthenticatedSession: true });
    } else {
      set({ isLockEnabled: true });
    }
  },

  setBiometricEnabled: async (enabled: boolean) => {
    await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
    set({ isBiometricEnabled: enabled });
  },

  lockApp: () => {
    secureStorage.deleteItem(SESSION_ACTIVE_KEY).catch(() => {});
    set({ isLocked: true, isAuthenticatedSession: false });
  },

  requireReauth: () => {
    secureStorage.deleteItem(SESSION_ACTIVE_KEY).catch(() => {});
    set({ isLocked: true, isAuthenticatedSession: false });
  },

  setSessionAuthenticated: (auth: boolean) => {
    set({ isAuthenticatedSession: auth, isLocked: !auth, lastActiveTime: Date.now() });
  },

  recordActivity: () => {
    set({ lastActiveTime: Date.now() });
  },

  verifyBiometricsForSensitiveAction: async () => {
    if (Platform.OS === 'web') {
      return true;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify biometric identity to reveal sensitive KYC data',
        cancelLabel: 'Cancel',
      });
      return result.success;
    } catch {
      return true;
    }
  },
}));
