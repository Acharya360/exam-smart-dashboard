import * as XLSX from 'xlsx';
import type { CourseMaster } from '../types';
import { ExamSchedule, ExamScheduleRow, Program, ProgramMappingRow, UserProfile } from '../types';

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

// Clean and normalize keys for case-insensitive and whitespace-tolerant matching
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseProgramMasterExcel(
  fileData: ArrayBuffer,
  existingUsers: UserProfile[]
): ParseResult<{ program: Program; primaryUser?: UserProfile; alternateUser?: UserProfile }> {
  try {
    const workbook = XLSX.read(fileData, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, data: [], errors: ['No sheet found in uploaded Excel file.'], totalRows: 0, validRows: 0 };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<ProgramMappingRow>(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { success: false, data: [], errors: ['The uploaded sheet contains no data rows.'], totalRows: 0, validRows: 0 };
    }

    const errors: string[] = [];
    const validItems: { program: Program; primaryUser?: UserProfile; alternateUser?: UserProfile }[] = [];

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      // Match by normalized keys
      const rowObj: Record<string, string | number> = {};
      Object.entries(row).forEach(([k, v]) => {
        rowObj[normalizeKey(k)] = v as string | number;
      });

      const srNo = Number(rowObj['srno'] || rowObj['serialno'] || index + 1);
      const programCode = String(rowObj['programcode'] || rowObj['code'] || '').trim();
      const programName = String(rowObj['programname'] || rowObj['name'] || '').trim();
      const schoolName = String(rowObj['schoolname'] || rowObj['school'] || '').trim();
      const primaryCoord = String(rowObj['primarycoordinatoremailname'] || rowObj['primarycoordinator'] || '').trim();
      const alternateCoord = String(rowObj['alternatecoordinatoremailname'] || rowObj['alternatecoordinator'] || '').trim();

      if (!programCode || !programName) {
        errors.push(`Row ${rowNum}: Missing mandatory 'Program Code' or 'Program Name'.`);
        return;
      }

      // Match or resolve primary user
      let primaryUser = existingUsers.find(
        (u) =>
          u.email.toLowerCase() === primaryCoord.toLowerCase() ||
          u.full_name.toLowerCase().includes(primaryCoord.toLowerCase())
      );
      if (!primaryUser && primaryCoord) {
        primaryUser = {
          id: `coord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          email: primaryCoord.includes('@') ? primaryCoord : `${programCode.toLowerCase()}.coord@university.edu`,
          full_name: primaryCoord.replace(/@.+/, ''),
          role: 'COORDINATOR',
          title: 'Exam Coordinator',
          department: schoolName,
          created_at: new Date().toISOString(),
        };
      }

      // Match or resolve alternate user
      let alternateUser = existingUsers.find(
        (u) =>
          u.email.toLowerCase() === alternateCoord.toLowerCase() ||
          u.full_name.toLowerCase().includes(alternateCoord.toLowerCase())
      );
      if (!alternateUser && alternateCoord) {
        alternateUser = {
          id: `alt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          email: alternateCoord.includes('@') ? alternateCoord : `${programCode.toLowerCase()}.alt@university.edu`,
          full_name: alternateCoord.replace(/@.+/, ''),
          role: 'COORDINATOR',
          title: 'Alternate Exam Coordinator',
          department: schoolName,
          created_at: new Date().toISOString(),
        };
      }

      const program: Program = {
        id: `prog-${programCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        sr_no: isNaN(srNo) ? index + 1 : srNo,
        program_code: programCode,
        program_name: programName,
        school_name: schoolName || 'General Engineering Faculty',
        primary_coordinator_id: primaryUser?.id || 'user-coord-1',
        alternate_coordinator_id: alternateUser?.id || 'user-coord-3',
      };

      validItems.push({ program, primaryUser, alternateUser });
    });

    return {
      success: errors.length < rawRows.length,
      data: validItems,
      errors,
      totalRows: rawRows.length,
      validRows: validItems.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to parse Excel file';
    return { success: false, data: [], errors: [message], totalRows: 0, validRows: 0 };
  }
}

export function parseExamScheduleExcel(
  fileData: ArrayBuffer
): ParseResult<ExamSchedule> {
  try {
    const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, data: [], errors: ['No sheet found in uploaded Excel file.'], totalRows: 0, validRows: 0 };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<ExamScheduleRow>(sheet, { defval: '', raw: false });

    if (!rawRows || rawRows.length === 0) {
      return { success: false, data: [], errors: ['The uploaded sheet contains no data rows.'], totalRows: 0, validRows: 0 };
    }

    const errors: string[] = [];
    const schedules: ExamSchedule[] = [];

    rawRows.forEach((row, index) => {
      const rowNum = index + 2;
      const rowObj: Record<string, string | number> = {};
      Object.entries(row).forEach(([k, v]) => {
        rowObj[normalizeKey(k)] = v as string | number;
      });

      const pkgNo = Number(rowObj['pkgno'] || index + 1);
      const logic1 = String(rowObj['logic1'] || '').trim();
      const schoolName = String(rowObj['cmschoolname'] || rowObj['schoolname'] || '').trim();
      const courseName = String(rowObj['cmcoursename'] || rowObj['coursename'] || '').trim();
      const semester = Number(rowObj['semester'] || 1);
      const elective = String(rowObj['elective'] || '').trim();
      const paperCode = String(rowObj['papercode'] || rowObj['subjectcode'] || '').trim();
      const subjectName = String(rowObj['smsubjectname'] || rowObj['subjectname'] || '').trim();

      const studentCount = Number(rowObj['studentcount'] || 0);
      const regularCount = Number(rowObj['regular'] || 0);
      const backlogCount = Number(rowObj['backlog'] || 0);

      const examDay = Number(rowObj['examday'] || 1);
      let examDate = String(rowObj['examdate'] || '').trim();
      const dateOddEven = String(rowObj['dateoddeven'] || '').trim();
      const rawAmPm = String(rowObj['ampm'] || 'AM').toUpperCase().trim();
      const amPm: 'AM' | 'PM' = rawAmPm === 'PM' ? 'PM' : 'AM';
      const examTime = String(rowObj['examtime'] || (amPm === 'AM' ? '10:30 am to 12:30 pm' : '02:00 pm to 04:00 pm')).trim();
      
      const examYear = String(rowObj['examyear'] || '').trim();

      const rawType = String(rowObj['examtype'] || 'Regular').trim();
      let examType: 'Regular' | 'Backlog' | 'Both' = 'Regular';
      if (rawType.toLowerCase().includes('backlog') && rawType.toLowerCase().includes('reg')) {
        examType = 'Both';
      } else if (rawType.toLowerCase().includes('backlog')) {
        examType = 'Backlog';
      } else {
        examType = 'Regular';
      }

      if (!paperCode && !subjectName) {
        errors.push(`Row ${rowNum}: Missing PaperCode and Subject Name.`);
        return;
      }

      // Format exam date nicely
      if (examDate.includes('T')) {
        examDate = examDate.split('T')[0];
      }

      // Infer program code from course name
      const progCode = courseName
        ? courseName
            .replace(/B\.Tech\./i, 'BTECH')
            .replace(/[^A-Za-z0-9]/g, '-')
            .toUpperCase()
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
        : 'GEN-PROG';

      const schedule: ExamSchedule = {
        id: `sched-${pkgNo || index + 1}-${paperCode || 'PAP'}-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        pkg_no: pkgNo,
        logic1: logic1 || `${courseName}_${semester}_${paperCode}_${subjectName}`,
        cm_school_name: schoolName || 'General Engineering School',
        cm_course_name: courseName || 'Undergraduate Degree',
        program_code: progCode,
        semester: isNaN(semester) ? 1 : semester,
        elective: elective || undefined,
        paper_code: paperCode || `P-${index + 1}`,
        sm_subject_name: subjectName || 'Standard Paper',
        student_count: studentCount || (regularCount + backlogCount) || 1,
        regular_count: regularCount,
        backlog_count: backlogCount,
        exam_day: isNaN(examDay) ? 1 : examDay,
        exam_date: examDate || '14/05/2026',
        date_odd_even: dateOddEven || `${examDate || '14-05-2026'}_Odd`,
        am_pm: amPm,
        exam_time: examTime,
        exam_type: examType,
        exam_year: examYear || undefined,
      };

      schedules.push(schedule);
    });

    return {
      success: schedules.length > 0,
      data: schedules,
      errors,
      totalRows: rawRows.length,
      validRows: schedules.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to parse Exam Schedule Excel file';
    return { success: false, data: [], errors: [message], totalRows: 0, validRows: 0 };
  }
}

