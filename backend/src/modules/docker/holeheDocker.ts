// ============================================================================
// MODULE HOLEHE DOCKER - Email OSINT via Docker
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { runHolehe, isDockerAvailable } from "../../services/dockerExecutor";

export const holeheDockerModule: OSINTModule = {
  id: "holehe_docker",
  name: "Holehe (Docker)",
  category: "email",
  targetTypes: ["email"],
  priority: 1,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "holehe_docker", target, message: `Checking email ${target} via Docker...` }
    });

    const result = await runHolehe(target, 45);
    const entities: any[] = [];

    if (result.success && result.stdout) {
      // Parse Holehe output
      // Example: [+] twitter.com
      const matches = result.stdout.match(/\[\+\]\s+([a-z0-9.-]+)/gi);
      if (matches) {
        for (const match of matches) {
          const site = match.replace(/\[\+\]\s*/, "").trim();
          if (site) {
            entities.push({
              id: makeEntityId(),
              type: "social_profile",
              value: `https://${site}`,
              source: "holehe_docker",
              confidence: 85,
              metadata: { platform: site, email: target },
              verified: false,
              depth: 0
            });
          }
        }
      }
    }

    emit({
      type: "tool_done",
      data: {
        tool: "holehe_docker",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: true,
      data: { found: entities.length },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
