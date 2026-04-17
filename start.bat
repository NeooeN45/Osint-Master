@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title OSINT Master Pro

echo.
echo ============================================================
echo   OSINT MASTER PRO - Launcher
echo ============================================================
echo.

if "%1"=="docker" goto :docker_mode
if "%1"=="-d" goto :docker_mode
if "%1"=="stop" goto :stop_mode
if "%1"=="status" goto :status_mode

:local_mode
echo [MODE] Local (Node.js + Python)
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js non installe - https://nodejs.org
    pause
    exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
    echo [WARN] Python non detecte - certains modules d'analyse ne marcheront pas
) else (
    echo [OK] Python detecte
)

where ollama >nul 2>&1
if errorlevel 1 (
    echo [INFO] Ollama non detecte - IA indisponible (installer: https://ollama.com)
) else (
    echo [OK] Ollama detecte
)

echo.

if not exist "node_modules" (
    echo [1/4] Installation deps frontend...
    call npm install --legacy-peer-deps
)

if not exist "backend\node_modules" (
    echo [2/4] Installation deps backend...
    pushd backend
    call npm install
    popd
)

where pip >nul 2>&1
if not errorlevel 1 (
    python -c "from PIL import Image; import pytesseract; import PicImageSearch" >nul 2>&1
    if errorlevel 1 (
        echo [3/4] Installation Python deps...
        pip install -q Pillow pytesseract PicImageSearch httpx >nul 2>&1
    )
)

echo [4/4] Demarrage backend (port 3002)...
start "OSINT Backend" cmd /c "cd backend && npm run dev"

echo        Attente backend...
set /a attempts=0
:wait_backend
timeout /t 2 /nobreak >nul
powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:3002/health -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }" > temp_status.txt 2>nul
set /p status=<temp_status.txt
del temp_status.txt 2>nul
if "!status!"=="200" goto :backend_ok
set /a attempts+=1
if !attempts! lss 20 goto :wait_backend
echo [WARN] Backend semble lent

:backend_ok
echo [OK] Backend pret
echo.
echo [FRONTEND] Demarrage (port 5173)...
start "OSINT Frontend" cmd /c "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   OSINT Master Pro demarre !
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:3002
echo   Health   : http://localhost:3002/api/debug/health
echo.
echo   start.bat stop    - Arreter
echo   start.bat status  - Etat
echo   start.bat docker  - Mode Docker
echo ============================================================

timeout /t 2 /nobreak >nul
start http://localhost:5173
goto :eof


:docker_mode
echo [MODE] Docker
echo.
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Docker non installe
    pause
    exit /b 1
)
echo [1/2] Build images...
docker compose -f docker/docker-compose.yml build
echo [2/2] Lancement services...
docker compose -f docker/docker-compose.yml up -d
echo.
echo ============================================================
echo   Docker: Frontend http://localhost:5173  Backend :3002
echo   Logs: docker compose -f docker/docker-compose.yml logs -f
echo ============================================================
timeout /t 5 /nobreak >nul
start http://localhost:5173
goto :eof


:stop_mode
echo [STOP] Arret des services...
docker compose -f docker/docker-compose.yml down 2>nul
taskkill /FI "WindowTitle eq OSINT Backend*" /T /F 2>nul
taskkill /FI "WindowTitle eq OSINT Frontend*" /T /F 2>nul
echo [OK] Services arretes
pause
goto :eof


:status_mode
echo [STATUS]
echo.
echo Backend (3002):
powershell -Command "try { $r = Invoke-WebRequest -Uri http://localhost:3002/health -UseBasicParsing -TimeoutSec 2; 'ON - uptime: ' + ($r.Content | ConvertFrom-Json).uptime + 's' } catch { 'OFF' }"
echo.
echo Frontend (5173):
powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:5173 -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 'OFF' }"
echo.
echo Ollama (11434):
powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:11434 -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 'OFF' }"
echo.
docker ps --filter name=osint- --format "table {{.Names}}\t{{.Status}}" 2>nul
pause
goto :eof
