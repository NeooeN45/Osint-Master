// ============================================================================
// PHONE OSINT MODULES - 15+ modules pour investigation téléphonique
// ============================================================================

import { OSINTModule, EmitFunction, ModuleResult, makeEntityId } from "../types";
import { tryHttp, tryExec } from "../utils";

// ---- 1. NumVerify (Free tier) ----
export const numverifyModule: OSINTModule = {
  id: "numverify",
  name: "NumVerify Phone Lookup",
  category: "phone",
  targetTypes: ["phone"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "numverify", target } });
    
    const entities: any[] = [];
    const cleanPhone = target.replace(/\D/g, "");
    
    // API gratuite sans clé (limitée)
    const data = await tryHttp(`https://numverify.com/php_helper_scripts/phone_api.php?secret_key=${cleanPhone}&number=${cleanPhone}`);
    
    if (data?.valid) {
      entities.push({
        id: makeEntityId(), type: "phone_info", value: target,
        source: "numverify", confidence: 85,
        metadata: { country: data.country_name, location: data.location, carrier: data.carrier, line_type: data.line_type },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "numverify", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 2. PhoneInfoga Integration ----
export const phoneinfogaModule: OSINTModule = {
  id: "phoneinfoga",
  name: "PhoneInfoga (Docker)",
  category: "phone",
  targetTypes: ["phone"],
  priority: 2,
  isAvailable: async () => {
    const { isDockerAvailable } = await import("../../services/dockerExecutor");
    return isDockerAvailable();
  },
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "phoneinfoga", target } });
    
    const { dockerExec } = await import("../../services/dockerExecutor");
    const result = await dockerExec(`phoneinfoga scan -n "${target}" --json 2>/dev/null || echo "{}"`, 30000);
    
    const entities: any[] = [];
    
    try {
      const data = JSON.parse(result.stdout || "{}");
      if (data?.valid) {
        entities.push({
          id: makeEntityId(), type: "phone_intel", value: target,
          source: "phoneinfoga", confidence: 90,
          metadata: data,
          verified: true, depth: 0
        });
      }
    } catch {}
    
    emit({ type: "tool_done", data: { tool: "phoneinfoga", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 3. Truecaller Scraper ----
export const truecallerModule: OSINTModule = {
  id: "truecaller_lookup",
  name: "Truecaller Lookup",
  category: "phone",
  targetTypes: ["phone"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "truecaller_lookup", target } });
    
    const entities: any[] = [];
    
    // Web search for Truecaller results
    const searchUrl = `https://www.google.com/search?q=site:truecaller.com+${encodeURIComponent(target)}`;
    
    entities.push({
      id: makeEntityId(), type: "search_url", value: searchUrl,
      source: "truecaller_lookup", confidence: 50,
      metadata: { note: "Manual lookup required", phone: target },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "truecaller_lookup", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 4. WhatsApp Checker ----
export const whatsappCheckerModule: OSINTModule = {
  id: "whatsapp_checker",
  name: "WhatsApp Number Checker",
  category: "phone",
  targetTypes: ["phone"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "whatsapp_checker", target } });
    
    const cleanPhone = target.replace(/\D/g, "");
    const waLink = `https://wa.me/${cleanPhone}`;
    const waApiLink = `https://api.whatsapp.com/send?phone=${cleanPhone}`;
    
    const entities: any[] = [];
    
    entities.push({
      id: makeEntityId(), type: "whatsapp_link", value: waLink,
      source: "whatsapp_checker", confidence: 95,
      metadata: { phone: target, api_link: waApiLink },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "whatsapp_checker", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 5. Telegram Checker ----
export const telegramCheckerModule: OSINTModule = {
  id: "telegram_checker",
  name: "Telegram Number Checker",
  category: "phone",
  targetTypes: ["phone"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "telegram_checker", target } });
    
    const cleanPhone = target.replace(/\D/g, "");
    const tgLink = `https://t.me/+${cleanPhone}`;
    
    const entities: any[] = [];
    
    entities.push({
      id: makeEntityId(), type: "telegram_link", value: tgLink,
      source: "telegram_checker", confidence: 70,
      metadata: { phone: target, note: "May require contact in address book" },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "telegram_checker", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 6. Phone Number Validation ----
export const phoneValidationModule: OSINTModule = {
  id: "phone_validation",
  name: "Phone Number Validator",
  category: "phone",
  targetTypes: ["phone"],
  priority: 1,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "phone_validation", target } });
    
    const entities: any[] = [];
    
    // Basic validation
    const clean = target.replace(/\D/g, "");
    const isValid = clean.length >= 7 && clean.length <= 15;
    
    // Detect country
    let country = "Unknown";
    if (clean.startsWith("1")) country = "USA/Canada";
    else if (clean.startsWith("33")) country = "France";
    else if (clean.startsWith("44")) country = "UK";
    else if (clean.startsWith("49")) country = "Germany";
    else if (clean.startsWith("39")) country = "Italy";
    else if (clean.startsWith("34")) country = "Spain";
    else if (clean.startsWith("7")) country = "Russia/Kazakhstan";
    else if (clean.startsWith("86")) country = "China";
    else if (clean.startsWith("81")) country = "Japan";
    else if (clean.startsWith("91")) country = "India";
    else if (clean.startsWith("55")) country = "Brazil";
    else if (clean.startsWith("61")) country = "Australia";
    
    if (isValid) {
      entities.push({
        id: makeEntityId(), type: "phone_validation", value: target,
        source: "phone_validation", confidence: 95,
        metadata: { valid: true, country, length: clean.length, e164: `+${clean}` },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "phone_validation", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 7. Carrier Lookup ----
export const carrierLookupModule: OSINTModule = {
  id: "carrier_lookup",
  name: "Carrier/Lookup",
  category: "phone",
  targetTypes: ["phone"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "carrier_lookup", target } });
    
    const entities: any[] = [];
    
    // Use freecarrierlookup.com
    const lookupUrl = `https://www.freecarrierlookup.com/`;
    
    entities.push({
      id: makeEntityId(), type: "carrier_search", value: lookupUrl,
      source: "carrier_lookup", confidence: 60,
      metadata: { phone: target, note: "Manual lookup on freecarrierlookup.com" },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "carrier_lookup", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 8. HLR Lookup ----
export const hlrLookupModule: OSINTModule = {
  id: "hlr_lookup",
  name: "HLR (Home Location Register) Lookup",
  category: "phone",
  targetTypes: ["phone"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "hlr_lookup", target } });
    
    const entities: any[] = [];
    
    // HLR lookup services
    const services = [
      "https://hlr-lookups.com/",
      "https://www.hlrlookup.com/",
      `https://www.hlr-lookups.com/?number=${encodeURIComponent(target)}`
    ];
    
    entities.push({
      id: makeEntityId(), type: "hlr_service", value: services[0],
      source: "hlr_lookup", confidence: 50,
      metadata: { phone: target, alternative_services: services },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "hlr_lookup", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 9. Phone OSINT Framework ----
export const phoneOsintFrameworkModule: OSINTModule = {
  id: "phone_osint_framework",
  name: "Phone OSINT Framework",
  category: "phone",
  targetTypes: ["phone"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "phone_osint_framework", target } });
    
    const cleanPhone = target.replace(/\D/g, "");
    const entities: any[] = [];
    
    // Generate OSINT links
    const osintLinks = {
      google: `https://www.google.com/search?q="${cleanPhone}"`,
      facebook: `https://www.facebook.com/search/top/?q=${cleanPhone}`,
      linkedin: `https://www.linkedin.com/search/results/all/?keywords=${cleanPhone}`,
      twitter: `https://twitter.com/search?q=${cleanPhone}`,
      truepeoplesearch: `https://www.truepeoplesearch.com/results?phoneno=${cleanPhone}`,
      whitepages: `https://www.whitepages.com/phone/${cleanPhone}`,
      spydialer: `https://spydialer.com/`,
      syncme: `https://sync.me/`,
      calleridtest: `https://calleridtest.com/`,
    };
    
    for (const [source, url] of Object.entries(osintLinks)) {
      entities.push({
        id: makeEntityId(), type: "osint_link", value: url,
        source: `phone_osint_${source}`, confidence: 60,
        metadata: { phone: target, platform: source },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "phone_osint_framework", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length, links: Object.keys(osintLinks) }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 10. Phone Reputation Check ----
export const phoneReputationModule: OSINTModule = {
  id: "phone_reputation",
  name: "Phone Reputation/Spam Check",
  category: "phone",
  targetTypes: ["phone"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "phone_reputation", target } });
    
    const cleanPhone = target.replace(/\D/g, "");
    const entities: any[] = [];
    
    // Spam/reputation check services
    const checks = [
      { name: "Should I Answer", url: `https://www.shouldianswer.com/phone-number/${cleanPhone}` },
      { name: "800Notes", url: `https://800notes.com/Phone.aspx/${cleanPhone}` },
      { name: "WhoCalledMe", url: `https://whocalledme.com/check-number/${cleanPhone}` },
      { name: "SpamCalls", url: `https://spamcalls.net/en/` },
    ];
    
    for (const check of checks) {
      entities.push({
        id: makeEntityId(), type: "reputation_check", value: check.url,
        source: `phone_reputation_${check.name.toLowerCase().replace(/\s/g, "_")}`, 
        confidence: 65,
        metadata: { phone: target, service: check.name },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "phone_reputation", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 11. Phone to Social Media ----
export const phoneToSocialModule: OSINTModule = {
  id: "phone_to_social",
  name: "Phone to Social Media Mapper",
  category: "phone",
  targetTypes: ["phone"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "phone_to_social", target } });
    
    const cleanPhone = target.replace(/\D/g, "");
    const entities: any[] = [];
    
    // Social media recovery/lookup
    const socialLinks = {
      instagram_account_recovery: `https://www.instagram.com/accounts/account_recovery_send_ajax/`,
      facebook_forgot: `https://www.facebook.com/login/identify/?ctx=recover&ars=facebook_login`,
      google_account: `https://accounts.google.com/signin/v2/usernamerecovery`,
      twitter_account: `https://twitter.com/account/begin_password_reset`,
      vk_restore: `https://vk.com/restore`,
      telegram_faq: `https://telegram.org/faq#q-how-do-i-log-out`
    };
    
    for (const [platform, url] of Object.entries(socialLinks)) {
      entities.push({
        id: makeEntityId(), type: "social_recovery", value: url,
        source: `phone_to_social_${platform}`, confidence: 40,
        metadata: { phone: target, platform, note: "May help find associated accounts" },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "phone_to_social", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 12. SIM Swap Check ----
export const simSwapCheckModule: OSINTModule = {
  id: "sim_swap_check",
  name: "SIM Swap Attack Check",
  category: "phone",
  targetTypes: ["phone"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "sim_swap_check", target } });
    
    const entities: any[] = [];
    
    entities.push({
      id: makeEntityId(), type: "security_check", value: "https://www.simswapcheck.com/",
      source: "sim_swap_check", confidence: 50,
      metadata: { 
        phone: target, 
        note: "Check if number was targeted for SIM swap",
        recommendations: ["Enable 2FA", "Use authenticator apps instead of SMS", "Contact carrier for PIN protection"]
      },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "sim_swap_check", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 13. Phone Number Breach Check ----
export const phoneBreachModule: OSINTModule = {
  id: "phone_breach_check",
  name: "Phone Number Data Breach Check",
  category: "phone",
  targetTypes: ["phone"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "phone_breach_check", target } });
    
    const cleanPhone = target.replace(/\D/g, "");
    const entities: any[] = [];
    
    // Breach check services
    entities.push({
      id: makeEntityId(), type: "breach_check", value: "https://haveibeenpwned.com/",
      source: "phone_breach_check", confidence: 60,
      metadata: { 
        phone: target,
        search_query: cleanPhone,
        note: "Search HIBP and similar breach databases",
        alternatives: [
          "https://www.dehashed.com/",
          "https://leakcheck.io/",
          "https://scatteredsecrets.com/"
        ]
      },
      verified: false, depth: 0
    });
    
    emit({ type: "tool_done", data: { tool: "phone_breach_check", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 14. Mobile App Lookup ----
export const mobileAppLookupModule: OSINTModule = {
  id: "mobile_app_lookup",
  name: "Mobile App Account Lookup",
  category: "phone",
  targetTypes: ["phone"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "mobile_app_lookup", target } });
    
    const cleanPhone = target.replace(/\D/g, "");
    const entities: any[] = [];
    
    // App-specific lookups
    const apps = [
      { name: "Snapchat", url: `https://snapchat.com/add/${cleanPhone}` },
      { name: "Viber", url: `viber://add?number=${cleanPhone}` },
      { name: "Line", url: `line://ti/p/${cleanPhone}` },
      { name: "Signal", url: `https://signal.org/` },
      { name: "Threema", url: `threema://add?id=UNKNOWN` },
      { name: "WeChat", url: `weixin://dl/add?${cleanPhone}` },
    ];
    
    for (const app of apps) {
      entities.push({
        id: makeEntityId(), type: "app_lookup", value: app.url,
        source: `mobile_app_${app.name.toLowerCase()}`, confidence: 30,
        metadata: { phone: target, app: app.name, note: "URI scheme may not work in browser" },
        verified: false, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "mobile_app_lookup", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// ---- 15. Phone Geolocation ----
export const phoneGeolocationModule: OSINTModule = {
  id: "phone_geolocation",
  name: "Phone Number Geolocation",
  category: "phone",
  targetTypes: ["phone"],
  priority: 2,
  isAvailable: async () => true,
  execute: async (target, emit) => {
    const startTime = Date.now();
    emit({ type: "tool_start", data: { tool: "phone_geolocation", target } });
    
    const cleanPhone = target.replace(/\D/g, "");
    const entities: any[] = [];
    
    // Country code analysis
    const countryCodes: Record<string, string> = {
      "1": "USA/Canada", "7": "Russia", "20": "Egypt", "27": "South Africa",
      "30": "Greece", "31": "Netherlands", "32": "Belgium", "33": "France",
      "34": "Spain", "36": "Hungary", "39": "Italy", "40": "Romania",
      "41": "Switzerland", "43": "Austria", "44": "UK", "45": "Denmark",
      "46": "Sweden", "47": "Norway", "48": "Poland", "49": "Germany",
      "51": "Peru", "52": "Mexico", "53": "Cuba", "54": "Argentina",
      "55": "Brazil", "56": "Chile", "57": "Colombia", "58": "Venezuela",
      "60": "Malaysia", "61": "Australia", "62": "Indonesia", "63": "Philippines",
      "64": "New Zealand", "65": "Singapore", "66": "Thailand", "81": "Japan",
      "82": "South Korea", "84": "Vietnam", "86": "China", "90": "Turkey",
      "91": "India", "92": "Pakistan", "93": "Afghanistan", "94": "Sri Lanka",
      "95": "Myanmar", "98": "Iran", "212": "Morocco", "213": "Algeria",
      "216": "Tunisia", "218": "Libya", "220": "Gambia", "221": "Senegal",
      "234": "Nigeria", "254": "Kenya", "255": "Tanzania", "256": "Uganda",
      "260": "Zambia", "263": "Zimbabwe", "351": "Portugal", "352": "Luxembourg",
      "353": "Ireland", "354": "Iceland", "355": "Albania", "356": "Malta",
      "357": "Cyprus", "358": "Finland", "359": "Bulgaria", "370": "Lithuania",
      "371": "Latvia", "372": "Estonia", "373": "Moldova", "374": "Armenia",
      "375": "Belarus", "376": "Andorra", "377": "Monaco", "378": "San Marino",
      "380": "Ukraine", "381": "Serbia", "382": "Montenegro", "385": "Croatia",
      "386": "Slovenia", "387": "Bosnia", "389": "Macedonia", "420": "Czech Republic",
      "421": "Slovakia", "423": "Liechtenstein", "500": "Falkland Islands",
      "501": "Belize", "502": "Guatemala", "503": "El Salvador", "504": "Honduras",
      "505": "Nicaragua", "506": "Costa Rica", "507": "Panama", "509": "Haiti",
      "590": "Guadeloupe", "591": "Bolivia", "592": "Guyana", "593": "Ecuador",
      "595": "Paraguay", "597": "Suriname", "598": "Uruguay", "599": "Curacao",
    };
    
    let country = "Unknown";
    let code = "";
    
    // Try to match country code
    for (let i = 1; i <= 4 && i <= cleanPhone.length; i++) {
      const prefix = cleanPhone.substring(0, i);
      if (countryCodes[prefix]) {
        country = countryCodes[prefix];
        code = prefix;
        break;
      }
    }
    
    if (country !== "Unknown") {
      entities.push({
        id: makeEntityId(), type: "phone_geolocation", value: country,
        source: "phone_geolocation", confidence: 85,
        metadata: { 
          phone: target, 
          country_code: code,
          country: country,
          note: "Based on country code prefix"
        },
        verified: true, depth: 0
      });
    }
    
    emit({ type: "tool_done", data: { tool: "phone_geolocation", found: entities.length, duration: Date.now() - startTime } });
    return { success: true, data: { found: entities.length, country }, entities, executionTimeMs: Date.now() - startTime };
  }
};

// Export all phone modules
export const phoneModules = [
  numverifyModule,
  phoneinfogaModule,
  truecallerModule,
  whatsappCheckerModule,
  telegramCheckerModule,
  phoneValidationModule,
  carrierLookupModule,
  hlrLookupModule,
  phoneOsintFrameworkModule,
  phoneReputationModule,
  phoneToSocialModule,
  simSwapCheckModule,
  phoneBreachModule,
  mobileAppLookupModule,
  phoneGeolocationModule,
];
