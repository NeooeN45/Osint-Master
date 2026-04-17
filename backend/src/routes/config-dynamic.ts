/**
 * Config Routes - Dynamic Configuration Management
 * API endpoints pour la gestion dynamique de la configuration
 * 
 * Routes:
 * - GET /config - Obtenir toute la configuration
 * - GET /config/:key - Obtenir une valeur spécifique
 * - PUT /config - Mettre à jour la configuration
 * - PUT /config/apikey/:name - Mettre à jour une clé API
 * - POST /config/feature/:name/toggle - Activer/désactiver une feature
 * - POST /config/reload - Forcer le reload depuis .env
 * - POST /config/save - Sauvegarder la configuration
 * - POST /config/backup - Créer un backup
 * - POST /config/restore - Restaurer depuis backup
 * 
 * Créé: 17 Avril 2026
 */

import { Router, Request, Response } from 'express';
import { getConfigManager } from '../services/configManager';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const configManager = getConfigManager();

// ═════════════════════════════════════════════════════════════════════════════
// GET CONFIG
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /config
 * Obtenir toute la configuration (sans les secrets sensibles)
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const config = configManager.getConfig();
  
  // Masquer les secrets dans la réponse
  const safeConfig = {
    ...config,
    jwtSecret: config.jwtSecret ? '***REDACTED***' : undefined,
    encryptionKey: config.encryptionKey ? '***REDACTED***' : undefined,
    apiKeys: Object.fromEntries(
      Object.entries(config.apiKeys).map(([key, value]) => [
        key,
        value ? `${value.slice(0, 4)}...${value.slice(-4)}` : undefined,
      ])
    ),
  };
  
  res.json({
    success: true,
    data: safeConfig,
  });
});

/**
 * GET /config/:key
 * Obtenir une valeur spécifique
 */
router.get('/:key', authMiddleware, (req: Request, res: Response) => {
  const { key } = req.params;
  const validKeys = [
    'port', 'nodeEnv', 'dockerEnabled', 'torProxyHost', 
    'torProxyPort', 'toolsContainer', 'features', 'limits'
  ];
  
  if (!validKeys.includes(key)) {
    res.status(400).json({
      success: false,
      error: 'Invalid config key',
      validKeys,
    });
    return;
  }
  
  const value = configManager.get(key as any);
  
  res.json({
    success: true,
    key,
    value,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UPDATE CONFIG
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /config
 * Mettre à jour la configuration
 */
router.put('/', authMiddleware, (req: Request, res: Response) => {
  const updates = req.body;
  
  if (!updates || typeof updates !== 'object') {
    res.status(400).json({
      success: false,
      error: 'Invalid update payload',
    });
    return;
  }
  
  const updated: Record<string, any> = {};
  const errors: string[] = [];
  
  // Champs autorisés
  const allowedFields = [
    'port', 'dockerEnabled', 'torProxyHost', 'torProxyPort',
    'toolsContainer', 'features', 'limits'
  ];
  
  Object.entries(updates).forEach(([key, value]) => {
    if (!allowedFields.includes(key)) {
      errors.push(`Field '${key}' is not allowed`);
      return;
    }
    
    try {
      configManager.update(key as any, value);
      updated[key] = value;
    } catch (error) {
      errors.push(`Failed to update '${key}': ${error}`);
    }
  });
  
  res.json({
    success: errors.length === 0,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
});

/**
 * PUT /config/apikey/:name
 * Mettre à jour une clé API
 */
router.put('/apikey/:name', authMiddleware, (req: Request, res: Response) => {
  const { name } = req.params;
  const { value } = req.body;
  
  if (!value) {
    res.status(400).json({
      success: false,
      error: 'API key value required',
    });
    return;
  }
  
  configManager.updateApiKey(name, value);
  
  res.json({
    success: true,
    message: `API key '${name}' updated`,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /config/feature/:name/toggle
 * Activer/désactiver une fonctionnalité
 */
router.post('/feature/:name/toggle', authMiddleware, (req: Request, res: Response) => {
  const { name } = req.params;
  const { enabled } = req.body;
  
  const validFeatures = ['dockerBooster', 'aiAnalysis', 'deepInvestigation', 'opsecProtection'];
  
  if (!validFeatures.includes(name)) {
    res.status(400).json({
      success: false,
      error: 'Invalid feature name',
      validFeatures,
    });
    return;
  }
  
  const newState = configManager.toggleFeature(name as any, enabled);
  
  res.json({
    success: true,
    feature: name,
    enabled: newState,
  });
});

/**
 * GET /config/features/status
 * Obtenir le statut de toutes les fonctionnalités
 */
router.get('/features/status', authMiddleware, (req: Request, res: Response) => {
  const features = configManager.get('features');
  
  res.json({
    success: true,
    features,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RELOAD & PERSISTENCE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /config/reload
 * Forcer le reload depuis le fichier .env
 */
router.post('/reload', authMiddleware, (req: Request, res: Response) => {
  try {
    // Recréer le configManager pour forcer le reload
    const { resetConfigManager, getConfigManager } = require('../services/configManager');
    resetConfigManager();
    const newManager = getConfigManager();
    
    res.json({
      success: true,
      message: 'Configuration reloaded from .env',
      config: {
        nodeEnv: newManager.get('nodeEnv'),
        port: newManager.get('port'),
        dockerEnabled: newManager.get('dockerEnabled'),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reload configuration',
    });
  }
});

/**
 * POST /config/save
 * Sauvegarder la configuration dans .env
 */
router.post('/save', authMiddleware, (req: Request, res: Response) => {
  try {
    configManager.saveToFile();
    
    res.json({
      success: true,
      message: 'Configuration saved to .env',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save configuration',
    });
  }
});

/**
 * POST /config/backup
 * Créer un backup de la configuration
 */
router.post('/backup', authMiddleware, (req: Request, res: Response) => {
  try {
    const backupPath = configManager.backup();
    
    res.json({
      success: true,
      message: 'Configuration backed up',
      backupPath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to backup configuration',
    });
  }
});

/**
 * POST /config/restore
 * Restaurer depuis un backup
 */
router.post('/restore', authMiddleware, (req: Request, res: Response) => {
  const { backupPath } = req.body;
  
  if (!backupPath) {
    res.status(400).json({
      success: false,
      error: 'Backup path required',
    });
    return;
  }
  
  try {
    configManager.restore(backupPath);
    
    res.json({
      success: true,
      message: 'Configuration restored from backup',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to restore configuration',
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /config/validate
 * Valider la configuration actuelle
 */
router.post('/validate', authMiddleware, (req: Request, res: Response) => {
  const validation = configManager.validate();
  
  res.json({
    success: validation.valid,
    valid: validation.valid,
    errors: validation.errors,
  });
});

/**
 * POST /config/reset
 * Réinitialiser à la configuration par défaut
 */
router.post('/reset', authMiddleware, (req: Request, res: Response) => {
  configManager.reset();
  
  res.json({
    success: true,
    message: 'Configuration reset to defaults',
  });
});

export default router;
