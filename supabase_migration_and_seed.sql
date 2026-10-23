-- ============================================================================
-- Acharya360 Exam Smart Dashboard (ExamTrack)
-- Supabase PostgreSQL Cloud Database Migration & Authoritative Seed Script
-- Compatible with Supabase Free Tier PostgreSQL 15+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. DROP EXISTING CONFLICTING OBJECTS (Safe idempotent setup)
DROP TABLE IF EXISTS public.timetable_manual_overrides CASCADE;
DROP TABLE IF EXISTS public.timetable_generated_schedules CASCADE;
DROP TABLE IF EXISTS public.timetable_student_records CASCADE;
DROP TABLE IF EXISTS public.timetable_electives CASCADE;
DROP TABLE IF EXISTS public.timetable_slots CASCADE;
DROP TABLE IF EXISTS public.timetable_sessions CASCADE;
DROP TABLE IF EXISTS public.faculty_course_allocations CASCADE;
DROP TABLE IF EXISTS public.exam_processing_audit CASCADE;
DROP TABLE IF EXISTS public.exam_registrations CASCADE;
DROP TABLE IF EXISTS public.exam_students CASCADE;
DROP TABLE IF EXISTS public.exam_course_settings CASCADE;
DROP TABLE IF EXISTS public.exam_environment CASCADE;
DROP TABLE IF EXISTS public.course_master CASCADE;
DROP TABLE IF EXISTS public.student_cgpa CASCADE;
DROP TABLE IF EXISTS public.student_sgpa CASCADE;
DROP TABLE IF EXISTS public.student_results CASCADE;
DROP TABLE IF EXISTS public.student_marks CASCADE;
DROP TABLE IF EXISTS public.exam_tasks CASCADE;
DROP TABLE IF EXISTS public.exam_schedules CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.user_role_enum CASCADE;
DROP TYPE IF EXISTS public.exam_session_enum CASCADE;
DROP TYPE IF EXISTS public.exam_type_enum CASCADE;
DROP TYPE IF EXISTS public.task_status_enum CASCADE;

-- 2. CREATE ENUMS
CREATE TYPE public.user_role_enum AS ENUM ('COE', 'DYCOE', 'ACOE', 'COORDINATOR');
CREATE TYPE public.exam_session_enum AS ENUM ('AM', 'PM');
CREATE TYPE public.exam_type_enum AS ENUM ('Regular', 'Backlog', 'Both');
CREATE TYPE public.task_status_enum AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED_TO_ALTERNATE');

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'Admin@123',
    full_name TEXT NOT NULL,
    role public.user_role_enum NOT NULL DEFAULT 'COORDINATOR',
    department TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    title TEXT DEFAULT 'Exam Coordinator',
    last_password_change TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 4. PROGRAMS TABLE
CREATE TABLE public.programs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sr_no INTEGER,
    program_code TEXT UNIQUE NOT NULL,
    program_name TEXT NOT NULL,
    school_name TEXT NOT NULL,
    primary_coordinator_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    alternate_coordinator_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_programs_code ON public.programs(program_code);
CREATE INDEX idx_programs_primary ON public.programs(primary_coordinator_id);
CREATE INDEX idx_programs_alternate ON public.programs(alternate_coordinator_id);

-- 5. EXAM SCHEDULES TABLE
CREATE TABLE public.exam_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pkg_no INTEGER NOT NULL,
    logic1 TEXT,
    cm_school_name TEXT NOT NULL,
    cm_course_name TEXT NOT NULL,
    program_code TEXT NOT NULL REFERENCES public.programs(program_code) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    elective TEXT,
    paper_code TEXT NOT NULL,
    sm_subject_name TEXT NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 0,
    regular_count INTEGER NOT NULL DEFAULT 0,
    backlog_count INTEGER NOT NULL DEFAULT 0,
    exam_day INTEGER NOT NULL DEFAULT 1,
    exam_date DATE NOT NULL,
    date_odd_even TEXT,
    am_pm public.exam_session_enum NOT NULL DEFAULT 'AM',
    exam_time TEXT NOT NULL,
    exam_type public.exam_type_enum NOT NULL DEFAULT 'Regular',
    exam_year TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exam_schedules_program ON public.exam_schedules(program_code);
