// ============================================================================
// SOCIAL DEEP SCAN — Phase 3
// SpiderFoot, Twitter/X deep, Facebook, Reddit, GitHub, pattern extraction
// Truecaller, GetContact, Recon-ng, Metagoofil, LinkedIn, Instagram, YouTube
// ============================================================================

import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function tryExec(cmd: string, ms = 30000) {
  try { return await execAsync(cmd, { timeout: ms, maxBuffer: 10 * 1024 * 1024 }); }
  catch (e: any) { return e.stdout ? { stdout: e.stdout, stderr: e.stderr || "" } : null; }
}

function eid() { return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function ent(type: string, value: string, source: string, confidence: number, metadata: any = {}) {
  return { id: eid(), type, value, source, confidence, metadata, verified: confidence >= 80, depth: 0 };
}

// ============================================================================
// PATTERN DETECTION ENGINE — extrait emails/phones/usernames/URLs de tout texte
// ============================================================================
export function extractPatterns(text: string, source: string, context: any = {}) {
  const entities: any[] = [];
  if (!text) return entities;

  const emails = [...new Set(text.match(/[\w.+\-]{2,}@[\w\-]{2,}\.[\w.]{2,}/g) || [])];
  for (const email of emails) {
    if (!email.includes("example.") && !email.includes(".png") && !email.includes(".jpg")) {
      entities.push(ent("email", email, source, 85, { ...context, extracted_from: "text_pattern" }));
    }
  }

  const phones = [...new Set(text.match(/(?:\+|00)[1-9]\d{6,14}|\b0[1-9](?:[\s.\-]?\d{2}){4}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g) || [])];
  for (const phone of phones) {
    const clean = phone.replace(/[\s.\-]/g, "");
    if (clean.length >= 8) {
      entities.push(ent("phone", phone.trim(), source, 75, { ...context, extracted_from: "text_pattern" }));
    }
  }

  const urls = [...new Set(text.match(/https?:\/\/[^\s"'<>)]+/g) || [])];
  for (const url of urls) {
    if (!url.match(/\.(png|jpg|jpeg|gif|svg|webp|mp4|mp3|ico)(\?|$)/i)) {
      entities.push(ent("url", url, source, 70, { ...context, extracted_from: "bio_link" }));
    }
  }

  const mentions = [...new Set(text.match(/@([a-zA-Z0-9_\.]{3,30})/g) || [])];
  for (const m of mentions) {
    entities.push(ent("username", m.slice(1), source, 65, { ...context, extracted_from: "mention" }));
  }

  return entities;
}

// ============================================================================
// SPIDERFOOT
// ============================================================================
export const SpiderFootModule = {
  id: "spiderfoot",
  name: "SpiderFoot (OSINT automation)",
  category: "search",
  targetTypes: ["username", "email", "domain", "ip", "phone", "person"],
  priority: 1,
  isAvailable: async () => {
    const r = await tryExec("python sf.py --help 2>&1");
    return !!(r?.stdout?.includes("SpiderFoot") || r?.stderr?.includes("SpiderFoot"));
  },
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `SpiderFoot autonomous scan for "${target}"...` } });
    const entities: any[] = [];

    const sfType = target.includes("@") ? "EMAILADDR"
      : target.match(/^\+?[\d\s()\-]{7,}$/) ? "PHONE_NUMBER"
      : target.match(/^(\d{1,3}\.){3}\d{1,3}$/) ? "IP_ADDRESS"
      : target.match(/^[\w-]+\.[\w.]{2,}$/) ? "INTERNET_NAME"
      : "USERNAME";

    const sfModules: Record<string, string> = {
      EMAILADDR: "sfp_emailformat,sfp_hashes,sfp_haveibeenpwned,sfp_hunter,sfp_pgp,sfp_social",
      PHONE_NUMBER: "sfp_numverify,sfp_opencnam,sfp_social",
      INTERNET_NAME: "sfp_dns,sfp_whois,sfp_ssl,sfp_cert,sfp_shodan,sfp_subfinder",
      IP_ADDRESS: "sfp_ipinfo,sfp_abuseipdb,sfp_shodan,sfp_virustotal,sfp_bgpview",
      USERNAME: "sfp_accounts,sfp_social,sfp_github,sfp_reddit,sfp_twitter",
    };

    // Mode 1: SF HTTP API (serveur local :5001)
    try {
      const startResp = await axios.post("http://localhost:5001/startscan",
        new URLSearchParams({ scanname: `osint_${Date.now()}`, scantarget: target, typelist: sfType, modulelist: sfModules[sfType] || sfModules.USERNAME, usecase: "footprint" }).toString(),
        { timeout: 10000, headers: { "Content-Type": "application/x-www-form-urlencoded" } } as any
      );
      const scanId = (startResp.data as any)?.id;
      if (scanId) {
        emit({ type: "log", data: { message: `SpiderFoot scan ${scanId} started...` } });
        await new Promise(r => setTimeout(r, 20000));
        const results = await axios.get(`http://localhost:5001/scaneventresults?id=${scanId}&eventType=ALL`, { timeout: 10000 } as any);
        for (const item of ((results.data as any[]) || []).slice(0, 30)) {
          const [, , , data, , sfT] = item;
          if (!data) continue;
          const type = sfT?.includes("EMAIL") ? "email" : sfT?.includes("PHONE") ? "phone" : sfT?.includes("SOCIAL") ? "social_profile" : "metadata";
          entities.push(ent(type, String(data), "spiderfoot", 82, { sf_type: sfT, target }));
        }
      }
    } catch {}

    // Mode 2: CLI
    if (entities.length === 0) {
      const r = await tryExec(`python sf.py -s "${target}" -t "${sfType}" -m "${sfModules[sfType] || sfModules.USERNAME}" -q 2>&1`, 120000);
      if (r?.stdout) {
        const emailMatches = r.stdout.match(/[\w.+-]+@[\w.-]+\.\w+/g) || [];
        for (const email of [...new Set(emailMatches as string[])]) {
          entities.push(ent("email", email, "spiderfoot", 78, { target }));
        }
      }
    }

    return { success: entities.length > 0, data: { target, found: entities.length }, entities };
  },
};

// ============================================================================
// TWITTER / X DEEP
// ============================================================================
export const TwitterDeepModule = {
  id: "twitter_deep",
  name: "Twitter/X Deep Scan",
  category: "social",
  targetTypes: ["username"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Twitter/X deep scan for @${target}...` } });
    const clean = target.replace(/^@/, "");
    const entities: any[] = [];

    // fxtwitter (no auth)
    try {
      const resp = await axios.get(`https://api.fxtwitter.com/${clean}`, { timeout: 8000 } as any);
      const u = (resp.data as any)?.user;
      if (u) {
        entities.push(ent("social_profile", `https://twitter.com/${clean}`, "twitter_deep", 92, {
          platform: "Twitter/X", username: clean, displayName: u.name,
          description: u.description, followers: u.followers, following: u.following,
          tweets: u.tweets, verified: u.verified, created: u.joined,
          location: u.location, website: u.website,
        }));
        if (u.name && u.name !== clean) entities.push(ent("person", u.name, "twitter_deep", 88, { username: clean }));
        if (u.location) entities.push(ent("location", u.location, "twitter_deep", 72, { username: clean }));
        if (u.website) entities.push(ent("url", u.website, "twitter_deep", 85, { username: clean, type: "website" }));
        if (u.description) entities.push(...extractPatterns(u.description, "twitter_bio", { username: clean }));
        emit({ type: "log", data: { message: `@${clean}: ${u.followers} followers` } });
      }
    } catch {}

    // CDN syndication (fallback, no auth)
    try {
      const resp = await axios.get(
        `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${clean}`,
        { timeout: 8000 } as any
      );
      const users = resp.data as any[];
      if (Array.isArray(users) && users[0] && !entities.find(e => e.type === "social_profile")) {
        const u = users[0];
        entities.push(ent("social_profile", `https://twitter.com/${clean}`, "twitter_deep", 85, {
          platform: "Twitter/X", username: clean, displayName: u.name, followers: u.followers_count,
        }));
        if (u.name && u.name !== clean) entities.push(ent("person", u.name, "twitter_deep", 80, { username: clean }));
      }
    } catch {}

    return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
  },
};

