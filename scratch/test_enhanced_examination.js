import { calculateResult, calculateSGPA, validateScheme } from '../src/services/resultEngine.ts';
import assert from 'node:assert';

console.log('=== RUNNING ENHANCED EXAMINATION RESULT ENGINE TESTS ===');

// --- Test 1: Inactive heads and zero maxima produce NA components ---
console.log('\nTest 1: Inactive heads and zero maxima produce NA components...');
const nonArchScheme = {
  category: 'Non-Architecture',
  internalPass: 40,
  overallPass: 40,
  integerMarks: true,
  approved: true,
  approvalReference: 'CIRC-2026-TEST',
  credits: 4,
  heads: {
    theory: { active: true, ca: [15, 15, 10], ese: 60, pass: 40 },
    practical: { active: true, ca: [10, 10, 0], ese: 30, pass: 40 },
    skills: { active: false, ca: [0, 0, 0], ese: 0, pass: 40 }
  }
};

const recordsComplete = [
  { assessment_type: 'CA1', theory: 12, practical: 8, skills: null },
  { assessment_type: 'CA2', theory: 10, practical: 7, skills: null },
  { assessment_type: 'CA3', theory: 8, practical: null, skills: null }, // CAP3 is max 0, so not applicable
  { assessment_type: 'ESE', theory: 45, practical: 22, skills: null }
];

const res1 = calculateResult(recordsComplete, nonArchScheme);
assert(res1.components, 'Components must be present');
assert.strictEqual(res1.components.cas1.status, 'NA', 'CAS1 must be NA (skills inactive)');
assert.strictEqual(res1.components.cas2.status, 'NA', 'CAS2 must be NA');
assert.strictEqual(res1.components.cas3.status, 'NA', 'CAS3 must be NA');
assert.strictEqual(res1.components.ess.status, 'NA', 'ESS must be NA');
assert.strictEqual(res1.components.cap3.status, 'NA', 'CAP3 must be NA (max is 0)');
assert.strictEqual(res1.components.cat1.status, 'Evaluated', 'CAT1 must be Evaluated');
assert.strictEqual(res1.components.cat1.display, '12', 'CAT1 display must be 12');
assert.strictEqual(res1.status, 'PASS', 'Course should pass');
assert.strictEqual(res1.components.remark, 'P', 'Remark should be P');
console.log('  -> PASS: NA components correctly excluded from calculations.');

// --- Test 2: Pending marks vs Zero marks distinction ---
console.log('\nTest 2: Pending marks vs Zero marks distinction...');
// Case A: Missing mark (null)
const recordsPending = [
  { assessment_type: 'CA1', theory: null, practical: 8, skills: null },
  { assessment_type: 'CA2', theory: 10, practical: 7, skills: null },
  { assessment_type: 'CA3', theory: 8, practical: null, skills: null },
  { assessment_type: 'ESE', theory: 45, practical: 22, skills: null }
];
const resPending = calculateResult(recordsPending, nonArchScheme);
assert.strictEqual(resPending.components.cat1.status, 'Pending', 'Missing mark must have status Pending');
assert.strictEqual(resPending.components.cat1.display, 'Pending', 'Missing mark display must be Pending');
assert.strictEqual(resPending.internalStatus, 'PENDING', 'Missing mark must result in PENDING internal status');
assert.notStrictEqual(resPending.status, 'TNG', 'Pending mark MUST NEVER result in TNG!');
assert.strictEqual(resPending.status, 'PENDING', 'Final status must be PENDING when marks missing');
console.log('  -> PASS: Pending marks do NOT convert to zero and do NOT falsely classify as TNG.');

// Case B: Actual Zero mark (0)
const recordsZero = [
  { assessment_type: 'CA1', theory: 0, practical: 8, skills: null }, // Actual 0
  { assessment_type: 'CA2', theory: 10, practical: 7, skills: null },
  { assessment_type: 'CA3', theory: 8, practical: null, skills: null },
  { assessment_type: 'ESE', theory: 45, practical: 22, skills: null }
];
const resZero = calculateResult(recordsZero, nonArchScheme);
assert.strictEqual(resZero.components.cat1.status, 'Evaluated', 'Zero mark must be Evaluated');
assert.strictEqual(resZero.components.cat1.display, '0', 'Zero mark display must be "0", not Pending');
assert.strictEqual(resZero.components.cat1.obtained, 0, 'Zero mark obtained value must be 0');
console.log('  -> PASS: Zero marks (0) treated as evaluated, not Pending.');

// --- Test 3: Absent mark (AB) handling ---
console.log('\nTest 3: Absent mark (AB) handling...');
const recordsAbsent = [
  { assessment_type: 'CA1', theory: 'AB', practical: 8, skills: null },
  { assessment_type: 'CA2', theory: 10, practical: 7, skills: null },
  { assessment_type: 'CA3', theory: 8, practical: null, skills: null },
  { assessment_type: 'ESE', theory: 45, practical: 22, skills: null }
];
const resAbsent = calculateResult(recordsAbsent, nonArchScheme);
assert.strictEqual(resAbsent.components.cat1.status, 'Absent', 'Status must be Absent');
assert.strictEqual(resAbsent.components.cat1.display, 'AB', 'Display must be AB');
assert.strictEqual(resAbsent.components.cat1.obtained, 'AB', 'Obtained must be AB');
console.log('  -> PASS: Absent marks (AB) handled cleanly.');

