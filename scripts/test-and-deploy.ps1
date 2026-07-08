# Vaynote Master Test and Deploy Pipeline
# This script runs E2E tests and deploys to Firebase production if all tests pass.

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   VAYNOTE TEST & DEPLOY PIPELINE           " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Step 1: Run Linting
Write-Host "`n[1/3] Running ESLint check..." -ForegroundColor Yellow
cmd.exe /c "npm run lint"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Linting completed with warnings or errors. Proceeding with functional verification..." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Linting passed successfully." -ForegroundColor Green
}

# Step 2: Run Playwright E2E Tests
Write-Host "`n[2/3] Running E2E Test Suite (Playwright)..." -ForegroundColor Yellow
cmd.exe /c "npx playwright test"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] E2E tests failed! Deployment aborted. Please fix functional bugs." -ForegroundColor Red
    Exit 1
}
Write-Host "[OK] All E2E tests passed! Code is functional and verified." -ForegroundColor Green

# Step 3: Production Build and Deploy
Write-Host "`n[3/3] Deploying to Firebase Production..." -ForegroundColor Yellow
cmd.exe /c "npx firebase deploy"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Deployment failed during firebase deploy." -ForegroundColor Red
    Exit 1
}

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "[SUCCESS] DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "Vaynote is now live in production." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
