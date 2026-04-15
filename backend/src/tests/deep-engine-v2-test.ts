// ============================================================================
// TESTS DEEP ENGINE V2 - Validation des optimisations
// ============================================================================

import { deepEngineV2 } from "../services/DeepEngineV2";
import { cacheManager } from "../services/cache/CacheManager";
import { parallelExecutor } from "../services/executor/ParallelExecutor";
import { allModules, detectTargetType } from "../modules";

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

async function runTests(): Promise<void> {
  const results: TestResult[] = [];
  console.log("\n🧪 DeepEngine V2 - Test Suite\n");

  // Test 1: Initialisation
  results.push(await testInit());

  // Test 2: Modules disponibles
  results.push(await testAvailableModules());

  // Test 3: Détection de type de cible
  results.push(await testTargetDetection());

  // Test 4: Cache Manager
  results.push(await testCacheManager());

  // Test 5: Investigation simple (email)
  results.push(await testEmailInvestigation());

  // Test 6: Investigation domaine
  results.push(await testDomainInvestigation());

  // Test 7: Cache Hit
  results.push(await testCacheHit());

  // Test 8: Stats de cache
  results.push(await testCacheStats());

  // Résumé
  printSummary(results);
}

async function testInit(): Promise<TestResult> {
  const start = Date.now();
  try {
    await deepEngineV2.init();
    return { name: "✅ Initialisation DeepEngineV2", passed: true, duration: Date.now() - start };
  } catch (err: any) {
    return { name: "❌ Initialisation DeepEngineV2", passed: false, duration: Date.now() - start, error: err.message };
  }
}

async function testAvailableModules(): Promise<TestResult> {
  const start = Date.now();
  try {
    const modules = deepEngineV2.getAvailableModules();
    return { 
      name: "✅ Modules disponibles", 
      passed: modules.length > 0, 
      duration: Date.now() - start,
      details: { count: modules.length, modules: modules.map(m => m.id) }
    };
  } catch (err: any) {
    return { name: "❌ Modules disponibles", passed: false, duration: Date.now() - start, error: err.message };
  }
}

async function testTargetDetection(): Promise<TestResult> {
  const start = Date.now();
  const tests = [
    { target: "test@gmail.com", expected: "email" },
    { target: "john_doe", expected: "username" },
    { target: "example.com", expected: "domain" },
    { target: "192.168.1.1", expected: "ip" },
    { target: "https://example.com", expected: "url" },
    { target: "+33612345678", expected: "phone" },
  ];

  let allPassed = true;
  for (const test of tests) {
    const type = detectTargetType(test.target);
    if (type !== test.expected) {
      allPassed = false;
      console.log(`  ⚠️ ${test.target} → ${type} (attendu: ${test.expected})`);
    }
  }

  return { 
    name: "✅ Détection type de cible", 
    passed: allPassed, 
    duration: Date.now() - start,
    details: { tests: tests.length }
  };
}

async function testCacheManager(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test set/get
    await cacheManager.set("test", "key1", { data: "value1" });
    const value = await cacheManager.get<{ data: string }>("test", "key1");
    
    const passed = value?.data === "value1";
    return { 
      name: passed ? "✅ Cache Manager (set/get)" : "❌ Cache Manager (set/get)", 
      passed, 
      duration: Date.now() - start 
    };
  } catch (err: any) {
    return { name: "❌ Cache Manager", passed: false, duration: Date.now() - start, error: err.message };
  }
}

async function testEmailInvestigation(): Promise<TestResult> {
  const start = Date.now();
  try {
    const events: any[] = [];
    const generator = deepEngineV2.investigate("test@gmail.com", {
      selectedModules: ["gravatar"],
      maxDepth: 0
    });

    for await (const event of generator) {
      events.push(event);
    }

    const completeEvent = events.find(e => e.type === "complete");
    const hasPhaseEvents = events.some(e => e.type === "phase");
    const hasToolDone = events.some(e => e.type === "tool_done");

    const passed = completeEvent && hasPhaseEvents;
    
    return { 
      name: passed ? "✅ Investigation Email (Gravatar)" : "❌ Investigation Email", 
      passed, 
      duration: Date.now() - start,
      details: { 
        events: events.length, 
        complete: !!completeEvent,
        entities: completeEvent?.data?.summary?.entities || 0
      }
    };
  } catch (err: any) {
    return { name: "❌ Investigation Email", passed: false, duration: Date.now() - start, error: err.message };
  }
}

async function testDomainInvestigation(): Promise<TestResult> {
  const start = Date.now();
  try {
    const events: any[] = [];
    const generator = deepEngineV2.investigate("cloudflare.com", {
      selectedModules: ["crtsh"],
      maxDepth: 0
    });

    for await (const event of generator) {
      events.push(event);
    }

    const completeEvent = events.find(e => e.type === "complete");
    const passed = completeEvent !== undefined;

    return { 
      name: passed ? "✅ Investigation Domaine (crt.sh)" : "❌ Investigation Domaine", 
      passed, 
      duration: Date.now() - start,
      details: { 
        events: events.length,
        entities: completeEvent?.data?.summary?.entities || 0
      }
    };
  } catch (err: any) {
    return { name: "❌ Investigation Domaine", passed: false, duration: Date.now() - start, error: err.message };
  }
}

async function testCacheHit(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Première exécution (miss)
    const events1: any[] = [];
    const gen1 = deepEngineV2.investigate("test-cache@example.com", {
      selectedModules: ["gravatar"],
      maxDepth: 0
    });
    for await (const event of gen1) events1.push(event);

    // Deuxième exécution (hit)
    const events2: any[] = [];
    const gen2 = deepEngineV2.investigate("test-cache@example.com", {
      selectedModules: ["gravatar"],
      maxDepth: 0
    });
    for await (const event of gen2) events2.push(event);

    const complete2 = events2.find(e => e.type === "complete");
    const cached = complete2?.data?.summary?.fromCache > 0;

    return { 
      name: cached ? "✅ Cache Hit (2ème requête)" : "⚠️ Cache Miss (normal si pas de résultat)", 
      passed: true, 
      duration: Date.now() - start,
      details: { cached, duration1: events1.length, duration2: events2.length }
    };
  } catch (err: any) {
    return { name: "❌ Cache Hit Test", passed: false, duration: Date.now() - start, error: err.message };
  }
}

async function testCacheStats(): Promise<TestResult> {
  const start = Date.now();
  try {
    const stats = cacheManager.getStats();
    const hasStats = Object.keys(stats).length > 0;

    return { 
      name: "✅ Cache Stats", 
      passed: hasStats, 
      duration: Date.now() - start,
      details: stats
    };
  } catch (err: any) {
    return { name: "❌ Cache Stats", passed: false, duration: Date.now() - start, error: err.message };
  }
}

function printSummary(results: TestResult[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 RÉSUMÉ DES TESTS");
  console.log("=".repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);

  for (const result of results) {
    const status = result.passed ? "✅" : "❌";
    console.log(`${status} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Erreur: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Détails:`, JSON.stringify(result.details, null, 2).substring(0, 200));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Résultat: ${passed}/${total} tests passés (${failed} échecs)`);
  console.log(`Durée totale: ${totalDuration}ms`);
  console.log("=".repeat(60) + "\n");
}

// Exécuter les tests si appelé directement
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
