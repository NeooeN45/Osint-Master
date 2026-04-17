// ============================================================================
// INSTAGRAM OSINT ENGINE — Ultra v1.0
// 12 modules dédiés : profil, réseau, géo, stories, hashtags, cross-platform,
// alt-accounts, business intel, contact info, instaloader, osintgram, HikerAPI
// ============================================================================

import axios from "axios";
import https from "https";
import { exec } from "child_process";
import { promisify } from "util";
import { extractPatterns } from "./socialDeepScan";

// Bypass self-signed proxy SSL (corporate/school networks)
const NO_SSL_AGENT = new https.Agent({ rejectUnauthorized: false });

const execAsync = promisify(exec);

// ---- Utilitaires internes ----
async function tryExec(cmd: string, ms = 30000): Promise<{ stdout: string; stderr: string } | null> {
  try {
    return await execAsync(cmd, { timeout: ms, maxBuffer: 10 * 1024 * 1024 });
  } catch (e: any) {
    return e.stdout ? { stdout: e.stdout, stderr: e.stderr || "" } : null;
  }
}

function eid() { return `ig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function ent(type: string, value: string, source: string, confidence: number, metadata: any = {}) {
  return { id: eid(), type, value, source, confidence, metadata, verified: confidence >= 80, depth: 0 };
}

// Headers rotatifs pour éviter le rate-limit Instagram
const IG_UA_POOL = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Instagram 275.0.0.27.98 Android (31/12; 420dpi; 1080x2200; Google; Pixel 6; oriole; exynos9825; en_US; 458229258)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];
function randUA() { return IG_UA_POOL[Math.floor(Math.random() * IG_UA_POOL.length)]; }

// Délai anti-ban entre requêtes
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// IG App IDs publics connus
const IG_APP_IDS = ["936619743392459", "1217981644879628", "1074698696650121"];
function randAppId() { return IG_APP_IDS[Math.floor(Math.random() * IG_APP_IDS.length)]; }

// Helper: axios.get avec SSL bypass
const axget = (url: string, cfg: any = {}) => axios.get(url, { httpsAgent: NO_SSL_AGENT, validateStatus: () => true, ...cfg } as any);
const axreq = (cfg: any) => (axios as any).request({ httpsAgent: NO_SSL_AGENT, validateStatus: () => true, ...cfg });

// ============================================================================
// MODULE 1 — PROFIL COMPLET (7 endpoints en cascade)
// ============================================================================
export const IgProfileModule = {
  id: "ig_profile",
  name: "Instagram Profile (multi-endpoint)",
  category: "social",
  targetTypes: ["username"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Profil multi-endpoint pour @${clean}...` } });
    const entities: any[] = [];
    let userData: any = null;

    // ── Endpoint 1 : web_profile_info (API v1, la plus riche) ──
    if (!userData) {
      try {
        const r = await axget(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${clean}`,
          {
            timeout: 12000,
            headers: {
              "User-Agent": randUA(),
              "X-IG-App-ID": randAppId(),
              "Accept": "application/json",
              "Referer": "https://www.instagram.com/",
              "X-Requested-With": "XMLHttpRequest",
            },
            validateStatus: () => true,
          } as any
        );
        const u = (r.data as any)?.data?.user;
        if (u?.id) userData = u;
      } catch {}
    }

    // ── Endpoint 2 : graphql query (ancienne API) ──
    if (!userData) {
      try {
        const r = await axget(
          `https://www.instagram.com/${clean}/?__a=1&__d=dis`,
          {
            timeout: 10000,
            headers: { "User-Agent": randUA(), "Accept": "application/json" },
            validateStatus: () => true,
          } as any
        );
        const u = (r.data as any)?.graphql?.user || (r.data as any)?.user;
        if (u?.id) userData = u;
      } catch {}
    }

    // ── Endpoint 3 : i.instagram.com API (mobile) ──
    if (!userData) {
      try {
        const r = await axget(
          `https://i.instagram.com/api/v1/users/web_profile_info/?username=${clean}`,
          {
            timeout: 10000,
            headers: {
              "User-Agent": "Instagram 219.0.0.12.117 Android (30/11; 420dpi; 1080x2400; Xiaomi; M2101K6G; rosemary; mt6781; en_US; 340282366841710300949128132973266645184)",
              "X-IG-App-ID": "567067343352427",
              "Accept": "application/json",
            },
            validateStatus: () => true,
          } as any
        );
        const u = (r.data as any)?.data?.user;
        if (u?.id) userData = u;
      } catch {}
    }

    // ── Endpoint 4 : scrape page HTML → window.__additionalDataLoaded ──
    if (!userData) {
      try {
        const r = await axget(`https://www.instagram.com/${clean}/`, {
          timeout: 12000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html",
          },
          validateStatus: () => true,
        } as any);
        const html = r.data as string;
        // Essai 1 : window._sharedData
        const m1 = html.match(/window\._sharedData\s*=\s*(\{.+?\});<\/script>/s);
        if (m1) {
          try {
            const sd = JSON.parse(m1[1]);
            const u = sd?.entry_data?.ProfilePage?.[0]?.graphql?.user;
            if (u?.id) userData = u;
          } catch {}
        }
        // Essai 2 : script JSON-LD
        if (!userData) {
          const m2 = html.match(/<script type="application\/ld\+json">(\{.+?\})<\/script>/s);
          if (m2) {
            try {
              const ld = JSON.parse(m2[1]);
              if (ld?.mainEntityofPage || ld?.url) {
                userData = {
                  id: null, username: clean,
                  full_name: ld.name,
                  biography: ld.description,
                  profile_pic_url: ld.image,
                };
              }
            } catch {}
          }
        }
        // Essai 3 : og:tags fallback
        if (!userData) {
          const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1];
          const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1];
          const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
          if (ogTitle && !ogTitle.includes("Instagram")) {
            const followers = ogDesc?.match(/([\d,.]+)\s*Followers/i)?.[1];
            const following = ogDesc?.match(/([\d,.]+)\s*Following/i)?.[1];
            const posts = ogDesc?.match(/([\d,.]+)\s*Posts/i)?.[1];
            userData = {
              id: null, username: clean,
              full_name: ogTitle.replace(/ \(@[^)]+\)/, "").replace(/ • Instagram.*/, "").trim(),
              biography: ogDesc,
              profile_pic_url: ogImg,
              edge_followed_by: { count: followers ? parseInt(followers.replace(/[,.]/g, "")) : null },
              edge_follow: { count: following ? parseInt(following.replace(/[,.]/g, "")) : null },
              edge_owner_to_timeline_media: { count: posts ? parseInt(posts.replace(/[,.]/g, "")) : null },
            };
          }
        }
      } catch {}
    }

    // ── Endpoint 5 : Picuki.com (proxy public, souvent accessible) ──
    if (!userData) {
      try {
        const r = await axget(`https://www.picuki.com/profile/${clean}`, {
          timeout: 10000,
          headers: { "User-Agent": randUA() },
          validateStatus: () => true,
        } as any);
        const html = r.data as string;
        const displayName = html.match(/class="profile-name-top"[^>]*>([^<]+)/)?.[1]?.trim();
        const bio = html.match(/class="profile-description"[^>]*>([^<]+)/)?.[1]?.trim();
        const followers = html.match(/Followers<\/span>\s*<span[^>]*>([\d,.KM]+)/i)?.[1];
        if (displayName) {
          userData = {
            id: null, username: clean,
            full_name: displayName,
            biography: bio,
            edge_followed_by: { count: followers },
            _source: "picuki",
          };
        }
      } catch {}
    }

    // ── Endpoint 6 : imginn.com (mirror IG) ──
    if (!userData) {
      try {
        const r = await axget(`https://imginn.com/${clean}/`, {
          timeout: 10000,
          headers: { "User-Agent": randUA() },
          validateStatus: () => true,
        } as any);
        const html = r.data as string;
        const displayName = html.match(/class="name"[^>]*>([^<]+)/)?.[1]?.trim()
          || html.match(/<title>([^|<]+)/i)?.[1]?.replace(/@[^)]+\)/, "").trim();
        const followers = html.match(/class="count"[^>]*>([\d,.KM]+)<\/span>\s*<span[^>]*>Followers/i)?.[1];
        const bio = html.match(/class="biography"[^>]*>([\s\S]{0,300}?)<\/p>/)?.[1]?.replace(/<[^>]+>/g, "").trim();
        if (displayName && !displayName.includes("imginn")) {
          userData = { id: null, username: clean, full_name: displayName, biography: bio, edge_followed_by: { count: followers }, _source: "imginn" };
        }
      } catch {}
    }

    // ── Endpoint 7 : storiesig.com (stories preview + profile) ──
    if (!userData) {
      try {
        const r = await axget(`https://storiesig.app/api/ig/userInfoByUsername/${clean}`, {
          timeout: 8000,
          headers: { "User-Agent": randUA(), "Accept": "application/json" },
          validateStatus: () => true,
        } as any);
        const d = (r.data as any)?.user || r.data as any;
        if (d?.pk || d?.username) {
          userData = { id: d.pk, username: d.username || clean, full_name: d.full_name, biography: d.biography, profile_pic_url: d.profile_pic_url_hd || d.profile_pic_url, edge_followed_by: { count: d.follower_count }, edge_follow: { count: d.following_count }, edge_owner_to_timeline_media: { count: d.media_count }, is_verified: d.is_verified, is_private: d.is_private, is_business_account: d.is_business, business_category_name: d.category, external_url: d.external_url, business_email: d.public_email, business_phone_number: d.public_phone_number };
        }
      } catch {}
    }

    // ── Endpoint 8 : iganony.com (mirror IG) ──
    if (!userData) {
      try {
        const r = await axget(`https://iganony.com/${clean}`, {
          timeout: 8000,
          headers: { "User-Agent": randUA() },
          validateStatus: () => true,
        } as any);
        const html = r.data as string;
        const displayName = html.match(/class="[^"]*username[^"]*"[^>]*>\s*([^<]{2,50})/i)?.[1]?.trim()
          || html.match(/<title>([^<|]+)/i)?.[1]?.replace(/@[^)]+\)/, "").trim();
        const followers = html.match(/([\d,.KM]+)\s*[Ff]ollowers/)?.[1];
        const bio = html.match(/class="[^"]*bio[^"]*"[^>]*>\s*([^<]{5,300})/i)?.[1]?.trim();
        if (displayName && !displayName.toLowerCase().includes("iganony")) {
          userData = { id: null, username: clean, full_name: displayName, biography: bio, edge_followed_by: { count: followers }, _source: "iganony" };
        }
      } catch {}
    }

    // ── Endpoint 9 : instanavigation.com (public profile API) ──
    if (!userData) {
      try {
        const r = await axget(`https://instanavigation.com/api/user/${clean}`, {
          timeout: 8000,
          headers: { "User-Agent": randUA(), "Accept": "application/json", "Referer": "https://instanavigation.com/" },
          validateStatus: () => true,
        } as any);
        const d = r.data as any;
        if (d?.username || d?.full_name) {
          userData = {
            id: d.pk || d.id, username: d.username || clean,
            full_name: d.full_name, biography: d.biography,
            profile_pic_url: d.profile_pic_url_hd || d.profile_pic_url,
            edge_followed_by: { count: d.follower_count }, edge_follow: { count: d.following_count },
            edge_owner_to_timeline_media: { count: d.media_count },
            is_verified: d.is_verified, is_private: d.is_private,
            external_url: d.external_url,
            business_email: d.public_email, business_phone_number: d.public_phone_number,
            _source: "instanavigation",
          };
        }
      } catch {}
    }

    // ── Endpoint 10 : gramhir.com (scraping public, dernière chance) ──
    if (!userData) {
      try {
        const r = await axget(`https://gramhir.com/profile/${clean}/`, {
          timeout: 8000,
          headers: { "User-Agent": randUA() },
          validateStatus: () => true,
        } as any);
        const html = r.data as string;
        const fullName = html.match(/class="profile-name"[^>]*>([^<]{2,80})/i)?.[1]?.trim();
        const bio = html.match(/class="profile-bio"[^>]*>([\s\S]{0,300}?)<\//i)?.[1]?.replace(/<[^>]+>/g, "").trim();
        const followers = html.match(/([\d,.KM]+)\s*<span[^>]*>[Ff]ollowers/)?.[1];
        if (fullName) {
          userData = { id: null, username: clean, full_name: fullName, biography: bio, edge_followed_by: { count: followers }, _source: "gramhir" };
        }
      } catch {}
    }

    // ── Traitement des données récoltées ──
    if (userData) {
      const bio = userData.biography || userData.bio || "";
      const fullName = userData.full_name || userData.fullName || "";
      const followers = userData.edge_followed_by?.count ?? userData.follower_count;
      const following = userData.edge_follow?.count ?? userData.following_count;
      const posts = userData.edge_owner_to_timeline_media?.count ?? userData.media_count;

      const avatarUrl = userData.profile_pic_url_hd || userData.profile_pic_url || "";
      entities.push(ent("social_profile", `https://www.instagram.com/${clean}/`, "ig_profile", 95, {
        platform: "Instagram", username: clean, userId: userData.id,
        displayName: fullName, bio, followers, following, posts,
        verified: userData.is_verified, private: userData.is_private,
        businessAccount: userData.is_business_account,
        businessCategory: userData.business_category_name,
        externalUrl: userData.external_url,
        avatar: avatarUrl,
        dataSource: userData._source || "instagram_api",
      }));
      // Émettre l'avatar comme image_url → déclenche reverse_image_search automatiquement
      if (avatarUrl && !avatarUrl.includes("44884218_345707102882519")) { // exclure avatar par défaut IG
        entities.push(ent("image_url", avatarUrl, "ig_profile", 88, {
          username: clean, platform: "Instagram", type: "profile_picture",
        }));
      }

      if (fullName && fullName !== clean) {
        entities.push(ent("person", fullName, "ig_profile", 90, { username: clean, platform: "Instagram" }));
      }
      if (userData.external_url) {
        entities.push(ent("url", userData.external_url, "ig_profile", 90, { username: clean, type: "bio_link" }));
      }
      if (bio) {
        entities.push(...extractPatterns(bio, "ig_bio", { username: clean }));
      }
      // Contact business (souvent exposé publiquement)
      if (userData.business_email) {
        entities.push(ent("email", userData.business_email, "ig_profile", 96, { username: clean, type: "business_email" }));
      }
      if (userData.business_phone_number) {
        entities.push(ent("phone", userData.business_phone_number, "ig_profile", 96, { username: clean, type: "business_phone" }));
      }
      if (userData.business_address_json) {
        try {
          const addr = JSON.parse(userData.business_address_json);
          const loc = [addr.street_address, addr.city_name, addr.region_name, addr.country_code].filter(Boolean).join(", ");
          if (loc) entities.push(ent("location", loc, "ig_profile", 92, { username: clean, type: "business_address" }));
        } catch {}
      }

      emit({ type: "log", data: { message: `[IG] @${clean}: ${followers ?? "?"} followers, privé: ${userData.is_private}` } });
    } else {
      // Compte inexistant ou bloqué — on le note
      entities.push(ent("metadata", `@${clean} — profil non accessible (privé ou inexistant)`, "ig_profile", 50, { username: clean, checked: true }));
    }

    return { success: entities.length > 0, data: { username: clean, found: !!userData }, entities };
  },
};

