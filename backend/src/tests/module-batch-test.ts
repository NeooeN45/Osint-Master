// ============================================================================
// OSINT MASTER - BATCH MODULE TEST
// Teste tous les modules un par un avec données factices puis réelles
// Usage: npx tsx backend/src/tests/module-batch-test.ts [--real <target>]
// ============================================================================

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ---- Couleurs console ----
const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  magenta: "\x1b[35m",
};

function ok(msg: string) { console.log(`${C.green}  ✔ ${msg}${C.reset}`); }
function fail(msg: string) { console.log(`${C.red}  ✘ ${msg}${C.reset}`); }
function info(msg: string) { console.log(`${C.cyan}  → ${msg}${C.reset}`); }
function warn(msg: string) { console.log(`${C.yellow}  ⚠ ${msg}${C.reset}`); }
function section(msg: string) { console.log(`\n${C.bold}${C.magenta}━━ ${msg} ━━${C.reset}`); }

// ---- Données de test factices ----
const FAKE_TARGETS = {
  username: "john_doe_test_osint_2024",
  email: "test.osint.fake@gmail.com",
  domain: "example.com",
  ip: "8.8.8.8",
  phone: "+33612345678",
  person: "John Doe",
};

// ---- Résultats ----
interface TestResult {
  module: string;
  category: string;
  available: boolean;
  tested: boolean;
  success: boolean;
  duration: number;
  entitiesFound: number;
  error?: string;
}

const results: TestResult[] = [];

