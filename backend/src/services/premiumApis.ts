/**
 * Premium APIs Integration - Connecteurs pour services OSINT payants
 * HaveIBeenPwned, Shodan, VirusTotal, AbuseIPDB, IPinfo
 */

import axios from "axios";
import { logger } from "../utils/logger";
import { opsecManager } from "./opsecManager";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface APIConfig {
  haveibeenpwned?: { apiKey: string; enabled: boolean };
  shodan?: { apiKey: string; enabled: boolean };
  virustotal?: { apiKey: string; enabled: boolean };
  abuseipdb?: { apiKey: string; enabled: boolean };
  ipinfo?: { apiKey: string; enabled: boolean };
  clearbit?: { apiKey: string; enabled: boolean };
  hunter?: { apiKey: string; enabled: boolean }; // Email finder
  phoneinfoga?: { enabled: boolean }; // Local tool
}

// Charge depuis les variables d'environnement
const config: APIConfig = {
  haveibeenpwned: {
    apiKey: process.env.HIBP_API_KEY || "",
    enabled: !!process.env.HIBP_API_KEY
  },
  shodan: {
    apiKey: process.env.SHODAN_API_KEY || "",
    enabled: !!process.env.SHODAN_API_KEY
  },
  virustotal: {
    apiKey: process.env.VT_API_KEY || "",
    enabled: !!process.env.VT_API_KEY
  },
  abuseipdb: {
    apiKey: process.env.ABUSEIPDB_API_KEY || "",
    enabled: !!process.env.ABUSEIPDB_API_KEY
  },
  ipinfo: {
    apiKey: process.env.IPINFO_API_KEY || "",
    enabled: !!process.env.IPINFO_API_KEY
  },
  clearbit: {
    apiKey: process.env.CLEARBIT_API_KEY || "",
    enabled: !!process.env.CLEARBIT_API_KEY
  },
  hunter: {
    apiKey: process.env.HUNTER_API_KEY || "",
    enabled: !!process.env.HUNTER_API_KEY
  },
  phoneinfoga: {
    enabled: true // Tool local
  }
};

// ============================================================================
// HAVE I BEEN PWNED - Breach Data
// ============================================================================

export interface BreachData {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  modifiedDate: string;
  pwnCount: number;
  description: string;
  dataClasses: string[];
  isVerified: boolean;
  isFabricated: boolean;
  isSensitive: boolean;
  isRetired: boolean;
  isSpamList: boolean;
  logoPath: string;
}

export interface PasteData {
  source: string;
  id: string;
  title?: string;
  date?: string;
  emailCount: number;
}

export async function checkHIBP(email: string): Promise<{ breaches: BreachData[]; pastes: PasteData[]; exposedData: string[] }> {
  if (!config.haveibeenpwned?.enabled) {
    logger.warn("[PremiumAPIs] HIBP not configured");
    return { breaches: [], pastes: [], exposedData: [] };
  }

  try {
    const opsec = await opsecManager.prepareRequest("haveibeenpwned.com", "hibp");

    // Breaches
    const breachesRes = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          "hibp-api-key": config.haveibeenpwned.apiKey,
          "User-Agent": opsec.fingerprint.userAgent,
          "Accept": "application/json"
        },
        timeout: 10000
      }
    );

    const breaches: BreachData[] = []; breachesRes.data || [];

    // Pastes
    let pastes: PasteData[] = [];
    try {
      const pastesRes = await axios.get(
        `https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(email)}`,
        {
          headers: {
            "hibp-api-key": config.haveibeenpwned.apiKey,
            "User-Agent": opsec.fingerprint.userAgent
          },
          timeout: 10000
        }
      );
      pastes = pastesRes.data || [];
    } catch (e) {
      // Pastes peuvent être vides
    }

    // Agrège les types de données exposées
    const exposedData = [...new Set(breaches.flatMap(b => b.dataClasses))];

    logger.info(`[HIBP] Found ${breaches.length} breaches for ${email}`);

    return { breaches, pastes, exposedData };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { breaches: [], pastes: [], exposedData: [] }; // Pas de breach
    }
    logger.error("[HIBP] Error:", error.message);
    return { breaches: [], pastes: [], exposedData: [] };
  }
}

