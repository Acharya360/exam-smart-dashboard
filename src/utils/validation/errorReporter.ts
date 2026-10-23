// ============================================================================
// Structured Excel error report — multi-sheet with highlighting + filters.
// Sheets: Validation Summary, All Records, Errors, Duplicates,
//         Unmatched Masters, Suggested Corrections.
// ============================================================================
import * as XLSX from 'xlsx';
import type { ValidatedRow, ValidationIssue, ValidationResult } from './types';

function styleCell(cell: XLSX.CellObject | undefined, rgb: string) {
  if (!cell) return;
  cell.s = { fill: { patternType: 'solid', fgColor: { rgb } }, font: { color: { rgb: 'FF000000' } } };
}

const SEVERITY_FILL: Record<string, string> = {
  critical: 'FFFFC7CE', // red
  error: 'FFFFC7CE',
  warning: 'FFFFEB9C',  // amber
};

function addSheet(wb: XLSX.WorkBook, name: string, header: string[], rows: unknown[][], severityCol?: number) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  // Header styling + auto column widths.
  const widths = header.map((h, c) => {
    let max = h.length;
    for (let r = 1; r <= range.e.r; r++) {
      const v = ws[XLSX.utils.encode_cell({ r, c })];
      if (v && String(v.v).length > max) max = String(v.v).length;
    }
    return { wch: Math.min(45, max + 2) };
  });
  ws['!cols'] = widths;
  // Freeze header + enable auto filter.
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  // Severity highlighting.
  if (severityCol !== undefined) {
    for (let r = 1; r <= range.e.r; r++) {
      const sev = ws[XLSX.utils.encode_cell({ r, c: severityCol })];
      const fill = sev && SEVERITY_FILL[String(sev.v).toLowerCase()];
      if (fill) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          styleCell(ws[XLSX.utils.encode_cell({ r, c })], fill);
        }
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

function issueRow(i: ValidationIssue): unknown[] {
  return [
    i.excelRow, i.fieldLabel, i.originalValue, i.normalizedValue, i.code,
    i.message, i.suggestedCorrection || '', i.matchedMasterValue || '', i.severity, i.status,
  ];
}

export function generateImportErrorReport<T>(result: ValidationResult<T>): void {
  const wb = XLSX.utils.book_new();
  const s = result.summary;

  addSheet(wb, 'Validation Summary', ['Metric', 'Value'], [
    ['Module', result.moduleName],
    ['File', result.fileName],
    ['Generated', result.generatedAt],
    ['Total rows', s.totalRows],
    ['Valid rows', s.validRows],
    ['Invalid rows', s.invalidRows],
    ['Duplicate rows', s.duplicateRows],
    ['Warning rows', s.warningRows],
    ['Unmatched programmes', s.unmatchedProgrammes],
    ['Unmatched subjects', s.unmatchedSubjects],
    ['Importable rows', s.importableRows],
    ['Overall status', result.hasCritical ? 'BLOCKED (critical errors)' : result.success ? 'READY TO IMPORT' : 'REVIEW REQUIRED'],
  ]);

  const errIssues = result.issues.filter(i => i.severity !== 'warning');
  const warnIssues = result.issues.filter(i => i.severity === 'warning');

  addSheet(wb, 'All Records', ['Excel Row', 'Status', 'Issues'],
    result.rows.map((r: ValidatedRow<T>) => [r.excelRow, r.status, r.issues.length]));

  addSheet(wb, 'Errors', ['Excel Row', 'Field', 'Original Value', 'Normalized Value', 'Error Code', 'Description', 'Suggested Correction', 'Matched Master', 'Severity', 'Status'],
    errIssues.map(issueRow), 8);

  addSheet(wb, 'Duplicates', ['Excel Row', 'Field', 'Original Value', 'Normalized Value', 'Error Code', 'Description', 'Suggested Correction', 'Matched Master', 'Severity', 'Status'],
    result.issues.filter(i => i.code === 'DUPLICATE_IN_UPLOAD' || i.code === 'DUPLICATE_IN_DB' || i.code === 'CONFLICTING_RECORD').map(issueRow), 8);

  addSheet(wb, 'Unmatched Masters', ['Excel Row', 'Field', 'Original Value', 'Normalized Value', 'Error Code', 'Description', 'Suggested Correction', 'Matched Master', 'Severity', 'Status'],
    result.issues.filter(i => i.code === 'MASTER_NOT_FOUND' || i.code === 'MAPPING_MISMATCH').map(issueRow), 8);

  addSheet(wb, 'Suggested Corrections', ['Excel Row', 'Field', 'Original Value', 'Normalized Value', 'Error Code', 'Description', 'Suggested Correction', 'Matched Master', 'Severity', 'Status'],
    [...warnIssues, ...result.issues.filter(i => i.code === 'SUGGESTED_MATCH')].map(issueRow), 8);

  const safe = (result.fileName || 'import').replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '_');
  XLSX.writeFile(wb, `${safe}_validation_report.xlsx`);
}
