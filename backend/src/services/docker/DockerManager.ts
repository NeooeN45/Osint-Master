// ============================================================================
// DOCKER MANAGER - Gestion automatique des conteneurs Docker pour OSINT
// Lance, supervise et nettoie les conteneurs pour chaque module
// ============================================================================

import { spawn, exec } from "child_process";
import { promisify } from "util";
import { logger } from "../../utils/logger.js";

const execAsync = promisify(exec);

interface DockerContainer {
  id: string;
  name: string;
  moduleId: string;
  status: "running" | "stopped" | "error";
  startTime: Date;
  target: string;
  outputPath: string;
}

interface DockerModuleConfig {
  image: string;
  command: string[];
  env?: Record<string, string>;
  volumes?: string[];
  network?: string;
  timeoutMs: number;
  memoryLimit?: string;
  cpuLimit?: string;
}

// Configuration des modules Docker
const DOCKER_MODULES: Record<string, DockerModuleConfig> = {
  sherlock: {
    image: "theyahya/sherlock",
    command: ["sherlock", "{target}", "--print-found", "--no-color", "--timeout", "5"],
    volumes: ["{outputDir}:/root/results"],
    timeoutMs: 300000,
    memoryLimit: "512m",
  },
  maigret: {
    image: "soxoj/maigret:latest",
    command: ["maigret", "{target}", "--top-sites", "100", "--no-color"],
    volumes: ["{outputDir}:/app/reports"],
    timeoutMs: 600000,
    memoryLimit: "1g",
  },
  theharvester: {
    image: "ghcr.io/laramies/theharvester:latest",
    command: ["python", "theHarvester.py", "-d", "{target}", "-b", "all", "-f", "/output/result"],
    volumes: ["{outputDir}:/output"],
    timeoutMs: 300000,
    memoryLimit: "512m",
  },
  dnsrecon: {
    image: "darkoperator/dnsrecon:latest",
    command: ["dnsrecon", "-o", "/output/result.json"],
    volumes: ["{outputDir}:/output"],
    timeoutMs: 180000,
    memoryLimit: "256m",
  },
  sublist3r: {
    image: "secfa/sublist3r:latest",
    command: ["python", "sublist3r.py", "-o", "/output/result.txt"],
    volumes: ["{outputDir}:/output"],
    timeoutMs: 180000,
    memoryLimit: "256m",
  },
  nmap: {
    image: "instrumentisto/nmap:latest",
    command: ["nmap", "-oX", "/output/result.xml"],
    volumes: ["{outputDir}:/output"],
    timeoutMs: 600000,
    memoryLimit: "256m",
  },
  amass: {
    image: "caffix/amass:latest",
    command: ["amass", "enum", "-o", "/output/result.txt"],
    volumes: ["{outputDir}:/output"],
    timeoutMs: 600000,
    memoryLimit: "1g",
  },
  osintgram: {
    image: "datalux/osintgram:latest",
    command: ["python", "main.py", "-o", "/output"],
    env: { "IG_USERNAME": "", "IG_PASSWORD": "" },
    volumes: ["{outputDir}:/output"],
    timeoutMs: 300000,
    memoryLimit: "512m",
  },
  instaloader: {
    image: "instaloader/instaloader:latest",
    command: ["instaloader", "--login", "{username}", "--dirname-pattern", "/output/{target}"],
    volumes: ["{outputDir}:/output"],
    timeoutMs: 300000,
    memoryLimit: "512m",
  },
  photon: {
    image: "s0md3v/photon:latest",
    command: ["python", "photon.py", "-o", "/output"],
    volumes: ["{outputDir}:/output"],
    timeoutMs: 300000,
    memoryLimit: "512m",
  },
  cloudfail: {
    image: "mrtuxx/cloudfail:latest",
    command: ["python", "cloudfail.py", "--output", "/output"],
    volumes: ["{outputDir}:/output"],
    timeoutMs: 300000,
    memoryLimit: "256m",
  },
};

export class DockerManager {
  private containers: Map<string, DockerContainer> = new Map();
  private maxConcurrent: number = 50; // Maximum 50 conteneurs simultanés
  private activeContainers: number = 0;

  constructor(maxConcurrent: number = 50) {
    this.maxConcurrent = maxConcurrent;
  }

