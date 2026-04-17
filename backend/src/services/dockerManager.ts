/**
 * Docker Manager - Phase 3 Docker Booster
 * Gestion des containers Docker depuis le backend Node.js
 * 
 * Features:
 * - Exécution de commandes dans les containers d'outils
 * - Gestion du proxy Tor
 * - Health check des services
 * - Logs streaming
 * 
 * Créé: 17 Avril 2026 - Phase 3 Docker Booster
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import path from 'path';

const execAsync = promisify(exec);

// Types
interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: Record<string, string[]>;
  health?: string;
}

interface ToolExecution {
  id: string;
  tool: string;
  target: string;
  container: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  pid?: number;
  exitCode?: number;
  output: string;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

interface TorStatus {
  running: boolean;
  connected: boolean;
  ip?: string;
  isTor: boolean;
  lastRotation?: Date;
  circuitEstablished: boolean;
}

export class DockerManager extends EventEmitter {
  private containers: Map<string, DockerContainer> = new Map();
  private executions: Map<string, ToolExecution> = new Map();
  private torStatus: TorStatus = {
    running: false,
    connected: false,
    circuitEstablished: false,
  };
  private healthCheckInterval?: NodeJS.Timeout;
  private torProxyHost: string;
  private torProxyPort: number;
  private toolsContainer: string;

  constructor() {
    super();
    this.torProxyHost = process.env.TOR_PROXY_HOST || 'tor-proxy';
    this.torProxyPort = parseInt(process.env.TOR_PROXY_PORT || '9050');
    this.toolsContainer = process.env.TOOLS_CONTAINER || 'osint-tools';
    
    this.startHealthChecks();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TOR MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Vérifier le statut de Tor
   */
  async checkTorStatus(): Promise<TorStatus> {
    try {
      // Vérifier si le container Tor tourne
      const { stdout } = await execAsync(
        `docker ps --filter "name=osint-tor" --format "{{.State}}"`
      );
      
      const state = stdout.trim();
      this.torStatus.running = state === 'running';

      if (!this.torStatus.running) {
        this.torStatus.connected = false;
        this.torStatus.circuitEstablished = false;
        return this.torStatus;
      }

      // Vérifier la connexion via l'API Tor
      const checkResult = await this.checkTorConnection();
      this.torStatus = { ...this.torStatus, ...checkResult };

      return this.torStatus;
    } catch (error) {
      this.torStatus.running = false;
      this.torStatus.connected = false;
      return this.torStatus;
    }
  }

  /**
   * Vérifier la connexion Tor via check.torproject.org
   */
  private async checkTorConnection(): Promise<Partial<TorStatus>> {
    try {
      const { stdout } = await execAsync(
        `curl --socks5 ${this.torProxyHost}:${this.torProxyPort} --max-time 10 -s https://check.torproject.org/api/ip 2>/dev/null || echo '{"IsTor":false}'`
      );
      
      const data = JSON.parse(stdout);
      return {
        connected: true,
        isTor: data.IsTor,
        ip: data.IP,
        circuitEstablished: data.IsTor,
      };
    } catch {
      return {
        connected: false,
        isTor: false,
        circuitEstablished: false,
      };
    }
  }

  /**
   * Forcer une rotation d'identité Tor (NEWNYM)
   */
  async rotateTorIdentity(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker exec osint-tor tor-rotate.py --rotate 2>/dev/null || echo '{"success":false}'`
      );
      
      this.torStatus.lastRotation = new Date();
      this.emit('tor:rotated', this.torStatus);
      
      return true;
    } catch (error) {
      console.error('[DockerManager] Erreur rotation Tor:', error);
      return false;
    }
  }

  /**
   * Démarrer/Arrêter le container Tor
   */
  async controlTor(action: 'start' | 'stop' | 'restart'): Promise<boolean> {
    try {
      await execAsync(`docker ${action} osint-tor`);
      
      // Attendre que le service soit prêt
      if (action === 'start' || action === 'restart') {
        await this.waitForTorReady();
      }
      
      this.emit('tor:controlled', { action, status: this.torStatus });
      return true;
    } catch (error) {
      console.error(`[DockerManager] Erreur ${action} Tor:`, error);
      return false;
    }
  }

  /**
   * Attendre que Tor soit prêt
   */
  private async waitForTorReady(timeout: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.checkTorStatus();
      if (status.connected && status.circuitEstablished) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CONTAINER MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Lister tous les containers du projet
   */
  async listContainers(): Promise<DockerContainer[]> {
    try {
      const { stdout } = await execAsync(
        `docker ps -a --filter "label=maintainer=OSINT Master" --format "{{json .}}"`
      );
      
      const lines = stdout.trim().split('\n').filter(l => l);
      const containers: DockerContainer[] = lines.map(line => {
        const data = JSON.parse(line);
        return {
          id: data.ID,
          name: data.Names,
          image: data.Image,
          status: data.Status,
          state: data.State,
          ports: this.parsePorts(data.Ports),
          health: data.Health,
        };
      });
      
      // Mettre à jour le cache
      this.containers.clear();
      containers.forEach(c => this.containers.set(c.name, c));
      
      return containers;
    } catch (error) {
      console.error('[DockerManager] Erreur listContainers:', error);
      return [];
    }
  }

  /**
   * Parser les ports Docker
   */
  private parsePorts(portsStr: string): Record<string, string[]> {
    const ports: Record<string, string[]> = {};
    if (!portsStr) return ports;
    
    const mappings = portsStr.split(', ');
    mappings.forEach(mapping => {
      const match = mapping.match(/(\d+)\/(\w+) -> .*:(\d+)/);
      if (match) {
        const [, containerPort, protocol, hostPort] = match;
        const key = `${containerPort}/${protocol}`;
        if (!ports[key]) ports[key] = [];
        ports[key].push(hostPort);
      }
    });
    
    return ports;
  }

  /**
   * Obtenir les logs d'un container
   */
  async getContainerLogs(containerName: string, lines: number = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker logs --tail ${lines} ${containerName} 2>&1`
      );
      return stdout;
    } catch (error) {
      return `Erreur: ${error}`;
    }
  }

  /**
   * Stream logs d'un container
   */
  streamContainerLogs(containerName: string, callback: (log: string) => void): () => void {
    const process = spawn('docker', ['logs', '-f', containerName]);
    
    process.stdout.on('data', (data) => {
      callback(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      callback(`[stderr] ${data.toString()}`);
    });
    
    return () => {
      process.kill();
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TOOL EXECUTION
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Exécuter un outil OSINT dans le container
   */
  async executeTool(
    tool: string,
    target: string,
    options: string[] = [],
    useTor: boolean = true
  ): Promise<ToolExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Construire la commande
    let command: string;
    
    if (useTor) {
      // Utiliser proxychains pour router via Tor
      command = `proxychains4 -f /tmp/proxychains.conf ${tool} ${target} ${options.join(' ')}`;
    } else {
      command = `${tool} ${target} ${options.join(' ')}`;
    }
    
    const execution: ToolExecution = {
      id: executionId,
      tool,
      target,
      container: this.toolsContainer,
      command,
      status: 'running',
      output: '',
      startTime: new Date(),
    };
    
    this.executions.set(executionId, execution);
    this.emit('execution:started', execution);
    
    // Exécuter dans un processus séparé
    const childProcess = spawn('docker', [
      'exec',
      '-i',
      this.toolsContainer,
      'bash',
      '-c',
      command,
    ]);
    
    execution.pid = childProcess.pid;
    
    // Collecter la sortie
    let output = '';
    let error = '';
    
    childProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      execution.output = output;
      this.emit('execution:output', { id: executionId, chunk });
    });
    
    childProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      error += chunk;
      execution.error = error;
      this.emit('execution:error', { id: executionId, chunk });
    });
    
    childProcess.on('close', (code) => {
      execution.status = code === 0 ? 'completed' : 'failed';
      execution.exitCode = code ?? undefined;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      this.emit('execution:completed', execution);
    });
    
    return execution;
  }

  /**
   * Obtenir le statut d'une exécution
   */
  getExecution(id: string): ToolExecution | undefined {
    return this.executions.get(id);
  }

  /**
   * Lister toutes les exécutions
   */
  listExecutions(): ToolExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Stream exécution en temps réel
   */
  streamExecution(executionId: string, callback: (data: { type: 'output' | 'error' | 'complete'; data: any }) => void): void {
    const execution = this.executions.get(executionId);
    if (!execution) {
      callback({ type: 'error', data: 'Execution not found' });
      return;
    }
    
    // Si déjà terminé, envoyer le résultat complet
    if (execution.status !== 'running') {
      callback({ type: 'complete', data: execution });
      return;
    }
    
    // S'inscrire aux événements
    const onOutput = (evt: { id: string; chunk: string }) => {
      if (evt.id === executionId) {
        callback({ type: 'output', data: evt.chunk });
      }
    };
    
    const onError = (evt: { id: string; chunk: string }) => {
      if (evt.id === executionId) {
        callback({ type: 'error', data: evt.chunk });
      }
    };
    
    const onComplete = (evt: ToolExecution) => {
      if (evt.id === executionId) {
        callback({ type: 'complete', data: evt });
        this.off('execution:output', onOutput);
        this.off('execution:error', onError);
        this.off('execution:completed', onComplete);
      }
    };
    
    this.on('execution:output', onOutput);
    this.on('execution:error', onError);
    this.on('execution:completed', onComplete);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECKS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Démarrer les health checks périodiques
   */
  private startHealthChecks(): void {
    // Check toutes les 30 secondes
    this.healthCheckInterval = setInterval(async () => {
      await this.checkTorStatus();
      await this.listContainers();
      
      this.emit('health:check', {
        tor: this.torStatus,
        containers: Array.from(this.containers.values()),
      });
    }, 30000);
  }

  /**
   * Arrêter les health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Obtenir le statut complet du système
   */
  async getSystemStatus(): Promise<{
    tor: TorStatus;
    containers: DockerContainer[];
    executions: ToolExecution[];
  }> {
    return {
      tor: await this.checkTorStatus(),
      containers: await this.listContainers(),
      executions: this.listExecutions(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Nettoyer les exécutions terminées
   */
  cleanupExecutions(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, execution] of this.executions) {
      if (execution.endTime && (now - execution.endTime.getTime()) > maxAge) {
        this.executions.delete(id);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.stopHealthChecks();
    this.removeAllListeners();
  }
}

// Singleton instance
let dockerManager: DockerManager | null = null;

export function getDockerManager(): DockerManager {
  if (!dockerManager) {
    dockerManager = new DockerManager();
  }
  return dockerManager;
}

export function resetDockerManager(): void {
  if (dockerManager) {
    dockerManager.dispose();
    dockerManager = null;
  }
}

export default DockerManager;
