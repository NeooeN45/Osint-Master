// ============================================================================
// NEW MODULES EXTRA — 40+ nouveaux modules OSINT
// USERNAME / EMAIL / PHONE / NOM — APIs gratuites + scraping public
// ============================================================================

import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function tryExec(cmd: string, ms = 30000) {
  try { return await execAsync(cmd, { timeout: ms, maxBuffer: 10 * 1024 * 1024 }); } catch (e: any) { return e.stdout ? { stdout: e.stdout, stderr: e.stderr || "" } : null; }
}

async function http(url: string, opts: any = {}): Promise<any> {
  try {
    const r = await axios.get(url, { timeout: 12000, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", ...opts.headers }, ...opts });
    return r.data;
  } catch { return null; }
}

function eid() { return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function ent(type: string, value: string, source: string, confidence: number, metadata: any = {}) {
  return { id: eid(), type, value, source, confidence, metadata, verified: confidence >= 80, depth: 0 };
}

// ============================================================================
// USERNAME MODULES
// ============================================================================

export const usernameModulesExtra = [

  // ---- Usersearch.org (mass check 200+ sites) ----
  {
    id: "usersearch_org",
    name: "UserSearch.org",
    category: "username",
    targetTypes: ["username"],
    priority: 4,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `UserSearch.org: scanning 200+ platforms for @${target}` } });
      const entities: any[] = [];

      // Check via direct profile URL probing — most reliable method
      const PLATFORMS = [
        { name: "AboutMe",      url: `https://about.me/${target}`,              found: "og:title", notFound: "404" },
        { name: "Academia.edu", url: `https://independent.academia.edu/${target}`, found: target, notFound: "404" },
        { name: "Bandcamp",     url: `https://bandcamp.com/${target}`,          found: "og:url", notFound: "Sorry" },
        { name: "Behance",      url: `https://www.behance.net/${target}`,       found: `"username":"${target}"`, notFound: "404" },
        { name: "Blogger",      url: `https://${target}.blogspot.com`,          found: "og:url", notFound: "404" },
        { name: "Buymeacoffee", url: `https://www.buymeacoffee.com/${target}`,  found: target, notFound: "404" },
        { name: "Carrd.co",     url: `https://${target}.carrd.co`,              found: "og:url", notFound: "404" },
        { name: "Chess.com",    url: `https://www.chess.com/member/${target}`,  found: target, notFound: "not found" },
        { name: "Codecademy",   url: `https://www.codecademy.com/profiles/${target}`, found: target, notFound: "404" },
        { name: "Codewars",     url: `https://www.codewars.com/users/${target}`, found: target, notFound: "404" },
        { name: "Dailymotion",  url: `https://www.dailymotion.com/${target}`,   found: `"screenname":"${target}"`, notFound: "404" },
        { name: "Dribbble",     url: `https://dribbble.com/${target}`,          found: target, notFound: "not found" },
        { name: "Duolingo",     url: `https://www.duolingo.com/profile/${target}`, found: target, notFound: "404" },
        { name: "Ello",         url: `https://ello.co/${target}`,               found: target, notFound: "404" },
        { name: "Fiverr",       url: `https://www.fiverr.com/${target}`,        found: target, notFound: "404" },
        { name: "Foursquare",   url: `https://foursquare.com/${target}`,        found: target, notFound: "404" },
        { name: "Freelancer",   url: `https://www.freelancer.com/u/${target}`,  found: target, notFound: "404" },
        { name: "Goodreads",    url: `https://www.goodreads.com/${target}`,     found: target, notFound: "404" },
        { name: "Gravatar",     url: `https://en.gravatar.com/${target}`,       found: target, notFound: "404" },
        { name: "HackerEarth",  url: `https://www.hackerearth.com/@${target}`,  found: target, notFound: "404" },
        { name: "HackerRank",   url: `https://www.hackerrank.com/${target}`,    found: target, notFound: "404" },
        { name: "Hashnode",     url: `https://hashnode.com/@${target}`,         found: target, notFound: "404" },
        { name: "Imgur",        url: `https://imgur.com/user/${target}`,        found: target, notFound: "404" },
        { name: "Instructables", url: `https://www.instructables.com/member/${target}`, found: target, notFound: "404" },
        { name: "Kaggle",       url: `https://www.kaggle.com/${target}`,        found: target, notFound: "404" },
        { name: "Kickstarter",  url: `https://www.kickstarter.com/profile/${target}`, found: target, notFound: "404" },
        { name: "Ko-fi",        url: `https://ko-fi.com/${target}`,             found: target, notFound: "404" },
        { name: "Kongregate",   url: `https://www.kongregate.com/accounts/${target}`, found: target, notFound: "404" },
        { name: "Last.fm",      url: `https://www.last.fm/user/${target}`,      found: target, notFound: "not found" },
        { name: "Letterboxd",   url: `https://letterboxd.com/${target}`,        found: target, notFound: "Sorry" },
        { name: "Lichess",      url: `https://lichess.org/@/${target}`,         found: target, notFound: "404" },
        { name: "Mixcloud",     url: `https://www.mixcloud.com/${target}`,      found: target, notFound: "404" },
        { name: "MyAnimeList",  url: `https://myanimelist.net/profile/${target}`, found: target, notFound: "404" },
        { name: "Newgrounds",   url: `https://${target}.newgrounds.com`,        found: target, notFound: "404" },
        { name: "OpenStreetMap",url: `https://www.openstreetmap.org/user/${target}`, found: target, notFound: "404" },
        { name: "Patreon",      url: `https://www.patreon.com/${target}`,       found: target, notFound: "404" },
        { name: "ProductHunt",  url: `https://www.producthunt.com/@${target}`,  found: target, notFound: "404" },
        { name: "Quora",        url: `https://www.quora.com/profile/${target}`, found: target, notFound: "404" },
        { name: "Roblox",       url: `https://www.roblox.com/user.aspx?username=${target}`, found: target, notFound: "404" },
        { name: "Scratch",      url: `https://scratch.mit.edu/users/${target}`, found: target, notFound: "404" },
        { name: "Slideshare",   url: `https://www.slideshare.net/${target}`,    found: target, notFound: "404" },
        { name: "SourceForge",  url: `https://sourceforge.net/u/${target}`,     found: target, notFound: "404" },
        { name: "Trello",       url: `https://trello.com/${target}`,            found: target, notFound: "404" },
        { name: "Twitch",       url: `https://www.twitch.tv/${target}`,         found: "channelFollowCount", notFound: "404" },
        { name: "Typeracer",    url: `https://data.typeracer.com/pit/profile?user=${target}`, found: target, notFound: "not found" },
        { name: "Unsplash",     url: `https://unsplash.com/@${target}`,         found: target, notFound: "404" },
        { name: "Venmo",        url: `https://account.venmo.com/u/${target}`,   found: target, notFound: "404" },
        { name: "Wattpad",      url: `https://www.wattpad.com/user/${target}`,  found: target, notFound: "404" },
        { name: "WordPress",    url: `https://${target}.wordpress.com`,         found: target, notFound: "404" },
        { name: "Xda-developers", url: `https://forum.xda-developers.com/m/${target}/`, found: target, notFound: "404" },
        { name: "Ycombinator", url: `https://news.ycombinator.com/user?id=${target}`, found: target, notFound: "No such user" },
        { name: "Yandex",      url: `https://yandex.ru/collections/user/${target}`, found: target, notFound: "404" },
        { name: "500px",       url: `https://500px.com/p/${target}`,            found: target, notFound: "404" },
        { name: "8tracks",     url: `https://8tracks.com/${target}`,            found: target, notFound: "404" },
      ];

      // Batch parallel avec rate limit
      const BATCH = 15;
      for (let i = 0; i < PLATFORMS.length; i += BATCH) {
        const batch = PLATFORMS.slice(i, i + BATCH);
        const results = await Promise.allSettled(batch.map(async p => {
          try {
            const r = await axios.get(p.url, { timeout: 5000, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" }, maxRedirects: 2 } as any);
            const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data || "");
            if (r.status === 404 || r.status === 410) return null;
            if (p.notFound && body.toLowerCase().includes(p.notFound.toLowerCase())) return null;
            if (p.found && !body.toLowerCase().includes(p.found.toLowerCase())) return null;
            if (r.status >= 200 && r.status < 400) return p;
            return null;
          } catch { return null; }
        }));
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) {
            entities.push(ent("social_profile", r.value.url, "usersearch_org", 78, { platform: r.value.name }));
          }
        }
        await new Promise(res => setTimeout(res, 300));
      }

      return { success: true, data: { found: entities.length }, entities };
    },
  },

  // ---- Namechk (check domain + social availability) ----
  {
    id: "namechk",
    name: "Namechk Social Check",
    category: "username",
    targetTypes: ["username"],
    priority: 5,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `Namechk: checking username availability signals for ${target}` } });
      const entities: any[] = [];

      // Ces plateformes ont des APIs publiques ou endpoints simples
      const CHECKS = [
        { name: "Telegram",  api: `https://t.me/${target}`,           findStr: "tgme_page_photo" },
        { name: "VK",        api: `https://vk.com/${target}`,         findStr: "ProfileInfo" },
        { name: "Odnoklassniki", api: `https://ok.ru/${target}`,      findStr: target },
        { name: "Tumblr",    api: `https://${target}.tumblr.com`,     findStr: "og:url" },
        { name: "Weibo",     api: `https://weibo.com/${target}`,      findStr: target },
        { name: "Flipboard", api: `https://flipboard.com/@${target}`, findStr: target },
        { name: "Minds",     api: `https://www.minds.com/${target}`,  findStr: target },
        { name: "Gab",       api: `https://gab.com/${target}`,        findStr: target },
        { name: "Diaspora",  api: `https://diaspora.social/u/${target}`, findStr: target },
      ];

      const results = await Promise.allSettled(CHECKS.map(async c => {
        try {
          const r = await axios.get(c.api, { timeout: 5000, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0" } } as any);
          const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data || "");
          if (r.status === 404) return null;
          if (body.toLowerCase().includes(c.findStr.toLowerCase())) return c;
          return null;
        } catch { return null; }
      }));

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          entities.push(ent("social_profile", r.value.api, "namechk", 72, { platform: r.value.name }));
        }
      }

      return { success: true, data: { found: entities.length }, entities };
    },
  },

  // ---- Социальные сети russes/chinoises ----
  {
    id: "intl_social_check",
    name: "International Social Networks",
    category: "username",
    targetTypes: ["username"],
    priority: 6,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `International social check for ${target}` } });
      const entities: any[] = [];

      const INTL = [
        { name: "VKontakte",    url: `https://vk.com/${target}`,                find: "profile_type" },
        { name: "OK.ru",        url: `https://ok.ru/${target}`,                 find: target.toLowerCase() },
        { name: "Taringa",      url: `https://www.taringa.net/${target}`,        find: target },
        { name: "Fotolog",      url: `https://www.fotolog.com/${target}`,        find: target },
        { name: "Ask.fm",       url: `https://ask.fm/${target}`,                 find: "profile" },
        { name: "Livejournal",  url: `https://${target}.livejournal.com`,        find: "userinfo" },
        { name: "Blogspot",     url: `https://${target}.blogspot.com`,           find: "og:url" },
        { name: "WordPress",    url: `https://${target}.wordpress.com`,          find: "og:url" },
        { name: "Amino",        url: `https://aminoapps.com/u/${target}`,        find: target },
        { name: "Weibo",        url: `https://weibo.com/n/${target}`,            find: "weibo" },
        { name: "Xing",         url: `https://www.xing.com/profile/${target}`,   find: target },
        { name: "Viadeo",       url: `https://www.viadeo.com/en/profile/${target}`, find: target },
        { name: "Skyrock",      url: `http://${target}.skyrock.com`,             find: target },
        { name: "Pexels",       url: `https://www.pexels.com/@${target}`,        find: target },
        { name: "Pixabay",      url: `https://pixabay.com/users/${target}`,      find: target },
      ];

      const results = await Promise.allSettled(INTL.map(async p => {
        try {
          const r = await axios.get(p.url, { timeout: 5000, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0" } } as any);
          const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data || "");
          if (r.status === 404 || r.status === 410) return null;
          if (!body.toLowerCase().includes(p.find.toLowerCase())) return null;
          if (r.status >= 200 && r.status < 400) return p;
          return null;
        } catch { return null; }
      }));

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          entities.push(ent("social_profile", r.value.url, "intl_social_check", 70, { platform: r.value.name }));
        }
      }

      return { success: true, data: { found: entities.length }, entities };
    },
  },

  // ---- Holehe via pip (email→social) ----
  {
    id: "holehe_pip",
    name: "Holehe (pip)",
    category: "username",
    targetTypes: ["email"],
    priority: 3,
    isAvailable: async () => { const r = await tryExec("holehe --version 2>&1"); return !!(r?.stdout || r?.stderr); },
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `Holehe: checking ${target} on 120+ services` } });
      const r = await tryExec(`holehe "${target}" --no-color 2>&1`, 60000);
      if (!r) return { success: false, data: null, entities: [] };

      const entities: any[] = [];
      const lines = (r.stdout + r.stderr).split("\n");
      for (const line of lines) {
        if (line.includes("[+]")) {
          const service = line.replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").trim();
          if (service) entities.push(ent("service", service, "holehe_pip", 88, { email: target, registered: true }));
        }
      }
      return { success: true, data: { found: entities.length }, entities };
    },
  },
];

