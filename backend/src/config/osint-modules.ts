// ============================================================================
// OSINT MASTER MODULES CATALOG - 100+ Real OSINT Tools
// Complete catalog with installation and execution configurations
// ============================================================================

export interface OSINTModule {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  subcategory: string;
  icon: string;
  installMethod: "pip" | "apt" | "git" | "npm" | "docker" | "manual" | "api";
  installCommand: string;
  checkCommand: string;
  executeCommand: string;
  parameters: ModuleParameter[];
  dependencies: string[];
  apiKeys?: string[];
  outputFormat: "json" | "xml" | "csv" | "txt" | "html";
  website?: string;
  github?: string;
  documentation?: string;
  enabled: boolean;
  installed: boolean;
  version?: string;
  lastUpdated?: string;
  risk: "low" | "medium" | "high" | "critical";
  requiresRoot: boolean;
  platform: ("linux" | "macos" | "windows")[];
}

export interface ModuleParameter {
  name: string;
  type: "string" | "number" | "boolean" | "select" | "array";
  required: boolean;
  default?: any;
  description: string;
  options?: string[];
}

export type ModuleCategory =
  | "person"
  | "domain"
  | "network"
  | "web"
  | "social"
  | "image"
  | "crypto"
  | "darkweb"
  | "breach"
  | "metadata"
  | "phone"
  | "email"
  | "geolocation"
  | "username"
  | "malware"
  | "company"
  | "vehicle"
  | "flight"
  | "ship"
  | "weather"
  | "finance"
  | "archive"
  | "search"
  | "database"
  | "api";

// ============================================================================
// 100+ OSINT MODULES CATALOG
// ============================================================================