// ============================================================================
// FACEBOOK OSINT
// ============================================================================
export const FacebookModule = {
  id: "facebook_osint",
  name: "Facebook OSINT",
  category: "social",
  targetTypes: ["username", "person"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Facebook OSINT for "${target}"...` } });
    const entities: any[] = [];
    const clean = target.replace(/^@/, "").replace(/\s+/g, ".");

    try {
      const r = await axios.get(`https://www.facebook.com/${clean}`, {
        timeout: 10000,
        headers: {
          "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          "Accept-Language": "fr-FR,fr;q=0.9",
        },
        validateStatus: () => true,
      } as any);
      const html = r.data as string;
      if (r.status < 400 && html?.includes("fb.com")) {
        const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]?.trim();
        const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1]?.trim();
        const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
        const fbId = html.match(/"entity_id":"(\d+)"/)?.[1] || html.match(/profile_id=(\d+)/)?.[1];

        if (ogTitle && !ogTitle.toLowerCase().includes("facebook")) {
          entities.push(ent("social_profile", `https://www.facebook.com/${clean}`, "facebook_osint", 80, {
            platform: "Facebook", username: clean, displayName: ogTitle, description: ogDesc, avatar: ogImage, fbId,
          }));
          if (ogTitle !== clean) entities.push(ent("person", ogTitle, "facebook_osint", 78, { username: clean }));
          if (ogDesc) entities.push(...extractPatterns(ogDesc, "facebook_bio", { username: clean }));
        }
      }
    } catch {}

    // Facebook search pour noms complets
    if (target.includes(" ")) {
      try {
        const r = await axios.get(`https://www.facebook.com/public/${encodeURIComponent(target.replace(/\s+/g, "-"))}`, {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          validateStatus: () => true,
        } as any);
        const html = r.data as string;
        if (html) {
          const profileUrls = [...new Set(
            (html.match(/href="(https?:\/\/www\.facebook\.com\/[^"?&]+)"/g) || [])
              .map((m: string) => m.replace(/href="|"$/g, ""))
              .filter((u: string) => !u.includes("/groups/") && !u.includes("/pages/") && !u.includes("/events/"))
          )].slice(0, 5) as string[];
          for (const url of profileUrls) {
            entities.push(ent("social_profile", url, "facebook_search", 65, { person: target, platform: "Facebook" }));
          }
        }
      } catch {}
    }

    return { success: entities.length > 0, data: { target, found: entities.length }, entities };
  },
};

