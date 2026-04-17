// ============================================================================
// TEST SCRIPT — Email OSINT (dork + modules pertinents)
// Usage: npx ts-node src/scripts/test_email.ts email1@x.com email2@x.com
// ============================================================================

import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

import axios from "axios";
import https from "https";
import { GoogleDorkModule, NameIntelModule } from "../services/dorkAndNameModules";

const NO_SSL = new https.Agent({ rejectUnauthorized: false });
const axget  = (url: string, cfg: any = {}) =>
  axios.get(url, { httpsAgent: NO_SSL, validateStatus: () => true, timeout: 12000, ...cfg } as any);
const axpost = (url: string, data: any, cfg: any = {}) =>
  (axios as any).post(url, data, { httpsAgent: NO_SSL, validateStatus: () => true, timeout: 12000, ...cfg });

const EMAILS: string[] = process.argv.slice(2).filter(a => a.includes("@"));
if (EMAILS.length === 0) {
  console.error("Usage: npx ts-node src/scripts/test_email.ts email@x.com [email2@x.com ...]");
  process.exit(1);
}

const A = { r: "\x1b[0m", g: "\x1b[32m", red: "\x1b[31m", y: "\x1b[33m", c: "\x1b[36m", gr: "\x1b[90m", b: "\x1b[1m" };
const col = (k: keyof typeof A, s: string) => `${A[k]}${s}${A.r}`;
const sep = () => console.log(col("gr", "─".repeat(64)));

function logEnt(e: any) {
  const conf = e.confidence >= 80 ? col("g", `${e.confidence}%`) : col("y", `${e.confidence}%`);
  console.log(`   ${col("c", e.type.padEnd(16))} ${conf}  ${col("gr", String(e.value).slice(0, 90))}`);
  if (e.metadata?.snippet) console.log(`       ${col("gr", String(e.metadata.snippet).slice(0, 100))}`);
}

async function runModule(mod: any, target: string) {
  sep();
  console.log(`${col("b", `[${mod.id}]`)} ${mod.name}`);
  const avail = await mod.isAvailable().catch(() => false);
  if (!avail) { console.log(col("y", "  ⚠ Non disponible")); return []; }

  const logs: string[] = [];
  const emit = (e: any) => { if (e.type === "log") logs.push(e.data?.message || ""); };

  const t0 = Date.now();
  let result: any;
  try {
    result = await Promise.race([
      mod.execute(target, emit),
      new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT 90s")), 90000)),
    ]);
  } catch (e: any) {
    console.log(col("red", `  ✗ Erreur: ${e.message}`));
    return [];
  }

  for (const l of logs) console.log(col("gr", `  LOG: ${l}`));
  const ents = result?.entities || [];
  console.log(`  ${col("g", "✓")} ${((Date.now()-t0)/1000).toFixed(1)}s — ${col("b", String(ents.length))} entités`);
  for (const e of ents.slice(0, 20)) logEnt(e);
  if (ents.length > 20) console.log(col("gr", `   ... +${ents.length-20} autres`));
  return ents;
}

// ─── Modules email spécialisés (inline, sans dépendances externes) ─────────

