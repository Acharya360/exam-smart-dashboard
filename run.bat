@echo off
setlocal

echo ===========================================
echo    Exam Smart Dashboard - Startup Script
echo ===========================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

:: 2. Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed or not in your PATH.
    echo Please install Node.js (which includes npm) and try again.
    pause
    exit /b 1
)

echo [OK] Node.js and npm are installed.

:: 3. Check if node_modules exists, install dependencies if missing
if not exist "node_modules\" (
    echo.
    echo [INFO] 'node_modules' folder not found. Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed. Please check the errors above.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Dependencies are already installed.
)

echo.
echo ===========================================
echo    Starting Development Server...
echo ===========================================
echo.

:: 4. Start the application
call npm run dev

echo.
echo Server stopped.
pause
