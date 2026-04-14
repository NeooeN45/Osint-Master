// ============================================================================
// DEEP OSINT ENGINE v4.0 - Autonomous Recursive Investigation
// Streams results via SSE, auto-relaunches on high-value discoveries
// ============================================================================

import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import { EventEmitter } from "events";
import { logger } from "../utils/logger";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { NewModules } from "./newModules";
import { DorkIntelligence, UsernameIntelligence } from "./advancedEngine";
// Load .env immediately — ensures API keys are in process.env before module init
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

const execAsync = promisify(exec);

// ---- Types ----
export interface StreamEvent {
  type: "phase" | "tool_start" | "tool_done" | "entity_found" | "correlation" | "ai_analysis" | "recursive_launch" | "progress" | "complete" | "error" | "log";
  id: string;
  timestamp: string;
  data: any;
}

export interface DeepEntity {
  id: string;
  type: string;
  value: string;
  source: string;
  confidence: number;
  metadata: Record<string, any>;
  verified: boolean;
  depth: number; // 0 = direct, 1+ = recursive discovery
  parentEntityId?: string;
}

export interface DeepCorrelation {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
  evidence: string;
  source: string;
}

export interface InvestigationConfig {
  maxDepth: number;           // How deep to recurse (0 = no recursion)
  maxEntities: number;        // Max entities before stopping
  timeoutMs: number;          // Global timeout
  enableAI: boolean;          // Use Ollama for analysis
  enableWebSearch: boolean;   // Google dorking
  enableRecursive: boolean;   // Auto-relaunch on discoveries
  recursiveThreshold: number; // Min confidence to recurse (0-100)
  selectedModules: string[];  // Specific modules to use (empty = auto)
  targetType?: string;
}

const DEFAULT_CONFIG: InvestigationConfig = {
  maxDepth: 2,
  maxEntities: 500,
  timeoutMs: 300000, // 5 min
  enableAI: true,
  enableWebSearch: true,
  enableRecursive: true,
  recursiveThreshold: 70,
  selectedModules: [],
};

