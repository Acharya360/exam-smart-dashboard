@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Acharya360 ExamTrack - Unified Master Control & Operations Script
:: ============================================================================

title Acharya360 ExamTrack - Master Control

:: 1. Working directory
cd /d "%~dp0"

:: 2. Configuration & Defaults
set "DEFAULT_PORT=3000"
set "PORT=%DEFAULT_PORT%"
set "ENV_FILE=.env"
set "ENV_EXAMPLE=.env.example"
set "LOG_DIR=logs"
set "TIMESTAMP=%DATE:/=-%_%TIME::=-%"
set "TIMESTAMP=%TIMESTAMP: =0%"

:: Ensure logs directory exists
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

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
if /i "%CMD_ARG%"=="reset-db" goto :action_reset_db
if /i "%CMD_ARG%"=="build" goto :preflight_cli
if /i "%CMD_ARG%"=="preview" goto :preflight_cli
if /i "%CMD_ARG%"=="lint" goto :preflight_cli
if /i "%CMD_ARG%"=="clean" goto :preflight_cli
if /i "%CMD_ARG%"=="reinstall" goto :preflight_cli
if /i "%CMD_ARG%"=="install" goto :preflight_cli
if /i "%CMD_ARG%"=="push" goto :action_git_push
if /i "%CMD_ARG%"=="deploy" goto :action_deploy
if /i "%CMD_ARG%"=="release" goto :action_release
if /i "%CMD_ARG%"=="vercel-login" goto :action_vercel_login
if /i "%CMD_ARG%"=="playwright" goto :action_playwright
if /i "%CMD_ARG%"=="chrome" goto :action_open_chrome
if /i "%CMD_ARG%"=="open" goto :action_open_chrome

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
    echo [%TIMESTAMP%] FATAL: Node.js missing >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v 2^>nul') do set "NODE_VERSION=%%i"
echo       - Node.js version: !NODE_VERSION! [OK]

echo [2/4] Checking npm package manager...
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not found in PATH!
    echo [%TIMESTAMP%] FATAL: npm missing >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
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
    echo       - [WARN] node_modules not detected. Installing dependencies...
    echo [%TIMESTAMP%] INFO: Running initial npm install >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] npm install failed. Please check the logs above.
        echo [%TIMESTAMP%] ERROR: npm install failed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
        pause
        exit /b 1
    )
) else (
    echo       - Dependencies verified.
)

echo.
echo [READY] System initialized successfully.
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
:: Dynamic Port Allocation with safe process checks
:: ----------------------------------------------------------------------------
:resolve_port
if not "%EXTRA_ARG%"=="dev" if not "%EXTRA_ARG%"=="" (
    set "PORT=%EXTRA_ARG%"
    goto :eof
)
set "CHECK_PORT=%PORT%"
:check_port_loop
netstat -ano | findstr /R /C:":%CHECK_PORT% " >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [WARN] Port %CHECK_PORT% is in use. Attempting to identify the process...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%CHECK_PORT% "') do (
        set "PID=%%p"
    )
    if defined PID (
        tasklist /FI "PID eq !PID!" /NH 2>nul | findstr /I "node.exe" >nul 2>nul
        if !ERRORLEVEL! equ 0 (
            echo [INFO] Node.js process !PID! is using port %CHECK_PORT%. This may be a previous instance.
            echo       Use 'run.bat dev' or kill it manually before starting a new server.
            echo [%TIMESTAMP%] WARN: Port %CHECK_PORT% occupied by node PID !PID! >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
        ) else (
            echo [INFO] Non-node process !PID! is using port %CHECK_PORT%. Not killing automatically.
            echo       Please free the port manually or specify an alternative with run.bat dev ^<port^>.
        )
    )
    set /a CHECK_PORT+=1
    goto :check_port_loop
)
set "PORT=%CHECK_PORT%"
if not "%PORT%"=="%DEFAULT_PORT%" (
    echo [INFO] Port %DEFAULT_PORT% occupied. Dynamically assigned free port: %PORT%
    echo [%TIMESTAMP%] INFO: Assigned dynamic port %PORT% >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
)
goto :eof

