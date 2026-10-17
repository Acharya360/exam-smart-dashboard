USE [SSPU_Exam];
GO

IF COL_LENGTH('dbo.course_master','grading_category') IS NULL 
    ALTER TABLE dbo.course_master ADD grading_category NVARCHAR(50) NOT NULL DEFAULT 'Non-Architecture';

IF COL_LENGTH('dbo.course_master','cat1_max') IS NULL 
    ALTER TABLE dbo.course_master ADD
        cat1_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cat1_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        cat2_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cat2_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        cat3_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cat3_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        cap1_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cap1_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        cap2_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cap2_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        cap3_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cap3_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        cas1_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cas1_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        cas2_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cas2_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        cas3_max DECIMAL(5,2) NOT NULL DEFAULT 0, 
        cas3_min DECIMAL(5,2) NOT NULL DEFAULT 0,
        ess_max_marks DECIMAL(5,2) NOT NULL DEFAULT 0, 
        ess_min_marks DECIMAL(5,2) NOT NULL DEFAULT 0;
GO

SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'course_master'
ORDER BY ORDINAL_POSITION;
GO