// ---- Target Type Detection ----
export function detectTargetType(target: string): string {
  if (target.match(/^[\w.+-]+@[\w-]+\.[\w.]+$/)) return "email";
  if (target.match(/^\+?[\d\s()\-]{7,}$/)) return "phone";
  if (target.match(/^(\d{1,3}\.){3}\d{1,3}$/)) return "ip";
  if (target.match(/^([0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}$/i)) return "ipv6";
  if (target.match(/^https?:\/\//)) return "url";
  if (target.match(/^[\w-]+\.[\w.]{2,}$/)) return "domain";
  if (target.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/)) return "person";
  return "username";
}

// ---- Module Definitions ----
interface OSINTModule {
  id: string;
  name: string;
  category: string;
  targetTypes: string[];
  execute: (target: string, emit: (event: Partial<StreamEvent>) => void) => Promise<ModuleResult>;
  isAvailable: () => Promise<boolean>;
  priority: number; // Lower = runs first
}

interface ModuleResult {
  success: boolean;
  data: any;
  entities: DeepEntity[];
  rawOutput?: string;
}

// ---- Module Implementation Helpers ----
async function tryExec(cmd: string, timeoutMs = 30000): Promise<{ stdout: string; stderr: string } | null> {
  try {
    return await execAsync(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });
  } catch (e: any) {
    return e.stdout ? { stdout: e.stdout, stderr: e.stderr || "" } : null;
  }
}

async function tryHttp(url: string, options: any = {}): Promise<any> {
  try {
    const res = await axios.get(url, { timeout: 15000, ...options });
    return res.data;
  } catch {
    return null;
  }
}

async function tryHttpPost(url: string, body: any, options: any = {}): Promise<any> {
  try {
    const res = await axios.post(url, body, { timeout: 15000, ...options });
    return res.data;
  } catch {
    return null;
  }
}

function makeEntityId(): string {
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// ALL OSINT MODULES (real execution)
// ============================================================================
const MODULES: OSINTModule[] = [
  // ---- USERNAME ----
  {
    id: "sherlock", name: "Sherlock", category: "username", targetTypes: ["username"],
    priority: 1,
    isAvailable: async () => { const r = await tryExec("sherlock --version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Searching ${target} across 400+ social networks...` } });
      const os = await import("os");
      const fs = await import("fs");
      const outFile = os.tmpdir() + `/sherlock_${Date.now()}.txt`;
      // --output writes one URL per line (no prefix); --timeout 5 per site; sherlock parallelizes
      const r = await tryExec(
        `sherlock "${target}" --print-found --timeout 5 --no-color --output "${outFile}"`,
        480000  // 8min — sherlock tests 400+ sites in parallel batches, 5s timeout each
      );
      const entities: DeepEntity[] = [];
      // Parse output file — sherlock writes raw URLs one per line
      let urls: string[] = [];
      try {
        const raw = fs.readFileSync(outFile, "utf-8");
        fs.unlinkSync(outFile);
        urls = raw.split("\n").map(l => l.trim()).filter(l => l.startsWith("http"));
      } catch {}
      // Fallback: parse stdout for [+] lines
      if (urls.length === 0 && r) {
        const lines = (r.stdout + (r.stderr || "")).split("\n");
        for (const l of lines) {
          const url = l.match(/https?:\/\/[^\s]+/)?.[0]?.replace(/[,;"']+$/, "");
          if (url) urls.push(url);
        }
      }
      // Filter out internal/invalid URLs
      const NOISE_PATTERNS = [
        "raw.githubusercontent.com",
        "github.com/sherlock",
        "sherlock-project",
        "data.json",
        "localhost",
        "127.0.0.1",
        "example.com",
        "undefined",
        "null"
      ];
      
      for (const url of urls) {
        // Skip if URL matches noise patterns
        if (NOISE_PATTERNS.some(pattern => url.toLowerCase().includes(pattern))) continue;
        
        const platform = url.replace(/https?:\/\/(www\.)?/, "").split("/")[0]?.split(".")[0] || "unknown";
        entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "sherlock", confidence: 88, metadata: { platform }, verified: true, depth: 0 });
      }
      return { success: true, data: { found: entities.length }, entities };
    },
  },
  {
    id: "maigret", name: "Maigret", category: "username", targetTypes: ["username"],
    priority: 2,
    isAvailable: async () => { const r = await tryExec("maigret --version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Deep username enumeration on ${target}...` } });
      const os = await import("os");
      const fs = await import("fs");
      const outDir = os.tmpdir() + `/maigret_${Date.now()}`;
      fs.mkdirSync(outDir, { recursive: true });
      // --no-progressbar avoids colorama crash in non-TTY; -J simple outputs JSON report
      const r = await tryExec(
        `maigret "${target}" --timeout 8 --no-color --no-progressbar -J simple --folderoutput "${outDir}"`,
        90000
      );
      const entities: DeepEntity[] = [];
      // Parse JSON report file
      // Known false-positive patterns (search pages, generic responses)
      const FP_PATTERNS = [
        "op.gg/summoners/search",      // OP.GG search pages that accept any username
        "chaturbate.com/",             // Adult sites that often return generic pages
        "adultfriendfinder.com",
        "forum.blu-ray.com/member.php", // Forums with loose username validation
        "techpowerup.com/forums/members",
        "tomsguide.com/members",
        "ixbt.com/users.cgi",
        "authorstream.com",
        "wikimapia.org/user/tools",
        "dailykos.com/user",
        "moscow.flamp.ru",
        "kinja.com",
        "mercadolivre.com.br/perfil",
        "picsart.com/u",
        "weedmaps.com/brands",
        "3ddd.ru/users",
        "pbase.com",
        "interpals.net",
        "hashnode.com",
        "kaskus.co.id",
        "artstation.com",
        "kaggle.com",
        "livemaster.ru",
        "bibsonomy.org",
        "getmyuni.com",
        "roblox.com/user.aspx",
        "apple.com/profile",
        "opensea.io/accounts"
      ];
      
      try {
        const files = fs.readdirSync(outDir).filter((f: string) => f.endsWith(".json"));
        for (const f of files) {
          const data = JSON.parse(fs.readFileSync(outDir + "/" + f, "utf-8"));
          const sites = data?.[target] || data?.sites || data;
          for (const [site, info] of Object.entries(sites as Record<string, any>)) {
            const status = info?.status?.status || info?.status;
            if (status !== "Claimed") continue;
            const url = info?.url_user || info?.url || info?.status?.url;
            if (!url) continue;
            
            // Skip known false-positive patterns
            if (FP_PATTERNS.some(pattern => url.toLowerCase().includes(pattern.toLowerCase()))) {
              continue;
            }
            
            // Skip if URL looks like a search page (contains 'search', 'q=', '?username=')
            if (url.match(/[?&]q=|[?&]username=|[?&]search/i)) continue;
            
            entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "maigret", confidence: 82, metadata: { platform: site, ids: info?.ids_userdata }, verified: true, depth: 0 });
          }
        }
      } catch {}
      // Fallback: parse stdout for URLs
      if (entities.length === 0 && r) {
        const lines = (r.stdout + (r.stderr || "")).split("\n").filter((l: string) => l.includes("[+]") && l.includes("http"));
        for (const l of lines) {
          const url = l.match(/https?:\/\/[^\s]+/)?.[0]?.replace(/[,;"']+$/, "");
          if (url) entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "maigret", confidence: 78, metadata: {}, verified: true, depth: 0 });
        }
      }
      // Cleanup
      try { const fs2 = await import("fs"); fs2.rmSync(outDir, { recursive: true, force: true }); } catch {}
      return { success: true, data: { found: entities.length }, entities };
    },
  },
  {
    id: "whatsmyname", name: "WhatsMyName", category: "username", targetTypes: ["username"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `WhatsMyName — checking 30+ platforms for ${target}...` } });
      const clean = target.replace(/^@/, "");

      // Per-platform config: url, method to confirm existence, false-positive detection
      const platforms: { name: string; url: string; checkUrl?: string; method?: "api" | "html" | "head"; notFoundStr?: string; notFoundStatus?: number; foundStr?: string; confidence: number }[] = [
        { name: "GitHub",      url: `https://github.com/${clean}`,                         checkUrl: `https://api.github.com/users/${clean}`,                                       method: "api",  confidence: 95 },
        { name: "Reddit",      url: `https://reddit.com/user/${clean}`,                   checkUrl: `https://www.reddit.com/user/${clean}/about.json`,                            method: "api",  confidence: 92, notFoundStr: "USER_DOESNT_EXIST" },
        { name: "Twitch",      url: `https://twitch.tv/${clean}`,                         checkUrl: `https://api.twitch.tv/helix/users?login=${clean}`,                           method: "api",  confidence: 90 },
        { name: "Instagram",   url: `https://instagram.com/${clean}`,                     checkUrl: `https://www.instagram.com/api/v1/users/web_profile_info/?username=${clean}`, method: "api",  confidence: 90 },
        { name: "Twitter/X",   url: `https://x.com/${clean}`,                             checkUrl: `https://api.fxtwitter.com/${clean}`,                                         method: "api",  confidence: 85, notFoundStr: "NOT_FOUND" },
        { name: "TikTok",      url: `https://tiktok.com/@${clean}`,                       method: "html", foundStr: "__NEXT_DATA__",                                                                   confidence: 80 },
        { name: "Snapchat",    url: `https://www.snapchat.com/add/${clean}`,              method: "html", foundStr: "og:title",    notFoundStr: "Sorry, this page",                                    confidence: 82 },
        { name: "Telegram",    url: `https://t.me/${clean}`,                              method: "html", foundStr: "tgme_page",   notFoundStr: "tgme_page_not_found",                                 confidence: 90 },
        { name: "YouTube",     url: `https://youtube.com/@${clean}`,                      method: "html", foundStr: "channelId",   notFoundStr: "yt-lockup-metadata",                                  confidence: 78 },
        { name: "Pinterest",   url: `https://pinterest.com/${clean}`,                     method: "html", foundStr: `"username":"${clean}"`, notFoundStr: "404",                                     confidence: 78 },
        { name: "LinkedIn",    url: `https://linkedin.com/in/${clean}`,                   method: "html", foundStr: `linkedin.com/in/${clean}`, notFoundStr: "authwall",                             confidence: 70 },
        { name: "Medium",      url: `https://medium.com/@${clean}`,                       method: "html", foundStr: `"username":"${clean}"`, notFoundStr: "Not Found",                               confidence: 80 },
        { name: "Dev.to",      url: `https://dev.to/${clean}`,                            checkUrl: `https://dev.to/api/users/by_username?url=${clean}`,                          method: "api",  confidence: 88, notFoundStr: "error" },
        { name: "GitLab",      url: `https://gitlab.com/${clean}`,                        checkUrl: `https://gitlab.com/api/v4/users?username=${clean}`,                          method: "api",  confidence: 90 },
        { name: "Keybase",     url: `https://keybase.io/${clean}`,                        checkUrl: `https://keybase.io/_/api/1.0/user/lookup.json?username=${clean}`,            method: "api",  confidence: 92, notFoundStr: "NOT_FOUND" },
        { name: "Steam",       url: `https://steamcommunity.com/id/${clean}`,             method: "html", foundStr: `"steamid"`,   notFoundStr: "could not be found",                                  confidence: 82 },
        { name: "SoundCloud",  url: `https://soundcloud.com/${clean}`,                    method: "html", foundStr: `"username":"${clean}"`, notFoundStr: "404",                                     confidence: 80 },
        { name: "Spotify",     url: `https://open.spotify.com/user/${clean}`,             method: "html", foundStr: `"uri":"spotify:user:${clean}"`, notFoundStr: "404",                             confidence: 78 },
        { name: "Flickr",      url: `https://flickr.com/people/${clean}`,                 method: "html", notFoundStr: "404",                                                                         confidence: 72 },
        { name: "Vimeo",       url: `https://vimeo.com/${clean}`,                         method: "html", notFoundStr: "404",  foundStr: `"clip_url"`,                                                confidence: 78 },
        { name: "NPM",         url: `https://www.npmjs.com/~${clean}`,                    checkUrl: `https://registry.npmjs.org/-/user/org.couchdb.user:${clean}`,                method: "api",  confidence: 88 },
        { name: "PyPI",        url: `https://pypi.org/user/${clean}`,                     method: "html", notFoundStr: "404",                                                                         confidence: 82 },
        { name: "HackerOne",   url: `https://hackerone.com/${clean}`,                     method: "html", notFoundStr: "404", foundStr: `"username":"${clean}"`,                                     confidence: 85 },
        { name: "Pastebin",    url: `https://pastebin.com/u/${clean}`,                    method: "html", notFoundStr: "Not Found",                                                                   confidence: 75 },
        { name: "Bitbucket",   url: `https://bitbucket.org/${clean}`,                     checkUrl: `https://api.bitbucket.org/2.0/users/${clean}`,                               method: "api",  confidence: 88, notFoundStr: "No such user" },
        { name: "Gravatar",    url: `https://gravatar.com/${clean}`,                      checkUrl: `https://www.gravatar.com/${clean}.json`,                                     method: "api",  confidence: 90, notFoundStr: "User not found" },
        { name: "Mastodon",    url: `https://mastodon.social/@${clean}`,                  method: "html", foundStr: `"@${clean}@`,                                                                    confidence: 72 },
        { name: "Codepen",     url: `https://codepen.io/${clean}`,                        method: "html", notFoundStr: "404", foundStr: `"username":"${clean}"`,                                     confidence: 80 },
        { name: "Replit",      url: `https://replit.com/@${clean}`,                       method: "html", notFoundStr: "404",                                                                         confidence: 78 },
        { name: "Linktree",    url: `https://linktr.ee/${clean}`,                         method: "html", notFoundStr: "404", foundStr: `"username":"${clean}"`,                                     confidence: 85 },
      ];

      const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
      const entities: DeepEntity[] = [];
      const confirmed: string[] = [];

      const results = await Promise.allSettled(
        platforms.map(async p => {
          try {
            const targetUrl = p.checkUrl || p.url;
            const resp = await axios.get(targetUrl, {
              timeout: 6000,
              validateStatus: () => true,
              headers: {
                "User-Agent": UA,
                ...(p.name === "Instagram" ? { "X-IG-App-ID": "936619743392459" } : {}),
                ...(p.name === "Reddit" ? { "Accept": "application/json" } : {}),
              },
              maxRedirects: 3,
            } as any);

            const status = resp.status;
            const rd = resp.data as any;
            const body = typeof rd === "string" ? rd : JSON.stringify(rd || "");

            // Hard 404 / 410 → definitely not found
            if (status === 404 || status === 410) return { ...p, found: false };

            // API-mode: check JSON response for presence indicators
            if (p.method === "api") {
              if (p.notFoundStr && body.includes(p.notFoundStr)) return { ...p, found: false };
              // Empty array = not found (e.g. GitLab, Twitch)
              if (Array.isArray(rd) && rd.length === 0) return { ...p, found: false };
              if (rd?.data?.length === 0) return { ...p, found: false };
              // Twitch: data array with user
              if (p.name === "Twitch" && (!rd?.data || rd.data.length === 0)) return { ...p, found: false };
              // Twitter: check for user object
              if (p.name === "Twitter/X" && !rd?.user) return { ...p, found: false };
              // Instagram: check for user data
              if (p.name === "Instagram" && !rd?.data?.user) return { ...p, found: false };
              // Reddit: check data
              if (p.name === "Reddit" && !rd?.data?.name) return { ...p, found: false };
              if (status >= 200 && status < 300) return { ...p, found: true, body: body.slice(0, 500) };
              return { ...p, found: false };
            }

            // HTML-mode: look for presence/absence strings
            if (p.method === "html") {
              if (p.notFoundStr && body.toLowerCase().includes(p.notFoundStr.toLowerCase())) return { ...p, found: false };
              if (p.foundStr && !body.includes(p.foundStr)) return { ...p, found: false };
              if (status >= 200 && status < 400) return { ...p, found: true };
              return { ...p, found: false };
            }

            // Head mode fallback
            return { ...p, found: status >= 200 && status < 400 };
          } catch { return { ...p, found: false }; }
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && (r as any).value.found) {
          const p = (r as any).value;
          confirmed.push(p.name);
          entities.push({
            id: makeEntityId(), type: "social_profile", value: p.url,
            source: "whatsmyname", confidence: p.confidence,
            metadata: { platform: p.name, verified: true },
            verified: true, depth: 0,
          });
        }
      }

      emit({ type: "log", data: { message: `WhatsMyName: confirmed ${confirmed.length}/${platforms.length} platforms: ${confirmed.join(", ")}` } });
      return { success: true, data: { checked: platforms.length, confirmed: confirmed.length, platforms: confirmed }, entities };
    },
  },

  // ---- EMAIL ----
  {
    id: "holehe", name: "Holehe", category: "email", targetTypes: ["email"],
    priority: 1,
    isAvailable: async () => { const r = await tryExec("holehe --version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Checking email registration on 120+ sites...` } });
      const r = await tryExec(`holehe "${target}" --no-color`, 60000);
      if (!r) return { success: false, data: null, entities: [] };
      const lines = r.stdout.split("\n").filter(l => l.includes("[+]"));
      const services = lines.map(l => l.replace(/\[.*?\]/, "").trim());
      const entities: DeepEntity[] = services.map(s => ({
        id: makeEntityId(), type: "service", value: s,
        source: "holehe", confidence: 85, metadata: { email: target },
        verified: true, depth: 0,
      }));
      return { success: true, data: { found: services.length, services }, entities, rawOutput: r.stdout };
    },
  },
  {
    id: "emailrep", name: "EmailRep.io", category: "email", targetTypes: ["email"],
    priority: 2,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Querying email reputation for ${target}...` } });
      const data = await tryHttp(`https://emailrep.io/${encodeURIComponent(target)}`, {
        headers: { "User-Agent": "OSINT-Master/4.0" }
      });
      if (!data) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      if (data.details?.profiles?.length) {
        for (const profile of data.details.profiles) {
          entities.push({
            id: makeEntityId(), type: "social_profile", value: profile,
            source: "emailrep", confidence: 70, metadata: { email: target },
            verified: false, depth: 0,
          });
        }
      }
      return { success: true, data, entities };
    },
  },
  {
    id: "h8mail", name: "H8mail", category: "email", targetTypes: ["email"],
    priority: 3,
    isAvailable: async () => { const r = await tryExec("h8mail --version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Checking data breaches for ${target}...` } });
      const r = await tryExec(`h8mail -t "${target}"`, 45000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      const breaches = r.stdout.match(/\[Breach\].*$/gm) || [];
      for (const b of breaches) {
        entities.push({
          id: makeEntityId(), type: "breach", value: b.replace("[Breach]", "").trim(),
          source: "h8mail", confidence: 90, metadata: { email: target },
          verified: true, depth: 0,
        });
      }
      return { success: true, data: { breaches: breaches.length }, entities, rawOutput: r.stdout };
    },
  },

  // ---- PHONE ----
  {
    id: "phoneinfoga", name: "PhoneInfoga", category: "phone", targetTypes: ["phone"],
    priority: 1,
    isAvailable: async () => { const r = await tryExec("phoneinfoga version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Scanning phone number ${target}...` } });
      const r = await tryExec(`phoneinfoga scan -n "${target}"`, 30000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      // Parse carrier, country, line type
      const carrier = r.stdout.match(/Carrier:\s*(.+)/i)?.[1]?.trim();
      const country = r.stdout.match(/Country:\s*(.+)/i)?.[1]?.trim();
      const lineType = r.stdout.match(/Line type:\s*(.+)/i)?.[1]?.trim();
      if (carrier) entities.push({ id: makeEntityId(), type: "organization", value: carrier, source: "phoneinfoga", confidence: 85, metadata: { phone: target, role: "carrier" }, verified: true, depth: 0 });
      if (country) entities.push({ id: makeEntityId(), type: "location", value: country, source: "phoneinfoga", confidence: 90, metadata: { phone: target }, verified: true, depth: 0 });
      return { success: true, data: { carrier, country, lineType, raw: r.stdout }, entities, rawOutput: r.stdout };
    },
  },
  {
    id: "numverify", name: "NumVerify API", category: "phone", targetTypes: ["phone"],
    priority: 2,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `NumVerify lookup for ${target}...` } });
      const clean = target.replace(/[\s()-]/g, "");
      const apiKey = process.env.NUMVERIFY_API_KEY;
      if (!apiKey) return { success: false, data: { error: "NUMVERIFY_API_KEY not set" }, entities: [] };
      const data = await tryHttp(`http://apilayer.net/api/validate?access_key=${apiKey}&number=${clean}&format=1`);
      if (!data || !data.valid) return { success: false, data, entities: [] };
      const entities: DeepEntity[] = [];
      if (data.carrier) entities.push({ id: makeEntityId(), type: "organization", value: data.carrier, source: "numverify", confidence: 90, metadata: { phone: target }, verified: true, depth: 0 });
      if (data.location) entities.push({ id: makeEntityId(), type: "location", value: data.location, source: "numverify", confidence: 90, metadata: { phone: target }, verified: true, depth: 0 });
      if (data.country_name) entities.push({ id: makeEntityId(), type: "location", value: data.country_name, source: "numverify", confidence: 95, metadata: { phone: target, type: "country" }, verified: true, depth: 0 });
      return { success: true, data, entities };
    },
  },
  {
    id: "pagesjaunes", name: "PagesJaunes (FR)", category: "phone", targetTypes: ["phone", "person"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `PagesJaunes reverse lookup for ${target}...` } });
      // Scrape pagesjaunes.fr for reverse phone lookup
      const clean = target.replace(/[\s()+\-]/g, "");
      try {
        const resp = await axios.get(`https://www.pagesjaunes.fr/annuaireinverse/recherche?quoiqui=${clean}`, {
          timeout: 15000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
        });
        const html = resp.data as string;
        const entities: DeepEntity[] = [];
        // Extract names
        const names = html.match(/class="denomination-links"[^>]*>([^<]+)/g) || [];
        for (const n of names.slice(0, 5)) {
          const name = n.replace(/class="denomination-links"[^>]*>/, "").trim();
          if (name.length > 2) {
            entities.push({ id: makeEntityId(), type: "person", value: name, source: "pagesjaunes", confidence: 75, metadata: { phone: target }, verified: false, depth: 0 });
          }
        }
        // Extract addresses
        const addresses = html.match(/class="address-container"[^>]*>([^<]+)/g) || [];
        for (const a of addresses.slice(0, 5)) {
          const addr = a.replace(/class="address-container"[^>]*>/, "").trim();
          if (addr.length > 5) {
            entities.push({ id: makeEntityId(), type: "location", value: addr, source: "pagesjaunes", confidence: 70, metadata: { phone: target }, verified: false, depth: 0 });
          }
        }
        return { success: entities.length > 0, data: { results: entities.length }, entities };
      } catch {
        return { success: false, data: null, entities: [] };
      }
    },
  },

  // ---- IP ----
  {
    id: "ipinfo", name: "IPinfo.io", category: "ip", targetTypes: ["ip", "ipv6"],
    priority: 1,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Geolocating IP ${target}...` } });
      const token = process.env.IPINFO_TOKEN || "";
      const url = token ? `https://ipinfo.io/${target}?token=${token}` : `https://ipinfo.io/${target}/json`;
      const data = await tryHttp(url);
      if (!data) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      if (data.city) entities.push({ id: makeEntityId(), type: "location", value: `${data.city}, ${data.region}, ${data.country}`, source: "ipinfo", confidence: 90, metadata: { ip: target, loc: data.loc }, verified: true, depth: 0 });
      if (data.org) entities.push({ id: makeEntityId(), type: "organization", value: data.org, source: "ipinfo", confidence: 85, metadata: { ip: target }, verified: true, depth: 0 });
      if (data.hostname) entities.push({ id: makeEntityId(), type: "domain", value: data.hostname, source: "ipinfo", confidence: 80, metadata: { ip: target }, verified: true, depth: 0 });
      return { success: true, data, entities };
    },
  },
  {
    id: "shodan_host", name: "Shodan", category: "ip", targetTypes: ["ip"],
    priority: 2,
    isAvailable: async () => !!process.env.SHODAN_API_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Shodan scan for ${target}...` } });
      const key = process.env.SHODAN_API_KEY;
      const data = await tryHttp(`https://api.shodan.io/shodan/host/${target}?key=${key}`);
      if (!data) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      if (data.ports?.length) {
        entities.push({ id: makeEntityId(), type: "service", value: `Open ports: ${data.ports.join(", ")}`, source: "shodan", confidence: 95, metadata: { ip: target }, verified: true, depth: 0 });
      }
      if (data.vulns?.length) {
        for (const vuln of data.vulns.slice(0, 10)) {
          entities.push({ id: makeEntityId(), type: "vulnerability", value: vuln, source: "shodan", confidence: 90, metadata: { ip: target }, verified: true, depth: 0 });
        }
      }
      if (data.hostnames?.length) {
        for (const h of data.hostnames) {
          entities.push({ id: makeEntityId(), type: "domain", value: h, source: "shodan", confidence: 85, metadata: { ip: target }, verified: true, depth: 0 });
        }
      }
      return { success: true, data: { ports: data.ports, os: data.os, vulns: data.vulns, hostnames: data.hostnames, org: data.org }, entities };
    },
  },
  {
    id: "abuseipdb", name: "AbuseIPDB", category: "ip", targetTypes: ["ip"],
    priority: 3,
    isAvailable: async () => !!process.env.ABUSEIPDB_API_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Checking abuse reports for ${target}...` } });
      const key = process.env.ABUSEIPDB_API_KEY;
      const data = await tryHttp(`https://api.abuseipdb.com/api/v2/check?ipAddress=${target}&maxAgeInDays=90`, {
        headers: { Key: key, Accept: "application/json" }
      });
      if (!data?.data) return { success: false, data: null, entities: [] };
      const d = data.data;
      const entities: DeepEntity[] = [];
      if (d.isp) entities.push({ id: makeEntityId(), type: "organization", value: d.isp, source: "abuseipdb", confidence: 85, metadata: { ip: target, abuseScore: d.abuseConfidenceScore }, verified: true, depth: 0 });
      return { success: true, data: { abuseScore: d.abuseConfidenceScore, isp: d.isp, domain: d.domain, totalReports: d.totalReports, countryCode: d.countryCode }, entities };
    },
  },

  // ---- DOMAIN ----
  {
    id: "whois", name: "WHOIS", category: "domain", targetTypes: ["domain"],
    priority: 1,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `WHOIS lookup for ${target}...` } });
      const r = await tryExec(`whois "${target}"`, 15000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      const registrant = r.stdout.match(/Registrant.*?:\s*(.+)/i)?.[1]?.trim();
      const email = r.stdout.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
      const ns = [...r.stdout.matchAll(/Name Server:\s*(.+)/gi)].map(m => m[1].trim());
      if (registrant && registrant.length > 3) entities.push({ id: makeEntityId(), type: "person", value: registrant, source: "whois", confidence: 70, metadata: { domain: target }, verified: false, depth: 0 });
      if (email) entities.push({ id: makeEntityId(), type: "email", value: email, source: "whois", confidence: 75, metadata: { domain: target }, verified: false, depth: 0 });
      for (const n of ns.slice(0, 5)) {
        entities.push({ id: makeEntityId(), type: "domain", value: n.toLowerCase(), source: "whois", confidence: 85, metadata: { domain: target, type: "nameserver" }, verified: true, depth: 0 });
      }
      return { success: true, data: { registrant, email, nameservers: ns, raw: r.stdout.slice(0, 2000) }, entities, rawOutput: r.stdout };
    },
  },
  {
    id: "subfinder", name: "Subfinder", category: "domain", targetTypes: ["domain"],
    priority: 2,
    isAvailable: async () => { const r = await tryExec("subfinder -version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Enumerating subdomains of ${target}...` } });
      const r = await tryExec(`subfinder -d "${target}" -silent`, 60000);
      if (!r) return { success: false, data: null, entities: [] };
      const subs = r.stdout.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const entities: DeepEntity[] = subs.slice(0, 50).map(s => ({
        id: makeEntityId(), type: "domain", value: s, source: "subfinder", confidence: 85, metadata: { parent: target }, verified: true, depth: 0,
      }));
      return { success: true, data: { found: subs.length, subdomains: subs.slice(0, 100) }, entities, rawOutput: r.stdout };
    },
  },
  {
    id: "httpx", name: "HTTPX", category: "domain", targetTypes: ["domain", "url"],
    priority: 3,
    isAvailable: async () => { const r = await tryExec("httpx -version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Probing HTTP services on ${target}...` } });
      const r = await tryExec(`echo "${target}" | httpx -silent -status-code -title -tech-detect -json`, 30000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      try {
        for (const line of r.stdout.split("\n").filter(l => l.startsWith("{"))) {
          const d = JSON.parse(line);
          if (d.technologies) {
            for (const tech of d.technologies) {
              entities.push({ id: makeEntityId(), type: "technology", value: tech, source: "httpx", confidence: 80, metadata: { domain: target }, verified: true, depth: 0 });
            }
          }
        }
      } catch {}
      return { success: true, data: { raw: r.stdout }, entities, rawOutput: r.stdout };
    },
  },
  {
    id: "dnsx", name: "DNSx", category: "domain", targetTypes: ["domain"],
    priority: 4,
    isAvailable: async () => { const r = await tryExec("dnsx -version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `DNS resolution for ${target}...` } });
      const r = await tryExec(`echo "${target}" | dnsx -silent -a -aaaa -mx -ns -cname -json`, 20000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      try {
        for (const line of r.stdout.split("\n").filter(l => l.startsWith("{"))) {
          const d = JSON.parse(line);
          if (d.a) for (const ip of d.a) entities.push({ id: makeEntityId(), type: "ip", value: ip, source: "dnsx", confidence: 90, metadata: { domain: target }, verified: true, depth: 0 });
          if (d.mx) for (const mx of d.mx) entities.push({ id: makeEntityId(), type: "domain", value: mx, source: "dnsx", confidence: 85, metadata: { domain: target, type: "mx" }, verified: true, depth: 0 });
        }
      } catch {}
      return { success: true, data: { raw: r.stdout }, entities, rawOutput: r.stdout };
    },
  },

  // ---- PERSON / NAME ----
  {
    id: "socialscan", name: "SocialScan", category: "person", targetTypes: ["person", "username", "email"],
    priority: 1,
    isAvailable: async () => { const r = await tryExec("socialscan --version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Scanning social platforms for ${target}...` } });
      const os = await import("os");
      const fs = await import("fs");
      const jsonFile = os.tmpdir() + `/socialscan_${Date.now()}.json`;
      const r = await tryExec(`socialscan "${target}" --json "${jsonFile}"`, 30000);
      const entities: DeepEntity[] = [];
      const urlMap: Record<string, string> = {
        instagram: `https://instagram.com/${target}`,
        twitter: `https://twitter.com/${target}`,
        github: `https://github.com/${target}`,
        reddit: `https://reddit.com/user/${target}`,
        twitch: `https://twitch.tv/${target}`,
        tiktok: `https://tiktok.com/@${target}`,
        pinterest: `https://pinterest.com/${target}`,
        linkedin: `https://linkedin.com/in/${target}`,
        youtube: `https://youtube.com/@${target}`,
        snapchat: `https://snapchat.com/add/${target}`,
        telegram: `https://t.me/${target}`,
        spotify: `https://open.spotify.com/user/${target}`,
        discord: `https://discord.com/users/${target}`,
        keybase: `https://keybase.io/${target}`,
        gitlab: `https://gitlab.com/${target}`,
        steam: `https://steamcommunity.com/id/${target}`,
        tumblr: `https://www.tumblr.com/${target}`,
        deviantart: `https://www.deviantart.com/${target}`,
        soundcloud: `https://soundcloud.com/${target}`,
      };
      try {
        const raw = fs.readFileSync(jsonFile, "utf-8");
        fs.unlinkSync(jsonFile);
        const data = JSON.parse(raw);
        // data = { "username": [ { platform, available, valid, success, message, link? } ] }
        const results: any[] = data?.[target] || Object.values(data)[0] || [];
        for (const item of results) {
          // available: "False" means the username IS taken
          if (item.available !== "False") continue;
          if (item.valid === "False") continue; // invalid username for platform (e.g. too long)
          const platform = item.platform as string;
          const url = item.link || urlMap[platform.toLowerCase()] || `${platform}: ${target}`;
          entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "socialscan", confidence: 88, metadata: { platform, message: item.message }, verified: true, depth: 0 });
        }
      } catch {
        // Fallback if JSON failed: parse stdout
        if (r) {
          const lines = r.stdout.split("\n");
          for (const l of lines) {
            if (!l.includes("Taken")) continue;
            const m = l.match(/(?:\[.\]\s+)?([A-Za-z0-9._-]{2,30})\s+(?:.*\s+)?Taken/);
            const platform = m?.[1];
            if (!platform || platform.toLowerCase() === "taken") continue;
            const url = urlMap[platform.toLowerCase()] || `${platform}: ${target}`;
            entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "socialscan", confidence: 80, metadata: { platform }, verified: true, depth: 0 });
          }
        }
      }
      return { success: true, data: { found: entities.length }, entities };
    },
  },

  // ---- WEB SEARCH / DORKING (multi-source) ----
  {
    id: "googledork", name: "Web Dorking", category: "search", targetTypes: ["username", "email", "phone", "person", "domain", "ip"],
    priority: 10,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Web dorking for "${target}" (Brave + Bing + DDG)...` } });
      const entities: DeepEntity[] = [];
      const seen = new Set<string>();
      const addUrl = (url: string, query: string, source: string, confidence = 60) => {
        if (seen.has(url)) return;
        seen.add(url);
        // Filter noise
        const noise = ["duckduckgo.com", "bing.com", "google.com", "yahoo.com", "w3.org", "schema.org", "microsoft.com/en-us"];
        if (noise.some(n => url.includes(n))) return;
        entities.push({ id: makeEntityId(), type: "url", value: url, source, confidence, metadata: { query }, verified: false, depth: 0 });
      };

      // COMPREHENSIVE DORKING STRATEGY - 40+ specialized queries
      const targetType = detectTargetType(target);
      
      // Generate type-specific dorks
      const dorks = DorkIntelligence.generateDorks(target, targetType);
      
      // Add manual high-value dorks
      const extraDorks = [
        // Social profiles
        `"${target}" site:linkedin.com/in/`,
        `"${target}" site:facebook.com/people`,
        `"${target}" site:instagram.com/`,
        `"${target}" site:twitter.com OR site:x.com`,
        `"${target}" site:tiktok.com/@`,
        `"${target}" site:reddit.com/user`,
        `"${target}" site:github.com`,
        `"${target}" site:gitlab.com`,
        `"${target}" site:stackoverflow.com/users`,
        `"${target}" site:dev.to/@`,
        `"${target}" site:medium.com/@`,
        `"${target}" site:hashnode.com/@`,
        `"${target}" site:producthunt.com/@`,
        
        // Leaks and pastes
        `"${target}" site:pastebin.com`,
        `"${target}" site:ghostbin.com`,
        `"${target}" site:rentry.co`,
        `"${target}" site:0bin.net`,
        `"${target}" site:dpaste.com`,
        `"${target}" site:ideone.com`,
        `"${target}" "pastebin" "password"`,
        `"${target}" site:haveibeenpwned.com`,
        
        // Contact information
        `"${target}" "email" OR "e-mail"`,
        `"${target}" "phone" OR "contact"`,
        `"${target}" "address"`,
        `"${target}" "whatsapp"`,
        `"${target}" "telegram"`,
        
        // Documents and files
        `"${target}" filetype:pdf`,
        `"${target}" filetype:doc OR filetype:docx`,
        `"${target}" filetype:xls OR filetype:xlsx`,
        `"${target}" filetype:csv`,
        `"${target}" filetype:sql`,
        `"${target}" filetype:json`,
        `"${target}" filetype:xml`,
        `"${target}" filetype:txt`,
        `"${target}" "resume" OR "cv" filetype:pdf`,
        `"${target}" "portfolio" OR "profile"`,
        
        // Forums and communities
        `"${target}" site:forum*`,
        `"${target}" "forum" "profile"`,
        `"${target}" site:discourse*`,
        `"${target}" "joined" "member"`,
        
        // Professional
        `"${target}" "portfolio" OR "works"`,
        `"${target}" "company" OR "works at"`,
        `"${target}" "job" OR "hiring"`,
        `"${target}" "freelance"`,
        `"${target}" site:upwork.com/freelancers`,
        `"${target}" site:fiverr.com`,
        
        // Media
        `"${target}" site:youtube.com/c`,
        `"${target}" site:youtube.com/channel`,
        `"${target}" site:vimeo.com`,
        `"${target}" site:twitch.tv`,
        `"${target}" site:soundcloud.com`,
        `"${target}" site:spotify.com`,
        
        // Archives
        `"${target}" site:web.archive.org`,
        `"${target}" site:webcache.googleusercontent.com`,
        `"${target}" "cache:"`,
        
        // Breaches and security
        `"${target}" "breach" OR "leaked"`,
        `"${target}" "database" "exposed"`,
        `"${target}" "credentials"`,
        
        // Shopping/Marketplaces
        `"${target}" site:ebay.com/usr`,
        `"${target}" site:etsy.com/shop`,
        `"${target}" site:amazon.com/gp/profile`,
        
        // Dating/Classifieds (often have real info)
        `"${target}" site:badoo.com`,
        `"${target}" site:okcupid.com`,
        `"${target}" site:craigslist.org`,
        
        // Code sharing
        `"${target}" site:codepen.io`,
        `"${target}" site:jsfiddle.net`,
        `"${target}" site:repl.it/@`,
        `"${target}" site:glitch.com/@`,
        `"${target}" site:codesandbox.io/u`,
        `"${target}" site:snack.expo.dev`,
        
        // Security research
        `"${target}" site:hackerone.com`,
        `"${target}" site:bugcrowd.com`,
        `"${target}" site:intigriti.com`,
        `"${target}" "CVE" OR "exploit"`,
      ];
      
      // Combine and dedupe
      const allDorks = [...new Set([...dorks, ...extraDorks])];

      // ── Source 1: Brave Search API (free, 2000 req/month, no key needed for basic) ──
      const braveKey = process.env.BRAVE_SEARCH_KEY;
      if (braveKey) {
        for (const q of dorks.slice(0, 4)) {
          try {
            const r = await axios.get(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10`, {
              timeout: 8000,
              headers: { "Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": braveKey },
            });
            for (const item of (r.data as any)?.web?.results || []) {
              addUrl(item.url, q, "brave_search", 65);
              if (item.extra_snippets) {
                const emails = item.extra_snippets.join(" ").match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
                for (const email of emails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "brave_search", confidence: 72, metadata: { query: q }, verified: false, depth: 0 });
              }
            }
          } catch {}
        }
      }

      // ── Source 2: Bing Search API ──
      const bingKey = process.env.BING_SEARCH_KEY;
      if (bingKey && entities.length < 5) {
        for (const q of dorks.slice(0, 3)) {
          try {
            const r = await axios.get(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(q)}&count=10&mkt=fr-FR`, {
              timeout: 8000,
              headers: { "Ocp-Apim-Subscription-Key": bingKey },
            });
            for (const item of (r.data as any)?.webPages?.value || []) {
              addUrl(item.url, q, "bing_search", 65);
            }
          } catch {}
        }
      }

      // ── Source 3: DuckDuckGo HTML (no key, last resort) ──
      if (entities.length < 3) {
        for (const q of dorks.slice(0, 2)) {
          try {
            const resp = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
              timeout: 6000,
              headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36" },
            });
            const html = resp.data as string;
            // DDG encodes result URLs in uddg= param
            const ddgUrls = [...html.matchAll(/uddg=([^&"\s]+)/g)].map(m => { try { return decodeURIComponent(m[1]); } catch { return ""; } }).filter(u => u.startsWith("http"));
            for (const url of ddgUrls.slice(0, 5)) addUrl(url, q, "googledork", 58);
          } catch {}
        }
      }

      // ── Source 4: SearXNG public instances (privacy-respecting meta-search) ──
      if (entities.length < 3) {
        const searxInstances = ["https://searx.be", "https://search.mdosch.de", "https://paulgo.io"];
        for (const instance of searxInstances) {
          try {
            const resp = await axios.get(`${instance}/search?q=${encodeURIComponent(`"${target}"`)}&format=json&engines=google,bing,duckduckgo`, {
              timeout: 7000,
              headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
            });
            for (const r of (resp.data as any)?.results?.slice(0, 8) || []) {
              if (r.url) addUrl(r.url, `"${target}"`, "searxng", 62);
            }
            if (entities.length >= 5) break;
          } catch {}
        }
      }

      // Always return success if we attempted searches, even if no results
      // This prevents false negatives when search engines block/return empty
      const attemptedSearches = braveKey || bingKey || entities.length > 0;
      return { success: attemptedSearches || entities.length > 0, data: { target, sources: seen.size, dorksAttempted: allDorks.length }, entities };
    },
  },

  // ---- IMAGE ANALYSIS ----
  {
    id: "exiftool", name: "ExifTool", category: "image", targetTypes: ["image", "url"],
    priority: 1,
    isAvailable: async () => { const r = await tryExec("exiftool -ver"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Extracting EXIF metadata from ${target}...` } });
      const r = await tryExec(`exiftool -json "${target}"`, 15000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      try {
        const meta = JSON.parse(r.stdout)?.[0];
        if (meta?.GPSLatitude && meta?.GPSLongitude) {
          entities.push({ id: makeEntityId(), type: "location", value: `${meta.GPSLatitude}, ${meta.GPSLongitude}`, source: "exiftool", confidence: 95, metadata: { type: "gps" }, verified: true, depth: 0 });
        }
        if (meta?.Artist || meta?.Creator) {
          entities.push({ id: makeEntityId(), type: "person", value: meta.Artist || meta.Creator, source: "exiftool", confidence: 70, metadata: {}, verified: false, depth: 0 });
        }
      } catch {}
      return { success: true, data: { raw: r.stdout }, entities, rawOutput: r.stdout };
    },
  },

  // ---- BREACH / LEAK DETECTION ----
  {
    id: "hibp", name: "HaveIBeenPwned", category: "breach", targetTypes: ["email"],
    priority: 1,
    isAvailable: async () => !!process.env.HIBP_API_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Checking ${target} against breach databases...` } });
      const key = process.env.HIBP_API_KEY;
      try {
        const resp = await axios.get(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(target)}`, {
          headers: { "hibp-api-key": key!, "User-Agent": "OSINT-Master" },
          timeout: 10000,
        });
        const breaches: any[] = (resp.data as any[]) || [];
        const entities: DeepEntity[] = breaches.map((b: any) => ({
          id: makeEntityId(), type: "breach", value: `${b.Name} (${b.BreachDate})`,
          source: "hibp", confidence: 95, metadata: { dataClasses: b.DataClasses, pwnCount: b.PwnCount },
          verified: true, depth: 0,
        }));
        return { success: true, data: { breaches: breaches.length, details: breaches }, entities };
      } catch (e: unknown) {
        if ((e as any)?.response?.status === 404) return { success: true, data: { breaches: 0, message: "No breaches found" }, entities: [] };
        return { success: false, data: null, entities: [] };
      }
    },
  },

  // ---- NMAP ----
  {
    id: "nmap", name: "Nmap", category: "ip", targetTypes: ["ip", "domain"],
    priority: 5,
    isAvailable: async () => { const r = await tryExec("nmap --version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Port scanning ${target} (top 100 ports)...` } });
      const r = await tryExec(`nmap -sV --top-ports 100 -T4 "${target}"`, 120000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      const ports = [...r.stdout.matchAll(/(\d+)\/tcp\s+open\s+(\S+)\s*(.*)/g)];
      for (const [, port, service, version] of ports) {
        entities.push({ id: makeEntityId(), type: "service", value: `${port}/tcp ${service} ${version}`.trim(), source: "nmap", confidence: 90, metadata: { ip: target, port: parseInt(port) }, verified: true, depth: 0 });
      }
      return { success: true, data: { openPorts: ports.length, raw: r.stdout.slice(0, 3000) }, entities, rawOutput: r.stdout };
    },
  },

  // ---- GHunt (Google Account) ----
  {
    id: "ghunt", name: "GHunt", category: "email", targetTypes: ["email"],
    priority: 4,
    isAvailable: async () => { const r = await tryExec("ghunt --version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Google account investigation for ${target}...` } });
      const r = await tryExec(`ghunt email "${target}"`, 45000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      const name = r.stdout.match(/Name:\s*(.+)/i)?.[1]?.trim();
      if (name) entities.push({ id: makeEntityId(), type: "person", value: name, source: "ghunt", confidence: 80, metadata: { email: target }, verified: false, depth: 0 });
      return { success: true, data: { raw: r.stdout }, entities, rawOutput: r.stdout };
    },
  },

  // ---- theHarvester ----
  {
    id: "theharvester", name: "theHarvester", category: "domain", targetTypes: ["domain", "email"],
    priority: 5,
    isAvailable: async () => { const r = await tryExec("theHarvester --help"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Harvesting emails, subdomains, hosts for ${target}...` } });
      const r = await tryExec(`theHarvester -d "${target}" -b all -l 200`, 90000);
      if (!r) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      const emails = [...r.stdout.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map(m => m[0]);
      const hosts = [...r.stdout.matchAll(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g)].map(m => m[0]);
      for (const email of [...new Set(emails)].slice(0, 20)) {
        entities.push({ id: makeEntityId(), type: "email", value: email, source: "theharvester", confidence: 80, metadata: { domain: target }, verified: false, depth: 0 });
      }
      for (const ip of [...new Set(hosts)].slice(0, 20)) {
        entities.push({ id: makeEntityId(), type: "ip", value: ip, source: "theharvester", confidence: 75, metadata: { domain: target }, verified: false, depth: 0 });
      }
      return { success: true, data: { emails: emails.length, hosts: hosts.length }, entities, rawOutput: r.stdout };
    },
  },

  // ============================================================
  // ---- INSTAGRAM (priority focus) ----
  // ============================================================
  {
    id: "instagram_public", name: "Instagram Public", category: "social", targetTypes: ["username"],
    priority: 1,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Fetching Instagram public profile for @${target}...` } });
      const entities: DeepEntity[] = [];
      const clean = target.replace(/^@/, "");

      // Try the unofficial Instagram API endpoint (public, no auth needed for public profiles)
      try {
        const resp = await axios.get(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`,
          {
            timeout: 10000,
            headers: {
              "User-Agent": "Instagram 219.0.0.12.117 Android",
              "X-IG-App-ID": "936619743392459",
              "Accept": "application/json",
            },
          }
        );
        const user = (resp.data as any)?.data?.user;
        if (user) {
          entities.push({ id: makeEntityId(), type: "social_profile", value: `https://instagram.com/${clean}`, source: "instagram_public", confidence: 95, metadata: { platform: "Instagram", username: clean, followers: user.edge_followed_by?.count, following: user.edge_follow?.count, posts: user.edge_owner_to_timeline_media?.count, verified: user.is_verified, private: user.is_private, bio: user.biography, fullName: user.full_name, profilePic: user.profile_pic_url_hd }, verified: true, depth: 0 });
          if (user.full_name) entities.push({ id: makeEntityId(), type: "person", value: user.full_name, source: "instagram_public", confidence: 85, metadata: { username: clean, source: "instagram_bio" }, verified: false, depth: 0 });
          if (user.biography) {
            // Extract emails from bio
            const bioEmails = user.biography.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
            for (const email of bioEmails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "instagram_bio", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
            // Extract phone from bio
            const bioPhone = user.biography.match(/\+?\d[\d\s\-().]{7,}/)?.[0];
            if (bioPhone) entities.push({ id: makeEntityId(), type: "phone", value: bioPhone, source: "instagram_bio", confidence: 70, metadata: { username: clean }, verified: false, depth: 0 });
            // Extract URLs from bio
            const bioUrls = user.biography.match(/https?:\/\/\S+/g) || [];
            for (const url of bioUrls) entities.push({ id: makeEntityId(), type: "url", value: url, source: "instagram_bio", confidence: 75, metadata: { username: clean }, verified: false, depth: 0 });
          }
          if (user.external_url) entities.push({ id: makeEntityId(), type: "url", value: user.external_url, source: "instagram_public", confidence: 85, metadata: { username: clean, type: "website" }, verified: false, depth: 0 });
          // Extract locations from recent posts
          const posts = user.edge_owner_to_timeline_media?.edges || [];
          for (const post of posts.slice(0, 12)) {
            const node = post.node;
            if (node?.location?.name) entities.push({ id: makeEntityId(), type: "location", value: node.location.name, source: "instagram_post", confidence: 70, metadata: { username: clean, postId: node.id, lat: node.location.lat, lng: node.location.lng }, verified: true, depth: 0 });
            if (node?.accessibility_caption) {
              // AI-generated caption may contain names/places
              const captionEmails = node.accessibility_caption.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
              for (const email of captionEmails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "instagram_caption", confidence: 60, metadata: { username: clean }, verified: false, depth: 0 });
            }
          }
          return { success: true, data: { username: clean, followers: user.edge_followed_by?.count, following: user.edge_follow?.count, posts: user.edge_owner_to_timeline_media?.count, verified: user.is_verified, private: user.is_private, fullName: user.full_name, bio: user.biography, externalUrl: user.external_url }, entities };
        }
      } catch {}

      // Fallback: scrape public profile HTML
      try {
        const resp2 = await axios.get(`https://www.instagram.com/${encodeURIComponent(clean)}/`, {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" },
        });
        const html = resp2.data as string;
        // Extract shared_data JSON
        const jsonMatch = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/);
        if (jsonMatch) {
          try {
            const shared = JSON.parse(jsonMatch[1]);
            const user = shared?.entry_data?.ProfilePage?.[0]?.graphql?.user;
            if (user) {
              entities.push({ id: makeEntityId(), type: "social_profile", value: `https://instagram.com/${clean}`, source: "instagram_public", confidence: 90, metadata: { platform: "Instagram", username: clean, followers: user.edge_followed_by?.count, bio: user.biography, fullName: user.full_name }, verified: true, depth: 0 });
              if (user.full_name) entities.push({ id: makeEntityId(), type: "person", value: user.full_name, source: "instagram_public", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
            }
          } catch {}
        }
        // If profile found but no shared_data, mark as existing
        if (entities.length === 0 && !html.includes("Page Not Found")) {
          entities.push({ id: makeEntityId(), type: "social_profile", value: `https://instagram.com/${clean}`, source: "instagram_public", confidence: 70, metadata: { platform: "Instagram", username: clean, note: "Profile exists (detailed data unavailable)" }, verified: true, depth: 0 });
        }
      } catch {}

      return { success: entities.length > 0, data: { username: clean, found: entities.length > 0 }, entities };
    },
  },

  {
    id: "instaloader", name: "Instaloader", category: "social", targetTypes: ["username"],
    priority: 2,
    isAvailable: async () => { const r = await tryExec("instaloader --version"); return !!r; },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Instaloader deep scan for @${target}...` } });
      const clean = target.replace(/^@/, "");
      // instaloader profile download (metadata only, no media)
      const r = await tryExec(`instaloader --no-pictures --no-videos --no-video-thumbnails --no-geotags --no-captions --no-compress-json --stories-only-non-video --no-metadata-json -- -${clean} 2>&1 || instaloader --metadata-json --no-pictures --no-videos --count 3 ${clean} 2>&1`, 30000);
      // Fallback: try simpler call
      const r2 = r || await tryExec(`instaloader ${clean} --no-pictures --no-videos --no-video-thumbnails 2>&1`, 20000);
      const raw = (r2?.stdout || "") + (r2?.stderr || "");
      if (!r2 && !raw) return { success: false, data: null, entities: [] };
      const entities: DeepEntity[] = [];
      // Parse instaloader's console output
      const followers = raw.match(/(?:Followers|followers)[:\s]*(\d[\d,]*)/i)?.[1]?.replace(/,/g, "");
      const following = raw.match(/(?:Followees|following)[:\s]*(\d[\d,]*)/i)?.[1]?.replace(/,/g, "");
      const posts = raw.match(/(?:Posts|posts)[:\s]*(\d+)/i)?.[1];
      const bio = raw.match(/(?:Biography|bio)[:\s]*(.+)/i)?.[1]?.trim();
      const fullName = raw.match(/(?:Full Name|full_name)[:\s]*(.+)/i)?.[1]?.trim();
      if (fullName) entities.push({ id: makeEntityId(), type: "person", value: fullName, source: "instaloader", confidence: 85, metadata: { username: clean, platform: "Instagram" }, verified: false, depth: 0 });
      entities.push({ id: makeEntityId(), type: "social_profile", value: `https://instagram.com/${clean}`, source: "instaloader", confidence: 90, metadata: { platform: "Instagram", username: clean, followers, following, posts, bio, fullName }, verified: true, depth: 0 });
      if (bio) {
        const bioEmails = bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
        for (const email of bioEmails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "instaloader_bio", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
      }
      return { success: entities.length > 0, data: { username: clean, followers, following, posts, bio, fullName }, entities };
    },
  },

  // ---- INSTAGRAM: Osintgram (emails/phones des followers, GPS photos) ----
  {
    id: "osintgram", name: "Osintgram", category: "social", targetTypes: ["username"],
    priority: 3,
    isAvailable: async () => {
      const check = await tryExec("osintgram --version");
      if (check) return true;
      const check2 = await tryExec("python3 Osintgram/main.py --version");
      return !!(check2);
    },
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Osintgram deep Instagram analysis for @${target}...` } });
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];

      // Try running osintgram commands
      const commands = [
        { cmd: "info", label: "info" },
        { cmd: "addrs", label: "addresses" },
        { cmd: "fwersemail", label: "follower_emails" },
        { cmd: "fwingsemail", label: "following_emails" },
        { cmd: "fwersnumber", label: "follower_phones" },
        { cmd: "fwingsnumber", label: "following_phones" },
      ];

      for (const { cmd, label } of commands) {
        let r = null;
        // Try installed CLI
        r = await tryExec(`echo "${cmd}" | osintgram ${clean} 2>&1`, 20000);
        // Fallback: python in Osintgram folder
        if (!r || r.stdout.includes("not found")) {
          r = await tryExec(`cd Osintgram && echo "${cmd}" | python3 main.py ${clean} 2>&1`, 20000);
        }
        if (!r) continue;
        const out = r.stdout;

        if (cmd === "info") {
          const followers = out.match(/Followers:\s*([\d,]+)/i)?.[1];
          const following = out.match(/Following:\s*([\d,]+)/i)?.[1];
          const bio = out.match(/Bio:\s*(.+)/i)?.[1]?.trim();
          const fullName = out.match(/Full name:\s*(.+)/i)?.[1]?.trim();
          const isPrivate = out.includes("Private: True");
          if (fullName) entities.push({ id: makeEntityId(), type: "person", value: fullName, source: "osintgram", confidence: 90, metadata: { username: clean, followers, following, private: isPrivate }, verified: false, depth: 0 });
          if (bio) {
            const bioEmails = bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
            for (const email of bioEmails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "osintgram_bio", confidence: 85, metadata: { username: clean }, verified: false, depth: 0 });
          }
        }

        if (cmd === "addrs") {
          // GPS addresses from photos
          const addrs = out.split("\n").filter(l => l.trim().length > 5 && !l.includes("[") && !l.includes("osintgram"));
          for (const addr of addrs.slice(0, 10)) {
            entities.push({ id: makeEntityId(), type: "location", value: addr.trim(), source: "osintgram_gps", confidence: 80, metadata: { username: clean, type: "photo_location" }, verified: true, depth: 0 });
          }
        }

        if (cmd === "fwersemail" || cmd === "fwingsemail") {
          const emails = [...out.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map(m => m[0]);
          for (const email of [...new Set(emails)].slice(0, 20)) {
            entities.push({ id: makeEntityId(), type: "email", value: email, source: "osintgram_network", confidence: 75, metadata: { username: clean, relation: cmd === "fwersemail" ? "follower" : "following" }, verified: false, depth: 0 });
          }
        }

        if (cmd === "fwersnumber" || cmd === "fwingsnumber") {
          const phones = [...out.matchAll(/\+?[\d]{8,15}/g)].map(m => m[0]).filter(p => p.length >= 8);
          for (const phone of [...new Set(phones)].slice(0, 20)) {
            entities.push({ id: makeEntityId(), type: "phone", value: phone, source: "osintgram_network", confidence: 70, metadata: { username: clean, relation: cmd === "fwersnumber" ? "follower" : "following" }, verified: false, depth: 0 });
          }
        }
      }

      return { success: entities.length > 0, data: { username: clean, entitiesFound: entities.length }, entities };
    },
  },

  // ---- INSTAGRAM: Email/Phone linked to account (Instagram forgot password trick) ----
  {
    id: "instagram_contact", name: "Instagram Contact Info", category: "social", targetTypes: ["username"],
    priority: 4,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Checking contact info linked to @${target} (partial email/phone)...` } });
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];

      try {
        // Instagram's "forgot password" endpoint reveals partial email/phone
        // Step 1: get user ID
        const profileResp = await axios.get(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`,
          {
            timeout: 10000,
            headers: {
              "User-Agent": "Instagram 219.0.0.12.117 Android",
              "X-IG-App-ID": "936619743392459",
              "Accept": "application/json",
            },
          }
        );
        const userId = (profileResp.data as any)?.data?.user?.id;
        if (!userId) return { success: false, data: null, entities: [] };

        // Step 2: trigger forgot password via username → reveals masked email/phone
        const fpResp = await axios.post(
          "https://www.instagram.com/api/v1/accounts/send_password_reset/",
          `user_id=${userId}`,
          {
            timeout: 10000,
            headers: {
              "User-Agent": "Instagram 219.0.0.12.117 Android",
              "X-IG-App-ID": "936619743392459",
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json",
            },
          }
        );
        const fpData = fpResp.data as any;

        // email field: "ob*****@g***l.com"
        if (fpData?.email) {
          entities.push({
            id: makeEntityId(), type: "email", value: fpData.email,
            source: "instagram_contact", confidence: 85,
            metadata: { username: clean, userId, note: "Partial email from IG password reset", masked: true },
            verified: true, depth: 0,
          });
        }
        // phone_number field: "+33 6** *** **34"
        if (fpData?.phone_number) {
          entities.push({
            id: makeEntityId(), type: "phone", value: fpData.phone_number,
            source: "instagram_contact", confidence: 85,
            metadata: { username: clean, userId, note: "Partial phone from IG password reset", masked: true },
            verified: true, depth: 0,
          });
        }
        // obfuscated_email / obfuscated_phone (older API format)
        if (fpData?.obfuscated_email) {
          entities.push({
            id: makeEntityId(), type: "email", value: fpData.obfuscated_email,
            source: "instagram_contact", confidence: 80,
            metadata: { username: clean, userId, masked: true },
            verified: true, depth: 0,
          });
        }
        if (fpData?.obfuscated_phone) {
          entities.push({
            id: makeEntityId(), type: "phone", value: fpData.obfuscated_phone,
            source: "instagram_contact", confidence: 80,
            metadata: { username: clean, userId, masked: true },
            verified: true, depth: 0,
          });
        }

        // Also try username-based forgot password
        const fpResp2 = await axios.post(
          "https://www.instagram.com/api/v1/accounts/send_password_reset/",
          `username=${encodeURIComponent(clean)}`,
          {
            timeout: 8000,
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
              "X-IG-App-ID": "936619743392459",
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        ).catch(() => null);

        if (fpResp2?.data) {
          const d = fpResp2.data as any;
          if (d?.email && !entities.find(e => e.value === d.email)) {
            entities.push({ id: makeEntityId(), type: "email", value: d.email, source: "instagram_contact", confidence: 80, metadata: { username: clean, masked: true }, verified: true, depth: 0 });
          }
          if (d?.phone_number && !entities.find(e => e.value === d.phone_number)) {
            entities.push({ id: makeEntityId(), type: "phone", value: d.phone_number, source: "instagram_contact", confidence: 80, metadata: { username: clean, masked: true }, verified: true, depth: 0 });
          }
        }
      } catch {}

      return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
    },
  },

  // ---- INSTAGRAM: HikerAPI (pro, via RapidAPI key) ----
  {
    id: "hikerapi_instagram", name: "HikerAPI Instagram", category: "social", targetTypes: ["username"],
    priority: 5,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `HikerAPI deep Instagram data for @${target}...` } });
      const clean = target.replace(/^@/, "");
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        // HikerAPI via RapidAPI
        const info = await tryHttp(
          `https://hikerapi.p.rapidapi.com/api/v2/user/by/username?username=${encodeURIComponent(clean)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "hikerapi.p.rapidapi.com" } }
        );
        if (info?.data) {
          const u = info.data;
          entities.push({ id: makeEntityId(), type: "social_profile", value: `https://instagram.com/${clean}`, source: "hikerapi", confidence: 95, metadata: { platform: "Instagram", username: clean, userId: u.pk || u.id, followers: u.follower_count, following: u.following_count, posts: u.media_count, verified: u.is_verified, private: u.is_private, bio: u.biography, fullName: u.full_name, externalUrl: u.external_url, category: u.category, isBusinessAccount: u.is_business_account, businessEmail: u.business_email, businessPhone: u.business_phone_number, contactPhoneNumber: u.contact_phone_number, publicEmail: u.public_email }, verified: true, depth: 0 });
          if (u.full_name) entities.push({ id: makeEntityId(), type: "person", value: u.full_name, source: "hikerapi", confidence: 90, metadata: { username: clean }, verified: false, depth: 0 });
          // Business email/phone — publicly exposed by business accounts
          if (u.business_email) entities.push({ id: makeEntityId(), type: "email", value: u.business_email, source: "hikerapi_business", confidence: 95, metadata: { username: clean, type: "business_email" }, verified: true, depth: 0 });
          if (u.public_email) entities.push({ id: makeEntityId(), type: "email", value: u.public_email, source: "hikerapi_public", confidence: 95, metadata: { username: clean, type: "public_email" }, verified: true, depth: 0 });
          if (u.business_phone_number) entities.push({ id: makeEntityId(), type: "phone", value: u.business_phone_number, source: "hikerapi_business", confidence: 95, metadata: { username: clean, type: "business_phone" }, verified: true, depth: 0 });
          if (u.contact_phone_number) entities.push({ id: makeEntityId(), type: "phone", value: u.contact_phone_number, source: "hikerapi_contact", confidence: 90, metadata: { username: clean, type: "contact_phone" }, verified: true, depth: 0 });
          if (u.external_url) entities.push({ id: makeEntityId(), type: "url", value: u.external_url, source: "hikerapi", confidence: 90, metadata: { username: clean }, verified: true, depth: 0 });

          // Get recent posts for location data
          const posts = await tryHttp(
            `https://hikerapi.p.rapidapi.com/api/v2/user/medias?username=${encodeURIComponent(clean)}&amount=12`,
            { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "hikerapi.p.rapidapi.com" } }
          );
          if (posts?.data?.length) {
            for (const post of (posts.data as any[]).slice(0, 12)) {
              if (post.location?.name) entities.push({ id: makeEntityId(), type: "location", value: post.location.name, source: "hikerapi_posts", confidence: 85, metadata: { username: clean, postId: post.pk, lat: post.location.lat, lng: post.location.lng, timestamp: post.taken_at }, verified: true, depth: 0 });
            }
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Veriphone — Phone number enrichment ----
  {
    id: "veriphone", name: "Veriphone (Phone Lookup)", category: "phone", targetTypes: ["phone"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Veriphone enrichment for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://veriphone.p.rapidapi.com/verify?phone=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "veriphone.p.rapidapi.com" } }
        );
        if (resp?.phone_valid || resp?.phone) {
          entities.push({
            id: makeEntityId(), type: "phone", value: resp.phone || target,
            source: "veriphone", confidence: 90,
            metadata: {
              valid: resp.phone_valid,
              type: resp.phone_type,           // mobile / fixed_line / voip
              carrier: resp.carrier,
              country: resp.country,
              countryCode: resp.country_code,
              countryPrefix: resp.country_prefix,
              internationalFormat: resp.international_format,
              localFormat: resp.local_format,
            },
            verified: true, depth: 0,
          });
          if (resp.country) {
            entities.push({ id: makeEntityId(), type: "location", value: resp.country, source: "veriphone", confidence: 80, metadata: { phone: target, carrier: resp.carrier }, verified: true, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { phone: target }, entities };
    },
  },

  // ---- RAPIDAPI: Abstract Email Validation ----
  {
    id: "abstract_email", name: "Abstract Email Validation", category: "email", targetTypes: ["email"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Abstract email validation for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://emailvalidation.abstractapi.com/v1/?api_key=${key}&email=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "emailvalidation.abstractapi.com" } }
        );
        // Also try via RapidAPI endpoint
        const resp2 = resp || await tryHttp(
          `https://email-verification-validation-v2.p.rapidapi.com/?email=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "email-verification-validation-v2.p.rapidapi.com" } }
        );
        const d = resp2 || resp;
        if (d) {
          const deliverable = d.deliverability === "DELIVERABLE" || d.is_valid_format?.value === true;
          const isFree = d.is_free_email?.value === true;
          const isDisposable = d.is_disposable_email?.value === true;
          const isBusiness = !isFree && !isDisposable;
          entities.push({
            id: makeEntityId(), type: "email", value: target,
            source: "abstract_email", confidence: deliverable ? 92 : 70,
            metadata: {
              deliverable,
              isFreeEmail: isFree,
              isDisposableEmail: isDisposable,
              isBusinessEmail: isBusiness,
              quality: d.quality_score,
              smtpCheck: d.is_smtp_valid?.value,
              mxFound: d.is_mx_found?.value,
              autoCorrect: d.autocorrect,
              provider: d.domain,
            },
            verified: deliverable, depth: 0,
          });
          if (isBusiness) {
            emit({ type: "log", data: { message: `Business email confirmed: ${target}` } });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { email: target }, entities };
    },
  },

  // ---- RAPIDAPI: TikTok Scraper7 (enriched) ----
  {
    id: "tiktok_rapidapi", name: "TikTok API (RapidAPI)", category: "social", targetTypes: ["username"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `TikTok enriched data via RapidAPI for @${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];
      try {
        // Try TikTok Scraper7 API
        const info = await tryHttp(
          `https://tiktok-scraper7.p.rapidapi.com/user/info?unique_id=${encodeURIComponent(clean)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "tiktok-scraper7.p.rapidapi.com" } }
        );
        const u = info?.data?.user || info?.userInfo?.user;
        const s = info?.data?.stats || info?.userInfo?.stats;
        if (u) {
          entities.push({
            id: makeEntityId(), type: "social_profile",
            value: `https://www.tiktok.com/@${clean}`,
            source: "tiktok_rapidapi", confidence: 93,
            metadata: {
              platform: "TikTok", username: clean,
              displayName: u.nickname, userId: u.id,
              followers: s?.followerCount, following: s?.followingCount,
              likes: s?.heartCount, videos: s?.videoCount,
              bio: u.signature, verified: u.verified,
              region: u.region, privateAccount: u.privateAccount,
              bioLink: u.bioLink?.link,
            },
            verified: true, depth: 0,
          });
          if (u.nickname && u.nickname !== clean) entities.push({ id: makeEntityId(), type: "person", value: u.nickname, source: "tiktok_rapidapi", confidence: 85, metadata: { username: clean }, verified: false, depth: 0 });
          if (u.signature) {
            const emails = u.signature.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
            for (const email of emails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "tiktok_rapidapi_bio", confidence: 88, metadata: { username: clean }, verified: false, depth: 0 });
          }
          if (u.bioLink?.link) entities.push({ id: makeEntityId(), type: "url", value: u.bioLink.link, source: "tiktok_rapidapi", confidence: 90, metadata: { username: clean, type: "bio_link" }, verified: true, depth: 0 });

          // Get recent videos for location hints
          const videos = await tryHttp(
            `https://tiktok-scraper7.p.rapidapi.com/user/posts?unique_id=${encodeURIComponent(clean)}&count=10`,
            { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "tiktok-scraper7.p.rapidapi.com" } }
          );
          if (videos?.data?.videos?.length) {
            const locations = (videos.data.videos as any[]).map((v: any) => v.locationCreated).filter(Boolean);
            for (const loc of [...new Set(locations)].slice(0, 5) as string[]) {
              entities.push({ id: makeEntityId(), type: "location", value: loc, source: "tiktok_rapidapi_videos", confidence: 75, metadata: { username: clean }, verified: true, depth: 0 });
            }
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Social Profiles Finder (cross-platform username) ----
  {
    id: "social_finder_rapidapi", name: "Social Profiles Finder", category: "username", targetTypes: ["username", "email", "person"],
    priority: 3,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Cross-platform social profile search for "${target}"...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];

      // Try Social Media Profiles Finder
      try {
        const resp = await tryHttp(
          `https://social-media-profiles-finder.p.rapidapi.com/search?query=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "social-media-profiles-finder.p.rapidapi.com" } }
        );
        if (resp?.profiles?.length || resp?.results?.length) {
          const profiles = resp.profiles || resp.results || [];
          for (const p of (profiles as any[]).slice(0, 20)) {
            const url = p.url || p.link || p.profile_url;
            const name = p.name || p.username || p.display_name;
            if (url) {
              entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "social_finder_rapidapi", confidence: 78, metadata: { name, platform: p.platform || p.network, query: target }, verified: true, depth: 0 });
            }
          }
        }
      } catch {}

      // Fallback: try OSINTWork API on RapidAPI
      if (entities.length === 0) {
        try {
          const resp2 = await tryHttp(
            `https://osintwork1.p.rapidapi.com/username/${encodeURIComponent(target)}`,
            { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "osintwork1.p.rapidapi.com" } }
          );
          if (resp2?.found?.length) {
            for (const p of (resp2.found as any[]).slice(0, 20)) {
              const url = p.url || p.link;
              if (url) entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "social_finder_rapidapi", confidence: 80, metadata: { platform: p.name, query: target }, verified: true, depth: 0 });
            }
          }
        } catch {}
      }

      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- RAPIDAPI: LinkedIn Profile Scraper ----
  {
    id: "linkedin_rapidapi", name: "LinkedIn Scraper (RapidAPI)", category: "social", targetTypes: ["person", "username", "email"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `LinkedIn enrichment via RapidAPI for "${target}"...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        // Fresh LinkedIn Profile Data API
        const resp = await tryHttp(
          `https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile?linkedin_url=https://www.linkedin.com/in/${encodeURIComponent(target)}&include_skills=true`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "fresh-linkedin-profile-data.p.rapidapi.com" } }
        );
        const d = resp?.data || resp;
        if (d?.full_name || d?.firstName) {
          const name = d.full_name || `${d.firstName} ${d.lastName}`.trim();
          const location = d.location || d.geoLocationName;
          entities.push({
            id: makeEntityId(), type: "social_profile",
            value: d.linkedin_url || `https://www.linkedin.com/in/${target}`,
            source: "linkedin_rapidapi", confidence: 92,
            metadata: { platform: "LinkedIn", name, headline: d.headline, location, company: d.companyName, connections: d.connectionsCount, followers: d.followersCount, about: d.about?.slice(0, 300), skills: (d.skills || []).slice(0, 10) },
            verified: true, depth: 0,
          });
          if (name) entities.push({ id: makeEntityId(), type: "person", value: name, source: "linkedin_rapidapi", confidence: 90, metadata: { linkedin: target }, verified: true, depth: 0 });
          if (location) entities.push({ id: makeEntityId(), type: "location", value: location, source: "linkedin_rapidapi", confidence: 85, metadata: { person: name }, verified: true, depth: 0 });
          if (d.companyName) entities.push({ id: makeEntityId(), type: "organization", value: d.companyName, source: "linkedin_rapidapi", confidence: 85, metadata: { person: name }, verified: true, depth: 0 });
          for (const edu of (d.schools || []).slice(0, 3)) {
            if (edu.schoolName) entities.push({ id: makeEntityId(), type: "organization", value: edu.schoolName, source: "linkedin_rapidapi", confidence: 80, metadata: { person: name, type: "education", years: `${edu.startYear}-${edu.endYear}` }, verified: true, depth: 0 });
          }
        }
      } catch {}
      // Fallback: LinkedIn Profile Search
      if (entities.length === 0) {
        try {
          const resp2 = await tryHttp(
            `https://linkedin-data-api.p.rapidapi.com/search-people?keywords=${encodeURIComponent(target)}&start=0`,
            { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "linkedin-data-api.p.rapidapi.com" } }
          );
          for (const item of (resp2?.items || []).slice(0, 5)) {
            const url = item.profileURL || item.url;
            if (url) entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "linkedin_rapidapi", confidence: 75, metadata: { platform: "LinkedIn", name: item.fullName, headline: item.headline, location: item.location }, verified: true, depth: 0 });
            if (item.fullName) entities.push({ id: makeEntityId(), type: "person", value: item.fullName, source: "linkedin_rapidapi", confidence: 72, metadata: { linkedin: url }, verified: false, depth: 0 });
          }
        } catch {}
      }
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- RAPIDAPI: YouTube Channel Search ----
  {
    id: "youtube_rapidapi", name: "YouTube Channel (RapidAPI)", category: "social", targetTypes: ["username", "person"],
    priority: 3,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `YouTube channel search for "${target}"...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://youtube-v31.p.rapidapi.com/search?q=${encodeURIComponent(target)}&part=snippet&type=channel&maxResults=5`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "youtube-v31.p.rapidapi.com" } }
        );
        for (const item of (resp?.items || []).slice(0, 5)) {
          const ch = item.snippet;
          if (!ch) continue;
          const channelId = item.id?.channelId;
          const url = channelId ? `https://youtube.com/channel/${channelId}` : `https://youtube.com/@${target}`;
          entities.push({
            id: makeEntityId(), type: "social_profile", value: url,
            source: "youtube_rapidapi", confidence: 80,
            metadata: { platform: "YouTube", channelId, title: ch.channelTitle, description: ch.description?.slice(0, 200), publishedAt: ch.publishedAt },
            verified: true, depth: 0,
          });
          if (ch.channelTitle && ch.channelTitle !== target) entities.push({ id: makeEntityId(), type: "person", value: ch.channelTitle, source: "youtube_rapidapi", confidence: 70, metadata: { channelId }, verified: false, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- RAPIDAPI: IP Geolocation enriched ----
  {
    id: "ip_geo_rapidapi", name: "IP Geolocation (RapidAPI)", category: "ip", targetTypes: ["ip"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `IP geolocation enrichment for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://ip-geo-location.p.rapidapi.com/ip/check?format=json&ip=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "ip-geo-location.p.rapidapi.com" } }
        );
        const d = resp;
        if (d?.city || d?.country) {
          const location = [d.city, d.region, d.country?.name || d.country].filter(Boolean).join(", ");
          entities.push({
            id: makeEntityId(), type: "ip", value: target,
            source: "ip_geo_rapidapi", confidence: 90,
            metadata: { city: d.city, region: d.region, country: d.country?.name || d.country, countryCode: d.country?.code, latitude: d.latitude, longitude: d.longitude, isp: d.isp, org: d.organisation, asn: d.asn, timezone: d.timezone?.id, isVpn: d.security?.is_vpn, isTor: d.security?.is_tor, isProxy: d.security?.is_proxy },
            verified: true, depth: 0,
          });
          if (location) entities.push({ id: makeEntityId(), type: "location", value: location, source: "ip_geo_rapidapi", confidence: 88, metadata: { ip: target, lat: d.latitude, lng: d.longitude }, verified: true, depth: 0 });
          if (d.isp) entities.push({ id: makeEntityId(), type: "organization", value: d.isp, source: "ip_geo_rapidapi", confidence: 85, metadata: { ip: target, type: "ISP" }, verified: true, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { ip: target }, entities };
    },
  },

  // ---- RAPIDAPI: Twitch Enriched ----
  {
    id: "twitch_rapidapi", name: "Twitch (RapidAPI)", category: "social", targetTypes: ["username"],
    priority: 3,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Twitch profile enrichment for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://twitch-data.p.rapidapi.com/channel?login=${encodeURIComponent(clean)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "twitch-data.p.rapidapi.com" } }
        );
        const d = resp?.data || resp;
        if (d?.login || d?.displayName) {
          entities.push({
            id: makeEntityId(), type: "social_profile",
            value: `https://twitch.tv/${clean}`,
            source: "twitch_rapidapi", confidence: 92,
            metadata: { platform: "Twitch", username: d.login || clean, displayName: d.displayName, description: d.description, followers: d.followers, views: d.views, language: d.broadcasterLanguage, type: d.broadcasterType, createdAt: d.createdAt },
            verified: true, depth: 0,
          });
          if (d.displayName && d.displayName !== clean) entities.push({ id: makeEntityId(), type: "person", value: d.displayName, source: "twitch_rapidapi", confidence: 82, metadata: { username: clean }, verified: false, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Spotify Profile ----
  {
    id: "spotify_rapidapi", name: "Spotify (RapidAPI)", category: "social", targetTypes: ["username"],
    priority: 4,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Spotify profile lookup for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://spotify23.p.rapidapi.com/user_profile?id=${encodeURIComponent(clean)}&playlistLimit=5&artistLimit=5`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "spotify23.p.rapidapi.com" } }
        );
        const d = resp?.data || resp;
        if (d?.name || d?.uri) {
          entities.push({
            id: makeEntityId(), type: "social_profile",
            value: d.external_urls?.spotify || `https://open.spotify.com/user/${clean}`,
            source: "spotify_rapidapi", confidence: 88,
            metadata: { platform: "Spotify", username: clean, displayName: d.name, followers: d.followers?.total, avatar: d.images?.[0]?.url },
            verified: true, depth: 0,
          });
          if (d.name && d.name !== clean) entities.push({ id: makeEntityId(), type: "person", value: d.name, source: "spotify_rapidapi", confidence: 78, metadata: { username: clean }, verified: false, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Discord Lookup ----
  {
    id: "discord_rapidapi", name: "Discord Lookup (RapidAPI)", category: "social", targetTypes: ["username"],
    priority: 4,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Discord lookup for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];
      try {
        // Discord public profile via Lanyard or similar
        const resp = await tryHttp(
          `https://discord-lookup-api.p.rapidapi.com/user/${encodeURIComponent(clean)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "discord-lookup-api.p.rapidapi.com" } }
        );
        const d = resp?.data || resp;
        if (d?.username || d?.global_name) {
          entities.push({
            id: makeEntityId(), type: "social_profile",
            value: `https://discord.com/users/${d.id || clean}`,
            source: "discord_rapidapi", confidence: 85,
            metadata: { platform: "Discord", username: d.username, globalName: d.global_name, discriminator: d.discriminator, id: d.id, avatar: d.avatar, banner: d.banner, flags: d.flags, premiumType: d.premium_type },
            verified: true, depth: 0,
          });
          const displayName = d.global_name || d.username;
          if (displayName) entities.push({ id: makeEntityId(), type: "person", value: displayName, source: "discord_rapidapi", confidence: 75, metadata: { username: d.username }, verified: false, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Reverse Phone Lookup (Truecaller-style) ----
  {
    id: "phone_lookup_rapidapi", name: "Phone Reverse Lookup (RapidAPI)", category: "phone", targetTypes: ["phone"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Reverse phone lookup for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];

      // Try multiple phone APIs
      const apis = [
        { host: "phonenumber-lookup-api.p.rapidapi.com", path: `/lookup?phone=${encodeURIComponent(target)}` },
        { host: "phone-number-lookup2.p.rapidapi.com",   path: `/api/v1/phone?phone=${encodeURIComponent(target)}` },
        { host: "neutrinoapi-phone-validate.p.rapidapi.com", path: `/phone-validate?number=${encodeURIComponent(target)}&country-code=` },
      ];

      for (const api of apis) {
        try {
          const resp = await tryHttp(
            `https://${api.host}${api.path}`,
            { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } }
          );
          if (resp && (resp.name || resp.owner || resp.carrier || resp.is_valid)) {
            const name = resp.name || resp.owner || resp.callerName;
            const carrier = resp.carrier || resp.operator || resp.network;
            const location = [resp.city, resp.state, resp.country].filter(Boolean).join(", ");
            if (name) {
              entities.push({ id: makeEntityId(), type: "person", value: name, source: "phone_lookup_rapidapi", confidence: 85, metadata: { phone: target, carrier, location }, verified: true, depth: 0 });
            }
            entities.push({
              id: makeEntityId(), type: "phone", value: target,
              source: "phone_lookup_rapidapi", confidence: 90,
              metadata: { name, carrier, location, valid: resp.is_valid, type: resp.phone_type || resp.line_type, international: resp.international_format },
              verified: true, depth: 0,
            });
            if (location) entities.push({ id: makeEntityId(), type: "location", value: location, source: "phone_lookup_rapidapi", confidence: 80, metadata: { phone: target }, verified: true, depth: 0 });
            break;
          }
        } catch {}
      }
      return { success: entities.length > 0, data: { phone: target }, entities };
    },
  },

  // ---- RAPIDAPI: Email Breach + Reputation ----
  {
    id: "email_breach_rapidapi", name: "Email Breach Check (RapidAPI)", category: "email", targetTypes: ["email"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Email breach & reputation check for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        // Email Breach API
        const resp = await tryHttp(
          `https://breachdirectory.p.rapidapi.com/?func=auto&term=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "breachdirectory.p.rapidapi.com" } }
        );
        if (resp?.found > 0 || resp?.result?.length) {
          const sources = (resp.result || []).slice(0, 10).map((r: any) => r.sources || r.source).flat().filter(Boolean);
          const hashes = (resp.result || []).slice(0, 5).map((r: any) => r.password).filter(Boolean);
          entities.push({
            id: makeEntityId(), type: "breach",
            value: `${target} found in ${resp.found || resp.result?.length} breach(es)`,
            source: "email_breach_rapidapi", confidence: 92,
            metadata: { email: target, count: resp.found, sources: [...new Set(sources)].slice(0, 10), hashedPasswords: hashes, sha1Hashes: (resp.result || []).slice(0, 5).map((r: any) => r.sha1).filter(Boolean) },
            verified: true, depth: 0,
          });
        }
      } catch {}
      return { success: entities.length > 0, data: { email: target }, entities };
    },
  },

  // ---- RAPIDAPI: WhatsApp OSINT (inUtil Labs) — OSINT complet par numéro ----
  {
    id: "whatsapp_osint_rapidapi", name: "WhatsApp OSINT (RapidAPI)", category: "phone", targetTypes: ["phone"],
    priority: 1,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `WhatsApp OSINT for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const phone = target.replace(/\D/g, "");
      const entities: DeepEntity[] = [];
      const apis = [
        { host: "whatsapp-osint.p.rapidapi.com",  path: `/profile?phone=${phone}` },
        { host: "whatsapp-data1.p.rapidapi.com",  path: `/v1/WhatsApp/check_exists?phone=${phone}` },
      ];
      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          const d = (resp as any)?.data || resp;
          if (!d?.exists && !d?.registered && !d?.is_registered && !d?.whatsapp) continue;
          const name = d.name || d.displayName || d.pushname;
          const pic = d.profile_picture || d.avatar || d.photo || d.profilePicUrl;
          const about = d.about || d.status || d.bio;
          entities.push({
            id: makeEntityId(), type: "phone", value: target,
            source: "whatsapp_osint_rapidapi", confidence: 95,
            metadata: {
              platform: "WhatsApp", registeredOnWhatsApp: true,
              name, about, profilePicUrl: pic,
              lastSeen: d.last_seen, isBusiness: d.is_business || d.business,
              businessCategory: d.business_category, businessDescription: d.business_description,
              businessEmail: d.business_email, businessWebsite: d.business_website,
              phone,
            },
            verified: true, depth: 0,
          });
          if (pic) entities.push({ id: makeEntityId(), type: "image", value: pic, source: "whatsapp_osint_rapidapi", confidence: 93, metadata: { phone: target, type: "profile_picture", platform: "WhatsApp" }, verified: true, depth: 0 });
          if (name) entities.push({ id: makeEntityId(), type: "person", value: name, source: "whatsapp_osint_rapidapi", confidence: 88, metadata: { phone: target }, verified: true, depth: 0 });
          if (d.business_email) entities.push({ id: makeEntityId(), type: "email", value: d.business_email, source: "whatsapp_osint_rapidapi", confidence: 90, metadata: { phone: target, type: "business_email" }, verified: true, depth: 0 });
          if (d.business_website) entities.push({ id: makeEntityId(), type: "url", value: d.business_website, source: "whatsapp_osint_rapidapi", confidence: 88, metadata: { phone: target, type: "business_website" }, verified: true, depth: 0 });
          break;
        } catch {}
      }
      return { success: entities.length > 0, data: { phone }, entities };
    },
  },

  // ---- RAPIDAPI: ip-enricher (FrameFusion) — enrichissement IP metadata + privacy ----
  {
    id: "ip_enricher_rapidapi", name: "IP Enricher (RapidAPI)", category: "ip", targetTypes: ["ip"],
    priority: 1,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `IP enrichment for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://ip-enricher.p.rapidapi.com/enrich?ip=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "ip-enricher.p.rapidapi.com" } }
        );
        const d = (resp as any)?.data || resp;
        if (d?.ip || d?.geo) {
          const geo = d.geo || d;
          const privacy = d.privacy || d.threat || {};
          entities.push({
            id: makeEntityId(), type: "ip", value: target,
            source: "ip_enricher_rapidapi", confidence: 95,
            metadata: {
              ip: target,
              country: geo.country || geo.country_name,
              countryCode: geo.country_code,
              region: geo.region || geo.region_name,
              city: geo.city,
              latitude: geo.latitude || geo.lat,
              longitude: geo.longitude || geo.lon,
              isp: d.isp || geo.isp || geo.org,
              org: d.org || geo.org,
              asn: d.asn || geo.asn,
              isVpn: privacy.is_vpn || privacy.vpn,
              isTor: privacy.is_tor || privacy.tor,
              isProxy: privacy.is_proxy || privacy.proxy,
              isDatacenter: privacy.is_datacenter || privacy.datacenter,
              isAbuser: privacy.is_abuser || privacy.abuser,
              threatScore: privacy.threat_score || privacy.score,
              timezone: geo.timezone,
            },
            verified: true, depth: 0,
          });
          if (geo.city || geo.country) {
            const loc = [geo.city, geo.region, geo.country].filter(Boolean).join(", ");
            entities.push({ id: makeEntityId(), type: "location", value: loc, source: "ip_enricher_rapidapi", confidence: 88, metadata: { ip: target, latitude: geo.latitude || geo.lat, longitude: geo.longitude || geo.lon }, verified: true, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { ip: target }, entities };
    },
  },

  // ---- RAPIDAPI: IOC Search (IOCBank) — Threat intelligence: hash/IP/domain/URL ----
  {
    id: "ioc_search_rapidapi", name: "IOC Threat Intelligence (RapidAPI)", category: "ip", targetTypes: ["ip", "domain", "url", "hash"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `IOC threat intel scan for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://ioc-search.p.rapidapi.com/search?query=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "ioc-search.p.rapidapi.com" } }
        );
        const d = (resp as any)?.data || resp;
        const results = d?.results || d?.iocs || (Array.isArray(d) ? d : []);
        for (const r of (results as any[]).slice(0, 10)) {
          const iocType = r.type || r.ioc_type || "indicator";
          const value = r.value || r.ioc || r.indicator;
          if (!value) continue;
          entities.push({
            id: makeEntityId(), type: iocType === "ip" ? "ip" : iocType === "domain" ? "domain" : "url",
            value: String(value),
            source: "ioc_search_rapidapi", confidence: 85,
            metadata: {
              iocType, malware: r.malware || r.threat_name, tags: r.tags, tlp: r.tlp,
              firstSeen: r.first_seen, lastSeen: r.last_seen, score: r.score || r.threat_score,
              source: r.source || r.feed, description: r.description,
            },
            verified: true, depth: 0,
          });
        }
        if (results.length === 0 && d?.found === false) {
          // Clean — no threat detected, still useful info
          entities.push({ id: makeEntityId(), type: "metadata", value: `IOC Clean: ${target}`, source: "ioc_search_rapidapi", confidence: 70, metadata: { target, threat: false }, verified: true, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- RAPIDAPI: NetDetective — IP reputation (spam/botnet/VPN/datacenter) ----
  {
    id: "netdetective_rapidapi", name: "NetDetective IP Reputation (RapidAPI)", category: "ip", targetTypes: ["ip"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `NetDetective IP reputation for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://netdetective.p.rapidapi.com/query?ipaddress=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "netdetective.p.rapidapi.com" } }
        );
        const d = (resp as any)?.data || resp;
        if (d?.ip || d?.ipaddress) {
          entities.push({
            id: makeEntityId(), type: "ip", value: target,
            source: "netdetective_rapidapi", confidence: 92,
            metadata: {
              ip: target,
              isSpam: d.is_spam || d.spam,
              isBruteForce: d.is_brute_force || d.bruteforce,
              isBotnet: d.is_botnet || d.botnet,
              isVpn: d.is_vpn || d.vpn,
              isDatacenter: d.is_datacenter || d.datacenter,
              isTor: d.is_tor || d.tor,
              threatLevel: d.threat_level || d.score,
              country: d.country, isp: d.isp, asn: d.asn,
              notes: d.notes || d.description,
            },
            verified: true, depth: 0,
          });
        }
      } catch {}
      return { success: entities.length > 0, data: { ip: target }, entities };
    },
  },

  // ---- RAPIDAPI: Subdomain Finder (Glavier) — sous-domaines + IP + Cloudflare ----
  {
    id: "subdomain_finder_rapidapi", name: "Subdomain Finder (RapidAPI)", category: "domain", targetTypes: ["domain"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Subdomain enumeration for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const domain = target.replace(/^https?:\/\//, "").split("/")[0];
      const entities: DeepEntity[] = [];
      const apis = [
        { host: "subdomain-finder3.p.rapidapi.com",   path: `/v1/subdomain-finder?domain=${encodeURIComponent(domain)}` },
        { host: "subdomain-finder2.p.rapidapi.com",   path: `/subdomains?domain=${encodeURIComponent(domain)}` },
      ];
      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          const subs = (resp as any)?.subdomains || (resp as any)?.data || (Array.isArray(resp) ? resp : []);
          for (const s of (subs as any[]).slice(0, 50)) {
            const sub = typeof s === "string" ? s : s.subdomain || s.hostname || s.name;
            if (!sub) continue;
            const ip = typeof s === "object" ? s.ip || s.ipAddress : undefined;
            const cloudflare = typeof s === "object" ? s.cloudflare || s.is_cloudflare : undefined;
            entities.push({
              id: makeEntityId(), type: "domain", value: sub,
              source: "subdomain_finder_rapidapi", confidence: 88,
              metadata: { domain, ip, isCloudflare: cloudflare },
              verified: true, depth: 0,
            });
            if (ip) entities.push({ id: makeEntityId(), type: "ip", value: ip, source: "subdomain_finder_rapidapi", confidence: 85, metadata: { domain: sub, parentDomain: domain }, verified: true, depth: 0 });
          }
          if (entities.length > 0) break;
        } catch {}
      }
      return { success: entities.length > 0, data: { domain }, entities };
    },
  },

  // ---- RAPIDAPI: Email Social Media Checker — email → 48 réseaux + leaks ----
  {
    id: "email_social_checker_rapidapi", name: "Email Social Media Checker (RapidAPI)", category: "email", targetTypes: ["email"],
    priority: 1,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Checking ${target} across 48 social platforms...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://email-social-media-checker.p.rapidapi.com/check?email=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "email-social-media-checker.p.rapidapi.com" } }
        );
        const d = (resp as any)?.data || resp;
        // Social platforms
        const socials = d?.socials || d?.social_media || d?.platforms || {};
        const platformUrls: Record<string, string> = {
          instagram: `https://instagram.com/`, twitter: `https://twitter.com/`,
          facebook: `https://facebook.com/`, linkedin: `https://linkedin.com/in/`,
          github: `https://github.com/`, pinterest: `https://pinterest.com/`,
          snapchat: `https://snapchat.com/add/`, tiktok: `https://tiktok.com/@`,
          reddit: `https://reddit.com/user/`, twitch: `https://twitch.tv/`,
          spotify: `https://open.spotify.com/user/`, gravatar: `https://gravatar.com/`,
        };
        for (const [platform, info] of Object.entries(socials as Record<string, any>)) {
          const registered = info === true || info?.registered || info?.found || info?.exists;
          if (!registered) continue;
          const username = info?.username || info?.handle;
          const url = info?.url || info?.profile_url || (username ? (platformUrls[platform.toLowerCase()] || "") + username : null);
          const pic = info?.avatar || info?.profile_picture;
          if (url) {
            entities.push({
              id: makeEntityId(), type: "social_profile", value: url,
              source: "email_social_checker_rapidapi", confidence: 90,
              metadata: { platform, email: target, username, profilePicUrl: pic },
              verified: true, depth: 0,
            });
          }
          if (pic) entities.push({ id: makeEntityId(), type: "image", value: pic, source: "email_social_checker_rapidapi", confidence: 88, metadata: { platform, type: "profile_picture", email: target }, verified: true, depth: 0 });
        }
        // Data leaks
        const leaks = d?.leaks || d?.breaches || d?.data_breaches || [];
        if ((leaks as any[]).length > 0) {
          entities.push({
            id: makeEntityId(), type: "email", value: target,
            source: "email_social_checker_rapidapi", confidence: 92,
            metadata: { foundInLeaks: true, leakCount: (leaks as any[]).length, leaks: (leaks as any[]).slice(0, 10).map((l: any) => l.name || l.breach || l) },
            verified: true, depth: 0,
          });
        }
      } catch {}
      return { success: entities.length > 0, data: { email: target }, entities };
    },
  },

  // ---- RAPIDAPI: LeakCheck — email/username → data breach ----
  {
    id: "leakcheck_rapidapi", name: "LeakCheck (RapidAPI)", category: "email", targetTypes: ["email", "username"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `LeakCheck breach lookup for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      const isEmail = target.includes("@");
      try {
        const resp = await tryHttp(
          `https://leakcheck-api.p.rapidapi.com/check?value=${encodeURIComponent(target)}&type=${isEmail ? "email" : "username"}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "leakcheck-api.p.rapidapi.com" } }
        );
        const d = (resp as any)?.data || resp;
        const found = d?.found || d?.success || (Array.isArray(d?.result) && d.result.length > 0);
        if (found) {
          const sources = (d?.sources || d?.result || []).map((s: any) => s.name || s.source || s).filter(Boolean);
          const emails = (d?.result || []).flatMap((r: any) => r.email ? [r.email] : []);
          const phones = (d?.result || []).flatMap((r: any) => r.phone ? [r.phone] : []);
          const names = (d?.result || []).flatMap((r: any) => r.name || r.full_name ? [r.name || r.full_name] : []);
          entities.push({
            id: makeEntityId(), type: isEmail ? "email" : "username",
            value: target, source: "leakcheck_rapidapi", confidence: 93,
            metadata: { foundInLeaks: true, breachCount: d?.found || sources.length, sources: sources.slice(0, 15), hasPasswords: d?.has_password || false },
            verified: true, depth: 0,
          });
          for (const e of [...new Set(emails)] as string[]) {
            if (e !== target) entities.push({ id: makeEntityId(), type: "email", value: e, source: "leakcheck_rapidapi", confidence: 85, metadata: { from: "leak" }, verified: false, depth: 0 });
          }
          for (const p of [...new Set(phones)] as string[]) {
            entities.push({ id: makeEntityId(), type: "phone", value: p, source: "leakcheck_rapidapi", confidence: 80, metadata: { from: "leak" }, verified: false, depth: 0 });
          }
          for (const n of [...new Set(names)] as string[]) {
            if (n) entities.push({ id: makeEntityId(), type: "person", value: n, source: "leakcheck_rapidapi", confidence: 78, metadata: { from: "leak" }, verified: false, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- RAPIDAPI: BreachCheck — 65 milliards de passwords compromis ----
  {
    id: "breachcheck_rapidapi", name: "BreachCheck (65B records) (RapidAPI)", category: "email", targetTypes: ["email"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `BreachCheck (65B records) for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://breachcheck-api.p.rapidapi.com/check?email=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "breachcheck-api.p.rapidapi.com" } }
        );
        const d = (resp as any)?.data || resp;
        const found = d?.found || d?.compromised || (d?.count > 0);
        if (found) {
          const results = d?.results || d?.breaches || [];
          const sources = (results as any[]).map((r: any) => r.source || r.breach || r.name).filter(Boolean);
          entities.push({
            id: makeEntityId(), type: "email", value: target,
            source: "breachcheck_rapidapi", confidence: 94,
            metadata: {
              foundInBreaches: true, totalRecords: d?.count || (results as any[]).length,
              sources: sources.slice(0, 20),
              hasPasswordHash: (results as any[]).some((r: any) => r.password_hash || r.hash),
              hasPlaintext: (results as any[]).some((r: any) => r.password || r.plaintext),
              domains: [...new Set((results as any[]).map((r: any) => r.domain).filter(Boolean))].slice(0, 10),
            },
            verified: true, depth: 0,
          });
          // Extract additional info from breach records
          const phones = [...new Set((results as any[]).map((r: any) => r.phone).filter(Boolean))] as string[];
          const names = [...new Set((results as any[]).map((r: any) => r.name || r.full_name).filter(Boolean))] as string[];
          const usernames = [...new Set((results as any[]).map((r: any) => r.username || r.login).filter(Boolean))] as string[];
          for (const p of phones.slice(0, 3)) entities.push({ id: makeEntityId(), type: "phone", value: p, source: "breachcheck_rapidapi", confidence: 78, metadata: { from: "breach", email: target }, verified: false, depth: 0 });
          for (const n of names.slice(0, 3)) entities.push({ id: makeEntityId(), type: "person", value: n, source: "breachcheck_rapidapi", confidence: 76, metadata: { from: "breach", email: target }, verified: false, depth: 0 });
          for (const u of usernames.slice(0, 5)) entities.push({ id: makeEntityId(), type: "username", value: u, source: "breachcheck_rapidapi", confidence: 82, metadata: { from: "breach", email: target }, verified: false, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { email: target }, entities };
    },
  },

  // ---- RAPIDAPI: DeepScan (Data Menu) — due diligence / risk profiling ----
  {
    id: "deepscan_rapidapi", name: "DeepScan Risk Profile (RapidAPI)", category: "person", targetTypes: ["person", "domain", "email"],
    priority: 3,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `DeepScan risk profiling for "${target}"...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://deepscan-api.p.rapidapi.com/scan?query=${encodeURIComponent(target)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "deepscan-api.p.rapidapi.com" } }
        );
        const d = (resp as any)?.data || resp;
        if (d?.results || d?.risk_score !== undefined) {
          const results = d?.results || [];
          entities.push({
            id: makeEntityId(), type: "metadata", value: `DeepScan: ${target}`,
            source: "deepscan_rapidapi", confidence: 85,
            metadata: {
              riskScore: d?.risk_score, riskLevel: d?.risk_level,
              categories: d?.categories || d?.flags,
              sanctions: d?.sanctions, pep: d?.pep,
              adverseMedia: d?.adverse_media || d?.negative_news,
              legalIssues: d?.legal_issues || d?.court_records,
              criminalRecords: d?.criminal_records, regulatoryActions: d?.regulatory_actions,
              summary: d?.summary?.slice(0, 500),
            },
            verified: true, depth: 0,
          });
          for (const r of (results as any[]).slice(0, 10)) {
            const name = r.name || r.title;
            const url = r.url || r.link;
            const type = r.type || "result";
            if (name && url) {
              entities.push({ id: makeEntityId(), type: "url", value: url, source: "deepscan_rapidapi", confidence: 78, metadata: { title: name, resultType: type, query: target }, verified: true, depth: 0 });
            }
            if (r.email) entities.push({ id: makeEntityId(), type: "email", value: r.email, source: "deepscan_rapidapi", confidence: 80, metadata: { query: target }, verified: false, depth: 0 });
            if (r.phone) entities.push({ id: makeEntityId(), type: "phone", value: r.phone, source: "deepscan_rapidapi", confidence: 78, metadata: { query: target }, verified: false, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- RAPIDAPI: Virtual Phone Numbers Detector — détecter VoIP/jetable ----
  {
    id: "virtual_phone_detector_rapidapi", name: "Virtual Phone Detector (RapidAPI)", category: "phone", targetTypes: ["phone"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Virtual/VoIP phone check for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const phone = target.replace(/\D/g, "");
      const entities: DeepEntity[] = [];
      const apis = [
        { host: "virtual-phone-numbers-detector.p.rapidapi.com", path: `/check?phone=${phone}` },
        { host: "numcheckr.p.rapidapi.com",                      path: `/check?phone=${phone}` },
      ];
      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          const d = (resp as any)?.data || resp;
          if (d?.phone || d?.number || d?.valid !== undefined) {
            entities.push({
              id: makeEntityId(), type: "phone", value: target,
              source: "virtual_phone_detector_rapidapi", confidence: 90,
              metadata: {
                phone,
                isVirtual: d?.is_virtual || d?.virtual || d?.is_voip || d?.voip,
                isDisposable: d?.is_disposable || d?.disposable || d?.is_temporary,
                lineType: d?.line_type || d?.type || d?.carrier_type,
                carrier: d?.carrier || d?.operator,
                country: d?.country || d?.country_name,
                countryCode: d?.country_code,
                valid: d?.valid !== undefined ? d.valid : true,
                riskScore: d?.risk_score || d?.fraud_score,
              },
              verified: true, depth: 0,
            });
            break;
          }
        } catch {}
      }
      return { success: entities.length > 0, data: { phone }, entities };
    },
  },

  // ---- RAPIDAPI: Instagram Stable (RockSolid) — photo de profil HD + email ----
  {
    id: "instagram_stable_rapidapi", name: "Instagram Stable (RapidAPI)", category: "social", targetTypes: ["username"],
    priority: 1,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Instagram Stable API for @${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];

      // Try multiple stable Instagram APIs in order
      const apis = [
        { host: "instagram-scraper-stable.p.rapidapi.com",     path: `/user/info?username=${clean}` },
        { host: "instagram-scraper-20243.p.rapidapi.com",      path: `/userinfo?username=${clean}` },
        { host: "instagram-public-bulk-scraper.p.rapidapi.com", path: `/profile?username=${clean}` },
      ];

      let u: any = null;
      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          u = resp?.data?.user || resp?.user || resp?.userInfo || resp;
          if (u?.username || u?.pk) break;
          u = null;
        } catch {}
      }

      if (u) {
        const profilePicUrl = u.profile_pic_url_hd || u.profile_pic_url || u.hdProfilePicUrl;
        const bio = u.biography || u.bio || "";
        entities.push({
          id: makeEntityId(), type: "social_profile",
          value: `https://instagram.com/${clean}`,
          source: "instagram_stable_rapidapi", confidence: 95,
          metadata: {
            platform: "Instagram", username: clean,
            userId: u.pk || u.id,
            displayName: u.full_name || u.fullName,
            followers: u.follower_count || u.followersCount,
            following: u.following_count || u.followingCount,
            posts: u.media_count || u.postsCount,
            bio,
            verified: u.is_verified || u.isVerified,
            isPrivate: u.is_private || u.isPrivate,
            profilePicUrl,
            businessEmail: u.public_email || u.businessEmail || u.contact_phone_number,
            externalUrl: u.external_url || u.externalUrl,
            category: u.category || u.businessCategory,
          },
          verified: true, depth: 0,
        });
        if (profilePicUrl) {
          entities.push({ id: makeEntityId(), type: "image", value: profilePicUrl, source: "instagram_stable_rapidapi", confidence: 98, metadata: { username: clean, type: "profile_picture", platform: "Instagram" }, verified: true, depth: 0 });
        }
        const fullName = u.full_name || u.fullName;
        if (fullName) entities.push({ id: makeEntityId(), type: "person", value: fullName, source: "instagram_stable_rapidapi", confidence: 90, metadata: { username: clean }, verified: true, depth: 0 });
        const email = u.public_email || u.businessEmail;
        if (email) entities.push({ id: makeEntityId(), type: "email", value: email, source: "instagram_stable_rapidapi", confidence: 92, metadata: { username: clean, type: "business_email" }, verified: true, depth: 0 });
        const phone = u.public_phone_number || u.contact_phone_number;
        if (phone) entities.push({ id: makeEntityId(), type: "phone", value: phone, source: "instagram_stable_rapidapi", confidence: 90, metadata: { username: clean }, verified: true, depth: 0 });
        const extUrl = u.external_url || u.externalUrl;
        if (extUrl) entities.push({ id: makeEntityId(), type: "url", value: extUrl, source: "instagram_stable_rapidapi", confidence: 88, metadata: { username: clean, type: "bio_link" }, verified: true, depth: 0 });
        // Emails in bio
        for (const m of (bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [])) {
          entities.push({ id: makeEntityId(), type: "email", value: m, source: "instagram_stable_rapidapi", confidence: 85, metadata: { username: clean, type: "bio_email" }, verified: false, depth: 0 });
        }
      }
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Twitter/X Enriched (apibox) ----
  {
    id: "twitter_rapidapi", name: "Twitter/X API (RapidAPI)", category: "social", targetTypes: ["username"],
    priority: 1,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Twitter/X RapidAPI enrichment for @${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];

      const apis = [
        { host: "twitter-x-api.p.rapidapi.com",    path: `/user/details?username=${clean}` },
        { host: "twttrapi.p.rapidapi.com",          path: `/get-user?username=${clean}` },
        { host: "twitter135.p.rapidapi.com",        path: `/v1.1/users/show.json?screen_name=${clean}` },
      ];

      let u: any = null;
      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          u = resp?.data?.user || resp?.user || resp?.result?.data?.user?.result || resp;
          if (u?.screen_name || u?.username || u?.legacy?.screen_name) break;
          u = null;
        } catch {}
      }

      if (u) {
        const legacy = u.legacy || u;
        const name = legacy.name || legacy.full_name;
        const screen = legacy.screen_name || u.username || clean;
        const picUrl = legacy.profile_image_url_https?.replace("_normal", "") || legacy.profile_image_url_https;
        const bannerUrl = legacy.profile_banner_url;
        entities.push({
          id: makeEntityId(), type: "social_profile",
          value: `https://x.com/${screen}`,
          source: "twitter_rapidapi", confidence: 95,
          metadata: {
            platform: "Twitter/X", username: screen, displayName: name,
            followers: legacy.followers_count, following: legacy.friends_count,
            tweets: legacy.statuses_count, likes: legacy.favourites_count,
            bio: legacy.description, location: legacy.location,
            verified: legacy.verified || u.is_blue_verified,
            createdAt: legacy.created_at, profilePicUrl: picUrl, bannerUrl,
            url: legacy.entities?.url?.urls?.[0]?.expanded_url,
          },
          verified: true, depth: 0,
        });
        if (picUrl) entities.push({ id: makeEntityId(), type: "image", value: picUrl, source: "twitter_rapidapi", confidence: 97, metadata: { username: screen, type: "profile_picture", platform: "Twitter/X" }, verified: true, depth: 0 });
        if (bannerUrl) entities.push({ id: makeEntityId(), type: "image", value: bannerUrl, source: "twitter_rapidapi", confidence: 90, metadata: { username: screen, type: "banner", platform: "Twitter/X" }, verified: true, depth: 0 });
        if (name && name !== clean) entities.push({ id: makeEntityId(), type: "person", value: name, source: "twitter_rapidapi", confidence: 88, metadata: { username: screen }, verified: false, depth: 0 });
        if (legacy.location) entities.push({ id: makeEntityId(), type: "location", value: legacy.location, source: "twitter_rapidapi", confidence: 75, metadata: { username: screen }, verified: false, depth: 0 });
        const url = legacy.entities?.url?.urls?.[0]?.expanded_url;
        if (url) entities.push({ id: makeEntityId(), type: "url", value: url, source: "twitter_rapidapi", confidence: 88, metadata: { username: screen, type: "bio_link" }, verified: true, depth: 0 });
        for (const m of ((legacy.description || "").match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [])) {
          entities.push({ id: makeEntityId(), type: "email", value: m, source: "twitter_rapidapi", confidence: 82, metadata: { username: screen }, verified: false, depth: 0 });
        }
      }
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Facebook Scraper ----
  {
    id: "facebook_rapidapi", name: "Facebook Scraper (RapidAPI)", category: "social", targetTypes: ["username", "person"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Facebook profile search for "${target}"...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const entities: DeepEntity[] = [];

      const apis = [
        { host: "facebook-scraper3.p.rapidapi.com", path: `/search?q=${encodeURIComponent(target)}&type=users&limit=5` },
        { host: "facebook-pages-scraper.p.rapidapi.com", path: `/search?query=${encodeURIComponent(target)}&type=people` },
      ];

      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          const items = resp?.data || resp?.results || resp?.users || [];
          for (const item of (items as any[]).slice(0, 5)) {
            const url = item.url || item.link || item.profileUrl || (item.id ? `https://facebook.com/${item.id}` : null);
            const name = item.name || item.displayName || item.title;
            if (!url) continue;
            entities.push({
              id: makeEntityId(), type: "social_profile", value: url,
              source: "facebook_rapidapi", confidence: 78,
              metadata: { platform: "Facebook", name, location: item.location, about: item.about?.slice(0, 200), profilePicUrl: item.picture || item.profilePicUrl, followers: item.followers, likes: item.likes },
              verified: true, depth: 0,
            });
            if (name) entities.push({ id: makeEntityId(), type: "person", value: name, source: "facebook_rapidapi", confidence: 72, metadata: { fb: url }, verified: false, depth: 0 });
            if (item.picture || item.profilePicUrl) {
              entities.push({ id: makeEntityId(), type: "image", value: item.picture || item.profilePicUrl, source: "facebook_rapidapi", confidence: 85, metadata: { name, type: "profile_picture", platform: "Facebook" }, verified: true, depth: 0 });
            }
          }
          if (entities.length > 0) break;
        } catch {}
      }
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- RAPIDAPI: Snapchat (social miner) ----
  {
    id: "snapchat_rapidapi", name: "Snapchat API (RapidAPI)", category: "social", targetTypes: ["username"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Snapchat profile via RapidAPI for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];

      const apis = [
        { host: "snapchat.p.rapidapi.com",         path: `/user/${encodeURIComponent(clean)}` },
        { host: "snapchat-scraper.p.rapidapi.com", path: `/profile?username=${encodeURIComponent(clean)}` },
      ];

      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          const u = resp?.data || resp?.user || resp;
          if (u?.displayName || u?.username || u?.snapchatters?.[0]) {
            const d = u?.snapchatters?.[0] || u;
            const pic = d.bitmoji_selfie || d.profilePicUrl || d.snapcode_image_url;
            entities.push({
              id: makeEntityId(), type: "social_profile",
              value: `https://www.snapchat.com/add/${clean}`,
              source: "snapchat_rapidapi", confidence: 90,
              metadata: { platform: "Snapchat", username: clean, displayName: d.display_name || d.displayName, bio: d.bio || d.description, subscribers: d.subscriber_count, profilePicUrl: pic },
              verified: true, depth: 0,
            });
            if (pic) entities.push({ id: makeEntityId(), type: "image", value: pic, source: "snapchat_rapidapi", confidence: 92, metadata: { username: clean, type: "profile_picture", platform: "Snapchat" }, verified: true, depth: 0 });
            const name = d.display_name || d.displayName;
            if (name && name !== clean) entities.push({ id: makeEntityId(), type: "person", value: name, source: "snapchat_rapidapi", confidence: 82, metadata: { username: clean }, verified: false, depth: 0 });
            break;
          }
        } catch {}
      }
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Telegram Channel enriched ----
  {
    id: "telegram_rapidapi", name: "Telegram Channel (RapidAPI)", category: "social", targetTypes: ["username"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Telegram channel data via RapidAPI for @${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];

      const apis = [
        { host: "telegram-channel.p.rapidapi.com",           path: `/channel?channel=${encodeURIComponent(clean)}` },
        { host: "telegram-scraper-api.p.rapidapi.com",       path: `/user?username=${encodeURIComponent(clean)}` },
      ];

      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          const d = resp?.data || resp?.channel || resp?.user || resp;
          if (d?.title || d?.username || d?.name) {
            const pic = d.photo || d.profilePicUrl || d.image;
            entities.push({
              id: makeEntityId(), type: "social_profile",
              value: `https://t.me/${clean}`,
              source: "telegram_rapidapi", confidence: 93,
              metadata: { platform: "Telegram", username: clean, title: d.title || d.name, description: d.description || d.about, members: d.members_count || d.subscribers, type: d.type || d.chatType, profilePicUrl: pic, isVerified: d.verified },
              verified: true, depth: 0,
            });
            if (pic) entities.push({ id: makeEntityId(), type: "image", value: pic, source: "telegram_rapidapi", confidence: 90, metadata: { username: clean, type: "profile_picture", platform: "Telegram" }, verified: true, depth: 0 });
            const name = d.title || d.name;
            if (name && name !== clean) entities.push({ id: makeEntityId(), type: "person", value: name, source: "telegram_rapidapi", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
            // Recent messages for phone/email clues
            const msgs = d.messages || d.recent_messages || [];
            for (const msg of (msgs as any[]).slice(0, 20)) {
              const text = msg.text || msg.message || "";
              for (const phone of (text.match(/\+?[\d\s\-().]{7,15}/g) || [])) {
                if (phone.replace(/\D/g, "").length >= 7) entities.push({ id: makeEntityId(), type: "phone", value: phone.trim(), source: "telegram_rapidapi", confidence: 70, metadata: { username: clean, context: "channel_message" }, verified: false, depth: 0 });
              }
              for (const email of (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [])) {
                entities.push({ id: makeEntityId(), type: "email", value: email, source: "telegram_rapidapi", confidence: 72, metadata: { username: clean, context: "channel_message" }, verified: false, depth: 0 });
              }
            }
            break;
          }
        } catch {}
      }
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: WhatsApp Profile Check (by phone number) ----
  {
    id: "whatsapp_rapidapi", name: "WhatsApp Profile (RapidAPI)", category: "phone", targetTypes: ["phone"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `WhatsApp profile check for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const phone = target.replace(/\D/g, "");
      const entities: DeepEntity[] = [];

      const apis = [
        { host: "whatsapp-data1.p.rapidapi.com",   path: `/v1/WhatsApp/check_exists?phone=${phone}` },
        { host: "whatsapp.p.rapidapi.com",          path: `/exists?phone=${phone}` },
      ];

      for (const api of apis) {
        try {
          const resp = await tryHttp(`https://${api.host}${api.path}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host } });
          const d = resp?.data || resp;
          if (d?.exists || d?.registered || d?.is_registered) {
            const picUrl = d.profile_picture || d.avatar || d.photo;
            entities.push({
              id: makeEntityId(), type: "phone", value: target,
              source: "whatsapp_rapidapi", confidence: 92,
              metadata: { registeredOnWhatsApp: true, name: d.name || d.displayName, profilePicUrl: picUrl, about: d.about || d.status, lastSeen: d.last_seen },
              verified: true, depth: 0,
            });
            if (picUrl) entities.push({ id: makeEntityId(), type: "image", value: picUrl, source: "whatsapp_rapidapi", confidence: 90, metadata: { phone: target, type: "profile_picture", platform: "WhatsApp" }, verified: true, depth: 0 });
            if (d.name) entities.push({ id: makeEntityId(), type: "person", value: d.name, source: "whatsapp_rapidapi", confidence: 85, metadata: { phone: target }, verified: true, depth: 0 });
            break;
          }
        } catch {}
      }
      return { success: entities.length > 0, data: { phone: target }, entities };
    },
  },

  // ---- RAPIDAPI: Social Counters (cross-platform stats) ----
  {
    id: "social_counters_rapidapi", name: "Social Counters (RapidAPI)", category: "username", targetTypes: ["username"],
    priority: 3,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Social counters (cross-platform stats) for ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];

      const platforms = ["instagram", "tiktok", "youtube", "twitter", "telegram"];
      for (const platform of platforms) {
        try {
          const resp = await tryHttp(
            `https://social-counters7.p.rapidapi.com/${platform}?username=${encodeURIComponent(clean)}`,
            { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "social-counters7.p.rapidapi.com" } }
          );
          if (resp?.followers !== undefined || resp?.subscribers !== undefined) {
            const followers = resp.followers || resp.subscribers || resp.members;
            const pic = resp.profilePicUrl || resp.avatar;
            entities.push({
              id: makeEntityId(), type: "social_profile",
              value: resp.url || resp.profileUrl || `https://${platform}.com/${platform === "twitter" ? "" : platform === "youtube" ? "@" : platform === "tiktok" ? "@" : ""}${clean}`,
              source: "social_counters_rapidapi", confidence: 85,
              metadata: { platform, username: clean, followers, following: resp.following, posts: resp.posts || resp.videos, name: resp.name || resp.displayName, verified: resp.verified, profilePicUrl: pic },
              verified: true, depth: 0,
            });
            if (pic) entities.push({ id: makeEntityId(), type: "image", value: pic, source: "social_counters_rapidapi", confidence: 88, metadata: { username: clean, platform, type: "profile_picture" }, verified: true, depth: 0 });
          }
        } catch {}
      }
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- RAPIDAPI: Website Contacts Extractor (domain → emails/phones/socials) ----
  {
    id: "website_contacts_rapidapi", name: "Website Contacts Extractor", category: "domain", targetTypes: ["domain", "url"],
    priority: 2,
    isAvailable: async () => !!process.env.RAPIDAPI_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Extracting contacts from ${target}...` } });
      const key = process.env.RAPIDAPI_KEY!;
      const domain = target.replace(/^https?:\/\//, "").split("/")[0];
      const entities: DeepEntity[] = [];
      try {
        const resp = await tryHttp(
          `https://website-contacts-scraper.p.rapidapi.com/scrape-contacts?query=${encodeURIComponent(domain)}&match_email_domain=true`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "website-contacts-scraper.p.rapidapi.com" } }
        );
        const d = resp?.data?.[0] || resp?.results?.[0] || resp?.[0];
        if (d) {
          for (const email of (d.emails || []).slice(0, 10)) {
            const val = email.value || email;
            if (val) entities.push({ id: makeEntityId(), type: "email", value: val, source: "website_contacts_rapidapi", confidence: 88, metadata: { domain, type: email.type || "contact" }, verified: true, depth: 0 });
          }
          for (const phone of (d.phones || []).slice(0, 5)) {
            const val = phone.value || phone;
            if (val) entities.push({ id: makeEntityId(), type: "phone", value: val, source: "website_contacts_rapidapi", confidence: 82, metadata: { domain }, verified: true, depth: 0 });
          }
          const socials: Record<string, string> = d.social_links || d.socials || {};
          for (const [platform, url] of Object.entries(socials)) {
            if (url) entities.push({ id: makeEntityId(), type: "social_profile", value: String(url), source: "website_contacts_rapidapi", confidence: 85, metadata: { platform, domain }, verified: true, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { domain }, entities };
    },
  },

  // ---- MEDIA COLLECTOR — Aggregate all profile pictures from found entities ----
  {
    id: "media_collector", name: "Media Collector (Profile Pictures)", category: "media", targetTypes: ["username", "person", "email"],
    priority: 10,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Collecting profile pictures for "${target}"...` } });
      const entities: DeepEntity[] = [];
      const clean = target.replace(/^@/, "");

      // Direct sources that expose profile pic URLs without auth
      const sources = [
        // GitHub avatar via API
        { name: "GitHub", fn: async () => {
          const d = await tryHttp(`https://api.github.com/users/${encodeURIComponent(clean)}`);
          return d?.avatar_url ? { url: d.avatar_url, platform: "GitHub", name: d.name || clean } : null;
        }},
        // Gravatar MD5 hash
        { name: "Gravatar", fn: async () => {
          const crypto = await import("crypto");
          const hash = crypto.createHash("md5").update(clean.trim().toLowerCase()).digest("hex");
          const d = await tryHttp(`https://www.gravatar.com/${hash}.json`);
          const pic = d?.entry?.[0]?.thumbnailUrl;
          return pic ? { url: pic + "?s=400", platform: "Gravatar", name: d.entry[0].displayName } : null;
        }},
        // Keybase
        { name: "Keybase", fn: async () => {
          const d = await tryHttp(`https://keybase.io/_/api/1.0/user/lookup.json?username=${encodeURIComponent(clean)}`);
          const pic = d?.them?.[0]?.pictures?.primary?.url;
          return pic ? { url: pic, platform: "Keybase", name: d?.them?.[0]?.basics?.username } : null;
        }},
        // Telegram public pic
        { name: "Telegram", fn: async () => {
          const html = await axios.get(`https://t.me/${encodeURIComponent(clean)}`, { timeout: 5000, validateStatus: () => true } as any).then(r => r.data as string).catch(() => "");
          // Try multiple patterns for Telegram profile pictures
          const pic = typeof html === "string" ? (
            html.match(/tgme_page_photo_image[^>]*src="([^"]+)"/) ?.[1] ||
            html.match(/class="tgme_page_photo"[\s\S]*?<img[^>]*src="([^"]+)"/) ?.[1] ||
            html.match(/<meta property="og:image"[^>]*content="([^"]+)"/) ?.[1]
          ) : null;
          // Reject generic Telegram logo
          const isGeneric = pic && (pic.includes("t_logo") || pic.includes("telegram.org/img"));
          return (pic && !isGeneric) ? { url: pic, platform: "Telegram", name: clean } : null;
        }},
        // Reddit avatar
        { name: "Reddit", fn: async () => {
          const d = await tryHttp(`https://www.reddit.com/user/${encodeURIComponent(clean)}/about.json`, { headers: { "User-Agent": "OSINT-Tool/1.0" } });
          const pic = d?.data?.icon_img?.split("?")?.[0];
          return pic ? { url: pic, platform: "Reddit", name: d?.data?.name } : null;
        }},
        // Instagram public profile pic via web_profile_info
        { name: "Instagram", fn: async () => {
          const resp = await axios.get(
            `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`,
            { timeout: 8000, headers: { "User-Agent": "Instagram 219.0.0.12.117 Android", "X-IG-App-ID": "936619743392459" } }
          ).catch(() => null);
          const user = (resp?.data as any)?.data?.user;
          const pic = user?.profile_pic_url_hd || user?.profile_pic_url;
          return pic ? { url: pic, platform: "Instagram", name: user?.full_name || clean } : null;
        }},
        // Twitter/X public profile pic via nitter
        { name: "Twitter", fn: async () => {
          const html = await axios.get(`https://nitter.poast.org/${encodeURIComponent(clean)}`, { timeout: 6000, headers: { "User-Agent": "Mozilla/5.0" }, validateStatus: () => true } as any).then(r => r.data as string).catch(() => "");
          const pic = typeof html === "string" ? html.match(/class="avatar"[^>]*>\s*<img[^>]*src="([^"]+)"/)?.[1] : null;
          if (!pic) return null;
          const fullUrl = pic.startsWith("http") ? pic : `https://nitter.poast.org${pic}`;
          return { url: fullUrl, platform: "Twitter", name: clean };
        }},
      ];

      for (const src of sources) {
        try {
          const result = await src.fn();
          if (result?.url) {
            entities.push({
              id: makeEntityId(), type: "image", value: result.url,
              source: "media_collector", confidence: 88,
              metadata: { platform: result.platform, username: clean, type: "profile_picture", displayName: result.name },
              verified: true, depth: 0,
            });
          }
        } catch {}
      }

      emit({ type: "log", data: { message: `Media Collector: found ${entities.length} profile pictures` } });
      return { success: true, data: { username: clean, picturesFound: entities.length }, entities };
    },
  },

  // ---- INSTAGRAM: Near (géolocalisation zone de vie depuis posts) ----
  {
    id: "instagram_near", name: "Instagram Near (Geo)", category: "social", targetTypes: ["username"],
    priority: 6,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Geographic pattern analysis for @${target}...` } });
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];
      try {
        // Get posts with location via public GraphQL
        const resp = await axios.get(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`,
          { timeout: 10000, headers: { "User-Agent": "Instagram 219.0.0.12.117 Android", "X-IG-App-ID": "936619743392459" } }
        );
        const posts = (resp.data as any)?.data?.user?.edge_owner_to_timeline_media?.edges || [];
        const locations: { name: string; lat?: number; lng?: number; count: number }[] = [];

        for (const post of (posts as any[]).slice(0, 24)) {
          const loc = post.node?.location;
          if (loc?.name) {
            const existing = locations.find(l => l.name === loc.name);
            if (existing) existing.count++;
            else locations.push({ name: loc.name, lat: loc.lat, lng: loc.lng, count: 1 });
          }
        }

        // Sort by frequency — most visited = likely home area
        locations.sort((a, b) => b.count - a.count);
        for (const loc of locations.slice(0, 8)) {
          entities.push({
            id: makeEntityId(), type: "location", value: loc.name,
            source: "instagram_near", confidence: loc.count >= 3 ? 85 : loc.count >= 2 ? 75 : 65,
            metadata: { username: clean, visits: loc.count, lat: loc.lat, lng: loc.lng, likelyHome: loc.count === locations[0]?.count && loc.count >= 3 },
            verified: true, depth: 0,
          });
        }

        if (locations[0]?.count >= 3) {
          emit({ type: "log", data: { message: `Most visited location: ${locations[0].name} (${locations[0].count} posts)` } });
        }
      } catch {}
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- INSTAGRAM: Chronogram (patterns horaires & timezone depuis posts) ----
  {
    id: "instagram_chronogram", name: "Instagram Chronogram", category: "social", targetTypes: ["username"],
    priority: 7,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Temporal pattern analysis for @${target}...` } });
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];
      try {
        const resp = await axios.get(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`,
          { timeout: 10000, headers: { "User-Agent": "Instagram 219.0.0.12.117 Android", "X-IG-App-ID": "936619743392459" } }
        );
        const posts = (resp.data as any)?.data?.user?.edge_owner_to_timeline_media?.edges || [];
        const timestamps: Date[] = [];

        for (const post of (posts as any[]).slice(0, 30)) {
          const ts = post.node?.taken_at_timestamp;
          if (ts) timestamps.push(new Date(ts * 1000));
        }

        if (timestamps.length < 3) return { success: false, data: null, entities: [] };

        // Analyze posting hours
        const hours: number[] = timestamps.map(d => d.getUTCHours());
        const hourCounts: Record<number, number> = {};
        for (const h of hours) hourCounts[h] = (hourCounts[h] || 0) + 1;
        const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

        // Analyze posting days
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayCounts: Record<string, number> = {};
        for (const d of timestamps) { const day = days[d.getUTCDay()]; dayCounts[day] = (dayCounts[day] || 0) + 1; }
        const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

        // Guess timezone from posting patterns (peak activity usually 8am-11pm local)
        // If peak UTC hour is 10 → likely UTC+0, if peak is 8 → UTC+2, if peak is 3 → UTC+13 etc.
        const likelyUtcOffset = Math.round((12 - parseInt(peakHour[0])) / 2) * 2; // rough estimate
        const tzGuess = likelyUtcOffset >= 0 ? `UTC+${likelyUtcOffset}` : `UTC${likelyUtcOffset}`;

        // Date range
        const sorted = timestamps.sort((a, b) => a.getTime() - b.getTime());
        const firstPost = sorted[0].toISOString().split("T")[0];
        const lastPost = sorted[sorted.length - 1].toISOString().split("T")[0];

        // Average post frequency
        const daysDiff = (sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / (1000 * 60 * 60 * 24);
        const postsPerWeek = daysDiff > 0 ? ((timestamps.length / daysDiff) * 7).toFixed(1) : "N/A";

        const summary = `Active: ${peakDay?.[0] || "?"} peak | ${peakHour?.[0]}h UTC | ~${postsPerWeek} posts/week | Est. timezone: ${tzGuess}`;
        entities.push({
          id: makeEntityId(), type: "metadata", value: summary,
          source: "instagram_chronogram", confidence: 70,
          metadata: { username: clean, peakHourUTC: parseInt(peakHour?.[0] || "0"), peakDay: peakDay?.[0], postsPerWeek, estimatedTimezone: tzGuess, firstPost, lastPost, totalAnalyzed: timestamps.length },
          verified: false, depth: 0,
        });

        // If high confidence timezone → add as location hint
        if (timestamps.length >= 10) {
          entities.push({
            id: makeEntityId(), type: "location", value: `Estimated timezone: ${tzGuess} (peak activity at ${peakHour?.[0]}h UTC)`,
            source: "instagram_chronogram", confidence: 60,
            metadata: { username: clean, estimatedTimezone: tzGuess, method: "posting_pattern_analysis" },
            verified: false, depth: 0,
          });
        }
      } catch {}
      return { success: entities.length > 0, data: { username: clean }, entities };
    },
  },

  // ---- INSTAGRAM: Email checker (is email linked to IG account?) ----
  {
    id: "instagram_email_check", name: "Instagram Email Check", category: "social", targetTypes: ["email"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Checking if ${target} is linked to an Instagram account...` } });
      const entities: DeepEntity[] = [];
      try {
        // Use IG's signup check endpoint — returns if email is already taken
        const resp = await axios.post(
          "https://www.instagram.com/api/v1/accounts/check_email/",
          `email=${encodeURIComponent(target)}&_uuid=${Math.random().toString(36).slice(2)}`,
          {
            timeout: 8000,
            headers: {
              "User-Agent": "Instagram 219.0.0.12.117 Android",
              "X-IG-App-ID": "936619743392459",
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        const d = resp.data as any;
        // "available": false → email IS linked to an account
        // "suggestions": [...] → may reveal the linked username!
        if (d?.available === false || d?.existing_user) {
          entities.push({
            id: makeEntityId(), type: "social_profile",
            value: `https://instagram.com/ (account linked to ${target})`,
            source: "instagram_email_check", confidence: 90,
            metadata: { email: target, linkedToInstagram: true, suggestions: d?.suggestions || d?.username_suggestions },
            verified: true, depth: 0,
          });
          // If suggestions contain username
          const suggestions: string[] = d?.suggestions || d?.username_suggestions || [];
          for (const username of suggestions.slice(0, 3)) {
            entities.push({ id: makeEntityId(), type: "username", value: username, source: "instagram_email_check", confidence: 80, metadata: { email: target, platform: "Instagram", note: "Username suggestion from IG email check" }, verified: false, depth: 0 });
          }
        } else if (d?.available === true) {
          entities.push({
            id: makeEntityId(), type: "metadata",
            value: `${target} is NOT linked to any Instagram account`,
            source: "instagram_email_check", confidence: 85,
            metadata: { email: target, linkedToInstagram: false },
            verified: true, depth: 0,
          });
        }
      } catch {}

      // Fallback: try the phone/email password reset
      try {
        const resp2 = await axios.post(
          "https://www.instagram.com/api/v1/accounts/send_password_reset/",
          `email=${encodeURIComponent(target)}`,
          {
            timeout: 8000,
            headers: {
              "User-Agent": "Instagram 219.0.0.12.117 Android",
              "X-IG-App-ID": "936619743392459",
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        const d2 = resp2.data as any;
        if (d2?.status === "ok") {
          entities.push({
            id: makeEntityId(), type: "social_profile",
            value: `Instagram account confirmed for ${target}`,
            source: "instagram_email_check", confidence: 95,
            metadata: { email: target, linkedToInstagram: true, resetSent: true },
            verified: true, depth: 0,
          });
        }
      } catch {}

      return { success: true, data: { email: target }, entities };
    },
  },

  // ---- SOCIAL: TWITTER/X ----
  {
    id: "twitter_public", name: "Twitter/X Public", category: "social", targetTypes: ["username"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Fetching Twitter/X profile for @${target}...` } });
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];

      // Method 1: X Syndication API (no auth, public profiles)
      try {
        const syndResp = await axios.get(
          `https://syndication.twitter.com/srv/oembed/profile?url=https://twitter.com/${encodeURIComponent(clean)}&partner=&hide_thread=false`,
          { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
        );
        const syndData = syndResp.data as any;
        if (syndData?.author_name) {
          const fullName = syndData.author_name;
          entities.push({ id: makeEntityId(), type: "social_profile", value: `https://x.com/${clean}`, source: "twitter_public", confidence: 85, metadata: { platform: "Twitter/X", username: clean, fullName }, verified: true, depth: 0 });
          if (fullName && fullName !== clean) entities.push({ id: makeEntityId(), type: "person", value: fullName, source: "twitter_public", confidence: 75, metadata: { username: clean }, verified: false, depth: 0 });
        }
      } catch {}

      // Method 2: fxtwitter/fixupx API (free, no auth)
      if (entities.length === 0) {
        try {
          const fxResp = await axios.get(
            `https://api.fxtwitter.com/${encodeURIComponent(clean)}`,
            { timeout: 8000, headers: { "User-Agent": "OSINT-Master/4.0" } }
          );
          const u = (fxResp.data as any)?.user;
          if (u) {
            entities.push({ id: makeEntityId(), type: "social_profile", value: `https://x.com/${clean}`, source: "twitter_public", confidence: 88, metadata: { platform: "Twitter/X", username: clean, fullName: u.name, followers: u.followers, following: u.following, bio: u.description, verified: u.verified, created: u.created_at }, verified: true, depth: 0 });
            if (u.name && u.name !== clean) entities.push({ id: makeEntityId(), type: "person", value: u.name, source: "twitter_public", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
            if (u.description) {
              const bioEmails = u.description.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
              for (const email of bioEmails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "twitter_bio", confidence: 78, metadata: { username: clean }, verified: false, depth: 0 });
              const bioUrls = u.description.match(/https?:\/\/\S+/g) || [];
              for (const url of bioUrls) entities.push({ id: makeEntityId(), type: "url", value: url, source: "twitter_bio", confidence: 72, metadata: { username: clean }, verified: false, depth: 0 });
            }
            if (u.location) entities.push({ id: makeEntityId(), type: "location", value: u.location, source: "twitter_public", confidence: 70, metadata: { username: clean }, verified: false, depth: 0 });
            if (u.website) entities.push({ id: makeEntityId(), type: "url", value: u.website, source: "twitter_public", confidence: 80, metadata: { username: clean, type: "profile_website" }, verified: true, depth: 0 });
          }
        } catch {}
      }

      // Method 3: Nitter (updated instances 2025)
      if (entities.length === 0) {
        const nitterInstances = ["https://nitter.privacydev.net", "https://nitter.poast.org", "https://nitter.cz", "https://nitter.space"];
        for (const instance of nitterInstances) {
          try {
            const resp = await axios.get(`${instance}/${encodeURIComponent(clean)}`, {
              timeout: 6000,
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            });
            const html = resp.data as string;
            if (html.includes("timeline-item") || html.includes("profile-card")) {
              const fullName = html.match(/class="profile-card-fullname"[^>]*>([^<]+)/)?.[1]?.trim();
              const bio = html.match(/class="profile-bio"[^>]*>[\s\S]*?<p[^>]*>([^<]+)/)?.[1]?.trim();
              entities.push({ id: makeEntityId(), type: "social_profile", value: `https://x.com/${clean}`, source: "twitter_public", confidence: 80, metadata: { platform: "Twitter/X", username: clean, fullName, bio, nitterSource: instance }, verified: true, depth: 0 });
              if (fullName && fullName !== clean) entities.push({ id: makeEntityId(), type: "person", value: fullName, source: "twitter_public", confidence: 72, metadata: { username: clean }, verified: false, depth: 0 });
              break;
            }
          } catch {}
        }
      }

      return { success: true, data: { username: clean, found: entities.length > 0 }, entities };
    },
  },

  // ---- SOCIAL: REDDIT ----
  {
    id: "reddit_public", name: "Reddit Public API", category: "social", targetTypes: ["username"],
    priority: 4,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Reddit profile & history for u/${target}...` } });
      const clean = target.replace(/^u\//, "").replace(/^@/, "");
      const entities: DeepEntity[] = [];
      const RUA = `Mozilla/5.0 (compatible; OSINT-Bot/1.0; +https://osint-master.local)`;
      try {
        // Use reddit JSON API with proper browser-like headers
        const about = await tryHttp(`https://www.reddit.com/user/${encodeURIComponent(clean)}/about.json`, {
          headers: { "User-Agent": RUA, "Accept": "application/json" },
        });
        if (about?.data) {
          const d = about.data;
          const created = d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined;
          entities.push({ id: makeEntityId(), type: "social_profile", value: `https://reddit.com/user/${clean}`, source: "reddit_public", confidence: 90, metadata: { platform: "Reddit", username: clean, karma: d.total_karma, commentKarma: d.comment_karma, postKarma: d.link_karma, created, hasVerifiedEmail: d.has_verified_email, isPremium: d.is_gold, iconImg: d.icon_img }, verified: true, depth: 0 });

          // Submitted posts → subreddits + text hints
          const [posts, comments] = await Promise.allSettled([
            tryHttp(`https://www.reddit.com/user/${encodeURIComponent(clean)}/submitted.json?limit=50`, { headers: { "User-Agent": RUA } }),
            tryHttp(`https://www.reddit.com/user/${encodeURIComponent(clean)}/comments.json?limit=50`, { headers: { "User-Agent": RUA } }),
          ]);

          const allChildren: any[] = [];
          if (posts.status === "fulfilled" && posts.value?.data?.children) allChildren.push(...posts.value.data.children);
          if (comments.status === "fulfilled" && comments.value?.data?.children) allChildren.push(...comments.value.data.children);

          if (allChildren.length > 0) {
            const subreddits = [...new Set(allChildren.map((p: any) => p.data.subreddit).filter(Boolean))];
            if (subreddits.length > 0) {
              entities.push({ id: makeEntityId(), type: "metadata", value: `Subreddits: ${subreddits.slice(0, 15).join(", ")}`, source: "reddit_public", confidence: 75, metadata: { username: clean, type: "activity_subreddits", count: subreddits.length }, verified: true, depth: 0 });
            }
            // Scan text for emails
            const allText = allChildren.map((c: any) => (c.data.selftext || "") + " " + (c.data.body || "")).join(" ");
            const emails = [...new Set([...allText.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map(m => m[0]))].filter(e => !e.endsWith(".png") && !e.endsWith(".jpg"));
            for (const email of emails.slice(0, 5)) {
              entities.push({ id: makeEntityId(), type: "email", value: email, source: "reddit_posts", confidence: 70, metadata: { username: clean, type: "found_in_post" }, verified: false, depth: 0 });
            }
            // Location hints from flair or post titles
            const locationKeywords = allChildren.map((c: any) => c.data.link_flair_text || "").filter(Boolean);
            for (const loc of [...new Set(locationKeywords)].slice(0, 3)) {
              entities.push({ id: makeEntityId(), type: "location", value: loc, source: "reddit_flair", confidence: 55, metadata: { username: clean }, verified: false, depth: 0 });
            }
          }
        }
      } catch {}
      return { success: true, data: { username: clean, found: entities.length > 0 }, entities };
    },
  },

  // ---- GITHUB ----
  {
    id: "github_search", name: "GitHub Search", category: "social", targetTypes: ["username", "email", "person"],
    priority: 2,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `GitHub search for ${target}...` } });
      const token = process.env.GITHUB_TOKEN;
      const headers: any = { "User-Agent": "OSINT-Master/4.0", Accept: "application/vnd.github.v3+json" };
      if (token) headers["Authorization"] = `token ${token}`;
      const entities: DeepEntity[] = [];
      try {
        // Direct profile lookup first (exact username match)
        const directProfile = await tryHttp(`https://api.github.com/users/${encodeURIComponent(target)}`, { headers });

        // Search users if no direct match or target looks like a name/email  
        const searchItems: any[] = [];
        if (!directProfile || target.includes(" ") || target.includes("@")) {
          const userSearch = await tryHttp(`https://api.github.com/search/users?q=${encodeURIComponent(target)}&per_page=5`, { headers });
          if (userSearch?.items?.length) searchItems.push(...userSearch.items.slice(0, 3));
        }

        const itemsToFetch = directProfile ? [{ login: target }] : searchItems.slice(0, 3);
        if (itemsToFetch.length > 0) {
          for (const u of itemsToFetch) {
            const profile = directProfile && u.login === target ? directProfile : await tryHttp(`https://api.github.com/users/${u.login}`, { headers });
            if (profile) {
              entities.push({ id: makeEntityId(), type: "social_profile", value: `https://github.com/${u.login}`, source: "github_search", confidence: 80, metadata: { platform: "GitHub", username: u.login, name: profile.name, company: profile.company, location: profile.location, email: profile.email, blog: profile.blog, followers: profile.followers, publicRepos: profile.public_repos, bio: profile.bio }, verified: true, depth: 0 });
              if (profile.name) entities.push({ id: makeEntityId(), type: "person", value: profile.name, source: "github_search", confidence: 75, metadata: { username: u.login }, verified: false, depth: 0 });
              if (profile.email) entities.push({ id: makeEntityId(), type: "email", value: profile.email, source: "github_search", confidence: 85, metadata: { username: u.login }, verified: true, depth: 0 });
              if (profile.location) entities.push({ id: makeEntityId(), type: "location", value: profile.location, source: "github_search", confidence: 70, metadata: { username: u.login }, verified: false, depth: 0 });
              if (profile.blog && profile.blog.startsWith("http")) entities.push({ id: makeEntityId(), type: "url", value: profile.blog, source: "github_search", confidence: 75, metadata: { username: u.login }, verified: false, depth: 0 });
            }
          }
        }
        // Search commits for email (only with token)
        if (token) {
          const commits = await tryHttp(`https://api.github.com/search/commits?q=author:${encodeURIComponent(target)}&per_page=5`, { headers: { ...headers, Accept: "application/vnd.github.cloak-preview" } });
          if (commits?.items?.length) {
            for (const c of commits.items.slice(0, 5)) {
              const email = c.commit?.author?.email;
              if (email && !email.includes("noreply")) {
                entities.push({ id: makeEntityId(), type: "email", value: email, source: "github_commits", confidence: 80, metadata: { username: target, commitSha: c.sha?.slice(0, 8) }, verified: true, depth: 0 });
              }
            }
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- GRAVATAR ----
  {
    id: "gravatar", name: "Gravatar", category: "email", targetTypes: ["email"],
    priority: 2,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Gravatar lookup for ${target}...` } });
      const entities: DeepEntity[] = [];
      try {
        const crypto = await import("crypto");
        const hash = crypto.createHash("md5").update(target.trim().toLowerCase()).digest("hex");
        const data = await tryHttp(`https://www.gravatar.com/${hash}.json`);
        if (data?.entry?.[0]) {
          const e = data.entry[0];
          const displayName = e.displayName || e.preferredUsername;
          if (displayName) entities.push({ id: makeEntityId(), type: "person", value: displayName, source: "gravatar", confidence: 80, metadata: { email: target, gravatarId: hash }, verified: false, depth: 0 });
          if (e.profileUrl) entities.push({ id: makeEntityId(), type: "url", value: e.profileUrl, source: "gravatar", confidence: 75, metadata: { email: target }, verified: true, depth: 0 });
          if (e.aboutMe) entities.push({ id: makeEntityId(), type: "metadata", value: e.aboutMe, source: "gravatar", confidence: 70, metadata: { email: target, type: "bio" }, verified: false, depth: 0 });
          for (const acc of (e.accounts || []).slice(0, 10)) {
            if (acc.url) entities.push({ id: makeEntityId(), type: "social_profile", value: acc.url, source: "gravatar", confidence: 75, metadata: { platform: acc.shortname, email: target }, verified: true, depth: 0 });
          }
          for (const url of (e.urls || []).slice(0, 5)) {
            entities.push({ id: makeEntityId(), type: "url", value: url.value, source: "gravatar", confidence: 70, metadata: { email: target, title: url.title }, verified: false, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { email: target }, entities };
    },
  },

  // ---- CRT.SH (Certificate Transparency) ----
  {
    id: "crtsh", name: "crt.sh (SSL Certs)", category: "domain", targetTypes: ["domain", "email"],
    priority: 2,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Certificate transparency search for ${target}...` } });
      const entities: DeepEntity[] = [];
      try {
        const q = target.includes("@") ? target : `%.${target}`;
        const data = await tryHttp(`https://crt.sh/?q=${encodeURIComponent(q)}&output=json`);
        if (Array.isArray(data)) {
          const domains = [...new Set((data as any[]).map((c: any) => c.name_value).join("\n").split("\n").map((d: string) => d.trim().replace(/^\*\./, "")).filter((d: string) => d && !d.includes("*")))];
          const emails = [...new Set((data as any[]).filter((c: any) => c.issuer_ca_id).map((c: any) => {
            const m = c.issuer_name?.match(/emailAddress=([^\s,]+)/);
            return m?.[1];
          }).filter(Boolean))];
          for (const domain of domains.slice(0, 30)) {
            entities.push({ id: makeEntityId(), type: "domain", value: domain, source: "crtsh", confidence: 85, metadata: { parent: target, type: "subdomain_from_cert" }, verified: true, depth: 0 });
          }
          for (const email of emails.slice(0, 10)) {
            entities.push({ id: makeEntityId(), type: "email", value: email as string, source: "crtsh", confidence: 70, metadata: { domain: target, type: "cert_email" }, verified: false, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- DNS NATIVE ----
  {
    id: "dns_lookup", name: "DNS Lookup", category: "domain", targetTypes: ["domain"],
    priority: 1,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `DNS records lookup for ${target}...` } });
      const entities: DeepEntity[] = [];
      try {
        const dns = await import("dns/promises");
        const results = await Promise.allSettled([
          dns.resolve4(target).then(r => ({ type: "A", records: r })),
          dns.resolve6(target).then(r => ({ type: "AAAA", records: r })),
          dns.resolveMx(target).then(r => ({ type: "MX", records: r.map((m: any) => m.exchange) })),
          dns.resolveTxt(target).then(r => ({ type: "TXT", records: r.map((t: string[]) => t.join("")) })),
          dns.resolveNs(target).then(r => ({ type: "NS", records: r })),
          dns.resolveCname(target).then(r => ({ type: "CNAME", records: r })).catch(() => ({ type: "CNAME", records: [] })),
        ]);
        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          const { type, records } = r.value as any;
          for (const rec of (records as string[]).slice(0, 10)) {
            if (!rec) continue;
            if (type === "A" || type === "AAAA") entities.push({ id: makeEntityId(), type: "ip", value: rec, source: "dns_lookup", confidence: 95, metadata: { domain: target, recordType: type }, verified: true, depth: 0 });
            else if (type === "MX") entities.push({ id: makeEntityId(), type: "domain", value: rec, source: "dns_lookup", confidence: 90, metadata: { domain: target, recordType: "MX" }, verified: true, depth: 0 });
            else if (type === "NS") entities.push({ id: makeEntityId(), type: "domain", value: rec, source: "dns_lookup", confidence: 90, metadata: { domain: target, recordType: "NS" }, verified: true, depth: 0 });
            else if (type === "CNAME" && rec) entities.push({ id: makeEntityId(), type: "domain", value: rec, source: "dns_lookup", confidence: 85, metadata: { domain: target, recordType: "CNAME" }, verified: true, depth: 0 });
            else if (type === "TXT") {
              // SPF/DKIM/DMARC records reveal email providers
              if (rec.includes("v=spf1") || rec.includes("include:") || rec.includes("google") || rec.includes("microsoft")) {
                entities.push({ id: makeEntityId(), type: "service", value: rec.slice(0, 100), source: "dns_lookup", confidence: 80, metadata: { domain: target, recordType: "TXT_SPF" }, verified: true, depth: 0 });
              }
            }
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { domain: target }, entities };
    },
  },

  // ---- VIRUSTOTAL ----
  {
    id: "virustotal", name: "VirusTotal", category: "ip", targetTypes: ["ip", "domain", "url"],
    priority: 3,
    isAvailable: async () => !!process.env.VIRUSTOTAL_API_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `VirusTotal analysis for ${target}...` } });
      const key = process.env.VIRUSTOTAL_API_KEY;
      const entities: DeepEntity[] = [];
      try {
        const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(target);
        const isURL = target.startsWith("http");
        let endpoint = "";
        if (isIP) endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${target}`;
        else if (isURL) {
          const b64 = Buffer.from(target).toString("base64").replace(/=/g, "");
          endpoint = `https://www.virustotal.com/api/v3/urls/${b64}`;
        } else endpoint = `https://www.virustotal.com/api/v3/domains/${target}`;
        const data = await tryHttp(endpoint, { headers: { "x-apikey": key! } });
        if (data?.data?.attributes) {
          const a = data.data.attributes;
          const malicious = a.last_analysis_stats?.malicious || 0;
          const suspicious = a.last_analysis_stats?.suspicious || 0;
          entities.push({ id: makeEntityId(), type: "metadata", value: `VirusTotal: ${malicious} malicious, ${suspicious} suspicious`, source: "virustotal", confidence: 90, metadata: { target, malicious, suspicious, reputation: a.reputation, categories: a.categories, asOwner: a.as_owner, country: a.country }, verified: true, depth: 0 });
          if (a.whois_map?.registrant_email) entities.push({ id: makeEntityId(), type: "email", value: a.whois_map.registrant_email, source: "virustotal", confidence: 75, metadata: { domain: target }, verified: false, depth: 0 });
          for (const ns of (a.nameservers || []).slice(0, 5)) {
            entities.push({ id: makeEntityId(), type: "domain", value: ns, source: "virustotal", confidence: 85, metadata: { parent: target, type: "nameserver" }, verified: true, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- HUNTER.IO ----
  {
    id: "hunter_io", name: "Hunter.io", category: "domain", targetTypes: ["domain", "person"],
    priority: 3,
    isAvailable: async () => !!process.env.HUNTER_API_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Hunter.io email discovery for ${target}...` } });
      const key = process.env.HUNTER_API_KEY;
      const entities: DeepEntity[] = [];
      try {
        const isDomain = !target.includes(" ");
        const url = isDomain
          ? `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(target)}&api_key=${key}&limit=20`
          : `https://api.hunter.io/v2/email-finder?full_name=${encodeURIComponent(target)}&api_key=${key}`;
        const data = await tryHttp(url);
        if (data?.data) {
          const d = data.data;
          const emails: any[] = d.emails || (d.email ? [{ value: d.email, first_name: d.first_name, last_name: d.last_name, position: d.position }] : []);
          for (const em of emails.slice(0, 20)) {
            entities.push({ id: makeEntityId(), type: "email", value: em.value, source: "hunter_io", confidence: 85, metadata: { domain: target, firstName: em.first_name, lastName: em.last_name, position: em.position, confidence: em.confidence }, verified: em.verification?.status === "valid", depth: 0 });
            if (em.first_name && em.last_name) entities.push({ id: makeEntityId(), type: "person", value: `${em.first_name} ${em.last_name}`, source: "hunter_io", confidence: 75, metadata: { email: em.value, position: em.position }, verified: false, depth: 0 });
          }
          if (d.organization) entities.push({ id: makeEntityId(), type: "organization", value: d.organization, source: "hunter_io", confidence: 80, metadata: { domain: target }, verified: true, depth: 0 });
          if (d.twitter) entities.push({ id: makeEntityId(), type: "social_profile", value: `https://twitter.com/${d.twitter}`, source: "hunter_io", confidence: 75, metadata: { platform: "Twitter", domain: target }, verified: false, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- CENSYS ----
  {
    id: "censys", name: "Censys", category: "ip", targetTypes: ["ip", "domain"],
    priority: 4,
    isAvailable: async () => !!(process.env.CENSYS_API_ID && process.env.CENSYS_API_SECRET),
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Censys scan for ${target}...` } });
      const id = process.env.CENSYS_API_ID;
      const secret = process.env.CENSYS_API_SECRET;
      const entities: DeepEntity[] = [];
      try {
        const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(target);
        const endpoint = isIP
          ? `https://search.censys.io/api/v2/hosts/${target}`
          : `https://search.censys.io/api/v2/certificates/search?q=parsed.names:${encodeURIComponent(target)}&per_page=20`;
        const data = await tryHttp(endpoint, { auth: { username: id!, password: secret! } });
        if (data?.result) {
          const r = data.result;
          if (r.services) {
            for (const svc of (r.services as any[]).slice(0, 15)) {
              entities.push({ id: makeEntityId(), type: "service", value: `${svc.port}/${svc.transport_protocol} ${svc.service_name || ""}`, source: "censys", confidence: 90, metadata: { ip: target, port: svc.port, banner: svc.banner?.slice(0, 200) }, verified: true, depth: 0 });
            }
          }
          if (r.autonomous_system) entities.push({ id: makeEntityId(), type: "organization", value: r.autonomous_system.name || r.autonomous_system.asn, source: "censys", confidence: 85, metadata: { ip: target, asn: r.autonomous_system.asn }, verified: true, depth: 0 });
          if (r.location?.country) entities.push({ id: makeEntityId(), type: "location", value: `${r.location.city || ""}, ${r.location.country}`.trim().replace(/^,\s*/, ""), source: "censys", confidence: 80, metadata: { ip: target }, verified: true, depth: 0 });
        }
        // Certificate results
        if (data?.results) {
          const domains = [...new Set((data.results as any[]).flatMap((c: any) => c.parsed?.names || []))];
          for (const domain of (domains as string[]).slice(0, 20)) {
            entities.push({ id: makeEntityId(), type: "domain", value: domain, source: "censys", confidence: 80, metadata: { parent: target, type: "from_cert" }, verified: true, depth: 0 });
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- WAYBACK MACHINE ----
  {
    id: "wayback", name: "Wayback Machine", category: "domain", targetTypes: ["domain", "url"],
    priority: 6,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Wayback Machine archive for ${target}...` } });
      const entities: DeepEntity[] = [];
      try {
        const domain = target.replace(/^https?:\/\//, "").split("/")[0];
        const data = await tryHttp(`https://archive.org/wayback/available?url=${encodeURIComponent(domain)}`);
        if (data?.archived_snapshots?.closest?.url) {
          entities.push({ id: makeEntityId(), type: "url", value: data.archived_snapshots.closest.url, source: "wayback", confidence: 75, metadata: { domain, timestamp: data.archived_snapshots.closest.timestamp, status: data.archived_snapshots.closest.status }, verified: true, depth: 0 });
        }
        // Get CDX API for full list
        const cdx = await tryHttp(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&limit=20&fl=original,timestamp,statuscode&filter=statuscode:200`);
        if (Array.isArray(cdx) && cdx.length > 1) {
          const urls = [...new Set((cdx as string[][]).slice(1).map(r => r[0]))];
          for (const url of urls.slice(0, 10)) {
            const path = url.replace(/^https?:\/\/[^/]+/, "");
            if (path && path !== "/" && !path.includes("?")) {
              entities.push({ id: makeEntityId(), type: "url", value: url, source: "wayback", confidence: 65, metadata: { domain, type: "archived_path" }, verified: false, depth: 0 });
            }
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { target }, entities };
    },
  },

  // ---- BING SEARCH (replaces DuckDuckGo) ----
  {
    id: "bing_search", name: "Bing Search", category: "search", targetTypes: ["username", "email", "phone", "person", "domain", "ip"],
    priority: 9,
    isAvailable: async () => !!process.env.BING_SEARCH_KEY,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Bing search intelligence for ${target}...` } });
      const key = process.env.BING_SEARCH_KEY;
      const entities: DeepEntity[] = [];
      const queries = [`"${target}"`, `"${target}" site:instagram.com OR site:facebook.com OR site:linkedin.com`, `"${target}" site:github.com OR site:twitter.com`];
      try {
        for (const q of queries) {
          const data = await tryHttp(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(q)}&count=10`, {
            headers: { "Ocp-Apim-Subscription-Key": key! },
            timeout: 8000,
          });
          if (data?.webPages?.value) {
            for (const result of (data.webPages.value as any[]).slice(0, 5)) {
              entities.push({ id: makeEntityId(), type: "url", value: result.url, source: "bing_search", confidence: 65, metadata: { query: q, title: result.name, snippet: result.snippet?.slice(0, 200) }, verified: false, depth: 0 });
            }
          }
        }
      } catch {}
      return { success: entities.length > 0, data: { target, results: entities.length }, entities };
    },
  },

  // ---- PAGES BLANCHES / ANNUAIRES FR ----
  {
    id: "annuaires_fr", name: "Annuaires FR", category: "phone", targetTypes: ["phone", "person"],
    priority: 4,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `French directory search for ${target}...` } });
      const entities: DeepEntity[] = [];
      const isPhone = /\+?[\d\s()-]{7,}/.test(target);
      try {
        // Pages Blanches
        const query = isPhone ? target.replace(/[\s()+\-]/g, "") : encodeURIComponent(target);
        const url = isPhone
          ? `https://www.pagesjaunes.fr/annuaireinverse/recherche?quoiqui=${query}`
          : `https://www.pagesblanches.fr/annuaire/recherche?quoiqui=${encodeURIComponent(target)}&ou=france`;
        const resp = await axios.get(url, {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        });
        const html = resp.data as string;
        // Extract names
        const nameMatches = [...html.matchAll(/class="[^"]*denomination[^"]*"[^>]*>([^<]+)/g)];
        for (const m of nameMatches.slice(0, 5)) {
          const name = m[1].trim();
          if (name.length > 2 && !name.includes("<")) entities.push({ id: makeEntityId(), type: "person", value: name, source: "annuaires_fr", confidence: 75, metadata: { query: target, source: "pagesblanches" }, verified: false, depth: 0 });
        }
        // Extract addresses
        const addrMatches = [...html.matchAll(/class="[^"]*address[^"]*"[^>]*>([^<]+)/g)];
        for (const m of addrMatches.slice(0, 5)) {
          const addr = m[1].trim();
          if (addr.length > 5 && /\d/.test(addr)) entities.push({ id: makeEntityId(), type: "location", value: addr, source: "annuaires_fr", confidence: 70, metadata: { query: target }, verified: false, depth: 0 });
        }
        // Extract phones
        const phoneMatches = [...html.matchAll(/\b0[1-9](?:[\s.-]?\d{2}){4}\b/g)];
        for (const m of [...new Set(phoneMatches.map(m => m[0]))].slice(0, 3)) {
          entities.push({ id: makeEntityId(), type: "phone", value: m, source: "annuaires_fr", confidence: 80, metadata: { query: target }, verified: false, depth: 0 });
        }
      } catch {}
      return { success: entities.length > 0, data: { target, found: entities.length }, entities };
    },
  },

  // ---- SNAPCHAT ----
  {
    id: "snapchat_public", name: "Snapchat Public", category: "social", targetTypes: ["username"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Snapchat profile lookup for ${target}...` } });
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];
      try {
        // Snapchat public profile endpoint
        const resp = await axios.get(
          `https://www.snapchat.com/add/${encodeURIComponent(clean)}`,
          { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1" } }
        );
        const html = resp.data as string;
        // Snapchat returns 200 even for non-existent users but differs in content
        if (html.includes("snapchat.com/add/") && !html.includes("Sorry, this page") && !html.includes("doesn't exist")) {
          // Extract display name from og:title or page title
          const displayName = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]?.replace(/ \(@.*?\)/, "").trim()
            || html.match(/<title>([^<]+)<\/title>/i)?.[1]?.split("|")[0]?.trim();
          const bio = html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1]?.trim();
          const profileImg = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];

          entities.push({
            id: makeEntityId(), type: "social_profile",
            value: `https://www.snapchat.com/add/${clean}`,
            source: "snapchat_public", confidence: 85,
            metadata: { platform: "Snapchat", username: clean, displayName, bio, profileImg },
            verified: true, depth: 0,
          });
          if (displayName && displayName !== clean && !displayName.includes("Snapchat")) {
            entities.push({ id: makeEntityId(), type: "person", value: displayName, source: "snapchat_public", confidence: 78, metadata: { username: clean }, verified: false, depth: 0 });
          }
          if (bio) {
            const bioEmails = bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
            for (const email of bioEmails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "snapchat_bio", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
          }
        }

        // Also try Snapchat user/story API
        const apiResp = await axios.get(
          `https://story.snapchat.com/@${encodeURIComponent(clean)}`,
          { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
        ).catch(() => null);
        if (apiResp?.data) {
          const d = apiResp.data as any;
          const snapUser = d?.userProfile?.userInfo;
          if (snapUser && !entities.length) {
            entities.push({ id: makeEntityId(), type: "social_profile", value: `https://www.snapchat.com/add/${clean}`, source: "snapchat_public", confidence: 88, metadata: { platform: "Snapchat", username: clean, displayName: snapUser.displayName, subscribers: snapUser.subscriberCount, bio: snapUser.bio }, verified: true, depth: 0 });
            if (snapUser.displayName) entities.push({ id: makeEntityId(), type: "person", value: snapUser.displayName, source: "snapchat_public", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
          }
        }
      } catch {}
      return { success: true, data: { username: clean, found: entities.length > 0 }, entities };
    },
  },

  // ---- TELEGRAM ----
  {
    id: "telegram_lookup", name: "Telegram Lookup", category: "social", targetTypes: ["username", "phone"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Telegram profile lookup for ${target}...` } });
      const clean = target.replace(/^@/, "").replace(/^\+/, "");
      const isPhone = /^\d{8,15}$/.test(clean);
      const entities: DeepEntity[] = [];

      if (!isPhone) {
        // Method 1: t.me public profile page scraping
        try {
          const resp = await axios.get(
            `https://t.me/${encodeURIComponent(clean)}`,
            { timeout: 10000, headers: { "User-Agent": "TelegramBot (https://core.telegram.org/bots, 1.0)" } }
          );
          const html = resp.data as string;
          if (html.includes("tgme_page") && !html.includes("tgme_page_not_found")) {
            const displayName = html.match(/class="tgme_page_title"[^>]*>\s*<span[^>]*>([^<]+)/)?.[1]?.trim()
              || html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]?.trim();
            const bio = html.match(/class="tgme_page_description"[^>]*>([^<]+)/)?.[1]?.trim()
              || html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1]?.trim();
            const photo = html.match(/class="tgme_page_photo_image"[^>]*src="([^"]+)"/)?.[1];
            const isChannel = html.includes("tgme_page_extra") && html.includes("subscriber");
            const subscribers = html.match(/([\d\s,]+)\s*subscriber/i)?.[1]?.replace(/[\s,]/g, "");
            const members = html.match(/([\d\s,]+)\s*member/i)?.[1]?.replace(/[\s,]/g, "");

            entities.push({
              id: makeEntityId(), type: "social_profile",
              value: `https://t.me/${clean}`,
              source: "telegram_lookup", confidence: 90,
              metadata: { platform: "Telegram", username: clean, displayName, bio, photo, isChannel, subscribers, members },
              verified: true, depth: 0,
            });
            if (displayName && displayName !== clean) {
              entities.push({ id: makeEntityId(), type: "person", value: displayName, source: "telegram_lookup", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
            }
            if (bio) {
              const bioEmails = bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
              for (const e of bioEmails) entities.push({ id: makeEntityId(), type: "email", value: e, source: "telegram_bio", confidence: 82, metadata: { username: clean }, verified: false, depth: 0 });
              const bioPhones = bio.match(/\+?\d[\d\s\-().]{7,14}\d/g) || [];
              for (const p of bioPhones) entities.push({ id: makeEntityId(), type: "phone", value: p, source: "telegram_bio", confidence: 78, metadata: { username: clean }, verified: false, depth: 0 });
            }
          }
        } catch {}

        // Method 2: TGStat for public channel/group stats
        try {
          const tgstat = await axios.get(
            `https://tgstat.ru/channel/@${encodeURIComponent(clean)}`,
            { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } }
          );
          const html = tgstat.data as string;
          const members = html.match(/([\\d\\s,]+)\s*(?:subscribers|подписчиков)/i)?.[1]?.replace(/[\s,]/g, "");
          if (members && !entities.find(e => e.value.includes(clean))) {
            entities.push({ id: makeEntityId(), type: "social_profile", value: `https://t.me/${clean}`, source: "telegram_tgstat", confidence: 80, metadata: { platform: "Telegram", username: clean, members }, verified: true, depth: 0 });
          }
        } catch {}
      }

      return { success: true, data: { username: clean, isPhone, found: entities.length > 0 }, entities };
    },
  },

  // ---- TIKTOK ----
  {
    id: "tiktok_public", name: "TikTok Public", category: "social", targetTypes: ["username"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `TikTok profile lookup for @${target}...` } });
      const clean = target.replace(/^@/, "");
      const entities: DeepEntity[] = [];
      try {
        // TikTok public profile page
        const resp = await axios.get(
          `https://www.tiktok.com/@${encodeURIComponent(clean)}`,
          {
            timeout: 12000,
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
              "Accept-Language": "fr-FR,fr;q=0.9",
              "Accept": "text/html,application/xhtml+xml",
            },
          }
        );
        const html = resp.data as string;

        // Extract from Next.js __NEXT_DATA__ JSON blob
        const nextData = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/)?.[1];
        if (nextData) {
          try {
            const nd = JSON.parse(nextData);
            const user = nd?.props?.pageProps?.userInfo?.user || nd?.props?.pageProps?.itemList?.[0]?.author;
            const stats = nd?.props?.pageProps?.userInfo?.stats;
            if (user) {
              const nickname = user.nickname || user.uniqueId;
              const bio = user.signature;
              entities.push({
                id: makeEntityId(), type: "social_profile",
                value: `https://www.tiktok.com/@${clean}`,
                source: "tiktok_public", confidence: 90,
                metadata: { platform: "TikTok", username: clean, displayName: nickname, bio, followers: stats?.followerCount, following: stats?.followingCount, likes: stats?.heartCount, videos: stats?.videoCount, verified: user.verified, region: user.region },
                verified: true, depth: 0,
              });
              if (nickname && nickname !== clean) entities.push({ id: makeEntityId(), type: "person", value: nickname, source: "tiktok_public", confidence: 80, metadata: { username: clean }, verified: false, depth: 0 });
              if (bio) {
                const bioEmails = bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
                for (const email of bioEmails) entities.push({ id: makeEntityId(), type: "email", value: email, source: "tiktok_bio", confidence: 82, metadata: { username: clean }, verified: false, depth: 0 });
                const bioUrls = bio.match(/https?:\/\/\S+/g) || [];
                for (const url of bioUrls) entities.push({ id: makeEntityId(), type: "url", value: url, source: "tiktok_bio", confidence: 78, metadata: { username: clean }, verified: false, depth: 0 });
              }
              if (user.bioLink?.link) entities.push({ id: makeEntityId(), type: "url", value: user.bioLink.link, source: "tiktok_public", confidence: 85, metadata: { username: clean, type: "bio_link" }, verified: true, depth: 0 });
            }
          } catch {}
        }

        // Fallback: og meta tags
        if (entities.length === 0) {
          const displayName = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]?.replace(/ \(@.*?\)/, "").trim();
          const bio = html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1]?.trim();
          if (displayName && !displayName.includes("TikTok")) {
            entities.push({ id: makeEntityId(), type: "social_profile", value: `https://www.tiktok.com/@${clean}`, source: "tiktok_public", confidence: 78, metadata: { platform: "TikTok", username: clean, displayName, bio }, verified: true, depth: 0 });
            if (displayName !== clean) entities.push({ id: makeEntityId(), type: "person", value: displayName, source: "tiktok_public", confidence: 70, metadata: { username: clean }, verified: false, depth: 0 });
          }
        }
      } catch {}
      return { success: true, data: { username: clean, found: entities.length > 0 }, entities };
    },
  },

  // ---- SKYPE / MICROSOFT ----
  {
    id: "skype_lookup", name: "Skype Lookup", category: "social", targetTypes: ["username", "email", "phone"],
    priority: 4,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Skype/Microsoft lookup for ${target}...` } });
      const entities: DeepEntity[] = [];
      try {
        // Skype public directory search
        const searchResp = await axios.get(
          `https://api.skype.com/users/${encodeURIComponent(target.replace(/^@/, ""))}`,
          {
            timeout: 8000,
            headers: {
              "User-Agent": "Mozilla/5.0",
              "X-Skype-Client": "1415/8.111.0.214",
            },
          }
        );
        const d = searchResp.data as any;
        if (d?.username || d?.displayName) {
          entities.push({ id: makeEntityId(), type: "social_profile", value: `skype:${d.username || target}`, source: "skype_lookup", confidence: 85, metadata: { platform: "Skype", username: d.username, displayName: d.displayName, avatarUrl: d.avatarUrl, mood: d.mood, country: d.country, city: d.city }, verified: true, depth: 0 });
          if (d.displayName) entities.push({ id: makeEntityId(), type: "person", value: d.displayName, source: "skype_lookup", confidence: 80, metadata: { username: d.username }, verified: false, depth: 0 });
          if (d.city || d.country) entities.push({ id: makeEntityId(), type: "location", value: [d.city, d.country].filter(Boolean).join(", "), source: "skype_lookup", confidence: 75, metadata: { username: d.username }, verified: true, depth: 0 });
        }
      } catch {}

      // Fallback: Skype web search
      try {
        const webResp = await axios.get(
          `https://www.skype.com/en/search/?q=${encodeURIComponent(target)}`,
          { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const html = webResp.data as string;
        const usernames = [...html.matchAll(/data-username="([^"]+)"/g)].map(m => m[1]);
        const names = [...html.matchAll(/data-name="([^"]+)"/g)].map(m => m[1]);
        for (let i = 0; i < Math.min(usernames.length, 3); i++) {
          if (!entities.find(e => e.value.includes(usernames[i]))) {
            entities.push({ id: makeEntityId(), type: "social_profile", value: `skype:${usernames[i]}`, source: "skype_lookup", confidence: 72, metadata: { platform: "Skype", username: usernames[i], name: names[i] }, verified: false, depth: 0 });
            if (names[i]) entities.push({ id: makeEntityId(), type: "person", value: names[i], source: "skype_lookup", confidence: 65, metadata: { username: usernames[i] }, verified: false, depth: 0 });
          }
        }
      } catch {}

      return { success: true, data: { target, found: entities.length > 0 }, entities };
    },
  },

  // ---- PASTEBIN / PASTE LEAK SEARCH ----
  {
    id: "paste_search", name: "Paste Search (Leaks)", category: "search", targetTypes: ["email", "username", "phone", "person"],
    priority: 5,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Searching paste sites for "${target}"...` } });
      const entities: DeepEntity[] = [];
      const seen = new Set<string>();

      // psbdmp.ws — indexes Pastebin public pastes
      try {
        const resp = await axios.get(
          `https://psbdmp.ws/api/v3/search/${encodeURIComponent(target)}`,
          { timeout: 10000, headers: { "User-Agent": "OSINT-Master/4.0" } }
        );
        const results = (resp.data as any)?.data || [];
        for (const paste of results.slice(0, 10)) {
          const url = `https://pastebin.com/${paste.id}`;
          if (!seen.has(url)) {
            seen.add(url);
            entities.push({ id: makeEntityId(), type: "url", value: url, source: "paste_search", confidence: 80, metadata: { pasteId: paste.id, title: paste.tags, size: paste.size, date: paste.time, query: target }, verified: true, depth: 0 });
          }
        }
      } catch {}

      // Pastebin-scraper via intelligence X (no key needed for basic)
      try {
        const ixResp = await axios.post(
          "https://2.intelx.io/phonebook/search",
          { term: target, maxresults: 20, media: 0, target: 0 },
          { timeout: 10000, headers: { "User-Agent": "OSINT-Master/4.0", "Content-Type": "application/json" } }
        );
        const id = (ixResp.data as any)?.id;
        if (id) {
          await new Promise(r => setTimeout(r, 1500));
          const results = await tryHttp(`https://2.intelx.io/phonebook/search/result?id=${id}&limit=20`, {
            headers: { "User-Agent": "OSINT-Master/4.0" },
          });
          for (const r of (results?.selectors || []).slice(0, 20)) {
            if (r.value && !seen.has(r.value)) {
              seen.add(r.value);
              const type = r.value.includes("@") ? "email" : r.value.match(/^\+?\d{8,}$/) ? "phone" : "url";
              entities.push({ id: makeEntityId(), type, value: r.value, source: "paste_search_ix", confidence: 75, metadata: { query: target, bucket: r.bucket }, verified: false, depth: 0 });
            }
          }
        }
      } catch {}

      // LeakCheck free API
      try {
        if (target.includes("@")) {
          const lcResp = await axios.get(
            `https://leakcheck.io/api/public?check=${encodeURIComponent(target)}`,
            { timeout: 8000, headers: { "User-Agent": "OSINT-Master/4.0" } }
          );
          const d = lcResp.data as any;
          if (d?.found > 0) {
            entities.push({ id: makeEntityId(), type: "metadata", value: `Found in ${d.found} data breach(es): ${(d.sources || []).slice(0, 5).join(", ")}`, source: "paste_search", confidence: 85, metadata: { email: target, found: d.found, sources: d.sources }, verified: true, depth: 0 });
          }
        }
      } catch {}

      return { success: entities.length > 0, data: { target, found: entities.length }, entities };
    },
  },

  // ---- PERSON NAME SEARCH (Pipl-style, no API) ----
  {
    id: "person_search", name: "Person Name Search", category: "person", targetTypes: ["person"],
    priority: 2,
    isAvailable: async () => true,
    execute: async (target, emit) => {
      emit({ type: "log", data: { message: `Person name search for "${target}"...` } });
      const entities: DeepEntity[] = [];
      const nameParts = target.trim().split(/\s+/);
      if (nameParts.length < 2) return { success: false, data: null, entities: [] };
      const [first, ...rest] = nameParts;
      const last = rest.join(" ");

      // LinkedIn public search (no auth)
      try {
        const liResp = await axios.get(
          `https://www.linkedin.com/pub/dir?firstName=${encodeURIComponent(first)}&lastName=${encodeURIComponent(last)}&trk=public_profile_nav-header-copy`,
          { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "fr-FR,fr;q=0.9" } }
        );
        const html = liResp.data as string;
        const profiles = [...html.matchAll(/href="(https:\/\/www\.linkedin\.com\/in\/[^"?]+)"/g)].map(m => m[1]);
        const names = [...html.matchAll(/class="name"[^>]*>([^<]+)/g)].map(m => m[1].trim());
        const locations = [...html.matchAll(/class="location"[^>]*>([^<]+)/g)].map(m => m[1].trim());
        for (let i = 0; i < Math.min(profiles.length, 5); i++) {
          const url = profiles[i];
          if (!entities.find(e => e.value === url)) {
            entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "person_search_linkedin", confidence: 75, metadata: { name: names[i] || target, location: locations[i], platform: "LinkedIn" }, verified: false, depth: 0 });
          }
        }
      } catch {}

      // Bing People search
      try {
        const bingResp = await axios.get(
          `https://www.bing.com/search?q=${encodeURIComponent(`"${target}"`)}&mkt=fr-FR`,
          { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "fr-FR,fr;q=0.9" } }
        );
        const html = bingResp.data as string;
        // Extract result URLs
        const urls = [...html.matchAll(/href="(https?:\/\/(?:linkedin|facebook|twitter|instagram|youtube)[^"]+)"/g)].map(m => m[1]).filter((u, i, a) => a.indexOf(u) === i);
        for (const url of urls.slice(0, 8)) {
          if (!entities.find(e => e.value === url)) {
            const platform = url.includes("linkedin") ? "LinkedIn" : url.includes("facebook") ? "Facebook" : url.includes("twitter") || url.includes("x.com") ? "Twitter/X" : url.includes("instagram") ? "Instagram" : "Social";
            entities.push({ id: makeEntityId(), type: "social_profile", value: url, source: "person_search", confidence: 68, metadata: { name: target, platform }, verified: false, depth: 0 });
          }
        }
      } catch {}

      // Spokeo/BeenVerified public records (FR: societe.com for businesses)
      try {
        const socResp = await axios.get(
          `https://www.societe.com/cgi-bin/search?champs=${encodeURIComponent(target)}&type_recherche=0`,
          { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "fr-FR,fr;q=0.9" } }
        );
        const html = socResp.data as string;
        const companies = [...html.matchAll(/class="[^"]*company[^"]*"[^>]*>([^<]+)/g)].map(m => m[1].trim());
        const sirets = [...html.matchAll(/\b\d{14}\b/g)].map(m => m[0]);
        if (companies.length > 0) {
          entities.push({ id: makeEntityId(), type: "organization", value: companies[0], source: "person_search_fr", confidence: 70, metadata: { person: target, siret: sirets[0], source: "societe.com" }, verified: false, depth: 0 });
        }
      } catch {}

      return { success: entities.length > 0, data: { name: target, found: entities.length }, entities };
    },
  },
  
  // ---- ADVANCED MODULES (Phase 1) ----
  ...NewModules,
];

