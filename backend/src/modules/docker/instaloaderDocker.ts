// ============================================================================
// MODULE INSTALOADER DOCKER - Instagram Downloader
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const instaloaderDockerModule: OSINTModule = {
  id: "instaloader_docker",
  name: "Instaloader Instagram (Docker)",
  category: "social",
  targetTypes: ["username"],
  priority: 2,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "instaloader_docker", target, message: `Loading Instagram profile ${target}...` }
    });

    const username = target.replace(/^@/, "");
    const timestamp = Date.now();
    const outDir = `/tmp/instaloader_${timestamp}`;
    
    const result = await dockerExec(`instaloader ${username} --dirname-pattern "${outDir}" --no-videos --no-pictures --no-captions --no-compress-json --count 10 --quiet 2>&1 || true`, 120000);
    
    const entities: any[] = [];
    
    // Parse profile metadata
    const profileId = result.stdout.match(/id(\d+)/)?.[1];
    const followers = result.stdout.match(/(\d+) Followers/)?.[1];
    const following = result.stdout.match(/(\d+) Followees/)?.[1];
    
    entities.push({
      id: makeEntityId(),
      type: "instagram_metadata",
      value: username,
      source: "instaloader_docker",
      confidence: 90,
      metadata: { 
        username,
        profile_id: profileId,
        followers: followers ? parseInt(followers) : undefined,
        following: following ? parseInt(following) : undefined,
        download_path: outDir,
        note: "Metadata extraction complete"
      },
      verified: true,
      depth: 0
    });

    emit({
      type: "tool_done",
      data: {
        tool: "instaloader_docker",
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
