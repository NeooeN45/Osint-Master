// ============================================================================
// INSTAGRAM ULTIMATE 2 — 7 nouveaux modules OSINT inspirés de :
//  - authentic8.com/blog/osint-instagram-guide
//  - github.com/Datalux/Osintgram
//  - gist sundowndev/GoogleDorking
// ============================================================================
// ig_google_dorks · ig_about_account · ig_anonymous_viewers · ig_post_exif
// ig_caption_analyzer · ig_tagged_by · ig_osint_suite (agrégation)
// ============================================================================

import axios from "axios";
import https from "https";

const NO_SSL = new https.Agent({ rejectUnauthorized: false });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
function eid() { return `igu2_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function ent(type: string, value: string, source: string, confidence: number, metadata: any = {}) {
  return { id: eid(), type, value, source, confidence, metadata, verified: confidence >= 80, depth: 0 };
}

const axget = (url: string, cfg: any = {}) => axios.get(url, {
  httpsAgent: NO_SSL, validateStatus: () => true, timeout: 15000,
  headers: { "User-Agent": UA, ...(cfg.headers || {}) },
  ...cfg,
} as any);

// Cookie IG session si dispo
function igCookieHeader() {
  const sid = (process.env.IG_SESSION_ID || "").split(",")[0]?.trim();
  const csrf = (process.env.IG_CSRF_TOKEN || "").trim();
  if (!sid) return {};
  const parts = [`sessionid=${sid}`];
  if (csrf) parts.push(`csrftoken=${csrf}`);
  return { Cookie: parts.join("; "), "X-CSRFToken": csrf || undefined };
}

async function bingSearch(query: string, max: number = 20): Promise<string[]> {
  const urls: string[] = [];
  try {
    const r = await axget(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${max}`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    const html = String(r.data || "");
    const rx = /<a[^>]+href="(https?:\/\/[^"]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html)) && urls.length < max * 2) {
      const u = m[1];
      if (/bing\.com|microsoft\.com|msn\.com|live\.com|r\.bing\.com|th\.bing\.com/.test(u)) continue;
      urls.push(u);
    }
  } catch {}
  return urls;
}
async function ddgSearch(query: string, max: number = 20): Promise<string[]> {
  const urls: string[] = [];
  try {
    const r = await axget(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const html = String(r.data || "");
    const rx = /uddg=([^"&]+)/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html)) && urls.length < max * 2) {
      try { urls.push(decodeURIComponent(m[1])); } catch {}
    }
    // Fallback if uddg not present (newer DDG)
    if (!urls.length) {
      const rx2 = /<a[^>]+class="result__a"[^>]+href="(https?:\/\/[^"]+)"/gi;
      while ((m = rx2.exec(html)) && urls.length < max * 2) urls.push(m[1]);
    }
  } catch {}
  return urls;
}
// Jina.ai reader proxifie Google → très efficace pour dorks
async function jinaGoogleSearch(query: string, max: number = 20): Promise<string[]> {
  const urls: string[] = [];
  try {
    const r = await axget(`https://r.jina.ai/https://www.google.com/search?q=${encodeURIComponent(query)}&num=${max}`, {
      headers: { "Accept": "text/plain", "User-Agent": UA },
      timeout: 20000,
    });
    const text = String(r.data || "");
    // Jina retourne du markdown avec des liens
    const rx = /https?:\/\/[^\s)"'<>]+/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) && urls.length < max * 2) {
      const u = m[0];
      if (/google\.|gstatic\.|jina\.ai|youtube\.com\/watch/.test(u)) continue;
      urls.push(u.replace(/[.,)]+$/, ""));
    }
  } catch {}
  return urls;
}
async function multiSearch(query: string, max = 20): Promise<string[]> {
  const [a, b, c] = await Promise.all([
    bingSearch(query, max),
    ddgSearch(query, max),
    jinaGoogleSearch(query, max),
  ]);
  return [...new Set([...a, ...b, ...c])];
}