:: ----------------------------------------------------------------------------
:: Helper: Pause & Loop
:: ----------------------------------------------------------------------------
:finish_action
if not "%CMD_ARG%"=="" exit /b %1
echo.
echo [%TIMESTAMP%] Session ended >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
pause
goto :menu

:: ----------------------------------------------------------------------------
:: Interactive Menu
:: ----------------------------------------------------------------------------
:menu
call :print_banner
echo.
echo ----------------------------------------------------------------------------
echo  DEVELOPMENT and SERVERS:
echo    [1] Start Development Full-Stack (SQL Server API + Vite UI)
echo    [C] Open Google Chrome at App URL (http://localhost:%PORT%)
echo    [2] Start Local SQL Server API Only (Port 5000)
echo    [3] Build Production Bundle
echo    [4] Preview Production Build
echo    [5] Run TypeScript Verification and Lint
echo.
echo  DATABASE and SQL SERVER (SSPU_Exam):
echo    [S] Check SQL Server DB Status (SSPU_Exam on localhost\SQLEXPRESS)
echo    [M] Apply Versioned Additive Migrations (verified backup first)
echo    [X] Reset Operational DB (Keep User Profiles intact)
echo.
echo  DEPLOYMENT and GIT:
echo    [6] Push to GitHub (Verify + Stage + Commit + Sync)
echo    [7] Deploy to Vercel (Preview or Production)
echo    [V] Login / Re-authenticate Vercel CLI
echo    [8] Full Safe Release (Lint + Build + Push + Vercel Prod)
echo.
echo  TESTING and TOOLS:
echo    [P] Install / Verify Playwright and Playwright MCP
echo.
echo  MAINTENANCE:
echo    [9] Clean Build Artifacts and Cache
echo    [R] Fresh Reinstall (clean node_modules and npm install)
echo    [0] Exit
echo ----------------------------------------------------------------------------
set "CHOICE=1"
set /p "CHOICE=Enter choice [0-9, S, M, X, V, P, R] (Default is 1): "
set "CHOICE=%CHOICE: =%"

if "%CHOICE%"=="1" goto :action_dev
if /i "%CHOICE%"=="C" goto :action_open_chrome
if "%CHOICE%"=="2" goto :action_server
if "%CHOICE%"=="3" goto :action_build
if "%CHOICE%"=="4" goto :action_preview
if "%CHOICE%"=="5" goto :action_lint
if /i "%CHOICE%"=="S" goto :action_sql_status
if /i "%CHOICE%"=="M" goto :action_sql_migrate
if /i "%CHOICE%"=="X" goto :action_reset_db
if "%CHOICE%"=="6" goto :action_git_push
if "%CHOICE%"=="7" goto :action_deploy
if /i "%CHOICE%"=="V" goto :action_vercel_login
if "%CHOICE%"=="8" goto :action_release
if /i "%CHOICE%"=="P" goto :action_playwright
if "%CHOICE%"=="9" goto :action_clean
if /i "%CHOICE%"=="R" goto :action_reinstall
if "%CHOICE%"=="0" goto :action_exit

echo [ERROR] Invalid selection "%CHOICE%". Please try again.
timeout /t 2 >nul
goto :menu

:: ----------------------------------------------------------------------------
:: Action: Start Full-Stack Dev
:: ----------------------------------------------------------------------------
:action_dev
call :resolve_port
echo ----------------------------------------------------------------------------
echo  Launching Acharya360 ExamTrack Development Stack...
echo  Database Server : localhost\SQLEXPRESS
echo  Database Name   : SSPU_Exam
echo  Backend API     : http://localhost:5000 (Express + SQL Bridge)
echo  Frontend UI     : http://localhost:%PORT% (Vite + React 19)
echo ----------------------------------------------------------------------------
echo [%TIMESTAMP%] Dev session started on port %PORT% >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
echo.

netstat -ano | findstr /R /C:":5000 " >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Starting SSPU_Exam API backend server on port 5000...
    start "Acharya360 SSPU_Exam API" /min cmd /c "node server.js"
    timeout /t 2 /nobreak >nul
    echo [%TIMESTAMP%] INFO: Backend API started >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
) else (
    echo [INFO] SSPU_Exam API backend server is active on port 5000.
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":5000 "') do set "API_PID=%%p"
    if defined API_PID (
        tasklist /FI "PID eq !API_PID!" /NH 2>nul | findstr /I "node.exe" >nul 2>nul
        if !ERRORLEVEL! equ 0 (
            echo       (Active instance verified under Node.js PID !API_PID!)
        )
    )
)

