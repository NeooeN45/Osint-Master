/**
 * Test des modules d'analyse avancée (Sprint 2)
 * Usage: npx ts-node src/scripts/test_advanced.ts [moduleId] [target]
 */
import { advancedAnalysisModules } from "../services/advancedAnalysisModules";

const moduleId = process.argv[2] || "image_analysis";
const target = process.argv[3] || "https://pbs.twimg.com/profile_images/1683899100922511378/5lY42eHs_400x400.jpg";

async function main() {
  const mod = advancedAnalysisModules.find(m => m.id === moduleId);
  if (!mod) {
    console.log(`Module ${moduleId} not found. Available:`);
    advancedAnalysisModules.forEach(m => console.log(`  - ${m.id}: ${m.name}`));
    process.exit(1);
  }

  console.log(`=== ${mod.name} ===`);
  console.log(`Target: ${target}\n`);

  const available = await mod.isAvailable();
  console.log(`Available: ${available}\n`);

  const emit = (e: any) => {
    if (e.data?.message) console.log("  LOG:", e.data.message);
  };

  // Fake context with some entities for stylometry/behavioral/trust
  const fakeContext = moduleId !== "image_analysis" && moduleId !== "darkweb_deep" ? {
    allEntities: [
      { type: "social_profile", value: "https://instagram.com/test", source: "ig_profile",
        metadata: { username: "test", platform: "Instagram", bio: "Hello world! 🌍 Love coding 💻", followers: 5000, following: 200, posts: 150 },
        confidence: 90 },
      { type: "social_profile", value: "https://twitter.com/test_tw", source: "twitter_deep",
        metadata: { username: "test_tw", platform: "Twitter", bio: "Hello everyone! 🌍 Passionate about code 💻", createdAt: "2023-05-15T14:00:00Z" },
        confidence: 85 },
      { type: "username", value: "test", source: "ig_profile", confidence: 95, metadata: { platform: "Instagram" } },
    ],
    depth: 0,
  } : {};

  const start = Date.now();
  const result = await (mod as any).execute(target, emit, fakeContext);
  const duration = Date.now() - start;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Success: ${result.success} | Durée: ${duration}ms`);
  console.log(`Data: ${JSON.stringify(result.data)}`);
  console.log(`Entités: ${result.entities.length}`);
  console.log(`${"─".repeat(60)}`);

  for (const e of result.entities.slice(0, 10)) {
    const meta = JSON.stringify(e.metadata || {}).slice(0, 120);
    console.log(`  [${e.type}] ${e.confidence}%  ${e.value.slice(0, 80)}`);
    console.log(`         ${meta}`);
  }
}

main().catch(console.error);
