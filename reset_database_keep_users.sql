-- ============================================================================
-- Acharya360 ExamTrack - Database Reset Script (Preserves User Accounts)
-- Target Database: SSPU_Exam
-- 
-- DESCRIPTION:
--   Resets all examination operational data, imported courses, LTPS criteria,
--   schedules, operational tasks, student marks, and registrations.
--   PRESERVES all faculty & administrative user accounts in dbo.profiles.
--   Reseeds all IDENTITY columns and sequences to 0/1.
-- ============================================================================

USE [SSPU_Exam];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '====================================================================';
PRINT ' ACHARYA360 EXAMTRACK - OPERATIONAL DATABASE RESET';
PRINT ' Timestamp: ' + CONVERT(VARCHAR(30), GETDATE(), 120);
PRINT '====================================================================';

-- 1. DISPLAY CURRENT RECORD COUNTS BEFORE RESET
PRINT '';
PRINT '>>> CURRENT RECORD COUNTS (BEFORE RESET):';
SELECT 
    'dbo.profiles (USERS TO KEEP)' AS [Table], COUNT(*) AS [Count] FROM dbo.profiles
UNION ALL
SELECT 'dbo.programs', COUNT(*) FROM dbo.programs
UNION ALL
SELECT 'dbo.course_master', COUNT(*) FROM dbo.course_master
UNION ALL
SELECT 'dbo.exam_course_settings', COUNT(*) FROM dbo.exam_course_settings
UNION ALL
SELECT 'dbo.exam_schedules', COUNT(*) FROM dbo.exam_schedules
UNION ALL
SELECT 'dbo.exam_tasks', COUNT(*) FROM dbo.exam_tasks
UNION ALL
SELECT 'dbo.student_marks', COUNT(*) FROM dbo.student_marks
UNION ALL
SELECT 'dbo.exam_students', COUNT(*) FROM dbo.exam_students
UNION ALL
SELECT 'dbo.exam_registrations', COUNT(*) FROM dbo.exam_registrations
UNION ALL
SELECT 'dbo.exam_processing_audit', COUNT(*) FROM dbo.exam_processing_audit;

-- 2. EXECUTE RESET WITHIN ATOMIC TRANSACTION
BEGIN TRANSACTION;

