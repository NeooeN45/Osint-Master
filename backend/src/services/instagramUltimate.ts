// ============================================================================
// INSTAGRAM ULTIMATE — 10 modules OSINT IG avancés
// email lookup · fullname search · comments harvester · similar accounts
// live status · username history · archived content · engagement analyzer
// mutuals intersection · location posts
// ============================================================================

import axios from "axios";
import https from "https";
import crypto from "crypto";

const NO_SSL = new https.Agent({ rejectUnauthorized: false });

// ── Helpers internes (cohérents avec instagramEngine.ts) ────────────────────
const IG_UAS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];
const IG_MOBILE_UAS = [
  "Instagram 101.0.0.15.120 Android (28/9; 360dpi; 720x1480; samsung; SM-G960F; starlte; samsungexynos9810; en_US; 161773481)",
  "Instagram 219.0.0.12.117 Android (30/11; 420dpi; 1080x2400; Xiaomi; M2101K6G; rosemary; mt6781; en_US; 340282366841710300)",
  "Instagram 275.0.0.27.98 Android (31/12; 420dpi; 1080x2200; Google; Pixel 6; oriole; exynos9825; en_US; 458229258)",
];
const IG_APP_IDS = ["936619743392459", "1217981644879628", "1074698696650121"];
const randUA = () => IG_UAS[Math.floor(Math.random() * IG_UAS.length)];
const randMobileUA = () => IG_MOBILE_UAS[Math.floor(Math.random() * IG_MOBILE_UAS.length)];
const randAppId = () => IG_APP_IDS[Math.floor(Math.random() * IG_APP_IDS.length)];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Cookie session optionnel : si IG_SESSION_ID défini dans .env, on l'ajoute à toutes les requêtes
// pour débloquer les endpoints authentifiés (feed, friendships, chaining, web_profile_info...).
// Peut être une liste séparée par `,` pour rotation.
function igCookies(): string {
  const sids = (process.env.IG_SESSION_ID || "").split(",").map(s => s.trim()).filter(Boolean);
  const csrf = (process.env.IG_CSRF_TOKEN || "").trim();
  const ds = (process.env.IG_DS_USER_ID || "").trim();
  if (!sids.length) return "";
  const sid = sids[Math.floor(Math.random() * sids.length)];
  const parts = [`sessionid=${sid}`];
  if (csrf) parts.push(`csrftoken=${csrf}`);
  if (ds) parts.push(`ds_user_id=${ds}`);
  return parts.join("; ");
}
function igAuthHeaders(): any {
  const cookie = igCookies();
  const csrf = (process.env.IG_CSRF_TOKEN || "").trim();
  const h: any = {};
  if (cookie) h["Cookie"] = cookie;
  if (csrf) h["X-CSRFToken"] = csrf;
  return h;
}
export const hasIgSession = () => !!(process.env.IG_SESSION_ID || "").trim();

const axget = (url: string, cfg: any = {}) => {
  const extraAuth = igAuthHeaders();
  const headers = { ...extraAuth, ...(cfg.headers || {}) };
  return axios.get(url, {
    httpsAgent: NO_SSL, validateStatus: () => true, timeout: 15000,
    ...cfg,
    headers,
  } as any);
};

