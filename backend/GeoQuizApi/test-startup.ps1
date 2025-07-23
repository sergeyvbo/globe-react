# Quick startup test script
Write-Host "Testing backend startup..." -ForegroundColor Green

# Start the application in background
$process = Start-Process -FilePath "dotnet" -ArgumentList "run --no-build" -PassThru -WindowStyle Hidden

# Wait a few seconds for startup
Start-Sleep -Seconds 8

# Check if process is still running
if ($process.HasExited) {
    Write-Host "❌ Application failed to start or crashed" -ForegroundColor Red
    Write-Host "Exit code: $($process.ExitCode)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Application started successfully" -ForegroundColor Green
    
    # Try to make a simple HTTP request to test if it's responding
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Health endpoint responding: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Health endpoint not responding (this might be expected if no health endpoint exists)" -ForegroundColor Yellow
    }
    
    # Clean up - kill the process
    $process.Kill()
    Write-Host "✅ Test completed successfully" -ForegroundColor Green
}