BEGIN TRY
    PRINT '';
    PRINT '>>> DELETING OPERATIONAL DATA (CHILD-FIRST ORDER)...';

    -- 2.1 Delete student marks (child of registrations and course master)
    IF OBJECT_ID('dbo.student_marks', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.student_marks;
        PRINT '  [OK] Deleted all student_marks';
    END

    -- 2.2 Delete student examination registrations
    IF OBJECT_ID('dbo.exam_registrations', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.exam_registrations;
        PRINT '  [OK] Deleted all exam_registrations';
    END

    -- 2.3 Delete student master registry
    IF OBJECT_ID('dbo.exam_students', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.exam_students;
        PRINT '  [OK] Deleted all exam_students';
    END

    -- 2.4 Delete 4-phase examination tasks (references schedules and profiles)
    IF OBJECT_ID('dbo.exam_tasks', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.exam_tasks;
        PRINT '  [OK] Deleted all exam_tasks';
    END

    -- 2.5 Delete examination schedules / timetables (references programs)
    IF OBJECT_ID('dbo.exam_schedules', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.exam_schedules;
        PRINT '  [OK] Deleted all exam_schedules';
    END

    -- 2.6 Delete course assessment settings / schemes (references course_master)
    IF OBJECT_ID('dbo.exam_course_settings', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.exam_course_settings;
        PRINT '  [OK] Deleted all exam_course_settings';
    END

    -- 2.7 Delete course master records (LTPS syllabus & mark limits)
    IF OBJECT_ID('dbo.course_master', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.course_master;
        PRINT '  [OK] Deleted all course_master';
    END

    -- 2.8 Delete university programs / degrees (references profiles)
    IF OBJECT_ID('dbo.programs', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.programs;
        PRINT '  [OK] Deleted all programs';
    END

    -- 2.9 Delete examination processing audit logs
    IF OBJECT_ID('dbo.exam_processing_audit', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.exam_processing_audit;
        PRINT '  [OK] Deleted all exam_processing_audit';
    END

    -- 2.10 Reset environment data_mode to LIVE
    IF OBJECT_ID('dbo.exam_environment', 'U') IS NOT NULL
    BEGIN
        UPDATE dbo.exam_environment SET data_mode = 'LIVE' WHERE id = 1;
        PRINT '  [OK] Reset exam_environment data_mode to LIVE';
    END

    PRINT '';
    PRINT '>>> RESEEDING IDENTITY COLUMNS & SEQUENCES...';

    -- 3. RESEED IDENTITY COLUMNS
    -- When reseeded to 0, next inserted record will receive ID 1
    IF OBJECT_ID('dbo.exam_registrations', 'U') IS NOT NULL
    BEGIN
        DBCC CHECKIDENT ('dbo.exam_registrations', RESEED, 0) WITH NO_INFOMSGS;
        PRINT '  [OK] Reseeded identity on dbo.exam_registrations to 0';
    END

    IF OBJECT_ID('dbo.exam_processing_audit', 'U') IS NOT NULL
    BEGIN
        DBCC CHECKIDENT ('dbo.exam_processing_audit', RESEED, 0) WITH NO_INFOMSGS;
        PRINT '  [OK] Reseeded identity on dbo.exam_processing_audit to 0';
    END

    -- 4. RESTART ALL DATABASE SEQUENCES (IF ANY)
    DECLARE @seqName NVARCHAR(255);
    DECLARE @seqSchema NVARCHAR(255);
    DECLARE @sql NVARCHAR(MAX);

    DECLARE seq_cursor CURSOR FOR
        SELECT s.name AS SchemaName, seq.name AS SequenceName
        FROM sys.sequences seq
        JOIN sys.schemas s ON seq.schema_id = s.schema_id;

    OPEN seq_cursor;
    FETCH NEXT FROM seq_cursor INTO @seqSchema, @seqName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = 'ALTER SEQUENCE [' + @seqSchema + '].[' + @seqName + '] RESTART WITH 1;';
        EXEC sp_executesql @sql;
        PRINT '  [OK] Restarted sequence ' + @seqSchema + '.' + @seqName + ' with 1';
        FETCH NEXT FROM seq_cursor INTO @seqSchema, @seqName;
    END

    CLOSE seq_cursor;
    DEALLOCATE seq_cursor;

    -- COMMIT THE TRANSACTION
    COMMIT TRANSACTION;

    PRINT '';
    PRINT '====================================================================';
    PRINT ' RESET COMPLETED SUCCESSFULLY! USER ACCOUNTS PRESERVED.';
    PRINT '====================================================================';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT '';
    PRINT '*** ERROR ENCOUNTERED - TRANSACTION ROLLED BACK ***';
    PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR(10));
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    THROW;
END CATCH;
GO

-- 5. DISPLAY VERIFICATION COUNTS (AFTER RESET)
PRINT '';
PRINT '>>> VERIFICATION RECORD COUNTS (AFTER RESET):';
SELECT 
    'dbo.profiles (USERS PRESERVED)' AS [Table], COUNT(*) AS [Count] FROM dbo.profiles
UNION ALL
SELECT 'dbo.programs', COUNT(*) FROM dbo.programs
UNION ALL
SELECT 'dbo.course_master', COUNT(*) FROM dbo.course_master
UNION ALL
SELECT 'dbo.exam_course_settings', COUNT(*) FROM dbo.exam_course_settings
UNION ALL
SELECT 'dbo.exam_schedules', COUNT(*) FROM dbo.exam_schedules
UNION ALL
SELECT 'dbo.exam_tasks', COUNT(*) FROM dbo.exam_tasks
UNION ALL
SELECT 'dbo.student_marks', COUNT(*) FROM dbo.student_marks
UNION ALL
SELECT 'dbo.exam_students', COUNT(*) FROM dbo.exam_students
UNION ALL
SELECT 'dbo.exam_registrations', COUNT(*) FROM dbo.exam_registrations
UNION ALL
SELECT 'dbo.exam_processing_audit', COUNT(*) FROM dbo.exam_processing_audit;
GO
