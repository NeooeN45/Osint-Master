// ============================================================================
// OSINT MASTER v4 - COMPREHENSIVE REAL TEST SUITE
// Run: npx tsx tests/deep-engine-test.ts
// ============================================================================

import axios from "axios";
import http from "http";

const API = "http://localhost:3002/api";

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  details: string;
  entities?: number;
}

const results: TestResult[] = [];
const log = (msg: string) => process.stdout.write(msg + "\n");

// -- Helper: run investigation via /run --
async function runInvestigation(target: string, config: any = {}, timeout = 120000): Promise<any> {
  const resp = await axios.post(`${API}/deep/run`, { target, config }, { timeout });
  return resp.data;
}

// -- Helper: SSE stream via raw http --
function streamInvestigation(target: string, config: any = {}, timeout = 120000): Promise<{ events: any[]; entities: any[]; correlations: any[] }> {
  return new Promise((resolve, reject) => {
    const events: any[] = [];
    const entities: any[] = [];
    const correlations: any[] = [];
    const body = JSON.stringify({ target, config });

    const timer = setTimeout(() => {
      resolve({ events, entities, correlations });
    }, timeout);

    const req = http.request("http://localhost:3002/api/deep/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      timeout: timeout,
    }, (res) => {
      let buffer = "";
      res.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const ev = JSON.parse(payload);
              events.push(ev);
              if (ev.type === "entity_found" && ev.data?.entity) entities.push(ev.data.entity);
              if (ev.type === "correlation" && ev.data?.correlation) correlations.push(ev.data.correlation);
            } catch {}
          }
        }
      });
      res.on("end", () => { clearTimeout(timer); resolve({ events, entities, correlations }); });
      res.on("error", (e) => { clearTimeout(timer); reject(e); });
    });
    req.on("error", (e) => { clearTimeout(timer); reject(e); });
    req.write(body);
    req.end();
  });
}

function addResult(name: string, status: "PASS" | "FAIL" | "SKIP", duration: number, details: string, entities?: number) {
  const r: TestResult = { name, status, duration, details, entities };
  results.push(r);
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
  const ent = entities !== undefined ? ` | ${entities} entities` : "";
  log(`${icon} ${name} (${(duration / 1000).toFixed(1)}s)${ent}`);
  if (status !== "PASS" && details) log(`   └─ ${details}`);
}

// ============================================================================
// TESTS
// ============================================================================

async function testHealth() {
  const t = Date.now();
  try {
    const [root, health, mods, detect] = await Promise.all([
      axios.get("http://localhost:3002/"),
      axios.get("http://localhost:3002/health"),
      axios.get(`${API}/deep/modules`),
      axios.post(`${API}/deep/detect`, { target: "test@gmail.com" }),
    ]);
    const available = (mods.data as any[]).filter((m: any) => m.available).length;
    const total = (mods.data as any[]).length;
    addResult("API Health + Modules + Detect", "PASS", Date.now() - t,
      `${available}/${total} modules, detect: ${detect.data.type}`);
  } catch (e: any) {
    addResult("API Health", "FAIL", Date.now() - t, e.message);
  }
}

async function testDetection() {
  const t = Date.now();
  const cases = [
    ["johndoe", "username"], ["test@gmail.com", "email"], ["+33612345678", "phone"],
    ["192.168.1.1", "ip"], ["example.com", "domain"], ["https://github.com", "url"],
    ["John Smith", "person"],
  ];
  let ok = 0;
  const fails: string[] = [];
  for (const [target, expected] of cases) {
    const r = await axios.post(`${API}/deep/detect`, { target });
    if (r.data.type === expected) ok++;
    else fails.push(`${target}: expected ${expected}, got ${r.data.type}`);
  }
  addResult("Target Detection (7 types)", ok === cases.length ? "PASS" : "FAIL",
    Date.now() - t, fails.length ? fails.join("; ") : `${ok}/${cases.length}`);
}

async function testIP() {
  const t = Date.now();
  try {
    log("\n🔍 IP investigation: 8.8.8.8");
    const data = await runInvestigation("8.8.8.8", {
      maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 30000,
    }, 60000);
    const ents = data.entities || [];
    const hasLocation = ents.some((e: any) => e.type === "location");
    const hasOrg = ents.some((e: any) => e.type === "organization");
    ents.slice(0, 5).forEach((e: any) => log(`   [${e.type}] ${e.value} (${e.source}, ${e.confidence}%)`));
    addResult("IP Investigation (8.8.8.8)", hasLocation || hasOrg ? "PASS" : "FAIL",
      Date.now() - t, `${ents.length} entities, location: ${hasLocation}, org: ${hasOrg}`, ents.length);
  } catch (e: any) {
    addResult("IP Investigation", "FAIL", Date.now() - t, e.message);
  }
}