// ============================================================================
// REDDIT DEEP
// ============================================================================
export const RedditDeepModule = {
  id: "reddit_deep",
  name: "Reddit Deep Scan",
  category: "social",
  targetTypes: ["username"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Reddit deep scan for u/${target}...` } });
    const clean = target.replace(/^u\//i, "").replace(/^@/, "");
    const entities: any[] = [];
    const UA = "OSINT-Master/5.0 (by u/osint_scanner)";

    try {
      const about = await axios.get(`https://www.reddit.com/user/${clean}/about.json`, {
        timeout: 10000, headers: { "User-Agent": UA }, validateStatus: () => true,
      } as any);
      const d = (about.data as any)?.data;
      if (d?.name) {
        entities.push(ent("social_profile", `https://www.reddit.com/u/${clean}`, "reddit_deep", 92, {
          platform: "Reddit", username: clean,
          karma: (d.link_karma || 0) + (d.comment_karma || 0),
          postKarma: d.link_karma, commentKarma: d.comment_karma,
          created: new Date(d.created_utc * 1000).toISOString(),
          verified: d.has_verified_email, isMod: d.is_mod,
          description: d.subreddit?.public_description,
        }));
        if (d.subreddit?.public_description) {
          entities.push(...extractPatterns(d.subreddit.public_description, "reddit_bio", { username: clean }));
        }
      }
    } catch {}

    // Posts récents
    try {
      const posts = await axios.get(`https://www.reddit.com/user/${clean}/submitted.json?limit=25&sort=new`, {
        timeout: 10000, headers: { "User-Agent": UA }, validateStatus: () => true,
      } as any);
      const postList = (posts.data as any)?.data?.children || [];
      const subreddits = new Set<string>();

      for (const p of postList) {
        const d = p.data;
        if (!d) continue;
        subreddits.add(d.subreddit);
        if (d.selftext) entities.push(...extractPatterns(d.selftext, "reddit_posts", { username: clean }));
        const locMatch = d.subreddit?.match(/^(paris|lyon|marseille|toulouse|bordeaux|france|belgique|montreal|canada|london|berlin)/i);
        if (locMatch) entities.push(ent("location", d.subreddit, "reddit_pattern", 60, { username: clean, inferred_from: "subreddit" }));
      }

      if (subreddits.size > 0) {
        entities.push(ent("metadata", `Subreddits: r/${[...subreddits].slice(0, 10).join(", r/")}`, "reddit_deep", 75, { username: clean, subreddits: [...subreddits] }));
      }
    } catch {}

    // Comments récents
    try {
      const comments = await axios.get(`https://www.reddit.com/user/${clean}/comments.json?limit=25&sort=new`, {
        timeout: 10000, headers: { "User-Agent": UA }, validateStatus: () => true,
      } as any);
      const commentList = (comments.data as any)?.data?.children || [];
      const combined = commentList.map((c: any) => c.data?.body || "").join("\n");
      if (combined) entities.push(...extractPatterns(combined, "reddit_comments", { username: clean }));
    } catch {}

    return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
  },
};

