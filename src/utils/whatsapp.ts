import { Linking, Platform } from 'react-native';

/**
 * Universal WhatsApp launcher that works seamlessly on both Web browsers and Mobile (iOS / Android).
 * On web desktop, opening `whatsapp://` throws:
 * "Failed to launch 'whatsapp://send' because the scheme does not have a registered handler"
 * if the user does not have WhatsApp Desktop installed.
 * Using `https://wa.me/` cleanly opens WhatsApp Web in a new tab on Web,
 * and deep-links directly into WhatsApp application on Mobile.
 */
export async function openWhatsApp(phone: string, message: string = ''): Promise<void> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const fullPhone = `91${cleanPhone}`;
  const encodedText = encodeURIComponent(message);

  if (Platform.OS === 'web') {
    const webUrl = `https://wa.me/${fullPhone}${encodedText ? `?text=${encodedText}` : ''}`;
    if (typeof window !== 'undefined') {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(webUrl).catch(() => {});
    }
    return;
  }

  // Mobile: attempt direct native deep-link first
  const nativeUrl = `whatsapp://send?phone=+${fullPhone}&text=${encodedText}`;
  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return;
    }
  } catch {
    // Fall back to universal link
  }

  const universalUrl = `https://wa.me/${fullPhone}?text=${encodedText}`;
  Linking.openURL(universalUrl).catch(() => {});
}
