// ============================================================================
// MODULE FINDOMAIN DOCKER - Fast Domain Discovery
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const findomainDockerModule: OSINTModule = {
  id: "findomain_docker",
  name: "Findomain Fast Discovery (Docker)",
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
      data: { tool: "findomain_docker", target, message: `Discovering subdomains for ${target}...` }
    });

    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const result = await dockerExec(`findomain -t "${domain}" -q 2>&1 || true`, 120000);
    
    const entities: any[] = [];
    const seen = new Set<string>();
    
    if (result.success && result.stdout) {
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        const subdomain = line.trim().toLowerCase();
        if (subdomain && subdomain.includes(domain) && !seen.has(subdomain)) {
          seen.add(subdomain);
          
          entities.push({
            id: makeEntityId(),
            type: "subdomain",
            value: subdomain,
            source: "findomain_docker",
            confidence: 95,
            metadata: { parent: domain },
            verified: true,
            depth: 0
          });
        }
      }
    }

    emit({
      type: "tool_done",
      data: {
        tool: "findomain_docker",
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