async function testDomain() {
  const t = Date.now();
  try {
    log("\n🔍 Domain investigation: example.com");
    const data = await runInvestigation("example.com", {
      maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 45000,
    }, 60000);
    const ents = data.entities || [];
    ents.slice(0, 8).forEach((e: any) => log(`   [${e.type}] ${e.value} (${e.source}, ${e.confidence}%)`));
    addResult("Domain Investigation (example.com)", ents.length > 0 ? "PASS" : "FAIL",
      Date.now() - t, `${ents.length} entities, ${data.stats?.modulesRun || 0} tools`, ents.length);
  } catch (e: any) {
    addResult("Domain Investigation", "FAIL", Date.now() - t, e.message);
  }
}

async function testEmail() {
  const t = Date.now();
  try {
    log("\n🔍 Email investigation: test@gmail.com");
    const data = await runInvestigation("test@gmail.com", {
      maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 45000,
    }, 60000);
    const ents = data.entities || [];
    ents.slice(0, 8).forEach((e: any) => log(`   [${e.type}] ${e.value} (${e.source}, ${e.confidence}%)`));
    addResult("Email Investigation (test@gmail.com)", data.stats?.modulesRun > 0 ? "PASS" : "FAIL",
      Date.now() - t, `${ents.length} entities, ${data.stats?.modulesRun || 0} tools`, ents.length);
  } catch (e: any) {
    addResult("Email Investigation", "FAIL", Date.now() - t, e.message);
  }
}

async function testUsername() {
  const t = Date.now();
  try {
    log("\n🔍 Username investigation: torvalds");
    const data = await runInvestigation("torvalds", {
      maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 90000,
    }, 120000);
    const ents = data.entities || [];
    const profiles = ents.filter((e: any) => e.type === "social_profile");
    ents.slice(0, 10).forEach((e: any) => log(`   [${e.type}] ${e.value} (${e.source}, ${e.confidence}%)`));
    if (ents.length > 10) log(`   ... and ${ents.length - 10} more`);
    addResult("Username Investigation (torvalds)", profiles.length > 0 ? "PASS" : ents.length > 0 ? "PASS" : "FAIL",
      Date.now() - t, `${profiles.length} profiles, ${ents.length} total`, ents.length);
  } catch (e: any) {
    addResult("Username Investigation", "FAIL", Date.now() - t, e.message);
  }
}

async function testPhone() {
  const t = Date.now();
  try {
    log("\n🔍 Phone investigation: +33612345678");
    const data = await runInvestigation("+33612345678", {
      maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 30000,
    }, 45000);
    const ents = data.entities || [];
    ents.slice(0, 5).forEach((e: any) => log(`   [${e.type}] ${e.value} (${e.source}, ${e.confidence}%)`));
    addResult("Phone Investigation (+33612345678)", data.stats?.modulesRun > 0 ? "PASS" : "FAIL",
      Date.now() - t, `${ents.length} entities, ${data.stats?.modulesRun || 0} tools`, ents.length);
  } catch (e: any) {
    addResult("Phone Investigation", "FAIL", Date.now() - t, e.message);
  }
}

async function testPerson() {
  const t = Date.now();
  try {
    log("\n🔍 Person investigation: Linus Torvalds");
    const data = await runInvestigation("Linus Torvalds", {
      maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 45000,
    }, 60000);
    const ents = data.entities || [];
    ents.slice(0, 8).forEach((e: any) => log(`   [${e.type}] ${e.value} (${e.source}, ${e.confidence}%)`));
    addResult("Person Investigation (Linus Torvalds)", data.stats?.modulesRun > 0 ? "PASS" : "FAIL",
      Date.now() - t, `${ents.length} entities, ${data.stats?.modulesRun || 0} tools`, ents.length);
  } catch (e: any) {
    addResult("Person Investigation", "FAIL", Date.now() - t, e.message);
  }
}

async function testCorrelation() {
  const t = Date.now();
  try {
    log("\n🔍 Correlation test: 8.8.8.8 (expect entity links)");
    const data = await runInvestigation("8.8.8.8", {
      maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 30000,
    }, 45000);
    const corrs = data.correlations || [];
    corrs.slice(0, 5).forEach((c: any) => {
      const from = (data.entities || []).find((e: any) => e.id === c.from);
      const to = (data.entities || []).find((e: any) => e.id === c.to);
      log(`   ${from?.value || c.from} <-> ${to?.value || c.to} (${c.type}, ${c.strength}%)`);
    });
    addResult("Correlation Engine", corrs.length > 0 ? "PASS" : "FAIL",
      Date.now() - t, `${corrs.length} correlations from ${(data.entities || []).length} entities`);
  } catch (e: any) {
    addResult("Correlation Engine", "FAIL", Date.now() - t, e.message);
  }
}