function extractIgHandles(urls: string[]): Map<string, string> {
  const handles = new Map<string, string>();
  const skip = new Set(["explore", "p", "reel", "reels", "stories", "tv", "accounts", "about", "directory", "web", "developer", "legal", "privacy", "help"]);
  for (const u of urls) {
    const m = u.match(/instagram\.com\/([A-Za-z0-9_.]{2,30})(?:\/|$|\?|#)/i);
    if (!m) continue;
    const uname = m[1].toLowerCase();
    if (skip.has(uname)) continue;
    if (!handles.has(uname)) handles.set(uname, u);
  }
  return handles;
}

// ============================================================================
// 1. IG_GOOGLE_DORKS — dorks authentic8 + sundowndev pour username/name/hashtag
// ============================================================================
export const IgGoogleDorksModule = {
  id: "ig_google_dorks",
  name: "Instagram Google/Bing/DDG Dorks (authentic8 recipe)",
  category: "social",
  targetTypes: ["username", "person", "email"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const q = target.trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG Dorks] lancement dorks pour "${q}"` } });

    // Dorks authentic8 + variations
    const dorks = [
      `"${q}" site:instagram.com`,
      `"${q}" inurl:instagram.com`,
      `site:instagram.com inurl:/p/ "${q}"`,       // posts
      `site:instagram.com inurl:/reel/ "${q}"`,    // reels
      `site:instagram.com inurl:explore/tags/ "${q}"`, // hashtag pages
      `"instagram.com/${q}" -site:instagram.com`,  // back-links
    ];

    const handles = new Map<string, Set<string>>();
    const posts: { url: string; dork: string }[] = [];
    const mentions: string[] = [];

    for (const dork of dorks) {
      const urls = await multiSearch(dork, 15);
      emit({ type: "log", data: { message: `[IG Dorks] «${dork}» → ${urls.length} résultats` } });
      for (const u of urls) {
        // Posts IG
        if (/instagram\.com\/(p|reel|tv)\/[\w-]+/.test(u)) {
          posts.push({ url: u, dork });
          continue;
        }
        // Profils IG
        const h = extractIgHandles([u]);
        for (const [uname, src] of h) {
          if (!handles.has(uname)) handles.set(uname, new Set());
          handles.get(uname)!.add(dork);
        }
        // Mentions externes
        if (!u.includes("instagram.com") && (u.includes(q.toLowerCase()) || u.toLowerCase().includes(q.toLowerCase()))) {
          mentions.push(u);
        }
      }
      await sleep(300);
    }

    for (const [uname, dorksUsed] of handles) {
      const conf = dorksUsed.size >= 2 ? 78 : 65;
      entities.push(ent("social_profile", `https://www.instagram.com/${uname}/`, "ig_google_dorks", conf, {
        platform: "Instagram", username: uname, foundInDorks: [...dorksUsed], searchedFor: q,
      }));
    }
    for (const p of posts.slice(0, 20)) {
      entities.push(ent("url", p.url, "ig_google_dorks", 70, {
        type: "ig_post", viaDork: p.dork, searchedFor: q,
      }));
    }
    for (const m of mentions.slice(0, 15)) {
      entities.push(ent("url", m, "ig_google_dorks", 55, { type: "external_mention", searchedFor: q }));
    }

    emit({ type: "log", data: { message: `[IG Dorks] ${handles.size} comptes, ${posts.length} posts, ${mentions.length} mentions externes` } });
    return { success: entities.length > 0, data: { handles: handles.size, posts: posts.length, mentions: mentions.length }, entities };
  },
};

