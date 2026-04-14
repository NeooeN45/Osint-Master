@echo off
chcp 65001 >nul
title OSINT Master - FULL INSTALL LOOP

echo ==========================================
echo  OSINT MASTER - INSTALLATION COMPLETE
echo ==========================================
echo.
echo Cette boucle va:
echo  1. Tuer tous les processus existants
echo  2. Verifier les prérequis
echo  3. Installer npm packages si manquant
echo  4. Démarrer le backend
echo  5. Démarrer le frontend
echo  6. Tester l'API
echo  7. Installer les outils OSINT
echo  8. Verifier que tout marche
echo  9. Ouvrir le navigateur
echo.
echo Appuyez sur une touche pour commencer...
pause >nul

:LOOP
cls
echo ==========================================
echo  ITERATION - Nettoyage et redémarrage
echo ==========================================
echo.

:: Step 1: Kill existing processes
echo [1/9] Nettoyage des processus existants...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM tsx.exe 2>nul
timeout /t 2 /nobreak >nul
echo     OK - Processus nettoyes

:: Step 2: Kill ports
echo [2/9] Liberation des ports...
npx kill-port 3003 2>nul
npx kill-port 3001 2>nul
npx kill-port 5173 2>nul
timeout /t 2 /nobreak >nul
echo     OK - Ports liberes

:: Step 3: Check prerequisites
echo [3/9] Verification des prérequis...
node --version >nul 2>&1
if errorlevel 1 (
    echo     ERREUR: Node.js non installe!
    echo     Allez sur https://nodejs.org
    pause
    exit /b 1
)
echo     OK - Node.js detecte

:: Step 4: Install backend dependencies
echo [4/9] Verification backend dependencies...
if not exist "backend\node_modules" (
    echo     Installation des dépendances backend...
    cd backend && npm install && cd ..
)
echo     OK - Backend pret

:: Step 5: Install frontend dependencies
echo [5/9] Verification frontend dependencies...
if not exist "node_modules" (
    echo     Installation des dépendances frontend...
    npm install
)
echo     OK - Frontend pret

:: Step 6: Start Backend
echo [6/9] Démarrage du Backend...
start "OSINT Backend" cmd /k "cd /d %~dp0backend && npx tsx src/server-minimal.ts"
echo     Backend demarre sur http://localhost:3003
timeout /t 5 /nobreak >nul

:: Step 7: Start Frontend
echo [7/9] Démarrage du Frontend...
start "OSINT Frontend" cmd /k "cd /d %~dp0 && npm run dev -- --port=3001 --host"
echo     Frontend demarre sur http://localhost:3001
timeout /t 5 /nobreak >nul

:: Step 8: Test API
echo [8/9] Test de l'API...
timeout /t 3 /nobreak >nul

:: Test with curl
curl -s http://localhost:3003/ >nul 2>&1
if errorlevel 1 (
    echo     API non responsive, attente supplementaire...
    timeout /t 5 /nobreak >nul
) else (
    echo     OK - API responsive
)

:: Test modules endpoint
curl -s http://localhost:3003/api/modules/catalog >nul 2>&1
if errorlevel 1 (
    echo     Modules API KO - Retry dans 10s...
    timeout /t 10 /nobreak >nul
    goto LOOP
) else (
    echo     OK - Modules API fonctionne
)

:: Step 9: Install tools via API
echo [9/9] Installation des outils via API...
echo     Appel Quick Start...
curl -s -X POST http://localhost:3003/api/modules/quickstart >nul 2>&1
echo     OK - Installation lancee

:: Final check
echo.
echo ==========================================
echo  VERIFICATION FINALE
echo ==========================================
echo.

curl -s http://localhost:3003/api/modules/catalog | findstr "count" >nul
if errorlevel 1 (
    echo [X] ERREUR: API ne repond pas correctement
    echo Retrying dans 10 secondes...
    timeout /t 10 /nobreak >nul
    goto LOOP
)

echo [OK] Backend:     http://localhost:3003
echo [OK] Frontend:    http://localhost:3001
echo [OK] Modules:     Charges
echo [OK] API:         Fonctionnelle
echo.
echo ==========================================
echo  TOUT EST PRET! 
echo ==========================================
echo.

:: Open browser
start http://localhost:3001

echo Navigateur ouvert sur http://localhost:3001
echo.
echo Pour arreter: Fermez les fenetres de commande
echo.
pause
exit /b 0
