#!/usr/bin/env pwsh
# Instagram Clone - Fix Redux Slice Files (PowerShell)
# This script permanently removes duplicate wrong slice files

$slicesPath = "C:\Users\vivekhs\Downloads\Instagram\frontend\src\redux\slices"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instagram Clone - Fixing Redux Slices" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Files to delete
$filesToDelete = @(
    "$slicesPath\postSlice.js",
    "$slicesPath\messageSlice.js"
)

# Delete wrong files
Write-Host "Deleting wrong duplicate files..." -ForegroundColor Yellow
foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item -Force $file
        Write-Host "✓ Deleted: $(Split-Path $file -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "• Skipped: $(Split-Path $file -Leaf) (not found)" -ForegroundColor Gray
    }
}

# List remaining files
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Remaining files (should be 5):" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$remainingFiles = Get-ChildItem "$slicesPath" -Filter "*.js" -Name
$count = ($remainingFiles | Measure-Object).Count

foreach ($file in $remainingFiles) {
    Write-Host "  ✓ $file" -ForegroundColor Green
}

Write-Host ""
Write-Host "Total: $count files" -ForegroundColor Cyan
Write-Host ""

if ($count -eq 5) {
    Write-Host "✓ SUCCESS! All correct." -ForegroundColor Green
} else {
    Write-Host "! WARNING: Expected 5 files, found $count" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Close your frontend terminal (Ctrl+C)" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. Open: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
