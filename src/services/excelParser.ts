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

// Generate & trigger download of Faculty Allocation & Exam Duties template
export function downloadFacultyAllocationTemplate() {
  try {
    const link = document.createElement('a');
    link.href = '/api/faculty-allocations/template';
    link.download = 'Faculty_Allocation_Template.xlsx';
    link.click();
    return;
  } catch {
    // Fallback to client-side SheetJS generation
  }

  const sampleRows = [
    {
      'Subject_Code': 'APSC102',
      'Subject_Name': 'Applied Physics',
      'Staff_Code': 'T7386',
      'Staff_name': 'Dr. Rajesh Sharma',
      'Additional_Staff': 'Prof. Sarah Jenkins',
      'Section': 'A',
      'Sem': 'I',
      'Program': 'B.Tech. Construction Engineering & Management',
      'Department': 'School of Construction Engineering',
      'Workload': 4,
      'Exam_Role': 'Paper Setter & Evaluator',
      'Invigilation_Sessions': 2,
      'Exam_Center': 'Main Campus Examination Block'
    },
    {
      'Subject_Code': 'ARCH101',
      'Subject_Name': 'Architectural Design Studio I',
      'Staff_Code': 'T4102',
      'Staff_name': 'Prof. Amit Roy',
      'Additional_Staff': '',
      'Section': 'A',
      'Sem': 'I',
      'Program': 'B.Arch. Architecture & Planning',
      'Department': 'School of Architecture & Planning',
      'Workload': 6,
      'Exam_Role': 'Jury Lead & Practical Examiner',
      'Invigilation_Sessions': 1,
      'Exam_Center': 'Design Studio Block A'
    },
    {
      'Subject_Code': 'MATH101',
      'Subject_Name': 'Calculus & Linear Algebra',
      'Staff_Code': 'T5021',
      'Staff_name': 'Dr. Neha Gupta',
      'Additional_Staff': 'Prof. Vikram Malhotra',
      'Section': 'B',
      'Sem': 'I',
      'Program': 'B.Tech. Computer Science & AI',
      'Department': 'School of Computer Science & AI',
      'Workload': 4,
      'Exam_Role': 'Course Instructor & Invigilator',
      'Invigilation_Sessions': 3,
      'Exam_Center': 'Main Campus Examination Block'
    },
    {
      'Subject_Code': 'MECH201',
      'Subject_Name': 'Thermodynamics & Heat Transfer',
      'Staff_Code': 'T6118',
      'Staff_name': 'Dr. Anand Kumar',
      'Additional_Staff': '',
      'Section': 'A',
      'Sem': 'III',
      'Program': 'B.Tech. Mechatronics Engineering',
      'Department': 'School of Mechatronics Engineering',
      'Workload': 4,
      'Exam_Role': 'Chief Invigilator & Evaluator',
      'Invigilation_Sessions': 2,
      'Exam_Center': 'Engineering Block B - Hall 102'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 16 }, // Subject_Code
    { wch: 34 }, // Subject_Name
    { wch: 14 }, // Staff_Code
    { wch: 26 }, // Staff_name
    { wch: 26 }, // Additional_Staff
    { wch: 10 }, // Section
    { wch: 8 },  // Sem
    { wch: 45 }, // Program
    { wch: 35 }, // Department
    { wch: 12 }, // Workload
    { wch: 32 }, // Exam_Role
    { wch: 22 }, // Invigilation_Sessions
    { wch: 35 }  // Exam_Center
  ];

  const instructionsWs = XLSX.utils.json_to_sheet([
    {
      'Column Name': 'Subject_Code',
      'Mandatory?': 'Yes',
      'Description & Guidelines': 'Subject / Paper Code matching Course Master (e.g., APSC102, ARCH101).',
      'Sample Value': 'APSC102'
    },
    {
      'Column Name': 'Subject_Name',
      'Mandatory?': 'Yes',
      'Description & Guidelines': 'Descriptive course / subject title matching the academic syllabus.',
      'Sample Value': 'Applied Physics'
    },
    {
      'Column Name': 'Staff_Code',
      'Mandatory?': 'Yes',
      'Description & Guidelines': 'Unique Faculty Employee / Staff ID (e.g., T7386, T4102).',
      'Sample Value': 'T7386'
    },
    {
      'Column Name': 'Staff_name',
      'Mandatory?': 'Yes',
      'Description & Guidelines': 'Full faculty name with prefix/title (e.g., Dr. Rajesh Sharma).',
      'Sample Value': 'Dr. Rajesh Sharma'
    },
    {
      'Column Name': 'Additional_Staff',
      'Mandatory?': 'No',
      'Description & Guidelines': 'Secondary instructor, co-evaluator, or lab assistant if team-taught.',
      'Sample Value': 'Prof. Sarah Jenkins'
    },
    {
      'Column Name': 'Section',
      'Mandatory?': 'Yes',
      'Description & Guidelines': 'Class division / batch section (e.g., A, B, C, Batch 1). Defaults to A.',
      'Sample Value': 'A'
    },
    {
      'Column Name': 'Sem',
      'Mandatory?': 'Yes',
      'Description & Guidelines': 'Semester number or Roman numeral (e.g., 1, 2, I, II, III).',
      'Sample Value': 'I'
    },
    {
      'Column Name': 'Program',
      'Mandatory?': 'Yes',
      'Description & Guidelines': 'Full program name or degree code matching university registry.',
      'Sample Value': 'B.Tech. Construction Engineering & Management'
    },
    {
      'Column Name': 'Department',
      'Mandatory?': 'No',
      'Description & Guidelines': 'Academic department or school responsible for teaching.',
      'Sample Value': 'School of Construction Engineering'
    },
    {
      'Column Name': 'Workload',
      'Mandatory?': 'No',
      'Description & Guidelines': 'Teaching & practical hours assigned per week (default: 4).',
      'Sample Value': '4'
    },
    {
      'Column Name': 'Exam_Role',
      'Mandatory?': 'Yes',
      'Description & Guidelines': 'Primary examination duty: Course Instructor, Paper Setter, Chief Invigilator, Invigilator, Practical Examiner, Jury Lead.',
      'Sample Value': 'Paper Setter & Evaluator'
    },
    {
      'Column Name': 'Invigilation_Sessions',
      'Mandatory?': 'No',
      'Description & Guidelines': 'Number of assigned exam hall invigilation duty slots (default: 2).',
      'Sample Value': '2'
    },
    {
      'Column Name': 'Exam_Center',
      'Mandatory?': 'No',
      'Description & Guidelines': 'Exam venue / block location (default: Main Campus Examination Block).',
      'Sample Value': 'Main Campus Examination Block'
    }
  ]);

  instructionsWs['!cols'] = [
    { wch: 24 },
    { wch: 12 },
    { wch: 75 },
    { wch: 35 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Faculty_Allocations');
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
  XLSX.writeFile(wb, 'Faculty_Allocation_Template.xlsx');
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
      'Program Name': 'B.Tech. Construction Engineering & Management',
      'Semester': 'I',
      'Course Code': 'APSC102',
      'Course Name': 'Applied Physics',
      'L_Cr': 2,
      'T_Cr': 0,
      'P_Cr': 1,
      'S_Cr': 1,
      'Total Credits': 4,
      'Grading Category': 'Non-Architecture',
      'CAT1 Max Marks': 10,
      'CAT2 Max Marks': 10,
      'CAT3 Max Marks': 30,
      'CAP1 Max Marks': 10,
      'CAP2 Max Marks': 10,
      'CAP3 Max Marks': 20,
      'CAS1 Max Marks': 0,
      'CAS2 Max Marks': 0,
      'CAS3 Max Marks': 0,
      'EST Max Marks': 50,
      'ESP Max Marks': 40,
      'ESS Max Marks': 0,
      'Total Marks': 180,
    },
    {
      'Sr. No.': 2,
      'Program Name': 'B.Arch. Architecture & Planning',
      'Semester': 'I',
      'Course Code': 'ARCH101',
      'Course Name': 'Architectural Design Studio I',
      'L_Cr': 1,
      'T_Cr': 0,
      'P_Cr': 2,
      'S_Cr': 3,
      'Total Credits': 6,
      'Grading Category': 'Architecture',
      'CAT1 Max Marks': 15,
      'CAT2 Max Marks': 15,
      'CAT3 Max Marks': 20,
      'CAP1 Max Marks': 15,
      'CAP2 Max Marks': 15,
      'CAP3 Max Marks': 20,
      'CAS1 Max Marks': 10,
      'CAS2 Max Marks': 10,
      'CAS3 Max Marks': 30,
      'EST Max Marks': 50,
      'ESP Max Marks': 50,
      'ESS Max Marks': 50,
      'Total Marks': 300,
    },
    {
      'Sr. No.': 3,
      'Program Name': 'B.Tech. Computer Science & AI',
      'Semester': 'I',
      'Course Code': 'MATH101',
      'Course Name': 'Calculus & Linear Algebra',
      'L_Cr': 3,
      'T_Cr': 1,
      'P_Cr': 0,
      'S_Cr': 0,
      'Total Credits': 4,
      'Grading Category': 'Non-Architecture',
      'CAT1 Max Marks': 15,
      'CAT2 Max Marks': 15,
      'CAT3 Max Marks': 20,
      'CAP1 Max Marks': 0,
      'CAP2 Max Marks': 0,
      'CAP3 Max Marks': 0,
      'CAS1 Max Marks': 0,
      'CAS2 Max Marks': 0,
      'CAS3 Max Marks': 0,
      'EST Max Marks': 50,
      'ESP Max Marks': 0,
      'ESS Max Marks': 0,
      'Total Marks': 100,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 8 },  // Sr. No.
    { wch: 45 }, // Program Name
    { wch: 10 }, // Semester
    { wch: 14 }, // Course Code
    { wch: 32 }, // Course Name
    { wch: 8 },  // L_Cr
    { wch: 8 },  // T_Cr
    { wch: 8 },  // P_Cr
    { wch: 8 },  // S_Cr
    { wch: 12 }, // Total Credits
    { wch: 18 }, // Grading Category
    { wch: 14 }, // CAT1 Max Marks
    { wch: 14 }, // CAT2 Max Marks
    { wch: 14 }, // CAT3 Max Marks
    { wch: 14 }, // CAP1 Max Marks
    { wch: 14 }, // CAP2 Max Marks
    { wch: 14 }, // CAP3 Max Marks
    { wch: 14 }, // CAS1 Max Marks
    { wch: 14 }, // CAS2 Max Marks
    { wch: 14 }, // CAS3 Max Marks
    { wch: 14 }, // EST Max Marks
    { wch: 14 }, // ESP Max Marks
    { wch: 14 }, // ESS Max Marks
    { wch: 12 }, // Total Marks
  ];

  const instructionsWs = XLSX.utils.json_to_sheet([
    {
      'Field / Column': 'Program Name',
      'Requirement': 'Mandatory. Degree / Programme Name.',
      'Rule / Behavior': 'Full degree name (e.g. B.Tech. Construction Engineering & Management).'
    },
    {
      'Field / Column': 'Course Code & Course Name',
      'Requirement': 'Mandatory. Subject Paper Code and Title.',
      'Rule / Behavior': 'Unique subject code (e.g. APSC102) and descriptive course title.'
    },
    {
      'Field / Column': 'L_Cr, T_Cr, P_Cr, S_Cr, Total Credits',
      'Requirement': 'Mandatory. Credit structure.',
      'Rule / Behavior': 'Lecture, Tutorial, Practical, and Skill credits. Total Credits = L_Cr + T_Cr + P_Cr + S_Cr.'
    },
    {
      'Field / Column': 'Grading Category',
      'Requirement': 'Mandatory. Select either "Architecture" or "Non-Architecture" from dropdown.',
      'Rule / Behavior': 'Determines 10-point letter grading bands (Architecture passes at 45%, Non-Architecture passes at 40%).'
    },
    {
      'Field / Column': 'CAT1, CAT2, CAT3',
      'Requirement': 'Theory Continuous Assessments. Enter Max marks (or 0 if not applicable).',
      'Rule / Behavior': 'Min passing marks are auto-calculated at 40% (Non-Architecture) or 45% (Architecture).'
    },
    {
      'Field / Column': 'CAP1, CAP2, CAP3',
      'Requirement': 'Practical Continuous Assessments. Enter Max marks (or 0 if not applicable).',
      'Rule / Behavior': 'Min passing marks are auto-calculated at 40% (Non-Architecture) or 45% (Architecture).'
    },
    {
      'Field / Column': 'CAS1, CAS2, CAS3',
      'Requirement': 'Skills Continuous Assessments. Enter Max marks (or 0 if not applicable).',
      'Rule / Behavior': 'Min passing marks are auto-calculated at 40% (Non-Architecture) or 45% (Architecture).'
    },
    {
      'Field / Column': 'EST, ESP, ESS',
      'Requirement': 'End-Semester Exam Max marks for Theory (EST), Practical (ESP), and Skills (ESS).',
      'Rule / Behavior': 'Min passing marks are auto-calculated at 40% (Non-Architecture) or 45% (Architecture). ESE entry is blocked if internal eligibility (TG) is not met.'
    },
    {
      'Field / Column': 'Total Marks',
      'Requirement': 'Overall course maximum marks sum (CAT1..3 + CAP1..3 + CAS1..3 + EST + ESP + ESS).',
      'Rule / Behavior': 'Auto-calculated if blank or validated against sum of individual heads.'
    }
  ]);
  instructionsWs['!cols'] = [
    { wch: 32 },
    { wch: 50 },
    { wch: 65 },
  ];

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

      // Disambiguate Program Name vs Course Name (Subject Title)
      let courseName = '';
      let subjectName = '';

      if (rowObj['programname']) {
        courseName = String(rowObj['programname']).trim();
        subjectName = String(rowObj['coursename'] || rowObj['smsubjectname'] || rowObj['subjectname'] || '').trim();
      } else if (rowObj['cmcoursename']) {
        courseName = String(rowObj['cmcoursename']).trim();
        subjectName = String(rowObj['smsubjectname'] || rowObj['coursename'] || rowObj['subjectname'] || '').trim();
      } else {
        courseName = String(rowObj['program'] || rowObj['coursename'] || '').trim();
        subjectName = String(rowObj['smsubjectname'] || rowObj['subjectname'] || '').trim();
      }

      const semester = String(rowObj['semester'] || rowObj['sem'] || '').trim();
      const paperCode = String(
        rowObj['coursecode'] ||
        rowObj['papercode'] ||
        rowObj['subjectcode'] ||
        rowObj['code'] ||
        ''
      ).trim();

      if (!courseName || !semester || !paperCode || !subjectName) {
        errors.push(`Row ${rowNum}: Missing mandatory fields (Program Name, Semester, Course Code, Course Name).`);
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

      // Automated minimum passing threshold based on Grading Category:
      // Architecture = 45%, Non-Architecture = 40%
      const passRate = category === 'Architecture' ? 0.45 : 0.40;

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

      // Helper to compute min marks automatically when omitted in the new template
      const calcMin = (maxVal: number, minKeys: string[]) => {
        const explicit = readNum(minKeys, -1);
        if (explicit >= 0) return explicit;
        return maxVal > 0 ? Math.round(maxVal * passRate) : 0;
      };

      const l = readNum(['lcr', 'l_cr', 'l', 'lecture'], 0);
      const t = readNum(['tcr', 't_cr', 't', 'tutorial'], 0);
      const p = readNum(['pcr', 'p_cr', 'p', 'practical'], 0);
      const s = readNum(['scr', 's_cr', 's', 'skill'], 0);
      const totalCredits = readNum(['totalcredits', 'credits'], l + t + p + s);

      if (l < 0 || t < 0 || p < 0 || s < 0 || totalCredits < 0) {
        errors.push(`Row ${rowNum}: L-T-P-S and credits must be non-negative.`);
        return;
      }

      // Theory continuous assessments
      let cat1_max = readNum(['cat1maxmarks', 'cat1max', 'cat1'], 0);
      let cat1_min = calcMin(cat1_max, ['cat1minmarks', 'cat1min']);
      let cat2_max = readNum(['cat2maxmarks', 'cat2max', 'cat2'], 0);
      let cat2_min = calcMin(cat2_max, ['cat2minmarks', 'cat2min']);
      let cat3_max = readNum(['cat3maxmarks', 'cat3max', 'cat3'], 0);
      let cat3_min = calcMin(cat3_max, ['cat3minmarks', 'cat3min']);

      // Legacy fallback for CAT if single CAT was provided
      const legacyCatMax = readNum(['catmaxmarks', 'catmax'], 0);
      const legacyCatMin = readNum(['catminmarks', 'catmin'], -1);
      if (cat1_max === 0 && cat2_max === 0 && cat3_max === 0 && legacyCatMax > 0) {
        cat1_max = Math.round(legacyCatMax * 0.25);
        cat2_max = Math.round(legacyCatMax * 0.25);
        cat3_max = legacyCatMax - cat1_max - cat2_max;
        cat1_min = legacyCatMin >= 0 ? Math.round(legacyCatMin * 0.25) : Math.round(cat1_max * passRate);
        cat2_min = legacyCatMin >= 0 ? Math.round(legacyCatMin * 0.25) : Math.round(cat2_max * passRate);
        cat3_min = legacyCatMin >= 0 ? legacyCatMin - cat1_min - cat2_min : Math.round(cat3_max * passRate);
      }

      // Practical continuous assessments
      let cap1_max = readNum(['cap1maxmarks', 'cap1max', 'cap1'], 0);
      let cap1_min = calcMin(cap1_max, ['cap1minmarks', 'cap1min']);
      let cap2_max = readNum(['cap2maxmarks', 'cap2max', 'cap2'], 0);
      let cap2_min = calcMin(cap2_max, ['cap2minmarks', 'cap2min']);
      let cap3_max = readNum(['cap3maxmarks', 'cap3max', 'cap3'], 0);
      let cap3_min = calcMin(cap3_max, ['cap3minmarks', 'cap3min']);

      // Legacy fallback for CAP
      const legacyCapMax = readNum(['capmaxmarks', 'capmax'], 0);
      const legacyCapMin = readNum(['capminmarks', 'capmin'], -1);
      if (cap1_max === 0 && cap2_max === 0 && cap3_max === 0 && legacyCapMax > 0) {
        cap1_max = Math.round(legacyCapMax * 0.25);
        cap2_max = Math.round(legacyCapMax * 0.25);
        cap3_max = legacyCapMax - cap1_max - cap2_max;
        cap1_min = legacyCapMin >= 0 ? Math.round(legacyCapMin * 0.25) : Math.round(cap1_max * passRate);
        cap2_min = legacyCapMin >= 0 ? Math.round(legacyCapMin * 0.25) : Math.round(cap2_max * passRate);
        cap3_min = legacyCapMin >= 0 ? legacyCapMin - cap1_min - cap2_min : Math.round(cap3_max * passRate);
      }

      // Skills continuous assessments
      const cas1_max = readNum(['cas1maxmarks', 'cas1max', 'cas1'], 0);
      const cas1_min = calcMin(cas1_max, ['cas1minmarks', 'cas1min']);
      const cas2_max = readNum(['cas2maxmarks', 'cas2max', 'cas2'], 0);
      const cas2_min = calcMin(cas2_max, ['cas2minmarks', 'cas2min']);
      const cas3_max = readNum(['cas3maxmarks', 'cas3max', 'cas3'], 0);
      const cas3_min = calcMin(cas3_max, ['cas3minmarks', 'cas3min']);

      // End-Semester Exam components (EST, ESP, ESS)
      const est_max = readNum(['estmaxmarks', 'estmax', 'est'], 0);
      const est_min = calcMin(est_max, ['estminmarks', 'estmin']);
      const esp_max = readNum(['espmaxmarks', 'espmax', 'esp'], 0);
      const esp_min = calcMin(esp_max, ['espminmarks', 'espmin']);
      const ess_max = readNum(['essmaxmarks', 'essmax', 'ess'], 0);
      const ess_min = calcMin(ess_max, ['essminmarks', 'essmin']);

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

      const ia_max_marks = cat_max_marks + cap_max_marks + cas_max_marks;
      const ia_min_marks = cat_min_marks + cap_min_marks + cas_min_marks;

      const calculatedTotal = ia_max_marks + est_max + esp_max + ess_max;
      const calculatedTotalMin = ia_min_marks + est_min + esp_min + ess_min;

      const total_marks = readNum(['totalmarks', 'totalmax', 'total'], calculatedTotal);
      const total_marks_min = readNum(['totalmarksmin', 'totalmin'], calculatedTotalMin);

      if (ia_min_marks > ia_max_marks) {
        errors.push(`Row ${rowNum}: IA Min Marks (${ia_min_marks}) cannot exceed IA Max Marks (${ia_max_marks}).`);
        return;
      }
      if (total_marks_min > total_marks) {
        errors.push(`Row ${rowNum}: Total Marks Min (${total_marks_min}) cannot exceed Total Marks (${total_marks}).`);
        return;
      }

      const passPercentage = Math.round(passRate * 100);

      const scheme: import('../types').AssessmentScheme = {
        category,
        credits: totalCredits,
        internalPass: passPercentage,
        overallPass: passPercentage,
        integerMarks: true,
        approved: true,
        approvalReference: 'University Board of Studies LTPS Scheme',
        heads: {
          theory: {
            active: theoryActive,
            ca: [cat1_max, cat2_max, cat3_max],
            ese: est_max,
            pass: passPercentage,
          },
          practical: {
            active: practicalActive,
            ca: [cap1_max, cap2_max, cap3_max],
            ese: esp_max,
            pass: passPercentage,
          },
          skills: {
            active: skillsActive,
            ca: [cas1_max, cas2_max, cas3_max],
            ese: ess_max,
            pass: passPercentage,
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


