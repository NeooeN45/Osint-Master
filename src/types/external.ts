// ============ EXTERNAL OSINT TOOLS TYPES ============

export type ExternalToolCategory = "social" | "email" | "phone" | "image" | "framework" | "geolocation" | "breach";

export interface ExternalTool {
  id: string;
  name: string;
  category: ExternalToolCategory;
  description: string;
  githubUrl?: string;
  webUrl?: string;
  apiUrl?: string;
  requiresApiKey: boolean;
  keyName?: string;
  keyPlaceholder?: string;
  documentation?: string;
  platforms?: string[];
  features: string[];
}

// ============ SOCIAL MEDIA SCAN ============

export interface SocialPlatformResult {
  platform: string;
  username: string;
  url: string;
  exists: boolean;
  confidence: number;
  profileData?: {
    followers?: number;
    following?: number;
    posts?: number;
    bio?: string;
    location?: string;
    profileImage?: string;
    website?: string;
    joinedDate?: string;
    verified?: boolean;
  };
  metadata?: Record<string, unknown>;
  lastChecked: string;
  error?: string;
}

export interface SocialScanResult {
  query: string;
  queryType: "username" | "email" | "phone";
  platforms: SocialPlatformResult[];
  totalFound: number;
  scanDuration: number;
  timestamp: string;
}

// ============ EMAIL SCAN ============

export interface EmailBreach {
  name: string;
  date: string;
  description?: string;
  compromisedData: string[];
  verified: boolean;
}

export interface EmailServiceResult {
  service: string;
  exists: boolean;
  url?: string;
  recoveryEmail?: string;
  recoveryPhone?: string;
  profilePic?: string;
  name?: string;
  error?: string;
}

export interface EmailScanResult {
  email: string;
  valid: boolean;
  format?: string;
  domain: string;
  disposable: boolean;
  breaches: EmailBreach[];
  services: EmailServiceResult[];
  sources: string[];
  confidence: number;
  timestamp: string;
}

// ============ PHONE SCAN ============

export interface PhoneCarrier {
  name: string;
  country: string;
  type: "mobile" | "landline" | "voip" | "premium";
  networkCode?: string;
  mcc?: string;
  mnc?: string;
}

export interface PhoneLocation {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  timezone?: string;
  lat?: number;
  lng?: number;
}

export interface PhoneSocialLink {
  platform: string;
  url: string;
  username?: string;
  confidence: number;
}

export interface PhoneScanResult {
  number: string;
  valid: boolean;
  formatted: string;
  international: string;
  country: string;
  countryCode: string;
  carrier?: PhoneCarrier;
  location?: PhoneLocation;
  socialLinks: PhoneSocialLink[];
  spamScore?: number;
  spamReports?: number;
  ownerName?: string;
  ownerType?: "person" | "business";
  confidence: number;
  sources: string[];
  timestamp: string;
}

// ============ IMAGE ANALYSIS ============

export interface ImageReverseSearch {
  engine: "tineye" | "google" | "yandex" | "bing";
  totalResults: number;
  urls: string[];
  similarImages?: string[];
  confidence: number;
}

export interface ImageLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  source: "exif" | "ai_geo" | "landmark";
  confidence: number;
}

export interface ImageDeepfakeAnalysis {
  isDeepfake: boolean;
  confidence: number;
  analysisMethod: string;
  artifacts?: string[];
  manipulationAreas?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
}

export interface ImageScanResult {
  url: string;
  exif: {
    camera?: string;
    lens?: string;
    dateTaken?: string;
    software?: string;
    location?: ImageLocation;
    allTags?: Record<string, unknown>;
  };
  reverseSearch: ImageReverseSearch[];
  location?: ImageLocation;
  deepfakeAnalysis?: ImageDeepfakeAnalysis;
  similarImages: string[];
  confidence: number;
  timestamp: string;
}

// ============ FRAMEWORK PIPELINE ============

export type PipelineInputType = "username" | "email" | "phone" | "image_url" | "image_file" | "domain" | "ip";

