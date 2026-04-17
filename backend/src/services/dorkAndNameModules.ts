// ============================================================================
// DORK & NAME INTELLIGENCE MODULES
// 1. Google Dorking (DDG/Bing/Startpage scraping sans clé API)
// 2. Name Intelligence (nom → usernames + emails probables + dork complet)
// ============================================================================

import axios from "axios";
import https from "https";
import { exec } from "child_process";
import { promisify } from "util";
import { UsernameIntelligence, EmailIntelligence } from "./advancedEngine";

// Bypass proxy SSL cert (self-signed corporate/school proxy)
const NO_SSL_AGENT = new https.Agent({ rejectUnauthorized: false });

const execAsync = promisify(exec);

function eid() { return `dn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function ent(type: string, value: string, source: string, confidence: number, metadata: any = {}) {
  return { id: eid(), type, value, source, confidence, metadata, verified: confidence >= 80, depth: 0 };
}

const HEADERS_POOL = [
  { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
  { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15", "Accept-Language": "en-US,en;q=0.9" },
  { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0", "Accept-Language": "en-US,en;q=0.8,fr;q=0.6" },
];
function randH() { return HEADERS_POOL[Math.floor(Math.random() * HEADERS_POOL.length)]; }

async function httpGet(url: string, opts: any = {}): Promise<any> {
  try {
    const r = await axios.get(url, { timeout: 12000, validateStatus: () => true, headers: { ...randH(), ...opts.headers }, httpsAgent: NO_SSL_AGENT, ...opts });
    return r.data;
  } catch { return null; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Instances SearX publiques (sans auth, JSON API) ─────────────────────────
const SEARX_INSTANCES = [
  "https://searx.be",
  "https://search.inetol.net",
  "https://searx.tiekoetter.com",
  "https://opnxng.com",
  "https://searx.work",
  "https://search.sapti.me",
  "https://searx.namecoincold.com",
];

async function searxSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  // Try instances in order until one responds
  for (const base of SEARX_INSTANCES) {
    try {
      const r = await axios.get(`${base}/search`, {
        params: { q: query, format: "json", language: "fr", time_range: "", categories: "general", engines: "google,bing,duckduckgo" },
        timeout: 10000,
        validateStatus: () => true,
        headers: { ...randH(), "Accept": "application/json" },
        httpsAgent: NO_SSL_AGENT,
      } as any);
      const rdata = r.data as any;
      if (r.status !== 200 || !rdata?.results) continue;
      return (rdata.results as any[]).slice(0, 15).map((x: any) => ({
        title: x.title || "",
        url: x.url || "",
        snippet: x.content || "",
      })).filter((x: any) => x.url.startsWith("http"));
    } catch {}
  }
  return [];
}

async function ddgJsonSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  // DuckDuckGo abstract API (works without JS, but limited to top result)
  try {
    const r = await axios.get("https://api.duckduckgo.com/", {
      params: { q: query, format: "json", no_html: 1, skip_disambig: 1, no_redirect: 1 },
      timeout: 8000,
      validateStatus: () => true,
      headers: { ...randH() },
      httpsAgent: NO_SSL_AGENT,
    } as any);
    const d = r.data as any;
    const results: { title: string; url: string; snippet: string }[] = [];
    if (d?.AbstractURL) results.push({ title: d.AbstractSource || query, url: d.AbstractURL, snippet: d.AbstractText || "" });
    for (const item of (d?.RelatedTopics || []).slice(0, 8)) {
      if (item.FirstURL) results.push({ title: item.Text?.slice(0, 60) || "", url: item.FirstURL, snippet: item.Text || "" });
    }
    return results;
  } catch { return []; }
}

async function ddgAbstractSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  return ddgJsonSearch(query);
}

async function braveSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  // Brave Search (no key for basic HTML scrape via alternative endpoint)
  try {
    const r = await axios.get(`https://search.brave.com/search`, {
      params: { q: query, source: "web" },
      timeout: 10000,
      validateStatus: () => true,
      headers: { ...randH(), "Accept": "text/html", "Sec-Fetch-Mode": "navigate" },
      httpsAgent: NO_SSL_AGENT,
    } as any);
    const html = typeof r.data === "string" ? r.data : "";
    const results: { title: string; url: string; snippet: string }[] = [];
    // Extract result URLs from Brave HTML
    const matches = [...html.matchAll(/<a[^>]+data-pos="\d+"[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]{0,200}?)<\/a>/g)];
    for (const m of matches.slice(0, 12)) {
      const url = m[1];
      const titleRaw = m[2].replace(/<[^>]+>/g, " ").trim().slice(0, 100);
      if (!url.includes("brave.com") && url.startsWith("http")) {
        results.push({ title: titleRaw, url, snippet: "" });
      }
    }
    return results;
  } catch { return []; }
}

