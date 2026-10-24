  -- ============================================================================
  -- EXAM DEPARTMENT TRACK DASHBOARD & TASK MANAGEMENT SYSTEM
  -- PostgreSQL Schema & Supabase Row-Level Security (RLS) Migration
  -- ============================================================================

  -- 0. CLEANUP EXISTING TYPES AND TABLES (Idempotent Setup)
  -- ============================================================================
  DROP TABLE IF EXISTS public.exam_tasks CASCADE;
  DROP TABLE IF EXISTS public.exam_schedules CASCADE;
  DROP TABLE IF EXISTS public.programs CASCADE;
  DROP TABLE IF EXISTS public.profiles CASCADE;

  DROP TYPE IF EXISTS user_role_enum CASCADE;
  DROP TYPE IF EXISTS exam_session_enum CASCADE;
  DROP TYPE IF EXISTS exam_type_enum CASCADE;
  DROP TYPE IF EXISTS task_status_enum CASCADE;

  -- 1. Create Enums
  CREATE TYPE user_role_enum AS ENUM ('COE', 'DYCOE', 'ACOE', 'COORDINATOR');
  CREATE TYPE exam_session_enum AS ENUM ('AM', 'PM');
  CREATE TYPE exam_type_enum AS ENUM ('Regular', 'Backlog', 'Both');
  CREATE TYPE task_status_enum AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED_TO_ALTERNATE');

  -- 2. Profiles Table (Linked to auth.users in Supabase)
  CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role user_role_enum NOT NULL DEFAULT 'COORDINATOR',
      department TEXT,
      phone TEXT,
      title TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Index for role lookups in RLS subqueries
  CREATE INDEX idx_profiles_role ON public.profiles(role);

  -- 3. Programs Table
  CREATE TABLE public.programs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sr_no INTEGER,
      program_code TEXT UNIQUE NOT NULL,
      program_name TEXT NOT NULL,
      school_name TEXT NOT NULL,
      primary_coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      alternate_coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_programs_code ON public.programs(program_code);
  CREATE INDEX idx_programs_primary ON public.programs(primary_coordinator_id);
  CREATE INDEX idx_programs_alternate ON public.programs(alternate_coordinator_id);

  -- 4. Exam Schedules Table (Matches university master excel schema)
  CREATE TABLE public.exam_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      am_pm exam_session_enum NOT NULL DEFAULT 'AM',
      exam_time TEXT NOT NULL,
      exam_type exam_type_enum NOT NULL DEFAULT 'Regular',
      exam_year TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_exam_schedules_program ON public.exam_schedules(program_code);
  CREATE INDEX idx_exam_schedules_date ON public.exam_schedules(exam_date);
  CREATE INDEX idx_exam_schedules_paper ON public.exam_schedules(paper_code);

  -- 5. Exam Tasks (To-Do & Workflow Tracking)
  CREATE TABLE public.exam_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
      program_code TEXT NOT NULL,
      task_title TEXT NOT NULL,
      status task_status_enum NOT NULL DEFAULT 'PENDING',
      assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      alternate_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
  -- HELPER FUNCTIONS FOR ROLE-BASED ACCESS CONTROL (RBAC)
  -- ============================================================================

  -- Function to check if the current user is a Super Admin (CoE, DyCoE, ACoE)
  CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('COE', 'DYCOE', 'ACOE')
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Function to check if current user is mapped to a program (as Primary or Alternate)
  CREATE OR REPLACE FUNCTION public.is_coordinator_for_program(p_code TEXT)
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.programs
      WHERE program_code = p_code
        AND (primary_coordinator_id = auth.uid() OR alternate_coordinator_id = auth.uid())
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- ============================================================================
  -- ENABLE ROW LEVEL SECURITY (RLS)
  -- ============================================================================

  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.exam_tasks ENABLE ROW LEVEL SECURITY;

  -- ============================================================================
  -- RLS POLICIES: profiles
  -- ============================================================================

  -- Anyone authenticated can view user profiles (needed for assignment dropdowns)
  CREATE POLICY "Allow authenticated users to read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

  -- Only Super Admins can update roles
  CREATE POLICY "Super Admins can update profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_super_admin());

  -- ============================================================================
  -- RLS POLICIES: programs
  -- ============================================================================

  -- Super Admins can see all programs; Coordinators can only see their mapped programs
  CREATE POLICY "Programs select policy"
  ON public.programs FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR
    primary_coordinator_id = auth.uid() OR
    alternate_coordinator_id = auth.uid()
  );

  -- Only Super Admins can insert, update, or delete programs
  CREATE POLICY "Super Admins can manage programs"
  ON public.programs FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

  -- ============================================================================
  -- RLS POLICIES: exam_schedules
  -- ============================================================================

  -- Super Admins see all schedules; Coordinators only see their mapped program schedules
  CREATE POLICY "Exam schedules select policy"
  ON public.exam_schedules FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR
    public.is_coordinator_for_program(program_code)
  );

  -- Only Super Admins can upload/modify/delete exam schedules
  CREATE POLICY "Super Admins can manage exam schedules"
  ON public.exam_schedules FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

  -- ============================================================================
  -- RLS POLICIES: exam_tasks
  -- ============================================================================

  -- Super Admins see all tasks; Coordinators see tasks assigned to them or their program
  CREATE POLICY "Exam tasks select policy"
  ON public.exam_tasks FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR
    assigned_to = auth.uid() OR
    alternate_user_id = auth.uid() OR
    public.is_coordinator_for_program(program_code)
  );

  -- Super Admins can manage all tasks
  CREATE POLICY "Super Admins can manage all tasks"
  ON public.exam_tasks FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

  -- Coordinators can update status & notes of their own assigned tasks
  CREATE POLICY "Coordinators can update assigned tasks"
  ON public.exam_tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    alternate_user_id = auth.uid()
  )
  WITH CHECK (
    assigned_to = auth.uid() OR
    alternate_user_id = auth.uid()
  );

  -- ============================================================================
  -- 6. Student Marks Table (Component-wise marks per student per subject)
  -- ============================================================================
  CREATE TABLE public.student_marks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prn TEXT NOT NULL,
      student_name TEXT NOT NULL,
      cm_course_name TEXT NOT NULL,
      semester TEXT NOT NULL,
      paper_code TEXT NOT NULL,
      sm_subject_name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      exam_year TEXT NOT NULL,
      assessment_type TEXT NOT NULL, -- 'CAT', 'EST', 'CAP', 'ESP', 'IA', 'EXTERNAL'
      theory DECIMAL(5,2) DEFAULT 0,
      practical DECIMAL(5,2) DEFAULT 0,
      skills DECIMAL(5,2) DEFAULT 0,
      uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_student_marks_prn ON public.student_marks(prn);
  CREATE INDEX idx_student_marks_paper ON public.student_marks(paper_code);
  CREATE INDEX idx_student_marks_course ON public.student_marks(cm_course_name);
  CREATE INDEX idx_student_marks_assessment ON public.student_marks(assessment_type);

  -- ============================================================================
  -- 7. Student Results Table (Computed final results per subject per student)
  -- ============================================================================
  CREATE TABLE public.student_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prn TEXT NOT NULL,
      student_name TEXT NOT NULL,
      cm_course_name TEXT NOT NULL,
      semester TEXT NOT NULL,
      paper_code TEXT NOT NULL,
      sm_subject_name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      exam_year TEXT NOT NULL,
      total_theory DECIMAL(5,2) DEFAULT 0,
      total_practical DECIMAL(5,2) DEFAULT 0,
      total_skills DECIMAL(5,2) DEFAULT 0,
      total_marks_obtained DECIMAL(6,2) DEFAULT 0,
      total_marks_max DECIMAL(6,2) DEFAULT 0,
      percentage DECIMAL(5,2) DEFAULT 0,
      grade TEXT, -- 'O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'
      grade_point DECIMAL(3,2) DEFAULT 0,
      credits INTEGER DEFAULT 0,
      result_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PASS', 'FAIL', 'ABSENT', 'WITHHELD'
      computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      computed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
  );

  CREATE INDEX idx_student_results_prn ON public.student_results(prn);
  CREATE INDEX idx_student_results_course_sem ON public.student_results(cm_course_name, semester);
  CREATE INDEX idx_student_results_paper ON public.student_results(paper_code);
  CREATE UNIQUE INDEX uq_student_results_unique ON public.student_results(prn, cm_course_name, semester, paper_code, academic_year, exam_year);

  -- ============================================================================
  -- 8. SGPA Table (Semester Grade Point Average per student per semester)
  -- ============================================================================
  CREATE TABLE public.student_sgpa (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prn TEXT NOT NULL,
      student_name TEXT NOT NULL,
      cm_course_name TEXT NOT NULL,
      semester TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      exam_year TEXT NOT NULL,
      total_credits INTEGER DEFAULT 0,
      total_grade_points DECIMAL(8,4) DEFAULT 0,
      sgpa DECIMAL(4,2) DEFAULT 0,
      result_status TEXT DEFAULT 'PENDING', -- 'PASS', 'FAIL', 'ATKT'
      computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      computed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
  );

  CREATE INDEX idx_student_sgpa_prn ON public.student_sgpa(prn);
  CREATE INDEX idx_student_sgpa_course_sem ON public.student_sgpa(cm_course_name, semester);
  CREATE UNIQUE INDEX uq_student_sgpa_unique ON public.student_sgpa(prn, cm_course_name, semester, academic_year, exam_year);

  -- ============================================================================
  -- 9. CGPA Table (Cumulative Grade Point Average per student)
  -- ============================================================================
  CREATE TABLE public.student_cgpa (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prn TEXT NOT NULL,
      student_name TEXT NOT NULL,
      cm_course_name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      total_credits INTEGER DEFAULT 0,
      total_grade_points DECIMAL(10,4) DEFAULT 0,
      cgpa DECIMAL(4,2) DEFAULT 0,
      semesters_completed INTEGER DEFAULT 0,
      computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      computed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
  );

  CREATE INDEX idx_student_cgpa_prn ON public.student_cgpa(prn);
  CREATE INDEX idx_student_cgpa_course ON public.student_cgpa(cm_course_name);
  CREATE UNIQUE INDEX uq_student_cgpa_unique ON public.student_cgpa(prn, cm_course_name, academic_year);

  -- ============================================================================
  -- 10. Course Master Table (LTPS & Marks Configuration)
  -- ============================================================================
  CREATE TABLE public.course_master (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      cat1_max DECIMAL(5,2) DEFAULT 0,
      cat1_min DECIMAL(5,2) DEFAULT 0,
      cat2_max DECIMAL(5,2) DEFAULT 0,
      cat2_min DECIMAL(5,2) DEFAULT 0,
      cat3_max DECIMAL(5,2) DEFAULT 0,
      cat3_min DECIMAL(5,2) DEFAULT 0,
      cap1_max DECIMAL(5,2) DEFAULT 0,
      cap1_min DECIMAL(5,2) DEFAULT 0,
      cap2_max DECIMAL(5,2) DEFAULT 0,
      cap2_min DECIMAL(5,2) DEFAULT 0,
      cap3_max DECIMAL(5,2) DEFAULT 0,
      cap3_min DECIMAL(5,2) DEFAULT 0,
      cas1_max DECIMAL(5,2) DEFAULT 0,
      cas1_min DECIMAL(5,2) DEFAULT 0,
      cas2_max DECIMAL(5,2) DEFAULT 0,
      cas2_min DECIMAL(5,2) DEFAULT 0,
      cas3_max DECIMAL(5,2) DEFAULT 0,
      cas3_min DECIMAL(5,2) DEFAULT 0,
      cat_max_marks DECIMAL(5,2) DEFAULT 0,
      cat_min_marks DECIMAL(5,2) DEFAULT 0,
      est_max_marks DECIMAL(5,2) DEFAULT 0,
      est_min_marks DECIMAL(5,2) DEFAULT 0,
      cap_max_marks DECIMAL(5,2) DEFAULT 0,
      cap_min_marks DECIMAL(5,2) DEFAULT 0,
      esp_max_marks DECIMAL(5,2) DEFAULT 0,
      esp_min_marks DECIMAL(5,2) DEFAULT 0,
      ess_max_marks DECIMAL(5,2) DEFAULT 0,
      ess_min_marks DECIMAL(5,2) DEFAULT 0,
      ia_max_marks DECIMAL(5,2) DEFAULT 0,
      ia_min_marks DECIMAL(5,2) DEFAULT 0,
      total_marks DECIMAL(6,2) DEFAULT 0,
      total_marks_min DECIMAL(6,2) DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_course_master_course_sem ON public.course_master(cm_course_name, semester);
  CREATE INDEX idx_course_master_paper ON public.course_master(paper_code);
  CREATE UNIQUE INDEX uq_course_master_unique ON public.course_master(cm_course_name, semester, paper_code);

  -- ============================================================================
  -- RLS POLICIES: student_marks, student_results, student_sgpa, student_cgpa, course_master
  -- ============================================================================
  ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.student_sgpa ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.student_cgpa ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.course_master ENABLE ROW LEVEL SECURITY;

  -- Student Marks: Super Admins manage all; Coordinators see their program's marks
  CREATE POLICY "Student marks select policy"
  ON public.student_marks FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.programs 
      WHERE program_code = public.student_marks.cm_course_name
      AND (primary_coordinator_id = auth.uid() OR alternate_coordinator_id = auth.uid())
    )
  );

  CREATE POLICY "Super Admins can manage student marks"
  ON public.student_marks FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

  -- Student Results: Super Admins manage all; Coordinators see their program's results
  CREATE POLICY "Student results select policy"
  ON public.student_results FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.programs 
      WHERE program_code = public.student_results.cm_course_name
      AND (primary_coordinator_id = auth.uid() OR alternate_coordinator_id = auth.uid())
    )
  );

  CREATE POLICY "Super Admins can manage student results"
  ON public.student_results FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

  -- Student SGPA: Super Admins manage all; Coordinators see their program's SGPA
  CREATE POLICY "Student SGPA select policy"
  ON public.student_sgpa FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.programs 
      WHERE program_code = public.student_sgpa.cm_course_name
      AND (primary_coordinator_id = auth.uid() OR alternate_coordinator_id = auth.uid())
    )
  );

  CREATE POLICY "Super Admins can manage student SGPA"
  ON public.student_sgpa FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

  -- Student CGPA: Super Admins manage all; Coordinators see their program's CGPA
  CREATE POLICY "Student CGPA select policy"
  ON public.student_cgpa FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.programs 
      WHERE program_code = public.student_cgpa.cm_course_name
      AND (primary_coordinator_id = auth.uid() OR alternate_coordinator_id = auth.uid())
    )
  );

  CREATE POLICY "Super Admins can manage student CGPA"
  ON public.student_cgpa FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

  -- Course Master: Super Admins manage all; Coordinators can view
  CREATE POLICY "Course master select policy"
  ON public.course_master FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.programs 
      WHERE program_code = public.course_master.cm_course_name
      AND (primary_coordinator_id = auth.uid() OR alternate_coordinator_id = auth.uid())
    )
  );

  CREATE POLICY "Super Admins can manage course master"
  ON public.course_master FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

  -- ============================================================================
  -- 11. SEED DEFAULT USERS (Run this only once for fresh setup)
  -- ============================================================================

  DO $$
  DECLARE
    v_coe_id uuid;
    v_dycoe_id uuid;
    v_acoe_id uuid;
    v_coord_id uuid;
  BEGIN
    -- 1. Get or Create COE
    SELECT id INTO v_coe_id FROM auth.users WHERE email = 'coe@sspu.edu.in';
    IF v_coe_id IS NULL THEN
      v_coe_id := gen_random_uuid();
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES (v_coe_id, '00000000-0000-0000-0000-000000000000', 'coe@sspu.edu.in', crypt('Admin@123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', NOW(), NOW(), 'authenticated', '', '', '', '');
    END IF;

    -- 2. Get or Create DYCOE
    SELECT id INTO v_dycoe_id FROM auth.users WHERE email = 'dycoe@sspu.edu.in';
    IF v_dycoe_id IS NULL THEN
      v_dycoe_id := gen_random_uuid();
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES (v_dycoe_id, '00000000-0000-0000-0000-000000000000', 'dycoe@sspu.edu.in', crypt('Admin@123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', NOW(), NOW(), 'authenticated', '', '', '', '');
    END IF;

    -- 3. Get or Create ACOE
    SELECT id INTO v_acoe_id FROM auth.users WHERE email = 'acoe@sspu.edu.in';
    IF v_acoe_id IS NULL THEN
      v_acoe_id := gen_random_uuid();
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES (v_acoe_id, '00000000-0000-0000-0000-000000000000', 'acoe@sspu.edu.in', crypt('Admin@123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', NOW(), NOW(), 'authenticated', '', '', '', '');
    END IF;

    -- 4. Get or Create COORDINATOR
    SELECT id INTO v_coord_id FROM auth.users WHERE email = 'coord@sspu.edu.in';
    IF v_coord_id IS NULL THEN
      v_coord_id := gen_random_uuid();
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES (v_coord_id, '00000000-0000-0000-0000-000000000000', 'coord@sspu.edu.in', crypt('Admin@123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', NOW(), NOW(), 'authenticated', '', '', '', '');
    END IF;

    -- Clean up public.profiles if they exist to avoid duplicate key errors on insert
    DELETE FROM public.profiles WHERE id IN (v_coe_id, v_dycoe_id, v_acoe_id, v_coord_id);

    -- Insert into public.profiles (App-specific user details)
    INSERT INTO public.profiles (id, email, full_name, role, department, phone, title)
    VALUES 
    (v_coe_id, 'coe@sspu.edu.in', 'Dr. A. Sharma', 'COE', 'Examination Department', '1234567890', 'Controller of Examinations'),
    (v_dycoe_id, 'dycoe@sspu.edu.in', 'Prof. B. Verma', 'DYCOE', 'Examination Department', '1234567890', 'Deputy Controller'),
    (v_acoe_id, 'acoe@sspu.edu.in', 'Dr. C. Gupta', 'ACOE', 'Examination Department', '1234567890', 'Asst. Controller'),
    (v_coord_id, 'coord@sspu.edu.in', 'Prof. D. Patel', 'COORDINATOR', 'School of Engineering', '1234567890', 'Exam Coordinator');
  END $$;