// --- Test 4: TNG Classification & Dynamic Policy (40% Non-Arch vs 45% Arch) ---
console.log('\nTest 4: TNG Classification & Dynamic Policy (40% Non-Arch vs 45% Arch)...');
// Non-Architecture: internalMax = 15+15+10+10+10 = 60. 40% = 24.
// Student gets: 5 + 5 + 2 + 3 + 3 = 18 marks (< 24 required)
const recordsTNGNonArch = [
  { assessment_type: 'CA1', theory: 5, practical: 3, skills: null },
  { assessment_type: 'CA2', theory: 5, practical: 3, skills: null },
  { assessment_type: 'CA3', theory: 2, practical: null, skills: null }
];
const resTNGNonArch = calculateResult(recordsTNGNonArch, nonArchScheme);
assert.strictEqual(resTNGNonArch.internalStatus, 'TNG', 'Must be classified as TNG');
assert.strictEqual(resTNGNonArch.status, 'TNG', 'Course status must be TNG');
assert.strictEqual(resTNGNonArch.components.remark, 'TNG', 'TR Remark must be TNG');
assert(resTNGNonArch.reasons.some(r => r.includes('Combined internal marks below eligibility threshold')), 'Reason must state TNG');
console.log('  -> PASS: Non-Architecture student below 40% classified as TNG.');

// Architecture: internalPass = 45%
const archScheme = {
  category: 'Architecture',
  internalPass: 45,
  overallPass: 45,
  integerMarks: true,
  approved: true,
  approvalReference: 'COA-2026-TEST',
  credits: 5,
  heads: {
    theory: { active: true, ca: [20, 20, 20], ese: 80, pass: 45 },
    practical: { active: false, ca: [0, 0, 0], ese: 0, pass: 45 },
    skills: { active: false, ca: [0, 0, 0], ese: 0, pass: 45 }
  }
};
// Max = 60. 45% of 60 = 27.
// Student gets 25 marks (< 27)
const recordsTNGArch = [
  { assessment_type: 'CA1', theory: 10, practical: null, skills: null },
  { assessment_type: 'CA2', theory: 10, practical: null, skills: null },
  { assessment_type: 'CA3', theory: 5, practical: null, skills: null }
];
const resTNGArch = calculateResult(recordsTNGArch, archScheme);
assert.strictEqual(resTNGArch.internalStatus, 'TNG', 'Architecture student below 45% must be TNG');
assert.strictEqual(resTNGArch.internalRequired, 27, 'Required must be 27');
assert.strictEqual(resTNGArch.internalTotal, 25, 'Obtained must be 25');
console.log('  -> PASS: Architecture dynamic 45% internal cutoff verified.');

// --- Test 5: Live API Integration Check ---
console.log('\nTest 5: Checking live API endpoint /api/examination...');
try {
  // Login as CoE
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coe@sspu.ac.in', password: 'Admin@123' })
  });
  assert(loginRes.ok, 'CoE login failed');
  const cookie = loginRes.headers.get('set-cookie');

  // Fetch /api/examination
  const examRes = await fetch('http://localhost:5000/api/examination', {
    headers: { 'Cookie': cookie || '' }
  });
  assert(examRes.ok, 'Failed to fetch /api/examination');
  const examData = await examRes.json();

  assert(Array.isArray(examData.registrations), 'Registrations must be an array');
  assert(examData.registrations.length > 0, 'Registrations must not be empty');

  // Check first registration has enriched component fields
  const sample = examData.registrations[0];
  assert(sample.components, 'Enriched components must be present on live API registrations');
  assert(sample.school_name !== undefined, 'school_name must be present');
  assert(sample.sm_subject_name !== undefined, 'sm_subject_name must be present');
  assert(sample.grading_category !== undefined, 'grading_category must be present');

  // Check TNG registrations count
  const tngCount = examData.registrations.filter(r => r.internalStatus === 'TNG').length;
  console.log(`  -> Live API: ${examData.registrations.length} registrations, ${tngCount} TNG registrations.`);
  console.log('  -> Sample registration components check:');
  console.log('     CAT1:', sample.components.cat1);
  console.log('     EST:', sample.components.est);
  console.log('     CA Total:', sample.components.caTotal, '/', sample.components.caMax);
  console.log('     Grand Total:', sample.components.grandTotal, '/', sample.components.grandMax);
  console.log('     Remark:', sample.components.remark);

  console.log('  -> PASS: Live API /api/examination returns fully enriched records.');
} catch (err) {
  console.error('  -> Live API test error:', err.message);
  process.exit(1);
}

console.log('\n=== ALL ENHANCED EXAMINATION TESTS PASSED (5/5) ===');