echo [INFO] Launching Vite development server on port %PORT%...
call :open_chrome_url "http://localhost:%PORT%"
call npm run dev -- --port %PORT%
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Start Server Only
:: ----------------------------------------------------------------------------
:action_server
echo ----------------------------------------------------------------------------
echo  Starting SSPU_Exam API Server (Node Express) on Port 5000...
echo ----------------------------------------------------------------------------
echo [%TIMESTAMP%] Standalone API server started >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
node server.js
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: SQL Server Status
:: ----------------------------------------------------------------------------
:action_sql_status
echo ----------------------------------------------------------------------------
echo  Checking Microsoft SQL Server Database Status (SSPU_Exam)...
echo ----------------------------------------------------------------------------
node -e "const sql = require('mssql'); const config = { server: 'localhost', database: 'SSPU_Exam', options: { trustedConnection: true, trustServerCertificate: true, enableArithAbort: true, instanceName: 'SQLEXPRESS' } }; (async () => { try { const pool = await sql.connect(config); const r = await pool.request().query('SELECT COUNT(*) AS tables_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\''); console.log('[SUCCESS] Successfully connected to SSPU_Exam on localhost\\SQLEXPRESS.'); console.log('[INFO] Operational tables registered in schema: ' + r.recordset[0].tables_count); const users = await pool.request().query('SELECT COUNT(*) AS user_count FROM dbo.profiles'); console.log('[INFO] Configured faculty/admin user profiles: ' + users.recordset[0].user_count); pool.close(); } catch(e) { console.error('[ERROR] SQL Server connection failed: ' + e.message); } })();"
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Apply Additive Migrations
:: ----------------------------------------------------------------------------
:action_sql_migrate
echo ----------------------------------------------------------------------------
echo  Applying Versioned Additive Migrations to SSPU_Exam...
echo ----------------------------------------------------------------------------
echo [%TIMESTAMP%] Migrations run started >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
call npm run migrate
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Reset Database (Keep Users)
:: ----------------------------------------------------------------------------
:action_reset_db
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
echo ===============================================================================
set /p CONFIRM_RESET="Are you sure you want to proceed? Type YES in capital letters to confirm: "

if not "%CONFIRM_RESET%"=="YES" (
    echo.
    echo Reset cancelled by user. No database records were modified.
    goto :finish_action
)

