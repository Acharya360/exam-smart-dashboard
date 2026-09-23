export const SUPABASE_SQL_MIGRATION = `-- ============================================================================
-- EXAM DEPARTMENT TRACK DASHBOARD & TASK MANAGEMENT SYSTEM
-- PostgreSQL Schema & Supabase Row-Level Security (RLS) Migration
-- ============================================================================

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
`;
