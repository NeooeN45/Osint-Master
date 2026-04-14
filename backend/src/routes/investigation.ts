// ============================================================================
// INVESTIGATION ROUTES
// Full investigation pipeline: scan -> correlate -> AI analysis
// ============================================================================

import { Router } from "express";
import { osintEngine } from "../services/osintEngine";
import { correlationEngine } from "../services/correlationEngine";
import { ollamaService } from "../services/ollamaService";
import { webSearchEngine } from "../services/webSearchEngine";

export const investigationRouter = Router();

// Full investigation pipeline
investigationRouter.post("/run", async (req, res) => {
  const { target, targetType, tools, useAI, webSearch } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  const type = targetType || osintEngine.detectTargetType(target);
  const toolIds = tools || osintEngine.getToolsForTarget(type);
  const startTime = Date.now();

  // Phase 1: Execute OSINT tools + web search in parallel
  const [toolResults, webResults] = await Promise.all([
    osintEngine.executeMultiple(toolIds, target),
    webSearch !== false ? webSearchEngine.fullSearch(target, type).catch(() => null) : Promise.resolve(null),
  ]);

  // Phase 2: Extract entities & correlate
  correlationEngine.reset();
  correlationEngine.addEntity(type as any, target, "user_input", 100);
  correlationEngine.extractEntities(toolResults);

  // Add web search results as entities
  if (webResults?.allHits) {
    for (const hit of webResults.allHits.slice(0, 30)) {
      correlationEngine.addEntity("url", hit.url, `WebSearch:${hit.source}`, Math.round(hit.relevance * 0.7));
    }
  }

  correlationEngine.findCorrelations();
  const graph = correlationEngine.buildGraph();

  // Phase 3: AI analysis (optional)
  let aiAnalysis = null;
  if (useAI !== false) {
    try {
      const available = await ollamaService.isAvailable();
      if (available) {
        aiAnalysis = await ollamaService.analyzeOSINT(
          {
            target, type,
            results: toolResults.map(r => ({ tool: r.tool, parsed: r.parsed, success: r.success })),
            graph: graph.summary,
            webSearchHits: webResults?.summary?.totalHits || 0,
          },
          `Full OSINT investigation on ${type}: ${target}`
        );
      }
    } catch (e: any) {
      aiAnalysis = `AI analysis unavailable: ${e.message}`;
    }
  }

  res.json({
    investigation: {
      target,
      targetType: type,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    },
    toolResults: toolResults.map(r => ({
      tool: r.tool,
      success: r.success,
      duration: r.duration,
      parsed: r.parsed,
    })),
    webSearch: webResults ? {
      totalHits: webResults.summary.totalHits,
      uniqueUrls: webResults.summary.uniqueUrls,
      topResults: webResults.allHits.slice(0, 20),
    } : null,
    graph,
    aiAnalysis,
    summary: {
      toolsRun: toolIds.length,
      successful: toolResults.filter(r => r.success).length,
      entitiesFound: graph.summary.totalEntities,
      correlationsFound: graph.summary.totalCorrelations,
      strongLinks: graph.summary.strongLinks,
      falsePositivesFiltered: graph.summary.falsePositivesFiltered,
      verifiedEntities: graph.summary.verifiedEntities,
      webHits: webResults?.summary?.totalHits || 0,
    },
  });
});

// Get investigation graph only
investigationRouter.post("/graph", async (req, res) => {
  const { results } = req.body;
  if (!results) return res.status(400).json({ error: "results array required" });

  correlationEngine.reset();
  correlationEngine.extractEntities(results);
  correlationEngine.findCorrelations();
  const graph = correlationEngine.buildGraph();

  res.json(graph);
});

// AI-only analysis
investigationRouter.post("/ai-analyze", async (req, res) => {
  const { data, context } = req.body;
  try {
    const analysis = await ollamaService.analyzeOSINT(data, context || "Investigation");
    res.json({ analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
