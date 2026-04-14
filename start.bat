@echo off
chcp 65001 >nul
title OSINT Master - Démarrage Automatique

echo ==========================================
echo    OSINT MASTER - DEMARRAGE AUTOMATIQUE
echo ==========================================
echo.

:: Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe!
    echo Veuillez installer Node.js: https://nodejs.org
    pause
    exit /b 1
)

echo [✓] Node.js detecte

:: Tuer les processus existants sur les ports
echo [~] Nettoyage des ports...
npx kill-port 3003 2>nul
npx kill-port 3001 2>nul
timeout /t 2 /nobreak >nul

:: Démarrer le Backend
echo.
echo [~] Demarrage du Backend (Port 3003)...
start "OSINT Backend" cmd /k "cd /d %~dp0backend && npx tsx src/server-minimal.ts"

timeout /t 5 /nobreak >nul

:: Démarrer le Frontend
echo [~] Demarrage du Frontend (Port 3001)...
start "OSINT Frontend" cmd /k "cd /d %~dp0 && npm run dev -- --port=3001"

timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo    SERVICES DEMARRES!
echo ==========================================
echo.
echo Backend:  http://localhost:3003
echo Frontend: http://localhost:3001
echo.
echo Appuyez sur une touche pour ouvrir le navigateur...
pause >nul

:: Ouvrir le navigateur
start http://localhost:3001

echo.
echo [✓] Navigateur ouvert!
echo.
echo Pour arreter: Fermez les fenetres de commande
echo.
pause
