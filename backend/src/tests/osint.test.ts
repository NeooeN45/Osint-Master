// ============================================================================
// OSINT Engine Unit Tests
// Tests all modules individually and in correlation mode
// ============================================================================

import { osintEngine, ToolResult } from "../services/osintEngine";
import { logger } from "../utils/logger";

interface TestResult {
  tool: string;
  status: "passed" | "failed" | "skipped";
  target: string;
  success: boolean;
  realExecution: boolean;
  entitiesFound: number;
  duration: number;
  error?: string;
}

// Test targets
const TEST_TARGETS = {
  username: "testuser123",
  email: "test@gmail.com",
  domain: "example.com",
  ip: "8.8.8.8",
  phone: "+33612345678"
};

// Test each category of tools
async function testUsernameTools(): Promise<TestResult[]> {
  logger.info("[TEST] Testing username OSINT tools...");
  const tools = ["sherlock", "maigret", "socialscan", "blackbird", "whatsmyname"];
  const results: TestResult[] = [];
  
  for (const toolId of tools) {
    try {
      const result = await osintEngine.executeTool(toolId, TEST_TARGETS.username);
      results.push({
        tool: toolId,
        status: result.success ? "passed" : "failed",
        target: TEST_TARGETS.username,
        success: result.success,
        realExecution: result.realExecution,
        entitiesFound: result.entities?.length || 0,
        duration: result.duration
      });
    } catch (error) {
      results.push({
        tool: toolId,
        status: "failed",
        target: TEST_TARGETS.username,
        success: false,
        realExecution: false,
        entitiesFound: 0,
        duration: 0,
        error: String(error)
      });
    }
  }
  
  return results;
}

async function testEmailTools(): Promise<TestResult[]> {
  logger.info("[TEST] Testing email OSINT tools...");
  const tools = ["holehe", "h8mail", "ghunt", "emailrep"];
  const results: TestResult[] = [];
  
  for (const toolId of tools) {
    try {
      const result = await osintEngine.executeTool(toolId, TEST_TARGETS.email);
      results.push({
        tool: toolId,
        status: result.success ? "passed" : "failed",
        target: TEST_TARGETS.email,
        success: result.success,
        realExecution: result.realExecution,
        entitiesFound: result.entities?.length || 0,
        duration: result.duration
      });
    } catch (error) {
      results.push({
        tool: toolId,
        status: "failed",
        target: TEST_TARGETS.email,
        success: false,
        realExecution: false,
        entitiesFound: 0,
        duration: 0,
        error: String(error)
      });
    }
  }
  
  return results;
}

async function testDomainTools(): Promise<TestResult[]> {
  logger.info("[TEST] Testing domain OSINT tools...");
  const tools = ["subfinder", "assetfinder", "findomain", "theharvester", "dnsrecon"];
  const results: TestResult[] = [];
  
  for (const toolId of tools) {
    try {
      const result = await osintEngine.executeTool(toolId, TEST_TARGETS.domain);
      results.push({
        tool: toolId,
        status: result.success ? "passed" : "failed",
        target: TEST_TARGETS.domain,
        success: result.success,
        realExecution: result.realExecution,
        entitiesFound: result.entities?.length || 0,
        duration: result.duration
      });
    } catch (error) {
      results.push({
        tool: toolId,
        status: "failed",
        target: TEST_TARGETS.domain,
        success: false,
        realExecution: false,
        entitiesFound: 0,
        duration: 0,
        error: String(error)
      });
    }
  }
  
  return results;
}

async function testIPTools(): Promise<TestResult[]> {
  logger.info("[TEST] Testing IP OSINT tools...");
  const tools = ["shodan_cli", "ipinfo", "censys", "whois"];
  const results: TestResult[] = [];
  
  for (const toolId of tools) {
    try {
      const result = await osintEngine.executeTool(toolId, TEST_TARGETS.ip);
      results.push({
        tool: toolId,
        status: result.success ? "passed" : "failed",
        target: TEST_TARGETS.ip,
        success: result.success,
        realExecution: result.realExecution,
        entitiesFound: result.entities?.length || 0,
        duration: result.duration
      });
    } catch (error) {
      results.push({
        tool: toolId,
        status: "failed",
        target: TEST_TARGETS.ip,
        success: false,
        realExecution: false,
        entitiesFound: 0,
        duration: 0,
        error: String(error)
      });
    }
  }
  
  return results;
}

async function testPhoneTools(): Promise<TestResult[]> {
  logger.info("[TEST] Testing phone OSINT tools...");
  const tools = ["phoneinfoga"];
  const results: TestResult[] = [];
  
  for (const toolId of tools) {
    try {
      const result = await osintEngine.executeTool(toolId, TEST_TARGETS.phone);
      results.push({
        tool: toolId,
        status: result.success ? "passed" : "failed",
        target: TEST_TARGETS.phone,
        success: result.success,
        realExecution: result.realExecution,
        entitiesFound: result.entities?.length || 0,
        duration: result.duration
      });
    } catch (error) {
      results.push({
        tool: toolId,
        status: "failed",
        target: TEST_TARGETS.phone,
        success: false,
        realExecution: false,
        entitiesFound: 0,
        duration: 0,
        error: String(error)
      });
    }
  }
  
  return results;
}

// Test cascade enrichment
async function testCascadeEnrichment(): Promise<TestResult> {
  logger.info("[TEST] Testing cascade enrichment...");
  
  try {
    // Start with an email
    const entity = {
      type: "email" as const,
      value: TEST_TARGETS.email,
      source: "test",
      confidence: 90,
      context: "Test entity for cascade"
    };
    
    const startTime = Date.now();
    const results = await osintEngine.executeCascade(entity, 0, 2);
    const duration = Date.now() - startTime;
    
    const totalEntities = results.reduce((sum, r) => sum + (r.entities?.length || 0), 0);
    
    return {
      tool: "cascade_enrichment",
      status: results.length > 0 ? "passed" : "failed",
      target: TEST_TARGETS.email,
      success: results.length > 0,
      realExecution: true,
      entitiesFound: totalEntities,
      duration
    };
  } catch (error) {
    return {
      tool: "cascade_enrichment",
      status: "failed",
      target: TEST_TARGETS.email,
      success: false,
      realExecution: false,
      entitiesFound: 0,
      duration: 0,
      error: String(error)
    };
  }
}

// Run all tests
export async function runAllTests(): Promise<{
  summary: {
    total: number;
    passed: number;
    failed: number;
    realExecution: number;
    simulated: number;
  };
  results: TestResult[];
}> {
  logger.info("[TEST] Starting comprehensive OSINT module tests...");
  
  const allResults: TestResult[] = [];
  
  // Test each category
  allResults.push(...await testUsernameTools());
  allResults.push(...await testEmailTools());
  allResults.push(...await testDomainTools());
  allResults.push(...await testIPTools());
  allResults.push(...await testPhoneTools());
  allResults.push(await testCascadeEnrichment());
  
  const summary = {
    total: allResults.length,
    passed: allResults.filter(r => r.status === "passed").length,
    failed: allResults.filter(r => r.status === "failed").length,
    realExecution: allResults.filter(r => r.realExecution).length,
    simulated: allResults.filter(r => !r.realExecution).length
  };
  
  logger.info("[TEST] Test complete:", summary);
  
  return { summary, results: allResults };
}

// Export for use
export { TestResult };
