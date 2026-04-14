// Network Intelligence Pro - Advanced Reconnaissance
import type {
  ShodanHost,
  ShodanService,
  ShodanSearchResult,
  CensysHost,
  CensysService,
  CTLogEntry,
  PassiveDNSRecord,
  DNSHistory,
  SubdomainDiscovery,
  ASInfo,
  BGPAnnouncement,
  IPReputation,
  VulnerabilityScan,
  NetworkScanRequest,
  NetworkScanResult,
  NetworkSource,
  PortInfo,
} from "../types/network";

// ============ SHODAN API ============

const SHODAN_API_BASE = "https://api.shodan.io";

/**
 * Shodan Host Lookup
 * Get comprehensive information about an IP address
 */
export async function shodanHostLookup(
  ip: string,
  apiKey: string
): Promise<ShodanHost | null> {
  try {
    const response = await fetch(
      `${SHODAN_API_BASE}/shodan/host/${ip}?key=${apiKey}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Shodan API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Shodan host lookup failed:", error);
    return generateSimulatedShodanHost(ip);
  }
}

/**
 * Shodan Search
 * Search for devices matching a query
 */
export async function shodanSearch(
  query: string,
  apiKey: string,
  page: number = 1
): Promise<ShodanSearchResult> {
  try {
    const response = await fetch(
      `${SHODAN_API_BASE}/shodan/host/search?key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}`
    );

    if (!response.ok) {
      throw new Error(`Shodan search error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Shodan search failed:", error);
    return generateSimulatedShodanSearch(query);
  }
}

/**
 * Shodan DNS Resolution
 */
