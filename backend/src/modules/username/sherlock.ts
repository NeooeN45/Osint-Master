// ============================================================================
// MODULE SHERLOCK - Username enumeration
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { tryExec, isNoiseUrl, extractPlatform, cleanUrl } from "../utils";
import os from "os";
import fs from "fs";

const TOP_SITES = [
  "Instagram", "Twitter", "X", "Facebook", "YouTube", "TikTok", "Reddit",
  "GitHub", "LinkedIn", "Pinterest", "Snapchat", "Telegram", "Discord",
  "Twitch", "Spotify", "Medium", "DeviantArt", "Behance", "Dribbble",
  "Flickr", "Vimeo", "Tumblr", "Quora", "SoundCloud", "Steam", "Patreon"
].join(",");

export const sherlockModule: OSINTModule = {
  id: "sherlock",
  name: "Sherlock",
  category: "username",
  targetTypes: ["username"],
  priority: 1,
  rateLimit: "none",
  maxConcurrent: 3,

  isAvailable: async () => {
    const r = await tryExec("sherlock --version");
    return !!r;
  },

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "sherlock", target, message: `Searching ${target} across top social networks...` }
    });

    const outFile = os.tmpdir() + `/sherlock_${Date.now()}.txt`;
    
    const r = await tryExec(
      `sherlock "${target}" --site ${TOP_SITES} --print-found --timeout 2 --no-color --output "${outFile}"`,
      180000
    );

    const entities: any[] = [];
    const urls: string[] = [];

    // Parse output file
    try {
      const raw = fs.readFileSync(outFile, "utf-8");
      fs.unlinkSync(outFile);
      urls.push(...raw.split("\n").map(l => l.trim()).filter(l => l.startsWith("http")));
    } catch {}

    // Fallback: parse stdout
    if (urls.length === 0 && r) {
      const lines = (r.stdout + (r.stderr || "")).split("\n");
      for (const l of lines) {
        const url = l.match(/https?:\/\/[^\s]+/)?.[0]?.replace(/[,;"']+$/, "");
        if (url) urls.push(url);
      }
    }

    // Filter and create entities
    for (const url of urls) {
      const clean = cleanUrl(url);
      if (isNoiseUrl(clean)) continue;

      const platform = extractPlatform(clean);
      entities.push({
        id: makeEntityId(),
        type: "social_profile",
        value: clean,
        source: "sherlock",
        confidence: 88,
        metadata: { platform },
        verified: true,
        depth: 0
      });
    }

    emit({
      type: "tool_done",
      data: {
        tool: "sherlock",
        found: entities.length,
        duration: Date.now() - startTime
      }
    });

    return {
      success: entities.length > 0,
      data: { found: entities.length, urls: entities.map(e => e.value) },
      entities,
      executionTimeMs: Date.now() - startTime
    };
  }
};
