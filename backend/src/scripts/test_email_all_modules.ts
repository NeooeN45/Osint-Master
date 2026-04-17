// Test tous les modules email du deepEngine directement
import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

// Importer les MODULES directement depuis deepEngine
// On accède via l'objet deepEngine mais on filtre sur targetTypes email

const EMAIL = process.argv[2] || "camilleperraudeau@gmail.com";

const A = { r: "\x1b[0m", g: "\x1b[32m", red: "\x1b[31m", y: "\x1b[33m", c: "\x1b[36m", gr: "\x1b[90m", b: "\x1b[1m" };
const col = (k: keyof typeof A, s: string) => `${A[k]}${s}${A.r}`;
const sep = () => console.log(col("gr", "─".repeat(70)));

async function main() {
  console.log(col("b", `\n╔══════════════════════════════════════════════════════════════════╗`));
  console.log(col("b", `║  FULL EMAIL OSINT — ${EMAIL.padEnd(46)}║`));
  console.log(col("b", `╚══════════════════════════════════════════════════════════════════╝\n`));

  // Import dynamique du deepEngine pour accéder aux MODULES internes
  const { deepEngine } = await import("../services/deepEngine");

  // Init le moteur
  await (deepEngine as any).init?.();
  const allModules: any[] = (deepEngine as any).modules
    ? [...(deepEngine as any).modules.values()]
    : [];

  // Filtrer modules email
  const emailModules = allModules.filter(m =>
    Array.isArray(m.targetTypes) && m.targetTypes.includes("email")
  );

  console.log(col("c", `Modules email trouvés dans deepEngine: ${emailModules.length}`));
  for (const m of emailModules) {
    console.log(`  ${col("gr", m.id.padEnd(35))} ${m.name}`);
  }

  console.log(col("b", `\n═══ EXECUTION ═══════════════════════════════════════════════════\n`));

  const allEntities: any[] = [];
  const summary: { id: string; available: boolean; entities: number; time: string; error?: string }[] = [];

  for (const mod of emailModules) {
    sep();
    console.log(`${col("b", `[${mod.id}]`)} ${mod.name}`);

    let avail = false;
    try { avail = await mod.isAvailable(); } catch (e: any) { avail = false; }
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
        mod.execute(EMAIL, emit),
        new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT 60s")), 60000)),
      ]);
    } catch (e: any) {
      error = e.message;
    }

    const elapsed = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    for (const l of logs) console.log(col("gr", `  LOG: ${l}`));

    if (error) {
      console.log(col("red", `  ✗ Erreur: ${error}`));
      summary.push({ id: mod.id, available: true, entities: 0, time: elapsed, error });
      continue;
    }

    const ents = result?.entities || [];
    console.log(`  ${col("g", "✓")} ${elapsed} — ${col("b", String(ents.length))} entités`);
    for (const e of ents.slice(0, 15)) {
      const conf = e.confidence >= 80 ? col("g", `${e.confidence}%`) : col("y", `${e.confidence}%`);
      console.log(`   ${col("c", String(e.type).padEnd(16))} ${conf}  ${col("gr", String(e.value).slice(0, 90))}`);
      if (e.metadata?.snippet) console.log(`       ${col("gr", String(e.metadata.snippet).slice(0, 100))}`);
    }
    if (ents.length > 15) console.log(col("gr", `   ... +${ents.length - 15} autres`));
    if (ents.length === 0) console.log(col("y", "  ⚠ Aucune entité"));

    allEntities.push(...ents);
    summary.push({ id: mod.id, available: true, entities: ents.length, time: elapsed });
  }

  // Résumé
  sep();
  console.log(col("b", `\n═══ SUMMARY — ${EMAIL} ═══\n`));
  console.log(col("b", "Module".padEnd(35) + "Dispo".padEnd(8) + "Entités".padEnd(10) + "Temps"));
  console.log(col("gr", "─".repeat(70)));
  for (const s of summary) {
    const disp = s.available ? col("g", "✓") : col("y", "skip");
    const ents = s.available ? (s.entities > 0 ? col("g", String(s.entities)) : col("gr", "0")) : col("gr", "-");
    const err  = s.error ? col("red", ` ← ${s.error.slice(0, 30)}`) : "";
    console.log(`${s.id.padEnd(35)}${disp.padEnd(14)}${ents.padEnd(16)}${s.time}${err}`);
  }
  console.log(col("gr", "─".repeat(70)));

  const byType: Record<string, any[]> = {};
  for (const e of allEntities) { if (!byType[e.type]) byType[e.type] = []; byType[e.type].push(e); }
  console.log(col("b", "\nEntités par type:"));
  for (const [type, ents] of Object.entries(byType)) {
    const vals = ents.map(e => String(e.value).slice(0, 50)).slice(0, 3).join(", ");
    console.log(`  ${col("c", type.padEnd(18))} ${ents.length}x  ${col("gr", vals)}${ents.length > 3 ? col("gr", ` +${ents.length-3}`) : ""}`);
  }
  console.log(col("b", `\nTotal: ${allEntities.length} entités depuis ${summary.filter(s => s.available).length}/${emailModules.length} modules disponibles\n`));
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
