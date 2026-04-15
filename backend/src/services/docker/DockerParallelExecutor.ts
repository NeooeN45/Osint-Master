// ============================================================================
// DOCKER PARALLEL EXECUTOR
// Lance des centaines de modules OSINT en parallèle via Docker
// Gestion intelligente: queue, retry, timeout, cleanup auto
// ============================================================================

import { EventEmitter } from "events";
import { dockerManager } from "./DockerManager.js";
import { logger } from "../../utils/logger.js";

export interface DockerJob {
  moduleId: string;
  target: string;
  options?: Record<string, any>;
  priority?: number;
  retries?: number;
}

export interface DockerJobResult {
  moduleId: string;
  target: string;
  success: boolean;
  output: any;
  duration: number;
  error?: string;
  containerId?: string;
}

export class DockerParallelExecutor extends EventEmitter {
  private queue: DockerJob[] = [];
  private running: Set<string> = new Set();
  private results: DockerJobResult[] = [];
  private maxConcurrent: number;

  constructor(maxConcurrent = 50) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  // ---- Ajouter des jobs à la queue ----
  enqueue(...jobs: DockerJob[]): void {
    // Trier par priorité (plus élevée = premier)
    this.queue.push(...jobs);
    this.queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  // ---- Lancer l'exécution ----
  async execute(onResult?: (result: DockerJobResult) => void): Promise<DockerJobResult[]> {
    const isAvailable = await dockerManager.isDockerAvailable();
    if (!isAvailable) {
      logger.warn("[DockerParallelExecutor] Docker non disponible, skip");
      return [];
    }

    this.results = [];
    const allJobs = [...this.queue];
    this.queue = [];

    logger.info(`[DockerParallelExecutor] Lancement de ${allJobs.length} jobs Docker`);

    // Traitement par batch
    const batchSize = this.maxConcurrent;
    for (let i = 0; i < allJobs.length; i += batchSize) {
      const batch = allJobs.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((job) => this.runJob(job))
      );

      for (const settled of batchResults) {
        const result = settled.status === "fulfilled"
          ? settled.value
          : {
              moduleId: "unknown",
              target: "unknown",
              success: false,
              output: null,
              duration: 0,
              error: settled.reason?.message,
            };

        this.results.push(result);
        this.emit("result", result);
        onResult?.(result);
      }
    }

    return this.results;
  }

  // ---- Exécuter un seul job ----
  private async runJob(job: DockerJob): Promise<DockerJobResult> {
    const jobKey = `${job.moduleId}:${job.target}`;
    const startTime = Date.now();

    if (!dockerManager.isModuleAvailable(job.moduleId)) {
      return {
        moduleId: job.moduleId,
        target: job.target,
        success: false,
        output: null,
        duration: 0,
        error: "Module non configuré pour Docker",
      };
    }

    this.running.add(jobKey);
    this.emit("start", { moduleId: job.moduleId, target: job.target });

    let attempt = 0;
    const maxRetries = job.retries ?? 1;

    while (attempt < maxRetries) {
      try {
        const { containerId, outputPath } = await dockerManager.runModule(
          job.moduleId,
          job.target,
          job.options ?? {}
        );

        const { exitCode, output } = await dockerManager.waitForContainer(containerId);

        const duration = Date.now() - startTime;
        this.running.delete(jobKey);
        this.emit("done", { moduleId: job.moduleId, target: job.target, duration });

        let parsed: any = null;
        try {
          parsed = JSON.parse(output);
        } catch {
          parsed = { raw: output };
        }

        return {
          moduleId: job.moduleId,
          target: job.target,
          success: exitCode === 0,
          output: parsed,
          duration,
          containerId,
        };
      } catch (error: any) {
        attempt++;
        if (attempt >= maxRetries) {
          this.running.delete(jobKey);
          return {
            moduleId: job.moduleId,
            target: job.target,
            success: false,
            output: null,
            duration: Date.now() - startTime,
            error: error.message,
          };
        }
        // Attente exponentielle avant retry
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    this.running.delete(jobKey);
    return {
      moduleId: job.moduleId,
      target: job.target,
      success: false,
      output: null,
      duration: Date.now() - startTime,
      error: "Max retries atteint",
    };
  }

  getStats() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.results.length,
      success: this.results.filter((r) => r.success).length,
    };
  }
}

export const dockerParallelExecutor = new DockerParallelExecutor(50);
