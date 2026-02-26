# Ollama Quality Testing Script for Windows
# This script runs comprehensive tests on Ollama integration

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Ollama Integration Quality Testing Script           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if Ollama is installed
Write-Host "Step 1: Checking Ollama installation..." -ForegroundColor Yellow
$ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

if (-not $ollamaInstalled) {
    Write-Host "❌ Ollama is not installed!" -ForegroundColor Red
    Write-Host "Please install Ollama from: https://ollama.com/download" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Ollama is installed" -ForegroundColor Green
ollama --version

# Check if Ollama service is running
Write-Host "`nStep 2: Checking if Ollama service is running..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Ollama service is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama service is not running!" -ForegroundColor Red
    Write-Host "Starting Ollama service..." -ForegroundColor Yellow
    
    # Try to start Ollama in background
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
        Write-Host "✓ Ollama service started successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start Ollama service" -ForegroundColor Red
        Write-Host "Please run 'ollama serve' manually in another terminal" -ForegroundColor Yellow
        exit 1
    }
}

# Check available models
Write-Host "`nStep 3: Checking available models..." -ForegroundColor Yellow
$models = ollama list

if ($models -match "llama3.2") {
    Write-Host "✓ llama3.2 model is available" -ForegroundColor Green
} else {
    Write-Host "⚠ llama3.2 model not found. Downloading..." -ForegroundColor Yellow
    Write-Host "This may take several minutes depending on your internet connection..." -ForegroundColor Cyan
    ollama pull llama3.2
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ llama3.2 model downloaded successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to download llama3.2 model" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nAvailable models:" -ForegroundColor Cyan
ollama list

# Check if Node.js is installed
Write-Host "`nStep 4: Checking Node.js installation..." -ForegroundColor Yellow
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeInstalled) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Node.js is installed" -ForegroundColor Green
node --version

# Check if dependencies are installed
Write-Host "`nStep 5: Checking project dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "⚠ Dependencies not installed. Installing..." -ForegroundColor Yellow
    pnpm install
} else {
    Write-Host "✓ Dependencies are installed" -ForegroundColor Green
}

# Run the tests
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Running Comprehensive Ollama Quality Tests          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "This will test:" -ForegroundColor Yellow
Write-Host "  1. Health Check & Connectivity" -ForegroundColor White
Write-Host "  2. Basic Text Generation" -ForegroundColor White
Write-Host "  3. Presentation Outline Generation" -ForegroundColor White
Write-Host "  4. XML Slide Generation" -ForegroundColor White
Write-Host "  5. Content Quality & Relevance" -ForegroundColor White
Write-Host "  6. Streaming Performance" -ForegroundColor White
Write-Host "  7. Complex Presentation Scenarios" -ForegroundColor White
Write-Host "  8. Multi-language Support" -ForegroundColor White
Write-Host ""

# Run the test suite
npx tsx tests/run-ollama-tests.ts

$exitCode = $LASTEXITCODE

# Show results file location
if (Test-Path "ollama-test-results.json") {
    Write-Host "`n✓ Test results saved to: ollama-test-results.json" -ForegroundColor Green
    
    # Parse and show summary
    $results = Get-Content "ollama-test-results.json" | ConvertFrom-Json
    
    Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                  QUICK SUMMARY                         ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
    
    Write-Host "Tests Passed:    $($results.summary.passed)/$($results.summary.total)" -ForegroundColor Green
    Write-Host "Success Rate:    $($results.summary.successRate)%" -ForegroundColor $(if ([int]$results.summary.successRate -ge 75) { "Green" } else { "Yellow" })
    Write-Host "Avg Duration:    $($results.summary.avgDuration)ms" -ForegroundColor Cyan
    Write-Host ""
    
    # Recommendations
    if ([int]$results.summary.successRate -eq 100) {
        Write-Host "🎉 Excellent! Ollama is producing high-quality outputs for all tasks." -ForegroundColor Green
        Write-Host "The platform is ready for production use with Ollama." -ForegroundColor Green
    } elseif ([int]$results.summary.successRate -ge 75) {
        Write-Host "✓ Good! Ollama is producing quality outputs with minor issues." -ForegroundColor Yellow
        Write-Host "Review failed tests for specific improvements." -ForegroundColor Yellow
    } elseif ([int]$results.summary.successRate -ge 50) {
        Write-Host "⚠ Moderate results. Some tasks need improvement." -ForegroundColor Yellow
        Write-Host "Consider:" -ForegroundColor Yellow
        Write-Host "  • Using a more powerful model (e.g., llama3.1 or mixtral)" -ForegroundColor White
        Write-Host "  • Adjusting timeout settings" -ForegroundColor White
        Write-Host "  • Improving system resources" -ForegroundColor White
    } else {
        Write-Host "❌ Poor results. Ollama may not be suitable for this platform." -ForegroundColor Red
        Write-Host "Recommendations:" -ForegroundColor Yellow
        Write-Host "  • Try a different model" -ForegroundColor White
        Write-Host "  • Check system resources (RAM, CPU)" -ForegroundColor White
        Write-Host "  • Consider using OpenAI API instead" -ForegroundColor White
    }
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

exit $exitCode
