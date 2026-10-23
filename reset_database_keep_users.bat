@echo off
setlocal
title SSPU ExamTrack - Reset Operational Database (Keep Users)
color 0C

echo ===============================================================================
echo                ACHARYA360 EXAMTRACK - OPERATIONAL DATABASE RESET
echo ===============================================================================
echo.
echo  Target Database : SSPU_Exam
echo  Target Server   : localhost\SQLEXPRESS
echo.
echo  [!] WARNING:
echo      This operation will DELETE ALL:
echo      - Examination Schedules and Tasks
echo      - Course Master and LTPS Assessment Schemes
echo      - University Programs Mappings
echo      - Student Master, Registrations, and Marks
echo      - Examination Processing Audit Logs
echo      - It will RESEED all identities and sequences to 0/1.
echo.
echo      [+] ALL FACULTY AND ADMINISTRATIVE USER ACCOUNTS (dbo.profiles)
echo          WILL BE PRESERVED INTACT!
echo.
echo ===============================================================================
set /p CONFIRM="Are you sure you want to proceed? Type YES in capital letters to confirm: "

if not "%CONFIRM%"=="YES" (
    echo.
    echo Reset cancelled by user. No database records were modified.
    pause
    exit /b 0
)

echo.
echo [1/2] Connecting to SQL Server and executing reset...
echo.

sqlcmd -S "localhost\SQLEXPRESS" -d "SSPU_Exam" -E -C -i "%~dp0reset_database_keep_users.sql"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] SQL Script encountered an error during execution.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Reset complete! Syncing server cache...
echo.
pause
