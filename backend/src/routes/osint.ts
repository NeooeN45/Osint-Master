// ============================================================================
// OSINT TOOLS ROUTES
// ============================================================================

import { Router } from "express";
import { osintEngine, ToolResult } from "../services/osintEngine";
import { logger } from "../utils/logger";

export const osintRouter = Router();

// Get full catalog
osintRouter.get("/catalog", (_req, res) => {
  res.json(osintEngine.getCatalog());
});

// Check all tools status
osintRouter.get("/status", async (_req, res) => {
  const status = await osintEngine.checkAllTools();
  const installed = Object.values(status).filter(Boolean).length;
  const total = Object.keys(status).length;
  res.json({ total, installed, notInstalled: total - installed, tools: status });
});

// Check single tool
osintRouter.get("/check/:id", async (req, res) => {
  const installed = await osintEngine.checkTool(req.params.id);
  res.json({ toolId: req.params.id, installed });
});

// Install tool
osintRouter.post("/install/:id", async (req, res) => {
  const result = await osintEngine.installTool(req.params.id);
  res.json(result);
});

// Batch install all pip tools
osintRouter.post("/install-all-pip", async (_req, res) => {
  try {
    const result = await osintEngine.installAllPip();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Install ALL 123+ tools (pip + others)
osintRouter.post("/install-all", async (_req, res) => {
  try {
    // Start installation in background
    res.json({ 
      message: "Starting installation of all 123+ OSINT tools", 
      status: "in_progress",
      note: "Installation is running in background. Check /status endpoint for progress."
    });
    
    // Actually run the installation (async)
    osintEngine.installAll().then((result: { summary: string }) => {
      logger.info(`[OSINT] Mass install complete: ${result.summary}`);
    }).catch((err: Error) => {
      logger.error("[OSINT] Mass install failed:", err);
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute single tool with validation
osintRouter.post("/execute/:id", async (req, res) => {
  const { id } = req.params;
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  const result = await osintEngine.executeTool(id, target);
  
  // Validate results to reduce false positives
  const { resultValidator } = await import("../services/resultValidator");
  const validation = resultValidator.validate(id, target, result.output, result.parsed);
  
  // If validation fails, mark as lower confidence
  if (!validation.isValid) {
    logger.warn(`[OSINT] Validation failed for ${id} on ${target}: ${validation.reason}`);
    result.confidence = Math.min(result.confidence, validation.confidence);
    result.validation = {
      valid: false,
      reason: validation.reason,
      confidence: validation.confidence
    };
  } else {
    // Boost confidence for validated results
    result.confidence = Math.max(result.confidence, validation.confidence);
    result.validation = {
      valid: true,
      confidence: validation.confidence
    };
  }
  
  res.json(result);
});

// Execute multiple tools
osintRouter.post("/execute-multi", async (req, res) => {
  const { tools, target } = req.body;
  if (!target || !tools) return res.status(400).json({ error: "target and tools required" });

  const results = await osintEngine.executeMultiple(tools, target);
  res.json({
    target,
    toolsRun: tools.length,
    successful: results.filter((r: ToolResult) => r.success).length,
    results,
  });
});

// Auto-detect target type and suggest tools
osintRouter.post("/detect", (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  const targetType = osintEngine.detectTargetType(target);
  const suggestedTools = osintEngine.getToolsForTarget(targetType);

  res.json({ target, detectedType: targetType, suggestedTools });
});

// Quick scan - auto detect + execute
osintRouter.post("/scan", async (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  const targetType = osintEngine.detectTargetType(target);
  const toolIds = osintEngine.getToolsForTarget(targetType);
  const results = await osintEngine.executeMultiple(toolIds, target);

  res.json({
    target,
    targetType,
    toolsUsed: toolIds,
    successful: results.filter((r: ToolResult) => r.success).length,
    failed: results.filter((r: ToolResult) => !r.success).length,
    results,
  });
});

// Run comprehensive tests
osintRouter.post("/test", async (_req, res) => {
  try {
    const { runAllTests } = await import("../tests/osint.test");
    const testResults = await runAllTests();
    res.json(testResults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run quick tests (essential tools only)
osintRouter.post("/quick-test", async (_req, res) => {
  try {
    const { runQuickTests } = await import("../tests/quick-test");
    const testResults = await runQuickTests();
    res.json(testResults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test correlation between multiple tools
osintRouter.post("/correlation-test", async (req, res) => {
  try {
    const { target, targetType } = req.body;
    if (!target || !targetType) {
      return res.status(400).json({ error: "target and targetType required" });
    }
    const { testCorrelation } = await import("../tests/correlation-test");
    const result = await testCorrelation(target, targetType);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run full correlation tests with multiple targets
osintRouter.post("/correlation-tests", async (_req, res) => {
  try {
    const { runCorrelationTests } = await import("../tests/correlation-test");
    const results = await runCorrelationTests();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute tool with streaming (starts analysis and returns session ID for SSE)
osintRouter.post("/execute-stream/:toolId", async (req, res) => {
  try {
    const { toolId } = req.params;
    const { target, sessionId: customSessionId } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: "target required" });
    }
    
    // Create stream session
    const sessionId = customSessionId || `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { streamManager } = await import("../services/streamManager");
    
    streamManager.createSession(sessionId, target, "unknown", [toolId]);
    
    // Start analysis in background
    setImmediate(async () => {
      try {
        streamManager.toolStarted(sessionId, toolId, target);
        
        const result = await osintEngine.executeTool(toolId, target);
        
        // Emit findings
        if (result.entities) {
          for (const entity of result.entities) {
            streamManager.itemFound(
              sessionId,
              toolId,
              target,
              entity.type,
              entity.value,
              entity.confidence
            );
          }
        }
        
        streamManager.toolCompleted(sessionId, toolId, target, result);
        streamManager.sessionCompleted(sessionId);
      } catch (error: any) {
        streamManager.sessionError(sessionId, error.message);
      }
    });
    
    // Return immediately with session ID for client to connect to SSE
    res.json({
      sessionId,
      toolId,
      target,
      streamUrl: `/api/stream/analysis/${sessionId}`,
      status: "started",
      message: "Connect to SSE stream for real-time updates"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Validate a result
osintRouter.post("/validate", async (req, res) => {
  try {
    const { toolId, target, output, parsed } = req.body;
    
    if (!toolId || !target || !output) {
      return res.status(400).json({ error: "toolId, target, and output required" });
    }
    
    const { resultValidator } = await import("../services/resultValidator");
    const validation = resultValidator.validate(toolId, target, output, parsed || {});
    
    res.json(validation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Multi-tool scan with streaming
osintRouter.post("/scan-stream", async (req, res) => {
  try {
    const { target, targetType: providedType } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: "target required" });
    }
    
    // Auto-detect target type
    const targetType = providedType || osintEngine.detectTargetType(target);
    const toolIds = osintEngine.getToolsForTarget(targetType);
    
    // Create stream session
    const sessionId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { streamManager } = await import("../services/streamManager");
    
    streamManager.createSession(sessionId, target, targetType, toolIds);
    
    // Start multi-tool analysis in background
    setImmediate(async () => {
      try {
        for (const toolId of toolIds) {
          streamManager.toolStarted(sessionId, toolId, target);
          
          const result = await osintEngine.executeTool(toolId, target);
          
          // Validate result before emitting
          const { resultValidator } = await import("../services/resultValidator");
          const validation = resultValidator.validate(toolId, target, result.output, result.parsed);
          
          // Add validation info to result
          result.validation = {
            valid: validation.isValid,
            confidence: validation.confidence,
            reason: validation.reason
          };
          
          // Only emit entities if validation passes
          if (validation.isValid && result.entities) {
            for (const entity of result.entities) {
              // Only emit high-confidence entities
              if (entity.confidence >= 60) {
                streamManager.itemFound(
                  sessionId,
                  toolId,
                  target,
                  entity.type,
                  entity.value,
                  entity.confidence
                );
              }
            }
          }
          
          streamManager.toolCompleted(sessionId, toolId, target, result);
        }
        
        streamManager.sessionCompleted(sessionId);
      } catch (error: any) {
        streamManager.sessionError(sessionId, error.message);
      }
    });
    
    res.json({
      sessionId,
      target,
      targetType,
      tools: toolIds,
      streamUrl: `/api/stream/analysis/${sessionId}`,
      status: "started",
      message: "Connect to SSE stream for real-time updates"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
