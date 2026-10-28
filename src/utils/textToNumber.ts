/**
 * Text to Number Financial Parser
 * Converts written words, shorthands (2.5L, 10k, 1.2cr), and spoken amounts into exact numbers.
 */

const WORD_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  lakhs: 100000,
  lac: 100000,
  lacs: 100000,
  crore: 10000000,
  crores: 10000000,
  cr: 10000000,
  million: 1000000,
  millions: 1000000,
  billion: 1000000000,
  k: 1000,
};

export interface TextToNumberResult {
  success: boolean;
  value: number;
  formattedIndian: string;
  formattedInternational: string;
  sourceText: string;
}

/**
 * Parses user input string (shorthand, natural English words, or currency string) into a numeric value
 */
export function parseTextToNumber(input: string): TextToNumberResult {
  if (!input || !input.trim()) {
    return {
      success: false,
      value: 0,
      formattedIndian: '₹0',
      formattedInternational: '$0',
      sourceText: input,
    };
  }

  const clean = input
    .toLowerCase()
    .replace(/[₹$,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Check direct shorthand e.g. "2.5l", "50k", "1.2cr", "10m"
  const shorthandRegex = /^(\d+(\.\d+)?)\s*(k|l|lac|lacs|lakh|lakhs|cr|crore|crores|m|million|b|billion)$/i;
  const shortMatch = clean.match(shorthandRegex);
  if (shortMatch) {
    const base = parseFloat(shortMatch[1]);
    const unit = shortMatch[3].toLowerCase();
    let mult = 1;
    if (unit === 'k') mult = 1000;
    else if (['l', 'lac', 'lacs', 'lakh', 'lakhs'].includes(unit)) mult = 100000;
    else if (['cr', 'crore', 'crores'].includes(unit)) mult = 10000000;
    else if (['m', 'million'].includes(unit)) mult = 1000000;
    else if (['b', 'billion'].includes(unit)) mult = 1000000000;

    const val = Math.round(base * mult * 100) / 100;
    return buildResult(val, input);
  }

  // 2. Check direct numeric string e.g. "125000" or "125000.50"
  if (/^-?\d+(\.\d+)?$/.test(clean)) {
    const val = parseFloat(clean);
    return buildResult(val, input);
  }

  // 3. Natural Language Word Parsing e.g. "two lakh fifty thousand"
  // Remove filler words like "and", "rupees", "rupee", "only", "bucks"
  const tokens = clean
    .replace(/\b(and|rupees|rupee|only|inr|usd|cash)\b/g, '')
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return {
      success: false,
      value: 0,
      formattedIndian: '₹0',
      formattedInternational: '$0',
      sourceText: input,
    };
  }

  let total = 0;
  let current = 0;
  let hasValidToken = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check if token itself is numeric e.g. "2" in "2 lakh"
    if (/^\d+(\.\d+)?$/.test(token)) {
      current += parseFloat(token);
      hasValidToken = true;
      continue;
    }

    // Check if token has shorthand attached e.g. "2.5lakh"
    const embeddedShort = token.match(/^(\d+(\.\d+)?)(k|l|cr|m|b)$/);
    if (embeddedShort) {
      const b = parseFloat(embeddedShort[1]);
      const u = embeddedShort[3];
      const m = u === 'k' ? 1000 : u === 'l' ? 100000 : u === 'cr' ? 10000000 : 1000000;
      current += b * m;
      hasValidToken = true;
      continue;
    }

    const val = WORD_MAP[token];
    if (val === undefined) {
      continue;
    }

    hasValidToken = true;

    if (val === 100) {
      current = (current === 0 ? 1 : current) * 100;
    } else if (val === 1000) {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else if (val === 100000) {
      total += (current === 0 ? 1 : current) * 100000;
      current = 0;
    } else if (val === 1000000) {
      total += (current === 0 ? 1 : current) * 1000000;
      current = 0;
    } else if (val === 10000000) {
      total += (current === 0 ? 1 : current) * 10000000;
      current = 0;
    } else if (val === 1000000000) {
      total += (current === 0 ? 1 : current) * 1000000000;
      current = 0;
    } else {
      current += val;
    }
  }

  total += current;

  if (!hasValidToken || (total === 0 && !clean.includes('zero'))) {
    return {
      success: false,
      value: 0,
      formattedIndian: '₹0',
      formattedInternational: '$0',
      sourceText: input,
    };
  }

  return buildResult(total, input);
}

function buildResult(val: number, source: string): TextToNumberResult {
  return {
    success: true,
    value: val,
    formattedIndian: '₹' + formatIndianNumber(val),
    formattedInternational: '$' + val.toLocaleString('en-US'),
    sourceText: source,
  };
}

function formatIndianNumber(val: number): string {
  const parts = val.toString().split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return parts.length > 1 ? formatted + '.' + parts[1] : formatted;
}
