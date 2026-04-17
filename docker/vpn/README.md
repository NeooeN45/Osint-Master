# 🔐 WireGuard VPN Configuration Guide

## Quick Start

### 1. Choose Your VPN Provider

We support any WireGuard-compatible VPN:
- **ProtonVPN** (Recommended - Swiss privacy)
- **Mullvad** (Anonymous accounts)
- **NordVPN** (NordLynx protocol)
- **Custom** (Your own WireGuard server)

### 2. Get Your WireGuard Config

#### ProtonVPN
1. Go to https://account.protonvpn.com/downloads
2. Click "WireGuard configuration"
3. Select platform: Linux/Other
4. Choose server location (Switzerland recommended)
5. Download the `.conf` file

#### Mullvad
1. Go to https://mullvad.net/en/account/wireguard-config
2. Generate a new key pair
3. Select server location
4. Download the `.conf` file

#### NordVPN
1. Enable NordLynx: `nordvpn set technology nordlynx`
2. Or use: https://nordvpn.com/blog/wireguard-setup/

### 3. Install Config in OSINT Master

```bash
# Copy your downloaded config to the VPN directory
cp ~/Downloads/protonvpn-ch.conf docker/vpn/

# Or for custom config
cp ~/Downloads/my-vpn.conf docker/vpn/custom.conf
```

### 4. Update docker-compose.yml (Optional)

```yaml
  vpn:
    build:
      context: .
      dockerfile: Dockerfile.wireguard
    container_name: osint-vpn
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - VPN_ENABLED=true
      - KILLSWITCH=true
      - VPN_CONFIG_FILE=/config/wg0.conf
    volumes:
      - ./docker/vpn/protonvpn-ch.conf:/config/wg0.conf:ro
    networks:
      - osint-network
```

### 5. Start the VPN

```bash
# Start all services
docker-compose up -d vpn

# Check VPN status
docker exec osint-vpn /scripts/check_ip.sh

# Or via API
curl http://localhost:3002/api/vpn/status
```

## ⚠️ Security Warning

**NEVER** commit real `.conf` files to git! They contain your private keys.

```bash
# Add to .gitignore
echo "*.conf" >> .gitignore
git add .gitignore
git commit -m "Ignore VPN config files"
```

## 🔧 Multiple VPN Configs

You can have multiple configs for rotation:

```bash
docker/vpn/
├── protonvpn-ch.conf      # Active (symlinked to wg0.conf)
├── protonvpn-nl.conf      # Netherlands backup
├── mullvad-se.conf        # Sweden backup
└── custom.conf            # Your own server
```

Switch configs:
```bash
# Change symlink to use different config
docker exec osint-vpn ln -sf /config/protonvpn-nl.conf /config/wg0.conf
docker exec osint-vpn /scripts/connect.sh
```

## 🧪 Testing VPN

### Test 1: IP Check
```bash
# Without VPN
curl https://ipinfo.io/ip

# With VPN (via container)
docker exec osint-vpn /scripts/check_ip.sh
```

### Test 2: Kill Switch
```bash
# 1. Connect VPN
curl -X POST http://localhost:3002/api/vpn/connect \
  -H "Content-Type: application/json" \
  -d '{"configId": "protonvpn-ch"}'

# 2. Enable kill switch
curl -X POST http://localhost:3002/api/vpn/killswitch/enable

# 3. Disconnect VPN (should block traffic)
docker exec osint-vpn wg-quick down wg0

# 4. Try to curl (should timeout/fail)
curl --max-time 5 https://ipinfo.io/ip
# Should fail - kill switch working!
```

### Test 3: Rotation
```bash
# Rotate to new IP
curl -X POST http://localhost:3002/api/vpn/rotate
```

## 📊 VPN Monitoring

View VPN status in real-time:

```bash
# Container logs
docker logs -f osint-vpn

# API status
curl http://localhost:3002/api/vpn/status | jq

# Health check
curl http://localhost:3002/api/vpn/health
```

## 🚨 Troubleshooting

### "Cannot find device wg0"
```bash
# Check kernel module
docker exec osint-vpn modprobe wireguard

# Rebuild container
docker-compose build --no-cache vpn
docker-compose up -d vpn
```

### "Handshake failed"
- Check config file path
- Verify private key is correct
- Ensure server endpoint is reachable

### "Kill switch blocking traffic"
```bash
# Disable killswitch if needed
docker exec osint-vpn /scripts/killswitch_off.sh
```

### DNS Leaks
```bash
# Test for DNS leaks
curl https://www.dnsleaktest.com/api/servers
# Should show VPN DNS servers, not your ISP
```

## 🎓 Advanced Usage

### Custom WireGuard Server

You can use your own WireGuard server:

1. Generate keypair:
```bash
wg genkey | tee privatekey | wg pubkey > publickey
```

2. Create `custom.conf`:
```ini
[Interface]
PrivateKey = $(cat privatekey)
Address = 10.200.200.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = your-server.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

### Split Tunneling

Only route specific traffic through VPN:
```ini
[Peer]
# Only Instagram traffic through VPN
AllowedIPs = 31.13.71.0/24, 157.240.0.0/16
```

## 📞 Support

- ProtonVPN: https://protonvpn.com/support/
- Mullvad: https://mullvad.net/help/
- NordVPN: https://support.nordvpn.com/
- WireGuard: https://www.wireguard.com/
