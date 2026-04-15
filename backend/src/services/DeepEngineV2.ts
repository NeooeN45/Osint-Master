// ============================================================================
// DEEP ENGINE V2 - Architecture modulaire avec cache et exécution parallèle
// ============================================================================

import { EventEmitter } from "events";
import { logger } from "../utils/logger";
import {
  allModules,
  getModulesForTarget,
  getAvailableModules,
  detectTargetType,
  StreamEvent,
  DeepEntity,
  DeepCorrelation,
  InvestigationConfig,
  OSINTModule
} from "../modules";
import { cacheManager } from "./cache/CacheManager";
import { parallelExecutor, ExecutionResult } from "./executor/ParallelExecutor";
import { correlationEngine } from "./intelligence/CorrelationEngine";
import { googleDorker } from "./intelligence/GoogleDorker";
import { dockerParallelExecutor } from "./docker/DockerParallelExecutor";
import { dockerManager } from "./docker/DockerManager";

const DEFAULT_CONFIG: InvestigationConfig = {
  maxDepth: 2,
  maxEntities: 500,
  timeoutMs: 300000,
  enableAI: true,
  enableWebSearch: true,
  enableRecursive: true,
  recursiveThreshold: 70,
  selectedModules: [],
};

class DeepEngineV2 extends EventEmitter {
  private config: InvestigationConfig = DEFAULT_CONFIG;
  private availableModules: OSINTModule[] = [];
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    logger.info("[DeepEngineV2] Initializing...");
    
    // Charger les modules disponibles
    this.availableModules = await getAvailableModules();
    logger.info(`[DeepEngineV2] ${this.availableModules.length}/${allModules.length} modules available`);

    // Log des stats de cache
    const cacheStats = cacheManager.getStats();
    logger.info("[DeepEngineV2] Cache initialized", cacheStats);

