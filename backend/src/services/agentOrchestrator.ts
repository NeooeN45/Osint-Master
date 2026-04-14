/**
 * Agent Orchestrator v2.0 - Multi-Engine OSINT Investigation System
 * Integrates real OSINT tools with AI analysis
 * Cascade enrichment: triggers new scans on high-confidence discoveries
 * Fallback mode: works without Ollama using real tool execution
 */

import { ollamaService } from "./ollamaService";
import { osintEngine, DiscoveredEntity as ToolDiscoveredEntity, ToolResult } from "./osintEngine";
import { logger } from "../utils/logger";
import crypto from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface AgentTask {
  id: string;
  type: "discovery" | "enrichment" | "correlation" | "geolocation" | "verification" | "synthesis";
  target: string;
  targetType: "username" | "email" | "phone" | "ip" | "domain" | "fullname" | "photo" | "document";
  priority: number; // 1-10
  depth: number; // niveau de profondeur (1-5)
  parentTaskId?: string;
  context?: Record<string, any>; // données découvertes par les tâches parentes
  status: "pending" | "running" | "completed" | "failed";
  result?: AgentResult;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}

export interface AgentResult {
  success: boolean;
  entities: DiscoveredEntity[];
  correlations: DiscoveredCorrelation[];
  analysis: string;
  confidence: number;
  rawData?: any;
  nextTasks?: Partial<AgentTask>[]; // suggestions de tâches suivantes
  warnings?: string[];
}

export interface DiscoveredEntity {
  id: string;
  type: string;
  value: string;
  source: string;
  confidence: number;
  metadata?: Record<string, any>;
  discoveredAt: string;
  verificationStatus: "unverified" | "pending" | "verified" | "false_positive";
  // Cascade enrichment fields
  cascadeTriggered?: boolean;
  relatedFindings?: string[];
}

export interface DiscoveredCorrelation {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  strength: number; // 0-1
  evidence: string[];
  discoveredAt: string;
}

export interface OrchestrationConfig {
  maxDepth: number;
  maxParallelTasks: number;
  enableAIAnalysis: boolean;
  enableAutoEnrichment: boolean;
  enableGeolocation: boolean;
  verifyCrossSources: boolean;
  minConfidenceThreshold: number;
  opsecMode: "standard" | "cautious" | "paranoid";
  // Cascade enrichment configuration
  enableCascadeEnrichment: boolean;
  highConfidenceThreshold: number; // Entities above this trigger new scans
  cascadeMaxDepth: number; // Max depth for cascade scans
  cascadeToolsPerEntity: number; // Max tools to run per discovered entity
}

export interface InvestigationSession {
  id: string;
  name: string;
  createdAt: string;
  config: OrchestrationConfig;
  tasks: AgentTask[];
  entities: Map<string, DiscoveredEntity>;
  correlations: Map<string, DiscoveredCorrelation>;
  status: "active" | "paused" | "completed" | "failed";
  summary?: InvestigationSummary;
}

export interface InvestigationSummary {
  totalEntities: number;
  totalCorrelations: number;
  byType: Record<string, number>;
  confidenceDistribution: { high: number; medium: number; low: number };
  timelineRange: { from: string; to: string } | null;
  keyFindings: string[];
  riskIndicators: string[];
}

// ============================================================================
// AGENT DEFINITIONS
// ============================================================================

interface AgentDefinition {
  type: AgentTask["type"];
  name: string;
  description: string;
  capabilities: string[];
  promptTemplate: string;
  outputSchema: Record<string, any>;
}

