# OSINT Master Pro — Objectifs & Roadmap
> **Dernière mise à jour :** 2026-04-15  
> **Modèles IA : relire ce fichier à chaque session et le mettre à jour après chaque action significative.**

---

## Objectif Principal

Construire un moteur OSINT professionnel complet, autonome et streamé capable de :
1. Prendre n'importe quelle cible (username, email, téléphone, domaine, IP, nom)
2. Lancer automatiquement tous les modules pertinents en parallèle
3. Streamer les résultats en temps réel via SSE vers le frontend
4. Corréler les entités trouvées (email → username → profil → téléphone...)
5. Alimenter une IA locale (Ollama) pour analyse et rapport final

---

## Phases Complétées ✅

### Phase 1 — Modules avancés de base (complété)
- [x] AdvancedDork (DDG IA + Jina.ai + SearXNG, timeout 60s)
- [x] Hunter.io, EmailRep, Epieos intégrés
- [x] Fix holehe SSL (PYTHONHTTPSVERIFY=0)
- [x] Fix SearchEngines.duckduckgo (scraping → API JSON)
- [x] Timeouts SLOW/MEDIUM/FAST catégorisés

### Phase 2 — Username / Email / Phone / Person (complété)
- [x] `newModulesExtra.ts` — 40+ nouveaux modules
- [x] WhatsMyName, SocialScan, UserSearch.org, CheckUsernames
- [x] Holehe (email→social), HIBP, LeakCheck, BreachDirectory
- [x] PhoneInfoga, NumLookup, Truecaller, GetContact, Annuaires FR
- [x] PeopleFinder, Wikidata, LinkedIn public, Name→Username

### Phase 3 — Social Deep Scan (complété)
- [x] `socialDeepScan.ts` — 11 modules
- [x] `extractPatterns()` — moteur détection email/phone/url/@mention dans tout texte
- [x] SpiderFoot (CLI + HTTP API :5001)
- [x] Twitter/X deep (fxtwitter + CDN syndication)
- [x] Facebook OSINT (og:tags + people search)
- [x] Reddit deep (posts, comments, subreddits, location patterns)
- [x] GitHub deep (profil, commit email harvest, orgs, gists)
- [x] Instagram deep (bio, business_email/phone, GPS posts, hashtags)
- [x] YouTube deep (channelId, description, subscribers, country)
- [x] LinkedIn deep (Bing scrape + Proxycurl optionnel)
- [x] Phone enrichment (Truecaller + GetContact)
- [x] Recon-ng + Metagoofil
- [x] `twscrape` Python installé
- [x] `backend/.env.example` complet (30+ variables)

### Phase 4 — Moteur Instagram Ultra (complété ✅ — 2026-04-15)
- [x] `instagramEngine.ts` — 12 modules + orchestrateur AsyncGenerator SSE (~700 lignes)
- [x] Route `/api/instagram/investigate` — SSE streaming complet
- [x] Route `/api/instagram/profile/:u` — profil rapide JSON
- [x] Route `/api/instagram/network` — analyse réseau
- [x] Route `/api/instagram/geofence` — carte GPS
- [x] Route `/api/instagram/cross-platform` — 20 plateformes
- [x] Module `ig_profile`: 7 endpoints cascade (API v1, graphql, HTML, picuki, imginn, storiesig)
- [x] Module `ig_contact`: password reset trick → email/phone masqués
- [x] Module `ig_network`: followers/following bulk (50 chacun) + mutuals
- [x] Module `ig_geofence`: GPS posts, patterns horaires, timezone inference
- [x] Module `ig_stories`: storiesig.app + highlights + insta-stories.to
- [x] Module `ig_hashtag`: hashtags utilisés + comptes liés (top 3)
- [x] Module `ig_tagged`: posts tagués + top taggers + mentions picuki
- [x] Module `ig_cross_platform`: 20 plateformes en parallèle (batch 5)
- [x] Module `ig_alt_accounts`: variantes username + Google fullname + reverse image Bing
- [x] Module `ig_instaloader`: CLI deep metadata
- [x] Module `ig_osintgram`: emails/phones réseau (addrs, fwersemail, fwersnumber)
- [x] Module `ig_hikerapi`: 3 hosts RapidAPI (scraper API2, looter2, bulk scrapper)
- [x] Connexion `socialMedia.ts` stub 503 → vrais appels `instagramEngine`
- [x] Fix doublon `deepInvestigationV2Router` dans `server.ts`
- [x] 12 modules ajoutés dans `deepEngine.ts` MODULES[] + MEDIUM_CLI timeouts
- [x] Commit Git structuré `feat(instagram): ...`

---

## Phase 5 — Qualité & Fixes (À FAIRE)

- [ ] Persistence résultats (SQLite ou fichier JSON par investigation)
- [ ] `Osintgram/credentials.ini` — documenter la configuration
- [ ] Tests unitaires pour modules critiques
- [ ] Rate limiting / protection anti-ban (rotation User-Agent, délais)

## Phase 6 — Outils Supplémentaires (À FAIRE)

- [ ] Maltego CE integration (XML transforms)
- [ ] Censys.io (domaines/IPs)
- [ ] VirusTotal (URLs/domaines malveillants)
- [ ] Shodan full (avec clé)
- [ ] Face recognition via URL (PimEyes-like via Bing Visual Search)
- [ ] EXIF metadata extraction (images uploadées)
- [ ] Geolocation par photo (horizon analysis)
- [ ] Darkweb search (Ahmia, Torch)

---

## Règles de Développement

1. **Tout nouveau module** doit être ajouté à `deepEngine.ts` MODULES[] ET aux timeouts MEDIUM_CLI/FAST_CLI
2. **Tout nouveau service** doit avoir sa route dans `server.ts`
3. **Toute clé API** doit être documentée dans `backend/.env.example`
4. **Tout fix** doit être committé avec message structuré : `fix(module): description`
5. **Ce fichier** doit être mis à jour après chaque phase complétée
6. **PROJECT_STRUCTURE.md** doit refléter la réalité du code

---

## Commits Git — Convention

```
feat(instagram): moteur ultra Instagram 12 modules
fix(deepEngine): timeout advanced_dork 20s→60s
feat(phase3): social deep scan SpiderFoot+Twitter+GitHub
fix(holehe): bypass SSL via PYTHONHTTPSVERIFY=0
docs(project): objectifs et structure projet
```

---

## Métriques Actuelles

| Indicateur | Valeur |
|------------|--------|
| Modules OSINT total | ~150+ |
| Modules Instagram dédiés | 6 existants + 12 nouveaux |
| Fichiers services | 23 |
| Routes API | 18 |
| Outils CLI supportés | 20+ |
| Variables .env | 30+ |
| Taille deepEngine.ts | 245 KB (~4400 lignes) |
