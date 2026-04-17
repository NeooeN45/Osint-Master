// Test tous les modules phone du deepEngine
import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

const RAW = process.argv[2] || "0769723999";
// Normaliser: 07XXXXXXXX → +337XXXXXXXX
const PHONE = RAW.startsWith("+") ? RAW
  : RAW.startsWith("0") ? "+33" + RAW.slice(1)
  : "+" + RAW;

const A = { r: "\x1b[0m", g: "\x1b[32m", red: "\x1b[31m", y: "\x1b[33m", c: "\x1b[36m", gr: "\x1b[90m", b: "\x1b[1m" };
const col = (k: keyof typeof A, s: string) => `${A[k]}${s}${A.r}`;
const sep = () => console.log(col("gr", "─".repeat(70)));

async function main() {
  console.log(col("b", `\n╔══════════════════════════════════════════════════════════════════╗`));
  console.log(col("b", `║  PHONE OSINT : ${RAW}  →  ${PHONE.padEnd(43)}║`));
  console.log(col("b", `╚══════════════════════════════════════════════════════════════════╝\n`));

  const { deepEngine } = await import("../services/deepEngine");
  await (deepEngine as any).init?.();
  const allModules: any[] = (deepEngine as any).modules
    ? [...(deepEngine as any).modules.values()]
    : [];

  const phoneModules = allModules.filter(m =>
    Array.isArray(m.targetTypes) && m.targetTypes.includes("phone")
  );

  console.log(col("c", `Modules phone trouvés: ${phoneModules.length}`));
  for (const m of phoneModules) {
    console.log(`  ${col("gr", m.id.padEnd(35))} ${m.name}`);
  }

  console.log(col("b", `\n═══ EXECUTION ═══════════════════════════════════════════════════\n`));

  const allEntities: any[] = [];
  const summary: { id: string; available: boolean; entities: number; time: string; error?: string }[] = [];

  for (const mod of phoneModules) {
    sep();
    console.log(`${col("b", `[${mod.id}]`)} ${mod.name}`);

    let avail = false;
    try { avail = await mod.isAvailable(); } catch { avail = false; }
    if (!avail) {
      console.log(col("y", "  ⚠ Non disponible (skipped)"));
      summary.push({ id: mod.id, available: false, entities: 0, time: "-" });
      continue;
    }

    const logs: string[] = [];
    const emit = (e: any) => { if (e.type === "log") logs.push(e.data?.message || ""); };
    const t0 = Date.now();
    let result: any;
    let error: string | undefined;

    try {
      result = await Promise.race([
        mod.execute(PHONE, emit),
        new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT 60s")), 60000)),
      ]);
    } catch (e: any) { error = e.message; }

    const elapsed = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    for (const l of logs) console.log(col("gr", `  LOG: ${l}`));

    if (error) {
      console.log(col("red", `  ✗ Erreur: ${error}`));
      summary.push({ id: mod.id, available: true, entities: 0, time: elapsed, error });
      continue;
    }

    const ents = result?.entities || [];
    const icon = ents.length > 0 ? col("g", "✓") : col("gr", "○");
    console.log(`  ${icon} ${elapsed} — ${ents.length > 0 ? col("b", String(ents.length)) : col("gr", "0")} entités`);
    for (const e of ents.slice(0, 20)) {
      const conf = e.confidence >= 80 ? col("g", `${e.confidence}%`) : col("y", `${e.confidence}%`);
      console.log(`   ${col("c", String(e.type).padEnd(16))} ${conf}  ${String(e.value).slice(0, 90)}`);
      if (e.metadata && Object.keys(e.metadata).length > 0) {
        const meta = Object.entries(e.metadata).filter(([k]) => !["depth","verified"].includes(k))
          .map(([k,v]) => `${k}=${String(v).slice(0,30)}`).slice(0,4).join(", ");
        if (meta) console.log(`       ${col("gr", meta)}`);
      }
    }
    if (ents.length > 20) console.log(col("gr", `   ... +${ents.length - 20} autres`));

    allEntities.push(...ents);
    summary.push({ id: mod.id, available: true, entities: ents.length, time: elapsed });
  }

  sep();
  console.log(col("b", `\n═══ SUMMARY — ${PHONE} ═══\n`));
  console.log("Module".padEnd(35) + "Dispo".padEnd(8) + "Entités".padEnd(10) + "Temps");
  console.log(col("gr", "─".repeat(70)));
  for (const s of summary) {
    const disp = s.available ? col("g", "✓") : col("y", "skip");
    const ents = s.available ? (s.entities > 0 ? col("g", String(s.entities)) : col("gr", "0")) : col("gr", "-");
    const err = s.error ? col("red", ` ← ${s.error.slice(0, 40)}`) : "";
    console.log(`${s.id.padEnd(35)}${disp.padEnd(14)}${ents.padEnd(16)}${s.time}${err}`);
  }

  const byType: Record<string, any[]> = {};
  for (const e of allEntities) { if (!byType[e.type]) byType[e.type] = []; byType[e.type].push(e); }

  if (Object.keys(byType).length > 0) {
    console.log(col("b", "\nEntités par type:"));
    for (const [type, ents] of Object.entries(byType)) {
      const vals = ents.map(e => String(e.value).slice(0, 60)).slice(0, 3).join(", ");
      console.log(`  ${col("c", type.padEnd(18))} ${ents.length}x  ${col("gr", vals)}${ents.length > 3 ? ` +${ents.length-3}` : ""}`);
    }
  }
  console.log(col("b", `\nTotal: ${allEntities.length} entités — ${summary.filter(s=>s.available).length}/${phoneModules.length} modules exécutés\n`));
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
