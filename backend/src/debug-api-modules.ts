// ============================================================================
// DEBUG API MODULES - Test failing API modules individually
// ============================================================================

import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface TestResult {
  module: string;
  success: boolean;
  error?: string;
  data?: any;
  entities?: number;
  duration: number;
}

async function testModule(name: string, testFn: () => Promise<any>): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await testFn();
    return {
      module: name,
      success: true,
      data: result?.data,
      entities: result?.entities?.length || 0,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      module: name,
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

async function debugModules() {
  console.log("\n" + "█".repeat(80));
  console.log("🔧 DEBUGGING API MODULES - One by One");
  console.log("█".repeat(80) + "\n");

  const results: TestResult[] = [];

  // 1. EmailRep.io
  results.push(await testModule("EmailRep.io", async () => {
    const testEmail = "test@gmail.com";
    const resp = await axios.get(`https://emailrep.io/${testEmail}`, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    return { data: resp.data, entities: resp.data ? 1 : 0 };
  }));

  // 2. WHOIS
  results.push(await testModule("WHOIS", async () => {
    const { stdout } = await execAsync('whois example.com');
    return { data: { raw: stdout.slice(0, 500) }, entities: stdout ? 1 : 0 };
  }));

  // 3. GitHub Search API (no key)
  results.push(await testModule("GitHub Search", async () => {
    const resp = await axios.get('https://api.github.com/search/users?q=octocat', {
      timeout: 10000,
      headers: { "Accept": "application/vnd.github.v3+json" },
    });
    return { data: resp.data, entities: resp.data?.items?.length || 0 };
  }));

  // 4. Gravatar
  results.push(await testModule("Gravatar", async () => {
    const crypto = await import("crypto");
    const email = "test@example.com";
    const hash = crypto.createHash("md5").update(email.toLowerCase().trim()).digest("hex");
    const resp = await axios.get(`https://en.gravatar.com/${hash}.json`, {
      timeout: 10000,
      validateStatus: () => true,
    });
    return { data: resp.data, entities: resp.status === 200 ? 1 : 0 };
  }));

  // 5. crt.sh
  results.push(await testModule("crt.sh", async () => {
    const resp = await axios.get('https://crt.sh/?q=example.com&output=json', {
      timeout: 15000,
    });
    return { data: resp.data, entities: Array.isArray(resp.data) ? resp.data.length : 0 };
  }));

  // 6. Wayback Machine
  results.push(await testModule("Wayback Machine", async () => {
    const resp = await axios.get('https://web.archive.org/cdx/search/cdx?url=example.com&output=json&limit=5', {
      timeout: 15000,
    });
    return { data: resp.data, entities: Array.isArray(resp.data) ? resp.data.length - 1 : 0 }; // First row is header
  }));

  // 7. NumVerify (if key available)
  if (process.env.NUMVERIFY_API_KEY) {
    results.push(await testModule("NumVerify", async () => {
      const resp = await axios.get(`http://apilayer.net/api/validate?access_key=${process.env.NUMVERIFY_API_KEY}&number=+33612345678`, {
        timeout: 10000,
      });
      return { data: resp.data, entities: resp.data?.valid ? 1 : 0 };
    }));
  } else {
    results.push({ module: "NumVerify", success: false, error: "No API key", duration: 0 });
  }

  // 8. PagesJaunes scraping
  results.push(await testModule("PagesJaunes", async () => {
    const resp = await axios.get('https://www.pagesjaunes.fr/recherche/pres-de-moi', {
      timeout: 10000,
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9"
      },
      validateStatus: () => true,
    });
    // Check if we got blocked
    if (resp.data.includes("captcha") || resp.data.includes("robot")) {
      throw new Error("Blocked by CAPTCHA");
    }
    return { data: { status: resp.status, length: resp.data.length }, entities: 0 };
  }));

  // 9. Annuaires FR
  results.push(await testModule("Annuaires FR", async () => {
    const resp = await axios.get('https://www.annuaire.com/', {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: () => true,
    });
    return { data: { status: resp.status }, entities: 0 };
  }));

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESULTS SUMMARY");
  console.log("=".repeat(80));

  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Working: ${working.length}/${results.length}`);
  for (const r of working) {
    console.log(`   ✓ ${r.module} (${r.duration}ms, ${r.entities} entities)`);
  }

  console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
  for (const r of failed) {
    console.log(`   ✗ ${r.module}: ${r.error}`);
  }

  console.log("\n" + "█".repeat(80) + "\n");
  return results;
}

debugModules().then(results => {
  process.exit(results.every(r => r.success) ? 0 : 0); // Don't fail, just report
});
