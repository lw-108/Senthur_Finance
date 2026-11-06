import {
  validateIndianPhone,
  sanitizePhone,
  validateAadhaar,
  sanitizeAadhaar,
  validatePAN,
  sanitizePAN,
  validatePincode,
  sanitizePincode,
  validateVoterId,
  validateKYCDocument,
  sanitizeKYCDocument,
} from '../src/utils/validators';

describe('Strict Indian Validation Rules', () => {
  describe('validateIndianPhone', () => {
    it('accepts strictly 10 digits starting with 6, 7, 8, or 9', () => {
      expect(validateIndianPhone('9876543210').isValid).toBe(true);
      expect(validateIndianPhone('8765432109').isValid).toBe(true);
      expect(validateIndianPhone('7654321098').isValid).toBe(true);
      expect(validateIndianPhone('6543210987').isValid).toBe(true);
    });

    it('rejects phone numbers with fewer than 10 digits (cannot deceed 10)', () => {
      const res = validateIndianPhone('987654321');
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/must be exactly 10 digits/i);
    });

    it('rejects phone numbers with more than 10 digits (cannot exceed 10)', () => {
      const res = validateIndianPhone('98765432101');
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/cannot exceed 10 digits/i);
    });

    it('rejects numbers starting with invalid digits (0-5)', () => {
      expect(validateIndianPhone('5876543210').isValid).toBe(false);
      expect(validateIndianPhone('1876543210').isValid).toBe(false);
      expect(validateIndianPhone('0876543210').isValid).toBe(false);
    });

    it('respects optional phone validation when field is not required', () => {
      expect(validateIndianPhone('', { required: false }).isValid).toBe(true);
      expect(validateIndianPhone(undefined, { required: false }).isValid).toBe(true);
      expect(validateIndianPhone('', { required: true }).isValid).toBe(false);
    });

    it('sanitizes phone numbers strictly to at most 10 digits', () => {
      expect(sanitizePhone('98765-4321099')).toBe('9876543210');
      expect(sanitizePhone('+91 98765 43210')).toBe('9198765432');
      expect(sanitizePhone('abc9876543210xyz')).toBe('9876543210');
    });
  });

  describe('validateAadhaar', () => {
    it('accepts strictly 12 digits not starting with 0 or 1', () => {
      const res = validateAadhaar('234567890123');
      expect(res.isValid).toBe(true);
    });

    it('rejects Aadhaar with fewer than 12 digits (cannot deceed 12)', () => {
      const res = validateAadhaar('23456789012');
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/must be exactly 12 digits/i);
    });

    it('rejects Aadhaar with more than 12 digits (cannot exceed 12)', () => {
      const res = validateAadhaar('2345678901234');
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/cannot exceed 12 digits/i);
    });

    it('rejects Aadhaar starting with 0 or 1', () => {
      expect(validateAadhaar('012345678901').isValid).toBe(false);
      expect(validateAadhaar('123456789012').isValid).toBe(false);
    });

    it('rejects Aadhaar with all identical digits', () => {
      expect(validateAadhaar('222222222222').isValid).toBe(false);
      expect(validateAadhaar('999999999999').isValid).toBe(false);
    });

    it('sanitizes Aadhaar strictly to at most 12 digits', () => {
      expect(sanitizeAadhaar('2345-6789-0123-999')).toBe('234567890123');
    });
  });

  describe('validatePAN', () => {
    it('accepts valid 10-char PAN in ABCDE1234F format', () => {
      expect(validatePAN('ABCDE1234F').isValid).toBe(true);
      expect(validatePAN('BKZPK1234A').isValid).toBe(true);
    });

    it('rejects invalid length and incorrect structure', () => {
      expect(validatePAN('ABCD1234F').isValid).toBe(false);
      expect(validatePAN('ABCDE12345').isValid).toBe(false);
      expect(validatePAN('12345ABCDE').isValid).toBe(false);
    });

    it('sanitizes PAN to uppercase alphanumeric up to 10 characters', () => {
      expect(sanitizePAN('abcde-1234f-xyz')).toBe('ABCDE1234F');
    });
  });

  describe('validatePincode', () => {
    it('accepts strictly 6 digits starting with 1-9', () => {
      expect(validatePincode('641001').isValid).toBe(true);
      expect(validatePincode('110001').isValid).toBe(true);
    });

    it('rejects pincodes with fewer or more than 6 digits', () => {
      expect(validatePincode('64100').isValid).toBe(false);
      expect(validatePincode('6410012').isValid).toBe(false);
    });

    it('rejects pincode starting with 0', () => {
      expect(validatePincode('041001').isValid).toBe(false);
    });

    it('sanitizes pincode to max 6 digits', () => {
      expect(sanitizePincode('641 001 99')).toBe('641001');
    });
  });

  describe('validateKYCDocument & sanitizeKYCDocument', () => {
    it('dispatches validation accurately based on document type', () => {
      expect(validateKYCDocument('Aadhaar', '234567890123').isValid).toBe(true);
      expect(validateKYCDocument('Aadhaar', '12345').isValid).toBe(false);

      expect(validateKYCDocument('PAN', 'ABCDE1234F').isValid).toBe(true);
      expect(validateKYCDocument('PAN', '12345').isValid).toBe(false);

      expect(validateKYCDocument('Voter', 'ABC1234567').isValid).toBe(true);
    });

    it('sanitizes document number by type', () => {
      expect(sanitizeKYCDocument('Aadhaar', '2345-6789-0123-555')).toBe('234567890123');
      expect(sanitizeKYCDocument('PAN', 'abcde 1234f extra')).toBe('ABCDE1234F');
    });
  });
});
