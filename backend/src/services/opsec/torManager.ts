/**
 * Tor Manager - Phase 1 OPSEC Foundation
 * Gestion complète du processus Tor pour anonymisation
 * 
 * Fonctionnalités:
 * - Démarrage/Arrêt automatique de Tor
 * - Rotation d'identité (NEWNYM)
 * - Vérification de connexion Tor
 * - Proxy SOCKS5 automatique
 * 
 * Créé: 17 Avril 2026 - Phase 1 OPSEC
 * Fichier: backend/src/services/opsec/torManager.ts
 */

import { spawn, ChildProcess } from 'child_process';
import { createConnection } from 'net';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

// Configuration Tor
const TOR_CONFIG = {
  socksPort: 9050,           // Port SOCKS5 par défaut
  controlPort: 9051,         // Port Control (pour NEWNYM)
  controlPassword: 'osint_master_2026',  // Mot de passe ControlPort
  host: '127.0.0.1',
  checkInterval: 30000,      // Vérifier toutes les 30s
  identityRotationInterval: 600000,  // Rotation identité toutes les 10min
};

// Types
export interface TorStatus {
  isRunning: boolean;
  isConnected: boolean;
  currentIP?: string;
  country?: string;
  circuitEstablished: boolean;
  lastRotation: Date;
  uptime: number;  // secondes
}

export interface TorConfig {
  socksPort: number;
  controlPort: number;
  controlPassword: string;
  useBridges?: boolean;
  bridges?: string[];
}

// État global
let torProcess: ChildProcess | null = null;
let status: TorStatus = {
  isRunning: false,
  isConnected: false,
  circuitEstablished: false,
  lastRotation: new Date(),
  uptime: 0,
};
let uptimeInterval: NodeJS.Timeout | null = null;
let rotationInterval: NodeJS.Timeout | null = null;

/**
 * Vérifie si Tor est déjà en cours d'exécution
 */
export async function isTorRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection(TOR_CONFIG.socksPort, TOR_CONFIG.host);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    // Timeout après 2 secondes
    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000);
  });
}

/**
 * Démarrer le processus Tor
 */
export async function startTor(customConfig?: Partial<TorConfig>): Promise<boolean> {
  try {
    // Vérifier si Tor est déjà en cours
    if (await isTorRunning()) {
      console.log('[TorManager] Tor is already running');
      status.isRunning = true;
      return true;
    }

    const config = { ...TOR_CONFIG, ...customConfig };
    
    // Vérifier la présence de Tor
    const torCommand = process.platform === 'win32' ? 'tor.exe' : 'tor';
    
    // Options Tor
    const torArgs = [
      '--SocksPort', config.socksPort.toString(),
      '--ControlPort', config.controlPort.toString(),
      '--HashedControlPassword', config.controlPassword,
      '--MaxCircuitDirtiness', '10',  // Circuits changent toutes les 10 secondes max
      '--NewCircuitPeriod', '10',
      '--UseEntryGuards', '1',
    ];

    // Ajouter des bridges si configuré (pour contourner la censure)
    if (config.useBridges && config.bridges) {
      config.bridges.forEach((bridge: string) => {
        torArgs.push('--Bridge', bridge);
      });
      torArgs.push('--UseBridges', '1');
    }

    console.log('[TorManager] Starting Tor...');
    
    torProcess = spawn(torCommand, torArgs, {
      detached: false,
      windowsHide: true,  // Cacher la fenêtre sur Windows
    });

    // Gestion des logs
    torProcess.stdout?.on('data', (data) => {
      const log = data.toString();
      console.log('[Tor]', log.trim());
      
      // Détecter quand le circuit est établi
      if (log.includes('Bootstrapped 100%')) {
        status.circuitEstablished = true;
        console.log('[TorManager] Circuit established!');
      }
    });

    torProcess.stderr?.on('data', (data) => {
      console.error('[Tor Error]', data.toString().trim());
    });

    torProcess.on('close', (code) => {
      console.log(`[TorManager] Tor process exited with code ${code}`);
      status.isRunning = false;
      torProcess = null;
    });

    // Attendre que Tor démarre
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Vérifier la connexion
    const connected = await verifyTorConnection();
    
    if (connected) {
      status.isRunning = true;
      status.isConnected = true;
      status.lastRotation = new Date();
      
      // Démarrer le compteur d'uptime
      startUptimeCounter();
      
      // Configurer la rotation automatique
      setupAutoRotation(config.identityRotationInterval);
      
      console.log('[TorManager] Tor started successfully');
      return true;
    } else {
      console.error('[TorManager] Tor failed to connect');
      await stopTor();
      return false;
    }
    
  } catch (error) {
    console.error('[TorManager] Error starting Tor:', error);
    return false;
  }
}

/**
 * Arrêter le processus Tor
 */
export async function stopTor(): Promise<boolean> {
  try {
    console.log('[TorManager] Stopping Tor...');
    
    // Arrêter les intervalles
    if (uptimeInterval) {
      clearInterval(uptimeInterval);
      uptimeInterval = null;
    }
    
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
    
    // Tuer le processus
    if (torProcess) {
      torProcess.kill('SIGTERM');
      
      // Attendre un peu puis forcer si nécessaire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!torProcess.killed) {
        torProcess.kill('SIGKILL');
      }
      
      torProcess = null;
    }
    
    // Réinitialiser le statut
    status = {
      isRunning: false,
      isConnected: false,
      circuitEstablished: false,
      lastRotation: new Date(),
      uptime: 0,
    };
    
    console.log('[TorManager] Tor stopped');
    return true;
    
  } catch (error) {
    console.error('[TorManager] Error stopping Tor:', error);
    return false;
  }
}

