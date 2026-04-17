// ============================================================================
// ADVANCED ANALYSIS MODULES — Sprint 2 enhancements
// OCR + EXIF, NLP stylométrie, darkweb, behavioral profiling, scoring
// ============================================================================

import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import https from "https";

const execAsync = promisify(exec);
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function tryExec(cmd: string, ms = 30000) {
  try { return await execAsync(cmd, { timeout: ms, maxBuffer: 20 * 1024 * 1024 }); }
  catch (e: any) { return e.stdout ? { stdout: e.stdout, stderr: e.stderr || "" } : null; }
}

async function http(url: string, opts: any = {}): Promise<any> {
  try {
    const r = await axios.get(url, {
      timeout: 20000,
      validateStatus: () => true,
      responseType: opts.binary ? "arraybuffer" : "text",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": opts.binary ? "image/jpeg,image/png,image/webp,image/*;q=0.9,*/*;q=0.8" : "text/html,application/json,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        ...opts.headers,
      },
      httpsAgent,
      maxRedirects: 5,
      ...opts,
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
// 1. OCR + EXIF MODULE — analyse des images trouvées
// ============================================================================

export const ImageAnalysisModule = {
  id: "image_analysis",
  name: "Image Analysis (OCR + EXIF + perceptual hash)",
  category: "image",
  targetTypes: ["image_url", "url"],
  priority: 2,
  isAvailable: async () => {
    // Vérifie que python + Pillow + pytesseract sont dispos
    const r = await tryExec(`python -c "from PIL import Image; print('ok')" 2>&1`);
    return !!(r?.stdout?.includes("ok"));
  },
  execute: async (target: string, emit: any) => {
    // Filtrer : uniquement images
    const imgExt = /\.(jpg|jpeg|png|webp|gif|bmp|tiff)(\?|$)/i;
    const isImg = imgExt.test(target) || target.includes("profile_pic") || target.includes("avatar") || target.includes("photo") || target.includes("media");
    if (!isImg) return { success: false, data: { skipped: true, reason: "not_an_image_url" }, entities: [] };

    emit({ type: "log", data: { message: `Image analysis: ${target.slice(0, 80)}...` } });
    const entities: any[] = [];

    // Télécharger l'image
    const imgData = await http(target, { binary: true });
    if (!imgData) {
      emit({ type: "log", data: { message: `Image analysis: download failed` } });
      return { success: false, data: null, entities: [] };
    }

    // Sauvegarder temporairement
    const tmpDir = os.tmpdir();
    const hash = crypto.createHash("sha256").update(imgData as Buffer).digest("hex").slice(0, 12);
    const ext = target.match(/\.(\w{3,4})(\?|$)/)?.[1] || "jpg";
    const tmpPath = path.join(tmpDir, `osint_img_${hash}.${ext}`);
    fs.writeFileSync(tmpPath, imgData as Buffer);

    try {
      // Script Python intégré : EXIF + OCR + perceptual hash
      const script = `
import sys, json, os
from PIL import Image, ExifTags

path = sys.argv[1]
result = {"exif": {}, "info": {}, "ocr": None, "phash": None, "dims": None}

try:
    img = Image.open(path)
    result["dims"] = list(img.size)
    result["info"]["format"] = img.format
    result["info"]["mode"] = img.mode

    # EXIF
    exif_raw = img._getexif() if hasattr(img, "_getexif") else None
    if exif_raw:
        for tag_id, value in exif_raw.items():
            tag = ExifTags.TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                gps = {}
                for k, v in value.items():
                    gps[ExifTags.GPSTAGS.get(k, k)] = v
                # Convertir GPS en lat/lon décimal
                try:
                    lat = gps.get("GPSLatitude")
                    lat_ref = gps.get("GPSLatitudeRef", "N")
                    lon = gps.get("GPSLongitude")
                    lon_ref = gps.get("GPSLongitudeRef", "E")
                    if lat and lon:
                        def to_deg(dms):
                            return float(dms[0]) + float(dms[1])/60 + float(dms[2])/3600
                        lat_d = to_deg(lat) * (-1 if lat_ref == "S" else 1)
                        lon_d = to_deg(lon) * (-1 if lon_ref == "W" else 1)
                        result["exif"]["gps"] = {"lat": lat_d, "lon": lon_d}
                except Exception:
                    pass
                result["exif"]["gps_raw"] = {k: str(v)[:50] for k, v in gps.items() if k not in ("GPSLatitude", "GPSLongitude")}
            elif isinstance(value, (str, int, float)):
                result["exif"][str(tag)] = str(value)[:100]

    # Perceptual hash (simple average hash)
    try:
        from PIL import ImageOps
        small = img.convert("L").resize((8, 8), Image.LANCZOS)
        avg = sum(small.getdata()) / 64
        bits = "".join("1" if p > avg else "0" for p in small.getdata())
        result["phash"] = "{:016x}".format(int(bits, 2))
    except Exception as e:
        result["phash_err"] = str(e)

    # OCR (facultatif — pytesseract doit être installé)
    try:
        import pytesseract
        txt = pytesseract.image_to_string(img, timeout=10).strip()
        if len(txt) > 3:
            result["ocr"] = txt[:1500]
    except Exception:
        pass

except Exception as e:
    result["error"] = str(e)

print(json.dumps(result, ensure_ascii=False, default=str))
`.trim();

      const scriptPath = path.join(tmpDir, `img_analysis_${hash}.py`);
      fs.writeFileSync(scriptPath, script, "utf-8");

      const env = process.platform === "win32"
        ? `set PYTHONHTTPSVERIFY=0 && set PYTHONWARNINGS=ignore && `
        : `PYTHONHTTPSVERIFY=0 `;
      const r = await tryExec(`${env}python "${scriptPath}" "${tmpPath}" 2>&1`, 20000);

      if (!r) return { success: false, data: null, entities: [] };

      const output = r.stdout + (r.stderr || "");
      const jsonLine = output.split("\n").find((l: string) => l.trim().startsWith("{"));
      if (!jsonLine) {
        emit({ type: "log", data: { message: `Image analysis: no JSON output. Raw: ${output.slice(0, 200)}` } });
        return { success: false, data: { rawOutput: output.slice(0, 500) }, entities: [] };
      }

      const data: any = JSON.parse(jsonLine);

      // GPS depuis EXIF
      if (data.exif?.gps?.lat && data.exif?.gps?.lon) {
        const { lat, lon } = data.exif.gps;
        entities.push(ent("location", `${lat.toFixed(5)}, ${lon.toFixed(5)}`, "image_analysis", 92, {
          latitude: lat, longitude: lon, lat, lon,
          source: "exif_gps", imageUrl: target,
        }));
        emit({ type: "log", data: { message: `Image analysis: ✅ GPS EXIF → ${lat.toFixed(4)}, ${lon.toFixed(4)}` } });
      }

      // Camera / fabricant
      if (data.exif?.Make) {
        const model = `${data.exif.Make} ${data.exif.Model || ""}`.trim();
        entities.push(ent("fingerprint", model, "image_analysis", 85, {
          type: "camera_device", make: data.exif.Make, model: data.exif.Model,
          software: data.exif.Software, dateTime: data.exif.DateTimeOriginal || data.exif.DateTime,
          imageUrl: target,
        }));
      }

      // Date prise de vue
      const dt = data.exif?.DateTimeOriginal || data.exif?.DateTime;
      if (dt) {
        emit({ type: "log", data: { message: `Image analysis: 📅 shot ${dt}` } });
      }

      // OCR texte
      if (data.ocr && data.ocr.length > 10) {
        entities.push(ent("metadata", data.ocr.slice(0, 200), "image_analysis_ocr", 70, {
          type: "ocr_text", fullText: data.ocr, imageUrl: target,
        }));
        emit({ type: "log", data: { message: `Image analysis: 📝 OCR ${data.ocr.length} chars` } });

        // Extraction patterns depuis texte OCR
        const emails = data.ocr.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
        emails.forEach((e: string) => entities.push(ent("email", e, "image_analysis_ocr", 72, { fromOcr: true, imageUrl: target })));

        const urls = data.ocr.match(/https?:\/\/[^\s<>"']{5,80}/g) || [];
        urls.forEach((u: string) => entities.push(ent("url", u, "image_analysis_ocr", 70, { fromOcr: true, imageUrl: target })));

        const phones = data.ocr.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/g) || [];
        phones.filter((p: string) => p.replace(/\D/g, "").length >= 8).forEach((p: string) =>
          entities.push(ent("phone", p, "image_analysis_ocr", 65, { fromOcr: true, imageUrl: target })));
      }

      // Perceptual hash (pour comparer avec d'autres images)
      if (data.phash) {
        entities.push(ent("fingerprint", data.phash, "image_analysis", 70, {
          type: "perceptual_hash", imageUrl: target,
          dims: data.dims,
        }));
      }

      return {
        success: entities.length > 0,
        data: {
          hasGps: !!data.exif?.gps,
          hasOcr: !!data.ocr,
          hasExif: Object.keys(data.exif || {}).length > 0,
          phash: data.phash,
          entitiesFound: entities.length,
        },
        entities,
      };
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  },
};

// ============================================================================
// 2. DARKWEB DEEP SEARCH — Ahmia + paste sites
// ============================================================================

export const DarkwebDeepModule = {
  id: "darkweb_deep",
  name: "Darkweb Deep (Ahmia + paste sites)",
  category: "darkweb",
  targetTypes: ["email", "username", "phone", "domain", "person"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Darkweb deep search: ${target}` } });
    const entities: any[] = [];
    const cleanTarget = target.replace(/^@/, "").trim();
    const q = encodeURIComponent(cleanTarget);

    // Ahmia — search engine for .onion (accessible via clearweb)
    try {
      const html: string = await http(`https://ahmia.fi/search/?q=${q}`, {
        headers: { Accept: "text/html" },
      });
      if (typeof html === "string") {
        // Extraire les résultats
        const resultsRegex = /<li class="result"[^>]*>[\s\S]*?<h4>[\s\S]*?<a[^>]+href="(\/search\/redirect[^"]+)">([^<]+)<\/a>[\s\S]*?<p[^>]*>([^<]{10,300})<\/p>/g;
        let m: RegExpExecArray | null;
        let count = 0;
        while ((m = resultsRegex.exec(html)) && count < 10) {
          count++;
          const title = m[2].trim();
          const snippet = m[3].trim();
          // Ahmia redirect URLs contiennent l'URL .onion encodée
          const redirectUrl = "https://ahmia.fi" + m[1];
          entities.push(ent("darkweb_hit", title, "darkweb_ahmia", 75, {
            source: "ahmia", redirectUrl, snippet: snippet.slice(0, 240), query: cleanTarget,
          }));
        }
        emit({ type: "log", data: { message: `Ahmia: ${count} résultats .onion` } });
      }
    } catch (e: any) {
      emit({ type: "log", data: { message: `Ahmia erreur: ${e.message || e}` } });
    }

    // Paste sites via Google/DDG
    const PASTE_SITES = [
      "pastebin.com", "paste.ee", "rentry.co", "controlc.com",
      "ghostbin.co", "justpaste.it", "throwbin.io",
    ];
    for (const site of PASTE_SITES.slice(0, 4)) {
      try {
        const ddgUrl = `https://duckduckgo.com/html/?q=${q}+site%3A${site}`;
        const html: string = await http(ddgUrl, { headers: { Accept: "text/html" } });
        if (typeof html === "string") {
          const links = html.match(new RegExp(`https?:\\/\\/[^"'\\s<>]*${site.replace(".", "\\.")}[^"'\\s<>]*`, "g")) || [];
          const unique = [...new Set(links)].slice(0, 3);
          for (const url of unique) {
            if (url.includes("duckduckgo") || url.includes("uddg=")) continue;
            entities.push(ent("paste_leak", url, `paste_${site}`, 65, {
              site, query: cleanTarget,
            }));
          }
        }
      } catch {}
    }

    // IntelX (free tier via public search)
    try {
      const intelx = await http(`https://intelx.io/?s=${q}`, { headers: { Accept: "text/html" } });
      if (typeof intelx === "string") {
        const leakMatch = intelx.match(/(\d+)\s+results?/i);
        if (leakMatch) {
          emit({ type: "log", data: { message: `IntelX: ${leakMatch[1]} potential leaks` } });
        }
      }
    } catch {}

    emit({ type: "log", data: { message: `Darkweb deep: ${entities.length} hits` } });
    return {
      success: entities.length > 0,
      data: { totalHits: entities.length },
      entities,
    };
  },
};

