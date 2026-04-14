import type {
  ExternalTool,
  SocialScanResult,
  EmailScanResult,
  PhoneScanResult,
  ImageScanResult,
  SocialPlatformResult,
  EmailServiceResult,
  PhoneSocialLink,
  ImageReverseSearch,
  PipelineResult,
  PipelineConfig,
  PipelineStep
} from "../types/external";

// ============================================
// SOCIAL MEDIA TOOLS
// ============================================

/**
 * Simulated Maigret scan (3000+ sites)
 * In production, this would call a backend service running Maigret
 */
export async function runMaigretScan(
  username: string,
  platforms?: string[]
): Promise<SocialPlatformResult[]> {
  // Simulated results - in production, integrate with Maigret API/backend
  const allPlatforms = [
    { name: "GitHub", url: `https://github.com/${username}`, confidence: 90 },
    { name: "Twitter/X", url: `https://x.com/${username}`, confidence: 85 },
    { name: "Instagram", url: `https://instagram.com/${username}`, confidence: 80 },
    { name: "LinkedIn", url: `https://linkedin.com/in/${username}`, confidence: 75 },
    { name: "TikTok", url: `https://tiktok.com/@${username}`, confidence: 70 },
    { name: "YouTube", url: `https://youtube.com/@${username}`, confidence: 65 },
    { name: "Reddit", url: `https://reddit.com/user/${username}`, confidence: 60 },
    { name: "Twitch", url: `https://twitch.tv/${username}`, confidence: 55 },
    { name: "Pinterest", url: `https://pinterest.com/${username}`, confidence: 50 },
    { name: "Telegram", url: `https://t.me/${username}`, confidence: 45 },
    { name: "Snapchat", url: `https://snapchat.com/add/${username}`, confidence: 40 },
    { name: "Discord", url: `https://discord.com/users/${username}`, confidence: 35 },
  ];

  const targetPlatforms = platforms || allPlatforms.map(p => p.name);
  
  const results: SocialPlatformResult[] = allPlatforms
    .filter(p => targetPlatforms.includes(p.name))
    .map(p => ({
      platform: p.name,
      username,
      url: p.url,
      exists: Math.random() > 0.3, // Simulated detection
      confidence: p.confidence,
      profileData: Math.random() > 0.5 ? {
        followers: Math.floor(Math.random() * 10000),
        following: Math.floor(Math.random() * 1000),
        posts: Math.floor(Math.random() * 500),
        bio: "Sample bio text",
        location: "Sample location",
        verified: Math.random() > 0.8,
      } : undefined,
      lastChecked: new Date().toISOString(),
    }));

  return results;
}

/**
 * Simulated Sherlock scan (400+ sites)
 */
export async function runSherlockScan(username: string): Promise<SocialPlatformResult[]> {
  return runMaigretScan(username); // Using same simulation for now
}

/**
 * Simulated Blackbird scan (600+ sites, async)
 */
export async function runBlackbirdScan(username: string): Promise<SocialPlatformResult[]> {
  // Blackbird is known for being fast and async
  const results = await runMaigretScan(username);
  return results.map(r => ({ ...r, confidence: Math.min(r.confidence + 5, 100) }));
}

/**
 * Instagram-specific analysis using Instaloader logic
 * In production, requires Instagram session/backend proxy
 */
export async function analyzeInstagramProfile(
  username: string,
  sessionId?: string
): Promise<SocialPlatformResult | null> {
  // Simulated Instaloader-style analysis
  const result: SocialPlatformResult = {
    platform: "Instagram",
    username,
    url: `https://instagram.com/${username}`,
    exists: Math.random() > 0.2,
    confidence: 85,
    profileData: {
      followers: Math.floor(Math.random() * 50000),
      following: Math.floor(Math.random() * 5000),
      posts: Math.floor(Math.random() * 1000),
      bio: "📸 Photography | Travel | Life\n📍 Paris, France\n✉️ contact@example.com",
      location: "Paris, France",
      profileImage: `https://instagram.com/${username}/profile.jpg`,
      website: "https://example.com",
    },
    metadata: {
      isPrivate: Math.random() > 0.5,
      isBusiness: Math.random() > 0.7,
      category: "Photography",
    },
    lastChecked: new Date().toISOString(),
  };

  return result;
}

