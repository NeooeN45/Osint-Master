// ============================================================================
// Auto-Investigation Routes - One-click magical investigation API
// ============================================================================

import { Router } from "express";
import { autoInvestigationService } from "../services/autoInvestigationService";
import { logger } from "../utils/logger";

export const autoInvestigationRouter = Router();

/**
 * POST /api/auto-investigation/start
 * Start a new auto-investigation
 */
autoInvestigationRouter.post("/start", async (req, res) => {
  try {
    const { target, targetType, sessionId } = req.body;
    
    if (!target) {
      return res.status(400).json({ 
        error: "Missing required field: target" 
      });
    }

    logger.info(`[API] Starting auto-investigation for ${target}`);
    
    // Start the investigation
    const investigationId = await autoInvestigationService.startInvestigation(
      target,
      targetType,
      sessionId
    );
    
    // Return immediately with investigation ID
    res.json({
      investigationId,
      target,
      targetType: targetType || "auto-detect",
      status: "started",
      message: "Investigation started. Use /status/:id to check progress.",
      streamUrl: `/api/stream/analysis/${investigationId}`,
      websocketUrl: `/api/auto-investigation/ws/${investigationId}` // Future
    });
    
  } catch (error: any) {
    logger.error("[API] Failed to start investigation:", error);
    res.status(500).json({ 
      error: "Failed to start investigation", 
      details: error.message 
    });
  }
});

/**
 * GET /api/auto-investigation/status/:id
 * Get investigation status and progress
 */