// ============================================================================
// GITHUB DEEP
// ============================================================================
export const GitHubDeepModule = {
  id: "github_deep",
  name: "GitHub Deep OSINT",
  category: "social",
  targetTypes: ["username", "email"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `GitHub deep OSINT for "${target}"...` } });
    const isEmail = target.includes("@");
    const entities: any[] = [];
    const ghKey = process.env.GITHUB_TOKEN;
    const headers: any = { "User-Agent": "OSINT-Master/5.0", "Accept": "application/vnd.github.v3+json" };
    if (ghKey) headers["Authorization"] = `token ${ghKey}`;

    let username = isEmail ? "" : target.replace(/^@/, "");

    if (isEmail) {
      try {
        const r = await axios.get(`https://api.github.com/search/users?q=${encodeURIComponent(target)}&per_page=3`, { headers, timeout: 10000 } as any);
        for (const u of (r.data as any)?.items || []) {
          entities.push(ent("social_profile", u.html_url, "github_deep", 88, { platform: "GitHub", username: u.login, email: target }));
          if (!username) username = u.login;
        }
      } catch {}
    }

    if (!username) return { success: entities.length > 0, data: { target, found: entities.length }, entities };

    // Profil complet
    try {
      const r = await axios.get(`https://api.github.com/users/${username}`, { headers, timeout: 10000 } as any);
      const user = r.data as any;
      if (user?.login) {
        entities.push(ent("social_profile", user.html_url, "github_deep", 95, {
          platform: "GitHub", username: user.login, displayName: user.name,
          email: user.email, bio: user.bio, company: user.company,
          location: user.location, website: user.blog,
          followers: user.followers, repos: user.public_repos, created: user.created_at,
        }));
        if (user.name) entities.push(ent("person", user.name, "github_deep", 90, { username }));
        if (user.email) entities.push(ent("email", user.email, "github_deep", 95, { username, source: "public_profile" }));
        if (user.location) entities.push(ent("location", user.location, "github_deep", 82, { username }));
        if (user.blog) entities.push(ent("url", user.blog.startsWith("http") ? user.blog : `https://${user.blog}`, "github_deep", 88, { username }));
        if (user.company) entities.push(ent("organization", user.company.replace(/^@/, ""), "github_deep", 82, { username }));
        if (user.bio) entities.push(...extractPatterns(user.bio, "github_bio", { username }));
        emit({ type: "log", data: { message: `GitHub @${username}: ${user.followers} followers, ${user.public_repos} repos` } });
      }
    } catch {}

    // Commit email harvest
    try {
      const reposR = await axios.get(`https://api.github.com/users/${username}/repos?per_page=10&sort=updated`, { headers, timeout: 10000 } as any);
      const repos = reposR.data as any[];
      const emailsFound = new Set<string>();

      for (const repo of (repos || []).slice(0, 5)) {
        try {
          const commitsR = await axios.get(`https://api.github.com/repos/${username}/${repo.name}/commits?per_page=5`, { headers, timeout: 8000 } as any);
          for (const c of (commitsR.data as any[] || []).slice(0, 5)) {
            const email = c.commit?.author?.email || c.commit?.committer?.email;
            const name = c.commit?.author?.name || c.commit?.committer?.name;
            if (email && !email.includes("noreply.github") && !emailsFound.has(email)) {
              emailsFound.add(email);
              entities.push(ent("email", email, "github_commits", 88, { username, repo: repo.name, name }));
              if (name && name !== username) entities.push(ent("person", name, "github_commits", 80, { email, username }));
            }
          }
        } catch {}
      }
      if (emailsFound.size > 0) emit({ type: "log", data: { message: `Commit emails: ${[...emailsFound].join(", ")}` } });
    } catch {}

    // Orgs
    try {
      const orgsR = await axios.get(`https://api.github.com/users/${username}/orgs`, { headers, timeout: 8000 } as any);
      for (const org of ((orgsR.data as any[]) || []).slice(0, 5)) {
        entities.push(ent("organization", org.login, "github_deep", 85, { username }));
      }
    } catch {}

    // Gists — peuvent contenir configs, clés, emails
    try {
      const gistsR = await axios.get(`https://api.github.com/users/${username}/gists?per_page=5`, { headers, timeout: 8000 } as any);
      for (const g of ((gistsR.data as any[]) || []).slice(0, 3)) {
        for (const [, file] of Object.entries(g.files || {}) as [string, any][]) {
          if (file.size < 5000 && file.raw_url) {
            try {
              const contentR = await axios.get(file.raw_url, { timeout: 6000 } as any);
              if (typeof contentR.data === "string") {
                entities.push(...extractPatterns(contentR.data, "github_gist", { username, gist_id: g.id }));
              }
            } catch {}
          }
        }
      }
    } catch {}

    return { success: entities.length > 0, data: { username, found: entities.length }, entities };
  },
};

