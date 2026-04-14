// ============================================================================
// Intelligence Routes - Provides explanations and insights for OSINT results
// ============================================================================

import { Router } from "express";
import { intelligenceEngine } from "../services/intelligenceEngine";
import { logger } from "../utils/logger";

export const intelligenceRouter = Router();

// Analyze entities and provide explanations
intelligenceRouter.post("/analyze", (req, res) => {
  try {
    const { target, entities } = req.body;
    
    if (!target || !entities || !Array.isArray(entities)) {
      return res.status(400).json({ 
        error: "Missing required fields: target, entities (array)" 
      });
    }
    
    logger.info(`[INTELLIGENCE] Analyzing ${entities.length} entities for ${target}`);
    
    const summary = intelligenceEngine.analyzeResults(target, entities);
    const report = intelligenceEngine.generateReport(summary);
    
    res.json({
      summary,
      report,
      html: generateHTMLReport(summary)
    });
  } catch (error: any) {
    logger.error("[INTELLIGENCE] Analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed explanation for a specific entity
intelligenceRouter.post("/explain", (req, res) => {
  try {
    const { entity, type, value, confidence, source } = req.body;
    
    if (!value) {
      return res.status(400).json({ error: "Missing required field: value" });
    }
    
    const explanation = intelligenceEngine.analyzeResults("single", [{
      type: type || "unknown",
      value,
      confidence: confidence || 50,
      source: source || "unknown"
    }]);
    
    res.json({
      explanation: explanation.keyFindings[0] || null,
      summary: explanation
    });
  } catch (error: any) {
    logger.error("[INTELLIGENCE] Explanation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Generate and download report
intelligenceRouter.post("/report", (req, res) => {
  try {
    const { target, entities, format = "markdown" } = req.body;
    
    if (!target || !entities) {
      return res.status(400).json({ error: "Missing target or entities" });
    }
    
    const summary = intelligenceEngine.analyzeResults(target, entities);
    
    if (format === "html") {
      const html = generateHTMLReport(summary);
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `attachment; filename="${target}-report.html"`);
      res.send(html);
    } else {
      const report = intelligenceEngine.generateReport(summary);
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader("Content-Disposition", `attachment; filename="${target}-report.md"`);
      res.send(report);
    }
  } catch (error: any) {
    logger.error("[INTELLIGENCE] Report generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get risk assessment
intelligenceRouter.post("/risk-assessment", (req, res) => {
  try {
    const { entities } = req.body;
    
    if (!entities || !Array.isArray(entities)) {
      return res.status(400).json({ error: "entities array required" });
    }
    
    const analysis = intelligenceEngine.analyzeResults("assessment", entities);
    
    res.json({
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      categories: analysis.categories,
      criticalFindings: analysis.keyFindings.filter(
        f => f.riskLevel === "critical" || f.riskLevel === "high"
      ),
      recommendations: analysis.recommendations
    });
  } catch (error: any) {
    logger.error("[INTELLIGENCE] Risk assessment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Generate HTML report
function generateHTMLReport(summary: any): string {
  const riskColors = {
    "low": "#22c55e",
    "medium": "#eab308", 
    "high": "#f97316",
    "critical": "#ef4444"
  };
  
  const riskEmoji = {
    "low": "🟢",
    "medium": "🟡",
    "high": "🟠", 
    "critical": "🔴"
  };
  
  const findingsHTML = summary.keyFindings.map((finding: any) => `
    <div style="border-left: 4px solid ${riskColors[finding.riskLevel as keyof typeof riskColors]}; 
                padding: 15px; 
                margin: 10px 0; 
                background: #f8f9fa;
                border-radius: 8px;">
      <h3 style="margin-top: 0; color: ${riskColors[finding.riskLevel as keyof typeof riskColors]};">
        ${riskEmoji[finding.riskLevel as keyof typeof riskEmoji]} ${finding.entity}
      </h3>
      <p><strong>Type:</strong> ${finding.category}</p>
      <p><strong>Confiance:</strong> ${finding.confidence}%</p>
      <p><strong>Risque:</strong> ${finding.riskLevel}</p>
      <p><strong>Explication:</strong> ${finding.explanation}</p>
      ${finding.recommendations.length > 0 ? `
        <p><strong>Recommandations:</strong></p>
        <ul>
          ${finding.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('');
  
  const recommendationsHTML = summary.recommendations.map((rec: string) => 
    `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">${rec}</li>`
  ).join('');
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport OSINT - ${summary.target}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 20px;
      background: #f5f5f5;
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      padding: 30px; 
      border-radius: 12px; 
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 { margin: 0 0 10px 0; }
    .stats { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 15px; 
      margin: 20px 0;
    }
    .stat-card { 
      background: white; 
      padding: 20px; 
      border-radius: 8px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-card h3 { 
      margin: 0; 
      font-size: 2em; 
      color: #667eea;
    }
    .stat-card p { 
      margin: 5px 0 0 0; 
      color: #666;
    }
    .risk-badge {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: bold;
      text-transform: uppercase;
      color: white;
      background: ${riskColors[summary.riskLevel]};
    }
    .section { 
      background: white; 
      padding: 25px; 
      margin: 20px 0; 
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 { 
      margin-top: 0; 
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .category-tag {
      display: inline-block;
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.9em;
      margin: 2px;
    }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .timestamp { color: #999; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 Rapport d'Analyse OSINT</h1>
    <p><strong>Cible:</strong> ${summary.target}</p>
    <p class="timestamp">Généré le ${new Date(summary.analysisDate).toLocaleString()}</p>
  </div>
  
  <div class="stats">
    <div class="stat-card">
      <h3>${summary.totalEntities}</h3>
      <p>Entités trouvées</p>
    </div>
    <div class="stat-card">
      <h3 style="color: ${riskColors[summary.riskLevel]};">${summary.riskScore}</h3>
      <p>Score de risque</p>
    </div>
    <div class="stat-card">
      <h3>${Object.keys(summary.categories).length}</h3>
      <p>Catégories</p>
    </div>
  </div>
  
  <div class="section">
    <h2>⚠️ Évaluation du Risque</h2>
    <p>Niveau: <span class="risk-badge">${summary.riskLevel}</span></p>
    <p>Score: ${summary.riskScore}/100</p>
  </div>
  
  <div class="section">
    <h2>📊 Répartition par Catégorie</h2>
    <p>
      ${Object.entries(summary.categories).map(([cat, count]) => 
        `<span class="category-tag">${cat}: ${count}</span>`
      ).join(' ')}
    </p>
  </div>
  
  <div class="section">
    <h2>🔎 Découvertes Clés</h2>
    ${findingsHTML}
  </div>
  
  <div class="section">
    <h2>💡 Recommandations</h2>
    <ul>
      ${recommendationsHTML}
    </ul>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #999;">
    <p>Rapport généré par OSINT Master Pro</p>
  </div>
</body>
</html>
  `;
}

export default intelligenceRouter;
