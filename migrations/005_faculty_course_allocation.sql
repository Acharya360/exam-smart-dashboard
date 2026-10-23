-- Migration 005: Faculty Course Allocations for Teaching Staff against Course Master
-- Maps teaching faculty and co-instructors directly to course master subjects and sections

IF OBJECT_ID('dbo.faculty_course_allocations') IS NULL
CREATE TABLE dbo.faculty_course_allocations (
    id NVARCHAR(100) NOT NULL PRIMARY KEY,
    course_master_id NVARCHAR(100) NULL,
    subject_code NVARCHAR(100) NOT NULL,
    subject_name NVARCHAR(255) NOT NULL,
    staff_code NVARCHAR(50) NOT NULL,
    staff_name NVARCHAR(255) NOT NULL,
    additional_staff NVARCHAR(500) NULL,
    section NVARCHAR(50) NOT NULL DEFAULT 'A',
    semester NVARCHAR(50) NOT NULL,
    program_name NVARCHAR(255) NOT NULL,
    academic_year NVARCHAR(50) NOT NULL DEFAULT '2025-2026',
    department NVARCHAR(255) NULL,
    workload_hours INT NOT NULL DEFAULT 4,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fac_alloc_subject' AND object_id = OBJECT_ID('dbo.faculty_course_allocations'))
CREATE NONCLUSTERED INDEX idx_fac_alloc_subject ON dbo.faculty_course_allocations(subject_code);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fac_alloc_staff' AND object_id = OBJECT_ID('dbo.faculty_course_allocations'))
CREATE NONCLUSTERED INDEX idx_fac_alloc_staff ON dbo.faculty_course_allocations(staff_code);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fac_alloc_program' AND object_id = OBJECT_ID('dbo.faculty_course_allocations'))
CREATE NONCLUSTERED INDEX idx_fac_alloc_program ON dbo.faculty_course_allocations(program_name);

-- Seed initial faculty allocations for Course Master subjects
IF NOT EXISTS (SELECT 1 FROM dbo.faculty_course_allocations WHERE id = 'fac-alloc-001')
BEGIN
    INSERT INTO dbo.faculty_course_allocations 
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
    ('fac-alloc-013', NULL, 'EE602', 'Power Systems & Smart Grids', 'T7105', 'Dr. Arun Kumar', NULL, 'A', 'VI', 'B.Tech. Electrical & Electronics', '2025-2026', 'School of Electrical Engineering', 4),
    ('fac-alloc-014', NULL, 'ARCH0201', 'Architectural Design-I', 'T7386', 'Prof. Sharvari Suryawanshi', 'T7379 - Pashmeena Ghom, T7610 - Mayuri Deodhar', 'A', 'II', 'B.Arch (Bachelor of Architecture)', '2025-2026', 'School of Architecture & Planning', 6),
    ('fac-alloc-015', NULL, 'ARCH0202', 'Graphics and Visualization-II', 'T7214', 'Prof. Pritishma Kakoty', 'T7620 - Vaishnavi Gawande', 'A', 'II', 'B.Arch (Bachelor of Architecture)', '2025-2026', 'School of Architecture & Planning', 4),
    ('fac-alloc-016', NULL, 'ARCH0203', 'Building Materials & Construction-II', 'T7465', 'Prof. Rutusha Ladha', 'T7610 - Mayuri Deodhar', 'A', 'II', 'B.Arch (Bachelor of Architecture)', '2025-2026', 'School of Architecture & Planning', 4);
END;