// ============================================================================
// PHONE ENRICHMENT (Truecaller / GetContact / CallApp)
// ============================================================================
export const PhoneEnrichmentModule = {
  id: "phone_enrichment",
  name: "Phone Enrichment (Truecaller/GetContact)",
  category: "phone",
  targetTypes: ["phone"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Phone enrichment for ${target}...` } });
    const entities: any[] = [];
    const clean = target.replace(/[\s()\-]/g, "");

    // Truecaller (token public connu)
    try {
      const r = await axios.get(
        `https://search5-noneu.truecaller.com/v2/search?q=${encodeURIComponent(clean)}&countryCode=FR&type=4&locales=fr`,
        {
          timeout: 10000,
          headers: {
            "Authorization": "Bearer dKFe1SrElPTUy0TmB0iSyEZBm3Oq7A2B",
            "User-Agent": "Truecaller/11.75.5 (Android;10)",
          },
          validateStatus: () => true,
        } as any
      );
      const result = (r.data as any)?.data?.[0];
      if (result?.name) {
        entities.push(ent("person", result.name, "truecaller", 88, {
          phone: target, carrier: result.phones?.[0]?.carrier,
          city: result.addresses?.[0]?.city, country: result.addresses?.[0]?.countryCode,
          score: result.score,
        }));
        if (result.addresses?.[0]?.city) {
          entities.push(ent("location", `${result.addresses[0].city}, ${result.addresses[0].countryCode || ""}`, "truecaller", 78, { phone: target }));
        }
        for (const addr of (result.internetAddresses || []).slice(0, 3)) {
          if (addr.service && addr.id) {
            entities.push(ent("social_profile", String(addr.id), "truecaller", 80, { phone: target, platform: addr.service }));
          }
        }
        emit({ type: "log", data: { message: `Truecaller: ${result.name} (${result.phones?.[0]?.carrier})` } });
      }
    } catch {}

    // GetContact
    try {
      const r = await axios.post(
        "https://web.getcontact.com/api/v1/search",
        { phoneNumber: clean },
        { timeout: 8000, headers: { "Content-Type": "application/json" }, validateStatus: () => true } as any
      );
      const d = r.data as any;
      if (d?.name || d?.names?.length) {
        const name = d.name || d.names?.[0]?.name;
        if (name) entities.push(ent("person", name, "getcontact", 80, { phone: target, tags: d.tags }));
      }
    } catch {}

    return { success: entities.length > 0, data: { phone: target, found: entities.length }, entities };
  },
};

