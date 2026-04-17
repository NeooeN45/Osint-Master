#!/bin/bash
# =============================================================================
# Run Complete Investigation Test Suite
# Script pour lancer les tests avec les données de test
# 
# Usage: ./scripts/run-tests.sh [options]
# Options:
#   --quick       Run only quick tests (30s timeout)
#   --deep        Include deep investigation tests (slow)
#   --vpn-test    Test VPN kill switch
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test data from user
export API_BASE="${API_BASE:-http://localhost:3002/api}"
export TEST_USERNAME="${TEST_USERNAME:-camille_perraudeau}"
export TEST_EMAIL="${TEST_EMAIL:-hydrogene.bonde@gmail.com}"
export TEST_PHONE="${TEST_PHONE:-+33769723999}"
export TEST_IP="${TEST_IP:-5.49.134.36}"
export TEST_DOMAIN="${TEST_DOMAIN:-example.com}"
export TEST_LOCATION_COUNTRY="France"
export TEST_LOCATION_REGION="Vienne"
export TEST_LOCATION_CITY="Poitiers"
export TEST_ISP="Bouygues Telecom"

# Parse arguments
RUN_DEEP=false
VPN_TEST=false
QUICK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK=true
            shift
            ;;
        --deep)
            RUN_DEEP=true
            shift
            ;;
        --vpn-test)
            VPN_TEST=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --quick       Run only quick tests"
            echo "  --deep        Include deep investigation tests"
            echo "  --vpn-test    Test VPN kill switch"
            echo "  --help        Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Header
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════╗
║           OSINT Master Pro v4.0 - Test Suite Runner               ║
║           Données de test: camille_perraudeau                     ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Display configuration
echo -e "${BLUE}[CONFIG]${NC} Configuration des tests:"
echo "  - Username: $TEST_USERNAME"
echo "  - Email: $TEST_EMAIL"
echo "  - Phone: $TEST_PHONE"
echo "  - IP: $TEST_IP"
echo "  - Location: $TEST_LOCATION_CITY, $TEST_LOCATION_COUNTRY"
echo "  - ISP: $TEST_ISP"
echo ""

# Check if backend is running
echo -e "${BLUE}[CHECK]${NC} Vérification du backend..."
if curl -s "${API_BASE}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Backend is running"
else
    echo -e "${YELLOW}[WARN]${NC} Backend not responding"
    echo -e "${BLUE}[INFO]${NC} Pour démarrer le backend:"
    echo "  cd backend && npx tsx src/server.ts"
    
    read -p "Voulez-vous démarrer le backend maintenant? (y/N): " start_backend
    if [[ $start_backend =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}[INFO]${NC} Démarrage du backend..."
        cd "$(dirname "$0")/../backend"
        npx tsx src/server.ts &
        BACKEND_PID=$!
        
        # Wait for startup
        for i in {1..10}; do
            sleep 2
            if curl -s "${API_BASE}/health" > /dev/null 2>&1; then
                echo -e "${GREEN}[OK]${NC} Backend started successfully"
                break
            fi
            echo -n "."
        done
        
        if ! curl -s "${API_BASE}/health" > /dev/null 2>&1; then
            echo -e "${RED}[ERROR]${NC} Failed to start backend"
            exit 1
        fi
    else
        echo -e "${RED}[ERROR]${NC} Backend required for tests"
        exit 1
    fi
fi

echo ""

# Check Docker services
echo -e "${BLUE}[CHECK]${NC} Vérification des services Docker..."
if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "osint"; then
    echo -e "${GREEN}[OK]${NC} Docker services running"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep osint
else
    echo -e "${YELLOW}[WARN]${NC} Docker services not running"
    echo -e "${BLUE}[INFO]${NC} Pour lancer les services:"
    echo "  docker-compose up -d"
fi

echo ""

# Check VPN status
echo -e "${BLUE}[CHECK]${NC} Vérification VPN..."
VPN_STATUS=$(curl -s "${API_BASE}/vpn/status" 2>/dev/null | grep -o '"connected":[a-z]*' | cut -d: -f2)
if [ "$VPN_STATUS" = "true" ]; then
    echo -e "${GREEN}[OK]${NC} VPN is connected"
else
    echo -e "${YELLOW}[WARN]${NC} VPN not connected"
    echo -e "${BLUE}[INFO]${NC} Pour configurer le VPN:"
    echo "  ./scripts/setup-vpn.sh"
fi

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}[START]${NC} Lancement des tests..."
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Change to backend directory
cd "$(dirname "$0")/../backend"

# Set additional env vars
export RUN_DEEP_TEST=$RUN_DEEP
export VPN_ENABLED=$VPN_TEST

if [ "$QUICK" = true ]; then
    export TEST_TIMEOUT_QUICK=30000
    echo -e "${BLUE}[MODE]${NC} Quick tests only (30s timeout)"
fi

# Run test suite
if npx tsx test_investigation_complete.ts; then
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  ✅ TOUS LES TESTS ONT RÉUSSI !                 ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    
    # Cleanup backend if we started it
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    exit 0
else
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ❌ CERTAINS TESTS ONT ÉCHOUÉ                  ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
    
    # Cleanup backend if we started it
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    exit 1
fi
