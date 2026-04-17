#!/bin/bash
# =============================================================================
# VPN Configuration Setup Script
# Script d'installation automatique des configurations VPN
# 
# Usage: ./scripts/setup-vpn.sh [provider]
# Providers: protonvpn, mullvad, nordvpn, custom
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPN_DIR="${SCRIPT_DIR}/../docker/vpn"
mkdir -p "$VPN_DIR"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${CYAN}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════╗
║                    OSINT Master - VPN Setup                      ║
║                   WireGuard Configuration Tool                   ║
╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Check if WireGuard is installed
check_wireguard() {
    if ! command -v wg &> /dev/null; then
        log_warn "WireGuard not found in host system"
        log_info "WireGuard will run inside Docker container"
    else
        log_success "WireGuard found: $(wg --version | head -1)"
    fi
}

# Generate key pair
generate_keys() {
    log_info "Generating WireGuard key pair..."
    PRIVATE_KEY=$(wg genkey)
    PUBLIC_KEY=$(echo "$PRIVATE_KEY" | wg pubkey)
    
    log_success "Keys generated"
    log_info "Public Key: $PUBLIC_KEY"
    
    read -p "Save keys to file? (y/N): " save_keys
    if [[ $save_keys =~ ^[Yy]$ ]]; then
        echo "$PRIVATE_KEY" > "$VPN_DIR/wg_private.key"
        echo "$PUBLIC_KEY" > "$VPN_DIR/wg_public.key"
        chmod 600 "$VPN_DIR/wg_private.key"
        log_success "Keys saved to $VPN_DIR/"
    fi
}

# Setup ProtonVPN
setup_protonvpn() {
    log_info "Setting up ProtonVPN configuration..."
    
    echo -e "\n${YELLOW}ProtonVPN Setup Instructions:${NC}"
    echo "1. Login to https://account.protonvpn.com/downloads"
    echo "2. Click 'WireGuard configuration'"
    echo "3. Select platform: Linux/Other"
    echo "4. Choose server location (Switzerland recommended for privacy)"
    echo "5. Download the .conf file"
    
    read -p "Have you downloaded the ProtonVPN .conf file? (y/N): " downloaded
    
    if [[ ! $downloaded =~ ^[Yy]$ ]]; then
        log_warn "Please download the config file first"
        echo "Opening browser..."
        
        # Try to open browser
        if command -v xdg-open &> /dev/null; then
            xdg-open "https://account.protonvpn.com/downloads" &
        elif command -v open &> /dev/null; then
            open "https://account.protonvpn.com/downloads" &
        elif command -v start &> /dev/null; then
            start "https://account.protonvpn.com/downloads" &
        fi
        
        read -p "Press Enter when you have the config file..."
    fi
    
    # Copy config
    read -p "Enter path to downloaded ProtonVPN config: " config_path
    
    if [ -f "$config_path" ]; then
        cp "$config_path" "$VPN_DIR/protonvpn-ch.conf"
        chmod 600 "$VPN_DIR/protonvpn-ch.conf"
        log_success "ProtonVPN config installed"
        
        # Create symlink as default
        ln -sf "$VPN_DIR/protonvpn-ch.conf" "$VPN_DIR/wg0.conf" 2>/dev/null || true
        log_info "Set as default VPN config (wg0.conf)"
    else
        log_error "Config file not found: $config_path"
        return 1
    fi
}

# Setup Mullvad
setup_mullvad() {
    log_info "Setting up Mullvad VPN configuration..."
    
    echo -e "\n${YELLOW}Mullvad VPN Setup Instructions:${NC}"
    echo "1. Login to https://mullvad.net/en/account/wireguard-config"
    echo "2. Click 'Generate new key pair'"
    echo "3. Select server location"
    echo "4. Download the .conf file"
    
    read -p "Have you downloaded the Mullvad .conf file? (y/N): " downloaded
    
    if [[ ! $downloaded =~ ^[Yy]$ ]]; then
        log_warn "Please download the config file first"
        
        if command -v xdg-open &> /dev/null; then
            xdg-open "https://mullvad.net/en/account/wireguard-config" &
        elif command -v open &> /dev/null; then
            open "https://mullvad.net/en/account/wireguard-config" &
        elif command -v start &> /dev/null; then
            start "https://mullvad.net/en/account/wireguard-config" &
        fi
        
        read -p "Press Enter when you have the config file..."
    fi
    
    read -p "Enter path to downloaded Mullvad config: " config_path
    
    if [ -f "$config_path" ]; then
        cp "$config_path" "$VPN_DIR/mullvad-se.conf"
        chmod 600 "$VPN_DIR/mullvad-se.conf"
        log_success "Mullvad config installed"
    else
        log_error "Config file not found: $config_path"
        return 1
    fi
}

# Setup NordVPN
setup_nordvpn() {
    log_info "Setting up NordVPN configuration..."
    
    echo -e "\n${YELLOW}NordVPN Setup Instructions:${NC}"
    echo "NordVPN uses NordLynx (WireGuard-based)"
    echo "1. Login to https://nordvpn.com/blog/wireguard-setup/"
    echo "2. Or use NordVPN CLI: nordvpn set technology nordlynx"
    echo "3. Download the WireGuard config"
    
    read -p "Enter path to NordVPN config (if available): " config_path
    
    if [ -f "$config_path" ]; then
        cp "$config_path" "$VPN_DIR/nordvpn-us.conf"
        chmod 600 "$VPN_DIR/nordvpn-us.conf"
        log_success "NordVPN config installed"
    else
        log_warn "Config file not found, continuing with examples..."
    fi
}