echo.
echo [1/2] Connecting to SQL Server and executing reset...
if exist "%~dp0reset_database_keep_users.sql" (
    sqlcmd -S "localhost\SQLEXPRESS" -d "SSPU_Exam" -E -C -i "%~dp0reset_database_keep_users.sql"
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] SQL Script encountered an error during execution.
    ) else (
        echo [2/2] Reset complete! Operational data cleaned, user accounts preserved.
        echo [%TIMESTAMP%] Reset database executed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
    )
) else (
    echo [ERROR] reset_database_keep_users.sql not found!
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Build Production Bundle
:: ----------------------------------------------------------------------------
:action_build
echo ----------------------------------------------------------------------------
echo  Building Production Bundle (Vite)...
echo ----------------------------------------------------------------------------
echo [%TIMESTAMP%] Production build started >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
call npm run build
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Production build generated in /dist.
    echo [%TIMESTAMP%] SUCCESS: Build complete >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
) else (
    echo [ERROR] Build failed. See logs above.
    echo [%TIMESTAMP%] ERROR: Build failed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Preview Production Build
:: ----------------------------------------------------------------------------
:action_preview
echo ----------------------------------------------------------------------------
echo  Previewing Production Build from /dist...
echo ----------------------------------------------------------------------------
call :open_chrome_url "http://localhost:4173"
call npm run preview
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Run Lint / Type Check
:: ----------------------------------------------------------------------------
:action_lint
echo ----------------------------------------------------------------------------
echo  Running TypeScript Validation (tsc --noEmit)...
echo ----------------------------------------------------------------------------
echo [%TIMESTAMP%] Lint run started >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
call npm.cmd run lint
if %ERRORLEVEL% equ 0 (
    echo [PASS] No TypeScript errors detected.
    echo [%TIMESTAMP%] PASS: Lint passed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
) else (
    echo [FAIL] TypeScript errors detected. Review before production deploy.
    echo [%TIMESTAMP%] FAIL: Lint failed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Smart Git Push & Verification
:: ----------------------------------------------------------------------------
:action_git_push
echo ----------------------------------------------------------------------------
echo  Git Smart Commit and Sync
echo ----------------------------------------------------------------------------
for /f "tokens=*" %%b in ('git branch --show-current 2^>nul') do set "GIT_BRANCH=%%b"
if "%GIT_BRANCH%"=="" set "GIT_BRANCH=main"

echo [Branch] %GIT_BRANCH%
echo [Remote] https://github.com/Acharya360/exam-smart-dashboard
echo.
echo [1/3] Running TypeScript Verification...
call npm.cmd run lint
if %ERRORLEVEL% neq 0 (
    echo [WARNING] TypeScript check reported errors.
    set /p PROCEED_PUSH="Proceed anyway? (y/N): "
    if /i not "!PROCEED_PUSH!"=="y" goto :finish_action
) else (
    echo [PASS] TypeScript check passed.
)

echo.
echo [2/3] Checking working directory...
set "COMMIT_MSG=%EXTRA_ARG%"
git status --porcelain > "%temp%\git_status.tmp" 2>nul
for /f %%A in ("%temp%\git_status.tmp") do set HAS_CHANGES=%%~zA
del "%temp%\git_status.tmp" 2>nul

if not "%HAS_CHANGES%"=="" if not "%HAS_CHANGES%"=="0" (
    git status -s
    if "%COMMIT_MSG%"=="" (
        set /p "COMMIT_MSG=Enter commit message (Press Enter for auto-update): "
    )
    if "!COMMIT_MSG!"=="" set "COMMIT_MSG=Auto-update: %DATE% %TIME%"
    git add -A
    git commit -m "!COMMIT_MSG!"
) else (
    echo Working tree is clean.
)

echo.
echo [3/3] Pushing to GitHub (origin/%GIT_BRANCH%)...
git push origin %GIT_BRANCH%
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%c in ('git rev-parse --short HEAD 2^>nul') do set LATEST_HASH=%%c
    echo.
    echo [SUCCESS] Push completed and confirmed!
    echo Commit: !LATEST_HASH!
    echo URL   : https://github.com/Acharya360/exam-smart-dashboard/commit/!LATEST_HASH!
) else (
    echo [ERROR] Git push failed. Verify GitHub connection and permissions.
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Vercel Login
:: ----------------------------------------------------------------------------
:action_vercel_login
echo ----------------------------------------------------------------------------
echo  Vercel CLI Authentication Setup
echo ----------------------------------------------------------------------------
echo Checking current login status...
set "VERCEL_USER="
for /f "tokens=*" %%u in ('npx --yes vercel whoami 2^>nul') do set "VERCEL_USER=%%u"

if not "%VERCEL_USER%"=="" (
    echo [OK] Currently logged in as: %VERCEL_USER%
    echo.
    set /p RELOGIN="Do you want to re-authenticate / switch accounts? (y/N): "
    if /i not "!RELOGIN!"=="y" goto :finish_action
)

echo Opening Vercel login in your default web browser...
call npx --yes vercel login
echo.
for /f "tokens=*" %%u in ('npx --yes vercel whoami 2^>nul') do set "VERCEL_USER=%%u"
if not "%VERCEL_USER%"=="" (
    echo [SUCCESS] Authenticated as: %VERCEL_USER%
) else (
    echo [WARN] Authentication did not complete.
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Vercel Deployment Menu
:: ----------------------------------------------------------------------------
:action_deploy
echo ----------------------------------------------------------------------------
echo  Vercel Cloud Deployment
echo ----------------------------------------------------------------------------
echo Checking Vercel login status...
set "VERCEL_USER="
for /f "tokens=*" %%u in ('npx --yes vercel whoami 2^>nul') do set "VERCEL_USER=%%u"
if "%VERCEL_USER%"=="" (
    echo [WARN] Not currently logged in to Vercel.
    echo Opening Vercel login...
    call npx --yes vercel login
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
    call npx --yes vercel login
    goto :deploy_menu
)
if "%DCHOICE%"=="4" goto :finish_action
echo [ERROR] Invalid choice.
goto :deploy_menu

:deploy_preview
echo.
echo Starting Vercel Preview Deployment...
call npx vercel --yes
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Preview deployment completed!
) else (
    echo [ERROR] Deployment failed.
)
goto :finish_action

:deploy_prod
echo.
echo Starting Vercel Production Deployment (--prod)...
call npx vercel --prod --yes
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Live Production deployment completed!
) else (
    echo [ERROR] Production deployment failed.
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Full Safe Release
:: ----------------------------------------------------------------------------
:action_release
echo ============================================================================
echo  ACHARYA360 SAFE RELEASE PIPELINE
echo  Step 1: TypeScript Lint   --^> Step 2: Production Build
echo  Step 3: GitHub Push       --^> Step 4: Vercel Production Deploy
echo ============================================================================
echo [%TIMESTAMP%] Release pipeline started >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
echo.

echo [Step 1/4] Running TypeScript Lint Verification...
call npm.cmd run lint
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ABORT] Lint check failed! Fix TypeScript errors before deploying to production.
    echo [%TIMESTAMP%] ABORT: Lint failed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
    goto :finish_action
)
echo [OK] TypeScript check passed.
echo.

