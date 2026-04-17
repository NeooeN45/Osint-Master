/**
 * Cache Service - Redis-based Caching
 * Service de cache pour optimiser les performances
 * 
 * Features:
 * - Cache des résultats d'outils OSINT
 * - TTL configurable par type de donnée
 * - Cache intelligent avec invalidation
 * - Fallback en mémoire si Redis indisponible
 * - Métriques de hit/miss
 * 
 * Créé: 17 Avril 2026
 */

import { createClient, RedisClientType } from 'redis';
import { EventEmitter } from 'events';

// Types
interface CacheEntry<T> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  tags: string[];
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsed: number;
  oldestEntry?: Date;
}

interface CacheConfig {
  defaultTTL: number;
  maxEntries: number;
  checkInterval: number;
  compression: boolean;
}

export class CacheService extends EventEmitter {
  private redis: RedisClientType | null = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memoryUsed: 0,
  };
  private config: CacheConfig;
  private cleanupInterval?: NodeJS.Timeout;
  private redisConnected = false;

  constructor(config?: Partial<CacheConfig>) {
    super();
    this.config = {
      defaultTTL: 3600, // 1 heure
      maxEntries: 10000,
      checkInterval: 60000, // 1 minute
      compression: true,
      ...config,
    };

    this.initRedis();
    this.startCleanup();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // REDIS INITIALIZATION
  // ═════════════════════════════════════════════════════════════════════════════

  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.redis = createClient({
        url: redisUrl,
      });

      this.redis.on('error', (err: Error) => {
        console.warn('[CacheService] Redis error:', err.message);
        this.redisConnected = false;
      });

      this.redis.on('connect', () => {
        console.log('[CacheService] Redis connected');
        this.redisConnected = true;
      });

      await this.redis.connect();
    } catch (error) {
      console.warn('[CacheService] Redis unavailable, using memory cache only');
      this.redis = null;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CACHE OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Obtenir une valeur du cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Essayer Redis d'abord
      if (this.redis && this.redisConnected) {
        const value = await this.redis.get(key);
        if (value) {
          this.stats.hits++;
          this.updateHitRate();
          this.emit('cache:hit', { key, source: 'redis' });
          return JSON.parse(value);
        }
      }

      // Fallback vers mémoire
      const entry = this.memoryCache.get(key);
      if (entry && !this.isExpired(entry)) {
        entry.hits++;
        this.stats.hits++;
        this.updateHitRate();
        this.emit('cache:hit', { key, source: 'memory' });
        return entry.value;
      }

      // Supprimer si expiré
      if (entry && this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }

      this.stats.misses++;
      this.updateHitRate();
      this.emit('cache:miss', { key });
      return null;
    } catch (error) {
      console.error('[CacheService] Get error:', error);
      return null;
    }
  }

  /**
   * Stocker une valeur dans le cache
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
    tags: string[] = []
  ): Promise<boolean> {
    const finalTTL = ttl || this.config.defaultTTL;

    try {
      // Stocker dans Redis si disponible
      if (this.redis && this.redisConnected) {
        await this.redis.setEx(key, finalTTL, JSON.stringify(value));
      }

      // Toujours stocker en mémoire (fallback)
      const entry: CacheEntry<T> = {
        key,
        value,
        ttl: finalTTL,
        createdAt: new Date(),
        tags,
        hits: 0,
      };

      this.memoryCache.set(key, entry);

      // Vérifier la taille maximale
      if (this.memoryCache.size > this.config.maxEntries) {
        this.evictLRU();
      }

      this.emit('cache:set', { key, ttl: finalTTL, tags });
      return true;
    } catch (error) {
      console.error('[CacheService] Set error:', error);
      return false;
    }
  }

  /**
   * Vérifier si une clé existe
   */
  async has(key: string): Promise<boolean> {
    if (this.redis && this.redisConnected) {
      const exists = await this.redis.exists(key);
      return exists === 1;
    }

    const entry = this.memoryCache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Supprimer une clé
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (this.redis && this.redisConnected) {
        await this.redis.del(key);
      }

      this.memoryCache.delete(key);
      this.emit('cache:delete', { key });
      return true;
    } catch (error) {
      console.error('[CacheService] Delete error:', error);
      return false;
    }
  }

  /**
   * Supprimer par tag
   */
  async deleteByTag(tag: string): Promise<number> {
    let count = 0;

    // Supprimer de la mémoire
    for (const [key, entry] of this.memoryCache) {
      if (entry.tags.includes(tag)) {
        this.memoryCache.delete(key);
        count++;

        // Supprimer de Redis aussi
        if (this.redis && this.redisConnected) {
          await this.redis.del(key);
        }
      }
    }

    this.emit('cache:tag:deleted', { tag, count });
    return count;
  }

  /**
   * Vider tout le cache
   */
  async clear(): Promise<boolean> {
    try {
      if (this.redis && this.redisConnected) {
        await this.redis.flushDb();
      }

      this.memoryCache.clear();
      this.resetStats();

      this.emit('cache:clear');
      return true;
    } catch (error) {
      console.error('[CacheService] Clear error:', error);
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CACHE STRATEGIES
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Cache avec fonction de fetch (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
    tags: string[] = []
  ): Promise<T> {
    // Essayer le cache d'abord
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch et stocker
    const value = await fetchFn();
    await this.set(key, value, ttl, tags);

    return value;
  }

  /**
   * Cache avec stale-while-revalidate
   */
  async staleWhileRevalidate<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600,
    staleTtl: number = 86400 // 24h
  ): Promise<T> {
    const entry = this.memoryCache.get(key);

    // Si pas de cache, fetch et retourner
    if (!entry || this.isExpired(entry, staleTtl)) {
      const value = await fetchFn();
      await this.set(key, value, ttl);
      return value;
    }

    // Cache valide, retourner immédiatement
    // Mais revalider en arrière-plan si stale
    if (this.isExpired(entry)) {
      // Revalider en arrière-plan
      fetchFn()
        .then(value => this.set(key, value, ttl))
        .catch(err => console.error('[CacheService] Background revalidate failed:', err));
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // OSINT SPECIFIC
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Cache pour résultats d'outils OSINT
   */
  async cacheToolResult(
    tool: string,
    target: string,
    result: any,
    executionTime: number
  ): Promise<void> {
    const key = `tool:${tool}:${Buffer.from(target).toString('base64')}`;
    
    // TTL adaptatif basé sur le type d'outil
    let ttl = 3600; // 1h par défaut
    
    // Données qui changent peu souvent = cache plus long
    if (['sherlock', 'holehe', 'whatsmyname'].includes(tool)) {
      ttl = 86400; // 24h
    }
    
    // Données en temps réel = cache court
    if (['recon-ng', 'theHarvester'].includes(tool)) {
      ttl = 600; // 10min
    }

    await this.set(key, {
      tool,
      target,
      result,
      executionTime,
      cachedAt: new Date().toISOString(),
    }, ttl, ['tool', tool]);
  }

  /**
   * Récupérer un résultat d'outil depuis le cache
   */
  async getToolResult(tool: string, target: string): Promise<any | null> {
    const key = `tool:${tool}:${Buffer.from(target).toString('base64')}`;
    return await this.get(key);
  }

  /**
   * Invalider le cache d'un outil
   */
  async invalidateTool(tool: string): Promise<number> {
    return await this.deleteByTag(tool);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MAINTENANCE
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Vérifier si une entrée est expirée
   */
  private isExpired(entry: CacheEntry<any>, customTTL?: number): boolean {
    const ttl = customTTL || entry.ttl;
    const age = (Date.now() - entry.createdAt.getTime()) / 1000;
    return age > ttl;
  }

  /**
   * Éviction LRU (Least Recently Used)
   */
  private evictLRU(): void {
    let oldest: CacheEntry<any> | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.memoryCache) {
      if (!oldest || entry.hits < oldest.hits || 
          (entry.hits === oldest.hits && entry.createdAt < oldest.createdAt)) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.emit('cache:evicted', { key: oldestKey, reason: 'lru' });
    }
  }

  /**
   * Nettoyage périodique
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.checkInterval);
  }

  /**
   * Nettoyer les entrées expirées
   */
  private cleanup(): void {
    const before = this.memoryCache.size;
    
    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    const after = this.memoryCache.size;
    if (before !== after) {
      console.log(`[CacheService] Cleaned up ${before - after} expired entries`);
    }

    this.updateStats();
  }

  /**
   * Mettre à jour les statistiques
   */
  private updateStats(): void {
    this.stats.size = this.memoryCache.size;
    
    // Estimer la mémoire utilisée
    let memoryUsed = 0;
    for (const entry of this.memoryCache.values()) {
      memoryUsed += JSON.stringify(entry).length * 2; // Approximation
    }
    this.stats.memoryUsed = memoryUsed;

    // Trouver l'entrée la plus ancienne
    let oldest: Date | undefined;
    for (const entry of this.memoryCache.values()) {
      if (!oldest || entry.createdAt < oldest) {
        oldest = entry.createdAt;
      }
    }
    this.stats.oldestEntry = oldest;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STATS & INFO
  // ═════════════════════════════════════════════════════════════════════════════

  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  getInfo() {
    return {
      redis: {
        connected: this.redisConnected,
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      memory: {
        entries: this.memoryCache.size,
        maxEntries: this.config.maxEntries,
        memoryUsed: this.stats.memoryUsed,
      },
      config: this.config,
      stats: this.getStats(),
    };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsed: 0,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═════════════════════════════════════════════════════════════════════════════

  async dispose(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redis) {
      await this.redis.quit();
    }

    this.memoryCache.clear();
    this.removeAllListeners();
  }
}

// Singleton
let cacheService: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheService) {
    cacheService = new CacheService();
  }
  return cacheService;
}

export function resetCacheService(): void {
  if (cacheService) {
    cacheService.dispose().catch(console.error);
    cacheService = null;
  }
}

export default CacheService;
