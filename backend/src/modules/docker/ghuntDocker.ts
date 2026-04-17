// ============================================================================
// MODULE GHUNT DOCKER - Google Account Investigation
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const ghuntDockerModule: OSINTModule = {
  id: "ghunt_docker",
  name: "GHunt Google OSINT (Docker)",
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
      data: { tool: "ghunt_docker", target, message: `Investigating Google account ${target}...` }
    });

    const result = await dockerExec(`ghunt email "${target}" 2>&1 | head -100 || echo "GHunt requires Google cookies"`, 120000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse Google account info
      const gdrive = result.stdout.match(/drive\.google\.com\/[^\s]+/g);
      const photos = result.stdout.match(/photos\.google\.com\/[^\s]+/g);
      
      if (gdrive) {
        for (const link of [...new Set(gdrive)].slice(0, 5)) {
          entities.push({
            id: makeEntityId(),
            type: "google_drive",
            value: `https://${link}`,
            source: "ghunt_docker",
            confidence: 70,
            metadata: { email: target },
            verified: false,
            depth: 0
          });
        }
      }
      
      if (photos) {
        for (const link of [...new Set(photos)].slice(0, 5)) {
          entities.push({
            id: makeEntityId(),
            type: "google_photos",
            value: `https://${link}`,
            source: "ghunt_docker",
            confidence: 70,
            metadata: { email: target },
            verified: false,
            depth: 0
          });
        }
      }
    }

    // Add Google profile
    entities.push({
      id: makeEntityId(),
      type: "google_account",
      value: target,
      source: "ghunt_docker",
      confidence: 80,
      metadata: { 
        email: target,
        maps_url: `https://www.google.com/maps/contrib/${target}`,
        youtube_url: `https://www.youtube.com/${target}`,
        note: "Requires valid Google cookies for full functionality"
      },
      verified: false,
      depth: 0
    });

    emit({
      type: "tool_done",
      data: {
        tool: "ghunt_docker",
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
