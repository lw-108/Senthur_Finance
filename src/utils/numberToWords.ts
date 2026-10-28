/**
 * Indian & International Financial Number to Words Converter
 * Specifically optimized for private finance, loan agreements, promissory notes & cheque writing.
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';

  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }

  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ONES[num % 10] : '');
  } else if (num > 0) {
    str += ONES[num];
  }

  return str.trim();
}

/**
 * Converts a numeric amount into Indian numbering words (Crores, Lakhs, Thousands, Hundreds)
 * Example: 1525000.50 -> "Fifteen Lakh Twenty Five Thousand Rupees and Fifty Paise Only"
 */
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return 'Zero Rupees Only';
  }

  // Break into Indian units: Crores, Lakhs, Thousands, Hundreds
  let n = integerPart;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remainder = n;

  let words = '';

  if (crore > 0) {
    words += (crore >= 100 ? numberToIndianWords(crore).replace(' Rupees Only', '') : convertLessThanThousand(crore)) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertLessThanThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertLessThanThousand(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertLessThanThousand(remainder) + ' ';
  }

  words = words.trim();
  if (!words) {
    words = 'Zero';
  }

  let result = (isNegative ? 'Minus ' : '') + words + ' Rupees';

  if (decimalPart > 0) {
    result += ' and ' + convertLessThanThousand(decimalPart) + ' Paise';
  }

  result += ' Only';

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Format strictly for Cheques & Legal Loan Agreements
 * Example: "RUPEES ONE LAKH TWENTY-FIVE THOUSAND ONLY"
 */
export function numberToChequeFormat(amount: number): string {
  const words = numberToIndianWords(amount);
  return words.toUpperCase();
}

/**
 * International System (Billions, Millions, Thousands)
 * Example: 1500000 -> "One Million Five Hundred Thousand"
 */
export function numberToInternationalWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero';

  const isNegative = amount < 0;
  let n = Math.floor(Math.abs(amount));

  if (n === 0) return 'Zero';

  const billion = Math.floor(n / 1000000000);
  n %= 1000000000;
  const million = Math.floor(n / 1000000);
  n %= 1000000;
  const thousand = Math.floor(n / 1000);
  const remainder = n % 1000;

  let words = '';
  if (billion > 0) {
    words += convertLessThanThousand(billion) + ' Billion ';
  }
  if (million > 0) {
    words += convertLessThanThousand(million) + ' Million ';
  }
  if (thousand > 0) {
    words += convertLessThanThousand(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertLessThanThousand(remainder) + ' ';
  }

  return (isNegative ? 'Minus ' : '') + words.trim();
}

/**
 * Tamil Financial Words for promissory notes and informal lending receipts
 */
const TAMIL_ONES: Record<number, string> = {
  0: '',
  1: 'ஒன்று',
  2: 'இரண்டு',
  3: 'மூன்று',
  4: 'நான்கு',
  5: 'ஐந்து',
  6: 'ஆறு',
  7: 'ஏழு',
  8: 'எட்டு',
  9: 'ஒன்பது',
  10: 'பத்து',
  11: 'பதினொன்று',
  12: 'பன்னிரண்டு',
  13: 'பதின்மூன்று',
  14: 'பதினான்கு',
  15: 'பதினைந்து',
  16: 'பதினாறு',
  17: 'பதினேழு',
  18: 'பதினெட்டு',
  19: 'பத்தொன்பது',
};

const TAMIL_TENS: Record<number, string> = {
  20: 'இருபது',
  30: 'முப்பது',
  40: 'நாற்பது',
  50: 'ஐம்பது',
  60: 'அறுபது',
  70: 'எழுபது',
  80: 'எண்பது',
  90: 'தொண்ணூறு',
};

function convertTamilUnderHundred(num: number): string {
  if (num === 0) return '';
  if (num < 20) return TAMIL_ONES[num];
  const tensVal = Math.floor(num / 10) * 10;
  const onesVal = num % 10;
  if (onesVal === 0) return TAMIL_TENS[tensVal];

  // Compound forms e.g. இருபத்தி ஒன்று
  const prefixMap: Record<number, string> = {
    20: 'இருபத்து',
    30: 'முப்பத்து',
    40: 'நாற்பத்து',
    50: 'ஐம்பத்து',
    60: 'அறுபத்து',
    70: 'எழுபத்து',
    80: 'எண்பத்து',
    90: 'தொண்ணூற்று',
  };
  return (prefixMap[tensVal] || TAMIL_TENS[tensVal]) + ' ' + TAMIL_ONES[onesVal];
}

function convertTamilUnderThousand(num: number): string {
  if (num === 0) return '';
  let str = '';
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  const hundredsMap: Record<number, string> = {
    1: 'நூறு',
    2: 'இருநூறு',
    3: 'முந்நூறு',
    4: 'நானூறு',
    5: 'ஐந்நூறு',
    6: 'அறுநூறு',
    7: 'எழுநூறு',
    8: 'எண்ணூறு',
    9: 'தொளாயிரம்',
  };

  const hundredsPrefixMap: Record<number, string> = {
    1: 'நூற்று',
    2: 'இருநூற்று',
    3: 'முந்நூற்று',
    4: 'நானூற்று',
    5: 'ஐந்நூற்று',
    6: 'அறுநூற்று',
    7: 'எழுநூற்று',
    8: 'எண்ணூற்று',
    9: 'தொளாயிரத்து',
  };

  if (hundreds > 0) {
    if (remainder === 0) {
      str += hundredsMap[hundreds];
    } else {
      str += (hundredsPrefixMap[hundreds] || hundredsMap[hundreds]) + ' ';
    }
  }

  if (remainder > 0) {
    str += convertTamilUnderHundred(remainder);
  }

  return str.trim();
}

/**
 * Converts an amount to Tamil Financial Words
 * Example: 25000 -> "இருபத்தைந்தாயிரம் ரூபாய் மட்டும்"
 */
export function numberToTamilWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'பூஜ்ஜியம் ரூபாய் மட்டும்';

  let n = Math.floor(Math.abs(amount));
  if (n === 0) return 'பூஜ்ஜியம் ரூபாய் மட்டும்';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  const remainder = n % 1000;

  let parts: string[] = [];

  if (crore > 0) {
    parts.push(convertTamilUnderThousand(crore) + ' கோடி');
  }
  if (lakh > 0) {
    parts.push(convertTamilUnderThousand(lakh) + ' இலட்சம்');
  }
  if (thousand > 0) {
    parts.push(convertTamilUnderThousand(thousand) + ' ஆயிரம்');
  }
  if (remainder > 0) {
    parts.push(convertTamilUnderThousand(remainder));
  }

  const result = parts.join(' ').trim();
  return result + ' ரூபாய் மட்டும்';
}
