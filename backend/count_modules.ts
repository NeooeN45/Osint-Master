#!/usr/bin/env tsx
// ============================================================================
// COMPTEUR DE MODULES
// ============================================================================

import { allModules } from "./src/modules/index.js";

function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║     📊 DÉCOMPTES DES MODULES OSINT                             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // Group by category
  const byCategory: Record<string, string[]> = {};
  
  for (const mod of allModules) {
    if (!byCategory[mod.category]) {
      byCategory[mod.category] = [];
    }
    byCategory[mod.category].push(mod.id);
  }

  // Display by category
  let total = 0;
  for (const [category, modules] of Object.entries(byCategory).sort()) {
    console.log(`\n📁 ${category.toUpperCase()} (${modules.length} modules)`);
    console.log("─".repeat(50));
    for (const mod of modules.sort()) {
      console.log(`   • ${mod}`);
    }
    total += modules.length;
  }

  console.log("\n" + "═".repeat(50));
  console.log(`\n🎯 TOTAL: ${total} modules`);
  
  const target = 172;
  const remaining = target - total;
  const percent = Math.round((total / target) * 100);
  
  console.log(`📈 Objectif: ${target} modules`);
  console.log(`✅ Complété: ${percent}%`);
  console.log(`⏳ Restant: ${remaining > 0 ? remaining : 0} modules`);
  
  if (total >= target) {
    console.log("\n🎉🎉🎉 OBJECTIF ATTEINT ! 🎉🎉🎉");
  }
  
  console.log();
}

main();
