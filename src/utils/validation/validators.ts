// ============================================================================
// Field-level + cross-field validators. Each returns a ValidationIssue or null.
// ============================================================================
import type { FieldRule, ImportModuleConfig, ValidationIssue, ValidationStatus } from './types';
import { canonicalMarkToken, parseMarkNumber } from './normalizer';

type IssueWithoutRow = Omit<ValidationIssue, 'excelRow'>;

function baseIssue(field: string, label: string, row: Record<string, string>): Pick<ValidationIssue, 'field' | 'fieldLabel' | 'originalValue' | 'normalizedValue'> {
  return { field, fieldLabel: label, originalValue: row[field] ?? '', normalizedValue: row[field] ?? '' };
}

/** Validate a single field against its rule. Returns null when the value passes. */
export function validateField(
  field: string,
  rule: FieldRule,
  label: string,
  row: Record<string, string>
): IssueWithoutRow | null {
  const raw = row[field] ?? '';
  const value = rule.normalizer ? rule.normalizer(raw) : raw;

  if (rule.required && value === '') {
    return { ...baseIssue(field, label, row), code: 'MISSING_REQUIRED', severity: 'critical', status: 'invalid', message: `${label} is required.` };
  }
  if (value === '') return null; // optional + empty => skip further checks

  if (rule.enumValues && !rule.enumValues.includes(value)) {
    return { ...baseIssue(field, label, row), code: 'INVALID_ENUM', severity: 'error', status: 'invalid', message: `${label} must be one of: ${rule.enumValues.join(', ')}.`, suggestedCorrection: rule.enumValues.join(' | ') };
  }

  // Marks-style numeric fields honour AB/NA sentinels.
  if (rule.min !== undefined || rule.max !== undefined || rule.integerOnly) {
    const token = canonicalMarkToken(value);
    if (token === 'AB' && !rule.allowAbsent) {
      return { ...baseIssue(field, label, row), code: 'INVALID_FORMAT', severity: 'error', status: 'invalid', message: `${label} does not accept "AB".` };
    }
    if (token === 'NA' && !rule.allowNotApplicable) {
      return { ...baseIssue(field, label, row), code: 'INVALID_FORMAT', severity: 'error', status: 'invalid', message: `${label} does not accept "NA".` };
    }
    const num = parseMarkNumber(value);
    if (num === 'INVALID') {
      return { ...baseIssue(field, label, row), code: 'INVALID_FORMAT', severity: 'error', status: 'invalid', message: `${label} must be a number, AB or NA.` };
    }
    if (typeof num === 'number') {
      if (rule.min !== undefined && num < rule.min) {
        return { ...baseIssue(field, label, row), code: 'OUT_OF_RANGE', severity: 'error', status: 'invalid', message: `${label} must be ≥ ${rule.min}.`, suggestedCorrection: `Enter a value between ${rule.min}${rule.max !== undefined ? ` and ${rule.max}` : ''}` };
      }
      if (rule.max !== undefined && num > rule.max) {
        return { ...baseIssue(field, label, row), code: 'OUT_OF_RANGE', severity: 'error', status: 'invalid', message: `${label} must be ≤ ${rule.max}.`, suggestedCorrection: `Enter a value between ${rule.min ?? 0} and ${rule.max}` };
      }
      if (rule.integerOnly && !Number.isInteger(num)) {
        return { ...baseIssue(field, label, row), code: 'INVALID_FORMAT', severity: 'error', status: 'invalid', message: `${label} must be a whole number.` };
      }
    }
  }

  if (rule.validator) {
    const custom = rule.validator(value, row);
    if (custom) return { ...baseIssue(field, label, row), ...custom };
  }
  return null;
}

/** Run every configured field rule for one normalized row. */
export function validateRowFields(config: ImportModuleConfig<unknown>, row: Record<string, string>): IssueWithoutRow[] {
  const issues: IssueWithoutRow[] = [];
  for (const [field, rule] of Object.entries(config.fields)) {
    const issue = validateField(field, rule, config.labels[field] || field, row);
    if (issue) issues.push(issue);
  }
  return issues;
}

/** Derive a row status from its issues. */
export function statusFromIssues(issues: ValidationIssue[]): ValidationStatus {
  if (issues.some(i => i.severity === 'critical' || i.severity === 'error')) return 'invalid';
  if (issues.some(i => i.severity === 'warning')) return 'warning';
  return 'valid';
}
