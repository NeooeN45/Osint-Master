#!/bin/bash
# =============================================================================
# Entrypoint pour le container d'outils OSINT
# =============================================================================

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ═════════════════════════════════════════════════════════════════════════════
# INITIALISATION
# ═════════════════════════════════════════════════════════════════════════════

log_info "Initialisation du container OSINT Tools..."
log_info "Version: 4.0 | User: $(whoami) | UID: $(id -u)"

# Créer les répertoires nécessaires
mkdir -p /home/osint/data /home/osint/.cache /home/osint/logs

# ═════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION TOR
# ═════════════════════════════════════════════════════════════════════════════

log_info "Vérification de la connexion Tor..."

TOR_HOST=${TOR_HOST:-tor-proxy}
TOR_PORT=${TOR_PORT:-9050}

# Attendre que Tor soit disponible
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if nc -z $TOR_HOST $TOR_PORT 2>/dev/null; then
        log_success "Connexion Tor établie ($TOR_HOST:$TOR_PORT)"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_warning "Attente de Tor... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Tor n'est pas disponible après $MAX_RETRIES tentatives"
    log_warning "Les outils fonctionneront sans proxy Tor"
fi

# Tester la connexion Tor
if curl --socks5 $TOR_HOST:$TOR_PORT --max-time 10 -s https://check.torproject.org/api/ip 2>/dev/null | grep -q '"IsTor":true'; then
    log_success "Connexion Tor vérifiée et fonctionnelle"
else
    log_warning "Test de connexion Tor échoué, mais le proxy est disponible"
fi

# ═════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DES OUTILS
# ═════════════════════════════════════════════════════════════════════════════

log_info "Configuration des outils..."

# Créer alias pour les outils avec proxy
if [ -n "$TOR_HOST" ]; then
    # Alias pour utiliser Tor automatiquement
    alias curl-tor="curl --socks5 $TOR_HOST:$TOR_PORT"
    alias wget-tor="wget --execute=\"http_proxy=socks5://$TOR_HOST:$TOR_PORT\""
    
    # Configurer proxychains
    echo "strict_chain" > /tmp/proxychains.conf
    echo "proxy_dns" >> /tmp/proxychains.conf
    echo "tcp_read_time_out 15000" >> /tmp/proxychains.conf
    echo "tcp_connect_time_out 8000" >> /tmp/proxychains.conf
    echo "" >> /tmp/proxychains.conf
    echo "[ProxyList]" >> /tmp/proxychains.conf
    echo "socks5 $TOR_HOST $TOR_PORT" >> /tmp/proxychains.conf
    
    log_success "Proxy Tor configuré: socks5://$TOR_HOST:$TOR_PORT"
fi

# ═════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION DES OUTILS
# ═════════════════════════════════════════════════════════════════════════════

log_info "Vérification des outils installés..."

# Liste des outils à vérifier
tools=(
    "sherlock"
    "holehe"
    "theHarvester"
    "subfinder"
    "httpx"
    "nuclei"
    "amass"
    "python3"
    "node"
    "go"
)

AVAILABLE_TOOLS=()
MISSING_TOOLS=()

for tool in "${tools[@]}"; do
    if command -v $tool &> /dev/null; then
        AVAILABLE_TOOLS+=($tool)
    else
        MISSING_TOOLS+=($tool)
    fi
done

log_success "${#AVAILABLE_TOOLS[@]} outils disponibles: ${AVAILABLE_TOOLS[*]}"

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    log_warning "${#MISSING_TOOLS[@]} outils manquants: ${MISSING_TOOLS[*]}"
fi

# ═════════════════════════════════════════════════════════════════════════════
# DÉMARRAGE
# ═════════════════════════════════════════════════════════════════════════════

log_success "Container OSINT Tools prêt!"
log_info "Commandes disponibles:"
echo "  - sherlock <username>"
echo "  - holehe <email>"
echo "  - theHarvester -d <domain>"
echo "  - subfinder -d <domain>"
echo "  - curl-tor <url> (avec Tor)"
echo "  - proxychains4 <command> (avec Tor)"
echo ""
log_info "Data directory: /home/osint/data"
log_info "Logs directory: /home/osint/logs"
echo ""

# Exécuter la commande fournie ou bash par défaut
if [ $# -eq 0 ]; then
    log_info "Démarrage du shell interactif..."
    exec bash
else
    log_info "Exécution: $@"
    exec "$@"
fi
