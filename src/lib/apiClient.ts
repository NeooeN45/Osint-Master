// ============================================================================
// API CLIENT v2 — Centralized, robust, observable
// Auto-retry · timeout · telemetry · SSE helper · health monitoring
// ============================================================================

const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || "http://localhost:3002/api";
const HEALTH_URL = API_BASE.replace(/\/api$/, "") + "/health";

// ──────────────────────────────────────────────────────────────────────────────
// Network telemetry — every request is recorded for debug
// ──────────────────────────────────────────────────────────────────────────────
export interface NetworkEntry {
  id: string;
  ts: number;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: string;
  requestBody?: any;
  responseSize?: number;
  retries?: number;
}

type NetworkListener = (entry: NetworkEntry) => void;
const networkLog: NetworkEntry[] = [];
const networkListeners = new Set<NetworkListener>();

export function onNetworkEvent(listener: NetworkListener): () => void {
  networkListeners.add(listener);
  return () => networkListeners.delete(listener);
}

export function getNetworkLog(): NetworkEntry[] {
  return [...networkLog];
}

export function clearNetworkLog(): void {
  networkLog.length = 0;
}

function recordNetwork(entry: NetworkEntry): void {
  networkLog.push(entry);
  if (networkLog.length > 500) networkLog.shift();
  networkListeners.forEach(l => { try { l(entry); } catch {} });
}

