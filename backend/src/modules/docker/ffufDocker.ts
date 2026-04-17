// ============================================================================
// MODULE FFUF DOCKER - Fast Web Fuzzer
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const ffufDockerModule: OSINTModule = {
  id: "ffuf_docker",
  name: "FFuf Web Fuzzer (Docker)",
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
      data: { tool: "ffuf_docker", target, message: `Fuzzing ${target} with FFuf...` }
    });

    const url = target.startsWith("http") ? target : `https://${target}`;
    const fuzzUrl = url.replace(/\/$/, "") + "/FUZZ";
    
    const result = await dockerExec(`ffuf -u "${fuzzUrl}" -w /usr/share/seclists/Discovery/Web-Content/common.txt -s -mc 200,204,301,302,307,401,403,405 2>&1 | head -50 || true`, 120000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        entities.push({
          id: makeEntityId(),
          type: "fuzz_result",
          value: line,
          source: "ffuf_docker",
          confidence: 85,
          metadata: { 
            target: url,
            result: line
          },
          verified: false,
          depth: 0
        });
      }
    }

    emit({
      type: "tool_done",
      data: {
        tool: "ffuf_docker",
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
