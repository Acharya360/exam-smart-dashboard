@echo off
setlocal enabledelayedexpansion
title Acharya360 - GitHub Sync & Verification
cd /d "%~dp0"

echo ==============================================================================
echo       Acharya360 Exam Smart Dashboard - GitHub Sync & Verification Tool
echo ==============================================================================
echo.
echo [Repository] https://github.com/Acharya360/exam-smart-dashboard
for /f "tokens=*" %%b in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%b
if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=main
echo [Current Branch] %CURRENT_BRANCH%
echo.

:: -----------------------------------------------------------------------------
:: Step 1: Verification (TypeScript Lint Check)
:: -----------------------------------------------------------------------------
echo [1/4] Running Code Verification (npm run lint / tsc --noEmit)...
call npm.cmd run lint
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Verification found TypeScript errors!
    echo.
    set /p CONTINUE_ANYWAY="Do you still want to proceed with push? (y/N): "
    if /i not "!CONTINUE_ANYWAY!"=="y" (
        echo [ABORTED] Push cancelled due to verification errors.
        pause
        exit /b 1
    )
) else (
    echo [PASS] Code verification passed cleanly!
)
echo.

:: -----------------------------------------------------------------------------
:: Step 2: Fetch Remote Updates
:: -----------------------------------------------------------------------------
echo [2/4] Fetching latest updates from origin...
git fetch origin %CURRENT_BRANCH%
if %errorlevel% neq 0 (
    echo [WARNING] Could not fetch from origin. Check your internet connection.
)
echo.

:: -----------------------------------------------------------------------------
:: Step 3: Check and Stage Local Changes
:: -----------------------------------------------------------------------------
echo [3/4] Checking for uncommitted local changes...
git status --porcelain > "%temp%\git_status.tmp" 2>nul
for /f %%A in ("%temp%\git_status.tmp") do set HAS_CHANGES=%%~zA
del "%temp%\git_status.tmp" 2>nul

if not "%HAS_CHANGES%"=="" if not "%HAS_CHANGES%"=="0" (
    echo Found uncommitted changes:
    git status -s
    echo.
    set "COMMIT_MSG="
    set /p COMMIT_MSG="Enter commit message (Press Enter for auto-generated message): "
    if "!COMMIT_MSG!"=="" (
        set COMMIT_MSG=Auto-update: %DATE% %TIME%
    )
    echo Staging and committing changes...
    git add -A
    git commit -m "!COMMIT_MSG!"
) else (
    echo Working tree is clean. No new uncommitted files.
)
echo.

:: -----------------------------------------------------------------------------
:: Step 4: Push to GitHub
:: -----------------------------------------------------------------------------
echo [4/4] Pushing to GitHub (origin/%CURRENT_BRANCH%)...
echo If a GitHub authentication prompt appears, please authorize in your browser.
echo.
git push origin %CURRENT_BRANCH%

if %errorlevel% equ 0 (
    echo.
    echo ==============================================================================
    echo [SUCCESS] Push completed and confirmed on GitHub!
    echo ==============================================================================
    for /f "tokens=*" %%c in ('git rev-parse --short HEAD 2^>nul') do set LATEST_HASH=%%c
    for /f "tokens=*" %%m in ('git log -1 --pretty=format:%%s 2^>nul') do set LATEST_MSG=%%m
    echo Latest Commit: [!LATEST_HASH!] !LATEST_MSG!
    echo View on GitHub: https://github.com/Acharya360/exam-smart-dashboard/commit/!LATEST_HASH!
    echo ==============================================================================
) else (
    echo.
    echo ==============================================================================
    echo [FAILED] Push was not completed.
    echo Please verify your GitHub credentials or permissions for:
    echo https://github.com/Acharya360/exam-smart-dashboard
    echo ==============================================================================
)

echo.
pause
