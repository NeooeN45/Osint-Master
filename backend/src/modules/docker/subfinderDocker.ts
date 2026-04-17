// ============================================================================
// MODULE SUBFINDER DOCKER - Subdomain discovery via Docker
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { runSubfinder, isDockerAvailable } from "../../services/dockerExecutor";

export const subfinderDockerModule: OSINTModule = {
  id: "subfinder_docker",
  name: "Subfinder (Docker)",
  category: "domain",
  targetTypes: ["domain"],
  priority: 1,
  rateLimit: "normal",
  maxConcurrent: 3,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "subfinder_docker", target, message: `Finding subdomains for ${target}...` }
    });

    const result = await runSubfinder(target, 60);
    const entities: any[] = [];
    const seen = new Set<string>();

    if (result.success && result.stdout) {
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        const subdomain = line.trim().toLowerCase();
        if (subdomain && !seen.has(subdomain)) {
          seen.add(subdomain);
          entities.push({
            id: makeEntityId(),
            type: "subdomain",
            value: subdomain,
            source: "subfinder_docker",
            confidence: 90,
            metadata: { parent: target },
            verified: true,
            depth: 0
          });
        }
      }
    }

    emit({
      type: "tool_done",
      data: {
        tool: "subfinder_docker",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: true,
      data: { found: entities.length, subdomains: Array.from(seen) },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
