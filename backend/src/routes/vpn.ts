/**
 * VPN Routes - WireGuard VPN Management API
 * API endpoints pour la gestion du VPN
 * 
 * Créé: 17 Avril 2026
 */

import { Router, Request, Response } from 'express';
import { getVPNManager } from '../services/vpnManager';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const vpnManager = getVPNManager();

// ═════════════════════════════════════════════════════════════════════════════
// STATUS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /vpn/status
 * Obtenir le statut du VPN
 */
router.get('/status', authMiddleware, (req: Request, res: Response) => {
  const status = vpnManager.getStatus();
  const stats = vpnManager.getStats();
  
  res.json({
    success: true,
    data: {
      status,
      stats,
      killSwitch: vpnManager.isKillSwitchEnabled(),
    },
  });
});

/**
 * GET /vpn/health
 * Health check du VPN
 */
router.get('/health', authMiddleware, async (req: Request, res: Response) => {
  const healthy = await vpnManager.checkHealth();
  
  res.json({
    success: true,
    healthy,
    timestamp: new Date().toISOString(),
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CONNECTION CONTROL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /vpn/connect
 * Connecter au VPN
 */
router.post('/connect', authMiddleware, async (req: Request, res: Response) => {
  const { configId } = req.body;
  
  if (!configId) {
    res.status(400).json({
      success: false,
      error: 'Config ID required',
    });
    return;
  }

  try {
    const result = await vpnManager.connect(configId);
    
    res.json({
      success: result,
      message: result ? 'VPN connected' : 'Failed to connect VPN',
      status: vpnManager.getStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'VPN connection failed',
    });
  }
});

/**
 * POST /vpn/disconnect
 * Déconnecter le VPN
 */
router.post('/disconnect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await vpnManager.disconnect();
    
    res.json({
      success: result,
      message: result ? 'VPN disconnected' : 'Failed to disconnect VPN',
      status: vpnManager.getStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'VPN disconnection failed',
    });
  }
});

/**
 * POST /vpn/rotate
 * Rotation IP (reconnect avec nouvelle config)
 */
router.post('/rotate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await vpnManager.rotate();
    
    res.json({
      success: result,
      message: result ? 'VPN rotated' : 'VPN rotation failed',
      status: vpnManager.getStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'VPN rotation failed',
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /vpn/configs
 * Lister les configurations VPN
 */
router.get('/configs', authMiddleware, (req: Request, res: Response) => {
  const configs = vpnManager.listConfigs();
  
  res.json({
    success: true,
    count: configs.length,
    data: configs,
  });
});

/**
 * GET /vpn/configs/:id
 * Obtenir une configuration
 */
router.get('/configs/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const config = vpnManager.getConfig(id);
  
  if (!config) {
    res.status(404).json({
      success: false,
      error: 'Config not found',
    });
    return;
  }
  
  res.json({
    success: true,
    data: config,
  });
});

/**
 * POST /vpn/configs
 * Ajouter une configuration
 */
router.post('/configs', authMiddleware, (req: Request, res: Response) => {
  const { name, provider, country, city, configFile, enabled } = req.body;
  
  if (!name || !provider || !country || !configFile) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: name, provider, country, configFile',
    });
    return;
  }

  try {
    const config = vpnManager.addConfig({
      name,
      provider,
      country,
      city,
      configFile,
      enabled: enabled !== undefined ? enabled : true,
    });
    
    res.json({
      success: true,
      data: config,
      message: 'VPN configuration added',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add config',
    });
  }
});

/**
 * DELETE /vpn/configs/:id
 * Supprimer une configuration
 */
router.delete('/configs/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const result = vpnManager.removeConfig(id);
  
  res.json({
    success: result,
    message: result ? 'Config removed' : 'Config not found',
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// KILL SWITCH
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /vpn/killswitch
 * Statut du kill switch
 */
router.get('/killswitch', authMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    enabled: vpnManager.isKillSwitchEnabled(),
  });
});

/**
 * POST /vpn/killswitch/toggle
 * Toggle kill switch
 */
router.post('/killswitch/toggle', authMiddleware, async (req: Request, res: Response) => {
  try {
    const enabled = await vpnManager.toggleKillSwitch();
    
    res.json({
      success: true,
      enabled,
      message: `Kill switch ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle kill switch',
    });
  }
});

/**
 * POST /vpn/killswitch/enable
 * Activer le kill switch
 */
router.post('/killswitch/enable', authMiddleware, async (req: Request, res: Response) => {
  try {
    await vpnManager.enableKillSwitch();
    
    res.json({
      success: true,
      enabled: true,
      message: 'Kill switch enabled',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to enable kill switch',
    });
  }
});

/**
 * POST /vpn/killswitch/disable
 * Désactiver le kill switch
 */
router.post('/killswitch/disable', authMiddleware, async (req: Request, res: Response) => {
  try {
    await vpnManager.disableKillSwitch();
    
    res.json({
      success: true,
      enabled: false,
      message: 'Kill switch disabled',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to disable kill switch',
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// IP INFO
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /vpn/refresh-ip
 * Rafraîchir les infos IP
 */
router.post('/refresh-ip', authMiddleware, async (req: Request, res: Response) => {
  try {
    await vpnManager.refreshIPInfo();
    const status = vpnManager.getStatus();
    
    res.json({
      success: true,
      data: {
        publicIP: status.publicIP,
        vpnIP: status.vpnIP,
        location: status.location,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refresh IP info',
    });
  }
});

export default router;
