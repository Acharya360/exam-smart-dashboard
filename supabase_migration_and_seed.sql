-- ============================================================================
-- Acharya360 Exam Smart Dashboard (ExamTrack)
-- Supabase PostgreSQL Cloud Database Migration & Authoritative Seed Script
-- Compatible with Supabase PostgreSQL 15+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. DELETE / WIPE ALL EXISTING TABLES, VIEWS & TYPES (Clean slate)
-- ============================================================================

-- Dynamic cascade wipe of all existing user tables in public schema
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Dynamic cascade wipe of all custom public enums
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Explicit drops (ensures complete safety across all Supabase environments)
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

-- ============================================================================
-- 2. CREATE ENUMS
-- ============================================================================
CREATE TYPE public.user_role_enum AS ENUM ('COE', 'DYCOE', 'ACOE', 'COORDINATOR');
CREATE TYPE public.exam_session_enum AS ENUM ('AM', 'PM');
CREATE TYPE public.exam_type_enum AS ENUM ('Regular', 'Backlog', 'Both');
CREATE TYPE public.task_status_enum AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED_TO_ALTERNATE');

-- ============================================================================
-- 3. PROFILES TABLE (Administrative and Faculty Users)
-- ============================================================================
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

-- ============================================================================
-- 4. ACADEMIC PROGRAMS TABLE
-- ============================================================================
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

-- ============================================================================
-- 5. EXAM SCHEDULES TABLE
-- ============================================================================
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

-- ============================================================================
-- 6. EXAM TASKS TABLE
-- ============================================================================
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