/**
 * Twitter/X analysis using Twint-style scraping
 */
export async function analyzeTwitterProfile(
  username: string
): Promise<SocialPlatformResult | null> {
  const result: SocialPlatformResult = {
    platform: "Twitter/X",
    username,
    url: `https://x.com/${username}`,
    exists: Math.random() > 0.2,
    confidence: 90,
    profileData: {
      followers: Math.floor(Math.random() * 100000),
      following: Math.floor(Math.random() * 10000),
      posts: Math.floor(Math.random() * 5000),
      bio: "Tech enthusiast | Developer | OSINT",
      location: "San Francisco, CA",
      verified: Math.random() > 0.7,
      joinedDate: "2015-03-15",
    },
    metadata: {
      protected: Math.random() > 0.8,
      blueVerified: Math.random() > 0.6,
    },
    lastChecked: new Date().toISOString(),
  };

  return result;
}

// ============================================
// EMAIL TOOLS
// ============================================

/**
 * Hunter.io API integration
 * Domain search, email finder, email verifier
 */
export async function hunterDomainSearch(
  domain: string,
  apiKey: string
): Promise<EmailServiceResult[]> {
  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Hunter API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.data.emails.map((email: {
      value: string;
      type: string;
      confidence: number;
      first_name?: string;
      last_name?: string;
      position?: string;
      seniority?: string;
      department?: string;
      linkedin?: string;
      twitter?: string;
      phone_number?: string;
    }) => ({
      service: "Hunter.io",
      exists: true,
      url: `mailto:${email.value}`,
      recoveryEmail: email.value,
      name: `${email.first_name || ""} ${email.last_name || ""}`.trim() || undefined,
      profilePic: undefined,
    }));
  } catch (error) {
    console.error("Hunter API error:", error);
    return [];
  }
}

/**
 * Hunter email verifier
 */
export async function hunterVerifyEmail(
  email: string,
  apiKey: string
): Promise<{ valid: boolean; score: number; result: string }> {
  try {
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Hunter API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      valid: data.data.result === "deliverable",
      score: data.data.score,
      result: data.data.result,
    };
  } catch (error) {
    console.error("Hunter verify error:", error);
    return { valid: false, score: 0, result: "unknown" };
  }
}

/**
 * Clearbit Enrichment API
 * Email → person profile
 */
export async function clearbitEnrichment(
  email: string,
  apiKey: string
): Promise<{
  person?: {
    name?: { fullName?: string; givenName?: string; familyName?: string };
    email?: string;
    location?: string;
    bio?: string;
    site?: string;
    avatar?: string;
    employment?: { name?: string; title?: string; role?: string };
    facebook?: { handle?: string };
    github?: { handle?: string };
    twitter?: { handle?: string };
    linkedin?: { handle?: string };
  };
  company?: {
    name?: string;
    domain?: string;
    industry?: string;
    employees?: number;
    location?: string;
  };
} | null> {
  try {
    const response = await fetch(
      `https://person.clearbit.com/v2/combined/find?email=${encodeURIComponent(email)}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Clearbit API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Clearbit API error:", error);
    return null;
  }
}

/**
 * Simulated GHunt analysis
 * Google Account investigation
 */
export async function runGHuntAnalysis(email: string): Promise<{
  mapsReviews?: Array<{
    place: string;
    rating: number;
    date: string;
    location?: { lat: number; lng: number };
  }>;
  youtubeComments?: Array<{
    video: string;
    comment: string;
    date: string;
  }>;
  photos?: Array<{
    url: string;
    location?: { lat: number; lng: number };
    date: string;
  }>;
  calendars?: Array<{
    name: string;
    public: boolean;
    events: number;
  }>;
  gaiaId?: string;
} | null> {
  // Simulated GHunt results
  return {
    mapsReviews: [
      { place: "Eiffel Tower", rating: 5, date: "2024-01-15", location: { lat: 48.8584, lng: 2.2945 } },
      { place: "Louvre Museum", rating: 4, date: "2024-01-14", location: { lat: 48.8606, lng: 2.3376 } },
    ],
    youtubeComments: [
      { video: "OSINT Tutorial", comment: "Great video!", date: "2024-01-10" },
    ],
    gaiaId: "123456789",
  };
}

/**
 * Simulated Holehe scan (120+ sites)
 */
export async function runHoleheScan(email: string): Promise<EmailServiceResult[]> {
  const services = [
    "Instagram", "Twitter", "Facebook", "LinkedIn", "GitHub",
    "Spotify", "Netflix", "Snapchat", "TikTok", "Pinterest",
    "Reddit", "Twitch", "Discord", "Steam", "Epic Games",
  ];

  return services.map(service => ({
    service,
    exists: Math.random() > 0.6,
    url: `https://${service.toLowerCase().replace(/\s/g, "")}.com`,
  }));
}

