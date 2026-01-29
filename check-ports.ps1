# Port Checking Script for VeriFace
# This script helps you verify that your backend and frontend are running on the correct ports

Write-Host "=== VeriFace Port Checker ===" -ForegroundColor Cyan
Write-Host ""

# Check Backend Port (80)
Write-Host "Checking Backend Port (80)..." -ForegroundColor Yellow
$backendPort = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Host "✓ Backend is LISTENING on port 80" -ForegroundColor Green
    $process = Get-Process -Id $backendPort.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "  Process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Gray
    }
    
    # Test backend connection
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:80/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✓ Backend is RESPONDING: $($response.Content)" -ForegroundColor Green
    } catch {
        Write-Host "✗ Backend is not responding: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Backend is NOT running on port 80" -ForegroundColor Red
    Write-Host "  Expected: Backend should be running on port 80" -ForegroundColor Gray
    Write-Host "  To start: cd backend && uvicorn main:app --host 0.0.0.0 --port 80 --reload" -ForegroundColor Gray
}
Write-Host ""

# Check Frontend Port (3000)
Write-Host "Checking Frontend Port (3000)..." -ForegroundColor Yellow
$frontendPort = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Host "✓ Frontend is LISTENING on port 3000" -ForegroundColor Green
    $process = Get-Process -Id $frontendPort.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "  Process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Gray
    }
} else {
    Write-Host "✗ Frontend is NOT running on port 3000" -ForegroundColor Red
    Write-Host "  Expected: Frontend should be running on port 3000" -ForegroundColor Gray
    Write-Host "  To start: cd frontend && npm run dev" -ForegroundColor Gray
}
Write-Host ""

# Check API Configuration
Write-Host "Checking API Configuration..." -ForegroundColor Yellow
$apiFile = "frontend\lib\api.ts"
if (Test-Path $apiFile) {
    $apiContent = Get-Content $apiFile -Raw
    if ($apiContent -match "localhost:(\d+)") {
        $apiPort = $matches[1]
        Write-Host "  Frontend API URL: http://localhost:$apiPort" -ForegroundColor Gray
        if ($apiPort -eq "80") {
            Write-Host "✓ Frontend is configured to use port 80 (matches backend)" -ForegroundColor Green
        } else {
            Write-Host "✗ Frontend is configured for port $apiPort, but backend is on port 80" -ForegroundColor Red
            Write-Host "  Update frontend/lib/api.ts or set NEXT_PUBLIC_API_URL environment variable" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  Could not find $apiFile" -ForegroundColor Yellow
}
Write-Host ""

# Test API Endpoint
Write-Host "Testing API Endpoint..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:80/protected/event/getEventsFromUser" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ API endpoint is accessible" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ API endpoint is accessible (authentication required - this is expected)" -ForegroundColor Green
    } else {
        Write-Host "✗ API endpoint error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Backend should be: http://localhost:80" -ForegroundColor Gray
Write-Host "Frontend should be: http://localhost:3000" -ForegroundColor Gray
Write-Host "Frontend API config: Check frontend/lib/api.ts" -ForegroundColor Gray
Write-Host ""
Write-Host "If backend is not running, check:" -ForegroundColor Yellow
Write-Host "  1. Is Docker running? (docker ps)" -ForegroundColor Gray
Write-Host "  2. Is uvicorn running? (Check process list)" -ForegroundColor Gray
Write-Host "  3. Is port 80 available? (netstat -ano | findstr :80)" -ForegroundColor Gray
