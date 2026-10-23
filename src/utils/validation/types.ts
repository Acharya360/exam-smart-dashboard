// ============================================================================
// Centralized Excel Import Validation Framework — Core Types
// Reusable across every ERP import module (marks, course master, programs,
// schedules). Module-specific rules are expressed as data (ImportModuleConfig)
// so the engine itself stays generic and free of hardcoded domain names.
// ============================================================================

export type ValidationSeverity = 'critical' | 'error' | 'warning';
export type ValidationStatus = 'valid' | 'invalid' | 'warning' | 'duplicate';

// Machine-readable identifiers so reports can be filtered and mapped.
export type ValidationErrorCode =
  | 'MISSING_REQUIRED'
  | 'INVALID_FORMAT'
  | 'OUT_OF_RANGE'
  | 'INVALID_ENUM'
  | 'MASTER_NOT_FOUND'
  | 'MAPPING_MISMATCH'
  | 'DUPLICATE_IN_UPLOAD'
  | 'DUPLICATE_IN_DB'
  | 'CONFLICTING_RECORD'
  | 'SUGGESTED_MATCH';

export interface ValidationIssue {
  excelRow: number;            // 1-based Excel row (header = row 1, data starts at 2)
  field: string;               // canonical field name
  fieldLabel: string;          // human label shown in reports
  code: ValidationErrorCode;
  severity: ValidationSeverity;
  status: ValidationStatus;
  message: string;             // clear explanation
  originalValue: string;       // raw value from the uploaded cell
  normalizedValue: string;     // value after normalization
  suggestedCorrection?: string;// recommended valid value / action
  matchedMasterValue?: string; // matched master record, when found
}

export interface ValidatedRow<T> {
  index: number;               // 0-based index into parsed rows
  excelRow: number;            // 1-based Excel row number
  status: ValidationStatus;
  data: T | null;              // transformed entity when valid/warning
  raw: Record<string, string>; // normalized key->value map (for preview + report)
  issues: ValidationIssue[];
  duplicateOfIndex?: number;   // index of the first occurrence when duplicate
  dbMatchId?: string;          // existing DB record id when matched
  suggestedMatch?: string;     // proposed master value needing user confirm
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  warningRows: number;
  unmatchedProgrammes: number;
  unmatchedSubjects: number;
  importableRows: number;      // rows safe to commit (valid + acknowledged warnings)
}

export interface ValidationResult<T> {
  moduleName: string;
  fileName: string;
  generatedAt: string;
  summary: ValidationSummary;
  rows: ValidatedRow<T>[];
  issues: ValidationIssue[];   // flat list across all rows
  hasCritical: boolean;
  // Backward-compatible shims so existing ParseResult<T> callers keep working.
  success: boolean;
  data: T[];
  errors: string[];
}

// A master record the importer may match against. Kept generic so any master
// table (programmes, subjects, students) can be represented without coupling
// the engine to a specific entity shape.
export interface MasterRecord {
  id: string;
  code: string;          // canonical code (programme code, paper code, PRN…)
  name: string;          // canonical name
  aliases?: string[];    // approved equivalent names
  extra?: Record<string, string>; // e.g. semester, programme_code for subjects
}

// Cross-validation against a master list.
export interface MasterDataCheck {
  field: string;                       // imported field to check
  fieldLabel: string;
  masterType: 'programme' | 'subject' | 'student' | 'examination';
  master: MasterRecord[];              // pre-fetched master records
  severity: ValidationSeverity;
  // Optional composite constraint: the matched master must also satisfy these
  // field->value rules (e.g. subject belongs to this programme + semester).
  constraintFields?: Array<{ field: string; masterKey: string }>;
  allowSuggest?: boolean;              // propose nearest match for confirmation
}

export interface FieldRule {
  required?: boolean;
  label?: string;
  normalizer?: (value: string) => string;
  enumValues?: string[];
  min?: number;
  max?: number;
  integerOnly?: boolean;
  allowAbsent?: boolean;               // accept "AB"
  allowNotApplicable?: boolean;        // accept "NA"
  validator?: (value: string, row: Record<string, string>) => Omit<ValidationIssue, 'excelRow' | 'field' | 'fieldLabel' | 'originalValue' | 'normalizedValue'> | null;
}

export interface ImportModuleConfig<T> {
  moduleName: string;
  // canonical field -> accepted raw header aliases (already normalized keys)
  columnAliases: Record<string, string[]>;
  labels: Record<string, string>;      // canonical field -> human label
  fields: Record<string, FieldRule>;
  duplicateKeyFields: string[];        // business key within the upload
  dbKeyFields?: string[];              // fields used to detect existing DB rows
  masterChecks?: MasterDataCheck[];
  transformRow: (normalized: Record<string, string>, index: number) => T;
}
