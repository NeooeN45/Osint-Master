/**
 * Proxy Rotator - Phase 1 OPSEC Foundation
 * Gestion d'un pool de proxies avec rotation automatique
 * 
 * Fonctionnalités:
 * - Pool de proxies SOCKS5/HTTP/HTTPS
 * - Rotation automatique (round-robin, random, least-used)
 * - Vérification de santé des proxies
 * - Fallback sur Tor si tous les proxies échouent
 * 
 * Créé: 17 Avril 2026 - Phase 1 OPSEC
 * Fichier: backend/src/services/opsec/proxyRotator.ts
 */

import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import axios from 'axios';
import { getTorProxyAgent } from './torManager';

// Types
export interface Proxy {
  id: string;
  host: string;
  port: number;
  protocol: 'socks5' | 'socks4' | 'http' | 'https';
  username?: string;
  password?: string;
  country?: string;
  provider?: string;
  isActive: boolean;
  failCount: number;
  lastUsed?: Date;
  lastChecked?: Date;
  latency?: number;  // ms
  successRate: number;  // 0-100
}

export interface ProxyPool {
  proxies: Proxy[];
  rotationMode: 'round-robin' | 'random' | 'least-used' | 'smart';
  currentIndex: number;
  checkInterval: number;  // ms
  maxFails: number;
  useTorFallback: boolean;
}

export interface ProxyStats {
  total: number;
  active: number;
  failed: number;
  averageLatency: number;
  currentProxy?: Proxy;
}

// Configuration par défaut
const DEFAULT_POOL: ProxyPool = {
  proxies: [],
  rotationMode: 'smart',
  currentIndex: 0,
  checkInterval: 60000,  // 1 minute
  maxFails: 3,
  useTorFallback: true,
};

// État global
let proxyPool: ProxyPool = { ...DEFAULT_POOL };
let healthCheckInterval: NodeJS.Timeout | null = null;
let currentProxy: Proxy | null = null;

/**
 * Initialiser le pool de proxies
 */
export function initProxyPool(proxies: Omit<Proxy, 'id' | 'isActive' | 'failCount' | 'successRate'>[]): void {
  proxyPool.proxies = proxies.map((p, index) => ({
    ...p,
    id: `proxy-${index}`,
    isActive: true,
    failCount: 0,
    successRate: 100,
  }));
  
  proxyPool.currentIndex = 0;
  console.log(`[ProxyRotator] Initialized with ${proxies.length} proxies`);
  
  // Démarrer les health checks
  startHealthChecks();
}

/**
 * Ajouter des proxies publics gratuits (pour tests)
 * Note: Ces proxies sont lents et peu fiables, usage limité
 */
export function addPublicProxies(): void {
  const publicProxies: Omit<Proxy, 'id' | 'isActive' | 'failCount' | 'successRate'>[] = [
    // Liste de proxies publics connus (à vérifier régulièrement)
    { host: '194.126.14.223', port: 1080, protocol: 'socks5', country: 'FR' },
    { host: '192.99.169.29', port: 1080, protocol: 'socks5', country: 'CA' },
    { host: '51.75.126.51', port: 1080, protocol: 'socks5', country: 'DE' },
    { host: '185.220.101.46', port: 1080, protocol: 'socks5', country: 'NL' },
  ];
  
  // Fusionner avec le pool existant
  const existingHosts = new Set(proxyPool.proxies.map(p => `${p.host}:${p.port}`));
  
  publicProxies.forEach(p => {
    const key = `${p.host}:${p.port}`;
    if (!existingHosts.has(key)) {
      proxyPool.proxies.push({
        ...p,
        id: `public-${proxyPool.proxies.length}`,
        isActive: true,
        failCount: 0,
        successRate: 100,
        provider: 'public',
      });
    }
  });
  
  console.log(`[ProxyRotator] Added ${publicProxies.length} public proxies`);
}

/**
 * Obtenir le proxy suivant selon le mode de rotation
 */
export function getNextProxy(): Proxy | null {
  const activeProxies = proxyPool.proxies.filter(p => p.isActive);
  
  if (activeProxies.length === 0) {
    console.log('[ProxyRotator] No active proxies available');
    return null;
  }
  
  switch (proxyPool.rotationMode) {
    case 'round-robin':
      return getRoundRobinProxy(activeProxies);
      
    case 'random':
      return getRandomProxy(activeProxies);
      
    case 'least-used':
      return getLeastUsedProxy(activeProxies);
      
    case 'smart':
      return getSmartProxy(activeProxies);
      
    default:
      return getRoundRobinProxy(activeProxies);
  }
}

