#!/usr/bin/env tsx
// ============================================================================
// DIAGNOSTIC COMPLET - TEST DE TOUS LES MODULES OSINT (172+)
// Test un par un avec rapport détaillé
// ============================================================================

import { performance } from 'perf_hooks';
import { 
  allModules, 
  getAvailableModules,
  getModulesForTarget,
  OSINTModule,
  detectTargetType
} from './src/modules/index.js';

// Configuration des tests
const CONFIG = {
  testTargets: {
    username: 'camille_perraudeau',
    email: 'hydrogene.bonde@gmail.com',
    phone: '+33769723999',
    ip: '5.49.134.36',
    domain: 'google.com',
    url: 'https://example.com',
    person: 'John Doe'
  },
  timeouts: {
    isAvailable: 5000,
    execution: 15000
  }
};

// Résultats
interface ModuleTestResult {
  moduleId: string;
  name: string;
  category: string;
  targetTypes: string[];
  isAvailable: {
    tested: boolean;
    passed: boolean;
    duration: number;
    error?: string;
  };
  execution?: {
    tested: boolean;
    passed: boolean;
    duration: number;
    entitiesFound: number;
    error?: string;
  };
}

interface DiagnosticReport {
  timestamp: string;
  totalModules: number;
  testedModules: number;
  availablePassed: number;
  availableFailed: number;
  executionPassed: number;
  executionFailed: number;
  notTested: number;
  results: ModuleTestResult[];
  byCategory: Record<string, {
    total: number;
    available: number;
    working: number;
    failed: number;
  }>;
}

// Logger coloré
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test isAvailable
async function testIsAvailable(mod: OSINTModule): Promise<ModuleTestResult['isAvailable']> {
  const start = performance.now();
  try {
    const available = await Promise.race([
      mod.isAvailable(),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), CONFIG.timeouts.isAvailable)
      )
    ]);
    return {
      tested: true,
      passed: available,
      duration: Math.round(performance.now() - start)
    };
  } catch (error: any) {
    return {
      tested: true,
      passed: false,
      duration: Math.round(performance.now() - start),
      error: error.message
    };
  }
}

// Test execution
async function testExecution(mod: OSINTModule): Promise<ModuleTestResult['execution']> {
  const start = performance.now();
  const targetType = mod.targetTypes?.[0] || 'username';
  const target = CONFIG.testTargets[targetType as keyof typeof CONFIG.testTargets] || 'test';
  
  const entities: any[] = [];
  const emit = (event: any) => {
    if (event?.type === 'entity_found' && event?.data) {
      entities.push(event.data);
    }
  };

  try {
    const result = await Promise.race([
      mod.execute(target, emit),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), CONFIG.timeouts.execution)
      )
    ]);
    
    return {
      tested: true,
      passed: result?.success || entities.length > 0,
      duration: Math.round(performance.now() - start),
      entitiesFound: entities.length
    };
  } catch (error: any) {
    return {
      tested: true,
      passed: false,
      duration: Math.round(performance.now() - start),
      entitiesFound: 0,
      error: error.message
    };
  }
}

// Test d'un module
async function testModule(mod: OSINTModule): Promise<ModuleTestResult> {
  const result: ModuleTestResult = {
    moduleId: mod.id,
    name: mod.name,
    category: mod.category,
    targetTypes: mod.targetTypes || [],
    isAvailable: { tested: false, passed: false, duration: 0 }
  };

  // Test 1: isAvailable
  log(`  🔍 Testing ${mod.name}...`, 'cyan');
  result.isAvailable = await testIsAvailable(mod);
  
  if (result.isAvailable.passed) {
    log(`     ✅ Available (${result.isAvailable.duration}ms)`, 'green');
    
    // Test 2: Execution (si isAvailable passe)
    result.execution = await testExecution(mod);
    if (result.execution.passed) {
      log(`     ✅ Execution OK - ${result.execution.entitiesFound} entities`, 'green');
    } else {
      log(`     ❌ Execution failed: ${result.execution.error}`, 'red');
    }
  } else {
    log(`     ❌ Not available: ${result.isAvailable.error}`, 'yellow');
  }

  return result;
}

