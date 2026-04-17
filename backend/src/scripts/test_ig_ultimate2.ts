/**
 * Test des modules Instagram Ultimate 2
 * Usage: npx ts-node src/scripts/test_ig_ultimate2.ts [moduleId] [target]
 */
import {
  IgGoogleDorksModule, IgAboutAccountModule, IgAnonymousViewersModule,
  IgPostExifModule, IgCaptionAnalyzerModule, IgTaggedByModule, IgOsintSuiteModule,
} from "../services/instagramUltimate2";

const MODULES: Record<string, any> = {
  dorks: IgGoogleDorksModule,
  about: IgAboutAccountModule,
  anon: IgAnonymousViewersModule,
  exif: IgPostExifModule,
  caption: IgCaptionAnalyzerModule,
  tagged: IgTaggedByModule,
  suite: IgOsintSuiteModule,
};

const moduleId = process.argv[2] || "dorks";
const target = process.argv[3] || "elonmusk";

async function main() {
  const mod = MODULES[moduleId];
  if (!mod) {
    console.log(`Unknown. Available: ${Object.keys(MODULES).join(", ")}`);
    process.exit(1);
  }
  console.log(`=== ${mod.name} ===\nTarget: ${target}\n`);
  const emit = (e: any) => e.data?.message && console.log("  LOG:", e.data.message);
  const start = Date.now();
  const result = await mod.execute(target, emit, {});
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Success: ${result.success} | ${Date.now() - start}ms`);
  console.log(`Data: ${JSON.stringify(result.data)}`);
  console.log(`Entités: ${result.entities.length}\n`);
  result.entities.slice(0, 10).forEach((e: any) => {
    console.log(`  [${e.type}] ${e.confidence}% — ${String(e.value).slice(0, 80)}`);
    console.log(`      ${JSON.stringify(e.metadata).slice(0, 180)}`);
  });
}
main().catch(console.error);
