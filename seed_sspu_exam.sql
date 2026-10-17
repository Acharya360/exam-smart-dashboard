USE [SSPU_Exam];
GO

-- 1. Seed Profiles
SET NOCOUNT ON;

DELETE FROM dbo.exam_tasks;
DELETE FROM dbo.exam_schedules;
DELETE FROM dbo.programs;
DELETE FROM dbo.profiles;
DELETE FROM dbo.course_master;

INSERT INTO dbo.profiles (id, email, password, full_name, role, title, department, phone, created_at, last_password_change)
VALUES
('user-coe-1', 'coe@sspu.ac.in', 'Admin@123', 'Dr. Rajesh Sharma', 'COE', 'Controller of Examinations', 'Central Examination Office', '+91 98765 43210', '2026-01-10T09:00:00Z', '2026-01-10T09:00:00Z'),
('user-dycoe-1', 'DyCoe@sspu.ac.in', 'Admin@123', 'Dr. Anita Verma', 'DYCOE', 'Deputy Controller of Examinations', 'Central Examination Office', '+91 98765 43211', '2026-01-12T10:00:00Z', '2026-01-12T10:00:00Z'),
('user-acoe-1', 'Acoe@sspu.ac.in', 'Admin@123', 'Prof. Vikram Patel', 'ACOE', 'Assistant Controller of Examinations', 'Central Examination Office', '+91 98765 43212', '2026-01-15T11:30:00Z', '2026-01-15T11:30:00Z'),
('user-coord-1', 'sarah.jenkins@university.edu', 'Admin@123', 'Prof. Sarah Jenkins', 'COORDINATOR', 'Associate Professor & Exam Coordinator', 'School of Construction Engineering and Infrastructure Management', '+91 98765 43220', '2026-02-01T08:00:00Z', '2026-02-01T08:00:00Z'),
('user-coord-2', 'amit.roy@university.edu', 'Admin@123', 'Prof. Amit Roy', 'COORDINATOR', 'Assistant Professor & Exam Coordinator', 'School of Mechatronics Engineering', '+91 98765 43221', '2026-02-01T08:30:00Z', '2026-02-01T08:30:00Z'),
('user-coord-3', 'neha.gupta@university.edu', 'Admin@123', 'Dr. Neha Gupta', 'COORDINATOR', 'Senior Faculty & Alternate Coordinator', 'School of Computer Science & Artificial Intelligence', '+91 98765 43222', '2026-02-05T09:15:00Z', '2026-02-05T09:15:00Z'),
('user-coord-4', 'arun.kumar@university.edu', 'Admin@123', 'Dr. Arun Kumar', 'COORDINATOR', 'Associate Professor & Exam Coordinator', 'School of Electrical & Electronics Engineering', '+91 98765 43223', '2026-02-07T10:00:00Z', '2026-02-07T10:00:00Z');

-- 2. Seed Programs
INSERT INTO dbo.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id)
VALUES
('prog-1', 1, 'BTECH-CEM', 'B.Tech. Construction Engineering & Management', 'School of Construction Engineering and Infrastructure Management', 'user-coord-1', 'user-coord-3'),
('prog-2', 2, 'BTECH-MECH', 'B.Tech. Mechatronics Engineering', 'School of Mechatronics Engineering', 'user-coord-2', 'user-coord-1'),
('prog-3', 3, 'BTECH-CSAI', 'B.Tech. Computer Science & AI', 'School of Computer Science & Artificial Intelligence', 'user-coord-3', 'user-coord-2'),
('prog-4', 4, 'BTECH-EEE', 'B.Tech. Electrical & Electronics', 'School of Electrical & Electronics Engineering', 'user-coord-4', 'user-coord-1');

-- 3. Seed Exam Schedules
INSERT INTO dbo.exam_schedules (id, pkg_no, logic1, cm_school_name, cm_course_name, program_code, semester, elective, paper_code, sm_subject_name, student_count, regular_count, backlog_count, exam_day, exam_date, date_odd_even, am_pm, exam_time, exam_type, exam_year)
VALUES
('sched-1', 1, 'B.Tech. Construction Engineering & Management_2_APSC102_Applied Physics', 'School of Construction Engineering and Infrastructure Management', 'B.Tech. Construction Engineering & Management', 'BTECH-CEM', 2, '', 'APSC102', 'Applied Physics', 2, 0, 2, 1, '14/05/2026', '14-05-2026_Odd', 'AM', '10:30 am to 12:30 pm', 'Backlog', '2026'),
('sched-2', 2, 'B.Tech. Construction Engineering & Management_2_APSC2102_Applied Physics', 'School of Construction Engineering and Infrastructure Management', 'B.Tech. Construction Engineering & Management', 'BTECH-CEM', 2, '', 'APSC2102', 'Applied Physics', 25, 25, 0, 1, '14/05/2026', '14-05-2026_Odd', 'AM', '10:30 am to 12:30 pm', 'Regular', '2026'),
('sched-3', 3, 'B.Tech. Mechatronics Engineering_2_APSC2103_Applied Chemistry', 'School of Mechatronics Engineering', 'B.Tech. Mechatronics Engineering', 'BTECH-MECH', 2, '', 'APSC2103', 'Applied Chemistry', 6, 0, 6, 1, '14/05/2026', '14-05-2026_Odd', 'AM', '10:30 am to 12:30 pm', 'Backlog', '2026'),
('sched-4', 4, 'B.Tech. Computer Science & AI_4_CS401_Operating Systems', 'School of Computer Science & Artificial Intelligence', 'B.Tech. Computer Science & AI', 'BTECH-CSAI', 4, '', 'CS401', 'Operating Systems & Concurrency', 68, 60, 8, 2, '16/05/2026', '16-05-2026_Even', 'PM', '02:00 pm to 05:00 pm', 'Both', '2026'),
('sched-5', 5, 'B.Tech. Electrical & Electronics_6_EE602_Power Systems II', 'School of Electrical & Electronics Engineering', 'B.Tech. Electrical & Electronics', 'BTECH-EEE', 6, 'Elective-B', 'EE602', 'Power Systems & Smart Grids', 42, 40, 2, 3, '18/05/2026', '18-05-2026_Even', 'AM', '10:30 am to 01:30 pm', 'Both', '2026');