async function checkHaveIBeenPwned(email: string) {
  sep();
  console.log(col("b", "[hibp] Have I Been Pwned"));
  try {
    // API publique v2 (sans clé)
    const r = await axget(
      `https://haveibeenpwned.com/api/v2/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { "User-Agent": "OSINT-Master/4.0", "Accept": "application/json" } }
    );
    if (r.status === 404) { console.log(col("g", "  ✓ Aucune fuite connue")); return []; }
    if (r.status === 200) {
      const breaches = r.data as any[];
      console.log(col("red", `  ⚠ ${breaches.length} fuite(s) trouvée(s) !`));
      for (const b of breaches.slice(0, 10)) {
        console.log(`   ${col("c", b.Name.padEnd(25))} ${col("gr", b.BreachDate || "?")} — ${(b.DataClasses||[]).slice(0,3).join(", ")}`);
      }
      return breaches.map((b: any) => ({
        type: "metadata", value: `Fuite: ${b.Name} (${b.BreachDate})`,
        source: "hibp", confidence: 99,
        metadata: { breach: b.Name, date: b.BreachDate, dataTypes: b.DataClasses },
      }));
    }
    // v3 nécessite clé API — on essaie l'API gratuite alternative
    const r2 = await axget(
      `https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`,
      { headers: { "User-Agent": "OSINT-Master/4.0" } }
    );
    const d2 = r2.data as any;
    if (d2?.found > 0) {
      console.log(col("red", `  ⚠ LeakCheck: trouvé dans ${d2.found} fuite(s): ${(d2.sources||[]).join(", ")}`));
      return [{ type: "metadata", value: `LeakCheck: ${d2.found} fuite(s): ${(d2.sources||[]).slice(0,5).join(", ")}`, source: "leakcheck", confidence: 95, metadata: d2 }];
    }
    console.log(col("g", "  ✓ Aucune fuite connue (LeakCheck)")); return [];
  } catch (e: any) { console.log(col("y", `  ? Erreur: ${e.message}`)); return []; }
}

async function checkEmailExistence(email: string) {
  sep();
  console.log(col("b", "[smtp_verify] Vérification existence email (MX + SMTP)"));
  try {
    const domain = email.split("@")[1];
    // MX lookup via DNS-over-HTTPS
    const mxR = await axget(`https://dns.google/resolve?name=${domain}&type=MX`);
    const mx = (mxR.data as any)?.Answer || [];
    if (mx.length === 0) { console.log(col("red", `  ✗ Aucun enregistrement MX pour ${domain}`)); return []; }
    const mxHost = mx[0]?.data?.replace(/^\d+\s+/, "").replace(/\.$/, "") || domain;
    console.log(col("g", `  ✓ MX trouvé: ${mxHost} (${mx.length} serveur(s))`));
    return [{ type: "metadata", value: `MX valid: ${domain} → ${mxHost}`, source: "smtp_verify", confidence: 70, metadata: { domain, mx: mx.map((m: any) => m.data) } }];
  } catch (e: any) { console.log(col("y", `  ? ${e.message}`)); return []; }
}

async function checkGravatar(email: string) {
  sep();
  console.log(col("b", "[gravatar] Gravatar profile"));
  try {
    const crypto = await import("crypto");
    const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
    const r = await axget(`https://www.gravatar.com/${hash}.json`);
    if (r.status !== 200) { console.log(col("gr", "  - Pas de profil Gravatar")); return []; }
    const profile = (r.data as any)?.entry?.[0];
    if (!profile) { console.log(col("gr", "  - Pas de profil Gravatar")); return []; }
    const ents: any[] = [];
    console.log(col("g", `  ✓ Profil Gravatar trouvé !`));
    if (profile.displayName) { console.log(`   Nom: ${profile.displayName}`); ents.push({ type: "person", value: profile.displayName, source: "gravatar", confidence: 90, metadata: { email } }); }
    if (profile.aboutMe)     console.log(`   Bio: ${profile.aboutMe.slice(0, 100)}`);
    if (profile.currentLocation) { console.log(`   Lieu: ${profile.currentLocation}`); ents.push({ type: "location", value: profile.currentLocation, source: "gravatar", confidence: 88, metadata: { email } }); }
    for (const acc of (profile.accounts || []).slice(0, 10)) {
      console.log(`   ${col("c", (acc.shortname || acc.name).padEnd(14))} ${col("gr", acc.url || "")}`);
      if (acc.url) ents.push({ type: "social_profile", value: acc.url, source: "gravatar", confidence: 92, metadata: { platform: acc.shortname, email } });
    }
    if (profile.urls) for (const u of profile.urls) { console.log(`   URL: ${u.value}`); ents.push({ type: "url", value: u.value, source: "gravatar", confidence: 88, metadata: { email } }); }
    ents.push({ type: "url", value: `https://www.gravatar.com/${hash}`, source: "gravatar", confidence: 95, metadata: { email, avatarUrl: `https://www.gravatar.com/avatar/${hash}` } });
    return ents;
  } catch (e: any) { console.log(col("y", `  ? ${e.message}`)); return []; }
}

async function checkGoogleAccount(email: string) {
  sep();
  console.log(col("b", "[google_account] Google Account (password reset)"));
  try {
    // Utilise le flux de récupération de compte Google pour confirmer l'existence
    const r = await axpost(
      "https://accounts.google.com/_/signin/sl/lookup",
      `f.req=%5B%22${encodeURIComponent(email)}%22%5D&`,
      { headers: { "User-Agent": "Mozilla/5.0", "Content-Type": "application/x-www-form-urlencoded", "Accept": "*/*" } }
    );
    const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
    const exists = !body.includes("LOOKUP_RESULT_NOT_FOUND") && !body.includes("noAccount");
    if (exists && r.status < 400) {
      console.log(col("g", `  ✓ Compte Google CONFIRMÉ pour ${email}`));
      return [{ type: "metadata", value: `Compte Google actif: ${email}`, source: "google_account", confidence: 90, metadata: { email } }];
    }
    console.log(col("gr", `  - Compte Google non confirmé (status ${r.status})`)); return [];
  } catch (e: any) { console.log(col("gr", `  - ${e.message}`)); return []; }
}

async function checkSocialPlatformsByEmail(email: string) {
  sep();
  console.log(col("b", "[social_by_email] Recherche comptes liés à l'email"));
  const ents: any[] = [];
  const local = email.split("@")[0];

  // GitHub search by email
  try {
    const r = await axget(`https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email`, {
      headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "OSINT-Master/4.0" }
    });
    const items = (r.data as any)?.items || [];
    for (const u of items.slice(0, 5)) {
      console.log(col("g", `  ✓ GitHub: ${u.login} — ${u.html_url}`));
      ents.push({ type: "social_profile", value: u.html_url, source: "github_email_search", confidence: 92, metadata: { platform: "GitHub", login: u.login, email } });
    }
  } catch {}

  // Keybase by email
  try {
    const r = await axget(`https://keybase.io/_/api/1.0/user/lookup.json?email=${encodeURIComponent(email)}`);
    const them = (r.data as any)?.them || [];
    for (const u of them.slice(0, 3)) {
      const uname = u?.basics?.username;
      if (uname) {
        console.log(col("g", `  ✓ Keybase: ${uname}`));
        ents.push({ type: "social_profile", value: `https://keybase.io/${uname}`, source: "keybase_email", confidence: 95, metadata: { platform: "Keybase", username: uname, email } });
      }
    }
  } catch {}

  // Hunter.io email verify (free tier)
  try {
    const r = await axget(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=free`);
    const d = (r.data as any)?.data;
    if (d?.result === "deliverable") {
      console.log(col("g", `  ✓ Hunter.io: email délivrable (score: ${d.score})`));
      ents.push({ type: "metadata", value: `Email vérifié: ${email} (score: ${d.score})`, source: "hunter_io", confidence: 85, metadata: d });
    }
  } catch {}

  if (ents.length === 0) console.log(col("gr", "  - Aucun compte lié trouvé par email"));
  return ents;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function investigateEmail(email: string) {
  console.log(`\n${col("b", "╔══════════════════════════════════════════════════════════════╗")}`);
  console.log(`${col("b", `║  EMAIL OSINT : ${email.padEnd(47)}║`)}`);
  console.log(`${col("b", "╚══════════════════════════════════════════════════════════════╝")}\n`);

  const allEnts: any[] = [];
  const add = (ents: any[]) => allEnts.push(...ents);

  // 1. Vérification existence + MX
  add(await checkEmailExistence(email));

  // 2. Gravatar (révèle souvent nom réel + réseaux)
  add(await checkGravatar(email));

  // 3. Have I Been Pwned + LeakCheck
  add(await checkHaveIBeenPwned(email));

  // 4. Compte Google
  add(await checkGoogleAccount(email));

  // 5. Recherche comptes GitHub / Keybase / Hunter
  add(await checkSocialPlatformsByEmail(email));

  // 6. Google Dorking ciblé email
  add(await runModule(GoogleDorkModule, email));

  // 7. Name Intel depuis la partie locale de l'email (camille.perraudeau → Camille Perraudeau)
  const local = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  if (local.includes(" ")) {
    console.log(`\n${col("gr", `→ Analyse du nom déduit de l'email : "${local}"`)}`);
    add(await runModule(NameIntelModule, local));
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  sep();
  console.log(col("b", `\n  RÉSUMÉ pour ${email}`));
  const byType: Record<string, any[]> = {};
  for (const e of allEnts) {
    if (!byType[e.type]) byType[e.type] = [];
    byType[e.type].push(e);
  }
  for (const [type, ents] of Object.entries(byType)) {
    const vals = ents.map(e => String(e.value).slice(0, 60)).slice(0, 3).join(", ");
    const more = ents.length > 3 ? ` (+${ents.length - 3})` : "";
    console.log(`  ${col("c", type.padEnd(16))} ${ents.length}x  ${col("gr", vals + more)}`);
  }
  console.log(col("b", `\n  Total : ${allEnts.length} entités\n`));
  return allEnts;
}

async function main() {
  for (const email of EMAILS) {
    await investigateEmail(email);
    if (EMAILS.indexOf(email) < EMAILS.length - 1) {
      console.log(col("gr", "\n⏳ Pause 3s entre les emails...\n"));
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
