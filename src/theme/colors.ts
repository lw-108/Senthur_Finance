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
