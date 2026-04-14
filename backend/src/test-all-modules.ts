// ============================================================================
// COMPREHENSIVE MODULE TEST - Test each OSINT module individually
// Run with: npx tsx backend/src/test-all-modules.ts <target>
// ============================================================================

import { deepEngine, detectTargetType } from "./services/deepEngine";

// Get target from command line or use default
const USER_TARGET = process.argv[2] || "mag.-3110";
const TARGET_TYPE = detectTargetType(USER_TARGET);

interface TestResult {
  id: string;
  name: string;
  category: string;
  available: boolean;
  success: boolean;
  entitiesFound: number;
  correlationsFound: number;
  duration: number;
  data?: any;
  entities?: any[];
  error?: string | null;
  logs: string[];
}

async function testAllModules() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 OSINT MASTER PRO - MODULE TESTING");
  console.log("=".repeat(80));
  console.log(`\n🎯 TARGET: ${USER_TARGET} (type: ${TARGET_TYPE})\n`);

  // Initialize engine
  await deepEngine.init();
  
  // Get all available modules
  const modules = deepEngine.getAvailableModules();
  console.log(`📦 Total modules in system: ${modules.length}`);
  console.log(`✅ Available modules: ${modules.filter(m => m.available).length}`);
  console.log(`❌ Unavailable modules: ${modules.filter(m => !m.available).length}\n`);

  // Group by category
  const byCategory: Record<string, typeof modules> = {};
  for (const m of modules) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }

  console.log("📂 MODULES BY CATEGORY:");
  console.log("-".repeat(80));
  for (const [cat, mods] of Object.entries(byCategory)) {
    const available = mods.filter(m => m.available).length;
    console.log(`\n[${cat.toUpperCase()}] ${available}/${mods.length} available`);
    for (const m of mods) {
      const status = m.available ? "✅" : "❌";
      console.log(`  ${status} ${m.name} (${m.id})`);
    }
  }

  // Test each available module
  console.log("\n\n" + "=".repeat(80));
  console.log("🧪 TESTING EACH MODULE:");
  console.log("=".repeat(80) + "\n");

  const results: TestResult[] = [];
  
  for (const mod of modules.filter(m => m.available)) {
    // Check if this module supports the target type
    const supportsTarget = mod.targetTypes.includes(TARGET_TYPE);
    
    const logs: string[] = [];
    const start = Date.now();
    
    console.log(`\n${"─".repeat(80)}`);
    console.log(`🔧 Testing: ${mod.name} (${mod.id})`);
    console.log(`🎯 Target: ${USER_TARGET} (supports: ${mod.targetTypes.join(", ")}) ${supportsTarget ? "✅" : "❌ SKIP"}`);
    console.log(`${"─".repeat(80)}`);
    
    // Skip modules that don't support this target type
    if (!supportsTarget) {
      console.log(`  ⏭️  Skipped - module doesn't support ${TARGET_TYPE}`);
      results.push({
        id: mod.id,
        name: mod.name,
        category: mod.category,
        available: true,
        success: true,  // Not a failure, just incompatible
        entitiesFound: 0,
        correlationsFound: 0,
        duration: 0,
        logs: [`Skipped - doesn't support ${TARGET_TYPE}`],
        error: undefined,  // Not an error
      });
      continue;
    }
    
    let success = false;
    let error = "";
    
    try {
      // Run module with timeout
      const generator = deepEngine.investigate(USER_TARGET, {
        maxDepth: 0,
        maxEntities: 100,
        timeoutMs: 60000,
        enableAI: false,
        enableWebSearch: false,
        enableRecursive: false,
        selectedModules: [mod.id],
      });
      
      let entitiesFound = 0;
      let correlationsFound = 0;
      let moduleData: any = null;
      const entities: any[] = [];
      
      for await (const event of generator) {
        // Capture logs
        if (event.type === "log") {
          const msg = event.data?.message || "";
          logs.push(msg);
          console.log(`  📝 ${msg}`);
        }
        
        if (event.type === "entity_found") {
          entitiesFound++;
          entities.push(event.data?.entity);
          console.log(`  📌 Entity: ${event.data?.entity?.type} = ${event.data?.entity?.value?.slice(0, 50)}`);
        }
        
        if (event.type === "correlation") {
          correlationsFound++;
          console.log(`  🔗 Correlation: ${event.data?.correlation?.type}`);
        }
        
        if (event.type === "tool_done") {
          success = event.data.success ?? true;  // Default to true if undefined
          error = event.data.error || "";
          moduleData = event.data.data;
          const icon = success ? "✅" : "❌";
          const errMsg = error ? ` (Error: ${error})` : "";
          console.log(`  ${icon} Tool completed${errMsg}`);
        }
      }
      
      const duration = Date.now() - start;
      
      // Show detailed results
      console.log(`\n  📊 RESULTS:`);
      console.log(`     Duration: ${duration}ms`);
      console.log(`     Entities: ${entitiesFound}`);
      console.log(`     Correlations: ${correlationsFound}`);
      console.log(`     Success: ${success}`);
      if (moduleData) {
        console.log(`     Data: ${JSON.stringify(moduleData).slice(0, 200)}`);
      }
      
      // Store result - ensure success is boolean
      results.push({
        id: mod.id,
        name: mod.name,
        category: mod.category,
        available: true,
        success: !!success,  // Force boolean
        entitiesFound,
        correlationsFound,
        duration,
        logs,
        error: error || undefined,
        entities: entities.slice(0, 10),  // Store first 10 entities
      });
      
    } catch (e: any) {
      const duration = Date.now() - start;
      console.log(`  💥 CRASH: ${e.message}`);
      console.log(`  ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`);
      
      results.push({
        id: mod.id,
        name: mod.name,
        category: mod.category,
        available: true,
        success: false,
        entitiesFound: 0,
        correlationsFound: 0,
        duration,
        error: e.message,
        logs,
      });
    }
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 300));
  }

  // Summary Report
  console.log("\n\n" + "=".repeat(80));
  console.log("📈 FINAL SUMMARY:");
  console.log("=".repeat(80) + "\n");
  
  const working = results.filter(r => r.success && r.entitiesFound > 0);
  const empty = results.filter(r => r.success && r.entitiesFound === 0);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Working (found entities): ${working.length}`);
  console.log(`⚠️  Working (no entities): ${empty.length}`);
  console.log(`❌ Failed/Crashed: ${failed.length}\n`);

  // Top performers
  if (working.length > 0) {
    console.log("🏆 TOP PERFORMERS:");
    const sorted = working.sort((a, b) => b.entitiesFound - a.entitiesFound);
    for (const r of sorted.slice(0, 10)) {
      console.log(`   ${r.name}: ${r.entitiesFound} entities, ${r.duration}ms`);
    }
  }
  
  // Failed modules
  if (failed.length > 0) {
    console.log("\n💥 FAILED MODULES:");
    for (const r of failed) {
      console.log(`   ❌ ${r.name}: ${r.error || "Unknown error"}`);
    }
  }

  // Modules needing tuning
  console.log("\n🔧 MODULES NEEDING ATTENTION:");
  const slow = results.filter(r => r.duration > 10000 && r.success);
  if (slow.length > 0) {
    console.log("   Slow modules (>10s):");
    for (const r of slow) {
      console.log(`     - ${r.name}: ${r.duration}ms`);
    }
  }
  
  const noEntities = results.filter(r => r.success && r.entitiesFound === 0);
  if (noEntities.length > 0) {
    console.log("   No results (may need better params):");
    for (const r of noEntities) {
      console.log(`     - ${r.name}`);
    }
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      working: working.length,
      empty: empty.length,
      failed: failed.length,
    },
    results: results.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      success: r.success,
      entitiesFound: r.entitiesFound,
      correlationsFound: r.correlationsFound,
      duration: r.duration,
      error: r.error,
      sampleEntities: r.entities?.slice(0, 3).map(e => ({
        type: e.type,
        value: e.value?.slice(0, 50),
        confidence: e.confidence,
      })),
    })),
  };

  const fs = await import("fs");
  const reportPath = `./module-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  console.log("\n" + "=".repeat(80));
  console.log("✅ Test complete!");
  console.log("=".repeat(80) + "\n");
  
  process.exit(0);
}

testAllModules().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