// Fallback: scrape générique via Bing/DDG/Jina pour contourner les blocages IG
async function bingSearch(query: string, max: number = 20): Promise<string[]> {
  const urls: string[] = [];
  try {
    const r = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${max}`, {
      httpsAgent: NO_SSL, validateStatus: () => true, timeout: 15000,
      headers: { "User-Agent": randUA(), "Accept-Language": "en-US,en;q=0.9" },
    });
    const html = String(r.data || "");
    const rx = /<a[^>]+href="(https?:\/\/[^"]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html)) && urls.length < max * 2) {
      const u = m[1];
      if (u.includes("bing.com") || u.includes("microsoft.com")) continue;
      urls.push(u);
    }
  } catch {}
  return urls;
}
async function ddgSearch(query: string, max: number = 20): Promise<string[]> {
  const urls: string[] = [];
  try {
    const r = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      httpsAgent: NO_SSL, validateStatus: () => true, timeout: 15000,
      headers: { "User-Agent": randUA() },
    });
    const html = String(r.data || "");
    const rx = /<a[^>]+class="result__url"[^>]+href="([^"]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html)) && urls.length < max * 2) urls.push(m[1]);
    // Fallback: extraire tous les liens
    if (!urls.length) {
      const rx2 = /uddg=([^"&]+)/g;
      while ((m = rx2.exec(html))) {
        try { urls.push(decodeURIComponent(m[1])); } catch {}
      }
    }
  } catch {}
  return urls;
}
export async function searchWeb(query: string, max: number = 20): Promise<string[]> {
  const [a, b] = await Promise.all([bingSearch(query, max), ddgSearch(query, max)]);
  return [...new Set([...a, ...b])];
}

function eid() { return `igu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function ent(type: string, value: string, source: string, confidence: number, metadata: any = {}) {
  return { id: eid(), type, value, source, confidence, metadata, verified: confidence >= 80, depth: 0 };
}

// HMAC signature pour endpoints mobiles IG (/users/lookup, etc.)
const SIG_KEY = "e6358aeede676184b9fe702b30f4fd35e71744605e39d2181a34cede076b3c33";
const SIG_VER = "4";
function genSig(data: string): string {
  const sig = crypto.createHmac("sha256", SIG_KEY).update(data).digest("hex");
  return `ig_sig_key_version=${SIG_VER}&signed_body=${sig}.${encodeURIComponent(data)}`;
}

// Résoudre username → user_id via web_profile_info
async function resolveUserId(username: string): Promise<{ id: string; full_name: string; is_private: boolean; followers?: number; following?: number } | null> {
  const r = await axget(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    {
      headers: {
        "User-Agent": randUA(),
        "X-IG-App-ID": randAppId(),
        "Accept": "application/json",
      },
    }
  );
  const u = (r.data as any)?.data?.user;
  if (u?.id) {
    return {
      id: u.id,
      full_name: u.full_name,
      is_private: u.is_private,
      followers: u.edge_followed_by?.count,
      following: u.edge_follow?.count,
    };
  }
  return null;
}

// ============================================================================
// 1. IG_EMAIL_LOOKUP — Email → compte Instagram (même pattern que phone)
// ============================================================================
export const IgEmailLookupModule = {
  id: "ig_email_lookup",
  name: "Instagram Email → Account Lookup",
  category: "email",
  targetTypes: ["email"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const email = target.trim().toLowerCase();
    if (!email.includes("@")) return { success: false, data: { skipped: true }, entities: [] };
    emit({ type: "log", data: { message: `[IG] Email lookup: ${email}` } });
    const entities: any[] = [];

    const payload = JSON.stringify({
      login_attempt_count: "0",
      directly_sign_in: "true",
      source: "default",
      q: email,
      ig_sig_key_version: SIG_VER,
    });

    let found = false;
    for (const ua of IG_MOBILE_UAS) {
      try {
        const r = await axios.post(
          "https://i.instagram.com/api/v1/users/lookup/",
          genSig(payload),
          {
            timeout: 12000,
            httpsAgent: NO_SSL,
            validateStatus: () => true,
            headers: {
              "User-Agent": ua,
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "Accept-Language": "en-US",
              "X-FB-HTTP-Engine": "Liger",
            },
          } as any
        );

        const d: any = r.data;
        emit({ type: "log", data: { message: `[IG Email] HTTP ${r.status} — ${JSON.stringify(d).slice(0, 120)}` } });

        if (r.status === 429 || (r.status >= 400 && !d?.user && !d?.multiple_users_list)) {
          await sleep(1500);
          continue;
        }

        if (d?.user) {
          const u = d.user;
          const username = u.username;
          const fullName = u.full_name || "";
          const maskedPhone = u.obfuscated_phone || "";
          const picUrl = u.profile_pic_url_hd || u.profile_pic_url || "";

          emit({ type: "log", data: { message: `[IG Email] ✅ ${email} → @${username}` } });

          if (username) {
            entities.push(ent("username", username, "ig_email_lookup", 95, {
              platform: "Instagram", email, derivedFrom: "email_lookup",
              fullName, maskedPhone,
            }));
            entities.push(ent("social_profile", `https://www.instagram.com/${username}/`, "ig_email_lookup", 95, {
              platform: "Instagram", username, email, fullName, avatar: picUrl,
            }));
          }
          if (fullName) entities.push(ent("person", fullName, "ig_email_lookup", 88, { username, email }));
          if (maskedPhone) entities.push(ent("phone", maskedPhone, "ig_email_lookup", 75, { masked: true, username, email }));
          if (picUrl) entities.push(ent("image_url", picUrl, "ig_email_lookup", 88, { username, type: "profile_picture", email }));
          found = true;
          break;
        }

        // Cas multiple
        if (d?.multiple_users_list?.length) {
          for (const u of d.multiple_users_list) {
            if (u.username) {
              entities.push(ent("username", u.username, "ig_email_lookup", 88, {
                platform: "Instagram", email, multiple: true, fullName: u.full_name,
              }));
            }
          }
          found = true;
          break;
        }
      } catch (e: any) {
        emit({ type: "log", data: { message: `[IG Email] erreur: ${e.message}` } });
        await sleep(1000);
      }
    }

    return { success: entities.length > 0, data: { found: entities.length, rateLimited: !found }, entities };
  },
};

// ============================================================================
// 2. IG_FULLNAME_SEARCH — nom complet → comptes Instagram via topsearch
// ============================================================================
export const IgFullnameSearchModule = {
  id: "ig_fullname_search",
  name: "Instagram Search (nom/prénom → comptes)",
  category: "social",
  targetTypes: ["person", "username"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const query = target.trim();
    if (query.length < 3) return { success: false, data: { skipped: true }, entities: [] };

    emit({ type: "log", data: { message: `[IG Search] "${query}"` } });
    const entities: any[] = [];

    // 3 endpoints en cascade
    const endpoints = [
      `https://www.instagram.com/web/search/topsearch/?query=${encodeURIComponent(query)}`,
      `https://www.instagram.com/api/v1/web/search/topsearch/?query=${encodeURIComponent(query)}`,
      `https://i.instagram.com/api/v1/web/search/topsearch/?query=${encodeURIComponent(query)}`,
    ];

    for (const url of endpoints) {
      try {
        const r = await axget(url, {
          headers: {
            "User-Agent": randUA(),
            "X-IG-App-ID": randAppId(),
            "Accept": "application/json",
          },
        });

        const d: any = r.data;
        if (!d?.users) continue;

        emit({ type: "log", data: { message: `[IG Search] ${d.users.length} candidats pour "${query}"` } });

        for (const item of d.users.slice(0, 10)) {
          const u = item.user || item;
          if (!u.username) continue;

          entities.push(ent("social_profile", `https://www.instagram.com/${u.username}/`, "ig_fullname_search", 78, {
            platform: "Instagram", username: u.username,
            fullName: u.full_name,
            avatar: u.profile_pic_url,
            verified: u.is_verified,
            private: u.is_private,
            userId: u.pk || u.id,
            followerCount: u.follower_count,
            searchedFor: query,
          }));
          entities.push(ent("username", u.username, "ig_fullname_search", 72, {
            platform: "Instagram", fullName: u.full_name, fromNameSearch: query,
          }));
          if (u.profile_pic_url) {
            entities.push(ent("image_url", u.profile_pic_url, "ig_fullname_search", 70, {
              username: u.username, platform: "Instagram", type: "profile_picture",
            }));
          }
        }
        return { success: entities.length > 0, data: { candidates: entities.length, via: "ig_topsearch" }, entities };
      } catch {}
    }

    // Fallback #1 : Google dorks via Bing/DDG (authentic8 recipe)
    emit({ type: "log", data: { message: `[IG Search] topsearch bloqué, fallback dork web` } });
    const dorks = [
      `site:instagram.com "${query}"`,
      `"${query}" inurl:instagram.com`,
      `site:instagram.com "${query}" -inurl:/p/ -inurl:/reel/`,
    ];
    const foundHandles = new Map<string, { fullName?: string; url: string; via: string }>();
    for (const dork of dorks) {
      const urls = await searchWeb(dork, 15);
      for (const u of urls) {
        const m = u.match(/instagram\.com\/([A-Za-z0-9_.]{2,30})(?:\/|$|\?)/i);
        if (!m) continue;
        const uname = m[1].toLowerCase();
        // Filtrer faux positifs
        if (["explore", "p", "reel", "reels", "stories", "tv", "accounts", "about", "directory", "web"].includes(uname)) continue;
        if (!foundHandles.has(uname)) foundHandles.set(uname, { url: u, via: `dork: ${dork}` });
      }
      if (foundHandles.size >= 10) break;
      await sleep(400);
    }

    // Fallback #2 : scrape picuki search
    try {
      const pk = await axget(`https://www.picuki.com/search/${encodeURIComponent(query)}`, {
        headers: { "User-Agent": randUA(), "Accept": "text/html" },
      });
      if (typeof pk.data === "string") {
        const rx = /\/profile\/([a-z0-9_.]{2,30})/gi;
        let m: RegExpExecArray | null;
        while ((m = rx.exec(pk.data))) {
          const uname = m[1].toLowerCase();
          if (!foundHandles.has(uname)) foundHandles.set(uname, { url: `https://www.picuki.com/profile/${uname}`, via: "picuki_search" });
        }
      }
    } catch {}

    for (const [uname, info] of [...foundHandles.entries()].slice(0, 15)) {
      entities.push(ent("social_profile", `https://www.instagram.com/${uname}/`, "ig_fullname_search", 68, {
        platform: "Instagram", username: uname, searchedFor: query, via: info.via, sourceUrl: info.url,
      }));
      entities.push(ent("username", uname, "ig_fullname_search", 62, {
        platform: "Instagram", fromNameSearch: query, via: info.via,
      }));
    }

    emit({ type: "log", data: { message: `[IG Search] ${foundHandles.size} candidats via fallback web` } });
    return { success: entities.length > 0, data: { found: entities.length, viaFallback: foundHandles.size }, entities };
  },
};

// ============================================================================
// 3. IG_COMMENTS_HARVESTER — scrape commentaires d'un post
// ============================================================================
export const IgCommentsHarvesterModule = {
  id: "ig_comments_harvester",
  name: "Instagram Comments Harvester",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG Comments] Harvesting from @${clean} posts` } });

    // 1) Get user feed
    const userInfo = await resolveUserId(clean);
    if (!userInfo?.id) return { success: false, data: { skipped: true, reason: "user_not_found" }, entities: [] };

    // 2) Get recent posts via feed endpoint
    const feedR = await axget(
      `https://www.instagram.com/api/v1/feed/user/${userInfo.id}/?count=12`,
      {
        headers: {
          "User-Agent": randMobileUA(),
          "X-IG-App-ID": randAppId(),
          "Accept": "application/json",
        },
      }
    );

    const posts = (feedR.data as any)?.items || [];
    emit({ type: "log", data: { message: `[IG Comments] ${posts.length} posts récents trouvés` } });

    const commentersMap = new Map<string, { count: number; fullName?: string }>();

    // 3) Pour les 3 derniers posts, récupérer les commentaires
    for (const post of posts.slice(0, 3)) {
      const mediaId = post.pk || post.id;
      if (!mediaId) continue;
      try {
        const commentsR = await axget(
          `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=false&permalink_enabled=false`,
          {
            headers: {
              "User-Agent": randMobileUA(),
              "X-IG-App-ID": randAppId(),
              "Accept": "application/json",
            },
          }
        );
        const cmts = (commentsR.data as any)?.comments || [];
        for (const c of cmts) {
          const u = c.user;
          if (!u?.username) continue;
          const k = u.username;
          if (!commentersMap.has(k)) commentersMap.set(k, { count: 0, fullName: u.full_name });
          commentersMap.get(k)!.count++;
        }
        await sleep(800);
      } catch {}
    }

    // Les top commenters = probables alt accounts / cercle proche
    const topCommenters = [...commentersMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);

    for (const [username, info] of topCommenters) {
      const conf = info.count >= 3 ? 82 : info.count >= 2 ? 72 : 62;
      entities.push(ent("username", username, "ig_comments_harvester", conf, {
        platform: "Instagram",
        commentsCount: info.count,
        fullName: info.fullName,
        fromUser: clean,
        hypothesis: info.count >= 3 ? "close_friend_or_alt" : "frequent_interactor",
      }));
    }
    emit({ type: "log", data: { message: `[IG Comments] ${topCommenters.length} commentateurs fréquents` } });

    return { success: entities.length > 0, data: { uniqueCommenters: commentersMap.size, topCommenters: topCommenters.length }, entities };
  },
};

