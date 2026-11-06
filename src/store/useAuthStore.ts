import { Platform } from 'react-native';
import { create } from 'zustand';
import { secureStorage } from '@/lib/storage/secureStorage';
import {
  getPermanentAvatarAsync,
  setPermanentAvatar,
} from '@/lib/storage/profileStorage';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { setActiveOrganizationId, clearActiveOrganization, getActiveOrganizationId, DEFAULT_ORG_ID } from '@/lib/supabase/activeOrg';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import type { User } from '@supabase/supabase-js';

const PIN_KEY = 'loanledger_user_pin';
const LOCK_ENABLED_KEY = 'loanledger_lock_enabled';
const BIOMETRIC_ENABLED_KEY = 'loanledger_biometric_enabled';
const USER_PASSWORD_KEY = 'loanledger_user_password';
const STORED_USER_KEY = 'loanledger_stored_user';
const SESSION_ACTIVE_KEY = 'loanledger_session_active';
export const SESSION_TIMEOUT_MINUTES_KEY = 'loanledger_session_timeout_minutes';
export const LAST_ACTIVE_TIME_KEY = 'loanledger_last_active_time';
export const LAST_ACTIVE_ROUTE_KEY = 'loanledger_last_active_route';

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
  isSessionTimedOut: boolean;
  sessionTimeoutMinutes: number;
  lastActiveTime: number;
  hasPinSet: boolean;
  isBiometricAvailable: boolean;
  isLockEnabled: boolean;
  isBiometricEnabled: boolean;
  biometricTypeLabel: string;
  biometricIconName: 'finger-print' | 'scan-outline' | 'eye-outline';
  supportedBiometricTypes: number[];

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
  setSessionTimeoutMinutes: (minutes: number) => Promise<void>;
  checkSessionTimeout: () => boolean;
  unlockSessionTimeout: () => void;
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
  isSessionTimedOut: false,
  sessionTimeoutMinutes: 30,
  hasPinSet: false,
  isBiometricAvailable: false,
  isLockEnabled: true,
  isBiometricEnabled: true,
  biometricTypeLabel: 'Biometric Unlock',
  biometricIconName: 'finger-print' as 'finger-print' | 'scan-outline' | 'eye-outline',
  supportedBiometricTypes: [] as number[],
  lastActiveTime: Date.now(),

  initialize: async () => {
    try {
      // Check biometrics hardware and all supported sensor types safely (Fingerprint, Face Unlock, Iris)
      let isBiometricAvailable = false;
      let supportedBiometricTypes: number[] = [];
      let biometricTypeLabel = 'Biometric Unlock';
      let biometricIconName: 'finger-print' | 'scan-outline' | 'eye-outline' = 'finger-print';

      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        isBiometricAvailable = Boolean(hasHardware && isEnrolled);

        if (hasHardware) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          supportedBiometricTypes = types || [];

          const hasFingerprint = types?.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
          const hasFace = types?.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
          const hasIris = types?.includes(LocalAuthentication.AuthenticationType.IRIS);

          if (hasFingerprint && hasFace) {
            biometricTypeLabel = 'Fingerprint & Face Unlock';
            biometricIconName = 'finger-print';
          } else if (hasFace) {
            biometricTypeLabel = Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
            biometricIconName = 'scan-outline';
          } else if (hasIris) {
            biometricTypeLabel = 'Iris Recognition';
            biometricIconName = 'eye-outline';
          } else if (hasFingerprint) {
            biometricTypeLabel = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
            biometricIconName = 'finger-print';
          } else {
            biometricTypeLabel = 'Biometric Unlock';
            biometricIconName = 'finger-print';
          }
        }
      } catch {
        isBiometricAvailable = false;
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

      // Check session timeout preference (default 30 mins, options: 15, 30, 45, 60)
      const storedTimeoutStr = await secureStorage.getItem(SESSION_TIMEOUT_MINUTES_KEY);
      const parsedTimeout = storedTimeoutStr ? parseInt(storedTimeoutStr, 10) : 30;
      const sessionTimeoutMinutes = [15, 30, 45, 60].includes(parsedTimeout) ? parsedTimeout : 30;

      // Check last active timestamp
      const storedLastActiveStr = await secureStorage.getItem(LAST_ACTIVE_TIME_KEY);
      let lastActiveTime = storedLastActiveStr ? parseInt(storedLastActiveStr, 10) : Date.now();
      if (isNaN(lastActiveTime) || lastActiveTime <= 0) {
        lastActiveTime = Date.now();
      }

      // Check persistent active session state
      const sessionActiveStr = await secureStorage.getItem(SESSION_ACTIVE_KEY);
      const isSessionActive = sessionActiveStr !== null ? sessionActiveStr === 'true' : true;

      // Inactivity timeout calculation:
      const now = Date.now();
      const elapsedMs = now - lastActiveTime;
      const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
      const isTimedOut = isSessionActive && (elapsedMs > timeoutMs);

      let shouldBeUnlocked = hasStoredAccount && !isTimedOut && (isSessionActive || !isLockEnabled);
      if (shouldBeUnlocked) {
        lastActiveTime = now;
        await secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now));
      }

      let resolvedUser: User | null = null;
      let resolvedProfile: StoredUserProfile | null = storedUser;

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

            resolvedUser = sbUser;
            resolvedProfile = profile;
            if (!isTimedOut) {
              shouldBeUnlocked = true;
            }
          } else if (storedUser?.email && storedPassword) {
            // Persistent session recovery: If the Supabase session token expired or was cleared after app close,
            // silently re-authenticate with the saved credentials so user is NEVER logged out unexpectedly.
            try {
              const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                email: storedUser.email,
                password: storedPassword,
              });

              if (!signInErr && signInData?.user) {
                const sbUser = signInData.user;
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

                resolvedUser = sbUser;
                resolvedProfile = profile;
                if (!isTimedOut) {
                  shouldBeUnlocked = true;
                }
              }
            } catch (reAuthErr) {
              console.warn('[Supabase Auth] Background re-auth notice:', reAuthErr);
            }
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

              const current = get();
              const keepLocked = current.isLocked || current.isSessionTimedOut;

              set({
                user: u,
                storedUser: profile,
                hasStoredAccount: true,
                adminUid: u.id,
                isLocked: keepLocked,
                isAuthenticatedSession: !keepLocked,
                isInitialized: true,
              });
            }
          });
        } catch (err: any) {
          console.warn('[Supabase Auth] Session init check notice:', err?.message || err);
        }
      }

      // Check DB backup for PIN if not present in local storage
      let finalPin = storedPin;
      if (!finalPin && isSupabaseConfigured()) {
        try {
          const userToCheck = resolvedUser;
          const metaPin = userToCheck?.user_metadata?.app_pin;
          if (metaPin && /^\d{4}$/.test(String(metaPin))) {
            finalPin = String(metaPin);
            await secureStorage.setItem(PIN_KEY, finalPin);
            await secureStorage.setItem(LOCK_ENABLED_KEY, 'true');
          } else {
            const orgId = await getActiveOrganizationId();
            if (orgId && orgId !== DEFAULT_ORG_ID) {
              const { data: orgSettings } = await (supabase.from('organization_settings') as any)
                .select('business_profile')
                .eq('organization_id', orgId)
                .maybeSingle();
              const dbPin = orgSettings?.business_profile?.security_pin;
              if (dbPin && /^\d{4}$/.test(String(dbPin))) {
                finalPin = String(dbPin);
                await secureStorage.setItem(PIN_KEY, finalPin);
                await secureStorage.setItem(LOCK_ENABLED_KEY, 'true');
              }
            }
          }
        } catch {}
      }
      const finalHasPinSet = Boolean(finalPin);

      const finalHasStoredAccount = Boolean(resolvedProfile || resolvedUser || hasStoredAccount);

      set({
        user: resolvedUser ?? get().user,
        storedUser: resolvedProfile,
        adminUid: resolvedUser?.id || resolvedProfile?.uid || '',
        hasStoredAccount: finalHasStoredAccount,
        hasPasswordSet,
        hasPinSet: finalHasPinSet,
        isBiometricAvailable,
        isLockEnabled,
        isBiometricEnabled,
        biometricTypeLabel,
        biometricIconName,
        supportedBiometricTypes,
        sessionTimeoutMinutes,
        lastActiveTime,
        isSessionTimedOut: isTimedOut,
        isLocked: !shouldBeUnlocked,
        isAuthenticatedSession: shouldBeUnlocked,
        isInitialized: true,
      });
    } catch {
      set({ isInitialized: true });
    }
  },

  signInWithGoogle: async () => {
    try {
      if (isSupabaseConfigured()) {
        const redirectUrl =
          Platform.OS === 'web'
            ? typeof window !== 'undefined' && window.location?.origin
              ? window.location.origin
              : 'http://localhost:8081'
            : 'senthurfinance://auth/callback';

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
          },
        });
        if (error) {
          if (
            error.message?.includes('provider is not enabled') ||
            (error as any)?.error_code === 'validation_failed' ||
            (error as any)?.status === 400
          ) {
            throw new Error(
              'Google OAuth is not enabled in your Supabase project. Please enable Google provider in Supabase Dashboard (Authentication > Providers > Google), or sign in with your Admin Email and Password.'
            );
          }
          throw error;
        }
        return { isNewUser: false, url: data?.url };
      }
      throw new Error('Supabase client is not configured. Please supply EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    } catch (err: any) {
      if (
        err?.message?.includes('provider is not enabled') ||
        err?.msg?.includes('provider is not enabled')
      ) {
        throw new Error(
          'Google OAuth is not enabled in your Supabase project. Please enable Google provider in Supabase Dashboard (Authentication > Providers > Google), or sign in with your Admin Email and Password.'
        );
      }
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
    await secureStorage.deleteItem(LAST_ACTIVE_TIME_KEY);
    await secureStorage.deleteItem(LAST_ACTIVE_ROUTE_KEY);
    set({
      user: null,
      storedUser: null,
      hasStoredAccount: false,
      adminUid: '',
      isLocked: true,
      isAuthenticatedSession: false,
      isSessionTimedOut: false,
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

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.updateUser({
          data: { avatar_url: photoURL },
        });
      } catch {}
    }
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
      const now = Date.now();
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      await secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now));
      set({
        isLocked: false,
        isAuthenticatedSession: true,
        isSessionTimedOut: false,
        lastActiveTime: now,
      });
      return true;
    }
    return false;
  },

  setupPin: async (pin: string) => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }

    // 1. Save to local storage (cross-platform and sync fallback for web)
    await secureStorage.setItem(PIN_KEY, pin);
    await secureStorage.setItem(LOCK_ENABLED_KEY, 'true');

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(PIN_KEY, pin);
        window.localStorage.setItem(LOCK_ENABLED_KEY, 'true');
      } catch {}
    }

    // 2. Sync to Supabase DB (Auth user metadata and organization_settings)
    if (isSupabaseConfigured()) {
      try {
        // A. Update user auth metadata
        await supabase.auth.updateUser({
          data: {
            app_pin: pin,
            has_pin: true,
            lock_enabled: true,
            pin_updated_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.warn('[setupPin] User metadata sync error:', err);
      }

      try {
        // B. Update organization_settings business_profile
        const orgId = await getActiveOrganizationId();
        if (orgId && orgId !== DEFAULT_ORG_ID) {
          const currentBiz = useBusinessSettingsStore.getState().business;
          await (supabase.from('organization_settings') as any).upsert({
            organization_id: orgId,
            business_profile: {
              ...currentBiz,
              security_pin: pin,
              has_pin_lock: true,
              pin_updated_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('[setupPin] Org settings sync error:', err);
      }
    }

    set({ hasPinSet: true, isLockEnabled: true });
  },

  unlockWithPin: async (pin: string) => {
    let storedPin = await secureStorage.getItem(PIN_KEY);
    if (!storedPin && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      storedPin = window.localStorage.getItem(PIN_KEY);
    }

    // DB fallback if local storage was cleared
    if (!storedPin && isSupabaseConfigured()) {
      const u = get().user;
      if (u?.user_metadata?.app_pin) {
        storedPin = String(u.user_metadata.app_pin);
        await secureStorage.setItem(PIN_KEY, storedPin);
      } else {
        const bizPin = useBusinessSettingsStore.getState().business?.security_pin;
        if (bizPin) {
          storedPin = String(bizPin);
          await secureStorage.setItem(PIN_KEY, storedPin);
        }
      }
    }

    const now = Date.now();
    if (storedPin && storedPin === pin) {
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      await secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now));
      set({
        isLocked: false,
        isAuthenticatedSession: true,
        isSessionTimedOut: false,
        lastActiveTime: now,
      });
      return true;
    }
    return false;
  },

  unlockWithBiometrics: async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Sri Senthur Finance',
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use 4-Digit PIN',
        disableDeviceFallback: false,
        requireConfirmation: false,
      });
      if (result.success) {
        const now = Date.now();
        await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
        await secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now));
        set({
          isLocked: false,
          isAuthenticatedSession: true,
          isSessionTimedOut: false,
          lastActiveTime: now,
        });
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
      const now = Date.now();
      await secureStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      await secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now));
      set({
        isLockEnabled: false,
        isLocked: false,
        isAuthenticatedSession: true,
        isSessionTimedOut: false,
        lastActiveTime: now,
      });
    } else {
      set({ isLockEnabled: true });
    }
  },

  setBiometricEnabled: async (enabled: boolean) => {
    await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
    set({ isBiometricEnabled: enabled });
  },

  setSessionTimeoutMinutes: async (minutes: number) => {
    await secureStorage.setItem(SESSION_TIMEOUT_MINUTES_KEY, String(minutes));
    set({ sessionTimeoutMinutes: minutes });
  },

  checkSessionTimeout: () => {
    const state = get();
    if (!state.hasStoredAccount || !state.isLockEnabled) {
      return false;
    }
    const now = Date.now();
    const elapsedMs = now - state.lastActiveTime;
    const timeoutMs = (state.sessionTimeoutMinutes || 30) * 60 * 1000;
    if (elapsedMs > timeoutMs) {
      set({ isSessionTimedOut: true, isLocked: true, isAuthenticatedSession: false });
      return true;
    }
    // Session is still active; maintain active session and update lastActiveTime
    set({
      lastActiveTime: now,
      isLocked: false,
      isAuthenticatedSession: true,
      isSessionTimedOut: false,
    });
    secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now)).catch(() => {});
    return false;
  },

  unlockSessionTimeout: () => {
    const now = Date.now();
    set({
      isSessionTimedOut: false,
      isLocked: false,
      isAuthenticatedSession: true,
      lastActiveTime: now,
    });
    secureStorage.setItem(SESSION_ACTIVE_KEY, 'true').catch(() => {});
    secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now)).catch(() => {});
  },

  lockApp: () => {
    secureStorage.deleteItem(SESSION_ACTIVE_KEY).catch(() => {});
    set({ isLocked: true, isAuthenticatedSession: false, isSessionTimedOut: true });
  },

  requireReauth: () => {
    secureStorage.deleteItem(SESSION_ACTIVE_KEY).catch(() => {});
    set({ isLocked: true, isAuthenticatedSession: false, isSessionTimedOut: true });
  },

  setSessionAuthenticated: (auth: boolean) => {
    const now = Date.now();
    set({
      isAuthenticatedSession: auth,
      isLocked: !auth,
      isSessionTimedOut: !auth,
      lastActiveTime: now,
    });
    if (auth) {
      secureStorage.setItem(SESSION_ACTIVE_KEY, 'true').catch(() => {});
      secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now)).catch(() => {});
    }
  },

  recordActivity: () => {
    const now = Date.now();
    set({ lastActiveTime: now });
    secureStorage.setItem(LAST_ACTIVE_TIME_KEY, String(now)).catch(() => {});
  },

  verifyBiometricsForSensitiveAction: async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify biometric identity to reveal sensitive KYC data',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        requireConfirmation: false,
      });
      return result.success;
    } catch {
      return true;
    }
  },
}));