// ============================================================================
// RECON-NG
// ============================================================================
export const ReconNgModule = {
  id: "recon_ng",
  name: "Recon-ng",
  category: "search",
  targetTypes: ["domain", "person", "email", "username"],
  priority: 3,
  isAvailable: async () => {
    const r = await tryExec("recon-ng --version 2>&1");
    return !!(r?.stdout?.includes("recon-ng") || r?.stderr?.includes("recon-ng"));
  },
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Recon-ng scan for "${target}"...` } });
    const entities: any[] = [];
    const isDomain = !target.includes("@") && !target.includes(" ") && target.match(/^[\w-]+\.[\w.]{2,}$/);
    const modules = isDomain
      ? ["recon/domains-hosts/hackertarget", "recon/domains-contacts/whois_pocs"]
      : ["recon/profiles-profiles/namechk"];

    try {
      const fs = await import("fs");
      const scriptFile = `${process.env.TEMP || "/tmp"}/reconng_${Date.now()}.rc`;
      const cmds = modules.map(m => `modules load ${m}\noptions set SOURCE ${target}\nrun`).join("\n");
      fs.writeFileSync(scriptFile, cmds);
      const r = await tryExec(`recon-ng -r "${scriptFile}" --no-check 2>&1`, 90000);
      if (r?.stdout) {
        const emailMatches = r.stdout.match(/[\w.+-]+@[\w.-]+\.\w+/g) || [];
        const urlMatches = r.stdout.match(/https?:\/\/[^\s]+/g) || [];
        for (const email of [...new Set(emailMatches as string[])]) {
          entities.push(ent("email", email, "recon_ng", 80, { target }));
        }
        for (const url of ([...new Set(urlMatches as string[])] as string[]).slice(0, 10)) {
          entities.push(ent("url", url, "recon_ng", 70, { target }));
        }
        try { fs.unlinkSync(scriptFile); } catch {}
      }
    } catch {}

    return { success: entities.length > 0, data: { target, found: entities.length }, entities };
  },
};

// ============================================================================
// METAGOOFIL
// ============================================================================
export const MetagoofilModule = {
  id: "metagoofil",
  name: "Metagoofil (document metadata)",
  category: "search",
  targetTypes: ["domain", "person", "organization"],
  priority: 4,
  isAvailable: async () => {
    const r = await tryExec("metagoofil --help 2>&1");
    return !!(r?.stdout?.includes("metagoofil") || r?.stderr?.includes("metagoofil"));
  },
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Metagoofil: document metadata for "${target}"...` } });
    const entities: any[] = [];
    const outDir = `${process.env.TEMP || "/tmp"}/meta_${Date.now()}`;
    try {
      const fs = await import("fs");
      fs.mkdirSync(outDir, { recursive: true });
      const r = await tryExec(
        `metagoofil -d "${target}" -t pdf,doc,docx,xls,xlsx -l 20 -n 5 -o "${outDir}" 2>&1`,
        120000
      );
      const out = r?.stdout || "";
      const emails = [...new Set(out.match(/[\w.+-]+@[\w.-]+\.\w+/g) || [])];
      const names = out.match(/Author:\s*([^\n]+)/gi) || [];
      for (const email of emails as string[]) entities.push(ent("email", email, "metagoofil", 82, { domain: target }));
      for (const n of names.slice(0, 10)) {
        const name = (n as string).replace(/Author:\s*/i, "").trim();
        if (name.length > 2 && name.length < 60) entities.push(ent("person", name, "metagoofil", 75, { domain: target }));
      }
      try { fs.rmSync(outDir, { recursive: true, force: true }); } catch {}
    } catch {}
    return { success: entities.length > 0, data: { target, found: entities.length }, entities };
  },
};

