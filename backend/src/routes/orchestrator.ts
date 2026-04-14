/**
 * Routes API pour l'orchestration avancée multi-agents
 * Investigation de niveau professionnel avec chaînes d'analyse automatiques
 */

import { Router } from "express";
import { agentOrchestrator, InvestigationSession } from "../services/agentOrchestrator";
import { enrichmentEngine } from "../services/enrichmentEngine";
import { opsecManager, OPSECLevel } from "../services/opsecManager";
import { logger } from "../utils/logger";

export const orchestratorRouter = Router();

// ============================================================================
// SESSIONS D'INVESTIGATION
// ============================================================================

// Crée une nouvelle session d'investigation avancée
orchestratorRouter.post("/sessions", async (req, res) => {
  try {
    const { name, target, targetType, config } = req.body;

    if (!name || !target || !targetType) {
      return res.status(400).json({ error: "name, target, targetType required" });
    }

    const session = await agentOrchestrator.createSession(name, target, targetType);

    logger.info(`[API] Created investigation session: ${session.id} for ${target}`);

    res.json({
      success: true,
      sessionId: session.id,
      name: session.name,
      status: session.status,
      createdAt: session.createdAt,
      message: `Investigation started. Target: ${target}, Type: ${targetType}`
    });
  } catch (error: any) {
    logger.error("[API] Failed to create session:", error);
    res.status(500).json({ error: error.message });
  }
});

