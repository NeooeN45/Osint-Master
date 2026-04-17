# 🚀 OSINT Master Pro v4.0 - Production Deployment Guide

## 📋 Prerequisites

### Hardware Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 50 GB SSD | 100+ GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software Requirements
- **Docker** 24.0+ with Compose plugin
- **Node.js** 18+ (for local development)
- **Git** 2.40+
- **WireGuard** (for VPN features)

### OS Support
- ✅ Ubuntu 22.04 LTS (Recommended)
- ✅ Debian 12
- ✅ CentOS Stream 9
- ✅ Windows Server 2022 (with WSL2)
- ✅ macOS 14+ (Development only)

---

## 🔧 Pre-Deployment Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/NeooeN45/Osint-Master.git
cd Osint-Master

# Checkout latest stable (optional)
git checkout main
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with production values
nano .env
```

**Required Environment Variables:**

```bash
# Application
NODE_ENV=production
PORT=3002
SKIP_AUTH=false
JWT_SECRET=your-strong-secret-here

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/osint
REDIS_URL=redis://localhost:6379

# API Keys (configure at least 3-5)
SHODAN_API_KEY=your_key
VIRUSTOTAL_API_KEY=your_key
HUNTER_API_KEY=your_key
GITHUB_TOKEN=your_token
IPINFO_TOKEN=your_token
# ... see .env.example for all 13 keys

# VPN Configuration
VPN_ENABLED=true
VPN_CONTAINER=osint-vpn
VPN_CONFIG_PATH=./docker/vpn/protonvpn-ch.conf

# Docker
COMPOSE_PROJECT_NAME=osint-master
DOCKER_NETWORK=osint-network

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 3. VPN Configuration

```bash
# Create VPN config directory
mkdir -p docker/vpn

# Copy your WireGuard config
cp /path/to/your/protonvpn-ch.conf docker/vpn/

# Verify config
cat docker/vpn/protonvpn-ch.conf
# Should contain: [Interface] section with PrivateKey
```

---

## 🐳 Docker Deployment

### Option 1: Full Stack (Recommended)

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Option 2: Individual Services

```bash
# Start core services only
docker-compose up -d backend frontend tor-proxy

# Add VPN later
docker-compose up -d vpn

# Add tools environment
docker-compose up -d osint-tools
```

### Option 3: Production with Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml osint-master

# Scale services
docker service scale osint-master_backend=3
```

---

## ☁️ Cloud Deployment

### AWS Deployment

```bash
# 1. Create EC2 instance (t3.large or higher)
# 2. Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose

# 3. Clone and deploy
git clone https://github.com/NeooeN45/Osint-Master.git
cd Osint-Master
cp .env.example .env
# Edit .env with your config

# 4. Deploy
docker-compose up -d

# 5. Configure Security Group
# - Allow 3002 (Backend API)
# - Allow 5173 (Frontend)
# - Allow 22 (SSH)
```

### Google Cloud Platform

```bash
# 1. Create VM instance (n1-standard-2 or higher)
# 2. Allow HTTP/HTTPS traffic

# 3. SSH and deploy
gcloud compute ssh osint-master-vm
curl -fsSL https://get.docker.com | sudo sh
git clone https://github.com/NeooeN45/Osint-Master.git
cd Osint-Master
docker-compose up -d
```

### Azure Deployment

```bash
# 1. Create VM (Standard_D2s_v3 or higher)
# 2. Open ports 3002, 5173 in NSG

# 3. Deploy via Cloud Shell
az vm run-command invoke \
  --resource-group myRG \
  --name osint-master \
  --command-id RunShellScript \
  --scripts "git clone https://github.com/NeooeN45/Osint-Master.git && cd Osint-Master && docker-compose up -d"
```

### DigitalOcean

```bash
# 1. Create Droplet (4GB RAM / 2 CPUs minimum)
# 2. Select Docker image or install manually

# 3. Deploy
cd Osint-Master
docker-compose up -d

# 4. Configure firewall
ufw allow 3002/tcp
ufw allow 5173/tcp
```

---

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# UFW (Ubuntu/Debian)
ufw default deny incoming
ufw default allow outgoing
ufw allow 3002/tcp  # Backend
ufw allow 5173/tcp  # Frontend
ufw allow 22/tcp    # SSH (restrict to your IP)
ufw enable

# iptables
iptables -A INPUT -p tcp --dport 3002 -j ACCEPT
iptables -A INPUT -p tcp --dport 5173 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -s YOUR_IP -j ACCEPT
iptables -P INPUT DROP
```

