import { describe, test, expect } from '@jest/globals';
import {
  numberToIndianWords,
  numberToChequeFormat,
  numberToInternationalWords,
  numberToTamilWords,
} from '../src/utils/numberToWords';
import { parseTextToNumber } from '../src/utils/textToNumber';

describe('Financial Number to Words & Text to Number Tests', () => {
  describe('Number to Indian Words', () => {
    test('Converts standard amounts accurately', () => {
      expect(numberToIndianWords(100000)).toBe('One Lakh Rupees Only');
      expect(numberToIndianWords(125000)).toBe('One Lakh Twenty Five Thousand Rupees Only');
      expect(numberToIndianWords(50000)).toBe('Fifty Thousand Rupees Only');
      expect(numberToIndianWords(10000000)).toBe('One Crore Rupees Only');
    });

    test('Handles decimals / paise correctly', () => {
      expect(numberToIndianWords(100000.5)).toBe('One Lakh Rupees and Fifty Paise Only');
      expect(numberToIndianWords(2500.75)).toBe('Two Thousand Five Hundred Rupees and Seventy Five Paise Only');
    });

    test('Handles zero and negative amounts', () => {
      expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
      expect(numberToIndianWords(-5000)).toBe('Minus Five Thousand Rupees Only');
    });

    test('Cheque format produces uppercase string', () => {
      expect(numberToChequeFormat(250000)).toBe('TWO LAKH FIFTY THOUSAND RUPEES ONLY');
    });

    test('International words format', () => {
      expect(numberToInternationalWords(1500000)).toBe('One Million Five Hundred Thousand');
      expect(numberToInternationalWords(1000000000)).toBe('One Billion');
    });

    test('Tamil financial words format', () => {
      const tamilResult = numberToTamilWords(25000);
      expect(tamilResult).toContain('ரூபாய் மட்டும்');
      expect(tamilResult).toContain('ஆயிரம்');
    });
  });

  describe('Text to Number Parser', () => {
    test('Parses shorthands accurately', () => {
      expect(parseTextToNumber('50k').value).toBe(50000);
      expect(parseTextToNumber('2.5L').value).toBe(250000);
      expect(parseTextToNumber('1.5cr').value).toBe(15000000);
      expect(parseTextToNumber('10m').value).toBe(10000000);
    });

    test('Parses natural written words', () => {
      expect(parseTextToNumber('two lakh fifty thousand').value).toBe(250000);
      expect(parseTextToNumber('one crore').value).toBe(10000000);
      expect(parseTextToNumber('seventy five thousand').value).toBe(75000);
      expect(parseTextToNumber('five hundred').value).toBe(500);
    });

    test('Parses mixed currency strings', () => {
      expect(parseTextToNumber('₹ 3,50,000').value).toBe(350000);
      expect(parseTextToNumber('125000').value).toBe(125000);
    });

    test('Gracefully handles invalid text', () => {
      expect(parseTextToNumber('hello world').success).toBe(false);
      expect(parseTextToNumber('').success).toBe(false);
    });
  });
});
