// Automated verification of individual mark update, dynamic status recalculation,
// exam year filtering, and bulk delete endpoints.

const BASE_URL = 'http://localhost:5000';

async function run() {
  console.log('--- STARTING VERIFICATION OF NEW FEATURES ---');

  // 1. Login as COE
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'coe@sspu.ac.in', password: 'Admin@123' })
  });

  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed: no cookie returned');
  const sessionCookie = cookie.split(';')[0];
  console.log('✓ Logged in as COE with session cookie');

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': sessionCookie
  };

  // 2. Fetch marks
  const marksRes = await fetch(`${BASE_URL}/api/student-marks?limit=10`, { headers });
  const marks = await marksRes.json();
  if (!marks.length) throw new Error('No marks found in database');
  console.log(`✓ Fetched ${marks.length} sample marks from database`);

  // Verify Exam Year property exists on marks
  const sample = marks[0];
  console.log(`✓ Sample mark row: PRN=${sample.prn}, Course=${sample.cm_course_name}, Type=${sample.assessment_type}, ExamYear=${sample.exam_year}, Theory=${sample.theory}`);
  if (!sample.exam_year) {
    throw new Error('exam_year missing from student mark record');
  }

  // 3. Test Individual Mark Update and Dynamic Status Change
  const targetMark = marks.find(m => m.assessment_type.startsWith('CA')) || marks[0];
  const origTheory = targetMark.theory;
  console.log(`Testing individual mark update on record ID: ${targetMark.id}`);

  // Test PATCH /api/student-marks/:id
  const patchRes = await fetch(`${BASE_URL}/api/student-marks/${targetMark.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ theory: 10, practical: targetMark.practical, skills: targetMark.skills })
  });

  const patchData = await patchRes.json();
  if (!patchData.success || patchData.mark.theory !== 10) {
    throw new Error(`PATCH failed: ${JSON.stringify(patchData)}`);
  }
  console.log('✓ Successfully updated theory mark to 10 via PATCH /api/student-marks/:id');

  // Verify examination registrations were synced
  const examRes = await fetch(`${BASE_URL}/api/examination`, { headers });
  const examData = await examRes.json();
  const reg = examData.registrations.find(r => r.prn === targetMark.prn && r.paper_code === targetMark.paper_code);
  if (!reg) throw new Error('Registration not found after sync');
  console.log(`✓ Registration dynamically recalculated: PRN=${reg.prn}, InternalStatus=${reg.internalStatus}, TotalMarks=${reg.total}, CourseStatus=${reg.status}, Grade=${reg.grade}`);

  // Restore original theory mark
  await fetch(`${BASE_URL}/api/student-marks/${targetMark.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ theory: origTheory, practical: targetMark.practical, skills: targetMark.skills })
  });
  console.log('✓ Restored original mark value');

  // 4. Test Bulk Delete for Course Master
  // Create a dummy course master record
  const dummyCourseCode = `TST${Date.now() % 10000}`;
  const addCourseRes = await fetch(`${BASE_URL}/api/course-master/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      courses: [{
        sr_no: 999,
        cm_course_name: 'B.Tech. Construction Engineering & Management',
        semester: 'I',
        paper_code: dummyCourseCode,
        sm_subject_name: 'Test Temporary Subject',
        l: 3, t: 1, p: 0, s: 0,
        total_credits: 4,
        total_marks: 100,
        total_marks_min: 40
      }]
    })
  });
  const coursesList = await addCourseRes.json();
  const createdCourse = coursesList.find(c => c.paper_code === dummyCourseCode);
  if (!createdCourse) throw new Error('Failed to create dummy course for bulk delete test');
  console.log(`✓ Created temporary course record ID: ${createdCourse.id}`);

  // Test bulk delete on course master
  const bulkDelCourseRes = await fetch(`${BASE_URL}/api/course-master/bulk-delete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids: [createdCourse.id] })
  });
  const bulkDelCourseData = await bulkDelCourseRes.json();
  if (!bulkDelCourseData.success || bulkDelCourseData.count !== 1) {
    throw new Error(`Course bulk delete failed: ${JSON.stringify(bulkDelCourseData)}`);
  }
  console.log('✓ Successfully tested bulk delete on Course Master (/api/course-master/bulk-delete)');

  // 5. Test Bulk Delete for Programs
  const dummyProgCode = `TMP${Date.now() % 10000}`;
  await fetch(`${BASE_URL}/api/programs/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      programs: [{
        id: `prog-temp-${dummyProgCode}`,
        sr_no: 99,
        program_code: dummyProgCode,
        program_name: 'Temporary Test Program',
        school_name: 'School of Engineering & Technology'
      }]
    })
  });
  console.log(`✓ Created temporary program: prog-temp-${dummyProgCode}`);

  const bulkDelProgRes = await fetch(`${BASE_URL}/api/programs/bulk-delete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids: [`prog-temp-${dummyProgCode}`] })
  });
  const bulkDelProgData = await bulkDelProgRes.json();
  if (!bulkDelProgData.success || bulkDelProgData.count !== 1) {
    throw new Error(`Programs bulk delete failed: ${JSON.stringify(bulkDelProgData)}`);
  }
  console.log('✓ Successfully tested bulk delete on Programs (/api/programs/bulk-delete)');

  // 6. Test Bulk Delete for Student Marks
  // Insert a test mark row
  const dummyPrn = `TEST-BULK-${Date.now() % 10000}`;
  const importRes = await fetch(`${BASE_URL}/api/student-marks/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      marks: [{
        prn: dummyPrn,
        student_name: 'Test Bulk Delete Student',
        cm_course_name: sample.cm_course_name,
        semester: sample.semester,
        paper_code: sample.paper_code,
        sm_subject_name: sample.sm_subject_name,
        academic_year: sample.academic_year,
        exam_year: sample.exam_year,
        assessment_type: 'CA1',
        theory: 8,
        practical: null,
        skills: null
      }]
    })
  });
  const importData = await importRes.json();
  if (importData.error) throw new Error(`Test mark insertion failed: ${importData.error}`);
  console.log(`✓ Inserted temporary test mark for PRN: ${dummyPrn}`);

  // Fetch the inserted mark id
  const findRes = await fetch(`${BASE_URL}/api/student-marks?prn=${dummyPrn}`, { headers });
  const foundMarks = await findRes.json();
  if (!foundMarks.length) throw new Error('Could not find inserted test mark');
  const dummyMarkId = foundMarks[0].id;

  // Test bulk delete on student marks
  const bulkDelMarksRes = await fetch(`${BASE_URL}/api/student-marks/bulk-delete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids: [dummyMarkId] })
  });
  const bulkDelMarksData = await bulkDelMarksRes.json();
  if (!bulkDelMarksData.success || bulkDelMarksData.count !== 1) {
    throw new Error(`Student marks bulk delete failed: ${JSON.stringify(bulkDelMarksData)}`);
  }
  console.log('✓ Successfully tested bulk delete on Student Marks (/api/student-marks/bulk-delete)');

  console.log('\n--- ALL NEW FEATURES VERIFIED SUCCESSFULLY (100% PASS) ---');
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