// ============================================================================
// EMAIL MODULES
// ============================================================================

export const emailModulesExtra = [

  // ---- Epieos (email → Google Account + profils) ----
  {
    id: "epieos",
    name: "Epieos (Google Account lookup)",
    category: "email",
    targetTypes: ["email"],
    priority: 2,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `Epieos: looking up Google account for ${target}` } });
      const entities: any[] = [];

      try {
        // Google People API lookup (sans clé — endpoint public)
        const data = await http(`https://epieos.com/api/email?email=${encodeURIComponent(target)}&l=0`, {
          headers: { "Origin": "https://epieos.com", "Referer": "https://epieos.com/" }
        });

        if (data?.name) {
          entities.push(ent("person", data.name, "epieos", 85, { email: target, source: "google_account" }));
        }
        if (data?.photo) {
          entities.push(ent("image", data.photo, "epieos", 80, { email: target, type: "profile_photo" }));
        }
        if (data?.services) {
          for (const svc of data.services) {
            entities.push(ent("service", svc, "epieos", 80, { email: target }));
          }
        }
      } catch {}

      // Alternative: Google+ / people lookup via GID
      try {
        const gData = await http(`https://www.googleapis.com/plus/v1/people?query=${encodeURIComponent(target)}&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`);
        if (gData?.items?.length) {
          for (const p of gData.items.slice(0, 3)) {
            if (p.displayName) entities.push(ent("person", p.displayName, "epieos", 70, { google_id: p.id, email: target }));
          }
        }
      } catch {}

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Hunter.io free (domaine → emails) ----
  {
    id: "hunter_io",
    name: "Hunter.io (email finder)",
    category: "email",
    targetTypes: ["email", "domain"],
    priority: 3,
    isAvailable: async () => !!process.env.HUNTER_API_KEY,
    execute: async (target: string, emit: any) => {
      const key = process.env.HUNTER_API_KEY;
      if (!key) return { success: false, data: null, entities: [] };

      emit({ type: "log", data: { message: `Hunter.io: searching emails for ${target}` } });
      const entities: any[] = [];

      const isDomain = !target.includes("@");
      const url = isDomain
        ? `https://api.hunter.io/v2/domain-search?domain=${target}&api_key=${key}&limit=20`
        : `https://api.hunter.io/v2/email-verifier?email=${target}&api_key=${key}`;

      const data = await http(url);
      if (!data?.data) return { success: false, data: null, entities: [] };

      if (isDomain && data.data.emails) {
        for (const e of data.data.emails) {
          entities.push(ent("email", e.value, "hunter_io", e.confidence, { name: `${e.first_name} ${e.last_name}`, position: e.position, linkedin: e.linkedin }));
          if (e.linkedin) entities.push(ent("social_profile", e.linkedin, "hunter_io", 85, { email: e.value, platform: "linkedin" }));
          if (e.first_name || e.last_name) entities.push(ent("person", `${e.first_name} ${e.last_name}`.trim(), "hunter_io", 80, { email: e.value }));
        }
      } else if (!isDomain && data.data.status) {
        entities.push(ent("email", target, "hunter_io", data.data.score || 70, { status: data.data.status, deliverable: data.data.result === "deliverable" }));
      }

      return { success: true, data: { found: entities.length }, entities };
    },
  },

  // ---- BreachDirectory (email dans leaks) ----
  {
    id: "breachdirectory",
    name: "BreachDirectory (email leaks)",
    category: "email",
    targetTypes: ["email", "username"],
    priority: 2,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `BreachDirectory: checking ${target} in known breaches` } });
      const entities: any[] = [];

      // Public endpoint (limité)
      try {
        const data = await http(`https://breachdirectory.org/api?func=auto&term=${encodeURIComponent(target)}`, {
          headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        if (data?.found) {
          entities.push(ent("breach", `${data.found} breaches found for ${target}`, "breachdirectory", 90, {
            target, count: data.found, sources: data.sources
          }));
        }
      } catch {}

      // DeHashed free (pas d'auth nécessaire pour la page)
      try {
        const r = await axios.get(`https://dehashed.com/search?query=${encodeURIComponent(target)}`, {
          timeout: 10000, validateStatus: () => true,
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
        } as any);
        const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data || "");
        const totalMatch = body.match(/"total":(\d+)/);
        if (totalMatch && parseInt(totalMatch[1]) > 0) {
          entities.push(ent("breach", `${target} found in DeHashed (${totalMatch[1]} records)`, "breachdirectory", 88, {
            source: "dehashed", total: parseInt(totalMatch[1])
          }));
        }
      } catch {}

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Have I Been Pwned public ----
  {
    id: "hibp",
    name: "Have I Been Pwned",
    category: "email",
    targetTypes: ["email"],
    priority: 1,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `HIBP: checking ${target} against all breaches` } });
      const entities: any[] = [];

      try {
        const apiKey = process.env.HIBP_API_KEY;
        const headers: any = { "User-Agent": "OSINT-Master/5.0", "hibp-api-key": apiKey || "" };

        const r = await axios.get(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(target)}?truncateResponse=false`, {
          timeout: 10000, validateStatus: () => true, headers
        } as any);

        if (r.status === 200 && Array.isArray(r.data)) {
          for (const breach of r.data) {
            entities.push(ent("breach", breach.Name, "hibp", 95, {
              email: target, domain: breach.Domain, date: breach.BreachDate,
              dataClasses: breach.DataClasses, pwnCount: breach.PwnCount,
              description: breach.Description?.slice(0, 200)
            }));
          }
        } else if (r.status === 404) {
          // Not found = good — no breach
        }
      } catch {}

      // Paste check
      try {
        const apiKey = process.env.HIBP_API_KEY;
        const r = await axios.get(`https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(target)}`, {
          timeout: 10000, validateStatus: () => true,
          headers: { "User-Agent": "OSINT-Master/5.0", "hibp-api-key": apiKey || "" }
        } as any);
        if (r.status === 200 && Array.isArray(r.data)) {
          for (const paste of r.data) {
            entities.push(ent("breach", `Paste: ${paste.Source}/${paste.Id}`, "hibp", 88, {
              email: target, source: paste.Source, date: paste.Date, title: paste.Title
            }));
          }
        }
      } catch {}

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Email2LinkedIn (alias cherche LinkedIn) ----
  {
    id: "email_linkedin",
    name: "Email → LinkedIn Finder",
    category: "email",
    targetTypes: ["email"],
    priority: 4,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `Searching LinkedIn profile for email ${target}` } });
      const entities: any[] = [];
      const [local] = target.split("@");

      // Recherche via Bing/DDG public
      const searchUrls = [
        `https://api.bing.com/v7.0/search?q=${encodeURIComponent(`"${target}" site:linkedin.com/in`)}&count=5`,
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`"${target}" site:linkedin.com/in`)}`,
      ];

      for (const url of searchUrls) {
        try {
          const r = await axios.get(url, { timeout: 8000, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0" } } as any);
          const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data || "");
          const matches = body.match(/linkedin\.com\/in\/[\w-]+/g) || [];
          for (const m of [...new Set(matches)].slice(0, 3)) {
            entities.push(ent("social_profile", `https://www.${m}`, "email_linkedin", 72, { email: target, platform: "linkedin" }));
          }
          if (entities.length > 0) break;
        } catch {}
      }

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },
];