// Aggregate: SearX → DDG JSON → Brave
async function multiSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  let results = await searxSearch(query);
  if (results.length === 0) results = await ddgJsonSearch(query);
  if (results.length === 0) results = await braveSearch(query);
  return results;
}

// ─── Extracteur d'entités depuis texte HTML brut ────────────────────────────
function extractEntitiesFromText(text: string, source: string, target: string): any[] {
  const entities: any[] = [];
  if (!text) return entities;

  // Emails
  const emails = [...new Set((text.match(/[\w.+\-]{2,}@[\w\-]{2,}\.[\w.]{2,}/g) || [])
    .filter(e => !e.includes("example.") && !e.match(/\.(png|jpg|svg|gif)$/i)))];
  for (const e of emails.slice(0, 10))
    entities.push(ent("email", e, source, 80, { extracted_from: "dork_result" }));

  // Téléphones
  const phones = [...new Set((text.match(/(?:\+|00)[1-9]\d{6,14}|\b(?:0|\+33)[1-9](?:[\s.\-]?\d{2}){4}\b/g) || []))];
  for (const p of phones.slice(0, 5))
    entities.push(ent("phone", p.trim(), source, 72, { extracted_from: "dork_result" }));

  // URLs de profils sociaux connus
  const socialUrls = [...new Set((text.match(/https?:\/\/(?:www\.)?(?:linkedin\.com\/in|twitter\.com|x\.com|instagram\.com|facebook\.com|github\.com|tiktok\.com|youtube\.com\/(?:c|channel|@))\/[\w.\-@]+/gi) || []))];
  for (const u of socialUrls.slice(0, 15)) {
    const platform = u.match(/(?:linkedin|twitter|x\.com|instagram|facebook|github|tiktok|youtube)/i)?.[0] || "social";
    entities.push(ent("social_profile", u, source, 82, { platform, extracted_from: "dork_result" }));
  }

  // Adresses (simples patterns FR/EN)
  const addresses = [...new Set((text.match(/\d{1,5}\s+[\w\s,.-]{5,50}(?:Street|St|Avenue|Ave|Road|Rd|Rue|Boulevard|Blvd|Place|Pl|Chemin|Impasse|Allée)\b[\w\s,.-]{0,40}/gi) || []))];
  for (const a of addresses.slice(0, 3))
    entities.push(ent("location", a.trim().replace(/\s+/g, " "), source, 68, { extracted_from: "dork_result" }));

  return entities;
}

// Legacy stubs — replaced by multiSearch()
async function duckduckgoSearch(query: string) { return multiSearch(query); }
async function bingSearch(query: string) { return searxSearch(query); }

