// ============================================================================
// MODULE GOWITNESS DOCKER - Website Screenshots
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const gowitnessDockerModule: OSINTModule = {
  id: "gowitness_docker",
  name: "GoWitness Screenshots (Docker)",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 3,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "gowitness_docker", target, message: `Capturing screenshot of ${target}...` }
    });

    const url = target.startsWith("http") ? target : `https://${target}`;
    const timestamp = Date.now();
    const outPath = `/tmp/gowitness_${timestamp}`;
    
    // Run gowitness
    const result = await dockerExec(`gowitness single -u "${url}" -o ${outPath}.png --json 2>&1 || true`, 45000);
    
    const entities: any[] = [];
    
    if (result.success) {
      entities.push({
        id: makeEntityId(),
        type: "screenshot",
        value: url,
        source: "gowitness_docker",
        confidence: 90,
        metadata: { 
          url: url,
          screenshot_path: `${outPath}.png`,
          json_output: result.stdout,
          note: "Screenshot saved in Docker container",
          timestamp: new Date().toISOString()
        },
        verified: true,
        depth: 0
      });
    }

    emit({
      type: "tool_done",
      data: {
        tool: "gowitness_docker",
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
