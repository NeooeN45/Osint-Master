// ============================================================================
// MODULE TELEPATHY DOCKER - Telegram OSINT
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { dockerExec, isDockerAvailable } from "../../services/dockerExecutor";

export const telepathyDockerModule: OSINTModule = {
  id: "telepathy_docker",
  name: "Telepathy Telegram (Docker)",
  category: "social",
  targetTypes: ["username"],
  priority: 1,
  rateLimit: "strict",
  maxConcurrent: 1,

  isAvailable: isDockerAvailable,

  execute: async (target: string, emit: EmitFunction): Promise<ModuleResult> => {
    const startTime = Date.now();
    
    emit({
      type: "tool_start",
      data: { tool: "telepathy_docker", target, message: `Analyzing Telegram channel ${target}...` }
    });

    const channel = target.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
    const result = await dockerExec(`telepathy -t "${channel}" -o /tmp 2>&1 | head -100 || echo "Telepathy requires Telegram API credentials"`, 180000);
    
    const entities: any[] = [];
    
    if (result.success && result.stdout) {
      // Parse channel info
      const members = result.stdout.match(/(\d+)\s+members/)?.[1];
      const messages = result.stdout.match(/(\d+)\s+messages/)?.[1];
      
      entities.push({
        id: makeEntityId(),
        type: "telegram_channel_intel",
        value: `https://t.me/${channel}`,
        source: "telepathy_docker",
        confidence: 85,
        metadata: { 
          channel,
          members: members ? parseInt(members) : undefined,
          messages: messages ? parseInt(messages) : undefined,
          tgstat: `https://tgstat.com/channel/@${channel}`,
          telemetrio: `https://telemetrio.com/channel/${channel}`,
          note: "Requires Telegram API session"
        },
        verified: false,
        depth: 0
      });
    }

    emit({
      type: "tool_done",
      data: {
        tool: "telepathy_docker",
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
