// ============================================================================
// Correlation Test - Tests multi-tool correlation with real data
// ============================================================================

import { osintEngine } from "../services/osintEngine";
import { logger } from "../utils/logger";

interface CorrelationResult {
  target: string;
  targetType: string;
  toolsExecuted: number;
  totalEntities: number;
  uniqueEntities: number;
  correlations: Array<{
    entity: string;
    type: string;
    foundBy: string[];
    confidence: number;
  }>;
  executionTime: number;
}

// Test correlation between multiple tools on same target
export async function testCorrelation(target: string, targetType: string): Promise<CorrelationResult> {
  logger.info(`[CORRELATION-TEST] Starting correlation test for ${target} (${targetType})`);
  
  const startTime = Date.now();
  
  // Get recommended tools for this target type
  const toolIds = osintEngine.getToolsForTarget(targetType).slice(0, 3); // Top 3 tools
  logger.info(`[CORRELATION-TEST] Using tools: ${toolIds.join(", ")}`);
  
  // Execute all tools
  const results = await osintEngine.executeMultiple(toolIds, target);
  
  // Collect all entities
  const allEntities: Array<{type: string; value: string; source: string; confidence: number}> = [];
  
  for (const result of results) {
    if (result.entities && result.entities.length > 0) {
      for (const entity of result.entities) {
        allEntities.push({
          type: entity.type,
          value: entity.value,
          source: result.tool,
          confidence: entity.confidence
        });
      }
    }
  }
  
  // Find correlations (same entity found by multiple tools)
  const entityMap = new Map<string, {type: string; foundBy: Set<string>; confidences: number[]}>();
  
  for (const entity of allEntities) {
    const key = `${entity.type}:${entity.value}`;
    if (!entityMap.has(key)) {
      entityMap.set(key, {
        type: entity.type,
        foundBy: new Set(),
        confidences: []
      });
    }
    const data = entityMap.get(key)!;
    data.foundBy.add(entity.source);
    data.confidences.push(entity.confidence);
  }
  
  // Build correlation results
  const correlations = Array.from(entityMap.entries())
    .filter(([_, data]) => data.foundBy.size > 1) // Only entities found by multiple tools
    .map(([key, data]) => ({
      entity: key.split(":")[1],
      type: data.type,
      foundBy: Array.from(data.foundBy),
      confidence: Math.round(data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length)
    }))
    .sort((a, b) => b.foundBy.length - a.foundBy.length); // Sort by most corroborated
  
  const executionTime = Date.now() - startTime;
  
  logger.info(`[CORRELATION-TEST] Complete: ${allEntities.length} entities, ${correlations.length} correlations`);
  
  return {
    target,
    targetType,
    toolsExecuted: results.length,
    totalEntities: allEntities.length,
    uniqueEntities: entityMap.size,
    correlations,
    executionTime
  };
}

// Run correlation tests with real data
export async function runCorrelationTests(): Promise<{
  summary: {
    totalTests: number;
    avgEntitiesPerTarget: number;
    avgCorrelations: number;
    totalExecutionTime: number;
  };
  results: CorrelationResult[];
}> {
  logger.info("[CORRELATION-TEST] Starting comprehensive correlation tests...");
  
  const testTargets = [
    { target: "bill.gates@microsoft.com", type: "email" },
    { target: "elonmusk", type: "username" },
    { target: "google.com", type: "domain" },
    { target: "8.8.8.8", type: "ip" }
  ];
  
  const results: CorrelationResult[] = [];
  
  for (const { target, type } of testTargets) {
    try {
      const result = await testCorrelation(target, type);
      results.push(result);
    } catch (error) {
      logger.error(`[CORRELATION-TEST] Failed for ${target}:`, error);
    }
  }
  
  const summary = {
    totalTests: results.length,
    avgEntitiesPerTarget: Math.round(results.reduce((sum, r) => sum + r.totalEntities, 0) / results.length),
    avgCorrelations: Math.round(results.reduce((sum, r) => sum + r.correlations.length, 0) / results.length),
    totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0)
  };
  
  return { summary, results };
}

// Run if called directly
if (require.main === module) {
  runCorrelationTests().then(({ summary, results }) => {
    console.log("\n========================================");
    console.log("CORRELATION TEST RESULTS");
    console.log("========================================");
    console.log(`Tests: ${summary.totalTests} | Avg Entities: ${summary.avgEntitiesPerTarget} | Avg Correlations: ${summary.avgCorrelations}`);
    console.log(`Total Time: ${summary.totalExecutionTime}ms`);
    console.log("\nDetails by Target:");
    results.forEach(r => {
      console.log(`\n🎯 ${r.target} (${r.targetType})`);
      console.log(`   Tools: ${r.toolsExecuted} | Entities: ${r.totalEntities} | Unique: ${r.uniqueEntities}`);
      console.log(`   Correlations: ${r.correlations.length}`);
      r.correlations.slice(0, 3).forEach(c => {
        console.log(`   🔗 ${c.entity} (${c.type}) found by ${c.foundBy.join(", ")} [conf: ${c.confidence}]`);
      });
    });
    console.log("========================================\n");
  });
}
