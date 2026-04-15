// ============================================================================
// CACHE MANAGER - LRU + Redis hybride
// ============================================================================

import { LRUCache } from "lru-cache";

interface CacheConfig {
  ttl: number;        // Durée de vie en secondes
  maxSize?: number;   // Taille max LRU
}

interface CacheStrategy extends CacheConfig {
  key: string;                    // Pattern: "sherlock:{username}"
  invalidateOn?: string[];        // Patterns à invalider
}

const DEFAULT_STRATEGIES: Record<string, CacheStrategy> = {
  sherlock: { ttl: 3600, maxSize: 1000, key: "sherlock:{target}" },
  maigret: { ttl: 1800, maxSize: 500, key: "maigret:{target}" },
  crtsh: { ttl: 86400, maxSize: 500, key: "crtsh:{target}" },
  gravatar: { ttl: 86400, maxSize: 1000, key: "gravatar:{target}" },
  wayback: { ttl: 3600, maxSize: 200, key: "wayback:{target}" },
  instagram_public: { ttl: 300, maxSize: 500, key: "ig_public:{target}" },
  twitter_public: { ttl: 300, maxSize: 500, key: "twitter:{target}" },
  reddit_public: { ttl: 600, maxSize: 500, key: "reddit:{target}" },
  github_search: { ttl: 3600, maxSize: 500, key: "github:{target}" },
};

class CacheManager {
  private caches = new Map<string, LRUCache<string, any>>();
  private strategies: Record<string, CacheStrategy>;
  private hitCounter = new Map<string, number>();
  private missCounter = new Map<string, number>();

  constructor(strategies: Record<string, CacheStrategy> = DEFAULT_STRATEGIES) {
    this.strategies = strategies;
    this.initCaches();
  }

  private initCaches() {
    for (const [name, strategy] of Object.entries(this.strategies)) {
      this.caches.set(name, new LRUCache({
        max: strategy.maxSize || 1000,
        ttl: strategy.ttl * 1000,
        updateAgeOnGet: true,
        updateAgeOnHas: true,
      }));
      this.hitCounter.set(name, 0);
      this.missCounter.set(name, 0);
    }
  }

  generateKey(pattern: string, params: Record<string, string>): string {
    return pattern.replace(/\{(\w+)\}/g, (_, key) => params[key] || "");
  }

  async get<T>(moduleId: string, target: string): Promise<T | null> {
    const strategy = this.strategies[moduleId];
    if (!strategy) return null;

    const key = this.generateKey(strategy.key, { target });
    const cache = this.caches.get(moduleId);
    if (!cache) return null;

    const value = cache.get(key);
    if (value !== undefined) {
      this.hitCounter.set(moduleId, (this.hitCounter.get(moduleId) || 0) + 1);
      return value as T;
    }

    this.missCounter.set(moduleId, (this.missCounter.get(moduleId) || 0) + 1);
    return null;
  }

  async set<T>(moduleId: string, target: string, value: T): Promise<void> {
    const strategy = this.strategies[moduleId];
    if (!strategy) return;

    const key = this.generateKey(strategy.key, { target });
    const cache = this.caches.get(moduleId);
    if (cache) {
      cache.set(key, value, { ttl: strategy.ttl * 1000 });
    }
  }

  async getOrExecute<T>(
    moduleId: string,
    target: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Essayer le cache d'abord
    const cached = await this.get<T>(moduleId, target);
    if (cached !== null) {
      return cached;
    }

    // Exécuter et stocker
    const result = await fn();
    await this.set(moduleId, target, result);
    return result;
  }

  invalidate(moduleId: string, target: string): void {
    const strategy = this.strategies[moduleId];
    if (!strategy) return;

    const key = this.generateKey(strategy.key, { target });
    const cache = this.caches.get(moduleId);
    if (cache) {
      cache.delete(key);
    }
  }

  invalidatePattern(pattern: string): void {
    for (const [name, cache] of this.caches) {
      for (const key of cache.keys()) {
        if (key.includes(pattern)) {
          cache.delete(key);
        }
      }
    }
  }

  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  getStats(): Record<string, { hits: number; misses: number; hitRate: number; size: number }> {
    const stats: Record<string, any> = {};
    for (const [name, cache] of this.caches) {
      const hits = this.hitCounter.get(name) || 0;
      const misses = this.missCounter.get(name) || 0;
      const total = hits + misses;
      stats[name] = {
        hits,
        misses,
        hitRate: total > 0 ? (hits / total) : 0,
        size: cache.size
      };
    }
    return stats;
  }

  resetStats(): void {
    for (const name of this.hitCounter.keys()) {
      this.hitCounter.set(name, 0);
      this.missCounter.set(name, 0);
    }
  }
}

// Singleton
export const cacheManager = new CacheManager();
export { CacheManager, CacheStrategy };
