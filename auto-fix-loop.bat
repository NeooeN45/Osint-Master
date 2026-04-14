@echo off
chcp 65001 >nul
title OSINT Master - Auto Fix Loop

echo ==========================================
echo  OSINT MASTER - AUTO FIX LOOP
echo  Tests and fixes until everything works
echo ==========================================
echo.

set RETRY_COUNT=0
set MAX_RETRIES=10

:LOOP
set /a RETRY_COUNT+=1
echo.
echo ==========================================
echo  ITERATION %RETRY_COUNT% / %MAX_RETRIES%
echo ==========================================
echo.

:: Test Backend
echo [~] Testing Backend (Port 3003)...
powershell -Command "& {$port=3003; $result=Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue; if($result.TcpTestSucceeded){exit 0}else{exit 1}}"
if errorlevel 1 (
    echo [~] Backend NOT running. Starting it...
    start "OSINT Backend" cmd /k "cd /d %~dp0backend && npx tsx src/server-minimal.ts"
    timeout /t 5 /nobreak >nul
) else (
    echo [OK] Backend is running
)

:: Test Frontend
echo [~] Testing Frontend (Port 3001)...
powershell -Command "& {$port=3001; $result=Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue; if($result.TcpTestSucceeded){exit 0}else{exit 1}}"
if errorlevel 1 (
    echo [~] Frontend NOT running. Starting it...
    start "OSINT Frontend" cmd /k "cd /d %~dp0 && npm run dev -- --port=3001"
    timeout /t 5 /nobreak >nul
) else (
    echo [OK] Frontend is running
)

:: Run full test and install
echo [~] Running full test and install...
powershell -ExecutionPolicy Bypass -File "%~dp0test-and-install.ps1"

if errorlevel 0 (
    echo.
    echo ==========================================
    echo  SUCCESS! ALL SYSTEMS WORKING!
    echo ==========================================
    echo.
    echo Opening browser...
    start http://localhost:3001
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 0
)

if %RETRY_COUNT% geq %MAX_RETRIES% (
    echo.
    echo ==========================================
    echo  MAX RETRIES REACHED
    echo ==========================================
    echo.
    echo Please check manually:
    echo 1. Backend: cd backend ^&^& npx tsx src/server-minimal.ts
    echo 2. Frontend: npm run dev -- --port=3001
    echo.
    pause
    exit /b 1
)

echo.
echo [~] Some issues found. Retrying in 10 seconds...
timeout /t 10 /nobreak >nul
goto LOOP
