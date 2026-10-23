IF OBJECT_ID('dbo.timetable_sessions') IS NULL
CREATE TABLE dbo.timetable_sessions (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    name nvarchar(255) NOT NULL,
    basis nvarchar(20) NOT NULL DEFAULT 'Both',
    odd_start_date_1 date NULL,
    odd_start_date_2 date NULL,
    even_start_date_1 date NULL,
    even_start_date_2 date NULL,
    holidays_json nvarchar(max) NULL,
    has_break_day bit NOT NULL DEFAULT 0,
    use_calendar_dates bit NOT NULL DEFAULT 1,
    is_active bit NOT NULL DEFAULT 1,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.timetable_slots') IS NULL
CREATE TABLE dbo.timetable_slots (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    session_id nvarchar(100) NOT NULL,
    semester nvarchar(20) NOT NULL,
    slot_name nvarchar(50) NOT NULL,
    slot_time nvarchar(100) NOT NULL,
    odd_even nvarchar(20) NOT NULL,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.timetable_electives') IS NULL
CREATE TABLE dbo.timetable_electives (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    session_id nvarchar(100) NOT NULL,
    group_name nvarchar(100) NOT NULL,
    course_codes nvarchar(max) NOT NULL,
    is_fuzzy bit NOT NULL DEFAULT 0,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.timetable_student_records') IS NULL
CREATE TABLE dbo.timetable_student_records (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    session_id nvarchar(100) NOT NULL,
    centre nvarchar(255) NOT NULL,
    program nvarchar(255) NOT NULL,
    specialization nvarchar(255) NULL,
    semester nvarchar(50) NOT NULL,
    prn nvarchar(100) NOT NULL,
    student_name nvarchar(255) NOT NULL,
    official_email nvarchar(255) NULL,
    course_code nvarchar(100) NOT NULL,
    course_title nvarchar(255) NOT NULL,
    course_type nvarchar(50) NULL DEFAULT 'REGULAR',
    internal_external nvarchar(50) NULL DEFAULT 'EXTERNAL',
    application_status nvarchar(50) NULL DEFAULT 'APPLIED',
    is_applied bit NOT NULL DEFAULT 1,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.timetable_generated_schedules') IS NULL
CREATE TABLE dbo.timetable_generated_schedules (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    session_id nvarchar(100) NOT NULL,
    school_name nvarchar(255) NOT NULL,
    program_name nvarchar(255) NOT NULL,
    specialization nvarchar(255) NULL,
    semester nvarchar(50) NOT NULL,
    odd_even nvarchar(20) NOT NULL,
    slot_name nvarchar(50) NOT NULL,
    slot_time nvarchar(100) NOT NULL,
    course_code nvarchar(100) NOT NULL,
    course_name nvarchar(255) NOT NULL,
    exam_date nvarchar(100) NOT NULL,
    exam_day nvarchar(50) NOT NULL,
    applied_students int NOT NULL DEFAULT 0,
    not_applied_students int NOT NULL DEFAULT 0,
    total_students int NOT NULL DEFAULT 0,
    is_manual_override bit NOT NULL DEFAULT 0,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.timetable_manual_overrides') IS NULL
CREATE TABLE dbo.timetable_manual_overrides (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    session_id nvarchar(100) NOT NULL,
    course_key nvarchar(500) NOT NULL,
    exam_date nvarchar(100) NOT NULL,
    exam_day nvarchar(50) NOT NULL,
    slot_name nvarchar(50) NOT NULL,
    slot_time nvarchar(100) NOT NULL,
    updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
