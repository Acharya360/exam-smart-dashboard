<#
.SYNOPSIS
    Stops the PentAGI autonomous security testing suite in Docker.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "Stopping PentAGI stack..." -ForegroundColor Yellow
docker compose -f docker-compose.yml down

if ($LASTEXITCODE -eq 0) {
    Write-Host "PentAGI services successfully stopped." -ForegroundColor Green
} else {
    Write-Host "Failed to stop some PentAGI containers. Check docker ps." -ForegroundColor Red
}
