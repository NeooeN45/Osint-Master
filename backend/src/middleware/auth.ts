/**
 * Auth Middleware - Phase 3 Docker Booster
 * Middleware d'authentification simple
 * 
 * Créé: 17 Avril 2026
 */

import { Request, Response, NextFunction } from 'express';

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

/**
 * Middleware d'authentification
 * Vérifie le token JWT dans le header Authorization
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth in development mode
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Authorization header required',
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Token required',
    });
    return;
  }

  // Simple validation (à remplacer par JWT verify en production)
  if (token !== JWT_SECRET && token.length < 10) {
    res.status(403).json({
      success: false,
      error: 'Invalid token',
    });
    return;
  }

  next();
}

/**
 * Middleware optionnel - n'expire pas si pas d'auth
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  next();
}