/**
 * Rotation Round-Robin
 */
function getRoundRobinProxy(activeProxies: Proxy[]): Proxy {
  const proxy = activeProxies[proxyPool.currentIndex % activeProxies.length];
  proxyPool.currentIndex = (proxyPool.currentIndex + 1) % activeProxies.length;
  
  currentProxy = proxy;
  proxy.lastUsed = new Date();
  
  return proxy;
}

/**
 * Rotation aléatoire
 */
function getRandomProxy(activeProxies: Proxy[]): Proxy {
  const randomIndex = Math.floor(Math.random() * activeProxies.length);
  const proxy = activeProxies[randomIndex];
  
  currentProxy = proxy;
  proxy.lastUsed = new Date();
  
  return proxy;
}

/**
 * Proxy le moins utilisé
 */
function getLeastUsedProxy(activeProxies: Proxy[]): Proxy {
  const sorted = [...activeProxies].sort((a, b) => {
    const aTime = a.lastUsed?.getTime() || 0;
    const bTime = b.lastUsed?.getTime() || 0;
    return aTime - bTime;
  });
  
  const proxy = sorted[0];
  currentProxy = proxy;
  proxy.lastUsed = new Date();
  
  return proxy;
}

/**
 * Rotation "Smart" - basée sur les stats
 * Privilégie les proxies avec meilleur success rate et latence
 */
function getSmartProxy(activeProxies: Proxy[]): Proxy {
  // Calculer un score pour chaque proxy
  const scored = activeProxies.map(p => {
    const successWeight = p.successRate * 2;
    const latencyWeight = p.latency ? Math.max(0, 1000 - p.latency) / 10 : 50;
    const failPenalty = p.failCount * 20;
    
    return {
      proxy: p,
      score: successWeight + latencyWeight - failPenalty,
    };
  });
  
  // Trier par score décroissant et prendre un des meilleurs (avec un peu de random)
  scored.sort((a, b) => b.score - a.score);
  
  // Sélectionner parmi les 3 meilleurs
  const topCount = Math.min(3, scored.length);
  const selected = scored[Math.floor(Math.random() * topCount)];
  
  const proxy = selected.proxy;
  currentProxy = proxy;
  proxy.lastUsed = new Date();
  
  return proxy;
}

/**
 * Obtenir l'agent proxy pour axios
 */
export function getProxyAgent(proxy: Proxy): SocksProxyAgent | HttpsProxyAgent<string> {
  if (proxy.protocol === 'socks5' || proxy.protocol === 'socks4') {
    const auth = proxy.username 
      ? `${proxy.username}:${proxy.password}@` 
      : '';
    const proxyUrl = `socks5://${auth}${proxy.host}:${proxy.port}`;
    return new SocksProxyAgent(proxyUrl);
  } else {
    const auth = proxy.username 
      ? `${proxy.username}:${proxy.password}@` 
      : '';
    const protocol = proxy.protocol === 'https' ? 'https' : 'http';
    const proxyUrl = `${protocol}://${auth}${proxy.host}:${proxy.port}`;
    return new HttpsProxyAgent(proxyUrl);
  }
}

/**
 * Vérifier la santé d'un proxy
 */
export async function checkProxyHealth(proxy: Proxy): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const agent = getProxyAgent(proxy);
    
    // Tester avec ipapi.co (léger et rapide)
    const response = await axios.get('https://ipapi.co/json/', {
      httpsAgent: agent as any,
      timeout: 10000,
    } as any);
    
    const latency = Date.now() - startTime;
    
    if (response.status === 200 && response.data && (response.data as any).ip) {
      // Mettre à jour les infos du proxy
      proxy.country = (response.data as any).country_code;
      proxy.latency = latency;
      proxy.lastChecked = new Date();
      
      return { healthy: true, latency };
    }
    
    return { healthy: false, latency, error: 'Invalid response' };
    
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return { 
      healthy: false, 
      latency, 
      error: error.message 
    };
  }
}

/**
 * Vérifier tous les proxies
 */