// ---- Helper: check command ----
function cmdAvailable(cmd: string): boolean {
  try {
    execSync(`where ${cmd} 2>&1`, { stdio: "pipe" });
    return true;
  } catch {
    try {
      execSync(`which ${cmd} 2>&1`, { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }
}

function execWithTimeout(cmd: string, timeoutMs = 15000): { stdout: string; stderr: string; ok: boolean } {
  try {
    const r = spawnSync("cmd", ["/c", cmd], {
      timeout: timeoutMs,
      encoding: "utf-8",
      maxBuffer: 2 * 1024 * 1024,
    });
    return {
      stdout: r.stdout || "",
      stderr: r.stderr || "",
      ok: r.status === 0,
    };
  } catch (e: any) {
    return { stdout: "", stderr: e.message, ok: false };
  }
}

// ============================================================================
// MODULES NATIFS (pas Docker)
// ============================================================================

const NATIVE_MODULE_TESTS: Array<{
  id: string;
  name: string;
  category: string;
  target: keyof typeof FAKE_TARGETS;
  checkCmd: string;
  testCmd: (t: string) => string;
  parseResult: (out: string) => number;
}> = [
  {
    id: "sherlock",
    name: "Sherlock",
    category: "username",
    target: "username",
    checkCmd: "sherlock --version",
    testCmd: (t) => `sherlock "${t}" --site Instagram,Twitter,GitHub --print-found --timeout 3 --no-color`,
    parseResult: (out) => (out.match(/https?:\/\//g) || []).length,
  },
  {
    id: "maigret",
    name: "Maigret",
    category: "username",
    target: "username",
    checkCmd: "maigret --version",
    testCmd: (t) => `maigret "${t}" --top-sites 20 --no-color 2>&1`,
    parseResult: (out) => (out.match(/Found/gi) || []).length,
  },
  {
    id: "nslookup",
    name: "DNS Lookup (nslookup)",
    category: "domain",
    target: "domain",
    checkCmd: "nslookup",
    testCmd: (t) => `nslookup ${t} 8.8.8.8`,
    parseResult: (out) => (out.match(/Address/g) || []).length,
  },
  {
    id: "dig",
    name: "DIG DNS",
    category: "domain",
    target: "domain",
    checkCmd: "dig",
    testCmd: (t) => `dig ${t} ANY +short`,
    parseResult: (out) => out.split("\n").filter(Boolean).length,
  },
  {
    id: "whois",
    name: "WHOIS",
    category: "domain",
    target: "domain",
    checkCmd: "whois",
    testCmd: (t) => `whois ${t}`,
    parseResult: (out) => (out.match(/Registrar/gi) || []).length,
  },
  {
    id: "curl_crtsh",
    name: "crt.sh (Certificats SSL)",
    category: "domain",
    target: "domain",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://crt.sh/?q=${t}&output=json" --max-time 10`,
    parseResult: (out) => { try { return JSON.parse(out).length; } catch { return 0; } },
  },
  {
    id: "curl_gravatar",
    name: "Gravatar (Email hash)",
    category: "email",
    target: "email",
    checkCmd: "curl",
    testCmd: (t) => {
      const crypto = require("crypto");
      const hash = crypto.createHash("md5").update(t.toLowerCase().trim()).digest("hex");
      return `curl -s "https://www.gravatar.com/${hash}.json" --max-time 5`;
    },
    parseResult: (out) => out.includes("entry") ? 1 : 0,
  },
  {
    id: "curl_wayback",
    name: "Wayback Machine",
    category: "domain",
    target: "domain",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://archive.org/wayback/available?url=${t}" --max-time 10`,
    parseResult: (out) => { try { return JSON.parse(out).archived_snapshots?.closest ? 1 : 0; } catch { return 0; } },
  },
  {
    id: "curl_ipinfo",
    name: "IPInfo",
    category: "ip",
    target: "ip",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://ipinfo.io/${t}/json" --max-time 10`,
    parseResult: (out) => { try { return JSON.parse(out).ip ? 1 : 0; } catch { return 0; } },
  },
  {
    id: "curl_hackertarget_whois",
    name: "HackerTarget WHOIS",
    category: "ip",
    target: "ip",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://api.hackertarget.com/whois/?q=${t}" --max-time 10`,
    parseResult: (out) => out.includes("NetName") || out.includes("OrgName") ? 1 : 0,
  },
  {
    id: "curl_hackertarget_dns",
    name: "HackerTarget DNS Lookup",
    category: "domain",
    target: "domain",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://api.hackertarget.com/dnslookup/?q=${t}" --max-time 10`,
    parseResult: (out) => out.split("\n").filter(Boolean).length,
  },
  {
    id: "curl_hackertarget_geoip",
    name: "HackerTarget GeoIP",
    category: "ip",
    target: "ip",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://api.hackertarget.com/geoip/?q=${t}" --max-time 10`,
    parseResult: (out) => out.includes("Country") ? 1 : 0,
  },
  {
    id: "curl_hackertarget_reverseip",
    name: "HackerTarget Reverse IP",
    category: "ip",
    target: "ip",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://api.hackertarget.com/reverseiplookup/?q=${t}" --max-time 10`,
    parseResult: (out) => out.split("\n").filter(l => l.includes(".")).length,
  },
  {
    id: "curl_hackertarget_headers",
    name: "HackerTarget HTTP Headers",
    category: "domain",
    target: "domain",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://api.hackertarget.com/httpheaders/?q=https://${t}" --max-time 10`,
    parseResult: (out) => out.split("\n").filter(Boolean).length,
  },
  {
    id: "curl_hackertarget_pagelinks",
    name: "HackerTarget Page Links",
    category: "domain",
    target: "domain",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://api.hackertarget.com/pagelinks/?q=https://${t}" --max-time 10`,
    parseResult: (out) => out.split("\n").filter(l => l.startsWith("http")).length,
  },
  {
    id: "curl_hackertarget_subdomains",
    name: "HackerTarget Subdomains",
    category: "domain",
    target: "domain",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://api.hackertarget.com/hostsearch/?q=${t}" --max-time 10`,
    parseResult: (out) => out.split("\n").filter(Boolean).length,
  },
  {
    id: "curl_urlscan",
    name: "URLScan.io",
    category: "domain",
    target: "domain",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://urlscan.io/api/v1/search/?q=domain:${t}&size=10" --max-time 10`,
    parseResult: (out) => { try { return JSON.parse(out).total || 0; } catch { return 0; } },
  },
  {
    id: "curl_github_users",
    name: "GitHub User Search",
    category: "username",
    target: "username",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://api.github.com/search/users?q=${t}&per_page=5" -H "User-Agent: OSINT-Test" --max-time 10`,
    parseResult: (out) => { try { return JSON.parse(out).total_count || 0; } catch { return 0; } },
  },
  {
    id: "curl_reddit_user",
    name: "Reddit User",
    category: "username",
    target: "username",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://www.reddit.com/user/${t}/about.json" -H "User-Agent: OSINT-Test" --max-time 10`,
    parseResult: (out) => { try { return JSON.parse(out).data?.name ? 1 : 0; } catch { return 0; } },
  },
  {
    id: "curl_pagesjaunes",
    name: "Pages Jaunes FR",
    category: "phone",
    target: "phone",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui=${encodeURIComponent(t)}" -A "Mozilla/5.0" --max-time 10 -I`,
    parseResult: (out) => out.includes("200") ? 1 : 0,
  },
  {
    id: "curl_numverify",
    name: "NumVerify (Phone)",
    category: "phone",
    target: "phone",
    checkCmd: "curl",
    testCmd: (t) => `curl -s "http://apilayer.net/api/validate?number=${t}" --max-time 10`,
    parseResult: (out) => { try { return JSON.parse(out).valid ? 1 : 0; } catch { return 0; } },
  },
  {
    id: "instaloader",
    name: "Instaloader (Instagram)",
    category: "social",
    target: "username",
    checkCmd: "instaloader",
    testCmd: (t) => `instaloader --no-pictures --no-videos --no-metadata-json "${t}" 2>&1`,
    parseResult: (out) => out.includes("followers") ? 1 : 0,
  },
  {
    id: "python_builtin",
    name: "Python (requis moteur)",
    category: "system",
    target: "username",
    checkCmd: "python",
    testCmd: (_) => `python --version`,
    parseResult: (out) => out.includes("Python") ? 1 : 0,
  },
];

// ============================================================================
// MODULES DOCKER
// ============================================================================

const DOCKER_MODULE_TESTS = [
  {
    id: "maigret_docker",
    image: "soxoj/maigret:latest",
    cmd: (t: string) => `docker run --rm soxoj/maigret:latest maigret "${t}" --top-sites 20 --no-color`,
    parse: (out: string) => (out.match(/\[\+\]/g) || []).length,
  },
  {
    id: "sherlock_docker",
    image: "theyahya/sherlock",
    cmd: (t: string) => `docker run --rm --env PYTHONHTTPSVERIFY=0 theyahya/sherlock "${t}" --print-found --no-color --timeout 5 --site Instagram,GitHub,Reddit`,
    parse: (out: string) => (out.match(/https?:\/\//g) || []).length,
  },
];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const realTarget = args[args.indexOf("--real") + 1];
  const useReal = args.includes("--real") && realTarget;

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗`);
  console.log(`║    OSINT MASTER - BATCH MODULE TEST v1.0        ║`);
  console.log(`╚══════════════════════════════════════════════════╝${C.reset}`);

  if (useReal) {
    info(`Mode: DONNÉES RÉELLES — cible: ${realTarget}`);
  } else {
    info("Mode: DONNÉES FACTICES (safe)");
    info(`Targets: ${JSON.stringify(FAKE_TARGETS)}`);
  }

  // ---- 1. Check Docker ----
  section("1. DOCKER");
  let dockerOk = false;
  try {
    const dv = execSync("docker --version 2>&1", { encoding: "utf-8" }).trim();
    const dp = execSync("docker ps 2>&1", { encoding: "utf-8" }).trim();
    if (dp.includes("CONTAINER")) {
      ok(`Docker disponible: ${dv}`);
      dockerOk = true;
    } else {
      warn(`Docker installé mais daemon arrêté. Lance Docker Desktop d'abord.`);
    }
  } catch {
    fail("Docker non disponible");
  }

  // ---- 2. Modules natifs ----
  section("2. MODULES NATIFS");

  for (const mod of NATIVE_MODULE_TESTS) {
    const start = Date.now();
    const avail = cmdAvailable(mod.checkCmd);
    const target = useReal ? realTarget! : FAKE_TARGETS[mod.target];

    process.stdout.write(`  ${C.dim}[${mod.category}] ${mod.name.padEnd(30)}${C.reset}`);

    if (!avail) {
      warn(`Non installé (${mod.checkCmd})`);
      results.push({ module: mod.id, category: mod.category, available: false, tested: false, success: false, duration: 0, entitiesFound: 0, error: "not installed" });
      continue;
    }

    try {
      const cmdStr = mod.testCmd(target);
      const { stdout, ok: cmdOk } = execWithTimeout(cmdStr, 20000);
      const found = mod.parseResult(stdout);
      const duration = Date.now() - start;

      if (cmdOk || found > 0) {
        ok(`OK (${found} résultats, ${duration}ms)`);
        results.push({ module: mod.id, category: mod.category, available: true, tested: true, success: true, duration, entitiesFound: found });
      } else {
        warn(`Aucun résultat (${duration}ms)`);
        results.push({ module: mod.id, category: mod.category, available: true, tested: true, success: false, duration, entitiesFound: 0 });
      }
    } catch (e: any) {
      fail(`Erreur: ${e.message.slice(0, 80)}`);
      results.push({ module: mod.id, category: mod.category, available: true, tested: true, success: false, duration: Date.now() - start, entitiesFound: 0, error: e.message });
    }
  }

  // ---- 3. Docker modules ----
  section("3. MODULES DOCKER");

  if (!dockerOk) {
    warn("Docker daemon non disponible — modules Docker ignorés");
  } else {
    for (const mod of DOCKER_MODULE_TESTS) {
      const start = Date.now();
      process.stdout.write(`  ${C.dim}[docker] ${mod.id.padEnd(30)}${C.reset}`);

      const target = useReal ? realTarget! : FAKE_TARGETS.username;

      try {
        const { stdout, ok: cmdOk } = execWithTimeout(mod.cmd(target), 60000);
        const found = (mod as any).parse ? (mod as any).parse(stdout) : (stdout.match(/https?:\/\//g) || []).length;
        const duration = Date.now() - start;

        if (cmdOk || found > 0) {
          ok(`OK (${found} résultats, ${duration}ms)`);
          results.push({ module: mod.id, category: "docker", available: true, tested: true, success: true, duration, entitiesFound: found });
        } else {
          warn(`Aucun résultat (${duration}ms)`);
          results.push({ module: mod.id, category: "docker", available: true, tested: true, success: false, duration, entitiesFound: 0 });
        }
      } catch (e: any) {
        fail(`Erreur: ${e.message.slice(0, 80)}`);
        results.push({ module: mod.id, category: "docker", available: true, tested: true, success: false, duration: Date.now() - start, entitiesFound: 0, error: e.message });
      }
    }
  }

  // ---- 4. Rapport final ----
  section("4. RAPPORT FINAL");

  const available = results.filter(r => r.available).length;
  const tested = results.filter(r => r.tested).length;
  const success = results.filter(r => r.success).length;
  const totalFound = results.reduce((s, r) => s + r.entitiesFound, 0);

  console.log(`\n  ${C.bold}Modules disponibles : ${C.green}${available}/${results.length}${C.reset}`);
  console.log(`  ${C.bold}Testés avec succès  : ${C.green}${success}/${tested}${C.reset}`);
  console.log(`  ${C.bold}Entités trouvées    : ${C.cyan}${totalFound}${C.reset}`);

  // Par catégorie
  const categories = [...new Set(results.map(r => r.category))];
  console.log(`\n  ${C.bold}Par catégorie:${C.reset}`);
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catOk = catResults.filter(r => r.success).length;
    console.log(`    ${C.dim}${cat.padEnd(15)}${C.reset} ${C.green}${catOk}✔${C.reset} / ${catResults.length} modules`);
  }

  // Modules non installés (à installer)
  const notInstalled = results.filter(r => !r.available);
  if (notInstalled.length > 0) {
    console.log(`\n  ${C.yellow}${C.bold}À installer:${C.reset}`);
    for (const m of notInstalled) {
      console.log(`    ${C.yellow}• ${m.module}${C.reset}`);
    }
    console.log(`\n  ${C.dim}Commandes d'installation:`);
    console.log(`    pip install sherlock-project maigret instaloader`);
    console.log(`    winget install --id=GnuWin32.Whois${C.reset}`);
  }

  // Sauvegarder le rapport
  const reportPath = path.join(os.tmpdir(), `osint-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ date: new Date().toISOString(), mode: useReal ? "real" : "fake", results }, null, 2));
  info(`Rapport sauvegardé: ${reportPath}`);

  console.log(`\n${C.bold}${C.cyan}  Prêt pour les vraies données ? Lance:${C.reset}`);
  console.log(`  ${C.dim}npx tsx backend/src/tests/module-batch-test.ts --real <ta_valeur>${C.reset}\n`);
}

main().catch(console.error);
