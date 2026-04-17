/**
 * Instagram PrivSniffer Routes - API Endpoints
 * Routes pour le module InstagramPrivSniffer
 * 
 * Créé: 17 Avril 2026
 */

import { Router, Request, Response } from 'express';
import InstagramPrivSniffer from '../services/instagramPrivSniffer';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /instagram-priv/sniff
 * Sniffer un profil privé
 */
router.post('/sniff', authMiddleware, async (req: Request, res: Response) => {
  const { username, sessionId } = req.body;

  if (!username) {
    res.status(400).json({
      success: false,
      error: 'Username required',
    });
    return;
  }

  try {
    const result = await InstagramPrivSniffer.sniff(username, sessionId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to sniff profile',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /instagram-priv/batch
 * Sniffer plusieurs profils en batch
 */
router.post('/batch', authMiddleware, async (req: Request, res: Response) => {
  const { usernames, sessionId } = req.body;

  if (!Array.isArray(usernames) || usernames.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Usernames array required',
    });
    return;
  }

  if (usernames.length > 10) {
    res.status(400).json({
      success: false,
      error: 'Maximum 10 usernames allowed per batch',
    });
    return;
  }

  try {
    const results = await InstagramPrivSniffer.sniffBatch(usernames, sessionId);

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Batch sniff failed',
    });
  }
});

/**
 * GET /instagram-priv/status
 * Vérifier le statut du service
 */
router.get('/status', authMiddleware, (req: Request, res: Response) => {
  const hasSession = !!(process.env.IG_SESSION_ID || '').trim();

  res.json({
    success: true,
    available: true,
    hasSession,
    message: hasSession
      ? 'InstagramPrivSniffer ready with session'
      : 'InstagramPrivSniffer ready (limited without session)',
  });
});

export default router;
