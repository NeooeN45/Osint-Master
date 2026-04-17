// ============================================================================
// OSINT MODULES API ROUTES
// REST API for managing 100+ OSINT modules
// ============================================================================

import { Router, Request, Response } from "express";
import { moduleManager } from "../services/moduleManagerService";
import {
  osintModules,
  getModulesByCategory,
  categoryNames,
  ModuleCategory,
} from "../config/osint-modules";

const router = Router();

// ==========================================================================
// MODULE CATALOG
// ==========================================================================

// Get all modules (root endpoint)
router.get("/", (req: Request, res: Response) => {
  const modules = osintModules.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    installed: m.installed,
    enabled: m.enabled,
    version: m.version,
  }));

  res.json({
    count: modules.length,
    modules,
  });
});

// Get all modules (catalog endpoint)
router.get("/catalog", (req: Request, res: Response) => {
  const { category, installed, enabled } = req.query;

  let modules = [...osintModules];

  // Filter by category
  if (category) {
    modules = modules.filter((m) => m.category === category);
  }

  // Filter by installation status
  if (installed === "true") {
    modules = modules.filter((m) => m.installed);
  } else if (installed === "false") {
    modules = modules.filter((m) => !m.installed);
  }

  // Filter by enabled status
  if (enabled === "true") {
    modules = modules.filter((m) => m.enabled);
  } else if (enabled === "false") {
    modules = modules.filter((m) => !m.enabled);
  }

  res.json({
    count: modules.length,
    modules: modules.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      subcategory: m.subcategory,
      icon: m.icon,
      installMethod: m.installMethod,
      enabled: m.enabled,
      installed: m.installed,
      risk: m.risk,
      requiresRoot: m.requiresRoot,
      platform: m.platform,
      github: m.github,
      website: m.website,
      apiKeys: m.apiKeys,
    })),
  });
});

// Get module categories
router.get("/categories", (req: Request, res: Response) => {
  const categories = Object.entries(categoryNames).map(([id, name]) => ({
    id,
    name,
    count: getModulesByCategory(id as ModuleCategory).length,
  }));

  res.json({
    count: categories.length,
    categories,
  });
});

// Get single module details
router.get("/catalog/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const module = osintModules.find((m) => m.id === id);

  if (!module) {
    return res.status(404).json({ error: "Module not found" });
  }

  res.json({
    module: {
      ...module,
      // Don't expose install commands to frontend for security
      installCommand: undefined,
      executeCommand: undefined,
      checkCommand: undefined,
    },
  });
});

// ==========================================================================
// MODULE STATUS
// ==========================================================================

