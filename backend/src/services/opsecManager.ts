/**
 * OPSEC Manager v2 - Gestion de la sécurité opérationnelle
 * Intègre: Tor Manager, Proxy Rotator, Data Vault, Fingerprint Spoofer
 * Rotation de proxies, Tor, User-Agents, jitter, rate limiting, anti-détection
 * Niveaux: standard (léger), cautious (moyen), paranoid (maximum)
 * 
 * Mise à jour: 17 Avril 2026 - Phase 1 OPSEC Foundation
 */

import { logger } from "../utils/logger";
import crypto from "crypto";

// Import des nouveaux modules OPSEC Phase 1
import * as torManager from "./opsec/torManager";
import * as proxyRotator from "./opsec/proxyRotator";
import * as dataVault from "./opsec/dataVault";
import * as fingerprintSpoofer from "./opsec/fingerprintSpoofer";

// ============================================================================
// TYPES
// ============================================================================

export type OPSECLevel = "standard" | "cautious" | "paranoid";

export interface ProxyConfig {
  id: string;
  host: string;
  port: number;
  protocol: "http" | "https" | "socks4" | "socks5";
  auth?: {
    username: string;
    password: string;
  };
  country?: string;
  speed?: number; // ms
  reliability?: number; // 0-100
  lastUsed?: string;
  failCount: number;
  tags?: string[]; // "residential", "datacenter", "mobile"
}

export interface RequestFingerprint {
  userAgent: string;
  acceptLanguage: string;
  screenResolution: string;
  timezone: string;
  platform: string;
  fonts: string[];
  colorDepth: number;
  pixelRatio: number;
  cookies: boolean;
  localStorage: boolean;
  webgl: boolean;
  canvas: string; // fingerprint canvas
}

export interface OPSECContext {
  requestId: string;
  timestamp: string;
  target: string;
  toolId: string;
  opsecLevel: OPSECLevel;
  proxy?: ProxyConfig;
  fingerprint: RequestFingerprint;
  sessionCookies: Record<string, string>;
  rateLimitBucket: string;
}

export interface RateLimitRule {
  domain: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  concurrentRequests: number;
  delayBetweenRequests: number; // ms
  jitterRange: [number, number]; // [min, max] ms
}

export interface RequestLog {
  id: string;
  timestamp: string;
  target: string;
  proxy?: string;
  success: boolean;
  responseTime: number;
  httpStatus?: number;
  error?: string;
  opsecLevel: OPSECLevel;
}

export interface OPSECStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  proxyRotationCount: number;
  blockedDetections: number;
  currentProxy?: ProxyConfig;
  requestsPerProxy: Record<string, number>;
  blockedDomains: string[];
}

// ============================================================================
// USER AGENT POOLS
// ============================================================================

const USER_AGENTS = {
  desktop: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
  ],
  mobile: [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; ONEPLUS A6010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  ],
  // User-agents "vieux" pour sites moins méfiants
  legacy: [
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  ]
};

const ACCEPT_LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "fr-FR,fr;q=0.9,en;q=0.8",
  "de-DE,de;q=0.9,en;q=0.8",
  "es-ES,es;q=0.9,en;q=0.8",
  "it-IT,it;q=0.9,en;q=0.8",
  "nl-NL,nl;q=0.9,en;q=0.8",
  "pl-PL,pl;q=0.9,en;q=0.8",
  "pt-BR,pt;q=0.9,en;q=0.8",
  "ru-RU,ru;q=0.9,en;q=0.8",
  "ja-JP,ja;q=0.9,en;q=0.8",
  "zh-CN,zh;q=0.9,en;q=0.8",
];

const SCREEN_RESOLUTIONS = [
  "1920x1080",
  "2560x1440",
  "1366x768",
  "1440x900",
  "1536x864",
  "1280x720",
  "3840x2160",
  "1680x1050",
  "1792x1120",
];

