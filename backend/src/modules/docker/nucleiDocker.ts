// ============================================================================
// MODULE NUCLEI DOCKER - Vulnerability Scanner
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const nucleiDockerModule: OSINTModule = {
  id: "nuclei_docker",
  name: "Nuclei Vulnerability Scanner (Docker)",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 2,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "nuclei_docker", target, message: `Scanning ${target} with Nuclei...` }
    });

    const url = target.startsWith("http") ? target : `https://${target}`;
    const result = await dockerExec(`nuclei -u "${url}" -silent -tags "exposures,tech" 2>&1 || true`, 120000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse Nuclei output: [tech:wordpress] [matched-at:...]
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines.slice(0, 20)) { // Limit to 20 results
        const match = line.match(/\[(.+?):(.+?)\]/g);
        if (match) {
          const info: Record<string, string> = {};
          for (const m of match) {
            const [, key, val] = m.match(/\[(.+?):(.+?)\]/) || [];
            if (key && val) info[key] = val;
          }
          
          entities.push({
            id: makeEntityId(),
            type: "vulnerability",
            value: line,
            source: "nuclei_docker",
            confidence: 85,
            metadata: { 
              raw: line, 
              parsed: info,
              target: url
            },
            verified: false,
            depth: 0
          });
        }
      }
    }

    emit({
      type: "tool_done",
      data: {
        tool: "nuclei_docker",
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
