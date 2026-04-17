// ============================================================================
// MODULE BLACKBIRD DOCKER - Email to Accounts
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const blackbirdDockerModule: OSINTModule = {
  id: "blackbird_docker",
  name: "Blackbird Email OSINT (Docker)",
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
      data: { tool: "blackbird_docker", target, message: `Searching accounts for ${target}...` }
    });

    const result = await dockerExec(`blackbird -u "${target}" -o /tmp 2>&1 | head -100 || true`, 180000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse found accounts: [+] Platform: URL
      const matches = result.stdout.match(/\[\+\]\s+([^:]+):\s*(https?:\/\/[^\s]+)/g);
      
      if (matches) {
        for (const match of matches.slice(0, 20)) {
          const platformMatch = match.match(/\[\+\]\s+([^:]+):\s*(https?:\/\/[^\s]+)/);
          if (platformMatch) {
            const [, platform, url] = platformMatch;
            
            entities.push({
              id: makeEntityId(),
              type: "social_profile",
              value: url,
              source: "blackbird_docker",
              confidence: 80,
              metadata: { 
                email: target,
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
        tool: "blackbird_docker",
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
