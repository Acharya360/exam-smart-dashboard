@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Acharya360 ExamTrack - Unified Master Control & Deployment Script
:: ============================================================================

title Acharya360 ExamTrack - Master Control

:: 1. Working directory
cd /d "%~dp0"

:: 2. Configuration & Defaults
set "DEFAULT_PORT=3000"
set "PORT=%DEFAULT_PORT%"
set "ENV_FILE=.env"
set "ENV_EXAMPLE=.env.example"

:: 3. Command-line argument parsing
set "CMD_ARG=%~1"
set "EXTRA_ARG=%~2"
set "EXTRA_ARG2=%~3"

if /i "%CMD_ARG%"=="help" goto :show_help
if /i "%CMD_ARG%"=="--help" goto :show_help
if /i "%CMD_ARG%"=="-h" goto :show_help

if /i "%CMD_ARG%"=="dev" goto :preflight_cli
if /i "%CMD_ARG%"=="start" goto :preflight_cli
if /i "%CMD_ARG%"=="server" goto :preflight_cli
if /i "%CMD_ARG%"=="db" goto :preflight_cli
if /i "%CMD_ARG%"=="status" goto :preflight_cli
if /i "%CMD_ARG%"=="migrate" goto :preflight_cli
if /i "%CMD_ARG%"=="build" goto :preflight_cli
if /i "%CMD_ARG%"=="preview" goto :preflight_cli
if /i "%CMD_ARG%"=="lint" goto :preflight_cli
if /i "%CMD_ARG%"=="clean" goto :preflight_cli
if /i "%CMD_ARG%"=="reinstall" goto :preflight_cli
if /i "%CMD_ARG%"=="install" goto :preflight_cli
if /i "%CMD_ARG%"=="push" goto :action_git_push
if /i "%CMD_ARG%"=="deploy" goto :action_deploy
if /i "%CMD_ARG%"=="release" goto :action_release

:: If no arguments, show banner and interactive preflight
call :print_banner
call :run_preflight
goto :menu

:: ----------------------------------------------------------------------------
:: Preflight Checks
:: ----------------------------------------------------------------------------
:preflight_cli
call :run_preflight
if /i "%CMD_ARG%"=="dev" goto :action_dev
if /i "%CMD_ARG%"=="start" goto :action_dev
if /i "%CMD_ARG%"=="server" goto :action_server
if /i "%CMD_ARG%"=="db" goto :action_sql_status
if /i "%CMD_ARG%"=="migrate" goto :action_sql_migrate
if /i "%CMD_ARG%"=="build" goto :action_build
if /i "%CMD_ARG%"=="preview" goto :action_preview
if /i "%CMD_ARG%"=="lint" goto :action_lint
if /i "%CMD_ARG%"=="clean" goto :action_clean
if /i "%CMD_ARG%"=="reinstall" goto :action_reinstall
if /i "%CMD_ARG%"=="install" goto :action_reinstall
goto :menu

:run_preflight
echo.
echo [1/4] Checking Node.js runtime...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js version 18 or higher from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v 2^>nul') do set "NODE_VERSION=%%i"
echo       - Node.js version: !NODE_VERSION! [OK]

echo [2/4] Checking npm package manager...
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not found in PATH!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v 2^>nul') do set "NPM_VERSION=%%i"
echo       - npm version: v!NPM_VERSION! [OK]

echo [3/4] Verifying environment configuration...
if not exist "%ENV_FILE%" (
    echo       - [WARN] %ENV_FILE% not found.
    if exist "%ENV_EXAMPLE%" (
        echo       - Auto-creating %ENV_FILE% from %ENV_EXAMPLE%...
        copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
        echo       - [IMPORTANT] Please update your Supabase and Gemini keys in %ENV_FILE%.
    ) else (
        echo       - [WARN] %ENV_EXAMPLE% missing as well.
    )
) else (
    echo       - %ENV_FILE% verified.
)

echo [4/4] Verifying dependencies...
if not exist "node_modules\" (
    echo       - Dependencies not installed. Running npm install...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] npm install failed. Please check the logs above.
        pause
        exit /b 1
    )
    echo       - Dependencies installed successfully.
) else (
    echo       - Dependencies verified.
)
echo.
echo [READY] System initialized successfully.
echo.
goto :eof

:: ----------------------------------------------------------------------------
:: Banner
:: ----------------------------------------------------------------------------
:print_banner
cls
echo ============================================================================
echo   ACHARYA360 EXAMTRACK - UNIVERSITY ERP OPERATIONS and DEPLOYMENT
echo ============================================================================
goto :eof

:: ----------------------------------------------------------------------------
:: Dynamic Port Allocation
:: ----------------------------------------------------------------------------
:resolve_port
if not "%EXTRA_ARG%"=="" (
    set "PORT=%EXTRA_ARG%"
    goto :eof
)

