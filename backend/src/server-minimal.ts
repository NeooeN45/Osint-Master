import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3003;
const NODE_ENV = process.env.NODE_ENV || "development";

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === "production" ? undefined : false,
}));

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:5173"],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Root route
app.get("/", (_req, res) => {
  res.json({
    name: "OSINT Master API",
    version: "2.0.0",
    status: "running",
    endpoints: [
      "/api/modules/catalog",
      "/api/modules/categories",
      "/api/modules/install/:id",
      "/api/modules/execute/:id",
      "/api/modules/autonomous",
      "/api/ai/chat",
      "/health"
    ],
    modules: 14,
    categories: 14
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Orchestrator endpoint
app.post("/api/ai/chat", async (req, res) => {
  const { message, mode, conversationId } = req.body;
  
  // Simulated AI response for now
  const responses: Record<string, string> = {
    analyze: `🔍 **Analysis Complete**

Target detected. Recommended tools:
- Geolocation lookup
- Network reconnaissance  
- WHOIS lookup

Type "execute" to run these tools.`,
    plan: `📋 **Investigation Plan**

Phase 1: Reconnaissance (30s)
Phase 2: Deep scan (90s)
Phase 3: Validation (30s)

Ready to execute?`,
    execute: `⚡ **Execution Report**

✅ Geolocation: Paris, France
✅ Network: Orange Fiber
✅ Confidence: 87%

Investigation complete!`,
    conclude: `📊 **Final Report**

Target analyzed successfully.
Key findings compiled.
Ready for export.`
  };

  res.json({
    message: {
      id: Date.now().toString(),
      role: "assistant",
      content: responses[mode] || "I'm ready to help with your OSINT investigation.",
      timestamp: new Date().toISOString(),
    },
    tasks: [],
    confidence: 85,
  });
});

// Geolocation endpoints
app.post("/api/geolocation/ip", async (req, res) => {
  const { ip } = req.body;
  
  res.json({
    ip: ip || "8.8.8.8",
    location: {
      latitude: 48.8566,
      longitude: 2.3522,
      city: "Paris",
      country: "France",
    },
    network: {
      isp: "Orange",
      organization: "Orange France",
    },
    confidence: 85,
  });
});

// Social Media endpoints
app.post("/api/social/instagram/profile", async (req, res) => {
  res.status(503).json({
    error: "Instagram API requires configuration",
    message: "Please set up Apify or ScrapingBee API key"
  });
});

app.post("/api/social/twitter/profile", async (req, res) => {
  res.status(503).json({
    error: "Twitter API requires configuration",
    message: "Please set up Twitter API v2 Bearer Token"
  });
});

app.get("/api/social/status", async (_req, res) => {
  res.json({
    instagram: false,
    twitter: false,
    facebook: false,
    tiktok: false,
  });
});

// OSINT Modules API - Static data for now to avoid import issues
const MODULE_CATEGORIES = [
  { id: "person", name: "Person & Identity", count: 10 },
  { id: "domain", name: "Domain Intelligence", count: 10 },
  { id: "network", name: "Network Intelligence", count: 10 },
  { id: "web", name: "Web Intelligence", count: 10 },
  { id: "social", name: "Social Media", count: 10 },
  { id: "breach", name: "Breach & Leaks", count: 10 },
  { id: "image", name: "Image & Video", count: 10 },
  { id: "crypto", name: "Cryptocurrency", count: 4 },
  { id: "darkweb", name: "Dark Web", count: 5 },
  { id: "geolocation", name: "Geolocation", count: 5 },
  { id: "email", name: "Email Intelligence", count: 4 },
  { id: "phone", name: "Phone Intelligence", count: 3 },
  { id: "malware", name: "Malware Analysis", count: 3 },
  { id: "company", name: "Company Intelligence", count: 4 },
];

const SAMPLE_MODULES = [
  { id: "sherlock", name: "Sherlock", description: "Hunt down social media accounts by username", category: "person", subcategory: "username", icon: "UserSearch", installMethod: "pip", enabled: true, installed: false, risk: "low", requiresRoot: false, platform: ["linux", "macos", "windows"], github: "https://github.com/sherlock-project/sherlock" },
  { id: "maigret", name: "Maigret", description: "Collect dossier on person by username, email or phone", category: "person", subcategory: "username", icon: "UserCircle", installMethod: "pip", enabled: true, installed: false, risk: "low", requiresRoot: false, platform: ["linux", "macos", "windows"], github: "https://github.com/soxoj/maigret" },
  { id: "holehe", name: "Holehe", description: "Check if email is registered on 120+ platforms", category: "person", subcategory: "email", icon: "Mail", installMethod: "pip", enabled: true, installed: false, risk: "low", requiresRoot: false, platform: ["linux", "macos", "windows"], github: "https://github.com/megadose/holehe" },
  { id: "theharvester", name: "theHarvester", description: "Gather emails, subdomains, hosts from public sources", category: "domain", subcategory: "reconnaissance", icon: "Globe", installMethod: "git", enabled: true, installed: false, risk: "low", requiresRoot: false, platform: ["linux", "macos", "windows"], github: "https://github.com/laramies/theHarvester" },
  { id: "amass", name: "Amass", description: "In-depth attack surface mapping and asset discovery", category: "domain", subcategory: "reconnaissance", icon: "Network", installMethod: "apt", enabled: true, installed: false, risk: "medium", requiresRoot: false, platform: ["linux", "macos"], github: "https://github.com/OWASP/Amass" },
  { id: "subfinder", name: "Subfinder", description: "Fast passive subdomain discovery tool", category: "domain", subcategory: "subdomain", icon: "Search", installMethod: "apt", enabled: true, installed: false, risk: "low", requiresRoot: false, platform: ["linux", "macos", "windows"], github: "https://github.com/projectdiscovery/subfinder" },
  { id: "nmap", name: "Nmap", description: "Network discovery and security auditing", category: "network", subcategory: "scanner", icon: "Scan", installMethod: "apt", enabled: true, installed: false, risk: "medium", requiresRoot: true, platform: ["linux", "macos"], website: "https://nmap.org" },
  { id: "shodan", name: "Shodan", description: "Search engine for Internet-connected devices", category: "network", subcategory: "search", icon: "Search", installMethod: "pip", enabled: true, installed: false, risk: "low", requiresRoot: false, platform: ["linux", "macos", "windows"], website: "https://shodan.io", apiKeys: ["shodan"] },
  { id: "whatweb", name: "WhatWeb", description: "Next generation web scanner identifying technologies", category: "web", subcategory: "fingerprint", icon: "Fingerprint", installMethod: "apt", enabled: true, installed: false, risk: "medium", requiresRoot: false, platform: ["linux", "macos"], website: "https://www.morningstarsecurity.com/research/whatweb" },
  { id: "gobuster", name: "Gobuster", description: "Directory/file & DNS busting tool", category: "web", subcategory: "discovery", icon: "FolderSearch", installMethod: "apt", enabled: true, installed: false, risk: "medium", requiresRoot: false, platform: ["linux", "macos"], github: "https://github.com/OJ/gobuster" },
  { id: "instaloader", name: "Instaloader", description: "Download pictures and metadata from Instagram", category: "social", subcategory: "instagram", icon: "Instagram", installMethod: "pip", enabled: true, installed: false, risk: "medium", requiresRoot: false, platform: ["linux", "macos", "windows"], github: "https://github.com/instaloader/instaloader" },
  { id: "twint", name: "Twint", description: "Advanced Twitter scraping without API limits", category: "social", subcategory: "twitter", icon: "Twitter", installMethod: "pip", enabled: true, installed: false, risk: "medium", requiresRoot: false, platform: ["linux", "macos", "windows"], github: "https://github.com/twintproject/twint" },
  { id: "exiftool", name: "ExifTool", description: "Read, write and edit metadata in images and files", category: "image", subcategory: "metadata", icon: "Image", installMethod: "apt", enabled: true, installed: false, risk: "low", requiresRoot: false, platform: ["linux", "macos"], website: "https://exiftool.org" },
  { id: "hibp", name: "Have I Been Pwned", description: "Check email against data breaches", category: "breach", subcategory: "email", icon: "ShieldAlert", installMethod: "pip", enabled: true, installed: false, risk: "low", requiresRoot: false, platform: ["linux", "macos", "windows"], website: "https://haveibeenpwned.com", apiKeys: ["hibp_api"] },
];

// OSINT Modules API
app.get("/api/modules/catalog", (_req, res) => {
  res.json({
    count: SAMPLE_MODULES.length,
    modules: SAMPLE_MODULES,
  });
});

app.get("/api/modules/categories", (_req, res) => {
  res.json({
    count: MODULE_CATEGORIES.length,
    categories: MODULE_CATEGORIES,
  });
});

app.post("/api/modules/install/:id", (req, res) => {
  const { id } = req.params;
  const module = SAMPLE_MODULES.find(m => m.id === id);
  if (module) {
    module.installed = true;
    res.json({ success: true, message: `${module.name} installed successfully`, moduleId: id });
  } else {
    res.status(404).json({ success: false, message: `Module ${id} not found` });
  }
});

app.post("/api/modules/install", (req, res) => {
  const { moduleIds } = req.body;
  if (!Array.isArray(moduleIds)) {
    return res.status(400).json({ error: "moduleIds array required" });
  }

  const results = moduleIds.map(id => {
    const module = SAMPLE_MODULES.find(m => m.id === id);
    if (module) {
      module.installed = true;
      return { moduleId: id, success: true, message: `${module.name} installed` };
    }
    return { moduleId: id, success: false, message: "Module not found" };
  });

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  res.json({
    success: failed === 0,
    total: moduleIds.length,
    successful,
    failed,
    results,
  });
});

app.post("/api/modules/quickstart", (req, res) => {
  const commonModules = ["sherlock", "holehe", "nmap", "shodan", "exiftool"];

  commonModules.forEach(id => {
    const module = SAMPLE_MODULES.find(m => m.id === id);
    if (module) module.installed = true;
  });

  res.json({
    message: "Quick start installation complete",
    total: commonModules.length,
    successful: commonModules.length,
    failed: 0,
    recommendations: [
      "Set up API keys for Shodan, VirusTotal, and Have I Been Pwned",
      "Configure Instagram/Twitter session tokens for social media modules",
      "Install optional tools: Amass, Masscan, Go tools for advanced recon",
    ],
  });
});

app.get("/api/modules/status", (req, res) => {
  const statuses = SAMPLE_MODULES.map(m => ({
    id: m.id,
    installed: m.installed,
    enabled: m.enabled,
    error: undefined,
  }));

  res.json({
    count: statuses.length,
    installed: statuses.filter((s) => s.installed).length,
    enabled: statuses.filter((s) => s.enabled).length,
    statuses,
  });
});

app.post("/api/modules/enable/:id", (req, res) => {
  const { id } = req.params;
  const module = SAMPLE_MODULES.find(m => m.id === id);
  if (module) {
    module.enabled = true;
    res.json({ success: true, message: `Module ${id} enabled` });
  } else {
    res.status(404).json({ success: false, message: "Module not found" });
  }
});

app.post("/api/modules/disable/:id", (req, res) => {
  const { id } = req.params;
  const module = SAMPLE_MODULES.find(m => m.id === id);
  if (module) {
    module.enabled = false;
    res.json({ success: true, message: `Module ${id} disabled` });
  } else {
    res.status(404).json({ success: false, message: "Module not found" });
  }
});

app.post("/api/modules/execute/:id", (req, res) => {
  const { id } = req.params;
  const module = SAMPLE_MODULES.find(m => m.id === id);

  if (!module) {
    return res.status(404).json({ success: false, error: "Module not found" });
  }

  if (!module.installed) {
    return res.status(400).json({ success: false, error: "Module not installed" });
  }

  // Simulate execution
  res.json({
    moduleId: id,
    success: true,
    output: `Module ${module.name} executed successfully\nResults: Simulated output for demonstration`,
    duration: 1500,
  });
});

app.get("/api/modules/system", (req, res) => {
  res.json({
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    pythonVersion: undefined,
    goVersion: undefined,
    dockerInstalled: false,
  });
});

app.get("/api/modules/apikeys/required", (req, res) => {
  const requiredKeys = new Set<string>();

  SAMPLE_MODULES.forEach(module => {
    if (module.apiKeys) {
      module.apiKeys.forEach(key => requiredKeys.add(key));
    }
  });

  res.json({
    count: requiredKeys.size,
    apiKeys: Array.from(requiredKeys).map((key) => ({
      name: key,
      description: `${key} API key`,
    })),
  });
});

// Setup Agent Routes
app.get("/api/setup/status", async (req, res) => {
  const { setupAgent } = await import("./agents/setupAgent");
  const prereqs = await setupAgent.checkPrerequisites();
  res.json({
    ready: prereqs.ready,
    prerequisites: prereqs,
    message: prereqs.ready ? "System ready for OSINT tools installation" : "Missing prerequisites"
  });
});

app.post("/api/setup/prerequisites", async (req, res) => {
  const { setupAgent } = await import("./agents/setupAgent");
  
  // Start installation in background
  res.json({ message: "Installing prerequisites... This may take several minutes." });
  
  // Actually run the installation
  setupAgent.installPrerequisites().then(result => {
    console.log("Prerequisites installation:", result);
  });
});

app.post("/api/setup/essentials", async (req, res) => {
  const { setupAgent } = await import("./agents/setupAgent");
  const result = await setupAgent.installEssentials();
  res.json(result);
});

app.post("/api/setup/all", async (req, res) => {
  const { setupAgent } = await import("./agents/setupAgent");
  
  // For large installs, start in background and return job ID
  const jobId = Date.now().toString();
  res.json({ 
    jobId, 
    message: "Installation started in background. Check /api/setup/progress for status." 
  });
  
  // Run actual installation
  setupAgent.installAll().then(result => {
    console.log(`Installation job ${jobId} complete:`, result.summary);
  });
});

app.get("/api/setup/progress", async (req, res) => {
  const { setupAgent } = await import("./agents/setupAgent");
  const progress = setupAgent.getProgress();
  const log = setupAgent.getLog();
  
  res.json({
    progress,
    recentLogs: log.slice(-20),
    totalLogs: log.length
  });
});

// Real Tool Execution
app.post("/api/tools/check/:id", async (req, res) => {
  const { id } = req.params;
  const { osintInstaller } = await import("./services/osintInstaller");
  const installed = await osintInstaller.checkInstallation(id);
  res.json({ toolId: id, installed });
});

app.post("/api/tools/install/:id", async (req, res) => {
  const { id } = req.params;
  const { osintInstaller } = await import("./services/osintInstaller");
  const result = await osintInstaller.install(id);
  res.json({ toolId: id, ...result });
});

app.post("/api/tools/execute/:id", async (req, res) => {
  const { id } = req.params;
  const { params, apiKeys } = req.body;
  const { osintInstaller } = await import("./services/osintInstaller");
  
  const result = await osintInstaller.execute(id, params || {}, apiKeys || {});
  res.json({ toolId: id, ...result });
});

app.post("/api/tools/autonomous", async (req, res) => {
  const { target, targetType, tools } = req.body;
  const { osintInstaller } = await import("./services/osintInstaller");
  
  const result = await osintInstaller.autonomous(target, targetType, tools);
  res.json(result);
});

app.get("/api/tools/catalog", async (req, res) => {
  const { osintInstaller } = await import("./services/osintInstaller");
  const tools = await osintInstaller.getAllTools();
  const categories = osintInstaller.getCategories();
  
  res.json({
    count: tools.length,
    categories,
    tools
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OSINT Master Backend running on port ${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