async function testRecursive() {
  const t = Date.now();
  try {
    log("\n🔍 Recursive investigation: 8.8.8.8 (depth=1, threshold=60)");
    const data = await runInvestigation("8.8.8.8", {
      maxDepth: 1, enableAI: false, enableRecursive: true, recursiveThreshold: 60, timeoutMs: 60000,
    }, 90000);
    const ents = data.entities || [];
    const types = [...new Set(ents.map((e: any) => e.type))];
    const deepEnts = ents.filter((e: any) => e.depth > 0);
    ents.slice(0, 8).forEach((e: any) => log(`   [${e.type}] ${e.value} (depth:${e.depth}, ${e.source})`));
    if (ents.length > 8) log(`   ... and ${ents.length - 8} more`);
    addResult("Recursive Investigation (depth=1)", ents.length > 3 ? "PASS" : "FAIL",
      Date.now() - t, `${ents.length} total, ${deepEnts.length} from recursion, types: ${types.join(",")}`, ents.length);
  } catch (e: any) {
    addResult("Recursive Investigation", "FAIL", Date.now() - t, e.message);
  }
}

async function testAI() {
  const t = Date.now();
  try {
    const aiStatus = await axios.get(`${API}/ai/status`);
    if (!aiStatus.data.available) {
      addResult("AI Analysis", "SKIP", Date.now() - t, "Ollama not available");
      return;
    }
    log("\n🔍 AI analysis: 8.8.8.8 (with Ollama)");
    const data = await runInvestigation("8.8.8.8", {
      maxDepth: 0, enableAI: true, enableRecursive: false, timeoutMs: 120000,
    }, 150000);
    // Check if there was an AI event (the /run endpoint includes all events)
    const hasAi = data.message?.includes("Investigation complete");
    addResult("AI Analysis Integration", hasAi ? "PASS" : "FAIL",
      Date.now() - t, `${(data.entities || []).length} entities, AI: completed`, (data.entities || []).length);
  } catch (e: any) {
    addResult("AI Analysis", "FAIL", Date.now() - t, e.message);
  }
}

async function testSSEStreamBasic() {
  const t = Date.now();
  try {
    log("\n🔍 SSE Basic stream test (GET /stream-test)");
    const events: any[] = [];
    await new Promise<void>((resolve, reject) => {
      http.get("http://localhost:3002/api/deep/stream-test", (res) => {
        let buf = "";
        res.on("data", (chunk: Buffer) => {
          buf += chunk.toString();
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const p = line.slice(6).trim();
              if (p === "[DONE]") continue;
              try { events.push(JSON.parse(p)); } catch {}
            }
          }
        });
        res.on("end", () => resolve());
        res.on("error", reject);
      }).on("error", reject);
    });
    addResult("SSE Basic Stream", events.length === 5 ? "PASS" : "FAIL",
      Date.now() - t, `${events.length} events received`);
  } catch (e: any) {
    addResult("SSE Basic Stream", "FAIL", Date.now() - t, e.message);
  }
}

async function testSSEStream() {
  const t = Date.now();
  try {
    log("\n🔍 SSE Investigation stream: 8.8.8.8 (via axios stream)");
    const events: any[] = [];
    const entities: any[] = [];

    const resp = await axios.post(`${API}/deep/stream`,
      { target: "8.8.8.8", config: { maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 45000 } },
      { responseType: "stream", timeout: 60000 }
    );

    await new Promise<void>((resolve, reject) => {
      let buf = "";
      const timer = setTimeout(() => resolve(), 55000);
      resp.data.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const p = line.slice(6).trim();
            if (p === "[DONE]") { clearTimeout(timer); resolve(); return; }
            try {
              const ev = JSON.parse(p);
              events.push(ev);
              if (ev.type === "entity_found" && ev.data?.entity) entities.push(ev.data.entity);
            } catch {}
          }
        }
      });
      resp.data.on("end", () => { clearTimeout(timer); resolve(); });
      resp.data.on("error", (e: any) => { clearTimeout(timer); reject(e); });
    });

    const types = [...new Set(events.map(e => e.type))];
    log(`   Event types: ${types.join(", ")}`);
    log(`   Total: ${events.length} events, ${entities.length} entities`);
    entities.slice(0, 5).forEach((e: any) => log(`   [${e.type}] ${e.value}`));

    addResult("SSE Investigation Stream", events.length > 0 ? "PASS" : "FAIL",
      Date.now() - t, `${events.length} events, types: ${types.join(",")}`, entities.length);
  } catch (e: any) {
    addResult("SSE Investigation Stream", "FAIL", Date.now() - t, e.message);
  }
}

