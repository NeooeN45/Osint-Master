// ============================================================================
// MODULE NAABU DOCKER - Port Scanner (ProjectDiscovery)
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const naabuDockerModule: OSINTModule = {
  id: "naabu_docker",
  name: "Naabu Port Scanner (Docker)",
  category: "network",
  targetTypes: ["domain", "ip"],
  priority: 1,
  rateLimit: "strict",
  maxConcurrent: 2,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "naabu_docker", target, message: `Scanning ports on ${target}...` }
    });

    const result = await dockerExec(`naabu -host "${target}" -silent 2>&1 || true`, 60000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse naabu output: target:port
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        const match = line.match(/([^:]+):(\d+)/);
        if (match) {
          const [, host, port] = match;
          
          entities.push({
            id: makeEntityId(),
            type: "open_port",
            value: `${host}:${port}`,
            source: "naabu_docker",
            confidence: 95,
            metadata: { host, port: parseInt(port) },
            verified: true,
            depth: 0
          });
        }
      }
    }

    emit({
      type: "tool_done",
      data: {
        tool: "naabu_docker",
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
