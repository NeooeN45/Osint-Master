/**
 * VPN Manager - Phase 8 VPN Integration
 * Gestion des connexions VPN WireGuard
 * 
 * Features:
 * - Multi-provider support (ProtonVPN, Mullvad, NordVPN, custom)
 * - Kill switch pour éviter les fuites
 * - IP rotation automatique
 * - Health monitoring
 * - Integration avec Docker
 * 
 * Créé: 17 Avril 2026
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import axios from 'axios';

const execAsync = promisify(exec);

// Types
interface VPNConfig {
  id: string;
  name: string;
  provider: 'protonvpn' | 'mullvad' | 'nordvpn' | 'custom';
  country: string;
  city?: string;
  configFile: string;
  enabled: boolean;
}

interface VPNStatus {
  connected: boolean;
  interface: string;
  publicIP: string;
  vpnIP?: string;
  location?: {
    country: string;
    city?: string;
    region?: string;
  };
  provider: string;
  configId: string;
  uptime: number;
  bytesReceived: number;
  bytesSent: number;
  lastHandshake?: Date;
}

interface VPNStats {
  connections: number;
  disconnections: number;
  dataTransferred: number;
  avgSpeed: number;
  uptime: number;
}

interface VPNServer {
  id: string;
  provider: string;
  country: string;
  city: string;
  load: number;
  distance?: number;
}

export class VPNManager extends EventEmitter {
  private configs: Map<string, VPNConfig> = new Map();
  private status: VPNStatus = {
    connected: false,
    interface: 'wg0',
    publicIP: '',
    provider: 'none',
    configId: '',
    uptime: 0,
    bytesReceived: 0,
    bytesSent: 0,
  };
  private stats: VPNStats = {
    connections: 0,
    disconnections: 0,
    dataTransferred: 0,
    avgSpeed: 0,
    uptime: 0,
  };
  private healthCheckInterval?: NodeJS.Timeout;
  private uptimeInterval?: NodeJS.Timeout;
  private containerName: string;
  private killSwitchEnabled = true;

  constructor() {
    super();
    this.containerName = process.env.VPN_CONTAINER || 'osint-vpn';
    this.loadConfigs();
    this.startHealthChecks();
    this.startUptimeTracking();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Charger les configurations VPN depuis le filesystem
   */
  private loadConfigs(): void {
    // Configurations prédéfinies pour les providers populaires
    const defaultConfigs: VPNConfig[] = [
      {
        id: 'protonvpn-ch',
        name: 'ProtonVPN Switzerland',
        provider: 'protonvpn',
        country: 'CH',
        city: 'Zurich',
        configFile: '/config/protonvpn-ch.conf',
        enabled: true,
      },
      {
        id: 'protonvpn-nl',
        name: 'ProtonVPN Netherlands',
        provider: 'protonvpn',
        country: 'NL',
        city: 'Amsterdam',
        configFile: '/config/protonvpn-nl.conf',
        enabled: true,
      },
      {
        id: 'mullvad-se',
        name: 'Mullvad Sweden',
        provider: 'mullvad',
        country: 'SE',
        city: 'Stockholm',
        configFile: '/config/mullvad-se.conf',
        enabled: true,
      },
    ];

    defaultConfigs.forEach(config => {
      this.configs.set(config.id, config);
    });
  }

  /**
   * Ajouter une configuration VPN
   */
  addConfig(config: Omit<VPNConfig, 'id'>): VPNConfig {
    const id = `vpn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullConfig: VPNConfig = { ...config, id };
    
    this.configs.set(id, fullConfig);
    this.emit('config:added', fullConfig);
    
    return fullConfig;
  }

  /**
   * Supprimer une configuration
   */
  removeConfig(configId: string): boolean {
    const config = this.configs.get(configId);
    if (!config) return false;

    // Déconnecter si c'est la config active
    if (this.status.configId === configId && this.status.connected) {
      this.disconnect();
    }

    this.configs.delete(configId);
    this.emit('config:removed', config);
    return true;
  }

  /**
   * Lister toutes les configurations
   */
  listConfigs(): VPNConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Obtenir une configuration
   */
  getConfig(configId: string): VPNConfig | undefined {
    return this.configs.get(configId);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // VPN CONNECTION
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Connecter au VPN
   */
  async connect(configId: string): Promise<boolean> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`VPN config '${configId}' not found`);
    }

    // Déconnecter d'abord si déjà connecté
    if (this.status.connected) {
      await this.disconnect();
    }

    try {
      console.log(`[VPNManager] Connecting to ${config.name}...`);

      // Exécuter la connexion dans le container Docker
      await this.executeInContainer(`/scripts/connect.sh`);

      // Attendre que la connexion soit établie
      await this.waitForConnection();

      // Mettre à jour le statut
      this.status.connected = true;
      this.status.configId = configId;
      this.status.provider = config.provider;
      this.status.uptime = 0;

      // Activer le kill switch si nécessaire
      if (this.killSwitchEnabled) {
        await this.enableKillSwitch();
      }

      // Obtenir les infos IP
      await this.refreshIPInfo();

      this.stats.connections++;
      this.emit('vpn:connected', { ...this.status });

      console.log(`[VPNManager] Connected to ${config.name}`);
      console.log(`[VPNManager] Public IP: ${this.status.publicIP}`);
      console.log(`[VPNManager] Location: ${this.status.location?.country}, ${this.status.location?.city}`);

      return true;
    } catch (error) {
      console.error('[VPNManager] Connection failed:', error);
      this.emit('vpn:error', { error, configId });
      return false;
    }
  }

  /**
   * Déconnecter le VPN
   */
  async disconnect(): Promise<boolean> {
    if (!this.status.connected) {
      return true;
    }

    try {
      console.log('[VPNManager] Disconnecting...');

      // Désactiver le kill switch d'abord
      await this.disableKillSwitch();

      // Déconnecter
      await this.executeInContainer(`/scripts/disconnect.sh`);

      this.status.connected = false;
      this.status.configId = '';
      this.status.provider = 'none';
      this.status.vpnIP = undefined;
      this.status.uptime = 0;

      this.stats.disconnections++;
      this.emit('vpn:disconnected', { ...this.status });

      console.log('[VPNManager] Disconnected');
      return true;
    } catch (error) {
      console.error('[VPNManager] Disconnection error:', error);
      return false;
    }
  }

  /**
   * Rotation IP (reconnecter avec nouvelle config)
   */
  async rotate(): Promise<boolean> {
    console.log('[VPNManager] Rotating VPN...');

    // Obtenir une nouvelle configuration
    const availableConfigs = this.listConfigs().filter(c => c.enabled && c.id !== this.status.configId);
    if (availableConfigs.length === 0) {
      console.warn('[VPNManager] No alternative configs available for rotation');
      return false;
    }

    // Choisir une config aléatoire
    const newConfig = availableConfigs[Math.floor(Math.random() * availableConfigs.length)];

    // Déconnecter et reconnecter
    await this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await this.connect(newConfig.id);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // KILL SWITCH
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Activer le kill switch
   */
  async enableKillSwitch(): Promise<void> {
    console.log('[VPNManager] Enabling kill switch...');
    await this.executeInContainer(`/scripts/killswitch.sh`);
    this.killSwitchEnabled = true;
  }

  /**
   * Désactiver le kill switch
   */
  async disableKillSwitch(): Promise<void> {
    console.log('[VPNManager] Disabling kill switch...');
    await this.executeInContainer(`/scripts/killswitch_off.sh`);
    this.killSwitchEnabled = false;
  }

  /**
   * Toggle kill switch
   */
  async toggleKillSwitch(): Promise<boolean> {
    if (this.killSwitchEnabled) {
      await this.disableKillSwitch();
    } else {
      await this.enableKillSwitch();
    }
    return this.killSwitchEnabled;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // IP & LOCATION
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Rafraîchir les infos IP
   */
  async refreshIPInfo(): Promise<void> {
    try {
      // IP publique
      const publicIP = await this.getPublicIP();
      this.status.publicIP = publicIP;

      // IP VPN (depuis l'interface)
      const vpnIP = await this.getVPNIP();
      this.status.vpnIP = vpnIP;

      // Localisation
      const location = await this.getIPLocation(publicIP);
      this.status.location = location;

      this.emit('vpn:ip:updated', { publicIP, vpnIP, location });
    } catch (error) {
      console.error('[VPNManager] Failed to refresh IP info:', error);
    }
  }

  /**
   * Obtenir l'IP publique
   */
  private async getPublicIP(): Promise<string> {
    try {
      const result = await this.executeInContainer(`/scripts/check_ip.sh`);
      // Parser l'output pour extraire l'IP
      const match = result.match(/Public IP:\s*(.+)/);
      return match ? match[1].trim() : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Obtenir l'IP VPN
   */
  private async getVPNIP(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(
        `docker exec ${this.containerName} ip addr show wg0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d'/' -f1`
      );
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Obtenir la localisation d'une IP
   */
  private async getIPLocation(ip: string): Promise<{ country: string; city?: string; region?: string }> {
    try {
      const response = await axios.get(`https://ipinfo.io/${ip}/json`, { timeout: 10000 });
      const data = response.data as any;
      return {
        country: data.country || 'unknown',
        city: data.city,
        region: data.region,
      };
    } catch {
      return { country: 'unknown' };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // DOCKER EXECUTION
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Exécuter une commande dans le container VPN
   */
  private async executeInContainer(command: string): Promise<string> {
    const { stdout, stderr } = await execAsync(`docker exec ${this.containerName} ${command}`);
    if (stderr && !stderr.includes('Warning')) {
      console.warn(`[VPNManager] Container stderr: ${stderr}`);
    }
    return stdout;
  }

  /**
   * Attendre que la connexion soit établie
   */
  private async waitForConnection(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const healthy = await this.checkHealth();
        if (healthy) return;
      } catch {}
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('VPN connection timeout');
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECKS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Vérifier la santé du VPN
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.executeInContainer(`/scripts/healthcheck.sh`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Démarrer les health checks périodiques
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this.checkHealth();
      
      if (!healthy && this.status.connected) {
        console.error('[VPNManager] VPN health check failed!');
        this.emit('vpn:unhealthy', { status: this.status });
        
        // Tenter de reconnecter
        if (this.status.configId) {
          console.log('[VPNManager] Attempting to reconnect...');
          await this.connect(this.status.configId);
        }
      }
    }, 30000); // Check toutes les 30 secondes
  }

  /**
   * Suivi du uptime
   */
  private startUptimeTracking(): void {
    this.uptimeInterval = setInterval(() => {
      if (this.status.connected) {
        this.status.uptime += 1;
        this.stats.uptime += 1;
      }
    }, 1000);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═════════════════════════════════════════════════════════════════════════════

  getStatus(): VPNStatus {
    return { ...this.status };
  }

  getStats(): VPNStats {
    return { ...this.stats };
  }

  isKillSwitchEnabled(): boolean {
    return this.killSwitchEnabled;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═════════════════════════════════════════════════════════════════════════════

  async dispose(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
    }

    if (this.status.connected) {
      await this.disconnect();
    }

    this.removeAllListeners();
  }
}

// Singleton
let vpnManager: VPNManager | null = null;

export function getVPNManager(): VPNManager {
  if (!vpnManager) {
    vpnManager = new VPNManager();
  }
  return vpnManager;
}

export function resetVPNManager(): void {
  if (vpnManager) {
    vpnManager.dispose().catch(console.error);
    vpnManager = null;
  }
}

export default VPNManager;