const AGENTS: AgentDefinition[] = [
  {
    type: "discovery",
    name: "Discovery Agent",
    description: "Découvre les entités primaires à partir d'une cible initiale",
    capabilities: ["username_search", "email_lookup", "phone_trace", "domain_enum"],
    promptTemplate: `Tu es un agent OSINT de découverte. Analyse la cible suivante et identifie TOUTES les entités associées.

CIBLE: {target}
TYPE: {targetType}
CONTEXTE: {context}

Instructions:
1. Identifie les profils sur les réseaux sociaux (Facebook, Instagram, Twitter/X, LinkedIn, TikTok, Snapchat, Telegram, Discord)
2. Cherche les adresses email associées
3. Identifie les numéros de téléphone
4. Trouve les adresses IP associées aux services
5. Identifie les noms de domaines liés
6. Cherche les mentions dans les fuites de données (breaches)
7. Identifie les photos/profils similaires (reverse image search)
8. Trouve les connexions géographiques

Format de sortie JSON:
{
  "entities": [
    {
      "type": "username|email|phone|ip|domain|fullname|location|photo",
      "value": "...",
      "source": "plateforme/source",
      "confidence": 0-100,
      "metadata": { "url": "...", "platform": "...", "discovered_via": "..." }
    }
  ],
  "nextSteps": ["suggestions d'enrichissement"],
  "confidence": 0-100,
  "analysis": "résumé textuel des découvertes"
}`,
    outputSchema: { entities: "array", nextSteps: "array", confidence: "number", analysis: "string" }
  },
  {
    type: "enrichment",
    name: "Enrichment Agent",
    description: "Enrichit une entité avec des métadonnées complètes",
    capabilities: ["metadata_extraction", "historical_data", "association_mining"],
    promptTemplate: `Tu es un agent d'enrichissement OSINT. Enrichis l'entité suivante avec le maximum d'informations.

ENTITÉ: {target}
TYPE: {targetType}
CONTEXTE DÉCOUVERT: {context}

Instructions:
1. Pour un username: trouve toutes les plateformes, les variations, l'activité historique
2. Pour un email: vérifie les breaches, les services associés, le format nom.prénom
3. Pour un téléphone: vérifie la validité, l'opérateur, les services de messagerie (WhatsApp, Signal, Telegram)
4. Pour une IP: géolocalisation précise, ASN, services hébergés, historique DNS
5. Pour un domain: WHOIS complet, sous-domaines, technologies, historique

Format de sortie JSON:
{
  "enrichedData": { "détails spécifiques au type" },
  "relatedEntities": ["entités découvertes lors de l'enrichissement"],
  "timeline": [{"date": "...", "event": "...", "source": "..."}],
  "confidence": 0-100,
  "analysis": "analyse approfondie"
}`,
    outputSchema: { enrichedData: "object", relatedEntities: "array", timeline: "array", confidence: "number", analysis: "string" }
  },
  {
    type: "geolocation",
    name: "Geolocation Agent",
    description: "Localisation précise et traçage géographique",
    capabilities: ["ip_geolocation", "wifi_triangulation", "photo_exif", "timezone_analysis"],
    promptTemplate: `Tu es un agent de géolocalisation OSINT. Détermine la localisation physique précise.

CIBLE: {target}
TYPE: {targetType}
DONNÉES DISPONIBLES: {context}

Instructions:
1. Pour une IP: géolocalisation précise (ville, coordonnées), ASN, datacenter vs résidentiel
2. Pour une photo: extraction EXIF GPS, repérage visuel des lieux
3. Pour un téléphone: indicatif pays, opérateur régional
4. Pour un username: fuseaux horaires des posts, mentions de lieux
5. Corrélation multi-sources: croiser IP, timezone, mentions

Format de sortie JSON:
{
  "location": {
    "country": "...",
    "region": "...",
    "city": "...",
    "coordinates": { "lat": 0, "lng": 0 },
    "precision": "exact|approximate|city_level|country_level",
    "confidence": 0-100
  },
  "infrastructure": { "ASN": "...", "ISP": "...", "datacenter": "..." },
  "timeline": [{"date": "...", "location": "...", "source": "..."}],
  "analysis": "analyse de déplacement et patterns"
}`,
    outputSchema: { location: "object", infrastructure: "object", timeline: "array", analysis: "string" }
  },
  {
    type: "correlation",
    name: "Correlation Agent",
    description: "Trouve les liens cachés entre entités",
    capabilities: ["pattern_matching", "behavioral_analysis", "network_analysis"],
    promptTemplate: `Tu es un agent de corrélation OSINT. Analyse les liens entre les entités découvertes.

ENTITÉS À ANALYSER: {entities}
CONTEXTE: {context}

Instructions:
1. Identifie les entités qui appartiennent à la même personne (cross-platform)
2. Trouve les connexions familiales/professionnelles
3. Détecte les patterns comportementaux (heures d'activité, style d'écriture)
4. Identifie les infrastructures partagées (mêmes IPs, mêmes technologies)
5. Trouve les co-occurrences (mêmes événements, mêmes lieux, mêmes connaissances)
6. Détecte les fausses pistes et les red herrings

Format de sortie JSON:
{
  "correlations": [
    {
      "source": "entity_id",
      "target": "entity_id",
      "type": "same_person|family|colleague|same_infrastructure|co_occurrence",
      "strength": 0-1,
      "evidence": ["preuve 1", "preuve 2"],
      "confidence": 0-100
    }
  ],
  "clusters": [{"name": "...", "entities": ["..."], "type": "..."}],
  "analysis": "analyse des liens et recommandations"
}`,
    outputSchema: { correlations: "array", clusters: "array", analysis: "string" }
  },
  {
    type: "verification",
    name: "Verification Agent",
    description: "Vérifie la validité et l'authenticité des découvertes",
    capabilities: ["cross_validation", "fake_detection", "source_verification"],
    promptTemplate: `Tu es un agent de vérification OSINT. Valide ou invalide les découvertes.

ENTITÉS À VÉRIFIER: {entities}
SOURCES: {sources}

Instructions:
1. Vérifie la cohérence des données (un même email ne peut pas appartenir à 2 personnes différentes)
2. Détecte les faux profils (photos générées par IA, patterns de bot)
3. Valide les sources (fiabilité de chaque outil/source)
4. Identifie les faux positifs
5. Évalue la fraîcheur des données
6. Détecte les contradictions entre sources

Format de sortie JSON:
{
  "verifications": [
    {
      "entityId": "...",
      "status": "verified|unverified|false_positive|suspicious",
      "confidence": 0-100,
      "reasoning": "...",
      "contradictions": ["..."]
    }
  ],
  "falsePositives": ["entités à écarter"],
  "warnings": ["alertes sur la qualité des données"]
}`,
    outputSchema: { verifications: "array", falsePositives: "array", warnings: "array" }
  },
  {
    type: "synthesis",
    name: "Synthesis Agent",
    description: "Synthétise toutes les découvertes en un rapport structuré",
    capabilities: ["report_generation", "risk_assessment", "timeline_reconstruction"],
    promptTemplate: `Tu es un agent de synthèse OSINT. Crée un rapport d'investigation complet.

SESSION COMPLÈTE:
- Entités découvertes: {entityCount}
- Corrélations trouvées: {correlationCount}
- Données brutes: {rawData}

Instructions:
1. Rédige un résumé exécutif (ce qu'on a trouvé, pourquoi c'est important)
2. Structure les findings par type (identité, digital, géo, réseau)
3. Reconstruis la timeline d'activité
4. Évalue les risques et les opportunités
5. Identifie les lacunes (ce qu'on n'a pas trouvé et pourquoi)
6. Prochaines étapes recommandées

Format de sortie JSON:
{
  "executiveSummary": "...",
  "keyFindings": ["..."],
  "identityProfile": { "nom": "...", "aliases": ["..."], "âge_estimé": "..." },
  "digitalFootprint": { "plateformes": [...], "activité": [...] },
  "geographicProfile": { "localisations": [...], "patterns": "..." },
  "networkAnalysis": { "connexions": [...], "influence": "..." },
  "riskAssessment": { "niveau": "low|medium|high|critical", "facteurs": [...] },
  "timeline": [{"date": "...", "event": "...", "importance": "..."}],
  "gaps": ["ce qu'il manque"],
  "recommendations": ["prochaines étapes"]
}`,
    outputSchema: { executiveSummary: "string", keyFindings: "array", identityProfile: "object", riskAssessment: "object", timeline: "array", recommendations: "array" }
  }
];

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class AgentOrchestrator {
  private sessions: Map<string, InvestigationSession> = new Map();
  private runningTasks: Set<string> = new Set();
  private config: OrchestrationConfig;

  constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = {
      maxDepth: 5,
      maxParallelTasks: 5,
      enableAIAnalysis: true,
      enableAutoEnrichment: true,
      enableGeolocation: true,
      verifyCrossSources: true,
      minConfidenceThreshold: 60,
      opsecMode: "cautious",
      // Cascade enrichment defaults
      enableCascadeEnrichment: true,
      highConfidenceThreshold: 85,
      cascadeMaxDepth: 3,
      cascadeToolsPerEntity: 3,
      ...config
    };
  }

  /**
   * Crée une nouvelle session d'investigation
   */
  async createSession(name: string, initialTarget: string, targetType: AgentTask["targetType"]): Promise<InvestigationSession> {
    const sessionId = crypto.randomUUID();
    const session: InvestigationSession = {
      id: sessionId,
      name,
      createdAt: new Date().toISOString(),
      config: this.config,
      tasks: [],
      entities: new Map(),
      correlations: new Map(),
      status: "active"
    };

    // Crée la tâche initiale de découverte
    const initialTask: AgentTask = {
      id: crypto.randomUUID(),
      type: "discovery",
      target: initialTarget,
      targetType,
      priority: 10,
      depth: 1,
      status: "pending",
      retryCount: 0
    };

    session.tasks.push(initialTask);
    this.sessions.set(sessionId, session);

    logger.info(`[Orchestrator] Session ${sessionId} created for target: ${initialTarget}`);

    // Démarre l'orchestration
    this.processQueue(sessionId);

    return session;
  }

  /**
   * Traite la file d'attente de tâches
   */
  private async processQueue(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "active") return;

    const pendingTasks = session.tasks.filter(t => t.status === "pending");
    const runningTasks = session.tasks.filter(t => t.status === "running");

    if (pendingTasks.length === 0 && runningTasks.length === 0) {
      // Toutes les tâches terminées → génère la synthèse finale
      await this.generateFinalSynthesis(sessionId);
      return;
    }

    // Limite le nombre de tâches parallèles
    const availableSlots = this.config.maxParallelTasks - runningTasks.length;
    if (availableSlots <= 0) return;

    // Priorise par depth (priorité aux tâches de niveau 1) puis par priority
    const tasksToRun = pendingTasks
      .sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return b.priority - a.priority;
      })
      .slice(0, availableSlots);

    // Exécute les tâches en parallèle
    await Promise.all(tasksToRun.map(task => this.executeTask(sessionId, task)));

    // Continue avec les prochaines tâches
    setImmediate(() => this.processQueue(sessionId));
  }

  /**
   * Exécute une tâche avec l'agent approprié
   * Integrates real OSINT tools with optional AI analysis
   */
  private async executeTask(sessionId: string, task: AgentTask): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    task.status = "running";
    task.startedAt = new Date().toISOString();
    this.runningTasks.add(task.id);

    logger.info(`[Orchestrator] Executing task ${task.type} on ${task.target} (depth ${task.depth})`);

    try {
      // Step 1: Execute real OSINT tools based on task type
      const toolResults = await this.executeRealTools(task);
      
      // Step 2: Check if Ollama is available
      const ollamaAvailable = await this.checkOllamaAvailability();
      
      let result: AgentResult;
      
      if (ollamaAvailable && this.config.enableAIAnalysis) {
        // Step 3a: Use AI analysis with tool results
        result = await this.executeAIAnalysis(task, session, toolResults);
      } else {
        // Step 3b: Use tool results directly (fallback mode)
        result = this.buildResultFromTools(toolResults, task);
      }

      // Step 4: Update task
      task.result = result;
      task.status = "completed";
      task.completedAt = new Date().toISOString();

      // Step 5: Process discovered entities
      await this.processDiscoveredEntities(session, task, result);

      // Step 6: Cascade enrichment for high-confidence entities
      if (this.config.enableCascadeEnrichment && task.depth < this.config.cascadeMaxDepth) {
        await this.triggerCascadeEnrichment(session, task, result);
      }

      logger.info(`[Orchestrator] Task ${task.id} completed. Found ${result.entities?.length || 0} entities, ${result.correlations?.length || 0} correlations`);

    } catch (error) {
      logger.error(`[Orchestrator] Task ${task.id} failed:`, error);
      task.status = "failed";
      task.retryCount++;

      // Retry si < 3 tentatives
      if (task.retryCount < 3) {
        task.status = "pending";
        logger.info(`[Orchestrator] Retrying task ${task.id} (attempt ${task.retryCount})`);
      }
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * Check if Ollama AI service is available
   */
  private async checkOllamaAvailability(): Promise<boolean> {
    try {
      return await ollamaService.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Execute real OSINT tools based on task type and target
   */
  private async executeRealTools(task: AgentTask): Promise<ToolResult[]> {
    const toolIds: string[] = [];
    
    // Select tools based on task type
    switch (task.type) {
      case "discovery":
        toolIds.push(...osintEngine.getToolsForTargetType(task.targetType));
        break;
      case "enrichment":
        // Add specific enrichment tools
        if (task.targetType === "email") toolIds.push("holehe", "h8mail", "ghunt");
        if (task.targetType === "username") toolIds.push("sherlock", "maigret", "socialscan");
        if (task.targetType === "domain") toolIds.push("subfinder", "assetfinder", "theharvester");
        if (task.targetType === "ip") toolIds.push("shodan_cli");
        if (task.targetType === "phone") toolIds.push("phoneinfoga");
        break;
      case "geolocation":
        if (task.targetType === "ip") toolIds.push("shodan_cli");
        break;
      default:
        // For other task types, use discovery tools
        toolIds.push(...osintEngine.getToolsForTargetType(task.targetType));
    }
    
    // Limit number of tools per task
    const limitedToolIds = toolIds.slice(0, this.config.cascadeToolsPerEntity);
    
    if (limitedToolIds.length === 0) {
      return [];
    }
    
    logger.info(`[Orchestrator] Executing ${limitedToolIds.length} real OSINT tools: ${limitedToolIds.join(", ")}`);
    
    // Execute tools
    const results: ToolResult[] = [];
    for (const toolId of limitedToolIds) {
      try {
        const result = await osintEngine.executeTool(toolId, task.target);
        results.push(result);
        
        if (result.success && result.entities && result.entities.length > 0) {
          logger.info(`[Orchestrator] Tool ${toolId} found ${result.entities.length} entities`);
        }
      } catch (error) {
        logger.warn(`[Orchestrator] Tool ${toolId} failed:`, error);
      }
    }
    
    return results;
  }

  /**
   * Execute AI analysis with tool results as context
   */
  private async executeAIAnalysis(task: AgentTask, session: InvestigationSession, toolResults: ToolResult[]): Promise<AgentResult> {
    const agent = AGENTS.find(a => a.type === task.type);
    if (!agent) throw new Error(`Unknown agent type: ${task.type}`);

    // Build context with tool results
    const context = this.buildContext(session, task);
    const toolContext = {
      ...context,
      toolResults: toolResults.map(r => ({
        tool: r.tool,
        success: r.success,
        parsed: r.parsed,
        entities: r.entities,
        confidence: r.confidence,
        realExecution: r.realExecution
      }))
    };

    // Construit le prompt
    const prompt = agent.promptTemplate
      .replace("{target}", task.target)
      .replace("{targetType}", task.targetType)
      .replace("{context}", JSON.stringify(toolContext, null, 2))
      .replace("{entityCount}", session.entities.size.toString())
      .replace("{correlationCount}", session.correlations.size.toString())
      .replace("{entities}", JSON.stringify(Array.from(session.entities.values())))
      .replace("{sources}", JSON.stringify(session.tasks.filter(t => t.result).map(t => t.result?.rawData)));

    // Appelle l'IA
    const aiResult = await ollamaService.chat([
      { role: "system", content: "Tu es un agent OSINT spécialisé. Réponds UNIQUEMENT en JSON valide. Analyse les résultats des outils OSINT fournis." },
      { role: "user", content: prompt }
    ], this.getAgentModel(task.type));

    // Parse le résultat
    return this.parseAIResponse(aiResult.content, agent.outputSchema);
  }

  /**
   * Build result from tool outputs when AI is unavailable
   */
  private buildResultFromTools(toolResults: ToolResult[], task: AgentTask): AgentResult {
    // Aggregate entities from all tools
    const allEntities: DiscoveredEntity[] = [];
    const correlations: DiscoveredCorrelation[] = [];
    const entityMap = new Map<string, DiscoveredEntity>();
    
    for (const toolResult of toolResults) {
      for (const entity of toolResult.entities || []) {
        const key = `${entity.type}:${entity.value.toLowerCase()}`;
        
        if (!entityMap.has(key)) {
          const discoveredEntity: DiscoveredEntity = {
            id: crypto.createHash("sha256").update(key).digest("hex").substring(0, 16),
            type: entity.type,
            value: entity.value,
            source: toolResult.tool,
            confidence: entity.confidence,
            metadata: entity.context ? { context: entity.context } : {},
            discoveredAt: new Date().toISOString(),
            verificationStatus: toolResult.realExecution ? "verified" : "unverified"
          };
          
          entityMap.set(key, discoveredEntity);
          allEntities.push(discoveredEntity);
        }
      }
    }
    
    // Build analysis summary
    const toolNames = toolResults.map(r => r.tool).join(", ");
    const successfulTools = toolResults.filter(r => r.success).length;
    
    return {
      success: successfulTools > 0,
      entities: allEntities,
      correlations,
      analysis: `Executed ${toolResults.length} OSINT tools (${successfulTools} successful). Found ${allEntities.length} entities. Tools used: ${toolNames}`,
      confidence: allEntities.length > 0 ? Math.max(...allEntities.map(e => e.confidence)) : 0,
      rawData: { toolResults },
      nextTasks: this.suggestNextTasks(allEntities, task),
      warnings: toolResults.some(r => !r.realExecution) ? ["Some results are from simulated execution"] : []
    };
  }

  /**
   * Suggest next tasks based on discovered entities
   */
  private suggestNextTasks(entities: DiscoveredEntity[], parentTask: AgentTask): Partial<AgentTask>[] {
    const nextTasks: Partial<AgentTask>[] = [];
    
    for (const entity of entities) {
      if (entity.confidence >= this.config.highConfidenceThreshold) {
        nextTasks.push({
          type: "enrichment",
          target: entity.value,
          targetType: entity.type as any,
          priority: 8,
          context: { discoveredFrom: parentTask.target }
        });
      }
    }
    
    return nextTasks.slice(0, 5); // Limit suggestions
  }

  /**
   * Process discovered entities and add to session
   */
  private async processDiscoveredEntities(session: InvestigationSession, task: AgentTask, result: AgentResult): Promise<void> {
    if (!result.entities) return;
    
    for (const entity of result.entities) {
      const entityId = crypto.createHash("sha256").update(`${entity.type}:${entity.value}`).digest("hex").substring(0, 16);
      
      if (!session.entities.has(entityId)) {
        session.entities.set(entityId, {
          ...entity,
          id: entityId,
          discoveredAt: new Date().toISOString(),
          source: task.type,
          verificationStatus: "unverified"
        });

        // Create enrichment tasks for new entities
        if (this.config.enableAutoEnrichment && task.depth < this.config.maxDepth) {
          this.createEnrichmentTasks(session, entityId, entity, task.depth + 1);
        }
      }
    }
    
    // Add correlations
    if (result.correlations) {
      for (const corr of result.correlations) {
        const corrId = crypto.createHash("sha256").update(`${corr.sourceEntityId}:${corr.targetEntityId}:${corr.type}`).digest("hex").substring(0, 16);
        if (!session.correlations.has(corrId)) {
          session.correlations.set(corrId, {
            ...corr,
            id: corrId,
            discoveredAt: new Date().toISOString()
          });
        }
      }
    }
    
    // Create next tasks
    if (result.nextTasks && task.depth < this.config.maxDepth) {
      for (const nextTask of result.nextTasks) {
        session.tasks.push({
          id: crypto.randomUUID(),
          type: nextTask.type || "enrichment",
          target: nextTask.target || task.target,
          targetType: nextTask.targetType || task.targetType,
          priority: nextTask.priority || 5,
          depth: task.depth + 1,
          parentTaskId: task.id,
          context: { ...task.context, parentResult: result },
          status: "pending",
          retryCount: 0
        });
      }
    }
  }

  /**
   * Trigger cascade enrichment for high-confidence entities
   */
  private async triggerCascadeEnrichment(session: InvestigationSession, task: AgentTask, result: AgentResult): Promise<void> {
    if (!result.entities) return;
    
    const highConfidenceEntities = result.entities.filter(
      e => e.confidence >= this.config.highConfidenceThreshold && !e.cascadeTriggered
    );
    
    for (const entity of highConfidenceEntities) {
      entity.cascadeTriggered = true;
      
      logger.info(`[Orchestrator] Triggering cascade for high-confidence entity: ${entity.type}:${entity.value}`);
      
      try {
        // Execute cascade enrichment
        const cascadeResults = await osintEngine.executeCascade(
          entity as ToolDiscoveredEntity,
          task.depth,
          this.config.cascadeMaxDepth
        );
        
        // Process cascade results
        for (const cascadeResult of cascadeResults) {
          for (const newEntity of cascadeResult.entities || []) {
            const entityId = crypto.createHash("sha256").update(`${newEntity.type}:${newEntity.value}`).digest("hex").substring(0, 16);
            
            if (!session.entities.has(entityId)) {
              session.entities.set(entityId, {
                id: entityId,
                type: newEntity.type,
                value: newEntity.value,
                source: `cascade_${cascadeResult.tool}`,
                confidence: newEntity.confidence,
                metadata: newEntity.context ? { context: newEntity.context, parentEntity: entity.value } : { parentEntity: entity.value },
                discoveredAt: new Date().toISOString(),
                verificationStatus: cascadeResult.realExecution ? "verified" : "unverified",
                cascadeTriggered: false
              });
            }
          }
        }
      } catch (error) {
        logger.error(`[Orchestrator] Cascade enrichment failed for ${entity.value}:`, error);
      }
    }
  }

  /**
   * Crée des tâches d'enrichissement automatiques
   */
  private createEnrichmentTasks(session: InvestigationSession, entityId: string, entity: DiscoveredEntity, depth: number): void {
    // Enrichissement par type
    switch (entity.type) {
      case "email":
        session.tasks.push({
          id: crypto.randomUUID(),
          type: "enrichment",
          target: entity.value,
          targetType: "email",
          priority: 8,
          depth,
          context: { parentEntityId: entityId },
          status: "pending",
          retryCount: 0
        });
        break;

      case "ip":
        if (this.config.enableGeolocation) {
          session.tasks.push({
            id: crypto.randomUUID(),
            type: "geolocation",
            target: entity.value,
            targetType: "ip",
            priority: 9,
            depth,
            context: { parentEntityId: entityId },
            status: "pending",
            retryCount: 0
          });
        }
        break;

      case "phone":
        session.tasks.push({
          id: crypto.randomUUID(),
          type: "enrichment",
          target: entity.value,
          targetType: "phone",
          priority: 7,
          depth,
          context: { parentEntityId: entityId },
          status: "pending",
          retryCount: 0
        });
        break;
    }

    // Vérification croisée si activé
    if (this.config.verifyCrossSources && depth <= 2) {
      session.tasks.push({
        id: crypto.randomUUID(),
        type: "verification",
        target: entity.value,
        targetType: entity.type as any,
        priority: 6,
        depth,
        context: { parentEntityId: entityId, entitiesToVerify: [entityId] },
        status: "pending",
        retryCount: 0
      });
    }
  }

  /**
   * Génère la synthèse finale
   */
  private async generateFinalSynthesis(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    logger.info(`[Orchestrator] Generating final synthesis for session ${sessionId}`);

    const synthesisTask: AgentTask = {
      id: crypto.randomUUID(),
      type: "synthesis",
      target: session.name,
      targetType: "fullname",
      priority: 10,
      depth: 0,
      status: "running",
      startedAt: new Date().toISOString(),
      retryCount: 0
    };

    try {
      const agent = AGENTS.find(a => a.type === "synthesis")!;
      const context = {
        entities: Array.from(session.entities.values()),
        correlations: Array.from(session.correlations.values()),
        tasks: session.tasks.map(t => ({ type: t.type, status: t.status, result: t.result }))
      };

      const prompt = agent.promptTemplate
        .replace("{entityCount}", session.entities.size.toString())
        .replace("{correlationCount}", session.correlations.size.toString())
        .replace("{rawData}", JSON.stringify(context, null, 2));

      const aiResult = await ollamaService.chat([
        { role: "system", content: "Tu es un analyste OSINT senior. Réponds en JSON." },
        { role: "user", content: prompt }
      ], this.getAgentModel("synthesis"));

      const result = this.parseAIResponse(aiResult.content, agent.outputSchema);
      synthesisTask.result = result;
      synthesisTask.status = "completed";
      synthesisTask.completedAt = new Date().toISOString();

      session.tasks.push(synthesisTask);
      session.status = "completed";
      session.summary = this.generateSummary(session);

      logger.info(`[Orchestrator] Session ${sessionId} completed. Summary: ${session.summary.totalEntities} entities, ${session.summary.totalCorrelations} correlations`);

    } catch (error) {
      logger.error(`[Orchestrator] Synthesis failed:`, error);
      synthesisTask.status = "failed";
      session.tasks.push(synthesisTask);
      session.status = "failed";
    }
  }

  /**
   * Génère un résumé statistique
   */
  private generateSummary(session: InvestigationSession): InvestigationSummary {
    const entities = Array.from(session.entities.values());
    const correlations = Array.from(session.correlations.values());

    const byType: Record<string, number> = {};
    for (const e of entities) {
      byType[e.type] = (byType[e.type] || 0) + 1;
    }

    const confidenceDistribution = {
      high: entities.filter(e => e.confidence >= 80).length,
      medium: entities.filter(e => e.confidence >= 60 && e.confidence < 80).length,
      low: entities.filter(e => e.confidence < 60).length
    };

    // Récupère les keyFindings du dernier résultat de synthèse
    const synthesisTask = session.tasks.find(t => t.type === "synthesis" && t.result);
    const keyFindings = synthesisTask?.result?.analysis
      ? [synthesisTask.result.analysis.substring(0, 200)]
      : [];

    return {
      totalEntities: entities.length,
      totalCorrelations: correlations.length,
      byType,
      confidenceDistribution,
      timelineRange: null, // TODO: calculer depuis les timestamps
      keyFindings,
      riskIndicators: []
    };
  }

  /**
   * Construit le contexte pour une tâche
   */
  private buildContext(session: InvestigationSession, task: AgentTask): any {
    const parentTask = task.parentTaskId
      ? session.tasks.find(t => t.id === task.parentTaskId)
      : null;

    return {
      sessionId: session.id,
      sessionName: session.name,
      existingEntities: Array.from(session.entities.values()),
      existingCorrelations: Array.from(session.correlations.values()),
      parentTaskResult: parentTask?.result,
      config: this.config
    };
  }

  /**
   * Parse la réponse IA en résultat structuré
   */
  private parseAIResponse(response: string, schema: Record<string, any>): AgentResult {
    try {
      // Essaie d'extraire le JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;
      const parsed = JSON.parse(jsonStr);

      return {
        success: true,
        entities: parsed.entities || parsed.enrichedData?.relatedEntities || [],
        correlations: parsed.correlations || [],
        analysis: parsed.analysis || parsed.executiveSummary || "",
        confidence: parsed.confidence || 50,
        rawData: parsed,
        nextTasks: parsed.nextSteps?.map((step: string) => ({ type: "enrichment", target: step })) || [],
        warnings: parsed.warnings || []
      };
    } catch (error) {
      logger.error(`[Orchestrator] Failed to parse AI response:`, error);
      return {
        success: false,
        entities: [],
        correlations: [],
        analysis: response.substring(0, 500),
        confidence: 0,
        rawData: response
      };
    }
  }

  /**
   * Sélectionne le meilleur modèle selon le type d'agent
   */
  private getAgentModel(agentType: string): string {
    // Priorise les modèles selon la complexité
    switch (agentType) {
      case "synthesis":
        return "dolphin-mistral"; // Meilleur pour les rapports structurés
      case "correlation":
        return "mistral"; // Bon pour l'analyse de patterns
      case "discovery":
        return "dolphin-mistral"; // Créatif pour la découverte
      default:
        return "mistral";
    }
  }

  // ============================================================================
  // API PUBLIQUE
  // ============================================================================

  getSession(sessionId: string): InvestigationSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): InvestigationSession[] {
    return Array.from(this.sessions.values());
  }

  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "paused";
      return true;
    }
    return false;
  }

  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && session.status === "paused") {
      session.status = "active";
      this.processQueue(sessionId);
      return true;
    }
    return false;
  }

  async exportSession(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      session: {
        id: session.id,
        name: session.name,
        createdAt: session.createdAt,
        status: session.status,
        summary: session.summary
      },
      entities: Array.from(session.entities.values()),
      correlations: Array.from(session.correlations.values()),
      tasks: session.tasks.map(t => ({
        id: t.id,
        type: t.type,
        target: t.target,
        status: t.status,
        result: t.result
      }))
    };
  }
}

// Singleton
export const agentOrchestrator = new AgentOrchestrator();