// Get all module statuses
router.get("/status", async (req: Request, res: Response) => {
  try {
    const statuses = await moduleManager.getAllModuleStatuses();

    res.json({
      count: statuses.length,
      installed: statuses.filter((s) => s.installed).length,
      enabled: statuses.filter((s) => s.enabled).length,
      statuses,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get module statuses" });
  }
});

// Check specific module status
router.get("/status/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const isInstalled = await moduleManager.checkModuleInstallation(id);
    const module = osintModules.find((m) => m.id === id);

    res.json({
      id,
      installed: isInstalled,
      enabled: module?.enabled || false,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check module status" });
  }
});

// ==========================================================================
// MODULE INSTALLATION
// ==========================================================================

// Install single module
router.post("/install/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await moduleManager.installModule(id);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        moduleId: id,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        moduleId: id,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Installation failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Batch install modules
router.post("/install", async (req: Request, res: Response) => {
  const { moduleIds } = req.body;

  if (!Array.isArray(moduleIds)) {
    return res.status(400).json({ error: "moduleIds array required" });
  }

  try {
    const result = await moduleManager.batchInstall(moduleIds);

    res.json({
      success: result.failed === 0,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Batch installation failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Install all enabled modules
router.post("/install-all", async (req: Request, res: Response) => {
  try {
    const enabledModules = osintModules.filter((m) => m.enabled);
    const moduleIds = enabledModules.map((m) => m.id);

    const result = await moduleManager.batchInstall(moduleIds);

    res.json({
      success: result.failed === 0,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Installation failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==========================================================================
// MODULE EXECUTION
// ==========================================================================

// Execute single module
router.post("/execute/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { parameters, apiKeys } = req.body;

  try {
    // Merge API keys into parameters if provided
    const mergedParams = {
      ...parameters,
      ...apiKeys,
    };

    const result = await moduleManager.executeModule(id, mergedParams);

    res.json({
      moduleId: id,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Execution failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Execute multiple modules
router.post("/execute", async (req: Request, res: Response) => {
  const { moduleIds, parameters, apiKeys } = req.body;

  if (!Array.isArray(moduleIds)) {
    return res.status(400).json({ error: "moduleIds array required" });
  }

  try {
    // Merge API keys into all parameters
    const mergedParams: Record<string, Record<string, any>> = {};
    for (const moduleId of moduleIds) {
      mergedParams[moduleId] = {
        ...parameters?.[moduleId],
        ...apiKeys,
      };
    }

    const results = await moduleManager.executeBatch(moduleIds, mergedParams);

    res.json({
      results,
      summary: {
        total: moduleIds.length,
        successful: Object.values(results).filter((r) => r.success).length,
        failed: Object.values(results).filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Batch execution failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==========================================================================
// AUTONOMOUS OSINT
// ==========================================================================

// Execute autonomous OSINT investigation
router.post("/autonomous", async (req: Request, res: Response) => {
  const { target, targetType, enabledModules, apiKeys } = req.body;

  if (!target || !targetType) {
    return res.status(400).json({ error: "target and targetType required" });
  }

  try {
    const result = await moduleManager.executeAutonomousOSINT(
      target,
      targetType,
      enabledModules
    );

    // Merge API keys if provided
    if (apiKeys) {
      for (const moduleId of Object.keys(result.results)) {
        const module = osintModules.find((m) => m.id === moduleId);
        if (module?.apiKeys) {
          // Module requires API keys, results might need re-execution
          // For now, just note that API keys are available
        }
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Autonomous investigation failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==========================================================================
// MODULE MANAGEMENT
// ==========================================================================

// Enable module
router.post("/enable/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const success = moduleManager.enableModule(id);

  if (success) {
    res.json({ success: true, message: `Module ${id} enabled` });
  } else {
    res.status(404).json({ success: false, error: "Module not found" });
  }
});

// Disable module
router.post("/disable/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const success = moduleManager.disableModule(id);

  if (success) {
    res.json({ success: true, message: `Module ${id} disabled` });
  } else {
    res.status(404).json({ success: false, error: "Module not found" });
  }
});

// Uninstall module
router.post("/uninstall/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await moduleManager.uninstallModule(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Uninstall failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==========================================================================
// SYSTEM INFORMATION
// ==========================================================================

// Get system info
router.get("/system", async (req: Request, res: Response) => {
  try {
    const info = await moduleManager.getSystemInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: "Failed to get system info" });
  }
});

// Check dependencies
router.get("/dependencies", async (req: Request, res: Response) => {
  try {
    const deps = await moduleManager.installDependencies();
    res.json(deps);
  } catch (error) {
    res.status(500).json({ error: "Failed to check dependencies" });
  }
});

// Install missing dependencies
router.post("/dependencies/install", async (req: Request, res: Response) => {
  // This would install missing dependencies
  // Implementation depends on OS and package manager
  res.json({
    message: "Dependency installation must be done manually",
    commands: {
      ubuntu: "sudo apt install python3 python3-pip git curl golang nodejs npm",
      macos: "brew install python git curl go node",
      windows: "choco install python git curl golang nodejs",
    },
  });
});

// ==========================================================================
// QUICK START
// ==========================================================================

// Quick start - install common modules
router.post("/quickstart", async (req: Request, res: Response) => {
  const commonModules = [
    "sherlock",
    "holehe",
    "theharvester",
    "nmap",
    "shodan",
    "exiftool",
    "waybackurls",
    "whatweb",
    "subfinder",
    "hibp",
  ];

  try {
    const result = await moduleManager.batchInstall(commonModules);

    res.json({
      message: "Quick start installation complete",
      ...result,
      recommendations: [
        "Set up API keys for Shodan, VirusTotal, and Have I Been Pwned",
        "Configure Instagram/Twitter session tokens for social media modules",
        "Install optional tools: Amass, Masscan, Go tools for advanced recon",
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Quick start failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==========================================================================
// API KEYS MANAGEMENT
// ==========================================================================

// Get required API keys
router.get("/apikeys/required", (req: Request, res: Response) => {
  const requiredKeys = new Set<string>();

  for (const module of osintModules) {
    if (module.apiKeys) {
      for (const key of module.apiKeys) {
        requiredKeys.add(key);
      }
    }
  }

  const modulesByKey: Record<string, string[]> = {};
  for (const key of requiredKeys) {
    modulesByKey[key] = osintModules
      .filter((m) => m.apiKeys?.includes(key))
      .map((m) => m.name);
  }

  res.json({
    count: requiredKeys.size,
    apiKeys: Array.from(requiredKeys).map((key) => ({
      name: key,
      description: getApiKeyDescription(key),
      url: getApiKeyUrl(key),
      modules: modulesByKey[key] || [],
    })),
  });
});

// Helper functions for API key info
function getApiKeyDescription(key: string): string {
  const descriptions: Record<string, string> = {
    shodan: "Shodan API key for IoT device search",
    virustotal: "VirusTotal API key for malware analysis",
    censys_id: "Censys API ID for internet asset discovery",
    censys_secret: "Censys API secret",
    hibp_api: "Have I Been Pwned API key for breach checking",
    telegram_id: "Telegram API ID from my.telegram.org",
    telegram_hash: "Telegram API hash",
    discord_token: "Discord bot token",
    reddit_id: "Reddit API client ID",
    reddit_secret: "Reddit API secret",
    zoomeye: "ZoomEye API key",
    fofa_email: "FOFA account email",
    fofa_key: "FOFA API key",
    onyphe: "Onyphe API key",
    greynoise: "GreyNoise API key",
    dehashed_email: "DeHashed account email",
    dehashed_key: "DeHashed API key",
    leaklookup_key: "Leak-Lookup API key",
    weleakinfo_key: "WeLeakInfo API key",
    intelx_key: "Intelligence X API key",
    snusbase_key: "Snusbase API key",
    chaos: "Chaos (ProjectDiscovery) API key",
    spyse: "Spyse API key",
    securitytrails: "SecurityTrails API key",
    hunter: "Hunter.io API key for email finding",
    pimeyes_key: "PimEyes API key for face recognition",
  };

  return descriptions[key] || `${key} API key`;
}

function getApiKeyUrl(key: string): string {
  const urls: Record<string, string> = {
    shodan: "https://account.shodan.io",
    virustotal: "https://www.virustotal.com/gui/user-api-key",
    censys_id: "https://search.censys.io/account/api",
    hibp_api: "https://haveibeenpwned.com/API/Key",
    telegram_id: "https://my.telegram.org",
    discord_token: "https://discord.com/developers/applications",
    reddit_id: "https://www.reddit.com/prefs/apps",
    zoomeye: "https://www.zoomeye.org/profile",
    fofa_email: "https://fofa.so/",
    onyphe: "https://www.onyphe.io/",
    greynoise: "https://www.greynoise.io/viz/account/",
    dehashed_email: "https://dehashed.com/",
    leaklookup_key: "https://leak-lookup.com/",
    intelx_key: "https://intelx.io/account",
    snusbase_key: "https://snusbase.com/",
    chaos: "https://chaos.projectdiscovery.io/",
    securitytrails: "https://securitytrails.com/app/account/credentials",
    hunter: "https://hunter.io/api",
    pimeyes_key: "https://pimeyes.com/en/api",
  };

  return urls[key] || "#";
}

export default router;