CREATE INDEX idx_exam_schedules_date ON public.exam_schedules(exam_date);
CREATE INDEX idx_exam_schedules_paper ON public.exam_schedules(paper_code);

-- 6. EXAM TASKS TABLE
CREATE TABLE public.exam_tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    schedule_id TEXT NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
    program_code TEXT NOT NULL,
    task_title TEXT NOT NULL,
    status public.task_status_enum NOT NULL DEFAULT 'PENDING',
    assigned_to TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    alternate_user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    due_date DATE,
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exam_tasks_schedule ON public.exam_tasks(schedule_id);
CREATE INDEX idx_exam_tasks_assigned ON public.exam_tasks(assigned_to);
CREATE INDEX idx_exam_tasks_alternate ON public.exam_tasks(alternate_user_id);
CREATE INDEX idx_exam_tasks_status ON public.exam_tasks(status);

-- 7. COURSE MASTER TABLE
CREATE TABLE public.course_master (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sr_no INTEGER,
    cm_course_name TEXT NOT NULL,
    semester TEXT NOT NULL,
    paper_code TEXT NOT NULL,
    sm_subject_name TEXT NOT NULL,
    credits NUMERIC(4,2) DEFAULT 0,
    lecture_hours NUMERIC(4,2) DEFAULT 0,
    tutorial_hours NUMERIC(4,2) DEFAULT 0,
    practical_hours NUMERIC(4,2) DEFAULT 0,
    ia_max NUMERIC(5,2) DEFAULT 0,
    ese_max NUMERIC(5,2) DEFAULT 0,
    tw_max NUMERIC(5,2) DEFAULT 0,
    pr_max NUMERIC(5,2) DEFAULT 0,
    total_marks NUMERIC(5,2) DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_course_master_code ON public.course_master(paper_code);

-- 8. STUDENT MARKS TABLE
CREATE TABLE public.student_marks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    prn TEXT NOT NULL,
    student_name TEXT NOT NULL,
    cm_course_name TEXT NOT NULL,
    semester TEXT NOT NULL,
    paper_code TEXT NOT NULL,
    sm_subject_name TEXT NOT NULL,
    ia_marks NUMERIC(5,2) DEFAULT 0,
    ese_marks NUMERIC(5,2) DEFAULT 0,
    tw_marks NUMERIC(5,2) DEFAULT 0,
    pr_marks NUMERIC(5,2) DEFAULT 0,
    total_marks NUMERIC(5,2) DEFAULT 0,
    grade TEXT DEFAULT '',
    grade_points NUMERIC(4,2) DEFAULT 0,
    result_status TEXT DEFAULT 'PASS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_student_marks_prn ON public.student_marks(prn);
CREATE INDEX idx_student_marks_paper ON public.student_marks(paper_code);

-- 9. COURSE SETTINGS & AUDIT TABLES
CREATE TABLE public.exam_course_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    program_code TEXT,
    course_name TEXT,
    min_passing_pct NUMERIC(5,2) DEFAULT 40.0,
    grade_scale_type TEXT DEFAULT 'ABSOLUTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.exam_processing_audit (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action TEXT NOT NULL,
    actor TEXT,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SEED DATA MIGRATION FROM AUTHORITATIVE DATABASE (SSPU_Exam)
-- ============================================================================

-- 10. INSERT PROFILES
INSERT INTO public.profiles (id, email, password, full_name, role, department, title, created_at)
VALUES
  ('user-1792693422261', 'amit.vartikar@sspu.ac.in', 'scrypt$2689b5968a94ec856d26948df9ac8302$ea4fdbcc551422afff5c3560f0b2a5c36b04f0ec4e5a341f2e13301c1c745b42fab08d68eeb308612b2e12f4aeb6421bfa180a1a2d30fc71f229e008bf772bfa', 'Mr. Amit Vartikar', 'COORDINATOR', 'Examination Department', 'Exam Coordinator', '2026-10-22T23:53:42.3566667'),
  ('user-1792693422403', 'shreyasi.joshi@sspu.ac.in', 'scrypt$8f6992338bd06299eee315fa2bbe96b4$0c39b4f7fb803e99ea17b59e9c72f5689d45c2212c2e2a77e352ab1329927072bad43226662a67641ade49c952772ad4bd8f46b5ec14c3b2da25b681012cc4eb', 'Ms. Shreyasi Joshi', 'COORDINATOR', '	Examination Department', 'Exam Coordinator', '2026-10-22T23:53:42.4700000'),
  ('user-1792693422489', 'prathmesh.londhe@sspu.ac.in', 'scrypt$78e599bd46c8a95945a0fa1b087f5029$01d4546b1ebb760658f5931c341afa293d8c35cb068aab0e3c878cea131d3b942c2a53a531f47910672221bf4d52d0257ea53cd8268b57ba4611fc0e45b34a59', 'Mr. Prathmesh Londhe', 'COORDINATOR', 'Examination Department', 'Exam Coordinator', '2026-10-22T23:53:42.5633333'),
  ('user-1792693422591', 'rajkumar.wankhade@sspu.ac.in', 'scrypt$2d749a2803b5054578563f51c3926025$d7f60bf667aaa4e0ef8334667765696c01ab39991825913817f66215c06ae43f291f63e512df11caa90c11d69c2d177b692d389da0f8681a20c6cf4122650a9a', 'Mr. Rajkumar Wankhade', 'COORDINATOR', 'Examination Department', 'Exam Coordinator', '2026-10-22T23:53:42.6633333'),
  ('user-acoe-1', 'Acoe@sspu.ac.in', 'scrypt$4f094e7d4083922fa9cfca4c5297c5a7$d43c49955eecc993e72154a076f2198a6ca0178a0e25e4d5eba11fdc11b9f90994b3bb4fb872f91e4d89a73a079fcc0cfa57574e4a0024874dec31c3c2573938', 'Mr. Keshav B. Jankar', 'ACOE', 'Examination Department', 'Assistant Controller of Examinations', '2026-01-15T11:30:00'),
  ('user-coe-1', 'coe@sspu.ac.in', 'scrypt$0acde883ad118dd0e8c989bba47bb01b$828078187b2925f3efd1aa298aba86fb3fc38ac52715e70e0e1037a3f77cc4f5df0310ce9170a8a991bc30662b78b7b876ea877f23536fac9db96ec58d212177', 'Dr. Sunita Nikam', 'COE', 'Examination Department', 'Controller of Examinations', '2026-01-10T09:00:00'),
  ('user-coord-mvjwta5a-x5op', 'suresh.patil@sspu.ac.in', 'scrypt$5d81b754ceaabd41877418476082856e$92c85307eeca539f9a5f53262c244dadce964446c33227a589c15e4dd048ae0cbf85d00107648ea27364bd4e3032c0aac4779b1cdcfee085af8ffd5664f756ca', 'Dr. Suresh Patil', 'COORDINATOR', '', 'Exam Coordinator', '2026-10-23T00:33:54.4866667'),
  ('user-dycoe-1', 'DyCoe@sspu.ac.in', 'Admin@123', 'Dr. Kiran Shende', 'DYCOE', 'Examination Department', 'Deputy Controller of Examinations', '2026-01-12T10:00:00');

-- 11. INSERT ACADEMIC PROGRAMS
INSERT INTO public.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id, created_at)
VALUES
  ('prog-b-arch-', 26, 'B.ARCH.', 'B. Arch', 'School of Architecture, Urban Development & Planning', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:55.9400000'),
  ('prog-bba-dmm', 19, 'BBA-DMM', 'BBA (Digital Media Marketing)', 'School of Media Management', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55.6333333'),
  ('prog-bba-fintech', 18, 'BBA.FINTECH', 'BBA (Fintech)', 'School of Banking, Financial Services, and Insurance', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55.5700000'),
  ('prog-bba-l-scm', 20, 'BBA-L&SCM', 'BBA (Logistics and Supply Chain Management)', 'School of Ports, Terminal Management and Logistics', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55.6800000'),
  ('prog-bba-p-tm', 21, 'BBA-P&TM', 'BBA (Ports & Terminal Management)', 'School of Ports, Terminal Management and Logistics', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55.7466667'),
  ('prog-bba-r-e-com', 22, 'BBA-R&E-COM', 'BBA (Retail & E-Commerce Management)', 'School of Retail Management', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55.8000000'),
  ('prog-b-des-id', 27, 'B.DES.ID', 'B. Des. (Interior Design)', 'School of Architecture, Urban Development & Planning', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:55.9766667'),
  ('prog-b-sc--b-w', 1, 'B.SC. B&W', 'B.Sc. (Beauty & Wellness)', 'School of Beauty and Wellness', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55.0133333'),
  ('prog-b-sc--ds', 2, 'B.SC. DS', 'B.Sc. (Data Science)', 'School of Data Science', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55.0566667'),
  ('prog-b-sc--nsd', 3, 'B.SC. NSD', 'B.Sc. (Nutritional Sciences and Dietetics)', 'School of Nutrition and Dietetics', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55.0900000'),
  ('prog-b-tech--ai-ml', 12, 'B.TECH. AI&ML', 'B.Tech (Artificial Intelligence and Machine learning)', 'School of Computer Science & Information Technology', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.3500000'),
  ('prog-b-tech--auto-eng', 13, 'B.TECH. AUTO ENG', 'B.Tech (Automobile Engineering)', 'School of Automobile Engineering', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.3800000'),
  ('prog-btechauto-wilp-', 31, 'BTECHAUTO(WILP)', 'B. Tech. Automobile Engineering (WILP)', 'School of Automobile Engineering', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:56.1233333'),
  ('prog-b-tech-cem', 9, 'B.TECH CEM', 'B.Tech (Construction Engineering and Management)', 'School of Construction Engineering and Infrastructure Management', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.2533333'),
  ('prog-b-tech-cem-wilp-', 28, 'B.TECH CEM(WILP)', 'B.Tech. Construction Engineering and Management (WILP)', 'School of Construction Engineering and Infrastructure Management', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:56.0166667'),
  ('prog-b-tech-cs-it', 10, 'B.TECH CS&IT', 'B.Tech [Computer Science & IT (Cyber Security)]', 'School of Computer Science & Information Technology', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.2866667'),
  ('prog-b-tech-defence', 15, 'B.TECH-DEFENCE', 'B.Tech (Defence Technology)', 'School of Defence Technology', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.4266667'),
  ('prog-b-tech--mech-eng', 14, 'B.TECH. MECH ENG', 'B.Tech (Mechatronics Engineering)', 'School of Mechatronics Engineering', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.4033333'),
  ('prog-b-tech--msm-wilp-', 30, 'B.TECH. MSM(WILP)', 'B.Tech. Mechanical and Smart Manufacturing (WILP)', 'School of Mechatronics Engineering', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:56.0833333'),
  ('prog-b-tech-semicondu-eng', 17, 'B.TECH SEMICONDU ENG', 'B.Tech (Semiconductor Engineering)', 'School of Semiconductor Engineering', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.4866667'),
  ('prog-b-tech-s-se', 11, 'B.TECH S&SE', 'B.Tech (Smart and Sustainable Energy)', 'School of Sustainability Studies', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.3200000'),
  ('prog-dip-ame-', 4, 'DIP(AME)', 'Diploma in Advanced Manufacturing Excellence', 'School of Automobile Engineering', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55.1200000'),
  ('prog-dip-ma-', 5, 'DIP(MA)', 'Diploma in Manufacturing Automation', 'School of Mechatronics Engineering', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55.1533333'),
  ('prog-dip-me-', 6, 'DIP(ME)', 'Diploma in Manufacturing Excellence', 'School of Automobile Engineering', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55.1900000'),
  ('prog-mba--digital-marketing-', 25, 'MBA (DIGITAL MARKETING)', 'MBA (Digital Marketing)', 'School of Media Management', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55.9066667'),
  ('prog-mba-fintech-', 24, 'MBA(FINTECH)', 'MBA (FinTech)', 'School of Banking, Financial Services, and Insurance', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55.8733333'),
  ('prog-mba-l-scm-', 23, 'MBA(L&SCM)', 'MBA (Logistics and Supply Chain Management)', 'School of Ports, Terminal Management and Logistics', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55.8366667'),
  ('prog-m-plan-', 29, 'M.PLAN.', 'M. Plan. (Urban Planning)', 'School of Architecture, Urban Development & Planning', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:56.0500000'),
  ('prog-m-sc--ds', 7, 'M.SC. DS', 'M.Sc. (Data Science)', 'School of Data Science', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55.1900000'),
  ('prog-m-sc--nsd', 8, 'M.SC. NSD', 'M.Sc. (Nutritional Sciences and Ditetics)', 'School of Nutrition and Dietetics', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55.2200000'),
  ('prog-m-tech--mech-eng--iot-ai-rob-', 16, 'M.TECH. MECH ENG (IOT,AI&ROB)', 'M.Tech [Mechatronics Engineering (IOT, AI & Robotics)]', 'School of Mechatronics Engineering', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55.4600000');

-- 12. ENABLE ROW-LEVEL SECURITY & PERMISSIVE ACCESS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_course_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_processing_audit ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for authenticated users & anon client access
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public write profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Public write programs" ON public.programs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read exam_schedules" ON public.exam_schedules FOR SELECT USING (true);
CREATE POLICY "Public write exam_schedules" ON public.exam_schedules FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read exam_tasks" ON public.exam_tasks FOR SELECT USING (true);
CREATE POLICY "Public write exam_tasks" ON public.exam_tasks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read course_master" ON public.course_master FOR SELECT USING (true);
CREATE POLICY "Public write course_master" ON public.course_master FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read student_marks" ON public.student_marks FOR SELECT USING (true);
CREATE POLICY "Public write student_marks" ON public.student_marks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read exam_course_settings" ON public.exam_course_settings FOR SELECT USING (true);
CREATE POLICY "Public write exam_course_settings" ON public.exam_course_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read exam_processing_audit" ON public.exam_processing_audit FOR SELECT USING (true);
CREATE POLICY "Public write exam_processing_audit" ON public.exam_processing_audit FOR ALL USING (true) WITH CHECK (true);

-- 13. TIMETABLE GENERATOR & FACULTY ALLOCATION TABLES
CREATE TABLE IF NOT EXISTS public.timetable_sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    basis TEXT NOT NULL DEFAULT 'Both',
    odd_start_date_1 DATE,
    odd_start_date_2 DATE,
    even_start_date_1 DATE,
    even_start_date_2 DATE,
    holidays_json TEXT,
    has_break_day BOOLEAN NOT NULL DEFAULT false,
    use_calendar_dates BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    semester TEXT NOT NULL,
    slot_name TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    odd_even TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_electives (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    course_codes TEXT NOT NULL,
    is_fuzzy BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_student_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    centre TEXT NOT NULL,
    program TEXT NOT NULL,
    specialization TEXT,
    semester TEXT NOT NULL,
    prn TEXT NOT NULL,
    student_name TEXT NOT NULL,
    official_email TEXT,
    course_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faculty_course_allocations (
    id TEXT PRIMARY KEY,
    course_master_id TEXT,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    staff_code TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    additional_staff TEXT,
    section TEXT NOT NULL DEFAULT 'A',
    semester TEXT NOT NULL,
    program_name TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    department TEXT,
    workload_hours INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.timetable_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_electives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_course_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read timetable_sessions" ON public.timetable_sessions FOR SELECT USING (true);
CREATE POLICY "Public write timetable_sessions" ON public.timetable_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read timetable_slots" ON public.timetable_slots FOR SELECT USING (true);
CREATE POLICY "Public write timetable_slots" ON public.timetable_slots FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read timetable_electives" ON public.timetable_electives FOR SELECT USING (true);
CREATE POLICY "Public write timetable_electives" ON public.timetable_electives FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read timetable_student_records" ON public.timetable_student_records FOR SELECT USING (true);
CREATE POLICY "Public write timetable_student_records" ON public.timetable_student_records FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read faculty_course_allocations" ON public.faculty_course_allocations FOR SELECT USING (true);
CREATE POLICY "Public write faculty_course_allocations" ON public.faculty_course_allocations FOR ALL USING (true) WITH CHECK (true);

-- End of Supabase Migration Script
