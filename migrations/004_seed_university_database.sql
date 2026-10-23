-- Migration 004: Seed Complete University Programs and Master Records into SQL Server Database
-- Guarantees zero hardcoding: all programs, schools, and student records reside directly in dbo.programs and dbo.timetable_student_records

-- 1. Ensure all University Programs exist in dbo.programs
IF NOT EXISTS (SELECT 1 FROM dbo.programs WHERE id = 'prog-5')
BEGIN
    INSERT INTO dbo.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id)
    VALUES ('prog-5', 5, 'BSC-ASA', 'B.Sc. Applied Sciences & Analytics', 'School of Science', 'user-coord-1', 'user-coord-2');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.programs WHERE id = 'prog-6')
BEGIN
    INSERT INTO dbo.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id)
    VALUES ('prog-6', 6, 'BBA', 'BBA (Bachelor of Business Administration)', 'School of Management', 'user-coord-2', 'user-coord-3');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.programs WHERE id = 'prog-7')
BEGIN
    INSERT INTO dbo.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id)
    VALUES ('prog-7', 7, 'MBA', 'MBA (Master of Business Administration)', 'School of Management', 'user-coord-3', 'user-coord-1');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.programs WHERE id = 'prog-8')
BEGIN
    INSERT INTO dbo.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id)
    VALUES ('prog-8', 8, 'BARCH', 'B.Arch (Bachelor of Architecture)', 'School of Architecture & Planning', 'user-coord-4', 'user-coord-1');
END;

