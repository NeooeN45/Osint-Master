# 🚀 OSINT Master - Quick Start Guide

## Démarrage Rapide en 3 Étapes

### Étape 1: Démarrer les Services

```bash
# Terminal 1 - Backend
cd backend
npx tsx src/server-minimal.ts

# Terminal 2 - Frontend
npm run dev -- --port=3001
```

### Étape 2: Vérifier l'API

Ouvrir dans navigateur:
- Backend: http://localhost:3003/
- Frontend: http://localhost:3001/

Test API:
```bash
curl http://localhost:3003/api/modules/catalog
curl http://localhost:3003/api/tools/catalog
```

### Étape 3: Utiliser les Modules

1. Ouvrir http://localhost:3001
2. Cliquer sur **"100+ Modules"** dans le header
3. Cliquer sur **"⚡ Quick Start"** pour installer les essentiels
4. Commencer à rechercher!

---

## 📦 Modules Disponibles (100+)

### Person & Identity
- **Sherlock** - Username search on 400+ platforms
- **Maigret** - Complete dossier on individuals
- **Holehe** - Email registration check
- **Ignorant** - Phone number verification

### Domain Intelligence
- **theHarvester** - Email/subdomain discovery
- **Subfinder** - Fast subdomain enumeration
- **Assetfinder** - Related domain discovery
- **Amass** - Attack surface mapping

### Network Intelligence
- **Nmap** - Network scanning
- **Shodan** - IoT device search
- **Censys** - Asset discovery
- **VirusTotal** - Malware/reputation check

### Web Intelligence
- **WhatWeb** - Technology fingerprinting
- **Gobuster** - Directory busting
- **WaybackURLs** - URL history
- **GAU** - URL enumeration

### Social Media
- **Instaloader** - Instagram metadata
- **Twint** - Twitter scraping
- **TikTok Scraper** - TikTok data
- **youtube-dl** - YouTube metadata

### Image & Video
- **ExifTool** - Metadata extraction
- **Foremost** - File carving
- **Steghide** - Steganography
- **zsteg** - PNG/BMP analysis

### Breach & Leaks
- **Have I Been Pwned** - Breach check
- **DeHashed** - Credential search

---

## 🔧 API Endpoints

### Module Management
```
GET  /api/modules/catalog        # Liste tous les modules
GET  /api/modules/categories     # Liste les catégories
POST /api/modules/install/:id    # Installe un module
POST /api/modules/quickstart     # Installe 10 essentiels
```

### Real Tool Execution
```
GET  /api/tools/catalog          # Catalogue complet
POST /api/tools/check/:id        # Vérifie installation
POST /api/tools/install/:id      # Installe un outil
POST /api/tools/execute/:id      # Exécute un outil
POST /api/tools/autonomous       # Investigation autonome
```

### Setup Agent
```
GET  /api/setup/status           # Statut prérequis
POST /api/setup/prerequisites    # Installe prérequis
POST /api/setup/essentials       # Installe essentiels
POST /api/setup/all              # Installe tout
GET  /api/setup/progress         # Progression installation
```

---

## 🎯 Utilisation Autonome

Exemple d'investigation complète:

```bash
# Recherche sur un username
curl -X POST http://localhost:3003/api/tools/autonomous \
  -H "Content-Type: application/json" \
  -d '{"target": "john_doe", "targetType": "username"}'

# Recherche sur un domaine
curl -X POST http://localhost:3003/api/tools/autonomous \
  -H "Content-Type: application/json" \
  -d '{"target": "example.com", "targetType": "domain"}'

# Recherche email
curl -X POST http://localhost:3003/api/tools/autonomous \
  -H "Content-Type: application/json" \
  -d '{"target": "test@example.com", "targetType": "email"}'
```

---

## 🔑 Clés API (Optionnel)

Configurer pour des résultats améliorés:

- **Shodan**: https://account.shodan.io
- **VirusTotal**: https://www.virustotal.com
- **HIBP**: https://haveibeenpwned.com
- **Censys**: https://search.censys.io

---

## 🐛 Dépannage

### Port déjà utilisé
```bash
npx kill-port 3003
npx kill-port 3001
```

### Erreur CORS
Vérifier que le backend tourne sur port 3003 et frontend sur 3001.

### Module non installé
```bash
# Vérifier statut
curl http://localhost:3003/api/setup/status

# Installer prérequis
curl -X POST http://localhost:3003/api/setup/prerequisites

# Installer essentiels
curl -X POST http://localhost:3003/api/setup/essentials
```

---

## 📞 Support

**Status API**: http://localhost:3003/health
**Documentation**: Ce fichier QUICKSTART.md

---

## ✅ Checklist

- [ ] Backend démarré sur port 3003
- [ ] Frontend démarré sur port 3001
- [ ] API répond correctement
- [ ] Modules affichés dans l'interface
- [ ] Quick Start exécuté
- [ ] Premier test de recherche réussi

**🎉 Votre OSINT Master est prêt à l'emploi!**