// ============================================================================
// LINKEDIN DEEP
// ============================================================================
export const LinkedInDeepModule = {
  id: "linkedin_deep",
  name: "LinkedIn Deep Scrape",
  category: "social",
  targetTypes: ["person", "username", "email"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `LinkedIn deep scan for "${target}"...` } });
    const entities: any[] = [];

    // Bing scrape LinkedIn
    try {
      const r = await axios.get(
        `https://www.bing.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${target}"`)}&count=10`,
        {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "fr-FR" },
          validateStatus: () => true,
        } as any
      );
      const html = r.data as string;
      if (html) {
        const matches = [...new Set((html.match(/linkedin\.com\/in\/[a-z0-9\-]+/gi) || []) as string[])];
        for (const m of matches.slice(0, 5)) {
          entities.push(ent("social_profile", `https://www.${m}`, "linkedin_deep", 72, { person: target, platform: "LinkedIn" }));
        }
      }
    } catch {}

    // Proxycurl (si clé dispo)
    const proxycurlKey = process.env.PROXYCURL_KEY;
    if (proxycurlKey) {
      try {
        const r = await axios.get(
          `https://nubela.co/proxycurl/api/v2/linkedin?url=https://www.linkedin.com/in/${encodeURIComponent(target)}&use_cache=if-present`,
          { timeout: 15000, headers: { "Authorization": `Bearer ${proxycurlKey}` }, validateStatus: () => true } as any
        );
        const d = r.data as any;
        if (d?.full_name) {
          entities.push(ent("social_profile", `https://www.linkedin.com/in/${target}`, "linkedin_proxycurl", 95, {
            platform: "LinkedIn", displayName: d.full_name, headline: d.headline,
            location: d.city || d.country_full_name, company: d.experiences?.[0]?.company,
          }));
          if (d.full_name) entities.push(ent("person", d.full_name, "linkedin_proxycurl", 92, { platform: "LinkedIn" }));
          for (const email of (d.personal_emails || [])) entities.push(ent("email", String(email), "linkedin_proxycurl", 90, { person: d.full_name }));
          for (const phone of (d.personal_numbers || [])) entities.push(ent("phone", String(phone), "linkedin_proxycurl", 88, { person: d.full_name }));
        }
      } catch {}
    }

    return { success: entities.length > 0, data: { target, found: entities.length }, entities };
  },
};

// ============================================================================
// INSTAGRAM DEEP
// ============================================================================
export const InstagramDeepModule = {
  id: "instagram_deep",
  name: "Instagram Deep Extraction",
  category: "social",
  targetTypes: ["username"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Instagram deep extraction for @${target}...` } });
    const clean = target.replace(/^@/, "");
    const entities: any[] = [];

    try {
      const r = await axios.get(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${clean}`,
        {
          timeout: 12000,
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
            "X-IG-App-ID": "936619743392459",
            "Referer": `https://www.instagram.com/${clean}/`,
          },
          validateStatus: () => true,
        } as any
      );
      const u = (r.data as any)?.data?.user;
      if (u) {
        const bio = u.biography || "";
        entities.push(ent("social_profile", `https://www.instagram.com/${clean}/`, "instagram_deep", 95, {
          platform: "Instagram", username: clean, userId: u.id,
          displayName: u.full_name, bio,
          followers: u.edge_followed_by?.count, following: u.edge_follow?.count,
          posts: u.edge_owner_to_timeline_media?.count,
          verified: u.is_verified, private: u.is_private,
          businessCategory: u.business_category_name, externalUrl: u.external_url,
        }));
        if (u.full_name && u.full_name !== clean) entities.push(ent("person", u.full_name, "instagram_deep", 90, { username: clean }));
        if (u.external_url) entities.push(ent("url", u.external_url, "instagram_deep", 88, { username: clean, type: "bio_link" }));
        if (bio) entities.push(...extractPatterns(bio, "instagram_bio", { username: clean }));

        // Business contact info (souvent public)
        if (u.business_email) entities.push(ent("email", u.business_email, "instagram_deep", 95, { username: clean, type: "business_email" }));
        if (u.business_phone_number) entities.push(ent("phone", u.business_phone_number, "instagram_deep", 95, { username: clean }));
        if (u.business_address_json) {
          try {
            const addr = JSON.parse(u.business_address_json);
            const loc = [addr.street_address, addr.city_name, addr.region_name, addr.country_code].filter(Boolean).join(", ");
            if (loc) entities.push(ent("location", loc, "instagram_deep", 90, { username: clean, type: "business_address" }));
          } catch {}
        }

        emit({ type: "log", data: { message: `@${clean}: ${u.edge_followed_by?.count} followers` } });

        // Locations et hashtags dans les posts
        if (!u.is_private) {
          const mediaEdges = u.edge_owner_to_timeline_media?.edges || [];
          const locations = new Set<string>();
          const hashtags = new Set<string>();
          for (const edge of mediaEdges.slice(0, 12)) {
            const node = edge.node;
            if (!node) continue;
            if (node.location?.name) locations.add(node.location.name);
            const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || "";
            (caption.match(/#[\w\u00C0-\u024F]+/g) || []).forEach((t: string) => hashtags.add(t));
            if (caption) entities.push(...extractPatterns(caption, "instagram_caption", { username: clean }));
          }
          for (const loc of [...locations].slice(0, 5)) {
            entities.push(ent("location", loc, "instagram_deep", 80, { username: clean, inferred_from: "post_location" }));
          }
          if (hashtags.size > 0) {
            entities.push(ent("metadata", `Hashtags: ${[...hashtags].slice(0, 15).join(", ")}`, "instagram_deep", 70, { username: clean }));
          }
        }
      }
    } catch {}

    return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
  },
};