// ============================================================================
// 4. IG_SIMILAR_ACCOUNTS — profils recommandés par Instagram
// ============================================================================
export const IgSimilarAccountsModule = {
  id: "ig_similar_accounts",
  name: "Instagram Similar / Recommended Accounts",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG Similar] for @${clean}` } });

    const userInfo = await resolveUserId(clean);
    if (!userInfo?.id) return { success: false, data: { skipped: true, reason: "user_not_found" }, entities: [] };

    // Endpoint chaining_media
    const r = await axget(
      `https://i.instagram.com/api/v1/discover/chaining/?target_id=${userInfo.id}&include_reel=false`,
      {
        headers: {
          "User-Agent": randMobileUA(),
          "X-IG-App-ID": randAppId(),
          "Accept": "application/json",
        },
      }
    );

    const users = (r.data as any)?.users || [];
    emit({ type: "log", data: { message: `[IG Similar] ${users.length} comptes similaires` } });

    for (const u of users.slice(0, 15)) {
      if (!u.username) continue;
      entities.push(ent("social_profile", `https://www.instagram.com/${u.username}/`, "ig_similar_accounts", 72, {
        platform: "Instagram",
        username: u.username,
        fullName: u.full_name,
        avatar: u.profile_pic_url,
        verified: u.is_verified,
        private: u.is_private,
        similarTo: clean,
        reason: "instagram_recommended",
      }));
      entities.push(ent("username", u.username, "ig_similar_accounts", 68, {
        platform: "Instagram", similarTo: clean, reason: "recommended",
      }));
    }

    return { success: entities.length > 0, data: { similar: users.length }, entities };
  },
};