// Liste toutes les sessions
orchestratorRouter.get("/sessions", async (_req, res) => {
  try {
    const sessions = agentOrchestrator.getAllSessions();

    res.json({
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        createdAt: s.createdAt,
        summary: s.summary
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Récupère une session spécifique
orchestratorRouter.get("/sessions/:id", async (req, res) => {
  try {
    const session = agentOrchestrator.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        createdAt: session.createdAt,
        config: session.config
      },
      entities: Array.from(session.entities.values()),
      correlations: Array.from(session.correlations.values()),
      tasks: session.tasks.map(t => ({
        id: t.id,
        type: t.type,
        target: t.target,
        status: t.status,
        depth: t.depth,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        result: t.result ? {
          success: t.result.success,
          entityCount: t.result.entities?.length || 0,
          correlationCount: t.result.correlations?.length || 0,
          confidence: t.result.confidence
        } : null
      })),
      summary: session.summary
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Exporte une session complète
orchestratorRouter.get("/sessions/:id/export", async (req, res) => {
  try {
    const export_ = await agentOrchestrator.exportSession(req.params.id);
    if (!export_) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(export_);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pause/Reprise d'une session
orchestratorRouter.post("/sessions/:id/pause", async (req, res) => {
  try {
    const success = agentOrchestrator.pauseSession(req.params.id);
    res.json({ success, message: success ? "Session paused" : "Session not found" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

orchestratorRouter.post("/sessions/:id/resume", async (req, res) => {
  try {
    const success = agentOrchestrator.resumeSession(req.params.id);
    res.json({ success, message: success ? "Session resumed" : "Session not found" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENRICHISSEMENT EN CASCADE
// ============================================================================

// Démarre un arbre d'enrichissement
orchestratorRouter.post("/enrich", async (req, res) => {
  try {
    const { entity, config } = req.body;

    if (!entity || !entity.type || !entity.value) {
      return res.status(400).json({ error: "entity with type and value required" });
    }

    // Démarre l'enrichissement en cascade
    const tree = await enrichmentEngine.startCascade(entity);

    logger.info(`[API] Started enrichment cascade for ${entity.type}:${entity.value}`);

    res.json({
      success: true,
      treeId: tree.rootId,
      totalNodes: tree.totalNodes,
      maxDepth: tree.maxDepth,
      rootEntity: entity
    });
  } catch (error: any) {
    logger.error("[API] Failed to start enrichment:", error);
    res.status(500).json({ error: error.message });
  }
});

// Récupère le statut d'un arbre d'enrichissement
orchestratorRouter.get("/enrich/:treeId/status", async (req, res) => {
  try {
    const status = enrichmentEngine.getTreeStatus(req.params.treeId);
    if (!status) {
      return res.status(404).json({ error: "Tree not found" });
    }

    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Exporte un arbre en format graphe
orchestratorRouter.get("/enrich/:treeId/graph", async (req, res) => {
  try {
    const graph = enrichmentEngine.exportGraph(req.params.treeId);
    if (!graph) {
      return res.status(404).json({ error: "Tree not found" });
    }

    res.json(graph);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trouve les chemins entre deux entités
orchestratorRouter.post("/enrich/:treeId/paths", async (req, res) => {
  try {
    const { fromId, toId } = req.body;
    const paths = enrichmentEngine.findPaths(req.params.treeId, fromId, toId);

    res.json({ paths, count: paths.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trouve les clusters
orchestratorRouter.get("/enrich/:treeId/clusters", async (req, res) => {
  try {
    const clusters = enrichmentEngine.findClusters(req.params.treeId);
    res.json({ clusters, count: clusters.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// OPSEC - SÉCURITÉ OPÉRATIONNELLE
// ============================================================================

// Configure le niveau OPSEC
orchestratorRouter.post("/opsec/level", async (req, res) => {
  try {
    const { level } = req.body;

    if (!["standard", "cautious", "paranoid"].includes(level)) {
      return res.status(400).json({ error: "Invalid level. Use: standard, cautious, paranoid" });
    }

    opsecManager.setLevel(level as OPSECLevel);

    res.json({
      success: true,
      level,
      message: `OPSEC level set to ${level}`,
      details: {
        standard: "Minimal protection, direct requests",
        cautious: "Proxy rotation, fingerprint randomization, rate limiting",
        paranoid: "Tor + aggressive rotation, maximum delays, anti-fingerprinting"
      }[level]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Active/désactive Tor
orchestratorRouter.post("/opsec/tor", async (req, res) => {
  try {
    const { enabled } = req.body;
    opsecManager.enableTor(enabled);

    const check = await opsecManager.checkTor();

    res.json({
      success: true,
      torEnabled: enabled,
      torWorking: check.working,
      details: check
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Ajoute des proxies
orchestratorRouter.post("/opsec/proxies", async (req, res) => {
  try {
    const { proxies } = req.body;

    if (!Array.isArray(proxies)) {
      return res.status(400).json({ error: "proxies array required" });
    }

    opsecManager.addProxies(proxies);

    res.json({
      success: true,
      added: proxies.length,
      message: `${proxies.length} proxies added to rotation`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mode sensible (OPSEC maximal temporaire)
orchestratorRouter.post("/opsec/sensitive-mode", async (req, res) => {
  try {
    const { durationMinutes = 30 } = req.body;

    opsecManager.enableSensitiveMode(durationMinutes);

    res.json({
      success: true,
      mode: "paranoid",
      torEnabled: true,
      duration: durationMinutes,
      message: `SENSITIVE MODE enabled for ${durationMinutes} minutes. Maximum OPSEC active.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rapport OPSEC
orchestratorRouter.get("/opsec/report", async (_req, res) => {
  try {
    const report = opsecManager.generateReport();

    res.json({
      report,
      recommendations: [
        report.failedRequests > report.totalRequests * 0.1 && "High failure rate detected - consider adding more proxies",
        report.blockedDetections > 0 && `${report.blockedDetections} domains temporarily blocked - rotation working`,
        report.successfulRequests === 0 && "No successful requests - check proxy/Tor configuration"
      ].filter(Boolean)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Efface les traces
orchestratorRouter.post("/opsec/clear-traces", async (_req, res) => {
  try {
    opsecManager.clearTraces();
    res.json({ success: true, message: "All OPSEC traces cleared" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// INVESTIGATION COMPLÈTE (One-shot)
// ============================================================================

// Lance une investigation complète avec tous les modules
orchestratorRouter.post("/investigate", async (req, res) => {
  try {
    const {
      target,
      targetType,
      name,
      depth = 3,
      enableEnrichment = true,
      enableAI = true,
      opsecLevel = "cautious",
      prioritySources = [] // sources prioritaires à vérifier en premier
    } = req.body;

    if (!target || !targetType) {
      return res.status(400).json({ error: "target and targetType required" });
    }

    // Configure OPSEC
    opsecManager.setLevel(opsecLevel as OPSECLevel);

    // Crée la session
    const sessionName = name || `Investigation-${target}-${Date.now()}`;
    const session = await agentOrchestrator.createSession(sessionName, target, targetType);

    logger.info(`[API] Full investigation started: ${session.id} for ${target} (depth: ${depth})`);

    res.json({
      success: true,
      investigationId: session.id,
      message: "Full investigation launched",
      configuration: {
        target,
        targetType,
        depth,
        enableEnrichment,
        enableAI,
        opsecLevel
      },
      endpoints: {
        status: `/api/orchestrator/sessions/${session.id}`,
        results: `/api/orchestrator/sessions/${session.id}/export`
      }
    });
  } catch (error: any) {
    logger.error("[API] Failed to start investigation:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RECHERCHE DE CHEMINS (OSINT Relationnel)
// ============================================================================

// Trouve les connexions entre deux cibles
orchestratorRouter.post("/connect", async (req, res) => {
  try {
    const { targetA, targetB, targetTypeA, targetTypeB, maxDepth = 4 } = req.body;

    if (!targetA || !targetB) {
      return res.status(400).json({ error: "targetA and targetB required" });
    }

    // Lance deux investigations en parallèle puis cherche les connexions
    const [sessionA, sessionB] = await Promise.all([
      agentOrchestrator.createSession(`Connect-${targetA}`, targetA, targetTypeA || "username"),
      agentOrchestrator.createSession(`Connect-${targetB}`, targetB, targetTypeB || "username")
    ]);

    res.json({
      success: true,
      message: "Connection analysis started",
      investigationA: sessionA.id,
      investigationB: sessionB.id,
      checkStatus: `/api/orchestrator/sessions/${sessionA.id}`,
      note: "Compare entities from both investigations to find connections"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ANALYSE DE RISQUE
// ============================================================================

// Évalue le risque d'une cible
orchestratorRouter.post("/risk-assessment", async (req, res) => {
  try {
    const { target, targetType } = req.body;

    // Lance une investigation rapide focalisée sur l'évaluation de risque
    const session = await agentOrchestrator.createSession(
      `Risk-${target}`,
      target,
      targetType || "username"
    );

    res.json({
      success: true,
      assessmentId: session.id,
      message: "Risk assessment started",
      factors: [
        "Digital footprint size",
        "Exposure in data breaches",
        "Privacy settings strength",
        "Cross-platform linkability",
        "Geographic exposure",
        "Historical data availability"
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