set "CHECK_PORT=%PORT%"
:check_port_loop
netstat -ano | findstr /R /C:":%CHECK_PORT% " >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [WARN] Port %CHECK_PORT% is in use.
    set /a CHECK_PORT+=1
    goto :check_port_loop
)

set "PORT=%CHECK_PORT%"
if not "%PORT%"=="%DEFAULT_PORT%" (
    echo [INFO] Port %DEFAULT_PORT% occupied. Dynamically assigned free port: %PORT%
)
goto :eof

:: ----------------------------------------------------------------------------
:: Action Completion Helper
:: ----------------------------------------------------------------------------
:finish_action
if not "%CMD_ARG%"=="" exit /b %1
pause
goto :menu

:: ----------------------------------------------------------------------------
:: Interactive Master Menu
:: ----------------------------------------------------------------------------
:menu
echo ----------------------------------------------------------------------------
echo  DEVELOPMENT and SERVERS:
echo    [1] Start Development Full-Stack (SQL Server API + Vite UI)
echo    [2] Start Local SQL Server API Only (Port 5000)
echo    [3] Build Production Bundle
echo    [4] Preview Production Build
echo    [5] Run TypeScript Verification and Lint
echo.
echo  DATABASE and SQL SERVER (SSPU_Exam):
echo    [S] Check SQL Server DB Status (SSPU_Exam on acharya360\SQLEXPRESS)
echo    [M] Apply Versioned Additive Migrations (verified backup first)
echo.
echo  DEPLOYMENT and GIT:
echo    [6] Push to GitHub (Smart Commit and Sync)
echo    [7] Deploy to Vercel (Preview or Production)
echo    [8] Full Safe Release (Lint + Build + Push + Vercel Prod)
echo.
echo  MAINTENANCE:
echo    [9] Clean Build Artifacts and Cache
echo    [R] Fresh Reinstall (clean node_modules and npm install)
echo    [0] Exit
echo ----------------------------------------------------------------------------
set "USER_CHOICE=1"
set /p "USER_CHOICE=Enter choice [0-9, S, M, R] (Default is 1): "
set "USER_CHOICE=%USER_CHOICE: =%"

if /i "%USER_CHOICE%"=="1" goto :action_dev
if /i "%USER_CHOICE%"=="2" goto :action_server
if /i "%USER_CHOICE%"=="3" goto :action_build
if /i "%USER_CHOICE%"=="4" goto :action_preview
if /i "%USER_CHOICE%"=="5" goto :action_lint
if /i "%USER_CHOICE%"=="s" goto :action_sql_status
if /i "%USER_CHOICE%"=="m" goto :action_sql_migrate
if /i "%USER_CHOICE%"=="6" goto :action_git_push
if /i "%USER_CHOICE%"=="7" goto :action_deploy
if /i "%USER_CHOICE%"=="8" goto :action_release
if /i "%USER_CHOICE%"=="9" goto :action_clean
if /i "%USER_CHOICE%"=="r" goto :action_reinstall
if /i "%USER_CHOICE%"=="0" goto :action_exit

echo [ERROR] Invalid selection: '%USER_CHOICE%'. Please select valid option.
echo.
goto :menu

:: ----------------------------------------------------------------------------
:: Actions: Dev, Server, Database, Build, Preview, Lint
:: ----------------------------------------------------------------------------
:action_dev
call :resolve_port
echo ----------------------------------------------------------------------------
echo  Acharya360 ExamTrack - Full Stack Development Mode
echo  Database Server : Microsoft SQL Server (acharya360\SQLEXPRESS)
echo  Database Name   : SSPU_Exam
echo  Backend API     : http://localhost:5000 (Express + SQL Bridge)
echo  Frontend UI     : http://localhost:%PORT% (Vite + React 19)
echo ----------------------------------------------------------------------------
echo.

:: Check or Launch Backend API Server
netstat -ano | findstr /R /C:":5000 " >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Starting SSPU_Exam API backend server on port 5000...
    start "Acharya360 SSPU_Exam API" /min cmd /c "node server.js"
    timeout /t 2 /nobreak >nul
) else (
    echo [INFO] SSPU_Exam API backend server is active on port 5000.
)

start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"
call npx vite --port=%PORT% --host=0.0.0.0
echo.
echo Server stopped.
goto :finish_action

:action_server
echo ----------------------------------------------------------------------------
echo  Starting SSPU_Exam Express API Server on port 5000...
echo ----------------------------------------------------------------------------
node server.js
goto :finish_action

