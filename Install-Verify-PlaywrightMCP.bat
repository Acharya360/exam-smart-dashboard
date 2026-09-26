@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Playwright MCP - Install and Verify

echo.
echo ============================================================
echo   PLAYWRIGHT MCP - INSTALLATION AND VERIFICATION
echo ============================================================
echo.

REM ============================================================
REM 1. MOVE TO PROJECT ROOT
REM ============================================================

cd /d "%~dp0"

echo [INFO] Project root:
echo        %CD%
echo.

REM ============================================================
REM 2. VERIFY NODE.JS
REM ============================================================

echo ------------------------------------------------------------
echo [1/8] Checking Node.js
echo ------------------------------------------------------------

where node >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not available in PATH.
    echo.
    echo Install Node.js LTS from:
    echo https://nodejs.org/
    echo.
    goto :FAILED
)

node --version
if errorlevel 1 goto :FAILED

echo [OK] Node.js detected.
echo.

REM ============================================================
REM 3. VERIFY NPM
REM ============================================================

echo ------------------------------------------------------------
echo [2/8] Checking npm
echo ------------------------------------------------------------

where npm >nul 2>&1

if errorlevel 1 (
    echo [ERROR] npm is not available in PATH.
    goto :FAILED
)

call npm --version
if errorlevel 1 goto :FAILED

echo [OK] npm detected.
echo.

REM ============================================================
REM 4. VERIFY PACKAGE.JSON
REM ============================================================

echo ------------------------------------------------------------
echo [3/8] Checking project package.json
echo ------------------------------------------------------------

if not exist "package.json" (
    echo [WARN] package.json was not found in:
    echo        %CD%
    echo.
    echo Creating a minimal package.json for Playwright tooling.
    echo.

    call npm init -y

    if errorlevel 1 (
        echo [ERROR] Unable to create package.json.
        goto :FAILED
    )
)

echo [OK] package.json exists.
echo.

REM ============================================================
REM 5. INSTALL PLAYWRIGHT
REM ============================================================

echo ------------------------------------------------------------
echo [4/8] Installing / verifying Playwright
echo ------------------------------------------------------------

call npm install --save-dev @playwright/test

if errorlevel 1 (
    echo [ERROR] Playwright installation failed.
    goto :FAILED
)

echo [OK] @playwright/test installed.
echo.

REM ============================================================
REM 6. INSTALL PLAYWRIGHT BROWSERS
REM ============================================================

echo ------------------------------------------------------------
echo [5/8] Installing Playwright browsers
echo ------------------------------------------------------------

call npx playwright install

if errorlevel 1 (
    echo [ERROR] Playwright browser installation failed.
    goto :FAILED
)

echo [OK] Playwright browsers installed.
echo.

REM ============================================================
REM 7. VERIFY PLAYWRIGHT
REM ============================================================

echo ------------------------------------------------------------
echo [6/8] Verifying Playwright
echo ------------------------------------------------------------

call npx playwright --version

if errorlevel 1 (
    echo [ERROR] Playwright verification failed.
    goto :FAILED
)

echo [OK] Playwright CLI is working.
echo.

REM ============================================================
REM 8. VERIFY PLAYWRIGHT MCP PACKAGE
REM ============================================================

echo ------------------------------------------------------------
echo [7/8] Checking Playwright MCP
echo ------------------------------------------------------------

call npm list @playwright/mcp --depth=0 >nul 2>&1

if errorlevel 1 (
    echo [INFO] @playwright/mcp is not currently installed locally.
    echo.
    echo Installing @playwright/mcp locally...
    echo.

    call npm install --save-dev @playwright/mcp

    if errorlevel 1 (
        echo [ERROR] @playwright/mcp installation failed.
        goto :FAILED
    )
)

echo [OK] @playwright/mcp package is available.
echo.

REM ============================================================
REM VERIFY MCP PACKAGE
REM ============================================================

echo ------------------------------------------------------------
echo [8/8] Verifying Playwright MCP package
echo ------------------------------------------------------------

call npm list @playwright/mcp --depth=0

if errorlevel 1 (
    echo [ERROR] Unable to verify @playwright/mcp.
    goto :FAILED
)

echo.
echo ============================================================
echo   INSTALLATION / VERIFICATION SUCCESSFUL
echo ============================================================
echo.
echo Project:
echo   %CD%
echo.
echo Installed components:
echo   [OK] Node.js
echo   [OK] npm
echo   [OK] @playwright/test
echo   [OK] Playwright browsers
echo   [OK] @playwright/mcp
echo.
echo IMPORTANT:
echo Playwright MCP still needs to be registered with the MCP client
echo you are using, such as your coding/agent environment.
echo.
echo This BAT file verifies the local Playwright tooling and MCP
echo package. It does not modify your ASP.NET application code
echo or database.
echo.
echo ============================================================
echo.

pause
exit /b 0


:FAILED

echo.
echo ============================================================
echo   INSTALLATION / VERIFICATION FAILED
echo ============================================================
echo.
echo Review the error shown above.
echo.
echo Project:
echo   %CD%
echo.
pause
exit /b 1
