IF OBJECT_ID('dbo.exam_environment') IS NULL CREATE TABLE dbo.exam_environment(id int PRIMARY KEY CHECK(id=1),data_mode nvarchar(20) NOT NULL,backup_path nvarchar(2000) NULL);
IF OBJECT_ID('dbo.exam_students') IS NULL CREATE TABLE dbo.exam_students(prn nvarchar(100) PRIMARY KEY,student_name nvarchar(255) NOT NULL,updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
IF COL_LENGTH('dbo.student_marks','theory_absent') IS NULL ALTER TABLE dbo.student_marks ADD theory_absent bit NOT NULL DEFAULT 0, practical_absent bit NOT NULL DEFAULT 0, skills_absent bit NOT NULL DEFAULT 0;
IF OBJECT_ID('dbo.exam_course_settings') IS NULL
CREATE TABLE dbo.exam_course_settings (
 course_id nvarchar(100) PRIMARY KEY, program_id nvarchar(100) NULL,
 scheme_json nvarchar(max) NULL, updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
IF OBJECT_ID('dbo.exam_registrations') IS NULL
CREATE TABLE dbo.exam_registrations (
 id int IDENTITY PRIMARY KEY, prn nvarchar(100) NOT NULL, student_name nvarchar(255) NOT NULL,
 cm_course_name nvarchar(255) NOT NULL, semester nvarchar(50) NOT NULL,
 paper_code nvarchar(100) NOT NULL, academic_year nvarchar(50) NOT NULL, exam_year nvarchar(100) NOT NULL,
 course_id nvarchar(100) NULL, program_id nvarchar(100) NULL,
 CONSTRAINT UQ_exam_registration UNIQUE(prn,cm_course_name,semester,paper_code,academic_year,exam_year));
IF OBJECT_ID('dbo.exam_processing_audit') IS NULL
CREATE TABLE dbo.exam_processing_audit (
 id int IDENTITY PRIMARY KEY, action nvarchar(100) NOT NULL, actor nvarchar(100) NOT NULL,
 detail nvarchar(max) NOT NULL, created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
IF COL_LENGTH('dbo.course_master','grading_category') IS NULL ALTER TABLE dbo.course_master ADD grading_category nvarchar(50) NOT NULL DEFAULT 'Non-Architecture';
IF COL_LENGTH('dbo.course_master','cat1_max') IS NULL ALTER TABLE dbo.course_master ADD
  cat1_max decimal(5,2) NOT NULL DEFAULT 0, cat1_min decimal(5,2) NOT NULL DEFAULT 0,
  cat2_max decimal(5,2) NOT NULL DEFAULT 0, cat2_min decimal(5,2) NOT NULL DEFAULT 0,
  cat3_max decimal(5,2) NOT NULL DEFAULT 0, cat3_min decimal(5,2) NOT NULL DEFAULT 0,
  cap1_max decimal(5,2) NOT NULL DEFAULT 0, cap1_min decimal(5,2) NOT NULL DEFAULT 0,
  cap2_max decimal(5,2) NOT NULL DEFAULT 0, cap2_min decimal(5,2) NOT NULL DEFAULT 0,
  cap3_max decimal(5,2) NOT NULL DEFAULT 0, cap3_min decimal(5,2) NOT NULL DEFAULT 0,
  cas1_max decimal(5,2) NOT NULL DEFAULT 0, cas1_min decimal(5,2) NOT NULL DEFAULT 0,
  cas2_max decimal(5,2) NOT NULL DEFAULT 0, cas2_min decimal(5,2) NOT NULL DEFAULT 0,
  cas3_max decimal(5,2) NOT NULL DEFAULT 0, cas3_min decimal(5,2) NOT NULL DEFAULT 0,
  ess_max_marks decimal(5,2) NOT NULL DEFAULT 0, ess_min_marks decimal(5,2) NOT NULL DEFAULT 0;
