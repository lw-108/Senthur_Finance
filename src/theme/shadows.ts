import { ViewStyle, Platform } from 'react-native';

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } satisfies ViewStyle,

  soft: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 18,
    },
    android: {
      elevation: 2,
    },
    default: {
      boxShadow: '0 6px 18px rgba(0, 0, 0, 0.05)',
    },
  }) as ViewStyle,

  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
    },
    android: {
      elevation: 3,
    },
    default: {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
    },
  }) as ViewStyle,

  hero: Platform.select({
    ios: {
      shadowColor: '#2A2430',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
    },
    android: {
      elevation: 6,
    },
    default: {
      boxShadow: '0 12px 28px rgba(42, 36, 48, 0.16)',
    },
  }) as ViewStyle,

  floating: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } satisfies ViewStyle,
};