export interface PipelineStep {
  id: string;
  name: string;
  tool: string;
  category: ExternalToolCategory;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  progress: number;
  result?: unknown;
  error?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

export interface PipelineConfig {
  inputType: PipelineInputType;
  input: string;
  enableSocial: boolean;
  enableEmail: boolean;
  enablePhone: boolean;
  enableImage: boolean;
  enableBreach: boolean;
  verifyResults: boolean;
  parallel: boolean;
  maxConcurrency: number;
}

export interface PipelineResult {
  id: string;
  config: PipelineConfig;
  status: "running" | "completed" | "failed";
  progress: number;
  steps: PipelineStep[];
  socialResult?: SocialScanResult;
  emailResult?: EmailScanResult;
  phoneResult?: PhoneScanResult;
  imageResult?: ImageScanResult;
  entities: Array<{
    type: string;
    value: string;
    source: string;
    confidence: number;
  }>;
  confidence: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  reportUrl?: string;
}

// ============ TOOL REFERENCES ============

export const EXTERNAL_TOOLS: ExternalTool[] = [
  // Social Media Tools
  {
    id: "maigret",
    name: "Maigret",
    category: "social",
    description: "3000+ sites, arbre de relations, rapport HTML",
    githubUrl: "https://github.com/soxoj/maigret",
    requiresApiKey: false,
    platforms: ["all"],
    features: ["username_search", "relation_tree", "html_report"]
  },
  {
    id: "blackbird",
    name: "Blackbird",
    category: "social",
    description: "600+ sites, async, JSON export, le plus rapide",
    githubUrl: "https://github.com/p1ngul1n0/blackbird",
    requiresApiKey: false,
    platforms: ["all"],
    features: ["fast_async", "json_export", "bulk_search"]
  },
  {
    id: "sherlock",
    name: "Sherlock",
    category: "social",
    description: "Référence OSINT, 400+ sites, Docker disponible",
    githubUrl: "https://github.com/sherlock-project/sherlock",
    requiresApiKey: false,
    platforms: ["all"],
    features: ["classic", "docker", "cli"]
  },
  {
    id: "whatsmyname",
    name: "WhatsMyName",
    category: "social",
    description: "Base de données maintenue activement, intégrable",
    githubUrl: "https://github.com/WebBreacher/WhatsMyName",
    requiresApiKey: false,
    platforms: ["all"],
    features: ["curated_db", "api_friendly"]
  },
  {
    id: "instaloader",
    name: "Instaloader",
    category: "social",
    description: "Profil, posts, stories, followers, metadata",
    githubUrl: "https://github.com/instaloader/instaloader",
    requiresApiKey: false,
    platforms: ["instagram"],
    features: ["profile", "posts", "stories", "metadata"]
  },
  {
    id: "twint",
    name: "Twint",
    category: "social",
    description: "Scraping Twitter sans API, historique complet",
    githubUrl: "https://github.com/twintproject/twint",
    requiresApiKey: false,
    platforms: ["twitter"],
    features: ["no_api", "historical", "csv_export"]
  },
  // Email Tools
  {
    id: "hunter",
    name: "Hunter.io",
    category: "email",
    description: "Emails d'une entreprise, format, vérification (25/mois gratuits)",
    webUrl: "https://hunter.io",
    apiUrl: "https://api.hunter.io/v2",
    requiresApiKey: true,
    keyName: "hunter",
    keyPlaceholder: "hunter_api_key",
    features: ["domain_search", "email_finder", "email_verifier"]
  },
  {
    id: "snov",
    name: "Snov.io",
    category: "email",
    description: "Enrichissement email + vérification bulk",
    webUrl: "https://snov.io",
    requiresApiKey: true,
    keyName: "snov",
    features: ["enrichment", "bulk_verify", "campaigns"]
  },
  {
    id: "clearbit",
    name: "Clearbit",
    category: "email",
    description: "Email → profil complet (entreprise, poste, LinkedIn)",
    webUrl: "https://clearbit.com",
    apiUrl: "https://person.clearbit.com/v2",
    requiresApiKey: true,
    keyName: "clearbit",
    keyPlaceholder: "sk_...",
    features: ["person_api", "company_api", "enrichment"]
  },
  {
    id: "ghunt",
    name: "GHunt",
    category: "email",
    description: "Google Account → Maps, Photos, YouTube, Calendar",
    githubUrl: "https://github.com/mxrch/GHunt",
    requiresApiKey: false,
    features: ["google_account", "maps", "photos", "youtube"]
  },
  {
    id: "holehe",
    name: "Holehe",
    category: "email",
    description: "120+ sites où l'email est enregistré",
    githubUrl: "https://github.com/megadose/holehe",
    requiresApiKey: false,
    features: ["120_sites", "async", "no_password"]
  },
  // Phone Tools
  {
    id: "truecaller",
    name: "TrueCaller API",
    category: "phone",
    description: "Nom, spam score, opérateur",
    webUrl: "https://truecaller.com",
    apiUrl: "https://api.truecaller.com",
    requiresApiKey: true,
    keyName: "truecaller",
    features: ["caller_id", "spam_detection", "business_search"]
  },
  {
    id: "numverify",
    name: "NumVerify",
    category: "phone",
    description: "Validation + opérateur + ligne mobile/fixe",
    webUrl: "http://apilayer.net",
    apiUrl: "http://apilayer.net/api/validate",
    requiresApiKey: true,
    keyName: "numverify",
    keyPlaceholder: "access_key",
    features: ["validation", "carrier", "line_type", "location"]
  },
  {
    id: "phoneinfoga",
    name: "PhoneInfoga",
    category: "phone",
    description: "Opérateur, pays, portabilité, lignes de recherche",
    githubUrl: "https://github.com/sundowndev/phoneinfoga",
    requiresApiKey: false,
    features: ["advanced_scan", "footprinting", "osint"]
  },
  {
    id: "twilio_lookup",
    name: "Twilio Lookup",
    category: "phone",
    description: "Carrier, type de ligne, portabilité",
    webUrl: "https://twilio.com/lookup",
    apiUrl: "https://lookups.twilio.com/v1/PhoneNumbers",
    requiresApiKey: true,
    keyName: "twilio",
    keyPlaceholder: "AC...",
    features: ["caller_name", "carrier", "line_type"]
  },
  // Image Tools
  {
    id: "tineye",
    name: "TinEye",
    category: "image",
    description: "Occurrences exactes de l'image sur le web",
    webUrl: "https://tineye.com",
    apiUrl: "https://api.tineye.com/rest",
    requiresApiKey: true,
    keyName: "tineye",
    features: ["reverse_search", "exact_matches", "api"]
  },
  {
    id: "geospy",
    name: "GeoSpy AI",
    category: "image",
    description: "Photo → coordonnées GPS par analyse visuelle IA",
    webUrl: "https://geospy.ai",
    apiUrl: "https://api.geospy.ai/v1",
    requiresApiKey: true,
    keyName: "geospy",
    features: ["ai_geo", "gps_prediction", "visual_analysis"]
  },
  {
    id: "fotoforensics",
    name: "FotoForensics",
    category: "image",
    description: "ELA - détecte retouches et manipulations",
    webUrl: "https://fotoforensics.com",
    requiresApiKey: true,
    keyName: "fotoforensics",
    features: ["ela", "manipulation_detection", "clone_detection"]
  },
  // Geolocation Tools
  {
    id: "pic2map",
    name: "Pic2Map",
    category: "geolocation",
    description: "GPS EXIF → carte Google Maps",
    webUrl: "https://pic2map.com",
    requiresApiKey: false,
    features: ["exif_gps", "map_view", "albums"]
  },
  {
    id: "bellingcat",
    name: "Bellingcat GeoLocator",
    category: "geolocation",
    description: "Outil journalistique de géolocalisation d'image",
    webUrl: "https://geolocate.bellingcat.com",
    requiresApiKey: false,
    features: ["verification", "journalism", "open_source"]
  },
  {
    id: "overpass",
    name: "Overpass Turbo",
    category: "geolocation",
    description: "Croiser indices visuels avec OpenStreetMap",
    webUrl: "https://overpass-turbo.eu",
    requiresApiKey: false,
    features: ["osm", "queries", "visual_matching"]
  },
  // Frameworks
  {
    id: "spiderfoot",
    name: "SpiderFoot",
    category: "framework",
    description: "Le plus complet - 200+ modules, interface web",
    githubUrl: "https://github.com/smicallef/spiderfoot",
    requiresApiKey: false,
    features: ["200_modules", "web_ui", "automation", "self_hosted"]
  },
  {
    id: "maltego",
    name: "Maltego",
    category: "framework",
    description: "Graphe de relations visuel, transforms automatiques",
    webUrl: "https://maltego.com",
    requiresApiKey: true,
    keyName: "maltego",
    features: ["graph", "transforms", "visual", "paterva"]
  },
  {
    id: "osint_framework",
    name: "OSINT Framework",
    category: "framework",
    description: "Carte interactive de tous les outils par catégorie",
    webUrl: "https://osintframework.com",
    requiresApiKey: false,
    features: ["reference", "categorized", "interactive"]
  }
];
