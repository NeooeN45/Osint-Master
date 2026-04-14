// ============================================================================
// AUTO-INVESTIGATION SERVICE - Magical one-click deep investigation
// From single input → Complete digital footprint with AI insights
// ============================================================================

import { logger } from "../utils/logger";
import { osintEngine, ToolResult, DiscoveredEntity } from "./osintEngine";
import { intelligenceEngine, AnalysisSummary } from "./intelligenceEngine";
import { resultValidator } from "./resultValidator";
import { streamManager } from "./streamManager";

export interface InvestigationPhase {
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  results: any[];
  startTime?: Date;
  endTime?: Date;
}

export interface CompleteInvestigation {
  id: string;
  target: string;
  targetType: string;
  startTime: Date;
  endTime?: Date;
  status: "running" | "completed" | "failed";
  phases: InvestigationPhase[];
  entities: DiscoveredEntity[];
  toolResults: ToolResult[];
  intelligence?: AnalysisSummary;
  graph: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  geoData: GeoDiscovery[];
  insights: InvestigationInsight[];
  recommendations: string[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  value: string;
  confidence: number;
  discoveredAt: Date;
  source: string;
  size: number;
  color: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  strength: number;
  evidence: string;
}

export interface GeoDiscovery {
  coordinates: { lat: number; lng: number };
  accuracy: string;
  source: string;
  evidence: string;
  type: string;
  confidence: number;
}

export interface InvestigationInsight {
  type: "discovery" | "pattern" | "risk" | "opportunity" | "correlation";
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  severity?: "low" | "medium" | "high" | "critical";
}

// Color scheme for entity types
const ENTITY_COLORS: Record<string, string> = {
  username: "#8b5cf6", // Violet
  email: "#3b82f6",    // Blue
  phone: "#10b981",    // Green
  ip: "#f59e0b",       // Orange
  domain: "#ef4444",   // Red
  url: "#06b6d4",      // Cyan
  location: "#84cc16", // Lime
  social: "#ec4899",     // Pink
  crypto: "#fbbf24",     // Amber
  fullname: "#6366f1",   // Indigo
  other: "#9ca3af"       // Gray
};

export class AutoInvestigationService {
  private activeInvestigations: Map<string, CompleteInvestigation> = new Map();

