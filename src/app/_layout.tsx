import React, { useEffect, useRef, useState } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore, useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: 'auth/login',
};

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

  const [isSplashActive, setIsSplashActive] = useState(true);

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
  const { isInitialized, isAuthenticatedSession, hasStoredAccount, requireReauth } = useAuthStore();
  const { colors: dynamicColors, isDark } = useTheme();

  const router = useRouter();
  const segments = useSegments();
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    initializeAuth();
    initializeTheme();
    initializeBusiness();
  }, [initializeAuth, initializeTheme, initializeBusiness]);

  // Synchronize web document theme attribute and CSS input autofill variables
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      document.documentElement.style.setProperty('--sf-input-bg', isDark ? '#333333' : '#FFFFFF');
      document.documentElement.style.setProperty('--sf-input-text', isDark ? '#FFFFFF' : '#111111');
      document.body.style.backgroundColor = isDark ? '#272727' : '#F4F4F6';
    }
  }, [isDark]);

  // App lock timeout: only lock if app has been in background/inactive for at least 15 minutes
  useEffect(() => {
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prevAppState = appStateRef.current;

      if (
        (prevAppState === 'active' || prevAppState === null) &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        // Record timestamp when the user leaves the app
        backgroundTimeRef.current = Date.now();
      } else if (
        (prevAppState === 'background' || prevAppState === 'inactive') &&
        nextAppState === 'active'
      ) {
        // Re-entering active state: check elapsed time since leaving
        if (backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          if (elapsed >= FIFTEEN_MINUTES_MS) {
            requireReauth();
          }
        }
        backgroundTimeRef.current = null;
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [requireReauth]);

  // Enforce Lock screen (password unlock) or Login page whenever session is unauthenticated
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticatedSession && !inAuthGroup) {
      if (hasStoredAccount) {
        router.replace('/auth/lock' as any);
      } else {
        router.replace('/auth/login' as any);
      }
    } else if (isAuthenticatedSession && inAuthGroup) {
      router.replace('/' as any);
    }
  }, [fontsLoaded, fontError, isInitialized, isAuthenticatedSession, hasStoredAccount, segments]);

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

      {isSplashActive && (
        <SplashScreenView
          duration={5500}
          onFinish={() => setIsSplashActive(false)}
        />
      )}
    </AppProviders>
  );
}