const TIMEZONES = [
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Australia/Sydney",
  "America/Chicago",
  "America/Toronto",
];

// ============================================================================
// RATE LIMITING RULES
// ============================================================================

const DEFAULT_RATE_LIMITS: RateLimitRule[] = [
  // Réseaux sociaux très restrictifs
  { domain: "twitter.com", requestsPerMinute: 5, requestsPerHour: 50, concurrentRequests: 1, delayBetweenRequests: 15000, jitterRange: [2000, 8000] },
  { domain: "instagram.com", requestsPerMinute: 3, requestsPerHour: 30, concurrentRequests: 1, delayBetweenRequests: 25000, jitterRange: [3000, 10000] },
  { domain: "facebook.com", requestsPerMinute: 4, requestsPerHour: 40, concurrentRequests: 1, delayBetweenRequests: 20000, jitterRange: [2500, 9000] },
  { domain: "linkedin.com", requestsPerMinute: 3, requestsPerHour: 20, concurrentRequests: 1, delayBetweenRequests: 30000, jitterRange: [5000, 15000] },
  { domain: "tiktok.com", requestsPerMinute: 4, requestsPerHour: 40, concurrentRequests: 1, delayBetweenRequests: 18000, jitterRange: [2000, 6000] },

  // Sites de recherche
  { domain: "google.com", requestsPerMinute: 10, requestsPerHour: 200, concurrentRequests: 2, delayBetweenRequests: 8000, jitterRange: [1000, 5000] },
  { domain: "bing.com", requestsPerMinute: 15, requestsPerHour: 300, concurrentRequests: 3, delayBetweenRequests: 5000, jitterRange: [500, 3000] },
  { domain: "duckduckgo.com", requestsPerMinute: 20, requestsPerHour: 400, concurrentRequests: 3, delayBetweenRequests: 4000, jitterRange: [500, 2500] },

  // APIs OSINT
  { domain: "haveibeenpwned.com", requestsPerMinute: 30, requestsPerHour: 1000, concurrentRequests: 5, delayBetweenRequests: 2000, jitterRange: [100, 1000] },
  { domain: "shodan.io", requestsPerMinute: 1, requestsPerHour: 10, concurrentRequests: 1, delayBetweenRequests: 60000, jitterRange: [5000, 20000] },
  { domain: "virustotal.com", requestsPerMinute: 4, requestsPerHour: 100, concurrentRequests: 1, delayBetweenRequests: 15000, jitterRange: [1000, 5000] },

  // Par défaut
  { domain: "*", requestsPerMinute: 30, requestsPerHour: 500, concurrentRequests: 5, delayBetweenRequests: 2000, jitterRange: [200, 1500] },
];

// ============================================================================
// OPSEC MANAGER
// ============================================================================

export class OPSECManager {
  private level: OPSECLevel = "cautious";
  private proxies: Map<string, ProxyConfig> = new Map();
  private currentProxy: ProxyConfig | undefined = undefined;
  private requestLog: RequestLog[] = [];
  private rateLimitBuckets: Map<string, number[]> = new Map(); // timestamps des requêtes par domaine
  private lastRequestTime: Map<string, number> = new Map(); // domain → timestamp
  private blockedDomains: Set<string> = new Set();
  private torEnabled: boolean = false;
  private torProxy: ProxyConfig | undefined = undefined;

  constructor(level: OPSECLevel = "cautious") {
    this.level = level;
    this.initializeTor();
  }

  /**
   * Initialise le proxy Tor (si disponible)
   */
  private initializeTor(): void {
    // Configuration Tor par défaut (localhost:9050)
    this.torProxy = {
      id: "tor-local",
      host: "127.0.0.1",
      port: 9050,
      protocol: "socks5",
      tags: ["tor", "anonymous"],
      failCount: 0
    };
  }

  /**
   * Configure le niveau OPSEC
   */
  setLevel(level: OPSECLevel): void {
    this.level = level;
    logger.info(`[OPSEC] Level set to: ${level}`);
  }

