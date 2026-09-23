import * as XLSX from 'xlsx';
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