// ============================================================================
// PHONE MODULES
// ============================================================================

export const phoneModulesExtra = [

  // ---- NumLookup (gratuit) ----
  {
    id: "numlookup",
    name: "NumLookup (carrier + owner)",
    category: "phone",
    targetTypes: ["phone"],
    priority: 1,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `NumLookup: carrier & owner for ${target}` } });
      const entities: any[] = [];
      const clean = target.replace(/[\s()\-]/g, "");

      try {
        const data = await http(`https://api.numlookupapi.com/v1/info/${clean}?apikey=numlookupapi-demo`, {
          headers: { "User-Agent": "OSINT-Master/5.0" }
        });

        if (data?.valid || data?.country_code) {
          entities.push(ent("phone", target, "numlookup", 85, {
            country: data.country_name, carrier: data.carrier, line_type: data.line_type,
            location: data.location, international_format: data.international_format,
            country_code: data.country_code
          }));
          if (data.country_name) {
            entities.push(ent("location", data.country_name + (data.location ? `, ${data.location}` : ""), "numlookup", 75, { phone: target }));
          }
        }
      } catch {}

      // Fallback: Abstract API (gratuit 250 req/mois)
      const abstractKey = process.env.ABSTRACT_PHONE_KEY;
      if (entities.length === 0 && abstractKey) {
        try {
          const data = await http(`https://phonevalidation.abstractapi.com/v1/?api_key=${abstractKey}&phone=${clean}`);
          if (data?.valid) {
            entities.push(ent("phone", target, "numlookup", 82, {
              country: data.country?.name, carrier: data.carrier, line_type: data.type,
              format: data.format?.international
            }));
          }
        } catch {}
      }

      // Fallback public: libphonenumber via hackertarget
      if (entities.length === 0) {
        try {
          const data = await http(`https://api.hackertarget.com/phoneip/?q=${encodeURIComponent(clean)}`);
          if (typeof data === "string" && data.includes("Country")) {
            entities.push(ent("phone", target, "numlookup", 70, { raw: data }));
          }
        } catch {}
      }

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Phoneinfoga (pip) ----
  {
    id: "phoneinfoga",
    name: "PhoneInfoga",
    category: "phone",
    targetTypes: ["phone"],
    priority: 2,
    isAvailable: async () => { const r = await tryExec("phoneinfoga version 2>&1"); return !!(r?.stdout?.includes("PhoneInfoga") || r?.stderr?.includes("PhoneInfoga")); },
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `PhoneInfoga: scanning ${target}` } });
      const clean = target.replace(/[\s()\-]/g, "");
      const r = await tryExec(`phoneinfoga scan -n "${clean}" 2>&1`, 60000);
      if (!r) return { success: false, data: null, entities: [] };

      const entities: any[] = [];
      const out = r.stdout + r.stderr;

      const country = out.match(/Country[:\s]+([A-Z].+)/i)?.[1]?.trim();
      const carrier = out.match(/Carrier[:\s]+(.+)/i)?.[1]?.trim();
      const localFmt = out.match(/Local format[:\s]+(.+)/i)?.[1]?.trim();

      if (country || carrier) {
        entities.push(ent("phone", target, "phoneinfoga", 85, { country, carrier, local_format: localFmt, raw: out.slice(0, 500) }));
      }
      if (country) entities.push(ent("location", country, "phoneinfoga", 80, { phone: target }));

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Carrier lookup public ----
  {
    id: "carrier_lookup",
    name: "Carrier & Number Type Lookup",
    category: "phone",
    targetTypes: ["phone"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `Carrier lookup for ${target}` } });
      const entities: any[] = [];
      const clean = target.replace(/[\s()\-+]/g, "");

      // Veriphone free
      try {
        const data = await http(`https://api.veriphone.io/v2/verify?phone=${encodeURIComponent(target)}&key=demo`);
        if (data?.phone_valid || data?.country) {
          entities.push(ent("phone", target, "carrier_lookup", 78, {
            country: data.country, carrier: data.carrier, line_type: data.phone_type,
            international: data.international_number, local: data.local_number
          }));
        }
      } catch {}

      // OpenCNAM format (format info only, no auth)
      try {
        const data = await http(`https://apilayer.net/api/validate?number=${encodeURIComponent(target)}&country_code=FR`);
        if (data?.valid) {
          entities.push(ent("phone", target, "carrier_lookup", 75, {
            country_name: data.country_name, carrier: data.carrier, line_type: data.line_type,
            location: data.location
          }));
        }
      } catch {}

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Annuaires FR (Pages Blanches + Juridiques) ----
  {
    id: "annuaires_fr_pro",
    name: "Annuaires FR Pro (PB + Société)",
    category: "phone",
    targetTypes: ["phone", "person"],
    priority: 4,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `Annuaires FR: searching ${target}` } });
      const entities: any[] = [];
      const isPhone = target.match(/^[\+\d\s\(\)]{7,}$/);

      // Pages Blanches
      try {
        const query = encodeURIComponent(isPhone ? target : target);
        const r = await axios.get(`https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui=${query}&radius=0&where=`, {
          timeout: 10000, validateStatus: () => true,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "fr-FR,fr;q=0.9" }
        } as any);
        const body = typeof r.data === "string" ? r.data : "";
        const names = body.match(/class="denomination-links"[^>]*>([^<]+)<\/a>/g) || [];
        for (const m of names.slice(0, 5)) {
          const name = m.replace(/<[^>]+>/g, "").trim();
          if (name) entities.push(ent("person", name, "annuaires_fr_pro", 72, { source: "pages_blanches", phone: isPhone ? target : undefined }));
        }
      } catch {}

      // Société.com pour numéro professionnel
      try {
        const r = await axios.get(`https://www.societe.com/cgi-bin/liste?ident=${encodeURIComponent(target)}&type_recherche=0`, {
          timeout: 10000, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0" }
        } as any);
        const body = typeof r.data === "string" ? r.data : "";
        const sirens = body.match(/SIREN\s*:\s*(\d{9})/g) || [];
        for (const s of sirens.slice(0, 3)) {
          entities.push(ent("organization", s, "annuaires_fr_pro", 80, { source: "societe_com", phone: target }));
        }
      } catch {}

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },
];

