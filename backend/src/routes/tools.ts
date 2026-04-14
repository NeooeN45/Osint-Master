/**
 * Tools Registry API Routes
 * Routes pour accéder au catalogue de 200+ outils OSINT
 */

import { Router, Request, Response } from "express";
import * as toolRegistry from "../services/toolRegistry";
import { logger } from "../utils/logger";

const router = Router();

// ============================================================================
// GET ALL TOOLS
// ============================================================================

router.get("/", (req: Request, res: Response) => {
  const { category, target, phase, search, auth, limit = "50", offset = "0" } = req.query;

  let tools = toolRegistry.toolRegistry;

  // Filter by category
  if (category) {
    tools = tools.filter((t) => t.category === category);
  }

  // Filter by target type
  if (target) {
    tools = toolRegistry.getToolsByTargetType(target as any);
  }

  // Filter by OSINT phase
  if (phase) {
    tools = toolRegistry.getToolsByPhase(phase as any);
  }

  // Filter by auth requirement
  if (auth !== undefined) {
    const requiresAuth = auth === "true";
    tools = tools.filter((t) => (t.requiresAuth || false) === requiresAuth);
  }

  // Search
  if (search) {
    tools = toolRegistry.searchTools(search as string);
  }

  // Pagination
  const total = tools.length;
  const start = parseInt(offset as string);
  const end = start + parseInt(limit as string);
  const paginated = tools.slice(start, end);

  res.json({
    success: true,
    tools: paginated,
    pagination: {
      total,
      limit: parseInt(limit as string),
      offset: start,
      hasMore: end < total
    }
  });
});

// ============================================================================
// GET STATS
// ============================================================================

router.get("/stats", (req: Request, res: Response) => {
  const stats = toolRegistry.getStats();

  res.json({
    success: true,
    stats,
    categories: toolRegistry.getCategories().map((cat) => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      count: stats.byCategory[cat] || 0
    }))
  });
});

// ============================================================================
// GET TOOL BY ID
// ============================================================================

router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const tool = toolRegistry.getToolById(id);

  if (!tool) {
    return res.status(404).json({ error: "Tool not found" });
  }

  res.json({
    success: true,
    tool
  });
});

// ============================================================================
// GET TOOLS BY CATEGORY
// ============================================================================

router.get("/category/:category", (req: Request, res: Response) => {
  const { category } = req.params;
  const tools = toolRegistry.getToolsByCategory(category as any);

  res.json({
    success: true,
    category,
    tools,
    count: tools.length
  });
});

// ============================================================================
// GET TOOLS BY TARGET TYPE
// ============================================================================

router.get("/target/:targetType", (req: Request, res: Response) => {
  const { targetType } = req.params;
  const tools = toolRegistry.getToolsByTargetType(targetType as any);

  res.json({
    success: true,
    targetType,
    tools,
    count: tools.length
  });
});

// ============================================================================
// SEARCH TOOLS
// ============================================================================

router.post("/search", (req: Request, res: Response) => {
  const { query, filters = {} } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Query required" });
  }

  let results = toolRegistry.searchTools(query);

  // Apply additional filters
  if (filters.category) {
    results = results.filter((t) => t.category === filters.category);
  }
  if (filters.reliability) {
    results = results.filter((t) => t.reliability === filters.reliability);
  }
  if (filters.requiresAuth !== undefined) {
    results = results.filter((t) => (t.requiresAuth || false) === filters.requiresAuth);
  }

  res.json({
    success: true,
    query,
    results,
    count: results.length
  });
});

// ============================================================================
// GET RECOMMENDATIONS
// ============================================================================

router.post("/recommend", (req: Request, res: Response) => {
  const { targetType, phase, context = {} } = req.body;

  if (!targetType || !phase) {
    return res.status(400).json({ error: "targetType and phase required" });
  }

  // Get tools matching criteria
  let recommendations = toolRegistry.getToolsByTargetType(targetType)
    .filter((t) => t.osintPhase === phase);

  // Sort by confidence and reliability
  recommendations = recommendations.sort((a, b) => {
    const reliabilityScore = { high: 3, medium: 2, low: 1 };
    return (
      b.confidence + reliabilityScore[b.reliability] * 10 -
      (a.confidence + reliabilityScore[a.reliability] * 10)
    );
  });

  // Take top 10
  const topRecommendations = recommendations.slice(0, 10);

  res.json({
    success: true,
    targetType,
    phase,
    recommendations: topRecommendations,
    context,
    alternativeCount: Math.max(0, recommendations.length - 10)
  });
});