# Setup custom VPN
setup_custom() {
    log_info "Setting up custom WireGuard server..."
    
    echo -e "\n${YELLOW}Custom WireGuard Server Setup:${NC}"
    
    read -p "Enter your WireGuard server endpoint (IP:port): " endpoint
    read -p "Enter server public key: " server_pubkey
    read -p "Enter your assigned IP address: " client_ip
    
    # Generate client keys if needed
    if [ ! -f "$VPN_DIR/wg_private.key" ]; then
        generate_keys
    fi
    
    PRIVATE_KEY=$(cat "$VPN_DIR/wg_private.key")
    
    # Create config
    cat > "$VPN_DIR/custom.conf" << EOF
[Interface]
PrivateKey = $PRIVATE_KEY
Address = $client_ip/32
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = $server_pubkey
Endpoint = $endpoint
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
EOF
    
    chmod 600 "$VPN_DIR/custom.conf"
    log_success "Custom VPN config created: $VPN_DIR/custom.conf"
}

# Test VPN configuration
test_vpn() {
    log_info "Testing VPN configuration..."
    
    if [ ! -f "$VPN_DIR/wg0.conf" ] && [ ! -f "$VPN_DIR/protonvpn-ch.conf" ]; then
        log_error "No VPN config found!"
        log_info "Please run setup first"
        return 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found!"
        return 1
    fi
    
    # Build VPN container
    log_info "Building VPN container..."
    cd "${SCRIPT_DIR}/.."
    docker-compose build vpn 2>/dev/null || docker build -f Dockerfile.wireguard -t osint-vpn .
    
    # Start VPN
    log_info "Starting VPN container..."
    docker-compose up -d vpn 2>/dev/null || {
        log_warn "Docker Compose not available, trying direct Docker..."
        docker run -d --name osint-vpn-test \
            --cap-add NET_ADMIN \
            --cap-add SYS_MODULE \
            -v "$VPN_DIR":/config \
            -e VPN_ENABLED=true \
            osint-vpn
    }
    
    sleep 3
    
    # Test connection
    log_info "Testing VPN connection..."
    if docker exec osint-vpn /scripts/check_ip.sh 2>/dev/null; then
        log_success "VPN is working!"
        
        # Get IP info
        log_info "Current VPN IP:"
        docker exec osint-vpn curl -s https://ipinfo.io/ip 2>/dev/null || echo "N/A"
    else
        log_error "VPN test failed!"
        log_info "Check logs: docker logs osint-vpn"
        return 1
    fi
    
    # Cleanup test container
    docker rm -f osint-vpn-test 2>/dev/null || true
}

# Status check
show_status() {
    echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                      VPN Configuration Status                     ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}\n"
    
    if [ -d "$VPN_DIR" ]; then
        log_info "VPN Directory: $VPN_DIR"
        
        configs=$(ls -1 "$VPN_DIR"/*.conf 2>/dev/null | wc -l)
        log_info "Config files found: $configs"
        
        echo -e "\n${CYAN}Available configs:${NC}"
        for conf in "$VPN_DIR"/*.conf; do
            if [ -f "$conf" ]; then
                basename "$conf"
            fi
        done
        
        if [ -L "$VPN_DIR/wg0.conf" ]; then
            echo -e "\n${GREEN}Default config (wg0.conf):${NC}"
            ls -la "$VPN_DIR/wg0.conf"
        fi
    else
        log_warn "VPN directory not found"
    fi
}

# Main menu
main_menu() {
    print_header
    
    echo "Select VPN provider:"
    echo "1) ProtonVPN (Recommended - Swiss privacy)"
    echo "2) Mullvad (Anonymous accounts)"
    echo "3) NordVPN (NordLynx protocol)"
    echo "4) Custom WireGuard server"
    echo "5) Generate key pair only"
    echo "6) Test existing configuration"
    echo "7) Show status"
    echo "8) Exit"
    
    read -p "Enter choice (1-8): " choice
    
    case $choice in
        1) setup_protonvpn ;;
        2) setup_mullvad ;;
        3) setup_nordvpn ;;
        4) setup_custom ;;
        5) generate_keys ;;
        6) test_vpn ;;
        7) show_status ;;
        8) exit 0 ;;
        *) log_error "Invalid choice" ;;
    esac
}

# Main
if [ $# -eq 0 ]; then
    # Interactive mode
    check_wireguard
    
    while true; do
        main_menu
        echo ""
        read -p "Press Enter to continue..."
    done
else
    # Command line mode
    case $1 in
        protonvpn|proton) setup_protonvpn ;;
        mullvad) setup_mullvad ;;
        nordvpn|nord) setup_nordvpn ;;
        custom) setup_custom ;;
        test) test_vpn ;;
        status) show_status ;;
        keys) generate_keys ;;
        *) echo "Usage: $0 [protonvpn|mullvad|nordvpn|custom|test|status|keys]" ;;
    esac
fi
