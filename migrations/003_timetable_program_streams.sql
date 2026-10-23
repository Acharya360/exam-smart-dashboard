-- Migration 003: Program Streams and Scheduling Strategy for Timetable Generator
-- Supports stream-based alternating day cadence (e.g. Science & Management on Day 1, 3, 5... and Engineering & Architecture on Day 2, 4, 6...)

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.timetable_sessions') 
    AND name = 'scheduling_strategy'
)
BEGIN
    ALTER TABLE dbo.timetable_sessions ADD scheduling_strategy nvarchar(50) NOT NULL DEFAULT 'PROGRAM_STREAMS';
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.timetable_sessions') 
    AND name = 'streams_json'
)
BEGIN
    ALTER TABLE dbo.timetable_sessions ADD streams_json nvarchar(max) NULL;
END;
