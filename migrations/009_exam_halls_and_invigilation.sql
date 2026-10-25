-- Migration 009: Examination Halls, Seating & Invigilation Duty
-- Adds the Classroom Master, Invigilator Master, allocation runs, room packing
-- and duty allotment tables used by the Halls, Seating & Invigilation module.
-- Additive only: no existing table is altered or dropped.

IF OBJECT_ID('dbo.exam_classrooms') IS NULL
CREATE TABLE dbo.exam_classrooms (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    centre nvarchar(255) NOT NULL,
    building_name nvarchar(255) NOT NULL,
    floor_number nvarchar(50) NULL,
    room_number nvarchar(100) NOT NULL,
    room_name nvarchar(255) NULL,
    capacity int NOT NULL CHECK (capacity > 0),
    invigilators_required int NOT NULL DEFAULT 1 CHECK (invigilators_required >= 0),
    room_type nvarchar(50) NOT NULL DEFAULT 'Classroom',
    available_for_exam bit NOT NULL DEFAULT 1,
    is_active bit NOT NULL DEFAULT 1,
    remarks nvarchar(1000) NULL,
    created_by nvarchar(100) NULL,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by nvarchar(100) NULL,
    updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_classrooms_centre_building_room UNIQUE (centre, building_name, room_number)
);
CREATE NONCLUSTERED INDEX idx_classrooms_centre ON dbo.exam_classrooms(centre);

IF OBJECT_ID('dbo.invigilators') IS NULL
CREATE TABLE dbo.invigilators (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    employee_id nvarchar(100) NOT NULL,
    employee_name nvarchar(255) NOT NULL,
    department nvarchar(255) NULL,
    designation nvarchar(100) NULL,
    contact nvarchar(100) NULL,
    is_active bit NOT NULL DEFAULT 1,
    is_available bit NOT NULL DEFAULT 1,
    eligible_slots nvarchar(500) NULL,
    max_duties_per_day int NOT NULL DEFAULT 2 CHECK (max_duties_per_day >= 1),
    restrictions nvarchar(500) NULL,
    created_by nvarchar(100) NULL,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by nvarchar(100) NULL,
    updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_invigilators_employee UNIQUE (employee_id)
);

IF OBJECT_ID('dbo.allocation_runs') IS NULL
CREATE TABLE dbo.allocation_runs (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    name nvarchar(255) NOT NULL,
    session_id nvarchar(100) NULL,
    exam_type nvarchar(50) NOT NULL DEFAULT 'All',
    date_from nvarchar(50) NULL,
    date_to nvarchar(50) NULL,
    programme_filter nvarchar(max) NULL,
    strategy nvarchar(50) NOT NULL DEFAULT 'OPTIMISE_UTILISATION',
    status nvarchar(20) NOT NULL DEFAULT 'DRAFT',
    totals_json nvarchar(max) NULL,
    warnings_json nvarchar(max) NULL,
    generated_by nvarchar(100) NULL,
    generated_at datetime2 NULL,
    confirmed_by nvarchar(100) NULL,
    confirmed_at datetime2 NULL,
    published_by nvarchar(100) NULL,
    published_at datetime2 NULL,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.classroom_allocations') IS NULL
CREATE TABLE dbo.classroom_allocations (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    run_id nvarchar(100) NOT NULL,
    classroom_id nvarchar(100) NOT NULL,
    program_code nvarchar(100) NOT NULL,
    program_name nvarchar(255) NOT NULL,
    semester int NOT NULL,
    paper_code nvarchar(100) NOT NULL,
    course_name nvarchar(255) NOT NULL,
    exam_date nvarchar(50) NOT NULL,
    slot_key nvarchar(100) NOT NULL,
    am_pm nvarchar(10) NOT NULL,
    exam_time nvarchar(100) NOT NULL,
    exam_type nvarchar(50) NOT NULL,
    students int NOT NULL CHECK (students >= 0),
    invigilators_required int NOT NULL DEFAULT 0,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_alloc_run FOREIGN KEY (run_id) REFERENCES dbo.allocation_runs(id) ON DELETE CASCADE,
    CONSTRAINT FK_alloc_classroom FOREIGN KEY (classroom_id) REFERENCES dbo.exam_classrooms(id)
);
CREATE NONCLUSTERED INDEX idx_alloc_run ON dbo.classroom_allocations(run_id);
CREATE NONCLUSTERED INDEX idx_alloc_slot ON dbo.classroom_allocations(exam_date, slot_key);

IF OBJECT_ID('dbo.invigilator_duties') IS NULL
CREATE TABLE dbo.invigilator_duties (
    id nvarchar(100) NOT NULL PRIMARY KEY,
    allocation_id nvarchar(100) NOT NULL,
    invigilator_id nvarchar(100) NOT NULL,
    duty_type nvarchar(50) NOT NULL DEFAULT 'Invigilator',
    assigned_by nvarchar(100) NULL,
    assigned_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    note nvarchar(500) NULL,
    CONSTRAINT FK_duty_alloc FOREIGN KEY (allocation_id) REFERENCES dbo.classroom_allocations(id) ON DELETE CASCADE,
    CONSTRAINT FK_duty_invigilator FOREIGN KEY (invigilator_id) REFERENCES dbo.invigilators(id),
    CONSTRAINT UQ_duty_alloc_invigilator UNIQUE (allocation_id, invigilator_id)
);
CREATE NONCLUSTERED INDEX idx_duty_invigilator ON dbo.invigilator_duties(invigilator_id);
