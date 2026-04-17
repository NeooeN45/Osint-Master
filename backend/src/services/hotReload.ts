/**
 * Hot Reload Service - Backend Upgrade Support
 * Gestion du rechargement à chaud des modules et services
 * 
 * Features:
 * - Hot reload des modules sans redémarrage
 * - Gestion des dépendances circulaires
 * - Backup/restore d'état
 * - Migration de données
 * 
 * Créé: 17 Avril 2026
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

interface ModuleState {
  name: string;
  version: string;
  loaded: boolean;
  exports: any;
  dependencies: string[];
  lastReloaded?: Date;
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastError?: string;
  metrics: {
    requestsHandled: number;
    errors: number;
    avgResponseTime: number;
  };
}

export class HotReloadService extends EventEmitter {
  private modules: Map<string, ModuleState> = new Map();
  private services: Map<string, ServiceStatus> = new Map();
  private modulePath: string;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private stateBackup: Map<string, any> = new Map();

  constructor(modulePath?: string) {
    super();
    this.modulePath = modulePath || path.join(process.cwd(), 'src');
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MODULE REGISTRATION
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Enregistrer un module pour le hot reload
   */
  registerModule(name: string, exports: any, dependencies: string[] = []): void {
    const existing = this.modules.get(name);
    
    this.modules.set(name, {
      name,
      version: existing?.version || '1.0.0',
      loaded: true,
      exports,
      dependencies,
      lastReloaded: existing ? new Date() : undefined,
    });

    console.log(`[HotReload] Module '${name}' registered`);
  }

  /**
   * Désenregistrer un module
   */
  unregisterModule(name: string): void {
    const module = this.modules.get(name);
    if (module) {
      // Sauvegarder l'état avant déchargement
      this.backupState(name, module.exports);
      
      this.modules.delete(name);
      this.stopWatcher(name);
      
      console.log(`[HotReload] Module '${name}' unregistered`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HOT RELOAD
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Recharger un module à chaud
   */
  async reloadModule(name: string): Promise<boolean> {
    const module = this.modules.get(name);
    if (!module) {
      console.error(`[HotReload] Module '${name}' not found`);
      return false;
    }

    try {
      console.log(`[HotReload] Reloading module '${name}'...`);
      
      // 1. Sauvegarder l'état actuel
      const state = this.captureState(module.exports);
      
      // 2. Vérifier les dépendances
      for (const dep of module.dependencies) {
        if (!this.modules.has(dep)) {
          console.warn(`[HotReload] Dependency '${dep}' not loaded`);
        }
      }
      
      // 3. Invalider le cache require
      const modulePath = this.findModulePath(name);
      if (modulePath) {
        delete require.cache[require.resolve(modulePath)];
      }
      
      // 4. Recharger le module
      const newExports = await this.loadModule(name);
      
      // 5. Restaurer l'état
      this.restoreState(newExports, state);
      
      // 6. Mettre à jour le registre
      module.exports = newExports;
      module.lastReloaded = new Date();
      
      this.emit('module:reloaded', { name, version: module.version });
      
      console.log(`[HotReload] Module '${name}' reloaded successfully`);
      return true;
    } catch (error) {
      console.error(`[HotReload] Failed to reload module '${name}':`, error);
      this.emit('module:error', { name, error });
      return false;
    }
  }

  /**
   * Recharger tous les modules
   */
  async reloadAll(): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];
    
    for (const [name] of this.modules) {
      const result = await this.reloadModule(name);
      if (result) {
        success.push(name);
      } else {
        failed.push(name);
      }
    }
    
    return { success, failed };
  }

  /**
   * Mettre à jour la version d'un module
   */
  async upgradeModule(name: string, newCode: string): Promise<boolean> {
    try {
      console.log(`[HotReload] Upgrading module '${name}'...`);
      
      // Sauvegarder l'ancien code
      const modulePath = this.findModulePath(name);
      if (modulePath) {
        const backupPath = `${modulePath}.backup.${Date.now()}`;
        fs.copyFileSync(modulePath, backupPath);
      }
      
      // Écrire le nouveau code
      if (modulePath) {
        fs.writeFileSync(modulePath, newCode);
      }
      
      // Recharger
      return await this.reloadModule(name);
    } catch (error) {
      console.error(`[HotReload] Upgrade failed:`, error);
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // FILE WATCHING
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Démarrer le watcher sur un fichier de module
   */
  watchModule(name: string, filePath?: string): void {
    const targetPath = filePath || this.findModulePath(name);
    if (!targetPath || !fs.existsSync(targetPath)) {
      console.warn(`[HotReload] Cannot watch module '${name}': file not found`);
      return;
    }

    // Arrêter le watcher existant
    this.stopWatcher(name);

    const watcher = fs.watch(targetPath, (eventType) => {
      if (eventType === 'change') {
        console.log(`[HotReload] File changed: ${targetPath}`);
        this.reloadModule(name);
      }
    });

    this.watchers.set(name, watcher);
    console.log(`[HotReload] Watching module '${name}' at ${targetPath}`);
  }

  /**
   * Arrêter le watcher d'un module
   */
  stopWatcher(name: string): void {
    const watcher = this.watchers.get(name);
    if (watcher) {
      watcher.close();
      this.watchers.delete(name);
    }
  }

  /**
   * Démarrer le watcher sur tous les modules
   */
  watchAll(): void {
    for (const [name] of this.modules) {
      this.watchModule(name);
    }
  }

  /**
   * Arrêter tous les watchers
   */
  stopAllWatchers(): void {
    for (const [name, watcher] of this.watchers) {
      watcher.close();
      console.log(`[HotReload] Stopped watching '${name}'`);
    }
    this.watchers.clear();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Capturer l'état d'un module
   */
  private captureState(exports: any): any {
    if (exports && typeof exports.getState === 'function') {
      return exports.getState();
    }
    return null;
  }

  /**
   * Restaurer l'état d'un module
   */
  private restoreState(exports: any, state: any): void {
    if (state && exports && typeof exports.setState === 'function') {
      exports.setState(state);
    }
  }

  /**
   * Sauvegarder l'état
   */
  private backupState(name: string, state: any): void {
    this.stateBackup.set(name, state);
  }

  /**
   * Obtenir l'état sauvegardé
   */
  getBackupState(name: string): any {
    return this.stateBackup.get(name);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SERVICE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Enregistrer un service
   */
  registerService(name: string): void {
    this.services.set(name, {
      name,
      status: 'running',
      uptime: 0,
      metrics: {
        requestsHandled: 0,
        errors: 0,
        avgResponseTime: 0,
      },
    });
  }

  /**
   * Mettre à jour le statut d'un service
   */
  updateServiceStatus(name: string, status: ServiceStatus['status'], error?: string): void {
    const service = this.services.get(name);
    if (service) {
      service.status = status;
      if (error) service.lastError = error;
    }
  }

  /**
   * Mettre à jour les métriques d'un service
   */
  updateServiceMetrics(name: string, metrics: Partial<ServiceStatus['metrics']>): void {
    const service = this.services.get(name);
    if (service) {
      Object.assign(service.metrics, metrics);
    }
  }

  /**
   * Obtenir le statut de tous les services
   */
  getServicesStatus(): ServiceStatus[] {
    return Array.from(this.services.values());
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UTILS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Trouver le chemin d'un module
   */
  private findModulePath(name: string): string | null {
    const candidates = [
      path.join(this.modulePath, 'services', `${name}.ts`),
      path.join(this.modulePath, 'routes', `${name}.ts`),
      path.join(this.modulePath, `${name}.ts`),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Charger un module dynamiquement
   */
  private async loadModule(name: string): Promise<any> {
    const modulePath = this.findModulePath(name);
    if (!modulePath) {
      throw new Error(`Module path not found for '${name}'`);
    }

    // En TypeScript, on ne peut pas vraiment recharger à chaud
    // sans compilation. En développement avec ts-node/tsx, ça fonctionne.
    const module = require(modulePath);
    return module;
  }

  /**
   * Lister tous les modules enregistrés
   */
  listModules(): ModuleState[] {
    return Array.from(this.modules.values());
  }

  /**
   * Obtenir un module spécifique
   */
  getModule(name: string): ModuleState | undefined {
    return this.modules.get(name);
  }

  /**
   * Vérifier si un module est chargé
   */
  isModuleLoaded(name: string): boolean {
    return this.modules.get(name)?.loaded || false;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.stopAllWatchers();
    this.modules.clear();
    this.services.clear();
    this.stateBackup.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
let hotReloadService: HotReloadService | null = null;

export function getHotReloadService(): HotReloadService {
  if (!hotReloadService) {
    hotReloadService = new HotReloadService();
  }
  return hotReloadService;
}

export function resetHotReloadService(): void {
  if (hotReloadService) {
    hotReloadService.dispose();
    hotReloadService = null;
  }
}

export default HotReloadService;
