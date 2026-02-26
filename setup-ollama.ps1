#!/usr/bin/env pwsh
# Ollama Quick Setup Script for Windows
# Run this script to set up Ollama with recommended models

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Ollama Setup for Presentation  " -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Ollama is installed
Write-Host "Checking if Ollama is installed..." -ForegroundColor Yellow
$ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

if (-not $ollamaInstalled) {
    Write-Host "❌ Ollama is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Ollama first:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://ollama.com/download" -ForegroundColor White
    Write-Host "  2. Or run: winget install Ollama.Ollama" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Ollama is installed!" -ForegroundColor Green
Write-Host ""

# Check if Ollama service is running
Write-Host "Checking if Ollama service is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "✅ Ollama service is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ollama service is not running. Starting it now..." -ForegroundColor Yellow
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "✅ Ollama service started!" -ForegroundColor Green
}

Write-Host ""

# List installed models
Write-Host "Checking installed models..." -ForegroundColor Yellow
$models = ollama list
Write-Host $models
Write-Host ""

# Ask user which model to install
Write-Host "Recommended models for presentation generation:" -ForegroundColor Cyan
Write-Host "  1. llama3.2 (Default - Best balance, ~2GB)" -ForegroundColor White
Write-Host "  2. llama3.1 (High quality, ~4.7GB)" -ForegroundColor White
Write-Host "  3. mistral (Fast and accurate, ~4.1GB)" -ForegroundColor White
Write-Host "  4. phi3 (Lightweight, ~2.3GB)" -ForegroundColor White
Write-Host "  5. Skip (if already installed)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select a model to install (1-5)"

switch ($choice) {
    "1" {
        Write-Host "Installing llama3.2..." -ForegroundColor Yellow
        ollama pull llama3.2
    }
    "2" {
        Write-Host "Installing llama3.1..." -ForegroundColor Yellow
        ollama pull llama3.1
    }
    "3" {
        Write-Host "Installing mistral..." -ForegroundColor Yellow
        ollama pull mistral
    }
    "4" {
        Write-Host "Installing phi3..." -ForegroundColor Yellow
        ollama pull phi3
    }
    "5" {
        Write-Host "Skipping model installation." -ForegroundColor Yellow
    }
    default {
        Write-Host "Invalid choice. Installing default model (llama3.2)..." -ForegroundColor Yellow
        ollama pull llama3.2
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "  ✅ Setup Complete!             " -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installed models:" -ForegroundColor Cyan
ollama list
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Ensure your .env file has: OLLAMA_BASE_URL=\"http://localhost:11434\"" -ForegroundColor White
Write-Host "  2. Run: pnpm dev" -ForegroundColor White
Write-Host "  3. Open: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📖 For more info, see: OLLAMA_SETUP.md" -ForegroundColor Cyan
Write-Host ""