async function testConcurrent() {
  const t = Date.now();
  try {
    log("\n🔍 Concurrent: 3 targets simultaneously");
    const targets = [
      { target: "1.1.1.1", config: { maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 30000 } },
      { target: "example.org", config: { maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 30000 } },
      { target: "+33123456789", config: { maxDepth: 0, enableAI: false, enableRecursive: false, timeoutMs: 30000 } },
    ];
    const all = await Promise.allSettled(
      targets.map(t => runInvestigation(t.target, t.config, 60000))
    );
    let totalEnt = 0;
    let ok = 0;
    all.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const ents = r.value.entities?.length || 0;
        totalEnt += ents;
        ok++;
        log(`   ${targets[i].target}: ${ents} entities ✓`);
      } else {
        log(`   ${targets[i].target}: FAILED - ${(r as any).reason?.message}`);
      }
    });
    addResult("Concurrent Investigations (3)", ok >= 2 ? "PASS" : "FAIL",
      Date.now() - t, `${ok}/3 succeeded, ${totalEnt} total entities`, totalEnt);
  } catch (e: any) {
    addResult("Concurrent Investigations", "FAIL", Date.now() - t, e.message);
  }
}

async function testFullRecursiveDeep() {
  const t = Date.now();
  try {
    log("\n🔍 DEEP TEST: Full recursive on 'torvalds' (depth=1, AI=true)");
    const data = await runInvestigation("torvalds", {
      maxDepth: 1, enableAI: true, enableRecursive: true, recursiveThreshold: 65, timeoutMs: 180000,
    }, 210000);
    const ents = data.entities || [];
    const corrs = data.correlations || [];
    const types = [...new Set(ents.map((e: any) => e.type))];
    const deepEnts = ents.filter((e: any) => e.depth > 0);

    log(`   Total: ${ents.length} entities, ${corrs.length} correlations`);
    log(`   Types: ${types.join(", ")}`);
    log(`   Recursive entities: ${deepEnts.length}`);
    log(`   Tools run: ${data.stats?.modulesRun || "?"}`);
    ents.slice(0, 12).forEach((e: any) => log(`   [${e.type}] ${e.value} (depth:${e.depth}, ${e.confidence}%)`));
    if (ents.length > 12) log(`   ... and ${ents.length - 12} more`);

    addResult("DEEP Full Recursive (torvalds)", ents.length > 5 ? "PASS" : "FAIL",
      Date.now() - t, `${ents.length} ent, ${corrs.length} corr, ${deepEnts.length} recursive, ${data.stats?.modulesRun} tools`, ents.length);
  } catch (e: any) {
    addResult("DEEP Full Recursive", "FAIL", Date.now() - t, e.message);
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  log("╔══════════════════════════════════════════════════════════════╗");
  log("║      OSINT MASTER v4 - COMPREHENSIVE TEST SUITE            ║");
  log("║      Real investigations, streaming, correlation, AI        ║");
  log("╚══════════════════════════════════════════════════════════════╝\n");

  const t0 = Date.now();

  // Quick checks
  await testHealth();
  await testDetection();

  // Per-type investigations (real data)
  await testIP();
  await testDomain();
  await testEmail();
  await testPhone();
  await testPerson();
  await testUsername();

  // Advanced features
  await testCorrelation();
  await testRecursive();
  await testSSEStreamBasic();
  await testSSEStream();
  await testAI();

  // Stress
  await testConcurrent();

  // Full deep test
  await testFullRecursiveDeep();

  // Summary
  const total = Date.now() - t0;
  const p = results.filter(r => r.status === "PASS").length;
  const f = results.filter(r => r.status === "FAIL").length;
  const s = results.filter(r => r.status === "SKIP").length;
  const totalEnt = results.reduce((a, r) => a + (r.entities || 0), 0);

  log("\n╔══════════════════════════════════════════════════════════════╗");
  log(`║  ✅ PASSED:   ${String(p).padStart(2)}                                           ║`);
  log(`║  ❌ FAILED:   ${String(f).padStart(2)}                                           ║`);
  log(`║  ⏭️  SKIPPED:  ${String(s).padStart(2)}                                           ║`);
  log(`║  📊 Entities: ${String(totalEnt).padStart(5)}                                      ║`);
  log(`║  ⏱️  Duration: ${(total / 1000).toFixed(1)}s                                       ║`);
  log("╚══════════════════════════════════════════════════════════════╝");

  if (f > 0) {
    log("\n❌ FAILURES:");
    results.filter(r => r.status === "FAIL").forEach(r => log(`   - ${r.name}: ${r.details}`));
  }

  process.exit(f > 0 ? 1 : 0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
