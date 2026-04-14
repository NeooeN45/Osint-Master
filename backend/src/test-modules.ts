// ============================================================================
// MODULE TEST SCRIPT - Test each OSINT module individually
// Run with: npx tsx backend/src/test-modules.ts <target>
// ============================================================================

import { deepEngine, detectTargetType } from "./services/deepEngine";

async function testModules() {
  const target = process.argv[2] || "mag.-3110";
  const targetType = detectTargetType(target);
  
  console.log("\n" + "=".repeat(70));
  console.log(`OSINT MODULE TEST - Target: ${target} (${targetType})`);
  console.log("=".repeat(70) + "\n");

  // Initialize engine
  await deepEngine.init();
  
  // Get available modules
  const modules = deepEngine.getAvailableModules();
  
  console.log(`Total modules: ${modules.length}`);
  console.log(`Available: ${modules.filter(m => m.available).length}`);
  console.log(`Unavailable: ${modules.filter(m => !m.available).length}\n`);
  
  // Group by category
  const byCategory: Record<string, typeof modules> = {};
  for (const m of modules) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }
  
  console.log("\nMODULES BY CATEGORY:");
  console.log("-".repeat(70));
  for (const [cat, mods] of Object.entries(byCategory)) {
    const available = mods.filter(m => m.available).length;
    console.log(`\n[${cat.toUpperCase()}] ${available}/${mods.length} available`);
    for (const m of mods) {
      const status = m.available ? "✅" : "❌";
      console.log(`  ${status} ${m.name} (${m.id})`);
    }
  }
  
  // Test each available module
  console.log("\n\n" + "=".repeat(70));
  console.log("TESTING EACH MODULE:");
  console.log("=".repeat(70) + "\n");
  
  const results: Array<{
    id: string;
    name: string;
    success: boolean;
    entitiesFound: number;
    duration: number;
    error?: string;
  }> = [];
  
  for (const mod of modules.filter(m => m.available)) {
    const start = Date.now();
    process.stdout.write(`Testing ${mod.name}... `);
    
    try {
      // Run module with timeout
      const generator = deepEngine.investigate(target, {
        maxDepth: 0,
        maxEntities: 100,
        timeoutMs: 60000,
        enableAI: false,
        enableWebSearch: false,
        enableRecursive: false,
        selectedModules: [mod.id],
      });
      
      let entitiesFound = 0;
      let success = false;
      let error = "";
      
      for await (const event of generator) {
        if (event.type === "entity_found") {
          entitiesFound++;
        }
        if (event.type === "tool_done") {
          success = event.data.success;
          if (event.data.error) error = event.data.error;
        }
      }
      
      const duration = Date.now() - start;
      results.push({
        id: mod.id,
        name: mod.name,
        success,
        entitiesFound,
        duration,
        error: error || undefined,
      });
      
      const status = success ? (entitiesFound > 0 ? "✅" : "⚠️") : "❌";
      console.log(`${status} ${duration}ms - ${entitiesFound} entities${error ? ` (Error: ${error})` : ""}`);
      
    } catch (e: any) {
      const duration = Date.now() - start;
      results.push({
        id: mod.id,
        name: mod.name,
        success: false,
        entitiesFound: 0,
        duration,
        error: e.message,
      });
      console.log(`❌ ${duration}ms - CRASH: ${e.message}`);
    }
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  console.log("\n\n" + "=".repeat(70));
  console.log("SUMMARY:");
  console.log("=".repeat(70) + "\n");
  
  const working = results.filter(r => r.success && r.entitiesFound > 0);
  const empty = results.filter(r => r.success && r.entitiesFound === 0);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Working (found entities): ${working.length}`);
  console.log(`⚠️  Working (no entities): ${empty.length}`);
  console.log(`❌ Failed: ${failed.length}\n`);
  
  if (working.length > 0) {
    console.log("WORKING MODULES:");
    for (const r of working.sort((a, b) => b.entitiesFound - a.entitiesFound)) {
      console.log(`  ${r.name}: ${r.entitiesFound} entities (${r.duration}ms)`);
    }
  }
  
  if (failed.length > 0) {
    console.log("\nFAILED MODULES:");
    for (const r of failed) {
      console.log(`  ${r.name}: ${r.error || "Unknown error"}`);
    }
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("Test complete!");
  console.log("=".repeat(70) + "\n");
  
  process.exit(0);
}

testModules().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
