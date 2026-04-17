/**
 * Config Manager - Hot Reload & Dynamic Updates
 * Gestion dynamique de la configuration backend
 * 
 * Features:
 * - Chargement configuration depuis .env
 * - Hot reload sans redémarrage
 * - Validation des changements
 * - Events pour notifier les modules
 * - Backup/restore configuration
 * 
 * Créé: 17 Avril 2026
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// Configuration types
export interface AppConfig {
  // Server
  port: number;
  nodeEnv: string;
  
  // Security
  jwtSecret: string;
  encryptionKey: string;
  
  // Docker
  dockerEnabled: boolean;
  torProxyHost: string;
  torProxyPort: number;
  toolsContainer: string;
  
  // API Keys
  apiKeys: Record<string, string>;
  
  // Features flags
  features: {
    dockerBooster: boolean;
    aiAnalysis: boolean;
    deepInvestigation: boolean;
    opsecProtection: boolean;
  };
  
  // Limits
  limits: {
    maxConcurrentExecutions: number;
    maxExecutionTime: number;
    rateLimitRequests: number;
    rateLimitWindow: number;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  port: 3002,
  nodeEnv: 'development',
  jwtSecret: 'change-me-in-production',
  encryptionKey: 'change-me-32-chars-long',
  dockerEnabled: true,
  torProxyHost: 'tor-proxy',
  torProxyPort: 9050,
  toolsContainer: 'osint-tools',
  apiKeys: {},
  features: {
    dockerBooster: true,
    aiAnalysis: true,
    deepInvestigation: true,
    opsecProtection: true,
  },
  limits: {
    maxConcurrentExecutions: 5,
    maxExecutionTime: 300000, // 5 minutes
    rateLimitRequests: 100,
    rateLimitWindow: 60000, // 1 minute
  },
};

export class ConfigManager extends EventEmitter {
  private config: AppConfig;
  private configPath: string;
  private watchers: Map<string, Function[]> = new Map();
  private lastHash: string = '';

  constructor(configPath?: string) {
    super();
    this.configPath = configPath || path.join(process.cwd(), '.env');
    this.config = { ...defaultConfig };
    
    this.loadConfig();
    this.startFileWatcher();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CONFIG LOADING
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Charger la configuration depuis .env
   */
  private loadConfig(): void {
    try {
      // Charger depuis process.env
      const env = process.env;
      
      this.config = {
        port: parseInt(env.PORT || '3002'),
        nodeEnv: env.NODE_ENV || 'development',
        jwtSecret: env.JWT_SECRET || defaultConfig.jwtSecret,
        encryptionKey: env.ENCRYPTION_KEY || defaultConfig.encryptionKey,
        dockerEnabled: env.DOCKER_ENABLED !== 'false',
        torProxyHost: env.TOR_PROXY_HOST || 'tor-proxy',
        torProxyPort: parseInt(env.TOR_PROXY_PORT || '9050'),
        toolsContainer: env.TOOLS_CONTAINER || 'osint-tools',
        apiKeys: this.loadApiKeys(env),
        features: {
          dockerBooster: env.FEATURE_DOCKER !== 'false',
          aiAnalysis: env.FEATURE_AI !== 'false',
          deepInvestigation: env.FEATURE_DEEP !== 'false',
          opsecProtection: env.FEATURE_OPSEC !== 'false',
        },
        limits: {
          maxConcurrentExecutions: parseInt(env.MAX_CONCURRENT_EXECUTIONS || '5'),
          maxExecutionTime: parseInt(env.MAX_EXECUTION_TIME || '300000'),
          rateLimitRequests: parseInt(env.RATE_LIMIT_REQUESTS || '100'),
          rateLimitWindow: parseInt(env.RATE_LIMIT_WINDOW || '60000'),
        },
      };

      // Calculer le hash pour détecter les changements
      const newHash = this.calculateHash(this.config);
      
      if (this.lastHash && this.lastHash !== newHash) {
        this.emit('config:changed', this.config);
      }
      
      this.lastHash = newHash;
      
      console.log('[ConfigManager] Configuration loaded');
    } catch (error) {
      console.error('[ConfigManager] Error loading config:', error);
      this.config = { ...defaultConfig };
    }
  }

  /**
   * Charger les clés API depuis les variables d'environnement
   */
  private loadApiKeys(env: NodeJS.ProcessEnv): Record<string, string> {
    const apiKeys: Record<string, string> = {};
    const keyPrefixes = [
      'SHODAN',
      'HIBP',
      'NUMVERIFY',
      'IPINFO',
      'ABUSEIPDB',
      'VIRUSTOTAL',
      'HUNTER',
      'CENSYS_ID',
      'CENSYS_SECRET',
      'GITHUB_TOKEN',
      'BING_SEARCH_KEY',
      'INSTAGRAM_SESSION',
      'RAPIDAPI_KEY',
    ];

    keyPrefixes.forEach(prefix => {
      const value = env[prefix];
      if (value) {
        apiKeys[prefix] = value;
      }
    });

    return apiKeys;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // FILE WATCHER (HOT RELOAD)
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Démarrer le watcher de fichier
   */
  private startFileWatcher(): void {
    if (!fs.existsSync(this.configPath)) {
      console.warn(`[ConfigManager] Config file not found: ${this.configPath}`);
      return;
    }

    fs.watchFile(this.configPath, { interval: 5000 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        console.log('[ConfigManager] Config file changed, reloading...');
        this.loadConfig();
      }
    });

    console.log('[ConfigManager] File watcher started');
  }

  /**
   * Arrêter le watcher
   */
  stopFileWatcher(): void {
    fs.unwatchFile(this.configPath);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Obtenir toute la configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Obtenir une valeur spécifique
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Obtenir une clé API
   */
  getApiKey(name: string): string | undefined {
    return this.config.apiKeys[name];
  }

  /**
   * Vérifier si une fonctionnalité est activée
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // DYNAMIC UPDATES
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Mettre à jour une valeur de configuration (runtime only)
   */
  update<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    const oldValue = this.config[key];
    this.config[key] = value;
    
    this.emit('config:updated', { key, oldValue, newValue: value });
    
    // Notifier les watchers spécifiques
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      keyWatchers.forEach(callback => callback(value, oldValue));
    }
  }

  /**
   * Mettre à jour une clé API
   */
  updateApiKey(name: string, value: string): void {
    const oldValue = this.config.apiKeys[name];
    this.config.apiKeys[name] = value;
    
    this.emit('config:apikey:updated', { name, oldValue, newValue: value });
  }

  /**
   * Activer/désactiver une fonctionnalité
   */
  toggleFeature(feature: keyof AppConfig['features'], enabled?: boolean): boolean {
    const newValue = enabled !== undefined ? enabled : !this.config.features[feature];
    this.config.features[feature] = newValue;
    
    this.emit('config:feature:toggled', { feature, enabled: newValue });
    
    return newValue;
  }

  /**
   * S'inscrire aux changements d'une clé spécifique
   */
  watch<K extends keyof AppConfig>(key: K, callback: (newValue: AppConfig[K], oldValue: AppConfig[K]) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }
    
    const keyWatchers = this.watchers.get(key)!;
    keyWatchers.push(callback);
    
    // Retourner fonction de désinscription
    return () => {
      const index = keyWatchers.indexOf(callback);
      if (index > -1) {
        keyWatchers.splice(index, 1);
      }
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Sauvegarder la configuration dans .env
   */
  saveToFile(): void {
    try {
      const lines: string[] = [];
      
      // Server
      lines.push(`PORT=${this.config.port}`);
      lines.push(`NODE_ENV=${this.config.nodeEnv}`);
      
      // Security
      lines.push(`JWT_SECRET=${this.config.jwtSecret}`);
      lines.push(`ENCRYPTION_KEY=${this.config.encryptionKey}`);
      
      // Docker
      lines.push(`DOCKER_ENABLED=${this.config.dockerEnabled}`);
      lines.push(`TOR_PROXY_HOST=${this.config.torProxyHost}`);
      lines.push(`TOR_PROXY_PORT=${this.config.torProxyPort}`);
      lines.push(`TOOLS_CONTAINER=${this.config.toolsContainer}`);
      
      // API Keys
      Object.entries(this.config.apiKeys).forEach(([key, value]) => {
        lines.push(`${key}=${value}`);
      });
      
      // Features
      lines.push(`FEATURE_DOCKER=${this.config.features.dockerBooster}`);
      lines.push(`FEATURE_AI=${this.config.features.aiAnalysis}`);
      lines.push(`FEATURE_DEEP=${this.config.features.deepInvestigation}`);
      lines.push(`FEATURE_OPSEC=${this.config.features.opsecProtection}`);
      
      // Limits
      lines.push(`MAX_CONCURRENT_EXECUTIONS=${this.config.limits.maxConcurrentExecutions}`);
      lines.push(`MAX_EXECUTION_TIME=${this.config.limits.maxExecutionTime}`);
      lines.push(`RATE_LIMIT_REQUESTS=${this.config.limits.rateLimitRequests}`);
      lines.push(`RATE_LIMIT_WINDOW=${this.config.limits.rateLimitWindow}`);
      
      fs.writeFileSync(this.configPath, lines.join('\n'));
      
      this.emit('config:saved', this.configPath);
    } catch (error) {
      console.error('[ConfigManager] Error saving config:', error);
      throw error;
    }
  }

  /**
   * Créer un backup de la configuration
   */
  backup(): string {
    const backupPath = `${this.configPath}.backup.${Date.now()}`;
    fs.copyFileSync(this.configPath, backupPath);
    return backupPath;
  }

  /**
   * Restaurer depuis un backup
   */
  restore(backupPath: string): void {
    fs.copyFileSync(backupPath, this.configPath);
    this.loadConfig();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UTILS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Calculer un hash simple de la config
   */
  private calculateHash(config: AppConfig): string {
    return Buffer.from(JSON.stringify(config)).toString('base64').slice(0, 32);
  }

  /**
   * Réinitialiser à la configuration par défaut
   */
  reset(): void {
    this.config = { ...defaultConfig };
    this.emit('config:reset', this.config);
  }

  /**
   * Valider la configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.config.port < 1 || this.config.port > 65535) {
      errors.push('Invalid port number');
    }
    
    if (this.config.jwtSecret.length < 16) {
      errors.push('JWT secret too short (min 16 chars)');
    }
    
    if (this.config.encryptionKey.length !== 32) {
      errors.push('Encryption key must be 32 characters');
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.stopFileWatcher();
    this.removeAllListeners();
    this.watchers.clear();
  }
}

// Singleton instance
let configManager: ConfigManager | null = null;

export function getConfigManager(configPath?: string): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager(configPath);
  }
  return configManager;
}

export function resetConfigManager(): void {
  if (configManager) {
    configManager.dispose();
    configManager = null;
  }
}

export default ConfigManager;
