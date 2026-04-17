// ============================================================================
// MODULE GOBUSTER DOCKER - Directory/File Buster
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const gobusterDockerModule: OSINTModule = {
  id: "gobuster_docker",
  name: "Gobuster Directory Buster (Docker)",
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
      data: { tool: "gobuster_docker", target, message: `Directory busting ${target}...` }
    });

    const url = target.startsWith("http") ? target : `https://${target}`;
    const result = await dockerExec(`gobuster dir -u "${url}" -w /usr/share/seclists/Discovery/Web-Content/common.txt -q 2>&1 | head -50 || true`, 120000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse gobuster output: /path (Status: 200) [Size: 1234]
      const lines = result.stdout.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        const match = line.match(/(\/[^\s]+)\s+\(Status:\s+(\d+)\)\s+\[Size:\s+(\d+)\]/);
        if (match) {
          const [, path, status, size] = match;
          
          entities.push({
            id: makeEntityId(),
            type: "discovered_path",
            value: `${url}${path}`,
            source: "gobuster_docker",
            confidence: 95,
            metadata: { 
              url,
              path,
              status_code: parseInt(status),
              size: parseInt(size)
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
        tool: "gobuster_docker",
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