// ─── Dorks par type de cible ─────────────────────────────────────────────────
const DORK_SETS: Record<string, { query: (t: string) => string; label: string; severity: string }[]> = {
  username: [
    { label: "social_profiles",  severity: "medium", query: t => `"${t}" site:linkedin.com OR site:twitter.com OR site:instagram.com OR site:facebook.com OR site:github.com` },
    { label: "paste_leaks",      severity: "high",   query: t => `"${t}" site:pastebin.com OR site:paste.ee OR site:ghostbin.com OR site:rentry.co` },
    { label: "forum_mentions",   severity: "medium", query: t => `"@${t}" OR "/${t}" forum OR community OR discord OR telegram` },
    { label: "github_user",      severity: "medium", query: t => `site:github.com "${t}"` },
    { label: "public_documents", severity: "high",   query: t => `"${t}" filetype:pdf OR filetype:doc OR filetype:csv` },
    { label: "contact_pages",    severity: "high",   query: t => `"${t}" email OR contact OR "phone number" OR adresse` },
  ],
  person: [
    { label: "name_exact",       severity: "low",    query: t => `"${t}"` },
    { label: "social_profiles",  severity: "medium", query: t => `"${t}" site:linkedin.com OR site:facebook.com OR site:twitter.com OR site:instagram.com` },
    { label: "cv_resume",        severity: "high",   query: t => `"${t}" CV OR resume OR curriculum vitae filetype:pdf` },
    { label: "contact_info",     severity: "high",   query: t => `"${t}" email OR tel OR phone OR contact` },
    { label: "news_mentions",    severity: "low",    query: t => `"${t}" site:lefigaro.fr OR site:lemonde.fr OR site:20minutes.fr OR site:bfmtv.com` },
    { label: "documents",        severity: "high",   query: t => `"${t}" filetype:pdf OR filetype:doc OR filetype:xls` },
    { label: "addresses",        severity: "high",   query: t => `"${t}" adresse OR address OR "code postal" OR zipcode OR ville` },
    { label: "paste_leaks",      severity: "critical", query: t => `"${t}" site:pastebin.com OR leak OR breach OR dump` },
  ],
  email: [
    { label: "exact",            severity: "low",    query: t => `"${t}"` },
    { label: "breach_leaks",     severity: "critical", query: t => `"${t}" leak OR breach OR hack OR password OR dump` },
    { label: "social_link",      severity: "medium", query: t => `"${t}" site:linkedin.com OR site:github.com OR site:twitter.com` },
    { label: "paste_leaks",      severity: "high",   query: t => `"${t}" site:pastebin.com OR site:ghostbin.com` },
    { label: "documents",        severity: "high",   query: t => `"${t}" filetype:pdf OR filetype:xlsx` },
  ],
  phone: [
    { label: "directories_fr",   severity: "medium", query: t => `"${t}" site:pagesjaunes.fr OR site:118712.fr OR site:pagesblanches.fr` },
    { label: "mentions",         severity: "low",    query: t => `"${t}"` },
    { label: "social_link",      severity: "high",   query: t => `"${t}" whatsapp OR telegram OR signal OR viber` },
    { label: "breach",           severity: "critical", query: t => `"${t}" leak OR breach OR dump` },
  ],
  domain: [
    { label: "subdomains",       severity: "low",    query: t => `site:${t}` },
    { label: "admin_panels",     severity: "critical", query: t => `site:${t} intitle:admin OR intitle:login OR intitle:dashboard OR intitle:"Sign in"` },
    { label: "config_files",     severity: "critical", query: t => `site:${t} filetype:env OR filetype:yaml OR filetype:conf OR filetype:sql OR filetype:bak` },
    { label: "external_mentions", severity: "low",   query: t => `"${t}" -site:${t}` },
    { label: "exposed_dirs",     severity: "high",   query: t => `site:${t} intitle:"Index of" OR inurl:/backup/ OR inurl:/upload/` },
  ],
  ip: [
    { label: "abuse_reports",    severity: "high",   query: t => `"${t}" abuse OR spam OR botnet OR malware` },
    { label: "shodan",           severity: "medium", query: t => `site:shodan.io "${t}"` },
    { label: "mentions",         severity: "low",    query: t => `"${t}"` },
  ],
};

