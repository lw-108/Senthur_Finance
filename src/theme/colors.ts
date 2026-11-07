export type AccentColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AccentPalette {
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  primaryBorder: string;
}

export const ACCENT_PALETTES: Record<AccentColor, AccentPalette> = {
  violet: {
    name: 'Lavender Violet',
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    primaryLight: '#EDE9FE',
    primarySoft: '#F5F3FF',
    primaryBorder: '#DDD6FE',
  },
  blue: {
    name: 'Royal Blue',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#DBEAFE',
    primarySoft: '#EFF6FF',
    primaryBorder: '#BFDBFE',
  },
  emerald: {
    name: 'Emerald Green',
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#D1FAE5',
    primarySoft: '#ECFDF5',
    primaryBorder: '#A7F3D0',
  },
  amber: {
    name: 'Amber Gold',
    primary: '#F59E0B',
    primaryDark: '#D97706',
    primaryLight: '#FEF3C7',
    primarySoft: '#FFFBEB',
    primaryBorder: '#FDE68A',
  },
  rose: {
    name: 'Crimson Rose',
    primary: '#F43F5E',
    primaryDark: '#E11D48',
    primaryLight: '#FFE4E6',
    primarySoft: '#FFF1F2',
    primaryBorder: '#FECDD3',
  },
  slate: {
    name: 'Monokai Slate',
    primary: '#64748B',
    primaryDark: '#475569',
    primaryLight: '#E2E8F0',
    primarySoft: '#F1F5F9',
    primaryBorder: '#CBD5E1',
  },
};

export const THEME_CHART_SHADES: Record<AccentColor, { light: string[]; dark: string[] }> = {
  violet: {
    light: ['#8B5CF6', '#7C3AED', '#A78BFA', '#6D28D9', '#C4B5FD', '#5B21B6', '#4C1D95', '#DDD6FE'],
    dark: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#DDD6FE', '#6D28D9', '#EDE9FE', '#5B21B6'],
  },
  blue: {
    light: ['#3B82F6', '#2563EB', '#60A5FA', '#1D4ED8', '#93C5FD', '#1E40AF', '#1E3A8A', '#BFDBFE'],
    dark: ['#3B82F6', '#60A5FA', '#93C5FD', '#2563EB', '#BFDBFE', '#1D4ED8', '#DBEAFE', '#1E40AF'],
  },
  emerald: {
    light: ['#10B981', '#059669', '#34D399', '#047857', '#6EE7B7', '#065F46', '#064E3B', '#A7F3D0'],
    dark: ['#10B981', '#34D399', '#6EE7B7', '#059669', '#A7F3D0', '#047857', '#D1FAE5', '#065F46'],
  },
  amber: {
    light: ['#F59E0B', '#D97706', '#FBBF24', '#B45309', '#FCD34D', '#92400E', '#78350F', '#FDE68A'],
    dark: ['#F59E0B', '#FBBF24', '#FCD34D', '#D97706', '#FDE68A', '#B45309', '#FEF3C7', '#92400E'],
  },
  rose: {
    light: ['#F43F5E', '#E11D48', '#FB7185', '#BE123C', '#FDA4AF', '#9F1239', '#881337', '#FECDD3'],
    dark: ['#F43F5E', '#FB7185', '#FDA4AF', '#E11D48', '#FECDD3', '#BE123C', '#FFE4E6', '#9F1239'],
  },
  slate: {
    light: ['#64748B', '#475569', '#94A3B8', '#334155', '#CBD5E1', '#1E293B', '#0F172A', '#E2E8F0'],
    dark: ['#64748B', '#94A3B8', '#CBD5E1', '#475569', '#E2E8F0', '#334155', '#F1F5F9', '#1E293B'],
  },
};

export function getThemeChartShades(accent: AccentColor, isDark: boolean = false): string[] {
  const shades = THEME_CHART_SHADES[accent] || THEME_CHART_SHADES.violet;
  return isDark ? shades.dark : shades.light;
}

export function buildThemeColors(isDark: boolean, accent: AccentColor) {
  const palette = ACCENT_PALETTES[accent] || ACCENT_PALETTES.violet;

  if (isDark) {
    return {
      background: '#272727',
      surface: '#333333',
      surfaceMuted: '#3D3D3D',
      surfaceSubtle: '#484848',

      primary: palette.primary,
      primaryLight: '#3D3D3D',
      primarySoft: '#333333',
      primaryDark: palette.primaryDark,
      primaryBorder: '#404040',

      boxBackground: '#333333',
      boxBorder: '#404040',
      headingPrimary: palette.primary,
      subheadingPrimary: palette.primary,

      ink: '#FFFFFF',
      inkLight: '#F5F5F7',
      textSecondary: '#CCCCCC',
      textTertiary: '#AAAAAA',
      textMuted: '#B8B8C0',

      darkCard: '#333333',
      darkCardSecondary: '#3D3D3D',
      onDark: '#FFFFFF',
      onDarkSecondary: '#D0CAD6',

      success: '#10B981',
      successLight: '#0E2E20',
      danger: '#EF4444',
      dangerLight: '#321418',
      warning: '#F59E0B',
      warningLight: '#32250F',
      info: '#3B82F6',
      infoLight: '#122543',

      border: '#404040',
      borderStrong: '#555555',

      overlay: 'rgba(0, 0, 0, 0.75)',
      transparent: 'transparent',
    };
  }

  return {
    background: '#F4F4F6',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F5F7',
    surfaceSubtle: '#EEEEF2',

    primary: palette.primary,
    primaryLight: palette.primaryLight,
    primarySoft: palette.primarySoft,
    primaryDark: palette.primaryDark,
    primaryBorder: palette.primaryBorder,

    boxBackground: palette.primarySoft,
    boxBorder: palette.primaryBorder,
    headingPrimary: palette.primaryDark,
    subheadingPrimary: palette.primary,

    ink: '#111111',
    inkLight: '#333333',
    textSecondary: '#8E8E96',
    textTertiary: '#B8B8C0',
    textMuted: '#686873',

    darkCard: '#2A2430',
    darkCardSecondary: '#383040',
    onDark: '#FFFFFF',
    onDarkSecondary: '#D0CAD6',

    success: '#2FA36B',
    successLight: '#EAF6F0',
    danger: '#E5384F',
    dangerLight: '#FDECEE',
    warning: '#F2A33A',
    warningLight: '#FEF6EA',
    info: '#3B82F6',
    infoLight: '#EFF6FF',

    border: '#ECECF0',
    borderStrong: '#DCDCE2',

    overlay: 'rgba(17, 17, 17, 0.45)',
    transparent: 'transparent',
  };
}

// Initial active colors (default: light, violet)
export const colors = buildThemeColors(false, 'violet');

export type ColorsType = typeof colors;
