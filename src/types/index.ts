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
  [key: string]: unknown;
}
