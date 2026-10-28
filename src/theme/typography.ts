import { TextStyle, Platform } from 'react-native';

export const fontHeadline = 'Polymath';
export const fontBody = 'Polymath';
export const fontAmount = 'Polymath';
export const fontAmountThin = 'PolymathThin';
export const fontPolymath = 'Polymath';
export const fontPolymathThin = 'PolymathThin';
export const fontThin = 'PolymathThin';

export const fontSpaceGrotesk = Platform.select({
  web: "'Space Grotesk', SpaceGrotesk, -apple-system, sans-serif",
  default: 'SpaceGrotesk',
});
export const fontSpaceGroteskBold = Platform.select({
  web: "'Space Grotesk', SpaceGrotesk_700Bold, -apple-system, sans-serif",
  default: 'SpaceGrotesk_700Bold',
});

export const typography = {
  fontFamily: fontHeadline,
  fontLight: fontPolymathThin,
  fontMedium: fontHeadline,
  fontSemiBold: fontHeadline,
  fontHeadline,
  fontBody,
  fontAmount,
  fontAmountThin,
  fontPolymath,
  fontPolymathThin,
  fontThin,
  fontSpaceGrotesk,
  fontSpaceGroteskBold,

  display: {
    fontFamily: fontHeadline,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: 1.2,
  } satisfies TextStyle,

  displayLarge: {
    fontFamily: fontHeadline,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: 1.4,
  } satisfies TextStyle,

  bigNumber: {
    fontFamily: fontAmount,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 1.0,
  } satisfies TextStyle,

  sectionTitle: {
    fontFamily: fontHeadline,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 1.0,
  } satisfies TextStyle,

  subheading: {
    fontFamily: fontHeadline,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0.9,
  } satisfies TextStyle,

  title: {
    fontFamily: fontHeadline,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 1.0,
  } satisfies TextStyle,

  subtitle: {
    fontFamily: fontHeadline,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.8,
  } satisfies TextStyle,

  body: {
    fontFamily: fontHeadline,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.6,
  } satisfies TextStyle,

  bodyMedium: {
    fontFamily: fontHeadline,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.6,
  } satisfies TextStyle,

  caption: {
    fontFamily: fontHeadline,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.7,
  } satisfies TextStyle,

  captionMedium: {
    fontFamily: fontHeadline,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.8,
  } satisfies TextStyle,

  button: {
    fontFamily: fontHeadline,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 1.2,
  } satisfies TextStyle,

  label: {
    fontFamily: fontHeadline,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,

  amount: {
    fontFamily: fontAmount,
    letterSpacing: 1.0,
  } satisfies TextStyle,

  amountThin: {
    fontFamily: fontAmountThin,
    letterSpacing: 0.9,
  } satisfies TextStyle,
};
