// ============================================================================
// DEEP INVESTIGATION V2 ROUTES - API optimisée
// ============================================================================

import { Router } from "express";
import { deepEngineV2 } from "../services/DeepEngineV2";
import { cacheManager } from "../services/cache/CacheManager";
import { detectTargetType } from "../modules";

export const deepInvestigationV2Router = Router();

// GET /api/deep-v2/modules - Liste des modules disponibles
deepInvestigationV2Router.get("/modules", async (_req, res) => {
  try {
    const modules = deepEngineV2.getAvailableModules();
    res.json({
      count: modules.length,
      modules: modules.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        targetTypes: m.targetTypes,
        priority: m.priority,
        rateLimit: m.rateLimit
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deep-v2/cache/stats - Statistiques du cache
deepInvestigationV2Router.get("/cache/stats", (_req, res) => {
  const stats = cacheManager.getStats();
  res.json(stats);
});

// POST /api/deep-v2/cache/clear - Vider le cache
deepInvestigationV2Router.post("/cache/clear", (_req, res) => {
  cacheManager.clearAll();
  res.json({ cleared: true });
});

// POST /api/deep-v2/detect - Détecter le type de cible
deepInvestigationV2Router.post("/detect", (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });
  
  const type = detectTargetType(target);
  res.json({ target, type });
});

// POST /api/deep-v2/investigate - Investigation non-streaming
deepInvestigationV2Router.post("/investigate", async (req, res) => {
  const { target, config } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  try {
    const events: any[] = [];
    
    for await (const event of deepEngineV2.investigate(target, config)) {
      events.push(event);
    }
    
    const completeEvent = events.find(e => e.type === "complete");
    res.json(completeEvent?.data || { events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deep-v2/stream - Investigation avec streaming SSE
deepInvestigationV2Router.post("/stream", async (req, res) => {
  let body: any = req.body;
  
  // Parser le body si nécessaire (pour compatibilité SSE)
  if (!body || Object.keys(body).length === 0) {
    body = await new Promise<any>((resolve) => {
      let raw = "";
      req.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
      req.on("end", () => { 
        try { resolve(JSON.parse(raw)); } catch { resolve({}); } 
      });
    });
  }
  
  const { target, config } = body;
  if (!target) return res.status(400).json({ error: "target required" });

  // Configurer SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  if (res.socket) res.socket.setNoDelay(true);

  let closed = false;
  req.on("close", () => { closed = true; });

  try {
    for await (const event of deepEngineV2.investigate(target, config)) {
      if (closed) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (err: any) {
    if (!closed) {
      res.write(`data: ${JSON.stringify({ 
        type: "error", 
        data: { message: err.message } 
      })}\n\n`);
    }
  }

  if (!closed) {
    res.write("data: [DONE]\n\n");
    res.end();
  }
});