// Générer rapport par catégorie
function generateCategoryReport(results: ModuleTestResult[]) {
  const byCategory: DiagnosticReport['byCategory'] = {};
  
  for (const result of results) {
    const cat = result.category;
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, available: 0, working: 0, failed: 0 };
    }
    
    byCategory[cat].total++;
    if (result.isAvailable.passed) {
      byCategory[cat].available++;
      if (result.execution?.passed) {
        byCategory[cat].working++;
      } else {
        byCategory[cat].failed++;
      }
    }
  }
  
  return byCategory;
}

// Main
async function main() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'bold');
  log('║     🔍 DIAGNOSTIC COMPLET - TOUS LES MODULES OSINT            ║', 'bold');
  log('║     Test individuel de chaque module (172+)                    ║', 'bold');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'bold');

  log(`📊 Total modules dans le catalogue: ${allModules.length}`, 'blue');
  log(`⏱️  Timeouts: isAvailable=${CONFIG.timeouts.isAvailable}ms, execution=${CONFIG.timeouts.execution}ms\n`, 'blue');

  // Résultats
  const results: ModuleTestResult[] = [];
  let availableCount = 0;
  let executionCount = 0;

  // Tester chaque module
  for (let i = 0; i < allModules.length; i++) {
    const mod = allModules[i];
    log(`\n[${i + 1}/${allModules.length}]`, 'cyan');
    
    const result = await testModule(mod);
    results.push(result);
    
    if (result.isAvailable.passed) availableCount++;
    if (result.execution?.passed) executionCount++;
  }

  // Générer rapport
  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    totalModules: allModules.length,
    testedModules: results.length,
    availablePassed: results.filter(r => r.isAvailable.passed).length,
    availableFailed: results.filter(r => !r.isAvailable.passed && r.isAvailable.tested).length,
    executionPassed: results.filter(r => r.execution?.passed).length,
    executionFailed: results.filter(r => r.execution?.tested && !r.execution?.passed).length,
    notTested: results.filter(r => !r.isAvailable.tested).length,
    results,
    byCategory: generateCategoryReport(results)
  };

  // Afficher rapport
  log('\n\n╔════════════════════════════════════════════════════════════════╗', 'bold');
  log('║                    📊 RAPPORT FINAL                            ║', 'bold');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'bold');

  log(`📈 STATISTIQUES GLOBALES:`, 'bold');
  log(`   Total modules: ${report.totalModules}`, 'blue');
  log(`   Modules testés: ${report.testedModules}`, 'blue');
  log(`   ✅ Available: ${report.availablePassed}`, 'green');
  log(`   ❌ Not available: ${report.availableFailed}`, 'yellow');
  log(`   ✅ Working (execution): ${report.executionPassed}`, 'green');
  log(`   ❌ Execution failed: ${report.executionFailed}`, 'red');
  
  const workingPercent = Math.round((report.executionPassed / report.totalModules) * 100);
  log(`\n🎯 Taux de réussite: ${workingPercent}%`, workingPercent > 70 ? 'green' : workingPercent > 40 ? 'yellow' : 'red');

  // Par catégorie
  log(`\n📂 PAR CATÉGORIE:`, 'bold');
  for (const [cat, stats] of Object.entries(report.byCategory)) {
    const percent = Math.round((stats.working / stats.total) * 100);
    const color = percent > 70 ? 'green' : percent > 40 ? 'yellow' : 'red';
    log(`   ${cat}: ${stats.working}/${stats.total} working (${percent}%)`, color);
  }

  // Liste des modules défaillants
  const failedModules = results.filter(r => 
    r.isAvailable.passed && !r.execution?.passed
  );
  
  if (failedModules.length > 0) {
    log(`\n🔧 MODULES À RÉPARER (${failedModules.length}):`, 'red');
    for (const mod of failedModules) {
      log(`   ❌ ${mod.name} (${mod.moduleId}): ${mod.execution?.error}`, 'red');
    }
  }

  // Sauvegarder rapport
  const fs = await import('fs');
  const reportPath = `./diagnostic-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n💾 Rapport sauvegardé: ${reportPath}`, 'cyan');

  log('\n✅ Diagnostic terminé!\n', 'green');
}

main().catch(console.error);
