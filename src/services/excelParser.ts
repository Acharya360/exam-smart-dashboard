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

export function downloadCourseMasterTemplate() {
  const ws = XLSX.utils.json_to_sheet([
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
      'CAT Max Marks': 50,
      'CAT Min Marks': 20,
      'EST Max Marks': 50,
      'EST Min Marks': 20,
      'CAP Max Marks': 40,
      'CAP Min Marks': 16,
      'ESP Max Marks': 40,
      'ESP Min Marks': 16,
      'IA Max Marks': 20,
      'IA Min Marks': 8,
      'Total Marks': 200,
      'Total Marks Min': 80
    }
  ]);
  
  // Auto-size columns
  const colWidths = [
    { wch: 8 }, { wch: 45 }, { wch: 10 }, { wch: 15 }, { wch: 30 },
    { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Course_Master');
  XLSX.writeFile(wb, 'Course_Master_Template.xlsx');
}

export function parseCourseMasterExcel(arrayBuffer: ArrayBuffer) {
  try {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const rawData = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

    const errors: string[] = [];
    const validCourses: any[] = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2; // +1 for 0-index, +1 for header
      
      const courseName = (row['CM_Course_Name'] || '').toString().trim();
      const semester = (row['Semester'] || '').toString().trim();
      const paperCode = (row['PaperCode'] || '').toString().trim();
      const subjectName = (row['SM_Subject_Name'] || '').toString().trim();

      if (!courseName || !semester || !paperCode || !subjectName) {
        errors.push(`Row ${rowNum}: Missing mandatory fields (Course Name, Semester, PaperCode, Subject Name).`);
        return;
      }

      validCourses.push({
        sr_no: parseInt(row['Sr. No.']) || 0,
        cm_course_name: courseName,
        semester: semester,
        paper_code: paperCode,
        sm_subject_name: subjectName,
        l: parseInt(row['L']) || 0,
        t: parseInt(row['T']) || 0,
        p: parseInt(row['P']) || 0,
        s: parseInt(row['S']) || 0,
        total_credits: parseInt(row['Total Credits']) || 0,
        cat_max_marks: parseInt(row['CAT Max Marks']) || 0,
        cat_min_marks: parseInt(row['CAT Min Marks']) || 0,
        est_max_marks: parseInt(row['EST Max Marks']) || 0,
        est_min_marks: parseInt(row['EST Min Marks']) || 0,
        cap_max_marks: parseInt(row['CAP Max Marks']) || 0,
        cap_min_marks: parseInt(row['CAP Min Marks']) || 0,
        esp_max_marks: parseInt(row['ESP Max Marks']) || 0,
        esp_min_marks: parseInt(row['ESP Min Marks']) || 0,
        ia_max_marks: parseInt(row['IA Max Marks']) || 0,
        ia_min_marks: parseInt(row['IA Min Marks']) || 0,
        total_marks: parseInt(row['Total Marks']) || 0,
        total_marks_min: parseInt(row['Total Marks Min']) || 0,
      });
    });

    return { success: true, data: validCourses, errors };
  } catch (error: any) {
    return { success: false, data: [], errors: ['Failed to parse Excel file: ' + error.message] };
  }
}

// ============================================================================
// STUDENT MARKS EXCEL
// ============================================================================

export function downloadStudentMarksTemplate() {
  const ws = XLSX.utils.json_to_sheet([
    {
      'ID': 1,
      'PRN': '123',
      'Name of the Student': 'Keshav',
      'CM_Course_Name': 'B.Tech. Construction Engineering & Management',
      'Semester': 'I',
      'PaperCode': 'APSC102',
      'SM_Subject_Name': 'Applied Physics',
      'Academic_Year': '2026-27',
      'Exam Year': 'Aug 2026',
      'Assessment_Type': 'CA1',
      'Theory': 3,
      'Practical': 2,
      'Skills': 4
    }
  ]);

  // Auto-size columns
  const colWidths = [
    { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 45 }, { wch: 10 },
    { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student_Marks');
  XLSX.writeFile(wb, 'Student_Marks_Template.xlsx');
}

export function parseStudentMarksExcel(arrayBuffer: ArrayBuffer) {
  try {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const rawData = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

    const errors: string[] = [];
    const validMarks: any[] = [];

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

      validMarks.push({
        prn: prn,
        student_name: studentName,
        cm_course_name: courseName,
        semester: semester,
        paper_code: paperCode,
        sm_subject_name: subjectName,
        academic_year: academicYear,
        exam_year: examYear,
        assessment_type: assessmentType,
        theory: parseInt(row['Theory']) || 0,
        practical: parseInt(practicalVal) || 0,
        skills: parseInt(row['Skills']) || 0,
      });
    });

    return { success: true, data: validMarks, errors };
  } catch (error: any) {
    return { success: false, data: [], errors: ['Failed to parse Excel file: ' + error.message] };
  }
}
