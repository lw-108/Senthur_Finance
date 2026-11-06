import React, { useEffect, useState, useRef } from 'react';
import { Platform, View, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { NotoSansTamil_600SemiBold } from '@expo-google-fonts/noto-sans-tamil';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { AppProviders } from '@/providers/AppProviders';
import { colors } from '@/theme/colors';
import { SplashScreenView } from '@/components/ui';
import { useAuthStore, LAST_ACTIVE_ROUTE_KEY } from '@/store/useAuthStore';
import { useThemeStore, useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { InitialSetupModal, isSetupCompleted } from '@/components/onboarding/InitialSetupModal';
import { secureStorage } from '@/lib/storage/secureStorage';
import LockScreen from './auth/lock';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Module-level guard: ensures splash screen only displays once on initial boot, never on app switch
let hasCompletedInitialSplash = false;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Polymath: require('../../assets/Polymath.otf'),
    PolymathThin: require('../../assets/PolymathThin.otf'),
    BarlowCondensed_700Bold,
    NotoSansTamil_600SemiBold,
    SpaceGrotesk: SpaceGrotesk_600SemiBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const [isSplashActive, setIsSplashActive] = useState(() => !hasCompletedInitialSplash);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    // Check if splash was already presented in this app session/lifecycle
    secureStorage.getItem('loanledger_splash_shown').then((shown) => {
      if (shown === 'true') {
        hasCompletedInitialSplash = true;
        setIsSplashActive(false);
      }
    }).catch(() => {});

    isSetupCompleted().then((completed) => {
      if (!completed) {
        setShowSetupModal(true);
      }
    });
  }, []);

  const handleSplashFinish = () => {
    hasCompletedInitialSplash = true;
    setIsSplashActive(false);
    secureStorage.setItem('loanledger_splash_shown', 'true').catch(() => {});
  };

  // Connect Google Fonts link for web environments
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const linkId = 'google-font-space-grotesk';
      if (!document.getElementById(linkId)) {
        const preconnect1 = document.createElement('link');
        preconnect1.rel = 'preconnect';
        preconnect1.href = 'https://fonts.googleapis.com';
        document.head.appendChild(preconnect1);

        const preconnect2 = document.createElement('link');
        preconnect2.rel = 'preconnect';
        preconnect2.href = 'https://fonts.gstatic.com';
        preconnect2.crossOrigin = 'anonymous';
        document.head.appendChild(preconnect2);

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  const initializeAuth = useAuthStore((s) => s.initialize);
  const initializeTheme = useThemeStore((s) => s.initializeTheme);
  const initializeBusiness = useBusinessSettingsStore((s) => s.initialize);
  const {
    isInitialized,
    isAuthenticatedSession,
    isLocked,
    hasStoredAccount,
    checkSessionTimeout,
    unlockSessionTimeout,
    recordActivity,
  } = useAuthStore();
  const { colors: dynamicColors, isDark } = useTheme();

  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const appState = useRef(AppState.currentState);
  const [hasRestoredRoute, setHasRestoredRoute] = useState(false);

  useEffect(() => {
    initializeAuth();
    initializeTheme();
    initializeBusiness();
  }, [initializeAuth, initializeTheme, initializeBusiness]);

  // Monitor AppState to maintain session for configured timeout (e.g. 30 mins) during app switch / phone sleep
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextAppState;

      if (prev.match(/inactive|background/) && nextAppState === 'active') {
        // App returned to foreground: check if session timed out
        checkSessionTimeout();
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background or phone entering sleep mode: record activity timestamp
        recordActivity();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkSessionTimeout, recordActivity]);

  // Track active page route only after restoration has completed, so root route '/' never overwrites user's active viewing page
  useEffect(() => {
    if (!hasRestoredRoute) return;
    if (pathname && !pathname.startsWith('/auth') && pathname !== '/') {
      secureStorage.setItem(LAST_ACTIVE_ROUTE_KEY, pathname).catch(() => {});
      recordActivity();
    }
  }, [pathname, hasRestoredRoute, recordActivity]);

  // Synchronize web document theme attribute and CSS input autofill variables
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      document.documentElement.style.setProperty('--sf-input-bg', isDark ? '#333333' : '#FFFFFF');
      document.documentElement.style.setProperty('--sf-input-text', isDark ? '#FFFFFF' : '#111111');
      document.body.style.backgroundColor = isDark ? '#272727' : '#F4F4F6';
    }
  }, [isDark]);

  // Enforce auth route navigation only on cold start without account or restore active page route
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!hasStoredAccount && !inAuthGroup) {
      router.replace('/auth/login' as any);
      setHasRestoredRoute(true);
    } else if (isAuthenticatedSession) {
      if (!hasRestoredRoute) {
        secureStorage
          .getItem(LAST_ACTIVE_ROUTE_KEY)
          .then((lastRoute) => {
            if (lastRoute && !lastRoute.startsWith('/auth') && lastRoute !== '/' && lastRoute !== pathname) {
              router.replace(lastRoute as any);
            }
          })
          .catch(() => {})
          .finally(() => {
            setHasRestoredRoute(true);
          });
      } else if (inAuthGroup) {
        secureStorage
          .getItem(LAST_ACTIVE_ROUTE_KEY)
          .then((lastRoute) => {
            if (lastRoute && !lastRoute.startsWith('/auth') && lastRoute !== '/') {
              router.replace(lastRoute as any);
            } else {
              router.replace('/' as any);
            }
          })
          .catch(() => {
            router.replace('/' as any);
          });
      }
    }
  }, [fontsLoaded, fontError, isInitialized, isAuthenticatedSession, hasStoredAccount, segments, hasRestoredRoute, pathname]);

  // Web accessibility: blur active element on route change to prevent "Blocked aria-hidden" when screens hide
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && typeof activeEl.blur === 'function' && activeEl !== document.body) {
        activeEl.blur();
      }
    }
  }, [segments]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const inAuthGroup = segments[0] === 'auth';
  const isLockOverlayVisible =
    isInitialized &&
    hasStoredAccount &&
    (!isAuthenticatedSession || isLocked) &&
    !inAuthGroup;

  return (
    <AppProviders>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: dynamicColors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="customers/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="customers/new"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="loans/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="loans/new"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="payments/new"
          options={{
            headerShown: false,
            presentation: Platform.OS === 'web' ? 'card' : 'modal',
          }}
        />
        <Stack.Screen
          name="calculator"
          options={{
            headerShown: false,
            presentation: Platform.OS === 'web' ? 'card' : 'modal',
          }}
        />
        <Stack.Screen
          name="reports"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings/loan-types"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="proof-viewer"
          options={{
            headerShown: false,
            presentation: Platform.OS === 'web' ? 'card' : 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="auth/lock"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>

      {isLockOverlayVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <LockScreen
            isOverlay
            onUnlockSuccess={() => {
              unlockSessionTimeout();
            }}
          />
        </View>
      )}

      {isSplashActive && !hasCompletedInitialSplash && (
        <SplashScreenView
          duration={3000}
          isReady={isInitialized && (Boolean(fontsLoaded) || Boolean(fontError))}
          onFinish={handleSplashFinish}
        />
      )}

      {showSetupModal && !isSplashActive && (
        <InitialSetupModal
          visible={showSetupModal && !isSplashActive}
          onComplete={() => setShowSetupModal(false)}
        />
      )}
    </AppProviders>
  );
}
