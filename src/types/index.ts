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
  primary_coordinator_id: string | null;
  alternate_coordinator_id: string | null;
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
  academic_period?: string | null;
  term?: string | null;
  program_code?: string | null;
  cm_course_name: string;
  program_name?: string | null;
  regulation_group?: string | null;
  subject_type?: string | null;
  semester: string;
  paper_code: string;
  course_code?: string;
  sm_subject_name: string;
  course_name?: string;
  student_count?: number | null;
  l: number;
  t: number;
  p: number;
  s: number;
  total_credits: number;
  grading_category?: 'Architecture' | 'Non-Architecture';
  cat1_max?: number;
  cat1_min?: number;
  cat2_max?: number;
  cat2_min?: number;
  cat3_max?: number;
  cat3_min?: number;
  cap1_max?: number;
  cap1_min?: number;
  cap2_max?: number;
  cap2_min?: number;
  cap3_max?: number;
  cap3_min?: number;
  cas1_max?: number;
  cas1_min?: number;
  cas2_max?: number;
  cas2_min?: number;
  cas3_max?: number;
  cas3_min?: number;
  cat_max_marks: number;
  cat_min_marks: number;
  cap_max_marks: number;
  cap_min_marks: number;
  cas_max_marks?: number;
  cas_min_marks?: number;
  est_max_marks: number;
  est_min_marks: number;
  esp_max_marks: number;
  esp_min_marks: number;
  ess_max_marks?: number;
  ess_min_marks?: number;
  ia_max_marks: number;
  ia_min_marks: number;
  total_marks: number;
  total_marks_min: number;
  scheme?: AssessmentScheme | null;
  program_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CourseMasterRow {
  ID?: number | string;
  id?: number | string;
  'Sr. No.'?: number | string;
  'Sr.No.'?: number | string;
  SrNo?: number | string;
  AcademicPeriod?: string;
  'Academic Period'?: string;
  Term?: string;
  'Program Code'?: string;
  'Program Name'?: string;
  CM_Course_Name?: string;
  'Regulation Group'?: string;
  'Subject Type'?: string;
  Semester?: number | string;
  'Course Code'?: string;
  PaperCode?: string;
  'Course Name'?: string;
  SM_Subject_Name?: string;
  'Student Count'?: number | string;
  L_Cr?: number | string;
  T_Cr?: number | string;
  P_Cr?: number | string;
  S_Cr?: number | string;
  L?: number | string;
  T?: number | string;
  P?: number | string;
  S?: number | string;
  'Total Credits'?: number | string;
  'Grading Category'?: string;
  'CAT1 Max Marks'?: number | string;
  'CAT1 Min Marks'?: number | string;
  'CAT2 Max Marks'?: number | string;
  'CAT2 Min Marks'?: number | string;
  'CAT3 Max Marks'?: number | string;
  'CAT3 Min Marks'?: number | string;
  'CAP1 Max Marks'?: number | string;
  'CAP1 Min Marks'?: number | string;
  'CAP2 Max Marks'?: number | string;
  'CAP2 Min Marks'?: number | string;
  'CAP3 Max Marks'?: number | string;
  'CAP3 Min Marks'?: number | string;
  'CAS1 Max Marks'?: number | string;
  'CAS1 Min Marks'?: number | string;
  'CAS2 Max Marks'?: number | string;
  'CAS2 Min Marks'?: number | string;
  'CAS3 Max Marks'?: number | string;
  'CAS3 Min Marks'?: number | string;
  'CAT Max Marks'?: number | string;
  CAT?: number | string;
  'CAT Min Marks'?: number | string;
  'CAP Max Marks'?: number | string;
  CAP?: number | string;
  'CAP Min Marks'?: number | string;
  'CAS Max Marks'?: number | string;
  CAS?: number | string;
  'CAS Min Marks'?: number | string;
  'EST Max Marks'?: number | string;
  'EST Min Marks'?: number | string;
  'ESP Max Marks'?: number | string;
  'ESP Min Marks'?: number | string;
  'ESS Max Marks'?: number | string;
  'ESS Min Marks'?: number | string;
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
  theory: AssessmentMark;
  practical: AssessmentMark;
  skills: AssessmentMark;
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
// Student Results (Computed Final Results)
// ============================================================================

export interface StudentResult {
  id: string;
  prn: string;
  student_name: string;
  cm_course_name: string;
  semester: string;
  paper_code: string;
  sm_subject_name: string;
  academic_year: string;
  exam_year: string;
  total_theory: number;
  total_practical: number;
  total_skills: number;
  total_marks_obtained: number;
  total_marks_max: number;
  percentage: number;
  grade: string;
  grade_point: number;
  credits: number;
  result_status: 'PENDING' | 'PASS' | 'FAIL' | 'ABSENT' | 'WITHHELD';
  computed_at: string;
  computed_by?: string;
}

export interface StudentResultRow {
  PRN?: string;
  'Student Name'?: string;
  CM_Course_Name?: string;
  Semester?: string;
  PaperCode?: string;
  Subject_Name?: string;
  Academic_Year?: string;
  Exam_Year?: string;
  Theory?: number | string;
  Practical?: number | string;
  Skills?: number | string;
  'Total Obtained'?: number | string;
  'Total Max'?: number | string;
  Percentage?: number | string;
  Grade?: string;
  'Grade Point'?: number | string;
  Credits?: number | string;
  Status?: string;
  [key: string]: unknown;
}

// ============================================================================
// SGPA (Semester Grade Point Average)
// ============================================================================

export interface StudentSGPA {
  id: string;
  prn: string;
  student_name: string;
  cm_course_name: string;
  semester: string;
  academic_year: string;
  exam_year: string;
  total_credits: number;
  total_grade_points: number;
  sgpa: number;
  result_status: 'PENDING' | 'PASS' | 'FAIL' | 'ATKT';
  computed_at: string;
  computed_by?: string;
}

export interface StudentSGPARow {
  PRN?: string;
  'Student Name'?: string;
  CM_Course_Name?: string;
  Semester?: string;
  Academic_Year?: string;
  Exam_Year?: string;
  'Total Credits'?: number | string;
  'Total Grade Points'?: number | string;
  SGPA?: number | string;
  Status?: string;
  [key: string]: unknown;
}

// ============================================================================
// CGPA (Cumulative Grade Point Average)
// ============================================================================

export interface StudentCGPA {
  id: string;
  prn: string;
  student_name: string;
  cm_course_name: string;
  academic_year: string;
  total_credits: number;
  total_grade_points: number;
  cgpa: number;
  semesters_completed: number;
  computed_at: string;
  computed_by?: string;
}

export interface StudentCGPARow {
  PRN?: string;
  'Student Name'?: string;
  CM_Course_Name?: string;
  Academic_Year?: string;
  'Total Credits'?: number | string;
  'Total Grade Points'?: number | string;
  CGPA?: number | string;
  'Semesters Completed'?: number | string;
  [key: string]: unknown;
}

export type AssessmentHead = 'theory' | 'practical' | 'skills';
export type AssessmentMark = number | null | 'AB';
export type ComponentStatus = 'Pending' | 'Absent' | 'NA' | 'Evaluated';

export interface AssessmentComponentDetail {
  code: 'CAT1' | 'CAT2' | 'CAT3' | 'CAP1' | 'CAP2' | 'CAP3' | 'CAS1' | 'CAS2' | 'CAS3' | 'EST' | 'ESP' | 'ESS';
  name: string;
  head: AssessmentHead;
  applicable: boolean;
  max: number;
  obtained: number | null | 'AB';
  status: ComponentStatus;
  display: string;
}

export interface AssessmentComponentsMap {
  cat1: AssessmentComponentDetail;
  cat2: AssessmentComponentDetail;
  cat3: AssessmentComponentDetail;
  cap1: AssessmentComponentDetail;
  cap2: AssessmentComponentDetail;
  cap3: AssessmentComponentDetail;
  cas1: AssessmentComponentDetail;
  cas2: AssessmentComponentDetail;
  cas3: AssessmentComponentDetail;
  caTotal: number;
  caMax: number;
  caPercentage: number;
  caStatus: 'TG' | 'TNG' | 'PENDING';
  est: AssessmentComponentDetail;
  esp: AssessmentComponentDetail;
  ess: AssessmentComponentDetail;
  extTotal: number;
  extMax: number;
  grandTotal: number;
  grandMax: number;
  remark: 'P' | 'F' | 'Pending' | 'AB' | 'TNG';
}

export interface AssessmentScheme {
  category: 'Architecture' | 'Non-Architecture';
  internalPass: number;
  overallPass: number;
  integerMarks: boolean;
  approved: boolean;
  approvalReference: string;
  credits: number;
  heads: Record<AssessmentHead, { active: boolean; ca: [number, number, number]; ese: number; pass: number }>;
}
export interface AssessmentRecord {
  assessment_type: string;
  theory: AssessmentMark;
  practical: AssessmentMark;
  skills: AssessmentMark;
}
export interface CourseOutcome {
  status: 'PASS' | 'FAIL' | 'TNG' | 'ABSENT' | 'PENDING' | 'WITHHELD';
  internalStatus: 'TG' | 'TNG' | 'PENDING';
  total: number;
  maximum: number;
  percentage: number;
  internalTotal: number;
  internalMaximum: number;
  internalRequired: number;
  grade: string;
  gradePoint: number;
  creditPoints: number;
  earnedCredits: number;
  reasons: string[];
  components?: AssessmentComponentsMap;
}
export interface ExaminationCourse extends CourseMaster {
  program_id: string | null;
  scheme: AssessmentScheme | null;
}
export interface RegistrationResult extends CourseOutcome {
  id: number;
  prn: string;
  student_name: string;
  cm_course_name: string;
  semester: string;
  academic_year: string;
  exam_year: string;
  paper_code: string;
  course_id: string | null;
  program_id: string | null;
  credits: number;
  records: number;
  school_name?: string;
  sm_subject_name?: string;
  grading_category?: 'Architecture' | 'Non-Architecture';
}
export interface ExaminationData {
  programs: Program[];
  courses: ExaminationCourse[];
  registrations: RegistrationResult[];
  audit: { id: number; action: string; actor: string; created_at: string; detail: string }[];
}

// ============================================================================
// User Management (Create User Payload)
// ============================================================================

export interface CreateUserPayload {
  id?: string;
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department: string;
  phone: string;
  title: string;
}

// ============================================================================
// Timetable Generation Engine Types
// ============================================================================

export interface StudentRecord {
  id?: string;
  centre: string;
  program: string;
  specialization?: string;
  semester: string;
  prn: string;
  studentName: string;
  officialEmail?: string;
  courseCode: string;
  courseTitle: string;
  courseType?: string;
  internalExternal?: 'INTERNAL' | 'EXTERNAL' | 'BOTH';
  applicationStatus?: string;
  isApplied?: boolean;
  studentCount?: number;
}

export interface SlotMaster {
  id?: string;
  semester: string;
  slotName: string;
  slotTime: string;
  oddEven: 'Odd' | 'Even';
}

export interface ElectiveGroup {
  id: string;
  name: string;
  courseCodes: string[];
  isFuzzy?: boolean;
}

export interface ScheduleRow {
  schoolName: string;
  programName: string;
  specialization: string;
  semester: string;
  oddEven: 'Odd' | 'Even';
  slotName: string;
  slotTime: string;
  courseCode: string;
  courseName: string;
  date: string;
  day: string;
  appliedStudents: number;
  notAppliedStudents: number;
  totalStudents: number;
  isManualOverride?: boolean;
}

export interface ProgramStream {
  id: string;
  name: string;
  programsOrSchools: string[];
  startDateOdd?: string;
  startDateEven?: string;
  dayOffset: number;
  dayStep: number;
  preferredSlot?: string;
  appliesTo: 'Both' | 'Regular' | 'Backlog';
}

export interface ScheduleConfig {
  useCalendarDates: boolean;
  hasBreakDay: boolean;
  oddStartDate1: string;
  oddStartDate2: string;
  evenStartDate1: string;
  evenStartDate2: string;
  holidays: string[];
  examinationBasis: 'Both' | 'Odd' | 'Even';
  schedulingStrategy?: 'SEMESTER_BASED' | 'PROGRAM_STREAMS';
  programStreams?: ProgramStream[];
}

export interface ManualOverride {
  date: string;
  day: string;
  slotName: string;
  slotTime: string;
}

export interface TimetableSession {
  id: string;
  name: string;
  basis: 'Both' | 'Odd' | 'Even';
  odd_start_date_1?: string;
  odd_start_date_2?: string;
  even_start_date_1?: string;
  even_start_date_2?: string;
  holidays_json?: string;
  has_break_day: boolean;
  use_calendar_dates: boolean;
  is_active: boolean;
  scheduling_strategy?: 'SEMESTER_BASED' | 'PROGRAM_STREAMS';
  streams_json?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimetableClashInfo {
  prn: string;
  studentName?: string;
  date: string;
  slotName: string;
  courseCodes: string[];
  courseTitles: string[];
}

// ============================================================================
// Faculty Course Allocation (Teaching Staff against Course Master)
// ============================================================================

export interface FacultyCourseAllocation {
  id: string;
  course_master_id?: string | null;
  subject_code: string;
  subject_name: string;
  staff_code: string;
  staff_name: string;
  additional_staff?: string | null;
  section: string;
  semester: string;
  program_name: string;
  academic_year?: string;
  department?: string | null;
  workload_hours?: number;
  exam_role?: string;
  invigilation_sessions?: number;
  exam_center?: string | null;
  l?: number;
  t?: number;
  p?: number;
  s?: number;
  total_credits?: number;
  total_marks?: number;
  total_marks_min?: number;
  grading_category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PerformanceAnalyticsSummary {
  programs: Program[];
  courses: CourseMaster[];
  schedules: ExamSchedule[];
  faculty: FacultyCourseAllocation[];
  marksCount: number;
}


