// ============================================================================
// FREE APIS MODULE - Toutes les APIs gratuites sans clé
// HackerTarget, IPInfo, URLScan, GitHub, crt.sh, Wayback, Reddit...
// ============================================================================

import { OSINTModule, makeEntityId } from "../types.js";

async function fetcher(url: string, timeoutMs = 10000): Promise<any> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "OSINT-Master/5.0" },
    });
    clearTimeout(id);
    return r.ok ? await r.json().catch(() => r.text()) : null;
  } catch {
    clearTimeout(id);
    return null;
  }
}

// ---- 1. HackerTarget DNS ----
export const hackertargetDnsModule: OSINTModule = {
  id: "hackertarget_dns",
  name: "HackerTarget DNS Lookup",
  category: "domain",
  targetTypes: ["domain"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "hackertarget_dns", target } });

    const data = await fetcher(`https://api.hackertarget.com/dnslookup/?q=${target}`);
    const entities: any[] = [];

    if (typeof data === "string") {
      for (const line of data.split("\n").filter(Boolean)) {
        const parts = line.split(",");
        if (parts.length >= 2) {
          entities.push({
            id: makeEntityId(), type: "dns_record", value: line.trim(),
            source: "hackertarget_dns", confidence: 90, metadata: { raw: line }, verified: true, depth: 0,
          });
        }
        const ip = line.match(/\b\d{1,3}(\.\d{1,3}){3}\b/)?.[0];
        if (ip) {
          entities.push({
            id: makeEntityId(), type: "ip", value: ip,
            source: "hackertarget_dns", confidence: 90, metadata: { domain: target }, verified: true, depth: 0,
          });
        }
      }
    }

    emit({ type: "tool_done", data: { tool: "hackertarget_dns", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 2. HackerTarget Subdomains ----
export const hackertargetSubdomainsModule: OSINTModule = {
  id: "hackertarget_subdomains",
  name: "HackerTarget Subdomain Search",
  category: "domain",
  targetTypes: ["domain"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "hackertarget_subdomains", target } });

    const data = await fetcher(`https://api.hackertarget.com/hostsearch/?q=${target}`);
    const entities: any[] = [];

    if (typeof data === "string") {
      for (const line of data.split("\n").filter(Boolean)) {
        const [subdomain, ip] = line.split(",");
        if (subdomain && subdomain.includes(target)) {
          entities.push({
            id: makeEntityId(), type: "subdomain", value: subdomain.trim(),
            source: "hackertarget_subdomains", confidence: 85,
            metadata: { ip: ip?.trim(), parent: target }, verified: true, depth: 0,
          });
          if (ip?.trim()) {
            entities.push({
              id: makeEntityId(), type: "ip", value: ip.trim(),
              source: "hackertarget_subdomains", confidence: 85,
              metadata: { subdomain: subdomain.trim() }, verified: true, depth: 0,
            });
          }
        }
      }
    }

    emit({ type: "tool_done", data: { tool: "hackertarget_subdomains", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 3. HackerTarget Reverse IP ----
export const hackertargetReverseIpModule: OSINTModule = {
  id: "hackertarget_reverseip",
  name: "HackerTarget Reverse IP",
  category: "ip",
  targetTypes: ["ip", "domain"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "hackertarget_reverseip", target } });

    const data = await fetcher(`https://api.hackertarget.com/reverseiplookup/?q=${target}`);
    const entities: any[] = [];

    if (typeof data === "string") {
      for (const domain of data.split("\n").filter(l => l.includes("."))) {
        entities.push({
          id: makeEntityId(), type: "domain", value: domain.trim(),
          source: "hackertarget_reverseip", confidence: 80,
          metadata: { ip: target }, verified: true, depth: 0,
        });
      }
    }

    emit({ type: "tool_done", data: { tool: "hackertarget_reverseip", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 4. HackerTarget GeoIP ----
export const hackertargetGeoipModule: OSINTModule = {
  id: "hackertarget_geoip",
  name: "HackerTarget GeoIP",
  category: "ip",
  targetTypes: ["ip"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "hackertarget_geoip", target } });

    const data = await fetcher(`https://api.hackertarget.com/geoip/?q=${target}`);
    const entities: any[] = [];

    if (typeof data === "string") {
      const country = data.match(/Country: (.+)/)?.[1]?.trim();
      const city = data.match(/City: (.+)/)?.[1]?.trim();
      const lat = data.match(/Latitude: (.+)/)?.[1]?.trim();
      const lon = data.match(/Longitude: (.+)/)?.[1]?.trim();
      const isp = data.match(/ISP: (.+)/)?.[1]?.trim();

      entities.push({
        id: makeEntityId(), type: "location", value: [city, country].filter(Boolean).join(", ") || target,
        source: "hackertarget_geoip", confidence: 80,
        metadata: { country, city, lat: lat ? parseFloat(lat) : undefined, lng: lon ? parseFloat(lon) : undefined, isp, ip: target },
        verified: true, depth: 0,
      });
    }

    emit({ type: "tool_done", data: { tool: "hackertarget_geoip", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 5. HackerTarget Page Links ----
export const hackertargetPagelinksModule: OSINTModule = {
  id: "hackertarget_pagelinks",
  name: "HackerTarget Page Links",
  category: "domain",
  targetTypes: ["domain", "url"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    const url = target.startsWith("http") ? target : `https://${target}`;
    emit({ type: "tool_start", data: { tool: "hackertarget_pagelinks", target } });

    const data = await fetcher(`https://api.hackertarget.com/pagelinks/?q=${url}`);
    const entities: any[] = [];

    if (typeof data === "string") {
      for (const link of data.split("\n").filter(l => l.startsWith("http"))) {
        entities.push({
          id: makeEntityId(), type: "url", value: link.trim(),
          source: "hackertarget_pagelinks", confidence: 70,
          metadata: { parent: target }, verified: false, depth: 0,
        });
      }
    }

    emit({ type: "tool_done", data: { tool: "hackertarget_pagelinks", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 6. IPInfo ----
export const ipinfoModule: OSINTModule = {
  id: "ipinfo_free",
  name: "IPInfo (Free)",
  category: "ip",
  targetTypes: ["ip"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "ipinfo_free", target } });

    const data = await fetcher(`https://ipinfo.io/${target}/json`);
    const entities: any[] = [];

    if (data?.ip) {
      if (data.city || data.country) {
        entities.push({
          id: makeEntityId(), type: "location", value: [data.city, data.region, data.country].filter(Boolean).join(", "),
          source: "ipinfo_free", confidence: 85,
          metadata: { lat: data.loc?.split(",")[0], lng: data.loc?.split(",")[1], country: data.country, city: data.city, isp: data.org, ip: target },
          verified: true, depth: 0,
        });
      }
      if (data.org) {
        entities.push({
          id: makeEntityId(), type: "organization", value: data.org,
          source: "ipinfo_free", confidence: 85,
          metadata: { ip: target, type: "ISP" }, verified: true, depth: 0,
        });
      }
      if (data.hostname) {
        entities.push({
          id: makeEntityId(), type: "domain", value: data.hostname,
          source: "ipinfo_free", confidence: 80,
          metadata: { ip: target }, verified: true, depth: 0,
        });
      }
    }

    emit({ type: "tool_done", data: { tool: "ipinfo_free", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: data || {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 7. URLScan.io ----
export const urlscanModule: OSINTModule = {
  id: "urlscan",
  name: "URLScan.io",
  category: "domain",
  targetTypes: ["domain", "ip"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "urlscan", target } });

    const data = await fetcher(`https://urlscan.io/api/v1/search/?q=domain:${target}&size=20`);
    const entities: any[] = [];

    if (data?.results) {
      for (const r of data.results) {
        entities.push({
          id: makeEntityId(), type: "url", value: r.page?.url || r.task?.url,
          source: "urlscan", confidence: 75,
          metadata: { ip: r.page?.ip, country: r.page?.country, server: r.page?.server, screenshot: r.screenshot },
          verified: true, depth: 0,
        });
        if (r.page?.ip) {
          entities.push({
            id: makeEntityId(), type: "ip", value: r.page.ip,
            source: "urlscan", confidence: 80,
            metadata: { domain: target, country: r.page.country }, verified: true, depth: 0,
          });
        }
      }
    }

    emit({ type: "tool_done", data: { tool: "urlscan", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: data || {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 8. GitHub Search ----
export const githubSearchModule: OSINTModule = {
  id: "github_search",
  name: "GitHub User & Repo Search",
  category: "username",
  targetTypes: ["username", "email"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "github_search", target } });

    const headers: Record<string, string> = { "User-Agent": "OSINT-Master/5.0" };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers["Authorization"] = `token ${token}`;

    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);

    const entities: any[] = [];

    // User profile
    try {
      const userRes = await fetch(`https://api.github.com/users/${target}`, { headers, signal: ctrl.signal });
      if (userRes.ok) {
        const user = await userRes.json() as any;
        entities.push({
          id: makeEntityId(), type: "social_profile", value: user.html_url,
          source: "github_search", confidence: 95,
          metadata: { platform: "github", username: user.login, name: user.name, bio: user.bio, email: user.email, location: user.location, followers: user.followers, repos: user.public_repos, avatar: user.avatar_url },
          verified: true, depth: 0,
        });
        if (user.email) {
          entities.push({ id: makeEntityId(), type: "email", value: user.email, source: "github_search", confidence: 95, metadata: { source_platform: "github" }, verified: true, depth: 0 });
        }
        if (user.location) {
          entities.push({ id: makeEntityId(), type: "location", value: user.location, source: "github_search", confidence: 70, metadata: { platform: "github" }, verified: false, depth: 0 });
        }
      }
    } catch {}

    // Search users
    try {
      const searchRes = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(target)}&per_page=5`, { headers });
      if (searchRes.ok) {
        const search = await searchRes.json() as any;
        for (const u of (search.items || []).slice(0, 3)) {
          if (!entities.find(e => e.value === u.html_url)) {
            entities.push({
              id: makeEntityId(), type: "social_profile", value: u.html_url,
              source: "github_search", confidence: 65,
              metadata: { platform: "github", username: u.login, avatar: u.avatar_url }, verified: false, depth: 0,
            });
          }
        }
      }
    } catch {}

    emit({ type: "tool_done", data: { tool: "github_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 9. Reddit User ----
export const redditModule: OSINTModule = {
  id: "reddit_public",
  name: "Reddit Public Profile",
  category: "username",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "reddit_public", target } });

    const data = await fetcher(`https://www.reddit.com/user/${target}/about.json`);
    const entities: any[] = [];

    if (data?.data?.name) {
      const u = data.data;
      entities.push({
        id: makeEntityId(), type: "social_profile", value: `https://reddit.com/u/${u.name}`,
        source: "reddit_public", confidence: 90,
        metadata: { platform: "reddit", username: u.name, karma: u.link_karma + u.comment_karma, created: new Date(u.created_utc * 1000).toISOString(), verified: u.verified },
        verified: true, depth: 0,
      });
    }

    emit({ type: "tool_done", data: { tool: "reddit_public", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: data || {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- 10. Wayback Machine ----
export const waybackModule: OSINTModule = {
  id: "wayback_machine",
  name: "Wayback Machine",
  category: "domain",
  targetTypes: ["domain", "url"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    const url = target.startsWith("http") ? target : `https://${target}`;
    emit({ type: "tool_start", data: { tool: "wayback_machine", target } });

    const data = await fetcher(`https://archive.org/wayback/available?url=${url}`);
    const entities: any[] = [];

    if (data?.archived_snapshots?.closest?.url) {
      const snap = data.archived_snapshots.closest;
      entities.push({
        id: makeEntityId(), type: "url", value: snap.url,
        source: "wayback_machine", confidence: 80,
        metadata: { timestamp: snap.timestamp, available: snap.available, original: url },
        verified: true, depth: 0,
      });
    }

    // CDX API for multiple snapshots
    const cdx = await fetcher(`https://web.archive.org/cdx/search/cdx?url=${url}&output=json&limit=10&fl=timestamp,original,statuscode`);
    if (Array.isArray(cdx) && cdx.length > 1) {
      for (const [timestamp, original, status] of cdx.slice(1)) {
        entities.push({
          id: makeEntityId(), type: "url", value: `https://web.archive.org/web/${timestamp}/${original}`,
          source: "wayback_machine", confidence: 75,
          metadata: { timestamp, original, statuscode: status }, verified: true, depth: 0,
        });
      }
    }

    emit({ type: "tool_done", data: { tool: "wayback_machine", found: entities.length, duration: Date.now() - startTime } });
    return { success: entities.length > 0, data: data || {}, entities, executionTimeMs: Date.now() - startTime };
  },
};

// ---- Export ----
export const freeApiModules: OSINTModule[] = [
  hackertargetDnsModule,
  hackertargetSubdomainsModule,
  hackertargetReverseIpModule,
  hackertargetGeoipModule,
  hackertargetPagelinksModule,
  ipinfoModule,
  urlscanModule,
  githubSearchModule,
  redditModule,
  waybackModule,
];
