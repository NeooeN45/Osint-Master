@echo off
chcp 65001 >nul
title OSINT Master - Loop Test

echo ==========================================
echo  OSINT MASTER - LOOP TEST ^& FIX
echo  Testing until everything works
echo ==========================================
echo.

:START
cls
echo Starting test iteration...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0test-system.ps1" -Install -MaxRetries 1

if %errorlevel% == 0 (
    echo.
    echo ==========================================
    echo  SUCCESS!
    echo ==========================================
    echo.
    echo Opening browser...
    start http://localhost:3001
    pause
    exit /b 0
) else (
    echo.
    echo [~] Retrying in 5 seconds...
    timeout /t 5 /nobreak >nul
    goto START
)