-- 4. Seed Exam Tasks
INSERT INTO dbo.exam_tasks (id, schedule_id, program_code, task_title, status, assigned_to, alternate_user_id, notes, due_date, updated_at, escalated_at, escalation_reason)
VALUES
('task-1', 'sched-1', 'BTECH-CEM', 'Question Paper Printing & Secure Vault Packaging (APSC102)', 'COMPLETED', 'user-coord-1', 'user-coord-3', 'Printed 2 backlog sets and sealed in confidential envelope #CEM-01.', '2026-05-12', '2026-05-10T14:30:00Z', NULL, NULL),
('task-2', 'sched-1', 'BTECH-CEM', 'Hall Seating Plan, Attendance Sheets & Roll Labels (APSC102)', 'IN_PROGRESS', 'user-coord-1', 'user-coord-3', 'Allocated to Block C, Room 204.', '2026-05-13', '2026-05-11T11:00:00Z', NULL, NULL),
('task-3', 'sched-2', 'BTECH-CEM', 'Invigilation Duty Assignment & Verification (APSC2102)', 'PENDING', 'user-coord-1', 'user-coord-3', '25 Regular students registered. Booklet pack prepared.', '2026-05-13', '2026-05-09T10:00:00Z', NULL, NULL),
('task-4', 'sched-3', 'BTECH-MECH', 'Answer Booklet Collection & Counterfoil Verification (APSC2103)', 'ESCALATED_TO_ALTERNATE', 'user-coord-2', 'user-coord-1', 'Duty escalated due to unavoidable university senate meeting.', '2026-05-14', '2026-05-13T10:00:00Z', '2026-05-13T10:00:00Z', 'Attending University Academic Council meeting.');

-- 5. Seed Course Master (From Sample Template)
INSERT INTO dbo.course_master (id, sr_no, cm_course_name, semester, paper_code, sm_subject_name, l, t, p, s, total_credits, cat_max_marks, cat_min_marks, est_max_marks, est_min_marks, cap_max_marks, cap_min_marks, esp_max_marks, esp_min_marks, ia_max_marks, ia_min_marks, total_marks, total_marks_min)
VALUES
('cm-1', 1, 'B.Tech. Construction Engineering & Management', 'I', 'APSC102', 'Applied Physics', 2, 0, 1, 1, 4, 50, 20, 50, 20, 40, 16, 40, 16, 20, 8, 200, 80),
('cm-2', 2, 'B.Tech. Construction Engineering & Management', 'I', 'AMAT103', 'Engineering Mathematics', 3, 1, 0, 0, 4, 50, 20, 50, 20, 0, 0, 0, 0, 20, 8, 120, 48),
('cm-3', 3, 'B.Tech. Construction Engineering & Management', 'I', 'AENG104', 'Engineering Mechanics', 2, 1, 1, 0, 4, 50, 20, 50, 20, 40, 16, 40, 16, 20, 8, 200, 80),
('cm-4', 4, 'B.Tech. Construction Engineering & Management', 'I', 'ACEM105', 'Construction Materials', 3, 0, 1, 0, 4, 50, 20, 50, 20, 40, 16, 40, 16, 20, 8, 200, 80),
('cm-5', 5, 'B.Tech. Construction Engineering & Management', 'I', 'ACEM106', 'Engineering Drawing', 1, 0, 2, 1, 4, 50, 20, 50, 20, 40, 16, 40, 16, 20, 8, 200, 80),
('cm-6', 6, 'B.Tech. Construction Engineering & Management', 'I', 'ACEM107', 'Building Construction', 2, 0, 1, 1, 4, 50, 20, 50, 20, 40, 16, 40, 16, 20, 8, 200, 80);

PRINT 'Base records seeded successfully into SSPU_Exam.';
GO