echo [Step 2/4] Generating Production Build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ABORT] Build failed! Aborting release.
    echo [%TIMESTAMP%] ABORT: Build failed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
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
    echo [WARN] Git push failed. Please verify GitHub connection.
    echo [%TIMESTAMP%] WARN: Git push failed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
) else (
    echo [OK] Changes pushed to GitHub.
)
echo.

echo [Step 4/4] Deploying to Vercel Production (--prod)...
echo Checking Vercel login credentials...
set "VERCEL_USER="
for /f "tokens=*" %%u in ('npx --yes vercel whoami 2^>nul') do set "VERCEL_USER=%%u"
if "%VERCEL_USER%"=="" (
    echo [WARN] Not currently logged in to Vercel.
    echo Opening Vercel login in your browser...
    call npx --yes vercel login
) else (
    echo [OK] Authenticated as Vercel user: %VERCEL_USER%
)

call npx vercel --prod --yes
if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================================================
    echo  [CONGRATULATIONS] Full Safe Release Successfully Deployed!
    echo ============================================================================
    echo [%TIMESTAMP%] SUCCESS: Release deployed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
) else (
    echo.
    echo ============================================================================
    echo  [NOTE] Direct Vercel CLI deploy exited.
    echo  If this repository is connected to Vercel on GitHub:
    echo  Vercel is already automatically building and deploying from origin/main!
    echo  Check your status at: https://vercel.com
    echo ============================================================================
    echo [%TIMESTAMP%] NOTE: Vercel deploy exited with code %ERRORLEVEL% >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
)
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action: Playwright & Playwright MCP Setup & Verification
:: ----------------------------------------------------------------------------
:action_playwright
echo ----------------------------------------------------------------------------
echo  Playwright and Playwright MCP Installation and Verification
echo ----------------------------------------------------------------------------
echo [1/4] Installing / verifying @playwright/test...
call npm install --save-dev @playwright/test
if %ERRORLEVEL% neq 0 (
    echo [ERROR] @playwright/test installation failed.
    goto :finish_action
)

echo.
echo [2/4] Installing Playwright browsers...
call npx playwright install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Playwright browser installation failed.
    goto :finish_action
)

echo.
echo [3/4] Verifying Playwright CLI...
call npx playwright --version

echo.
echo [4/4] Verifying @playwright/mcp...
call npm list @playwright/mcp --depth=0 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing @playwright/mcp...
    call npm install --save-dev @playwright/mcp
)
call npm list @playwright/mcp --depth=0

