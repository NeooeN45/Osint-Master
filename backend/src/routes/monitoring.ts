/**
 * Monitoring Routes - System Metrics API
 * API endpoints pour les métriques et le monitoring
 * 
 * Créé: 17 Avril 2026
 */

import { Router, Request, Response } from 'express';
import { getMonitoringService } from '../services/monitoring';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const monitoring = getMonitoringService();

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /monitoring/dashboard
 * Données pour le dashboard
 */
router.get('/dashboard', authMiddleware, (req: Request, res: Response) => {
  const data = monitoring.getDashboardData();
  
  res.json({
    success: true,
    data,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM METRICS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /monitoring/system
 * Métriques système actuelles
 */
router.get('/system', authMiddleware, (req: Request, res: Response) => {
  const metrics = monitoring.getLatestSystemMetrics();
  
  if (!metrics) {
    res.status(503).json({
      success: false,
      error: 'Metrics not available yet',
    });
    return;
  }
  
  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * GET /monitoring/system/history
 * Historique des métriques système
 */
router.get('/system/history', authMiddleware, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const history = monitoring.getSystemMetricsHistory();
  
  res.json({
    success: true,
    count: history.length,
    data: history.slice(-limit),
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DOCKER METRICS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /monitoring/docker
 * Métriques Docker
 */
router.get('/docker', authMiddleware, async (req: Request, res: Response) => {
  const metrics = monitoring.getDockerMetrics();
  
  res.json({
    success: true,
    data: metrics,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// APP METRICS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /monitoring/app
 * Métriques applicatives
 */
router.get('/app', authMiddleware, (req: Request, res: Response) => {
  const metrics = monitoring.getAppMetrics();
  
  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * GET /monitoring/all
 * Toutes les métriques
 */
router.get('/all', authMiddleware, (req: Request, res: Response) => {
  const metrics = monitoring.getAllMetrics();
  
  res.json({
    success: true,
    data: metrics,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ALERTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /monitoring/alerts
 * Alertes actives
 */
router.get('/alerts', authMiddleware, (req: Request, res: Response) => {
  const alerts = monitoring.getActiveAlerts();
  
  res.json({
    success: true,
    count: alerts.length,
    data: alerts,
  });
});

/**
 * POST /monitoring/alerts/:id/acknowledge
 * Acquitter une alerte
 */
router.post('/alerts/:id/acknowledge', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const result = monitoring.acknowledgeAlert(id);
  
  res.json({
    success: result,
    message: result ? 'Alert acknowledged' : 'Alert not found',
  });
});

/**
 * PUT /monitoring/alerts/thresholds
 * Mettre à jour les seuils d'alerte
 */
router.put('/alerts/thresholds', authMiddleware, (req: Request, res: Response) => {
  const { cpu, memory, disk, errorRate, latency } = req.body;
  
  monitoring.setAlertThresholds({
    cpu,
    memory,
    disk,
    errorRate,
    latency,
  });
  
  res.json({
    success: true,
    message: 'Alert thresholds updated',
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// HEALTH CHECKS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /monitoring/health
 * Health checks
 */
router.get('/health', authMiddleware, (req: Request, res: Response) => {
  const checks = monitoring.getHealthChecks();
  
  res.json({
    success: true,
    data: checks,
  });
});

export default router;