-- ============================================================================
-- 7. COURSE MASTER TABLE (LTPS Structure)
-- ============================================================================
CREATE TABLE public.course_master (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sr_no INTEGER,
    academic_period TEXT,
    term TEXT,
    program_code TEXT,
    cm_course_name TEXT NOT NULL,
    regulation_group TEXT,
    subject_type TEXT,
    semester TEXT NOT NULL,
    paper_code TEXT NOT NULL,
    sm_subject_name TEXT NOT NULL,
    student_count INTEGER DEFAULT 0,
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

-- ============================================================================
-- 8. STUDENT MARKS TABLE
-- ============================================================================
CREATE TABLE public.student_marks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    prn TEXT NOT NULL,
    student_name TEXT NOT NULL,
    cm_course_name TEXT NOT NULL,
    semester TEXT NOT NULL,
    paper_code TEXT NOT NULL,
    sm_subject_name TEXT NOT NULL,
    academic_year TEXT DEFAULT '2025-2026',
    exam_year TEXT DEFAULT '2026',
    assessment_type TEXT DEFAULT 'REGULAR',
    theory_marks NUMERIC(5,2) DEFAULT 0,
    practical_marks NUMERIC(5,2) DEFAULT 0,
    skills_marks NUMERIC(5,2) DEFAULT 0,
    total_marks NUMERIC(5,2) DEFAULT 0,
    grade TEXT DEFAULT '',
    grade_points NUMERIC(4,2) DEFAULT 0,
    result_status TEXT DEFAULT 'PASS',
    uploaded_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_student_marks_prn ON public.student_marks(prn);
CREATE INDEX idx_student_marks_paper ON public.student_marks(paper_code);

-- ============================================================================
-- 9. COURSE SETTINGS & PROCESSING AUDIT
-- ============================================================================
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
-- 10. TIMETABLE GENERATOR TABLES
-- ============================================================================
CREATE TABLE public.timetable_sessions (
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

CREATE TABLE public.timetable_slots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.timetable_sessions(id) ON DELETE CASCADE,
    semester TEXT NOT NULL,
    slot_name TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    odd_even TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.timetable_electives (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.timetable_sessions(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    course_codes TEXT NOT NULL,
    is_fuzzy BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.timetable_student_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.timetable_sessions(id) ON DELETE CASCADE,
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

-- ============================================================================
-- 11. FACULTY COURSE ALLOCATIONS TABLE
-- ============================================================================
CREATE TABLE public.faculty_course_allocations (
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
CREATE INDEX idx_fac_alloc_subject ON public.faculty_course_allocations(subject_code);
CREATE INDEX idx_fac_alloc_staff ON public.faculty_course_allocations(staff_code);
CREATE INDEX idx_fac_alloc_program ON public.faculty_course_allocations(program_name);

-- ============================================================================
-- 12. SEED DATA MIGRATION FROM AUTHORITATIVE DATABASE (SSPU_Exam)
-- ============================================================================

-- A. Insert Profiles with default password 'Admin@123'
INSERT INTO public.profiles (id, email, password, full_name, role, department, title, created_at, last_password_change)
VALUES
  ('user-coe-1', 'coe@sspu.ac.in', 'Admin@123', 'Dr. Sunita Nikam', 'COE', 'Central Examination Office', 'Controller of Examinations', '2026-01-10T09:00:00Z', NOW()),
  ('user-dycoe-1', 'DyCoe@sspu.ac.in', 'Admin@123', 'Dr. Kiran Shende', 'DYCOE', 'Central Examination Office', 'Deputy Controller of Examinations', '2026-01-12T10:00:00Z', NOW()),
  ('user-acoe-1', 'Acoe@sspu.ac.in', 'Admin@123', 'Mr. Keshav B. Jankar', 'ACOE', 'Central Examination Office', 'Assistant Controller of Examinations', '2026-01-15T11:30:00Z', NOW()),
  ('user-1792693422261', 'amit.vartikar@sspu.ac.in', 'Admin@123', 'Mr. Amit Vartikar', 'COORDINATOR', 'Examination Department', 'Exam Coordinator', '2026-10-22T23:53:42Z', NOW()),
  ('user-1792693422403', 'shreyasi.joshi@sspu.ac.in', 'Admin@123', 'Ms. Shreyasi Joshi', 'COORDINATOR', 'Examination Department', 'Exam Coordinator', '2026-10-22T23:53:42Z', NOW()),
  ('user-1792693422489', 'prathmesh.londhe@sspu.ac.in', 'Admin@123', 'Mr. Prathmesh Londhe', 'COORDINATOR', 'Examination Department', 'Exam Coordinator', '2026-10-22T23:53:42Z', NOW()),
  ('user-1792693422591', 'rajkumar.wankhade@sspu.ac.in', 'Admin@123', 'Mr. Rajkumar Wankhade', 'COORDINATOR', 'Examination Department', 'Exam Coordinator', '2026-10-22T23:53:42Z', NOW()),
  ('user-coord-mvjwta5a-x5op', 'suresh.patil@sspu.ac.in', 'Admin@123', 'Dr. Suresh Patil', 'COORDINATOR', 'Examination Department', 'Exam Coordinator', '2026-10-23T00:33:54Z', NOW())
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  title = EXCLUDED.title,
  last_password_change = NOW();

-- B. Insert Academic Programs
INSERT INTO public.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id, created_at)
VALUES
  ('prog-b-arch-', 26, 'B.ARCH.', 'B. Arch', 'School of Architecture, Urban Development & Planning', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:55Z'),
  ('prog-bba-dmm', 19, 'BBA-DMM', 'BBA (Digital Media Marketing)', 'School of Media Management', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55Z'),
  ('prog-bba-fintech', 18, 'BBA.FINTECH', 'BBA (Fintech)', 'School of Banking, Financial Services, and Insurance', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55Z'),
  ('prog-bba-l-scm', 20, 'BBA-L&SCM', 'BBA (Logistics and Supply Chain Management)', 'School of Ports, Terminal Management and Logistics', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55Z'),
  ('prog-bba-p-tm', 21, 'BBA-P&TM', 'BBA (Ports & Terminal Management)', 'School of Ports, Terminal Management and Logistics', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55Z'),
  ('prog-bba-r-e-com', 22, 'BBA-R&E-COM', 'BBA (Retail & E-Commerce Management)', 'School of Retail Management', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55Z'),
  ('prog-b-des-id', 27, 'B.DES.ID', 'B. Des. (Interior Design)', 'School of Architecture, Urban Development & Planning', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:55Z'),
  ('prog-b-sc--b-w', 1, 'B.SC. B&W', 'B.Sc. (Beauty & Wellness)', 'School of Beauty and Wellness', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55Z'),
  ('prog-b-sc--ds', 2, 'B.SC. DS', 'B.Sc. (Data Science)', 'School of Data Science', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55Z'),
  ('prog-b-sc--nsd', 3, 'B.SC. NSD', 'B.Sc. (Nutritional Sciences and Dietetics)', 'School of Nutrition and Dietetics', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55Z'),
  ('prog-b-tech--ai-ml', 12, 'B.TECH. AI&ML', 'B.Tech (Artificial Intelligence and Machine learning)', 'School of Computer Science & Information Technology', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z'),
  ('prog-b-tech--auto-eng', 13, 'B.TECH. AUTO ENG', 'B.Tech (Automobile Engineering)', 'School of Automobile Engineering', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z'),
  ('prog-btechauto-wilp-', 31, 'BTECHAUTO(WILP)', 'B. Tech. Automobile Engineering (WILP)', 'School of Automobile Engineering', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:56Z'),
  ('prog-b-tech-cem', 9, 'B.TECH CEM', 'B.Tech (Construction Engineering and Management)', 'School of Construction Engineering and Infrastructure Management', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z'),
  ('prog-b-tech-cem-wilp-', 28, 'B.TECH CEM(WILP)', 'B.Tech. Construction Engineering and Management (WILP)', 'School of Construction Engineering and Infrastructure Management', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:56Z'),
  ('prog-b-tech-cs-it', 10, 'B.TECH CS&IT', 'B.Tech [Computer Science & IT (Cyber Security)]', 'School of Computer Science & Information Technology', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z'),
  ('prog-b-tech-defence', 15, 'B.TECH-DEFENCE', 'B.Tech (Defence Technology)', 'School of Defence Technology', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z'),
  ('prog-b-tech--mech-eng', 14, 'B.TECH. MECH ENG', 'B.Tech (Mechatronics Engineering)', 'School of Mechatronics Engineering', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z'),
  ('prog-b-tech--msm-wilp-', 30, 'B.TECH. MSM(WILP)', 'B.Tech. Mechanical and Smart Manufacturing (WILP)', 'School of Mechatronics Engineering', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:56Z'),
  ('prog-b-tech-semicondu-eng', 17, 'B.TECH SEMICONDU ENG', 'B.Tech (Semiconductor Engineering)', 'School of Semiconductor Engineering', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z'),
  ('prog-b-tech-s-se', 11, 'B.TECH S&SE', 'B.Tech (Smart and Sustainable Energy)', 'School of Sustainability Studies', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z'),
  ('prog-dip-ame-', 4, 'DIP(AME)', 'Diploma in Advanced Manufacturing Excellence', 'School of Automobile Engineering', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55Z'),
  ('prog-dip-ma-', 5, 'DIP(MA)', 'Diploma in Manufacturing Automation', 'School of Mechatronics Engineering', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55Z'),
  ('prog-dip-me-', 6, 'DIP(ME)', 'Diploma in Manufacturing Excellence', 'School of Automobile Engineering', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55Z'),
  ('prog-mba--digital-marketing-', 25, 'MBA (DIGITAL MARKETING)', 'MBA (Digital Marketing)', 'School of Media Management', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55Z'),
  ('prog-mba-fintech-', 24, 'MBA(FINTECH)', 'MBA (FinTech)', 'School of Banking, Financial Services, and Insurance', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55Z'),
  ('prog-mba-l-scm-', 23, 'MBA(L&SCM)', 'MBA (Logistics and Supply Chain Management)', 'School of Ports, Terminal Management and Logistics', 'user-1792693422591', 'user-1792693422489', '2026-10-23T00:35:55Z'),
  ('prog-m-plan-', 29, 'M.PLAN.', 'M. Plan. (Urban Planning)', 'School of Architecture, Urban Development & Planning', 'user-1792693422403', 'user-1792693422261', '2026-10-23T00:35:56Z'),
  ('prog-m-sc--ds', 7, 'M.SC. DS', 'M.Sc. (Data Science)', 'School of Data Science', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55Z'),
  ('prog-m-sc--nsd', 8, 'M.SC. NSD', 'M.Sc. (Nutritional Sciences and Ditetics)', 'School of Nutrition and Dietetics', 'user-1792693422261', 'user-1792693422403', '2026-10-23T00:35:55Z'),
  ('prog-m-tech--mech-eng--iot-ai-rob-', 16, 'M.TECH. MECH ENG (IOT,AI&ROB)', 'M.Tech [Mechatronics Engineering (IOT, AI & Robotics)]', 'School of Mechatronics Engineering', 'user-1792693422489', 'user-1792693422591', '2026-10-23T00:35:55Z');

-- C. Seed Initial Faculty Course Allocations
INSERT INTO public.faculty_course_allocations 
(id, course_master_id, subject_code, subject_name, staff_code, staff_name, additional_staff, section, semester, program_name, academic_year, department, workload_hours)
VALUES
  ('fac-alloc-001', 'cm-1', 'APSC102', 'Applied Physics', 'T7101', 'Prof. Sarah Jenkins', 'T7102 - Prof. Amit Roy', 'A', 'I', 'B.Tech. Construction Engineering & Management', '2025-2026', 'School of Construction Engineering', 4),
  ('fac-alloc-002', 'cm-2', 'AMAT103', 'Engineering Mathematics', 'T7103', 'Dr. Rajesh Sharma', 'T7104 - Prof. Vikram Patel', 'A', 'I', 'B.Tech. Construction Engineering & Management', '2025-2026', 'School of Science', 4),
  ('fac-alloc-003', 'cm-3', 'AENG104', 'Engineering Mechanics', 'T7104', 'Prof. Vikram Patel', NULL, 'A', 'I', 'B.Tech. Construction Engineering & Management', '2025-2026', 'School of Construction Engineering', 4),
  ('fac-alloc-004', 'cm-4', 'ACEM105', 'Construction Materials', 'T7101', 'Prof. Sarah Jenkins', NULL, 'A', 'I', 'B.Tech. Construction Engineering & Management', '2025-2026', 'School of Construction Engineering', 3),
  ('fac-alloc-005', 'cm-5', 'ACEM106', 'Engineering Drawing', 'T7105', 'Dr. Arun Kumar', 'T7101 - Prof. Sarah Jenkins', 'A', 'I', 'B.Tech. Construction Engineering & Management', '2025-2026', 'School of Construction Engineering', 4),
  ('fac-alloc-006', 'cm-6', 'ACEM107', 'Building Construction', 'T7102', 'Prof. Amit Roy', NULL, 'A', 'I', 'B.Tech. Construction Engineering & Management', '2025-2026', 'School of Construction Engineering', 3),
  ('fac-alloc-007', NULL, 'APSC2102', 'Advanced Applied Physics', 'T7101', 'Prof. Sarah Jenkins', NULL, 'A', 'II', 'B.Tech. Construction Engineering & Management', '2025-2026', 'School of Construction Engineering', 4),
  ('fac-alloc-008', NULL, 'APSC2103', 'Applied Chemistry & Materials', 'T7106', 'Dr. Anita Verma', 'T7102 - Prof. Amit Roy', 'A', 'II', 'B.Tech. Mechatronics Engineering', '2025-2026', 'School of Mechatronics', 4),
  ('fac-alloc-009', NULL, 'CS401', 'Operating Systems & Concurrency', 'T7107', 'Dr. Neha Gupta', 'T7104 - Prof. Vikram Patel', 'A', 'IV', 'B.Tech. Computer Science & AI', '2025-2026', 'School of Computer Science & AI', 4),
  ('fac-alloc-010', NULL, 'CS402', 'Database Management Systems', 'T7107', 'Dr. Neha Gupta', NULL, 'A', 'IV', 'B.Tech. Computer Science & AI', '2025-2026', 'School of Computer Science & AI', 4),
  ('fac-alloc-011', NULL, 'CS403', 'Design and Analysis of Algorithms', 'T7104', 'Prof. Vikram Patel', NULL, 'A', 'IV', 'B.Tech. Computer Science & AI', '2025-2026', 'School of Computer Science & AI', 4),
  ('fac-alloc-012', NULL, 'CS404', 'Machine Learning Foundations', 'T7107', 'Dr. Neha Gupta', 'T7105 - Dr. Arun Kumar', 'A', 'IV', 'B.Tech. Computer Science & AI', '2025-2026', 'School of Computer Science & AI', 4),
  ('fac-alloc-013', NULL, 'EE602', 'Power Systems & Smart Grids', 'T7105', 'Dr. Arun Kumar', NULL, 'A', 'VI', 'B.Tech. Electrical & Electronics', '2025-2026', 'School of Electrical Engineering', 4);

-- ============================================================================
-- 13. ENABLE ROW-LEVEL SECURITY & PERMISSIVE ACCESS POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_course_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_processing_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_electives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_course_allocations ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 14. VERIFICATION QUERY (Displays created tables and row counts in Results)
-- ============================================================================
SELECT 
  table_name, 
  (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT 
    table_name, 
    query_to_xml(format('select count(*) as cnt from %I', table_name), false, true, '') as xml_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) t
ORDER BY table_name;

-- End of Supabase Migration Script
