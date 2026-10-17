-- ============================================================================
-- SSPU_Exam Local SQL Server Database Schema
-- Server: acharya360\SQLEXPRESS
-- Database: SSPU_Exam
-- ============================================================================

-- 1. Create Database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SSPU_Exam')
BEGIN
    CREATE DATABASE [SSPU_Exam];
END
GO

USE [SSPU_Exam];
GO

-- 2. Drop existing foreign keys & tables if they exist for clean setup
IF OBJECT_ID('dbo.student_marks', 'U') IS NOT NULL DROP TABLE dbo.student_marks;
IF OBJECT_ID('dbo.course_master', 'U') IS NOT NULL DROP TABLE dbo.course_master;
IF OBJECT_ID('dbo.exam_tasks', 'U') IS NOT NULL DROP TABLE dbo.exam_tasks;
IF OBJECT_ID('dbo.exam_schedules', 'U') IS NOT NULL DROP TABLE dbo.exam_schedules;
IF OBJECT_ID('dbo.programs', 'U') IS NOT NULL DROP TABLE dbo.programs;
IF OBJECT_ID('dbo.profiles', 'U') IS NOT NULL DROP TABLE dbo.profiles;
GO

-- 3. Profiles Table (Faculty & Administrative Users)
CREATE TABLE dbo.profiles (
    id NVARCHAR(100) NOT NULL PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password NVARCHAR(255) NULL,
    full_name NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'COORDINATOR', -- COE, DYCOE, ACOE, COORDINATOR
    title NVARCHAR(255) NULL,
    department NVARCHAR(255) NULL,
    phone NVARCHAR(50) NULL,
    last_password_change NVARCHAR(50) NULL,
    password_changed_by NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
CREATE NONCLUSTERED INDEX idx_profiles_role ON dbo.profiles(role);
CREATE NONCLUSTERED INDEX idx_profiles_email ON dbo.profiles(email);
GO

-- 4. Programs Table (Academic Program Mappings)
CREATE TABLE dbo.programs (
    id NVARCHAR(100) NOT NULL PRIMARY KEY,
    sr_no INT NULL,
    program_code NVARCHAR(100) NOT NULL UNIQUE,
    program_name NVARCHAR(255) NOT NULL,
    school_name NVARCHAR(255) NOT NULL,
    primary_coordinator_id NVARCHAR(100) NULL,
    alternate_coordinator_id NVARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_programs_primary FOREIGN KEY (primary_coordinator_id) REFERENCES dbo.profiles(id) ON DELETE SET NULL,
    CONSTRAINT FK_programs_alternate FOREIGN KEY (alternate_coordinator_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX idx_programs_code ON dbo.programs(program_code);
CREATE NONCLUSTERED INDEX idx_programs_primary ON dbo.programs(primary_coordinator_id);
CREATE NONCLUSTERED INDEX idx_programs_alternate ON dbo.programs(alternate_coordinator_id);
GO

-- 5. Exam Schedules Table (Timetables)
CREATE TABLE dbo.exam_schedules (
    id NVARCHAR(100) NOT NULL PRIMARY KEY,
    pkg_no INT NOT NULL,
    logic1 NVARCHAR(500) NULL,
    cm_school_name NVARCHAR(255) NOT NULL,
    cm_course_name NVARCHAR(255) NOT NULL,
    program_code NVARCHAR(100) NOT NULL,
    semester INT NOT NULL,
    elective NVARCHAR(255) NULL,
    paper_code NVARCHAR(100) NOT NULL,
    sm_subject_name NVARCHAR(255) NOT NULL,
    student_count INT NOT NULL DEFAULT 0,
    regular_count INT NOT NULL DEFAULT 0,
    backlog_count INT NOT NULL DEFAULT 0,
    exam_day INT NOT NULL DEFAULT 1,
    exam_date NVARCHAR(50) NOT NULL,
    date_odd_even NVARCHAR(100) NULL,
    am_pm NVARCHAR(10) NOT NULL DEFAULT 'AM',
    exam_time NVARCHAR(100) NOT NULL,
    exam_type NVARCHAR(50) NOT NULL DEFAULT 'Regular',
    exam_year NVARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_schedules_program FOREIGN KEY (program_code) REFERENCES dbo.programs(program_code) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX idx_schedules_program ON dbo.exam_schedules(program_code);
CREATE NONCLUSTERED INDEX idx_schedules_date ON dbo.exam_schedules(exam_date);
CREATE NONCLUSTERED INDEX idx_schedules_paper ON dbo.exam_schedules(paper_code);
GO

-- 6. Exam Tasks Table (4-Phase Operational Milestones)
CREATE TABLE dbo.exam_tasks (
    id NVARCHAR(100) NOT NULL PRIMARY KEY,
    schedule_id NVARCHAR(100) NOT NULL,
    program_code NVARCHAR(100) NOT NULL,
    task_title NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
    assigned_to NVARCHAR(100) NULL,
    alternate_user_id NVARCHAR(100) NULL,
    notes NVARCHAR(MAX) NULL,
    due_date NVARCHAR(50) NULL,
    escalated_at NVARCHAR(50) NULL,
    escalation_reason NVARCHAR(MAX) NULL,
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_tasks_schedule FOREIGN KEY (schedule_id) REFERENCES dbo.exam_schedules(id) ON DELETE CASCADE,
    CONSTRAINT FK_tasks_assigned FOREIGN KEY (assigned_to) REFERENCES dbo.profiles(id) ON DELETE SET NULL,
    CONSTRAINT FK_tasks_alternate FOREIGN KEY (alternate_user_id) REFERENCES dbo.profiles(id) ON DELETE NO ACTION
);
CREATE NONCLUSTERED INDEX idx_tasks_schedule ON dbo.exam_tasks(schedule_id);
CREATE NONCLUSTERED INDEX idx_tasks_assigned ON dbo.exam_tasks(assigned_to);
CREATE NONCLUSTERED INDEX idx_tasks_status ON dbo.exam_tasks(status);
GO

-- 7. Course Master Table (Subject configuration, credits & mark caps)
CREATE TABLE dbo.course_master (
    id NVARCHAR(100) NOT NULL PRIMARY KEY,
    sr_no INT NULL,
    cm_course_name NVARCHAR(255) NOT NULL,
    semester NVARCHAR(50) NOT NULL,
    paper_code NVARCHAR(100) NOT NULL,
    sm_subject_name NVARCHAR(255) NOT NULL,
    l INT DEFAULT 0,
    t INT DEFAULT 0,
    p INT DEFAULT 0,
    s INT DEFAULT 0,
    total_credits DECIMAL(5,2) DEFAULT 0,
    cat_max_marks DECIMAL(5,2) DEFAULT 0,
    cat_min_marks DECIMAL(5,2) DEFAULT 0,
    est_max_marks DECIMAL(5,2) DEFAULT 0,
    est_min_marks DECIMAL(5,2) DEFAULT 0,
    cap_max_marks DECIMAL(5,2) DEFAULT 0,
    cap_min_marks DECIMAL(5,2) DEFAULT 0,
    esp_max_marks DECIMAL(5,2) DEFAULT 0,
    esp_min_marks DECIMAL(5,2) DEFAULT 0,
    ia_max_marks DECIMAL(5,2) DEFAULT 0,
    ia_min_marks DECIMAL(5,2) DEFAULT 0,
    total_marks DECIMAL(5,2) DEFAULT 0,
    total_marks_min DECIMAL(5,2) DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
CREATE NONCLUSTERED INDEX idx_cm_paper ON dbo.course_master(paper_code);
CREATE NONCLUSTERED INDEX idx_cm_course ON dbo.course_master(cm_course_name);
GO

-- 8. Student Marks Table (Component-wise assessment marks)
CREATE TABLE dbo.student_marks (
    id NVARCHAR(100) NOT NULL PRIMARY KEY,
    prn NVARCHAR(100) NOT NULL,
    student_name NVARCHAR(255) NOT NULL,
    cm_course_name NVARCHAR(255) NOT NULL,
    semester NVARCHAR(50) NOT NULL,
    paper_code NVARCHAR(100) NOT NULL,
    sm_subject_name NVARCHAR(255) NOT NULL,
    academic_year NVARCHAR(50) NOT NULL,
    exam_year NVARCHAR(50) NOT NULL,
    assessment_type NVARCHAR(50) NOT NULL,
    theory DECIMAL(6,2) DEFAULT 0,
    practical DECIMAL(6,2) DEFAULT 0,
    skills DECIMAL(6,2) DEFAULT 0,
    uploaded_by NVARCHAR(100) NULL,
    uploaded_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
CREATE NONCLUSTERED INDEX idx_sm_prn ON dbo.student_marks(prn);
CREATE NONCLUSTERED INDEX idx_sm_paper ON dbo.student_marks(paper_code);
CREATE NONCLUSTERED INDEX idx_sm_assessment ON dbo.student_marks(assessment_type);
CREATE NONCLUSTERED INDEX idx_sm_course_sem ON dbo.student_marks(cm_course_name, semester);
GO