// ============================================================================
// 5. IG_LIVE_STATUS — détection live actif
// ============================================================================
export const IgLiveStatusModule = {
  id: "ig_live_status",
  name: "Instagram Live Status",
  category: "social",
  targetTypes: ["username"],
  priority: 7,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const userInfo = await resolveUserId(clean);
    if (!userInfo?.id) return { success: false, data: { skipped: true }, entities: [] };

    // Endpoint reels_media révèle les lives
    const r = await axget(
      `https://i.instagram.com/api/v1/live/web_info/?target_user_id=${userInfo.id}`,
      {
        headers: {
          "User-Agent": randMobileUA(),
          "X-IG-App-ID": randAppId(),
          "Accept": "application/json",
        },
      }
    );

    const d: any = r.data;
    const live = d?.live_info || d?.broadcast;
    if (live?.id || live?.broadcast_status === "active") {
      entities.push(ent("metadata", `LIVE actif: @${clean}`, "ig_live_status", 95, {
        type: "live_broadcast",
        broadcastId: live.id || live.broadcast_id,
        startedAt: live.published_time || live.started_at,
        viewerCount: live.viewer_count,
        videoUrl: live.dash_playback_url || live.rtmp_playback_url,
        username: clean,
      }));
      emit({ type: "log", data: { message: `[IG Live] ✅ @${clean} est EN LIVE !` } });
    } else {
      emit({ type: "log", data: { message: `[IG Live] @${clean} n'est pas en live` } });
    }

    return { success: entities.length > 0, data: { isLive: entities.length > 0 }, entities };
  },
};

