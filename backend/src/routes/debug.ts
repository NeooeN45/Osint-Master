// ============================================================================
// DEBUG API ROUTES
// Expose backend internals for frontend debug panel
// ============================================================================

import { Router } from "express";
import os from "os";
import { deepEngine } from "../services/deepEngine";
import { ollamaService } from "../services/ollamaService";

export const debugRouter = Router();

// In-memory error ring buffer
const errorBuffer: Array<{ ts: number; message: string; stack?: string; module?: string; context?: any }> = [];
const MAX_ERRORS = 200;
export function recordError(message: string, stack?: string, module?: string, context?: any) {
  errorBuffer.push({ ts: Date.now(), message, stack, module, context });
  if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();
}

// In-memory request counters
const counters = {
  requests: 0,
  errors: 0,
  sseStreams: 0,
  lastRequests: [] as Array<{ ts: number; method: string; path: string; status: number; duration: number }>,
};
const MAX_LAST_REQUESTS = 100;
export function recordRequest(method: string, path: string, status: number, duration: number) {
  counters.requests++;
  if (status >= 400) counters.errors++;
  counters.lastRequests.push({ ts: Date.now(), method, path, status, duration });
  if (counters.lastRequests.length > MAX_LAST_REQUESTS) counters.lastRequests.shift();
}

// ──────────────────────────────────────────────────────────────────────────────
// /debug/health — complete health
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.get("/health", async (_req, res) => {
  const ollamaAvailable = await ollamaService.isAvailable().catch(() => false);
  const models = ollamaAvailable ? await ollamaService.listModels().catch(() => []) : [];

  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
    memory: {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
    },
    cpu: process.cpuUsage(),
    ollama: {
      available: ollamaAvailable,
      url: process.env.OLLAMA_URL || "http://localhost:11434",
      models,
    },
    env: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    },
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// /debug/system — OS / resources
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.get("/system", (_req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    loadAverage: os.loadavg(),
    uptime: os.uptime(),
    processUptime: process.uptime(),
    nodeVersion: process.version,
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// /debug/stats — request counters + SSE sessions
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.get("/stats", (_req, res) => {
  res.json({
    requests: counters.requests,
    errors: counters.errors,
    sseStreams: counters.sseStreams,
    errorRate: counters.requests > 0 ? counters.errors / counters.requests : 0,
    recentRequests: counters.lastRequests.slice(-50),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    uptime: process.uptime(),
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// /debug/modules-status — per-module availability + categories
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.get("/modules-status", async (_req, res) => {
  const modules = deepEngine.getAvailableModules();

  // Grouper par catégorie
  const byCategory: Record<string, { total: number; available: number }> = {};
  for (const m of modules) {
    const cat = (m as any).category || "unknown";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, available: 0 };
    byCategory[cat].total++;
    if ((m as any).available !== false) byCategory[cat].available++;
  }

  // Grouper par target type
  const byTargetType: Record<string, number> = {};
  for (const m of modules) {
    for (const t of (m as any).targetTypes || []) {
      byTargetType[t] = (byTargetType[t] || 0) + 1;
    }
  }

  res.json({
    total: modules.length,
    available: modules.filter((m: any) => m.available !== false).length,
    unavailable: modules.filter((m: any) => m.available === false).length,
    byCategory,
    byTargetType,
    modules: modules.map((m: any) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      targetTypes: m.targetTypes,
      available: m.available !== false,
      priority: m.priority,
    })),
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// /debug/errors — recent errors
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.get("/errors", (_req, res) => {
  res.json({
    count: errorBuffer.length,
    errors: [...errorBuffer].reverse(),
  });
});

debugRouter.delete("/errors", (_req, res) => {
  errorBuffer.length = 0;
  res.json({ cleared: true });
});

// ──────────────────────────────────────────────────────────────────────────────
// /debug/env — env keys status (no values exposed)
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.get("/env", (_req, res) => {
  const apiKeys = [
    "RAPIDAPI_KEY", "SHODAN_API_KEY", "HIBP_API_KEY", "ABUSEIPDB_API_KEY",
    "HUNTER_API_KEY", "IPINFO_TOKEN", "NUMVERIFY_API_KEY", "GITHUB_TOKEN",
    "BRAVE_SEARCH_KEY", "BING_SEARCH_KEY", "ABSTRACT_PHONE_KEY", "ABSTRACT_EMAIL_KEY",
    "GOOGLE_KG_KEY", "PROXYCURL_KEY", "VIRUSTOTAL_KEY", "CENSYS_API_ID",
    "INTELX_API_KEY", "DEHASHED_API_KEY", "LEAKCHECK_API_KEY", "TELEGRAM_BOT_TOKEN",
  ];
  const status: Record<string, { set: boolean; length?: number }> = {};
  for (const k of apiKeys) {
    const v = process.env[k];
    status[k] = { set: !!(v && v.length > 3), length: v?.length };
  }
  res.json({
    ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "dolphin-mistral",
    keys: status,
    keysSet: Object.values(status).filter(s => s.set).length,
    keysTotal: apiKeys.length,
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// /debug/flush-cache — clear various caches
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.post("/flush-cache", (_req, res) => {
  // Modules d'engine pourraient exposer leur cache
  errorBuffer.length = 0;
  counters.lastRequests.length = 0;
  counters.requests = 0;
  counters.errors = 0;
  counters.sseStreams = 0;
  res.json({ cleared: true, ts: Date.now() });
});

// ──────────────────────────────────────────────────────────────────────────────
// /debug/ping — simple ping
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.get("/ping", (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

// ──────────────────────────────────────────────────────────────────────────────
// /debug/echo — echo request for testing
// ──────────────────────────────────────────────────────────────────────────────
debugRouter.post("/echo", (req, res) => {
  res.json({
    ts: Date.now(),
    method: req.method,
    body: req.body,
    headers: req.headers,
  });
});
