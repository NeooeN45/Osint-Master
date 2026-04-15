# OSINT Master Pro v4

> Plateforme professionnelle d'intelligence OSINT avec IA (Ollama)

## 🚀 Démarrage Rapide

```bash
# 1. Installation
cd backend && npm install
cd .. && npm install

# 2. Démarrage
./start.bat
# ou manuellement:
# Terminal 1: cd backend && npx tsx src/server.ts
# Terminal 2: npm run dev
```

**Ports:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3002

## ✨ Fonctionnalités

### Investigation
- **35+ modules OSINT** (Sherlock, Maigret, Instagram, crt.sh, etc.)
- **Streaming temps réel** (SSE) pour les résultats
- **Cache intelligent** (80% réduction des requêtes répétées)
- **Exécution parallèle** (60-80% plus rapide)

### Types de Cibles Supportés
- 🔍 Username
- 📧 Email
- 🌐 Domaine
- 📍 IP
- 🔗 URL
- 📱 Téléphone

### API Endpoints

```
GET  /api/deep-v2/modules           # Liste des modules
GET  /api/deep-v2/cache/stats       # Stats cache
POST /api/deep-v2/investigate       # Investigation complète
POST /api/deep-v2/stream            # Streaming SSE
POST /api/deep-v2/detect            # Détecter type cible
```

## 🏗️ Architecture

```
backend/src/
├── modules/              # Modules OSINT modulaires
│   ├── username/         # Sherlock, Maigret
│   ├── email/            # Gravatar
│   ├── domain/           # crt.sh
│   └── web/              # Wayback
├── services/
│   ├── DeepEngineV2.ts   # Moteur principal
│   ├── cache/
│   │   └── CacheManager.ts   # Cache LRU
│   └── executor/
│       └── ParallelExecutor.ts # Concurrence
└── workers/              # Worker Threads
```

## ⚡ Optimisations V2

| Optimisation | Gain |
|--------------|------|
| Cache LRU | 80% requêtes en moins |
| Parallélisation | 60-80% plus rapide |
| Modularisation | Build 70% plus rapide |
| Worker Threads | UX fluide |

## 🔧 Configuration

### API Keys
Interface web: **Bouton Settings (SlidersHorizontal)** en haut à droite

Ou manuellement via `.env`:
```env
SHODAN_API_KEY=
HIBP_API_KEY=
VIRUSTOTAL_API_KEY=
GITHUB_TOKEN=
```

## 🧪 Tests

```bash
# Tests DeepEngine V2
cd backend && npx tsx src/tests/deep-engine-v2-test.ts

# Test streaming
curl -X POST http://localhost:3002/api/deep-v2/stream \
  -H "Content-Type: application/json" \
  -d '{"target": "test@gmail.com", "config": {"selectedModules":["gravatar"]}}'
```

## 📁 Structure du Projet

```
OSINT-Master/
├── backend/              # API Express
│   ├── src/
│   │   ├── modules/      # Modules OSINT
│   │   ├── services/     # Services métier
│   │   ├── routes/       # Routes API
│   │   └── workers/      # Workers threads
├── src/                  # Frontend React
│   ├── views/            # Vues principales
│   └── components/       
├── FOCA/                 # Outil externe (optionnel)
├── Osintgram/            # Outil externe (optionnel)
└── GitDorker/            # Outil externe (optionnel)
```

## 🛠️ Stack Technique

**Backend:**
- Node.js 18+ / TypeScript
- Express + GraphQL
- LRU-Cache
- Worker Threads
- Axios + Puppeteer

**Frontend:**
- React 19 + Vite
- TypeScript
- Tailwind CSS
- Zustand (state)
- Motion (animations)
- Lucide (icons)

## 📚 Documentation

- [OPTIMIZATIONS-V2.md](OPTIMIZATIONS-V2.md) - Détails des optimisations
- [CONFIGURE-API-KEYS.md](CONFIGURE-API-KEYS.md) - Configuration des clés API
- [STREAMING-FEATURES.md](STREAMING-FEATURES.md) - Documentation streaming

## 📝 License

Propriétaire - OSINT Master Pro

---

**Version:** 4.0.0  
**Dernière mise à jour:** Avril 2026