:action_sql_status
echo ----------------------------------------------------------------------------
echo  Checking Microsoft SQL Server Database Status: SSPU_Exam
echo  Server: acharya360\SQLEXPRESS
echo ----------------------------------------------------------------------------
sqlcmd -S "acharya360\SQLEXPRESS" -E -d SSPU_Exam -Q "SET NOCOUNT ON; SELECT 'profiles' as [Table], count(*) as [Records] FROM profiles UNION ALL SELECT 'programs', count(*) FROM programs UNION ALL SELECT 'exam_schedules', count(*) FROM exam_schedules UNION ALL SELECT 'exam_tasks', count(*) FROM exam_tasks UNION ALL SELECT 'course_master', count(*) FROM course_master UNION ALL SELECT 'student_marks', count(*) FROM student_marks;"
echo.
goto :finish_action

:action_sql_migrate
echo ----------------------------------------------------------------------------
echo  Applying versioned additive migrations to SSPU_Exam
echo  Pending changes are checked for destructive SQL, then a COPY_ONLY
echo  checksummed backup is verified before anything is applied.
echo  The legacy create/seed scripts are never run from this launcher.
echo ----------------------------------------------------------------------------
node scripts\migrate.mjs
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Migration failed. No further schema change was attempted.
    pause
    goto :finish_action
)
echo.
goto :action_sql_status

:action_build
echo ----------------------------------------------------------------------------
echo  Building Production Distribution - npm run build
echo ----------------------------------------------------------------------------
call npm run build
if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Production build generated in /dist directory.
) else (
    echo.
    echo [ERROR] Build failed! Check compiler logs above.
)
echo.
goto :finish_action

:action_preview
echo ----------------------------------------------------------------------------
echo  Previewing Production Build...
echo ----------------------------------------------------------------------------
if not exist "dist\" (
    echo [WARN] /dist folder does not exist. Triggering build first...
    call npm run build
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Build failed! Cannot preview.
        goto :finish_action
    )
)
call npm run preview
goto :finish_action

:action_lint
echo ----------------------------------------------------------------------------
echo  Running TypeScript Typecheck - npm run lint
echo ----------------------------------------------------------------------------
call npm run lint
if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] No TypeScript or Lint errors found! Codebase is healthy.
) else (
    echo.
    echo [WARN] Issues detected during type checking.
)
echo.
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Git Push & Sync
:: ----------------------------------------------------------------------------
:action_git_push
echo ----------------------------------------------------------------------------
echo  Git Status and Push to GitHub
echo ----------------------------------------------------------------------------
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in PATH!
    goto :finish_action
)

for /f "tokens=*" %%b in ('git branch --show-current 2^>nul') do set "GIT_BRANCH=%%b"
if "%GIT_BRANCH%"=="" set "GIT_BRANCH=main"
echo Current Branch: %GIT_BRANCH%
echo.

git status --short
echo.

set "COMMIT_MSG="
if not "%EXTRA_ARG%"=="" (
    set "COMMIT_MSG=%EXTRA_ARG%"
) else (
    set /p "COMMIT_MSG=Enter commit message (Press Enter for auto-timestamp): "
)

if "%COMMIT_MSG%"=="" (
    set "COMMIT_MSG=Auto-update: %DATE% %TIME%"
)

echo.
echo Adding changes to git...
git add -A

git diff-index --quiet HEAD --
if %ERRORLEVEL% equ 0 (
    echo [INFO] No new changes to commit.
) else (
    echo Committing: "%COMMIT_MSG%"
    git commit -m "%COMMIT_MSG%"
)

echo Pushing to origin/%GIT_BRANCH%...
git push origin %GIT_BRANCH%
if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Successfully synced and pushed to GitHub!
) else (
    echo.
    echo [ERROR] Git push encountered an error. Check network or remote conflicts.
)
echo.
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Vercel Deployment
:: ----------------------------------------------------------------------------
:action_deploy
echo ----------------------------------------------------------------------------
echo  Vercel Cloud Deployment
echo ----------------------------------------------------------------------------
echo Checking Vercel login status...
for /f "tokens=*" %%u in ('npx --yes vercel whoami 2^>nul') do set "VERCEL_USER=%%u"
if "%VERCEL_USER%"=="" (
    echo [WARN] Not currently logged in to Vercel.
    echo Opening Vercel login...
    call npx vercel login
) else (
    echo [OK] Logged in as Vercel user: %VERCEL_USER%
)

if /i "%EXTRA_ARG%"=="prod" goto :deploy_prod
if /i "%EXTRA_ARG%"=="preview" goto :deploy_preview

:deploy_menu
echo.
echo Select Deployment Target:
echo   [1] Preview Deployment (Staging / Testing URL)
echo   [2] Production Deployment (Live URL: --prod)
echo   [3] Re-authenticate Vercel (Switch Account)
echo   [4] Cancel / Return
echo.
set "DCHOICE=2"
set /p "DCHOICE=Enter choice [1-4] (Default is 2 - Production): "
set "DCHOICE=%DCHOICE: =%"

