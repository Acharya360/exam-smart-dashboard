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
    -- id MUST equal auth.users(id)::text. Rows are provisioned in section 12 below;
    -- no password column exists here because authentication is handled by Supabase Auth.
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
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
    l INTEGER DEFAULT 0,
    t INTEGER DEFAULT 0,
    p INTEGER DEFAULT 0,
    s INTEGER DEFAULT 0,
    total_credits INTEGER DEFAULT 0,
    grading_category TEXT DEFAULT 'Non-Architecture',
    cat1_max NUMERIC(5,2) DEFAULT 0,
    cat1_min NUMERIC(5,2) DEFAULT 0,
    cat2_max NUMERIC(5,2) DEFAULT 0,
    cat2_min NUMERIC(5,2) DEFAULT 0,
    cat3_max NUMERIC(5,2) DEFAULT 0,
    cat3_min NUMERIC(5,2) DEFAULT 0,
    cap1_max NUMERIC(5,2) DEFAULT 0,
    cap1_min NUMERIC(5,2) DEFAULT 0,
    cap2_max NUMERIC(5,2) DEFAULT 0,
    cap2_min NUMERIC(5,2) DEFAULT 0,
    cap3_max NUMERIC(5,2) DEFAULT 0,
    cap3_min NUMERIC(5,2) DEFAULT 0,
    cas1_max NUMERIC(5,2) DEFAULT 0,
    cas1_min NUMERIC(5,2) DEFAULT 0,
    cas2_max NUMERIC(5,2) DEFAULT 0,
    cas2_min NUMERIC(5,2) DEFAULT 0,
    cas3_max NUMERIC(5,2) DEFAULT 0,
    cas3_min NUMERIC(5,2) DEFAULT 0,
    cat_max_marks NUMERIC(5,2) DEFAULT 0,
    cat_min_marks NUMERIC(5,2) DEFAULT 0,
    cap_max_marks NUMERIC(5,2) DEFAULT 0,
    cap_min_marks NUMERIC(5,2) DEFAULT 0,
    cas_max_marks NUMERIC(5,2) DEFAULT 0,
    cas_min_marks NUMERIC(5,2) DEFAULT 0,
    est_max_marks NUMERIC(5,2) DEFAULT 0,
    est_min_marks NUMERIC(5,2) DEFAULT 0,
    esp_max_marks NUMERIC(5,2) DEFAULT 0,
    esp_min_marks NUMERIC(5,2) DEFAULT 0,
    ess_max_marks NUMERIC(5,2) DEFAULT 0,
    ess_min_marks NUMERIC(5,2) DEFAULT 0,
    ia_max_marks NUMERIC(5,2) DEFAULT 0,
    ia_min_marks NUMERIC(5,2) DEFAULT 0,
    total_marks NUMERIC(6,2) DEFAULT 100,
    total_marks_min NUMERIC(6,2) DEFAULT 40,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_course_master_code ON public.course_master(paper_code);
