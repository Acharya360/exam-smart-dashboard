@echo off
title Vercel Authentication
cd /d "%~dp0"

echo ==============================================================================
echo                      Vercel CLI Authentication Setup
echo ==============================================================================
echo.
echo Checking current login status...
for /f "tokens=*" %%u in ('npx --yes vercel whoami 2^>nul') do set "VERCEL_USER=%%u"

if not "%VERCEL_USER%"=="" (
    echo [OK] Currently logged in as: %VERCEL_USER%
    echo.
    set /p RELOGIN="Do you want to re-login / switch accounts? (y/N): "
    if /i not "!RELOGIN!"=="y" (
        echo Kept existing login.
        pause
        exit /b 0
    )
)

echo Opening Vercel login in your default web browser...
echo Follow the prompts in your browser to authorize Vercel CLI.
echo.
call npx --yes vercel login

echo.
echo Checking new login status...
for /f "tokens=*" %%u in ('npx --yes vercel whoami 2^>nul') do set "VERCEL_USER=%%u"
if not "%VERCEL_USER%"=="" (
    echo [SUCCESS] You are now authenticated as: %VERCEL_USER%
    echo You can now run [8] in Run_Deploy.bat to deploy to production!
) else (
    echo [WARN] Authentication did not complete. Please try again.
)

echo.
pause
