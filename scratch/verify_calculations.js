/**
 * Verification Script: Verify Examination Result Engine Calculations
 * 
 * Tests the examination result engine against live database data via Express API (port 5000)
 * and against the updated template workbook (docs/Sample Templete.xlsx).
 * 
 * Rules verified:
 * - Internal status: TG if internal total >= required minimum, TNG if below, PENDING if marks missing/absent
 * - Total marks computation: internal total/max, course total/max, percentage
 * - Grade & grade points assignment:
 *     Non-Architecture: [[91,'O',10],[81,'A+',9],[71,'A',8],[61,'B+',7],[51,'B',6],[41,'C',5],[40,'P',4]] (<40: 'F', 0)
 *     Architecture:     [[90,'O',10],[80,'A',9],[70,'B',8],[60,'C',7],[50,'D',6],[45,'E',5]] (<45: 'F', 0)
 * - TNG blocks ESE entry / results
 * - SGPA = sum(credit_points) / sum(credits), null if any course is PENDING, TNG, or WITHHELD
 */

import { calculateResult, calculateSGPA, HEADS } from '../src/services/resultEngine.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Band definition reference
const BANDS_NON_ARCH = [
  [91, 'O', 10],
  [81, 'A+', 9],
  [71, 'A', 8],
  [61, 'B+', 7],
  [51, 'B', 6],
  [41, 'C', 5],
  [40, 'P', 4],
];

const BANDS_ARCH = [
  [90, 'O', 10],
  [80, 'A', 9],
  [70, 'B', 8],
  [60, 'C', 7],
  [50, 'D', 6],
  [45, 'E', 5],
];

/**
 * Independent calculation following the exact specification rules
 */
function independentCalculation(records, scheme) {
  const result = {
    status: 'WITHHELD',
    internalStatus: 'PENDING',
    total: 0,
    maximum: 0,
    percentage: 0,
    internalTotal: 0,
    internalMaximum: 0,
    internalRequired: 0,
    grade: '—',
    gradePoint: 0,
    creditPoints: 0,
    earnedCredits: 0,
    reasons: []
  };

  if (!scheme) {
    result.reasons.push('Assessment scheme is not configured.');
    return result;
  }

  const activeHeads = HEADS.filter(h => scheme.heads && scheme.heads[h]?.active);
  const computeRequired = (max, pct) => scheme.integerMarks ? Math.ceil(max * pct / 100) : (max * pct / 100);

  let caMissing = false;
  let eseMissing = false;
  let absent = false;
  let caAbsent = false;
  let eseFailed = false;

  for (const type of ['CA1', 'CA2', 'CA3', 'ESE']) {
    const matching = records.filter(r => r.assessment_type === type);
    const row = matching[0];

    for (const h of activeHeads) {
      const headConfig = scheme.heads[h];
      const max = type === 'ESE' ? headConfig.ese : headConfig.ca[Number(type[2]) - 1];

      result.maximum += max;
      if (type !== 'ESE') {
        result.internalMaximum += max;
      }

      const val = row?.[h];

      if (val === null || val === undefined) {
        if (type === 'ESE') eseMissing = true;
        else caMissing = true;
        continue;
      }

      if (val === 'AB') {
        absent = true;
        if (type !== 'ESE') caAbsent = true;
        continue;
      }

      if (typeof val === 'number') {
        result.total += val;
        if (type !== 'ESE') {
          result.internalTotal += val;
        } else {
          const esePassCutoff = computeRequired(max, headConfig.pass);
          if (val < esePassCutoff) {
            eseFailed = true;
            result.reasons.push(`${h} ESE below ${headConfig.pass}%.`);
          }
        }
      }
    }
  }

  result.internalRequired = computeRequired(result.internalMaximum, scheme.internalPass);
  result.percentage = result.maximum > 0 ? (result.total / result.maximum) * 100 : 0;
  result.internalStatus = (caMissing || caAbsent) ? 'PENDING' : (result.internalTotal < result.internalRequired ? 'TNG' : 'TG');

  if (result.internalStatus === 'TNG') {
    result.status = 'TNG';
    result.reasons.push('Combined internal marks below eligibility threshold. ESE entry is blocked.');
  } else if (caMissing || eseMissing) {
    result.status = 'PENDING';
    result.reasons.push('Required marks are incomplete.');
  } else if (absent) {
    result.status = 'ABSENT';
    result.grade = 'Ab';
  } else if (eseFailed || result.percentage < scheme.overallPass) {
    result.status = 'FAIL';
    result.grade = 'F';
  } else {
    result.status = 'PASS';
    const bands = scheme.category === 'Architecture' ? BANDS_ARCH : BANDS_NON_ARCH;
    const band = bands.find(([min]) => result.percentage >= min);
    result.grade = band ? band[1] : 'F';
    result.gradePoint = band ? band[2] : 0;
    result.creditPoints = scheme.credits * result.gradePoint;
    result.earnedCredits = scheme.credits;
  }

  if (!scheme.approved) {
    result.status = 'WITHHELD';
    result.grade = '—';
    result.gradePoint = 0;
    result.creditPoints = 0;
    result.earnedCredits = 0;
    result.reasons.push('Examination policy approval is required.');
  }

  return result;
}

