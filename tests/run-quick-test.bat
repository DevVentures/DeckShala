@echo off
REM Quick Ollama Test Runner for Windows
REM Double-click this file to run tests

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║     Ollama Quality Testing - Quick Start               ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo Checking Ollama service...
curl -s http://localhost:11434/api/tags >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ollama service is not running!
    echo.
    echo Please:
    echo   1. Open a new terminal
    echo   2. Run: ollama serve
    echo   3. Then run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Ollama service is running
echo.

echo Running quick tests...
echo.

node tests\quick-ollama-test.js

echo.
echo ════════════════════════════════════════════════════════
echo.
echo Tests completed! Check the results above.
echo.
echo For detailed tests, run: npm run test:ollama:full
echo.
pause
