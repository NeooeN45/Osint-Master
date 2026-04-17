/**
 * Hot Reload Routes - Backend Upgrade Support
 * API endpoints pour le hot reload et la mise à niveau
 * 
 * Routes:
 * - GET /hotreload/modules - Lister les modules
 * - POST /hotreload/modules/:name/reload - Recharger un module
 * - POST /hotreload/modules/reload-all - Recharger tous les modules
 * - POST /hotreload/modules/:name/upgrade - Mettre à niveau un module
 * - GET /hotreload/services - Statut des services
 * - POST /hotreload/watch/start - Démarrer le file watching
 * - POST /hotreload/watch/stop - Arrêter le file watching
 * 
 * Créé: 17 Avril 2026
 */

import { Router, Request, Response } from 'express';
import { getHotReloadService } from '../services/hotReload';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const hotReload = getHotReloadService();

// ═════════════════════════════════════════════════════════════════════════════
// MODULES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /hotreload/modules
 * Lister tous les modules enregistrés
 */
router.get('/modules', authMiddleware, (req: Request, res: Response) => {
  const modules = hotReload.listModules();
  
  res.json({
    success: true,
    count: modules.length,
    data: modules,
  });
});

/**
 * GET /hotreload/modules/:name
 * Obtenir les détails d'un module
 */
router.get('/modules/:name', authMiddleware, (req: Request, res: Response) => {
  const { name } = req.params;
  const module = hotReload.getModule(name);
  
  if (!module) {
    res.status(404).json({
      success: false,
      error: `Module '${name}' not found`,
    });
    return;
  }
  
  res.json({
    success: true,
    data: module,
  });
});

/**
 * POST /hotreload/modules/:name/reload
 * Recharger un module à chaud
 */
router.post('/modules/:name/reload', authMiddleware, async (req: Request, res: Response) => {
  const { name } = req.params;
  
  try {
    const result = await hotReload.reloadModule(name);
    
    res.json({
      success: result,
      message: result 
        ? `Module '${name}' reloaded successfully` 
        : `Failed to reload module '${name}'`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error reloading module: ${error}`,
    });
  }
});

/**
 * POST /hotreload/modules/reload-all
 * Recharger tous les modules
 */
router.post('/modules/reload-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await hotReload.reloadAll();
    
    res.json({
      success: result.failed.length === 0,
      reloaded: result.success,
      failed: result.failed,
      message: `Reloaded ${result.success.length} modules, ${result.failed.length} failed`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error reloading modules: ${error}`,
    });
  }
});

/**
 * POST /hotreload/modules/:name/upgrade
 * Mettre à niveau un module (upload nouveau code)
 */
router.post('/modules/:name/upgrade', authMiddleware, async (req: Request, res: Response) => {
  const { name } = req.params;
  const { code } = req.body;
  
  if (!code) {
    res.status(400).json({
      success: false,
      error: 'Code payload required',
    });
    return;
  }
  
  try {
    const result = await hotReload.upgradeModule(name, code);
    
    res.json({
      success: result,
      message: result 
        ? `Module '${name}' upgraded successfully` 
        : `Failed to upgrade module '${name}'`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error upgrading module: ${error}`,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SERVICES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /hotreload/services
 * Obtenir le statut de tous les services
 */
router.get('/services', authMiddleware, (req: Request, res: Response) => {
  const services = hotReload.getServicesStatus();
  
  res.json({
    success: true,
    count: services.length,
    data: services,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FILE WATCHING
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /hotreload/watch/start
 * Démarrer le file watching
 */
router.post('/watch/start', authMiddleware, (req: Request, res: Response) => {
  const { moduleName } = req.body;
  
  try {
    if (moduleName) {
      hotReload.watchModule(moduleName);
      res.json({
        success: true,
        message: `Started watching module '${moduleName}'`,
      });
    } else {
      hotReload.watchAll();
      res.json({
        success: true,
        message: 'Started watching all modules',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error starting watcher: ${error}`,
    });
  }
});

/**
 * POST /hotreload/watch/stop
 * Arrêter le file watching
 */
router.post('/watch/stop', authMiddleware, (req: Request, res: Response) => {
  const { moduleName } = req.body;
  
  try {
    if (moduleName) {
      hotReload.stopWatcher(moduleName);
      res.json({
        success: true,
        message: `Stopped watching module '${moduleName}'`,
      });
    } else {
      hotReload.stopAllWatchers();
      res.json({
        success: true,
        message: 'Stopped all watchers',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error stopping watcher: ${error}`,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /hotreload/system/reset
 * Réinitialiser le service de hot reload
 */
router.post('/system/reset', authMiddleware, (req: Request, res: Response) => {
  try {
    const { resetHotReloadService } = require('../services/hotReload');
    resetHotReloadService();
    
    res.json({
      success: true,
      message: 'Hot reload service reset',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error resetting service: ${error}`,
    });
  }
});

export default router;
