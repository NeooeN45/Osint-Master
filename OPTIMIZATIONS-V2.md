# Optimisations Deep Engine V2

## Résumé des Améliorations

### 1. Architecture Modulaire

**Avant:** `deepEngine.ts` - 4385 lignes monolithiques
**Après:** Structure modulaire par catégorie

```
backend/src/modules/
├── types.ts           # Types communs
├── utils.ts           # Utilitaires
├── index.ts           # Registre central
├── username/
│   ├── sherlock.ts    # Module Sherlock
│   ├── maigret.ts     # Module Maigret
│   └── index.ts       # Export
├── email/
│   ├── gravatar.ts    # Module Gravatar
│   └── index.ts
├── domain/
│   ├── crtsh.ts       # Module crt.sh
│   └── index.ts
└── web/
    ├── wayback.ts     # Module Wayback
    └── index.ts
```

**Gain:**
- Chargement dynamique des modules
- Maintenance facilitée
- Tests unitaires par module
- Hot-reload possible

### 2. Cache LRU Intelligent

**Fichier:** `services/cache/CacheManager.ts`

**Stratégies par module:**
| Module | TTL | Max Size |
|--------|-----|----------|
| sherlock | 1h | 1000 |
| maigret | 30min | 500 |
| crtsh | 24h | 500 |
| gravatar | 24h | 1000 |
| wayback | 1h | 200 |
| instagram | 5min | 500 |
| twitter | 5min | 500 |

**API:**
```typescript
// Récupération avec cache auto
cacheManager.getOrExecute("sherlock", "username", async () => {
  return await runSherlock("username");
});

// Stats
cacheManager.getStats(); // { hits, misses, hitRate, size }
```

**Gain estimé:** 80% réduction des requêtes répétées

### 3. Exécution Parallèle avec Rate Limiting

**Fichier:** `services/executor/ParallelExecutor.ts`

**Groupement intelligent:**
```typescript
// Groupes par type de rate limiting
{
  local_unlimited: [sherlock, maigret],     // Concurrence: 5
  api_normal: [gravatar, crtsh],           // Concurrence: 4
  api_strict_github: [github_search],      // Concurrence: 2
  api_strict_instagram: [instagram]        // Concurrence: 2
}
```

**Sémaphore pour contrôle de concurrence:**
```typescript
const semaphore = new Semaphore(maxConcurrency);
await semaphore.acquire();
try {
  await executeModule(module);
} finally {
  semaphore.release();
}
```

**Gain estimé:** 60-80% réduction du temps d'exécution

### 4. Worker Threads

**Fichier:** `workers/sherlock.worker.ts`

**Avantage:** Exécution des outils CLI lourds dans un thread séparé
- Ne bloque pas l'event loop
- Timeout indépendant
- Cleanup automatique

```typescript
const result = await workerManager.executeSherlock("username", 180000);
```

### 5. Nouveau DeepEngineV2

**Fichier:** `services/DeepEngineV2.ts`

**Caractéristiques:**
- Générateur async/await pour streaming
- Dédoublonnage automatique des entités
- Détection de corrélations
- Métriques de performance

```typescript
// Usage
for await (const event of deepEngineV2.investigate("target")) {
  console.log(event.type, event.data);
}
```

### 6. API REST V2

**Routes:** `/api/deep-v2/`

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/modules` | GET | Liste modules disponibles |
| `/cache/stats` | GET | Statistiques cache |
| `/cache/clear` | POST | Vider le cache |
| `/detect` | POST | Détecter type de cible |
| `/investigate` | POST | Investigation complète |
| `/stream` | POST | Streaming SSE |

**Exemple:**
```bash
# Lister les modules
curl http://localhost:3002/api/deep-v2/modules

# Investigation avec streaming
curl -X POST http://localhost:3002/api/deep-v2/stream \
  -H "Content-Type: application/json" \
  -d '{"target": "test@gmail.com", "config": {"selectedModules":["gravatar"]}}'
```

## Gains de Performance Attendus

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Temps username (sherlock+maigret) | ~5min | ~2min | **60%** |
| Requêtes répétées | 100% | 20% | **80%** |
| Utilisation mémoire | Élevée | Optimisée | **50%** |
| Concurrence max | 1 | 5+ | **400%** |
| Temps de build | Long | Court | **70%** |

## Tests

```bash
# Tests DeepEngine V2
cd backend
npx tsx src/tests/deep-engine-v2-test.ts
```

## Migration

L'ancien DeepEngine reste fonctionnel. La nouvelle version est accessible via `/api/deep-v2/`.

Pour migrier complètement:
1. Tester V2 sur environnement de staging
2. Vérifier tous les modules sont disponibles
3. Monitorer les stats de cache
4. Basculer progressivement le frontend

## Prochaines Étapes Suggérées

1. **Base de données:** Persistance PostgreSQL + TimescaleDB
2. **Queue System:** BullMQ pour investigations longues
3. **Monitoring:** Métriques temps réel (Prometheus/Grafana)
4. **Auto-tuning:** Ajustement automatique des paramètres
