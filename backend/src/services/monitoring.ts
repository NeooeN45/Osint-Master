/**
 * Monitoring Service - Advanced System Monitoring
 * Surveillance avancée du système OSINT Master
 * 
 * Features:
 * - Métriques système (CPU, RAM, Disk)
 * - Métriques Docker (containers, networks)
 * - Métriques applicatives (requests, errors, latency)
 * - Alertes automatiques
 * - Dashboard data pour frontend
 * 
 * Créé: 17 Avril 2026
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

// Types
interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAvg: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network: {
    interfaces: string[];
    connections: number;
  };
}

interface DockerMetrics {
  containers: {
    total: number;
    running: number;
    stopped: number;
    unhealthy: number;
  };
  images: number;
  volumes: number;
  networks: number;
}

interface AppMetrics {
  requests: {
    total: number;
    perMinute: number;
    perHour: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  latency: {
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  activeConnections: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: Date;
  message?: string;
}

export class MonitoringService extends EventEmitter {
  private systemMetrics: SystemMetrics[] = [];
  private dockerMetrics: DockerMetrics | null = null;
  private appMetrics: AppMetrics = {
    requests: { total: 0, perMinute: 0, perHour: 0 },
    errors: { total: 0, rate: 0, byType: {} },
    latency: { avg: 0, min: 0, max: 0, p95: 0, p99: 0 },
    activeConnections: 0,
  };
  private alerts: Alert[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private alertThresholds = {
    cpu: 80,
    memory: 85,
    disk: 90,
    errorRate: 5,
    latency: 1000,
  };

  // Request tracking
  private requestTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;

  constructor() {
    super();
    this.startMonitoring();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SYSTEM METRICS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Collecter les métriques système
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Calculer l'utilisation CPU
    const cpuUsage = this.calculateCPUUsage(cpus);

    // Obtenir l'utilisation disque
    const diskUsage = await this.getDiskUsage();

    // Obtenir les connexions réseau
    const networkConnections = await this.getNetworkConnections();

    const metrics: SystemMetrics = {
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage,
        loadAvg: os.loadavg(),
        cores: cpus.length,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: (usedMem / totalMem) * 100,
      },
      disk: diskUsage,
      network: {
        interfaces: Object.keys(os.networkInterfaces()),
        connections: networkConnections,
      },
    };

    // Garder les 100 dernières métriques
    this.systemMetrics.push(metrics);
    if (this.systemMetrics.length > 100) {
      this.systemMetrics.shift();
    }

    // Vérifier les alertes
    this.checkAlerts(metrics);

    return metrics;
  }

  private calculateCPUUsage(cpus: os.CpuInfo[]): number {
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - Math.floor((totalIdle / totalTick) * 100);
  }

  private async getDiskUsage(): Promise<SystemMetrics['disk']> {
    try {
      const { stdout } = await execAsync('df -k / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      const total = parseInt(parts[1]) * 1024;
      const used = parseInt(parts[2]) * 1024;
      const free = parseInt(parts[3]) * 1024;

      return {
        total,
        used,
        free,
        usagePercent: (used / total) * 100,
      };
    } catch {
      return { total: 0, used: 0, free: 0, usagePercent: 0 };
    }
  }

  private async getNetworkConnections(): Promise<number> {
    try {
      const { stdout } = await execAsync('netstat -an | wc -l');
      return parseInt(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // DOCKER METRICS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Collecter les métriques Docker
   */
  async collectDockerMetrics(): Promise<DockerMetrics> {
    try {
      // Compter les containers
      const { stdout: containersOutput } = await execAsync(
        'docker ps -a --format "{{.State}}" 2>/dev/null || echo ""'
      );
      const containerStates = containersOutput.trim().split('\n').filter(Boolean);
      
      const metrics: DockerMetrics = {
        containers: {
          total: containerStates.length,
          running: containerStates.filter(s => s === 'running').length,
          stopped: containerStates.filter(s => s === 'exited').length,
          unhealthy: containerStates.filter(s => s !== 'running' && s !== 'exited').length,
        },
        images: await this.countDockerImages(),
        volumes: await this.countDockerVolumes(),
        networks: await this.countDockerNetworks(),
      };

      this.dockerMetrics = metrics;
      return metrics;
    } catch {
      return {
        containers: { total: 0, running: 0, stopped: 0, unhealthy: 0 },
        images: 0,
        volumes: 0,
        networks: 0,
      };
    }
  }

  private async countDockerImages(): Promise<number> {
    try {
      const { stdout } = await execAsync('docker images -q 2>/dev/null | wc -l');
      return parseInt(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  private async countDockerVolumes(): Promise<number> {
    try {
      const { stdout } = await execAsync('docker volume ls -q 2>/dev/null | wc -l');
      return parseInt(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  private async countDockerNetworks(): Promise<number> {
    try {
      const { stdout } = await execAsync('docker network ls -q 2>/dev/null | wc -l');
      return parseInt(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // APP METRICS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Enregistrer une requête
   */
  recordRequest(responseTime: number, error?: string): void {
    this.requestCount++;
    this.requestTimes.push(responseTime);

    // Garder seulement les 1000 dernières valeurs
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }

    if (error) {
      this.errorCount++;
      this.appMetrics.errors.byType[error] = (this.appMetrics.errors.byType[error] || 0) + 1;
    }

    // Mettre à jour les métriques
    this.updateAppMetrics();
  }

  /**
   * Mettre à jour les métriques applicatives
   */
  private updateAppMetrics(): void {
    const times = this.requestTimes;
    const sorted = [...times].sort((a, b) => a - b);

    this.appMetrics = {
      requests: {
        total: this.requestCount,
        perMinute: Math.floor(this.requestCount / 60),
        perHour: Math.floor(this.requestCount / 3600),
      },
      errors: {
        total: this.errorCount,
        rate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
        byType: this.appMetrics.errors.byType,
      },
      latency: {
        avg: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        min: times.length > 0 ? Math.min(...times) : 0,
        max: times.length > 0 ? Math.max(...times) : 0,
        p95: this.getPercentile(sorted, 0.95),
        p99: this.getPercentile(sorted, 0.99),
      },
      activeConnections: this.appMetrics.activeConnections,
    };
  }

  private getPercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Mettre à jour les connexions actives
   */
  setActiveConnections(count: number): void {
    this.appMetrics.activeConnections = count;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ALERTS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Vérifier et créer des alertes
   */
  private checkAlerts(metrics: SystemMetrics): void {
    // CPU alert
    if (metrics.cpu.usage > this.alertThresholds.cpu) {
      this.createAlert('warning', 'High CPU usage', 'cpu', this.alertThresholds.cpu, metrics.cpu.usage);
    }

    // Memory alert
    if (metrics.memory.usagePercent > this.alertThresholds.memory) {
      this.createAlert('warning', 'High memory usage', 'memory', this.alertThresholds.memory, metrics.memory.usagePercent);
    }

    // Disk alert
    if (metrics.disk.usagePercent > this.alertThresholds.disk) {
      this.createAlert('error', 'Disk space critical', 'disk', this.alertThresholds.disk, metrics.disk.usagePercent);
    }
  }

  /**
   * Créer une alerte
   */
  private createAlert(
    type: Alert['type'],
    message: string,
    metric: string,
    threshold: number,
    currentValue: number
  ): void {
    // Éviter les doublons dans les 5 dernières minutes
    const recentAlert = this.alerts.find(
      a => a.metric === metric && !a.acknowledged && 
        (new Date().getTime() - a.timestamp.getTime()) < 5 * 60 * 1000
    );

    if (recentAlert) return;

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      metric,
      threshold,
      currentValue,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.emit('alert:created', alert);

    // Garder seulement les 100 dernières alertes
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  /**
   * Acquitter une alerte
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert:acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Obtenir les alertes actives
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Mettre à jour les seuils d'alerte
   */
  setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECKS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Enregistrer un health check
   */
  registerHealthCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.healthChecks.set(name, {
      name,
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date(),
    });

    // Exécuter le check périodiquement
    setInterval(async () => {
      const startTime = Date.now();
      try {
        const result = await checkFn();
        result.responseTime = Date.now() - startTime;
        this.healthChecks.set(name, result);
      } catch (error) {
        this.healthChecks.set(name, {
          name,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastCheck: new Date(),
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 30000);
  }

  /**
   * Obtenir tous les health checks
   */
  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MONITORING LOOP
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Démarrer le monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.collectDockerMetrics();
      
      this.emit('metrics:collected', {
        system: this.getLatestSystemMetrics(),
        docker: this.dockerMetrics,
        app: this.appMetrics,
      });
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Arrêter le monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═════════════════════════════════════════════════════════════════════════════

  getLatestSystemMetrics(): SystemMetrics | undefined {
    return this.systemMetrics[this.systemMetrics.length - 1];
  }

  getSystemMetricsHistory(): SystemMetrics[] {
    return [...this.systemMetrics];
  }

  getDockerMetrics(): DockerMetrics | null {
    return this.dockerMetrics;
  }

  getAppMetrics(): AppMetrics {
    return { ...this.appMetrics };
  }

  getAllMetrics() {
    return {
      system: this.getLatestSystemMetrics(),
      docker: this.dockerMetrics,
      app: this.appMetrics,
      alerts: this.getActiveAlerts(),
      health: this.getHealthChecks(),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // DASHBOARD DATA
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Obtenir les données pour le dashboard
   */
  getDashboardData() {
    const latest = this.getLatestSystemMetrics();
    
    return {
      overview: {
        status: this.getOverallStatus(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      resources: latest ? {
        cpu: latest.cpu.usage,
        memory: latest.memory.usagePercent,
        disk: latest.disk.usagePercent,
      } : null,
      docker: this.dockerMetrics,
      requests: this.appMetrics.requests,
      errors: this.appMetrics.errors,
      latency: this.appMetrics.latency,
      alerts: {
        active: this.getActiveAlerts().length,
        total: this.alerts.length,
        critical: this.alerts.filter(a => a.type === 'critical' && !a.acknowledged).length,
      },
    };
  }

  private getOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const latest = this.getLatestSystemMetrics();
    if (!latest) return 'unknown' as any;

    if (latest.cpu.usage > 90 || latest.memory.usagePercent > 95) {
      return 'unhealthy';
    }
    if (latest.cpu.usage > 70 || latest.memory.usagePercent > 80) {
      return 'degraded';
    }
    return 'healthy';
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═════════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

// Singleton
let monitoringService: MonitoringService | null = null;

export function getMonitoringService(): MonitoringService {
  if (!monitoringService) {
    monitoringService = new MonitoringService();
  }
  return monitoringService;
}

export function resetMonitoringService(): void {
  if (monitoringService) {
    monitoringService.dispose();
    monitoringService = null;
  }
}

export default MonitoringService;