if "%DCHOICE%"=="1" goto :deploy_preview
if "%DCHOICE%"=="2" goto :deploy_prod
if "%DCHOICE%"=="3" (
    call npx vercel login
    goto :deploy_menu
)
if "%DCHOICE%"=="4" goto :finish_action
echo [ERROR] Invalid choice.
goto :deploy_menu

:deploy_preview
echo.
echo Starting Vercel Preview Deployment...
call npx vercel
if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Preview deployment completed!
) else (
    echo.
    echo [ERROR] Deployment failed.
)
goto :finish_action

:deploy_prod
echo.
echo Starting Vercel Production Deployment (--prod)...
call npx vercel --prod
if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Live Production deployment completed!
) else (
    echo.
    echo [ERROR] Production deployment failed.
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Full Safe Release (Lint -> Build -> Push -> Vercel Prod)
:: ----------------------------------------------------------------------------
:action_release
echo ============================================================================
echo  ACHARYA360 SAFE RELEASE PIPELINE
echo  Step 1: TypeScript Lint   -> Step 2: Production Build
echo  Step 3: GitHub Push       -> Step 4: Vercel Production Deploy
echo ============================================================================
echo.

echo [Step 1/4] Running TypeScript Lint Verification...
call npm run lint
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ABORT] Lint check failed! Fix TypeScript errors before deploying to production.
    goto :finish_action
)
echo [OK] TypeScript check passed.
echo.

echo [Step 2/4] Generating Production Build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ABORT] Build failed! Aborting release.
    goto :finish_action
)
echo [OK] Production bundle built cleanly.
echo.

echo [Step 3/4] Committing and Pushing to GitHub...
set "REL_MSG=%EXTRA_ARG%"
if "%REL_MSG%"=="" (
    set /p "REL_MSG=Enter release commit message (Press Enter for default): "
)
if "%REL_MSG%"=="" set "REL_MSG=Release update: %DATE% %TIME%"

git add -A
git diff-index --quiet HEAD --
if %ERRORLEVEL% neq 0 (
    git commit -m "%REL_MSG%"
)
git push
if %ERRORLEVEL% neq 0 (
    echo.
    echo [WARN] Git push failed. Please verify GitHub connection.
) else (
    echo [OK] Changes pushed to GitHub.
)
echo.

echo [Step 4/4] Deploying to Vercel Production (--prod)...
call npx vercel --prod
if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================================================
    echo  [CONGRATULATIONS] Full Safe Release Successfully Deployed!
    echo ============================================================================
) else (
    echo.
    echo [ERROR] Vercel production deployment encountered an issue.
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Maintenance: Clean & Reinstall
:: ----------------------------------------------------------------------------
:action_clean
echo ----------------------------------------------------------------------------
echo  Cleaning build artifacts and caches...
echo ----------------------------------------------------------------------------
if exist "dist\" (
    rmdir /s /q "dist"
    echo - Removed /dist directory
)
if exist "node_modules\.vite\" (
    rmdir /s /q "node_modules\.vite"
    echo - Cleared Vite cache (.vite)
)
if exist "server.js" (
    del /f /q "server.js"
    echo - Removed server.js
)
echo [SUCCESS] Workspace clean complete.
echo.
goto :finish_action

:action_reinstall
echo ----------------------------------------------------------------------------
echo  Performing Fresh Dependency Reinstall...
echo ----------------------------------------------------------------------------
echo - Removing node_modules...
if exist "node_modules\" rmdir /s /q "node_modules"
if exist "package-lock.json" del /f /q "package-lock.json"
echo - Installing fresh dependencies...
call npm install
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Dependencies reinstalled successfully.
) else (
    echo [ERROR] npm install encountered errors.
)
echo.
goto :finish_action

:: ----------------------------------------------------------------------------
:: Help Dialog
:: ----------------------------------------------------------------------------
:show_help
echo.
echo Acharya360 ExamTrack Master Controller Usage:
echo.
echo   run.bat                    Launch interactive master dashboard menu
echo   run.bat dev [PORT]         Start Vite dev server (optional custom port)
echo   run.bat build              Build production bundle
echo   run.bat preview            Preview production build
echo   run.bat lint               Run TypeScript validation (tsc --noEmit)
echo   run.bat push [MSG]         Git add, commit, and push with message
echo   run.bat deploy [prod^|prev] Deploy to Vercel (production or preview)
echo   run.bat release [MSG]      Full Safe Release (Lint + Build + Push + Prod)
echo   run.bat clean              Clear dist and vite cache
echo   run.bat reinstall          Fresh reinstall of node_modules
echo   run.bat help               Show this help dialog
echo.
exit /b 0

:: ----------------------------------------------------------------------------
:: Exit
:: ----------------------------------------------------------------------------
:action_exit
echo.
echo Exiting Acharya360 ExamTrack Master Controller. Have a productive day!
exit /b 0
