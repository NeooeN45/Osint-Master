// ============================================================================
// MODULE OSINTGRAM DOCKER - Instagram OSINT
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const osintgramDockerModule: OSINTModule = {
  id: "osintgram_docker",
  name: "Osintgram Instagram (Docker)",
  category: "social",
  targetTypes: ["username"],
  priority: 1,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "osintgram_docker", target, message: `Running Osintgram on ${target}...` }
    });

    const username = target.replace(/^@/, "");
    const result = await dockerExec(`osintgram ${username} -C 2>&1 | head -80 || echo "Osintgram requires Instagram credentials"`, 120000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse email/phone from output
      const emails = result.stdout.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      const phones = result.stdout.match(/\+?[\d\s-]{10,}/g);
      
      if (emails) {
        for (const email of [...new Set(emails)].slice(0, 5)) {
          entities.push({
            id: makeEntityId(),
            type: "email",
            value: email,
            source: "osintgram_docker",
            confidence: 75,
            metadata: { username, source: "instagram" },
            verified: false,
            depth: 0
          });
        }
      }
      
      if (phones) {
        for (const phone of [...new Set(phones)].slice(0, 3)) {
          entities.push({
            id: makeEntityId(),
            type: "phone",
            value: phone,
            source: "osintgram_docker",
            confidence: 70,
            metadata: { username, source: "instagram" },
            verified: false,
            depth: 0
          });
        }
      }
    }

    // Add Instagram profile info
    entities.push({
      id: makeEntityId(),
      type: "instagram_profile_enhanced",
      value: `https://instagram.com/${username}`,
      source: "osintgram_docker",
      confidence: 90,
      metadata: { 
        username,
        note: "Requires Instagram session for full functionality"
      },
      verified: true,
      depth: 0
    });

    emit({
      type: "tool_done",
      data: {
        tool: "osintgram_docker",
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