// ============================================================================
// DEEP INVESTIGATION ENGINE
// ============================================================================
export class DeepInvestigationEngine extends EventEmitter {
  private modules: Map<string, OSINTModule> = new Map();
  private availableModules: Set<string> = new Set();
  private initialized = false;

  constructor() {
    super();
    for (const mod of MODULES) {
      this.modules.set(mod.id, mod);
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    logger.info("[DEEP] Initializing OSINT modules...");
    const checks = await Promise.allSettled(
      MODULES.map(async m => {
        const avail = await m.isAvailable();
        return { id: m.id, available: avail };
      })
    );
    for (const c of checks) {
      if (c.status === "fulfilled" && c.value.available) {
        this.availableModules.add(c.value.id);
      }
    }
    this.initialized = true;
    logger.info(`[DEEP] ${this.availableModules.size}/${MODULES.length} modules available: ${[...this.availableModules].join(", ")}`);
  }

  getAvailableModules(): { id: string; name: string; category: string; targetTypes: string[]; available: boolean }[] {
    return MODULES.map(m => ({
      id: m.id, name: m.name, category: m.category, targetTypes: m.targetTypes,
      available: this.availableModules.has(m.id),
    }));
  }

  getModulesForTarget(targetType: string): OSINTModule[] {
    return MODULES
      .filter(m => m.targetTypes.includes(targetType) || m.targetTypes.includes("any"))
      .filter(m => this.availableModules.has(m.id))
      .sort((a, b) => a.priority - b.priority);
  }

  // ---- MAIN: Stream-based investigation ----
  async *investigate(
    target: string,
    config: Partial<InvestigationConfig> = {}
  ): AsyncGenerator<StreamEvent> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const targetType = cfg.targetType || detectTargetType(target);
    const sessionId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();
    const allEntities: Map<string, DeepEntity> = new Map();
    const allCorrelations: DeepCorrelation[] = [];
    const processedTargets = new Set<string>();

    yield this.event("phase", { phase: "init", sessionId, target, targetType, message: `Investigation started: ${targetType} "${target}"` });

    // Get modules
    let modules = this.getModulesForTarget(targetType);
    if (cfg.selectedModules.length > 0) {
      modules = modules.filter(m => cfg.selectedModules.includes(m.id));
    }
    if (modules.length === 0) {
      // Fallback: use google dorking and whatsmyname for any target
      modules = [MODULES.find(m => m.id === "googledork")!, MODULES.find(m => m.id === "whatsmyname")!].filter(Boolean);
    }

    yield this.event("phase", { phase: "modules_selected", modules: modules.map(m => ({ id: m.id, name: m.name, category: m.category })), total: modules.length, message: `${modules.length} modules selected for ${targetType}` });

    // Add primary target as entity
    const primaryEntity: DeepEntity = {
      id: makeEntityId(), type: targetType, value: target,
      source: "user_input", confidence: 100, metadata: {},
      verified: true, depth: 0,
    };
    allEntities.set(this.entityKey(primaryEntity), primaryEntity);
    yield this.event("entity_found", { entity: primaryEntity });

    // Execute modules
    yield* this.executeModules(modules, target, targetType, 0, cfg, allEntities, allCorrelations, processedTargets, startTime);

    // Web search phase
    if (cfg.enableWebSearch) {
      yield this.event("phase", { phase: "web_search", message: "Launching web search & Google dorking..." });
      const webModule = MODULES.find(m => m.id === "googledork");
      if (webModule) {
        yield* this.runModule(webModule, target, 0, allEntities, cfg);
      }
    }

    // Recursive phase - investigate high-confidence discovered entities
    if (cfg.enableRecursive && cfg.maxDepth > 0) {
      yield this.event("phase", { phase: "recursive", message: "Launching recursive analysis on discovered entities..." });
      yield* this.recursiveInvestigate(allEntities, allCorrelations, processedTargets, target, 1, cfg, startTime);
    }

    // Correlation phase
    yield this.event("phase", { phase: "correlation", message: "Building entity correlations..." });
    this.buildCorrelations(allEntities, allCorrelations);
    for (const corr of allCorrelations) {
      yield this.event("correlation", { correlation: corr });
    }

    // AI Analysis phase
    if (cfg.enableAI) {
      yield this.event("phase", { phase: "ai_analysis", message: "AI analyzing results..." });
      try {
        const analysis = await this.aiAnalyze(target, targetType, allEntities, allCorrelations);
        yield this.event("ai_analysis", { analysis });
      } catch (e: any) {
        yield this.event("log", { message: `AI analysis failed: ${e.message}`, level: "warn" });
      }
    }

    // Complete
    const duration = Date.now() - startTime;
    yield this.event("complete", {
      sessionId,
      target,
      targetType,
      duration,
      stats: {
        entities: allEntities.size,
        correlations: allCorrelations.length,
        modulesRun: modules.length,
      },
      entities: [...allEntities.values()],
      correlations: allCorrelations,
      message: `Investigation complete: ${allEntities.size} entities, ${allCorrelations.length} correlations in ${(duration / 1000).toFixed(1)}s`,
    });
  }