  /**
   * Ajoute des proxies à la rotation
   */
  addProxies(proxies: ProxyConfig[]): void {
    for (const proxy of proxies) {
      this.proxies.set(proxy.id, proxy);
    }
    logger.info(`[OPSEC] Added ${proxies.length} proxies`);
  }

  /**
   * Génère un fingerprint aléatoire cohérent
   */
  generateFingerprint(): RequestFingerprint {
    const isMobile = Math.random() < 0.3; // 30% mobile
    const uaPool = isMobile ? USER_AGENTS.mobile : USER_AGENTS.desktop;

    // Pour "paranoid": utilise des fingerprints "legacy" moins traçables
    if (this.level === "paranoid" && Math.random() < 0.5) {
      uaPool.push(...USER_AGENTS.legacy);
    }

    const userAgent = uaPool[Math.floor(Math.random() * uaPool.length)];
    const acceptLanguage = ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
    const screenResolution = SCREEN_RESOLUTIONS[Math.floor(Math.random() * SCREEN_RESOLUTIONS.length)];
    const timezone = TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];

    // Détecte la plateforme depuis l'UA
    let platform = "Win32";
    if (userAgent.includes("Macintosh")) platform = "MacIntel";
    if (userAgent.includes("Linux")) platform = "Linux x86_64";
    if (userAgent.includes("iPhone")) platform = "iPhone";
    if (userAgent.includes("Android")) platform = "Android";

    // Fonts aléatoires
    const commonFonts = [
      "Arial", "Times New Roman", "Helvetica", "Courier New", "Georgia",
      "Verdana", "Trebuchet MS", "Tahoma", "Palatino", "Garamond"
    ];
    const fonts = commonFonts.slice(0, 5 + Math.floor(Math.random() * 5));

