// ============================================================================
// Post-parse validation for modules that already have a rich, heavy parser
// (e.g. Course Master LTPS scheme engine). The parser owns parsing + transform
// + structural validation; this layer adds the shared framework value on top of
// the already-transformed entities: master cross-validation, within-upload
// duplicate detection, and the same ValidationResult shape consumed by the
// preview dashboard and the Excel error reporter. No re-parsing, so it can
// never regress the existing transform.
// ============================================================================
import type {
  MasterDataCheck,
  MasterRecord,
  ValidatedRow,
  ValidationIssue,
  ValidationResult,
  ValidationStatus,
} from './types';
import { validateAgainstMaster } from './masterDataValidator';

type ParsedMasterCheck = Pick<
  MasterDataCheck,
  'field' | 'fieldLabel' | 'masterType' | 'severity' | 'allowSuggest' | 'constraintFields'
> & { master: MasterRecord[] };

export interface ParsedValidationInput<T> {
  moduleName: string;
  fileName: string;
  items: T[];
  // Normalized field map used for master matching, duplicate keying and the report.
  fieldsOf: (item: T) => Record<string, string>;
  labels: Record<string, string>;
  duplicateKeyFields: string[];
  masterChecks?: ParsedMasterCheck[];
  // Pre-existing parser notices (row-level scheme errors) surfaced in the report.
  parserErrors?: string[];
}

function compositeKey(row: Record<string, string>, fields: string[]): string {
  return fields.map(f => (row[f] ?? '').toLowerCase()).join('||');
}

export function validateParsedEntities<T>(input: ParsedValidationInput<T>): ValidationResult<T> {
  const { moduleName, fileName, items, fieldsOf, labels, duplicateKeyFields, masterChecks, parserErrors } = input;

  const rawRows = items.map(fieldsOf);

  // Within-upload duplicate detection on the business key.
  const firstSeen = new Map<string, number>();
  const uploadDupes = new Map<number, number>();
  rawRows.forEach((row, index) => {
    const key = compositeKey(row, duplicateKeyFields);
    if (firstSeen.has(key)) uploadDupes.set(index, firstSeen.get(key)!);
    else firstSeen.set(key, index);
  });

  const rows: ValidatedRow<T>[] = items.map((item, index) => {
    const excelRow = index + 2;
    const raw = rawRows[index];
    const issues: ValidationIssue[] = [];

    let suggestedMatch: string | undefined;
    const unresolvedFields = new Set<string>();
    for (const check of masterChecks || []) {
      const { issue, suggested } = validateAgainstMaster(check, raw, labels[check.field] || check.fieldLabel, excelRow, unresolvedFields);
      if (issue) {
        issues.push(issue);
        if (issue.code === 'MASTER_NOT_FOUND' || issue.code === 'SUGGESTED_MATCH') unresolvedFields.add(check.field);
      }
      if (suggested) suggestedMatch = suggested;
    }

    if (uploadDupes.has(index)) {
      const firstIndex = uploadDupes.get(index)!;
      const key = duplicateKeyFields.map(f => `${labels[f] || f}="${raw[f]}"`).join(', ');
      issues.push({
        excelRow, field: duplicateKeyFields[0], fieldLabel: 'Duplicate record',
        code: 'DUPLICATE_IN_UPLOAD', severity: 'error', status: 'duplicate',
        message: `Duplicate of upload row ${firstIndex + 2} (${key}).`,
        originalValue: key, normalizedValue: key,
        suggestedCorrection: 'Remove or reconcile the repeated row before importing.',
      });
    }

    const status: ValidationStatus = uploadDupes.has(index)
      ? 'duplicate'
      : issues.some(i => i.severity === 'error' || i.severity === 'critical')
        ? 'invalid'
        : issues.length
          ? 'warning'
          : 'valid';

    return {
      index,
      excelRow,
      status,
      data: status === 'valid' || status === 'warning' ? item : null,
      raw,
      issues,
      duplicateOfIndex: uploadDupes.get(index),
      suggestedMatch,
    };
  });

  const issues = rows.flatMap(r => r.issues);
  const summary = {
    totalRows: rows.length,
    validRows: rows.filter(r => r.status === 'valid').length,
    invalidRows: rows.filter(r => r.status === 'invalid').length,
    duplicateRows: rows.filter(r => r.status === 'duplicate').length,
    warningRows: rows.filter(r => r.status === 'warning').length,
    unmatchedProgrammes: issues.filter(i => i.code === 'MASTER_NOT_FOUND' && i.fieldLabel.toLowerCase().includes('programme')).length,
    unmatchedSubjects: issues.filter(i => (i.code === 'MASTER_NOT_FOUND' || i.code === 'MAPPING_MISMATCH') && i.fieldLabel.toLowerCase().includes('subject')).length,
    importableRows: rows.filter(r => r.status === 'valid' || r.status === 'warning').length,
  };

  const data = rows.filter(r => r.data !== null).map(r => r.data as T);
  const issueStrings = issues
    .filter(i => i.severity !== 'warning')
    .map(i => `Row ${i.excelRow}: ${i.message}`);

  return {
    moduleName,
    fileName,
    generatedAt: new Date().toISOString(),
    summary,
    rows,
    issues,
    hasCritical: issues.some(i => i.severity === 'critical'),
    success: summary.invalidRows === 0 && summary.duplicateRows === 0,
    data,
    errors: [...(parserErrors || []), ...issueStrings],
  };
}