  private async *executeModules(
    modules: OSINTModule[], target: string, targetType: string, depth: number,
    cfg: InvestigationConfig, allEntities: Map<string, DeepEntity>,
    allCorrelations: DeepCorrelation[], processedTargets: Set<string>, startTime: number
  ): AsyncGenerator<StreamEvent> {
    processedTargets.add(target);
    const total = modules.length;

    for (let i = 0; i < total; i++) {
      if (Date.now() - startTime > cfg.timeoutMs) {
        yield this.event("log", { message: "Global timeout reached, stopping.", level: "warn" });
        break;
      }
      if (allEntities.size >= cfg.maxEntities) {
        yield this.event("log", { message: `Max entities (${cfg.maxEntities}) reached, stopping.`, level: "warn" });
        break;
      }
      yield* this.runModule(modules[i], target, depth, allEntities, cfg, i, total);
    }
  }

  private async *runModule(
    mod: OSINTModule, target: string, depth: number,
    allEntities: Map<string, DeepEntity>, cfg: InvestigationConfig,
    index?: number, total?: number
  ): AsyncGenerator<StreamEvent> {
    const progress = index !== undefined && total ? Math.round(((index) / total) * 100) : undefined;
    yield this.event("tool_start", { toolId: mod.id, name: mod.name, category: mod.category, target, depth, progress });

    // Timeouts by tool category
    const SLOW_CLI = new Set(["sherlock", "maigret"]); // can take 5-8 min
    const FAST_CLI = new Set(["socialscan", "holehe", "h8mail", "phoneinfoga", "ghunt", "theharvester", "subfinder", "httpx", "dnsx", "nmap", "exiftool", "instaloader"]);
    const TOOL_TIMEOUT = SLOW_CLI.has(mod.id) ? 500000 : FAST_CLI.has(mod.id) ? 90000 : 20000;
    const start = Date.now();

    // Use a flag-based approach so the timed-out tool doesn't block
    let timedOut = false;
    let result: { success: boolean; data: any; entities: DeepEntity[] } | null = null;

    try {
      const toolPromise = mod.execute(target, () => {});
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => { timedOut = true; resolve(null); }, TOOL_TIMEOUT);
      });

      const race = await Promise.race([
        toolPromise.then(r => ({ type: "result" as const, r })),
        timeoutPromise.then(() => ({ type: "timeout" as const, r: null })),
      ]);

      if (race.type === "result" && race.r) {
        result = race.r;
      }
    } catch (e: any) {
      // Tool execution error
      yield this.event("tool_done", {
        toolId: mod.id, name: mod.name, success: false, duration: Date.now() - start,
        error: e.message, entitiesFound: 0,
        progress: index !== undefined && total ? Math.round(((index + 1) / total) * 100) : undefined,
      });
      return;
    }

    const duration = Date.now() - start;

    if (timedOut || !result) {
      yield this.event("tool_done", {
        toolId: mod.id, name: mod.name, success: false, duration,
        error: `Timed out after ${(TOOL_TIMEOUT / 1000).toFixed(0)}s`, entitiesFound: 0,
        progress: index !== undefined && total ? Math.round(((index + 1) / total) * 100) : undefined,
      });
      return;
    }

    yield this.event("tool_done", {
      toolId: mod.id, name: mod.name, success: result.success, duration,
      data: result.data, entitiesFound: result.entities.length,
      progress: index !== undefined && total ? Math.round(((index + 1) / total) * 100) : undefined,
    });

    // Emit each discovered entity
    for (const entity of result.entities) {
      entity.depth = depth;
      const key = this.entityKey(entity);
      if (!allEntities.has(key)) {
        allEntities.set(key, entity);
        yield this.event("entity_found", { entity, fromTool: mod.id });
      }
    }
  }

  private async *recursiveInvestigate(
    allEntities: Map<string, DeepEntity>, allCorrelations: DeepCorrelation[],
    processedTargets: Set<string>, originalTarget: string,
    currentDepth: number, cfg: InvestigationConfig, startTime: number
  ): AsyncGenerator<StreamEvent> {
    if (currentDepth > cfg.maxDepth) return;
    if (Date.now() - startTime > cfg.timeoutMs) return;

    // Find high-confidence entities that can be re-investigated
    const toInvestigate = [...allEntities.values()]
      .filter(e => e.confidence >= cfg.recursiveThreshold)
      .filter(e => !processedTargets.has(e.value))
      .filter(e => ["email", "username", "domain", "ip", "phone", "person"].includes(e.type))
      .filter(e => e.value !== originalTarget)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Max 5 recursive targets per depth level

    for (const entity of toInvestigate) {
      if (Date.now() - startTime > cfg.timeoutMs) break;
      if (allEntities.size >= cfg.maxEntities) break;

      yield this.event("recursive_launch", {
        entity,
        depth: currentDepth,
        message: `Recursive investigation depth ${currentDepth}: ${entity.type} "${entity.value}"`,
      });

      processedTargets.add(entity.value);
      const modules = this.getModulesForTarget(entity.type).slice(0, 3); // Limit modules for recursive

      yield* this.executeModules(
        modules, entity.value, entity.type, currentDepth,
        cfg, allEntities, allCorrelations, processedTargets, startTime
      );
    }

    // Go deeper if needed
    if (currentDepth < cfg.maxDepth) {
      yield* this.recursiveInvestigate(allEntities, allCorrelations, processedTargets, originalTarget, currentDepth + 1, cfg, startTime);
    }
  }

  private buildCorrelations(entities: Map<string, DeepEntity>, correlations: DeepCorrelation[]): void {
    const entityList = [...entities.values()];
    const seen = new Set<string>();
    
    // Track co-discovered counts per source to prevent overwhelming correlations
    const coDiscoveredCount: Record<string, number> = {};
    const MAX_CO_DISCOVERED_PER_SOURCE = 3;

    for (let i = 0; i < entityList.length; i++) {
      for (let j = i + 1; j < entityList.length; j++) {
        const a = entityList[i], b = entityList[j];
        const key = `${a.id}:${b.id}`;
        if (seen.has(key)) continue;

        let corrType = "";
        let strength = 0;
        let evidence = "";

        // Same source → co-discovery (LIMITED to prevent overwhelming results)
        if (a.source === b.source && a.source !== "user_input") {
          const source = a.source;
          coDiscoveredCount[source] = (coDiscoveredCount[source] || 0) + 1;
          
          // Only create co_discovered correlation if under limit
          if (coDiscoveredCount[source] <= MAX_CO_DISCOVERED_PER_SOURCE) {
            corrType = "co_discovered";
            strength = 60;
            evidence = `Both found by ${source}`;
          }
        }
        // Parent-child relationship
        if (a.metadata?.email === b.value || a.metadata?.domain === b.value || a.metadata?.ip === b.value || a.metadata?.phone === b.value) {
          corrType = "derived_from";
          strength = 85;
          evidence = `${a.type} derived from ${b.type}`;
        }
        if (b.metadata?.email === a.value || b.metadata?.domain === a.value || b.metadata?.ip === a.value || b.metadata?.phone === a.value) {
          corrType = "derived_from";
          strength = 85;
          evidence = `${b.type} derived from ${a.type}`;
        }
        // Same domain emails
        if (a.type === "email" && b.type === "email") {
          const da = a.value.split("@")[1], db = b.value.split("@")[1];
          if (da === db) { corrType = "same_domain"; strength = 70; evidence = `Same email domain: ${da}`; }
        }
        // IP and domain on same infrastructure
        if ((a.type === "ip" && b.type === "domain") || (a.type === "domain" && b.type === "ip")) {
          if (a.metadata?.domain === b.value || b.metadata?.domain === a.value || a.metadata?.ip === b.value || b.metadata?.ip === a.value) {
            corrType = "infrastructure";
            strength = 80;
            evidence = "Shared infrastructure";
          }
        }

        if (corrType && strength > 0) {
          seen.add(key);
          correlations.push({
            id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            from: a.id, to: b.id, type: corrType, strength, evidence, source: "correlation_engine",
          });
        }
      }
    }
  }

  private async aiAnalyze(target: string, targetType: string, entities: Map<string, DeepEntity>, correlations: DeepCorrelation[]): Promise<string> {
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const model = process.env.DEFAULT_MODEL || "dolphin-mistral:latest";

    const entitySummary = [...entities.values()].slice(0, 50).map(e =>
      `- [${e.type}] ${e.value} (source: ${e.source}, confidence: ${e.confidence}%, depth: ${e.depth})`
    ).join("\n");

    const corrSummary = correlations.slice(0, 20).map(c => {
      const from = [...entities.values()].find(e => e.id === c.from);
      const to = [...entities.values()].find(e => e.id === c.to);
      return `- ${from?.value || c.from} <-> ${to?.value || c.to} (${c.type}, strength: ${c.strength}%)`;
    }).join("\n");

    const prompt = `Analyse OSINT complète pour la cible "${target}" (type: ${targetType}).

ENTITÉS DÉCOUVERTES (${entities.size}):
${entitySummary}

CORRÉLATIONS (${correlations.length}):
${corrSummary}

Fournis une analyse détaillée:
1. Résumé exécutif
2. Profil de la cible
3. Points d'intérêt critiques
4. Connexions et relations importantes
5. Recommandations pour investigation approfondie
6. Évaluation des risques`;

    const resp = await axios.post(`${ollamaUrl}/api/generate`, {
      model, prompt, stream: false,
      options: { temperature: 0.3, num_predict: 2000 },
    }, { timeout: 120000 });

    return (resp.data as any)?.response || "Analysis unavailable";
  }

  private entityKey(e: DeepEntity): string {
    return `${e.type}:${String(e.value ?? "").toLowerCase().trim()}`;
  }

  private event(type: string, data: any): StreamEvent {
    return {
      type: type as StreamEvent["type"],
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      data,
    };
  }
}

export const deepEngine = new DeepInvestigationEngine();