/**
 * Demander une nouvelle identité Tor (nouveau circuit)
 */
export async function newIdentity(): Promise<boolean> {
  try {
    console.log('[TorManager] Requesting new identity...');
    
    // Connexion au ControlPort
    const net = require('net');
    const client = net.createConnection({
      host: TOR_CONFIG.host,
      port: TOR_CONFIG.controlPort,
    });

    return new Promise((resolve, reject) => {
      client.on('connect', () => {
        // Authentification
        client.write(`AUTHENTICATE "${TOR_CONFIG.controlPassword}"\r\n`);
      });

      client.on('data', (data: Buffer) => {
        const response = data.toString();
        
        if (response.includes('250 OK')) {
          if (response.includes('AUTHENTICATE')) {
            // Authentifié, demander nouvelle identité
            client.write('SIGNAL NEWNYM\r\n');
          } else {
            // Nouvelle identité accordée
            client.write('QUIT\r\n');
            client.end();
            
            status.lastRotation = new Date();
            console.log('[TorManager] New identity granted');
            
            // Attendre que le nouveau circuit s'établisse
            setTimeout(() => resolve(true), 3000);
          }
        } else if (response.includes('514')) {
          // Erreur d'authentification
          client.end();
          reject(new Error('Tor authentication failed'));
        }
      });

      client.on('error', (err: Error) => {
        console.error('[TorManager] Control port error:', err);
        reject(err);
      });
      
      // Timeout
      setTimeout(() => {
        client.end();
        reject(new Error('Timeout requesting new identity'));
      }, 10000);
    });
    
  } catch (error) {
    console.error('[TorManager] Error requesting new identity:', error);
    return false;
  }
}

/**
 * Vérifier la connexion Tor et obtenir l'IP
 */
export async function verifyTorConnection(): Promise<boolean> {
  try {
    const proxyUrl = `socks5h://${TOR_CONFIG.host}:${TOR_CONFIG.socksPort}`;
    const agent = new SocksProxyAgent(proxyUrl);
    
    // Vérifier via check.torproject.org
    const response = await axios.get('https://check.torproject.org/api/ip', {
      httpsAgent: agent as any,
      timeout: 10000,
    } as any);
    
    if (response.data && (response.data as any).IsTor) {
      status.isConnected = true;
      status.currentIP = (response.data as any).IP;
      
      // Obtenir le pays via ipapi.co
      try {
        const geoResponse = await axios.get(`https://ipapi.co/${status.currentIP}/country_name/`, {
          httpsAgent: agent as any,
          timeout: 5000,
        } as any);
        status.country = geoResponse.data as string;
      } catch {
        status.country = 'Unknown';
      }
      
      console.log(`[TorManager] Tor connection verified: ${status.currentIP} (${status.country})`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('[TorManager] Tor connection verification failed:', error);
    status.isConnected = false;
    return false;
  }
}

/**
 * Obtenir le statut actuel de Tor
 */
export function getTorStatus(): TorStatus {
  return { ...status };
}

/**
 * Obtenir l'agent proxy SOCKS5 pour axios
 */
export function getTorProxyAgent(): SocksProxyAgent {
  const proxyUrl = `socks5h://${TOR_CONFIG.host}:${TOR_CONFIG.socksPort}`;
  return new SocksProxyAgent(proxyUrl);
}

/**
 * Configuration axios avec proxy Tor
 */
export function createTorAxiosConfig() {
  return {
    httpsAgent: getTorProxyAgent(),
    timeout: 30000,
    headers: {
      'User-Agent': getRandomUserAgent(),
    },
  };
}

/**
 * Démarrer le compteur d'uptime
 */
function startUptimeCounter(): void {
  if (uptimeInterval) clearInterval(uptimeInterval);
  
  uptimeInterval = setInterval(() => {
    status.uptime += 1;
  }, 1000);
}

/**
 * Configurer la rotation automatique d'identité
 */
function setupAutoRotation(intervalMs: number): void {
  if (rotationInterval) clearInterval(rotationInterval);
  
  rotationInterval = setInterval(async () => {
    console.log('[TorManager] Auto-rotating identity...');
    await newIdentity();
  }, intervalMs);
}

/**
 * Pool de User-Agents réalistes
 */
function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Health check complet
 */
export async function torHealthCheck(): Promise<{
  healthy: boolean;
  issues: string[];
  status: TorStatus;
}> {
  const issues: string[] = [];
  
  // Vérifier si Tor tourne
  const running = await isTorRunning();
  if (!running) {
    issues.push('Tor process is not running');
  }
  
  // Vérifier la connexion
  const connected = await verifyTorConnection();
  if (!connected) {
    issues.push('Tor connection verification failed');
  }
  
  return {
    healthy: running && connected,
    issues,
    status: getTorStatus(),
  };
}

// Export par défaut
export default {
  startTor,
  stopTor,
  newIdentity,
  verifyTorConnection,
  getTorStatus,
  getTorProxyAgent,
  createTorAxiosConfig,
  isTorRunning,
  torHealthCheck,
  TOR_CONFIG,
};