echo.
echo [SUCCESS] Playwright and Playwright MCP are ready.
goto :finish_action

:: ----------------------------------------------------------------------------
:: Maintenance: Clean & Reinstall
:: ----------------------------------------------------------------------------
:action_clean
echo ----------------------------------------------------------------------------
echo  Cleaning build artifacts and caches...
echo [%TIMESTAMP%] Clean started >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
echo ----------------------------------------------------------------------------
if exist "dist\" (
    rmdir /s /q "dist"
    echo - Removed /dist directory
)
if exist "node_modules\.vite\" (
    rmdir /s /q "node_modules\.vite"
    echo - Cleared Vite cache
)
echo [SUCCESS] Workspace clean complete.
echo [%TIMESTAMP%] INFO: Clean completed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
echo.
goto :finish_action

:action_reinstall
echo ----------------------------------------------------------------------------
echo  Performing Fresh Dependency Reinstall...
echo [%TIMESTAMP%] Reinstall started >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
echo ----------------------------------------------------------------------------
echo - Removing node_modules...
if exist "node_modules\" rmdir /s /q "node_modules"
echo.
echo - Installing fresh dependencies...
call npm install
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Dependencies reinstalled successfully.
    echo [%TIMESTAMP%] INFO: Reinstall succeeded >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
) else (
    echo [ERROR] npm install encountered errors.
    echo [%TIMESTAMP%] ERROR: Reinstall failed >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
)
echo.
goto :finish_action

:: ----------------------------------------------------------------------------
:: Action & Helpers: Google Chrome Integration
:: ----------------------------------------------------------------------------
:action_open_chrome
call :resolve_port
echo [INFO] Opening Google Chrome to http://localhost:%PORT%...
call :open_chrome_now "http://localhost:%PORT%"
goto :finish_action

:open_chrome_url
set "TARGET_URL=%~1"
start "" cmd /c "timeout /t 2 /nobreak >nul & if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" %TARGET_URL%) else (start chrome %TARGET_URL% 2>nul || start %TARGET_URL%)"
goto :eof

:open_chrome_now
set "TARGET_URL=%~1"
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" %TARGET_URL%
) else (
    start chrome %TARGET_URL% 2>nul || start %TARGET_URL%
)
goto :eof

:: ----------------------------------------------------------------------------
:: Help Dialog
:: ----------------------------------------------------------------------------
:show_help
echo.
echo Acharya360 ExamTrack Master Controller Usage:
echo.
echo   run.bat                    Launch interactive master dashboard menu
echo   run.bat dev [PORT]         Start Vite dev server and auto-open Chrome
echo   run.bat chrome [PORT]      Open Google Chrome directly to the app URL
echo   run.bat server             Start local Express API server on port 5000
echo   run.bat build              Build production bundle
echo   run.bat preview            Preview production build
echo   run.bat lint               Run TypeScript validation (tsc --noEmit)
echo   run.bat db                 Check SQL Server database connection (SSPU_Exam)
echo   run.bat migrate            Apply versioned additive migrations
echo   run.bat reset-db           Reset operational database (keep user profiles)
echo   run.bat push [MSG]         Git add, commit, and push with verification
echo   run.bat vercel-login       Authenticate or switch Vercel CLI account
echo   run.bat deploy [prod^|prev] Deploy to Vercel (production or preview)
echo   run.bat release [MSG]      Full Safe Release (Lint + Build + Push + Prod)
echo   run.bat playwright         Install / verify Playwright and Playwright MCP
echo   run.bat clean              Clear dist and vite cache
echo   run.bat reinstall          Fresh reinstall of node_modules
echo   run.bat help               Show this help dialog
echo.
echo All operations log to logs/deploy_YYYY-MM-DD.log
echo.
exit /b 0

:: ----------------------------------------------------------------------------
:: Exit Action
:: ----------------------------------------------------------------------------
:action_exit
echo.
echo Exiting Acharya360 ExamTrack Master Controller. Have a productive day!
echo [%TIMESTAMP%] Session exited >> "%LOG_DIR%\deploy_%DATE:/=-%.log"
exit /b 0
