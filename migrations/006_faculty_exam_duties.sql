-- Migration 006: Add Exam Roles and Expand Faculty Allocations for Examinations
-- Maps faculty to specific exam roles: Paper Setter, Evaluator, Invigilator, Practical Examiner, Jury Lead

IF COL_LENGTH('dbo.faculty_course_allocations', 'exam_role') IS NULL
BEGIN
    ALTER TABLE dbo.faculty_course_allocations ADD exam_role NVARCHAR(100) NOT NULL DEFAULT 'Course Instructor & Evaluator';
END;

IF COL_LENGTH('dbo.faculty_course_allocations', 'invigilation_sessions') IS NULL
BEGIN
    ALTER TABLE dbo.faculty_course_allocations ADD invigilation_sessions INT NOT NULL DEFAULT 2;
END;

IF COL_LENGTH('dbo.faculty_course_allocations', 'exam_center') IS NULL
BEGIN
    ALTER TABLE dbo.faculty_course_allocations ADD exam_center NVARCHAR(255) NULL DEFAULT 'Main Campus Examination Block';
END;

-- Seed comprehensive faculty exam allocations across all university departments using dynamic SQL
-- Dynamic execution avoids SQL Server compile-time errors for newly added columns in the same batch
EXEC sp_executesql N'
IF NOT EXISTS (SELECT 1 FROM dbo.faculty_course_allocations WHERE id = ''fac-alloc-101'')
BEGIN
    INSERT INTO dbo.faculty_course_allocations 
    (id, course_master_id, subject_code, subject_name, staff_code, staff_name, additional_staff, section, semester, program_name, academic_year, department, workload_hours, exam_role, invigilation_sessions, exam_center)
    VALUES
    -- Construction Engineering & Infrastructure
    (''fac-alloc-101'', ''cm-4'', ''ACEM105'', ''Construction Materials'', ''T7112'', ''Prof. Rohan Joshi'', ''T7101 - Prof. Sarah Jenkins'', ''A'', ''2'', ''B.Tech. Construction Engineering & Management'', ''2025-2026'', ''School of Construction Engineering'', 4, ''Practical Examiner & Invigilator'', 3, ''Block C - Civil Hall 204''),
    (''fac-alloc-102'', ''cm-5'', ''ACEM106'', ''Engineering Drawing & BIM'', ''T7113'', ''Prof. Ishaan Verma'', ''T7105 - Dr. Arun Kumar'', ''A'', ''2'', ''B.Tech. Construction Engineering & Management'', ''2025-2026'', ''School of Construction Engineering'', 4, ''Invigilator & CAD Practical Examiner'', 2, ''CAD Center - Room 102''),
    (''fac-alloc-103'', ''cm-6'', ''ACEM107'', ''Building Construction'', ''T7101'', ''Prof. Sarah Jenkins'', ''T7112 - Prof. Rohan Joshi'', ''B'', ''2'', ''B.Tech. Construction Engineering & Management'', ''2025-2026'', ''School of Construction Engineering'', 4, ''Paper Setter & Chief Evaluator'', 2, ''Block C - Room 205''),
    (''fac-alloc-104'', ''cm-3'', ''AENG104'', ''Engineering Mechanics'', ''T7104'', ''Prof. Vikram Patel'', ''T7113 - Prof. Ishaan Verma'', ''B'', ''1'', ''B.Tech. Construction Engineering & Management'', ''2025-2026'', ''School of Construction Engineering'', 4, ''Paper Setter & Room Supervisor'', 3, ''Main Examination Hall A''),

    -- Mechatronics Engineering
    (''fac-alloc-105'', NULL, ''MECH202'', ''Sensors, Actuators & Microcontrollers'', ''T7114'', ''Prof. Kunal Roy'', ''T7115 - Prof. Priya Kulkarni'', ''A'', ''2'', ''B.Tech. Mechatronics Engineering'', ''2025-2026'', ''School of Mechatronics Engineering'', 4, ''Practical & Lab Exam Evaluator'', 2, ''Mechatronics Automation Lab 1''),
    (''fac-alloc-106'', NULL, ''MECH202'', ''Sensors, Actuators & Microcontrollers'', ''T7114'', ''Prof. Kunal Roy'', NULL, ''B'', ''2'', ''B.Tech. Mechatronics Engineering'', ''2025-2026'', ''School of Mechatronics Engineering'', 4, ''Invigilator & Evaluator'', 2, ''Block B - Room 301''),
    (''fac-alloc-107'', NULL, ''MECH203'', ''Kinematics & Dynamics of Machinery'', ''T7115'', ''Prof. Priya Kulkarni'', ''T7102 - Prof. Amit Roy'', ''A'', ''2'', ''B.Tech. Mechatronics Engineering'', ''2025-2026'', ''School of Mechatronics Engineering'', 4, ''Chief Paper Setter & Evaluator'', 3, ''Block B - Room 302''),
    (''fac-alloc-108'', NULL, ''MECH203'', ''Kinematics & Dynamics of Machinery'', ''T7276'', ''Dr. Kirti Nandode'', NULL, ''B'', ''2'', ''B.Tech. Mechatronics Engineering'', ''2025-2026'', ''School of Mechatronics Engineering'', 4, ''External Evaluator & Room Supervisor'', 2, ''Block B - Room 303''),

    -- Computer Science & Artificial Intelligence
    (''fac-alloc-109'', NULL, ''CS401'', ''Operating Systems & Concurrency'', ''T7116'', ''Prof. Vikram Malhotra'', ''T7107 - Dr. Neha Gupta'', ''B'', ''4'', ''B.Tech. Computer Science & AI'', ''2025-2026'', ''School of Computer Science & AI'', 4, ''Invigilator & Evaluator'', 3, ''CS Computing Block - Lab 3''),
    (''fac-alloc-110'', NULL, ''CS402'', ''Database Management Systems'', ''T7117'', ''Prof. Tanvi Shah'', ''T7118 - Prof. Kabir Mehta'', ''A'', ''4'', ''B.Tech. Computer Science & AI'', ''2025-2026'', ''School of Computer Science & AI'', 4, ''Paper Setter & SQL Exam Lead'', 3, ''CS Computing Block - Lab 1''),
    (''fac-alloc-111'', NULL, ''CS402'', ''Database Management Systems'', ''T7117'', ''Prof. Tanvi Shah'', NULL, ''B'', ''4'', ''B.Tech. Computer Science & AI'', ''2025-2026'', ''School of Computer Science & AI'', 4, ''Room Supervisor & Evaluator'', 2, ''CS Block - Hall 401''),
    (''fac-alloc-112'', NULL, ''CS403'', ''Design and Analysis of Algorithms'', ''T7118'', ''Prof. Kabir Mehta'', ''T7104 - Prof. Vikram Patel'', ''A'', ''4'', ''B.Tech. Computer Science & AI'', ''2025-2026'', ''School of Computer Science & AI'', 4, ''Chief Paper Setter & Evaluator'', 2, ''CS Block - Hall 402''),
    (''fac-alloc-113'', NULL, ''CS404'', ''Machine Learning Foundations'', ''T7119'', ''Prof. Aditya Sen'', ''T7107 - Dr. Neha Gupta'', ''A'', ''4'', ''B.Tech. Computer Science & AI'', ''2025-2026'', ''School of Computer Science & AI'', 4, ''AI Project & Practical Examiner'', 3, ''AI Research Lab - Center A''),
    (''fac-alloc-114'', NULL, ''CS404'', ''Machine Learning Foundations'', ''T7393'', ''Prof. Ashish Srivastava'', NULL, ''B'', ''4'', ''B.Tech. Computer Science & AI'', ''2025-2026'', ''School of Computer Science & AI'', 4, ''External Evaluator & Room Supervisor'', 2, ''CS Block - Hall 403''),

    -- Electrical & Electronics
    (''fac-alloc-115'', NULL, ''EE602'', ''Power Systems & Smart Grids'', ''T7105'', ''Dr. Arun Kumar'', ''T7104 - Prof. Vikram Patel'', ''B'', ''6'', ''B.Tech. Electrical & Electronics'', ''2025-2026'', ''School of Electrical & Electronics Engineering'', 4, ''Chief Paper Setter & High-Voltage Evaluator'', 2, ''Electrical Engg Block - Room 101''),
    (''fac-alloc-116'', NULL, ''EE603'', ''Control Systems Engineering'', ''T7105'', ''Dr. Arun Kumar'', ''T7115 - Prof. Priya Kulkarni'', ''A'', ''6'', ''B.Tech. Electrical & Electronics'', ''2025-2026'', ''School of Electrical & Electronics Engineering'', 4, ''Paper Setter & Room Supervisor'', 2, ''Electrical Engg Block - Room 102''),

    -- Architecture & Planning
    (''fac-alloc-117'', NULL, ''ARCH101'', ''Architectural Graphics & Drawing I'', ''T7436'', ''Prof. Tulika Shevkani'', ''T7620 - Vaishnavi Gawande'', ''A'', ''1'', ''B.Arch (Bachelor of Architecture)'', ''2025-2026'', ''School of Architecture & Planning'', 5, ''Studio Drawing Jury Convener'', 2, ''Architecture Studio 1''),
    (''fac-alloc-118'', NULL, ''ARCH102'', ''History of Architecture & Culture'', ''T7118'', ''Prof. Gauri Shiurkar'', ''T7297 - Manjusha Gokhale'', ''A'', ''1'', ''B.Arch (Bachelor of Architecture)'', ''2025-2026'', ''School of Architecture & Planning'', 3, ''Paper Setter & Theory Evaluator'', 2, ''Architecture Hall 201''),
    (''fac-alloc-119'', NULL, ''ARCH201'', ''Architectural Design II'', ''T7386'', ''Prof. Sharvari Suryawanshi'', ''T7379 - Pashmeena Ghom, T7610 - Mayuri Deodhar'', ''A'', ''2'', ''B.Arch (Bachelor of Architecture)'', ''2025-2026'', ''School of Architecture & Planning'', 6, ''External Jury Lead & Thesis Evaluator'', 4, ''Grand Exhibition Studio A''),
    (''fac-alloc-120'', NULL, ''ARCH202'', ''Climatology & Environmental Services'', ''T7297'', ''Prof. Manjusha Gokhale'', ''T7465 - Prof. Rutusha Ladha'', ''A'', ''2'', ''B.Arch (Bachelor of Architecture)'', ''2025-2026'', ''School of Architecture & Planning'', 4, ''Invigilator & Technical Evaluator'', 2, ''Architecture Hall 202''),

    -- Management & Business Administration
    (''fac-alloc-121'', NULL, ''MGT101'', ''Principles of Management & Org Behavior'', ''T7103'', ''Dr. Rajesh Sharma'', ''T7120 - Dr. Neha Patil'', ''A'', ''1'', ''BBA (Bachelor of Business Administration)'', ''2025-2026'', ''School of Management'', 4, ''Chief Paper Setter & Evaluator'', 2, ''Management Block - Hall A''),
    (''fac-alloc-122'', NULL, ''MGT102'', ''Business Accounting & Financial Analysis'', ''T7117'', ''Prof. Tanvi Shah'', ''T7118 - Prof. Kabir Mehta'', ''A'', ''1'', ''BBA (Bachelor of Business Administration)'', ''2025-2026'', ''School of Management'', 4, ''Financial Accounting Exam Evaluator'', 2, ''Management Block - Hall B''),
    (''fac-alloc-123'', NULL, ''MGT201'', ''Marketing Management & Consumer Insights'', ''T7120'', ''Dr. Neha Patil'', ''T7103 - Dr. Rajesh Sharma'', ''A'', ''2'', ''BBA (Bachelor of Business Administration)'', ''2025-2026'', ''School of Management'', 4, ''Paper Setter & Case Study Evaluator'', 2, ''Management Block - Room 301''),
    (''fac-alloc-124'', NULL, ''MGT202'', ''Macroeconomics & Global Business'', ''T7118'', ''Prof. Kabir Mehta'', ''T7117 - Prof. Tanvi Shah'', ''A'', ''2'', ''BBA (Bachelor of Business Administration)'', ''2025-2026'', ''School of Management'', 4, ''Senior Invigilator & Evaluator'', 3, ''Management Block - Room 302''),

    -- Master of Business Administration (MBA)
    (''fac-alloc-125'', NULL, ''MBA101'', ''Strategic Management & Leadership'', ''T7103'', ''Dr. Rajesh Sharma'', ''T7120 - Dr. Neha Patil'', ''A'', ''1'', ''MBA (Master of Business Administration)'', ''2025-2026'', ''School of Management'', 4, ''Chief Paper Setter & Executive Jury Lead'', 2, ''Executive MBA Suite 1''),
    (''fac-alloc-126'', NULL, ''MBA102'', ''Corporate Finance & Valuation'', ''T7118'', ''Prof. Kabir Mehta'', ''T7117 - Prof. Tanvi Shah'', ''A'', ''1'', ''MBA (Master of Business Administration)'', ''2025-2026'', ''School of Management'', 4, ''Financial Modeling Exam Lead'', 2, ''Executive MBA Suite 2''),
    (''fac-alloc-127'', NULL, ''MBA201'', ''Supply Chain Analytics & Global Logistics'', ''T7120'', ''Dr. Neha Patil'', ''T7101 - Prof. Sarah Jenkins'', ''A'', ''2'', ''MBA (Master of Business Administration)'', ''2025-2026'', ''School of Management'', 4, ''Project & Case Exam Evaluator'', 2, ''Executive MBA Suite 3''),

    -- Applied Sciences & Analytics
    (''fac-alloc-128'', NULL, ''SCI101'', ''Calculus and Linear Algebra'', ''T7106'', ''Dr. Anita Verma'', ''T7103 - Dr. Rajesh Sharma'', ''A'', ''1'', ''B.Sc. Applied Sciences & Analytics'', ''2025-2026'', ''School of Science'', 4, ''Chief Paper Setter & Numerical Evaluator'', 3, ''Science Complex - Lecture Hall 1''),
    (''fac-alloc-129'', NULL, ''SCI102'', ''Applied Statistical Foundations'', ''T7119'', ''Prof. Aditya Sen'', ''T7106 - Dr. Anita Verma'', ''A'', ''1'', ''B.Sc. Applied Sciences & Analytics'', ''2025-2026'', ''School of Science'', 4, ''Statistical Software Exam Lead'', 2, ''Science Complex - Stats Lab 1''),
    (''fac-alloc-130'', NULL, ''SCI201'', ''Probability & Numerical Methods'', ''T7106'', ''Dr. Anita Verma'', ''T7119 - Prof. Aditya Sen'', ''A'', ''2'', ''B.Sc. Applied Sciences & Analytics'', ''2025-2026'', ''School of Science'', 4, ''Paper Setter & Room Supervisor'', 2, ''Science Complex - Lecture Hall 2''),
    (''fac-alloc-131'', NULL, ''SCI202'', ''Data Structures and Algorithms for Science'', ''T7393'', ''Prof. Ashish Srivastava'', ''T7118 - Prof. Kabir Mehta'', ''A'', ''2'', ''B.Sc. Applied Sciences & Analytics'', ''2025-2026'', ''School of Science'', 4, ''Computational Practical Evaluator'', 2, ''Science Complex - Computing Lab 2'');
END;
';
