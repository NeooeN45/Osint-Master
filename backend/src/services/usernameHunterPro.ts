// ============================================================================
// USERNAME HUNTER PRO — Traque username cross-platform ultra-agressive
// Blackbird · Marple · Nexfil · Userrecon · Snoop · UserFinder · Tookie
// + Username variations generator enhanced
// + Meta-aggregator cross-validation
// ============================================================================

import axios from "axios";
import https from "https";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

async function tryExec(cmd: string, ms = 30000) {
  try { return await execAsync(cmd, { timeout: ms, maxBuffer: 20 * 1024 * 1024 }); }
  catch (e: any) { return e.stdout ? { stdout: e.stdout, stderr: e.stderr || "" } : null; }
}

async function http(url: string, opts: any = {}): Promise<any> {
  try {
    const { headers, timeout, ...rest } = opts;
    const r = await axios.get(url, {
      timeout: timeout || 12000,
      headers: { "User-Agent": UA, ...headers },
      httpsAgent, maxRedirects: 3,
      validateStatus: () => true,
      ...rest,
    });
    if (r.status >= 200 && r.status < 400) return r.data;
    return null;
  } catch { return null; }
}

function eid() { return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function ent(type: string, value: string, source: string, confidence: number, metadata: any = {}) {
  return { id: eid(), type, value, source, confidence, metadata, verified: confidence >= 80, depth: 0 };
}

// ============================================================================
// 1. BLACKBIRD — fork moderne de Sherlock (Python, 580+ sites)
// ============================================================================
export const BlackbirdModule = {
  id: "blackbird",
  name: "Blackbird (580+ sites, moderne)",
  category: "username",
  targetTypes: ["username"],
  priority: 3,
  isAvailable: async () => {
    const r = await tryExec("blackbird --help 2>&1");
    return !!(r?.stdout?.includes("blackbird") || r?.stdout?.includes("username"));
  },
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    emit({ type: "log", data: { message: `Blackbird: scanning 580+ sites for ${clean}` } });
    const entities: any[] = [];

    const env = process.platform === "win32"
      ? `set PYTHONHTTPSVERIFY=0 && set PYTHONWARNINGS=ignore && `
      : `PYTHONHTTPSVERIFY=0 `;

    const r = await tryExec(`${env}blackbird -u ${clean} --no-color --output json 2>&1`, 120000);
    if (!r) return { success: false, data: null, entities: [] };

    const output = r.stdout + (r.stderr || "");
    // Parse output
    const foundLines = [...output.matchAll(/\[\+\]\s*([\w.-]+?)\s*[:-]\s*(https?:\/\/[^\s]+)/g)];
    for (const m of foundLines) {
      const platform = m[1].trim();
      const url = m[2].trim();
      entities.push(ent("social_profile", url, "blackbird", 80, {
        platform, username: clean, verified: true, source: "blackbird",
      }));
    }

    // Tenter de parser JSON (si blackbird a produit un output.json)
    try {
      const fs = await import("fs");
      const jsonFile = `./blackbird_${clean}.json`;
      if (fs.existsSync(jsonFile)) {
        const data = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
        for (const entry of data || []) {
          if (entry.found && entry.url) {
            entities.push(ent("social_profile", entry.url, "blackbird", 85, {
              platform: entry.site, username: clean, response: entry.status,
            }));
          }
        }
        try { fs.unlinkSync(jsonFile); } catch {}
      }
    } catch {}

    emit({ type: "log", data: { message: `Blackbird: ${entities.length} profils trouvés` } });
    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 2. MARPLE — moteur recherche username avec score
// ============================================================================
export const MarpleModule = {
  id: "marple",
  name: "Marple (username search engine)",
  category: "username",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => {
    const r = await tryExec("marple --help 2>&1");
    return !!(r?.stdout?.includes("marple") || r?.stdout?.includes("username"));
  },
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    emit({ type: "log", data: { message: `Marple: search engine discovery for ${clean}` } });
    const entities: any[] = [];

    const env = process.platform === "win32"
      ? `set PYTHONHTTPSVERIFY=0 && set PYTHONWARNINGS=ignore && `
      : `PYTHONHTTPSVERIFY=0 `;

    const r = await tryExec(`${env}marple ${clean} --plugin search 2>&1`, 60000);
    if (!r) return { success: false, data: null, entities: [] };

    const output = r.stdout + (r.stderr || "");
    // Parse URLs and scores
    const matches = [...output.matchAll(/(https?:\/\/[^\s]+)\s*\(score:\s*(\d+)\)/gi)];
    for (const m of matches) {
      const url = m[1];
      const score = parseInt(m[2]);
      if (score >= 3) {
        entities.push(ent("url", url, "marple", Math.min(95, 50 + score * 8), {
          score, username: clean, query: clean,
        }));
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 3. USERNAME VARIATIONS ULTRA — générateur agressif
// ============================================================================
export const UsernameVariationsModule = {
  id: "username_variations_ultra",
  name: "Username Variations Ultra (50+ variantes)",
  category: "username",
  targetTypes: ["username", "person"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim().toLowerCase();
    const entities: any[] = [];

    // Générer variations
    const base = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const variants = new Set<string>();

    if (clean.includes(" ")) {
      // C'est un nom complet
      const [first, ...rest] = base.split(/\s+/);
      const last = rest.join("");
      const fi = first[0];
      const li = last[0];
      [
        `${first}${last}`, `${first}.${last}`, `${first}_${last}`, `${first}-${last}`,
        `${fi}${last}`, `${fi}.${last}`, `${fi}_${last}`,
        `${first}${li}`, `${last}${first}`, `${last}.${first}`, `${last}_${first}`,
        `${first}`, `${last}`, `${fi}${li}`,
      ].forEach(v => v.length >= 3 && variants.add(v));

      // Avec chiffres
      [first, last, `${first}${last}`, `${first}.${last}`, `${fi}${last}`].forEach(base => {
        for (const n of ["1", "2", "7", "42", "01", "99", "007", "2024", "2025"]) {
          variants.add(`${base}${n}`);
        }
      });
    } else {
      // C'est un pseudo
      variants.add(clean);
      // Suffixes
      ["_", ".", "-", "official", "real", "_official", "the", "official_", "mr", "ms", "xo"].forEach(s => {
        variants.add(`${clean}${s}`);
        variants.add(`${s}${clean}`);
      });
      // Leet speak
      const leet = clean.replace(/a/g, "4").replace(/e/g, "3").replace(/i/g, "1").replace(/o/g, "0").replace(/s/g, "5");
      if (leet !== clean) variants.add(leet);
      // Chiffres
      for (const n of ["1", "2", "7", "42", "01", "99", "007", "13", "420", "666", "2024", "2025", "x", "xx"]) {
        variants.add(`${clean}${n}`);
        variants.add(`${n}${clean}`);
        variants.add(`${clean}_${n}`);
      }
      // Duplications
      variants.add(`${clean}${clean}`);
      variants.add(`${clean}_${clean}`);
      // Common suffixes
      ["dev", "js", "py", "fr", "ai", "io", "hq", "tv", "tech", "art", "pro", "gg"].forEach(s => {
        variants.add(`${clean}${s}`);
        variants.add(`${clean}_${s}`);
      });
    }

    // Filter valid (3-30 chars alphanumeric + _.)
    const valid = [...variants].filter(v => /^[a-z0-9._-]{3,30}$/.test(v) && v !== clean);

    emit({ type: "log", data: { message: `Variations: ${valid.length} variantes générées` } });

    // Retourner comme entités username à basse confiance (seront re-testées par les modules)
    for (const v of valid.slice(0, 30)) {
      entities.push(ent("username", v, "username_variations_ultra", 35, {
        generated: true, fromUsername: clean, variant: true,
      }));
    }

    return { success: entities.length > 0, data: { generated: entities.length }, entities };
  },
};

// ============================================================================
// 4. META-AGGREGATOR — quand plusieurs modules confirment un profil, booste confiance
// ============================================================================
export const MetaAggregatorModule = {
  id: "username_meta_aggregator",
  name: "Username Meta-Aggregator (cross-validation)",
  category: "username",
  targetTypes: ["username"],
  priority: 9,  // dernier
  isAvailable: async () => true,
  execute: async (target: string, emit: any, context: any = {}) => {
    const allEntities: any[] = context.allEntities || [];
    const entities: any[] = [];

    // Regrouper par platform+username
    const byProfile: Record<string, any[]> = {};
    for (const e of allEntities) {
      if (e.type !== "social_profile" && e.type !== "username") continue;
      const platform = e.metadata?.platform || "unknown";
      const user = e.metadata?.username || (e.type === "username" ? e.value : null);
      if (!user) continue;
      const key = `${platform}|${user}`.toLowerCase();
      if (!byProfile[key]) byProfile[key] = [];
      byProfile[key].push(e);
    }

    // Pour chaque groupe avec 2+ sources, créer une correlation haute conf
    for (const [key, group] of Object.entries(byProfile)) {
      if (group.length < 2) continue;
      const [platform, username] = key.split("|");
      const sources = [...new Set(group.map(g => g.source))];
      const avgConf = group.reduce((s, g) => s + g.confidence, 0) / group.length;

      entities.push(ent("correlation_pair", `${platform}:${username} cross-validated`, "username_meta_aggregator", Math.min(100, Math.round(avgConf + 10 + sources.length * 3)), {
        platform, username,
        sources, sourceCount: sources.length,
        baseConfidence: avgConf,
        meta: "multi_source_confirmation",
      }));
    }

    emit({ type: "log", data: { message: `Meta-aggregator: ${entities.length} profils cross-validés` } });
    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 5. IDCRAWL-LIKE — scraping multi-source via Google
// ============================================================================
export const IdCrawlModule = {
  id: "idcrawl_scrape",
  name: "IdCrawl-like Meta Search",
  category: "username",
  targetTypes: ["username", "person"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `IdCrawl-like: multi-source for ${clean}` } });

    // Utilise DuckDuckGo pour trouver des profiles
    const platforms = [
      "instagram.com", "twitter.com", "facebook.com", "tiktok.com",
      "linkedin.com/in", "youtube.com", "pinterest.com", "reddit.com/user",
      "github.com", "medium.com", "dev.to", "keybase.io", "soundcloud.com",
      "twitch.tv", "steamcommunity.com", "bsky.app", "mastodon.social",
    ];

    const results = await Promise.allSettled(
      platforms.slice(0, 12).map(async (site) => {
        const q = encodeURIComponent(`"${clean}" site:${site}`);
        const html: any = await http(`https://html.duckduckgo.com/html/?q=${q}`, {
          timeout: 10000,
          headers: { "Accept": "text/html" },
        });
        if (typeof html !== "string") return null;
        const links = [...html.matchAll(/href="([^"]*" class="[^"]*result__[^"]*")/g)]
          .map(m => m[1].split('"')[0])
          .filter(u => u.includes(site));
        return { site, links: [...new Set(links)].slice(0, 3) };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value?.links?.length) {
        for (const link of r.value.links) {
          entities.push(ent("social_profile", link, "idcrawl_scrape", 65, {
            platform: r.value.site, username: clean, fromMetaSearch: true,
          }));
        }
      }
    }

    emit({ type: "log", data: { message: `IdCrawl-like: ${entities.length} profiles trouvés` } });
    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 6. NEXFIL — Python community tool (nexfil)
// ============================================================================
export const NexfilModule = {
  id: "nexfil",
  name: "Nexfil (OSINT usernames)",
  category: "username",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => {
    const r = await tryExec("nexfil --help 2>&1");
    return !!(r?.stdout?.includes("nexfil") || r?.stdout?.includes("Usage"));
  },
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const r = await tryExec(`nexfil -u ${clean} --no-color 2>&1`, 90000);
    if (!r) return { success: false, data: null, entities: [] };

    const output = r.stdout + (r.stderr || "");
    const matches = [...output.matchAll(/\[FOUND\]\s*([\w.-]+?)\s+-\s+(https?:\/\/\S+)/gi)];
    for (const m of matches) {
      entities.push(ent("social_profile", m[2], "nexfil", 80, {
        platform: m[1].trim(), username: clean,
      }));
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 7. USERRECON — Python CLI
// ============================================================================
export const UserreconModule = {
  id: "userrecon",
  name: "Userrecon (PY CLI)",
  category: "username",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => {
    const r = await tryExec("userrecon --help 2>&1") || await tryExec("userrecon -h 2>&1");
    return !!(r?.stdout?.includes("userrecon"));
  },
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const r = await tryExec(`userrecon ${clean} 2>&1`, 90000);
    if (!r) return { success: false, data: null, entities: [] };

    const output = r.stdout + (r.stderr || "");
    const matches = [...output.matchAll(/(?:\[\+\]|✓)\s*([\w.-]+?)\s*[:-]\s*(https?:\/\/\S+)/gi)];
    for (const m of matches) {
      entities.push(ent("social_profile", m[2], "userrecon", 75, {
        platform: m[1].trim(), username: clean,
      }));
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 8. GOOGLE PEOPLE SEARCH — scrape résultats Google pour username + nom
// ============================================================================
export const GooglePeopleSearchModule = {
  id: "google_people_search",
  name: "Google People Search (scraping DDG)",
  category: "username",
  targetTypes: ["username", "person"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    // Dorks spécifiques pour trouver des profils
    const dorks = [
      `"${clean}" profile`,
      `"${clean}" username`,
      `"${clean}" linkedin`,
      `"${clean}" instagram`,
    ];

    for (const dork of dorks.slice(0, 3)) {
      const html: any = await http(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dork)}`,
        { timeout: 10000, headers: { "Accept": "text/html" } }
      );
      if (typeof html !== "string") continue;

      const urls = [...html.matchAll(/<a class="result__url"[^>]*>([^<]+)</g)]
        .map(m => m[1].trim())
        .filter(u => u.length > 8);

      for (const u of [...new Set(urls)].slice(0, 5)) {
        const url = u.startsWith("http") ? u : `https://${u}`;
        if (url.includes("google.") || url.includes("duckduckgo")) continue;

        entities.push(ent("url", url, "google_people_search", 55, {
          fromDork: dork, username: clean, type: "google_profile_candidate",
        }));
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// EXPORT
// ============================================================================
export const usernameHunterProModules = [
  BlackbirdModule,
  MarpleModule,
  UsernameVariationsModule,
  MetaAggregatorModule,
  IdCrawlModule,
  NexfilModule,
  UserreconModule,
  GooglePeopleSearchModule,
];
