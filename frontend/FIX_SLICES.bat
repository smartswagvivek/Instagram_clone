@echo off
REM Instagram Clone - Fix Redux Slice Files
REM This script deletes the wrong duplicate slice files

cd /d "C:\Users\vivekhs\Downloads\Instagram\frontend\src\redux\slices"

echo.
echo ========================================
echo Instagram Clone - Fixing Redux Slices
echo ========================================
echo.

REM Delete the wrong files
echo Deleting wrong files...
if exist postSlice.js (
    del /F /Q postSlice.js
    echo ✓ Deleted postSlice.js
) else (
    echo • postSlice.js not found (OK)
)

if exist messageSlice.js (
    del /F /Q messageSlice.js
    echo ✓ Deleted messageSlice.js
) else (
    echo • messageSlice.js not found (OK)
)

echo.
echo ========================================
echo Remaining files (should be 5):
echo ========================================
dir /B *.js

echo.
echo ✓ Cleanup complete!
echo.
echo Next steps:
echo 1. Close your frontend terminal (Ctrl+C)
echo 2. Run: npm run dev
echo 3. Open: http://localhost:3000
echo.
pause