// ============================================================================
// 2. IG_ABOUT_ACCOUNT — "About this account" (authentic8: creation date, country,
//    former usernames, verified date) via endpoint /api/v1/users/{id}/about_v2
// ============================================================================
export const IgAboutAccountModule = {
  id: "ig_about_account",
  name: "Instagram About This Account (creation/country/handles)",
  category: "social",
  targetTypes: ["username"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG About] @${clean}` } });

    // Résoudre ID via web_profile_info (avec session si dispo)
    const authH = igCookieHeader();
    const pr = await axget(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`,
      { headers: { "User-Agent": UA, "X-IG-App-ID": "936619743392459", ...authH } }
    );
    const user = (pr.data as any)?.data?.user;
    if (!user?.id) {
      emit({ type: "log", data: { message: `[IG About] impossible de résoudre user_id (auth requis?)` } });
      return { success: false, data: { skipped: true, reason: "no_user_id" }, entities: [] };
    }

    // Plusieurs endpoints "about"
    const endpoints = [
      `https://i.instagram.com/api/v1/users/${user.id}/about_v2/`,
      `https://i.instagram.com/api/v1/users/${user.id}/about_info/`,
      `https://www.instagram.com/api/v1/users/${user.id}/info/`,
    ];

    for (const url of endpoints) {
      const r = await axget(url, {
        headers: { "User-Agent": MOBILE_UA, "X-IG-App-ID": "936619743392459", ...authH },
      });
      const d: any = r.data;
      if (!d || typeof d !== "object") continue;

      // Parse fields
      const about = d.about || d.user || d;
      const country = about.country || about.signup_country || about.profile_country;
      const createdAt = about.date_joined || about.date_joined_as_string || about.signup_date;
      const formerUsernames = about.former_usernames || d.former_usernames || [];
      const verifiedDate = about.verified_badge_activation_date || about.verification_date;

      if (country || createdAt || formerUsernames.length) {
        entities.push(ent("metadata", `About @${clean}: ${createdAt || "?"} | ${country || "?"}`, "ig_about_account", 90, {
          username: clean, userId: user.id,
          accountCreated: createdAt,
          country, verifiedDate,
          formerUsernamesCount: formerUsernames.length,
          source: url,
        }));

        for (const fu of formerUsernames) {
          const oldName = typeof fu === "string" ? fu : fu.username;
          if (oldName && oldName !== clean) {
            entities.push(ent("username", oldName, "ig_about_account", 88, {
              platform: "Instagram", currentUsername: clean,
              changedAt: typeof fu === "object" ? fu.changed_on : undefined,
              source: "ig_about_v2",
            }));
          }
        }

        if (country) entities.push(ent("location", country, "ig_about_account", 82, {
          type: "account_country", username: clean, source: "ig_about",
        }));

        emit({ type: "log", data: { message: `[IG About] ✅ ${country || "?"} / ${createdAt || "?"} / ${formerUsernames.length} old handles` } });
        return { success: true, data: { country, createdAt, formerUsernames: formerUsernames.length }, entities };
      }
    }

    emit({ type: "log", data: { message: `[IG About] tous les endpoints about_* sont auth-only` } });
    return { success: false, data: { skipped: true, reason: "auth_required" }, entities };
  },
};

// ============================================================================
// 3. IG_ANONYMOUS_VIEWERS — picuki, imginn, storiesdown, dumpor (authentic8)
// ============================================================================
export const IgAnonymousViewersModule = {
  id: "ig_anonymous_viewers",
  name: "Instagram Anonymous Viewers (picuki/imginn/storiesdown/dumpor)",
  category: "social",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG Anon] mirrors scrape @${clean}` } });

    const mirrors = [
      { name: "picuki", url: `https://www.picuki.com/profile/${clean}` },
      { name: "imginn", url: `https://imginn.com/${clean}/` },
      { name: "storiesdown", url: `https://storiesdown.com/v/${clean}` },
      { name: "dumpor", url: `https://dumpor.com/v/${clean}` },
      { name: "inflact", url: `https://inflact.com/instagram-viewer/${clean}/` },
      { name: "pixwox", url: `https://www.pixwox.com/profile/${clean}/` },
      { name: "greatfon", url: `https://greatfon.com/v/${clean}` },
    ];

    const working: { name: string; url: string; followers?: number; posts?: number; bio?: string }[] = [];

    await Promise.all(mirrors.map(async (m) => {
      try {
        const r = await axget(m.url, { headers: { "User-Agent": UA, "Accept": "text/html" }, timeout: 12000 });
        const html = typeof r.data === "string" ? r.data : "";
        if (html.length < 1500) return;
        // Detect "not found" / "blocked"
        const lower = html.toLowerCase();
        if (lower.includes("not found") || lower.includes("user not found") || lower.includes("no user") || lower.includes("page not found")) return;
        if (r.status >= 400) return;

        // Extract stats
        const followersM = /([\d,\.]+[kKmM]?)\s*(Followers|Abonnés|Seguidores|Подписчики)/i.exec(html);
        const postsM = /([\d,\.]+[kKmM]?)\s*(Posts|Publications|Publicaciones|Посты)/i.exec(html);
        const bioM = /<meta[^>]+(?:property="og:description"|name="description")[^>]+content="([^"]{10,500})"/i.exec(html);

        working.push({
          name: m.name, url: m.url,
          followers: followersM ? parseFloat(followersM[1].replace(/,/g, "")) : undefined,
          posts: postsM ? parseFloat(postsM[1].replace(/,/g, "")) : undefined,
          bio: bioM?.[1],
        });

        // Extract image URLs (posts visibles)
        const imgs = new Set<string>();
        const rxImg = /https?:\/\/[^"'<>\s]+scontent[^"'<>\s]+\.(?:jpg|jpeg|png|webp)/gi;
        let im: RegExpExecArray | null;
        while ((im = rxImg.exec(html)) && imgs.size < 10) imgs.add(im[0]);

        for (const img of imgs) {
          entities.push(ent("image_url", img, "ig_anonymous_viewers", 68, {
            username: clean, mirror: m.name, type: "anonymous_post_image",
          }));
        }
      } catch {}
    }));

    for (const w of working) {
      entities.push(ent("url", w.url, "ig_anonymous_viewers", 75, {
        platform: w.name, username: clean, type: "anonymous_mirror",
        followers: w.followers, posts: w.posts, bio: w.bio?.slice(0, 200),
      }));
    }

    // Fusionner stats: prendre le max followers observé
    const maxF = Math.max(...working.map(w => w.followers || 0), 0);
    if (maxF > 0) {
      entities.push(ent("metadata", `Stats @${clean} (anonymous): ~${maxF} followers`, "ig_anonymous_viewers", 72, {
        username: clean, followers: maxF,
        mirrorsConfirmed: working.length,
        source: "anonymous_viewers_agg",
      }));
    }

    emit({ type: "log", data: { message: `[IG Anon] ${working.length}/${mirrors.length} mirrors OK` } });
    return { success: working.length > 0, data: { mirrorsWorking: working.length, mirrorsTested: mirrors.length }, entities };
  },
};

