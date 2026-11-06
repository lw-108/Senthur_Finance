/**
 * Strict Indian validation and sanitization rules
 * Enforces exact digit lengths and canonical formats for financial KYC and ledgers.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Strict 10-digit Indian mobile number validation.
 * Must NOT exceed 10 digits and must NOT deceed 10 digits.
 * Indian mobile numbers standardly start with 6, 7, 8, or 9.
 */
export function validateIndianPhone(
  phone: string | undefined | null,
  options: { required?: boolean; fieldName?: string } = {}
): ValidationResult {
  const { required = true, fieldName = 'Phone number' } = options;
  if (!phone || phone.trim() === '') {
    if (required) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) {
    if (required) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
  }

  if (digits.length < 10) {
    return {
      isValid: false,
      error: `${fieldName} must be exactly 10 digits (currently ${digits.length})`,
    };
  }

  if (digits.length > 10) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed 10 digits (currently ${digits.length})`,
    };
  }

  if (!/^[6-9]/.test(digits)) {
    return {
      isValid: false,
      error: `${fieldName} must start with 6, 7, 8, or 9`,
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes phone input strictly to at most 10 digits.
 */
export function sanitizePhone(val: string): string {
  return val.replace(/\D/g, '').slice(0, 10);
}

/**
 * Strict 12-digit Aadhaar number validation.
 * Must be strictly equal to 12 digits, cannot start with 0 or 1.
 */
export function validateAadhaar(
  aadhaar: string | undefined | null,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = true } = options;
  if (!aadhaar || aadhaar.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Aadhaar number is required' };
    }
    return { isValid: true };
  }

  const digits = aadhaar.replace(/\D/g, '');

  if (digits.length === 0) {
    if (required) {
      return { isValid: false, error: 'Aadhaar number is required' };
    }
    return { isValid: true };
  }

  if (digits.length < 12) {
    return {
      isValid: false,
      error: `Aadhaar must be exactly 12 digits (currently ${digits.length})`,
    };
  }

  if (digits.length > 12) {
    return {
      isValid: false,
      error: `Aadhaar cannot exceed 12 digits (currently ${digits.length})`,
    };
  }

  if (/^[01]/.test(digits)) {
    return {
      isValid: false,
      error: 'Aadhaar number cannot start with 0 or 1',
    };
  }

  // Check repeating identical digits (e.g. 000000000000 or 111111111111)
  if (/^(\d)\1{11}$/.test(digits)) {
    return {
      isValid: false,
      error: 'Invalid Aadhaar number (all identical digits)',
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes Aadhaar input strictly to 12 digits maximum.
 */
export function sanitizeAadhaar(val: string): string {
  return val.replace(/\D/g, '').slice(0, 12);
}

/**
 * Strict 10-character Indian PAN validation (ABCDE1234F).
 * 5 letters, 4 numbers, 1 letter.
 */
export function validatePAN(
  pan: string | undefined | null,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = true } = options;
  if (!pan || pan.trim() === '') {
    if (required) {
      return { isValid: false, error: 'PAN number is required' };
    }
    return { isValid: true };
  }

  const cleaned = pan.toUpperCase().trim();

  if (cleaned.length !== 10) {
    return {
      isValid: false,
      error: `PAN must be exactly 10 characters (currently ${cleaned.length})`,
    };
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)',
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes PAN input to uppercase alphanumeric strictly up to 10 chars.
 */
export function sanitizePAN(val: string): string {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

/**
 * Strict 6-digit Indian PIN code validation.
 * Must be strictly 6 digits, first digit 1-9.
 */
export function validatePincode(
  pincode: string | undefined | null,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = true } = options;
  if (!pincode || pincode.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Pincode is required' };
    }
    return { isValid: true };
  }

  const digits = pincode.replace(/\D/g, '');

  if (digits.length === 0) {
    if (required) {
      return { isValid: false, error: 'Pincode is required' };
    }
    return { isValid: true };
  }

  if (digits.length < 6) {
    return {
      isValid: false,
      error: `Pincode must be exactly 6 digits (currently ${digits.length})`,
    };
  }

  if (digits.length > 6) {
    return {
      isValid: false,
      error: `Pincode cannot exceed 6 digits (currently ${digits.length})`,
    };
  }

  if (!/^[1-9]/.test(digits)) {
    return {
      isValid: false,
      error: 'Indian pincode cannot start with 0',
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes Pincode input strictly to 6 digits maximum.
 */
export function sanitizePincode(val: string): string {
  return val.replace(/\D/g, '').slice(0, 6);
}

/**
 * Strict Voter ID (EPIC) validation (10 chars, typically 3 letters + 7 numbers).
 */
export function validateVoterId(
  voterId: string | undefined | null,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = true } = options;
  if (!voterId || voterId.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Voter ID is required' };
    }
    return { isValid: true };
  }

  const cleaned = voterId.toUpperCase().trim();

  if (cleaned.length < 10 || cleaned.length > 16) {
    return {
      isValid: false,
      error: 'Voter ID must be between 10 and 16 characters (e.g. ABC1234567)',
    };
  }

  if (!/^[A-Z0-9]+$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Voter ID must contain only letters and numbers',
    };
  }

  return { isValid: true };
}

export function sanitizeVoterId(val: string): string {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

/**
 * Strict Driving License validation.
 */
export function validateDrivingLicense(
  dl: string | undefined | null,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = true } = options;
  if (!dl || dl.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Driving license is required' };
    }
    return { isValid: true };
  }

  const cleaned = dl.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleaned.length < 10 || cleaned.length > 16) {
    return {
      isValid: false,
      error: 'Driving license must be between 10 and 16 characters',
    };
  }

  return { isValid: true };
}

export function sanitizeDrivingLicense(val: string): string {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

/**
 * Strict Passport validation (1 letter + 7 digits = 8 chars).
 */
export function validatePassport(
  passport: string | undefined | null,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = true } = options;
  if (!passport || passport.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Passport number is required' };
    }
    return { isValid: true };
  }

  const cleaned = passport.toUpperCase().trim();

  if (!/^[A-Z][0-9]{7}$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Passport must be 1 letter followed by 7 digits (e.g. A1234567)',
    };
  }

  return { isValid: true };
}

export function sanitizePassport(val: string): string {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/**
 * Dispatches document validation according to KYC proof type.
 */
export function validateKYCDocument(
  type: string,
  number: string | undefined | null,
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = true } = options;
  switch (type) {
    case 'Aadhaar':
      return validateAadhaar(number, options);
    case 'PAN':
      return validatePAN(number, options);
    case 'Voter':
      return validateVoterId(number, options);
    case 'DrivingLicense':
      return validateDrivingLicense(number, options);
    case 'Passport':
      return validatePassport(number, options);
    default:
      if (required && (!number || number.trim().length === 0)) {
        return { isValid: false, error: 'Document number is required' };
      }
      return { isValid: true };
  }
}

/**
 * Sanitizes input according to KYC document type.
 */
export function sanitizeKYCDocument(type: string, val: string): string {
  switch (type) {
    case 'Aadhaar':
      return sanitizeAadhaar(val);
    case 'PAN':
      return sanitizePAN(val);
    case 'Voter':
      return sanitizeVoterId(val);
    case 'DrivingLicense':
      return sanitizeDrivingLicense(val);
    case 'Passport':
      return sanitizePassport(val);
    case 'RationCard':
      return val.toUpperCase().trim();
    default:
      return val.trim();
  }
}