// ============================================================================
// MODULE: GOOGLE DORKING (multi-moteur, sans clé API)
// ============================================================================
export const GoogleDorkModule = {
  id: "googledork",
  name: "Google Dorking (DDG + Bing)",
  category: "search",
  targetTypes: ["username", "person", "email", "phone", "domain", "ip", "any"],
  priority: 5,
  isAvailable: async () => true,

  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `[Dork] Démarrage du dorking multi-moteur pour "${target}"...` } });
    const entities: any[] = [];
    const seenUrls = new Set<string>();

    // Détecte le type de cible pour choisir les bons dorks
    const targetType = target.includes("@") && target.match(/[\w]+@[\w.]+/)
      ? "email"
      : target.match(/^\+?[\d\s().-]{7,}$/)
      ? "phone"
      : target.match(/^(\d{1,3}\.){3}\d{1,3}$/)
      ? "ip"
      : target.match(/^[\w-]+\.[\w.]{2,}$/) && !target.includes(" ")
      ? "domain"
      : target.match(/^[A-ZÀ-Ú][a-zà-ú]+\s+[A-ZÀ-Ú][a-zà-ú]+/)
      ? "person"
      : "username";

    const dorks = DORK_SETS[targetType] || DORK_SETS["username"];

    for (const dork of dorks) {
      const query = dork.query(target);
      emit({ type: "log", data: { message: `[Dork] ${dork.label}: ${query.slice(0, 80)}...` } });

      // Essai DDG en premier (moins de rate-limit)
      let results = await duckduckgoSearch(query);
      if (results.length === 0) {
        await sleep(1500);
        results = await bingSearch(query);
      }

      for (const r of results) {
        if (!r.url || seenUrls.has(r.url)) continue;
        seenUrls.add(r.url);

        // Entité URL trouvée
        entities.push(ent("url", r.url, `dork_${dork.label}`, 75, {
          title: r.title,
          snippet: r.snippet.slice(0, 200),
          dork_query: query,
          severity: dork.severity,
          dork_label: dork.label,
        }));

        // Extraction d'entités depuis snippet + titre
        const textContent = `${r.title} ${r.snippet}`;
        const extracted = extractEntitiesFromText(textContent, `dork_${dork.label}`, target);
        entities.push(...extracted);
      }

      if (results.length > 0) {
        emit({ type: "log", data: { message: `[Dork] ${dork.label}: ${results.length} résultats → ${entities.length} entités` } });
      }

      await sleep(800); // anti rate-limit entre chaque dork
    }

    return { success: entities.length > 0, data: { target, targetType, dorksRun: dorks.length, urlsFound: seenUrls.size }, entities };
  },
};