  /**
   * Start a magical auto-investigation from single input
   */
  async startInvestigation(
    target: string,
    targetType?: string,
    sessionId?: string
  ): Promise<string> {
    const investigationId = sessionId || `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const detectedType = targetType || osintEngine.detectTargetType(target);
    
    logger.info(`[AUTO-INV] Starting investigation ${investigationId} for ${target} (${detectedType})`);

    // Create investigation object
    const investigation: CompleteInvestigation = {
      id: investigationId,
      target,
      targetType: detectedType,
      startTime: new Date(),
      status: "running",
      phases: [
        { name: "discovery", description: "Découverte initiale", status: "pending", progress: 0, results: [] },
        { name: "enrichment", description: "Enrichissement en cascade", status: "pending", progress: 0, results: [] },
        { name: "deep_analysis", description: "Analyse approfondie", status: "pending", progress: 0, results: [] },
        { name: "correlation", description: "Corrélation intelligente", status: "pending", progress: 0, results: [] },
        { name: "insights", description: "Génération des insights", status: "pending", progress: 0, results: [] }
      ],
      entities: [],
      toolResults: [],
      graph: { nodes: [], links: [] },
      geoData: [],
      insights: [],
      recommendations: []
    };

    this.activeInvestigations.set(investigationId, investigation);

    // Start the magical chain
    this.runInvestigationChain(investigationId, target, detectedType).catch(error => {
      logger.error(`[AUTO-INV] Investigation ${investigationId} failed:`, error);
      const inv = this.activeInvestigations.get(investigationId);
      if (inv) {
        inv.status = "failed";
        inv.endTime = new Date();
      }
    });

    return investigationId;
  }

  /**
   * The magical investigation chain
   */
  private async runInvestigationChain(
    investigationId: string,
    target: string,
    targetType: string
  ): Promise<void> {
    const investigation = this.activeInvestigations.get(investigationId)!;

    try {
      // === PHASE 1: Découverte Initiale ===
      await this.runPhase(investigationId, "discovery", async () => {
        logger.info(`[AUTO-INV] Phase 1: Discovery for ${target}`);
        
        // Get appropriate tools for target type
        const toolIds = osintEngine.getToolsForTarget(targetType);
        const discoveryResults: ToolResult[] = [];

        // Run discovery tools in parallel with limit
        const batchSize = 5;
        for (let i = 0; i < toolIds.length; i += batchSize) {
          const batch = toolIds.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (toolId) => {
              try {
                const result = await osintEngine.executeTool(toolId, target);
                
                // Validate result
                const validation = resultValidator.validate(
                  toolId, target, result.output, result.parsed
                );
                
                if (validation.isValid && result.entities) {
                  // Add to investigation
                  investigation.entities.push(...result.entities);
                  investigation.toolResults.push(result);
                  
                  // Emit for streaming
                  streamManager.itemFound(
                    investigationId,
                    toolId,
                    target,
                    "discovery",
                    `${result.entities.length} entités`,
                    validation.confidence
                  );
                }
                
                return result;
              } catch (error) {
                logger.warn(`[AUTO-INV] Tool ${toolId} failed:`, error);
                return null;
              }
            })
          );
          
          discoveryResults.push(...batchResults.filter(r => r !== null) as ToolResult[]);
        }

        return discoveryResults;
      });

      // === PHASE 2: Enrichissement en Cascade ===
      await this.runPhase(investigationId, "enrichment", async () => {
        logger.info(`[AUTO-INV] Phase 2: Enrichment for ${investigationId}`);
        
        const newEntities: DiscoveredEntity[] = [];
        const highConfidenceEntities = investigation.entities.filter(
          e => e.confidence >= 70
        );

        // For each high-confidence entity, discover related entities
        for (const entity of highConfidenceEntities.slice(0, 10)) { // Limit to prevent explosion
          const relatedEntities = await this.discoverRelatedEntities(entity);
          newEntities.push(...relatedEntities);
          
          // Emit for streaming
          if (relatedEntities.length > 0) {
            streamManager.itemFound(
              investigationId,
              "enrichment",
              entity.value,
              entity.type,
              `${relatedEntities.length} entités liées`,
              75
            );
          }
        }

        investigation.entities.push(...newEntities);
        return newEntities;
      });

      // === PHASE 3: Analyse Approfondie ===
      await this.runPhase(investigationId, "deep_analysis", async () => {
        logger.info(`[AUTO-INV] Phase 3: Deep Analysis for ${investigationId}`);
        
        // Run intelligence analysis
        const analysis = intelligenceEngine.analyzeResults(
          target,
          investigation.entities
        );
        investigation.intelligence = analysis;
        
        // Extract geo data
        const geoData = this.extractGeoData(investigation.entities, investigation.toolResults);
        investigation.geoData = geoData;
        
        return { analysis, geoData };
      });

      // === PHASE 4: Corrélation Intelligente ===
      await this.runPhase(investigationId, "correlation", async () => {
        logger.info(`[AUTO-INV] Phase 4: Correlation for ${investigationId}`);
        
        // Build graph from entities
        const graph = this.buildCorrelationGraph(investigation.entities);
        investigation.graph = graph;
        
        return graph;
      });

      // === PHASE 5: Génération des Insights ===
      await this.runPhase(investigationId, "insights", async () => {
        logger.info(`[AUTO-INV] Phase 5: Insights for ${investigationId}`);
        
        const insights = this.generateInsights(investigation);
        investigation.insights = insights;
        
        // Generate recommendations
        investigation.recommendations = this.generateRecommendations(investigation);
        
        return insights;
      });

      // Mark as completed
      investigation.status = "completed";
      investigation.endTime = new Date();
      
      logger.info(`[AUTO-INV] Investigation ${investigationId} completed!`);
      logger.info(`[AUTO-INV] Found ${investigation.entities.length} entities, ${investigation.graph.links.length} correlations`);

    } catch (error) {
      logger.error(`[AUTO-INV] Chain failed for ${investigationId}:`, error);
      investigation.status = "failed";
      investigation.endTime = new Date();
      throw error;
    }
  }

  /**
   * Run a single phase with progress tracking
   */
  private async runPhase(
    investigationId: string,
    phaseName: string,
    phaseFn: () => Promise<any>
  ): Promise<any> {
    const investigation = this.activeInvestigations.get(investigationId)!;
    const phase = investigation.phases.find(p => p.name === phaseName)!;
    
    phase.status = "running";
    phase.startTime = new Date();
    phase.progress = 0;

    try {
      const result = await phaseFn();
      phase.status = "completed";
      phase.progress = 100;
      phase.endTime = new Date();
      phase.results = Array.isArray(result) ? result : [result];
      return result;
    } catch (error) {
      phase.status = "failed";
      phase.endTime = new Date();
      throw error;
    }
  }

  /**
   * Discover related entities from an entity
   */
  private async discoverRelatedEntities(entity: DiscoveredEntity): Promise<DiscoveredEntity[]> {
    const related: DiscoveredEntity[] = [];

    switch (entity.type) {
      case "email":
        // If email found, look for username from email prefix
        const emailUsername = entity.value.split("@")[0];
        if (emailUsername && emailUsername.length > 2) {
          const usernameEntities = await this.runDiscoveryTools("username", emailUsername);
          related.push(...usernameEntities);
        }
        break;

      case "username":
        // If username found, look for associated emails
        // This would need email discovery tools
        break;

      case "social":
        // Extract username from social profile URL
        const urlMatch = entity.value.match(/\/([^\/]+)$/);
        if (urlMatch) {
          const extractedUsername = urlMatch[1];
          // Cross-reference with other platforms
          const crossEntities = await this.runDiscoveryTools("username", extractedUsername);
          related.push(...crossEntities.map(e => ({
            ...e,
            context: `Cross-reference from ${entity.value}`
          })));
        }
        break;
    }

    return related;
  }

  /**
   * Run discovery tools for a specific target type
   */
  private async runDiscoveryTools(targetType: string, target: string): Promise<DiscoveredEntity[]> {
    const toolIds = osintEngine.getToolsForTarget(targetType).slice(0, 3); // Top 3 tools
    const entities: DiscoveredEntity[] = [];

    for (const toolId of toolIds) {
      try {
        const result = await osintEngine.executeTool(toolId, target);
        if (result.entities && result.validation?.valid !== false) {
          entities.push(...result.entities);
        }
      } catch (error) {
        // Ignore errors for enrichment
      }
    }

    return entities;
  }

  /**
   * Extract geo data from entities and results
   */
  private extractGeoData(entities: DiscoveredEntity[], results: ToolResult[]): GeoDiscovery[] {
    const geoData: GeoDiscovery[] = [];

    for (const entity of entities) {
      // Check for location entities
      if (entity.type === "location") {
        // Try to geocode location
        geoData.push({
          coordinates: { lat: 0, lng: 0 }, // Would need geocoding service
          accuracy: "city",
          source: entity.source,
          evidence: entity.value,
          type: "residence",
          confidence: entity.confidence
        });
      }

      // Check IP entities for geo
      if (entity.type === "ip") {
        // Would need IP geolocation service
      }
    }

    return geoData;
  }

  /**
   * Build correlation graph from entities
   */
  private buildCorrelationGraph(entities: DiscoveredEntity[]): { nodes: GraphNode[]; links: GraphLink[] } {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Create nodes for each unique entity
    for (const entity of entities) {
      const nodeId = `${entity.type}:${entity.value}`;
      
      if (!nodeMap.has(nodeId)) {
        const node: GraphNode = {
          id: nodeId,
          type: entity.type,
          label: entity.value.length > 30 
            ? entity.value.substring(0, 30) + "..." 
            : entity.value,
          value: entity.value,
          confidence: entity.confidence,
          discoveredAt: new Date(),
          source: entity.source,
          size: 10 + (entity.confidence / 10), // Size based on confidence
          color: ENTITY_COLORS[entity.type] || ENTITY_COLORS.other
        };
        
        nodes.push(node);
        nodeMap.set(nodeId, node);
      }
    }

    // Create links based on correlations
    // Same source = likely related
    const entitiesBySource = new Map<string, DiscoveredEntity[]>();
    for (const entity of entities) {
      if (!entitiesBySource.has(entity.source)) {
        entitiesBySource.set(entity.source, []);
      }
      entitiesBySource.get(entity.source)!.push(entity);
    }

    // Link entities found by same tool
    for (const [source, sourceEntities] of entitiesBySource) {
      for (let i = 0; i < sourceEntities.length; i++) {
        for (let j = i + 1; j < sourceEntities.length; j++) {
          const id1 = `${sourceEntities[i].type}:${sourceEntities[i].value}`;
          const id2 = `${sourceEntities[j].type}:${sourceEntities[j].value}`;
          
          links.push({
            source: id1,
            target: id2,
            type: "same_source",
            strength: 50,
            evidence: `Found by same tool: ${source}`
          });
        }
      }
    }

    return { nodes, links };
  }

  /**
   * Generate insights from investigation
   */
  private generateInsights(investigation: CompleteInvestigation): InvestigationInsight[] {
    const insights: InvestigationInsight[] = [];

    // 1. High-value discoveries
    const highValueEntities = investigation.entities.filter(e => e.confidence >= 80);
    if (highValueEntities.length > 0) {
      insights.push({
        type: "discovery",
        title: `Découvertes de haute confiance`,
        description: `${highValueEntities.length} entités avec confiance ≥80% identifiées`,
        confidence: 90,
        evidence: highValueEntities.map(e => e.value),
        severity: "medium"
      });
    }

    // 2. Pattern: Multi-platform presence
    const platforms = new Set(investigation.entities
      .filter(e => e.type === "social")
      .map(e => {
        const match = e.value.match(/https?:\/\/([^\/]+)/);
        return match ? match[1] : "";
      })
      .filter(Boolean));
    
    if (platforms.size > 5) {
      insights.push({
        type: "pattern",
        title: "Présence multi-plateforme importante",
        description: `Cible active sur ${platforms.size} plateformes différentes`,
        confidence: 85,
        evidence: Array.from(platforms).slice(0, 10),
        severity: "low"
      });
    }

    // 3. Risk: High-risk platforms
    const highRiskPlatforms = ["chaturbate", "adultfriendfinder", "redtube"];
    const riskyEntities = investigation.entities.filter(e => 
      highRiskPlatforms.some(p => e.value.toLowerCase().includes(p))
    );
    
    if (riskyEntities.length > 0) {
      insights.push({
        type: "risk",
        title: "⚠️ Plateformes sensibles détectées",
        description: `${riskyEntities.length} profils sur des plateformes à risque identifiés`,
        confidence: 95,
        evidence: riskyEntities.map(e => e.value),
        severity: "high"
      });
    }

    // 4. Correlation patterns
    if (investigation.graph.links.length > 20) {
      insights.push({
        type: "correlation",
        title: "Réseau d'entités dense",
        description: `${investigation.graph.links.length} corrélations entre les entités découvertes`,
        confidence: 80,
        evidence: [`${investigation.entities.length} entités liées`],
        severity: "medium"
      });
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(investigation: CompleteInvestigation): string[] {
    const recommendations: string[] = [];

    // Based on intelligence analysis
    if (investigation.intelligence) {
      recommendations.push(...investigation.intelligence.recommendations);
    }

    // Additional recommendations based on findings
    const hasHighRisk = investigation.insights.some(
      i => i.type === "risk" && i.severity === "high"
    );
    
    if (hasHighRisk) {
      recommendations.push("🔴 Priorité: Réviser la visibilité des profils sensibles");
    }

    const hasManyPlatforms = investigation.entities.filter(e => e.type === "social").length > 10;
    if (hasManyPlatforms) {
      recommendations.push("💡 Opportunité: Analyser les patterns d'activité cross-platform");
    }

    return [...new Set(recommendations)];
  }

  /**
   * Get investigation by ID
   */
  getInvestigation(id: string): CompleteInvestigation | undefined {
    return this.activeInvestigations.get(id);
  }

  /**
   * Get all active investigations
   */
  getActiveInvestigations(): CompleteInvestigation[] {
    return Array.from(this.activeInvestigations.values())
      .filter(inv => inv.status === "running");
  }

  /**
   * Cleanup old investigations
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, inv] of this.activeInvestigations) {
      if (inv.status !== "running" && 
          (now - inv.startTime.getTime()) > maxAge) {
        this.activeInvestigations.delete(id);
        logger.info(`[AUTO-INV] Cleaned up investigation ${id}`);
      }
    }
  }
}

export const autoInvestigationService = new AutoInvestigationService();

// Auto-cleanup every hour
setInterval(() => autoInvestigationService.cleanup(), 60 * 60 * 1000);
