// ============================================================================
// MODULE KATANA DOCKER - Web Crawler (ProjectDiscovery)
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const katanaDockerModule: OSINTModule = {
  id: "katana_docker",
  name: "Katana Web Crawler (Docker)",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 2,
  rateLimit: "normal",
  maxConcurrent: 2,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "katana_docker", target, message: `Crawling ${target} with Katana...` }
    });

    const url = target.startsWith("http") ? target : `https://${target}`;
    const result = await dockerExec(`katana -u "${url}" -d 3 -silent 2>&1 | head -100 || true`, 60000);
    
    const entities: any[] = [];
    const seenUrls = new Set<string>();
    
    if (result.success && result.stdout) {
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        const url = line.trim();
        if (url && !seenUrls.has(url) && seenUrls.size < 50) {
          seenUrls.add(url);
          
          entities.push({
            id: makeEntityId(),
            type: "crawled_url",
            value: url,
            source: "katana_docker",
            confidence: 90,
            metadata: { 
              target,
              depth: 3
            },
            verified: true,
            depth: 0
          });
        }
      }
    }

    emit({
      type: "tool_done",
      data: {
        tool: "katana_docker",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: true,
      data: { found: entities.length, urls: Array.from(seenUrls).slice(0, 30) },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
