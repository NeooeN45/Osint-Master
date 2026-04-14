// ============================================================================
// WEB SEARCH ROUTES
// Automated Google dorking and web scraping
// ============================================================================

import { Router } from "express";
import { webSearchEngine } from "../services/webSearchEngine";

export const webSearchRouter = Router();

// Full web search
webSearchRouter.post("/search", async (req, res) => {
  const { target, targetType } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  try {
    const results = await webSearchEngine.fullSearch(target, targetType || "username");
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dork search only
webSearchRouter.post("/dorks", async (req, res) => {
  const { target, targetType } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  try {
    const results = await webSearchEngine.searchDorks(target, targetType || "username");
    res.json({ results, totalQueries: results.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get dork suggestions
webSearchRouter.post("/suggestions", (req, res) => {
  const { target, targetType } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  const suggestions = webSearchEngine.getDorkSuggestions(target, targetType || "username");
  res.json({ suggestions, count: suggestions.length });
});
