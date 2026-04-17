// ============================================================================
// MODULE AMASS DOCKER - OWASP Attack Surface Mapping via Docker
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { runAmass, isDockerAvailable } from "../../services/dockerExecutor";

export const amassDockerModule: OSINTModule = {
  id: "amass_docker",
  name: "Amass (Docker)",
  category: "domain",
  targetTypes: ["domain"],
  priority: 3,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "amass_docker", target, message: `Mapping attack surface for ${target}...` }
    });

    const result = await runAmass(target, 180);
    const entities: any[] = [];
    const seen = new Set<string>();

    if (result.success && result.stdout) {
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        const subdomain = line.trim().toLowerCase();
        if (subdomain && subdomain.includes(target) && !seen.has(subdomain)) {
          seen.add(subdomain);
          entities.push({
            id: makeEntityId(),
            type: "subdomain",
            value: subdomain,
            source: "amass_docker",
            confidence: 95,
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
        tool: "amass_docker",
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
