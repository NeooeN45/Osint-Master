#!/usr/bin/env tsx
// =============================================================================
// OSINT MASTER PRO - COMPLETE TEST SUITE
// Batterie de tests complète - Mode Pro Max
// =============================================================================

import axios from 'axios';
import { performance } from 'perf_hooks';

const API_BASE = process.env.API_BASE || 'http://localhost:3002/api';
const TEST_USERNAME = process.env.TEST_USERNAME || 'camille_perraudeau';
const TEST_EMAIL = process.env.TEST_EMAIL || 'hydrogene.bonde@gmail.com';
const TEST_PHONE = process.env.TEST_PHONE || '+33769723999';
const TEST_IP = process.env.TEST_IP || '5.49.134.36';

// Test Results
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

// Test Runner
async function runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
  const start = performance.now();
  try {
    const data = await testFn();
    const duration = Math.round(performance.now() - start);
    return { name, status: 'PASS', duration, data };
  } catch (error: any) {
    const duration = Math.round(performance.now() - start);
    return { name, status: 'FAIL', duration, error: error.message };
  }
}

// Tests
async function testHealth() {
  const response = await axios.get(`${API_BASE.replace('/api', '')}/health`);
  if (response.data.status !== 'ok') throw new Error('Health check failed');
  return response.data;
}

async function testOSINTStatus() {
  const response = await axios.get(`${API_BASE}/osint/status`);
  if (!response.data.total) throw new Error('Invalid OSINT status');
  return response.data;
}

async function testModules() {
  const response = await axios.get(`${API_BASE}/modules`);
  // API returns { count, modules } or array directly
  const modules = response.data.modules || response.data;
  if (!Array.isArray(modules)) throw new Error('Invalid modules response');
  return { count: modules.length, modules };
}

async function testDebugStats() {
  const response = await axios.get(`${API_BASE}/debug/stats`);
  return response.data;
}

async function testUsernameInvestigation() {
  const response = await axios.post(`${API_BASE}/deep-v2/investigate`, {
    target: TEST_USERNAME,
    targetType: 'username',
    config: { quick: true, timeout: 5000 }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });
  if (!response.data) throw new Error('Empty response');
  return response.data;
}

async function testEmailInvestigation() {
  const response = await axios.post(`${API_BASE}/deep-v2/investigate`, {
    target: TEST_EMAIL,
    targetType: 'email',
    config: { quick: true, timeout: 5000 }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });
  if (!response.data) throw new Error('Empty response');
  return response.data;
}

async function testPhoneInvestigation() {
  const response = await axios.post(`${API_BASE}/deep-v2/investigate`, {
    target: TEST_PHONE,
    targetType: 'phone',
    config: { quick: true, timeout: 5000 }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });
  if (!response.data) throw new Error('Empty response');
  return response.data;
}

async function testIPInvestigation() {
  const response = await axios.post(`${API_BASE}/deep-v2/investigate`, {
    target: TEST_IP,
    targetType: 'ip',
    config: { quick: true, timeout: 5000 }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });
  if (!response.data) throw new Error('Empty response');
  return response.data;
}

async function testConfig() {
  const response = await axios.get(`${API_BASE}/config`);
  return response.data;
}

async function testDorks() {
  const response = await axios.get(`${API_BASE}/dorks`);
  return response.data;
}

async function testTools() {
  const response = await axios.get(`${API_BASE}/tools`);
  return response.data;
}

async function testPremium() {
  const response = await axios.get(`${API_BASE}/premium/status`);
  return response.data;
}

async function testIntelligence() {
  const response = await axios.get(`${API_BASE}/intelligence/status`);
  return response.data;
}

// Main
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║      OSINT MASTER PRO - COMPLETE TEST SUITE v4.0                 ║');
  console.log('║      Mode: PRO MAX                                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`🔧 Configuration:`);
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   Test User: ${TEST_USERNAME}`);
  console.log(`   Test Email: ${TEST_EMAIL}`);
  console.log(`   Test Phone: ${TEST_PHONE}`);
  console.log(`   Test IP: ${TEST_IP}\n`);

  console.log('⏳ Running tests...\n');

  // System Tests
  results.push(await runTest('Health Check', testHealth));
  results.push(await runTest('OSINT Status', testOSINTStatus));
  results.push(await runTest('Modules List', testModules));
  results.push(await runTest('Debug Stats', testDebugStats));
  results.push(await runTest('Config', testConfig));
  results.push(await runTest('Dorks', testDorks));
  results.push(await runTest('Tools', testTools));
  results.push(await runTest('Premium Status', testPremium));
  results.push(await runTest('Intelligence Status', testIntelligence));

  // Investigation Tests (with timeout)
  console.log('   🔍 Investigation tests (may take 30-60s)...\n');
  
  results.push(await runTest('Username Investigation', testUsernameInvestigation));
  results.push(await runTest('Email Investigation', testEmailInvestigation));
  results.push(await runTest('Phone Investigation', testPhoneInvestigation));
  results.push(await runTest('IP Investigation', testIPInvestigation));

  // Report
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST RESULTS                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    
    console.log(`${icon} ${color}${result.name}${reset} (${result.duration}ms)`);
    
    if (result.status === 'FAIL') {
      console.log(`   Error: ${result.error}`);
      failed++;
    } else {
      passed++;
    }
  }

  console.log('\n' + '═'.repeat(68));
  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${results.length} total`);
  
  const successRate = Math.round((passed / results.length) * 100);
  console.log(`📈 Success Rate: ${successRate}%`);

  if (failed === 0) {
    console.log('\n✨ ALL TESTS PASSED! System is fully operational.\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review errors above.\n`);
    process.exit(1);
  }
}

main().catch(console.error);