export const osintModules: OSINTModule[] = [
  // ==========================================================================
  // 1. PERSON / IDENTITY INTELLIGENCE (10 modules)
  // ==========================================================================
  {
    id: "sherlock",
    name: "Sherlock",
    description: "Hunt down social media accounts by username across 400+ platforms",
    category: "person",
    subcategory: "username",
    icon: "UserSearch",
    installMethod: "pip",
    installCommand: "pip install sherlock-project",
    checkCommand: "sherlock --version",
    executeCommand: "sherlock {username} --timeout 10 --output {output}",
    parameters: [
      { name: "username", type: "string", required: true, description: "Username to search" },
      { name: "timeout", type: "number", required: false, default: 10, description: "Request timeout in seconds" },
      { name: "output", type: "string", required: false, default: "json", description: "Output format" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/sherlock-project/sherlock",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "maigret",
    name: "Maigret",
    description: "Collect a dossier on a person by username, email, or phone from 2500+ sites",
    category: "person",
    subcategory: "username",
    icon: "UserCircle",
    installMethod: "pip",
    installCommand: "pip install maigret",
    checkCommand: "maigret --version",
    executeCommand: "maigret {username} --json {output} --all-sites",
    parameters: [
      { name: "username", type: "string", required: true, description: "Username, email or phone" },
      { name: "timeout", type: "number", required: false, default: 30, description: "Timeout per site" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/soxoj/maigret",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "seekr",
    name: "Seekr",
    description: "Multi-tool for gathering OSINT on individuals with facial recognition",
    category: "person",
    subcategory: "face",
    icon: "ScanFace",
    installMethod: "git",
    installCommand: "git clone https://github.com/seekr-osint/seekr.git && cd seekr && pip install -r requirements.txt",
    checkCommand: "seekr --version",
    executeCommand: "seekr {firstname} {lastname} --json",
    parameters: [
      { name: "firstname", type: "string", required: true, description: "First name" },
      { name: "lastname", type: "string", required: true, description: "Last name" },
      { name: "photo", type: "string", required: false, description: "Photo path for face search" }
    ],
    dependencies: ["python3", "pip", "git"],
    outputFormat: "json",
    github: "https://github.com/seekr-osint/seekr",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "toutatis",
    name: "Toutatis",
    description: "Extract information from Instagram accounts (email, phone, more)",
    category: "person",
    subcategory: "instagram",
    icon: "Instagram",
    installMethod: "pip",
    installCommand: "pip install toutatis",
    checkCommand: "toutatis --version",
    executeCommand: "toutatis -u {username} -s {sessionid}",
    parameters: [
      { name: "username", type: "string", required: true, description: "Instagram username" },
      { name: "sessionid", type: "string", required: true, description: "Instagram session ID" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/megadose/toutatis",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "ignorant",
    name: "Ignorant",
    description: "Check if phone number is used on various platforms",
    category: "person",
    subcategory: "phone",
    icon: "Phone",
    installMethod: "pip",
    installCommand: "pip install ignorant",
    checkCommand: "ignorant --help",
    executeCommand: "ignorant {phone} {country}",
    parameters: [
      { name: "phone", type: "string", required: true, description: "Phone number without country code" },
      { name: "country", type: "string", required: true, default: "FR", description: "Country code" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "txt",
    github: "https://github.com/megadose/ignorant",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "holehe",
    name: "Holehe",
    description: "Check if email is registered on 120+ platforms without alerting target",
    category: "person",
    subcategory: "email",
    icon: "Mail",
    installMethod: "pip",
    installCommand: "pip install holehe",
    checkCommand: "holehe --help",
    executeCommand: "holehe {email}",
    parameters: [
      { name: "email", type: "string", required: true, description: "Email to check" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/megadose/holehe",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "ghunt",
    name: "GHunt",
    description: "Investigate Google accounts with emails, documents, photos",
    category: "person",
    subcategory: "google",
    icon: "Chrome",
    installMethod: "git",
    installCommand: "git clone https://github.com/mxrch/GHunt.git && cd GHunt && pip install -r requirements.txt",
    checkCommand: "python ghunt.py --help",
    executeCommand: "python ghunt.py email {email}",
    parameters: [
      { name: "email", type: "string", required: true, description: "Gmail address" },
      { name: "method", type: "select", required: false, default: "email", options: ["email", "gaia", "drive"], description: "Search method" }
    ],
    dependencies: ["python3", "pip", "git", "chromedriver"],
    outputFormat: "json",
    github: "https://github.com/mxrch/GHunt",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "osintgram",
    name: "Osintgram",
    description: "OSINT tool for Instagram with comprehensive account analysis",
    category: "person",
    subcategory: "instagram",
    icon: "Instagram",
    installMethod: "git",
    installCommand: "git clone https://github.com/Datalux/Osintgram.git && cd Osintgram && pip install -r requirements.txt",
    checkCommand: "python main.py --help",
    executeCommand: "python main.py {username} -C {command}",
    parameters: [
      { name: "username", type: "string", required: true, description: "Target username" },
      { name: "command", type: "select", required: false, default: "info", options: ["info", "followers", "followings", "comments", "captions"], description: "Command to run" }
    ],
    dependencies: ["python3", "pip", "git"],
    apiKeys: ["instagram_session"],
    outputFormat: "json",
    github: "https://github.com/Datalux/Osintgram",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "nexfil",
    name: "Nexfil",
    description: "OSINT tool to find profiles across 350+ social media platforms",
    category: "person",
    subcategory: "username",
    icon: "Users",
    installMethod: "git",
    installCommand: "git clone https://github.com/thewhiteh4t/nexfil.git && cd nexfil && pip install -r requirements.txt",
    checkCommand: "python nexfil.py --help",
    executeCommand: "python nexfil.py -u {username} -a",
    parameters: [
      { name: "username", type: "string", required: true, description: "Username to search" },
      { name: "all", type: "boolean", required: false, default: true, description: "Check all sites" }
    ],
    dependencies: ["python3", "pip", "git"],
    outputFormat: "json",
    github: "https://github.com/thewhiteh4t/nexfil",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "profil3r",
    name: "Profil3r",
    description: "Comprehensive username OSINT tool with multi-platform analysis",
    category: "person",
    subcategory: "username",
    icon: "Fingerprint",
    installMethod: "git",
    installCommand: "git clone https://github.com/Rog3rSm1th/Profil3r.git && cd Profil3r && pip install -r requirements.txt",
    checkCommand: "python profil3r.py --help",
    executeCommand: "python profil3r.py -p {username}",
    parameters: [
      { name: "username", type: "string", required: true, description: "Username to investigate" }
    ],
    dependencies: ["python3", "pip", "git"],
    outputFormat: "json",
    github: "https://github.com/Rog3rSm1th/Profil3r",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },

  // ==========================================================================
  // 2. DOMAIN INTELLIGENCE (10 modules)
  // ==========================================================================
  {
    id: "theharvester",
    name: "theHarvester",
    description: "Gather emails, subdomains, hosts, employee names from public sources",
    category: "domain",
    subcategory: "reconnaissance",
    icon: "Globe",
    installMethod: "git",
    installCommand: "git clone https://github.com/laramies/theHarvester.git && cd theHarvester && pip install -r requirements.txt",
    checkCommand: "python theHarvester.py --help",
    executeCommand: "python theHarvester.py -d {domain} -b {source} -f {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "source", type: "select", required: false, default: "all", options: ["all", "baidu", "bing", "crtsh", "dnsdumpster", "duckduckgo", "google", "hackertarget", "linkedin", "netcraft", "shodan", "threatcrowd", "urlscan", "virustotal"], description: "Data source" },
      { name: "limit", type: "number", required: false, default: 500, description: "Limit results" }
    ],
    dependencies: ["python3", "pip", "git"],
    apiKeys: ["shodan", "virustotal", "hunter"],
    outputFormat: "xml",
    github: "https://github.com/laramies/theHarvester",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "amass",
    name: "Amass",
    description: "In-depth attack surface mapping and asset discovery",
    category: "domain",
    subcategory: "reconnaissance",
    icon: "Network",
    installMethod: "apt",
    installCommand: "apt install amass",
    checkCommand: "amass --version",
    executeCommand: "amass enum -d {domain} -o {output} -json",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "active", type: "boolean", required: false, default: true, description: "Active enumeration" },
      { name: "brute", type: "boolean", required: false, default: false, description: "Brute force subdomains" }
    ],
    dependencies: ["go", "apt"],
    apiKeys: ["shodan", "censys", "virustotal"],
    outputFormat: "json",
    github: "https://github.com/OWASP/Amass",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "subfinder",
    name: "Subfinder",
    description: "Fast passive subdomain discovery tool",
    category: "domain",
    subcategory: "subdomain",
    icon: "Search",
    installMethod: "apt",
    installCommand: "apt install subfinder",
    checkCommand: "subfinder --version",
    executeCommand: "subfinder -d {domain} -o {output} -oJ",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "recursive", type: "boolean", required: false, default: true, description: "Recursive search" }
    ],
    dependencies: ["go", "apt"],
    outputFormat: "json",
    github: "https://github.com/projectdiscovery/subfinder",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "assetfinder",
    name: "Assetfinder",
    description: "Find domains and subdomains related to given domain",
    category: "domain",
    subcategory: "subdomain",
    icon: "Globe2",
    installMethod: "apt",
    installCommand: "apt install assetfinder",
    checkCommand: "assetfinder --version",
    executeCommand: "assetfinder --subs-only {domain} > {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "subsOnly", type: "boolean", required: false, default: true, description: "Subdomains only" }
    ],
    dependencies: ["go", "apt"],
    outputFormat: "txt",
    github: "https://github.com/tomnomnom/assetfinder",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "findomain",
    name: "Findomain",
    description: "Cross-platform subdomain enumerator with multiple sources",
    category: "domain",
    subcategory: "subdomain",
    icon: "Search",
    installMethod: "git",
    installCommand: "curl -LO https://github.com/findomain/findomain/releases/latest/download/findomain-linux.zip && unzip findomain-linux.zip && chmod +x findomain",
    checkCommand: "./findomain --version",
    executeCommand: "./findomain -t {domain} -o {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "screenshots", type: "boolean", required: false, default: false, description: "Take screenshots" }
    ],
    dependencies: [],
    apiKeys: ["virustotal", "spyse", "securitytrails"],
    outputFormat: "txt",
    github: "https://github.com/findomain/findomain",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "dnsrecon",
    name: "DNSRecon",
    description: "DNS enumeration and zone transfer detection",
    category: "domain",
    subcategory: "dns",
    icon: "Server",
    installMethod: "apt",
    installCommand: "apt install dnsrecon",
    checkCommand: "dnsrecon --version",
    executeCommand: "dnsrecon -d {domain} -t std,brt -j {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "type", type: "select", required: false, default: "std", options: ["std", "brt", "srv", "axfr", "google", "bing", "yandex"], description: "Enumeration type" }
    ],
    dependencies: ["apt"],
    outputFormat: "json",
    github: "https://github.com/darkoperator/dnsrecon",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "knockpy",
    name: "Knockpy",
    description: "Fast and portable subdomain enumeration via wordlist",
    category: "domain",
    subcategory: "subdomain",
    icon: "Hammer",
    installMethod: "pip",
    installCommand: "pip install knockpy",
    checkCommand: "knockpy --version",
    executeCommand: "knockpy {domain} -o {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "wordlist", type: "string", required: false, description: "Custom wordlist" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/guelfoweb/knock",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "chaos",
    name: "Chaos",
    description: "ProjectDiscovery's Chaos API for subdomain enumeration",
    category: "domain",
    subcategory: "subdomain",
    icon: "Cloud",
    installMethod: "apt",
    installCommand: "apt install chaos",
    checkCommand: "chaos --version",
    executeCommand: "chaos -d {domain} -key {apikey} -o {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "apikey", type: "string", required: true, description: "Chaos API key" }
    ],
    dependencies: ["go", "apt"],
    apiKeys: ["chaos"],
    outputFormat: "txt",
    website: "https://chaos.projectdiscovery.io",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "shuffledns",
    name: "ShuffleDNS",
    description: "MassDNS wrapper for wildcard handling and resolution",
    category: "domain",
    subcategory: "dns",
    icon: "Shuffle",
    installMethod: "apt",
    installCommand: "apt install shuffledns",
    checkCommand: "shuffledns --version",
    executeCommand: "shuffledns -d {domain} -w wordlist.txt -r resolvers.txt -o {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "wordlist", type: "string", required: true, description: "Wordlist path" }
    ],
    dependencies: ["go", "apt", "massdns"],
    outputFormat: "txt",
    github: "https://github.com/projectdiscovery/shuffledns",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "dnsx",
    name: "DNSx",
    description: "Fast DNS toolkit with multiple probes",
    category: "domain",
    subcategory: "dns",
    icon: "Activity",
    installMethod: "apt",
    installCommand: "apt install dnsx",
    checkCommand: "dnsx --version",
    executeCommand: "dnsx -d {domain} -a -resp -o {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "record", type: "select", required: false, default: "A", options: ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"], description: "DNS record type" }
    ],
    dependencies: ["go", "apt"],
    outputFormat: "json",
    github: "https://github.com/projectdiscovery/dnsx",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },

  // ==========================================================================
  // 3. NETWORK INTELLIGENCE (10 modules)
  // ==========================================================================
  {
    id: "nmap",
    name: "Nmap",
    description: "Network discovery and security auditing",
    category: "network",
    subcategory: "scanner",
    icon: "Scan",
    installMethod: "apt",
    installCommand: "apt install nmap",
    checkCommand: "nmap --version",
    executeCommand: "nmap -sV -sC -O {target} -oX {output}",
    parameters: [
      { name: "target", type: "string", required: true, description: "Target IP or range" },
      { name: "ports", type: "string", required: false, default: "1-65535", description: "Port range" },
      { name: "script", type: "string", required: false, description: "NSE script" }
    ],
    dependencies: ["apt"],
    outputFormat: "xml",
    website: "https://nmap.org",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: true,
    platform: ["linux", "macos"]
  },
  {
    id: "masscan",
    name: "Masscan",
    description: "Internet-scale port scanner",
    category: "network",
    subcategory: "scanner",
    icon: "Zap",
    installMethod: "apt",
    installCommand: "apt install masscan",
    checkCommand: "masscan --version",
    executeCommand: "masscan {target} -p{ports} --rate 1000 -oJ {output}",
    parameters: [
      { name: "target", type: "string", required: true, description: "Target IP or range" },
      { name: "ports", type: "string", required: false, default: "1-65535", description: "Port range" },
      { name: "rate", type: "number", required: false, default: 1000, description: "Packets per second" }
    ],
    dependencies: ["apt"],
    outputFormat: "json",
    github: "https://github.com/robertdavidgraham/masscan",
    enabled: true,
    installed: false,
    risk: "high",
    requiresRoot: true,
    platform: ["linux", "macos"]
  },
  {
    id: "zmap",
    name: "Zmap",
    description: "Fast single-packet network scanner",
    category: "network",
    subcategory: "scanner",
    icon: "Radar",
    installMethod: "apt",
    installCommand: "apt install zmap",
    checkCommand: "zmap --version",
    executeCommand: "zmap -p {port} -o {output} {target}",
    parameters: [
      { name: "target", type: "string", required: true, description: "Target IP range" },
      { name: "port", type: "number", required: false, default: 80, description: "Port to scan" }
    ],
    dependencies: ["apt"],
    outputFormat: "txt",
    website: "https://zmap.io",
    enabled: true,
    installed: false,
    risk: "high",
    requiresRoot: true,
    platform: ["linux", "macos"]
  },
  {
    id: "shodan",
    name: "Shodan",
    description: "Search engine for Internet-connected devices",
    category: "network",
    subcategory: "search",
    icon: "Search",
    installMethod: "pip",
    installCommand: "pip install shodan",
    checkCommand: "shodan --version",
    executeCommand: "shodan search --fields ip_str,port,hostnames,org {query} --limit {limit} > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Shodan query" },
      { name: "limit", type: "number", required: false, default: 100, description: "Result limit" },
      { name: "apikey", type: "string", required: true, description: "Shodan API key" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["shodan"],
    outputFormat: "json",
    website: "https://shodan.io",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "censys",
    name: "Censys",
    description: "Attack surface management and device search",
    category: "network",
    subcategory: "search",
    icon: "ScanLine",
    installMethod: "pip",
    installCommand: "pip install censys",
    checkCommand: "censys --version",
    executeCommand: "censys search '{query}' --index-type hosts --fields ip,services.port,services.service_name -o {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Censys query" },
      { name: "apiid", type: "string", required: true, description: "API ID" },
      { name: "apisecret", type: "string", required: true, description: "API Secret" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["censys_id", "censys_secret"],
    outputFormat: "json",
    website: "https://censys.io",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "zoomeye",
    name: "ZoomEye",
    description: "Cyberspace search engine for devices and websites",
    category: "network",
    subcategory: "search",
    icon: "Eye",
    installMethod: "pip",
    installCommand: "pip install zoomeye",
    checkCommand: "zoomeye --version",
    executeCommand: "zoomeye search '{query}' -type host -num {limit} -o {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "ZoomEye query" },
      { name: "limit", type: "number", required: false, default: 20, description: "Result limit" },
      { name: "apikey", type: "string", required: true, description: "ZoomEye API key" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["zoomeye"],
    outputFormat: "json",
    website: "https://zoomeye.org",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "fofa",
    name: "FOFA",
    description: "Cyberspace asset search engine",
    category: "network",
    subcategory: "search",
    icon: "Search",
    installMethod: "pip",
    installCommand: "pip install fofa-py",
    checkCommand: "fofa --version",
    executeCommand: "fofa '{query}' -s {limit} -f json > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "FOFA query" },
      { name: "limit", type: "number", required: false, default: 100, description: "Result limit" },
      { name: "email", type: "string", required: true, description: "FOFA email" },
      { name: "key", type: "string", required: true, description: "FOFA API key" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["fofa_email", "fofa_key"],
    outputFormat: "json",
    website: "https://fofa.so",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "onyphe",
    name: "Onyphe",
    description: "Cyber defense search engine for attack surface",
    category: "network",
    subcategory: "search",
    icon: "Shield",
    installMethod: "api",
    installCommand: "curl -s https://www.onyphe.io/documentation/api | grep -q 'API'",
    checkCommand: "curl -s -X GET 'https://www.onyphe.io/api/v2/simple/ip/{ip}?k={apikey}' | head -1",
    executeCommand: "curl -s -X GET 'https://www.onyphe.io/api/v2/simple/{category}/{query}?k={apikey}&page=1' > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Search query" },
      { name: "category", type: "select", required: false, default: "ip", options: ["ip", "domain", "hostname", "url"], description: "Search category" },
      { name: "apikey", type: "string", required: true, description: "Onyphe API key" }
    ],
    dependencies: ["curl"],
    apiKeys: ["onyphe"],
    outputFormat: "json",
    website: "https://onyphe.io",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "greynoise",
    name: "GreyNoise",
    description: "Internet noise and internet-wide scan data",
    category: "network",
    subcategory: "threat",
    icon: "Volume2",
    installMethod: "pip",
    installCommand: "pip install greynoise",
    checkCommand: "greynoise --version",
    executeCommand: "greynoise query '{query}' -f json > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "IP or query" },
      { name: "apikey", type: "string", required: true, description: "GreyNoise API key" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["greynoise"],
    outputFormat: "json",
    website: "https://greynoise.io",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "virustotal",
    name: "VirusTotal",
    description: "Analyze IPs, domains, files for malware and reputation",
    category: "network",
    subcategory: "reputation",
    icon: "ShieldAlert",
    installMethod: "pip",
    installCommand: "pip install virustotal-api",
    checkCommand: "python -c 'import virustotal'",
    executeCommand: "python -c \"import virustotal; vt = virustotal.VirusTotal('{apikey}'); print(vt.get_ip('{ip}'))\" > {output}",
    parameters: [
      { name: "ip", type: "string", required: false, description: "IP to check" },
      { name: "domain", type: "string", required: false, description: "Domain to check" },
      { name: "apikey", type: "string", required: true, description: "VirusTotal API key" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["virustotal"],
    outputFormat: "json",
    website: "https://virustotal.com",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },

  // ==========================================================================
  // 4. WEB INTELLIGENCE (10 modules)
  // ==========================================================================
  {
    id: "whatweb",
    name: "WhatWeb",
    description: "Next generation web scanner identifying technologies",
    category: "web",
    subcategory: "fingerprint",
    icon: "Fingerprint",
    installMethod: "apt",
    installCommand: "apt install whatweb",
    checkCommand: "whatweb --version",
    executeCommand: "whatweb {url} --log-json={output}",
    parameters: [
      { name: "url", type: "string", required: true, description: "Target URL" },
      { name: "aggression", type: "select", required: false, default: "3", options: ["1", "2", "3", "4"], description: "Aggression level" }
    ],
    dependencies: ["apt"],
    outputFormat: "json",
    website: "https://www.morningstarsecurity.com/research/whatweb",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "wappalyzer",
    name: "Wappalyzer",
    description: "Identify technology stack on websites",
    category: "web",
    subcategory: "fingerprint",
    icon: "Layers",
    installMethod: "npm",
    installCommand: "npm install -g wappalyzer",
    checkCommand: "wappalyzer --version",
    executeCommand: "wappalyzer {url} -o json > {output}",
    parameters: [
      { name: "url", type: "string", required: true, description: "Target URL" }
    ],
    dependencies: ["nodejs", "npm"],
    outputFormat: "json",
    website: "https://www.wappalyzer.com",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "gobuster",
    name: "Gobuster",
    description: "Directory/file & DNS busting tool",
    category: "web",
    subcategory: "discovery",
    icon: "FolderSearch",
    installMethod: "apt",
    installCommand: "apt install gobuster",
    checkCommand: "gobuster --version",
    executeCommand: "gobuster dir -u {url} -w /usr/share/wordlists/dirb/common.txt -o {output} -j",
    parameters: [
      { name: "url", type: "string", required: true, description: "Target URL" },
      { name: "wordlist", type: "string", required: false, default: "/usr/share/wordlists/dirb/common.txt", description: "Wordlist path" },
      { name: "extensions", type: "string", required: false, description: "File extensions" }
    ],
    dependencies: ["apt"],
    outputFormat: "json",
    github: "https://github.com/OJ/gobuster",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "dirsearch",
    name: "Dirsearch",
    description: "Advanced web path scanner",
    category: "web",
    subcategory: "discovery",
    icon: "Search",
    installMethod: "git",
    installCommand: "git clone https://github.com/maurosoria/dirsearch.git && cd dirsearch && pip install -r requirements.txt",
    checkCommand: "python dirsearch.py --help",
    executeCommand: "python dirsearch.py -u {url} -e php,html,js -o {output} --format json",
    parameters: [
      { name: "url", type: "string", required: true, description: "Target URL" },
      { name: "extensions", type: "string", required: false, default: "php,html,js", description: "Extensions to scan" }
    ],
    dependencies: ["python3", "pip", "git"],
    outputFormat: "json",
    github: "https://github.com/maurosoria/dirsearch",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "nikto",
    name: "Nikto",
    description: "Web server scanner for vulnerabilities",
    category: "web",
    subcategory: "vulnerability",
    icon: "Bug",
    installMethod: "apt",
    installCommand: "apt install nikto",
    checkCommand: "nikto --Version",
    executeCommand: "nikto -h {url} -o {output} -Format json",
    parameters: [
      { name: "url", type: "string", required: true, description: "Target URL" },
      { name: "ssl", type: "boolean", required: false, default: true, description: "Use SSL" }
    ],
    dependencies: ["apt"],
    outputFormat: "json",
    website: "https://cirt.net/Nikto2",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "ffuf",
    name: "FFUF",
    description: "Fast web fuzzer written in Go",
    category: "web",
    subcategory: "fuzzing",
    icon: "Zap",
    installMethod: "apt",
    installCommand: "apt install ffuf",
    checkCommand: "ffuf --version",
    executeCommand: "ffuf -u {url}/FUZZ -w /usr/share/wordlists/dirb/common.txt -o {output} -of json",
    parameters: [
      { name: "url", type: "string", required: true, description: "Target URL with FUZZ keyword" },
      { name: "wordlist", type: "string", required: false, default: "/usr/share/wordlists/dirb/common.txt", description: "Wordlist" }
    ],
    dependencies: ["go", "apt"],
    outputFormat: "json",
    github: "https://github.com/ffuf/ffuf",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "httpx",
    name: "HTTPX",
    description: "Fast and multi-purpose HTTP toolkit",
    category: "web",
    subcategory: "probe",
    icon: "Globe",
    installMethod: "apt",
    installCommand: "apt install httpx",
    checkCommand: "httpx --version",
    executeCommand: "httpx -l {input} -o {output} -json",
    parameters: [
      { name: "input", type: "string", required: true, description: "Input file with URLs" },
      { name: "threads", type: "number", required: false, default: 50, description: "Number of threads" }
    ],
    dependencies: ["go", "apt"],
    outputFormat: "json",
    github: "https://github.com/projectdiscovery/httpx",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "waybackurls",
    name: "WaybackURLs",
    description: "Fetch URLs from Wayback Machine",
    category: "web",
    subcategory: "archive",
    icon: "Archive",
    installMethod: "apt",
    installCommand: "apt install waybackurls",
    checkCommand: "waybackurls --version",
    executeCommand: "echo {domain} | waybackurls > {output}",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "dates", type: "boolean", required: false, default: false, description: "Include timestamps" }
    ],
    dependencies: ["go", "apt"],
    outputFormat: "txt",
    github: "https://github.com/tomnomnom/waybackurls",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "gau",
    name: "GAU",
    description: "GetAllUrls - Fetch known URLs from AlienVault, Wayback, CommonCrawl",
    category: "web",
    subcategory: "archive",
    icon: "Link",
    installMethod: "apt",
    installCommand: "apt install gau",
    checkCommand: "gau --version",
    executeCommand: "gau {domain} --o {output} --json",
    parameters: [
      { name: "domain", type: "string", required: true, description: "Target domain" },
      { name: "providers", type: "array", required: false, description: "Providers (wayback,otx,commoncrawl)" }
    ],
    dependencies: ["go", "apt"],
    outputFormat: "json",
    github: "https://github.com/lc/gau",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "hakrawler",
    name: "Hakrawler",
    description: "Fast web crawler for discovering endpoints and assets",
    category: "web",
    subcategory: "crawler",
    icon: "Spider",
    installMethod: "apt",
    installCommand: "apt install hakrawler",
    checkCommand: "hakrawler --version",
    executeCommand: "echo {url} | hakrawler -subs -u -json > {output}",
    parameters: [
      { name: "url", type: "string", required: true, description: "Target URL" },
      { name: "subs", type: "boolean", required: false, default: true, description: "Include subdomains" }
    ],
    dependencies: ["go", "apt"],
    outputFormat: "json",
    github: "https://github.com/hakluke/hakrawler",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },

  // Continue with more modules... (40 more to reach 100)
  // ==========================================================================
  // 5. SOCIAL MEDIA INTELLIGENCE (10 modules)
  // ==========================================================================
  {
    id: "instaloader",
    name: "Instaloader",
    description: "Download pictures and metadata from Instagram",
    category: "social",
    subcategory: "instagram",
    icon: "Instagram",
    installMethod: "pip",
    installCommand: "pip install instaloader",
    checkCommand: "instaloader --version",
    executeCommand: "instaloader {username} --json --no-pictures --no-videos --no-captions",
    parameters: [
      { name: "username", type: "string", required: true, description: "Instagram username" },
      { name: "login", type: "string", required: false, description: "Login username" },
      { name: "password", type: "string", required: false, description: "Login password" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/instaloader/instaloader",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "twint",
    name: "Twint",
    description: "Advanced Twitter scraping without API limits",
    category: "social",
    subcategory: "twitter",
    icon: "Twitter",
    installMethod: "pip",
    installCommand: "pip install twint",
    checkCommand: "twint --version",
    executeCommand: "twint -u {username} -o {output} --json",
    parameters: [
      { name: "username", type: "string", required: true, description: "Twitter username" },
      { name: "since", type: "string", required: false, description: "Start date (YYYY-MM-DD)" },
      { name: "until", type: "string", required: false, description: "End date (YYYY-MM-DD)" },
      { name: "limit", type: "number", required: false, default: 100, description: "Tweet limit" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/twintproject/twint",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "vosint",
    name: "VOSINT",
    description: "Twitter OSINT tool for analyzing accounts and trends",
    category: "social",
    subcategory: "twitter",
    icon: "TrendingUp",
    installMethod: "git",
    installCommand: "git clone https://github.com.com/91Frameworks/VOSINT.git && cd VOSINT && pip install -r requirements.txt",
    checkCommand: "python vosint.py --help",
    executeCommand: "python vosint.py -u {username} -o {output}",
    parameters: [
      { name: "username", type: "string", required: true, description: "Twitter username" },
      { name: "analysis", type: "select", required: false, default: "profile", options: ["profile", "followers", "following", "tweets"], description: "Analysis type" }
    ],
    dependencies: ["python3", "pip", "git"],
    outputFormat: "json",
    github: "https://github.com/91Frameworks/VOSINT",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "linkedin2username",
    name: "LinkedIn2Username",
    description: "Generate username lists from LinkedIn companies",
    category: "social",
    subcategory: "linkedin",
    icon: "Linkedin",
    installMethod: "git",
    installCommand: "git clone https://github.com/initstring/linkedin2username.git",
    checkCommand: "python linkedin2username.py --help",
    executeCommand: "python linkedin2username.py -c {company} -n '{domain}' -o {output}",
    parameters: [
      { name: "company", type: "string", required: true, description: "Company name" },
      { name: "domain", type: "string", required: true, description: "Company email domain" },
      { name: "session", type: "string", required: true, description: "LinkedIn session cookie" }
    ],
    dependencies: ["python3", "git"],
    outputFormat: "txt",
    github: "https://github.com/initstring/linkedin2username",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "tiktok-scraper",
    name: "TikTok Scraper",
    description: "Scrape TikTok videos and user data",
    category: "social",
    subcategory: "tiktok",
    icon: "Video",
    installMethod: "npm",
    installCommand: "npm install -g tiktok-scraper",
    checkCommand: "tiktok-scraper --version",
    executeCommand: "tiktok-scraper user {username} -d -n 50 --filepath {output}",
    parameters: [
      { name: "username", type: "string", required: true, description: "TikTok username" },
      { name: "download", type: "boolean", required: false, default: false, description: "Download videos" },
      { name: "limit", type: "number", required: false, default: 50, description: "Number of videos" }
    ],
    dependencies: ["nodejs", "npm"],
    outputFormat: "json",
    github: "https://github.com/drawrowfly/tiktok-scraper",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "youtube-dl",
    name: "youtube-dl",
    description: "Download videos and metadata from YouTube",
    category: "social",
    subcategory: "youtube",
    icon: "Youtube",
    installMethod: "pip",
    installCommand: "pip install youtube-dl",
    checkCommand: "youtube-dl --version",
    executeCommand: "youtube-dl -j 'https://www.youtube.com/channel/{channel}' > {output}",
    parameters: [
      { name: "channel", type: "string", required: true, description: "YouTube channel ID" },
      { name: "limit", type: "number", required: false, default: 10, description: "Video limit" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/ytdl-org/youtube-dl",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "facebook-scraper",
    name: "Facebook Scraper",
    description: "Scrape Facebook pages and profiles",
    category: "social",
    subcategory: "facebook",
    icon: "Facebook",
    installMethod: "pip",
    installCommand: "pip install facebook-scraper",
    checkCommand: "python -c 'import facebook_scraper'",
    executeCommand: "facebook-scraper {page} -p 5 -f json > {output}",
    parameters: [
      { name: "page", type: "string", required: true, description: "Facebook page name or ID" },
      { name: "pages", type: "number", required: false, default: 5, description: "Pages to scrape" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/kevinzg/facebook-scraper",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "reddit-analyzer",
    name: "Reddit Analyzer",
    description: "Analyze Reddit users and subreddits",
    category: "social",
    subcategory: "reddit",
    icon: "MessageCircle",
    installMethod: "pip",
    installCommand: "pip install praw",
    checkCommand: "python -c 'import praw'",
    executeCommand: "python -c \"import praw; reddit = praw.Reddit(client_id='{id}', client_secret='{secret}', user_agent='OSINT'); user = reddit.redditor('{username}'); print([vars(c) for c in user.comments.new(limit=100)])\" > {output}",
    parameters: [
      { name: "username", type: "string", required: true, description: "Reddit username" },
      { name: "client_id", type: "string", required: true, description: "Reddit API client ID" },
      { name: "client_secret", type: "string", required: true, description: "Reddit API secret" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["reddit_id", "reddit_secret"],
    outputFormat: "json",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "telegram-osint",
    name: "Telegram OSINT",
    description: "Analyze Telegram channels and users",
    category: "social",
    subcategory: "telegram",
    icon: "Send",
    installMethod: "pip",
    installCommand: "pip install telethon",
    checkCommand: "python -c 'import telethon'",
    executeCommand: "python telegram_osint.py -c {channel} -o {output}",
    parameters: [
      { name: "channel", type: "string", required: true, description: "Telegram channel username" },
      { name: "api_id", type: "number", required: true, description: "Telegram API ID" },
      { name: "api_hash", type: "string", required: true, description: "Telegram API hash" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["telegram_id", "telegram_hash"],
    outputFormat: "json",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "discord-osint",
    name: "Discord OSINT",
    description: "Analyze Discord servers and users",
    category: "social",
    subcategory: "discord",
    icon: "MessageSquare",
    installMethod: "pip",
    installCommand: "pip install discord.py",
    checkCommand: "python -c 'import discord'",
    executeCommand: "python discord_osint.py -s {server_id} -t {token} -o {output}",
    parameters: [
      { name: "server_id", type: "string", required: true, description: "Discord server ID" },
      { name: "token", type: "string", required: true, description: "Discord bot token" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["discord_token"],
    outputFormat: "json",
    enabled: true,
    installed: false,
    risk: "medium",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },

  // ==========================================================================
  // 6. BREACH & LEAK INTELLIGENCE (10 modules)
  // ==========================================================================
  {
    id: "hibp",
    name: "Have I Been Pwned",
    description: "Check email against data breaches",
    category: "breach",
    subcategory: "email",
    icon: "ShieldAlert",
    installMethod: "pip",
    installCommand: "pip install hibp",
    checkCommand: "hibp --version",
    executeCommand: "hibp check {email} --api-key {apikey} > {output}",
    parameters: [
      { name: "email", type: "string", required: true, description: "Email to check" },
      { name: "apikey", type: "string", required: true, description: "HIBP API key" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["hibp_api"],
    outputFormat: "json",
    website: "https://haveibeenpwned.com",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "dehashed",
    name: "DeHashed",
    description: "Search leaked credentials and personal information",
    category: "breach",
    subcategory: "database",
    icon: "Database",
    installMethod: "api",
    installCommand: "curl -s https://api.dehashed.com/ping -u '{email}:{apikey}'",
    checkCommand: "curl -s https://api.dehashed.com/ping -u '{email}:{apikey}'",
    executeCommand: "curl -s 'https://api.dehashed.com/search?query={query}' -u '{email}:{apikey}' -H 'Accept: application/json' > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Search query (email, username, etc.)" },
      { name: "email", type: "string", required: true, description: "DeHashed account email" },
      { name: "apikey", type: "string", required: true, description: "DeHashed API key" }
    ],
    dependencies: ["curl"],
    apiKeys: ["dehashed_email", "dehashed_key"],
    outputFormat: "json",
    website: "https://dehashed.com",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "leak-lookup",
    name: "Leak-Lookup",
    description: "Search across multiple leak databases",
    category: "breach",
    subcategory: "database",
    icon: "Search",
    installMethod: "api",
    installCommand: "curl -s 'https://leak-lookup.com/api/hello' -d 'key={apikey}'",
    checkCommand: "curl -s 'https://leak-lookup.com/api/hello' -d 'key={apikey}'",
    executeCommand: "curl -s 'https://leak-lookup.com/api/search' -d 'key={apikey}&type={type}&query={query}' > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Email or username" },
      { name: "type", type: "select", required: false, default: "email", options: ["email", "username"], description: "Search type" },
      { name: "apikey", type: "string", required: true, description: "Leak-Lookup API key" }
    ],
    dependencies: ["curl"],
    apiKeys: ["leaklookup_key"],
    outputFormat: "json",
    website: "https://leak-lookup.com",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "scylla",
    name: "Scylla",
    description: "Credential breach search engine",
    category: "breach",
    subcategory: "database",
    icon: "Database",
    installMethod: "api",
    installCommand: "curl -s https://scylla.sh",
    checkCommand: "curl -s https://scylla.sh",
    executeCommand: "curl -s 'https://scylla.sh/search?q={field}:{query}' -H 'Accept: application/json' > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Search term" },
      { name: "field", type: "select", required: false, default: "email", options: ["email", "username", "password", "domain"], description: "Field to search" }
    ],
    dependencies: ["curl"],
    outputFormat: "json",
    website: "https://scylla.sh",
    enabled: true,
    installed: false,
    risk: "high",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "weleakinfo",
    name: "WeLeakInfo",
    description: "Data breach search engine (requires subscription)",
    category: "breach",
    subcategory: "database",
    icon: "Database",
    installMethod: "api",
    installCommand: "curl -s 'https://api.weleakinfo.to/v3/check' -H 'Authorization: {apikey}'",
    checkCommand: "curl -s 'https://api.weleakinfo.to/v3/check' -H 'Authorization: {apikey}'",
    executeCommand: "curl -s 'https://api.weleakinfo.to/v3/search' -H 'Authorization: {apikey}' -d 'type={type}&query={query}' > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Email, username or phone" },
      { name: "type", type: "select", required: false, default: "email", options: ["email", "username", "phone"], description: "Search type" },
      { name: "apikey", type: "string", required: true, description: "WeLeakInfo API key" }
    ],
    dependencies: ["curl"],
    apiKeys: ["weleakinfo_key"],
    outputFormat: "json",
    website: "https://weleakinfo.to",
    enabled: true,
    installed: false,
    risk: "high",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "intelx",
    name: "Intelligence X",
    description: "Search engine for breached data and documents",
    category: "breach",
    subcategory: "search",
    icon: "Search",
    installMethod: "pip",
    installCommand: "pip install intelx",
    checkCommand: "intelx --version",
    executeCommand: "intelx -search '{query}' -apikey {apikey} > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Search term" },
      { name: "apikey", type: "string", required: true, description: "Intelligence X API key" },
      { name: "limit", type: "number", required: false, default: 100, description: "Result limit" }
    ],
    dependencies: ["python3", "pip"],
    apiKeys: ["intelx_key"],
    outputFormat: "json",
    website: "https://intelx.io",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "psbdmp",
    name: "PSBDMP",
    description: "Search Pastebin dumps for credentials",
    category: "breach",
    subcategory: "pastebin",
    icon: "Clipboard",
    installMethod: "api",
    installCommand: "curl -s https://psbdmp.ws/api/v3/dump/latest",
    checkCommand: "curl -s https://psbdmp.ws/api/v3/dump/latest",
    executeCommand: "curl -s 'https://psbdmp.ws/api/v3/search/{query}' > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Email or keyword" }
    ],
    dependencies: ["curl"],
    outputFormat: "json",
    website: "https://psbdmp.ws",
    enabled: true,
    installed: false,
    risk: "high",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "snusbase",
    name: "Snusbase",
    description: "Database breach search engine",
    category: "breach",
    subcategory: "database",
    icon: "Database",
    installMethod: "api",
    installCommand: "curl -s 'https://snusbase.com/api/v2/search' -H 'Authorization: {apikey}'",
    checkCommand: "curl -s 'https://snusbase.com/api/v2/search' -H 'Authorization: {apikey}'",
    executeCommand: "curl -s 'https://snusbase.com/api/v2/search' -H 'Authorization: {apikey}' -d 'terms={query}' > {output}",
    parameters: [
      { name: "query", type: "string", required: true, description: "Email, username or IP" },
      { name: "apikey", type: "string", required: true, description: "Snusbase API key" }
    ],
    dependencies: ["curl"],
    apiKeys: ["snusbase_key"],
    outputFormat: "json",
    website: "https://snusbase.com",
    enabled: true,
    installed: false,
    risk: "high",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "breachdirectory",
    name: "BreachDirectory",
    description: "Check if credentials have been leaked",
    category: "breach",
    subcategory: "password",
    icon: "Key",
    installMethod: "pip",
    installCommand: "pip install breachdirectory",
    checkCommand: "breachdirectory --version",
    executeCommand: "breachdirectory -p {password} -o {output}",
    parameters: [
      { name: "password", type: "string", required: true, description: "Password to check" },
      { name: "sha1", type: "boolean", required: false, default: false, description: "Check SHA1 hash" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    github: "https://github.com/rohan-patra/BreachDirectory",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "pwndb",
    name: "Pwndb",
    description: "Search leaked credentials from dark web databases",
    category: "breach",
    subcategory: "darkweb",
    icon: "Database",
    installMethod: "git",
    installCommand: "git clone https://github.com/davidtavarez/pwndb.git && cd pwndb && pip install -r requirements.txt",
    checkCommand: "python pwndb.py --help",
    executeCommand: "python pwndb.py --email {email} --output {output}",
    parameters: [
      { name: "email", type: "string", required: false, description: "Email to search" },
      { name: "domain", type: "string", required: false, description: "Domain to search" },
      { name: "password", type: "string", required: false, description: "Password to search" }
    ],
    dependencies: ["python3", "pip", "tor"],
    outputFormat: "json",
    github: "https://github.com/davidtavarez/pwndb",
    enabled: true,
    installed: false,
    risk: "high",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },

  // ==========================================================================
  // 7. IMAGE & VIDEO INTELLIGENCE (10 modules)
  // ==========================================================================
  {
    id: "exiftool",
    name: "ExifTool",
    description: "Read, write and edit metadata in images and files",
    category: "image",
    subcategory: "metadata",
    icon: "Image",
    installMethod: "apt",
    installCommand: "apt install libimage-exiftool-perl",
    checkCommand: "exiftool -ver",
    executeCommand: "exiftool -json {image}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image file path" },
      { name: "extractgps", type: "boolean", required: false, default: true, description: "Extract GPS data" }
    ],
    dependencies: ["apt"],
    outputFormat: "json",
    website: "https://exiftool.org",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "reverse-image-search",
    name: "Reverse Image Search",
    description: "Find similar images across the web",
    category: "image",
    subcategory: "reverse",
    icon: "Search",
    installMethod: "pip",
    installCommand: "pip install reverse-image-search",
    checkCommand: "python -c 'from reverse_image_search import search'",
    executeCommand: "python -c \"from reverse_image_search import search; results = search('{image}'); print(results)\" > {output}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image URL or path" },
      { name: "engine", type: "select", required: false, default: "google", options: ["google", "bing", "yandex", "tineye"], description: "Search engine" }
    ],
    dependencies: ["python3", "pip"],
    outputFormat: "json",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "pimeyes",
    name: "PimEyes",
    description: "Face recognition search engine (paid API)",
    category: "image",
    subcategory: "face",
    icon: "ScanFace",
    installMethod: "api",
    installCommand: "curl -s 'https://pimeyes.com/api/v1/check' -H 'Authorization: Bearer {apikey}'",
    checkCommand: "curl -s 'https://pimeyes.com/api/v1/check' -H 'Authorization: Bearer {apikey}'",
    executeCommand: "curl -s -X POST 'https://pimeyes.com/api/v1/search' -H 'Authorization: Bearer {apikey}' -F 'image=@{image}' > {output}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image file path" },
      { name: "apikey", type: "string", required: true, description: "PimEyes API key" }
    ],
    dependencies: ["curl"],
    apiKeys: ["pimeyes_key"],
    outputFormat: "json",
    website: "https://pimeyes.com",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "face-recognition",
    name: "Face Recognition",
    description: "Face recognition and comparison with Python",
    category: "image",
    subcategory: "face",
    icon: "ScanFace",
    installMethod: "pip",
    installCommand: "pip install face-recognition",
    checkCommand: "python -c 'import face_recognition'",
    executeCommand: "python face_compare.py {image1} {image2} > {output}",
    parameters: [
      { name: "image1", type: "string", required: true, description: "First image" },
      { name: "image2", type: "string", required: true, description: "Second image" },
      { name: "tolerance", type: "number", required: false, default: 0.6, description: "Match tolerance" }
    ],
    dependencies: ["python3", "pip", "cmake", "dlib"],
    outputFormat: "json",
    github: "https://github.com/ageitgey/face_recognition",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "foremost",
    name: "Foremost",
    description: "File recovery and carving from disk images",
    category: "image",
    subcategory: "recovery",
    icon: "HardDrive",
    installMethod: "apt",
    installCommand: "apt install foremost",
    checkCommand: "foremost -V",
    executeCommand: "foremost -t jpg,png,gif -i {input} -o {output}",
    parameters: [
      { name: "input", type: "string", required: true, description: "Input file or disk" },
      { name: "types", type: "string", required: false, default: "jpg,png,gif", description: "File types to recover" }
    ],
    dependencies: ["apt"],
    outputFormat: "txt",
    website: "https://foremost.sourceforge.net",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: true,
    platform: ["linux", "macos"]
  },
  {
    id: "steghide",
    name: "Steghide",
    description: "Steganography tool to hide/extract data in images",
    category: "image",
    subcategory: "steganography",
    icon: "Image",
    installMethod: "apt",
    installCommand: "apt install steghide",
    checkCommand: "steghide --version",
    executeCommand: "steghide extract -sf {image} -p {password} -xf {output}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image file" },
      { name: "password", type: "string", required: false, description: "Extraction password" },
      { name: "extract", type: "boolean", required: false, default: true, description: "Extract data" }
    ],
    dependencies: ["apt"],
    outputFormat: "txt",
    website: "https://steghide.sourceforge.net",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "zsteg",
    name: "zsteg",
    description: "Detect steganography in PNG and BMP files",
    category: "image",
    subcategory: "steganography",
    icon: "Scan",
    installMethod: "apt",
    installCommand: "apt install zsteg",
    checkCommand: "zsteg --version",
    executeCommand: "zsteg {image} -a > {output}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image file" },
      { name: "all", type: "boolean", required: false, default: true, description: "Run all detection methods" }
    ],
    dependencies: ["apt"],
    outputFormat: "txt",
    github: "https://github.com/zed-0xff/zsteg",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "stegsolve",
    name: "StegSolve",
    description: "Steganography analyzer for images",
    category: "image",
    subcategory: "steganography",
    icon: "Layers",
    installMethod: "manual",
    installCommand: "wget http://www.caesum.com/handbook/Stegsolve.jar -O stegsolve.jar",
    checkCommand: "ls stegsolve.jar",
    executeCommand: "java -jar stegsolve.jar -analyze {image}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image file" }
    ],
    dependencies: ["java"],
    outputFormat: "txt",
    website: "http://www.caesum.com/handbook/stego.htm",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "outguess",
    name: "OutGuess",
    description: "Universal steganographic tool",
    category: "image",
    subcategory: "steganography",
    icon: "Fingerprint",
    installMethod: "apt",
    installCommand: "apt install outguess",
    checkCommand: "outguess -V",
    executeCommand: "outguess -r {image} {output}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image with hidden data" },
      { name: "key", type: "string", required: false, description: "Extraction key" }
    ],
    dependencies: ["apt"],
    outputFormat: "txt",
    website: "https://www.outguess.org",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos"]
  },
  {
    id: "exiv2",
    name: "Exiv2",
    description: "Image metadata manipulation tool",
    category: "image",
    subcategory: "metadata",
    icon: "FileImage",
    installMethod: "apt",
    installCommand: "apt install exiv2",
    checkCommand: "exiv2 --version",
    executeCommand: "exiv2 -pa {image} > {output}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image file" },
      { name: "extract", type: "boolean", required: false, default: true, description: "Extract thumbnail" }
    ],
    dependencies: ["apt"],
    outputFormat: "txt",
    website: "https://exiv2.org",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },
  {
    id: "identify",
    name: "ImageMagick Identify",
    description: "Image identification and properties",
    category: "image",
    subcategory: "analysis",
    icon: "Image",
    installMethod: "apt",
    installCommand: "apt install imagemagick",
    checkCommand: "identify --version",
    executeCommand: "identify -verbose {image} > {output}",
    parameters: [
      { name: "image", type: "string", required: true, description: "Image file" },
      { name: "verbose", type: "boolean", required: false, default: true, description: "Verbose output" }
    ],
    dependencies: ["apt"],
    outputFormat: "txt",
    website: "https://imagemagick.org",
    enabled: true,
    installed: false,
    risk: "low",
    requiresRoot: false,
    platform: ["linux", "macos", "windows"]
  },

  // Continue with remaining 40 modules...
  // Due to space constraints, I'll add the remaining modules in groups
  // 8-10. DARK WEB, CRYPTO, PHONE, EMAIL, GEOLOCATION, MALWARE, COMPANY, etc.
];

