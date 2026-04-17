// ============================================================================
// MODULE SHERLOCK DOCKER - Utilise le container osint-tools
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { isFalsePositive, cleanUrl, isNoiseUrl, extractPlatform } from "../utils";
import { runSherlock, isDockerAvailable } from "../../services/dockerExecutor";

export const sherlockDockerModule: OSINTModule = {
  id: "sherlock_docker",
  name: "Sherlock (Docker)",
  category: "username",
  targetTypes: ["username"],
  priority: 1,
  rateLimit: "normal",
  maxConcurrent: 3,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "sherlock_docker", target, message: `Searching ${target} via Docker container...` }
    });

    const result = await runSherlock(target, 30);
    const entities: any[] = [];
    const urls: string[] = [];

    if (result.success && result.stdout) {
      // Parse URLs from output
      const lines = result.stdout.split("\n");
      for (const line of lines) {
        const url = line.match(/https?:\/\/[^\s]+/)?.[0]?.replace(/[,;"']+$/, "");
        if (url && !urls.includes(url)) {
          urls.push(url);
        }
      }
    }

    // Filter and create entities
    for (const url of urls) {
      const clean = cleanUrl(url);
      if (isNoiseUrl(clean) || isFalsePositive(clean)) continue;

      const platform = extractPlatform(clean);
      entities.push({
        id: makeEntityId(),
        type: "social_profile",
        value: clean,
        source: "sherlock_docker",
        confidence: 90,
        metadata: { platform, raw_url: url },
        verified: true,
        depth: 0
      });
    }

    emit({
      type: "tool_done",
      data: {
        tool: "sherlock_docker",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: true,
      data: { found: entities.length, urls: entities.map(e => e.value) },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
