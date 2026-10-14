@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Acharya360 ExamTrack - Smart Dynamic Startup Script
:: ============================================================================

title Acharya360 ExamTrack Dashboard

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

if /i "%CMD_ARG%"=="help" goto :show_help
if /i "%CMD_ARG%"=="--help" goto :show_help
if /i "%CMD_ARG%"=="-h" goto :show_help

if /i "%CMD_ARG%"=="dev" goto :preflight_cli
if /i "%CMD_ARG%"=="start" goto :preflight_cli
if /i "%CMD_ARG%"=="build" goto :preflight_cli
if /i "%CMD_ARG%"=="preview" goto :preflight_cli
if /i "%CMD_ARG%"=="lint" goto :preflight_cli
if /i "%CMD_ARG%"=="clean" goto :preflight_cli
if /i "%CMD_ARG%"=="reinstall" goto :preflight_cli
if /i "%CMD_ARG%"=="install" goto :preflight_cli

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
echo   ACHARYA360 EXAMTRACK - UNIVERSITY ERP EXAMINATION OPERATIONS
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
:: Interactive Menu
:: ----------------------------------------------------------------------------
:menu
echo ----------------------------------------------------------------------------
echo  Select an Operation:
echo ----------------------------------------------------------------------------
echo   [1] Start Development Server - Vite
echo   [2] Build Production Bundle
echo   [3] Preview Production Build
echo   [4] Run TypeScript Verification and Lint
echo   [5] Clean Build Cache and Artifacts
echo   [6] Fresh Reinstall - clean node_modules and npm install
echo   [7] Exit
echo ----------------------------------------------------------------------------
set "USER_CHOICE=1"
set /p "USER_CHOICE=Enter choice [1-7] (Default is 1): "
set "USER_CHOICE=%USER_CHOICE: =%"

if "%USER_CHOICE%"=="1" goto :action_dev
if "%USER_CHOICE%"=="2" goto :action_build
if "%USER_CHOICE%"=="3" goto :action_preview
if "%USER_CHOICE%"=="4" goto :action_lint
if "%USER_CHOICE%"=="5" goto :action_clean
if "%USER_CHOICE%"=="6" goto :action_reinstall
if "%USER_CHOICE%"=="7" goto :action_exit

echo [ERROR] Invalid selection: '%USER_CHOICE%'. Please select between 1 and 7.
echo.
goto :menu

:: ----------------------------------------------------------------------------
:: Action Completion Helper
:: ----------------------------------------------------------------------------
:finish_action
if not "%CMD_ARG%"=="" exit /b %1
pause
goto :menu

:: ----------------------------------------------------------------------------
:: Actions
:: ----------------------------------------------------------------------------
:action_dev
call :resolve_port
echo ----------------------------------------------------------------------------
echo  Starting Acharya360 ExamTrack on http://localhost:%PORT%
echo  Host: 0.0.0.0 - Accessible across local network
echo  Press Ctrl+C to terminate the server.
echo ----------------------------------------------------------------------------
echo.

start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"
call npx vite --port=%PORT% --host=0.0.0.0
echo.
echo Server stopped.
goto :finish_action

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

:show_help
echo.
echo Acharya360 ExamTrack Startup Script Usage:
echo.
echo   run.bat                 Launch interactive dashboard menu
echo   run.bat dev [PORT]      Directly start dev server (optional custom port)
echo   run.bat build           Build production bundle
echo   run.bat preview         Preview production build
echo   run.bat lint            Run TypeScript validation (tsc --noEmit)
echo   run.bat clean           Clear dist and vite cache
echo   run.bat reinstall       Fresh reinstall of node_modules
echo   run.bat help            Show this help dialog
echo.
exit /b 0

:action_exit
echo.
echo Exiting Acharya360 ExamTrack. Have a productive day!
exit /b 0
