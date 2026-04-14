// ============================================================================
// Quick OSINT Tools Test - Runs essential tests quickly
// ============================================================================

import { osintEngine } from "../services/osintEngine";
import { logger } from "../utils/logger";

interface QuickTestResult {
  category: string;
  tool: string;
  target: string;
  success: boolean;
  realExecution: boolean;
  duration: number;
  findings: number;
}

export async function runQuickTests(): Promise<{
  summary: {
    total: number;
    passed: number;
    failed: number;
    realExecutionRate: string;
    avgDuration: number;
  };
  results: QuickTestResult[];
}> {
  logger.info("[QUICK-TEST] Starting essential OSINT tools tests...");
  
  const tests: { category: string; tool: string; target: string }[] = [
    { category: "Username", tool: "sherlock", target: "testuser123" },
    { category: "Username", tool: "maigret", target: "testuser123" },
    { category: "Email", tool: "holehe", target: "test@gmail.com" },
    { category: "Email", tool: "h8mail", target: "test@gmail.com" },
    { category: "Domain", tool: "subfinder", target: "google.com" },
    { category: "Domain", tool: "dnsrecon", target: "google.com" },
    { category: "IP", tool: "ipinfo", target: "8.8.8.8" },
    { category: "IP", tool: "censys", target: "8.8.8.8" },
    { category: "Social", tool: "osintgram", target: "testuser123" },
    { category: "Breach", tool: "breach-parse", target: "test@gmail.com" },
  ];
  
  const results: QuickTestResult[] = [];
  
  for (const test of tests) {
    try {
      logger.info(`[QUICK-TEST] Testing ${test.tool} (${test.category})...`);
      const result = await osintEngine.executeTool(test.tool, test.target);
      
      results.push({
        category: test.category,
        tool: test.tool,
        target: test.target,
        success: result.success,
        realExecution: result.realExecution,
        duration: result.duration,
        findings: result.entities?.length || result.parsed?.found || 0
      });
      
      logger.info(`[QUICK-TEST] ${test.tool}: ${result.success ? '✅' : '❌'} (${result.duration}ms)`);
    } catch (error) {
      logger.error(`[QUICK-TEST] ${test.tool} failed:`, error);
      results.push({
        category: test.category,
        tool: test.tool,
        target: test.target,
        success: false,
        realExecution: false,
        duration: 0,
        findings: 0
      });
    }
  }
  
  const passed = results.filter(r => r.success).length;
  const realExecuted = results.filter(r => r.realExecution).length;
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);
  
  const summary = {
    total: results.length,
    passed,
    failed: results.length - passed,
    realExecutionRate: `${Math.round((realExecuted / results.length) * 100)}%`,
    avgDuration
  };
  
  logger.info("[QUICK-TEST] Complete:", summary);
  
  return { summary, results };
}

// Run if called directly
if (require.main === module) {
  runQuickTests().then(({ summary, results }) => {
    console.log("\n========================================");
    console.log("QUICK TEST RESULTS");
    console.log("========================================");
    console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
    console.log(`Real Execution: ${summary.realExecutionRate} | Avg Duration: ${summary.avgDuration}ms`);
    console.log("\nDetails:");
    results.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      const exec = r.realExecution ? 'REAL' : 'SIM';
      console.log(`${icon} [${r.category}] ${r.tool}: ${r.findings} findings (${exec}, ${r.duration}ms)`);
    });
    console.log("========================================\n");
    process.exit(summary.failed > 0 ? 1 : 0);
  });
}