// ============================================================================
// 4. IG_POST_EXIF — scrape posts récents (via picuki/imginn) + download +
//    extraction EXIF via exiftool ou parsing binaire JPEG
// ============================================================================
export const IgPostExifModule = {
  id: "ig_post_exif",
  name: "Instagram Post EXIF Extractor",
  category: "social",
  targetTypes: ["username"],
  priority: 8,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG EXIF] @${clean}` } });

    // 1) Récup liste d'images via picuki
    let imgs: string[] = [];
    try {
      const r = await axget(`https://www.picuki.com/profile/${clean}`, {
        headers: { "User-Agent": UA, "Accept": "text/html" },
      });
      const html = typeof r.data === "string" ? r.data : "";
      const rxImg = /https?:\/\/[^"'<>\s]+scontent[^"'<>\s]+\.(?:jpg|jpeg|webp)/gi;
      const set = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = rxImg.exec(html)) && set.size < 5) set.add(m[0]);
      imgs = [...set];
    } catch {}

    if (!imgs.length) {
      return { success: false, data: { skipped: true, reason: "no_images" }, entities: [] };
    }

    emit({ type: "log", data: { message: `[IG EXIF] ${imgs.length} images à analyser` } });

    // 2) Pour chaque image, download + parse EXIF (Instagram strip la majorité
    //    mais on peut parfois trouver encore du software/camera/color)
    for (const url of imgs.slice(0, 3)) {
      try {
        const r = await axget(url, {
          responseType: "arraybuffer",
          headers: { "User-Agent": UA, "Accept": "image/*" },
        });
        const buf: Buffer = Buffer.from(r.data as any);
        if (buf.length < 1000) continue;

        // Simple EXIF scan JPEG : cherche "Exif\0\0" ou APP1 marker
        const exifIdx = buf.indexOf("Exif\0\0");
        const hasExif = exifIdx >= 0;
        const xmpIdx = buf.indexOf("http://ns.adobe.com/xap/");

        // Extract common strings visibles
        const firstKB = buf.slice(0, Math.min(8192, buf.length)).toString("latin1");
        const softwareM = /Software[\x00-\x20]{1,10}([A-Za-z0-9 .\-_/]{3,60})/.exec(firstKB);
        const makeM = /Make[\x00-\x20]{1,10}([A-Za-z0-9 .\-_]{2,40})/.exec(firstKB);
        const modelM = /Model[\x00-\x20]{1,10}([A-Za-z0-9 .\-_]{2,40})/.exec(firstKB);
        const dateM = /(\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2})/.exec(firstKB);
        const gpsLatM = /GPSLatitude|GPS\s*Latitude/i.test(firstKB);

        const meta: any = {
          imageUrl: url, username: clean, size: buf.length,
          hasExifSegment: hasExif, hasXmp: xmpIdx >= 0,
          software: softwareM?.[1]?.trim(),
          cameraMake: makeM?.[1]?.trim(),
          cameraModel: modelM?.[1]?.trim(),
          exifDate: dateM?.[1],
          hasGps: gpsLatM,
        };

        if (hasExif || softwareM || makeM || modelM || dateM) {
          entities.push(ent("metadata", `EXIF ${url.slice(-40)}`, "ig_post_exif", hasExif ? 82 : 65, meta));
          if (makeM) {
            entities.push(ent("metadata", `Camera: ${makeM[1].trim()} ${modelM?.[1]?.trim() || ""}`, "ig_post_exif", 80, {
              username: clean, imageUrl: url, type: "camera_info",
            }));
          }
          if (dateM) {
            entities.push(ent("metadata", `Photo date: ${dateM[1]}`, "ig_post_exif", 75, {
              username: clean, imageUrl: url, type: "photo_datetime", exifDate: dateM[1],
            }));
          }
        }
      } catch {}
      await sleep(500);
    }

    emit({ type: "log", data: { message: `[IG EXIF] ${entities.length} metadata trouvées` } });
    return { success: entities.length > 0, data: { analyzed: imgs.length, found: entities.length }, entities };
  },
};

