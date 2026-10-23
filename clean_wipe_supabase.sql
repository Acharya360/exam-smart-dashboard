-- ============================================================================
-- Acharya360 ExamTrack - Supabase Wipe / Reset Script
-- Drops all existing tables, foreign keys, views, and custom enums in public schema
-- ============================================================================

-- 1. Dynamic cascade wipe of all existing user tables in public schema
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- 2. Dynamic cascade wipe of all custom public enums
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- 3. Explicit drop safeguard for all known project tables
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

-- Verification of remaining tables in public schema (should return 0 rows)
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