/**
 * Main verification runner
 */
async function runVerification() {
  console.log('='.repeat(80));
  console.log('EXAMINATION CALCULATION & WORKBOOK VERIFICATION SUITE');
  console.log('='.repeat(80));
  console.log(`Target API: ${BASE_URL}`);

  // 1. Authenticate
  console.log('\n[1/5] Authenticating as Super Admin (coe@sspu.ac.in)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coe@sspu.ac.in', password: 'Admin@123' })
  });

  if (!loginRes.ok) {
    throw new Error(`Authentication failed: HTTP ${loginRes.status} ${loginRes.statusText}`);
  }

  const setCookieHeader = loginRes.headers.get('set-cookie');
  if (!setCookieHeader) {
    throw new Error('No Set-Cookie header returned from login');
  }

  const sessionCookie = setCookieHeader.split(';')[0];
  console.log('✔ Authenticated successfully. Session cookie acquired.');

  // 2. Fetch Marks and Examination Data
  console.log('\n[2/5] Fetching live database data from /api/student-marks and /api/examination...');
  const [marksRes, examRes] = await Promise.all([
    fetch(`${BASE_URL}/api/student-marks?limit=5000`, { headers: { Cookie: sessionCookie } }),
    fetch(`${BASE_URL}/api/examination`, { headers: { Cookie: sessionCookie } })
  ]);

  if (!marksRes.ok) throw new Error(`Failed to fetch student marks: HTTP ${marksRes.status}`);
  if (!examRes.ok) throw new Error(`Failed to fetch examination data: HTTP ${examRes.status}`);

  const marks = await marksRes.json();
  const examData = await examRes.json();

  console.log(`✔ Fetched ${marks.length} student mark records.`);
  console.log(`✔ Fetched ${examData.courses.length} courses, ${examData.programs.length} programs, ${examData.registrations.length} registrations.`);

  // Course map and marks grouping
  const courseMap = new Map();
  for (const c of examData.courses) {
    courseMap.set(c.id, c);
  }

  const makeRegKey = r => JSON.stringify([r.prn, r.cm_course_name, r.semester, r.paper_code, r.academic_year, r.exam_year]);
  const marksGrouped = new Map();
  for (const m of marks) {
    const k = makeRegKey(m);
    if (!marksGrouped.has(k)) marksGrouped.set(k, []);
    marksGrouped.get(k).push(m);
  }

  // 3. Verify each registration
  console.log('\n[3/5] Verifying 150 course registrations against engine rules & band tables...');
  
  const statusCounts = { PASS: 0, FAIL: 0, TNG: 0, ABSENT: 0, PENDING: 0, WITHHELD: 0 };
  const internalStatusCounts = { TG: 0, TNG: 0, PENDING: 0 };
  let regChecksPassed = 0;
  let regChecksFailed = 0;
  const regMismatches = [];

  for (const reg of examData.registrations) {
    statusCounts[reg.status] = (statusCounts[reg.status] || 0) + 1;
    internalStatusCounts[reg.internalStatus] = (internalStatusCounts[reg.internalStatus] || 0) + 1;

    const course = courseMap.get(reg.course_id);
    const scheme = course?.scheme;
    const regMarks = marksGrouped.get(makeRegKey(reg)) || [];

    // Compute via independent function
    const independent = independentCalculation(regMarks, scheme);
    // Compute via resultEngine calculateResult
    const engineResult = calculateResult(regMarks, scheme);

    const errors = [];

    // a. Internal Status Verification
    if (reg.internalStatus !== independent.internalStatus) {
      errors.push(`Internal Status mismatch: live='${reg.internalStatus}', independent='${independent.internalStatus}'`);
    }
    if (reg.internalStatus !== engineResult.internalStatus) {
      errors.push(`Internal Status engine mismatch: live='${reg.internalStatus}', engine='${engineResult.internalStatus}'`);
    }

    // b. Total marks and maximum computation verification
    if (Math.abs(reg.total - independent.total) > 0.001) {
      errors.push(`Total obtained marks mismatch: live=${reg.total}, independent=${independent.total}`);
    }
    if (Math.abs(reg.maximum - independent.maximum) > 0.001) {
      errors.push(`Maximum marks mismatch: live=${reg.maximum}, independent=${independent.maximum}`);
    }
    if (Math.abs(reg.internalTotal - independent.internalTotal) > 0.001) {
      errors.push(`Internal total mismatch: live=${reg.internalTotal}, independent=${independent.internalTotal}`);
    }
    if (Math.abs(reg.internalMaximum - independent.internalMaximum) > 0.001) {
      errors.push(`Internal maximum mismatch: live=${reg.internalMaximum}, independent=${independent.internalMaximum}`);
    }
    if (Math.abs(reg.internalRequired - independent.internalRequired) > 0.001) {
      errors.push(`Internal required marks mismatch: live=${reg.internalRequired}, independent=${independent.internalRequired}`);
    }
    if (Math.abs(reg.percentage - independent.percentage) > 0.001) {
      errors.push(`Percentage mismatch: live=${reg.percentage}, independent=${independent.percentage}`);
    }

    // c. Grade and Grade Point assignment matches band tables
    if (reg.grade !== independent.grade) {
      errors.push(`Grade mismatch: live='${reg.grade}', independent='${independent.grade}'`);
    }
    if (reg.gradePoint !== independent.gradePoint) {
      errors.push(`Grade point mismatch: live=${reg.gradePoint}, independent=${independent.gradePoint}`);
    }
    if (reg.status !== independent.status) {
      errors.push(`Status mismatch: live='${reg.status}', independent='${independent.status}'`);
    }
    if (reg.creditPoints !== independent.creditPoints) {
      errors.push(`Credit points mismatch: live=${reg.creditPoints}, independent=${independent.creditPoints}`);
    }
    if (reg.earnedCredits !== independent.earnedCredits) {
      errors.push(`Earned credits mismatch: live=${reg.earnedCredits}, independent=${independent.earnedCredits}`);
    }

    if (errors.length > 0) {
      regChecksFailed++;
      regMismatches.push({
        prn: reg.prn,
        student: reg.student_name,
        paper_code: reg.paper_code,
        course_name: reg.cm_course_name,
        errors
      });
    } else {
      regChecksPassed++;
    }
  }

  console.log(`✔ Registration checks completed: ${regChecksPassed} matched, ${regChecksFailed} mismatched.`);

  // 4. Verify SGPA Computation
  console.log('\n[4/5] Verifying SGPA calculations across student semester groups...');
  const studentGroups = new Map();
  for (const reg of examData.registrations) {
    const k = JSON.stringify([reg.prn, reg.cm_course_name, reg.semester, reg.academic_year, reg.exam_year]);
    if (!studentGroups.has(k)) studentGroups.set(k, []);
    studentGroups.get(k).push(reg);
  }

  let sgpaChecksPassed = 0;
  let sgpaChecksFailed = 0;
  let sgpaValidCount = 0;
  let sgpaWithheldCount = 0;
  const sgpaMismatches = [];

  for (const [groupKey, rows] of studentGroups) {
    const [prn, prog, sem, acadYear, examYear] = JSON.parse(groupKey);

    // Rule: if any course is PENDING, TNG, or WITHHELD -> SGPA is null (WITHHELD)
    const hasBlockingCourse = rows.some(r => ['PENDING', 'TNG', 'WITHHELD'].includes(r.status));
    const totalCredits = rows.reduce((s, r) => s + r.credits, 0);
    const totalCreditPoints = rows.reduce((s, r) => s + r.creditPoints, 0);

    const expectedSgpa = hasBlockingCourse ? null : (totalCredits > 0 ? totalCreditPoints / totalCredits : null);
    const engineSgpa = calculateSGPA(rows);

    const errors = [];
    if (expectedSgpa === null && engineSgpa !== null) {
      errors.push(`SGPA should be null/WITHHELD due to blocking course, but engine returned ${engineSgpa}`);
    } else if (expectedSgpa !== null && engineSgpa === null) {
      errors.push(`SGPA should be ${expectedSgpa}, but engine returned null`);
    } else if (expectedSgpa !== null && engineSgpa !== null) {
      if (Math.abs(expectedSgpa - engineSgpa) > 0.0001) {
        errors.push(`SGPA value mismatch: expected=${expectedSgpa}, engine=${engineSgpa}`);
      }
    }

    if (hasBlockingCourse) {
      sgpaWithheldCount++;
    } else {
      sgpaValidCount++;
    }

    if (errors.length > 0) {
      sgpaChecksFailed++;
      sgpaMismatches.push({ prn, prog, sem, errors });
    } else {
      sgpaChecksPassed++;
    }
  }

  console.log(`✔ SGPA checks completed: ${sgpaChecksPassed} groups verified (${sgpaValidCount} valid, ${sgpaWithheldCount} withheld/null). ${sgpaChecksFailed} mismatches.`);

  // 5. Verify against Workbook docs/Sample Templete.xlsx if present
  console.log('\n[5/5] Verifying against Excel template workbook (docs/Sample Templete.xlsx)...');
  let workbookResultsChecked = 0;
  let workbookResultsMatched = 0;
  let workbookSgpaChecked = 0;
  let workbookSgpaMatched = 0;
  const workbookMismatches = [];

  const workbookPath = path.resolve(__dirname, '..', 'docs', 'Sample Templete.xlsx');
  if (fs.existsSync(workbookPath)) {
    const XLSX = (await import('xlsx')).default;
    const wb = XLSX.readFile(workbookPath, { cellFormula: true });

    // Check cached formula errors in workbook
    let formulaErrors = 0;
    for (const [name, s] of Object.entries(wb.Sheets)) {
      for (const [addr, cell] of Object.entries(s)) {
        if (!addr.startsWith('!') && cell.t === 'e') {
          formulaErrors++;
          workbookMismatches.push(`Workbook formula error at ${name}!${addr}: ${cell.w || cell.v}`);
        }
      }
    }

    const resultsSheet = XLSX.utils.sheet_to_json(wb.Sheets.Results || {});
    const configsSheet = XLSX.utils.sheet_to_json(wb.Sheets.Course_Config || {});
    const marksSheet = XLSX.utils.sheet_to_json(wb.Sheets.Student_Marks || {});
    const sgpaSheet = XLSX.utils.sheet_to_json(wb.Sheets.SGPA || {});

    // Parse marks from Student_Marks sheet
    const marksFromWb = marksSheet.map(m => ({
      prn: String(m.PRN || ''),
      cm_course_name: String(m.CM_Course_Name || ''),
      semester: String(m.Semester || ''),
      paper_code: String(m.PaperCode || ''),
      academic_year: String(m.Academic_Year || ''),
      exam_year: String(m['Exam Year'] || m.Exam_Year || ''),
      assessment_type: String(m.Assessment_Type || ''),
      theory: m.Theory === 'AB' ? 'AB' : (m.Theory === null || m.Theory === undefined || m.Theory === '' ? null : Number(m.Theory)),
      practical: m.Practical === 'AB' ? 'AB' : (m.Practical === null || m.Practical === undefined || m.Practical === '' ? null : Number(m.Practical)),
      skills: m.Skills === 'AB' ? 'AB' : (m.Skills === null || m.Skills === undefined || m.Skills === '' ? null : Number(m.Skills))
    }));

    const computedOutcomes = [];

    for (const row of resultsSheet) {
      workbookResultsChecked++;
      const cfg = configsSheet.find(c => c.PaperCode === row.PaperCode && c.Programme_Name === row.Programme && c.Semester === row.Semester);
      if (!cfg) {
        workbookMismatches.push(`No Course_Config found for ${row.PaperCode} in ${row.Programme}`);
        continue;
      }

      const scheme = {
        category: cfg.Programme_Category,
        internalPass: Number(cfg.CA_Eligibility_Pct),
        overallPass: Number(cfg.Overall_Pass_Pct),
        integerMarks: cfg.Integer_Marks === 1,
        approved: cfg.Approved === 1,
        approvalReference: String(cfg.Approval_Reference || ''),
        credits: Number(cfg.Course_Credits),
        heads: {
          theory: {
            active: cfg.Theory_Applicable === 1,
            ca: [Number(cfg.CA1_Max_Theory), Number(cfg.CA2_Max_Theory), Number(cfg.CA3_Max_Theory)],
            ese: Number(cfg.ESE_Max_Theory),
            pass: Number(cfg.EST_Pass_Pct)
          },
          practical: {
            active: cfg.Practical_Applicable === 1,
            ca: [Number(cfg.CA1_Max_Practical), Number(cfg.CA2_Max_Practical), Number(cfg.CA3_Max_Practical)],
            ese: Number(cfg.ESE_Max_Practical),
            pass: Number(cfg.ESP_Pass_Pct)
          },
          skills: {
            active: cfg.Skills_Applicable === 1,
            ca: [Number(cfg.CA1_Max_Skills), Number(cfg.CA2_Max_Skills), Number(cfg.CA3_Max_Skills)],
            ese: Number(cfg.ESE_Max_Skills),
            pass: Number(cfg.ESS_Pass_Pct)
          }
        }
      };

      const rowMarks = marksFromWb.filter(m =>
        m.prn === String(row.PRN) &&
        m.paper_code === String(row.PaperCode) &&
        m.cm_course_name === String(row.Programme) &&
        m.semester === String(row.Semester) &&
        m.academic_year === String(row.Academic_Year) &&
        m.exam_year === String(row.Exam_Session)
      );

      const computed = calculateResult(rowMarks, scheme);

      const errs = [];
      if (row.Final_Status !== computed.status) errs.push(`Status: wb='${row.Final_Status}', app='${computed.status}'`);
      if (Number(row.Total_Obtained) !== computed.total) errs.push(`Total: wb=${row.Total_Obtained}, app=${computed.total}`);
      if (Number(row.Total_Max) !== computed.maximum) errs.push(`Max: wb=${row.Total_Max}, app=${computed.maximum}`);
      const expectedGrade = computed.status === 'TNG' || computed.status === 'PENDING' ? computed.status : computed.grade;
      if (row.Letter_Grade !== expectedGrade) errs.push(`Grade: wb='${row.Letter_Grade}', app='${expectedGrade}'`);
      if (Number(row.Grade_Point) !== computed.gradePoint) errs.push(`GP: wb=${row.Grade_Point}, app=${computed.gradePoint}`);
      if (Number(row.Credit_Points) !== computed.creditPoints) errs.push(`CP: wb=${row.Credit_Points}, app=${computed.creditPoints}`);

      if (errs.length === 0) {
        workbookResultsMatched++;
      } else {
        workbookMismatches.push({ prn: row.PRN, paper: row.PaperCode, errs });
      }

      computedOutcomes.push({ ...computed, credits: scheme.credits, prn: String(row.PRN) });
    }

    // Verify SGPA sheet in workbook
    for (const sg of sgpaSheet) {
      workbookSgpaChecked++;
      const studentOutcomes = computedOutcomes.filter(o => o.prn === String(sg.PRN));
      const appSgpa = calculateSGPA(studentOutcomes);
      const expectedWbSgpa = appSgpa === null ? 'WITHHELD' : appSgpa;

      if (sg.SGPA === expectedWbSgpa || Math.abs(Number(sg.SGPA) - Number(expectedWbSgpa)) < 0.001) {
        workbookSgpaMatched++;
      } else {
        workbookMismatches.push(`Workbook SGPA mismatch for PRN ${sg.PRN}: wb='${sg.SGPA}', app='${expectedWbSgpa}'`);
      }
    }

    console.log(`✔ Workbook formula errors: ${formulaErrors}`);
    console.log(`✔ Workbook course outcomes verified: ${workbookResultsMatched}/${workbookResultsChecked} matched.`);
    console.log(`✔ Workbook SGPA verified: ${workbookSgpaMatched}/${workbookSgpaChecked} matched.`);
  } else {
    console.log(`Notice: Workbook file ${workbookPath} not found.`);
  }

  // 6. Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION SUMMARY REPORT');
  console.log('='.repeat(80));
  console.log(`Total live registrations checked : ${examData.registrations.length}`);
  console.log(`Total live student marks checked  : ${marks.length}`);
  console.log(`Total student semester groups     : ${studentGroups.size}`);
  console.log('\n--- Live Registration Status Counts ---');
  console.log(`  PASS     : ${statusCounts.PASS}`);
  console.log(`  FAIL     : ${statusCounts.FAIL}`);
  console.log(`  TNG      : ${statusCounts.TNG}`);
  console.log(`  ABSENT   : ${statusCounts.ABSENT}`);
  console.log(`  PENDING  : ${statusCounts.PENDING}`);
  console.log(`  WITHHELD : ${statusCounts.WITHHELD}`);
  console.log('--- Internal Eligibility Status Counts ---');
  console.log(`  TG       : ${internalStatusCounts.TG}`);
  console.log(`  TNG      : ${internalStatusCounts.TNG}`);
  console.log(`  PENDING  : ${internalStatusCounts.PENDING}`);
  console.log('--- SGPA Evaluation Summary ---');
  console.log(`  Computed / Valid SGPA : ${sgpaValidCount}`);
  console.log(`  Withheld / Null SGPA  : ${sgpaWithheldCount} (due to TNG / PENDING courses)`);
  console.log('\n--- Match / Mismatch Summary ---');
  console.log(`  Live Registration Rules Check : ${regChecksPassed}/${examData.registrations.length} MATCHED (${regChecksFailed} mismatches)`);
  console.log(`  Live SGPA Calculation Check   : ${sgpaChecksPassed}/${studentGroups.size} MATCHED (${sgpaChecksFailed} mismatches)`);
  if (workbookResultsChecked > 0) {
    console.log(`  Workbook Course Outcomes Check: ${workbookResultsMatched}/${workbookResultsChecked} MATCHED (${workbookResultsChecked - workbookResultsMatched} mismatches)`);
    console.log(`  Workbook SGPA Check           : ${workbookSgpaMatched}/${workbookSgpaChecked} MATCHED (${workbookSgpaChecked - workbookSgpaMatched} mismatches)`);
  }
  console.log('='.repeat(80));

  if (regMismatches.length > 0 || sgpaMismatches.length > 0 || workbookMismatches.length > 0) {
    console.log('\n❌ MISMATCH DETAILS:');
    if (regMismatches.length > 0) {
      console.log('Registration Mismatches:', JSON.stringify(regMismatches, null, 2));
    }
    if (sgpaMismatches.length > 0) {
      console.log('SGPA Mismatches:', JSON.stringify(sgpaMismatches, null, 2));
    }
    if (workbookMismatches.length > 0) {
      console.log('Workbook Mismatches:', JSON.stringify(workbookMismatches, null, 2));
    }
    process.exitCode = 1;
  } else {
    console.log('\n✅ ALL VERIFICATION CHECKS PASSED PERFECTLY (100% MATCH).');
  }

  return {
    totalRegistrations: examData.registrations.length,
    statusCounts,
    internalStatusCounts,
    regChecksPassed,
    regChecksFailed,
    sgpaChecksPassed,
    sgpaChecksFailed,
    sgpaValidCount,
    sgpaWithheldCount,
    workbookResultsMatched,
    workbookResultsChecked,
    workbookSgpaMatched,
    workbookSgpaChecked,
    mismatchesCount: regMismatches.length + sgpaMismatches.length + workbookMismatches.length
  };
}

runVerification().catch(err => {
  console.error('\n❌ Verification Script Fatal Error:', err);
  process.exit(1);
});
