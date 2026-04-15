// ============================================================================
// SHERLOCK WORKER - Exécution dans un thread séparé
// ============================================================================

import { parentPort, workerData } from "worker_threads";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import fs from "fs";

const execAsync = promisify(exec);

interface WorkerMessage {
  username: string;
  timeout?: number;
}

interface WorkerResult {
  success: boolean;
  entities: any[];
  error?: string;
  duration: number;
}

const TOP_SITES = [
  "Instagram", "Twitter", "X", "Facebook", "YouTube", "TikTok", "Reddit",
  "GitHub", "LinkedIn", "Pinterest", "Snapchat", "Telegram", "Discord",
  "Twitch", "Spotify", "Medium", "DeviantArt", "Behance", "Dribbble",
  "Flickr", "Vimeo", "Tumblr", "Quora", "SoundCloud", "Steam"
].join(",");

async function runSherlock(username: string, timeout = 180000): Promise<WorkerResult> {
  const startTime = Date.now();
  const outFile = os.tmpdir() + `/sherlock_worker_${Date.now()}.txt`;

  try {
    await execAsync(
      `sherlock "${username}" --site ${TOP_SITES} --print-found --timeout 2 --no-color --output "${outFile}"`,
      { timeout, maxBuffer: 10 * 1024 * 1024 }
    );

    const entities: any[] = [];
    const urls: string[] = [];

    // Parse output
    try {
      const raw = fs.readFileSync(outFile, "utf-8");
      fs.unlinkSync(outFile);
      urls.push(...raw.split("\n").map(l => l.trim()).filter(l => l.startsWith("http")));
    } catch {}

    // Create entities
    for (const url of urls) {
      const platform = url.replace(/https?:\/\/(www\.)?/, "").split("/")[0]?.split(".")[0] || "unknown";
      entities.push({
        id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "social_profile",
        value: url,
        source: "sherlock",
        confidence: 88,
        metadata: { platform },
        verified: true,
        depth: 0
      });
    }

    return {
      success: true,
      entities,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    // Cleanup on error
    try { fs.unlinkSync(outFile); } catch {}
    
    return {
      success: false,
      entities: [],
      error: error.message || "Unknown error",
      duration: Date.now() - startTime
    };
  }
}

// Exécution du worker
if (workerData && parentPort) {
  const { username, timeout } = workerData as WorkerMessage;
  
  runSherlock(username, timeout).then(result => {
    parentPort?.postMessage(result);
  });
}

export { runSherlock };
