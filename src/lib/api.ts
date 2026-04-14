// ============================================================================
// API CLIENT
// Centralized API calls to backend
// ============================================================================

const API_BASE = "http://localhost:3002/api";

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ---- AI / Ollama ----
export const ai = {
  status: () => request("/ai/status"),
  models: () => request("/ai/models"),
  chat: (messages: any[], model?: string) =>
    request("/ai/chat", { method: "POST", body: JSON.stringify({ messages, model }) }),
  analyze: (data: any, context: string) =>
    request("/ai/analyze", { method: "POST", body: JSON.stringify({ data, context }) }),
  plan: (target: string, targetType: string, knownInfo?: string) =>
    request("/ai/plan", { method: "POST", body: JSON.stringify({ target, targetType, knownInfo }) }),
  pull: (model: string) =>
    request("/ai/pull", { method: "POST", body: JSON.stringify({ model }) }),
  logs: () => request("/ai/logs"),
};

// ---- OSINT Tools ----
export const osint = {
  catalog: () => request("/osint/catalog"),
  status: () => request("/osint/status"),
  check: (id: string) => request(`/osint/check/${id}`),
  install: (id: string) => request(`/osint/install/${id}`, { method: "POST" }),
  installAllPip: () => request("/osint/install-all-pip", { method: "POST" }),
  execute: (id: string, target: string) =>
    request(`/osint/execute/${id}`, { method: "POST", body: JSON.stringify({ target }) }),
  executeMulti: (tools: string[], target: string) =>
    request("/osint/execute-multi", { method: "POST", body: JSON.stringify({ tools, target }) }),
  detect: (target: string) =>
    request("/osint/detect", { method: "POST", body: JSON.stringify({ target }) }),
  scan: (target: string) =>
    request("/osint/scan", { method: "POST", body: JSON.stringify({ target }) }),
};

// ---- Investigation ----
export const investigation = {
  run: (target: string, options?: { targetType?: string; tools?: string[]; useAI?: boolean; webSearch?: boolean }) =>
    request("/investigation/run", {
      method: "POST",
      body: JSON.stringify({ target, ...options }),
    }),
  graph: (results: any[]) =>
    request("/investigation/graph", { method: "POST", body: JSON.stringify({ results }) }),
};

// ---- Web Search ----
export const webSearch = {
  search: (target: string, targetType?: string) =>
    request("/websearch/search", { method: "POST", body: JSON.stringify({ target, targetType }) }),
  dorks: (target: string, targetType?: string) =>
    request("/websearch/dorks", { method: "POST", body: JSON.stringify({ target, targetType }) }),
  suggestions: (target: string, targetType?: string) =>
    request("/websearch/suggestions", { method: "POST", body: JSON.stringify({ target, targetType }) }),
};

// ---- Orchestrator (Advanced Multi-Agent) ----
export const orchestrator = {
  // Sessions
  createSession: (name: string, target: string, targetType: string, config?: any) =>
    request("/orchestrator/sessions", { method: "POST", body: JSON.stringify({ name, target, targetType, config }) }),
  getSessions: () => request("/orchestrator/sessions"),
  getSession: (id: string) => request(`/orchestrator/sessions/${id}`),
  exportSession: (id: string) => request(`/orchestrator/sessions/${id}/export`),
  pauseSession: (id: string) => request(`/orchestrator/sessions/${id}/pause`, { method: "POST" }),
  resumeSession: (id: string) => request(`/orchestrator/sessions/${id}/resume`, { method: "POST" }),

  // Enrichment
  startEnrichment: (entity: any, config?: any) =>
    request("/orchestrator/enrich", { method: "POST", body: JSON.stringify({ entity, config }) }),
  getEnrichmentGraph: (treeId: string) => request(`/orchestrator/enrich/${treeId}/graph`),
  getEnrichmentStatus: (treeId: string) => request(`/orchestrator/enrich/${treeId}/status`),
  findPaths: (treeId: string, fromId: string, toId: string) =>
    request(`/orchestrator/enrich/${treeId}/paths`, { method: "POST", body: JSON.stringify({ fromId, toId }) }),

  // OPSEC
  setOPSECLevel: (level: "standard" | "cautious" | "paranoid") =>
    request("/orchestrator/opsec/level", { method: "POST", body: JSON.stringify({ level }) }),
  enableTor: (enabled: boolean) =>
    request("/orchestrator/opsec/tor", { method: "POST", body: JSON.stringify({ enabled }) }),
  addProxies: (proxies: any[]) =>
    request("/orchestrator/opsec/proxies", { method: "POST", body: JSON.stringify({ proxies }) }),
  enableSensitiveMode: (durationMinutes?: number) =>
    request("/orchestrator/opsec/sensitive-mode", { method: "POST", body: JSON.stringify({ durationMinutes }) }),
  getOPSECReport: () => request("/orchestrator/opsec/report"),

  // Full Investigation
  investigate: (target: string, targetType: string, options?: any) =>
    request("/orchestrator/investigate", { method: "POST", body: JSON.stringify({ target, targetType, ...options }) }),
  connectTargets: (targetA: string, targetB: string, options?: any) =>
    request("/orchestrator/connect", { method: "POST", body: JSON.stringify({ targetA, targetB, ...options }) }),
  riskAssessment: (target: string, targetType: string) =>
    request("/orchestrator/risk-assessment", { method: "POST", body: JSON.stringify({ target, targetType }) }),
};

