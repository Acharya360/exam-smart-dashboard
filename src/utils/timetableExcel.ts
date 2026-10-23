import * as XLSX from 'xlsx';
import { StudentRecord, ScheduleRow, SlotMaster, ElectiveGroup, TimetableClashInfo } from '../types';

export const STUDENT_TEMPLATE_HEADERS = [
  'CENTRE_GROUP_CODE',
  'CENTRE_NAME',
  'STUDENT_ID',
  'STU_NAME_AS_PER_TC',
  'BRANCH_STD_GROUP_DESCRIPTION',
  'Official Email ID',
  'Specialization',
  'ORG_SEMESTER_NAME',
  'UNIVERSITY_CODE',
  'SUBJECT_DESCRIPTION',
  'TYPE_SHORT_NAME',
  'Course Type',
  'INTERNAL_EXTERNAL',
  'APPLICATION_STATUS',
  'RECEIVABLE_AMOUNT',
  'TOTAL_PAID',
];

export const ELECTIVES_TEMPLATE_HEADERS = [
  'Group ID',
  'Group Name',
  'Course Code 1',
  'Course Code 2',
  'Course Code 3',
  'Course Code 4',
  'Course Code 5',
];

export function downloadStudentMasterTemplate() {
  const sampleRows = [
    STUDENT_TEMPLATE_HEADERS,
    [
      'SOE01',
      'School of Engineering',
      'PRN20260001',
      'Aarav Kumar',
      'B.Tech. Computer Science & AI',
      'aarav.k@university.edu',
      'Artificial Intelligence',
      'Semester 4',
      'CS401',
      'Operating Systems & Concurrency',
      'TH',
      'REGULAR',
      'EXTERNAL',
      'APPLIED',
      '0',
      '0',
    ],
    [
      'SOE01',
      'School of Engineering',
      'PRN20260002',
      'Diya Patel',
      'B.Tech. Computer Science & AI',
      'diya.p@university.edu',
      'Data Science',
      'Semester 4',
      'CS402',
      'Database Management Systems',
      'TH',
      'REGULAR',
      'EXTERNAL',
      'APPLIED',
      '0',
      '0',
    ],
    [
      'SOL01',
      'School of Law',
      'PRN20260003',
      'Rohan Sharma',
      'LL.M. Corporate Law',
      'rohan.s@university.edu',
      'Corporate Governance',
      'Semester 1',
      'LLM50130',
      'Advanced Corporate Law',
      'TH',
      'REGULAR',
      'EXTERNAL',
      'APPLIED',
      '0',
      '0',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student_Master_Template');
  XLSX.writeFile(wb, 'Timetable_Student_Master_Template.xlsx');
}

export function downloadElectivesTemplate() {
  const sampleRows = [
    ELECTIVES_TEMPLATE_HEADERS,
    ['EG01', 'Law Specialization Elective Group A', 'LLM50130', 'LLM50210', 'LLM50440', '', ''],
    ['EG02', 'CS Department Elective 1', 'CS4011', 'CS4012', 'CS4013', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Elective_Groups_Template');
  XLSX.writeFile(wb, 'Timetable_Electives_Template.xlsx');
}

export function parseStudentExcel(buffer: ArrayBuffer): StudentRecord[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheet];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

  return rawRows
    .map((row) => {
      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null) return String(row[k]).trim();
          const found = Object.keys(row).find(
            (rk) => rk.trim().toUpperCase() === k.toUpperCase()
          );
          if (found && row[found] !== undefined) return String(row[found]).trim();
        }
        return '';
      };

      const status = getVal('APPLICATION_STATUS', 'STATUS').toUpperCase();
      const isApplied =
        ['APPLIED', 'SUBMITTED', 'REGISTERED', 'YES', 'TRUE', '1', 'REGULAR', 'BACKLOG'].includes(
          status
        ) || !status;

      let ieVal: 'INTERNAL' | 'EXTERNAL' | 'BOTH' = 'EXTERNAL';
      const rawIe = getVal('INTERNAL_EXTERNAL', 'INT_EXT').toUpperCase();
      if (rawIe.includes('INT')) ieVal = 'INTERNAL';
      else if (rawIe.includes('BOTH')) ieVal = 'BOTH';

      return {
        centre: getVal('CENTRE_NAME', 'CENTRE', 'COLLEGE', 'SCHOOL') || 'Main Campus',
        program:
          getVal('BRANCH_STD_GROUP_DESCRIPTION', 'PROGRAM NAME', 'PROGRAM', 'DEGREE') ||
          'General',
        specialization: getVal('Specialization', 'SPECIALISATION', 'BRANCH'),
        semester: getVal('ORG_SEMESTER_NAME', 'SEMESTER', 'SEM') || '1',
        prn: getVal('STUDENT_ID', 'PRN', 'STUDENT ID', 'ROLL_NO', 'REG_NO'),
        studentName: getVal('STU_NAME_AS_PER_TC', 'STUDENT NAME', 'NAME') || 'Student',
        officialEmail: getVal('Official Email ID', 'EMAIL', 'STUDENT_EMAIL'),
        courseCode: getVal('UNIVERSITY_CODE', 'COURSE CODE', 'CODE', 'PAPER_CODE'),
        courseTitle: getVal('SUBJECT_DESCRIPTION', 'COURSE', 'SUBJECT', 'COURSE_NAME'),
        courseType: getVal('Course Type', 'COURSE_TYPE', 'TYPE') || 'REGULAR',
        internalExternal: ieVal,
        applicationStatus: status || 'APPLIED',
        isApplied,
      };
    })
    .filter((r) => r.courseCode && r.courseTitle);
}