// ============================================================================
// SHODAN - Infrastructure Intelligence
// ============================================================================

export interface ShodanHostData {
  ip: string;
  ports: number[];
  hostnames: string[];
  tags: string[];
  city?: string;
  country_name?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  org?: string;
  isp?: string;
  vulns?: string[];
  data: ShodanService[];
  lastUpdate: string;
}

export interface ShodanService {
  port: number;
  transport: string;
  product?: string;
  version?: string;
  cpe?: string[];
  banner?: string;
  ssl?: {
    cert?: {
      subject?: { CN?: string; O?: string };
      issuer?: { CN?: string; O?: string };
      expired?: boolean;
    };
    versions?: string[];
  };
  http?: {
    title?: string;
    server?: string;
    host?: string;
  };
  location?: {
    city?: string;
    country_name?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface ShodanSearchResult {
  matches: ShodanHostData[];
  total: number;
  facets?: Record<string, any>;
}

export async function shodanHost(ip: string): Promise<ShodanHostData | null> {
  if (!config.shodan?.enabled) {
    logger.warn("[PremiumAPIs] Shodan not configured");
    return null;
  }

  try {
    const opsec = await opsecManager.prepareRequest("shodan.io", "shodan");

    const response = await axios.get(
      `https://api.shodan.io/shodan/host/${ip}?key=${config.shodan.apiKey}`,
      {
        headers: { "User-Agent": opsec.fingerprint.userAgent },
        timeout: 15000
      }
    );

    logger.info(`[Shodan] Retrieved data for ${ip}: ${response.data.ports?.length || 0} ports`);

    return response.data as ShodanHostData;
  } catch (error: any) {
    logger.error("[Shodan] Error:", error.message);
    return null;
  }
}

export async function shodanSearch(query: string, limit: number = 10): Promise<ShodanSearchResult> {
  if (!config.shodan?.enabled) {
    return { matches: [], total: 0 };
  }

  try {
    const opsec = await opsecManager.prepareRequest("shodan.io", "shodan");

    const response = await axios.get(
      `https://api.shodan.io/shodan/host/search`,
      {
        params: {
          key: config.shodan.apiKey,
          query,
          limit
        },
        headers: { "User-Agent": opsec.fingerprint.userAgent },
        timeout: 15000
      }
    );

    return response.data as ShodanHostData;
  } catch (error: any) {
    logger.error("[Shodan] Search error:", error.message);
    return { matches: [], total: 0 };
  }
}

export async function shodanDnsResolve(hostname: string): Promise<string | null> {
  if (!config.shodan?.enabled) return null;

  try {
    const response = await axios.get(
      `https://api.shodan.io/dns/resolve?hostnames=${hostname}&key=${config.shodan.apiKey}`,
      { timeout: 10000 }
    );
    return response.data[hostname] || null;
  } catch (error) {
    return null;
  }
}

export async function shodanDnsReverse(ip: string): Promise<string[]> {
  if (!config.shodan?.enabled) return [];

  try {
    const response = await axios.get(
      `https://api.shodan.io/dns/reverse?ips=${ip}&key=${config.shodan.apiKey}`,
      { timeout: 10000 }
    );
    return response.data[ip] || [];
  } catch (error) {
    return [];
  }
}

// ============================================================================
// VIRUSTOTAL - Threat Intelligence
// ============================================================================

export interface VTIPReport {
  data: {
    attributes: {
      last_analysis_stats: {
        harmless: number;
        malicious: number;
        suspicious: number;
        undetected: number;
      };
      last_analysis_results: Record<string, {
        category: string;
        result: string;
        method: string;
        engine_name: string;
      }>;
      asn?: number;
      as_owner?: string;
      country?: string;
      regional_internet_registry?: string;
      network?: string;
      tags?: string[];
      total_votes?: { harmless: number; malicious: number };
      reputation?: number;
    };
  };
}

export interface VTDomainReport {
  data: {
    attributes: {
      last_analysis_stats: {
        harmless: number;
        malicious: number;
        suspicious: number;
      };
      creation_date?: number;
      expiration_date?: number;
      registrar?: string;
      last_dns_records?: Array<{
        type: string;
        value: string;
        ttl?: number;
      }>;
      categories?: Record<string, string>;
      total_votes?: { harmless: number; malicious: number };
      reputation?: number;
    };
  };
}

export async function virustotalIP(ip: string): Promise<VTIPReport | null> {
  if (!config.virustotal?.enabled) {
    logger.warn("[PremiumAPIs] VirusTotal not configured");
    return null;
  }

  try {
    const opsec = await opsecManager.prepareRequest("virustotal.com", "virustotal");

    const response = await axios.get(
      `https://www.virustotal.com/api/v3/ip-addresses/${ip}`,
      {
        headers: {
          "x-apikey": config.virustotal.apiKey,
          "User-Agent": opsec.fingerprint.userAgent
        },
        timeout: 15000
      }
    );

    return response.data as ShodanHostData;
  } catch (error: any) {
    logger.error("[VirusTotal] IP error:", error.message);
    return null;
  }
}

export async function virustotalDomain(domain: string): Promise<VTDomainReport | null> {
  if (!config.virustotal?.enabled) return null;

  try {
    const response = await axios.get(
      `https://www.virustotal.com/api/v3/domains/${domain}`,
      {
        headers: { "x-apikey": config.virustotal.apiKey },
        timeout: 15000
      }
    );

    return response.data as ShodanHostData;
  } catch (error: any) {
    logger.error("[VirusTotal] Domain error:", error.message);
    return null;
  }
}

export function getVTScore(report: VTIPReport | VTDomainReport | null): { malicious: number; total: number; percentage: number } {
  if (!report?.data?.attributes?.last_analysis_stats) {
    return { malicious: 0, total: 0, percentage: 0 };
  }

  const stats = report.data.attributes.last_analysis_stats;
  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;
  const total = stats.harmless + malicious + suspicious + (stats.undetected || 0);

  return {
    malicious: malicious + suspicious,
    total,
    percentage: total > 0 ? Math.round(((malicious + suspicious) / total) * 100) : 0
  };
}

// ============================================================================
// ABUSEIPDB - IP Reputation
// ============================================================================

export interface AbuseIPDBReport {
  data: {
    ipAddress: string;
    isPublic: boolean;
    ipVersion: number;
    isWhitelisted: boolean;
    abuseConfidenceScore: number; // 0-100
    countryCode?: string;
    countryName?: string;
    usageType?: string;
    isp?: string;
    domain?: string;
    totalReports: number;
    numDistinctUsers: number;
    lastReportedAt?: string;
    reports?: Array<{
      reportedAt: string;
      comment: string;
      categories: number[];
      reporterId: number;
      reporterCountryCode?: string;
    }>;
  };
}

export async function checkAbuseIPDB(ip: string): Promise<AbuseIPDBReport | null> {
  if (!config.abuseipdb?.enabled) {
    logger.warn("[PremiumAPIs] AbuseIPDB not configured");
    return null;
  }

  try {
    const opsec = await opsecManager.prepareRequest("abuseipdb.com", "abuseipdb");

    const response = await axios.get(
      `https://api.abuseipdb.com/api/v2/check`,
      {
        params: {
          ipAddress: ip,
          maxAgeInDays: 90,
          verbose: true
        },
        headers: {
          "Key": config.abuseipdb.apiKey,
          "Accept": "application/json",
          "User-Agent": opsec.fingerprint.userAgent
        },
        timeout: 10000
      }
    );

    logger.info(`[AbuseIPDB] ${ip} confidence: ${response.data.data.abuseConfidenceScore}%`);

    return response.data as ShodanHostData;
  } catch (error: any) {
    logger.error("[AbuseIPDB] Error:", error.message);
    return null;
  }
}

// ============================================================================
// IPINFO - Geolocation & ASN
// ============================================================================

export interface IPinfoData {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  country_name?: string;
  loc?: string; // "lat,lng"
  org?: string; // "ASN Name"
  asn?: {
    asn: string;
    name: string;
    domain: string;
    route: string;
    type: string;
  };
  company?: {
    name: string;
    domain: string;
    type: string;
  };
  carrier?: {
    name: string;
    mcc: string;
    mnc: string;
  };
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    hosting: boolean;
  };
  abuse?: {
    address: string;
    country: string;
    email: string;
    name: string;
    network: string;
    phone: string;
  };
  domains?: {
    ip: string;
    total: number;
    domains: string[];
  };
}

export async function getIPinfo(ip: string): Promise<IPinfoData | null> {
  const token = config.ipinfo?.apiKey;
  const url = token
    ? `https://ipinfo.io/${ip}?token=${token}`
    : `https://ipinfo.io/${ip}/json`; // Version gratuite (rate limitée)

  try {
    const opsec = await opsecManager.prepareRequest("ipinfo.io", "ipinfo");

    const response = await axios.get(url, {
      headers: { "User-Agent": opsec.fingerprint.userAgent },
      timeout: 10000
    });

    return response.data as ShodanHostData;
  } catch (error: any) {
    logger.error("[IPinfo] Error:", error.message);
    return null;
  }
}

// ============================================================================
// CLEARBIT - Company/Person Enrichment
// ============================================================================

export interface ClearbitCompany {
  name: string;
  legalName?: string;
  domain: string;
  domainAliases?: string[];
  site?: {
    title?: string;
    h1?: string;
    metaDescription?: string;
    url?: string;
  };
  category?: {
    sector?: string;
    industry?: string;
    subIndustry?: string;
    industryGroup?: string;
  };
  tags?: string[];
  description?: string;
  foundedYear?: number;
  location?: string;
  timeZone?: string;
  utcOffset?: number;
  geo?: {
    streetNumber?: string;
    streetName?: string;
    subPremise?: string;
    city?: string;
    postalCode?: string;
    state?: string;
    stateCode?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  };
  identifiers?: {
    usEIN?: string;
  };
  phone?: string;
  metrics?: {
    raised?: number;
    employees?: number;
    employeesRange?: string;
    marketCap?: number;
    annualRevenue?: number;
    estimatedAnnualRevenue?: string;
    fiscalYearEnd?: number;
  };
  facebook?: { handle?: string; likes?: number };
  linkedin?: { handle?: string };
  twitter?: { handle?: string; followers?: number; location?: string; site?: string; status?: string; bio?: string; avatar?: string };
  crunchbase?: { handle?: string };
  emailProvider?: boolean;
  type?: string;
  ticker?: string;
  parent?: {
    domain?: string;
    name?: string;
  };
}

export interface ClearbitPerson {
  id?: string;
  name?: {
    fullName?: string;
    givenName?: string;
    familyName?: string;
  };
  email?: string;
  location?: string;
  timeZone?: string;
  utcOffset?: number;
  geo?: {
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  bio?: string;
  site?: string;
  avatar?: string;
  employment?: {
    domain?: string;
    name?: string;
    title?: string;
    role?: string;
    subRole?: string;
    seniority?: string;
  };
  facebook?: { handle?: string };
  github?: { handle?: string; id?: number; avatar?: string; company?: string; blog?: string; followers?: number; following?: number };
  twitter?: { handle?: string; id?: number; bio?: string; followers?: number; following?: number; location?: string; site?: string; status?: string; avatar?: string };
  linkedin?: { handle?: string };
  googleplus?: { handle?: string };
  gravatar?: {
    handle?: string;
    urls?: Array<{ value?: string; title?: string }>;
    avatar?: string;
    avatars?: Array<{ url?: string; type?: string }>;
  };
  fuzzy?: boolean;
  emailProvider?: boolean;
  indexedAt?: string;
}

export async function clearbitEnrichCompany(domain: string): Promise<ClearbitCompany | null> {
  if (!config.clearbit?.enabled) {
    logger.warn("[PremiumAPIs] Clearbit not configured");
    return null;
  }

  try {
    const response = await axios.get(
      `https://company.clearbit.com/v2/companies/find`,
      {
        params: { domain },
        headers: { Authorization: `Bearer ${config.clearbit.apiKey}` },
        timeout: 10000
      }
    );

    return response.data as ShodanHostData;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // Company not found
    }
    logger.error("[Clearbit] Company error:", error.message);
    return null;
  }
}

export async function clearbitEnrichPerson(email: string): Promise<ClearbitPerson | null> {
  if (!config.clearbit?.enabled) return null;

  try {
    const response = await axios.get(
      `https://person.clearbit.com/v2/people/find`,
      {
        params: { email },
        headers: { Authorization: `Bearer ${config.clearbit.apiKey}` },
        timeout: 10000
      }
    );

    return response.data as ShodanHostData;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    logger.error("[Clearbit] Person error:", error.message);
    return null;
  }
}

// ============================================================================
// HUNTER - Email Finder
// ============================================================================

export interface HunterDomain {
  domain: string;
  disposable: boolean;
  webmail: boolean;
  accept_all: boolean;
  pattern?: string;
  organization?: string;
  description?: string;
  emails: Array<{
    value: string;
    type: string;
    confidence: number;
    sources: Array<{
      domain: string;
      uri: string;
      extracted_on: string;
      last_seen_on: string;
      still_on_page: boolean;
    }>;
    first_name?: string;
    last_name?: string;
    position?: string;
    seniority?: string;
    department?: string;
    linkedin?: string;
    twitter?: string;
    phone_number?: string;
    verification?: {
      date: string;
      status: string;
    };
  }>;
}

export async function hunterDomainSearch(domain: string, limit: number = 10): Promise<HunterDomain | null> {
  if (!config.hunter?.enabled) {
    logger.warn("[PremiumAPIs] Hunter not configured");
    return null;
  }

  try {
    const response = await axios.get(
      `https://api.hunter.io/v2/domain-search`,
      {
        params: {
          domain,
          limit,
          api_key: config.hunter.apiKey
        },
        timeout: 10000
      }
    );

    return response.data.data;
  } catch (error: any) {
    logger.error("[Hunter] Error:", error.message);
    return null;
  }
}

export async function hunterEmailFinder(domain: string, firstName: string, lastName: string): Promise<{ email?: string; score?: number } | null> {
  if (!config.hunter?.enabled) return null;

  try {
    const response = await axios.get(
      `https://api.hunter.io/v2/email-finder`,
      {
        params: {
          domain,
          first_name: firstName,
          last_name: lastName,
          api_key: config.hunter.apiKey
        },
        timeout: 10000
      }
    );

    return {
      email: response.data.data.email,
      score: response.data.data.score
    };
  } catch (error: any) {
    logger.error("[Hunter] Finder error:", error.message);
    return null;
  }
}

// ============================================================================
// AGGREGATED ENRICHMENT
// ============================================================================

export interface EnrichedEntity {
  type: "ip" | "domain" | "email" | "company" | "person";
  value: string;
  timestamp: string;
  sources: string[];
  data: {
    shodan?: ShodanHostData;
    virustotal?: VTIPReport | VTDomainReport;
    abuseipdb?: AbuseIPDBReport;
    ipinfo?: IPinfoData;
    hibp?: { breaches: BreachData[]; pastes: PasteData[] };
    clearbit?: ClearbitCompany | ClearbitPerson;
    hunter?: HunterDomain;
  };
  risk: {
    score: number; // 0-100
    level: "low" | "medium" | "high" | "critical";
    factors: string[];
  };
}

export async function enrichEntity(type: "ip" | "domain" | "email" | "company", value: string): Promise<EnrichedEntity> {
  const result: EnrichedEntity = {
    type,
    value,
    timestamp: new Date().toISOString(),
    sources: [],
    data: {},
    risk: { score: 0, level: "low", factors: [] }
  };

  const riskFactors: string[] = [];
  let riskScore = 0;

  // IP Enrichment
  if (type === "ip") {
    // Shodan
    const shodan = await shodanHost(value);
    if (shodan) {
      result.data.shodan = shodan;
      result.sources.push("shodan");
      if (shodan.vulns?.length) {
        riskScore += shodan.vulns.length * 10;
        riskFactors.push(`${shodan.vulns.length} vulnerabilities detected`);
      }
    }

    // VirusTotal
    const vt = await virustotalIP(value);
    if (vt) {
      result.data.virustotal = vt;
      result.sources.push("virustotal");
      const vtScore = getVTScore(vt);
      if (vtScore.percentage > 0) {
        riskScore += vtScore.percentage;
        riskFactors.push(`${vtScore.percentage}% of security vendors flagged this IP`);
      }
    }

    // AbuseIPDB
    const abuse = await checkAbuseIPDB(value);
    if (abuse) {
      result.data.abuseipdb = abuse;
      result.sources.push("abuseipdb");
      riskScore += abuse.data.abuseConfidenceScore / 2;
      if (abuse.data.abuseConfidenceScore > 50) {
        riskFactors.push(`High abuse confidence: ${abuse.data.abuseConfidenceScore}%`);
      }
    }

    // IPinfo
    const ipinfo = await getIPinfo(value);
    if (ipinfo) {
      result.data.ipinfo = ipinfo;
      result.sources.push("ipinfo");
      if (ipinfo.privacy?.vpn) riskFactors.push("VPN detected");
      if (ipinfo.privacy?.proxy) riskFactors.push("Proxy detected");
      if (ipinfo.privacy?.tor) riskFactors.push("Tor exit node");
    }
  }

  // Domain Enrichment
  if (type === "domain") {
    // VirusTotal
    const vt = await virustotalDomain(value);
    if (vt) {
      result.data.virustotal = vt;
      result.sources.push("virustotal");
      const vtScore = getVTScore(vt);
      if (vtScore.percentage > 0) {
        riskScore += vtScore.percentage;
        riskFactors.push(`${vtScore.percentage}% of security vendors flagged this domain`);
      }
    }

    // Shodan search
    const shodanResult = await shodanSearch(`hostname:${value}`);
    if (shodanResult.total > 0) {
      result.sources.push("shodan");
      // Use first match if available
      if (shodanResult.matches[0]) {
        result.data.shodan = shodanResult.matches[0];
      }
    }

    // Clearbit
    const clearbit = await clearbitEnrichCompany(value);
    if (clearbit) {
      result.data.clearbit = clearbit;
      result.sources.push("clearbit");
    }

    // Hunter
    const hunter = await hunterDomainSearch(value);
    if (hunter) {
      result.data.hunter = hunter;
      result.sources.push("hunter");
    }
  }

  // Email Enrichment
  if (type === "email") {
    // HIBP
    const hibp = await checkHIBP(value);
    if (hibp.breaches.length > 0 || hibp.pastes.length > 0) {
      result.data.hibp = hibp;
      result.sources.push("haveibeenpwned");
      riskScore += hibp.breaches.length * 5;
      riskFactors.push(`Found in ${hibp.breaches.length} data breaches`);
    }

    // Clearbit Person
    const person = await clearbitEnrichPerson(value);
    if (person) {
      result.data.clearbit = person;
      result.sources.push("clearbit");
    }
  }

  // Company Enrichment
  if (type === "company") {
    const company = await clearbitEnrichCompany(value);
    if (company) {
      result.data.clearbit = company;
      result.sources.push("clearbit");
    }
  }

  // Calculate final risk
  riskScore = Math.min(100, riskScore);
  result.risk = {
    score: Math.round(riskScore),
    level: riskScore > 75 ? "critical" : riskScore > 50 ? "high" : riskScore > 25 ? "medium" : "low",
    factors: riskFactors
  };

  logger.info(`[PremiumAPIs] Enriched ${type}:${value} with ${result.sources.length} sources. Risk: ${result.risk.level}`);

  return result;
}

// ============================================================================
// STATUS & CONFIG
// ============================================================================

export function getPremiumAPIStatus(): { configured: string[]; missing: string[] } {
  const configured: string[] = [];
  const missing: string[] = [];

  for (const [name, cfg] of Object.entries(config)) {
    if (cfg?.enabled) {
      configured.push(name);
    } else {
      missing.push(name);
    }
  }

  return { configured, missing };
}

export function setAPIConfig(apiName: keyof APIConfig, apiKey: string): void {
  const cfg = config[apiName];
  if (cfg && 'apiKey' in cfg) {
    cfg.apiKey = apiKey;
    cfg.enabled = true;
    logger.info(`[PremiumAPIs] Configured ${apiName}`);
  }
}
