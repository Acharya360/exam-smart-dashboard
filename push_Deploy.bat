@echo off
setlocal

echo ===========================================
echo    Exam Smart Dashboard - Push ^& Deploy
echo ===========================================
echo.

echo --- Step 1: Push to GitHub ---
echo Adding changes to git...
git add .

echo Committing changes...
git commit -m "Auto-update: %date% %time%"

echo Pushing to GitHub...
git push

echo.
echo --- Step 2: Vercel Deployment ---
echo Make sure you are logged into Vercel. If not, this script will prompt you to log in.
echo.
echo [0] Login to Vercel (Do this first if you get a 'No credentials' error)
echo [1] Preview Deployment (Staging/Testing)
echo [2] Production Deployment (Live)
echo [3] Skip Deployment
echo.
set /p deployChoice="Select an option (0, 1, 2, or 3): "

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
) else if "%deployChoice%"=="3" (
    echo.
    echo Skipping Vercel deployment.
) else (
    echo.
    echo [ERROR] Invalid choice. Deployment cancelled.
)

echo.
echo ========================================
echo Done! 
echo ========================================
pause