  // Vérifier si Docker est disponible
  async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync("docker --version");
      return true;
    } catch {
      logger.warn("[DockerManager] Docker n'est pas disponible");
      return false;
    }
  }

  // Vérifier si une image existe localement
  async imageExists(image: string): Promise<boolean> {
    try {
      await execAsync(`docker images -q ${image}`);
      return true;
    } catch {
      return false;
    }
  }

  // Pull une image Docker
  async pullImage(image: string): Promise<void> {
    logger.info(`[DockerManager] Pull image: ${image}`);
    try {
      await execAsync(`docker pull ${image}`);
      logger.info(`[DockerManager] Image ${image} prête`);
    } catch (error) {
      logger.error(`[DockerManager] Erreur pull ${image}:`, error);
      throw error;
    }
  }

  // Lancer un conteneur pour un module
  async runModule(
    moduleId: string,
    target: string,
    options: Record<string, any> = {}
  ): Promise<{ containerId: string; outputPath: string }> {
    const config = DOCKER_MODULES[moduleId];
    if (!config) {
      throw new Error(`Module ${moduleId} non configuré pour Docker`);
    }

    // Attendre si on est au maximum de conteneurs
    while (this.activeContainers >= this.maxConcurrent) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    this.activeContainers++;

    const containerName = `osint-${moduleId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const outputDir = `/tmp/osint-output/${containerName}`;

    // Créer le répertoire de sortie
    await execAsync(`mkdir -p ${outputDir}`);

    // Construire la commande Docker
    const dockerArgs = [
      "run",
      "--rm",
      "--name",
      containerName,
      "-d",
      ...(config.memoryLimit ? ["--memory", config.memoryLimit] : []),
      ...(config.cpuLimit ? ["--cpus", config.cpuLimit] : []),
      ...(config.network ? ["--network", config.network] : ["--network", "host"]),
      ...(config.volumes ?? []).map((v) => ["-v", v.replace("{outputDir}", outputDir)]).flat(),
      ...Object.entries(config.env || {}).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
      config.image,
      ...config.command.map((c) =>
        c
          .replace("{target}", target)
          .replace("{username}", options.username || target)
          .replace("{outputDir}", outputDir)
      ),
    ];

    logger.info(`[DockerManager] Lancement ${moduleId} pour ${target}`);

    try {
      const { stdout } = await execAsync(`docker ${dockerArgs.join(" ")}`);
      const containerId = stdout.trim();

      const container: DockerContainer = {
        id: containerId,
        name: containerName,
        moduleId,
        status: "running",
        startTime: new Date(),
        target,
        outputPath: outputDir,
      };

      this.containers.set(containerId, container);

      return { containerId, outputPath: outputDir };
    } catch (error) {
      this.activeContainers--;
      logger.error(`[DockerManager] Erreur lancement ${moduleId}:`, error);
      throw error;
    }
  }

  // Attendre la fin d'un conteneur
  async waitForContainer(containerId: string, timeoutMs?: number): Promise<{ exitCode: number; output: string }> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Conteneur ${containerId} inconnu`);
    }

    const config = DOCKER_MODULES[container.moduleId];
    const timeout = timeoutMs || config?.timeoutMs || 300000;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        await this.stopContainer(containerId);
        reject(new Error(`Timeout après ${timeout}ms`));
      }, timeout);

      // Surveiller le conteneur
      const checkInterval = setInterval(async () => {
        try {
          const { stdout } = await execAsync(`docker inspect -f '{{.State.Status}}' ${containerId}`);
          const status = stdout.trim();

          if (status === "exited") {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);

            const { stdout: exitCodeStr } = await execAsync(
              `docker inspect -f '{{.State.ExitCode}}' ${containerId}`
            );
            const exitCode = parseInt(exitCodeStr.trim(), 10);

            // Lire la sortie
            let output = "";
            try {
              const { stdout: outputContent } = await execAsync(`cat ${container.outputPath}/result.json`);
              output = outputContent;
            } catch {
              output = "{}";
            }

            this.activeContainers--;
            container.status = exitCode === 0 ? "stopped" : "error";

            resolve({ exitCode, output });
          }
        } catch (error) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          this.activeContainers--;
          reject(error);
        }
      }, 1000);
    });
  }

  // Arrêter un conteneur
  async stopContainer(containerId: string): Promise<void> {
    try {
      await execAsync(`docker stop ${containerId}`);
      logger.info(`[DockerManager] Conteneur ${containerId} arrêté`);
    } catch (error) {
      logger.warn(`[DockerManager] Erreur arrêt ${containerId}:`, error);
    }
    this.containers.delete(containerId);
  }

  // Nettoyer tous les conteneurs
  async cleanup(): Promise<void> {
    logger.info(`[DockerManager] Nettoyage de ${this.containers.size} conteneurs`);

    for (const [id, container] of this.containers) {
      if (container.status === "running") {
        await this.stopContainer(id);
      }
    }

    // Nettoyer les conteneurs orphelins
    try {
      await execAsync(`docker ps -q -f name=osint- | xargs -r docker stop`);
      await execAsync(`docker ps -aq -f name=osint- | xargs -r docker rm`);
    } catch {
      // Ignorer les erreurs
    }

    this.containers.clear();
    this.activeContainers = 0;
  }

  // Obtenir les statistiques
  getStats(): {
    active: number;
    total: number;
    maxConcurrent: number;
    containers: DockerContainer[];
  } {
    return {
      active: this.activeContainers,
      total: this.containers.size,
      maxConcurrent: this.maxConcurrent,
      containers: Array.from(this.containers.values()),
    };
  }

  // Vérifier si un module est disponible en Docker
  isModuleAvailable(moduleId: string): boolean {
    return moduleId in DOCKER_MODULES;
  }

  // Lister les modules Docker disponibles
  getAvailableModules(): string[] {
    return Object.keys(DOCKER_MODULES);
  }
}

// Instance singleton
export const dockerManager = new DockerManager();
