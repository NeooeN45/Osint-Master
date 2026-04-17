/**
 * Docker Routes - Phase 3 Docker Booster
 * API endpoints pour la gestion Docker
 * 
 * Routes:
 * - GET /docker/status - Statut complet du système
 * - GET /docker/tor/status - Statut Tor
 * - POST /docker/tor/rotate - Rotation identité Tor
 * - POST /docker/tor/control - Démarrer/Arrêter Tor
 * - GET /docker/containers - Lister containers
 * - GET /docker/containers/:name/logs - Logs container
 * - POST /docker/tools/execute - Exécuter un outil
 * - GET /docker/executions - Lister exécutions
 * - GET /docker/executions/:id - Statut exécution
 * - GET /docker/executions/:id/stream - Stream exécution
 * 
 * Créé: 17 Avril 2026 - Phase 3 Docker Booster
 */

import { Router, Request, Response } from 'express';
import { getDockerManager } from '../services/dockerManager';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const dockerManager = getDockerManager();

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM STATUS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /docker/status
 * Obtenir le statut complet du système Docker
 */
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await dockerManager.getSystemStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// TOR MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /docker/tor/status
 * Obtenir le statut du proxy Tor
 */
router.get('/tor/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await dockerManager.checkTorStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get Tor status',
    });
  }
});

/**
 * POST /docker/tor/rotate
 * Forcer une rotation d'identité Tor
 */
router.post('/tor/rotate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await dockerManager.rotateTorIdentity();
    res.json({
      success: result,
      message: result ? 'Tor identity rotated successfully' : 'Failed to rotate Tor identity',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to rotate Tor identity',
    });
  }
});

/**
 * POST /docker/tor/control
 * Contrôler le service Tor (start/stop/restart)
 */
router.post('/tor/control', authMiddleware, async (req: Request, res: Response) => {
  const { action } = req.body;
  
  if (!action || !['start', 'stop', 'restart'].includes(action)) {
    res.status(400).json({
      success: false,
      error: 'Invalid action. Must be: start, stop, restart',
    });
    return;
  }
  
  try {
    const result = await dockerManager.controlTor(action);
    res.json({
      success: result,
      message: `Tor ${action} ${result ? 'successful' : 'failed'}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to ${action} Tor`,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// CONTAINER MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /docker/containers
 * Lister tous les containers
 */
router.get('/containers', authMiddleware, async (req: Request, res: Response) => {
  try {
    const containers = await dockerManager.listContainers();
    res.json({
      success: true,
      data: containers,
      count: containers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list containers',
    });
  }
});

/**
 * GET /docker/containers/:name/logs
 * Obtenir les logs d'un container
 */
router.get('/containers/:name/logs', authMiddleware, async (req: Request, res: Response) => {
  const { name } = req.params;
  const lines = parseInt(req.query.lines as string) || 100;
  
  try {
    const logs = await dockerManager.getContainerLogs(name, lines);
    res.json({
      success: true,
      container: name,
      lines,
      logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get container logs',
    });
  }
});

/**
 * GET /docker/containers/:name/logs/stream
 * Stream des logs d'un container (SSE)
 */
router.get('/containers/:name/logs/stream', authMiddleware, (req: Request, res: Response) => {
  const { name } = req.params;
  
  // Configurer SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const stopStream = dockerManager.streamContainerLogs(name, (log) => {
    res.write(`data: ${JSON.stringify({ log, timestamp: new Date().toISOString() })}\n\n`);
  });
  
  // Clean up on disconnect
  req.on('close', () => {
    stopStream();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /docker/tools/execute
 * Exécuter un outil OSINT
 */
router.post('/tools/execute', authMiddleware, async (req: Request, res: Response) => {
  const { tool, target, options = [], useTor = true } = req.body;
  
  if (!tool || !target) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: tool, target',
    });
    return;
  }
  
  try {
    const execution = await dockerManager.executeTool(tool, target, options, useTor);
    res.json({
      success: true,
      data: execution,
      message: `Tool ${tool} started for target ${target}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute tool',
    });
  }
});

/**
 * GET /docker/executions
 * Lister toutes les exécutions
 */
router.get('/executions', authMiddleware, (req: Request, res: Response) => {
  try {
    const executions = dockerManager.listExecutions();
    res.json({
      success: true,
      data: executions,
      count: executions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list executions',
    });
  }
});

/**
 * GET /docker/executions/:id
 * Obtenir le statut d'une exécution
 */
router.get('/executions/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const execution = dockerManager.getExecution(id);
  
  if (!execution) {
    res.status(404).json({
      success: false,
      error: 'Execution not found',
    });
    return;
  }
  
  res.json({
    success: true,
    data: execution,
  });
});

/**
 * GET /docker/executions/:id/stream
 * Stream d'une exécution en temps réel (SSE)
 */
router.get('/executions/:id/stream', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  
  const execution = dockerManager.getExecution(id);
  if (!execution) {
    res.status(404).json({
      success: false,
      error: 'Execution not found',
    });
    return;
  }
  
  // Configurer SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  dockerManager.streamExecution(id, (data) => {
    res.write(`data: ${JSON.stringify({ ...data, timestamp: new Date().toISOString() })}\n\n`);
    
    if (data.type === 'complete') {
      res.end();
    }
  });
  
  // Clean up on disconnect
  req.on('close', () => {
    // Le nettoyage est géré par streamExecution
  });
});

/**
 * POST /docker/executions/cleanup
 * Nettoyer les anciennes exécutions
 */
router.post('/executions/cleanup', authMiddleware, (req: Request, res: Response) => {
  const maxAge = parseInt(req.body.maxAge) || 24 * 60 * 60 * 1000; // 24h par défaut
  
  try {
    const cleaned = dockerManager.cleanupExecutions(maxAge);
    res.json({
      success: true,
      cleaned,
      message: `Cleaned ${cleaned} old executions`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup executions',
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// WEBSOCKET EVENTS (pour les clients connectés)
// ═════════════════════════════════════════════════════════════════════════════

// Émettre les événements vers les clients WebSocket
// (à intégrer avec votre système WebSocket existant)
dockerManager.on('tor:rotated', (status) => {
  // broadcastToClients('docker:tor:rotated', status);
});

dockerManager.on('execution:started', (execution) => {
  // broadcastToClients('docker:execution:started', execution);
});

dockerManager.on('execution:completed', (execution) => {
  // broadcastToClients('docker:execution:completed', execution);
});

dockerManager.on('health:check', (status) => {
  // broadcastToClients('docker:health:check', status);
});

export default router;