// ============================================================================
// 5. IG_CAPTION_ANALYZER — captions + hashtags + mentions + langue + sentiment
//    inspiré Osintgram (captions/photodes/hashtags/tagged)
// ============================================================================
export const IgCaptionAnalyzerModule = {
  id: "ig_caption_analyzer",
  name: "Instagram Caption Analyzer (hashtags/mentions/language)",
  category: "social",
  targetTypes: ["username"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG Caption] @${clean}` } });

    // Scrape captions depuis picuki (plus fiable qu'IG direct)
    let html = "";
    try {
      const r = await axget(`https://www.picuki.com/profile/${clean}`, {
        headers: { "User-Agent": UA, "Accept": "text/html" },
      });
      if (typeof r.data === "string") html = r.data;
    } catch {}

    if (!html) return { success: false, data: { skipped: true }, entities: [] };

    // Extraire les captions : <div class="photo-description">
    const captions: string[] = [];
    const rxCap = /<div[^>]+class="[^"]*(?:photo-description|desc)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let cm: RegExpExecArray | null;
    while ((cm = rxCap.exec(html)) && captions.length < 20) {
      const txt = cm[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (txt.length > 5) captions.push(txt);
    }

    // Si picuki vide, fallback meta description (1er post)
    if (!captions.length) {
      const ogD = /<meta[^>]+(?:property="og:description"|name="description")[^>]+content="([^"]{30,800})"/i.exec(html);
      if (ogD) captions.push(ogD[1]);
    }

    if (!captions.length) return { success: false, data: { skipped: true, reason: "no_captions" }, entities: [] };

    // Analyse : hashtags, mentions, emails, urls, langue
    const hashtagMap = new Map<string, number>();
    const mentionMap = new Map<string, number>();
    const emails = new Set<string>();
    const urls = new Set<string>();
    const emojis = new Set<string>();
    const langSignals: Record<string, number> = {};

    for (const cap of captions) {
      for (const m of cap.matchAll(/#([\w\u00C0-\u024F]{2,40})/g)) {
        const tag = m[1].toLowerCase();
        hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1);
      }
      for (const m of cap.matchAll(/@([A-Za-z0-9_.]{2,30})/g)) {
        const h = m[1].toLowerCase();
        if (h !== clean.toLowerCase()) mentionMap.set(h, (mentionMap.get(h) || 0) + 1);
      }
      for (const m of cap.matchAll(/[\w.+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]+/g)) emails.add(m[0].toLowerCase());
      for (const m of cap.matchAll(/https?:\/\/[^\s<>"']+/g)) urls.add(m[0]);
      for (const m of cap.matchAll(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu)) emojis.add(m[0]);

      // Simple heuristique langue (mots fréquents)
      const lower = cap.toLowerCase();
      if (/\b(the|and|you|with|for)\b/.test(lower)) langSignals.en = (langSignals.en || 0) + 1;
      if (/\b(le|la|les|et|avec|pour|des|une)\b/.test(lower)) langSignals.fr = (langSignals.fr || 0) + 1;
      if (/\b(de|la|los|las|con|para|que)\b/.test(lower)) langSignals.es = (langSignals.es || 0) + 1;
      if (/\b(und|der|die|das|mit|für|ein)\b/.test(lower)) langSignals.de = (langSignals.de || 0) + 1;
      if (/\b(il|lo|la|con|per|che|una)\b/.test(lower)) langSignals.it = (langSignals.it || 0) + 1;
    }

    const topLang = Object.entries(langSignals).sort((a, b) => b[1] - a[1])[0];
    const topTags = [...hashtagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    const topMentions = [...mentionMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

    for (const [tag, cnt] of topTags) {
      entities.push(ent("hashtag", `#${tag}`, "ig_caption_analyzer", 72, {
        username: clean, occurrences: cnt, platform: "Instagram",
      }));
    }
    for (const [mention, cnt] of topMentions) {
      const conf = cnt >= 3 ? 78 : 65;
      entities.push(ent("username", mention, "ig_caption_analyzer", conf, {
        platform: "Instagram", mentionedBy: clean, occurrences: cnt,
        hypothesis: cnt >= 3 ? "frequent_contact" : "occasional_mention",
      }));
    }
    for (const e of emails) {
      entities.push(ent("email", e, "ig_caption_analyzer", 82, { username: clean, source: "caption" }));
    }
    for (const u of urls) {
      entities.push(ent("url", u, "ig_caption_analyzer", 75, { username: clean, source: "caption" }));
    }
    if (topLang) {
      entities.push(ent("metadata", `Langue dominante: ${topLang[0]}`, "ig_caption_analyzer", 70, {
        username: clean, language: topLang[0], confidence: topLang[1], signals: langSignals,
      }));
    }

    emit({ type: "log", data: { message: `[IG Caption] ${captions.length} captions | ${topTags.length} hashtags | ${topMentions.length} mentions | lang=${topLang?.[0] || "?"}` } });
    return { success: entities.length > 0, data: {
      captionsAnalyzed: captions.length,
      uniqueHashtags: hashtagMap.size,
      uniqueMentions: mentionMap.size,
      emails: emails.size, urls: urls.size,
      topLanguage: topLang?.[0],
    }, entities };
  },
};

// ============================================================================
// 6. IG_TAGGED_BY — qui a tag le target (wtagged Osintgram) via scraping
// ============================================================================
export const IgTaggedByModule = {
  id: "ig_tagged_by",
  name: "Instagram Tagged By (qui a tag le target)",
  category: "social",
  targetTypes: ["username"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG TaggedBy] @${clean}` } });

    // Stratégie: dork "@${clean}" site:instagram.com + scrape mirrors
    const dork = `"@${clean}" site:instagram.com inurl:/p/`;
    const urls = await multiSearch(dork, 20);
    emit({ type: "log", data: { message: `[IG TaggedBy] ${urls.length} posts candidats via dork` } });

    const taggers = new Map<string, { posts: Set<string> }>();
    for (const u of urls) {
      const m = u.match(/instagram\.com\/([A-Za-z0-9_.]{2,30})\//i);
      if (!m) continue;
      const uname = m[1].toLowerCase();
      if (uname === clean.toLowerCase() || uname === "p" || uname === "reel") continue;
      if (!taggers.has(uname)) taggers.set(uname, { posts: new Set() });
      taggers.get(uname)!.posts.add(u);
    }

    // Scraper picuki pour tagged by
    try {
      const r = await axget(`https://www.picuki.com/tag/${clean}`, {
        headers: { "User-Agent": UA, "Accept": "text/html" },
      });
      if (typeof r.data === "string") {
        const rx = /\/profile\/([a-z0-9_.]{2,30})/gi;
        let pm: RegExpExecArray | null;
        while ((pm = rx.exec(r.data))) {
          const uname = pm[1].toLowerCase();
          if (uname === clean.toLowerCase()) continue;
          if (!taggers.has(uname)) taggers.set(uname, { posts: new Set() });
        }
      }
    } catch {}

    for (const [uname, info] of [...taggers.entries()].slice(0, 30)) {
      const conf = info.posts.size >= 2 ? 78 : 65;
      entities.push(ent("username", uname, "ig_tagged_by", conf, {
        platform: "Instagram", taggedTarget: clean,
        postsTagging: info.posts.size,
        samplePost: [...info.posts][0],
        hypothesis: "tagged_target_in_posts",
      }));
    }

    emit({ type: "log", data: { message: `[IG TaggedBy] ${taggers.size} taggers uniques` } });
    return { success: entities.length > 0, data: { taggers: taggers.size }, entities };
  },
};

