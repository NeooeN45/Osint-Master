// ============================================================================
// MODULE HTTPX DOCKER - HTTP Prober
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const httpxDockerModule: OSINTModule = {
  id: "httpx_docker",
  name: "HTTPX Prober (Docker)",
  category: "web",
  targetTypes: ["url", "domain", "ip"],
  priority: 1,
  rateLimit: "normal",
  maxConcurrent: 3,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "httpx_docker", target, message: `Probing ${target} with HTTPX...` }
    });

    // Run httpx with JSON output
    const result = await dockerExec(`echo "${target}" | httpx -json -silent 2>&1 || true`, 30000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      try {
        const data = JSON.parse(result.stdout);
        
        entities.push({
          id: makeEntityId(),
          type: "http_probe",
          value: data.url || target,
          source: "httpx_docker",
          confidence: 95,
          metadata: { 
            status_code: data.status_code,
            title: data.title,
            tech: data.tech,
            server: data.webserver,
            content_length: data.content_length,
            response_time: data.response_time,
            raw: data
          },
          verified: true,
          depth: 0
        });
      } catch {
        // Fallback: just store raw output
        entities.push({
          id: makeEntityId(),
          type: "http_probe",
          value: target,
          source: "httpx_docker",
          confidence: 70,
          metadata: { raw_output: result.stdout },
          verified: false,
          depth: 0
        });
      }
    }

    emit({
      type: "tool_done",
      data: {
        tool: "httpx_docker",
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
