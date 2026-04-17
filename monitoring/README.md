# 📊 OSINT Master Pro - Monitoring Stack

Stack de monitoring complet avec **Prometheus**, **Grafana**, **Node Exporter**, **cAdvisor** et **Alertmanager**.

## 🚀 Quick Start

### Démarrer le monitoring

```bash
# Démarrer tout le stack de monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Vérifier le statut
docker-compose -f docker-compose.monitoring.yml ps
```

### Accès aux interfaces

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| **Prometheus** | http://localhost:9090 | - |
| **Grafana** | http://localhost:3000 | admin/admin |
| **Alertmanager** | http://localhost:9093 | - |

## 📈 Dashboards

### OSINT Master Overview
- System metrics (CPU, Memory, Disk)
- VPN & Tor status
- Investigation counts
- Tool usage statistics
- Findings by type

### Node Exporter Full
- Detailed system metrics
- Network statistics
- Disk I/O
- Process information

## 🔔 Alertes configurées

### Alertes Critiques
- **BackendDown** : Backend API hors ligne
- **VPNDisconnected** : Connexion VPN perdue
- **DiskSpaceLow** : Espace disque < 10%

### Alertes Warning
- **HighCPUUsage** : CPU > 80% pendant 5min
- **HighMemoryUsage** : Memory > 85% pendant 5min
- **TorProxyDown** : Proxy Tor hors ligne
- **TooManyFailedLogins** : > 10 échecs de login en 5min

### Alertes Info
- **InvestigationStalled** : Investigation > 30min
- **CacheHitRateLow** : Cache hit rate < 50%

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env.monitoring` :

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password
GRAFANA_ROOT_URL=http://localhost:3000

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_KEY=your-pagerduty-key
```

### Alertmanager

Configurer les notifications dans `monitoring/alertmanager.yml` :
- Slack
- Email
- PagerDuty

## 🛠️ Maintenance

### Voir les logs

```bash
# Tous les services
docker-compose -f docker-compose.monitoring.yml logs -f

# Service spécifique
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
```

### Redémarrer un service

```bash
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Mise à jour

```bash
# Pull latest images
docker-compose -f docker-compose.monitoring.yml pull

# Recreate containers
docker-compose -f docker-compose.monitoring.yml up -d
```

### Backup des données

```bash
# Backup Prometheus
docker exec osint-prometheus tar czf - /prometheus > prometheus-backup-$(date +%Y%m%d).tar.gz

# Backup Grafana
docker exec osint-grafana tar czf - /var/lib/grafana > grafana-backup-$(date +%Y%m%d).tar.gz
```

## 📊 Métriques exposées

### Backend API (`/api/monitoring/metrics`)

```
# Investigations
osint_investigations_total{type="username"} 42
osint_investigation_duration_seconds{job_id="123"} 125.5
osint_findings_by_type{type="social"} 156

# Tools
osint_tools_executed_total{tool="sherlock"} 89
osint_tool_duration_seconds{tool="sherlock"} 45.2

# Cache
osint_cache_hit_rate 0.78
osint_cache_size_bytes 1048576

# Security
osint_failed_logins_total 3
osint_api_requests_total{status="200"} 1234

# VPN
vpn_connection_status 1
vpn_bytes_transmitted_total 104857600
vpn_bytes_received_total 209715200

# Tor
tor_proxy_status 1
tor_circuit_established 1
```

### Node Exporter (`:9100/metrics`)

- `node_cpu_seconds_total` : CPU usage
- `node_memory_MemAvailable_bytes` : Memory available
- `node_filesystem_avail_bytes` : Disk space
- `node_network_receive_bytes_total` : Network I/O

### cAdvisor (`:8080/metrics`)

- `container_memory_usage_bytes` : Container memory
- `container_cpu_usage_seconds_total` : Container CPU
- `container_network_receive_bytes_total` : Container network

## 🎯 Intégration avec OSINT Master

### Activer les métriques backend

Dans `.env` :
```bash
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Health check endpoint

```bash
curl http://localhost:3002/api/health
# {"status":"ok","timestamp":"2026-04-17T..."}
```

### Métriques endpoint

```bash
curl http://localhost:3002/api/monitoring/metrics
```

## 🚨 Dépannage

### Prometheus ne scrape pas

Vérifier la configuration :
```bash
docker exec osint-prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Grafana ne démarre pas

Vérifier les permissions :
```bash
docker exec osint-grafana ls -la /var/lib/grafana
```

### Pas de données dans les graphiques

1. Vérifier les targets Prometheus :
   http://localhost:9090/targets

2. Vérifier la connectivité réseau :
   ```bash
   docker network inspect monitoring
   ```

3. Vérifier les logs des exporters :
   ```bash
   docker logs osint-node-exporter
   ```

## 📚 Documentation

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Node Exporter](https://github.com/prometheus/node_exporter)
- [cAdvisor](https://github.com/google/cadvisor)

---

**Créé:** 17 Avril 2026
**Version:** 4.0
