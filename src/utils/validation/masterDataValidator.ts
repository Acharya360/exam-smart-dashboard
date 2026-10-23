// ============================================================================
// Master-data cross-validation. Deterministic matching first (code, alias,
// normalized name); nearest-match suggestions require user confirmation and
// never auto-create master records.
// ============================================================================
import type { MasterDataCheck, MasterRecord, ValidationIssue } from './types';
import { canonicalName, canonicalCode, editDistance } from './normalizer';

function matchMaster(value: string, master: MasterRecord[]): MasterRecord | null {
  const code = canonicalCode(value);
  const name = canonicalName(value);
  if (!code && !name) return null;
  for (const m of master) {
    if (code && canonicalCode(m.code) === code) return m;
    if (name && canonicalName(m.name) === name) return m;
    if (name && m.aliases?.some(a => canonicalName(a) === name)) return m;
  }
  return null;
}

function nearestMaster(value: string, master: MasterRecord[]): MasterRecord | null {
  const name = canonicalName(value);
  if (!name || !master.length) return null;
  let best: MasterRecord | null = null;
  let bestDist = Infinity;
  for (const m of master) {
    const d = editDistance(name, canonicalName(m.name));
    if (d < bestDist) { bestDist = d; best = m; }
  }
  // Only suggest when reasonably close (<= 40% of the value length).
  return best && bestDist <= Math.max(2, Math.floor(name.length * 0.4)) ? best : null;
}

/**
 * Validate one field against a master list. Returns an issue when unmatched,
 * or a warning-with-suggestion when a close match exists but is uncertain.
 */
export function validateAgainstMaster(
  check: MasterDataCheck,
  row: Record<string, string>,
  fieldLabel: string,
  excelRow: number,
  unresolvedFields?: Set<string>
): { issue: ValidationIssue | null; suggested?: string } {
  const value = row[check.field] ?? '';
  if (value === '') return { issue: null }; // required-ness handled by field rules

  const matched = matchMaster(value, check.master);

  // Composite constraint: even a matched master must satisfy programme/semester.
  // Skip when the referenced field is itself unresolved (e.g. a misspelled
  // programme) so we do not cascade a false mapping error onto this row.
  if (matched && check.constraintFields?.length) {
    for (const { field, masterKey } of check.constraintFields) {
      if (unresolvedFields?.has(field)) continue;
      const expected = canonicalName(row[field] ?? '');
      const actual = canonicalName(matched.extra?.[masterKey] ?? '');
      if (expected && actual && expected !== actual) {
        return {
          issue: {
            excelRow, field: check.field, fieldLabel,
            code: 'MAPPING_MISMATCH', severity: 'error', status: 'invalid',
            message: `${fieldLabel} "${value}" does not belong to ${row[field]} per the curriculum scheme.`,
            originalValue: value, normalizedValue: matched.name, matchedMasterValue: `${matched.code} · ${matched.name}`,
            suggestedCorrection: `Verify the ${fieldLabel} for ${row[field]}.`,
          },
        };
      }
    }
  }

  if (matched) {
    return { issue: null };
  }

  // No deterministic match.
  if (check.allowSuggest) {
    const suggestion = nearestMaster(value, check.master);
    if (suggestion) {
      return {
        suggested: suggestion.name,
        issue: {
          excelRow, field: check.field, fieldLabel,
          code: 'SUGGESTED_MATCH', severity: 'warning', status: 'warning',
          message: `${fieldLabel} "${value}" not found in master data. Did you mean "${suggestion.name}" (${suggestion.code})?`,
          originalValue: value, normalizedValue: value, matchedMasterValue: `${suggestion.code} · ${suggestion.name}`,
          suggestedCorrection: `Confirm mapping to "${suggestion.name}" or correct the value.`,
        },
      };
    }
  }

  const kind = check.masterType.charAt(0).toUpperCase() + check.masterType.slice(1);
  return {
    issue: {
      excelRow, field: check.field, fieldLabel,
      code: 'MASTER_NOT_FOUND', severity: check.severity, status: 'invalid',
      message: `${fieldLabel} "${value}" not found in the ${kind} master records.`,
      originalValue: value, normalizedValue: value,
      suggestedCorrection: `Add "${value}" to the ${kind} master or correct the value. Master records are never auto-created.`,
    },
  };
}
