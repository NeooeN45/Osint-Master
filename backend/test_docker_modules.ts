#!/usr/bin/env tsx
// ============================================================================
// TEST DOCKER MODULES - Vérifie que les modules Docker fonctionnent
// ============================================================================

import { dockerModules } from "./src/modules/docker/index.js";
import { isDockerAvailable, listAvailableTools } from "./src/services/dockerExecutor.js";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║     🐳 TEST DES MODULES DOCKER OSINT                          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // 1. Vérifier Docker
  console.log("🔍 Vérification de Docker...");
  const dockerAvailable = await isDockerAvailable();
  
  if (!dockerAvailable) {
    console.log("❌ Docker non disponible");
    process.exit(1);
  }
  console.log("✅ Docker disponible\n");

  // 2. Lister les outils disponibles
  console.log("🔍 Outils disponibles dans le container:");
  const tools = await listAvailableTools();
  for (const tool of tools) {
    console.log(`   ✅ ${tool}`);
  }
  console.log();

  // 3. Tester chaque module
  console.log("🔍 Test des modules Docker:\n");
  
  for (const mod of dockerModules) {
    console.log(`[${mod.id}]`);
    
    const isAvail = await mod.isAvailable();
    console.log(`   ${isAvail ? '✅' : '❌'} Available: ${isAvail}`);
    
    if (isAvail) {
      const testTarget = mod.targetTypes.includes("username") ? "testuser" :
                        mod.targetTypes.includes("email") ? "test@test.com" :
                        mod.targetTypes.includes("domain") ? "example.com" :
                        "test";
      
      try {
        const result = await mod.execute(testTarget, (event: any) => {
          if (event.type === "tool_done") {
            console.log(`   ✅ Execution: ${event.data.found} entités trouvées`);
          }
        });
        
        console.log(`   ✅ Success: ${result.success}`);
        console.log(`   📊 Entities: ${result.entities?.length || 0}`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log();
  }

  console.log("✅ Tests terminés!\n");
}

main().catch(console.error);