// ============================================================================
// GET TOOL CHAIN
// ============================================================================

router.post("/chain", (req: Request, res: Response) => {
  const { targetType, depth = 3 } = req.body;

  if (!targetType) {
    return res.status(400).json({ error: "targetType required" });
  }

  // Build recommended chain of tools
  const chain = [];
  const phases: Array<toolRegistry.ToolDefinition["osintPhase"]> = [
    "discovery",
    "enrichment",
    "verification",
    "analysis"
  ];

  for (let i = 0; i < Math.min(depth, phases.length); i++) {
    const phase = phases[i];
    const tools = toolRegistry
      .getToolsByTargetType(targetType)
      .filter((t) => t.osintPhase === phase)
      .slice(0, 3);

    if (tools.length > 0) {
      chain.push({
        phase,
        tools: tools.map((t) => ({
          id: t.id,
          name: t.name,
          confidence: t.confidence,
          reliability: t.reliability
        }))
      });
    }
  }

  res.json({
    success: true,
    targetType,
    depth,
    chain
  });
});

// ============================================================================
// CHECK TOOL AVAILABILITY
// ============================================================================

router.post("/check", async (req: Request, res: Response) => {
  const { toolIds } = req.body;

  if (!Array.isArray(toolIds)) {
    return res.status(400).json({ error: "toolIds array required" });
  }

  const results = toolIds.map((id) => {
    const tool = toolRegistry.getToolById(id);
    if (!tool) {
      return { id, available: false, error: "Tool not found" };
    }

    // Check if binary/API is accessible
    // This is a mock - in reality would check actual availability
    return {
      id,
      name: tool.name,
      available: true,
      requiresAuth: tool.requiresAuth || false,
      installInfo: tool.installCommand
        ? { command: tool.installCommand }
        : null
    };
  });

  res.json({
    success: true,
    results,
    available: results.filter((r) => r.available).length,
    total: results.length
  });
});

// ============================================================================
// GET CATEGORIES
// ============================================================================

router.get("/meta/categories", (req: Request, res: Response) => {
  const categories = toolRegistry.getCategories();

  res.json({
    success: true,
    categories: categories.map((cat) => ({
      id: cat,
      name: cat
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      description: getCategoryDescription(cat)
    }))
  });
});

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    username: "Tools for username enumeration and social media account discovery",
    email: "Email investigation, verification, and breach lookup tools",
    domain: "Domain reconnaissance, DNS enumeration, and subdomain discovery",
    ip: "IP address investigation, geolocation, and network analysis",
    phone: "Phone number validation, carrier lookup, and owner identification",
    social: "Social media scraping and profile analysis tools",
    image: "Image forensics, EXIF extraction, and reverse image search",
    document: "Document metadata extraction and file analysis",
    cryptocurrency: "Blockchain exploration and wallet address analysis",
    breach: "Data breach search and credential leak detection",
    geolocation: "Location-based intelligence and mapping tools",
    metadata: "Metadata extraction from various file types",
    darkweb: "Dark web search and Tor hidden service exploration",
    archive: "Web archive search and historical data retrieval",
    search: "Advanced search engine operators and meta search tools",
    analysis: "Data analysis, correlation, and visualization tools",
    correlation: "Cross-reference and entity relationship discovery",
    infrastructure: "IT infrastructure and technology stack analysis",
    mobile: "Mobile app analysis and device-specific tools",
    transport: "Vehicle, vessel, and flight tracking tools",
    people: "People search and identity resolution platforms",
    company: "Business intelligence and corporate research tools",
    finance: "Financial data and transaction analysis tools"
  };

  return descriptions[category] || "OSINT tools category";
}

export default router;
