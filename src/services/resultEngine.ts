import type { AssessmentScheme, AssessmentRecord, CourseOutcome, AssessmentHead, AssessmentComponentDetail, AssessmentComponentsMap } from '../types/index.ts';

export const HEADS: AssessmentHead[] = ['theory', 'practical', 'skills'];

function createComponentDetail(
  code: AssessmentComponentDetail['code'],
  name: string,
  head: AssessmentHead,
  max: number,
  active: boolean,
  recordValue: import('../types/index.ts').AssessmentMark | undefined
): AssessmentComponentDetail {
  if (!active || max <= 0) {
    return {
      code,
      name,
      head,
      applicable: false,
      max: 0,
      obtained: null,
      status: 'NA',
      display: 'NA'
    };
  }
  if (recordValue === null || recordValue === undefined) {
    return {
      code,
      name,
      head,
      applicable: true,
      max,
      obtained: null,
      status: 'Pending',
      display: 'Pending'
    };
  }
  if (recordValue === 'AB') {
    return {
      code,
      name,
      head,
      applicable: true,
      max,
      obtained: 'AB',
      status: 'Absent',
      display: 'AB'
    };
  }
  return {
    code,
    name,
    head,
    applicable: true,
    max,
    obtained: recordValue,
    status: 'Evaluated',
    display: String(recordValue)
  };
}

export function validateScheme(s: AssessmentScheme): string[] {
  const errors: string[] = [];
  if (!s || !['Architecture', 'Non-Architecture'].includes(s.category)) return ['Choose a programme category.'];
  if (!Number.isFinite(s.credits) || s.credits < 0) errors.push('Credits must be zero or greater.');
  if (![s.internalPass, s.overallPass].every(n => Number.isFinite(n) && n > 0 && n <= 100)) errors.push('Passing percentages must be between 0 and 100.');
  if (s.category === 'Architecture' && s.overallPass < 45) errors.push('Architecture requires at least 45% overall.');
  if (s.category === 'Non-Architecture' && ![40, 45].includes(s.overallPass)) errors.push('Select 40% or 45% for Non-Architecture.');
  if (!s.heads || !HEADS.some(h => s.heads[h]?.active)) return [...errors, 'At least one assessment head is required.'];
  for (const h of HEADS) {
    const v = s.heads[h];
    if (!v) { errors.push(`Missing ${h} configuration.`); continue; }
    if (!v.active) continue;
    if (!Array.isArray(v.ca) || v.ca.length !== 3 || ![...v.ca, v.ese].every(n => Number.isFinite(n) && n >= 0)) {
      errors.push(`${h}: enter non-negative CA1, CA2, CA3 and ESE maxima.`);
      continue;
    }
    const headTotal = v.ca[0] + v.ca[1] + v.ca[2] + v.ese;
    if (headTotal <= 0) {
      errors.push(`${h}: active head must have at least one assessment component greater than zero.`);
      continue;
    }
    if (v.ese > 0) {
      if (!Number.isFinite(v.pass) || v.pass <= 0 || v.pass > 100) errors.push(`${h}: invalid ESE passing percentage.`);
      if (s.category === 'Architecture' && v.pass < 45) errors.push(`${h}: Architecture ESE requires at least 45%.`);
    }
    if (s.integerMarks && ![...v.ca, v.ese].every(Number.isInteger)) errors.push(`${h}: integer scheme requires integer maxima.`);
  }
  if (s.approved && !s.approvalReference?.trim()) errors.push('Approval reference is required.');
  return errors;
}

