// ============================================================================
// Data Normalization — applied BEFORE any master matching or validation.
// Pure, dependency-free helpers so every module normalizes identically.
// ============================================================================

/** Lowercase + strip every non-alphanumeric char. Used for header + code keys. */
export function normalizeKey(str: string): string {
  return String(str ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Collapse internal whitespace, trim ends, drop zero-width + control chars. */
export function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width / BOM
    .replace(/[\u0000-\u001F\u007F]/g, '') // control chars
    .replace(/\s+/g, ' ')                   // collapse runs of spaces
    .trim();
}

/** Case-insensitive canonical form for name comparison. */
export function canonicalName(value: unknown): string {
  return cleanText(value).toLowerCase();
}

/** Uppercase a code, preserving inner separators like '-' and '.'. */
export function canonicalCode(value: unknown): string {
  return cleanText(value).toUpperCase();
}

/** Parse an integer semester from "Sem 3", "III", "3", "S3", etc. */
export function canonicalSemester(value: unknown): string {
  const text = cleanText(value);
  if (!text) return '';
  const digits = text.match(/\d+/);
  if (digits) return String(parseInt(digits[0], 10));
  const roman = text.toUpperCase().replace(/[^IVX]/g, '');
  const map: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
  return map[roman] ? String(map[roman]) : text;
}

/** Normalize an assessment/marks token: trims, uppercases, maps synonyms. */
export function canonicalMarkToken(value: unknown): string {
  const text = cleanText(value).toUpperCase();
  if (text === '') return '';
  if (['AB', 'A/B', 'ABSENT', '-'].includes(text)) return 'AB';
  if (['NA', 'N/A', 'NOTAPPLICABLE', 'NOT APPLICABLE'].includes(text)) return 'NA';
  return text;
}

/** Parse a numeric marks value; returns null for blank/AB/NA, NaN if invalid. */
export function parseMarkNumber(value: unknown): number | null | 'AB' | 'NA' | 'INVALID' {
  const token = canonicalMarkToken(value);
  if (token === '') return null;
  if (token === 'AB') return 'AB';
  if (token === 'NA') return 'NA';
  const n = Number(token.replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : 'INVALID';
}

/**
 * Resolve a raw header into a canonical field name using the alias table.
 * `columnAliases` maps canonical -> [normalized alias...].
 */
export function resolveColumns(
  rawRow: Record<string, unknown>,
  columnAliases: Record<string, string[]>
): Record<string, string> {
  // Pre-normalize the incoming row keys once.
  const byKey: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawRow)) byKey[normalizeKey(k)] = v;

  const out: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(columnAliases)) {
    const candidates = [normalizeKey(canonical), ...aliases.map(normalizeKey)];
    let value: unknown = '';
    for (const c of candidates) {
      if (byKey[c] !== undefined && byKey[c] !== '') { value = byKey[c]; break; }
    }
    out[canonical] = cleanText(value);
  }
  return out;
}

/** Levenshtein distance for suggested-match ranking. */
export function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
