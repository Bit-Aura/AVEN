Write-Host "Starting Local Development Environment..." -ForegroundColor Green

Write-Host "1. Starting databases via Docker Compose..." -ForegroundColor Cyan
docker-compose up -d db neo4j

Write-Host "2. Starting Next.js Frontend (apps\web) in a new terminal..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd apps\web; npm run dev`""

Write-Host "3. Activating python environment and starting FastAPI Backend..." -ForegroundColor Cyan

# Activate the environment
if (Test-Path ".\.venv\Scripts\activate.ps1") {
    . ".\.venv\Scripts\activate.ps1"
} else {
    Write-Host "Virtual environment not found. Please run 'python -m venv .venv' and install dependencies first." -ForegroundColor Red
    exit
}

# Set the PYTHONPATH
$env:PYTHONPATH = "apps\api"

# Run Uvicorn in the current window
Write-Host "Starting Uvicorn..." -ForegroundColor Green
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
