// ============ NETWORK INTELLIGENCE PRO TYPES ============

// Network Data Sources
export type NetworkSource = 
  | "shodan"
  | "censys"
  | "virustotal"
  | "passivetotal"
  | "securitytrails"
  | "crtsh"
  | "circl"
  | "bgpview"
  | "ripe"
  | "arin"
  | "greynoise"
  | "abuseipdb"
  | "ipinfo"
  | "maxmind";

// ============ SHODAN TYPES ============

export interface ShodanHost {
  ip: string;
  ip_str: string;
  asn: string;
  org: string;
  isp: string;
  os?: string;
  ports: number[];
  hostnames: string[];
  domains: string[];
  country_code: string;
  country_name: string;
  city: string;
  region_code: string;
  latitude: number;
  longitude: number;
  last_update: string;
  tags: string[];
  vulns: string[];
  data: ShodanService[];
  metadata: {
    scanner: string;
    query: string;
  };
}

export interface ShodanService {
  port: number;
  transport: "tcp" | "udp";
  product?: string;
  version?: string;
  cpe?: string[];
  banner?: string;
  data: string;
  asn?: string;
  hostnames?: string[];
  location?: {
    city?: string;
    region_code?: string;
    country_name?: string;
    latitude?: number;
    longitude?: number;
  };
  timestamp: string;
  ssl?: {
    versions: string[];
    cipher?: string;
    cert?: {
      expired: boolean;
      expires: string;
      issued: string;
      issuer: {
        CN?: string;
        O?: string;
        C?: string;
      };
      subject: {
        CN?: string;
        O?: string;
        C?: string;
      };
      fingerprint?: {
        sha256?: string;
        sha1?: string;
      };
      serial?: string;
    };
    chain?: string[];
  };
  http?: {
    title?: string;
    description?: string;
    status?: number;
    robots?: string;
    favicon?: {
      hash?: string;
      data?: string;
    };
    headers?: Record<string, string>;
    html?: string;
    redirects?: string[];
  };
  vulns?: string[];
  opts?: Record<string, unknown>;
}

