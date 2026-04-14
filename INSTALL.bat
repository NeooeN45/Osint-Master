@echo off
title OSINT Master - Installation

echo ==========================================
echo OSINT MASTER - INSTALLATION AUTO
echo ==========================================
echo.

:LOOP
cls
echo [1/5] Cleanup...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM tsx.exe 2>nul
npx kill-port 3003 2>nul
npx kill-port 3001 2>nul
timeout /t 2 >nul

echo [2/5] Check Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not installed!
    pause
    exit /b 1
)

echo [3/5] Start Backend...
start "Backend" cmd /k "cd backend && npx tsx src/server-minimal.ts"
timeout /t 5 >nul

echo [4/5] Start Frontend...
start "Frontend" cmd /k "npm run dev -- --port=3001"
timeout /t 5 >nul

echo [5/5] Test API...
timeout /t 3 >nul
curl -s http://localhost:3003/api/modules/catalog >nul 2>&1
if errorlevel 1 (
    echo API not ready, retrying...
    timeout /t 5 >nul
    goto LOOP
)

echo.
echo ==========================================
echo SUCCESS! 
echo ==========================================
echo Backend: http://localhost:3003
echo Frontend: http://localhost:3001
echo.
start http://localhost:3001
pause
