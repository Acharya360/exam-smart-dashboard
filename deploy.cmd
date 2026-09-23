@echo off
setlocal

echo ===========================================
echo    Exam Smart Dashboard - Vercel Deployment
echo ===========================================
echo.

echo Make sure you are logged into Vercel. If not, this script will prompt you to log in.
echo.
echo [0] Login to Vercel (Do this first if you get a 'No credentials' error)
echo [1] Preview Deployment (Staging/Testing)
echo [2] Production Deployment (Live)
echo.
set /p deployChoice="Select an option (0, 1, or 2): "

if "%deployChoice%"=="0" (
    echo.
    echo Opening Vercel Login...
    call npx vercel login
) else if "%deployChoice%"=="1" (
    echo.
    echo Starting Vercel Preview Deployment...
    call npx vercel
) else if "%deployChoice%"=="2" (
    echo.
    echo Starting Vercel Production Deployment...
    call npx vercel --prod
) else (
    echo.
    echo [ERROR] Invalid choice. Deployment cancelled.
)

echo.
pause
