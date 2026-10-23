<#
.SYNOPSIS
    Starts the PentAGI autonomous security testing suite in Docker.
.DESCRIPTION
    Checks Docker status, sets up the environment configuration (.env) with secure
    salts, and boots the PentAGI agent platform wired to Google Gemini.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting PentAGI Autonomous Security Testing Platform   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Docker Engine
Write-Host "`n[1/4] Checking Docker daemon status..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running or not responsive."
    }
    Write-Host " Docker daemon is active." -ForegroundColor Green
} catch {
    Write-Host " Docker daemon check failed!" -ForegroundColor Red
    Write-Host "Please ensure Docker Desktop is launched and running on Windows." -ForegroundColor Red
    exit 1
}

# 2. Configure .env file
Write-Host "`n[2/4] Verifying PentAGI environment configuration..." -ForegroundColor Yellow
$envPath = Join-Path $ScriptDir ".env"
$envExamplePath = Join-Path $ScriptDir ".env.example"
$parentEnvPath = Join-Path (Split-Path -Parent $ScriptDir) ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "Creating fresh .env from .env.example..." -ForegroundColor Gray
    $envContent = Get-Content $envExamplePath -Raw

    # Generate random 32-byte hex salt for cookie signing
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $saltBytes = New-Object byte[] 32
    $rng.GetBytes($saltBytes)
    $generatedSalt = ($saltBytes | ForEach-Object { $_.ToString("x2") }) -join ""

    # Generate random 16-byte hex password for postgres
    $passBytes = New-Object byte[] 16
    $rng.GetBytes($passBytes)
    $generatedPass = ($passBytes | ForEach-Object { $_.ToString("x2") }) -join ""

    $envContent = $envContent -replace 'replace_with_32_character_random_salt', $generatedSalt
    $envContent = $envContent -replace 'replace_with_secure_db_password', $generatedPass

    # Check parent .env for GEMINI_API_KEY
    if (Test-Path $parentEnvPath) {
        $parentLines = Get-Content $parentEnvPath
        foreach ($line in $parentLines) {
            if ($line -match '^\s*GEMINI_API_KEY\s*=\s*["'']?([^"'']+)["'']?') {
                $geminiKey = $matches[1]
                $envContent = $envContent -replace 'your_gemini_api_key_here', $geminiKey
                Write-Host " Automatically imported GEMINI_API_KEY from project root .env" -ForegroundColor Green
                break
            }
        }
    }

    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Host " Generated pentagi/.env with secure keys." -ForegroundColor Green
} else {
    Write-Host " Existing pentagi/.env detected." -ForegroundColor Green
}

# 3. Create persistent data directory
Write-Host "`n[3/4] Preparing persistent volume storage..." -ForegroundColor Yellow
$dataDir = Join-Path $ScriptDir "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}
Write-Host " Storage volume ready: $dataDir" -ForegroundColor Green

# 4. Start Docker Containers
Write-Host "`n[4/4] Launching PentAGI Docker stack..." -ForegroundColor Yellow
docker compose -f docker-compose.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "  PentAGI successfully launched!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " Web Interface:     https://localhost:8443" -ForegroundColor White
    Write-Host " Default Username:  admin@pentagi.com" -ForegroundColor White
    Write-Host " Default Password:  admin" -ForegroundColor White
    Write-Host "`nNote: Accept the self-signed SSL certificate warning in your browser." -ForegroundColor Gray
    Write-Host "Target Host for Exam Dashboard:" -ForegroundColor Cyan
    Write-Host "  - Frontend SPA:   http://host.docker.internal:3000" -ForegroundColor White
    Write-Host "  - Express API:    http://host.docker.internal:5000" -ForegroundColor White
    Write-Host "`nTo stop the stack at any time, run: .\stop-pentagi.ps1" -ForegroundColor Yellow
} else {
    Write-Host "`nDocker compose failed to start containers. Check docker logs for details." -ForegroundColor Red
}
