#!/bin/bash
# OSINT Master Pro - Unified launcher (Linux / macOS)

set -e

MODE="${1:-local}"

if [ "$MODE" = "stop" ]; then
    echo "[STOP] Arret des services..."
    docker compose -f docker/docker-compose.yml down 2>/dev/null || true
    pkill -f "tsx watch src/server.ts" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    echo "[OK] Services arretes"
    exit 0
fi

if [ "$MODE" = "status" ]; then
    echo "[STATUS]"
    echo ""
    for service in "Backend:3002" "Frontend:5173" "Ollama:11434"; do
        name="${service%:*}"
        port="${service##*:}"
        if curl -fsS "http://localhost:$port" >/dev/null 2>&1; then
            echo "  $name ($port): ON"
        else
            echo "  $name ($port): OFF"
        fi
    done
    docker ps --filter "name=osint-" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || true
    exit 0
fi

echo ""
echo "============================================================"
echo "   OSINT MASTER PRO - Launcher"
echo "============================================================"
echo ""

if [ "$MODE" = "docker" ] || [ "$MODE" = "-d" ]; then
    echo "[MODE] Docker"
    command -v docker >/dev/null || { echo "[ERREUR] Docker non installe"; exit 1; }
    docker compose -f docker/docker-compose.yml build
    docker compose -f docker/docker-compose.yml up -d
    echo ""
    echo "  Frontend : http://localhost:5173"
    echo "  Backend  : http://localhost:3002"
    echo "  Ollama   : http://localhost:11434"
    echo ""
    echo "  Logs: docker compose -f docker/docker-compose.yml logs -f"
    exit 0
fi

# Local mode
echo "[MODE] Local"
echo ""

command -v node >/dev/null || { echo "[ERREUR] Node.js non installe"; exit 1; }

if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
    echo "[WARN] Python non detecte - modules d'analyse d'images indisponibles"
fi

if ! command -v ollama >/dev/null 2>&1; then
    echo "[INFO] Ollama non detecte - IA indisponible"
else
    echo "[OK] Ollama detecte"
fi

echo ""

[ ! -d "node_modules" ] && { echo "[1/4] Installation deps frontend..."; npm install --legacy-peer-deps; }
[ ! -d "backend/node_modules" ] && { echo "[2/4] Installation deps backend..."; (cd backend && npm install); }

if command -v pip >/dev/null 2>&1; then
    if ! python3 -c "from PIL import Image; import pytesseract; import PicImageSearch" >/dev/null 2>&1; then
        echo "[3/4] Installation Python deps..."
        pip install -q Pillow pytesseract PicImageSearch httpx 2>/dev/null || true
    fi
fi

echo "[4/4] Demarrage backend..."
(cd backend && npm run dev) &
BACKEND_PID=$!

echo "       Attente backend..."
for i in {1..20}; do
    if curl -fsS http://localhost:3002/health >/dev/null 2>&1; then
        echo "[OK] Backend pret"
        break
    fi
    sleep 2
done

echo "[FRONTEND] Demarrage..."
npm run dev &
FRONTEND_PID=$!

sleep 3

echo ""
echo "============================================================"
echo "  OSINT Master Pro demarre !"
echo ""
echo "  Frontend : http://localhost:5173"
echo "  Backend  : http://localhost:3002"
echo "  Health   : http://localhost:3002/api/debug/health"
echo ""
echo "  Ctrl+C pour arreter"
echo "============================================================"

# Open browser (best-effort)
(sleep 2 && { command -v xdg-open >/dev/null && xdg-open http://localhost:5173 || command -v open >/dev/null && open http://localhost:5173; }) &

# Wait
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
