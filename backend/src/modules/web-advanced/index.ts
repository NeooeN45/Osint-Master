// ============================================================================
// WEB & DARK WEB MODULES - 25+ modules pour investigation web avancée
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { tryHttp } from "../utils";

// ---- 1. Advanced Wayback Machine ----
export const waybackAdvancedModule: OSINTModule = {
  id: "wayback_advanced",
  name: "Wayback Machine Deep Search",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "wayback_advanced", target } });
    
    const entities: any[] = [];
    const normalized = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    // Multiple Wayback endpoints
    const waybackUrls = [
      { type: "Calendar", url: `https://web.archive.org/web/*/${normalized}` },
      { type: "CDX API", url: `https://web.archive.org/cdx/search/cdx?url=${normalized}&output=json` },
      { type: "Sitemap", url: `https://web.archive.org/web/*/https://${normalized}/sitemap.xml` },
      { type: "Robots.txt", url: `https://web.archive.org/web/*/https://${normalized}/robots.txt` },
      { type: "Screenshots", url: `https://web.archive.org/web/*/https://${normalized}/*` },
    ];
    
    for (const wb of waybackUrls) {
      entities.push({
        id: makeEntityId(), type: "wayback_entry", value: wb.url,
        source: `wayback_${wb.type.toLowerCase()}`, confidence: 90,
        metadata: { target: normalized, archive_type: wb.type },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "wayback_advanced", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 2. Common Crawl Search ----
export const commonCrawlModule: OSINTModule = {
  id: "common_crawl",
  name: "Common Crawl Index Search",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "common_crawl", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    // Common Crawl indexes
    const indexes = [
      { name: "CC Index", url: `https://index.commoncrawl.org/CC-MAIN-2024-51-index?url=${domain}&output=json` },
      { name: "Column Search", url: `https://index.commoncrawl.org/` },
      { name: "Web Data Commons", url: `http://webdatacommons.org/` },
    ];
    
    for (const idx of indexes) {
      entities.push({
        id: makeEntityId(), type: "commoncrawl_entry", value: idx.url,
        source: `commoncrawl_${idx.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 75,
        metadata: { domain, index_type: idx.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "common_crawl", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 3. URLScan Deep ----
export const urlscanAdvancedModule: OSINTModule = {
  id: "urlscan_advanced",
  name: "URLScan.io Deep Analysis",
  category: "web",
  targetTypes: ["url"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "urlscan_advanced", target } });
    
    const entities: any[] = [];
    
    // URLScan API endpoints
    const scans = [
      { name: "Submit Scan", url: `https://urlscan.io/api/v1/scan/` },
      { name: "Search Domain", url: `https://urlscan.io/api/v1/search/?q=domain:${target.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}` },
      { name: "Search URL", url: `https://urlscan.io/api/v1/search/?q=url:"${encodeURIComponent(target)}"` },
      { name: "Pro Search", url: `https://urlscan.io/search/#${encodeURIComponent(target)}` },
    ];
    
    for (const scan of scans) {
      entities.push({
        id: makeEntityId(), type: "urlscan_entry", value: scan.url,
        source: `urlscan_${scan.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 85,
        metadata: { target, scan_type: scan.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "urlscan_advanced", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 4. VirusTotal URL ----
export const virustotalUrlModule: OSINTModule = {
  id: "virustotal_url",
  name: "VirusTotal URL Analyzer",
  category: "web",
  targetTypes: ["url"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "virustotal_url", target } });
    
    const entities: any[] = [];
    
    // VT URL ID is base64 encoded URL
    const encodedUrl = Buffer.from(target).toString("base64").replace(/=/g, "");
    
    entities.push({
      id: makeEntityId(), type: "virustotal_entry", value: `https://www.virustotal.com/gui/url/${encodedUrl}`,
      source: "virustotal_url", confidence: 95,
      metadata: { 
        target, 
        encoded_id: encodedUrl,
        api_endpoint: `https://www.virustotal.com/api/v3/urls/${encodedUrl}`,
        note: "Requires API key for full data"
      },
      verified: true, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "virustotal_url", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 5. Google Safe Browsing ----
export const safeBrowsingModule: OSINTModule = {
  id: "safe_browsing",
  name: "Google Safe Browsing Check",
  category: "web",
  targetTypes: ["url"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "safe_browsing", target } });
    
    const entities: any[] = [];
    
    entities.push({
      id: makeEntityId(), type: "safebrowsing_entry", value: `https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(target)}`,
      source: "safe_browsing", confidence: 95,
      metadata: { target },
      verified: true, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "safe_browsing", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 6. Screenshot Services ----
export const screenshotModule: OSINTModule = {
  id: "screenshot_services",
  name: "Website Screenshot Services",
  category: "web",
  targetTypes: ["url"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "screenshot_services", target } });
    
    const entities: any[] = [];
    const encoded = encodeURIComponent(target);
    
    const services = [
      { name: "url2png", url: `https://url2png.com/?url=${encoded}` },
      { name: "Screenshot Machine", url: `https://www.screenshotmachine.com/${encoded}` },
      { name: "PagePeeker", url: `https://pagepeeker.com/${encoded}` },
      { name: "Thumbnail.ws", url: `https://thumbnail.ws/get/thumbnail/?apikey=free&url=${encoded}&width=1920` },
      { name: "URLScan Screenshot", url: `https://urlscan.io/screenshots/${encoded}` },
    ];
    
    for (const svc of services) {
      entities.push({
        id: makeEntityId(), type: "screenshot_service", value: svc.url,
        source: `screenshot_${svc.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 70,
        metadata: { target, service: svc.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "screenshot_services", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 7. WHOIS Deep ----
export const whoisAdvancedModule: OSINTModule = {
  id: "whois_advanced",
  name: "WHOIS Deep Analysis",
  category: "web",
  targetTypes: ["domain"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "whois_advanced", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    const whoisServices = [
      { name: "WHOIS.com", url: `https://www.whois.com/whois/${domain}` },
      { name: "ICANN", url: `https://lookup.icann.org/en/lookup?name=${domain}` },
      { name: "WHOIS XML", url: `https://www.whoisxmlapi.com/whoisserver/WhoisService?domainName=${domain}` },
      { name: "ViewDNS WHOIS", url: `https://viewdns.info/whois/?domain=${domain}` },
      { name: "DomainTools", url: `https://whois.domaintools.com/${domain}` },
    ];
    
    for (const svc of whoisServices) {
      entities.push({
        id: makeEntityId(), type: "whois_service", value: svc.url,
        source: `whois_${svc.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 85,
        metadata: { domain, service: svc.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "whois_advanced", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 8. DNS Deep Analysis ----
export const dnsDeepModule: OSINTModule = {
  id: "dns_deep",
  name: "DNS Deep Analysis",
  category: "web",
  targetTypes: ["domain"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "dns_deep", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    const dnsServices = [
      { name: "DNSDumpster", url: `https://dnsdumpster.com/` },
      { name: "ViewDNS", url: `https://viewdns.info/` },
      { name: "DNSChecker", url: `https://dnschecker.org/all-dns-records-of-domain.php?scan=${domain}` },
      { name: "MXToolbox", url: `https://mxtoolbox.com/SuperTool.aspx?action=dns:${domain}` },
      { name: "SecurityTrails DNS", url: `https://securitytrails.com/domain/${domain}/dns` },
    ];
    
    for (const svc of dnsServices) {
      entities.push({
        id: makeEntityId(), type: "dns_service", value: svc.url,
        source: `dns_${svc.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 80,
        metadata: { domain, service: svc.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "dns_deep", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 9. SSL/TLS Certificate Analysis ----
export const sslAnalysisModule: OSINTModule = {
  id: "ssl_analysis",
  name: "SSL/TLS Certificate Analysis",
  category: "web",
  targetTypes: ["domain"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "ssl_analysis", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    const sslServices = [
      { name: "SSL Labs", url: `https://www.ssllabs.com/ssltest/analyze.html?d=${domain}` },
      { name: "CRT.sh", url: `https://crt.sh/?q=${domain}` },
      { name: "Censys Certificates", url: `https://search.censys.io/certificates?q=${domain}` },
      { name: "SSL Checker", url: `https://www.sslchecker.com/sslchecker?host=${domain}` },
    ];
    
    for (const svc of sslServices) {
      entities.push({
        id: makeEntityId(), type: "ssl_service", value: svc.url,
        source: `ssl_${svc.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 85,
        metadata: { domain, service: svc.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "ssl_analysis", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 10. IP Geolocation ----
export const ipGeolocationModule: OSINTModule = {
  id: "ip_geolocation",
  name: "IP Geolocation Services",
  category: "web",
  targetTypes: ["ip"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "ip_geolocation", target } });
    
    const entities: any[] = [];
    
    const geoServices = [
      { name: "IPinfo.io", url: `https://ipinfo.io/${target}` },
      { name: "IP-API", url: `https://ip-api.com/#${target}` },
      { name: "IPGeolocation", url: `https://ipgeolocation.io/ip-location/${target}` },
      { name: "MaxMind", url: `https://www.maxmind.com/en/geoip-demo` },
      { name: "IPLocation", url: `https://www.iplocation.net/ip-lookup?query=${target}` },
      { name: "IPVoid", url: `https://www.ipvoid.com/scan/${target}/` },
    ];
    
    for (const svc of geoServices) {
      entities.push({
        id: makeEntityId(), type: "ip_geolocation", value: svc.url,
        source: `geo_${svc.name.toLowerCase().replace(/[-\s]/g, "_")}`, confidence: 75,
        metadata: { ip: target, service: svc.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "ip_geolocation", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 11. Shodan Search ----
export const shodanModule: OSINTModule = {
  id: "shodan_search",
  name: "Shodan Search",
  category: "web",
  targetTypes: ["ip", "domain"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "shodan_search", target } });
    
    const entities: any[] = [];
    
    entities.push({
      id: makeEntityId(), type: "shodan_entry", value: `https://www.shodan.io/search?query=${encodeURIComponent(target)}`,
      source: "shodan_search", confidence: 90,
      metadata: { 
        target,
        api_endpoint: `https://api.shodan.io/shodan/host/${target}?key=API_KEY`,
        search_url: `https://www.shodan.io/search?query=${encodeURIComponent(target)}`,
        note: "Requires API key for full access"
      },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "shodan_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 12. Censys Search ----
export const censysModule: OSINTModule = {
  id: "censys_search",
  name: "Censys Search",
  category: "web",
  targetTypes: ["ip", "domain"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "censys_search", target } });
    
    const entities: any[] = [];
    
    entities.push({
      id: makeEntityId(), type: "censys_entry", value: `https://search.censys.io/search?resource=hosts&sort=RELEVANCE&per_page=25&virtual_hosts=EXCLUDE&q=${encodeURIComponent(target)}`,
      source: "censys_search", confidence: 90,
      metadata: { 
        target,
        certificates: `https://search.censys.io/certificates?q=${encodeURIComponent(target)}`,
        note: "Free tier available, API key for more"
      },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "censys_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 13. Fofa Search ----
export const fofaModule: OSINTModule = {
  id: "fofa_search",
  name: "FOFA Search (Chinese Shodan)",
  category: "web",
  targetTypes: ["ip", "domain"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "fofa_search", target } });
    
    const entities: any[] = [];
    
    entities.push({
      id: makeEntityId(), type: "fofa_entry", value: `https://en.fofa.info/`,
      source: "fofa_search", confidence: 70,
      metadata: { 
        target,
        search_query: `https://en.fofa.info/result?qbase64=${Buffer.from(target).toString("base64")}`,
        note: "Chinese search engine, good for Asia-based assets"
      },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "fofa_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 14. Onion/Tor Services ----
export const torSearchModule: OSINTModule = {
  id: "tor_search",
  name: "Dark Web/Tor Search",
  category: "web",
  targetTypes: ["username", "email", "domain"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "tor_search", target } });
    
    const entities: any[] = [];
    
    // Tor search engines
    const darkEngines = [
      { name: "Ahmia", url: `https://ahmia.fi/search/?q=${encodeURIComponent(target)}` },
      { name: "OnionLand", url: `https://onionlandsearch.com/search?q=${encodeURIComponent(target)}` },
      { name: "Tor66", url: `http://tor66sewebgixwhcqfnp5inrpapkgpqpeefrcvqzdfbbled6tkgktid.onion/` },
      { name: "Torch", url: `http://xmh57jrknzkhv6y3ls3ubitzfqnkrwxhopf5aygthi7d6rplyvk3noyd.onion/` },
      { name: "Not Evil", url: `https://hss3uro2hsxfogfq.onion.to/` },
    ];
    
    for (const engine of darkEngines) {
      entities.push({
        id: makeEntityId(), type: "tor_search", value: engine.url,
        source: `tor_${engine.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 60,
        metadata: { target, engine: engine.name, note: "Use Tor Browser for .onion links" },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "tor_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 15. Breach Database Search ----
export const breachSearchModule: OSINTModule = {
  id: "breach_search",
  name: "Data Breach Search",
  category: "web",
  targetTypes: ["email", "username"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "breach_search", target } });
    
    const entities: any[] = [];
    
    const breachServices = [
      { name: "HaveIBeenPwned", url: `https://haveibeenpwned.com/unifiedsearch/${Buffer.from(target).toString("hex")}` },
      { name: "DeHashed", url: `https://www.dehashed.com/search?query=${encodeURIComponent(target)}` },
      { name: "LeakCheck", url: `https://leakcheck.io/`, note: "Search via API" },
      { name: "Scattered Secrets", url: `https://scatteredsecrets.com/` },
      { name: "BreachDirectory", url: `https://breachdirectory.org/` },
      { name: "IntelX", url: `https://intelx.io/?s=${encodeURIComponent(target)}` },
    ];
    
    for (const svc of breachServices) {
      entities.push({
        id: makeEntityId(), type: "breach_check", value: svc.url,
        source: `breach_${svc.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 75,
        metadata: { target, service: svc.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "breach_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 16. Pastebin Search ----
export const pastebinSearchModule: OSINTModule = {
  id: "pastebin_search",
  name: "Pastebin & Leak Search",
  category: "web",
  targetTypes: ["email", "username", "domain"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "pastebin_search", target } });
    
    const entities: any[] = [];
    
    const pasteServices = [
      { name: "Pastebin Google", url: `https://www.google.com/search?q=site:pastebin.com+"${encodeURIComponent(target)}"` },
      { name: "Ghostbin", url: `https://ghostbin.co/search?q=${encodeURIComponent(target)}` },
      { name: "0bin", url: `https://0bin.net/` },
      { name: "PrivateBin", url: `https://privatebin.net/` },
      { name: "PSBDump", url: `https://psbdmp.ws/` },
    ];
    
    for (const svc of pasteServices) {
      entities.push({
        id: makeEntityId(), type: "paste_search", value: svc.url,
        source: `paste_${svc.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 70,
        metadata: { target, service: svc.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "pastebin_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 17. GitHub/GitLab Leaks ----
export const repoLeakModule: OSINTModule = {
  id: "repo_leak_search",
  name: "Repository Leak Search",
  category: "web",
  targetTypes: ["email", "domain", "username"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "repo_leak_search", target } });
    
    const entities: any[] = [];
    
    const searches = [
      { name: "GitHub Code Search", url: `https://github.com/search?q="${encodeURIComponent(target)}"&type=code` },
      { name: "GitHub Commits", url: `https://github.com/search?q="${encodeURIComponent(target)}"&type=commits` },
      { name: "GitLab Search", url: `https://gitlab.com/search?search=${encodeURIComponent(target)}` },
      { name: "Grep.app", url: `https://grep.app/search?q=${encodeURIComponent(target)}` },
      { name: "GitLeaks", url: `https://github.com/zricethezav/gitleaks` },
    ];
    
    for (const search of searches) {
      entities.push({
        id: makeEntityId(), type: "repo_search", value: search.url,
        source: `repo_${search.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 80,
        metadata: { target, search_type: search.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "repo_leak_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 18. Cloud Storage Search ----
export const cloudStorageModule: OSINTModule = {
  id: "cloud_storage_search",
  name: "Cloud Storage Bucket Search",
  category: "web",
  targetTypes: ["domain", "username"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "cloud_storage_search", target } });
    
    const entities: any[] = [];
    
    const cloudChecks = [
      { name: "S3 Buckets", pattern: `https://s3.amazonaws.com/${target}/` },
      { name: "S3 Website", pattern: `http://${target}.s3-website-us-east-1.amazonaws.com/` },
      { name: "GCS Buckets", pattern: `https://storage.googleapis.com/${target}/` },
      { name: "Azure Blob", pattern: `https://${target}.blob.core.windows.net/` },
      { name: "DigitalOcean Spaces", pattern: `https://${target}.nyc3.digitaloceanspaces.com/` },
    ];
    
    for (const check of cloudChecks) {
      entities.push({
        id: makeEntityId(), type: "cloud_storage", value: check.pattern,
        source: `cloud_${check.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 50,
        metadata: { target, provider: check.name, note: "May return 403 even if bucket exists" },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "cloud_storage_search", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 19. Subdomain Enumeration Tools ----
export const subdomainToolsModule: OSINTModule = {
  id: "subdomain_tools",
  name: "Subdomain Enumeration Tools",
  category: "web",
  targetTypes: ["domain"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "subdomain_tools", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    const tools = [
      { name: "VirusTotal Subdomains", url: `https://www.virustotal.com/gui/domain/${domain}/relations` },
      { name: "SecurityTrails", url: `https://securitytrails.com/domain/${domain}` },
      { name: "Spyse Subdomains", url: `https://spyse.com/search?query=${domain}` },
      { name: "PentestTools", url: `https://pentest-tools.com/information-gathering/find-subdomains-of-domain?domain=${domain}` },
      { name: "C99 Subdomain Finder", url: `https://subdomainfinder.c99.nl/` },
    ];
    
    for (const tool of tools) {
      entities.push({
        id: makeEntityId(), type: "subdomain_tool", value: tool.url,
        source: `subdomain_${tool.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 80,
        metadata: { domain, tool: tool.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "subdomain_tools", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 20. Technology Detection ----
export const techDetectionModule: OSINTModule = {
  id: "tech_detection",
  name: "Web Technology Detection",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "tech_detection", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    const detectors = [
      { name: "Wappalyzer", url: `https://www.wappalyzer.com/lookup/${domain}/` },
      { name: "BuiltWith", url: `https://builtwith.com/${domain}` },
      { name: "WhatWeb (Docker)", url: "docker:whatweb" },
      { name: "Netcraft", url: `https://sitereport.netcraft.com/?url=http://${domain}` },
      { name: "WhatRuns", url: `https://www.whatruns.com/?url=${domain}` },
    ];
    
    for (const det of detectors) {
      entities.push({
        id: makeEntityId(), type: "tech_detector", value: det.url,
        source: `tech_${det.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 75,
        metadata: { domain, detector: det.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "tech_detection", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 21. Web Archive Alternatives ----
export const archiveAlternativesModule: OSINTModule = {
  id: "archive_alternatives",
  name: "Web Archive Alternative Sources",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "archive_alternatives", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    const archives = [
      { name: "Archive.org", url: `https://web.archive.org/web/*/${domain}` },
      { name: "Archive.today", url: `https://archive.today/${domain}` },
      { name: "UK Web Archive", url: `https://www.webarchive.org.uk/ukwa/search?view=table&query=${domain}` },
      { name: "Library of Congress", url: `https://www.loc.gov/webarchiving/` },
      { name: "Stanford Web Archive", url: `https://swap.stanford.edu/` },
    ];
    
    for (const archive of archives) {
      entities.push({
        id: makeEntityId(), type: "web_archive", value: archive.url,
        source: `archive_${archive.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 70,
        metadata: { domain, archive: archive.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "archive_alternatives", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 22. Website Speed/Performance ----
export const webPerformanceModule: OSINTModule = {
  id: "web_performance",
  name: "Website Performance Analysis",
  category: "web",
  targetTypes: ["url", "domain"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "web_performance", target } });
    
    const entities: any[] = [];
    const url = target.startsWith("http") ? target : `https://${target}`;
    
    const tools = [
      { name: "PageSpeed Insights", url: `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}` },
      { name: "GTmetrix", url: `https://gtmetrix.com/?url=${encodeURIComponent(url)}` },
      { name: "Pingdom", url: `https://tools.pingdom.com/?url=${encodeURIComponent(url)}` },
      { name: "WebPageTest", url: `https://www.webpagetest.org/?url=${encodeURIComponent(url)}` },
    ];
    
    for (const tool of tools) {
      entities.push({
        id: makeEntityId(), type: "perf_tool", value: tool.url,
        source: `perf_${tool.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 80,
        metadata: { url, tool: tool.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "web_performance", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 23. DNS History ----
export const dnsHistoryModule: OSINTModule = {
  id: "dns_history",
  name: "DNS History Lookup",
  category: "web",
  targetTypes: ["domain"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "dns_history", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    const historyTools = [
      { name: "SecurityTrails History", url: `https://securitytrails.com/domain/${domain}/history` },
      { name: "DNS History", url: `https://dnshistory.org/historical-dns-records/a/${domain}` },
      { name: "ViewDNS History", url: `https://viewdns.info/iphistory/?domain=${domain}` },
      { name: "DNSChecker History", url: `https://dnschecker.org/history.php?domain=${domain}` },
    ];
    
    for (const tool of historyTools) {
      entities.push({
        id: makeEntityId(), type: "dns_history", value: tool.url,
        source: `dns_hist_${tool.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 75,
        metadata: { domain, tool: tool.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "dns_history", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 24. Email Header Analysis ----
export const emailHeaderModule: OSINTModule = {
  id: "email_header_analysis",
  name: "Email Header Analysis Tools",
  category: "web",
  targetTypes: ["email"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "email_header_analysis", target } });
    
    const entities: any[] = [];
    
    const tools = [
      { name: "MXToolbox Headers", url: `https://mxtoolbox.com/Public/Content/EmailHeaders.aspx` },
      { name: "Google Header Analyzer", url: `https://toolbox.googleapps.com/apps/messageheader/analyzeheader` },
      { name: "DMARCian", url: `https://dmarcian.com/` },
      { name: "Mail Header Analyzer", url: `https://mha.azurewebsites.net/` },
    ];
    
    for (const tool of tools) {
      entities.push({
        id: makeEntityId(), type: "email_tool", value: tool.url,
        source: `email_${tool.name.toLowerCase().replace(/\s/g, "_")}`, confidence: 80,
        metadata: { email: target, tool: tool.name, note: "Paste email headers to analyze" },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "email_header_analysis", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 25. Google Dork Generator ----
export const googleDorkModule: OSINTModule = {
  id: "google_dork_generator",
  name: "Google Dork Generator",
  category: "web",
  targetTypes: ["domain", "url", "username"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "google_dork_generator", target } });
    
    const entities: any[] = [];
    const domain = target.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    const dorks = [
      { name: "site", query: `site:${domain}`, url: `https://www.google.com/search?q=site:${domain}` },
      { name: "intitle", query: `intitle:"${domain}"`, url: `https://www.google.com/search?q=intitle:%22${domain}%22` },
      { name: "inurl", query: `inurl:${domain}`, url: `https://www.google.com/search?q=inurl:${domain}` },
      { name: "filetype", query: `site:${domain} filetype:pdf`, url: `https://www.google.com/search?q=site:${domain}+filetype:pdf` },
      { name: "directory_listing", query: `site:${domain} intitle:index.of`, url: `https://www.google.com/search?q=site:${domain}+intitle:index.of` },
      { name: "admin_pages", query: `site:${domain} (admin OR login OR wp-admin)`, url: `https://www.google.com/search?q=site:${domain}+(admin+OR+login+OR+wp-admin)` },
      { name: "sensitive_files", query: `site:${domain} (config OR .env OR .git)`, url: `https://www.google.com/search?q=site:${domain}+(config+OR+.env+OR+.git)` },
      { name: "exposed_cgi", query: `site:${domain} ext:cgi`, url: `https://www.google.com/search?q=site:${domain}+ext:cgi` },
    ];
    
    for (const dork of dorks) {
      entities.push({
        id: makeEntityId(), type: "google_dork", value: dork.url,
        source: `dork_${dork.name}`, confidence: 85,
        metadata: { target, query: dork.query, type: dork.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "google_dork_generator", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// Export all web-advanced modules
export const webAdvancedModules = [
  waybackAdvancedModule,
  commonCrawlModule,
  urlscanAdvancedModule,
  virustotalUrlModule,
  safeBrowsingModule,
  screenshotModule,
  whoisAdvancedModule,
  dnsDeepModule,
  sslAnalysisModule,
  ipGeolocationModule,
  shodanModule,
  censysModule,
  fofaModule,
  torSearchModule,
  breachSearchModule,
  pastebinSearchModule,
  repoLeakModule,
  cloudStorageModule,
  subdomainToolsModule,
  techDetectionModule,
  archiveAlternativesModule,
  webPerformanceModule,
  dnsHistoryModule,
  emailHeaderModule,
  googleDorkModule,
];
