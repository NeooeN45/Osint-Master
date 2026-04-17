// ============================================================================
// MODULE NEXFIL DOCKER - Username Checker Massif
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const nexfilDockerModule: OSINTModule = {
  id: "nexfil_docker",
  name: "NexFil Username Checker (Docker)",
  category: "username",
  targetTypes: ["username"],
  priority: 2,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "nexfil_docker", target, message: `Mass checking username ${target}...` }
    });

    const username = target.replace(/^@/, "");
    const result = await dockerExec(`nexfil -u "${username}" 2>&1 | head -80 || true`, 300000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse found accounts: [FOUND] Platform: URL
      const matches = result.stdout.match(/\[FOUND\]\s+([^:]+):\s*(https?:\/\/[^\s]+)/g);
      
      if (matches) {
        for (const match of matches.slice(0, 30)) {
          const platformMatch = match.match(/\[FOUND\]\s+([^:]+):\s*(https?:\/\/[^\s]+)/);
          if (platformMatch) {
            const [, platform, url] = platformMatch;
            
            entities.push({
              id: makeEntityId(),
              type: "social_profile",
              value: url,
              source: "nexfil_docker",
              confidence: 85,
              metadata: { 
                username,
                platform: platform.trim()
              },
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
        tool: "nexfil_docker",
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