// ============================================================================
// MODULE: NAME INTELLIGENCE (nom → profils + emails + usernames probables)
// ============================================================================
export const NameIntelModule = {
  id: "name_intel",
  name: "Name Intelligence (nom → identités)",
  category: "person",
  targetTypes: ["person", "username"],
  priority: 2,
  isAvailable: async () => true,

  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `[NameIntel] Analyse identitaire pour "${target}"...` } });
    const entities: any[] = [];
    const seen = new Set<string>();

    const addEnt = (e: any) => { if (!seen.has(e.value)) { seen.add(e.value); entities.push(e); } };

    // Décompose nom/prénom
    const parts = target.trim().split(/\s+/);
    const isPerson = parts.length >= 2;
    const firstName = isPerson ? parts[0] : target;
    const lastName  = isPerson ? parts.slice(1).join(" ") : "";

    // 1. Génération de variantes de usernames
    const usernameVariants = isPerson
      ? UsernameIntelligence.fromRealName(firstName, lastName)
      : UsernameIntelligence.generateAllVariants(target);

    emit({ type: "log", data: { message: `[NameIntel] ${usernameVariants.length} variantes de username générées` } });

    // Ajouter les variantes les plus probables comme entités
    for (const v of usernameVariants.slice(0, 25)) {
      addEnt(ent("username", v, "name_intel_variants", 62, {
        generated_from: target,
        type: "username_variant",
        priority: usernameVariants.indexOf(v) < 8 ? "high" : "medium",
      }));
    }

    // 2. Génération d'emails probables (si prénom + nom)
    if (isPerson) {
      const emailGuesses = EmailIntelligence.guessWithCommonDomains(firstName, lastName);
      emit({ type: "log", data: { message: `[NameIntel] ${emailGuesses.length} emails probables générés` } });
      for (const e of emailGuesses.slice(0, 20)) {
        addEnt(ent("email", e, "name_intel_emails", 45, {
          generated_from: target,
          type: "email_guess",
          firstName, lastName,
        }));
      }
    }

    // 3. Recherche sur annuaires publics FR
    if (isPerson) {
      const firstNameEnc = encodeURIComponent(firstName.toLowerCase());
      const lastNameEnc  = encodeURIComponent(lastName.toLowerCase());

      // Pages Blanches (annuaire FR)
      try {
        const pbUrl = `https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui=${firstNameEnc}+${lastNameEnc}&ou=`;
        const html = await httpGet(pbUrl);
        if (html && typeof html === "string") {
          const phones = [...new Set((html.match(/0[1-9](?:[\s.]?\d{2}){4}/g) || []).map(p => p.replace(/\s/g, "")))];
          const cities  = [...new Set((html.match(/class="city"[^>]*>([^<]{2,40})</g) || []).map(m => m.replace(/class="city"[^>]*>/, "")))];
          for (const p of phones.slice(0, 5))   addEnt(ent("phone",    p, "pagesblanches", 78, { person: target }));
          for (const c of cities.slice(0, 5))    addEnt(ent("location", c.trim(), "pagesblanches", 70, { person: target }));
        }
      } catch {}

      // LinkedIn public search
      try {
        const lnUrl = `https://www.linkedin.com/pub/dir/${encodeURIComponent(firstName)}/${encodeURIComponent(lastName)}`;
        const html = await httpGet(lnUrl);
        if (html && typeof html === "string") {
          const profiles = [...html.matchAll(/href="(https:\/\/www\.linkedin\.com\/in\/[^"?]+)"/g)].map(m => m[1]);
          for (const p of [...new Set(profiles)].slice(0, 5)) {
            addEnt(ent("social_profile", p, "linkedin_public_search", 80, { platform: "LinkedIn", person: target }));
          }
        }
      } catch {}

      // Wikidata — personne célèbre ?
      try {
        const wdResp = await httpGet(
          `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(target)}&language=fr&type=item&limit=3&format=json`
        );
        for (const item of (wdResp?.search || []).slice(0, 3)) {
          if (item?.label && item?.description?.match(/person|politician|actor|singer|footballer|writer|artist|journalist/i)) {
            addEnt(ent("metadata", `Wikidata: ${item.label} — ${item.description}`, "wikidata", 85, {
              wikidata_id: item.id,
              url: `https://www.wikidata.org/wiki/${item.id}`,
              person: target,
            }));
            addEnt(ent("url", `https://www.wikidata.org/wiki/${item.id}`, "wikidata", 82, { person: target }));
          }
        }
      } catch {}
    }

    // 4. Dork ciblé sur le nom (top 3 moteurs)
    const nameQuery = isPerson ? `"${firstName}" "${lastName}"` : `"${target}"`;
    const emailDork = `${nameQuery} email OR contact`;
    const socialDork = `${nameQuery} site:linkedin.com OR site:twitter.com OR site:instagram.com OR site:facebook.com`;
    const leakDork   = `${nameQuery} site:pastebin.com OR leak OR breach`;

    for (const [label, query] of [["social_dork", socialDork], ["email_dork", emailDork], ["leak_dork", leakDork]] as const) {
      let results = await duckduckgoSearch(query);
      if (results.length === 0) { await sleep(1000); results = await bingSearch(query); }

      for (const r of results.slice(0, 8)) {
        if (!seen.has(r.url) && r.url.startsWith("http")) {
          seen.add(r.url);
          addEnt(ent("url", r.url, `name_intel_${label}`, 72, { title: r.title, snippet: r.snippet.slice(0, 150) }));
          const extracted = extractEntitiesFromText(`${r.title} ${r.snippet}`, `name_intel_${label}`, target);
          for (const e of extracted) addEnt(e);
        }
      }
      await sleep(700);
    }

    emit({ type: "log", data: { message: `[NameIntel] Terminé: ${entities.length} entités pour "${target}"` } });
    return { success: entities.length > 0, data: { target, entitiesCount: entities.length }, entities };
  },
};