// ============================================================================
// YOUTUBE DEEP
// ============================================================================
export const YouTubeDeepModule = {
  id: "youtube_deep",
  name: "YouTube Deep OSINT",
  category: "social",
  targetTypes: ["username", "person"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `YouTube OSINT for "${target}"...` } });
    const entities: any[] = [];
    const clean = target.replace(/^@/, "");

    try {
      const r = await axios.get(`https://www.youtube.com/@${clean}`, {
        timeout: 12000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        validateStatus: () => true,
      } as any);
      const html = r.data as string;
      if (r.status < 400 && html?.includes("channelId")) {
        const channelId = html.match(/"channelId":"([^"]+)"/)?.[1];
        const displayName = html.match(/"author":"([^"]+)"/)?.[1]
          || html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1];
        const description = html.match(/"description":"([^"]{0,500})"/)?.[1];
        const subscribers = html.match(/"subscriberCountText":"([^"]+)"/)?.[1];
        const country = html.match(/"country":"([^"]+)"/)?.[1];

        if (displayName) {
          entities.push(ent("social_profile", `https://www.youtube.com/@${clean}`, "youtube_deep", 88, {
            platform: "YouTube", username: clean, channelId, displayName,
            description: description?.replace(/\\n/g, " "), subscribers, country,
          }));
          if (displayName !== clean) entities.push(ent("person", displayName, "youtube_deep", 82, { username: clean }));
          if (country) entities.push(ent("location", country, "youtube_deep", 75, { username: clean }));
          if (description) entities.push(...extractPatterns(description, "youtube_description", { username: clean }));

          const aboutLinks = [...(html.match(/"url":"(https?:\/\/[^"]+)"/g) || [])]
            .map((m: string) => m.replace(/"url":"/, "").replace(/"$/, ""))
            .filter((u: string) => !u.includes("youtube.com") && !u.includes("google.com"))
            .slice(0, 5);
          for (const link of [...new Set(aboutLinks)] as string[]) {
            entities.push(ent("url", link, "youtube_deep", 80, { username: clean }));
          }
        }
      }
    } catch {}

    return { success: entities.length > 0, data: { target, found: entities.length }, entities };
  },
};

// ============================================================================
// EXPORT
// ============================================================================
export const SocialDeepModules = [
  SpiderFootModule,
  TwitterDeepModule,
  FacebookModule,
  RedditDeepModule,
  GitHubDeepModule,
  PhoneEnrichmentModule,
  ReconNgModule,
  MetagoofilModule,
  LinkedInDeepModule,
  InstagramDeepModule,
  YouTubeDeepModule,
];
