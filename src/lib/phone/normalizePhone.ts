import { parsePhoneNumberFromString, PhoneNumber } from 'libphonenumber-js';

export interface NormalizedPhoneResult {
  raw: string;
  e164: string;           // E.164 e.g. "+919876543210"
  national: string;       // National e.g. "098765 43210"
  digits10: string;       // Last 10 digits e.g. "9876543210"
  countryCode: string;    // e.g. "91"
  isValid: boolean;
  formatted: string;      // International formatted e.g. "+91 98765 43210"
}

/**
 * Robust phone number normalization utility using libphonenumber-js.
 * Defaults to Indian standard ('IN', +91) while supporting international numbers.
 */
export function normalizePhone(
  phone: string | null | undefined,
  defaultCountry: 'IN' = 'IN'
): NormalizedPhoneResult {
  if (!phone || typeof phone !== 'string') {
    return {
      raw: phone || '',
      e164: '',
      national: '',
      digits10: '',
      countryCode: '',
      isValid: false,
      formatted: '',
    };
  }

  const raw = phone.trim();
  // Strip spaces, dashes, dots, brackets, but preserve leading +
  const clean = raw.replace(/[^\d+]/g, '');

  let parsed: PhoneNumber | undefined = parsePhoneNumberFromString(clean, defaultCountry);

  if (!parsed || !parsed.isValid()) {
    const digitsOnly = clean.replace(/\D/g, '');
    // Common Indian dialling variants:
    // 10 digits: 9876543210 -> +919876543210
    // 11 digits starting with 0: 09876543210 -> +919876543210
    // 12 digits starting with 91: 919876543210 -> +919876543210
    if (digitsOnly.length === 10) {
      parsed = parsePhoneNumberFromString(`+91${digitsOnly}`, 'IN');
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      parsed = parsePhoneNumberFromString(`+91${digitsOnly.slice(1)}`, 'IN');
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      parsed = parsePhoneNumberFromString(`+${digitsOnly}`, 'IN');
    }
  }

  if (parsed && parsed.isValid()) {
    const e164 = parsed.format('E.164');
    const digitsOnly = e164.replace(/\D/g, '');
    const digits10 = digitsOnly.slice(-10);
    return {
      raw,
      e164,
      national: parsed.formatNational(),
      digits10,
      countryCode: String(parsed.countryCallingCode || '91'),
      isValid: true,
      formatted: parsed.formatInternational(),
    };
  }

  // Graceful fallback for non-standard 10-digit formats
  const fallbackDigits = clean.replace(/\D/g, '');
  const digits10 = fallbackDigits.length >= 10 ? fallbackDigits.slice(-10) : fallbackDigits;
  const is10 = digits10.length === 10;

  return {
    raw,
    e164: is10 ? `+91${digits10}` : clean,
    national: digits10,
    digits10,
    countryCode: '91',
    isValid: is10,
    formatted: is10 ? `+91 ${digits10.slice(0, 5)} ${digits10.slice(5)}` : raw,
  };
}

/**
 * Checks equality between two phone numbers using normalized E.164 and 10-digit comparison.
 */
export function arePhonesEqual(p1: string | null | undefined, p2: string | null | undefined): boolean {
  if (!p1 || !p2) return false;
  const n1 = normalizePhone(p1);
  const n2 = normalizePhone(p2);

  if (n1.isValid && n2.isValid) {
    return n1.e164 === n2.e164;
  }
  return n1.digits10.length >= 10 && n1.digits10 === n2.digits10;
}

/**
 * Check if a candidate phone matches ANY of the target customer's phone numbers (primary, altPhone, WhatsApp).
 */
export function matchesCustomerPhone(candidatePhone: string, customer: { phone?: string; altPhone?: string; whatsapp?: string }): boolean {
  if (!candidatePhone) return false;
  if (customer.phone && arePhonesEqual(candidatePhone, customer.phone)) return true;
  if (customer.altPhone && arePhonesEqual(candidatePhone, customer.altPhone)) return true;
  if (customer.whatsapp && arePhonesEqual(candidatePhone, customer.whatsapp)) return true;
  return false;
}
