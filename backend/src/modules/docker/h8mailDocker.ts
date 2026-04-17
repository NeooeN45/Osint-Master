// ============================================================================
// MODULE H8MAIL DOCKER - Breach Hunting
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const h8mailDockerModule: OSINTModule = {
  id: "h8mail_docker",
  name: "h8mail Breach Hunter (Docker)",
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
      data: { tool: "h8mail_docker", target, message: `Checking breaches for ${target}...` }
    });

    const result = await dockerExec(`h8mail -t "${target}" -o /tmp/h8mail_result.txt 2>&1 | head -50 || true`, 120000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse breach results
      const breaches = result.stdout.match(/\[.+\].*breach.*:/gi);
      
      entities.push({
        id: makeEntityId(),
        type: "breach_check",
        value: target,
        source: "h8mail_docker",
        confidence: 85,
        metadata: { 
          email: target,
          breaches_found: breaches ? breaches.length : 0,
          raw_output: result.stdout.substring(0, 1000),
          note: "Breach data may include passwords and hashes"
        },
        verified: false,
        depth: 0
      });
    }

    emit({
      type: "tool_done",
      data: {
        tool: "h8mail_docker",
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
