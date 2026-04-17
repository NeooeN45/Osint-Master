// ============================================================================
// TEST SCRIPT — Instagram modules + Google Dorking
// Usage: npx ts-node -e "require('./src/scripts/test_ig_and_dork')"
//    or: node --loader ts-node/esm src/scripts/test_ig_and_dork.ts
// ============================================================================

import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

import {
  IgProfileModule,
  IgContactModule,
  IgNetworkModule,
  IgGeoModule,
  IgStoriesModule,
  IgHashtagModule,
  IgTaggedModule,
  IgCrossPlatformModule,
  IgAltAccountsModule,
  IgInstalaoderModule,
  IgOsintgramModule,
  IgHikerApiModule,
  IgPostsReelsModule,
} from "../services/instagramEngine";

import {
  GoogleDorkModule,
  NameIntelModule,
  UsernameClusterModule,
} from "../services/dorkAndNameModules";

// ─── Config ────────────────────────────────────────────────────────────────
const IG_TARGET = process.argv[2] || "instagram"; // public account for testing
const DORK_TARGET = process.argv[3] || "Elon Musk";
const USERNAME_TARGET = process.argv[4] || "elonmusk";

const ANSI = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

function c(color: keyof typeof ANSI, str: string) {
  return `${ANSI[color]}${str}${ANSI.reset}`;
}

function log(level: "ok" | "fail" | "warn" | "info", ...args: any[]) {
  const prefix = { ok: c("green", "✓"), fail: c("red", "✗"), warn: c("yellow", "⚠"), info: c("cyan", "→") }[level];
  console.log(prefix, ...args);
}

// ─── Test runner ─────────────────────────────────────────────────────────────
async function testModule(mod: any, target: string, label?: string) {
  const name = label || mod.name || mod.id;
  const separator = c("gray", "─".repeat(60));
  console.log(`\n${separator}`);
  console.log(c("bold", `[${mod.id}]`), name);
  console.log(separator);

  // Check availability
  let avail = false;
  try { avail = await mod.isAvailable(); } catch (e: any) { log("fail", "isAvailable() threw:", e.message); }
  if (!avail) { log("warn", "Module NOT available (skipped)"); return { id: mod.id, available: false }; }
  log("ok", "Module available");

  // Execute
  const logLines: string[] = [];
  const emit = (evt: any) => {
    if (evt.type === "log") logLines.push(evt.data?.message || "");
  };

  const startMs = Date.now();
  let result: any = null;
  let error: string | null = null;

  try {
    result = await Promise.race([
      mod.execute(target, emit),
      new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT 90s")), 90000)),
    ]);
  } catch (e: any) {
    error = e.message;
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

  // Print logs
  for (const l of logLines) console.log(c("gray", `   LOG: ${l}`));

  if (error) {
    log("fail", `Error after ${elapsed}s:`, error);
    return { id: mod.id, available: true, success: false, error, elapsed };
  }

  const entities = result?.entities || [];
  log("ok", `Done in ${elapsed}s — ${c("bold", String(entities.length))} entities found`);

  // Print entity summary
  const byType: Record<string, string[]> = {};
  for (const e of entities) {
    if (!byType[e.type]) byType[e.type] = [];
    byType[e.type].push(String(e.value).slice(0, 80));
  }
  for (const [type, vals] of Object.entries(byType)) {
    const preview = vals.slice(0, 3).map(v => c("gray", v)).join(", ");
    const more = vals.length > 3 ? c("gray", ` (+${vals.length - 3} more)`) : "";
    console.log(`   ${c("cyan", type.padEnd(18))} ${preview}${more}`);
  }

  if (entities.length === 0) log("warn", "No entities extracted");

  return { id: mod.id, available: true, success: true, entities: entities.length, elapsed, byType };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(c("bold", "\n╔══════════════════════════════════════════════════════════╗"));
  console.log(c("bold",   "║        OSINT-MASTER — Module Test Suite                  ║"));
  console.log(c("bold",   "╚══════════════════════════════════════════════════════════╝\n"));
  console.log(c("cyan", `Instagram target  : @${IG_TARGET}`));
  console.log(c("cyan", `Dork target       : "${DORK_TARGET}"`));
  console.log(c("cyan", `Username target   : ${USERNAME_TARGET}`));
  console.log(c("cyan", `RAPIDAPI_KEY      : ${process.env.RAPIDAPI_KEY ? "SET" : "NOT SET"}`));

  const results: any[] = [];

  // ── INSTAGRAM MODULES ──────────────────────────────────────────────────────
  console.log(c("bold", "\n\n═══ INSTAGRAM MODULES ═══════════════════════════════════════\n"));

  const igModules = [
    { mod: IgProfileModule,       target: IG_TARGET },
    { mod: IgContactModule,       target: IG_TARGET },
    { mod: IgNetworkModule,       target: IG_TARGET },
    { mod: IgGeoModule,           target: IG_TARGET },
    { mod: IgStoriesModule,       target: IG_TARGET },
    { mod: IgHashtagModule,       target: IG_TARGET },
    { mod: IgTaggedModule,        target: IG_TARGET },
    { mod: IgCrossPlatformModule, target: IG_TARGET },
    { mod: IgAltAccountsModule,   target: IG_TARGET },
    { mod: IgPostsReelsModule,    target: IG_TARGET },
    { mod: IgInstalaoderModule,   target: IG_TARGET },
    { mod: IgOsintgramModule,     target: IG_TARGET },
    { mod: IgHikerApiModule,      target: IG_TARGET },
  ];

  for (const { mod, target } of igModules) {
    results.push(await testModule(mod, target));
  }

  // ── DORK & NAME INTELLIGENCE MODULES ──────────────────────────────────────
  console.log(c("bold", "\n\n═══ GOOGLE DORKING & NAME INTELLIGENCE ══════════════════════\n"));

  results.push(await testModule(GoogleDorkModule,    DORK_TARGET));
  results.push(await testModule(NameIntelModule,     DORK_TARGET));
  results.push(await testModule(UsernameClusterModule, USERNAME_TARGET));

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  console.log(c("bold", "\n\n═══ SUMMARY ══════════════════════════════════════════════════\n"));
  const header = "Module".padEnd(28) + "Available".padEnd(12) + "Success".padEnd(12) + "Entities".padEnd(12) + "Time(s)";
  console.log(c("bold", header));
  console.log(c("gray", "─".repeat(80)));

  for (const r of results.filter(Boolean)) {
    const avStr  = r.available ? c("green", "✓") : c("red", "✗ (skip)");
    const sucStr = !r.available ? c("gray", "-") : r.success ? c("green", "✓") : c("red", "✗ err");
    const entStr = (r.entities ?? "-").toString();
    const timeStr = r.elapsed ?? "-";
    console.log(
      r.id.padEnd(28) +
      (r.available ? "  ✓".padEnd(12) : "  ✗ skip".padEnd(12)) +
      (r.success ? "  ✓" : r.available ? "  ✗ err" : "  -").padEnd(12) +
      entStr.padEnd(12) +
      timeStr
    );
  }

  const total     = results.filter(Boolean).length;
  const available = results.filter(r => r?.available).length;
  const success   = results.filter(r => r?.success).length;
  const totalEnts = results.filter(r => r?.entities).reduce((s, r) => s + (r.entities || 0), 0);

  console.log(c("gray", "─".repeat(80)));
  console.log(c("bold", `Total: ${total} modules  |  Available: ${available}  |  Success: ${success}  |  Entities found: ${totalEnts}\n`));
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
