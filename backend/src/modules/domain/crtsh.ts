// ============================================================================
// MODULE CRT.SH - SSL Certificate Transparency
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { tryHttp } from "../utils";

export const crtshModule: OSINTModule = {
  id: "crtsh",
  name: "crt.sh",
  category: "domain",
  targetTypes: ["domain"],
  priority: 1,
  rateLimit: "normal",
  maxConcurrent: 5,

  isAvailable: async () => true, // API publique

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "crtsh", target, message: `Querying certificate transparency logs for ${target}...` }
    });

    const url = `https://crt.sh/?q=%.${target}&output=json`;
    const data = await tryHttp(url);
    const entities: any[] = [];
    const subdomains = new Set<string>();

    if (Array.isArray(data)) {
      for (const cert of data) {
        const name = cert.common_name || cert.name_value;
        if (name && name.includes(target) && !name.startsWith("*")) {
          subdomains.add(name.trim().toLowerCase());
        }
      }
    }

    for (const subdomain of subdomains) {
      entities.push({
        id: makeEntityId(),
        type: "subdomain",
        value: subdomain,
        source: "crtsh",
        confidence: 95,
        metadata: { source: "ssl_certificate" },
        verified: true,
        depth: 0
      });
    }

    emit({
      type: "tool_done",
      data: {
        tool: "crtsh",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: entities.length > 0,
      data: { subdomains: Array.from(subdomains) },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