// ============================================================================
// MODULE 1b — PHONE → INSTAGRAM ACCOUNT (users/lookup API)
// ============================================================================
export const IgPhoneLookupModule = {
  id: "ig_phone_lookup",
  name: "Instagram Phone → Account Lookup",
  category: "phone",
  targetTypes: ["phone"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `[IG] Phone lookup: ${target} → username Instagram...` } });
    const entities: any[] = [];

    // Normaliser le numéro : +33769723999 ou 0769723999 → +33769723999
    const clean = target.replace(/\s/g, "");
    let e164 = clean;
    if (clean.startsWith("0") && !clean.startsWith("00")) {
      e164 = "+33" + clean.slice(1);
    } else if (clean.startsWith("00")) {
      e164 = "+" + clean.slice(2);
    }

    // Signature HMAC-SHA256 (clé publique de l'app Instagram Android)
    const SIG_KEY = "e6358aeede676184b9fe702b30f4fd35e71744605e39d2181a34cede076b3c33";
    const SIG_VER = "4";

    const crypto = await import("crypto");
    function genSig(data: string): string {
      const sig = crypto.createHmac("sha256", SIG_KEY).update(data).digest("hex");
      return `ig_sig_key_version=${SIG_VER}&signed_body=${sig}.${encodeURIComponent(data)}`;
    }

    const payload = JSON.stringify({
      login_attempt_count: "0",
      directly_sign_in: "true",
      source: "default",
      q: e164,
      ig_sig_key_version: SIG_VER,
    });

    const IG_MOBILE_UAS = [
      "Instagram 101.0.0.15.120 Android (28/9; 360dpi; 720x1480; samsung; SM-G960F; starlte; samsungexynos9810; en_US; 161773481)",
      "Instagram 219.0.0.12.117 Android (30/11; 420dpi; 1080x2400; Xiaomi; M2101K6G; rosemary; mt6781; en_US; 340282366841710300)",
      "Instagram 275.0.0.27.98 Android (31/12; 420dpi; 1080x2200; Google; Pixel 6; oriole; exynos9825; en_US; 458229258)",
    ];

    let found = false;
    for (const ua of IG_MOBILE_UAS) {
      try {
        const r = await (axios as any).post(
          "https://i.instagram.com/api/v1/users/lookup/",
          genSig(payload),
          {
            timeout: 12000,
            httpsAgent: NO_SSL_AGENT,
            validateStatus: () => true,
            headers: {
              "User-Agent": ua,
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "Accept-Language": "en-US",
              "Accept-Encoding": "gzip, deflate",
              "X-FB-HTTP-Engine": "Liger",
              "Connection": "close",
            },
          } as any
        );

        const d = r.data as any;
        emit({ type: "log", data: { message: `[IG Lookup] HTTP ${r.status} — ${JSON.stringify(d).slice(0, 120)}` } });

        if (r.status === 429 || (r.status >= 400 && !d?.user && !d?.multiple_users_list)) {
          await sleep(1500);
          continue;
        }

        // Cas 1 : un seul compte lié
        if (d?.user) {
          const u = d.user;
          const username = u.username;
          const fullName = u.full_name || u.name || "";
          const maskedEmail = u.obfuscated_email || u.email || "";
          const maskedPhone = u.obfuscated_phone || u.phone_number || "";
          const picUrl = u.profile_pic_url_hd || u.profile_pic_url || "";

          emit({ type: "log", data: { message: `[IG Lookup] ✅ Compte trouvé: @${username} (${fullName})` } });

          if (username) {
            entities.push(ent("username", username, "ig_phone_lookup", 95, {
              platform: "Instagram", phone: target, derivedFrom: "phone_lookup",
              fullName, maskedEmail, maskedPhone,
            }));
            entities.push(ent("social_profile", `https://www.instagram.com/${username}/`, "ig_phone_lookup", 95, {
              platform: "Instagram", username, phone: target,
              fullName, avatar: picUrl,
            }));
          }
          if (fullName) entities.push(ent("person", fullName, "ig_phone_lookup", 88, { username, phone: target }));
          if (maskedEmail) entities.push(ent("email", maskedEmail, "ig_phone_lookup", 75, { username, masked: true, phone: target }));
          if (maskedPhone) entities.push(ent("phone", maskedPhone, "ig_phone_lookup", 75, { username, masked: true }));
          // Photo de profil → déclenche reverse_image_search automatiquement
          if (picUrl && !picUrl.includes("44884218_345707102882519")) {
            entities.push(ent("image_url", picUrl, "ig_phone_lookup", 88, {
              username, platform: "Instagram", type: "profile_picture", phone: target,
            }));
          }
          found = true;
          break;
        }

        // Cas 2 : plusieurs comptes liés au même numéro
        if (d?.multiple_users_list?.length) {
          emit({ type: "log", data: { message: `[IG Lookup] ✅ ${d.multiple_users_list.length} comptes liés à ce numéro` } });
          for (const u of d.multiple_users_list) {
            const username = u.username;
            if (!username) continue;
            entities.push(ent("username", username, "ig_phone_lookup", 93, {
              platform: "Instagram", phone: target,
              maskedEmail: u.obfuscated_email, maskedPhone: u.obfuscated_phone,
            }));
            entities.push(ent("social_profile", `https://www.instagram.com/${username}/`, "ig_phone_lookup", 93, {
              platform: "Instagram", username, phone: target,
            }));
          }
          found = true;
          break;
        }

        // Cas 3 : "No users found" = numéro non enregistré
        if (d?.message === "No users found") {
          emit({ type: "log", data: { message: `[IG Lookup] ❌ Aucun compte Instagram lié à ce numéro` } });
          found = true;
          break;
        }

      } catch (e: any) {
        emit({ type: "log", data: { message: `[IG Lookup] Erreur: ${e.message}` } });
      }
      await sleep(1000);
    }

    if (!found) {
      emit({ type: "log", data: { message: `[IG Lookup] Rate limit — réessayer dans quelques minutes` } });
    }

    return { success: entities.length > 0, data: { phone: target, found: entities.length > 0 }, entities };
  },
};