### 2. SSL/TLS with Nginx

```nginx
# /etc/nginx/sites-available/osint-master
server {
    listen 443 ssl http2;
    server_name osint.example.com;

    ssl_certificate /etc/letsencrypt/live/osint.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/osint.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name osint.example.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Fail2Ban

```bash
# Install
sudo apt install fail2ban

# Configure
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

sudo systemctl restart fail2ban
```

### 4. VPN Kill Switch (Critical)

```bash
# Enable kill switch in VPN container
docker exec osint-vpn /scripts/killswitch.sh

# Verify traffic is blocked when VPN is down
docker exec osint-vpn wg-quick down wg0
curl --max-time 5 https://ipinfo.io/ip
# Should fail/timeout
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks

```bash
# API Health
curl http://localhost:3002/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Docker containers
docker-compose ps
# All should show "Up"

# VPN status
curl http://localhost:3002/api/vpn/status
# Check "connected": true
```

### 2. Run Test Suite

```bash
# Install dependencies
cd backend && npm install

# Run complete test
export API_BASE=http://localhost:3002/api
npx tsx test_investigation_complete.ts
```

### 3. Manual Verification

```bash
# Test username investigation
curl -X POST http://localhost:3002/api/osint/investigate \
  -H "Content-Type: application/json" \
  -d '{"target":"testuser","targetType":"username","tools":["sherlock"]}'

# Test VPN rotation
curl -X POST http://localhost:3002/api/vpn/rotate

# Check monitoring
curl http://localhost:3002/api/monitoring/dashboard
```

---

## 📊 Monitoring & Maintenance

### 1. Log Management

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# Export logs
docker-compose logs > logs-$(date +%Y%m%d).txt
```

### 2. Backup Strategy

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/osint-master

# Backup volumes
docker run --rm -v osint-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/data-$DATE.tar.gz -C /data .
docker run --rm -v backend-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/backend-$DATE.tar.gz -C /data .

# Backup configs
cp .env $BACKUP_DIR/env-$DATE

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Schedule with cron (daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

### 3. Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or zero-downtime update
docker-compose build backend
docker-compose up -d --no-deps --scale backend=2 backend
docker-compose up -d --scale backend=1 backend
```

### 4. Monitoring Stack (Optional)

```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
```

---

## 🚨 Troubleshooting

### Common Issues

**Issue 1: VPN Connection Fails**
```bash
# Check config file
cat docker/vpn/wg0.conf

# Test manually
docker exec osint-vpn /scripts/check_ip.sh

# Check logs
docker-compose logs vpn | tail -50
```

**Issue 2: Backend Won't Start**
```bash
# Check for port conflicts
lsof -i :3002

# Check logs
docker-compose logs backend

# Restart with fresh build
docker-compose down
docker-compose up -d --build backend
```

**Issue 3: API Keys Not Working**
```bash
# Verify .env is loaded
docker-compose exec backend env | grep API_KEY

# Reload config
curl -X POST http://localhost:3002/api/config/reload
```

**Issue 4: Out of Memory**
```bash
# Check memory usage
docker stats --no-stream

# Increase Docker memory limit
# Edit /etc/docker/daemon.json
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m"
  },
  "storage-driver": "overlay2"
}
```

---

## 📞 Support

### Getting Help
1. **Documentation:** Check `README.md` and `PROGRESS.md`
2. **Logs:** `docker-compose logs`
3. **Issues:** https://github.com/NeooeN45/Osint-Master/issues
4. **Audit Report:** See `AUDIT_REPORT.md`

### Emergency Contacts
- Security issues: security@osint-master.local
- Critical bugs: Use GitHub Issues with "CRITICAL" label

---

## 🎉 Success Checklist

Before considering deployment complete:

- [ ] All containers running (`docker-compose ps`)
- [ ] Health checks passing
- [ ] VPN connected and kill switch enabled
- [ ] SSL/TLS configured
- [ ] Firewall rules applied
- [ ] API keys configured
- [ ] Test suite passing
- [ ] Backup strategy in place
- [ ] Monitoring enabled
- [ ] Documentation reviewed

---

**🚀 Your OSINT Master instance is now production-ready!**

For questions or issues, refer to the documentation or open a GitHub issue.

*Last updated: 17 Avril 2026*