-- 2. Seed Master Student Records directly into dbo.timetable_student_records for session-default-2026 if empty
IF NOT EXISTS (SELECT 1 FROM dbo.timetable_student_records WHERE session_id = 'session-default-2026')
BEGIN
    INSERT INTO dbo.timetable_student_records 
    (id, session_id, centre, program, specialization, semester, prn, student_name, official_email, course_code, course_title, course_type, internal_external, application_status, is_applied)
    VALUES
    -- Construction Engineering
    ('rec-001', 'session-default-2026', 'School of Construction Engineering and Infrastructure Management', 'B.Tech. Construction Engineering & Management', 'Structural Systems', '2', 'PRN2026-CEM-001', 'Aarav Sharma', 'aarav.sharma@sspu.ac.in', 'APSC102', 'Applied Physics', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-002', 'session-default-2026', 'School of Construction Engineering and Infrastructure Management', 'B.Tech. Construction Engineering & Management', 'Structural Systems', '2', 'PRN2026-CEM-002', 'Ananya Deshmukh', 'ananya.d@sspu.ac.in', 'APSC2102', 'Advanced Applied Physics', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-003', 'session-default-2026', 'School of Construction Engineering and Infrastructure Management', 'B.Tech. Construction Engineering & Management', 'Construction Tech', '2', 'PRN2026-CEM-003', 'Rohan Joshi', 'rohan.j@sspu.ac.in', 'ACEM105', 'Construction Materials', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-004', 'session-default-2026', 'School of Construction Engineering and Infrastructure Management', 'B.Tech. Construction Engineering & Management', 'Construction Tech', '2', 'PRN2026-CEM-004', 'Ishaan Verma', 'ishaan.v@sspu.ac.in', 'ACEM106', 'Engineering Drawing & BIM', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),

    -- Mechatronics Engineering
    ('rec-005', 'session-default-2026', 'School of Mechatronics Engineering', 'B.Tech. Mechatronics Engineering', 'Robotics & Automation', '2', 'PRN2026-MECH-001', 'Kunal Roy', 'kunal.roy@sspu.ac.in', 'APSC2103', 'Applied Chemistry & Materials', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-006', 'session-default-2026', 'School of Mechatronics Engineering', 'B.Tech. Mechatronics Engineering', 'Robotics & Automation', '2', 'PRN2026-MECH-002', 'Neha Patil', 'neha.p@sspu.ac.in', 'MECH202', 'Sensors, Actuators & Microcontrollers', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-007', 'session-default-2026', 'School of Mechatronics Engineering', 'B.Tech. Mechatronics Engineering', 'Robotics & Automation', '2', 'PRN2026-MECH-003', 'Priya Kulkarni', 'priya.k@sspu.ac.in', 'MECH203', 'Kinematics & Dynamics of Machinery', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),

    -- Computer Science & AI
    ('rec-008', 'session-default-2026', 'School of Computer Science & Artificial Intelligence', 'B.Tech. Computer Science & AI', 'Artificial Intelligence', '4', 'PRN2026-CS-001', 'Vikram Malhotra', 'vikram.m@sspu.ac.in', 'CS401', 'Operating Systems & Concurrency', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-009', 'session-default-2026', 'School of Computer Science & Artificial Intelligence', 'B.Tech. Computer Science & AI', 'Artificial Intelligence', '4', 'PRN2026-CS-002', 'Tanvi Shah', 'tanvi.s@sspu.ac.in', 'CS402', 'Database Management Systems', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-010', 'session-default-2026', 'School of Computer Science & Artificial Intelligence', 'B.Tech. Computer Science & AI', 'Data Science', '4', 'PRN2026-CS-003', 'Kabir Mehta', 'kabir.m@sspu.ac.in', 'CS403', 'Design and Analysis of Algorithms', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-011', 'session-default-2026', 'School of Computer Science & Artificial Intelligence', 'B.Tech. Computer Science & AI', 'Artificial Intelligence', '4', 'PRN2026-CS-004', 'Aditya Sen', 'aditya.s@sspu.ac.in', 'CS404', 'Machine Learning Foundations', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),

    -- Electrical & Electronics
    ('rec-012', 'session-default-2026', 'School of Electrical & Electronics Engineering', 'B.Tech. Electrical & Electronics', 'Power Systems', '6', 'PRN2026-EE-001', 'Siddharth Nair', 'siddharth.n@sspu.ac.in', 'EE602', 'Power Systems & Smart Grids', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-013', 'session-default-2026', 'School of Electrical & Electronics Engineering', 'B.Tech. Electrical & Electronics', 'Power Systems', '6', 'PRN2026-EE-002', 'Meera Rao', 'meera.r@sspu.ac.in', 'EE603', 'Control Systems Engineering', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-014', 'session-default-2026', 'School of Electrical & Electronics Engineering', 'B.Tech. Electrical & Electronics', 'Embedded Systems', '6', 'PRN2026-EE-003', 'Rahul Ghosh', 'rahul.g@sspu.ac.in', 'EE604', 'Digital Signal Processing', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),

    -- School of Science
    ('rec-015', 'session-default-2026', 'School of Science', 'B.Sc. Applied Sciences & Analytics', 'Data Science', '1', 'PRN2026-SCI-001', 'Aditi Deshmukh', 'aditi.sci@sspu.ac.in', 'SCI101', 'Calculus and Linear Algebra', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-016', 'session-default-2026', 'School of Science', 'B.Sc. Applied Sciences & Analytics', 'Data Science', '1', 'PRN2026-SCI-001', 'Aditi Deshmukh', 'aditi.sci@sspu.ac.in', 'SCI102', 'Applied Statistical Foundations', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-017', 'session-default-2026', 'School of Science', 'B.Sc. Applied Sciences & Analytics', 'Data Science', '2', 'PRN2026-SCI-002', 'Sanjay Kulkarni', 'sanjay.k@sspu.ac.in', 'SCI201', 'Probability & Numerical Methods', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-018', 'session-default-2026', 'School of Science', 'B.Sc. Applied Sciences & Analytics', 'Data Science', '2', 'PRN2026-SCI-002', 'Sanjay Kulkarni', 'sanjay.k@sspu.ac.in', 'SCI202', 'Data Structures and Algorithms for Science', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-019', 'session-default-2026', 'School of Science', 'B.Sc. Applied Sciences & Analytics', 'Data Science', '1', 'PRN2026-SCI-003', 'Varun Chitale', 'varun.c@sspu.ac.in', 'SCI101', 'Calculus and Linear Algebra', 'BACKLOG', 'EXTERNAL', 'APPLIED', 1),

    -- School of Management
    ('rec-020', 'session-default-2026', 'School of Management', 'BBA (Bachelor of Business Administration)', 'Finance', '1', 'PRN2026-MGMT-001', 'Nisha Singhania', 'nisha.s@sspu.ac.in', 'MGT101', 'Principles of Management & Organization', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-021', 'session-default-2026', 'School of Management', 'BBA (Bachelor of Business Administration)', 'Finance', '1', 'PRN2026-MGMT-001', 'Nisha Singhania', 'nisha.s@sspu.ac.in', 'MGT102', 'Business Accounting & Financial Analysis', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-022', 'session-default-2026', 'School of Management', 'BBA (Bachelor of Business Administration)', 'Marketing', '2', 'PRN2026-MGMT-002', 'Arjun Kapoor', 'arjun.k@sspu.ac.in', 'MGT201', 'Marketing Management & Consumer Insights', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-023', 'session-default-2026', 'School of Management', 'BBA (Bachelor of Business Administration)', 'Marketing', '2', 'PRN2026-MGMT-002', 'Arjun Kapoor', 'arjun.k@sspu.ac.in', 'MGT202', 'Macroeconomics & Global Business', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-024', 'session-default-2026', 'School of Management', 'BBA (Bachelor of Business Administration)', 'Finance', '1', 'PRN2026-MGMT-003', 'Devika Pillai', 'devika.p@sspu.ac.in', 'MGT101', 'Principles of Management & Organization', 'BACKLOG', 'EXTERNAL', 'APPLIED', 1),

    -- School of Architecture & Planning
    ('rec-025', 'session-default-2026', 'School of Architecture & Planning', 'B.Arch (Bachelor of Architecture)', 'Sustainable Urban Planning', '2', 'PRN2026-ARCH-001', 'Tanya Sengupta', 'tanya.arch@sspu.ac.in', 'ARCH201', 'History of Architecture & Culture II', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-026', 'session-default-2026', 'School of Architecture & Planning', 'B.Arch (Bachelor of Architecture)', 'Sustainable Urban Planning', '2', 'PRN2026-ARCH-001', 'Tanya Sengupta', 'tanya.arch@sspu.ac.in', 'ARCH202', 'Building Materials & Construction Tech II', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-027', 'session-default-2026', 'School of Architecture & Planning', 'B.Arch (Bachelor of Architecture)', 'Interior Architecture', '2', 'PRN2026-ARCH-002', 'Gaurav Joshi', 'gaurav.arch@sspu.ac.in', 'ARCH201', 'History of Architecture & Culture II', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-028', 'session-default-2026', 'School of Architecture & Planning', 'B.Arch (Bachelor of Architecture)', 'Interior Architecture', '2', 'PRN2026-ARCH-002', 'Gaurav Joshi', 'gaurav.arch@sspu.ac.in', 'ARCH202', 'Building Materials & Construction Tech II', 'REGULAR', 'EXTERNAL', 'APPLIED', 1),
    ('rec-029', 'session-default-2026', 'School of Architecture & Planning', 'B.Arch (Bachelor of Architecture)', 'Sustainable Urban Planning', '1', 'PRN2026-ARCH-003', 'Siddhesh Shinde', 'siddhesh.s@sspu.ac.in', 'ARCH101', 'Architectural Graphics & Drawing I', 'BACKLOG', 'EXTERNAL', 'APPLIED', 1);
END;

-- 3. Configure Database-Stored Streams in dbo.timetable_sessions if not yet initialized
IF EXISTS (SELECT 1 FROM dbo.timetable_sessions WHERE id = 'session-default-2026' AND (streams_json IS NULL OR streams_json = ''))
BEGIN
    UPDATE dbo.timetable_sessions
    SET streams_json = N'[{"id":"stream-sci-mgmt","name":"Stream 1: Science & Management","programsOrSchools":["School of Science","School of Management","B.Sc. Applied Sciences & Analytics","BBA (Bachelor of Business Administration)","MBA (Master of Business Administration)"],"dayOffset":0,"dayStep":2,"preferredSlot":"Slot 1","appliesTo":"Both"},{"id":"stream-engg-arch","name":"Stream 2: Engineering & Architecture","programsOrSchools":["School of Architecture & Planning","School of Construction Engineering and Infrastructure Management","School of Mechatronics Engineering","School of Computer Science & Artificial Intelligence","School of Electrical & Electronics Engineering","B.Tech. Construction Engineering & Management","B.Tech. Mechatronics Engineering","B.Tech. Computer Science & AI","B.Tech. Electrical & Electronics","B.Arch (Bachelor of Architecture)"],"dayOffset":1,"dayStep":2,"preferredSlot":"Slot 2","appliesTo":"Both"}]'
    WHERE id = 'session-default-2026';
END;