// ============================================================================
// MODULE 2 — CONTACT INFO (password reset trick)
// ============================================================================
export const IgContactModule = {
  id: "ig_contact",
  name: "Instagram Contact Info (password reset)",
  category: "social",
  targetTypes: ["username"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Contact info (password reset trick) pour @${clean}...` } });
    const entities: any[] = [];

    // Step 1: récupérer l'userId
    let userId: string | null = null;
    try {
      const r = await axget(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${clean}`, {
        timeout: 8000,
        headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId(), "Accept": "application/json" },
        validateStatus: () => true,
      } as any);
      userId = (r.data as any)?.data?.user?.id || null;
    } catch {}

    // Step 2: password reset → révèle email/phone partiels masqués
    const payloads = [
      userId ? `user_id=${userId}` : null,
      `username=${encodeURIComponent(clean)}`,
      `email=${encodeURIComponent(clean)}`,
    ].filter(Boolean) as string[];

    for (const payload of payloads) {
      try {
        const r = await axios.post(
          "https://www.instagram.com/api/v1/accounts/send_password_reset/",
          payload,
          {
            timeout: 8000,
            headers: {
              "User-Agent": randUA(),
              "X-IG-App-ID": randAppId(),
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json",
              "Referer": "https://www.instagram.com/accounts/password/reset/",
            },
            validateStatus: () => true,
          } as any
        );
        const d = r.data as any;

        const maskedEmail = d?.email || d?.obfuscated_email;
        const maskedPhone = d?.phone_number || d?.obfuscated_phone;

        if (maskedEmail) {
          entities.push(ent("email", maskedEmail, "ig_contact", 87, {
            username: clean, userId, masked: true, note: "Email partiel — IG password reset",
          }));
          emit({ type: "log", data: { message: `[IG] Email masqué: ${maskedEmail}` } });
        }
        if (maskedPhone) {
          entities.push(ent("phone", maskedPhone, "ig_contact", 87, {
            username: clean, userId, masked: true, note: "Téléphone partiel — IG password reset",
          }));
          emit({ type: "log", data: { message: `[IG] Téléphone masqué: ${maskedPhone}` } });
        }
        if (maskedEmail || maskedPhone) break;
      } catch {}
      await sleep(800);
    }

    return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
  },
};

// ============================================================================
// MODULE 3 — NETWORK ANALYSIS (followers/following bulk)
// ============================================================================
export const IgNetworkModule = {
  id: "ig_network",
  name: "Instagram Network Analysis",
  category: "social",
  targetTypes: ["username"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Analyse réseau followers/following pour @${clean}...` } });
    const entities: any[] = [];

    // Récupère userId + cookie csrf via la page profile
    let userId: string | null = null;
    let csrfToken: string | null = null;

    try {
      const profileR = await axget(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${clean}`, {
        timeout: 10000,
        headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId() },
        validateStatus: () => true,
      } as any);
      userId = (profileR.data as any)?.data?.user?.id || null;
      const rawCookie = profileR.headers?.["set-cookie"];
      const setCookie = (Array.isArray(rawCookie) ? rawCookie.join(";") : rawCookie || "");
      csrfToken = setCookie.match(/csrftoken=([^;]+)/)?.[1] || null;
    } catch {}

    if (!userId) {
      emit({ type: "log", data: { message: `[IG Network] userId non trouvé pour @${clean}` } });
      return { success: false, data: { username: clean }, entities };
    }

    // Followers (max 50 pour rester discret)
    let followersData: any[] = [];
    try {
      const r = await axget(
        `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=50`,
        {
          timeout: 12000,
          headers: {
            "User-Agent": randUA(),
            "X-IG-App-ID": randAppId(),
            "X-CSRFToken": csrfToken || "",
            "Accept": "application/json",
          },
          validateStatus: () => true,
        } as any
      );
      followersData = (r.data as any)?.users || [];
    } catch {}

    // Following (max 50)
    let followingData: any[] = [];
    try {
      await sleep(1200);
      const r = await axget(
        `https://www.instagram.com/api/v1/friendships/${userId}/following/?count=50`,
        {
          timeout: 12000,
          headers: {
            "User-Agent": randUA(),
            "X-IG-App-ID": randAppId(),
            "X-CSRFToken": csrfToken || "",
            "Accept": "application/json",
          },
          validateStatus: () => true,
        } as any
      );
      followingData = (r.data as any)?.users || [];
    } catch {}

    // Traitement : extraire infos de chaque compte
    const processUsers = (users: any[], relation: string) => {
      for (const u of users.slice(0, 30)) {
        if (!u.username) continue;
        entities.push(ent("social_profile", `https://www.instagram.com/${u.username}/`, "ig_network", 78, {
          platform: "Instagram", username: u.username, displayName: u.full_name,
          verified: u.is_verified, private: u.is_private,
          avatar: u.profile_pic_url, relation,
          targetUsername: clean,
        }));
        if (u.full_name && u.full_name !== u.username) {
          entities.push(ent("person", u.full_name, "ig_network", 70, { username: u.username, relation, targetUsername: clean }));
        }
      }
    };

    processUsers(followersData, "follower");
    processUsers(followingData, "following");

    // Mutual friends (intersection)
    const followerNames = new Set(followersData.map((u: any) => u.username));
    const mutuals = followingData.filter((u: any) => followerNames.has(u.username));
    if (mutuals.length > 0) {
      entities.push(ent("metadata",
        `Mutual accounts (${mutuals.length}): ${mutuals.slice(0, 10).map((u: any) => "@" + u.username).join(", ")}`,
        "ig_network", 82, { username: clean, mutualCount: mutuals.length }
      ));
    }

    emit({ type: "log", data: { message: `[IG Network] ${followersData.length} followers, ${followingData.length} following analysés` } });
    return { success: entities.length > 0, data: { username: clean, followers: followersData.length, following: followingData.length, mutuals: mutuals.length }, entities };
  },
};

