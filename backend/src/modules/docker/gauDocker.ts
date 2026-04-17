// ============================================================================
// MODULE GAU DOCKER - GetAllUrls
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const gauDockerModule: OSINTModule = {
  id: "gau_docker",
  name: "GAU - GetAllUrls (Docker)",
  category: "web",
  targetTypes: ["domain"],
  priority: 2,
  rateLimit: "normal",
  maxConcurrent: 2,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "gau_docker", target, message: `Fetching URLs for ${target} with GAU...` }
    });

    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    // Run GAU to fetch URLs from Wayback, Common Crawl, etc.
    const result = await dockerExec(`gau "${domain}" --json 2>&1 | head -50 || true`, 60000);
    
    const entities: any[] = [];
    const seenUrls = new Set<string>();
    
    if (result.success && result.stdout) {
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const url = data.url || line;
          
          if (url && !seenUrls.has(url) && seenUrls.size < 30) {
            seenUrls.add(url);
            
            entities.push({
              id: makeEntityId(),
              type: "discovered_url",
              value: url,
              source: "gau_docker",
              confidence: 85,
              metadata: { 
                source: data.source || "unknown",
                domain: domain,
                timestamp: data.timestamp
              },
              verified: true,
              depth: 0
            });
          }
        } catch {
          // Line wasn't JSON, might be plain URL
          const url = line.trim();
          if (url.startsWith("http") && !seenUrls.has(url) && seenUrls.size < 30) {
            seenUrls.add(url);
            entities.push({
              id: makeEntityId(),
              type: "discovered_url",
              value: url,
              source: "gau_docker",
              confidence: 70,
              metadata: { domain },
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
        tool: "gau_docker",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: true,
      data: { found: entities.length, urls: Array.from(seenUrls).slice(0, 20) },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
