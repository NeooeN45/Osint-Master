// ============================================================================
// MODULE THEHARVESTER DOCKER - Email harvesting via Docker
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { runTheHarvester, isDockerAvailable } from "../../services/dockerExecutor";

export const theHarvesterDockerModule: OSINTModule = {
  id: "theharvester_docker",
  name: "theHarvester (Docker)",
  category: "domain",
  targetTypes: ["domain"],
  priority: 2,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "theharvester_docker", target, message: `Harvesting emails and hosts for ${target}...` }
    });

    const result = await runTheHarvester(target, 200, 120);
    const entities: any[] = [];
    const emails = new Set<string>();
    const hosts = new Set<string>();

    if (result.success && result.stdout) {
      // Parse emails
      const emailMatches = result.stdout.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
      if (emailMatches) {
        for (const email of emailMatches) {
          if (!emails.has(email)) {
            emails.add(email);
            entities.push({
              id: makeEntityId(),
              type: "email",
              value: email,
              source: "theharvester_docker",
              confidence: 75,
              metadata: { domain: target },
              verified: false,
              depth: 0
            });
          }
        }
      }

      // Parse hosts/subdomains
      const hostMatches = result.stdout.match(/[a-z0-9.-]+\.[a-z]{2,}/gi);
      if (hostMatches) {
        for (const host of hostMatches) {
          if (host.includes(target) && !hosts.has(host) && !emails.has(host)) {
            hosts.add(host);
            entities.push({
              id: makeEntityId(),
              type: "host",
              value: host,
              source: "theharvester_docker",
              confidence: 70,
              metadata: { domain: target },
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
        tool: "theharvester_docker",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: true,
      data: { found: entities.length, emails: Array.from(emails), hosts: Array.from(hosts) },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
