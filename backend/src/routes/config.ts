// ============================================================================
// CONFIG ROUTE — Read/write API keys at runtime (persists to .env)
// ============================================================================

import { Router } from "express";
import fs from "fs";
import path from "path";

export const configRouter = Router();

// All known configurable API keys
export const API_KEY_DEFS: { id: string; label: string; description: string; url: string; free: boolean }[] = [
  { id: "SHODAN_API_KEY",      label: "Shodan",             description: "Ports ouverts, vulnérabilités CVE, banners",               url: "https://account.shodan.io/",                    free: false },
  { id: "HIBP_API_KEY",        label: "HaveIBeenPwned",     description: "Breaches d'email — £3.50/mois",                            url: "https://haveibeenpwned.com/API/Key",             free: false },
  { id: "NUMVERIFY_API_KEY",   label: "NumVerify",          description: "Validation & géoloc de numéros de téléphone",              url: "https://numverify.com/",                        free: true  },
  { id: "IPINFO_TOKEN",        label: "IPinfo",             description: "Géolocalisation IP enrichie (50k req/mois gratuit)",       url: "https://ipinfo.io/signup",                      free: true  },
  { id: "ABUSEIPDB_API_KEY",   label: "AbuseIPDB",          description: "Score d'abus et rapports sur les IPs",                     url: "https://www.abuseipdb.com/register",            free: true  },
  { id: "VIRUSTOTAL_API_KEY",  label: "VirusTotal",         description: "Réputation domaine/IP/URL/hash — 500 req/jour gratuit",    url: "https://www.virustotal.com/gui/join-us",         free: true  },
  { id: "HUNTER_API_KEY",      label: "Hunter.io",          description: "Emails d'entreprise depuis un domaine — 25 req/mois free", url: "https://hunter.io/users/sign_up",               free: true  },
  { id: "CENSYS_API_ID",       label: "Censys API ID",      description: "Scan internet — certificats, services exposés",            url: "https://search.censys.io/register",             free: true  },
  { id: "CENSYS_API_SECRET",   label: "Censys API Secret",  description: "Secret associé au Censys API ID",                         url: "https://search.censys.io/register",             free: true  },
  { id: "GITHUB_TOKEN",        label: "GitHub Token",       description: "Recherche de code/users/emails sur GitHub — 5000 req/h",  url: "https://github.com/settings/tokens",            free: true  },
  { id: "BING_SEARCH_KEY",     label: "Bing Search API",    description: "Web search dorking — 1000 req/mois gratuit",              url: "https://azure.microsoft.com/en-us/services/cognitive-services/bing-web-search-api/", free: true },
  { id: "BRAVE_SEARCH_KEY",    label: "Brave Search API",   description: "Web dorking avancé — 2000 req/mois gratuit",               url: "https://api.search.brave.com/register",         free: true  },
  { id: "INSTAGRAM_SESSION",   label: "Instagram Session",  description: "Session cookie Instagram pour profils privés (facultatif)", url: "",                                             free: true  },
  { id: "RAPIDAPI_KEY",        label: "RapidAPI Key (clé unique)",  description: "Active 12 modules : HikerAPI IG · Veriphone · TikTok Scraper7 · Abstract Email · LinkedIn · YouTube · Twitch · Spotify · Discord · IP Geo · Phone Reverse · Email Breach", url: "https://rapidapi.com/developer/apps", free: true },
  { id: "LEAKCHECK_API_KEY",   label: "LeakCheck API",      description: "Recherche de fuites de données (emails dans breaches)",    url: "https://leakcheck.io/",                         free: false },
  { id: "OPENAI_API_KEY",      label: "OpenAI API Key",     description: "GPT-4o pour l'analyse IA des investigations",             url: "https://platform.openai.com/api-keys",          free: false },
];

const ENV_PATH = path.resolve(process.cwd(), ".env");

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  const lines = fs.readFileSync(ENV_PATH, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function writeEnv(vars: Record<string, string>): void {
  const existing: Record<string, string> = readEnv();
  const merged = { ...existing, ...vars };
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n", "utf-8");
  // Also update process.env live
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }
}

// GET /api/config — return current keys (masked) + definitions
configRouter.get("/", (_req, res) => {
  const env = readEnv();
  const result = API_KEY_DEFS.map(def => ({
    ...def,
    value: env[def.id] || process.env[def.id] || "",
    set: !!(env[def.id] || process.env[def.id]),
  }));
  res.json(result);
});

// POST /api/config — save keys
configRouter.post("/", (req, res) => {
  const updates: Record<string, string> = {};
  for (const def of API_KEY_DEFS) {
    if (req.body[def.id] !== undefined) {
      updates[def.id] = String(req.body[def.id]);
    }
  }
  try {
    writeEnv(updates);
    res.json({ ok: true, updated: Object.keys(updates) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
