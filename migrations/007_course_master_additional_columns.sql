-- Migration 007: Add extended academic and curriculum columns to dbo.course_master
-- Additive only: academic_period, term, program_code, regulation_group, subject_type, student_count, cas_max_marks, cas_min_marks

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.course_master') AND name = 'academic_period')
    ALTER TABLE dbo.course_master ADD academic_period NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.course_master') AND name = 'term')
    ALTER TABLE dbo.course_master ADD term NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.course_master') AND name = 'program_code')
    ALTER TABLE dbo.course_master ADD program_code NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.course_master') AND name = 'regulation_group')
    ALTER TABLE dbo.course_master ADD regulation_group NVARCHAR(255) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.course_master') AND name = 'subject_type')
    ALTER TABLE dbo.course_master ADD subject_type NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.course_master') AND name = 'student_count')
    ALTER TABLE dbo.course_master ADD student_count INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.course_master') AND name = 'cas_max_marks')
    ALTER TABLE dbo.course_master ADD cas_max_marks DECIMAL(5,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.course_master') AND name = 'cas_min_marks')
    ALTER TABLE dbo.course_master ADD cas_min_marks DECIMAL(5,2) DEFAULT 0;
