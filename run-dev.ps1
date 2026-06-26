# Starts the FastAPI backend and the Vite frontend in two separate windows.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not (Test-Path "$root\backend\.env")) {
    Write-Host "WARNING: backend\.env not found. Copy .env.example to backend\.env and add your ANTHROPIC_API_KEY." -ForegroundColor Yellow
}

Write-Host "Starting FastAPI backend -> http://127.0.0.1:8000 (docs at /docs)" -ForegroundColor Cyan
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; ./.venv/Scripts/Activate.ps1; uvicorn app.main:app --reload --port 8000"

Write-Host "Starting Vite frontend -> http://localhost:5173" -ForegroundColor Cyan
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "Both launching in separate windows. Open http://localhost:5173" -ForegroundColor Green