export interface ShodanSearchResult {
  matches: ShodanHost[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface ShodanExploit {
  id: string;
  title: string;
  description: string;
  type: "exploit" | "cve" | "metasploit" | "packetstorm";
  cve?: string[];
  author?: string;
  date: string;
  platform?: string;
  port?: number;
  source: string;
  code?: string;
}

// ============ CENSYS TYPES ============

export interface CensysHost {
  ip: string;
  services: CensysService[];
  location: {
    continent: string;
    country: string;
    country_code: string;
    city?: string;
    postal_code?: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  autonomous_system: {
    asn: number;
    name: string;
    organization: string;
    country_code: string;
    description?: string;
    bgp_prefix?: string;
  };
  operating_system?: {
    product: string;
    vendor: string;
    version?: string;
  };
  dns?: {
    names?: string[];
    reverse_dns?: string;
  };
  last_updated_at: string;
}

export interface CensysService {
  port: number;
  service_name: string;
  transport_protocol: "TCP" | "UDP";
  extended_service_name?: string;
  certificate?: CensysCertificate;
  software?: Array<{
    product?: string;
    vendor?: string;
    version?: string;
    uniform_resource_identifier?: string;
  }>;
  banner?: string;
  http?: {
    request?: {
      uri?: string;
      method?: string;
    };
    response?: {
      protocol?: string;
      status_code?: number;
      status_reason?: string;
      headers?: Record<string, string[]>;
      body?: string;
      body_hash?: string;
      favicon?: {
        hash?: string;
        md5_hash?: string;
      };
      html_title?: string;
    };
  };
  tls?: {
    version?: string;
    cipher_suite?: string;
    certificate?: CensysCertificate;
    validation?: {
      browser_trusted?: boolean;
      browser_error?: string;
    };
  };
  ssh?: {
    banner?: string;
    fingerprint?: string;
    mac_algorithms?: string[];
    kex_algorithms?: string[];
    cipher_algorithms?: string[];
    server_host_key?: {
      fingerprint_sha256?: string;
      algorithm?: string;
    };
  };
  observed_at: string;
 perspective_id?: string;
  source_ip?: string;
}

export interface CensysCertificate {
  fingerprint_sha256?: string;
  fingerprint_sha1?: string;
  tbs_fingerprint?: string;
  serial_number?: string;
  subject_dn?: string;
  issuer_dn?: string;
  subject?: {
    common_name?: string[];
    organization?: string[];
    organizational_unit?: string[];
    country?: string[];
    locality?: string[];
    province?: string[];
    email_address?: string[];
  };
  issuer?: {
    common_name?: string[];
    organization?: string[];
    organizational_unit?: string[];
    country?: string[];
  };
  validity?: {
    start?: string;
    end?: string;
    length?: number;
  };
  signature_algorithm?: string;
  subject_key_info?: {
    algorithm?: string;
    rsa_public_key?: {
      length?: number;
      modulus?: string;
      exponent?: string;
    };
    fingerprint_sha256?: string;
  };
  names?: string[];
  parsed?: boolean;
}

// ============ CERTIFICATE TRANSPARENCY ============

export interface CTLogEntry {
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
  certificate?: {
    subject?: {
      CN?: string;
      O?: string;
      OU?: string[];
      L?: string;
      ST?: string;
      C?: string;
    };
    issuer?: {
      CN?: string;
      O?: string;
      C?: string;
    };
    fingerprint?: string;
    serial?: string;
    not_before?: string;
    not_after?: string;
    san?: string[];
  };
}

export interface SubdomainDiscovery {
  subdomain: string;
  source: NetworkSource;
  discovered_at: string;
  ip_addresses?: string[];
  cname?: string;
  certificate_info?: CTLogEntry;
  is_active: boolean;
  technologies?: string[];
  ports?: number[];
}

// ============ PASSIVE DNS ============

export interface PassiveDNSRecord {
  query: string;
  query_type: "domain" | "ip";
  rrname: string;
  rrtype: "A" | "AAAA" | "CNAME" | "MX" | "NS" | "PTR" | "SOA" | "TXT";
  rdata: string | string[];
  source: NetworkSource;
  first_seen: string;
  last_seen: string;
  count: number;
  tags?: string[];
}

export interface DNSHistory {
  domain: string;
  records: PassiveDNSRecord[];
  changes: Array<{
    date: string;
    type: "add" | "remove" | "change";
    record_type: string;
    value: string;
    previous_value?: string;
  }>;
  stats: {
    total_records: number;
    unique_ips: number;
    unique_domains: number;
    timespan_days: number;
  };
}

// ============ BGP & INFRASTRUCTURE ============

export interface BGPAnnouncement {
  asn: number;
  prefix: string;
  visibility: number;
  peer_asn: number;
  peer_ip: string;
  announced_at: string;
  withdrawn_at?: string;
  source: "bgpview" | "ripe" | "he";
}

export interface ASInfo {
  asn: number;
  name: string;
  description?: string;
  country_code?: string;
  organization?: string;
  registration_date?: string;
  ip_prefixes: string[];
  peers: Array<{
    asn: number;
    name: string;
    type: "upstream" | "downstream" | "peer";
  }>;
  outages: Array<{
    start: string;
    end?: string;
    duration_minutes?: number;
    affected_prefixes: number;
  }>;
  reputation: {
    score: number;
    classification: "safe" | "suspicious" | "malicious" | "unknown";
    tags: string[];
  };
}

export interface InfrastructureCluster {
  id: string;
  name: string;
  type: "hosting" | "cdn" | "cloud" | "residential" | "corporate" | "malicious";
  ip_ranges: string[];
  asn: number[];
  locations: string[];
  providers: string[];
  confidence: number;
  related_domains: string[];
}

// ============ THREAT INTELLIGENCE ============

export interface IPReputation {
  ip: string;
  reputation_score: number;
  classification: "safe" | "suspicious" | "malicious" | "unknown";
  categories: string[];
  first_seen?: string;
  last_seen?: string;
  sources: Array<{
    name: string;
    category?: string;
    url?: string;
  }>;
  reports?: Array<{
    reported_at: string;
    category: string;
    comment?: string;
  }>;
  geolocation?: {
    country?: string;
    city?: string;
    isp?: string;
    org?: string;
  };
  asn?: {
    number?: number;
    org?: string;
  };
  tor?: boolean;
  vpn?: boolean;
  proxy?: boolean;
  hosting?: boolean;
  scanner?: boolean;
  bot?: boolean;
  malware?: boolean;
  spam?: boolean;
}

export interface VulnerabilityScan {
  target: string;
  scan_time: string;
  scanner: string;
  findings: Array<{
    id: string;
    name: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    cvss?: number;
    cve?: string[];
    description: string;
    evidence?: string;
    port?: number;
    service?: string;
    remediation?: string;
    references?: string[];
  }>;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
}

// ============ NETWORK SCAN REQUESTS ============

export interface NetworkScanRequest {
  id: string;
  target: string;
  target_type: "ip" | "domain" | "asn" | "cidr";
  scan_types: Array<"shodan" | "censys" | "passive_dns" | "ct_logs" | "bgp" | "reputation" | "vulns">;
  depth: "quick" | "standard" | "deep";
  include_history: boolean;
  correlate_data: boolean;
  created_at: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
}

export interface NetworkScanResult {
  request: NetworkScanRequest;
  shodan?: ShodanHost;
  censys?: CensysHost;
  passive_dns?: DNSHistory;
  ct_logs?: CTLogEntry[];
  subdomains?: SubdomainDiscovery[];
  asn_info?: ASInfo;
  bgp_announcements?: BGPAnnouncement[];
  reputation?: IPReputation;
  vulnerabilities?: VulnerabilityScan;
  infrastructure?: InfrastructureCluster[];
  correlated_findings: Array<{
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    evidence: unknown;
    source: NetworkSource;
  }>;
  timeline: Array<{
    timestamp: string;
    event: string;
    source: NetworkSource;
    details?: string;
  }>;
  stats: {
    open_ports: number;
    services: number;
    subdomains: number;
    certificates: number;
    vulnerabilities: number;
    data_sources: number;
  };
  generated_at: string;
}

// ============ MONITORING ============

export interface NetworkMonitor {
  id: string;
  name: string;
  target: string;
  target_type: "ip" | "domain" | "asn" | "cidr";
  check_interval: number; // minutes
  last_check?: string;
  next_check?: string;
  status: "active" | "paused" | "error";
  alerts_enabled: boolean;
  alert_conditions: Array<{
    type: "new_port" | "new_service" | "new_vuln" | "cert_expiry" | "dns_change" | "reputation_change";
    severity: "critical" | "high" | "medium" | "low";
  }>;
  history: Array<{
    timestamp: string;
    event: string;
    severity: string;
    details: string;
  }>;
}

// ============ UTILITIES ============

export interface PortInfo {
  port: number;
  protocol: "tcp" | "udp";
  service?: string;
  product?: string;
  version?: string;
  common_uses: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  description: string;
}

export const COMMON_PORTS: Record<number, PortInfo> = {
  21: { port: 21, protocol: "tcp", service: "ftp", common_uses: ["File Transfer"], risk_level: "high", description: "File Transfer Protocol - Often unencrypted" },
  22: { port: 22, protocol: "tcp", service: "ssh", common_uses: ["Secure Shell"], risk_level: "medium", description: "Secure Shell remote access" },
  23: { port: 23, protocol: "tcp", service: "telnet", common_uses: ["Remote Access"], risk_level: "critical", description: "Telnet - Unencrypted remote access" },
  25: { port: 25, protocol: "tcp", service: "smtp", common_uses: ["Email"], risk_level: "medium", description: "Simple Mail Transfer Protocol" },
  53: { port: 53, protocol: "udp", service: "dns", common_uses: ["DNS"], risk_level: "low", description: "Domain Name System" },
  80: { port: 80, protocol: "tcp", service: "http", common_uses: ["Web"], risk_level: "medium", description: "HyperText Transfer Protocol" },
  443: { port: 443, protocol: "tcp", service: "https", common_uses: ["Secure Web"], risk_level: "low", description: "HTTP Secure (SSL/TLS)" },
  3306: { port: 3306, protocol: "tcp", service: "mysql", common_uses: ["Database"], risk_level: "high", description: "MySQL Database Server" },
  3389: { port: 3389, protocol: "tcp", service: "rdp", common_uses: ["Remote Desktop"], risk_level: "high", description: "Remote Desktop Protocol" },
  5432: { port: 5432, protocol: "tcp", service: "postgresql", common_uses: ["Database"], risk_level: "high", description: "PostgreSQL Database" },
  5900: { port: 5900, protocol: "tcp", service: "vnc", common_uses: ["Remote Access"], risk_level: "high", description: "Virtual Network Computing" },
  8080: { port: 8080, protocol: "tcp", service: "http-proxy", common_uses: ["Web Proxy", "Alt HTTP"], risk_level: "medium", description: "HTTP Alternate/Proxy" },
};

// Search operators for network queries
export const NETWORK_SEARCH_OPERATORS = {
  net: "net:192.168.1.0/24",
  asn: "asn:AS15169",
  port: "port:443",
  product: "product:Apache",
  version: "version:2.4.41",
  os: "os:Linux",
  country: "country:FR",
  city: "city:Paris",
  org: "org:Google",
  isp: "isp:Comcast",
  geo: "geo:48.8566,2.3522",
  hostname: "hostname:example.com",
  domain: "domain:example.com",
  ssl: "ssl:true",
  vuln: "vuln:CVE-2021-44228",
  before: "before:2024-01-01",
  after: "after:2023-01-01",
  hash: "hash:0x12345678",
} as const;