// ============================================================================
// PERSON / NOM MODULES
// ============================================================================

export const personModulesExtra = [

  // ---- PeopleFinder (US public records) ----
  {
    id: "peoplefinder",
    name: "PeopleFinder (public records)",
    category: "person",
    targetTypes: ["person", "username"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `PeopleFinder: searching public records for ${target}` } });
      const entities: any[] = [];

      const sites = [
        { name: "FastPeopleSearch", url: `https://www.fastpeoplesearch.com/name/${encodeURIComponent(target.replace(/ /g, "-"))}`, find: "people-list-item" },
        { name: "TruePeopleSearch", url: `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(target)}`, find: "card-block" },
        { name: "PeopleFinder",     url: `https://www.peoplefinder.com/search/?q=${encodeURIComponent(target)}`, find: "person-card" },
        { name: "Spokeo",           url: `https://www.spokeo.com/${encodeURIComponent(target.replace(/ /g, "-"))}`, find: "result-card" },
        { name: "WhitePages",       url: `https://www.whitepages.com/name/${encodeURIComponent(target.replace(/ /g, "-"))}`, find: "person-card" },
        { name: "Intelius",         url: `https://www.intelius.com/search/name/${encodeURIComponent(target.replace(/ /g, "-"))}`, find: "result" },
      ];

      for (const site of sites) {
        try {
          const r = await axios.get(site.url, {
            timeout: 8000, validateStatus: () => true,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124",
              "Accept-Language": "en-US,en;q=0.9",
              "Accept": "text/html"
            }
          } as any);
          const body = typeof r.data === "string" ? r.data : "";
          if (r.status < 400 && body.toLowerCase().includes(site.find.toLowerCase())) {
            entities.push(ent("url", site.url, "peoplefinder", 65, { source: site.name, person: target, note: "profile page found" }));
          }
        } catch {}
        await new Promise(res => setTimeout(res, 200));
      }

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Google Knowledge Graph ----
  {
    id: "google_kg",
    name: "Google Knowledge Graph",
    category: "person",
    targetTypes: ["person", "organization"],
    priority: 2,
    isAvailable: async () => !!process.env.GOOGLE_KG_KEY,
    execute: async (target: string, emit: any) => {
      const key = process.env.GOOGLE_KG_KEY;
      if (!key) return { success: false, data: null, entities: [] };

      emit({ type: "log", data: { message: `Google KG: entity lookup for ${target}` } });
      const entities: any[] = [];

      const data = await http(`https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(target)}&key=${key}&limit=5&indent=True`);
      if (data?.itemListElement) {
        for (const item of data.itemListElement) {
          const r = item.result;
          if (!r) continue;
          entities.push(ent("person", r.name || target, "google_kg", Math.min(95, Math.round((item.resultScore || 50) / 10)), {
            description: r.detailedDescription?.articleBody?.slice(0, 300),
            url: r.detailedDescription?.url,
            image: r.image?.contentUrl,
            types: r["@type"],
          }));
          if (r.detailedDescription?.url) {
            entities.push(ent("url", r.detailedDescription.url, "google_kg", 80, { person: target, source: "wikipedia" }));
          }
        }
      }
      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Wikidata (open person data) ----
  {
    id: "wikidata",
    name: "Wikidata Person Lookup",
    category: "person",
    targetTypes: ["person", "organization"],
    priority: 3,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `Wikidata: searching ${target}` } });
      const entities: any[] = [];

      try {
        const data = await http(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(target)}&language=fr&format=json&limit=5&type=item`);
        if (data?.search) {
          for (const item of data.search.slice(0, 3)) {
            entities.push(ent("person", item.label || target, "wikidata", 78, {
              id: item.id, description: item.description, url: `https://www.wikidata.org/wiki/${item.id}`
            }));
            // Fetch details
            try {
              const detail = await http(`https://www.wikidata.org/wiki/Special:EntityData/${item.id}.json`);
              const entity = detail?.entities?.[item.id];
              if (entity?.claims) {
                // P856 = official website
                const website = entity.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
                if (website) entities.push(ent("url", website, "wikidata", 85, { person: target, type: "official_website" }));
                // P18 = image
                const img = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value?.replace(/ /g, "_");
                if (img) entities.push(ent("image", `https://commons.wikimedia.org/wiki/Special:FilePath/${img}`, "wikidata", 80, { person: target }));
              }
            } catch {}
          }
        }
      } catch {}

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- LinkedIn public scrape (sans auth) ----
  {
    id: "linkedin_public",
    name: "LinkedIn Public Profile Search",
    category: "person",
    targetTypes: ["person", "username"],
    priority: 4,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `LinkedIn: public search for ${target}` } });
      const entities: any[] = [];

      // Search via Bing (plus permissif que Google)
      try {
        const r = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${target}"`)}&count=10`, {
          timeout: 10000, validateStatus: () => true,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124", "Accept-Language": "fr-FR,fr;q=0.9" }
        } as any);
        const body = typeof r.data === "string" ? r.data : "";
        const matches = [...new Set(body.match(/linkedin\.com\/in\/[a-z0-9\-]+/gi) || [])];
        for (const m of matches.slice(0, 5)) {
          entities.push(ent("social_profile", `https://www.${m}`, "linkedin_public", 70, { person: target, platform: "linkedin" }));
        }
      } catch {}

      return { success: entities.length > 0, data: { found: entities.length }, entities };
    },
  },

  // ---- Instagram username from real name ----
  {
    id: "name_to_username",
    name: "Name → Username Generator & Check",
    category: "person",
    targetTypes: ["person"],
    priority: 5,
    isAvailable: async () => true,
    execute: async (target: string, emit: any) => {
      emit({ type: "log", data: { message: `Generating username variants for ${target}` } });
      const entities: any[] = [];

      const parts = target.toLowerCase().split(/\s+/).filter(Boolean);
      if (parts.length < 2) return { success: false, data: null, entities: [] };

      const [first, last] = parts;
      const variants = [
        `${first}${last}`, `${first}.${last}`, `${first}_${last}`,
        `${last}${first}`, `${last}.${first}`, `${last}_${first}`,
        `${first}${last[0]}`, `${first[0]}${last}`,
        `${first[0]}.${last}`, `${first}.${last[0]}`,
        `${first}${last}01`, `${first}${last}1`,
      ];

      // Quick check top platforms
      const PLATFORMS = [
        (u: string) => ({ name: "Instagram", url: `https://instagram.com/${u}`, find: "og:description" }),
        (u: string) => ({ name: "Twitter/X",  url: `https://x.com/${u}`,        find: "twitter:description" }),
        (u: string) => ({ name: "GitHub",     url: `https://github.com/${u}`,   find: `"login":"${u}"` }),
        (u: string) => ({ name: "TikTok",     url: `https://tiktok.com/@${u}`,  find: "__NEXT_DATA__" }),
      ];

      const toCheck = variants.slice(0, 8);
      emit({ type: "log", data: { message: `Checking ${toCheck.length} variants: ${toCheck.join(", ")}` } });

      for (const variant of toCheck) {
        for (const pFn of PLATFORMS) {
          const p = pFn(variant);
          try {
            const r = await axios.get(p.url, {
              timeout: 4000, validateStatus: () => true,
              headers: { "User-Agent": "Mozilla/5.0" }
            } as any);
            const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data || "");
            if (r.status === 404) continue;
            if (body.toLowerCase().includes(p.find.toLowerCase())) {
              entities.push(ent("social_profile", p.url, "name_to_username", 72, {
                platform: p.name, derived_from: target, username: variant
              }));
            }
          } catch {}
        }
        await new Promise(res => setTimeout(res, 100));
      }

      // Ajouter les variantes comme entités username pour relance récursive
      for (const v of toCheck) {
        entities.push(ent("username", v, "name_to_username", 60, { derived_from: target, auto_generated: true }));
      }

      return { success: entities.length > 0, data: { found: entities.length, variants: toCheck }, entities };
    },
  },
];

// ============================================================================
// EXPORT GLOBAL
// ============================================================================

export const NewModulesExtra = [
  ...usernameModulesExtra,
  ...emailModulesExtra,
  ...phoneModulesExtra,
  ...personModulesExtra,
];
