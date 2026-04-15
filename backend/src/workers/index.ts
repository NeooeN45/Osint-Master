// ============================================================================
// WORKER MANAGER - Gestion des workers threads
// ============================================================================

import { Worker } from "worker_threads";
import path from "path";

interface WorkerTask<T> {
  workerFile: string;
  data: any;
  timeout?: number;
}

class WorkerManager {
  private workerPool: Map<string, Worker[]> = new Map();
  private maxWorkers = 4;

  async execute<T>(task: WorkerTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const workerPath = path.resolve(__dirname, task.workerFile);
      const worker = new Worker(workerPath, {
        workerData: task.data
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("Worker timeout"));
      }, task.timeout || 300000);

      worker.on("message", (result: T) => {
        clearTimeout(timeout);
        resolve(result);
        worker.terminate();
      });

      worker.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
        worker.terminate();
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  async executeSherlock(username: string, timeout?: number) {
    return this.execute({
      workerFile: "sherlock.worker.js",
      data: { username, timeout },
      timeout: timeout || 180000
    });
  }
}

// Singleton
export const workerManager = new WorkerManager();
export { WorkerManager };