export async function checkAllProxies(): Promise<void> {
  console.log('[ProxyRotator] Checking all proxies...');
  
  const checks = proxyPool.proxies.map(async (proxy) => {
    const result = await checkProxyHealth(proxy);
    
    if (result.healthy) {
      proxy.isActive = true;
      proxy.failCount = Math.max(0, proxy.failCount - 1);
      proxy.successRate = Math.min(100, proxy.successRate + 5);
    } else {
      proxy.failCount++;
      proxy.successRate = Math.max(0, proxy.successRate - 10);
      
      if (proxy.failCount >= proxyPool.maxFails) {
        proxy.isActive = false;
        console.log(`[ProxyRotator] Proxy ${proxy.id} deactivated (too many failures)`);
      }
    }
  });
  
  await Promise.all(checks);
  
  const active = proxyPool.proxies.filter(p => p.isActive).length;
  console.log(`[ProxyRotator] Health check complete: ${active}/${proxyPool.proxies.length} active`);
}

/**
 * Démarrer les vérifications automatiques
 */
function startHealthChecks(): void {
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  
  healthCheckInterval = setInterval(() => {
    checkAllProxies();
  }, proxyPool.checkInterval);
}

/**
 * Arrêter les vérifications
 */
export function stopHealthChecks(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

/**
 * Obtenir les statistiques du pool
 */
export function getProxyStats(): ProxyStats {
  const active = proxyPool.proxies.filter(p => p.isActive);
  const averageLatency = active.length > 0
    ? active.reduce((sum, p) => sum + (p.latency || 0), 0) / active.length
    : 0;
  
  return {
    total: proxyPool.proxies.length,
    active: active.length,
    failed: proxyPool.proxies.filter(p => !p.isActive).length,
    averageLatency: Math.round(averageLatency),
    currentProxy: currentProxy || undefined,
  };
}

/**
 * Créer une configuration axios avec rotation de proxy
 */
export async function createRotatingProxyConfig() {
  let proxy = getNextProxy();
  
  // Fallback sur Tor si aucun proxy disponible
  if (!proxy && proxyPool.useTorFallback) {
    console.log('[ProxyRotator] Falling back to Tor');
    return {
      httpsAgent: getTorProxyAgent(),
      timeout: 30000,
    };
  }
  
  if (!proxy) {
    throw new Error('No proxy available and Tor fallback disabled');
  }
  
  return {
    httpsAgent: getProxyAgent(proxy) as any,
    timeout: 30000,
    headers: {
      'User-Agent': getRandomUserAgent(),
    },
  };
}

/**
 * Faire une requête avec rotation automatique de proxy
 */
export async function requestWithProxyRotation<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  maxRetries: number = 3
): Promise<{ data: T; proxy: Proxy }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const proxy = getNextProxy();
    
    if (!proxy) {
      throw new Error('No proxy available');
    }
    
    try {
      const agent = getProxyAgent(proxy);
      const response = await (axios as any)({
        method,
        url,
        data,
        httpsAgent: agent as any,
        timeout: 30000,
        headers: {
          'User-Agent': getRandomUserAgent(),
        },
        validateStatus: () => true,  // Accepter tous les status codes
      });
      
      // Mettre à jour les stats
      proxy.successRate = Math.min(100, proxy.successRate + 2);
      
      return { data: response.data as T, proxy };
      
    } catch (error: any) {
      lastError = error;
      proxy.failCount++;
      proxy.successRate = Math.max(0, proxy.successRate - 5);
      
      console.log(`[ProxyRotator] Request failed with proxy ${proxy.id}: ${error.message}`);
      
      // Attendre un peu avant retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  throw lastError || new Error('All proxies failed');
}

/**
 * Configurer un proxy résidentiel (ex: Bright Data, Oxylabs)
 */
export function setupResidentialProxy(
  host: string,
  port: number,
  username: string,
  password: string,
  country?: string
): void {
  const proxy: Omit<Proxy, 'id' | 'isActive' | 'failCount' | 'successRate'> = {
    host,
    port,
    protocol: 'http',
    username,
    password,
    country,
    provider: 'residential',
  };
  
  initProxyPool([proxy]);
  console.log(`[ProxyRotator] Residential proxy configured (${country || 'Global'})`);
}

/**
 * Pool de User-Agents
 */
function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Export par défaut
export default {
  initProxyPool,
  addPublicProxies,
  getNextProxy,
  getProxyAgent,
  checkProxyHealth,
  checkAllProxies,
  getProxyStats,
  createRotatingProxyConfig,
  requestWithProxyRotation,
  setupResidentialProxy,
  stopHealthChecks,
};