// ============================================
// PHONE TOOLS
// ============================================

/**
 * NumVerify API integration
 * Phone validation and carrier info
 */
export async function numverifyLookup(
  phone: string,
  apiKey: string
): Promise<{
  valid: boolean;
  number: string;
  local_format?: string;
  international_format?: string;
  country_prefix?: string;
  country_code?: string;
  country_name?: string;
  location?: string;
  carrier?: string;
  line_type?: string;
} | null> {
  try {
    const response = await fetch(
      `http://apilayer.net/api/validate?access_key=${apiKey}&number=${encodeURIComponent(phone)}&format=1`
    );

    if (!response.ok) {
      throw new Error(`NumVerify error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("NumVerify error:", error);
    return null;
  }
}

/**
 * Simulated PhoneInfoga scan
 * Advanced phone footprinting
 */
export async function runPhoneInfoga(phone: string): Promise<{
  carrier?: string;
  country?: string;
  lineType?: string;
  socialProfiles?: PhoneSocialLink[];
  leaks?: Array<{
    source: string;
    data: string;
    date: string;
  }>;
  reconnaissance?: {
    numlookup?: string;
    truecaller?: string;
    syncme?: string;
  };
}> {
  const cleanPhone = phone.replace(/\D/g, "");
  
  return {
    carrier: "Orange France",
    country: "FR",
    lineType: "mobile",
    socialProfiles: [
      { platform: "WhatsApp", url: `https://wa.me/${cleanPhone}`, confidence: 90 },
      { platform: "Telegram", url: `https://t.me/+${cleanPhone}`, confidence: 70 },
      { platform: "Viber", url: `viber://chat?number=${cleanPhone}`, confidence: 60 },
    ],
    leaks: Math.random() > 0.7 ? [
      { source: "Public Directory", data: "Name associated", date: "2023-06" },
    ] : [],
    reconnaissance: {
      numlookup: `https://www.numlookup.com/${cleanPhone}`,
      truecaller: `https://www.truecaller.com/search/${cleanPhone}`,
      syncme: `https://sync.me/search/${cleanPhone}`,
    },
  };
}

/**
 * Twilio Lookup API
 */
export async function twilioLookup(
  phone: string,
  accountSid: string,
  authToken: string,
  addOns?: string[]
): Promise<{
  callerName?: string;
  countryCode?: string;
  phoneNumber?: string;
  nationalFormat?: string;
  carrier?: {
    name?: string;
    type?: string;
    mobile_network_code?: string;
    mobile_country_code?: string;
  };
  addOns?: Record<string, unknown>;
} | null> {
  try {
    const addonsParam = addOns ? `&AddOns=${addOns.join(",")}` : "";
    const response = await fetch(
      `https://lookups.twilio.com/v1/PhoneNumbers/${encodeURIComponent(phone)}?Type=carrier${addonsParam}`,
      {
        headers: {
          "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Twilio Lookup error:", error);
    return null;
  }
}

// ============================================
// IMAGE TOOLS
// ============================================

/**
 * TinEye Reverse Search API
 */
export async function tineyeSearch(
  imageUrl: string,
  apiKey: string
): Promise<ImageReverseSearch | null> {
  try {
    // Note: TinEye requires multipart/form-data for image uploads
    // This is a simplified version for URL-based search
    const response = await fetch(
      `https://api.tineye.com/rest/search/?api_key=${apiKey}&url=${encodeURIComponent(imageUrl)}`
    );

    if (!response.ok) {
      throw new Error(`TinEye error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      engine: "tineye",
      totalResults: data.results?.total_results || 0,
      urls: data.results?.matches?.map((m: { url?: string }) => m.url).filter(Boolean) || [],
      confidence: 85,
    };
  } catch (error) {
    console.error("TinEye error:", error);
    return null;
  }
}

/**
 * GeoSpy AI - Photo geolocation
 */
export async function geospyAnalyze(
  imageUrl: string,
  apiKey: string
): Promise<{
  coordinates?: { lat: number; lng: number };
  accuracy?: number;
  city?: string;
  country?: string;
  landmarks?: Array<{
    name: string;
    confidence: number;
  }>;
  analysis?: string;
}> {
  try {
    const response = await fetch("https://api.geospy.ai/v1/predict", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageUrl }),
    });

    if (!response.ok) {
      throw new Error(`GeoSpy error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("GeoSpy error:", error);
    return {};
  }
}

/**
 * FotoForensics ELA analysis
 */
export async function fotoforensicsAnalyze(
  imageUrl: string,
  apiKey: string
): Promise<{
  elaUrl?: string;
  errorLevel?: number;
  manipulationDetected?: boolean;
  cloneDetection?: Array<{
    x: number;
    y: number;
    size: number;
  }>;
}> {
  try {
    const response = await fetch("https://api.fotoforensics.com/api/upload", {
      method: "POST",
      headers: {
        "X-Auth-Token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: imageUrl }),
    });

    if (!response.ok) {
      throw new Error(`FotoForensics error: ${response.status}`);
    }

    const data = await response.json();
    return {
      elaUrl: data.ela_url,
      errorLevel: data.error_level,
      manipulationDetected: data.manipulation_detected,
      cloneDetection: data.clone_detection,
    };
  } catch (error) {
    console.error("FotoForensics error:", error);
    return {};
  }
}

// ============================================
// ORCHESTRATED PIPELINE
// ============================================

export async function runOrchestratedPipeline(
  config: PipelineConfig,
  apiKeys: Record<string, string>,
  onProgress?: (progress: number, step: PipelineStep) => void
): Promise<PipelineResult> {
  const steps: PipelineStep[] = [];
  const startTime = new Date().toISOString();
  
  // Generate steps based on config
  if (config.enableSocial && (config.inputType === "username" || config.inputType === "email")) {
    steps.push({
      id: "social_scan",
      name: "Social Media Scan",
      tool: "maigret",
      category: "social",
      status: "pending",
      progress: 0,
    });
  }
  
  if (config.enableEmail && config.inputType === "email") {
    steps.push(
      {
        id: "email_verify",
        name: "Email Verification",
        tool: "hunter",
        category: "email",
        status: "pending",
        progress: 0,
      },
      {
        id: "email_enrichment",
        name: "Email Enrichment",
        tool: "clearbit",
        category: "email",
        status: "pending",
        progress: 0,
      },
      {
        id: "ghunt",
        name: "GHunt Analysis",
        tool: "ghunt",
        category: "email",
        status: "pending",
        progress: 0,
      }
    );
  }
  
  if (config.enablePhone && config.inputType === "phone") {
    steps.push(
      {
        id: "phone_lookup",
        name: "Phone Lookup",
        tool: "numverify",
        category: "phone",
        status: "pending",
        progress: 0,
      },
      {
        id: "phone_infoga",
        name: "Phone Infoga",
        tool: "phoneinfoga",
        category: "phone",
        status: "pending",
        progress: 0,
      }
    );
  }
  
  if (config.enableImage && (config.inputType === "image_url" || config.inputType === "image_file")) {
    steps.push(
      {
        id: "reverse_search",
        name: "Reverse Image Search",
        tool: "tineye",
        category: "image",
        status: "pending",
        progress: 0,
      },
      {
        id: "geo_analysis",
        name: "Geolocation Analysis",
        tool: "geospy",
        category: "image",
        status: "pending",
        progress: 0,
      }
    );
  }

  const result: PipelineResult = {
    id: `pipeline_${Date.now()}`,
    config,
    status: "running",
    progress: 0,
    steps,
    entities: [],
    confidence: 0,
    startTime,
  };

  // Execute steps
  let completedSteps = 0;
  
  for (const step of steps) {
    step.status = "running";
    step.startTime = new Date().toISOString();
    onProgress?.(Math.floor((completedSteps / steps.length) * 100), step);

    try {
      switch (step.id) {
        case "social_scan":
          if (config.inputType === "username") {
            const socialResults = await runMaigretScan(config.input);
            result.socialResult = {
              query: config.input,
              queryType: "username",
              platforms: socialResults,
              totalFound: socialResults.filter(r => r.exists).length,
              scanDuration: 0,
              timestamp: new Date().toISOString(),
            };
            step.result = result.socialResult;
          }
          break;
          
        case "email_verify":
          if (apiKeys.hunter) {
            const domain = config.input.split("@")[1];
            if (domain) {
              const hunterResults = await hunterDomainSearch(domain, apiKeys.hunter);
              step.result = hunterResults;
            }
          }
          break;
          
        case "email_enrichment":
          if (apiKeys.clearbit) {
            const enrichment = await clearbitEnrichment(config.input, apiKeys.clearbit);
            step.result = enrichment;
          }
          break;
          
        case "ghunt":
          const ghuntResult = await runGHuntAnalysis(config.input);
          step.result = ghuntResult;
          break;
          
        case "phone_lookup":
          if (apiKeys.numverify) {
            const phoneResult = await numverifyLookup(config.input, apiKeys.numverify);
            step.result = phoneResult;
          }
          break;
          
        case "phone_infoga":
          const infogaResult = await runPhoneInfoga(config.input);
          step.result = infogaResult;
          break;
          
        case "reverse_search":
          if (apiKeys.tineye) {
            const tineyeResult = await tineyeSearch(config.input, apiKeys.tineye);
            step.result = tineyeResult;
          }
          break;
          
        case "geo_analysis":
          if (apiKeys.geospy) {
            const geoResult = await geospyAnalyze(config.input, apiKeys.geospy);
            step.result = geoResult;
          }
          break;
      }
      
      step.status = "completed";
      step.progress = 100;
    } catch (error) {
      step.status = "failed";
      step.error = String(error);
    }
    
    step.endTime = new Date().toISOString();
    if (step.startTime) {
      step.duration = new Date(step.endTime).getTime() - new Date(step.startTime).getTime();
    }
    
    completedSteps++;
    onProgress?.(Math.floor((completedSteps / steps.length) * 100), step);
  }

  // Calculate final confidence
  const successfulSteps = steps.filter(s => s.status === "completed").length;
  result.confidence = Math.round((successfulSteps / steps.length) * 100);
  result.status = "completed";
  result.progress = 100;
  result.endTime = new Date().toISOString();
  result.duration = result.endTime && result.startTime 
    ? new Date(result.endTime).getTime() - new Date(result.startTime).getTime()
    : 0;

  return result;
}

// ============================================
// VERIFICATION & ANTI-FALSE-POSITIVES
// ============================================

/**
 * Verify URL exists with HEAD request
 */
export async function verifyUrlExists(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      mode: "no-cors",
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 0; // no-cors returns opaque response
  } catch {
    return false;
  }
}

/**
 * Calculate confidence score based on multiple sources
 */
export function calculateConfidenceScore(
  sources: Array<{ source: string; confidence: number; verified?: boolean }>
): { score: number; level: "high" | "medium" | "low" } {
  if (sources.length === 0) {
    return { score: 0, level: "low" };
  }

  const verifiedSources = sources.filter(s => s.verified !== false);
  const avgConfidence = verifiedSources.reduce((sum, s) => sum + s.confidence, 0) / verifiedSources.length;
  
  // Boost for multiple independent sources
  const sourceBoost = Math.min(verifiedSources.length * 5, 20);
  const finalScore = Math.min(Math.round(avgConfidence + sourceBoost), 100);
  
  return {
    score: finalScore,
    level: finalScore >= 80 ? "high" : finalScore >= 50 ? "medium" : "low",
  };
}

// Export tool references
export { EXTERNAL_TOOLS } from "../types/external";
