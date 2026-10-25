-- 008: Add student_count to timetable_student_records
-- Supports course-master picker cohort rows (one record representing N students).
IF COL_LENGTH('dbo.timetable_student_records', 'student_count') IS NULL
BEGIN
    ALTER TABLE dbo.timetable_student_records
        ADD student_count int NOT NULL DEFAULT 1;
    PRINT '  [OK] Added student_count to dbo.timetable_student_records';
END
ELSE
    PRINT '  [SKIP] student_count already exists on dbo.timetable_student_records';