// Generate & trigger download of Program Master Mapping template
export function downloadProgramMappingTemplate() {
  const templateData = [
    {
      'Sr. No.': 1,
      'Program Code': 'BTECH-CEM',
      'Program Name': 'B.Tech. Construction Engineering & Management',
      'School Name': 'School of Construction Engineering and Infrastructure Management',
      'Primary Coordinator Email/Name': 'sarah.jenkins@university.edu',
      'Alternate Coordinator Email/Name': 'neha.gupta@university.edu',
    },
    {
      'Sr. No.': 2,
      'Program Code': 'BTECH-MECH',
      'Program Name': 'B.Tech. Mechatronics Engineering',
      'School Name': 'School of Mechatronics Engineering',
      'Primary Coordinator Email/Name': 'amit.roy@university.edu',
      'Alternate Coordinator Email/Name': 'sarah.jenkins@university.edu',
    },
    {
      'Sr. No.': 3,
      'Program Code': 'BTECH-CSAI',
      'Program Name': 'B.Tech. Computer Science & AI',
      'School Name': 'School of Computer Science & Artificial Intelligence',
      'Primary Coordinator Email/Name': 'neha.gupta@university.edu',
      'Alternate Coordinator Email/Name': 'amit.roy@university.edu',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Program_Mapping');
  XLSX.writeFile(wb, 'Program_Master_Coordinator_Mapping_Template.xlsx');
}

// Generate & trigger download of Exam Schedule template matching user's exact columns & image
export function downloadExamScheduleTemplate() {
  const templateData = [
    {
      PKGNo: 1,
      Logic1: 'B.Tech. Construction Engineering & Management_2_APSC102_Applied Physics',
      CM_School_Name: 'School of Construction Engineering and Infrastructure Management',
      CM_Course_Name: 'B.Tech. Construction Engineering & Management',
      Semester: 2,
      Elective: '',
      PaperCode: 'APSC102',
      SM_Subject_Name: 'Applied Physics',
      'Student Count': 2,
      Regular: 0,
      Backlog: 2,
      'Exam Day': 1,
      'Exam Date': '14/05/2026',
      Date_Odd_Even: '14-05-2026_Odd',
      AM_PM: 'AM',
      'Exam Time': '10:30 am to 12:30 pm',
      'Exam Type': 'Backlog',
    },
    {
      PKGNo: 2,
      Logic1: 'B.Tech. Construction Engineering & Management_2_APSC2102_Applied Physics',
      CM_School_Name: 'School of Construction Engineering and Infrastructure Management',
      CM_Course_Name: 'B.Tech. Construction Engineering & Management',
      Semester: 2,
      Elective: '',
      PaperCode: 'APSC2102',
      SM_Subject_Name: 'Applied Physics',
      'Student Count': 25,
      Regular: 25,
      Backlog: 0,
      'Exam Day': 1,
      'Exam Date': '14/05/2026',
      Date_Odd_Even: '14-05-2026_Odd',
      AM_PM: 'AM',
      'Exam Time': '10:30 am to 12:30 pm',
      'Exam Type': 'Regular',
    },
    {
      PKGNo: 3,
      Logic1: 'B.Tech. Mechatronics Engineering_2_APSC2103_Applied Chemistry',
      CM_School_Name: 'School of Mechatronics Engineering',
      CM_Course_Name: 'B.Tech. Mechatronics Engineering',
      Semester: 2,
      Elective: '',
      PaperCode: 'APSC2103',
      SM_Subject_Name: 'Applied Chemistry',
      'Student Count': 6,
      Regular: 0,
      Backlog: 6,
      'Exam Day': 1,
      'Exam Date': '14/05/2026',
      Date_Odd_Even: '14-05-2026_Odd',
      AM_PM: 'AM',
      'Exam Time': '10:30 am to 12:30 pm',
      'Exam Type': 'Backlog',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Exam_Schedule');
  XLSX.writeFile(wb, 'Exam_Schedule_Master_Template.xlsx');
}

// ============================================================================
// COURSE MASTER EXCEL (LTPS & Marks Configuration)
// ============================================================================

// ============================================================================
// COURSE MASTER EXCEL (LTPS & Marks Configuration)
// ============================================================================

export function downloadCourseMasterTemplate() {
  try {
    const link = document.createElement('a');
    link.href = '/api/course-master/template';
    link.download = 'Course_Master_LTPS_Template.xlsx';
    link.click();
    return;
  } catch {
    // Fallback to client-side SheetJS generation
  }

  const sampleRows = [
    {
      'Sr. No.': 1,
      'CM_Course_Name': 'B.Tech. Construction Engineering & Management',
      'Semester': 'I',
      'PaperCode': 'APSC102',
      'SM_Subject_Name': 'Applied Physics',
      'L': 2,
      'T': 0,
      'P': 1,
      'S': 1,
      'Total Credits': 4,
      'Grading Category': 'Non-Architecture',
      'CAT1 Max Marks': 10,
      'CAT1 Min Marks': 4,
      'CAT2 Max Marks': 10,
      'CAT2 Min Marks': 4,
      'CAT3 Max Marks': 30,
      'CAT3 Min Marks': 12,
      'CAP1 Max Marks': 10,
      'CAP1 Min Marks': 4,
      'CAP2 Max Marks': 10,
      'CAP2 Min Marks': 4,
      'CAP3 Max Marks': 20,
      'CAP3 Min Marks': 8,
      'CAS1 Max Marks': 0,
      'CAS1 Min Marks': 0,
      'CAS2 Max Marks': 0,
      'CAS2 Min Marks': 0,
      'CAS3 Max Marks': 0,
      'CAS3 Min Marks': 0,
      'EST Max Marks': 50,
      'EST Min Marks': 20,
      'ESP Max Marks': 40,
      'ESP Min Marks': 16,
      'ESS Max Marks': 0,
      'ESS Min Marks': 0,
      'IA Max Marks': 90,
      'IA Min Marks': 36,
      'Total Marks': 180,
      'Total Marks Min': 72,
    },
    {
      'Sr. No.': 2,
      'CM_Course_Name': 'B.Arch. Architecture & Planning',
      'Semester': 'I',
      'PaperCode': 'ARCH101',
      'SM_Subject_Name': 'Architectural Design Studio I',
      'L': 1,
      'T': 0,
      'P': 2,
      'S': 3,
      'Total Credits': 6,
      'Grading Category': 'Architecture',
      'CAT1 Max Marks': 15,
      'CAT1 Min Marks': 7,
      'CAT2 Max Marks': 15,
      'CAT2 Min Marks': 7,
      'CAT3 Max Marks': 20,
      'CAT3 Min Marks': 9,
      'CAP1 Max Marks': 15,
      'CAP1 Min Marks': 7,
      'CAP2 Max Marks': 15,
      'CAP2 Min Marks': 7,
      'CAP3 Max Marks': 20,
      'CAP3 Min Marks': 9,
      'CAS1 Max Marks': 10,
      'CAS1 Min Marks': 5,
      'CAS2 Max Marks': 10,
      'CAS2 Min Marks': 5,
      'CAS3 Max Marks': 30,
      'CAS3 Min Marks': 14,
      'EST Max Marks': 50,
      'EST Min Marks': 23,
      'ESP Max Marks': 50,
      'ESP Min Marks': 23,
      'ESS Max Marks': 50,
      'ESS Min Marks': 23,
      'IA Max Marks': 150,
      'IA Min Marks': 68,
      'Total Marks': 300,
      'Total Marks Min': 137,
    },
    {
      'Sr. No.': 3,
      'CM_Course_Name': 'B.Tech. Computer Science & AI',
      'Semester': 'I',
      'PaperCode': 'MATH101',
      'SM_Subject_Name': 'Calculus & Linear Algebra',
      'L': 3,
      'T': 1,
      'P': 0,
      'S': 0,
      'Total Credits': 4,
      'Grading Category': 'Non-Architecture',
      'CAT1 Max Marks': 15,
      'CAT1 Min Marks': 6,
      'CAT2 Max Marks': 15,
      'CAT2 Min Marks': 6,
      'CAT3 Max Marks': 20,
      'CAT3 Min Marks': 8,
      'CAP1 Max Marks': 0,
      'CAP1 Min Marks': 0,
      'CAP2 Max Marks': 0,
      'CAP2 Min Marks': 0,
      'CAP3 Max Marks': 0,
      'CAP3 Min Marks': 0,
      'CAS1 Max Marks': 0,
      'CAS1 Min Marks': 0,
      'CAS2 Max Marks': 0,
      'CAS2 Min Marks': 0,
      'CAS3 Max Marks': 0,
      'CAS3 Min Marks': 0,
      'EST Max Marks': 50,
      'EST Min Marks': 20,
      'ESP Max Marks': 0,
      'ESP Min Marks': 0,
      'ESS Max Marks': 0,
      'ESS Min Marks': 0,
      'IA Max Marks': 50,
      'IA Min Marks': 20,
      'Total Marks': 100,
      'Total Marks Min': 40,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const instructionsWs = XLSX.utils.json_to_sheet([
    {
      'Field / Column': 'Grading Category',
      'Requirement': 'Mandatory. Select either "Architecture" or "Non-Architecture".',
      'Rule / Behavior': 'Architecture requires at least 45% passing and Architecture letter grade bands. Non-Architecture passes at 40% (or 45%).'
    },
    {
      'Field / Column': 'CAT1, CAT2, CAT3',
      'Requirement': 'Continuous Assessment Theory. Enter Max & Min marks (or 0 if not applicable).',
      'Rule / Behavior': 'Min Marks cannot exceed Max Marks. Head is marked active if any component > 0.'
    },
    {
      'Field / Column': 'CAP1, CAP2, CAP3',
      'Requirement': 'Continuous Assessment Practical. Enter Max & Min marks (or 0 if not applicable).',
      'Rule / Behavior': 'Min Marks cannot exceed Max Marks. Head is marked active if any component > 0.'
    },
    {
      'Field / Column': 'CAS1, CAS2, CAS3',
      'Requirement': 'Continuous Assessment Skills. Enter Max & Min marks (or 0 if not applicable).',
      'Rule / Behavior': 'Min Marks cannot exceed Max Marks. Head is marked active if any component > 0.'
    },
    {
      'Field / Column': 'EST, ESP, ESS',
      'Requirement': 'End-Semester Exam Max & Min marks for Theory, Practical, and Skills.',
      'Rule / Behavior': 'Min marks define ESE passing cutoff. ESE entry is blocked if internal eligibility (TG) is not met.'
    },
    {
      'Field / Column': 'IA Max & Min Marks',
      'Requirement': 'Combined Internal Assessment totals (sum of all active CAT, CAP, CAS).',
      'Rule / Behavior': 'Auto-calculated if blank or verified during import.'
    },
    {
      'Field / Column': 'Total Marks & Min',
      'Requirement': 'Overall course maximum and passing threshold (IA + EST + ESP + ESS).',
      'Rule / Behavior': 'Auto-calculated if blank or verified during import.'
    }
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Course_Master');
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
  XLSX.writeFile(wb, 'Course_Master_LTPS_Template.xlsx');
}

export function parseCourseMasterExcel(arrayBuffer: ArrayBuffer): {
  success: boolean;
  data: Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>[];
  errors: string[];
  totalRows: number;
  validRows: number;
} {
  try {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const wsName = wb.SheetNames.includes('Course_Master')
      ? 'Course_Master'
      : wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    const errors: string[] = [];
    const validCourses: Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>[] = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      const rowObj: Record<string, string | number> = {};
      Object.entries(row).forEach(([k, v]) => {
        rowObj[normalizeKey(k)] = v as string | number;
      });

      const courseName = String(rowObj['cmcoursename'] || rowObj['coursename'] || '').trim();
      const semester = String(rowObj['semester'] || '').trim();
      const paperCode = String(rowObj['papercode'] || rowObj['subjectcode'] || '').trim();
      const subjectName = String(rowObj['smsubjectname'] || rowObj['subjectname'] || '').trim();

      if (!courseName || !semester || !paperCode || !subjectName) {
        errors.push(`Row ${rowNum}: Missing mandatory fields (Course Name, Semester, PaperCode, Subject Name).`);
        return;
      }

      // Grading Category validation
      const rawCategory = String(rowObj['gradingcategory'] || rowObj['category'] || 'Non-Architecture').trim();
      let category: 'Architecture' | 'Non-Architecture' = 'Non-Architecture';
      if (rawCategory.toLowerCase().includes('arch') && !rawCategory.toLowerCase().includes('non')) {
        category = 'Architecture';
      } else if (rawCategory.toLowerCase().includes('non') || rawCategory.toLowerCase().includes('eng') || rawCategory === '') {
        category = 'Non-Architecture';
      } else {
        errors.push(`Row ${rowNum}: Invalid Grading Category '${rawCategory}'. Must be 'Architecture' or 'Non-Architecture'.`);
        return;
      }

      const readNum = (keys: string[], def = 0): number => {
        for (const k of keys) {
          const v = rowObj[k];
          if (v !== undefined && v !== '' && v !== null) {
            const n = Number(v);
            if (Number.isFinite(n)) return n;
          }
        }
        return def;
      };

      const l = readNum(['l'], 0);
      const t = readNum(['t'], 0);
      const p = readNum(['p'], 0);
      const s = readNum(['s'], 0);
      const totalCredits = readNum(['totalcredits', 'credits'], l + t + p + s);

      if (l < 0 || t < 0 || p < 0 || s < 0 || totalCredits < 0) {
        errors.push(`Row ${rowNum}: L-T-P-S and credits must be non-negative.`);
        return;
      }

      // Theory components
      let cat1_max = readNum(['cat1maxmarks', 'cat1max'], 0);
      let cat1_min = readNum(['cat1minmarks', 'cat1min'], 0);
      let cat2_max = readNum(['cat2maxmarks', 'cat2max'], 0);
      let cat2_min = readNum(['cat2minmarks', 'cat2min'], 0);
      let cat3_max = readNum(['cat3maxmarks', 'cat3max'], 0);
      let cat3_min = readNum(['cat3minmarks', 'cat3min'], 0);

      // Legacy fallback for CAT
      const legacyCatMax = readNum(['catmaxmarks', 'catmax'], 0);
      const legacyCatMin = readNum(['catminmarks', 'catmin'], 0);
      if (cat1_max === 0 && cat2_max === 0 && cat3_max === 0 && legacyCatMax > 0) {
        cat1_max = Math.round(legacyCatMax * 0.25);
        cat2_max = Math.round(legacyCatMax * 0.25);
        cat3_max = legacyCatMax - cat1_max - cat2_max;
        cat1_min = Math.round(legacyCatMin * 0.25);
        cat2_min = Math.round(legacyCatMin * 0.25);
        cat3_min = legacyCatMin - cat1_min - cat2_min;
      }

      // Practical components
      let cap1_max = readNum(['cap1maxmarks', 'cap1max'], 0);
      let cap1_min = readNum(['cap1minmarks', 'cap1min'], 0);
      let cap2_max = readNum(['cap2maxmarks', 'cap2max'], 0);
      let cap2_min = readNum(['cap2minmarks', 'cap2min'], 0);
      let cap3_max = readNum(['cap3maxmarks', 'cap3max'], 0);
      let cap3_min = readNum(['cap3minmarks', 'cap3min'], 0);

      // Legacy fallback for CAP
      const legacyCapMax = readNum(['capmaxmarks', 'capmax'], 0);
      const legacyCapMin = readNum(['capminmarks', 'capmin'], 0);
      if (cap1_max === 0 && cap2_max === 0 && cap3_max === 0 && legacyCapMax > 0) {
        cap1_max = Math.round(legacyCapMax * 0.25);
        cap2_max = Math.round(legacyCapMax * 0.25);
        cap3_max = legacyCapMax - cap1_max - cap2_max;
        cap1_min = Math.round(legacyCapMin * 0.25);
        cap2_min = Math.round(legacyCapMin * 0.25);
        cap3_min = legacyCapMin - cap1_min - cap2_min;
      }

      // Skills components
      const cas1_max = readNum(['cas1maxmarks', 'cas1max'], 0);
      const cas1_min = readNum(['cas1minmarks', 'cas1min'], 0);
      const cas2_max = readNum(['cas2maxmarks', 'cas2max'], 0);
      const cas2_min = readNum(['cas2minmarks', 'cas2min'], 0);
      const cas3_max = readNum(['cas3maxmarks', 'cas3max'], 0);
      const cas3_min = readNum(['cas3minmarks', 'cas3min'], 0);

      // ESE components
      const est_max = readNum(['estmaxmarks', 'estmax'], 0);
      const est_min = readNum(['estminmarks', 'estmin'], 0);
      const esp_max = readNum(['espmaxmarks', 'espmax'], 0);
      const esp_min = readNum(['espminmarks', 'espmin'], 0);
      const ess_max = readNum(['essmaxmarks', 'essmax'], 0);
      const ess_min = readNum(['essminmarks', 'essmin'], 0);

      // Validate no negative marks
      const allMarks = [
        cat1_max, cat1_min, cat2_max, cat2_min, cat3_max, cat3_min,
        cap1_max, cap1_min, cap2_max, cap2_min, cap3_max, cap3_min,
        cas1_max, cas1_min, cas2_max, cas2_min, cas3_max, cas3_min,
        est_max, est_min, esp_max, esp_min, ess_max, ess_min,
      ];
      if (allMarks.some(m => m < 0)) {
        errors.push(`Row ${rowNum}: Assessment marks cannot be negative.`);
        return;
      }

      // Component-wise min <= max validation
      let minMaxFailed = false;
      const verifyMinMax = (name: string, max: number, min: number) => {
        if (min > max) {
          errors.push(`Row ${rowNum}: ${name} Min Marks (${min}) cannot exceed Max Marks (${max}).`);
          minMaxFailed = true;
        }
      };

      verifyMinMax('CAT1', cat1_max, cat1_min);
      verifyMinMax('CAT2', cat2_max, cat2_min);
      verifyMinMax('CAT3', cat3_max, cat3_min);
      verifyMinMax('CAP1', cap1_max, cap1_min);
      verifyMinMax('CAP2', cap2_max, cap2_min);
      verifyMinMax('CAP3', cap3_max, cap3_min);
      verifyMinMax('CAS1', cas1_max, cas1_min);
      verifyMinMax('CAS2', cas2_max, cas2_min);
      verifyMinMax('CAS3', cas3_max, cas3_min);
      verifyMinMax('EST', est_max, est_min);
      verifyMinMax('ESP', esp_max, esp_min);
      verifyMinMax('ESS', ess_max, ess_min);

      if (minMaxFailed) return;

      // Determine active assessment heads
      const theoryActive = (cat1_max + cat2_max + cat3_max + est_max) > 0;
      const practicalActive = (cap1_max + cap2_max + cap3_max + esp_max) > 0;
      const skillsActive = (cas1_max + cas2_max + cas3_max + ess_max) > 0;

      if (!theoryActive && !practicalActive && !skillsActive) {
        errors.push(`Row ${rowNum}: Course must have at least one applicable assessment head (Theory, Practical, or Skills with max > 0).`);
        return;
      }

      // Calculated totals
      const cat_max_marks = cat1_max + cat2_max + cat3_max;
      const cat_min_marks = cat1_min + cat2_min + cat3_min;
      const cap_max_marks = cap1_max + cap2_max + cap3_max;
      const cap_min_marks = cap1_min + cap2_min + cap3_min;
      const cas_max_marks = cas1_max + cas2_max + cas3_max;
      const cas_min_marks = cas1_min + cas2_min + cas3_min;

      const ia_max_marks = readNum(['iamaxmarks', 'iamax'], cat_max_marks + cap_max_marks + cas_max_marks);
      const ia_min_marks = readNum(['iaminmarks', 'iamin'], cat_min_marks + cap_min_marks + cas_min_marks);

      const total_marks = readNum(['totalmarks', 'totalmax'], ia_max_marks + est_max + esp_max + ess_max);
      const total_marks_min = readNum(['totalmarksmin', 'totalmin'], ia_min_marks + est_min + esp_min + ess_min);

      if (ia_min_marks > ia_max_marks) {
        errors.push(`Row ${rowNum}: IA Min Marks (${ia_min_marks}) cannot exceed IA Max Marks (${ia_max_marks}).`);
        return;
      }
      if (total_marks_min > total_marks) {
        errors.push(`Row ${rowNum}: Total Marks Min (${total_marks_min}) cannot exceed Total Marks (${total_marks}).`);
        return;
      }

      const internalPassPct = ia_max_marks > 0 && ia_min_marks > 0
        ? Math.round((ia_min_marks / ia_max_marks) * 100)
        : (category === 'Architecture' ? 45 : 40);

      const overallPassPct = total_marks > 0 && total_marks_min > 0
        ? Math.round((total_marks_min / total_marks) * 100)
        : (category === 'Architecture' ? 45 : 40);

      const scheme: import('../types').AssessmentScheme = {
        category,
        credits: totalCredits,
        internalPass: internalPassPct,
        overallPass: Math.max(overallPassPct, category === 'Architecture' ? 45 : 40),
        integerMarks: true,
        approved: true,
        approvalReference: 'University Board of Studies LTPS Scheme',
        heads: {
          theory: {
            active: theoryActive,
            ca: [cat1_max, cat2_max, cat3_max],
            ese: est_max,
            pass: est_max > 0 && est_min > 0 ? Math.round((est_min / est_max) * 100) : (category === 'Architecture' ? 45 : 40),
          },
          practical: {
            active: practicalActive,
            ca: [cap1_max, cap2_max, cap3_max],
            ese: esp_max,
            pass: esp_max > 0 && esp_min > 0 ? Math.round((esp_min / esp_max) * 100) : (category === 'Architecture' ? 45 : 40),
          },
          skills: {
            active: skillsActive,
            ca: [cas1_max, cas2_max, cas3_max],
            ese: ess_max,
            pass: ess_max > 0 && ess_min > 0 ? Math.round((ess_min / ess_max) * 100) : (category === 'Architecture' ? 45 : 40),
          },
        },
      };

      validCourses.push({
        sr_no: parseInt(String(rowObj['srno'] || rowObj['serialno'] || index + 1)) || (index + 1),
        cm_course_name: courseName,
        semester,
        paper_code: paperCode,
        sm_subject_name: subjectName,
        l,
        t,
        p,
        s,
        total_credits: totalCredits,
        grading_category: category,
        cat1_max,
        cat1_min,
        cat2_max,
        cat2_min,
        cat3_max,
        cat3_min,
        cap1_max,
        cap1_min,
        cap2_max,
        cap2_min,
        cap3_max,
        cap3_min,
        cas1_max,
        cas1_min,
        cas2_max,
        cas2_min,
        cas3_max,
        cas3_min,
        cat_max_marks,
        cat_min_marks,
        est_max_marks: est_max,
        est_min_marks: est_min,
        cap_max_marks,
        cap_min_marks,
        esp_max_marks: esp_max,
        esp_min_marks: esp_min,
        ess_max_marks: ess_max,
        ess_min_marks: ess_min,
        ia_max_marks,
        ia_min_marks,
        total_marks,
        total_marks_min,
        scheme,
      });
    });

    return {
      success: errors.length === 0,
      data: validCourses,
      errors,
      totalRows: rawData.length,
      validRows: validCourses.length,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to parse Excel file';
    return { success: false, data: [], errors: [message], totalRows: 0, validRows: 0 };
  }
}

// ============================================================================
// STUDENT MARKS EXCEL
// ============================================================================

export function downloadStudentMarksTemplate() {
  const link = document.createElement('a');
  link.href = '/api/examination/template';
  link.download = 'Examination_Marks_Template.xlsx';
  link.click();
}

export function parseStudentMarksExcel(arrayBuffer: ArrayBuffer) {
  try {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const wsName = wb.SheetNames.includes('Student_Marks') ? 'Student_Marks' : wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    const errors: string[] = [];
    const validMarks: import('../types').StudentMark[] = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2;
      
      const prn = (row['PRN'] || '').toString().trim();
      const studentName = (row['Name of the Student'] || '').toString().trim();
      const courseName = (row['CM_Course_Name'] || '').toString().trim();
      const semester = (row['Semester'] || '').toString().trim();
      const paperCode = (row['PaperCode'] || '').toString().trim();
      const subjectName = (row['SM_Subject_Name'] || '').toString().trim();
      const academicYear = (row['Academic_Year'] || '').toString().trim();
      const examYear = (row['Exam Year'] || '').toString().trim();
      const assessmentType = (row['Assessment_Type'] || '').toString().trim().toUpperCase();

      if (!prn || !courseName || !semester || !paperCode || !academicYear || !examYear || !assessmentType) {
        errors.push(`Row ${rowNum}: Missing mandatory fields for PRN ${prn || 'Unknown'}.`);
        return;
      }

      // Handle the typo in the template 'Practial' vs 'Practical'
      const practicalVal = row['Practical'] !== undefined && row['Practical'] !== '' ? row['Practical'] : row['Practial'];

      const readMark = (value: unknown): import('../types').AssessmentMark => {
        if (value === '' || value === null || value === undefined) return null;
        if (String(value).trim().toUpperCase() === 'AB') return 'AB';
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0) throw new Error('Marks must be blank, AB, or a non-negative number.');
        return number;
      };
      if (!['CA1', 'CA2', 'CA3', 'ESE'].includes(assessmentType)) { errors.push(`Row ${rowNum}: Invalid assessment type.`); return; }
      try {
      validMarks.push({
        id: '',
        prn: prn,
        student_name: studentName,
        cm_course_name: courseName,
        semester: semester,
        paper_code: paperCode,
        sm_subject_name: subjectName,
        academic_year: academicYear,
        exam_year: examYear,
        assessment_type: assessmentType,
        theory: readMark(row['Theory']),
        practical: readMark(practicalVal),
        skills: readMark(row['Skills']),
      });
      } catch (error) { errors.push('Row ' + rowNum + ': ' + (error instanceof Error ? error.message : 'Invalid marks')); }
    });

    return { success: errors.length === 0, data: validMarks, errors };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to parse Excel file';
    return { success: false, data: [], errors: [message] };
  }
}