export function exportTimetableWorkbook(
  scheduleRows: ScheduleRow[],
  slots: SlotMaster[],
  electives: ElectiveGroup[],
  clashes: TimetableClashInfo[] = []
) {
  const wb = XLSX.utils.book_new();

  // 1. Master Examination Timetable
  const courseSheetData = scheduleRows.map((r, idx) => ({
    'Sr No': idx + 1,
    'School / Centre': r.schoolName,
    'Programme': r.programName,
    'Specialization': r.specialization || '-',
    'Semester': r.semester,
    'Odd/Even': r.oddEven,
    'Course Code': r.courseCode,
    'Course Title': r.courseName,
    'Exam Date': r.date,
    'Day': r.day,
    'Slot': r.slotName,
    'Time': r.slotTime,
    'Applied Count': r.appliedStudents,
    'Backlog / Not Applied': r.notAppliedStudents,
    'Total Registered': r.totalStudents,
    'Manual Override': r.isManualOverride ? 'Yes' : 'No',
  }));
  const ws1 = XLSX.utils.json_to_sheet(courseSheetData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Master_Timetable');

  // 2. Date & Day Summary
  const dateMap = new Map<string, { date: string; day: string; courses: number; students: number }>();
  for (const r of scheduleRows) {
    if (!dateMap.has(r.date)) {
      dateMap.set(r.date, { date: r.date, day: r.day, courses: 0, students: 0 });
    }
    const entry = dateMap.get(r.date)!;
    entry.courses++;
    entry.students += r.totalStudents;
  }
  const dateSummaryData = Array.from(dateMap.values());
  const ws2 = XLSX.utils.json_to_sheet(dateSummaryData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Date_Wise_Summary');

  // 3. Slot Configuration Master
  const slotSheetData = slots.map((s) => ({
    'Semester': s.semester,
    'Odd/Even': s.oddEven,
    'Slot Name': s.slotName,
    'Timing': s.slotTime,
  }));
  const ws3 = XLSX.utils.json_to_sheet(slotSheetData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Slot_Master');

  // 4. Elective Bundles
  const elecSheetData = electives.map((e) => ({
    'Group Name': e.name,
    'Bundled Course Codes': e.courseCodes.join(', '),
    'Bundled Courses Count': e.courseCodes.length,
    'Generation Type': e.isFuzzy ? 'Auto / Fuzzy Clustered' : 'Configured',
  }));
  const ws4 = XLSX.utils.json_to_sheet(elecSheetData);
  XLSX.utils.book_append_sheet(wb, ws4, 'Elective_Groups');

  // 5. Clash Audit Log
  const clashSheetData =
    clashes.length > 0
      ? clashes.map((c) => ({
          'Student PRN': c.prn,
          'Student Name': c.studentName || '-',
          'Clash Date': c.date,
          'Clash Slot': c.slotName,
          'Conflicting Courses': c.courseCodes.join(' VS '),
          'Course Titles': c.courseTitles.join(' | '),
        }))
      : [{ 'Status': 'VERIFIED: 0 Clashes Detected across all registered students!' }];
  const ws5 = XLSX.utils.json_to_sheet(clashSheetData);
  XLSX.utils.book_append_sheet(wb, ws5, 'Clash_Audit_Report');

  const filename = `University_Timetable_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
