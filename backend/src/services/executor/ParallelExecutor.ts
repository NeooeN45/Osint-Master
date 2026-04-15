// ============================================================================
// PARALLEL EXECUTOR - Exécution concurrente avec rate limiting adaptatif
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult } from "../../modules/types";
import { cacheManager } from "../cache/CacheManager";

interface ExecutionGroup {
  name: string;
  modules: OSINTModule[];
  maxConcurrency: number;
  delayBetweenMs: number;
}

interface ExecutionResult {
  moduleId: string;
  success: boolean;
  result: ModuleResult | null;
  error?: string;
  duration: number;
  cached: boolean;
}

interface ExecutorOptions {
  maxGlobalConcurrency?: number;
  enableCache?: boolean;
  timeoutPerModule?: number;
}

class ParallelExecutor {
  private running = 0;
  private queue: Array<{
    module: OSINTModule;
    target: string;
    emit: EmitFunction;
    resolve: (result: ExecutionResult) => void;
  }> = [];

  async executeParallel(
    modules: OSINTModule[],
    target: string,
    emit: EmitFunction,
    options: ExecutorOptions = {}
  ): Promise<ExecutionResult[]> {
    const { enableCache = true, timeoutPerModule = 60000 } = options;
    
    // Grouper par catégorie de rate limiting
    const groups = this.groupByRateLimit(modules);
    const allResults: ExecutionResult[] = [];

    // Exécuter chaque groupe séquentiellement (pour respecter les rate limits)
    // mais les modules dans chaque groupe en parallèle
    for (const group of groups) {
      emit({
        type: "phase",
        data: { phase: `executing_${group.name}`, modules: group.modules.map(m => m.id) }
      });

      const groupResults = await this.executeGroup(
        group,
        target,
        emit,
        enableCache,
        timeoutPerModule
      );
      
      allResults.push(...groupResults);

      // Petit délai entre les groupes pour ne pas surcharger
      if (groups.length > 1) {
        await this.sleep(500);
      }
    }

    return allResults;
  }

  private groupByRateLimit(modules: OSINTModule[]): ExecutionGroup[] {
    const groups: Map<string, OSINTModule[]> = new Map();

    for (const mod of modules) {
      let groupName: string;
      
      if (!mod.rateLimit || mod.rateLimit === "none") {
        groupName = "local_unlimited";
      } else if (mod.rateLimit === "strict") {
        groupName = `api_strict_${mod.category}`;
      } else {
        groupName = "api_normal";
      }

      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(mod);
    }

    return Array.from(groups.entries()).map(([name, mods]) => ({
      name,
      modules: mods,
      maxConcurrency: this.getMaxConcurrency(name, mods),
      delayBetweenMs: this.getDelayBetween(name)
    }));
  }

  private getMaxConcurrency(groupName: string, modules: OSINTModule[]): number {
    if (groupName === "local_unlimited") return 5;
    if (groupName.startsWith("api_strict")) return 2;
    if (groupName === "api_normal") return 4;
    return 3;
  }

  private getDelayBetween(groupName: string): number {
    if (groupName.startsWith("api_strict")) return 1000;
    if (groupName === "api_normal") return 500;
    return 100;
  }

  private async executeGroup(
    group: ExecutionGroup,
    target: string,
    emit: EmitFunction,
    enableCache: boolean,
    timeoutMs: number
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const semaphore = new Semaphore(group.maxConcurrency);

    const promises = group.modules.map(async (mod) => {
      await semaphore.acquire();
      
      try {
        const result = await this.executeModule(
          mod,
          target,
          emit,
          enableCache,
          timeoutMs
        );
        results.push(result);
        
        // Délai entre les exécutions
        if (group.delayBetweenMs > 0) {
          await this.sleep(group.delayBetweenMs);
        }
      } finally {
        semaphore.release();
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  private async executeModule(
    module: OSINTModule,
    target: string,
    emit: EmitFunction,
    enableCache: boolean,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const moduleId = module.id;

    // Vérifier le cache
    if (enableCache) {
      const cached = await cacheManager.get<ModuleResult>(moduleId, target);
      if (cached) {
        return {
          moduleId,
          success: true,
          result: cached,
          duration: Date.now() - startTime,
          cached: true
        };
      }
    }

    try {
      // Timeout wrapper
      const result = await Promise.race([
        module.execute(target, emit),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        )
      ]);

      // Stocker dans le cache
      if (enableCache && result.success) {
        await cacheManager.set(moduleId, target, result);
      }

      return {
        moduleId,
        success: true,
        result,
        duration: Date.now() - startTime,
        cached: false
      };
    } catch (error: any) {
      return {
        moduleId,
        success: false,
        result: null,
        error: error.message || "Unknown error",
        duration: Date.now() - startTime,
        cached: false
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Sémaphore pour contrôler la concurrence
class Semaphore {
  private permits: number;
  private waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.();
    } else {
      this.permits++;
    }
  }
}

// Singleton
export const parallelExecutor = new ParallelExecutor();
export { ParallelExecutor, ExecutionResult, ExecutorOptions };
