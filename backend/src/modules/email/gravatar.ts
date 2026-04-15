// ============================================================================
// MODULE GRAVATAR - Email MD5 hash lookup
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { tryHttp } from "../utils";
import crypto from "crypto";

export const gravatarModule: OSINTModule = {
  id: "gravatar",
  name: "Gravatar",
  category: "email",
  targetTypes: ["email"],
  priority: 1,
  rateLimit: "normal",
  maxConcurrent: 10,

  isAvailable: async () => true, // API publique

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "gravatar", target, message: `Looking up Gravatar for ${target}...` }
    });

    const hash = crypto.createHash("md5").update(target.toLowerCase().trim()).digest("hex");
    const url = `https://en.gravatar.com/${hash}.json`;
    
    const data = await tryHttp(url);
    const entities: any[] = [];

    if (data?.entry?.[0]) {
      const entry = data.entry[0];
      entities.push({
        id: makeEntityId(),
        type: "profile",
        value: target,
        source: "gravatar",
        confidence: 90,
        metadata: {
          displayName: entry.displayName,
          photo: entry.photos?.[0]?.value,
          profileUrl: entry.profileUrl,
          accounts: entry.accounts,
          urls: entry.urls
        },
        verified: true,
        depth: 0
      });
    }

    emit({
      type: "tool_done",
      data: {
        tool: "gravatar",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: entities.length > 0,
      data: { hash, found: entities.length > 0 },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
