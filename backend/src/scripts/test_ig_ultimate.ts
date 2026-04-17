/**
 * Test rapide des modules Instagram Ultimate
 * Usage: npx ts-node src/scripts/test_ig_ultimate.ts [moduleId] [target]
 */
import {
  IgEmailLookupModule, IgFullnameSearchModule, IgSimilarAccountsModule,
  IgCommentsHarvesterModule, IgLiveStatusModule, IgUsernameHistoryModule,
  IgArchivedContentModule, IgEngagementAnalyzerModule, IgMutualsIntersectionModule,
  IgLocationPostsModule,
} from "../services/instagramUltimate";

const MODULES: Record<string, any> = {
  email: IgEmailLookupModule,
  name: IgFullnameSearchModule,
  similar: IgSimilarAccountsModule,
  comments: IgCommentsHarvesterModule,
  live: IgLiveStatusModule,
  history: IgUsernameHistoryModule,
  archived: IgArchivedContentModule,
  engagement: IgEngagementAnalyzerModule,
  mutuals: IgMutualsIntersectionModule,
  location: IgLocationPostsModule,
};

const moduleId = process.argv[2] || "name";
const target = process.argv[3] || "elonmusk";

async function main() {
  const mod = MODULES[moduleId];
  if (!mod) {
    console.log(`Unknown. Available: ${Object.keys(MODULES).join(", ")}`);
    process.exit(1);
  }
  console.log(`=== ${mod.name} ===`);
  console.log(`Target: ${target}\n`);

  const emit = (e: any) => e.data?.message && console.log("  LOG:", e.data.message);
  const start = Date.now();
  const result = await mod.execute(target, emit, {});
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Success: ${result.success} | ${Date.now() - start}ms`);
  console.log(`Data: ${JSON.stringify(result.data)}`);
  console.log(`Entités: ${result.entities.length}\n`);
  result.entities.slice(0, 10).forEach((e: any) => {
    console.log(`  [${e.type}] ${e.confidence}% — ${String(e.value).slice(0, 80)}`);
    console.log(`      ${JSON.stringify(e.metadata).slice(0, 160)}`);
  });
}
main().catch(console.error);
