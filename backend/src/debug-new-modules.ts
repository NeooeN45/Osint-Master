// ============================================================================
// DEBUG NEW MODULES - Test each new module individually with detailed logging
// ============================================================================

import { UsernameClusterModule, PersonSearchModule, AdvancedDorkModule, HunterModule, IntelXModule } from "./services/newModules";

async function debugModule(module: any, target: string, name: string) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🔍 DEBUGGING: ${name}`);
  console.log(`🎯 Target: ${target}`);
  console.log("=".repeat(80));

  const logs: string[] = [];
  
  const emit = (event: any) => {
    if (event.type === "log") {
      logs.push(event.data.message);
      console.log(`  📝 ${event.data.message}`);
    }
  };

  try {
    const start = Date.now();
    const result = await module.execute(target, emit);
    const duration = Date.now() - start;
    
    console.log(`\n  ✅ SUCCESS: ${result.success}`);
    console.log(`  ⏱️  Duration: ${duration}ms`);
    console.log(`  📊 Entities: ${result.entities?.length || 0}`);
    console.log(`  📦 Data: ${JSON.stringify(result.data, null, 2).slice(0, 500)}`);
    
    if (result.entities && result.entities.length > 0) {
      console.log(`\n  📌 Sample entities:`);
      result.entities.slice(0, 3).forEach((e: any, i: number) => {
        console.log(`     ${i + 1}. [${e.type}] ${e.value?.slice(0, 60)} (conf: ${e.confidence}%)`);
      });
    }
    
    return { success: true, result, logs };
  } catch (error: any) {
    console.log(`\n  💥 ERROR: ${error.message}`);
    console.log(`  📚 Stack: ${error.stack?.split('\n').slice(0, 3).join('\n  ')}`);
    return { success: false, error: error.message, logs };
  }
}

async function main() {
  console.log("\n" + "█".repeat(80));
  console.log("🔧 DEBUGGING NEW OSINT MODULES");
  console.log("█".repeat(80));

  // Test Username Cluster
  await debugModule(UsernameClusterModule, "mag.-3110", "Username Cluster Intelligence");

  // Test Person Search
  await debugModule(PersonSearchModule, "John Smith", "Person Name Search");

  // Test Advanced Dork
  await debugModule(AdvancedDorkModule, "mag.-3110", "Advanced Web Dorking");

  // Test Hunter (if API key available)
  const hasHunter = !!process.env.HUNTER_API_KEY;
  if (hasHunter) {
    await debugModule(HunterModule, "example.com", "Hunter.io Email Finder");
  } else {
    console.log(`\n⚠️  Hunter.io: Skipped (no API key)`);
  }

  // Test IntelX (if API key available)
  const hasIntelX = !!process.env.INTELX_API_KEY;
  if (hasIntelX) {
    await debugModule(IntelXModule, "test@example.com", "Intelligence X Search");
  } else {
    console.log(`\n⚠️  IntelX: Skipped (no API key)`);
  }

  console.log("\n" + "█".repeat(80));
  console.log("✅ DEBUG COMPLETE");
  console.log("█".repeat(80) + "\n");
}

main().catch(console.error);