// ============================================================================
// MODULE: USERNAME CLUSTER (username → variantes + recherche cross-platform)
// ============================================================================
export const UsernameClusterModule = {
  id: "username_cluster",
  name: "Username Cluster (variantes + cross-platform)",
  category: "username",
  targetTypes: ["username", "person"],
  priority: 3,
  isAvailable: async () => true,

  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `[UsernameCluster] Génération de variantes pour "${target}"...` } });
    const entities: any[] = [];
    const seen = new Set<string>();

    const clean = target.replace(/^@/, "").toLowerCase().trim();
    const addEnt = (e: any) => { if (!seen.has(e.value)) { seen.add(e.value); entities.push(e); } };

    // Génère toutes les variantes
    const variants = UsernameIntelligence.generateAllVariants(clean);
    emit({ type: "log", data: { message: `[UsernameCluster] ${variants.length} variantes générées` } });

    // Ajoute les variantes les plus proches (distance Levenshtein ≤ 2)
    let closeCount = 0;
    for (const v of variants) {
      if (v === clean) continue;
      const isClose = UsernameIntelligence.isVariant(clean, v);
      const conf = isClose ? 75 : 58;
      if (closeCount < 30 || conf >= 75) {
        addEnt(ent("username", v, "username_cluster", conf, {
          base_username: clean,
          is_close_variant: isClose,
          variant_type: "generated",
        }));
        if (isClose) closeCount++;
      }
    }

    // Recherche cross-réseau rapide (sans Sherlock, juste des checks HEAD directs)
    const QUICK_PLATFORMS = [
      { name: "GitHub",      url: (u: string) => `https://github.com/${u}` },
      { name: "Reddit",      url: (u: string) => `https://www.reddit.com/user/${u}` },
      { name: "Twitter/X",   url: (u: string) => `https://twitter.com/${u}` },
      { name: "Instagram",   url: (u: string) => `https://www.instagram.com/${u}/` },
      { name: "TikTok",      url: (u: string) => `https://www.tiktok.com/@${u}` },
      { name: "YouTube",     url: (u: string) => `https://www.youtube.com/@${u}` },
      { name: "Twitch",      url: (u: string) => `https://www.twitch.tv/${u}` },
      { name: "Pinterest",   url: (u: string) => `https://www.pinterest.com/${u}` },
      { name: "Linktree",    url: (u: string) => `https://linktr.ee/${u}` },
      { name: "Gravatar",    url: (u: string) => `https://en.gravatar.com/${u}` },
      { name: "Keybase",     url: (u: string) => `https://keybase.io/${u}` },
      { name: "HackerNews",  url: (u: string) => `https://news.ycombinator.com/user?id=${u}` },
      { name: "Steam",       url: (u: string) => `https://steamcommunity.com/id/${u}` },
      { name: "GitLab",      url: (u: string) => `https://gitlab.com/${u}` },
      { name: "Dev.to",      url: (u: string) => `https://dev.to/${u}` },
      { name: "Mastodon",    url: (u: string) => `https://mastodon.social/@${u}` },
      { name: "Medium",      url: (u: string) => `https://medium.com/@${u}` },
      { name: "Patreon",     url: (u: string) => `https://www.patreon.com/${u}` },
      { name: "Ko-fi",       url: (u: string) => `https://ko-fi.com/${u}` },
      { name: "Replit",      url: (u: string) => `https://replit.com/@${u}` },
    ];

    const checkBatch = async (usernames: string[], batchSize = 5) => {
      for (let i = 0; i < usernames.length; i += batchSize) {
        const batch = usernames.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.flatMap(u =>
            QUICK_PLATFORMS.map(async (p) => {
              const url = p.url(u);
              try {
                const r = await (axios as any).request({
                  method: "HEAD",
                  url,
                  timeout: 5000,
                  validateStatus: () => true,
                  headers: { "User-Agent": "Mozilla/5.0 (compatible; OSINT-Master/4.0)" },
                  httpsAgent: NO_SSL_AGENT,
                  maxRedirects: 2,
                });
                const status = r.status;
                // 200 → trouvé, 301/302 suivi → parfois trouvé, 404 → absent, 429 → rate-limit (on assume existant)
                if (status === 200 || status === 301 || status === 429) {
                  const conf = status === 429 ? 65 : 82;
                  addEnt(ent("social_profile", url, "username_cluster_check", conf, {
                    platform: p.name,
                    username: u,
                    http_status: status,
                    is_primary: u === clean,
                  }));
                }
              } catch {}
            })
          )
        );
        await sleep(300);
      }
    };

    // On vérifie d'abord le username principal sur toutes les plateformes
    emit({ type: "log", data: { message: `[UsernameCluster] Vérification cross-platform pour @${clean}...` } });
    await checkBatch([clean]);

    // Puis les 5 variantes les plus proches
    const topVariants = [...seen]
      .filter(v => v.startsWith("https://") === false)
      .slice(0, 5);
    if (topVariants.length > 0) {
      emit({ type: "log", data: { message: `[UsernameCluster] Vérification des 5 variantes proches...` } });
      await checkBatch(topVariants.filter(v => !v.includes(".")));
    }

    emit({ type: "log", data: { message: `[UsernameCluster] Terminé: ${entities.length} entités` } });
    return { success: entities.length > 0, data: { username: clean, variantsGenerated: variants.length, entitiesFound: entities.length }, entities };
  },
};

export const DorkAndNameModules = [
  GoogleDorkModule,
  NameIntelModule,
  UsernameClusterModule,
];
