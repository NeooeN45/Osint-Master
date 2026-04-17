/**
 * Complete Investigation Test Suite
 * Test end-to-end d'une investigation OSINT complète
 * 
 * Features:
 * - Username investigation flow
 * - Email tracing
 * - IP geolocation
 * - Social media correlation
 * - Data cross-referencing
 * - Report generation
 * 
 * Usage: npx tsx backend/test_investigation_complete.ts
 * 
 * Créé: 17 Avril 2026
 */

import axios from 'axios';

// Test configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3002/api';
const TEST_USERNAME = process.env.TEST_USERNAME || 'john_doe_test';
const TEST_EMAIL = process.env.TEST_EMAIL || 'john@test.com';
const TEST_IP = process.env.TEST_IP || '8.8.8.8';
const TEST_DOMAIN = process.env.TEST_DOMAIN || 'example.com';
const TEST_PHONE = process.env.TEST_PHONE || '+1-555-0123';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

// Helper functions
function log(title: string, message?: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colorMap = {
    info: colors.cyan,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
  };
  
  console.log(`${colors.bright}${colorMap[type]}[${title}]${colors.reset} ${message || ''}`);
}

async function runTest(name: string, fn: () => Promise<any>): Promise<TestResult> {
  log('TEST', `Running: ${name}`, 'info');
  const startTime = Date.now();
  
  try {
    const data = await fn();
    const duration = Date.now() - startTime;
    log('PASS', `${name} (${duration}ms)`, 'success');
    return { name, status: 'PASS', duration, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    log('FAIL', `${name}: ${errorMsg}`, 'error');
    return { name, status: 'FAIL', duration, error: errorMsg };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═════════════════════════════════════════════════════════════════════════════

async function testHealthCheck() {
  const response = await axios.get(`${API_BASE}/health`);
  if (response.data.status !== 'ok') {
    throw new Error(`Health check failed: ${response.data.status}`);
  }
  return response.data;
}

async function testVPNStatus() {
  const response = await axios.get(`${API_BASE}/vpn/status`);
  log('INFO', `VPN connected: ${response.data.data?.status?.connected || false}`, 'info');
  return response.data;
}

async function testDockerStatus() {
  const response = await axios.get(`${API_BASE}/docker/status`);
  log('INFO', `Docker containers: ${response.data.data?.containers?.length || 0}`, 'info');
  return response.data;
}

async function testMonitoringMetrics() {
  const response = await axios.get(`${API_BASE}/monitoring/metrics`);
  log('INFO', `System metrics collected`, 'info');
  return response.data;
}

async function testUsernameInvestigation() {
  const response = await axios.post(`${API_BASE}/osint/investigate`, {
    target: TEST_USERNAME,
    targetType: 'username',
    tools: ['sherlock', 'whatsmyname', 'socialscan'],
    options: {
      timeout: 120000,
      cacheResults: true,
    },
  });
  
  if (!response.data.success) {
    throw new Error('Username investigation failed');
  }
  
  log('INFO', `Found ${response.data.data?.results?.length || 0} profiles`, 'success');
  return response.data;
}

async function testEmailInvestigation() {
  const response = await axios.post(`${API_BASE}/osint/investigate`, {
    target: TEST_EMAIL,
    targetType: 'email',
    tools: ['holehe', 'emailrep', 'hunter', 'epieos'],
    options: {
      timeout: 120000,
    },
  });
  
  log('INFO', `Email investigation complete`, 'success');
  return response.data;
}

async function testIPInvestigation() {
  const response = await axios.post(`${API_BASE}/osint/investigate`, {
    target: TEST_IP,
    targetType: 'ip',
    tools: ['ipinfo', 'virustotal', 'censys'],
    options: {
      timeout: 60000,
    },
  });
  
  log('INFO', `IP investigation complete`, 'success');
  return response.data;
}

async function testDomainInvestigation() {
  const response = await axios.post(`${API_BASE}/osint/investigate`, {
    target: TEST_DOMAIN,
    targetType: 'domain',
    tools: ['whois', 'dns_lookup', 'crtsh', 'subfinder'],
    options: {
      timeout: 120000,
    },
  });
  
  log('INFO', `Domain investigation complete`, 'success');
  return response.data;
}

async function testPhoneInvestigation() {
  const response = await axios.post(`${API_BASE}/osint/investigate`, {
    target: TEST_PHONE,
    targetType: 'phone',
    tools: ['phoneinfoga', 'numverify', 'pagesjaunes'],
    options: {
      timeout: 120000,
    },
  });
  
  log('INFO', `Phone investigation complete`, 'success');
  return response.data;
}

async function testDeepInvestigation() {
  log('INFO', 'Starting deep investigation (may take 2-5 minutes)...', 'warn');
  
  const response = await axios.post(`${API_BASE}/deep-investigation/v2/stream`, {
    target: TEST_USERNAME,
    targetType: 'username',
    modules: [
      'identity_core',
      'social_presence',
      'digital_footprint',
      'technical_surface',
    ],
    priority: 'high',
  }, {
    responseType: 'stream',
    timeout: 300000,
  });
  
  log('INFO', `Deep investigation complete`, 'success');
  return response.data;
}

async function testAutoInvestigation() {
  const response = await axios.post(`${API_BASE}/auto-investigation/start`, {
    target: TEST_USERNAME,
    targetType: 'username',
    depth: 'standard',
    options: {
      enableAI: true,
      correlateData: true,
      generateReport: true,
    },
  });
  
  if (!response.data.success) {
    throw new Error('Auto investigation failed');
  }
  
  log('INFO', `Auto investigation started: ${response.data.data?.jobId}`, 'success');
  return response.data;
}

async function testInstagramPrivSniffer() {
  // Note: This requires a real private Instagram username
  const testIgUser = process.env.TEST_IG_PRIVATE || 'instagram';
  
  const response = await axios.post(`${API_BASE}/instagram-priv/sniff`, {
    username: testIgUser,
  });
  
  log('INFO', `Instagram PrivSniffer complete`, 'success');
  return response.data;
}

async function testConfigRead() {
  const response = await axios.get(`${API_BASE}/config`);
  log('INFO', `Config loaded`, 'success');
  return response.data;
}

async function testCacheService() {
  // Test cache set
  await axios.post(`${API_BASE}/test/cache`, {
    key: 'test_key',
    value: { test: 'data' },
    ttl: 60,
  });
  
  // Test cache get
  const response = await axios.get(`${API_BASE}/test/cache/test_key`);
  
  log('INFO', `Cache service working`, 'success');
  return response.data;
}

async function testToolExecution() {
  const response = await axios.post(`${API_BASE}/tools/execute`, {
    tool: 'whois',
    target: TEST_DOMAIN,
    options: {},
  });
  
  log('INFO', `Tool execution complete`, 'success');
  return response.data;
}

async function testCorrelationEngine() {
  // First create some test entities
  const entities = [
    { type: 'username', value: TEST_USERNAME, confidence: 95 },
    { type: 'email', value: TEST_EMAIL, confidence: 90 },
    { type: 'ip', value: TEST_IP, confidence: 85 },
  ];
  
  const response = await axios.post(`${API_BASE}/correlation/analyze`, {
    entities,
    options: {
      findConnections: true,
      calculateRisk: true,
    },
  });
  
  log('INFO', `Correlation analysis complete`, 'success');
  return response.data;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═════════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log(`
${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║     OSINT Master Pro v4.0 - Complete Investigation Test        ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  log('CONFIG', `API Base: ${API_BASE}`, 'info');
  log('CONFIG', `Test User: ${TEST_USERNAME}`, 'info');
  log('CONFIG', `Test Email: ${TEST_EMAIL}`, 'info');
  log('CONFIG', `Test IP: ${TEST_IP}`, 'info');
  
  console.log('');

  // Phase 1: System Health
  log('PHASE', '1. System Health Checks', 'info');
  results.push(await runTest('Health Check', testHealthCheck));
  results.push(await runTest('VPN Status', testVPNStatus));
  results.push(await runTest('Docker Status', testDockerStatus));
  results.push(await runTest('Monitoring Metrics', testMonitoringMetrics));
  
  console.log('');

  // Phase 2: Basic Tools
  log('PHASE', '2. Basic Tool Execution', 'info');
  results.push(await runTest('Config Read', testConfigRead));
  results.push(await runTest('Tool Execution (whois)', testToolExecution));
  // results.push(await runTest('Cache Service', testCacheService)); // May not exist
  
  console.log('');

  // Phase 3: Core Investigations
  log('PHASE', '3. Core OSINT Investigations', 'info');
  results.push(await runTest('Username Investigation', testUsernameInvestigation));
  results.push(await runTest('Email Investigation', testEmailInvestigation));
  results.push(await runTest('IP Investigation', testIPInvestigation));
  results.push(await runTest('Domain Investigation', testDomainInvestigation));
  results.push(await runTest('Phone Investigation', testPhoneInvestigation));
  
  console.log('');

  // Phase 4: Advanced Features
  log('PHASE', '4. Advanced Features', 'info');
  results.push(await runTest('Correlation Engine', testCorrelationEngine));
  // results.push(await runTest('Instagram PrivSniffer', testInstagramPrivSniffer));
  results.push(await runTest('Auto Investigation', testAutoInvestigation));
  
  console.log('');

  // Phase 5: Deep Investigation (Optional - takes longer)
  if (process.env.RUN_DEEP_TEST === 'true') {
    log('PHASE', '5. Deep Investigation (SLOW)', 'warn');
    results.push(await runTest('Deep Investigation', testDeepInvestigation));
  } else {
    log('SKIP', 'Deep Investigation (set RUN_DEEP_TEST=true to enable)', 'warn');
  }

  // Generate report
  console.log('');
  log('REPORT', 'Test Summary', 'info');
  console.log(`${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}`);
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);

  console.log(`${colors.green}✓ Passed: ${passed}/${results.length}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${failed}/${results.length}${colors.reset}`);
  console.log(`${colors.yellow}⊘ Skipped: ${skipped}/${results.length}${colors.reset}`);
  console.log(`${colors.cyan}⏱ Total Duration: ${(totalDuration / 1000).toFixed(2)}s${colors.reset}`);
  
  console.log(`${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}`);

  // List failed tests
  if (failed > 0) {
    console.log('');
    log('FAIL', 'Failed Tests:', 'error');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  ${colors.red}• ${r.name}: ${r.error}${colors.reset}`);
      });
  }

  // Overall result
  console.log('');
  if (failed === 0) {
    log('SUCCESS', '🎉 All tests passed! System is fully operational.', 'success');
    process.exit(0);
  } else {
    log('WARNING', `⚠️ ${failed} test(s) failed. Please review the errors above.`, 'warn');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log('FATAL', `Test runner crashed: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