// ============================================================================
// MODULE 4 — GEOFENCING (GPS posts + timeline d'activité)
// ============================================================================
export const IgGeoModule = {
  id: "ig_geofence",
  name: "Instagram Geofencing & Activity",
  category: "social",
  targetTypes: ["username"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Géofencing GPS + activité pour @${clean}...` } });
    const entities: any[] = [];

    let posts: any[] = [];

    // Récupère les posts via l'API v1
    try {
      const profileR = await axget(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${clean}`, {
        timeout: 10000,
        headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId() },
        validateStatus: () => true,
      } as any);
      const u = (profileR.data as any)?.data?.user;
      if (u) {
        posts = u.edge_owner_to_timeline_media?.edges?.map((e: any) => e.node) || [];
      }
    } catch {}

    // Fallback : picuki (affiche les posts publics)
    if (posts.length === 0) {
      try {
        const r = await axget(`https://www.picuki.com/profile/${clean}`, {
          timeout: 10000, headers: { "User-Agent": randUA() }, validateStatus: () => true,
        } as any);
        const html = r.data as string;
        const locationMatches = [...html.matchAll(/class="(?:location|post-location)[^"]*"[^>]*>([^<]+)/g)];
        for (const m of locationMatches.slice(0, 20)) {
          const loc = m[1].trim();
          if (loc) {
            entities.push(ent("location", loc, "ig_geofence", 75, { username: clean, source: "picuki" }));
          }
        }
      } catch {}
    }

    // Analyse des posts : GPS, heures, lieux
    const locations = new Map<string, number>();
    const hours: number[] = [];
    const days: number[] = [];

    for (const post of posts.slice(0, 50)) {
      // GPS direct du post
      if (post.location) {
        const locName = post.location.name;
        const lat = post.location.lat;
        const lng = post.location.lng;
        locations.set(locName, (locations.get(locName) || 0) + 1);
        entities.push(ent("location", locName, "ig_geofence", 88, {
          username: clean, postId: post.id, lat, lng,
          count: locations.get(locName), source: "post_gps",
        }));
      }

      // Timestamp → heure + jour de semaine
      if (post.taken_at_timestamp) {
        const d = new Date(post.taken_at_timestamp * 1000);
        hours.push(d.getHours());
        days.push(d.getDay()); // 0=dimanche, 6=samedi
      }

      // Captions → patterns
      const caption = post.edge_media_to_caption?.edges?.[0]?.node?.text || "";
      if (caption) {
        entities.push(...extractPatterns(caption, "ig_caption", { username: clean, postId: post.id }));
      }

      // Accessibility caption (IA Instagram)
      const accessCap = post.accessibility_caption || "";
      if (accessCap) {
        const locInCaption = accessCap.match(/(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g) || [];
        for (const l of locInCaption.slice(0, 3)) {
          entities.push(ent("location", l.replace(/^(?:in|at|near)\s+/i, ""), "ig_ai_caption", 60, { username: clean, postId: post.id }));
        }
      }
    }

    // Top lieux
    const topLocs = [...locations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [loc, count] of topLocs) {
      if (count >= 2) {
        entities.push(ent("metadata", `Zone fréquente: ${loc} (${count} posts)`, "ig_geofence", 80, { username: clean, location: loc, postCount: count }));
      }
    }

    // Pattern horaire
    if (hours.length >= 5) {
      const hourFreq: Record<number, number> = {};
      hours.forEach(h => { hourFreq[h] = (hourFreq[h] || 0) + 1; });
      const peakHour = Object.entries(hourFreq).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
      if (peakHour) {
        entities.push(ent("metadata", `Heure de poste habituelle: ${peakHour}h00`, "ig_geofence", 72, { username: clean, hourFrequency: hourFreq }));
      }

      // Détecter timezone approximative
      const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
      const timezone = avgHour >= 6 && avgHour <= 22 ? "diurne (UTC+0/+2 probable)" : "noctambule ou hors Europe";
      entities.push(ent("metadata", `Profil temporel: ${timezone}`, "ig_geofence", 60, { username: clean, avgPostHour: avgHour.toFixed(1) }));
    }

    emit({ type: "log", data: { message: `[IG Geo] ${posts.length} posts analysés, ${locations.size} lieux uniques` } });
    return { success: entities.length > 0, data: { username: clean, postsAnalyzed: posts.length, uniqueLocations: locations.size }, entities };
  },
};