autoInvestigationRouter.get("/status/:id", (req, res) => {
  try {
    const { id } = req.params;
    const investigation = autoInvestigationService.getInvestigation(id);
    
    if (!investigation) {
      return res.status(404).json({ error: "Investigation not found" });
    }
    
    // Calculate overall progress
    const completedPhases = investigation.phases.filter(p => p.status === "completed").length;
    const totalPhases = investigation.phases.length;
    const overallProgress = Math.round((completedPhases / totalPhases) * 100);
    
    // Current phase
    const currentPhase = investigation.phases.find(p => p.status === "running");
    
    res.json({
      investigationId: investigation.id,
      target: investigation.target,
      targetType: investigation.targetType,
      status: investigation.status,
      progress: overallProgress,
      currentPhase: currentPhase ? {
        name: currentPhase.name,
        description: currentPhase.description,
        progress: currentPhase.progress
      } : null,
      phases: investigation.phases.map(p => ({
        name: p.name,
        description: p.description,
        status: p.status,
        progress: p.progress,
        duration: p.endTime && p.startTime 
          ? Math.round((p.endTime.getTime() - p.startTime.getTime()) / 1000)
          : null
      })),
      stats: {
        entitiesFound: investigation.entities.length,
        correlationsFound: investigation.graph.links.length,
        toolsExecuted: investigation.toolResults.length,
        geoLocationsFound: investigation.geoData.length
      },
      startTime: investigation.startTime,
      endTime: investigation.endTime,
      elapsedTime: Math.round((Date.now() - investigation.startTime.getTime()) / 1000)
    });
    
  } catch (error: any) {
    logger.error("[API] Failed to get status:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-investigation/result/:id
 * Get complete investigation results
 */
autoInvestigationRouter.get("/result/:id", (req, res) => {
  try {
    const { id } = req.params;
    const investigation = autoInvestigationService.getInvestigation(id);
    
    if (!investigation) {
      return res.status(404).json({ error: "Investigation not found" });
    }
    
    if (investigation.status !== "completed") {
      return res.status(202).json({
        investigationId: id,
        status: investigation.status,
        message: "Investigation still in progress. Check /status/:id for updates.",
        progress: Math.round(
          (investigation.phases.filter(p => p.status === "completed").length / 
           investigation.phases.length) * 100
        )
      });
    }
    
    // Return complete results
    res.json({
      investigationId: investigation.id,
      target: investigation.target,
      targetType: investigation.targetType,
      status: "completed",
      summary: {
        totalEntities: investigation.entities.length,
        totalCorrelations: investigation.graph.links.length,
        riskScore: investigation.intelligence?.riskScore,
        riskLevel: investigation.intelligence?.riskLevel,
        categories: investigation.intelligence?.categories
      },
      entities: investigation.entities.map(e => ({
        type: e.type,
        value: e.value,
        confidence: e.confidence,
        source: e.source,
        context: e.context
      })),
      graph: investigation.graph,
      geoData: investigation.geoData,
      insights: investigation.insights,
      recommendations: investigation.recommendations,
      intelligence: investigation.intelligence,
      phases: investigation.phases.map(p => ({
        name: p.name,
        description: p.description,
        status: p.status,
        results: p.results.length
      })),
      timeline: {
        start: investigation.startTime,
        end: investigation.endTime,
        duration: investigation.endTime 
          ? Math.round((investigation.endTime.getTime() - investigation.startTime.getTime()) / 1000)
          : null
      }
    });
    
  } catch (error: any) {
    logger.error("[API] Failed to get results:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-investigation/graph/:id
 * Get graph data for visualization
 */
autoInvestigationRouter.get("/graph/:id", (req, res) => {
  try {
    const { id } = req.params;
    const investigation = autoInvestigationService.getInvestigation(id);
    
    if (!investigation) {
      return res.status(404).json({ error: "Investigation not found" });
    }
    
    res.json({
      investigationId: id,
      nodes: investigation.graph.nodes,
      links: investigation.graph.links,
      stats: {
        totalNodes: investigation.graph.nodes.length,
        totalLinks: investigation.graph.links.length,
        nodeTypes: investigation.graph.nodes.reduce((acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    });
    
  } catch (error: any) {
    logger.error("[API] Failed to get graph:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-investigation/geo/:id
 * Get geographic data
 */
autoInvestigationRouter.get("/geo/:id", (req, res) => {
  try {
    const { id } = req.params;
    const investigation = autoInvestigationService.getInvestigation(id);
    
    if (!investigation) {
      return res.status(404).json({ error: "Investigation not found" });
    }
    
    res.json({
      investigationId: id,
      locations: investigation.geoData,
      heatmapData: investigation.geoData.map(g => ({
        lat: g.coordinates.lat,
        lng: g.coordinates.lng,
        intensity: g.confidence / 100
      })),
      bounds: investigation.geoData.length > 0 ? {
        minLat: Math.min(...investigation.geoData.map(g => g.coordinates.lat)),
        maxLat: Math.max(...investigation.geoData.map(g => g.coordinates.lat)),
        minLng: Math.min(...investigation.geoData.map(g => g.coordinates.lng)),
        maxLng: Math.max(...investigation.geoData.map(g => g.coordinates.lng))
      } : null
    });
    
  } catch (error: any) {
    logger.error("[API] Failed to get geo data:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-investigation/active
 * List all active investigations
 */
autoInvestigationRouter.get("/active", (_req, res) => {
  try {
    const active = autoInvestigationService.getActiveInvestigations();
    
    res.json({
      count: active.length,
      investigations: active.map(inv => ({
        id: inv.id,
        target: inv.target,
        targetType: inv.targetType,
        progress: Math.round(
          (inv.phases.filter(p => p.status === "completed").length / inv.phases.length) * 100
        ),
        currentPhase: inv.phases.find(p => p.status === "running")?.name || null,
        startTime: inv.startTime,
        elapsedTime: Math.round((Date.now() - inv.startTime.getTime()) / 1000)
      }))
    });
    
  } catch (error: any) {
    logger.error("[API] Failed to list active:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auto-investigation/report/:id
 * Generate and download investigation report
 */
autoInvestigationRouter.post("/report/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { format = "json" } = req.body;
    
    const investigation = autoInvestigationService.getInvestigation(id);
    
    if (!investigation) {
      return res.status(404).json({ error: "Investigation not found" });
    }
    
    if (investigation.status !== "completed") {
      return res.status(400).json({ 
        error: "Investigation not completed yet",
        status: investigation.status
      });
    }
    
    if (format === "html") {
      // Generate HTML report
      const html = generateHTMLReport(investigation);
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `attachment; filename="investigation-${id}.html"`);
      res.send(html);
    } else {
      // Return JSON report
      res.json({
        investigationId: id,
        generatedAt: new Date().toISOString(),
        report: investigation
      });
    }
    
  } catch (error: any) {
    logger.error("[API] Failed to generate report:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate HTML report
 */
function generateHTMLReport(investigation: any): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport d'Investigation - ${investigation.target}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; }
    .header h1 { margin: 0 0 10px 0; font-size: 2em; }
    .header p { margin: 0; opacity: 0.9; }
    .content { padding: 40px; }
    .section { margin-bottom: 40px; }
    .section h2 { color: #333; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin-bottom: 20px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-card h3 { margin: 0; font-size: 2.5em; color: #667eea; }
    .stat-card p { margin: 5px 0 0 0; color: #666; }
    .entity { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .entity-type { display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; margin-right: 10px; }
    .insight { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .insight.critical { background: #f8d7da; border-color: #dc3545; }
    .recommendation { background: #d1ecf1; border: 1px solid #17a2b8; padding: 15px; margin: 10px 0; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Rapport d'Investigation OSINT</h1>
      <p>Cible: <strong>${investigation.target}</strong> (${investigation.targetType})</p>
      <p>Généré le: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>📊 Statistiques</h2>
        <div class="stats">
          <div class="stat-card">
            <h3>${investigation.entities.length}</h3>
            <p>Entités Découvertes</p>
          </div>
          <div class="stat-card">
            <h3>${investigation.graph.links.length}</h3>
            <p>Corrélations</p>
          </div>
          <div class="stat-card">
            <h3>${investigation.toolResults.length}</h3>
            <p>Outils Exécutés</p>
          </div>
          <div class="stat-card">
            <h3>${investigation.geoData.length}</h3>
            <p>Localisations</p>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>🎯 Insights Clés</h2>
        ${investigation.insights.map((insight: any) => `
          <div class="insight ${insight.severity || ''}">
            <strong>${insight.title}</strong><br>
            ${insight.description}<br>
            <small>Confiance: ${insight.confidence}% | Type: ${insight.type}</small>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>🔎 Entités Découvertes</h2>
        ${investigation.entities.slice(0, 20).map((entity: any) => `
          <div class="entity">
            <span class="entity-type">${entity.type}</span>
            <strong>${entity.value}</strong>
            <br><small>Source: ${entity.source} | Confiance: ${entity.confidence}%</small>
          </div>
        `).join('')}
        ${investigation.entities.length > 20 ? `<p>... et ${investigation.entities.length - 20} autres</p>` : ''}
      </div>
      
      <div class="section">
        <h2>💡 Recommandations</h2>
        ${investigation.recommendations.map((rec: string) => `
          <div class="recommendation">${rec}</div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>📈 Résumé de l'Intelligence</h2>
        ${investigation.intelligence ? `
          <p><strong>Score de Risque:</strong> ${investigation.intelligence.riskScore}/100</p>
          <p><strong>Niveau de Risque:</strong> ${investigation.intelligence.riskLevel}</p>
          <p><strong>Catégories:</strong> ${Object.entries(investigation.intelligence.categories || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>
        ` : '<p>Non disponible</p>'}
      </div>
    </div>
    
    <div class="footer">
      <p>Généré par OSINT Master Pro - Investigation Automatique</p>
    </div>
  </div>
</body>
</html>
  `;
}

export default autoInvestigationRouter;
