import { format, parseISO, isValid } from 'date-fns';

/**
 * Format an integer or float amount into Indian currency format (e.g. 12,34,567.00)
 * Or without decimals if showDecimals = false.
 * Accepts value in major units (Rupees) or minor units (Paise).
 */
export function formatIndianCurrency(
  amount: number,
  options?: {
    isMinorUnit?: boolean; // if true, input is in paise (cents)
    showDecimals?: boolean;
    currencySymbol?: string;
  }
): { symbol: string; integerPart: string; decimalPart: string; formatted: string } {
  const { isMinorUnit = false, showDecimals = false, currencySymbol = '₹' } = options || {};

  const majorAmount = isMinorUnit ? amount / 100 : amount;
  const isNegative = majorAmount < 0;
  const absAmount = Math.abs(majorAmount);

  const rounded = showDecimals ? absAmount.toFixed(2) : Math.round(absAmount).toString();
  const [intStr, decStr] = rounded.split('.');

  // Indian number formatting: last 3 digits, then pairs of 2 digits
  let lastThree = intStr.substring(intStr.length - 3);
  const otherNumbers = intStr.substring(0, intStr.length - 3);
  let formattedInteger = lastThree;

  if (otherNumbers !== '') {
    const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedInteger = `${formattedOthers},${lastThree}`;
  }

  const sign = isNegative ? '-' : '';
  const decimalPart = decStr ? `.${decStr}` : '';
  const formatted = `${sign}${currencySymbol}${formattedInteger}${decimalPart}`;

  return {
    symbol: `${sign}${currencySymbol}`,
    integerPart: formattedInteger,
    decimalPart,
    formatted,
  };
}

/**
 * Mask sensitive identification numbers like Aadhaar or PAN.
 * Shows only the last 4 characters, with preceding dots/asterisks.
 */
export function maskIdentifier(value: string | undefined | null): string {
  if (!value) return '';
  const clean = value.trim();
  if (clean.length <= 4) return clean;
  const visible = clean.slice(-4);
  const maskedLength = clean.length - 4;
  const mask = '•'.repeat(Math.min(maskedLength, 8));
  return `${mask} ${visible}`;
}

/**
 * Format a Date object or ISO string to standard readable format.
 */
export function formatDate(
  date: Date | string | number | undefined | null,
  formatPattern: string = 'dd MMM yyyy'
): string {
  if (!date) return '-';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(parsed)) return '-';
    return format(parsed, formatPattern);
  } catch {
    return '-';
  }
}

/**
 * Format a phone number into readable format.
 */
export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}