    this.isInitialized = true;
  }

  async *investigate(
    target: string,
    config: Partial<InvestigationConfig> = {}
  ): AsyncGenerator<StreamEvent> {
    const startTime = Date.now();
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    this.config = mergedConfig;

    const targetType = detectTargetType(target);
    const runId = `run_${Date.now()}`;

    logger.info(`[DeepEngineV2] Starting investigation ${runId} for ${target} (${targetType})`);

    // Yield: Phase initiale
    yield this.makeEvent("phase", runId, { phase: "initialization", target, targetType });

    // Sélectionner les modules
    const modules = this.selectModules(target, targetType, mergedConfig.selectedModules);
    yield this.makeEvent("phase", runId, { 
      phase: "module_selection", 
      selected: modules.map(m => m.id),
      count: modules.length 
    });

    // Exécution parallèle
    yield this.makeEvent("phase", runId, { phase: "execution", mode: "parallel" });

    const results: ExecutionResult[] = [];
    const allEntities: DeepEntity[] = [];
    const correlations: DeepCorrelation[] = [];

    // Fonction d'emit pour les modules
    const emit = (event: Partial<StreamEvent>) => {
      if (event.type === "entity_found" && event.data) {
        const entity = event.data as DeepEntity;
        allEntities.push(entity);
      }
    };

    // Exécuter tous les modules en parallèle avec gestion de concurrence
    const executionResults = await parallelExecutor.executeParallel(
      modules,
      target,
      emit,
      {
        maxGlobalConcurrency: 5,
        enableCache: true,
        timeoutPerModule: 120000
      }
    );

    results.push(...executionResults);

    // Traiter les résultats
    for (const result of executionResults) {
      if (result.success && result.result) {
        // Ajouter les entités trouvées
        if (result.result.entities) {
          allEntities.push(...result.result.entities);
        }

        // Yield: Tool done
        yield this.makeEvent("tool_done", runId, {
          tool: result.moduleId,
          duration: result.duration,
          cached: result.cached,
          found: result.result.entities?.length || 0
        });
      } else {
        // Yield: Error
        yield this.makeEvent("error", runId, {
          tool: result.moduleId,
          message: result.error || "Execution failed"
        });
      }
    }

    // ---- Docker modules en parallèle ----
    const dockerAvailable = await dockerManager.isDockerAvailable();
    if (dockerAvailable) {
      yield this.makeEvent("phase", runId, { phase: "docker_execution", status: "launching" });
      const dockerModuleIds = dockerManager.getAvailableModules();
      dockerParallelExecutor.enqueue(
        ...dockerModuleIds.map(id => ({ moduleId: id, target, priority: 50 }))
      );
      const dockerResults = await dockerParallelExecutor.execute((res) => {
        if (res.success) {
          logger.info(`[DeepEngineV2] Docker module done: ${res.moduleId} in ${res.duration}ms`);
        }
      });
      yield this.makeEvent("phase", runId, {
        phase: "docker_done",
        ran: dockerResults.length,
        success: dockerResults.filter(r => r.success).length,
      });
    }

    // Dédoublonnage des entités
    const uniqueEntities = this.deduplicateEntities(allEntities);

    // ---- Anti faux-positifs ----
    yield this.makeEvent("phase", runId, { phase: "false_positive_filter" });
    const { valid: filteredEntities, rejected } = correlationEngine.filterFalsePositives(
      uniqueEntities as any[],
      0.5
    );
    if (rejected.length > 0) {
      yield this.makeEvent("log", runId, {
        message: `${rejected.length} faux positifs filtrés`,
        rejected: rejected.map(e => e.value),
      });
    }

    // ---- Corrélations intelligentes ----
    yield this.makeEvent("phase", runId, { phase: "correlation" });
    const foundCorrelations = correlationEngine.findCorrelations(filteredEntities as any[]);
    correlations.push(...(foundCorrelations as any[]));

    // ---- Google Dorking ----
    if (mergedConfig.enableWebSearch) {
      yield this.makeEvent("phase", runId, { phase: "google_dorking" });
      const dorkReport = googleDorker.generateDorkReport(target, targetType);
      yield this.makeEvent("log", runId, {
        message: `${dorkReport.total} dorks générés`,
        dorks: dorkReport.allDorks.slice(0, 5),
        bySeverity: Object.keys(dorkReport.bySeverity).map(s => `${s}: ${dorkReport.bySeverity[s].length}`),
      });
    }

    // ---- Relance récursive ----
    const alreadySearched = new Set([`${targetType}:${target}`]);
    if (mergedConfig.enableRecursive && mergedConfig.maxDepth > 1) {
      const triggers = correlationEngine.generateRecursiveTriggers(
        filteredEntities as any[],
        alreadySearched,
        1,
        mergedConfig.maxDepth
      );
      if (triggers.length > 0) {
        yield this.makeEvent("phase", runId, {
          phase: "recursive_launch",
          triggers: triggers.map(t => ({ target: t.newTarget, type: t.targetType, reason: t.reason })),
        });
        for (const trigger of triggers.slice(0, 5)) {
          alreadySearched.add(`${trigger.targetType}:${trigger.newTarget}`);
          const subModules = this.selectModules(trigger.newTarget, trigger.targetType, []);
          const subResults = await parallelExecutor.executeParallel(subModules, trigger.newTarget, emit, {
            maxGlobalConcurrency: 3,
            enableCache: true,
            timeoutPerModule: 60000,
          });
          for (const r of subResults) {
            if (r.success && r.result?.entities) {
              allEntities.push(...r.result.entities);
            }
          }
        }
      }
    }

    // Score de confiance global
    const profileScore = correlationEngine.computeProfileScore(filteredEntities as any[], foundCorrelations as any[]);

    // Yield: Progress
    yield this.makeEvent("progress", runId, {
      phase: "complete",
      entitiesFound: uniqueEntities.length,
      correlationsFound: correlations.length,
      modulesRun: results.length,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length
    });

    // Yield: Complete
    yield this.makeEvent("complete", runId, {
      target,
      targetType,
      duration: Date.now() - startTime,
      config: mergedConfig,
      summary: {
        entities: filteredEntities.length,
        correlations: correlations.length,
        modules: results.length,
        fromCache: results.filter(r => r.cached).length,
        profileScore: profileScore ?? 0,
        dorks: googleDorker.generateDorkReport(target, targetType).total,
      },
      entities: filteredEntities,
      correlations
    });

    // Log des stats
    logger.info(`[DeepEngineV2] Investigation ${runId} completed in ${Date.now() - startTime}ms`);
    logger.info(`[DeepEngineV2] Stats: ${filteredEntities.length} entities, ${correlations.length} correlations, score: ${profileScore ?? 0}`);
  }

  private selectModules(
    target: string,
    targetType: string,
    selectedModules: string[]
  ): OSINTModule[] {
    // Si des modules spécifiques sont demandés
    if (selectedModules.length > 0) {
      return this.availableModules.filter(m => selectedModules.includes(m.id));
    }

    // Sinon, modules pertinents pour le type de cible
    const relevantIds = getModulesForTarget(target, targetType).map(m => m.id);
    return this.availableModules
      .filter(m => relevantIds.includes(m.id))
      .sort((a, b) => a.priority - b.priority);
  }

  private deduplicateEntities(entities: DeepEntity[]): DeepEntity[] {
    const seen = new Map<string, DeepEntity>();
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = seen.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }
    
    return Array.from(seen.values());
  }

  private findCorrelations(entities: DeepEntity[]): DeepCorrelation[] {
    return correlationEngine.findCorrelations(entities as any[]) as unknown as DeepCorrelation[];
  }

  private makeEvent(type: StreamEvent["type"], runId: string, data: any): StreamEvent {
    return {
      type,
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      data: { ...data, runId }
    };
  }

  getAvailableModules(): OSINTModule[] {
    return this.availableModules;
  }

  getCacheStats() {
    return cacheManager.getStats();
  }

  clearCache() {
    cacheManager.clearAll();
  }
}

// Singleton
export const deepEngineV2 = new DeepEngineV2();
export { DeepEngineV2, InvestigationConfig };