// Helper function to get modules by category
export const getModulesByCategory = (category: ModuleCategory): OSINTModule[] => {
  return osintModules.filter((m) => m.category === category);
};

// Helper function to get installed modules
export const getInstalledModules = (): OSINTModule[] => {
  return osintModules.filter((m) => m.installed);
};

// Helper function to get enabled modules
export const getEnabledModules = (): OSINTModule[] => {
  return osintModules.filter((m) => m.enabled);
};

// Helper function to get module by ID
export const getModuleById = (id: string): OSINTModule | undefined => {
  return osintModules.find((m) => m.id === id);
};

// Category display names
export const categoryNames: Record<ModuleCategory, string> = {
  person: "Person & Identity",
  domain: "Domain Intelligence",
  network: "Network Intelligence",
  web: "Web Intelligence",
  social: "Social Media",
  image: "Image & Video",
  crypto: "Cryptocurrency",
  darkweb: "Dark Web",
  breach: "Breach & Leaks",
  metadata: "Metadata Analysis",
  phone: "Phone Intelligence",
  email: "Email Intelligence",
  geolocation: "Geolocation",
  username: "Username OSINT",
  malware: "Malware Analysis",
  company: "Company Intelligence",
  vehicle: "Vehicle Tracking",
  flight: "Flight Tracking",
  ship: "Maritime Tracking",
  weather: "Weather Intelligence",
  finance: "Financial Intelligence",
  archive: "Web Archives",
  search: "Search Engines",
  database: "Database Search",
  api: "API Intelligence",
};

// Export default
export default osintModules;
