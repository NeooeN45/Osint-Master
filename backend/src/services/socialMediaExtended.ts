// ============================================================================
// SOCIAL MEDIA EXTENDED — Plateformes modernes et alternatives
// Bluesky · Mastodon · Threads · Twitch · TikTok · VK · Pinterest · Fediverse
// Toutes les APIs utilisées sont publiques et gratuites
// ============================================================================

import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

async function http(url: string, opts: any = {}): Promise<any> {
  try {
    const { headers, timeout, ...rest } = opts;
    const r = await axios.get(url, {
      timeout: timeout || 15000,
      headers: { "User-Agent": UA, "Accept": "application/json,text/html", ...headers },
      httpsAgent,
      maxRedirects: 5,
      validateStatus: () => true,
      ...rest,
    });
    if (r.status >= 200 && r.status < 400) return r.data;
    return null;
  } catch { return null; }
}

async function httpPost(url: string, body: any, opts: any = {}): Promise<any> {
  try {
    const { headers, timeout, ...rest } = opts;
    const r = await axios.post(url, body, {
      timeout: timeout || 15000,
      headers: { "User-Agent": UA, "Content-Type": "application/json", ...headers },
      httpsAgent,
      maxRedirects: 5,
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
// 1. BLUESKY (AT Protocol) — API 100% publique et gratuite
// ============================================================================
export const BlueskyModule = {
  id: "bluesky_profile",
  name: "Bluesky Profile (AT Protocol)",
  category: "social",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `Bluesky: search ${clean}` } });

    // Méthode 1 : handle direct (ex: user.bsky.social)
    const handles = [
      clean.includes(".") ? clean : `${clean}.bsky.social`,
      `${clean}.bsky.social`,
    ];

    for (const handle of [...new Set(handles)]) {
      const data: any = await http(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`);
      if (data?.did) {
        entities.push(ent("social_profile", `https://bsky.app/profile/${data.handle}`, "bluesky_profile", 95, {
          platform: "Bluesky",
          did: data.did,
          handle: data.handle,
          displayName: data.displayName,
          bio: data.description,
          avatar: data.avatar,
          banner: data.banner,
          followers: data.followersCount,
          following: data.followsCount,
          posts: data.postsCount,
          createdAt: data.createdAt,
          verified: !!data.labels?.length,
        }));
        if (data.displayName) entities.push(ent("person", data.displayName, "bluesky_profile", 88, { handle: data.handle }));
        if (data.avatar) entities.push(ent("image_url", data.avatar, "bluesky_profile", 85, { type: "profile_picture", handle: data.handle }));
        if (data.description) {
          // Extract emails/urls from bio
          const emails = data.description.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
          emails.forEach((e: string) => entities.push(ent("email", e, "bluesky_profile", 75, { fromBio: true, handle })));
          const urls = data.description.match(/https?:\/\/[^\s<>"']{5,80}/g) || [];
          urls.forEach((u: string) => entities.push(ent("url", u, "bluesky_profile", 78, { fromBio: true, handle })));
        }
        emit({ type: "log", data: { message: `Bluesky ✓ @${data.handle} — ${data.followersCount} followers` } });
        break;
      }
    }

    // Méthode 2 : search si rien trouvé
    if (entities.length === 0) {
      const search: any = await http(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(clean)}&limit=5`);
      if (search?.actors?.length) {
        for (const actor of search.actors.slice(0, 3)) {
          entities.push(ent("social_profile", `https://bsky.app/profile/${actor.handle}`, "bluesky_search", 70, {
            platform: "Bluesky", handle: actor.handle, displayName: actor.displayName,
            bio: actor.description, fromSearch: true, query: clean,
          }));
        }
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 2. MASTODON / FEDIVERSE — WebFinger + instance discovery
// ============================================================================
export const MastodonModule = {
  id: "mastodon_fediverse",
  name: "Mastodon / Fediverse Discovery",
  category: "social",
  targetTypes: ["username", "email"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `Mastodon: WebFinger + instance probe ${clean}` } });

    // Top Mastodon instances — scan en parallèle
    const INSTANCES = [
      "mastodon.social", "mas.to", "fosstodon.org", "mstdn.social",
      "hachyderm.io", "infosec.exchange", "piaille.fr", "mamot.fr",
      "mastodon.online", "tech.lgbt", "ioc.exchange", "social.vivaldi.net",
    ];

    // Si target contient déjà @instance
    if (clean.includes("@")) {
      const [user, instance] = clean.split("@");
      const data: any = await http(`https://${instance}/api/v1/accounts/lookup?acct=${user}`);
      if (data?.id) {
        entities.push(ent("social_profile", data.url, "mastodon_direct", 95, {
          platform: "Mastodon", instance, username: data.username, acct: data.acct,
          displayName: data.display_name, bio: data.note, followers: data.followers_count,
          following: data.following_count, posts: data.statuses_count, createdAt: data.created_at,
          avatar: data.avatar_static, verified: data.verified,
        }));
        return { success: true, data: { found: 1 }, entities };
      }
    }

    // WebFinger scan en parallèle sur instances principales
    const results = await Promise.allSettled(
      INSTANCES.slice(0, 8).map(async (instance) => {
        const data: any = await http(
          `https://${instance}/.well-known/webfinger?resource=acct:${clean}@${instance}`,
          { timeout: 6000 }
        );
        if (data?.subject) return { instance, data };
        const data2: any = await http(`https://${instance}/api/v1/accounts/lookup?acct=${clean}`, { timeout: 6000 });
        if (data2?.id) return { instance, account: data2 };
        return null;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        const { instance, account } = r.value as any;
        if (account) {
          entities.push(ent("social_profile", account.url, "mastodon_fediverse", 90, {
            platform: "Mastodon", instance, username: account.username, acct: account.acct,
            displayName: account.display_name, bio: account.note,
            followers: account.followers_count, following: account.following_count,
            posts: account.statuses_count, createdAt: account.created_at,
            avatar: account.avatar_static,
          }));
          emit({ type: "log", data: { message: `Mastodon ✓ @${clean}@${instance}` } });
        }
      }
    }

    return { success: entities.length > 0, data: { scannedInstances: INSTANCES.length, found: entities.length }, entities };
  },
};

