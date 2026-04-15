# OSINT Master Pro — Structure du Projet
> **Dernière mise à jour :** 2026-04-15  
> **Version :** 4.0.0  
> **Statut :** Développement actif

---

## Architecture Globale

```
OSINT-Master/
├── backend/                    # API Express + moteurs OSINT (Node.js / TypeScript)
│   └── src/
│       ├── server.ts           # Point d'entrée, montage des routes
│       ├── routes/             # 18 fichiers de routes API REST + SSE
│       ├── services/           # Moteurs OSINT, engines, scrapers
│       ├── modules/            # Modules OSINT par type (username, email, domain...)
│       ├── config/             # Catalogue modules (osint-modules.ts)
│       ├── workers/            # Workers Sherlock (threading)
│       └── tests/              # Scripts de test batch
├── src/                        # Frontend React + Vite + TailwindCSS
│   ├── app/                    # OsintApp.tsx — state global
│   ├── views/                  # GoogleQualityUI.tsx — UI principale
│   ├── components/             # Composants UI réutilisables
│   ├── store/                  # State management
│   └── types/                  # Types TypeScript frontend
├── Osintgram/                  # Outil CLI Instagram (Python)
├── FOCA/                       # Outil metadata documents
├── GitDorker/                  # Outil dorking GitHub
├── docker/                     # Docker Compose configs
└── .env.example                # (dans backend/) Toutes les clés API
```

---

## Backend — Services (cœur OSINT)

| Fichier | Rôle | Taille |
|---------|------|--------|
| `deepEngine.ts` | **MOTEUR PRINCIPAL** — 120+ modules OSINT, SSE streaming, investigation récursive | 245 KB |
| `instagramEngine.ts` | **MOTEUR INSTAGRAM ULTRA** — 12 modules dédiés IG, réseau, géo, cross-platform | ~60 KB |
| `socialDeepScan.ts` | Phase 3 — SpiderFoot, Twitter/X, Facebook, Reddit, GitHub, phone enrichment | 36 KB |
| `newModulesExtra.ts` | Phase 2 — 40+ modules username/email/phone/person | 42 KB |
| `newModules.ts` | Phase 1 — AdvancedDork, Hunter.io, modules avancés | 25 KB |
| `advancedEngine.ts` | Intelligence username/email (variantes, dorks, SearchEngines DDG/Jina/SearXNG) | 23 KB |
| `osintEngine.ts` | Moteur legacy (Sherlock, Maigret, theHarvester...) | 70 KB |
| `correlationEngine.ts` | Détection corrélations entre entités | 18 KB |
| `enrichmentEngine.ts` | Enrichissement automatique des entités trouvées | 33 KB |
| `agentOrchestrator.ts` | Orchestration IA multi-agents | 37 KB |
| `toolRegistry.ts` | Catalogue de 200+ outils OSINT définis | 52 KB |
| `DeepEngineV2.ts` | Moteur v2 refactoré (parallélisme, cache, dedup) | 11 KB |

---

## Routes API

| Route | Méthode | Description |
|-------|---------|-------------|
| `POST /api/deep/stream` | SSE | Investigation profonde streaming (moteur principal) |
| `POST /api/deep/run` | POST | Investigation complète non-streaming |
| `GET  /api/deep/modules` | GET | Liste des modules disponibles |
| `POST /api/deep-v2/stream` | SSE | Investigation v2 (parallèle) |
| `POST /api/instagram/investigate` | SSE | **NOUVEAU** Moteur Instagram complet |
| `GET  /api/instagram/profile/:username` | GET | Profil Instagram rapide |
| `POST /api/instagram/network` | POST | Analyse réseau followers/following |
| `POST /api/instagram/geofence` | POST | Carte GPS des posts |
| `POST /api/social/cross-platform` | POST | Recherche cross-plateforme |
| `POST /api/osint/scan` | POST | Scan OSINT legacy |
| `GET  /api/tools` | GET | Liste outils installés |
| `POST /api/ai/chat` | POST | Chat Ollama AI |

---

## Modules OSINT — Vue d'ensemble par catégorie

### Username (15+ modules)
- Sherlock (CLI/Docker), Maigret (CLI/Docker), WhatsMyName, SocialScan, Holehe
- UserSearch.org, CheckUsernames, Namechk, IntlSocialCheck
- Twitter/X, Instagram, TikTok, Reddit, GitHub, Twitch, Spotify, Discord, Snapchat

### Email (12+ modules)
- Holehe, Hunter.io, EmailRep, Epieos, HIBP, BreachDirectory
- LeakCheck, Dehashed, Abstract Email, H8mail, theHarvester

### Phone (8+ modules)
- PhoneInfoga, NumLookup, NumVerify, Carrier Lookup, Veriphone
- Truecaller, GetContact, Annuaires FR Pro

### Instagram (12 modules dédiés — `instagramEngine.ts`)
- Profil multi-endpoint (7 fallbacks), instaloader, osintgram
- Contact info (password reset trick), Network analysis, Geofencing
- Story/Highlight scrape, Hashtag OSINT, Cross-platform, Alt accounts
- Business Intel, HikerAPI RapidAPI

### Social (20+ modules)
- Facebook, LinkedIn (deep + RapidAPI + Proxycurl), YouTube
- Reddit (deep), Telegram, TikTok, Twitch, Spotify, Skype
- Paste Search (psbdmp + IntelX + LeakCheck)

### Domain/IP (15+ modules)
- Shodan, AbuseIPDB, DNSx, Subfinder, HTTPX, HackerTarget, Whois
- URLScan, Wayback Machine, IPInfo, Certificate Transparency, Nmap

### Search/Dork (8+ modules)
- Advanced Dork (DDG IA + Jina.ai + SearXNG), Web Dork, Google Dork
- SpiderFoot, Recon-ng, Metagoofil, Brave Search, Bing Search

### Credentials/Breach (5+ modules)
- HIBP, BreachDirectory, LeakCheck, Dehashed, H8mail

---

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js 20 + Express + TypeScript + tsx (dev) |
| Frontend | React 18 + Vite + TailwindCSS + Lucide icons |
| Streaming | Server-Sent Events (SSE) |
| AI local | Ollama (Mistral/LLaMA) |
| CLI tools | Python (holehe, socialscan, instaloader, twscrape, spiderfoot) |
| CLI tools | Go (subfinder, httpx, dnsx) |
| CLI tools | Node (sherlock via Docker) |
| Cache | In-memory + TTL |
| DB | Pas de DB persistante (in-memory, reports/) |

---

## Variables d'environnement (backend/.env.example)

Voir `backend/.env.example` — 30+ variables documentées.  
Clés critiques :
- `RAPIDAPI_KEY` — débloque 15+ modules RapidAPI
- `HIBP_API_KEY` — breach detection
- `SHODAN_API_KEY` — infrastructure scan
- `GITHUB_TOKEN` — commit email harvest (sans scope)
- `PROXYCURL_KEY` — LinkedIn deep scrape

---

## Problèmes Connus / Dette Technique

- [ ] `socialMedia.ts` routes — retournent 503 "not configured" (stub vide → à connecter à `instagramEngine.ts`)
- [ ] Double registre `deepInvestigationV2Router` monté 2x dans `server.ts` (lignes 38 et 79)
- [ ] `deepEngineV2.init()` initialise les mêmes modules que `deepEngine.init()` — risque doublon
- [ ] Pas de base de données persistante — les investigations ne sont pas sauvegardées
- [ ] `Osintgram/` nécessite un compte Instagram configuré (`credentials.ini`)
- [ ] Timeout TOOL_TIMEOUT par défaut = 20s pour modules non classés (trop court)
