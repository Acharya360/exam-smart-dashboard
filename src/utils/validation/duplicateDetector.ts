// ============================================================================
// Duplicate detection — within the upload and against existing DB records.
// ============================================================================
import type { ImportModuleConfig, ValidationIssue } from './types';

function compositeKey(row: Record<string, string>, fields: string[]): string {
  return fields.map(f => (row[f] ?? '').toLowerCase()).join('||');
}

/**
 * Flag rows whose business key repeats within the same upload.
 * Returns a map of row index -> the index of the first occurrence.
 */
export function detectUploadDuplicates(
  config: ImportModuleConfig<unknown>,
  rows: Record<string, string>[]
): Map<number, number> {
  const firstSeen = new Map<string, number>();
  const dupes = new Map<number, number>();
  if (!config.duplicateKeyFields.length) return dupes;
  rows.forEach((row, index) => {
    const key = compositeKey(row, config.duplicateKeyFields);
    if (firstSeen.has(key)) dupes.set(index, firstSeen.get(key)!);
    else firstSeen.set(key, index);
  });
  return dupes;
}

/** Build a duplicate ValidationIssue for a row that repeats within the upload. */
export function uploadDuplicateIssue(
  config: ImportModuleConfig<unknown>,
  row: Record<string, string>,
  firstIndex: number,
  excelRow: number
): ValidationIssue {
  const key = config.duplicateKeyFields.map(f => `${config.labels[f] || f}="${row[f]}"`).join(', ');
  return {
    excelRow,
    field: config.duplicateKeyFields[0],
    fieldLabel: 'Duplicate record',
    code: 'DUPLICATE_IN_UPLOAD',
    severity: 'error',
    status: 'duplicate',
    message: `Duplicate of upload row ${firstIndex + 2} (${key}).`,
    originalValue: key,
    normalizedValue: key,
    suggestedCorrection: 'Remove or reconcile the repeated row before importing.',
  };
}

/**
 * Match normalized rows against existing DB records using the DB key fields.
 * Returns a map of row index -> matched DB record id.
 */
export function detectDbDuplicates(
  config: ImportModuleConfig<unknown>,
  rows: Record<string, string>[],
  dbRecords: Array<Record<string, string>>
): Map<number, string> {
  const matches = new Map<number, string>();
  const fields = config.dbKeyFields || config.duplicateKeyFields;
  if (!fields.length || !dbRecords.length) return matches;
  const index = new Map<string, string>();
  for (const rec of dbRecords) {
    const key = compositeKey(rec, fields);
    if (rec.id) index.set(key, rec.id);
  }
  rows.forEach((row, i) => {
    const id = index.get(compositeKey(row, fields));
    if (id) matches.set(i, id);
  });
  return matches;
}
