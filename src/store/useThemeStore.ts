import React from 'react';
import { create } from 'zustand';
import { Appearance } from 'react-native';
import { AccentColor, ThemeMode, buildThemeColors, colors } from '@/theme/colors';
import { secureStorage } from '@/lib/storage/secureStorage';

const THEME_MODE_KEY = 'loanledger_theme_mode';
const ACCENT_COLOR_KEY = 'loanledger_accent_color';

interface ThemeState {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  isDark: boolean;
  isInitialized: boolean;

  initializeTheme: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setAccentColor: (accent: AccentColor) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'light',
  accentColor: 'violet',
  isDark: false,
  isInitialized: false,

  initializeTheme: async () => {
    try {
      const savedMode = (await secureStorage.getItem(THEME_MODE_KEY)) as ThemeMode | null;
      const savedAccent = (await secureStorage.getItem(ACCENT_COLOR_KEY)) as AccentColor | null;

      const themeMode: ThemeMode = savedMode || 'light';
      const accentColor: AccentColor = savedAccent || 'violet';

      const systemIsDark = Appearance.getColorScheme() === 'dark';
      const isDark = themeMode === 'system' ? systemIsDark : themeMode === 'dark';

      // Synchronize in-place colors object
      const nextColors = buildThemeColors(isDark, accentColor);
      Object.assign(colors, nextColors);

      set({
        themeMode,
        accentColor,
        isDark,
        isInitialized: true,
      });
    } catch {
      set({ isInitialized: true });
    }
  },

  setThemeMode: async (themeMode: ThemeMode) => {
    const { accentColor } = get();
    const systemIsDark = Appearance.getColorScheme() === 'dark';
    const isDark = themeMode === 'system' ? systemIsDark : themeMode === 'dark';

    const nextColors = buildThemeColors(isDark, accentColor);
    Object.assign(colors, nextColors);

    await secureStorage.setItem(THEME_MODE_KEY, themeMode);
    set({ themeMode, isDark });
  },

  setAccentColor: async (accentColor: AccentColor) => {
    const { isDark } = get();
    const nextColors = buildThemeColors(isDark, accentColor);
    Object.assign(colors, nextColors);

    await secureStorage.setItem(ACCENT_COLOR_KEY, accentColor);
    set({ accentColor });
  },
}));

// Quick hook to access active colors & theme state reactively
export function useTheme() {
  const { themeMode, accentColor, isDark, setThemeMode, setAccentColor } = useThemeStore();
  const activeColors = React.useMemo(() => {
    const c = buildThemeColors(isDark, accentColor);
    Object.assign(colors, c);
    return c;
  }, [isDark, accentColor]);

  return {
    colors: activeColors,
    themeMode,
    accentColor,
    isDark,
    setThemeMode,
    setAccentColor,
  };
}