// ============================================================================
// MODULE 5 — STORIES & HIGHLIGHTS
// ============================================================================
export const IgStoriesModule = {
  id: "ig_stories",
  name: "Instagram Stories & Highlights",
  category: "social",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Stories & Highlights pour @${clean}...` } });
    const entities: any[] = [];

    // Méthode 1 : storiesig.app (viewer public de stories)
    try {
      const r = await axget(`https://storiesig.app/api/ig/stories/${clean}`, {
        timeout: 10000, headers: { "User-Agent": randUA(), "Accept": "application/json" }, validateStatus: () => true,
      } as any);
      const stories = (r.data as any)?.data || [];
      if (Array.isArray(stories) && stories.length > 0) {
        emit({ type: "log", data: { message: `[IG Stories] ${stories.length} stories trouvées` } });
        for (const s of stories.slice(0, 10)) {
          const url = s.video_url || s.image_url || s.display_url;
          if (url) {
            entities.push(ent("url", url, "ig_stories", 78, {
              username: clean, type: s.is_video ? "story_video" : "story_image",
              timestamp: s.taken_at, duration: s.video_duration,
              location: s.story_location?.name,
            }));
          }
          if (s.story_location?.name) {
            entities.push(ent("location", s.story_location.name, "ig_stories", 82, { username: clean, source: "story_location" }));
          }
          if (s.story_link?.url) {
            entities.push(ent("url", s.story_link.url, "ig_stories", 88, { username: clean, type: "story_link" }));
          }
        }
      }
    } catch {}

    // Méthode 2 : highlights via API storiesig
    try {
      const r = await axget(`https://storiesig.app/api/ig/highlights/${clean}`, {
        timeout: 10000, headers: { "User-Agent": randUA(), "Accept": "application/json" }, validateStatus: () => true,
      } as any);
      const highlights = (r.data as any)?.data || [];
      if (Array.isArray(highlights) && highlights.length > 0) {
        emit({ type: "log", data: { message: `[IG Stories] ${highlights.length} highlights trouvés` } });
        for (const h of highlights) {
          entities.push(ent("metadata", `Highlight: "${h.title}" (${h.media_count || "?"} items)`, "ig_stories", 72, {
            username: clean, highlightId: h.id, title: h.title, coverUrl: h.cover_media?.thumbnail_src,
          }));
        }
      }
    } catch {}

    // Méthode 3 : insta-stories.to (viewer alternatif)
    try {
      const r = await axget(`https://insta-stories.to/user/${clean}`, {
        timeout: 8000, headers: { "User-Agent": randUA() }, validateStatus: () => true,
      } as any);
      const html = r.data as string;
      if (html?.includes("story") && !html.includes("No stories")) {
        const storyUrls = [...new Set((html.match(/https?:\/\/[^\s"']+\.(?:mp4|jpg|jpeg|webp)[^\s"']*/g) || []) as string[])];
        for (const url of storyUrls.slice(0, 5)) {
          entities.push(ent("url", url, "ig_stories", 70, { username: clean, type: "story_media" }));
        }
      }
    } catch {}

    return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
  },
};

// ============================================================================
// MODULE 6 — HASHTAG OSINT (qui d'autre utilise le même hashtag)
// ============================================================================
export const IgHashtagModule = {
  id: "ig_hashtag",
  name: "Instagram Hashtag OSINT",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Hashtag OSINT pour @${clean}...` } });
    const entities: any[] = [];

    // D'abord, récupérer les hashtags utilisés par le profil
    let hashtags: string[] = [];
    try {
      const r = await axget(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${clean}`, {
        timeout: 10000, headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId() }, validateStatus: () => true,
      } as any);
      const u = (r.data as any)?.data?.user;
      const posts = u?.edge_owner_to_timeline_media?.edges || [];
      const allCaptions = posts.map((e: any) => e.node?.edge_media_to_caption?.edges?.[0]?.node?.text || "").join(" ");
      hashtags = [...new Set((allCaptions.match(/#[\w\u00C0-\u024F]+/g) || []) as string[])];
    } catch {}

    if (hashtags.length === 0) {
      return { success: false, data: { username: clean, message: "No posts/hashtags found" }, entities };
    }

    emit({ type: "log", data: { message: `[IG Hashtag] ${hashtags.length} hashtags trouvés: ${hashtags.slice(0, 5).join(", ")}...` } });

    // Enregistrer les hashtags comme entités
    entities.push(ent("metadata", `Hashtags utilisés: ${hashtags.slice(0, 20).join(", ")}`, "ig_hashtag", 80, {
      username: clean, hashtags: hashtags.slice(0, 20), count: hashtags.length,
    }));

    // Pour les top 3 hashtags, chercher d'autres comptes qui les utilisent
    for (const tag of hashtags.slice(0, 3)) {
      const tagClean = tag.replace(/^#/, "");
      try {
        await sleep(800);
        const r = await axget(
          `https://www.instagram.com/api/v1/tags/${encodeURIComponent(tagClean)}/sections/?count=12&tab=top`,
          {
            timeout: 10000,
            headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId(), "Accept": "application/json" },
            validateStatus: () => true,
          } as any
        );
        const sections = (r.data as any)?.sections || [];
        for (const section of sections) {
          for (const item of (section.layout_content?.medias || []).slice(0, 5)) {
            const u = item.media?.user;
            if (u?.username && u.username !== clean) {
              entities.push(ent("social_profile", `https://www.instagram.com/${u.username}/`, "ig_hashtag", 68, {
                platform: "Instagram", username: u.username, displayName: u.full_name,
                verified: u.is_verified, sharedHashtag: tag, targetUsername: clean,
              }));
            }
          }
        }
      } catch {}
    }

    return { success: entities.length > 0, data: { username: clean, hashtagsFound: hashtags.length }, entities };
  },
};

// ============================================================================
// MODULE 7 — TAGGED POSTS & MENTIONS
// ============================================================================
export const IgTaggedModule = {
  id: "ig_tagged",
  name: "Instagram Tagged Posts & Mentions",
  category: "social",
  targetTypes: ["username"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Tagged posts & mentions pour @${clean}...` } });
    const entities: any[] = [];

    // Posts où le compte est tagué
    try {
      const r = await axget(
        `https://www.instagram.com/api/v1/usertags/${clean}/feed/?count=20`,
        {
          timeout: 10000,
          headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId(), "Accept": "application/json" },
          validateStatus: () => true,
        } as any
      );
      const items = (r.data as any)?.items || [];
      const taggers = new Map<string, number>();

      for (const item of items.slice(0, 20)) {
        const tagger = item.user?.username;
        if (tagger && tagger !== clean) {
          taggers.set(tagger, (taggers.get(tagger) || 0) + 1);
        }
        // Extraire texte de la caption
        const caption = item.caption?.text || "";
        if (caption) entities.push(...extractPatterns(caption, "ig_tagged", { username: clean, tagger }));
        // Localisation
        if (item.location?.name) {
          entities.push(ent("location", item.location.name, "ig_tagged", 75, { username: clean, type: "tagged_post_location" }));
        }
      }

      // Top taggers = personnes proches
      for (const [tagger, count] of [...taggers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
        entities.push(ent("social_profile", `https://www.instagram.com/${tagger}/`, "ig_tagged", 72, {
          platform: "Instagram", username: tagger, relation: "tags_target",
          tagCount: count, targetUsername: clean,
        }));
      }
      emit({ type: "log", data: { message: `[IG Tagged] ${items.length} posts tagués, ${taggers.size} personnes uniques` } });
    } catch {}

    // Mentions dans les commentaires (via picuki)
    try {
      const r = await axget(`https://www.picuki.com/profile/${clean}`, {
        timeout: 10000, headers: { "User-Agent": randUA() }, validateStatus: () => true,
      } as any);
      const html = r.data as string;
      const mentions = [...new Set((html.match(/@([a-zA-Z0-9_\.]{3,30})/g) || []) as string[])];
      for (const m of mentions.filter(x => x.slice(1) !== clean).slice(0, 15)) {
        entities.push(ent("username", m.slice(1), "ig_tagged_picuki", 62, { mentionedIn: `${clean}_profile`, platform: "Instagram" }));
      }
    } catch {}

    return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
  },
};

// ============================================================================
// MODULE 8 — CROSS-PLATFORM (username → 20 plateformes en parallèle)
// ============================================================================
export const IgCrossPlatformModule = {
  id: "ig_cross_platform",
  name: "Instagram → Cross-Platform Search",
  category: "social",
  targetTypes: ["username"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Cross-platform pour @${clean} (20 plateformes)...` } });
    const entities: any[] = [];

    // Plateformes : notFoundPatterns = faux, confirmPatterns = vrai (au moins un doit matcher)
    // confirmPatterns vide = on se fie uniquement au status HTTP + notFound
    const platforms: Array<{ name: string; url: string; notFoundPatterns: string[]; confirmPatterns: string[] }> = [
      { name: "Twitter/X",   url: `https://twitter.com/${clean}`,                  notFoundPatterns: ["this account doesn't exist", "sorry, that page doesn't exist"], confirmPatterns: [`@${clean}`, `"screen_name":"${clean}"`] },
      { name: "TikTok",      url: `https://www.tiktok.com/@${clean}`,              notFoundPatterns: ["couldn't find this account", "Page not found"], confirmPatterns: [`@${clean}`, `"uniqueId":"${clean}"`] },
      { name: "YouTube",     url: `https://www.youtube.com/@${clean}`,             notFoundPatterns: ["404", "This page isn't available"], confirmPatterns: [`@${clean}`, "channelId", "subscriberCountText"] },
      { name: "Reddit",      url: `https://www.reddit.com/user/${clean}/about.json`, notFoundPatterns: ["NOT_FOUND", "User Not Found", "\"error\": 404"], confirmPatterns: [`"name":"${clean}"`, `"name": "${clean}"`] },
      { name: "GitHub",      url: `https://github.com/${clean}`,                   notFoundPatterns: ["Not Found", "This is not the web page"], confirmPatterns: [`/${clean}`, "contribution", "repositories"] },
      { name: "LinkedIn",    url: `https://www.linkedin.com/in/${clean}`,          notFoundPatterns: ["Page not found", "profile doesn't exist", "This LinkedIn Page isn't available"], confirmPatterns: ["profileSection", "pv-top-card"] },
      { name: "Pinterest",   url: `https://www.pinterest.fr/${clean}/`,            notFoundPatterns: ["Sorry!", "couldn't find", "Page not found"], confirmPatterns: [`"username":"${clean}"`, `pinterest.com/${clean}/pins`] },
      { name: "Tumblr",      url: `https://${clean}.tumblr.com/`,                  notFoundPatterns: ["There's nothing here", "Not Found", "tumblr.com/register"], confirmPatterns: ["tumblr-blog", "post", "reblog"] },
      { name: "Snapchat",    url: `https://www.snapchat.com/add/${clean}`,         notFoundPatterns: ["Sorry, this page", "doesn't exist"], confirmPatterns: [`@${clean}`, "snapcode", "AddFriends"] },
      { name: "Twitch",      url: `https://www.twitch.tv/${clean}`,                notFoundPatterns: ["Sorry. Unless", "404 Not Found"], confirmPatterns: ["channel", "stream", `"login":"${clean}"`] },
      { name: "SoundCloud",  url: `https://soundcloud.com/${clean}`,               notFoundPatterns: ["404", "Not found", "Sorry! We can"], confirmPatterns: [`soundcloud.com/${clean}`, "waveform", "sc-artwork"] },
      { name: "Medium",      url: `https://medium.com/@${clean}`,                  notFoundPatterns: ["404", "Page not found", "doesn't exist"], confirmPatterns: [`@${clean}`, "postPreview", "medium-feed"] },
      { name: "DeviantArt",  url: `https://www.deviantart.com/${clean}`,           notFoundPatterns: ["Page Not Found", "404"], confirmPatterns: ["userpage", "deviations", `deviantart.com/${clean}`] },
      { name: "Flickr",      url: `https://www.flickr.com/people/${clean}`,        notFoundPatterns: ["Nobody here", "Page not found"], confirmPatterns: ["photostream", "faves", "flickr-person"] },
      { name: "Steam",       url: `https://steamcommunity.com/id/${clean}`,        notFoundPatterns: ["The specified profile could not be found"], confirmPatterns: ["profile_header", "persona_name", "miniprofile"] },
      { name: "Vimeo",       url: `https://vimeo.com/${clean}`,                    notFoundPatterns: ["Sorry, we couldn't find", "404"], confirmPatterns: [`vimeo.com/${clean}`, "videoContainer", "clips_count"] },
      { name: "Telegram",    url: `https://t.me/${clean}`,                         notFoundPatterns: ["tgme_page_not_found", "If you have Telegram, you can contact"], confirmPatterns: ["tgme_page_title", "tgme_page_description"] },
      { name: "Facebook",    url: `https://www.facebook.com/${clean}`,             notFoundPatterns: ["Page Not Found", "This page isn't available", "content-unavailable"], confirmPatterns: ["timeline", `facebook.com/${clean}`, "profileBio"] },
      { name: "Patreon",     url: `https://www.patreon.com/${clean}`,              notFoundPatterns: ["404", "Page Not Found", "Oops"], confirmPatterns: ["patreon-nav", "creator-name", `patreon.com/${clean}`] },
      { name: "Keybase",     url: `https://keybase.io/${clean}`,                   notFoundPatterns: ["404", "User not found"], confirmPatterns: [`keybase.io/${clean}`, "pgp", "public_key"] },
    ];

    // Exécuter en parallèle par batch de 5
    // Phase 1 : HEAD request rapide pour vérifier existence (status 200/403/404)
    const batchSize = 5;
    for (let i = 0; i < platforms.length; i += batchSize) {
      const batch = platforms.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (p) => {
          // GET direct (besoin du body pour vérifier les confirmPatterns)
          let status = 0;
          let body = "";
          try {
            const getResp = await axget(p.url, {
              timeout: 8000,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/json,*/*",
              },
              maxRedirects: 4,
            } as any);
            status = getResp.status;
            const raw = getResp.data;
            body = typeof raw === "string" ? raw.slice(0, 8000) : JSON.stringify(raw).slice(0, 8000);
          } catch {}

          // Statut 429 = rate-limit = probablement existant
          const bodyLow = body.toLowerCase();
          const isNotFound = status === 404 || status === 410 ||
            (p as any).notFoundPatterns.some((pat: string) => bodyLow.includes(pat.toLowerCase()));

          // Si des confirmPatterns sont définis, au moins un doit matcher pour éviter les faux positifs SPA
          const confirmPatterns: string[] = (p as any).confirmPatterns || [];
          const isConfirmed = confirmPatterns.length === 0
            ? (!isNotFound && status > 0 && status < 500)
            : confirmPatterns.some(pat => bodyLow.includes(pat.toLowerCase()));

          const found = !isNotFound && isConfirmed;
          return { platform: p, status, found, body };
        })
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const platform = batch[j];
        if (result.status === "fulfilled" && result.value.found) {
          const { body, status } = result.value;
          const displayName = body
            ? (body.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]?.replace(/ \(@[^)]+\)/, "").trim()
              || body.match(/<title>([^|<\-]+)/i)?.[1]?.trim())
            : undefined;
          const confidence = status === 200 ? 85 : status === 403 ? 72 : 65;

          entities.push(ent("social_profile", platform.url, "ig_cross_platform", confidence, {
            platform: platform.name, username: clean, found: true,
            httpStatus: status,
            displayName: displayName && !displayName.includes(platform.name) ? displayName : undefined,
          }));
          emit({ type: "log", data: { message: `[IG Cross] ✓ ${platform.name}: @${clean} (HTTP ${status})` } });
        }
      }
      await sleep(200);
    }

    return { success: entities.length > 0, data: { username: clean, platformsFound: entities.length }, entities };
  },
};

// ============================================================================
// MODULE 9 — ALT ACCOUNTS (même avatar, même style)
// ============================================================================
export const IgAltAccountsModule = {
  id: "ig_alt_accounts",
  name: "Instagram Alt Accounts Detection",
  category: "social",
  targetTypes: ["username"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Détection comptes alternatifs pour @${clean}...` } });
    const entities: any[] = [];

    // Récupérer les infos du profil principal
    let profilePicUrl: string | null = null;
    let fullName: string | null = null;

    try {
      const r = await axget(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${clean}`, {
        timeout: 10000, headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId() }, validateStatus: () => true,
      } as any);
      const u = (r.data as any)?.data?.user;
      if (u) {
        profilePicUrl = u.profile_pic_url_hd || u.profile_pic_url;
        fullName = u.full_name;
      }
    } catch {}

    // Stratégie 1 : variantes du username
    const variants = [
      `${clean}_`,
      `_${clean}`,
      `${clean}__`,
      `${clean}.official`,
      `${clean}.real`,
      `${clean}2`,
      `${clean}backup`,
      `${clean}alt`,
      `real${clean}`,
      `official${clean}`,
      // Retirer les chiffres finaux
      clean.replace(/\d+$/, ""),
    ].filter(v => v !== clean && v.length >= 3);

    for (const variant of variants.slice(0, 8)) {
      try {
        const r = await axget(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${variant}`, {
          timeout: 6000, headers: { "User-Agent": randUA(), "X-IG-App-ID": randAppId() }, validateStatus: () => true,
        } as any);
        const u = (r.data as any)?.data?.user;
        if (u?.id) {
          const similarity = fullName && u.full_name && u.full_name.toLowerCase() === fullName.toLowerCase() ? 92 : 70;
          entities.push(ent("social_profile", `https://www.instagram.com/${variant}/`, "ig_alt_accounts", similarity, {
            platform: "Instagram", username: variant, displayName: u.full_name,
            verified: u.is_verified, followers: u.edge_followed_by?.count,
            note: "Compte alternatif potentiel", mainAccount: clean,
            sameFullName: u.full_name === fullName,
          }));
          emit({ type: "log", data: { message: `[IG Alt] Variante trouvée: @${variant}` } });
        }
        await sleep(400);
      } catch {}
    }

    // Stratégie 2 : recherche Google par nom complet → Instagram
    if (fullName) {
      try {
        const r = await axget(
          `https://www.google.com/search?q=${encodeURIComponent(`"${fullName}" site:instagram.com -${clean}`)}`,
          {
            timeout: 10000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124" },
            validateStatus: () => true,
          } as any
        );
        const html = r.data as string;
        const igMatches = [...new Set((html.match(/instagram\.com\/([a-zA-Z0-9_\.]{3,30})\/?/g) || []) as string[])];
        for (const m of igMatches.slice(0, 5)) {
          const username = m.replace(/instagram\.com\//, "").replace(/\/$/, "");
          if (username !== clean && !username.includes("?") && !username.includes("p/") && !username.includes("explore/")) {
            entities.push(ent("social_profile", `https://www.instagram.com/${username}/`, "ig_alt_accounts", 72, {
              platform: "Instagram", username, note: "Même nom réel — compte alternatif potentiel",
              fullName, mainAccount: clean, source: "google_search",
            }));
          }
        }
      } catch {}
    }

    // Stratégie 3 : reverse image search sur photo de profil
    if (profilePicUrl) {
      try {
        const bingR = await axget(
          `https://www.bing.com/images/search?q=imgurl:${encodeURIComponent(profilePicUrl)}&view=detailv2&iss=sbi`,
          {
            timeout: 10000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124" },
            validateStatus: () => true,
          } as any
        );
        const html = bingR.data as string;
        const igMatches = [...new Set((html.match(/instagram\.com\/([a-zA-Z0-9_\.]{3,30})\/?/g) || []) as string[])];
        for (const m of igMatches.slice(0, 3)) {
          const username = m.replace(/instagram\.com\//, "").replace(/\/$/, "");
          if (username !== clean && !["p", "explore", "stories", "reel"].includes(username)) {
            entities.push(ent("social_profile", `https://www.instagram.com/${username}/`, "ig_alt_accounts", 78, {
              platform: "Instagram", username, note: "Même photo de profil détectée",
              mainAccount: clean, source: "reverse_image_bing",
            }));
          }
        }
      } catch {}
    }

    return { success: entities.length > 0, data: { username: clean, altAccountsFound: entities.length }, entities };
  },
};

// ============================================================================
// MODULE 10 — INSTALOADER CLI (deep metadata)
// ============================================================================
export const IgInstalaoderModule = {
  id: "ig_instaloader",
  name: "Instaloader (CLI deep metadata)",
  category: "social",
  targetTypes: ["username"],
  priority: 2,
  isAvailable: async () => {
    const r = await tryExec("instaloader --version 2>&1");
    return !!(r?.stdout?.includes("instaloader") || r?.stderr?.includes("instaloader"));
  },
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Instaloader CLI pour @${clean}...` } });
    const entities: any[] = [];

    const r = await tryExec(
      `instaloader --no-pictures --no-videos --no-video-thumbnails --no-geotags --no-captions --no-compress-json -- -${clean} 2>&1`,
      45000
    );
    const out = (r?.stdout || "") + (r?.stderr || "");
    if (!out) return { success: false, data: null, entities };

    const followers = out.match(/Followers[:\s]*([\d,]+)/i)?.[1]?.replace(/,/g, "");
    const following = out.match(/Followees[:\s]*([\d,]+)/i)?.[1]?.replace(/,/g, "");
    const posts = out.match(/Posts[:\s]*(\d+)/i)?.[1];
    const fullName = out.match(/Full Name[:\s]*(.+)/i)?.[1]?.trim();
    const bio = out.match(/Biography[:\s]*(.+)/i)?.[1]?.trim();
    const externalUrl = out.match(/External URL[:\s]*(https?:\/\/\S+)/i)?.[1];

    entities.push(ent("social_profile", `https://www.instagram.com/${clean}/`, "ig_instaloader", 90, {
      platform: "Instagram", username: clean, displayName: fullName,
      followers, following, posts, bio, externalUrl, dataSource: "instaloader_cli",
    }));

    if (fullName) entities.push(ent("person", fullName, "ig_instaloader", 88, { username: clean }));
    if (externalUrl) entities.push(ent("url", externalUrl, "ig_instaloader", 90, { username: clean, type: "bio_link" }));
    if (bio) entities.push(...extractPatterns(bio, "ig_instaloader_bio", { username: clean }));

    emit({ type: "log", data: { message: `[IG Instaloader] @${clean}: ${followers} followers` } });
    return { success: entities.length > 0, data: { username: clean, followers, following, posts }, entities };
  },
};

// ============================================================================
// MODULE 11 — OSINTGRAM (emails/phones réseau)
// ============================================================================
export const IgOsintgramModule = {
  id: "ig_osintgram",
  name: "Osintgram (network emails/phones)",
  category: "social",
  targetTypes: ["username"],
  priority: 3,
  isAvailable: async () => {
    const r = await tryExec("python Osintgram/main.py --help 2>&1");
    return !!(r?.stdout || r?.stderr?.includes("usage"));
  },
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] Osintgram emails/phones réseau pour @${clean}...` } });
    const entities: any[] = [];

    const commands = [
      { cmd: "addrs", label: "addresses GPS" },
      { cmd: "fwersemail", label: "emails followers" },
      { cmd: "fwingsemail", label: "emails following" },
      { cmd: "fwersnumber", label: "phones followers" },
      { cmd: "fwingsnumber", label: "phones following" },
      { cmd: "mediatype", label: "media types" },
      { cmd: "hashtags", label: "hashtags" },
    ];

    for (const { cmd, label } of commands) {
      const r = await tryExec(`echo "${cmd}" | python Osintgram/main.py ${clean} 2>&1`, 25000);
      if (!r?.stdout) continue;
      const out = r.stdout;

      if (cmd === "addrs") {
        const addrs = out.split("\n").filter(l => l.trim().length > 5 && !l.includes("[*]") && !l.includes("Osintgram"));
        for (const addr of addrs.slice(0, 10)) {
          entities.push(ent("location", addr.trim(), "ig_osintgram", 80, { username: clean, source: "photo_gps" }));
        }
      }
      if (cmd === "fwersemail" || cmd === "fwingsemail") {
        const emails = [...new Set((out.match(/[\w.+-]+@[\w.-]+\.\w+/g) || []) as string[])];
        for (const e of emails.slice(0, 20)) {
          entities.push(ent("email", e, "ig_osintgram", 78, { username: clean, relation: cmd.includes("fwers") ? "follower" : "following" }));
        }
      }
      if (cmd === "fwersnumber" || cmd === "fwingsnumber") {
        const phones = [...new Set((out.match(/\+?\d[\d\s\-]{7,14}\d/g) || []) as string[])];
        for (const p of phones.slice(0, 20)) {
          entities.push(ent("phone", p, "ig_osintgram", 72, { username: clean, relation: cmd.includes("fwers") ? "follower" : "following" }));
        }
      }
      emit({ type: "log", data: { message: `[IG Osintgram] ${label}: ${entities.length} trouvés` } });
    }

    return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
  },
};

// ============================================================================
// MODULE 12 — HIKERAPIA (RapidAPI — données enrichies)
// ============================================================================
export const IgHikerApiModule = {
  id: "ig_hikerapi",
  name: "Instagram HikerAPI (RapidAPI enriched)",
  category: "social",
  targetTypes: ["username"],
  priority: 2,
  isAvailable: async () => !!process.env.RAPIDAPI_KEY,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG] HikerAPI enrichment pour @${clean}...` } });
    const entities: any[] = [];
    const key = process.env.RAPIDAPI_KEY!;

    const hikerHosts = [
      { host: "instagram-scraper-api2.p.rapidapi.com", path: `/v1/info?username_or_id_or_url=${clean}` },
      { host: "instagram-looter2.p.rapidapi.com", path: `/account/?username=${clean}` },
      { host: "instagram-bulk-profile-scrapper.p.rapidapi.com", path: `/clients/api/ig/ig_profile?ig=${clean}&r=0` },
    ];

    for (const api of hikerHosts) {
      try {
        const r = await axget(`https://${api.host}${api.path}`, {
          timeout: 12000,
          headers: { "x-rapidapi-key": key, "x-rapidapi-host": api.host },
          validateStatus: () => true,
        } as any);
        const d = (r.data as any)?.data || r.data as any;
        if (!d || r.status >= 400) continue;

        const u = d.user || d;
        if (u?.username || u?.full_name) {
          entities.push(ent("social_profile", `https://www.instagram.com/${clean}/`, "ig_hikerapi", 95, {
            platform: "Instagram", username: u.username || clean, userId: u.pk || u.id,
            displayName: u.full_name, bio: u.biography,
            followers: u.follower_count || u.edge_followed_by?.count,
            following: u.following_count || u.edge_follow?.count,
            posts: u.media_count, verified: u.is_verified, private: u.is_private,
            businessEmail: u.public_email, businessPhone: u.public_phone_number,
            category: u.category, businessAddress: u.location,
            externalUrl: u.external_url || u.bio_links?.[0]?.url,
            website: u.website,
          }));

          if (u.full_name) entities.push(ent("person", u.full_name, "ig_hikerapi", 92, { username: clean }));
          if (u.public_email) entities.push(ent("email", u.public_email, "ig_hikerapi", 96, { username: clean, type: "business_email" }));
          if (u.public_phone_number) entities.push(ent("phone", u.public_phone_number, "ig_hikerapi", 96, { username: clean, type: "business_phone" }));
          if (u.biography) entities.push(...extractPatterns(u.biography, "ig_hikerapi_bio", { username: clean }));

          // Bio links
          for (const link of (u.bio_links || [])) {
            if (link.url) entities.push(ent("url", link.url, "ig_hikerapi", 90, { username: clean, type: "bio_link" }));
          }
          emit({ type: "log", data: { message: `[IG HikerAPI] @${clean}: ${u.follower_count} followers via ${api.host}` } });
          break;
        }
      } catch {}
    }

    return { success: entities.length > 0, data: { username: clean, found: entities.length }, entities };
  },
};

// ============================================================================
// MODULE 12B — POSTS & REELS (contenus récents via proxies publics)
// ============================================================================
export const IgPostsReelsModule = {
  id: "ig_posts_reels",
  name: "Instagram Posts & Reels (contenu récent)",
  category: "social",
  targetTypes: ["username"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const clean = target.replace(/^@/, "").toLowerCase().trim();
    emit({ type: "log", data: { message: `[IG Posts] Récupération posts/reels pour @${clean}...` } });
    const entities: any[] = [];

    // ── Méthode 1 : picnob.com (miroir public IG)
    try {
      const r = await axget(`https://www.picnob.com/profile/${clean}/`, {
        timeout: 12000, headers: { "User-Agent": randUA(), "Accept": "text/html" }, validateStatus: () => true,
      } as any);
      const html = r.data as string;
      const captions = [...html.matchAll(/class="photo-desc"[^>]*>([\s\S]{1,500}?)<\/div>/g)].map(m =>
        m[1].replace(/<[^>]+>/g, " ").trim()
      );
      const imgUrls = [...html.matchAll(/src="(https:\/\/[^"]+\.(?:jpg|jpeg|webp))(?:\?[^"]+)?" loading/g)].map(m => m[1]);
      const locations = [...html.matchAll(/class="photo-location"[^>]*>([^<]{3,80})</g)].map(m => m[1].trim());

      for (const cap of captions.slice(0, 10)) {
        entities.push(...extractPatterns(cap, "ig_posts_reels", { username: clean, type: "caption" }));
        // Hashtags dans la caption
        const tags = [...new Set((cap.match(/#[\wÀ-ÿ]+/g) || []) as string[])];
        if (tags.length > 0) entities.push(ent("metadata", `Hashtags posts: ${tags.slice(0,10).join(" ")}`, "ig_posts_reels", 75, { username: clean, hashtags: tags }));
      }
      for (const loc of [...new Set(locations)].slice(0, 8))
        entities.push(ent("location", loc, "ig_posts_reels", 82, { username: clean, source: "picnob" }));
      if (captions.length > 0 || locations.length > 0)
        emit({ type: "log", data: { message: `[IG Posts] picnob: ${captions.length} captions, ${locations.length} lieux` } });
    } catch {}

    // ── Méthode 2 : dumpor.com (scrape posts IG)
    try {
      await sleep(500);
      const r = await axget(`https://dumpor.com/v/${clean}`, {
        timeout: 12000, headers: { "User-Agent": randUA() }, validateStatus: () => true,
      } as any);
      const html = r.data as string;
      const captions2 = [...html.matchAll(/class="post-caption"[^>]*>([\s\S]{1,300}?)<\/p>/g)].map(m =>
        m[1].replace(/<[^>]+>/g, " ").trim()
      );
      const locs2 = [...html.matchAll(/class="post-location-name"[^>]*>([^<]{3,60})</g)].map(m => m[1].trim());
      for (const cap of captions2.slice(0, 8)) {
        entities.push(...extractPatterns(cap, "ig_posts_reels_dumpor", { username: clean }));
      }
      for (const loc of [...new Set(locs2)].slice(0, 5))
        entities.push(ent("location", loc, "ig_posts_reels_dumpor", 80, { username: clean, source: "dumpor" }));
    } catch {}

    // ── Méthode 3 : izuum.com (viewer reels)
    try {
      await sleep(400);
      const r = await axget(`https://izuum.com/profile/${clean}`, {
        timeout: 10000, headers: { "User-Agent": randUA() }, validateStatus: () => true,
      } as any);
      const html = r.data as string;
      const bios2 = html.match(/class="profile-bio"[^>]*>([\s\S]{0,500}?)<\/div>/)?.[1]?.replace(/<[^>]+>/g, " ").trim();
      if (bios2) entities.push(...extractPatterns(bios2, "ig_posts_reels_izuum", { username: clean, type: "bio" }));
    } catch {}

    // ── Méthode 4 : Instagram oEmbed (URL vers JSON public, sans auth)
    try {
      const oembedUrl = `https://api.instagram.com/oembed/?url=https://www.instagram.com/${clean}/&omitscript=true`;
      const r = await axget(oembedUrl, {
        timeout: 8000, headers: { "User-Agent": randUA() }, validateStatus: () => true,
      } as any);
      const d = r.data as any;
      if (d?.title || d?.author_name) {
        entities.push(ent("person", d.author_name || clean, "ig_oembed", 85, {
          username: d.author_url?.split("/").filter(Boolean).pop() || clean,
          platform: "Instagram", thumbnail: d.thumbnail_url, source: "oembed",
        }));
      }
    } catch {}

    emit({ type: "log", data: { message: `[IG Posts] Terminé: ${entities.length} entités extraites` } });
    return { success: entities.length > 0, data: { username: clean, entitiesFound: entities.length }, entities };
  },
};

// ============================================================================
// MOTEUR INSTAGRAM — Orchestrateur principal
// ============================================================================
export class InstagramEngine {
  private readonly modules = [
    IgPhoneLookupModule,
    IgProfileModule,
    IgContactModule,
    IgHikerApiModule,
    IgInstalaoderModule,
    IgPostsReelsModule,
    IgNetworkModule,
    IgGeoModule,
    IgStoriesModule,
    IgHashtagModule,
    IgTaggedModule,
    IgCrossPlatformModule,
    IgAltAccountsModule,
    IgOsintgramModule,
  ];

  async *investigate(username: string, options: { modules?: string[]; depth?: "fast" | "full" } = {}): AsyncGenerator<any> {
    const clean = username.replace(/^@/, "").toLowerCase().trim();
    const startTime = Date.now();
    const depth = options.depth || "full";
    const requestedModules = options.modules || this.modules.map(m => m.id);

    yield { type: "phase", data: { phase: "start", target: clean, targetType: "instagram", modulesPlanned: requestedModules.length } };

    const allEntities: any[] = [];
    const seen = new Set<string>();

    // Modules rapides d'abord (profil, HikerAPI, contact)
    const priorityOrder = ["ig_profile", "ig_hikerapi", "ig_contact", "ig_instaloader",
      "ig_posts_reels", "ig_network", "ig_geofence", "ig_stories", "ig_hashtag",
      "ig_tagged", "ig_cross_platform", "ig_alt_accounts", "ig_osintgram"];

    const orderedModules = this.modules
      .filter(m => requestedModules.includes(m.id))
      .sort((a, b) => priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id));

    // Mode fast : seulement les 4 premiers modules
    const modulesToRun = depth === "fast" ? orderedModules.slice(0, 4) : orderedModules;

    for (const mod of modulesToRun) {
      let isAvail = false;
      try { isAvail = await mod.isAvailable(); } catch {}

      yield { type: "tool_start", data: { tool: mod.id, name: mod.name, target: clean } };

      if (!isAvail) {
        yield { type: "tool_done", data: { tool: mod.id, skipped: true, reason: "not_available" } };
        continue;
      }

      const modEntities: any[] = [];
      const emit = (event: any) => {
        if (event.type === "log") return; // handled by yield below
      };

      try {
        const logs: any[] = [];
        const emitWithLog = (event: any) => {
          if (event.type === "log") logs.push(event);
          else emit(event);
        };

        const result = await Promise.race([
          mod.execute(clean, emitWithLog),
          new Promise<any>((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000)),
        ]);

        for (const log of logs) yield log;

        if (result?.entities) {
          for (const entity of result.entities) {
            const key = `${entity.type}:${String(entity.value).toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              modEntities.push(entity);
              allEntities.push(entity);
              yield { type: "entity_found", data: entity };
            }
          }
        }

        yield { type: "tool_done", data: { tool: mod.id, found: modEntities.length, duration: Date.now() - startTime } };
      } catch (e: any) {
        yield { type: "error", data: { tool: mod.id, message: e.message } };
      }

      // Délai anti-ban entre modules
      await sleep(300);
    }

    // Corrélations simples
    const emails = allEntities.filter(e => e.type === "email");
    const phones = allEntities.filter(e => e.type === "phone");
    const profiles = allEntities.filter(e => e.type === "social_profile");
    const persons = allEntities.filter(e => e.type === "person");
    const locations = allEntities.filter(e => e.type === "location");

    yield {
      type: "complete",
      data: {
        target: clean, targetType: "instagram",
        duration: Date.now() - startTime,
        summary: {
          totalEntities: allEntities.length,
          emails: emails.length,
          phones: phones.length,
          profiles: profiles.length,
          persons: persons.length,
          locations: locations.length,
          modulesRun: modulesToRun.length,
        },
        entities: allEntities,
        highlights: {
          emails: emails.map(e => e.value),
          phones: phones.map(e => e.value),
          locations: [...new Set(locations.map(e => e.value))].slice(0, 10),
          crossPlatformProfiles: profiles.filter(e => e.source === "ig_cross_platform").map(e => ({ platform: e.metadata?.platform, url: e.value })),
          altAccounts: profiles.filter(e => e.source === "ig_alt_accounts").map(e => e.value),
        },
      },
    };
  }

  getModules() { return this.modules.map(m => ({ id: m.id, name: m.name, category: m.category })); }
}

export const instagramEngine = new InstagramEngine();