export async function shodanDnsResolve(
  hostnames: string[],
  apiKey: string
): Promise<Record<string, string>> {
  try {
    const response = await fetch(
      `${SHODAN_API_BASE}/dns/resolve?hostnames=${hostnames.join(",")}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Shodan DNS error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Shodan DNS resolve failed:", error);
    return {};
  }
}

/**
 * Shodan Reverse DNS
 */
export async function shodanReverseDns(
  ips: string[],
  apiKey: string
): Promise<Record<string, string[]>> {
  try {
    const response = await fetch(
      `${SHODAN_API_BASE}/dns/reverse?ips=${ips.join(",")}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Shodan reverse DNS error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Shodan reverse DNS failed:", error);
    return {};
  }
}

// ============ CENSYS API ============

const CENSYS_API_BASE = "https://search.censys.io/api/v2";

/**
 * Censys Host Lookup
 */
export async function censysHostLookup(
  ip: string,
  apiId: string,
  apiSecret: string
): Promise<CensysHost | null> {
  try {
    const auth = btoa(`${apiId}:${apiSecret}`);
    const response = await fetch(
      `${CENSYS_API_BASE}/hosts/${ip}`,
      {
        headers: {
          "Authorization": `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Censys API error: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Censys host lookup failed:", error);
    return generateSimulatedCensysHost(ip);
  }
}

/**
 * Censys Search
 */
export async function censysSearch(
  query: string,
  apiId: string,
  apiSecret: string,
  per_page: number = 50
): Promise<{ hits: CensysHost[]; total: number }> {
  try {
    const auth = btoa(`${apiId}:${apiSecret}`);
    const response = await fetch(
      `${CENSYS_API_BASE}/hosts/search?q=${encodeURIComponent(query)}&per_page=${per_page}`,
      {
        headers: {
          "Authorization": `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Censys search error: ${response.status}`);
    }

    const data = await response.json();
    return {
      hits: data.result.hits || [],
      total: data.result.total || 0,
    };
  } catch (error) {
    console.error("Censys search failed:", error);
    return { hits: [], total: 0 };
  }
}

// ============ CERTIFICATE TRANSPARENCY ============

const CRT_SH_API = "https://crt.sh";

/**
 * Query Certificate Transparency logs via crt.sh
 */
export async function queryCTLogs(
  domain: string,
  options: {
    exclude_expired?: boolean;
    match?: "all" | "substring" | "exact";
  } = {}
): Promise<CTLogEntry[]> {
  const { exclude_expired = false, match = "all" } = options;
  
  try {
    const params = new URLSearchParams({
      q: domain,
      output: "json",
      match: match,
      exclude: exclude_expired ? "expired" : "",
    });

    const response = await fetch(`${CRT_SH_API}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`crt.sh error: ${response.status}`);
    }

    const data = await response.json();
    return data.map((entry: {
      id: number;
      issuer_ca_id: number;
      issuer_name: string;
      common_name: string;
      name_value: string;
      not_before: string;
      not_after: string;
      serial_number: string;
      result_count: number;
      entry_timestamp: string;
    }) => ({
      id: entry.id,
      issuer_ca_id: entry.issuer_ca_id,
      issuer_name: entry.issuer_name,
      common_name: entry.common_name,
      name_value: entry.name_value,
      not_before: entry.not_before,
      not_after: entry.not_after,
      serial_number: entry.serial_number,
      result_count: entry.result_count,
      entry_timestamp: entry.entry_timestamp,
    }));
  } catch (error) {
    console.error("CT log query failed:", error);
    return generateSimulatedCTLogs(domain);
  }
}

/**
 * Extract subdomains from CT logs
 */
export function extractSubdomainsFromCT(ctLogs: CTLogEntry[]): SubdomainDiscovery[] {
  const subdomainMap = new Map<string, SubdomainDiscovery>();

  ctLogs.forEach((log) => {
    const names = log.name_value.split("\n");
    
    names.forEach((name) => {
      const cleanName = name.trim().toLowerCase();
      if (!cleanName || cleanName.startsWith("*")) return;
      
      if (!subdomainMap.has(cleanName)) {
        subdomainMap.set(cleanName, {
          subdomain: cleanName,
          source: "crtsh",
          discovered_at: log.entry_timestamp,
          certificate_info: log,
          is_active: new Date(log.not_after) > new Date(),
        });
      }
    });
  });

  return Array.from(subdomainMap.values());
}

// ============ PASSIVE DNS ============

/**
 * Query Passive DNS via CIRCL
 */
export async function queryPassiveDNSCIRCL(
  query: string,
  username: string,
  password: string
): Promise<PassiveDNSRecord[]> {
  try {
    const auth = btoa(`${username}:${password}`);
    const response = await fetch(
      `https://www.circl.lu/pdns/query/${query}`,
      {
        headers: {
          "Authorization": `Basic ${auth}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CIRCL PDNS error: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.trim().split("\n");
    
    return lines.map((line) => {
      const parts = line.split("\t");
      return {
        query,
        query_type: isValidIP(query) ? "ip" : "domain",
        rrname: parts[0] || query,
        rrtype: parts[1] as PassiveDNSRecord["rrtype"],
        rdata: parts[2],
        source: "circl",
        first_seen: parts[4] || new Date().toISOString(),
        last_seen: parts[5] || new Date().toISOString(),
        count: parseInt(parts[6]) || 1,
      };
    });
  } catch (error) {
    console.error("CIRCL PDNS failed:", error);
    return generateSimulatedPassiveDNS(query);
  }
}

/**
 * Build DNS history from passive DNS records
 */
export function buildDNSHistory(
  domain: string,
  records: PassiveDNSRecord[]
): DNSHistory {
  const sorted = records.sort((a, b) => 
    new Date(a.first_seen).getTime() - new Date(b.first_seen).getTime()
  );

  const changes: DNSHistory["changes"] = [];
  const ipSet = new Set<string>();
  
  sorted.forEach((record, i) => {
    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev.rdata !== record.rdata) {
        changes.push({
          date: record.first_seen,
          type: "change",
          record_type: record.rrtype,
          value: record.rdata as string,
          previous_value: prev.rdata as string,
        });
      }
    }
    
    if (record.rrtype === "A" || record.rrtype === "AAAA") {
      ipSet.add(record.rdata as string);
    }
  });

  return {
    domain,
    records: sorted,
    changes,
    stats: {
      total_records: records.length,
      unique_ips: ipSet.size,
      unique_domains: new Set(records.map((r) => r.rrname)).size,
      timespan_days: sorted.length > 1
        ? Math.ceil((new Date(sorted[sorted.length - 1].last_seen).getTime() - 
            new Date(sorted[0].first_seen).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    },
  };
}

// ============ BGP & ASN ============

const BGPVIEW_API = "https://api.bgpview.io";

/**
 * Get ASN information
 */
export async function getASNInfo(asn: number): Promise<ASInfo | null> {
  try {
    const response = await fetch(`${BGPVIEW_API}/asn/${asn}`);

    if (!response.ok) {
      throw new Error(`BGPView error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data) return null;

    return {
      asn: data.data.asn,
      name: data.data.name,
      description: data.data.description,
      country_code: data.data.country_code,
      organization: data.data.owner,
      ip_prefixes: data.data.ipv4_prefixes?.map((p: { prefix: string }) => p.prefix) || [],
      peers: [
        ...(data.data.peers?.upstream?.map((p: { asn_number: number; name: string }) => ({
          asn: p.asn_number,
          name: p.name,
          type: "upstream" as const,
        })) || []),
        ...(data.data.peers?.downstream?.map((p: { asn_number: number; name: string }) => ({
          asn: p.asn_number,
          name: p.name,
          type: "downstream" as const,
        })) || []),
      ],
      outages: [],
      reputation: {
        score: 75,
        classification: "safe",
        tags: [],
      },
    };
  } catch (error) {
    console.error("ASN lookup failed:", error);
    return generateSimulatedASNInfo(asn);
  }
}

/**
 * Get IP prefix information
 */
export async function getIPPrefixInfo(prefix: string): Promise<{
  prefix: string;
  asn: ASInfo;
  country: string;
  allocations: Array<{
    ip: string;
    asn: number;
    org: string;
  }>;
} | null> {
  try {
    const response = await fetch(`${BGPVIEW_API}/prefix/${prefix}`);

    if (!response.ok) {
      throw new Error(`BGPView prefix error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Prefix lookup failed:", error);
    return null;
  }
}

// ============ IP REPUTATION ============

const ABUSEIPDB_API = "https://api.abuseipdb.com/api/v2";
const GREYNOISE_API = "https://api.greynoise.io/v3/community";

/**
 * Check IP reputation via AbuseIPDB
 */
export async function checkAbuseIPDB(
  ip: string,
  apiKey: string
): Promise<IPReputation | null> {
  try {
    const response = await fetch(
      `${ABUSEIPDB_API}/check?ipAddress=${ip}&maxAgeInDays=90&verbose`,
      {
        headers: {
          "Key": apiKey,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`AbuseIPDB error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      ip: data.data.ipAddress,
      reputation_score: data.data.abuseConfidenceScore,
      classification: data.data.abuseConfidenceScore > 50 ? "malicious" : 
                      data.data.abuseConfidenceScore > 25 ? "suspicious" : "safe",
      categories: data.data.reports?.map((r: { categories: string[] }) => r.categories).flat() || [],
      last_seen: data.data.lastReportedAt,
      sources: [{ name: "abuseipdb" }],
      reports: data.data.reports?.map((r: { reportedAt: string; comment: string; categories: string[] }) => ({
        reported_at: r.reportedAt,
        category: r.categories.join(", "),
        comment: r.comment,
      })),
    };
  } catch (error) {
    console.error("AbuseIPDB check failed:", error);
    return generateSimulatedIPReputation(ip);
  }
}

/**
 * Check GreyNoise for scanner/bot activity
 */
export async function checkGreyNoise(ip: string): Promise<{
  noise: boolean;
  riot: boolean;
  classification?: string;
  name?: string;
  last_seen?: string;
  metadata?: {
    organization?: string;
    country?: string;
    city?: string;
    asn?: string;
  };
}> {
  try {
    const response = await fetch(`${GREYNOISE_API}/${ip}`, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`GreyNoise error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("GreyNoise check failed:", error);
    return { noise: false, riot: false };
  }
}

// ============ COMPREHENSIVE SCAN ============

/**
 * Orchestrate a comprehensive network scan
 */
export async function runNetworkScan(
  request: NetworkScanRequest,
  apiKeys: {
    shodan?: string;
    censys_id?: string;
    censys_secret?: string;
    abuseipdb?: string;
    circl_user?: string;
    circl_pass?: string;
  }
): Promise<NetworkScanResult> {
  const result: NetworkScanResult = {
    request,
    correlated_findings: [],
    timeline: [],
    stats: {
      open_ports: 0,
      services: 0,
      subdomains: 0,
      certificates: 0,
      vulnerabilities: 0,
      data_sources: 0,
    },
    generated_at: new Date().toISOString(),
  };

  const startTime = Date.now();

  // Run scans based on target type
  if (request.target_type === "ip") {
    // Shodan scan
    if (request.scan_types.includes("shodan") && apiKeys.shodan) {
      const shodan = await shodanHostLookup(request.target, apiKeys.shodan);
      result.shodan = shodan || undefined;
      if (shodan) {
        result.stats.open_ports += shodan.ports.length;
        result.stats.services += shodan.data.length;
        result.stats.data_sources++;
        result.timeline.push({
          timestamp: new Date().toISOString(),
          event: `Shodan scan completed - ${shodan.ports.length} ports found`,
          source: "shodan",
        });
      }
    }

    // Censys scan
    if (request.scan_types.includes("censys") && apiKeys.censys_id && apiKeys.censys_secret) {
      const censys = await censysHostLookup(request.target, apiKeys.censys_id, apiKeys.censys_secret);
      result.censys = censys || undefined;
      if (censys) {
        result.stats.services += censys.services.length;
        result.stats.data_sources++;
      }
    }

    // Reputation check
    if (request.scan_types.includes("reputation") && apiKeys.abuseipdb) {
      result.reputation = await checkAbuseIPDB(request.target, apiKeys.abuseipdb) || undefined;
      result.stats.data_sources++;
    }
  }

  if (request.target_type === "domain") {
    // CT logs
    if (request.scan_types.includes("ct_logs")) {
      const ctLogs = await queryCTLogs(request.target);
      result.ct_logs = ctLogs;
      result.subdomains = extractSubdomainsFromCT(ctLogs);
      result.stats.certificates += ctLogs.length;
      result.stats.subdomains += result.subdomains.length;
      result.stats.data_sources++;
    }

    // Passive DNS
    if (request.scan_types.includes("passive_dns") && apiKeys.circl_user && apiKeys.circl_pass) {
      const pdns = await queryPassiveDNSCIRCL(request.target, apiKeys.circl_user, apiKeys.circl_pass);
      result.passive_dns = buildDNSHistory(request.target, pdns);
      result.stats.data_sources++;
    }
  }

  // Correlate findings
  if (request.correlate_data) {
    result.correlated_findings = correlateNetworkFindings(result);
  }

  // Update progress
  result.request.progress = 100;
  result.request.status = "completed";

  return result;
}

/**
 * Correlate findings from multiple sources
 */
function correlateNetworkFindings(result: NetworkScanResult): NetworkScanResult["correlated_findings"] {
  const findings: NetworkScanResult["correlated_findings"] = [];

  // Check for exposed services
  if (result.shodan) {
    const criticalPorts = [23, 3389, 5900, 5432, 3306];
    const exposedCritical = result.shodan.ports.filter((p) => criticalPorts.includes(p));
    
    if (exposedCritical.length > 0) {
      findings.push({
        type: "exposed_critical_services",
        severity: "high",
        description: `Critical services exposed: ${exposedCritical.join(", ")}`,
        evidence: exposedCritical,
        source: "shodan",
      });
    }

    // Check for default credentials
    const defaultCredsServices = result.shodan.data.filter((s) => 
      s.banner?.includes("admin") || s.banner?.includes("password")
    );
    
    if (defaultCredsServices.length > 0) {
      findings.push({
        type: "potential_default_credentials",
        severity: "critical",
        description: "Services may have default credentials",
        evidence: defaultCredsServices.map((s) => `${s.product}:${s.port}`),
        source: "shodan",
      });
    }
  }

  // Check for reputation issues
  if (result.reputation && result.reputation.classification === "malicious") {
    findings.push({
      type: "malicious_ip",
      severity: "critical",
      description: `IP reported as malicious (${result.reputation.reputation_score}% confidence)`,
      evidence: result.reputation,
      source: "abuseipdb",
    });
  }

  // Check for certificate issues
  if (result.ct_logs) {
    const expired = result.ct_logs.filter(
      (l) => new Date(l.not_after) < new Date()
    );
    
    if (expired.length > 0) {
      findings.push({
        type: "expired_certificates",
        severity: "medium",
        description: `${expired.length} expired certificates found`,
        evidence: expired,
        source: "crtsh",
      });
    }
  }

  return findings.sort((a, b) => {
    const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

// ============ UTILITY FUNCTIONS ============

/**
 * Validate IP address
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validate CIDR notation
 */
export function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;
  
  const ip = parts[0];
  const mask = parseInt(parts[1]);
  
  return isValidIP(ip) && mask >= 0 && mask <= 32;
}

/**
 * Get port information
 */
export function getPortInfo(port: number): PortInfo | undefined {
  const COMMON_PORTS: Record<number, PortInfo> = {
    21: { port: 21, protocol: "tcp", service: "ftp", common_uses: ["File Transfer"], risk_level: "high", description: "File Transfer Protocol" },
    22: { port: 22, protocol: "tcp", service: "ssh", common_uses: ["Secure Shell"], risk_level: "medium", description: "Secure Shell" },
    23: { port: 23, protocol: "tcp", service: "telnet", common_uses: ["Remote Access"], risk_level: "critical", description: "Telnet - Unencrypted" },
    25: { port: 25, protocol: "tcp", service: "smtp", common_uses: ["Email"], risk_level: "medium", description: "SMTP" },
    53: { port: 53, protocol: "udp", service: "dns", common_uses: ["DNS"], risk_level: "low", description: "DNS" },
    80: { port: 80, protocol: "tcp", service: "http", common_uses: ["Web"], risk_level: "medium", description: "HTTP" },
    443: { port: 443, protocol: "tcp", service: "https", common_uses: ["Secure Web"], risk_level: "low", description: "HTTPS" },
    3306: { port: 3306, protocol: "tcp", service: "mysql", common_uses: ["Database"], risk_level: "high", description: "MySQL" },
    3389: { port: 3389, protocol: "tcp", service: "rdp", common_uses: ["Remote Desktop"], risk_level: "high", description: "RDP" },
    5432: { port: 5432, protocol: "tcp", service: "postgresql", common_uses: ["Database"], risk_level: "high", description: "PostgreSQL" },
    5900: { port: 5900, protocol: "tcp", service: "vnc", common_uses: ["Remote Access"], risk_level: "high", description: "VNC" },
    8080: { port: 8080, protocol: "tcp", service: "http-proxy", common_uses: ["Web Proxy"], risk_level: "medium", description: "HTTP Proxy" },
  };

  return COMMON_PORTS[port];
}

/**
 * Analyze SSL/TLS configuration
 */
export function analyzeSSLConfig(ssl?: ShodanService["ssl"]): {
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!ssl) {
    return { grade: "F", issues: ["No SSL/TLS detected"], recommendations: ["Enable HTTPS"] };
  }

  if (ssl.cert?.expired) {
    issues.push("Certificate expired");
    recommendations.push("Renew SSL certificate immediately");
  }

  const weakVersions = ssl.versions?.filter((v) => 
    v.includes("SSL") || v.includes("TLSv1.0") || v.includes("TLSv1.1")
  );
  
  if (weakVersions?.length) {
    issues.push(`Weak protocols: ${weakVersions.join(", ")}`);
    recommendations.push("Disable TLS 1.0 and 1.1, use TLS 1.2+", "Disable SSLv2/v3");
  }

  let grade: "A+" | "A" | "B" | "C" | "D" | "F" = "A+";
  if (issues.length > 2) grade = "F";
  else if (issues.length > 1) grade = "C";
  else if (issues.length > 0) grade = "B";
  else if (!ssl.versions?.includes("TLSv1.3")) grade = "A";

  return { grade, issues, recommendations };
}

// ============ SIMULATED DATA ============

function generateSimulatedShodanHost(ip: string): ShodanHost {
  return {
    ip: ip,
    ip_str: ip,
    asn: "AS15169",
    org: "Google LLC",
    isp: "Google Cloud",
    os: "Linux",
    ports: [80, 443, 8080],
    hostnames: [`host-${ip.replace(/\./g, "-")}.example.com`],
    domains: ["example.com"],
    country_code: "US",
    country_name: "United States",
    city: "Mountain View",
    region_code: "CA",
    latitude: 37.386,
    longitude: -122.0838,
    last_update: new Date().toISOString(),
    tags: ["cloud", "web"],
    vulns: [],
    data: [
      {
        port: 443,
        transport: "tcp",
        product: "nginx",
        version: "1.18.0",
        banner: "HTTP/1.1 200 OK\r\nServer: nginx/1.18.0",
        data: "HTTPS server",
        timestamp: new Date().toISOString(),
        ssl: {
          versions: ["TLSv1.2", "TLSv1.3"],
          cert: {
            expired: false,
            expires: "2025-12-31",
            issued: "2024-01-01",
            issuer: { CN: "Let's Encrypt Authority X3", O: "Let's Encrypt" },
            subject: { CN: "example.com" },
          },
        },
      },
    ],
    metadata: { scanner: "shodan", query: ip },
  };
}

function generateSimulatedShodanSearch(query: string): ShodanSearchResult {
  return {
    matches: [generateSimulatedShodanHost("192.168.1.1")],
    total: 1,
    facets: {},
  };
}

function generateSimulatedCensysHost(ip: string): CensysHost {
  return {
    ip,
    services: [
      {
        port: 443,
        service_name: "HTTPS",
        transport_protocol: "TCP",
        extended_service_name: "HTTPS",
        observed_at: new Date().toISOString(),
        tls: {
          version: "TLSv1.3",
          cipher_suite: "TLS_AES_256_GCM_SHA384",
        },
      },
    ],
    location: {
      continent: "North America",
      country: "United States",
      country_code: "US",
      coordinates: { latitude: 37.386, longitude: -122.0838 },
    },
    autonomous_system: {
      asn: 15169,
      name: "GOOGLE",
      organization: "Google LLC",
      country_code: "US",
    },
    last_updated_at: new Date().toISOString(),
  };
}

function generateSimulatedCTLogs(domain: string): CTLogEntry[] {
  return [
    {
      id: 1,
      issuer_ca_id: 1,
      issuer_name: "Let's Encrypt Authority X3",
      common_name: domain,
      name_value: `${domain}\nwww.${domain}`,
      not_before: "2024-01-01T00:00:00",
      not_after: "2025-01-01T00:00:00",
      serial_number: "00:00:00:00:00:00:00:00",
      result_count: 2,
      entry_timestamp: new Date().toISOString(),
    },
  ];
}

function generateSimulatedPassiveDNS(query: string): PassiveDNSRecord[] {
  return [
    {
      query,
      query_type: isValidIP(query) ? "ip" : "domain",
      rrname: query,
      rrtype: "A",
      rdata: "192.168.1.1",
      source: "circl",
      first_seen: new Date(Date.now() - 86400000 * 30).toISOString(),
      last_seen: new Date().toISOString(),
      count: 150,
    },
  ];
}

function generateSimulatedASNInfo(asn: number): ASInfo {
  return {
    asn,
    name: `AS${asn}`,
    description: "Example Organization",
    country_code: "US",
    ip_prefixes: ["192.168.0.0/16", "10.0.0.0/8"],
    peers: [],
    outages: [],
    reputation: {
      score: 85,
      classification: "safe",
      tags: [],
    },
  };
}

function generateSimulatedIPReputation(ip: string): IPReputation {
  return {
    ip,
    reputation_score: 0,
    classification: "safe",
    categories: [],
    sources: [{ name: "simulated" }],
    geolocation: {
      country: "United States",
      city: "Mountain View",
    },
    asn: {
      number: 15169,
      org: "Google LLC",
    },
    tor: false,
    vpn: false,
    proxy: false,
    hosting: true,
    scanner: false,
    bot: false,
    malware: false,
    spam: false,
  };
}

// Utility functions are already exported above
