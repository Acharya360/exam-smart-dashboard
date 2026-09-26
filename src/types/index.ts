export type UserRole = 'COE' | 'DYCOE' | 'ACOE' | 'COORDINATOR';

export interface UserProfile {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  title: string;
  department?: string;
  phone?: string;
  created_at: string;
  last_password_change?: string;
  password_changed_by?: string;
}

export interface ExamScheduleFilter {
  search: string;
  school: string;
  program: string;
  examType: string;
  semester: string;
  session: string;
  startDate: string; // YYYY-MM-DD or DD/MM/YYYY
  endDate: string;
  minStudents?: number;
  maxStudents?: number;
  examYear?: string;
}

export interface TaskFilter {
  search: string;
  status: string;
  assigneeId: string;
  program: string;
  dueFilter: 'ALL' | 'OVERDUE' | 'TODAY' | 'NEXT_48H' | 'THIS_WEEK';
  startDate?: string;
  endDate?: string;
}

export interface Program {
  id: string;
  sr_no: number;
  program_code: string;
  program_name: string;
  school_name: string;
  primary_coordinator_id: string;
  alternate_coordinator_id: string;
}

export type ExamType = 'Regular' | 'Backlog' | 'Both';
export type SessionPeriod = 'AM' | 'PM';

export interface ExamSchedule {
  id: string;
  pkg_no: number;
  logic1: string;
  cm_school_name: string;
  cm_course_name: string;
  program_code: string;
  semester: number;
  elective?: string | null;
  paper_code: string;
  sm_subject_name: string;
  student_count: number;
  regular_count: number;
  backlog_count: number;
  exam_day: number;
  exam_date: string; // DD/MM/YYYY
  date_odd_even: string;
  am_pm: SessionPeriod;
  exam_time: string; // e.g. "10:30 am to 12:30 pm"
  exam_type: ExamType;
  exam_year?: string;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED_TO_ALTERNATE';

export interface ExamTask {
  id: string;
  schedule_id: string;
  program_code: string;
  task_title: string;
  status: TaskStatus;
  assigned_to: string; // User ID of primary coordinator
  alternate_user_id: string; // User ID of alternate coordinator
  notes: string;
  due_date: string;
  updated_at: string;
  escalated_at?: string;
  escalation_reason?: string;
}

export interface ProgramMappingRow {
  'Sr. No.'?: number | string;
  'Program Code'?: string;
  'Program Name'?: string;
  'School Name'?: string;
  'Primary Coordinator Email/Name'?: string;
  'Alternate Coordinator Email/Name'?: string;
  [key: string]: unknown;
}

export interface ExamScheduleRow {
  PKGNo?: number | string;
  Logic1?: string;
  CM_School_Name?: string;
  CM_Course_Name?: string;
  Semester?: number | string;
  Elective?: string;
  PaperCode?: string;
  SM_Subject_Name?: string;
  'Student Count'?: number | string;
  Regular?: number | string;
  Backlog?: number | string;
  'Exam Day'?: number | string;
  'Exam Date'?: string;
  Date_Odd_Even?: string;
  AM_PM?: string;
  'Exam Time'?: string;
  'Exam Type'?: string;
  ExamYear?: string;
  [key: string]: unknown;
}

// ============================================================================
// Course Master (LTPS & Marks Configuration)
// ============================================================================

export interface CourseMaster {
  id: string;
  sr_no: number;
  cm_course_name: string;
  semester: string;
  paper_code: string;
  sm_subject_name: string;
  l: number;
  t: number;
  p: number;
  s: number;
  total_credits: number;
  cat_max_marks: number;
  cat_min_marks: number;
  est_max_marks: number;
  est_min_marks: number;
  cap_max_marks: number;
  cap_min_marks: number;
  esp_max_marks: number;
  esp_min_marks: number;
  ia_max_marks: number;
  ia_min_marks: number;
  total_marks: number;
  total_marks_min: number;
  created_at?: string;
  updated_at?: string;
}

export interface CourseMasterRow {
  'Sr. No.'?: number | string;
  CM_Course_Name?: string;
  Semester?: number | string;
  PaperCode?: string;
  SM_Subject_Name?: string;
  L?: number | string;
  T?: number | string;
  P?: number | string;
  S?: number | string;
  'Total Credits'?: number | string;
  'CAT Max Marks'?: number | string;
  'CAT Min Marks'?: number | string;
  'EST Max Marks'?: number | string;
  'EST Min Marks'?: number | string;
  'CAP Max Marks'?: number | string;
  'CAP Min Marks'?: number | string;
  'ESP Max Marks'?: number | string;
  'ESP Min Marks'?: number | string;
  'IA Max Marks'?: number | string;
  'IA Min Marks'?: number | string;
  'Total Marks'?: number | string;
  'Total Marks Min'?: number | string;
  [key: string]: unknown;
}

// ============================================================================
// Student Marks (Subject-wise, Component-wise)
// ============================================================================

export interface StudentMark {
  id: string;
  prn: string;
  student_name: string;
  cm_course_name: string;
  semester: string;
  paper_code: string;
  sm_subject_name: string;
  academic_year: string;
  exam_year: string;
  assessment_type: string;
  theory: number;
  practical: number;
  skills: number;
  uploaded_by?: string;
  uploaded_at?: string;
  updated_at?: string;
}

export interface StudentMarkRow {
  PRN?: number | string;
  'Name of the Student'?: string;
  CM_Course_Name?: string;
  Semester?: number | string;
  PaperCode?: string;
  SM_Subject_Name?: string;
  Academic_Year?: string;
  'Exam Year'?: string;
  Assessment_Type?: string;
  Theory?: number | string;
  Practial?: number | string;  // Note: matches user's typo in template
  Practical?: number | string;
  Skills?: number | string;
  [key: string]: unknown;
}

// ============================================================================
// User Management (Create User Payload)
// ============================================================================

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department: string;
  phone: string;
  title: string;
}