export function calculateResult(records: AssessmentRecord[], scheme: AssessmentScheme | null): CourseOutcome {
  const out: CourseOutcome = { status: 'WITHHELD', internalStatus: 'PENDING', total: 0, maximum: 0, percentage: 0, internalTotal: 0, internalMaximum: 0, internalRequired: 0, grade: '—', gradePoint: 0, creditPoints: 0, earnedCredits: 0, reasons: [] };
  if (!scheme) return { ...out, reasons: ['Assessment scheme is not configured.'] };
  const errors = validateScheme(scheme);
  if (errors.length) return { ...out, reasons: errors };
  const active = HEADS.filter(h => scheme.heads[h].active);
  const required = (max: number, pct: number) => scheme.integerMarks ? Math.ceil(max * pct / 100) : max * pct / 100;
  let caMissing = false, eseMissing = false, absent = false, caAbsent = false, eseFailed = false;
  for (const type of ['CA1', 'CA2', 'CA3', 'ESE']) {
    const matching = records.filter(r => r.assessment_type === type);
    if (matching.length > 1) errors.push(`Duplicate ${type} records; reconcile before processing.`);
    const row = matching[0];
    for (const h of active) {
      const max = type === 'ESE' ? scheme.heads[h].ese : scheme.heads[h].ca[Number(type[2]) - 1];
      if (max === 0) continue; // Component not applicable for this course
      out.maximum += max;
      if (type !== 'ESE') out.internalMaximum += max;
      const value = row?.[h];
      if (value === null || value === undefined) { if (type === 'ESE') eseMissing = true; else caMissing = true; continue; }
      if (value === 'AB') { absent = true; if (type !== 'ESE') caAbsent = true; continue; }
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max || (scheme.integerMarks && !Number.isInteger(value))) { errors.push(`${type} ${h}: marks must be between 0 and ${max}${scheme.integerMarks ? ' (whole numbers)' : ''}.`); continue; }
      out.total += value;
      if (type !== 'ESE') out.internalTotal += value;
      else if (value < required(max, scheme.heads[h].pass)) { eseFailed = true; out.reasons.push(`${h} ESE below ${scheme.heads[h].pass}%.`); }
    }
  }
  if (records.some(r => !['CA1', 'CA2', 'CA3', 'ESE'].includes(r.assessment_type))) errors.push('Unknown assessment type.');
  out.internalRequired = required(out.internalMaximum, scheme.internalPass);
  out.percentage = out.maximum ? out.total / out.maximum * 100 : 0;
  out.internalStatus = caMissing || caAbsent ? 'PENDING' : out.internalTotal < out.internalRequired ? 'TNG' : 'TG';
  // Build granular 12-component assessment map for TR Sheet and TNG modules
  const ca1Row = records.find(r => r.assessment_type === 'CA1');
  const ca2Row = records.find(r => r.assessment_type === 'CA2');
  const ca3Row = records.find(r => r.assessment_type === 'CA3');
  const eseRow = records.find(r => r.assessment_type === 'ESE');

  const cat1 = createComponentDetail('CAT1', 'Continuous Assessment Theory 1', 'theory', scheme.heads.theory?.ca[0] ?? 0, scheme.heads.theory?.active ?? false, ca1Row?.theory);
  const cat2 = createComponentDetail('CAT2', 'Continuous Assessment Theory 2', 'theory', scheme.heads.theory?.ca[1] ?? 0, scheme.heads.theory?.active ?? false, ca2Row?.theory);
  const cat3 = createComponentDetail('CAT3', 'Continuous Assessment Theory 3', 'theory', scheme.heads.theory?.ca[2] ?? 0, scheme.heads.theory?.active ?? false, ca3Row?.theory);

  const cap1 = createComponentDetail('CAP1', 'Continuous Assessment Practical 1', 'practical', scheme.heads.practical?.ca[0] ?? 0, scheme.heads.practical?.active ?? false, ca1Row?.practical);
  const cap2 = createComponentDetail('CAP2', 'Continuous Assessment Practical 2', 'practical', scheme.heads.practical?.ca[1] ?? 0, scheme.heads.practical?.active ?? false, ca2Row?.practical);
  const cap3 = createComponentDetail('CAP3', 'Continuous Assessment Practical 3', 'practical', scheme.heads.practical?.ca[2] ?? 0, scheme.heads.practical?.active ?? false, ca3Row?.practical);

  const cas1 = createComponentDetail('CAS1', 'Continuous Assessment Skills 1', 'skills', scheme.heads.skills?.ca[0] ?? 0, scheme.heads.skills?.active ?? false, ca1Row?.skills);
  const cas2 = createComponentDetail('CAS2', 'Continuous Assessment Skills 2', 'skills', scheme.heads.skills?.ca[1] ?? 0, scheme.heads.skills?.active ?? false, ca2Row?.skills);
  const cas3 = createComponentDetail('CAS3', 'Continuous Assessment Skills 3', 'skills', scheme.heads.skills?.ca[2] ?? 0, scheme.heads.skills?.active ?? false, ca3Row?.skills);

  const est = createComponentDetail('EST', 'End-Semester Theory', 'theory', scheme.heads.theory?.ese ?? 0, scheme.heads.theory?.active ?? false, eseRow?.theory);
  const esp = createComponentDetail('ESP', 'End-Semester Practical', 'practical', scheme.heads.practical?.ese ?? 0, scheme.heads.practical?.active ?? false, eseRow?.practical);
  const ess = createComponentDetail('ESS', 'End-Semester Skills', 'skills', scheme.heads.skills?.ese ?? 0, scheme.heads.skills?.active ?? false, eseRow?.skills);

  const numVal = (c: AssessmentComponentDetail) => (typeof c.obtained === 'number' ? c.obtained : 0);
  const extTotal = (est.applicable ? numVal(est) : 0) + (esp.applicable ? numVal(esp) : 0) + (ess.applicable ? numVal(ess) : 0);
  const extMax = (est.applicable ? est.max : 0) + (esp.applicable ? esp.max : 0) + (ess.applicable ? ess.max : 0);

  const getRemark = (status: CourseOutcome['status']): 'P' | 'F' | 'Pending' | 'AB' | 'TNG' => {
    if (status === 'PASS') return 'P';
    if (status === 'FAIL') return 'F';
    if (status === 'TNG') return 'TNG';
    if (status === 'ABSENT') return 'AB';
    return 'Pending';
  };

  out.components = {
    cat1, cat2, cat3,
    cap1, cap2, cap3,
    cas1, cas2, cas3,
    caTotal: out.internalTotal,
    caMax: out.internalMaximum,
    caPercentage: out.internalMaximum > 0 ? (out.internalTotal / out.internalMaximum) * 100 : 0,
    caStatus: out.internalStatus,
    est, esp, ess,
    extTotal,
    extMax,
    grandTotal: out.total,
    grandMax: out.maximum,
    remark: 'Pending'
  };

  if (errors.length) {
    out.status = 'WITHHELD';
    out.reasons = errors;
    out.components.remark = 'Pending';
    return out;
  }
  // Float noise (72.8/80*100 === 90.99999999999999) must not cost a student the band
  // their displayed percentage already reaches, so compare on a rounded value.
  const passMark = Math.round(out.percentage * 1e6) / 1e6;
  if (out.internalStatus === 'TNG') { out.status = 'TNG'; out.reasons.push('Combined internal marks below eligibility threshold. ESE entry is blocked.'); }
  else if (caMissing || eseMissing) { out.status = 'PENDING'; out.reasons.push('Required marks are incomplete.'); }
  else if (absent) { out.status = 'ABSENT'; out.grade = 'Ab'; }
  else if (eseFailed || passMark < scheme.overallPass) { out.status = 'FAIL'; out.grade = 'F'; if (!eseFailed) out.reasons.push('Overall percentage below passing cutoff.'); }
  else {
    out.status = 'PASS';
    const bands: [number, string, number][] = scheme.category === 'Architecture'
      ? [[90, 'O', 10], [80, 'A', 9], [70, 'B', 8], [60, 'C', 7], [50, 'D', 6], [45, 'E', 5]]
      : [[91, 'O', 10], [81, 'A+', 9], [71, 'A', 8], [61, 'B+', 7], [51, 'B', 6], [41, 'C', 5], [40, 'P', 4]];
    const band = bands.find(([min]) => passMark >= min);
    out.grade = band?.[1] ?? 'F'; out.gradePoint = band?.[2] ?? 0;
    out.creditPoints = scheme.credits * out.gradePoint; out.earnedCredits = scheme.credits;
  }
  if (!scheme.approved) { out.status = 'WITHHELD'; out.grade = '—'; out.gradePoint = 0; out.creditPoints = 0; out.earnedCredits = 0; out.reasons.push('Examination policy approval is required.'); }

  out.components.remark = getRemark(out.status);
  return out;
}

export function calculateSGPA(courses: (CourseOutcome & { credits: number })[]): number | null {
  if (!courses.length || courses.some(c => ['PENDING', 'TNG', 'WITHHELD'].includes(c.status))) return null;
  const credits = courses.reduce((sum, c) => sum + c.credits, 0);
  return credits > 0 ? courses.reduce((sum, c) => sum + c.creditPoints, 0) / credits : null;
}
