import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

async function main() {
  console.log('--- Starting LTPS Import & Course Master Verification ---');

  // 1. Login as COE
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coe@sspu.ac.in', password: 'Admin@123' })
  });
  if (!loginRes.ok) throw new Error('Login failed');
  const cookie = loginRes.headers.get('set-cookie');
  console.log('✓ Logged in as COE superadmin');

  // 2. Download template via API
  const templateRes = await fetch('http://localhost:5000/api/course-master/template', {
    headers: { cookie }
  });
  if (!templateRes.ok) throw new Error(`Template download failed: ${templateRes.status}`);
  const templateBuffer = await templateRes.arrayBuffer();
  const templateWb = XLSX.read(templateBuffer, { type: 'buffer' });
  console.log('✓ Downloaded template successfully. Sheets:', templateWb.SheetNames);
  if (!templateWb.SheetNames.includes('Course_Master')) throw new Error('Missing Course_Master sheet in template');
  
  const templateRows = XLSX.utils.sheet_to_json(templateWb.Sheets['Course_Master']);
  console.log('✓ Template sample row count:', templateRows.length);
  const sampleCols = Object.keys(templateRows[0]);
  console.log('✓ Template columns count:', sampleCols.length);
  
  const requiredCols = [
    'Grading Category',
    'CAT1 Max Marks', 'CAT1 Min Marks', 'CAT2 Max Marks', 'CAT2 Min Marks', 'CAT3 Max Marks', 'CAT3 Min Marks',
    'CAP1 Max Marks', 'CAP1 Min Marks', 'CAP2 Max Marks', 'CAP2 Min Marks', 'CAP3 Max Marks', 'CAP3 Min Marks',
    'CAS1 Max Marks', 'CAS1 Min Marks', 'CAS2 Max Marks', 'CAS2 Min Marks', 'CAS3 Max Marks', 'CAS3 Min Marks',
    'EST Max Marks', 'EST Min Marks', 'ESP Max Marks', 'ESP Min Marks', 'ESS Max Marks', 'ESS Min Marks',
    'IA Max Marks', 'IA Min Marks', 'Total Marks', 'Total Marks Min'
  ];
  for (const col of requiredCols) {
    if (!sampleCols.includes(col)) {
      throw new Error(`Template missing expected column: ${col}`);
    }
  }
  console.log('✓ All 29 newly introduced LTPS & assessment scheme columns verified in template!');

  // 3. Test Course Master Bulk Import with Architecture, Non-Architecture, and Inapplicable heads
  const testCourses = [
    {
      sr_no: 101,
      cm_course_name: 'B.Tech. Construction Engineering & Management',
      semester: 'I',
      paper_code: 'TEST-CEM101',
      sm_subject_name: 'Advanced Structural Engineering',
      l: 3,
      t: 1,
      p: 1,
      s: 0,
      total_credits: 5,
      grading_category: 'Non-Architecture',
      cat1_max: 10, cat1_min: 4,
      cat2_max: 10, cat2_min: 4,
      cat3_max: 30, cat3_min: 12,
      cap1_max: 10, cap1_min: 4,
      cap2_max: 10, cap2_min: 4,
      cap3_max: 20, cap3_min: 8,
      cas1_max: 0, cas1_min: 0,
      cas2_max: 0, cas2_min: 0,
      cas3_max: 0, cas3_min: 0,
      est_max_marks: 50, est_min_marks: 20,
      esp_max_marks: 40, esp_min_marks: 16,
      ess_max_marks: 0, ess_min_marks: 0,
      ia_max_marks: 90, ia_min_marks: 36,
      total_marks: 180, total_marks_min: 72
    },
    {
      sr_no: 102,
      cm_course_name: 'B.Arch. Architecture & Planning',
      semester: 'I',
      paper_code: 'TEST-ARCH101',
      sm_subject_name: 'Architectural Heritage & Design',
      l: 2,
      t: 0,
      p: 2,
      s: 2,
      total_credits: 6,
      grading_category: 'Architecture',
      cat1_max: 15, cat1_min: 7,
      cat2_max: 15, cat2_min: 7,
      cat3_max: 20, cat3_min: 9,
      cap1_max: 15, cap1_min: 7,
      cap2_max: 15, cap2_min: 7,
      cap3_max: 20, cap3_min: 9,
      cas1_max: 10, cas1_min: 5,
      cas2_max: 10, cas2_min: 5,
      cas3_max: 30, cas3_min: 14,
      est_max_marks: 50, est_min_marks: 23,
      esp_max_marks: 50, esp_min_marks: 23,
      ess_max_marks: 50, ess_min_marks: 23,
      ia_max_marks: 150, ia_min_marks: 68,
      total_marks: 300, total_marks_min: 137
    }
  ];

  const importRes = await fetch('http://localhost:5000/api/course-master/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ courses: testCourses })
  });
  if (!importRes.ok) {
    const err = await importRes.json();
    throw new Error(`Bulk import failed: ${JSON.stringify(err)}`);
  }
  const allCourses = await importRes.json();
  console.log(`✓ Bulk import succeeded. Total courses returned: ${allCourses.length}`);

  // 4. Verify test courses exist and have automated assessment scheme configured
  const cemCourse = allCourses.find(c => c.paper_code === 'TEST-CEM101');
  const archCourse = allCourses.find(c => c.paper_code === 'TEST-ARCH101');

  if (!cemCourse) throw new Error('TEST-CEM101 not found after import');
  if (!archCourse) throw new Error('TEST-ARCH101 not found after import');

  console.log('✓ Found imported courses in Course Master');
  console.log('  TEST-CEM101 category:', cemCourse.grading_category);
  console.log('  TEST-CEM101 scheme:', JSON.stringify(cemCourse.scheme?.category), 'Credits:', cemCourse.scheme?.credits);
  console.log('  TEST-ARCH101 category:', archCourse.grading_category);
  console.log('  TEST-ARCH101 scheme:', JSON.stringify(archCourse.scheme?.category), 'Credits:', archCourse.scheme?.credits);

  if (cemCourse.grading_category !== 'Non-Architecture') throw new Error('TEST-CEM101 category mismatch');
  if (archCourse.grading_category !== 'Architecture') throw new Error('TEST-ARCH101 category mismatch');
  if (!cemCourse.scheme || cemCourse.scheme.category !== 'Non-Architecture') throw new Error('TEST-CEM101 scheme not auto-generated');
  if (!archCourse.scheme || archCourse.scheme.category !== 'Architecture') throw new Error('TEST-ARCH101 scheme not auto-generated');

  // Verify heads applicability
  if (!cemCourse.scheme.heads.theory.active || !cemCourse.scheme.heads.practical.active || cemCourse.scheme.heads.skills.active) {
    throw new Error('TEST-CEM101 heads applicability mismatch: Theory and Practical should be active, Skills should be inactive');
  }
  if (!archCourse.scheme.heads.theory.active || !archCourse.scheme.heads.practical.active || !archCourse.scheme.heads.skills.active) {
    throw new Error('TEST-ARCH101 heads applicability mismatch: All 3 heads should be active');
  }
  console.log('✓ Assessment heads applicability correctly determined:');
  console.log('  TEST-CEM101: Theory=true, Practical=true, Skills=false');
  console.log('  TEST-ARCH101: Theory=true, Practical=true, Skills=true');

  // 5. Verify Examination Workspace data has these courses linked
  const examRes = await fetch('http://localhost:5000/api/examination', {
    headers: { cookie }
  });
  if (!examRes.ok) throw new Error('Failed to load examination data');
  const examData = await examRes.json();
  const examCem = examData.courses.find(c => c.paper_code === 'TEST-CEM101');
  if (!examCem || !examCem.scheme) throw new Error('Course not linked in examination workspace');
  console.log('✓ Examination workspace seamlessly loaded new course assessment scheme without manual setup!');

  // 6. Clean up test courses
  console.log('Cleaning up test courses...');
  const delRes = await fetch('http://localhost:5000/api/course-master/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ ids: [cemCourse.id, archCourse.id] })
  });
  if (!delRes.ok) throw new Error('Clean up failed');
  console.log('✓ Test courses cleaned up successfully.');

  console.log('\n======================================================');
  console.log('ALL TESTS PASSED: 100% SUCCESS');
  console.log('======================================================');
}

main().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
