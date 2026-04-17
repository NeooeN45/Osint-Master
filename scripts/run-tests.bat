@echo off
REM =============================================================================
REM Run Complete Investigation Test Suite
REM Script Windows pour lancer les tests avec les données de test
REM 
REM Usage: .\scripts\run-tests.bat [options]
REM =============================================================================

setlocal EnableDelayedExpansion

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║           OSINT Master Pro v4.0 - Test Suite Runner              ║
echo ║           Donnees de test: camille_perraudeau                    ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

REM Set test environment variables
set API_BASE=http://localhost:3002/api
set TEST_USERNAME=camille_perraudeau
set TEST_EMAIL=hydrogene.bonde@gmail.com
set TEST_PHONE=+33769723999
set TEST_IP=5.49.134.36
set TEST_DOMAIN=example.com
set TEST_LOCATION_COUNTRY=France
set TEST_LOCATION_REGION=Vienne
set TEST_LOCATION_CITY=Poitiers
set TEST_ISP=Bouygues Telecom

REM Display test configuration
echo [CONFIG] Configuration des tests:
echo   - Username: %TEST_USERNAME%
echo   - Email: %TEST_EMAIL%
echo   - Phone: %TEST_PHONE%
echo   - IP: %TEST_IP%
echo   - Location: %TEST_LOCATION_CITY%, %TEST_LOCATION_COUNTRY%
echo   - ISP: %TEST_ISP%
echo.

REM Check if backend is running
echo [CHECK] Verification du backend...
curl -s -o nul -w "%%{http_code}" %API_BASE%/health > temp.txt
set /p STATUS=<temp.txt
del temp.txt

if "%STATUS%"=="200" (
    echo [OK] Backend is running (HTTP 200)
) else (
    echo [ERREUR] Backend not responding (HTTP %STATUS%)
    echo [INFO] Starting backend first...
    
    REM Try to start backend
    cd ..
    start "OSINT Backend" cmd /c "npx tsx backend/src/server.ts"
    timeout /t 5 /nobreak > nul
    
    REM Check again
    curl -s -o nul -w "%%{http_code}" %API_BASE%/health > temp.txt
    set /p STATUS2=<temp.txt
    del temp.txt
    
    if "%STATUS2%"=="200" (
        echo [OK] Backend started successfully
    ) else (
        echo [ERREUR] Failed to start backend. Please start manually:
        echo   cd backend
        echo   npx tsx src/server.ts
        exit /b 1
    )
)

echo.

REM Check Docker services
echo [CHECK] Verification des services Docker...
docker ps --format "table {{.Names}}\t{{.Status}}" 2>nul | findstr osint > nul
if %ERRORLEVEL% == 0 (
    echo [OK] Docker services found
) else (
    echo [WARN] Docker services not running
    echo [INFO] Pour lancer les services:
    echo   docker-compose up -d
)

echo.

REM Check VPN status
echo [CHECK] Verification VPN...
curl -s %API_BASE%/vpn/status | findstr "connected" > nul
if %ERRORLEVEL% == 0 (
    echo [OK] VPN is configured
) else (
    echo [WARN] VPN not connected
    echo [INFO] Pour configurer le VPN:
    echo   ./scripts/setup-vpn.sh
)

echo.
echo ═══════════════════════════════════════════════════════════════════
echo [START] Lancement des tests...
echo ═══════════════════════════════════════════════════════════════════
echo.

REM Run test suite
cd ..
cd backend

npx tsx test_investigation_complete.ts

if %ERRORLEVEL% == 0 (
    echo.
    echo ╔══════════════════════════════════════════════════════════════════╗
    echo ║                  ✅ TOUS LES TESTS ONT REUSSI !                 ║
    echo ╚══════════════════════════════════════════════════════════════════╝
    exit /b 0
) else (
    echo.
    echo ╔══════════════════════════════════════════════════════════════════╗
    echo ║                    ❌ CERTAINS TESTS ONT ECHOUE                  ║
    echo ╚══════════════════════════════════════════════════════════════════╝
    exit /b 1
)
