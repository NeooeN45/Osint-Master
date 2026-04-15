// ============================================================================
// MODULE MAIGRET - Deep username investigation
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { tryExec, isFalsePositive } from "../utils";
import os from "os";
import fs from "fs";

export const maigretModule: OSINTModule = {
  id: "maigret",
  name: "Maigret",
  category: "username",
  targetTypes: ["username"],
  priority: 2,
  rateLimit: "none",
  maxConcurrent: 2,

  isAvailable: async () => {
    const r = await tryExec("maigret --version");
    return !!r;
  },

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "maigret", target, message: `Deep username enumeration on ${target}...` }
    });

    const outDir = os.tmpdir() + `/maigret_${Date.now()}`;
    fs.mkdirSync(outDir, { recursive: true });

    const r = await tryExec(
      `maigret "${target}" --timeout 8 --no-color --no-progressbar -J simple --folderoutput "${outDir}"`,
      90000
    );

    const entities: any[] = [];

    try {
      const files = fs.readdirSync(outDir).filter((f: string) => f.endsWith(".json"));
      for (const f of files) {
        const data = JSON.parse(fs.readFileSync(outDir + "/" + f, "utf-8"));
        const sites = data?.[target] || data?.sites || data;
        
        for (const [site, info] of Object.entries(sites as Record<string, any>)) {
          const status = info?.status?.status || info?.status;
          if (status !== "Claimed") continue;

          const url = info?.url || info?.status?.url;
          if (!url || isFalsePositive(url)) continue;

          entities.push({
            id: makeEntityId(),
            type: "social_profile",
            value: url,
            source: "maigret",
            confidence: 85,
            metadata: { platform: site, site, ...info },
            verified: true,
            depth: 0
          });
        }
      }

      // Cleanup
      fs.rmSync(outDir, { recursive: true, force: true });
    } catch {}

    emit({
      type: "tool_done",
      data: {
        tool: "maigret",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: entities.length > 0,
      data: { found: entities.length },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
