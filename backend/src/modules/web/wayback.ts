// ============================================================================
// MODULE WAYBACK - Archive.org snapshots
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { tryHttp } from "../utils";

export const waybackModule: OSINTModule = {
  id: "wayback",
  name: "Wayback Machine",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 2,
  rateLimit: "normal",
  maxConcurrent: 5,

  isAvailable: async () => true, // API publique

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "wayback", target, message: `Querying Archive.org for ${target}...` }
    });

    const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target)}&output=json&fl=timestamp,original`;
    const data = await tryHttp(url);
    const entities: any[] = [];
    const snapshots = new Set<string>();

    if (Array.isArray(data) && data.length > 0) {
      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const [timestamp, original] = data[i];
        if (timestamp && original) {
          snapshots.add(`https://web.archive.org/web/${timestamp}/${original}`);
        }
      }
    }

    // Limiter à 50 snapshots
    const limitedSnapshots = Array.from(snapshots).slice(0, 50);
    
    for (const snapshot of limitedSnapshots) {
      entities.push({
        id: makeEntityId(),
        type: "archive_snapshot",
        value: snapshot,
        source: "wayback",
        confidence: 100,
        metadata: { archive: "archive.org" },
        verified: true,
        depth: 0
      });
    }

    emit({
      type: "tool_done",
      data: {
        tool: "wayback",
        found: entities.length,
        total: snapshots.size,
        duration: Date.now() - startTime
      }
    });

    return {
      success: entities.length > 0,
      data: { snapshots: limitedSnapshots, total: snapshots.size },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