// ============================================================================
// 6. IG_USERNAME_HISTORY — historique handles via services tiers
// ============================================================================
export const IgUsernameHistoryModule = {
  id: "ig_username_history",
  name: "Instagram Username History",
  category: "social",
  targetTypes: ["username"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG History] searching username history for @${clean}` } });

    // 1) Instagram account_info endpoint (si dispo)
    const userInfo = await resolveUserId(clean);
    if (userInfo?.id) {
      try {
        const r = await axget(
          `https://i.instagram.com/api/v1/users/${userInfo.id}/about_info/`,
          {
            headers: {
              "User-Agent": randMobileUA(),
              "X-IG-App-ID": randAppId(),
              "Accept": "application/json",
            },
          }
        );
        const d: any = r.data;
        const formerUsernames = d?.former_usernames || d?.about?.former_usernames || [];
        for (const fu of formerUsernames) {
          const oldName = fu.username || fu;
          if (oldName && oldName !== clean) {
            entities.push(ent("username", oldName, "ig_username_history", 88, {
              platform: "Instagram", currentUsername: clean,
              changedAt: fu.time, source: "ig_about_info",
            }));
          }
        }
        if (formerUsernames.length) {
          emit({ type: "log", data: { message: `[IG History] ${formerUsernames.length} anciens handles trouvés via about_info` } });
        }
      } catch {}
    }

    // 2) Wayback Machine CDX pour instagram.com/username
    try {
      const r = await axget(
        `https://web.archive.org/cdx/search/cdx?url=instagram.com/${clean}&output=json&limit=20&fl=timestamp,original`,
        { headers: { "User-Agent": randUA() } }
      );
      const snapshots = Array.isArray(r.data) ? r.data.slice(1) : [];
      if (snapshots.length > 0) {
        entities.push(ent("metadata", `Wayback: ${snapshots.length} snapshots @${clean}`, "ig_username_history", 75, {
          username: clean, source: "wayback_machine",
          oldestSnapshot: snapshots[0]?.[0],
          newestSnapshot: snapshots[snapshots.length - 1]?.[0],
          count: snapshots.length,
        }));
        emit({ type: "log", data: { message: `[IG History] ${snapshots.length} snapshots Wayback` } });
      }
    } catch {}

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 7. IG_ARCHIVED_CONTENT — posts supprimés via Wayback + mirrors
// ============================================================================
export const IgArchivedContentModule = {
  id: "ig_archived_content",
  name: "Instagram Archived / Deleted Content",
  category: "social",
  targetTypes: ["username"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `[IG Archived] looking for deleted posts @${clean}` } });

    // 1) Wayback snapshots
    try {
      const cdx = await axget(
        `https://web.archive.org/cdx/search/cdx?url=instagram.com/${clean}/*&output=json&limit=50&filter=statuscode:200`,
        { headers: { "User-Agent": randUA() } }
      );
      const rows: any[] = Array.isArray(cdx.data) ? cdx.data.slice(1) : [];
      const posts = rows.filter(r => r[1]?.includes("/p/")).slice(0, 10);
      for (const row of posts) {
        const ts = row[0];
        const url = row[1];
        entities.push(ent("url", `https://web.archive.org/web/${ts}/${url}`, "ig_archived_content", 70, {
          username: clean, timestamp: ts, type: "wayback_archived_post",
          originalUrl: url,
        }));
      }
      emit({ type: "log", data: { message: `[IG Archived] ${posts.length} posts archivés sur Wayback` } });
    } catch {}

    // 2) Mirrors historiques (picuki archive, imginn archive)
    const mirrors = [
      `https://www.picuki.com/profile/${clean}`,
      `https://imginn.com/${clean}/`,
    ];
    for (const m of mirrors) {
      const r = await axget(m, { headers: { "User-Agent": randUA(), "Accept": "text/html" } });
      if (typeof r.data === "string" && r.data.length > 2000 && !r.data.includes("not found")) {
        entities.push(ent("url", m, "ig_archived_content", 68, {
          username: clean, type: "mirror_archive",
          hasContent: true,
        }));
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 8. IG_ENGAGEMENT_ANALYZER — fake followers detection via ratio
// ============================================================================
export const IgEngagementAnalyzerModule = {
  id: "ig_engagement_analyzer",
  name: "Instagram Engagement Analyzer (fake followers)",
  category: "analysis",
  targetTypes: ["username"],
  priority: 7,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const userInfo = await resolveUserId(clean);
    if (!userInfo?.id) {
      // Fallback picuki : scrape followers/engagement stats depuis le mirror
      try {
        const pk = await axget(`https://www.picuki.com/profile/${clean}`, {
          headers: { "User-Agent": randUA(), "Accept": "text/html" },
        });
        if (typeof pk.data === "string" && pk.data.length > 2000) {
          const html = pk.data;
          const followers = Number(((/([\d,.kKmM]+)\s*(?:Followers|Abonnés)/i.exec(html) || [])[1] || "0").replace(/[,\s]/g, "").replace(/[kK]$/, "000").replace(/[mM]$/, "000000")) || 0;
          const following = Number(((/([\d,.kKmM]+)\s*(?:Following|Abonnements)/i.exec(html) || [])[1] || "0").replace(/[,\s]/g, "").replace(/[kK]$/, "000").replace(/[mM]$/, "000000")) || 0;
          const posts = Number(((/([\d,.kKmM]+)\s*(?:Posts|Publications)/i.exec(html) || [])[1] || "0").replace(/[,\s]/g, "").replace(/[kK]$/, "000").replace(/[mM]$/, "000000")) || 0;
          if (followers > 0) {
            emit({ type: "log", data: { message: `[IG Engagement] picuki fallback: ${followers} followers` } });
            entities.push(ent("metadata", `Stats @${clean} (picuki): ${followers} followers`, "ig_engagement_analyzer", 72, {
              username: clean, followers, following, posts, source: "picuki_scrape",
              ratio: following ? (followers / following).toFixed(2) : null,
              verdict: followers > 10000 && following > followers / 10 ? "ambiguous_mass_follow" : "no_strong_signal",
            }));
            return { success: true, data: { followers, following, posts, via: "picuki" }, entities };
          }
        }
      } catch {}
      return { success: false, data: { skipped: true, reason: "no_access" }, entities: [] };
    }

    // Get recent media counts
    const feedR = await axget(
      `https://www.instagram.com/api/v1/feed/user/${userInfo.id}/?count=12`,
      {
        headers: {
          "User-Agent": randMobileUA(),
          "X-IG-App-ID": randAppId(),
          "Accept": "application/json",
        },
      }
    );

    const posts = (feedR.data as any)?.items || [];
    if (posts.length === 0 || !userInfo.followers) {
      return { success: false, data: { skipped: true, reason: "no_data" }, entities: [] };
    }

    // Calcul engagement rate
    const totalLikes = posts.reduce((s: number, p: any) => s + (p.like_count || 0), 0);
    const totalComments = posts.reduce((s: number, p: any) => s + (p.comment_count || 0), 0);
    const avgLikes = totalLikes / posts.length;
    const avgComments = totalComments / posts.length;
    const engagementRate = ((avgLikes + avgComments) / userInfo.followers) * 100;

    // Heuristiques fake followers
    const signals: string[] = [];
    let fakeScore = 0;

    if (userInfo.followers > 10000 && engagementRate < 1) {
      fakeScore += 40; signals.push("low_engagement_high_followers");
    } else if (userInfo.followers > 1000 && engagementRate < 0.5) {
      fakeScore += 30; signals.push("very_low_engagement");
    }

    if (userInfo.following && userInfo.following > 5000 && userInfo.followers < userInfo.following / 10) {
      fakeScore += 25; signals.push("mass_follow_behavior");
    }

    if (avgComments === 0 && avgLikes > 0) {
      fakeScore += 15; signals.push("no_comments");
    }

    if (avgLikes > userInfo.followers * 0.5) {
      fakeScore += 20; signals.push("suspiciously_high_engagement");
    }

    const verdict = fakeScore > 60 ? "likely_bought_followers"
      : fakeScore > 30 ? "ambiguous"
      : "organic_engagement";

    entities.push(ent("metadata", `Engagement @${clean}: ${engagementRate.toFixed(2)}%`, "ig_engagement_analyzer", 88, {
      username: clean,
      engagementRate: Number(engagementRate.toFixed(3)),
      avgLikes: Math.round(avgLikes), avgComments: Math.round(avgComments),
      totalLikes, totalComments,
      postsAnalyzed: posts.length,
      followers: userInfo.followers, following: userInfo.following,
      fakeScore, signals, verdict,
    }));

    entities.push(ent("trust_score", `${clean}: ${100 - fakeScore}/100`, "ig_engagement_analyzer", 85, {
      username: clean, trustScore: 100 - fakeScore,
      fakeProbability: fakeScore, verdict, signals,
    }));

    emit({ type: "log", data: { message: `[IG Engagement] ${clean}: ${engagementRate.toFixed(2)}% | fake: ${fakeScore}/100 | ${verdict}` } });

    return { success: true, data: { engagementRate, fakeScore, verdict, signals }, entities };
  },
};

// ============================================================================
// 9. IG_MUTUALS_INTERSECTION — cercle proche (followers ∩ following)
// ============================================================================
export const IgMutualsIntersectionModule = {
  id: "ig_mutuals_intersection",
  name: "Instagram Mutuals (cercle proche)",
  category: "social",
  targetTypes: ["username"],
  priority: 7,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const userInfo = await resolveUserId(clean);
    if (!userInfo?.id) return { success: false, data: { skipped: true }, entities: [] };
    if (userInfo.is_private) return { success: false, data: { skipped: true, reason: "private_account" }, entities: [] };

    emit({ type: "log", data: { message: `[IG Mutuals] computing follower ∩ following @${clean}` } });

    // Get 50 followers + 50 following
    const [followersR, followingR] = await Promise.all([
      axget(
        `https://www.instagram.com/api/v1/friendships/${userInfo.id}/followers/?count=50`,
        { headers: { "User-Agent": randMobileUA(), "X-IG-App-ID": randAppId(), "Accept": "application/json" } }
      ),
      axget(
        `https://www.instagram.com/api/v1/friendships/${userInfo.id}/following/?count=50`,
        { headers: { "User-Agent": randMobileUA(), "X-IG-App-ID": randAppId(), "Accept": "application/json" } }
      ),
    ]);

    const followers: any[] = (followersR.data as any)?.users || [];
    const following: any[] = (followingR.data as any)?.users || [];

    if (followers.length === 0 || following.length === 0) {
      return { success: false, data: { skipped: true, reason: "private_or_rate_limit" }, entities: [] };
    }

    const followerSet = new Set(followers.map(u => u.username));
    const mutuals = following.filter(u => followerSet.has(u.username));

    emit({ type: "log", data: { message: `[IG Mutuals] ${mutuals.length} mutuals sur ${followers.length}+${following.length} échantillon` } });

    for (const u of mutuals.slice(0, 30)) {
      entities.push(ent("username", u.username, "ig_mutuals_intersection", 82, {
        platform: "Instagram",
        fullName: u.full_name,
        avatar: u.profile_pic_url,
        verified: u.is_verified,
        relationTo: clean,
        relation: "mutual",
        hypothesis: "close_circle",
      }));
    }

    return { success: entities.length > 0, data: {
      mutualsFound: mutuals.length,
      followersSampled: followers.length,
      followingSampled: following.length,
    }, entities };
  },
};