// ============================================================================
// 7. IG_OSINT_SUITE — agrégateur exécutant Osintgram via Docker/CLI si dispo
//    pour les commandes addrs/fwersemail/fwingsemail/fwersnumber/fwingsnumber
// ============================================================================
import { exec } from "child_process";
import { promisify } from "util";
const pexec = promisify(exec);

export const IgOsintSuiteModule = {
  id: "ig_osint_suite",
  name: "Instagram Osintgram Suite (addrs/emails/phones de followers)",
  category: "social",
  targetTypes: ["username"],
  priority: 9,
  isAvailable: async () => {
    try {
      await pexec("osintgram --help", { timeout: 3000 });
      return true;
    } catch {
      // Test Docker
      try {
        await pexec("docker run --rm datalux/osintgram --help", { timeout: 5000 });
        return true;
      } catch { return false; }
    }
  },
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG OsintSuite] running Osintgram on @${clean}` } });

    // Commandes à exécuter en batch
    const commands = [
      { cmd: "info", desc: "profile info" },
      { cmd: "addrs", desc: "addresses from photos" },
      { cmd: "fwersemail", desc: "emails of followers" },
      { cmd: "fwingsemail", desc: "emails of following" },
      { cmd: "fwersnumber", desc: "phones of followers" },
      { cmd: "hashtags", desc: "hashtags used" },
      { cmd: "wtagged", desc: "who tagged target" },
      { cmd: "captions", desc: "photo captions" },
    ];

    for (const { cmd, desc } of commands) {
      try {
        const { stdout } = await pexec(`osintgram ${clean} --command ${cmd}`, { timeout: 60000, maxBuffer: 10 * 1024 * 1024 });
        if (!stdout) continue;

        // Parse : emails, phones, addresses, usernames
        for (const m of stdout.matchAll(/[\w.+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]+/g)) {
          entities.push(ent("email", m[0].toLowerCase(), "ig_osint_suite", 85, {
            username: clean, via: `osintgram:${cmd}`, description: desc,
          }));
        }
        for (const m of stdout.matchAll(/\+?\d[\d\s().-]{7,15}\d/g)) {
          entities.push(ent("phone", m[0], "ig_osint_suite", 80, {
            username: clean, via: `osintgram:${cmd}`,
          }));
        }
        if (cmd === "addrs") {
          for (const line of stdout.split("\n")) {
            const a = line.trim();
            if (a.length > 10 && /[A-Za-z]/.test(a) && /\d/.test(a)) {
              entities.push(ent("location", a, "ig_osint_suite", 78, {
                username: clean, via: "osintgram:addrs", type: "photo_address",
              }));
            }
          }
        }
        if (cmd === "wtagged") {
          for (const m of stdout.matchAll(/@?([a-z0-9_.]{2,30})\s*-\s*(\d+)/gi)) {
            entities.push(ent("username", m[1], "ig_osint_suite", 80, {
              platform: "Instagram", via: "osintgram:wtagged",
              taggedTarget: clean, taggedCount: Number(m[2]),
            }));
          }
        }
        emit({ type: "log", data: { message: `[IG OsintSuite] ${cmd}: ${stdout.length} chars parsed` } });
      } catch (e: any) {
        emit({ type: "log", data: { message: `[IG OsintSuite] ${cmd} skipped: ${String(e.message || e).slice(0, 80)}` } });
      }
    }

    return { success: entities.length > 0, data: { commandsRun: commands.length, entitiesFound: entities.length }, entities };
  },
};

// ============================================================================
// EXPORT
// ============================================================================
export const instagramUltimate2Modules = [
  IgGoogleDorksModule,
  IgAboutAccountModule,
  IgAnonymousViewersModule,
  IgPostExifModule,
  IgCaptionAnalyzerModule,
  IgTaggedByModule,
  IgOsintSuiteModule,
];
