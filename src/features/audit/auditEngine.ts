import { AuditLog } from './types';

/**
 * Standard Levenshtein distance algorithm for typo tolerance.
 */
export function levenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[al][bl];
}

/**
 * Robust fuzzy matcher that matches even with spelling mistakes.
 * Allows 1 edit distance for short words, 2 edit distance for longer words.
 */
export function isFuzzyMatch(queryToken: string, targetToken: string): boolean {
  const q = queryToken.toLowerCase().trim();
  const t = targetToken.toLowerCase().trim();

  if (!q || !t) return false;
  if (t.includes(q) || q.includes(t)) return true;

  // Word length check
  const maxDistance = q.length <= 4 ? 1 : 2;
  const dist = levenshteinDistance(q, t);
  if (dist <= maxDistance) return true;

  // Prefix overlap (e.g. "karth" vs "karthik")
  if (q.length >= 3 && t.startsWith(q.slice(0, 3)) && Math.abs(q.length - t.length) <= 2) {
    return true;
  }

  return false;
}

/**
 * Flatten all values inside an object (keys, strings, numbers, dates)
 * to create a comprehensive searchable corpus for enormous data logs.
 */
function extractAllCorpusText(log: AuditLog): string {
  const parts: string[] = [
    log.id,
    log.who,
    log.action,
    log.entityType,
    log.entityId,
    log.summary || '',
    log.timestamp,
  ];

  const collectValues = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      parts.push(key);
      if (val !== null && val !== undefined) {
        if (typeof val === 'object') {
          collectValues(val);
        } else {
          parts.push(String(val));
        }
      }
    }
  };

  collectValues(log.before);
  collectValues(log.after);
  collectValues(log.metadata);

  return parts.join(' ').toLowerCase();
}

/**
 * Fuzzy search across all audit logs keys, summaries, dates, and entities.
 */
export function fuzzySearchAuditLogs(logs: AuditLog[], searchTerm: string): AuditLog[] {
  if (!searchTerm || !searchTerm.trim()) return logs;

  const queryTokens = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);

  return logs.filter((log) => {
    const corpus = extractAllCorpusText(log);
    const corpusWords = corpus.split(/[\s,._:;/-]+/).filter((w) => w.length > 1);

    // Every token in query should match at least one word in corpus (with typo allowance)
    return queryTokens.every((qToken) => {
      // 1. Direct substring match
      if (corpus.includes(qToken)) return true;

      // 2. Fuzzy match against corpus words
      return corpusWords.some((cWord) => isFuzzyMatch(qToken, cWord));
    });
  });
}

/**
 * Daily activity aggregation for mini canvas.
 */
export interface DailyActivityPoint {
  dateStr: string;
  label: string;
  count: number;
}

export function calculateDailyAuditActivity(logs: AuditLog[], daysCount = 7): DailyActivityPoint[] {
  const result: DailyActivityPoint[] = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

    const count = logs.filter((l) => (l.timestamp || '').startsWith(dateStr)).length;
    result.push({ dateStr, label, count });
  }

  return result;
}

/**
 * Initial audit history starts clean and empty. Real audit logs are populated dynamically
 * as the user records loans, collections, customer updates, and settlements.
 */
export function generateInitialAuditHistory(): AuditLog[] {
  return [];
}
