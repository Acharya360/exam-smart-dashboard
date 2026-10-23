// ============================================================================
// Validation pipeline orchestrator.
// Upload -> Parse -> Normalize -> Validate -> Match Masters -> Detect Dupes
// -> Result (preview happens in the UI; nothing is written here).
// ============================================================================
import * as XLSX from 'xlsx';
import type { ImportModuleConfig, ValidatedRow, ValidationIssue, ValidationResult } from './types';
import { resolveColumns, canonicalSemester, canonicalCode, canonicalMarkToken } from './normalizer';
import { validateRowFields, statusFromIssues } from './validators';
import { detectUploadDuplicates, uploadDuplicateIssue, detectDbDuplicates } from './duplicateDetector';
import { validateAgainstMaster } from './masterDataValidator';

// Default per-field normalizers applied when a rule has none.
const DEFAULT_NORMALIZERS: Record<string, (v: string) => string> = {
  semester: canonicalSemester,
  paper_code: canonicalCode,
  program_code: canonicalCode,
  programme_code: canonicalCode,
  assessment_type: v => canonicalCode(v),
  theory: canonicalMarkToken,
  practical: canonicalMarkToken,
  skills: canonicalMarkToken,
};

export interface PipelineInput {
  fileName: string;
  config: ImportModuleConfig<unknown>;
  // Pre-fetched DB records for duplicate detection (optional).
  dbRecords?: Array<Record<string, string>>;
}

/** Read the first (or named) sheet of an xlsx buffer into raw row objects. */
export function readSheetRows(buffer: ArrayBuffer, sheetName?: string): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const name = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
  if (!name) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], { defval: '' });
}

export function runValidationPipeline<T>(
  rawRows: Record<string, unknown>[],
  input: PipelineInput
): ValidationResult<T> {
  const { config, fileName, dbRecords } = input;

  // Stage 2-3: key + value normalization.
  const normalized = rawRows.map(raw => {
    const row = resolveColumns(raw, config.columnAliases);
    for (const [field, value] of Object.entries(row)) {
      const rule = config.fields[field];
      const normalizer = rule?.normalizer || DEFAULT_NORMALIZERS[field];
      if (normalizer) row[field] = normalizer(value);
    }
    return row;
  });

  // Stage 8: duplicates within upload + against DB.
  const uploadDupes = detectUploadDuplicates(config, normalized);
  const dbDupes = dbRecords ? detectDbDuplicates(config, normalized, dbRecords) : new Map<number, string>();

  const rows: ValidatedRow<T>[] = normalized.map((row, index) => {
    const excelRow = index + 2;
    const issues: ValidationIssue[] = [];

    // Stage 4-5: required + field-level + cross-field validators.
    issues.push(...validateRowFields(config as ImportModuleConfig<unknown>, row).map(i => ({ ...i, excelRow })));

    // Stage 7: master-data cross validation.
    let suggestedMatch: string | undefined;
    const unresolvedFields = new Set<string>();
    for (const check of config.masterChecks || []) {
      const { issue, suggested } = validateAgainstMaster(check, row, config.labels[check.field] || check.field, excelRow, unresolvedFields);
      if (issue) {
        issues.push(issue);
        if (issue.code === 'MASTER_NOT_FOUND' || issue.code === 'SUGGESTED_MATCH') unresolvedFields.add(check.field);
      }
      if (suggested) suggestedMatch = suggested;
    }

    // Stage 8: duplicate issues.
    if (uploadDupes.has(index)) {
      issues.push(uploadDuplicateIssue(config, row, uploadDupes.get(index)!, excelRow));
    }

    const status = uploadDupes.has(index) ? 'duplicate' : statusFromIssues(issues.map(i => ({ ...i, excelRow })));
    const data = status === 'valid' || status === 'warning' ? (config.transformRow(row, index) as unknown as T) : null;

    return {
      index,
      excelRow,
      status,
      data,
      raw: row,
      issues: issues.map(i => ({ ...i, excelRow })),
      duplicateOfIndex: uploadDupes.get(index),
      dbMatchId: dbDupes.get(index),
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
  const errorStrings = issues
    .filter(i => i.severity !== 'warning')
    .map(i => `Row ${i.excelRow}: ${i.message}`);

  return {
    moduleName: config.moduleName,
    fileName,
    generatedAt: new Date().toISOString(),
    summary,
    rows,
    issues,
    hasCritical: issues.some(i => i.severity === 'critical'),
    success: summary.invalidRows === 0 && summary.duplicateRows === 0,
    data,
    errors: errorStrings,
  };
}