// ---- Premium APIs ----
export const premium = {
  // Status
  getStatus: () => request("/premium/status"),

  // HaveIBeenPwned
  checkHIBP: (email: string) => request(`/premium/hibp/${email}`),

  // Shodan
  shodanHost: (ip: string) => request(`/premium/shodan/host/${ip}`),
  shodanSearch: (query: string, limit?: number) =>
    request(`/premium/shodan/search?q=${encodeURIComponent(query)}&limit=${limit || 10}`),
  shodanDnsResolve: (hostname: string) =>
    request(`/premium/shodan/dns/resolve?hostname=${encodeURIComponent(hostname)}`),
  shodanDnsReverse: (ip: string) =>
    request(`/premium/shodan/dns/reverse?ip=${encodeURIComponent(ip)}`),

  // VirusTotal
  virustotalIP: (ip: string) => request(`/premium/virustotal/ip/${ip}`),
  virustotalDomain: (domain: string) => request(`/premium/virustotal/domain/${domain}`),

  // AbuseIPDB
  checkAbuseIPDB: (ip: string) => request(`/premium/abuseipdb/${ip}`),

  // IPinfo
  getIPinfo: (ip: string) => request(`/premium/ipinfo/${ip}`),

  // Clearbit
  enrichCompany: (domain: string) => request(`/premium/clearbit/company/${domain}`),
  enrichPerson: (email: string) => request(`/premium/clearbit/person/${email}`),

  // Hunter
  hunterDomain: (domain: string, limit?: number) =>
    request(`/premium/hunter/domain/${domain}?limit=${limit || 10}`),
  hunterFind: (domain: string, firstName: string, lastName: string) =>
    request(`/premium/hunter/find?domain=${encodeURIComponent(domain)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`),

  // Generic Enrichment
  enrichEntity: (type: "ip" | "domain" | "email" | "company", value: string) =>
    request("/premium/enrich", { method: "POST", body: JSON.stringify({ type, value }) }),
  enrichBatch: (entities: Array<{ type: string; value: string }>) =>
    request("/premium/enrich/batch", { method: "POST", body: JSON.stringify({ entities }) }),
};

// ---- Image Analysis ----
export const image = {
  analyze: (imageData: string, options?: any) =>
    request("/image/analyze", { method: "POST", body: JSON.stringify({ imageData, options }) }),
  batch: (images: Array<{ id: string; data: string }>, options?: any) =>
    request("/image/batch", { method: "POST", body: JSON.stringify({ images, options }) }),
  reverseSearch: (imageUrl: string, engines?: string[]) =>
    request("/image/reverse-search", { method: "POST", body: JSON.stringify({ imageUrl, engines }) }),
  extractExif: (imageData: string) =>
    request("/image/exif", { method: "POST", body: JSON.stringify({ imageData }) }),
  compare: (imageData1: string, imageData2: string) =>
    request("/image/compare", { method: "POST", body: JSON.stringify({ imageData1, imageData2 }) }),
  status: () => request("/image/status"),
};

// ---- Tools Registry ----
export const tools = {
  // Get all tools with filters
  getAll: (params?: { category?: string; target?: string; phase?: string; search?: string; limit?: number; offset?: number }) =>
    request(`/tools?${new URLSearchParams(params as any).toString()}`),

  // Stats
  getStats: () => request("/tools/stats"),

  // Get single tool
  getById: (id: string) => request(`/tools/${id}`),

  // Get by category
  getByCategory: (category: string) => request(`/tools/category/${category}`),

  // Get by target type
  getByTarget: (targetType: string) => request(`/tools/target/${targetType}`),

  // Search
  search: (query: string, filters?: any) =>
    request("/tools/search", { method: "POST", body: JSON.stringify({ query, filters }) }),

  // Recommend tools
  recommend: (targetType: string, phase: string, context?: any) =>
    request("/tools/recommend", { method: "POST", body: JSON.stringify({ targetType, phase, context }) }),

  // Get tool chain
  getChain: (targetType: string, depth?: number) =>
    request("/tools/chain", { method: "POST", body: JSON.stringify({ targetType, depth }) }),

  // Check availability
  checkAvailability: (toolIds: string[]) =>
    request("/tools/check", { method: "POST", body: JSON.stringify({ toolIds }) }),

  // Get categories
  getCategories: () => request("/tools/meta/categories"),
};