// ──────────────────────────────────────────────────────────────────────────────
// Core request with retry + timeout + telemetry
// ──────────────────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(public status: number, public body: any, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: any;
  timeout?: number;
  retries?: number;
  silent?: boolean;
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    timeout = 30000,
    retries = 2,
    silent = false,
    body,
    headers = {},
    method = "GET",
    ...rest
  } = options;

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const id = `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const start = Date.now();
  let attempt = 0;
  let lastError: any;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal,
        ...rest,
      });
      clearTimeout(timer);

      const duration = Date.now() - start;
      const text = await res.text();
      let json: any;
      try { json = text ? JSON.parse(text) : null; } catch { json = text; }

      if (!silent) {
        recordNetwork({
          id, ts: start, method, url,
          status: res.status, duration,
          requestBody: body,
          responseSize: text.length,
          retries: attempt,
        });
      }

      if (!res.ok) {
        throw new ApiError(res.status, json, (json && json.error) || res.statusText);
      }
      return json as T;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;

      // Abort/timeout or network error → retry (but not 4xx)
      const is4xx = err instanceof ApiError && err.status >= 400 && err.status < 500;
      if (is4xx || attempt >= retries) {
        if (!silent) {
          recordNetwork({
            id, ts: start, method, url,
            duration: Date.now() - start,
            error: err.message,
            requestBody: body,
            retries: attempt,
          });
        }
        throw err;
      }

      // Exponential backoff : 300ms, 700ms
      await new Promise(r => setTimeout(r, 300 * (attempt + 1) ** 2));
      attempt++;
    }
  }
  throw lastError;
}

// ──────────────────────────────────────────────────────────────────────────────
// SSE helper — streaming with auto-decode + telemetry
// ──────────────────────────────────────────────────────────────────────────────
export interface SSEOptions {
  method?: "GET" | "POST";
  body?: any;
  signal?: AbortSignal;
  onEvent: (ev: { type: string; data: any; id?: string }) => void;
  onStart?: () => void;
  onDone?: (eventCount: number, durationMs: number) => void;
  onError?: (err: Error) => void;
}

export async function sseRequest(endpoint: string, opts: SSEOptions): Promise<void> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const id = `sse-${Date.now().toString(36)}`;
  const start = Date.now();
  let eventCount = 0;

  try {
    const resp = await fetch(url, {
      method: opts.method || "POST",
      headers: { "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });

    recordNetwork({
      id, ts: start, method: opts.method || "POST", url,
      status: resp.status,
      requestBody: opts.body,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new ApiError(resp.status, err, err.error || resp.statusText);
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No SSE stream body");

    opts.onStart?.();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        if (raw === "[DONE]") continue;

        try {
          const ev = JSON.parse(raw);
          eventCount++;
          opts.onEvent(ev);
        } catch { /* skip malformed chunk */ }
      }
    }

    const duration = Date.now() - start;
    recordNetwork({
      id, ts: start, method: opts.method || "POST", url,
      status: resp.status, duration,
      responseSize: eventCount,
    });
    opts.onDone?.(eventCount, duration);
  } catch (err: any) {
    recordNetwork({
      id, ts: start, method: opts.method || "POST", url,
      error: err.message,
      duration: Date.now() - start,
    });
    opts.onError?.(err);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Health monitor — singleton ping
// ──────────────────────────────────────────────────────────────────────────────
export interface HealthStatus {
  ok: boolean;
  latencyMs: number | null;
  uptime: number | null;
  lastCheck: number;
  consecutiveFailures: number;
}

type HealthListener = (s: HealthStatus) => void;
const healthListeners = new Set<HealthListener>();
let healthState: HealthStatus = { ok: false, latencyMs: null, uptime: null, lastCheck: 0, consecutiveFailures: 0 };
let healthTimer: number | null = null;

export function onHealth(listener: HealthListener): () => void {
  healthListeners.add(listener);
  listener(healthState);
  return () => healthListeners.delete(listener);
}

export async function pingHealth(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const resp = await fetch(HEALTH_URL, { cache: "no-store" });
    const latency = Date.now() - start;
    const data = await resp.json().catch(() => ({}));
    healthState = {
      ok: resp.ok,
      latencyMs: latency,
      uptime: data.uptime || null,
      lastCheck: Date.now(),
      consecutiveFailures: resp.ok ? 0 : healthState.consecutiveFailures + 1,
    };
  } catch {
    healthState = {
      ok: false,
      latencyMs: null,
      uptime: null,
      lastCheck: Date.now(),
      consecutiveFailures: healthState.consecutiveFailures + 1,
    };
  }
  healthListeners.forEach(l => { try { l(healthState); } catch {} });
  return healthState;
}

export function startHealthMonitor(intervalMs = 10000): () => void {
  if (healthTimer) clearInterval(healthTimer);
  pingHealth();
  healthTimer = window.setInterval(pingHealth, intervalMs);
  return () => {
    if (healthTimer) { clearInterval(healthTimer); healthTimer = null; }
  };
}

export function getHealthStatus(): HealthStatus { return healthState; }

// ──────────────────────────────────────────────────────────────────────────────
// Typed API namespaces
// ──────────────────────────────────────────────────────────────────────────────
export const ai = {
  status: () => request<{ available: boolean; models: string[]; url: string }>("/ai/status"),
  models: () => request<{ models: string[] }>("/ai/models"),
  chat: (messages: any[], model?: string) =>
    request("/ai/chat", { method: "POST", body: { messages, model }, timeout: 120000 }),
  analyze: (data: any, context: string) =>
    request("/ai/analyze", { method: "POST", body: { data, context }, timeout: 120000 }),
  plan: (target: string, targetType: string, knownInfo?: string) =>
    request("/ai/plan", { method: "POST", body: { target, targetType, knownInfo }, timeout: 120000 }),
  pull: (model: string) =>
    request("/ai/pull", { method: "POST", body: { model }, timeout: 600000, retries: 0 }),
  logs: () => request<{ logs: any[]; count: number }>("/ai/logs"),
};

export const deep = {
  modules: () => request<any[]>("/deep/modules"),
  detect: (target: string) => request<{ target: string; type: string }>("/deep/detect", { method: "POST", body: { target } }),
  run: (target: string, config?: any) =>
    request("/deep/run", { method: "POST", body: { target, config }, timeout: 600000, retries: 0 }),
  stream: (target: string, config: any, handlers: Omit<SSEOptions, "body" | "method">) =>
    sseRequest("/deep/stream", { method: "POST", body: { target, config }, ...handlers }),
};

export const instagram = {
  profile: (username: string) => request(`/instagram/profile/${username}`, { timeout: 45000 }),
  network: (username: string) => request(`/instagram/network/${username}`, { timeout: 60000 }),
  investigate: (username: string, handlers: Omit<SSEOptions, "body" | "method">) =>
    sseRequest(`/instagram/investigate/${username}`, { method: "GET", ...handlers }),
};

export const modulesApi = {
  catalog: (filters?: { category?: string; installed?: boolean; enabled?: boolean }) =>
    request(`/modules/catalog${filters ? "?" + new URLSearchParams(filters as any) : ""}`),
  categories: () => request("/modules/categories"),
  install: (id: string) => request(`/modules/${id}/install`, { method: "POST", timeout: 180000, retries: 0 }),
  enable: (id: string) => request(`/modules/${id}/enable`, { method: "POST" }),
  disable: (id: string) => request(`/modules/${id}/disable`, { method: "POST" }),
};

export const debug = {
  health: () => request("/debug/health"),
  system: () => request("/debug/system"),
  stats: () => request("/debug/stats"),
  modulesStatus: () => request("/debug/modules-status"),
  recentErrors: () => request("/debug/errors"),
  flushCache: () => request("/debug/flush-cache", { method: "POST" }),
};

export const osint = {
  catalog: () => request("/osint/catalog"),
  status: () => request("/osint/status"),
  detect: (target: string) => request("/osint/detect", { method: "POST", body: { target } }),
  execute: (id: string, target: string) =>
    request(`/osint/execute/${id}`, { method: "POST", body: { target }, timeout: 120000 }),
};

// Default export for compatibility with old imports
export const API_URL = API_BASE;
