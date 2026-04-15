// ============================================================================
// ROUTE /api/dorks - Google Dorking Pro
// ============================================================================

import { Router } from "express";
import { googleDorker } from "../services/intelligence/GoogleDorker.js";

export const dorksRouter = Router();

// POST /api/dorks/generate
dorksRouter.post("/generate", (req, res) => {
  const { target, targetType, categories } = req.body;

  if (!target || !targetType) {
    return res.status(400).json({ error: "target et targetType requis" });
  }

  const report = googleDorker.generateDorkReport(target, targetType);
  return res.json(report);
});

// POST /api/dorks/execute
dorksRouter.post("/execute", async (req, res) => {
  const { target, targetType, apiKey, categories } = req.body;

  if (!target || !targetType) {
    return res.status(400).json({ error: "target et targetType requis" });
  }

  const dorks = googleDorker.generateDorks(target, targetType, categories);
  const results = await googleDorker.executeDorks(dorks, apiKey || process.env.BING_SEARCH_KEY);

  return res.json({
    target,
    targetType,
    totalDorks: dorks.length,
    results,
    message: results.length === 0 ? "Configurez BING_SEARCH_KEY pour exécuter les dorks automatiquement" : undefined,
  });
});