// ============================================================================
// 10. IG_LOCATION_POSTS — location_id → posts + comptes présents
// ============================================================================
export const IgLocationPostsModule = {
  id: "ig_location_posts",
  name: "Instagram Location Posts Scraper",
  category: "social",
  targetTypes: ["location"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target: string, emit: any, context: any = {}) => {
    // Accepte un location_id ou un format "name:id"
    const allEntities: any[] = context.allEntities || [];

    // Chercher location_id dans les entités collectées
    const locIds = new Set<string>();
    for (const e of allEntities) {
      if (e.metadata?.locationId) locIds.add(String(e.metadata.locationId));
      if (e.type === "location" && /^\d+$/.test(e.value)) locIds.add(e.value);
    }
    if (/^\d+$/.test(target)) locIds.add(target);

    if (locIds.size === 0) {
      return { success: false, data: { skipped: true, reason: "no_location_id" }, entities: [] };
    }

    const entities: any[] = [];
    for (const locId of [...locIds].slice(0, 3)) {
      emit({ type: "log", data: { message: `[IG Location] posts at ${locId}` } });

      const r = await axget(
        `https://www.instagram.com/api/v1/locations/web_info/?location_id=${locId}`,
        { headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId(), "Accept": "application/json" } }
      );
      const d: any = r.data;
      if (!d?.native_location_data) continue;

      const loc = d.native_location_data.location_info;
      if (loc?.name) {
        entities.push(ent("location", loc.name, "ig_location_posts", 88, {
          locationId: locId,
          lat: loc.lat, lon: loc.lng,
          city: loc.city, country: loc.country,
        }));
      }

      // Posts récents à cette location
      const sections = d.native_location_data.recent?.sections || [];
      const medias: any[] = [];
      for (const s of sections) {
        for (const m of s.layout_content?.medias || []) medias.push(m.media);
      }

      const userSet = new Set<string>();
      for (const media of medias.slice(0, 20)) {
        const user = media.user;
        if (user?.username && !userSet.has(user.username)) {
          userSet.add(user.username);
          entities.push(ent("username", user.username, "ig_location_posts", 75, {
            platform: "Instagram",
            fullName: user.full_name,
            foundAtLocation: loc?.name || locId,
            locationId: locId,
          }));
        }
      }

      emit({ type: "log", data: { message: `[IG Location] ${userSet.size} users à ${loc?.name || locId}` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// EXPORT
// ============================================================================
export const instagramUltimateModules = [
  IgEmailLookupModule,
  IgFullnameSearchModule,
  IgCommentsHarvesterModule,
  IgSimilarAccountsModule,
  IgLiveStatusModule,
  IgUsernameHistoryModule,
  IgArchivedContentModule,
  IgEngagementAnalyzerModule,
  IgMutualsIntersectionModule,
  IgLocationPostsModule,
];