// ============================================================================
// 3. STYLOMETRY — identifier même auteur cross-account via patterns textuels
// ============================================================================

export const StylometryModule = {
  id: "stylometry_cluster",
  name: "Stylometry Cluster (même auteur)",
  category: "analysis",
  targetTypes: ["username", "person"],
  priority: 6,
  isAvailable: async () => {
    // Cette fonction sera appelée par l'engine après que d'autres modules aient collecté des textes
    return true;
  },
  execute: async (target: string, emit: any, context: any = {}) => {
    // On a besoin des entités déjà collectées pour comparer
    const allEntities: any[] = context.allEntities || [];
    if (allEntities.length < 2) {
      return { success: false, data: { skipped: true, reason: "need_more_data" }, entities: [] };
    }

    // Collecter les textes associés à chaque profil
    const profileTexts: Record<string, { texts: string[]; usernames: string[]; entity: any }> = {};
    for (const e of allEntities) {
      const username = e.metadata?.username || (e.type === "username" ? e.value : null);
      if (!username) continue;

      const texts: string[] = [];
      if (e.metadata?.bio) texts.push(e.metadata.bio);
      if (e.metadata?.biography) texts.push(e.metadata.biography);
      if (e.metadata?.description) texts.push(e.metadata.description);
      if (e.metadata?.fullText) texts.push(e.metadata.fullText);
      if (e.metadata?.snippet) texts.push(e.metadata.snippet);

      if (texts.length === 0) continue;

      if (!profileTexts[username]) {
        profileTexts[username] = { texts: [], usernames: [], entity: e };
      }
      profileTexts[username].texts.push(...texts);
      if (!profileTexts[username].usernames.includes(username)) {
        profileTexts[username].usernames.push(username);
      }
    }

    const usernames = Object.keys(profileTexts);
    if (usernames.length < 2) {
      return { success: false, data: { skipped: true, reason: `only_${usernames.length}_profiles_with_text` }, entities: [] };
    }

    emit({ type: "log", data: { message: `Stylometry: analysing ${usernames.length} profiles` } });

    // Extraire features stylométriques simples
    const extractFeatures = (texts: string[]) => {
      const combined = texts.join(" ").toLowerCase();
      return {
        avgWordLen: combined.split(/\s+/).filter(Boolean).reduce((s, w) => s + w.length, 0) / Math.max(combined.split(/\s+/).filter(Boolean).length, 1),
        avgSentLen: combined.split(/[.!?]/).filter(s => s.trim().length > 3).reduce((s, x) => s + x.split(/\s+/).length, 0) / Math.max(combined.split(/[.!?]/).filter(s => s.trim().length > 3).length, 1),
        emojis: (combined.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length,
        exclams: (combined.match(/!/g) || []).length,
        questions: (combined.match(/\?/g) || []).length,
        dots: (combined.match(/\.{3}/g) || []).length,
        hashtags: (combined.match(/#\w+/g) || []).length,
        mentions: (combined.match(/@\w+/g) || []).length,
        urls: (combined.match(/https?:\/\//g) || []).length,
        capitals: (combined.match(/[A-Z]{2,}/g) || []).length,
      };
    };

    const cosineSim = (a: any, b: any) => {
      const keys = Object.keys(a);
      let dot = 0, na = 0, nb = 0;
      for (const k of keys) {
        dot += (a[k] || 0) * (b[k] || 0);
        na += (a[k] || 0) ** 2;
        nb += (b[k] || 0) ** 2;
      }
      if (na === 0 || nb === 0) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    };

    const features: Record<string, any> = {};
    for (const u of usernames) features[u] = extractFeatures(profileTexts[u].texts);

    const entities: any[] = [];
    const seen = new Set<string>();

    // Comparer chaque paire
    for (let i = 0; i < usernames.length; i++) {
      for (let j = i + 1; j < usernames.length; j++) {
        const u1 = usernames[i], u2 = usernames[j];
        const sim = cosineSim(features[u1], features[u2]);
        const pairKey = [u1, u2].sort().join("||");
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        if (sim >= 0.85) {
          // Très similaire = probablement même auteur
          entities.push(ent("correlation_pair", `${u1} ↔ ${u2}`, "stylometry_cluster", Math.round(sim * 100), {
            usernames: [u1, u2],
            similarityScore: sim,
            features: { [u1]: features[u1], [u2]: features[u2] },
            hypothesis: "same_author",
          }));
          emit({ type: "log", data: { message: `Stylometry: ${u1} ↔ ${u2} similarité ${(sim * 100).toFixed(1)}% (probable même auteur)` } });
        }
      }
    }

    return {
      success: entities.length > 0,
      data: { profilesAnalysed: usernames.length, pairsFound: entities.length },
      entities,
    };
  },
};

// ============================================================================
// 4. BEHAVIORAL PROFILING — heures d'activité, timezone, patterns
// ============================================================================

export const BehavioralProfilingModule = {
  id: "behavioral_profiling",
  name: "Behavioral Profiling (timezone + activité)",
  category: "analysis",
  targetTypes: ["username", "person"],
  priority: 6,
  isAvailable: async () => true,
  execute: async (target: string, emit: any, context: any = {}) => {
    const allEntities: any[] = context.allEntities || [];
    if (allEntities.length === 0) {
      return { success: false, data: { skipped: true }, entities: [] };
    }

    // Collecter tous les timestamps de posts/activité
    const timestamps: Date[] = [];
    const languages: string[] = [];
    const platforms: string[] = [];

    for (const e of allEntities) {
      const m = e.metadata || {};
      // Sources possibles de timestamps
      const candidates = [m.createdAt, m.postTime, m.timestamp, m.taken_at, m.date, m.created_time, m.published_at];
      for (const c of candidates) {
        if (!c) continue;
        const d = typeof c === "number" ? new Date(c * (c < 1e12 ? 1000 : 1)) : new Date(c);
        if (!isNaN(d.getTime()) && d.getFullYear() > 2005 && d.getFullYear() <= new Date().getFullYear() + 1) {
          timestamps.push(d);
        }
      }
      if (m.language) languages.push(m.language);
      if (m.platform) platforms.push(m.platform);
    }

    if (timestamps.length < 3) {
      return { success: false, data: { skipped: true, reason: `only_${timestamps.length}_timestamps` }, entities: [] };
    }

    emit({ type: "log", data: { message: `Behavioral: ${timestamps.length} timestamps collected` } });

    // Analyser heures d'activité (en UTC)
    const hoursUtc: Record<number, number> = {};
    const weekDays: Record<number, number> = {};
    for (const t of timestamps) {
      const h = t.getUTCHours();
      hoursUtc[h] = (hoursUtc[h] || 0) + 1;
      const d = t.getUTCDay();
      weekDays[d] = (weekDays[d] || 0) + 1;
    }

    // Trouver pic d'activité → inférer timezone
    const peakHours = Object.entries(hoursUtc).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h]) => +h);
    const avgPeak = peakHours.reduce((s, h) => s + h, 0) / peakHours.length;

    // Hypothèse : les gens postent entre 9h et 22h en local
    // Si pic à 14h UTC → probable GMT+0 (UK/FR hiver)
    // Si pic à 19h UTC → probable GMT-5 (USA east)
    const likelyOffset = Math.round(15 - avgPeak); // 15h local cible
    const timezone = likelyOffset >= 0 ? `UTC+${likelyOffset}` : `UTC${likelyOffset}`;

    const REGIONS: Record<number, string> = {
      [-8]: "US West", [-5]: "US East", [-3]: "Argentine/Brazil",
      [0]: "UK/Portugal", [1]: "Europe Ouest (FR/DE)", [2]: "Europe Est",
      [3]: "Russie/Moyen-Orient", [5]: "Pakistan/Inde", [7]: "Asie du SE",
      [8]: "Chine/HK", [9]: "Japon/Corée", [10]: "Australie Est",
    };
    const likelyRegion = REGIONS[likelyOffset] || "inconnue";

    // Jour de la semaine préféré
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const sortedDays = Object.entries(weekDays).sort((a, b) => b[1] - a[1]);
    const topDay = sortedDays[0] ? dayNames[+sortedDays[0][0]] : "?";

    const entities: any[] = [];
    entities.push(ent("behavioral_profile", `timezone=${timezone}`, "behavioral_profiling", 78, {
      timezone, likelyOffset, likelyRegion,
      peakHoursUtc: peakHours,
      totalTimestamps: timestamps.length,
      hoursDistribution: hoursUtc,
      weekDaysDistribution: weekDays,
      topWeekDay: topDay,
      firstActivity: timestamps[0].toISOString(),
      lastActivity: timestamps[timestamps.length - 1].toISOString(),
      languages: [...new Set(languages)],
      platforms: [...new Set(platforms)],
    }));

    emit({ type: "log", data: { message: `Behavioral: timezone probable ${timezone} (${likelyRegion}) · jour fav: ${topDay}` } });

    return {
      success: true,
      data: { timezone, likelyRegion, topDay, timestamps: timestamps.length },
      entities,
    };
  },
};

// ============================================================================
// 5. TRUST SCORING — fake account / fiabilité / score global
// ============================================================================

export const TrustScoringModule = {
  id: "trust_scoring",
  name: "Trust Score / Fake Account Detection",
  category: "analysis",
  targetTypes: ["username", "person", "social_profile"],
  priority: 9, // dernier à s'exécuter
  isAvailable: async () => true,
  execute: async (target: string, emit: any, context: any = {}) => {
    const allEntities: any[] = context.allEntities || [];

    // Heuristiques de détection de fake account
    let fakeSignals = 0;
    let legitSignals = 0;
    const reasons: string[] = [];

    // Regrouper par username
    const perUser = new Map<string, any[]>();
    for (const e of allEntities) {
      const u = e.metadata?.username || (e.type === "username" ? e.value : null);
      if (!u) continue;
      if (!perUser.has(u)) perUser.set(u, []);
      perUser.get(u)!.push(e);
    }

    const entities: any[] = [];

    for (const [username, userEntities] of perUser.entries()) {
      fakeSignals = 0; legitSignals = 0;
      reasons.length = 0;

      const profile = userEntities.find(e => e.type === "social_profile");
      const m = profile?.metadata || {};

      // Signaux de FAKE
      if (m.followers && m.following) {
        const ratio = m.followers / Math.max(m.following, 1);
        if (ratio < 0.1 && m.followers < 50) { fakeSignals += 2; reasons.push("low_follower_ratio"); }
        if (m.following > 5000 && m.followers < 100) { fakeSignals += 3; reasons.push("mass_follow_behavior"); }
      }
      if (m.posts === 0 && m.followers < 50) { fakeSignals += 2; reasons.push("no_posts_few_followers"); }
      if (!m.bio && !m.biography && !m.displayName) { fakeSignals += 1; reasons.push("empty_profile"); }
      if (!m.avatar && !m.profile_pic_url) { fakeSignals += 1; reasons.push("no_avatar"); }

      // Signaux LÉGITIMES
      if (m.verified) { legitSignals += 5; reasons.push("verified_badge"); }
      if (m.followers > 1000) legitSignals += 1;
      if (m.posts && m.posts > 50) legitSignals += 2;
      if (m.bio || m.biography) legitSignals += 1;
      if (m.externalUrl || m.external_url) legitSignals += 1;
      if (m.businessAccount) legitSignals += 1;

      // Cross-platform consistency → fort signal de légitimité
      const uniqueSources = new Set(userEntities.map(e => e.source));
      if (uniqueSources.size >= 3) { legitSignals += 3; reasons.push(`${uniqueSources.size}_sources_consistent`); }
      if (uniqueSources.size >= 5) legitSignals += 2;

      // Breaches détectées = compte réel
      const breaches = userEntities.filter(e => e.type === "breach" || e.source.includes("breach") || e.source.includes("hibp"));
      if (breaches.length > 0) { legitSignals += 3; reasons.push(`${breaches.length}_breaches_found`); }

      // Calcul score
      const fakeScore = Math.min(100, fakeSignals * 12);
      const legitScore = Math.min(100, legitSignals * 10);
      const trustScore = Math.max(0, Math.min(100, 50 - fakeScore / 2 + legitScore / 2));

      entities.push(ent("trust_score", `${username}: ${Math.round(trustScore)}/100`, "trust_scoring", 85, {
        username,
        trustScore: Math.round(trustScore),
        fakeProbability: fakeScore,
        legitimacyScore: legitScore,
        signals: reasons,
        sourcesCount: uniqueSources.size,
        totalEntities: userEntities.length,
        verdict: trustScore > 70 ? "likely_legitimate" : trustScore > 40 ? "ambiguous" : "likely_fake",
      }));

      emit({ type: "log", data: { message: `Trust: @${username} → ${Math.round(trustScore)}/100 (${reasons.slice(0, 3).join(", ")})` } });
    }

    return {
      success: entities.length > 0,
      data: { profilesScored: entities.length },
      entities,
    };
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const advancedAnalysisModules = [
  ImageAnalysisModule,
  DarkwebDeepModule,
  StylometryModule,
  BehavioralProfilingModule,
  TrustScoringModule,
];