-- Backs the upsertCourseMaster onConflict target (cm_course_name, semester, paper_code).
CREATE UNIQUE INDEX uq_course_master_unique ON public.course_master(cm_course_name, semester, paper_code);

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
-- Backs the upsertStudentMarks onConflict target.
CREATE UNIQUE INDEX uq_student_marks_unique ON public.student_marks(prn, cm_course_name, semester, paper_code, academic_year, exam_year, assessment_type);

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
-- 11b. RBAC HELPER FUNCTIONS
-- profiles.id and coordinator/task FK columns are TEXT holding auth.users UUIDs,
-- so auth.uid() is cast to text for comparison.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()::text
      AND role IN ('COE', 'DYCOE', 'ACOE')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coordinator_for_program(p_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.programs
    WHERE program_code = p_code
      AND (primary_coordinator_id = auth.uid()::text OR alternate_coordinator_id = auth.uid()::text)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. SEED DATA MIGRATION FROM AUTHORITATIVE DATABASE (SSPU_Exam)
-- ============================================================================

-- A. Provision Supabase Auth users and their matching profiles.
-- Authentication is delegated to Supabase Auth (auth.users). Each profile.id equals
-- its auth.users UUID (as text). Default password 'Admin@123' MUST be changed on first login.
DO $$
DECLARE
  u RECORD;
BEGIN
  -- Guarantee deterministic ids: remove any stale auth users for these seed emails first.
  DELETE FROM auth.users WHERE email IN (
    'coe@sspu.ac.in', 'dycoe@sspu.ac.in', 'acoe@sspu.ac.in',
    'amit.vartikar@sspu.ac.in', 'shreyasi.joshi@sspu.ac.in',
    'prathmesh.londhe@sspu.ac.in', 'rajkumar.wankhade@sspu.ac.in',
    'suresh.patil@sspu.ac.in'
  );

  FOR u IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0000-000000000001', 'coe@sspu.ac.in',               'Dr. Sunita Nikam',      'COE',         'Central Examination Office', 'Controller of Examinations'),
      ('00000000-0000-0000-0000-000000000002', 'dycoe@sspu.ac.in',             'Dr. Kiran Shende',      'DYCOE',       'Central Examination Office', 'Deputy Controller of Examinations'),
      ('00000000-0000-0000-0000-000000000003', 'acoe@sspu.ac.in',              'Mr. Keshav B. Jankar',  'ACOE',        'Central Examination Office', 'Assistant Controller of Examinations'),
      ('00000000-0000-0000-0000-000000000004', 'amit.vartikar@sspu.ac.in',     'Mr. Amit Vartikar',     'COORDINATOR', 'Examination Department',     'Exam Coordinator'),
      ('00000000-0000-0000-0000-000000000005', 'shreyasi.joshi@sspu.ac.in',    'Ms. Shreyasi Joshi',    'COORDINATOR', 'Examination Department',     'Exam Coordinator'),
      ('00000000-0000-0000-0000-000000000006', 'prathmesh.londhe@sspu.ac.in',  'Mr. Prathmesh Londhe',  'COORDINATOR', 'Examination Department',     'Exam Coordinator'),
      ('00000000-0000-0000-0000-000000000007', 'rajkumar.wankhade@sspu.ac.in', 'Mr. Rajkumar Wankhade', 'COORDINATOR', 'Examination Department',     'Exam Coordinator'),
      ('00000000-0000-0000-0000-000000000008', 'suresh.patil@sspu.ac.in',      'Dr. Suresh Patil',      'COORDINATOR', 'Examination Department',     'Exam Coordinator')
    ) AS t(id, email, full_name, role, department, title)
  LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (u.id::uuid, '00000000-0000-0000-0000-000000000000', u.email, crypt('Admin@123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 'authenticated', '', '', '', '');

    INSERT INTO public.profiles (id, email, full_name, role, department, title, created_at, last_password_change)
    VALUES (u.id, u.email, u.full_name, u.role::public.user_role_enum, u.department, u.title, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      department = EXCLUDED.department,
      title = EXCLUDED.title;
  END LOOP;
END $$;

-- B. Insert Academic Programs
INSERT INTO public.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id, created_at)
VALUES
  ('prog-b-arch-', 26, 'B.ARCH.', 'B. Arch', 'School of Architecture, Urban Development & Planning', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', '2026-10-23T00:35:55Z'),
  ('prog-bba-dmm', 19, 'BBA-DMM', 'BBA (Digital Media Marketing)', 'School of Media Management', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', '2026-10-23T00:35:55Z'),
  ('prog-bba-fintech', 18, 'BBA.FINTECH', 'BBA (Fintech)', 'School of Banking, Financial Services, and Insurance', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', '2026-10-23T00:35:55Z'),
  ('prog-bba-l-scm', 20, 'BBA-L&SCM', 'BBA (Logistics and Supply Chain Management)', 'School of Ports, Terminal Management and Logistics', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', '2026-10-23T00:35:55Z'),
  ('prog-bba-p-tm', 21, 'BBA-P&TM', 'BBA (Ports & Terminal Management)', 'School of Ports, Terminal Management and Logistics', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', '2026-10-23T00:35:55Z'),
  ('prog-bba-r-e-com', 22, 'BBA-R&E-COM', 'BBA (Retail & E-Commerce Management)', 'School of Retail Management', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', '2026-10-23T00:35:55Z'),
  ('prog-b-des-id', 27, 'B.DES.ID', 'B. Des. (Interior Design)', 'School of Architecture, Urban Development & Planning', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', '2026-10-23T00:35:55Z'),
  ('prog-b-sc--b-w', 1, 'B.SC. B&W', 'B.Sc. (Beauty & Wellness)', 'School of Beauty and Wellness', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '2026-10-23T00:35:55Z'),
  ('prog-b-sc--ds', 2, 'B.SC. DS', 'B.Sc. (Data Science)', 'School of Data Science', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '2026-10-23T00:35:55Z'),
  ('prog-b-sc--nsd', 3, 'B.SC. NSD', 'B.Sc. (Nutritional Sciences and Dietetics)', 'School of Nutrition and Dietetics', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '2026-10-23T00:35:55Z'),
  ('prog-b-tech--ai-ml', 12, 'B.TECH. AI&ML', 'B.Tech (Artificial Intelligence and Machine learning)', 'School of Computer Science & Information Technology', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z'),
  ('prog-b-tech--auto-eng', 13, 'B.TECH. AUTO ENG', 'B.Tech (Automobile Engineering)', 'School of Automobile Engineering', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z'),
  ('prog-btechauto-wilp-', 31, 'BTECHAUTO(WILP)', 'B. Tech. Automobile Engineering (WILP)', 'School of Automobile Engineering', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', '2026-10-23T00:35:56Z'),
  ('prog-b-tech-cem', 9, 'B.TECH CEM', 'B.Tech (Construction Engineering and Management)', 'School of Construction Engineering and Infrastructure Management', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z'),
  ('prog-b-tech-cem-wilp-', 28, 'B.TECH CEM(WILP)', 'B.Tech. Construction Engineering and Management (WILP)', 'School of Construction Engineering and Infrastructure Management', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', '2026-10-23T00:35:56Z'),
  ('prog-b-tech-cs-it', 10, 'B.TECH CS&IT', 'B.Tech [Computer Science & IT (Cyber Security)]', 'School of Computer Science & Information Technology', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z'),
  ('prog-b-tech-defence', 15, 'B.TECH-DEFENCE', 'B.Tech (Defence Technology)', 'School of Defence Technology', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z'),
  ('prog-b-tech--mech-eng', 14, 'B.TECH. MECH ENG', 'B.Tech (Mechatronics Engineering)', 'School of Mechatronics Engineering', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z'),
  ('prog-b-tech--msm-wilp-', 30, 'B.TECH. MSM(WILP)', 'B.Tech. Mechanical and Smart Manufacturing (WILP)', 'School of Mechatronics Engineering', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', '2026-10-23T00:35:56Z'),
  ('prog-b-tech-semicondu-eng', 17, 'B.TECH SEMICONDU ENG', 'B.Tech (Semiconductor Engineering)', 'School of Semiconductor Engineering', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z'),
  ('prog-b-tech-s-se', 11, 'B.TECH S&SE', 'B.Tech (Smart and Sustainable Energy)', 'School of Sustainability Studies', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z'),
  ('prog-dip-ame-', 4, 'DIP(AME)', 'Diploma in Advanced Manufacturing Excellence', 'School of Automobile Engineering', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '2026-10-23T00:35:55Z'),
  ('prog-dip-ma-', 5, 'DIP(MA)', 'Diploma in Manufacturing Automation', 'School of Mechatronics Engineering', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '2026-10-23T00:35:55Z'),
  ('prog-dip-me-', 6, 'DIP(ME)', 'Diploma in Manufacturing Excellence', 'School of Automobile Engineering', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '2026-10-23T00:35:55Z'),
  ('prog-mba--digital-marketing-', 25, 'MBA (DIGITAL MARKETING)', 'MBA (Digital Marketing)', 'School of Media Management', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', '2026-10-23T00:35:55Z'),
  ('prog-mba-fintech-', 24, 'MBA(FINTECH)', 'MBA (FinTech)', 'School of Banking, Financial Services, and Insurance', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', '2026-10-23T00:35:55Z'),
  ('prog-mba-l-scm-', 23, 'MBA(L&SCM)', 'MBA (Logistics and Supply Chain Management)', 'School of Ports, Terminal Management and Logistics', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', '2026-10-23T00:35:55Z'),
  ('prog-m-plan-', 29, 'M.PLAN.', 'M. Plan. (Urban Planning)', 'School of Architecture, Urban Development & Planning', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', '2026-10-23T00:35:56Z'),
  ('prog-m-sc--ds', 7, 'M.SC. DS', 'M.Sc. (Data Science)', 'School of Data Science', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '2026-10-23T00:35:55Z'),
  ('prog-m-sc--nsd', 8, 'M.SC. NSD', 'M.Sc. (Nutritional Sciences and Ditetics)', 'School of Nutrition and Dietetics', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '2026-10-23T00:35:55Z'),
  ('prog-m-tech--mech-eng--iot-ai-rob-', 16, 'M.TECH. MECH ENG (IOT,AI&ROB)', 'M.Tech [Mechatronics Engineering (IOT, AI & Robotics)]', 'School of Mechatronics Engineering', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', '2026-10-23T00:35:55Z');

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
-- 13. ENABLE ROW-LEVEL SECURITY & ROLE-SCOPED ACCESS POLICIES
-- ============================================================================
-- SECURITY MODEL: every policy targets the `authenticated` role, so the anonymous
-- (anon) key has NO access to any table. Super Admins (COE/DYCOE/ACOE) manage all
-- rows; Coordinators only read data belonging to programs they are mapped to.
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

-- profiles: any authenticated user may read (assignment dropdowns); only Super Admins manage.
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_manage_super_admin" ON public.profiles
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- programs: Super Admins see all; Coordinators see only their mapped programs.
CREATE POLICY "programs_select" ON public.programs
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_coordinator_for_program(program_code));
CREATE POLICY "programs_manage_super_admin" ON public.programs
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- exam_schedules: scoped by program_code.
CREATE POLICY "exam_schedules_select" ON public.exam_schedules
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_coordinator_for_program(program_code));
CREATE POLICY "exam_schedules_manage_super_admin" ON public.exam_schedules
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- exam_tasks: Super Admins manage all; Coordinators see/update tasks assigned to them
-- (directly or as alternate) or belonging to their programs.
CREATE POLICY "exam_tasks_select" ON public.exam_tasks
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR assigned_to = auth.uid()::text
    OR alternate_user_id = auth.uid()::text
    OR public.is_coordinator_for_program(program_code)
  );
CREATE POLICY "exam_tasks_update_own" ON public.exam_tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid()::text OR alternate_user_id = auth.uid()::text)
  WITH CHECK (
    public.is_super_admin()
    OR assigned_to = auth.uid()::text
    OR alternate_user_id = auth.uid()::text
  );
CREATE POLICY "exam_tasks_manage_super_admin" ON public.exam_tasks
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- course_master: scoped by program_code (nullable -> only Super Admins see unmapped rows).
CREATE POLICY "course_master_select" ON public.course_master
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_coordinator_for_program(program_code));
CREATE POLICY "course_master_manage_super_admin" ON public.course_master
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- student_marks: no program_code column, so scope via the course_master -> programs bridge.
CREATE POLICY "student_marks_select" ON public.student_marks
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.course_master cm
      JOIN public.programs p ON p.program_code = cm.program_code
      WHERE cm.cm_course_name = public.student_marks.cm_course_name
        AND cm.semester = public.student_marks.semester
        AND cm.paper_code = public.student_marks.paper_code
        AND (p.primary_coordinator_id = auth.uid()::text OR p.alternate_coordinator_id = auth.uid()::text)
    )
  );
CREATE POLICY "student_marks_manage_super_admin" ON public.student_marks
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- exam_course_settings: scoped by program_code.
CREATE POLICY "exam_course_settings_select" ON public.exam_course_settings
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_coordinator_for_program(program_code));
CREATE POLICY "exam_course_settings_manage_super_admin" ON public.exam_course_settings
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- exam_processing_audit: readable and appendable by any authenticated user; only Super
-- Admins may modify or delete history.
CREATE POLICY "exam_processing_audit_select" ON public.exam_processing_audit
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "exam_processing_audit_insert" ON public.exam_processing_audit
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exam_processing_audit_manage_super_admin" ON public.exam_processing_audit
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- timetable configuration (sessions/slots/electives): shared read, Super Admin write.
CREATE POLICY "timetable_sessions_select" ON public.timetable_sessions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "timetable_sessions_manage_super_admin" ON public.timetable_sessions
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "timetable_slots_select" ON public.timetable_slots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "timetable_slots_manage_super_admin" ON public.timetable_slots
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "timetable_electives_select" ON public.timetable_electives
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "timetable_electives_manage_super_admin" ON public.timetable_electives
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- timetable_student_records holds student PII (PRN, name, email): Super Admin only.
CREATE POLICY "timetable_student_records_super_admin" ON public.timetable_student_records
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- faculty_course_allocations: shared read, Super Admin write.
CREATE POLICY "faculty_course_allocations_select" ON public.faculty_course_allocations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "faculty_course_allocations_manage_super_admin" ON public.faculty_course_allocations
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

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