// ============================================================================
// 3. THREADS (Meta) — via Instagram API
// ============================================================================
export const ThreadsModule = {
  id: "threads_meta",
  name: "Threads (Meta)",
  category: "social",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `Threads: probe @${clean}` } });

    // Threads utilise les mêmes handles qu'Instagram
    const html: any = await http(`https://www.threads.net/@${clean}`, {
      headers: {
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (typeof html === "string" && html.includes(`@${clean}`) && !html.includes("User not found")) {
      // Extract meta tags
      const title = html.match(/<title[^>]*>([^<]+)<\/title>/)?.[1];
      const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
      const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1];

      entities.push(ent("social_profile", `https://www.threads.net/@${clean}`, "threads_meta", 88, {
        platform: "Threads", username: clean,
        fullName: title?.replace(/[•@].+$/, "").trim(),
        bio: ogDesc, avatar: ogImage,
      }));

      if (ogImage) entities.push(ent("image_url", ogImage, "threads_meta", 82, { platform: "Threads", username: clean, type: "profile_picture" }));
      emit({ type: "log", data: { message: `Threads ✓ @${clean}` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 4. TWITCH — Helix API publique (requires client_id mais un public existe)
// ============================================================================
export const TwitchModule = {
  id: "twitch_user",
  name: "Twitch User Lookup",
  category: "social",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim().toLowerCase();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `Twitch: probe ${clean}` } });

    // Méthode 1 : page publique HTML
    const html: any = await http(`https://www.twitch.tv/${clean}`, {
      headers: { "Accept": "text/html" },
    });

    if (typeof html === "string") {
      const exists = !html.includes("Sorry") && !html.includes("404") && html.includes(`"login":"${clean}"`);
      if (exists || html.includes(clean)) {
        const desc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1];
        const image = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
        const title = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1];

        entities.push(ent("social_profile", `https://www.twitch.tv/${clean}`, "twitch_user", 85, {
          platform: "Twitch", username: clean,
          displayName: title, bio: desc, avatar: image,
        }));
        if (image) entities.push(ent("image_url", image, "twitch_user", 80, { platform: "Twitch", username: clean, type: "profile_picture" }));
        emit({ type: "log", data: { message: `Twitch ✓ ${clean}` } });
      }
    }

    // Méthode 2 : decapi (public mirror)
    const decapi: any = await http(`https://decapi.me/twitch/id/${clean}`, { timeout: 8000 });
    if (decapi && typeof decapi === "string" && /^\d+$/.test(decapi.trim())) {
      const userId = decapi.trim();
      entities.push(ent("fingerprint", userId, "twitch_user", 88, { type: "twitch_user_id", username: clean }));
      // Channel info
      const info: any = await http(`https://decapi.me/twitch/title/${clean}`);
      const followage: any = await http(`https://decapi.me/twitch/followers/${clean}`);
      if (info) entities.push(ent("metadata", `Twitch channel: ${info}`, "twitch_user", 75, { username: clean, userId, stream_title: info }));
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 5. TIKTOK — via page scraping
// ============================================================================
export const TikTokModule = {
  id: "tiktok_user",
  name: "TikTok User Profile",
  category: "social",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `TikTok: probe @${clean}` } });

    const html: any = await http(`https://www.tiktok.com/@${clean}`, {
      headers: {
        "Accept": "text/html",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
      },
    });

    if (typeof html === "string" && !html.includes("Couldn't find this account")) {
      // Extract SIGI_STATE JSON (TikTok embed data)
      const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>(.+?)<\/script>/s);
      let userData: any = null;
      if (sigiMatch) {
        try {
          const sigi = JSON.parse(sigiMatch[1]);
          userData = sigi?.UserModule?.users?.[clean];
        } catch {}
      }

      // Fallback : meta tags
      if (!userData) {
        const metaTitle = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1];
        const metaDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1];
        const metaImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
        if (metaTitle && !metaTitle.includes("TikTok")) {
          userData = {
            nickname: metaTitle.replace(/ \(@.+\).*/, "").trim(),
            signature: metaDesc,
            avatarMedium: metaImage,
          };
        }
      }

      if (userData) {
        entities.push(ent("social_profile", `https://www.tiktok.com/@${clean}`, "tiktok_user", 88, {
          platform: "TikTok", username: clean,
          displayName: userData.nickname,
          bio: userData.signature,
          avatar: userData.avatarMedium || userData.avatarLarger,
          followers: userData.followerCount ? userData.followerCount : undefined,
          following: userData.followingCount,
          likes: userData.heartCount,
          videos: userData.videoCount,
          verified: userData.verified,
          privateAccount: userData.privateAccount,
          secUid: userData.secUid,
          userId: userData.id,
        }));

        if (userData.avatarMedium) {
          entities.push(ent("image_url", userData.avatarMedium, "tiktok_user", 82, {
            platform: "TikTok", username: clean, type: "profile_picture",
          }));
        }
        if (userData.nickname) {
          entities.push(ent("person", userData.nickname, "tiktok_user", 85, { platform: "TikTok", username: clean }));
        }
        if (userData.signature) {
          const emails = userData.signature.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
          emails.forEach((e: string) => entities.push(ent("email", e, "tiktok_user", 75, { fromBio: true, username: clean })));
          const urls = userData.signature.match(/https?:\/\/[^\s<>"']{5,80}/g) || [];
          urls.forEach((u: string) => entities.push(ent("url", u, "tiktok_user", 78, { fromBio: true, username: clean })));
        }
        emit({ type: "log", data: { message: `TikTok ✓ @${clean} — ${userData.followerCount || "?"} followers` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 6. VKONTAKTE (VK) — public API
// ============================================================================
export const VKModule = {
  id: "vk_user",
  name: "VKontakte User Lookup",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `VK: probe ${clean}` } });

    // VK nécessite une app_id mais la page publique est scrapable
    const html: any = await http(`https://vk.com/${clean}`, {
      headers: { "Accept": "text/html", "Accept-Language": "en" },
    });

    if (typeof html === "string" && !html.includes("deleted_text") && !html.includes("profile was not found")) {
      const title = html.match(/<title[^>]*>([^<]+)<\/title>/)?.[1];
      const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
      const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1];

      if (title && !title.includes("DELETED") && !title.includes("VK")) {
        entities.push(ent("social_profile", `https://vk.com/${clean}`, "vk_user", 80, {
          platform: "VKontakte", username: clean,
          fullName: title.replace(/\s*\|\s*VK.*$/, "").trim(),
          bio: ogDesc, avatar: ogImage,
        }));
        if (ogImage) entities.push(ent("image_url", ogImage, "vk_user", 75, { platform: "VKontakte", username: clean, type: "profile_picture" }));
        emit({ type: "log", data: { message: `VK ✓ ${clean}` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 7. PINTEREST — user profile
// ============================================================================
export const PinterestModule = {
  id: "pinterest_user",
  name: "Pinterest User Profile",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];
    emit({ type: "log", data: { message: `Pinterest: probe ${clean}` } });

    const html: any = await http(`https://www.pinterest.com/${clean}/`, {
      headers: { "Accept": "text/html" },
    });

    if (typeof html === "string" && !html.includes("Page not found")) {
      const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1];
      const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1];
      const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
      const canonical = html.match(/rel="canonical"\s+href="([^"]+)"/)?.[1];

      if (ogTitle && canonical?.includes(clean)) {
        entities.push(ent("social_profile", `https://www.pinterest.com/${clean}/`, "pinterest_user", 82, {
          platform: "Pinterest", username: clean,
          displayName: ogTitle?.replace(/ \| Pinterest.*/, "").trim(),
          bio: ogDesc, avatar: ogImage,
        }));
        if (ogImage) entities.push(ent("image_url", ogImage, "pinterest_user", 78, { platform: "Pinterest", username: clean, type: "profile_picture" }));
        emit({ type: "log", data: { message: `Pinterest ✓ ${clean}` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 8. SOUNDCLOUD — API publique
// ============================================================================
export const SoundcloudModule = {
  id: "soundcloud_user",
  name: "SoundCloud User",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const html: any = await http(`https://soundcloud.com/${clean}`, {
      headers: { "Accept": "text/html" },
    });
    if (typeof html === "string" && !html.includes("Sorry, something went wrong")) {
      const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1];
      const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1];
      const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];

      if (ogTitle && !ogTitle.includes("SoundCloud")) {
        entities.push(ent("social_profile", `https://soundcloud.com/${clean}`, "soundcloud_user", 82, {
          platform: "SoundCloud", username: clean,
          displayName: ogTitle.replace(/ \| SoundCloud.*/, "").trim(),
          bio: ogDesc, avatar: ogImage,
        }));
        if (ogImage) entities.push(ent("image_url", ogImage, "soundcloud_user", 75, { platform: "SoundCloud", username: clean, type: "profile_picture" }));
        emit({ type: "log", data: { message: `SoundCloud ✓ ${clean}` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 9. STEAM — public profile
// ============================================================================
export const SteamModule = {
  id: "steam_user",
  name: "Steam Community Profile",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const html: any = await http(`https://steamcommunity.com/id/${clean}`, {
      headers: { "Accept": "text/html" },
    });
    if (typeof html === "string" && html.includes("actual_persona_name")) {
      const personaName = html.match(/<span class="actual_persona_name">([^<]+)<\/span>/)?.[1];
      const avatar = html.match(/<div class="playerAvatarAutoSizeInner"[^>]*>\s*<img src="([^"]+)"/)?.[1];
      const country = html.match(/class="header_real_name ellipsis"[^>]*>([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]+>/g, "").trim();
      const steamId = html.match(/g_steamID\s*=\s*"(\d+)"/)?.[1];

      if (personaName) {
        entities.push(ent("social_profile", `https://steamcommunity.com/id/${clean}`, "steam_user", 85, {
          platform: "Steam", username: clean, displayName: personaName,
          avatar, country, steamId,
        }));
        if (avatar) entities.push(ent("image_url", avatar, "steam_user", 75, { platform: "Steam", username: clean, type: "profile_picture" }));
        if (steamId) entities.push(ent("fingerprint", steamId, "steam_user", 90, { type: "steam_id_64", username: clean }));
        emit({ type: "log", data: { message: `Steam ✓ ${clean} — ${personaName}` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 10. MEDIUM — profile lookup
// ============================================================================
export const MediumModule = {
  id: "medium_user",
  name: "Medium Profile",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    // Medium a un endpoint RSS public
    const rss: any = await http(`https://medium.com/feed/@${clean}`, {
      headers: { "Accept": "application/rss+xml,text/xml" },
    });
    if (typeof rss === "string" && rss.includes("<rss")) {
      const fullName = rss.match(/<atom:name>([^<]+)<\/atom:name>/)?.[1] || rss.match(/<dc:creator><!\[CDATA\[([^\]]+)\]\]><\/dc:creator>/)?.[1];
      const bio = rss.match(/<description>([^<]+)<\/description>/)?.[1];

      if (fullName) {
        entities.push(ent("social_profile", `https://medium.com/@${clean}`, "medium_user", 85, {
          platform: "Medium", username: clean, displayName: fullName, bio,
        }));
        if (fullName) entities.push(ent("person", fullName, "medium_user", 85, { platform: "Medium", username: clean }));

        // Extract recent posts titles
        const posts = [...rss.matchAll(/<title>([^<]+)<\/title>/g)].slice(1, 6).map(m => m[1]);
        if (posts.length) {
          entities.push(ent("metadata", `${posts.length} posts Medium`, "medium_user", 70, {
            username: clean, recentPosts: posts,
          }));
        }
        emit({ type: "log", data: { message: `Medium ✓ @${clean} — ${posts.length} posts` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 11. KEYBASE — user public profile
// ============================================================================
export const KeybaseModule = {
  id: "keybase_user",
  name: "Keybase Identity",
  category: "social",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const data: any = await http(`https://keybase.io/_/api/1.0/user/lookup.json?usernames=${clean}`);
    if (data?.them?.length) {
      const user = data.them[0];
      if (user?.id) {
        const proofs = user.proofs_summary?.all || [];
        const basics = user.basics || {};
        entities.push(ent("social_profile", `https://keybase.io/${clean}`, "keybase_user", 92, {
          platform: "Keybase", username: clean,
          displayName: user.profile?.full_name,
          bio: user.profile?.bio,
          avatar: user.pictures?.primary?.url,
          keybaseId: user.id,
          location: user.profile?.location,
          joined: basics.ctime ? new Date(basics.ctime * 1000).toISOString() : undefined,
          verifiedProofs: proofs.length,
        }));

        // Proofs Keybase → social profiles vérifiés
        for (const proof of proofs) {
          const platformMap: Record<string, string> = {
            twitter: "Twitter/X", github: "GitHub", reddit: "Reddit",
            hackernews: "HackerNews", facebook: "Facebook",
          };
          if (proof.nametag && proof.proof_type) {
            const platform = platformMap[proof.proof_type] || proof.proof_type;
            entities.push(ent("social_profile", proof.service_url, "keybase_user", 96, {
              platform, username: proof.nametag, verifiedByKeybase: true, fromKeybase: clean,
            }));
            entities.push(ent("username", proof.nametag, "keybase_user", 90, {
              platform, verifiedByKeybase: true, fromKeybase: clean,
            }));
          }
        }
        if (user.profile?.full_name) entities.push(ent("person", user.profile.full_name, "keybase_user", 88, { platform: "Keybase", username: clean }));
        emit({ type: "log", data: { message: `Keybase ✓ ${clean} — ${proofs.length} preuves` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 12. HACKERNEWS — Firebase API publique (gratuite)
// ============================================================================
export const HackerNewsModule = {
  id: "hackernews_user",
  name: "HackerNews User",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const user: any = await http(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(clean)}.json`);
    if (user?.id) {
      entities.push(ent("social_profile", `https://news.ycombinator.com/user?id=${user.id}`, "hackernews_user", 90, {
        platform: "HackerNews", username: user.id,
        karma: user.karma, about: user.about,
        created: user.created ? new Date(user.created * 1000).toISOString() : undefined,
        submitted: user.submitted?.length || 0,
      }));
      if (user.about) {
        // Nettoyer HTML tags dans about
        const cleanBio = user.about.replace(/<[^>]+>/g, " ").replace(/&#x2F;/g, "/").replace(/&amp;/g, "&");
        const emails = cleanBio.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
        emails.forEach((e: string) => entities.push(ent("email", e, "hackernews_user", 82, { fromBio: true, username: clean })));
        const urls = cleanBio.match(/https?:\/\/[^\s<>"']{5,80}/g) || [];
        urls.forEach((u: string) => entities.push(ent("url", u, "hackernews_user", 78, { fromBio: true, username: clean })));
      }
      emit({ type: "log", data: { message: `HackerNews ✓ ${clean} — karma ${user.karma}` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 13. GITLAB — public API
// ============================================================================
export const GitLabModule = {
  id: "gitlab_user",
  name: "GitLab User",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const users: any = await http(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(clean)}`);
    if (Array.isArray(users) && users.length > 0) {
      const u = users[0];
      entities.push(ent("social_profile", u.web_url, "gitlab_user", 88, {
        platform: "GitLab", username: u.username,
        displayName: u.name, avatar: u.avatar_url,
        userId: u.id, createdAt: u.created_at,
      }));
      if (u.avatar_url) entities.push(ent("image_url", u.avatar_url, "gitlab_user", 78, { platform: "GitLab", username: clean, type: "profile_picture" }));
      if (u.name) entities.push(ent("person", u.name, "gitlab_user", 85, { platform: "GitLab", username: clean }));
      emit({ type: "log", data: { message: `GitLab ✓ ${u.username}` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 14. DEV.TO — public API
// ============================================================================
export const DevToModule = {
  id: "devto_user",
  name: "Dev.to Profile",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const user: any = await http(`https://dev.to/api/users/by_username?url=${encodeURIComponent(clean)}`);
    if (user?.id) {
      entities.push(ent("social_profile", `https://dev.to/${user.username}`, "devto_user", 90, {
        platform: "Dev.to", username: user.username,
        displayName: user.name, bio: user.summary,
        avatar: user.profile_image, location: user.location,
        joined: user.joined_at, githubUsername: user.github_username,
        twitterUsername: user.twitter_username, websiteUrl: user.website_url,
      }));
      if (user.github_username) entities.push(ent("username", user.github_username, "devto_user", 88, { platform: "GitHub", fromDevto: clean }));
      if (user.twitter_username) entities.push(ent("username", user.twitter_username, "devto_user", 88, { platform: "Twitter/X", fromDevto: clean }));
      if (user.name) entities.push(ent("person", user.name, "devto_user", 85, { platform: "Dev.to", username: clean }));
      if (user.profile_image) entities.push(ent("image_url", user.profile_image, "devto_user", 80, { platform: "Dev.to", username: clean, type: "profile_picture" }));
      emit({ type: "log", data: { message: `Dev.to ✓ ${user.username}` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 15. PRODUCT HUNT — public maker profile
// ============================================================================
export const ProductHuntModule = {
  id: "producthunt_user",
  name: "Product Hunt Maker",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").trim();
    const entities: any[] = [];

    const html: any = await http(`https://www.producthunt.com/@${clean}`, {
      headers: { "Accept": "text/html" },
    });
    if (typeof html === "string" && !html.includes("Page not found")) {
      const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1];
      const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1];
      const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];

      if (ogTitle) {
        entities.push(ent("social_profile", `https://www.producthunt.com/@${clean}`, "producthunt_user", 82, {
          platform: "Product Hunt", username: clean,
          displayName: ogTitle.replace(/ on Product Hunt.*/, "").trim(),
          bio: ogDesc, avatar: ogImage,
        }));
        emit({ type: "log", data: { message: `ProductHunt ✓ ${clean}` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// EXPORT
// ============================================================================
export const socialMediaExtendedModules = [
  BlueskyModule, MastodonModule, ThreadsModule, TwitchModule, TikTokModule,
  VKModule, PinterestModule, SoundcloudModule, SteamModule, MediumModule,
  KeybaseModule, HackerNewsModule, GitLabModule, DevToModule, ProductHuntModule,
];