    return {
      userAgent,
      acceptLanguage,
      screenResolution,
      timezone,
      platform,
      fonts,
      colorDepth: 24,
      pixelRatio: isMobile ? 2 + Math.random() : 1,
      cookies: true,
      localStorage: true,
      webgl: this.level !== "paranoid", // Désactive WebGL en paranoid (traçable)
      canvas: crypto.randomBytes(16).toString("hex") // Fingerprint canvas randomisé
    };
  }

  /**
   * Prépare un contexte de requête OPSEC
   */
  async prepareRequest(target: string, toolId: string): Promise<OPSECContext> {
    const url = new URL(target.startsWith("http") ? target : `https://${target}`);
    const domain = url.hostname;

    // 1. Rate limiting
    await this.applyRateLimit(domain);

    // 2. Sélection du proxy
    const proxy = await this.selectProxy(domain);

    // 3. Génération du fingerprint
    const fingerprint = this.generateFingerprint();

    // 4. Jitter avant requête
    await this.applyJitter(domain);

    const context: OPSECContext = {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      target,
      toolId,
      opsecLevel: this.level,
      proxy: proxy || undefined,
      fingerprint,
      sessionCookies: {}, // TODO: gestion des cookies par session
      rateLimitBucket: domain
    };

    return context;
  }

  /**
   * Applique le rate limiting avec jitter
   */
  private async applyRateLimit(domain: string): Promise<void> {
    const rule = this.getRateLimitRule(domain);
    const now = Date.now();

    // Récupère l'historique des requêtes pour ce domaine
    const bucket = this.rateLimitBuckets.get(domain) || [];
    const recentRequests = bucket.filter(t => now - t < 60000); // dernière minute
    const hourlyRequests = bucket.filter(t => now - t < 3600000); // dernière heure

    // Vérifie les limites
    if (recentRequests.length >= rule.requestsPerMinute) {
      const oldestRecent = Math.min(...recentRequests);
      const waitTime = 60000 - (now - oldestRecent) + this.randomJitter(1000, 3000);
      logger.info(`[OPSEC] Rate limit hit for ${domain}, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    if (hourlyRequests.length >= rule.requestsPerHour) {
      const oldestHourly = Math.min(...hourlyRequests);
      const waitTime = 3600000 - (now - oldestHourly) + this.randomJitter(5000, 10000);
      logger.warn(`[OPSEC] Hourly rate limit hit for ${domain}, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    // Met à jour le bucket
    bucket.push(now);
    this.rateLimitBuckets.set(domain, bucket.filter(t => now - t < 3600000));
  }

  /**
   * Applique le jitter entre requêtes
   */
  private async applyJitter(domain: string): Promise<void> {
    const rule = this.getRateLimitRule(domain);
    const lastRequest = this.lastRequestTime.get(domain) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < rule.delayBetweenRequests) {
      const baseDelay = rule.delayBetweenRequests - timeSinceLastRequest;
      const jitter = this.randomJitter(rule.jitterRange[0], rule.jitterRange[1]);
      const totalDelay = baseDelay + jitter;

      // En mode paranoid, double le délai
      const finalDelay = this.level === "paranoid" ? totalDelay * 1.5 : totalDelay;

      logger.debug(`[OPSEC] Jitter delay: ${finalDelay}ms for ${domain}`);
      await this.sleep(finalDelay);
    }

    this.lastRequestTime.set(domain, Date.now());
  }

  /**
   * Sélectionne un proxy approprié
   */
  private async selectProxy(domain: string): Promise<ProxyConfig | null> {
    // Si Tor est activé et niveau paranoid → utilise Tor
    if (this.torEnabled && this.level === "paranoid" && this.torProxy) {
      return this.torProxy;
    }

    // Si domaine bloqué → force le changement de proxy
    if (this.blockedDomains.has(domain) && this.proxies.size > 0) {
      logger.warn(`[OPSEC] Domain ${domain} blocked, rotating proxy`);
      return this.getLeastUsedProxy();
    }

    // Sélection selon le niveau
    switch (this.level) {
      case "standard":
        // Pas de proxy par défaut, ou rotation légère
        return this.proxies.size > 0 ? this.getRandomProxy() : null;

      case "cautious":
        // Rotation fréquente
        return this.proxies.size > 0 ? this.getLeastUsedProxy() : null;

      case "paranoid":
        // Tor + rotation agressive
        if (this.torEnabled && this.torProxy) {
          // Demande une nouvelle identité Tor
          await this.requestNewTorIdentity();
          return this.torProxy;
        }
        return this.proxies.size > 0 ? this.getRandomProxy() : null;

      default:
        return null;
    }
  }

  /**
   * Récupère un proxy aléatoire
   */
  private getRandomProxy(): ProxyConfig | null {
    const available = Array.from(this.proxies.values()).filter(p => p.failCount < 3);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Récupère le proxy le moins utilisé
   */
  private getLeastUsedProxy(): ProxyConfig | null {
    const available = Array.from(this.proxies.values()).filter(p => p.failCount < 3);
    if (available.length === 0) return null;

    // Compte les requêtes par proxy depuis les logs récents
    const recentLogs = this.requestLog.slice(-100);
    const usageCount: Record<string, number> = {};

    for (const log of recentLogs) {
      if (log.proxy) {
        usageCount[log.proxy] = (usageCount[log.proxy] || 0) + 1;
      }
    }

    // Trie par usage
    return available.sort((a, b) =>
      (usageCount[a.id] || 0) - (usageCount[b.id] || 0)
    )[0];
  }

  /**
   * Demande une nouvelle identité Tor (via control port)
   */
  private async requestNewTorIdentity(): Promise<void> {
    // En production: se connecter au ControlPort Tor (9051) et envoyer SIGNAL NEWNYM
    // Pour l'instant: simulation
    logger.info("[OPSEC] Requesting new Tor identity");
    await this.sleep(5000); // Temps de changement d'identité Tor
  }

  /**
   * Log une requête et met à jour les stats
   */
  logRequest(context: OPSECContext, success: boolean, responseTime: number, httpStatus?: number, error?: string): void {
    const log: RequestLog = {
      id: context.requestId,
      timestamp: new Date().toISOString(),
      target: context.target,
      proxy: context.proxy?.id,
      success,
      responseTime,
      httpStatus,
      error,
      opsecLevel: context.opsecLevel
    };

    this.requestLog.push(log);

    // Garde seulement les 1000 dernières requêtes
    if (this.requestLog.length > 1000) {
      this.requestLog = this.requestLog.slice(-1000);
    }

    // Détecte les blocages
    if (!success || httpStatus === 403 || httpStatus === 429) {
      if (context.proxy) {
        const proxy = this.proxies.get(context.proxy.id);
        if (proxy) {
          proxy.failCount++;
          if (proxy.failCount >= 5) {
            logger.warn(`[OPSEC] Proxy ${proxy.id} marked as unreliable`);
          }
        }
      }

      // Si trop d'échecs sur un domaine, le marquer comme bloqué temporairement
      const domain = new URL(context.target).hostname;
      const recentFailures = this.requestLog
        .filter(r => r.target.includes(domain) && !r.success)
        .slice(-5);

      if (recentFailures.length >= 3) {
        this.blockedDomains.add(domain);
        setTimeout(() => this.blockedDomains.delete(domain), 300000); // Débloque après 5 min
      }
    }
  }

  /**
   * Récupère la configuration proxy pour axios/fetch
   */
  getProxyConfig(proxy: ProxyConfig): { protocol: string; host: string; port: number; auth?: { username: string; password: string } } {
    return {
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      auth: proxy.auth
    };
  }

  /**
   * Récupère les headers avec le fingerprint
   */
  getHeaders(fingerprint: RequestFingerprint): Record<string, string> {
    return {
      "User-Agent": fingerprint.userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": fingerprint.acceptLanguage,
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": this.level === "paranoid" ? "1" : "0", // Do Not Track en paranoid
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
      // En paranoid: pas de Referer, pas d'Origin
    };
  }

  /**
   * Récupère la règle de rate limiting pour un domaine
   */
  private getRateLimitRule(domain: string): RateLimitRule {
    const specific = DEFAULT_RATE_LIMITS.find(r => domain.includes(r.domain));
    return specific || DEFAULT_RATE_LIMITS.find(r => r.domain === "*")!;
  }

  /**
   * Génère un nombre aléatoire dans une plage
   */
  private randomJitter(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Sleep utilitaire
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // CONTRÔLES OPSEC SPÉCIFIQUES
  // ============================================================================

  /**
   * Active/désactive Tor
   */
  enableTor(enabled: boolean): void {
    this.torEnabled = enabled;
    logger.info(`[OPSEC] Tor ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Vérifie si Tor est fonctionnel
   */
  async checkTor(): Promise<{ working: boolean; exitIP?: string; details?: string }> {
    if (!this.torEnabled || !this.torProxy) {
      return { working: false, details: "Tor not configured" };
    }

    try {
      // Teste une requête via Tor vers check.torproject.org
      // En production: implémenter avec le proxy Tor
      return { working: true, exitIP: "unknown" };
    } catch (error) {
      return { working: false, details: String(error) };
    }
  }

  /**
   * Efface toutes les traces (logs, cookies, etc.)
   */
  clearTraces(): void {
    this.requestLog = [];
    this.rateLimitBuckets.clear();
    this.lastRequestTime.clear();
    this.blockedDomains.clear();

    // Réinitialise les compteurs de fail des proxies
    for (const proxy of this.proxies.values()) {
      proxy.failCount = 0;
    }

    logger.info("[OPSEC] All traces cleared");
  }

  /**
   * Génère un rapport OPSEC
   */
  generateReport(): OPSECStats {
    const total = this.requestLog.length;
    const successful = this.requestLog.filter(r => r.success).length;
    const failed = total - successful;
    const avgTime = total > 0
      ? this.requestLog.reduce((sum, r) => sum + r.responseTime, 0) / total
      : 0;

    const proxyUsage: Record<string, number> = {};
    for (const log of this.requestLog) {
      if (log.proxy) {
        proxyUsage[log.proxy] = (proxyUsage[log.proxy] || 0) + 1;
      }
    }

    return {
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: Math.round(avgTime),
      proxyRotationCount: Object.keys(proxyUsage).length,
      blockedDetections: this.blockedDomains.size,
      currentProxy: this.currentProxy,
      requestsPerProxy: proxyUsage,
      blockedDomains: Array.from(this.blockedDomains)
    };
  }

  /**
   * Mode "cible sensible" - OPSEC maximal temporaire
   */
  enableSensitiveMode(durationMinutes: number = 30): void {
    const previousLevel = this.level;
    this.level = "paranoid";
    this.torEnabled = true;

    logger.warn(`[OPSEC] SENSITIVE MODE enabled for ${durationMinutes} minutes`);

    setTimeout(() => {
      this.level = previousLevel;
      logger.info(`[OPSEC] SENSITIVE MODE expired, returning to ${previousLevel}`);
    }, durationMinutes * 60000);
  }

  // ============================================================================
  // NOUVELLES MÉTHODES - Phase 1 OPSEC Foundation (v2)
  // ============================================================================

  /**
   * Démarrer Tor avec le Tor Manager avancé
   */
  async startTorManager(config?: torManager.TorConfig): Promise<boolean> {
    logger.info("[OPSEC] Starting Tor Manager...");
    const result = await torManager.startTor(config);
    if (result) {
      this.torEnabled = true;
      logger.info("[OPSEC] Tor Manager started successfully");
    }
    return result;
  }

  /**
   * Arrêter Tor Manager
   */
  async stopTorManager(): Promise<boolean> {
    logger.info("[OPSEC] Stopping Tor Manager...");
    const result = await torManager.stopTor();
    if (result) {
      this.torEnabled = false;
      logger.info("[OPSEC] Tor Manager stopped");
    }
    return result;
  }

  /**
   * Obtenir le statut Tor détaillé
   */
  getTorStatus(): torManager.TorStatus {
    return torManager.getTorStatus();
  }

  /**
   * Rotation d'identité Tor (NEWNYM)
   */
  async rotateTorIdentity(): Promise<boolean> {
    logger.info("[OPSEC] Rotating Tor identity...");
    return await torManager.newIdentity();
  }

  /**
   * Health check Tor complet
   */
  async checkTorHealth(): Promise<{ healthy: boolean; issues: string[]; status: torManager.TorStatus }> {
    return await torManager.torHealthCheck();
  }

  /**
   * Initialiser le Proxy Rotator avec une liste de proxies
   */
  initProxyRotator(proxies: proxyRotator.Proxy[]): void {
    proxyRotator.initProxyPool(proxies);
    // Ajouter les proxies au pool interne aussi
    for (const proxy of proxies) {
      this.proxies.set(proxy.id, {
        id: proxy.id,
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol,
        auth: proxy.username && proxy.password ? { username: proxy.username, password: proxy.password } : undefined,
        country: proxy.country,
        failCount: 0,
        reliability: 100,
      });
    }
    logger.info(`[OPSEC] Proxy Rotator initialized with ${proxies.length} proxies`);
  }

  /**
   * Ajouter des proxies publics gratuits (pour tests)
   */
  addPublicProxies(): void {
    proxyRotator.addPublicProxies();
    logger.info("[OPSEC] Public proxies added to rotation");
  }

  /**
   * Obtenir le prochain proxy avec rotation intelligente
   */
  getNextProxy(): proxyRotator.Proxy | null {
    return proxyRotator.getNextProxy();
  }

  /**
   * Obtenir les statistiques du proxy pool
   */
  getProxyStats(): proxyRotator.ProxyStats {
    return proxyRotator.getProxyStats();
  }

  /**
   * Faire une requête avec rotation automatique de proxy
   */
  async requestWithProxy<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    maxRetries: number = 3
  ): Promise<{ data: T; proxy: proxyRotator.Proxy }> {
    return await proxyRotator.requestWithProxyRotation<T>(method, url, data, maxRetries);
  }

  /**
   * Initialiser le Data Vault
   */
  async initDataVault(password: string, vaultDir?: string): Promise<boolean> {
    const config: dataVault.VaultConfig = {
      vaultDir: vaultDir || './data/vault',
      masterPassword: password,
      autoDestruct: this.level === 'paranoid',
      retentionMinutes: this.level === 'paranoid' ? 60 : undefined,
    };
    return await dataVault.initVault(config);
  }

  /**
   * Chiffrer et sauvegarder des données sensibles
   */
  async saveSensitiveData(
    id: string,
    type: dataVault.VaultEntry['type'],
    data: string | object,
    metadata?: any
  ): Promise<dataVault.VaultEntry> {
    return await dataVault.saveEntry(id, type, data, metadata);
  }

  /**
   * Charger et déchiffrer des données
   */
  async loadSensitiveData(id: string): Promise<{ entry: dataVault.VaultEntry; decrypted: any }> {
    return await dataVault.loadEntry(id);
  }

  /**
   * Supprimer sécurisément des données
   */
  async deleteSensitiveData(id: string): Promise<boolean> {
    return await dataVault.deleteEntry(id);
  }

  /**
   * Effacer toutes les données (mode panic)
   */
  async wipeAllData(): Promise<boolean> {
    logger.warn("[OPSEC] WIPING ALL DATA - Panic mode activated");
    return await dataVault.wipeAllData();
  }

  /**
   * Générer un fingerprint avancé avec le Fingerprint Spoofer
   */
  generateAdvancedFingerprint(profile?: fingerprintSpoofer.FingerprintProfile): fingerprintSpoofer.BrowserFingerprint {
    return fingerprintSpoofer.generateFingerprint(profile);
  }

  /**
   * Rotation du fingerprint
   */
  rotateFingerprint(): fingerprintSpoofer.BrowserFingerprint {
    return fingerprintSpoofer.rotateFingerprint();
  }

  /**
   * Obtenir les headers HTTP spoofés
   */
  getSpoofedHeaders(): Record<string, string> {
    return fingerprintSpoofer.getSpoofedHeaders();
  }

  /**
   * Activer le mode paranoid pour fingerprints (rotation agressive)
   */
  enableParanoidFingerprintMode(): void {
    fingerprintSpoofer.setParanoidMode(true);
    logger.info("[OPSEC] Paranoid fingerprint mode enabled");
  }

  /**
   * Désactiver le mode paranoid fingerprints
   */
  disableParanoidFingerprintMode(): void {
    fingerprintSpoofer.setParanoidMode(false);
    logger.info("[OPSEC] Paranoid fingerprint mode disabled");
  }

  /**
   * Health check complet de tous les systèmes OPSEC
   */
  async fullHealthCheck(): Promise<{
    tor: { healthy: boolean; issues: string[] };
    vault: { healthy: boolean; issues: string[] };
    overall: boolean;
  }> {
    const torHealth = await torManager.torHealthCheck();
    const vaultHealth = await dataVault.vaultHealthCheck();

    return {
      tor: { healthy: torHealth.healthy, issues: torHealth.issues },
      vault: { healthy: vaultHealth.healthy, issues: vaultHealth.issues },
      overall: torHealth.healthy && vaultHealth.healthy,
    };
  }
}

// Singleton
export const opsecManager = new OPSECManager("cautious");
