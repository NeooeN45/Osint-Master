import type { 
  GeneratedProfile, 
  DataSourceResult, 
  SocialAccount, 
  PhonePattern,
  DigitalFootprint,
  FootprintEvent,
  ToolCategory 
} from "../types";

// Run automated OSINT profiling
export async function runAutomatedProfiling(
  query: string,
  type: "person" | "company" | "phone" | "email" | "username",
  apiKeys: Record<string, string>,
  onProgress: (progress: number) => void
): Promise<Partial<GeneratedProfile>> {
  const dataSources: DataSourceResult[] = [];
  const socialAccounts: SocialAccount[] = [];
  const phonePatterns: PhonePattern[] = [];
  const footprint: DigitalFootprint = {
    emails: [],
    phones: [],
    usernames: [],
    domains: [],
    ips: [],
    locations: [],
    relatedPersons: [],
    timeline: [],
  };
  
  const totalSteps = 5;
  let currentStep = 0;
  
  // Step 1: Username search across platforms
  if (type === "person" || type === "username") {
    onProgress(++currentStep / totalSteps);
    const username = type === "username" ? query : query.toLowerCase().replace(/\s+/g, "");
    
    const platforms = [
      { name: "GitHub", url: `https://github.com/${username}` },
      { name: "Twitter/X", url: `https://x.com/${username}` },
      { name: "Instagram", url: `https://instagram.com/${username}` },
      { name: "LinkedIn", url: `https://linkedin.com/in/${username}` },
      { name: "TikTok", url: `https://tiktok.com/@${username}` },
      { name: "YouTube", url: `https://youtube.com/@${username}` },
      { name: "Reddit", url: `https://reddit.com/user/${username}` },
      { name: "Twitch", url: `https://twitch.tv/${username}` },
    ];
    
    for (const platform of platforms) {
      // Simulate check (in production, use proper scraping APIs)
      socialAccounts.push({
        platform: platform.name,
        username: username,
        url: platform.url,
        foundAt: new Date().toISOString(),
        confidence: 60 + Math.floor(Math.random() * 30),
      });
    }
    
    dataSources.push({
      source: "social_username_search",
      category: "social" as ToolCategory,
      data: { platforms: platforms.map(p => p.name) },
      timestamp: new Date().toISOString(),
      success: true,
    });
  }
  
  // Step 2: Phone analysis
  if (type === "phone" || query.match(/\d{10,}/)) {
    onProgress(++currentStep / totalSteps);
    const cleanPhone = query.replace(/\D/g, "");
    
    // Analyze phone patterns
    const patterns = analyzePhonePatterns(cleanPhone);
    phonePatterns.push(...patterns);
    
    footprint.phones.push(cleanPhone);
    
    dataSources.push({
      source: "phone_analysis",
      category: "phone" as ToolCategory,
      data: { patterns },
      timestamp: new Date().toISOString(),
      success: true,
    });
  }
  
  // Step 3: Email analysis
  if (type === "email" || query.includes("@")) {
    onProgress(++currentStep / totalSteps);
    footprint.emails.push(query.toLowerCase());
    
    // Extract username from email for additional search
    const username = query.split("@")[0];
    if (username) {
      footprint.usernames.push(username);
    }
    
    dataSources.push({
      source: "email_analysis",
      category: "identity" as ToolCategory,
      data: { email: query },
      timestamp: new Date().toISOString(),
      success: true,
    });
  }
  
  // Step 4: Domain analysis (if email or domain query)
  if (query.includes("@") || query.includes(".")) {
    onProgress(++currentStep / totalSteps);
    let domain = query;
    if (query.includes("@")) {
      domain = query.split("@")[1] ?? query;
    }
    
    if (domain && domain.includes(".")) {
      footprint.domains.push(domain.toLowerCase());
      
      dataSources.push({
        source: "domain_extraction",
        category: "domain" as ToolCategory,
        data: { domain },
        timestamp: new Date().toISOString(),
        success: true,
      });
    }
  }
  
  // Step 5: Generate AI summary
  onProgress(++currentStep / totalSteps);
  const aiSummary = await generateProfilingSummary(
    query, 
    type, 
    socialAccounts, 
    phonePatterns, 
    footprint,
    apiKeys.openrouter
  );
  
  // Calculate risk score based on findings
  const riskScore = calculateRiskScore(socialAccounts, phonePatterns, footprint);
  
  return {
    targetQuery: query,
    targetType: type,
    status: "completed",
    progress: 100,
    dataSources,
    socialAccounts,
    phonePatterns,
    digitalFootprint: footprint,
    aiSummary,
    riskScore,
    confidence: Math.round(
      (socialAccounts.length * 5 + phonePatterns.length * 10 + footprint.emails.length * 5 + 
       footprint.phones.length * 5 + footprint.domains.length * 5) / 10
    ),
  };
}

// Analyze phone number patterns
function analyzePhonePatterns(phone: string): PhonePattern[] {
  const patterns: PhonePattern[] = [];
  
  // Format analysis
  if (phone.length === 10 && phone.startsWith("0")) {
    patterns.push({
      pattern: "French mobile format",
      type: "format",
      description: "Standard French 10-digit mobile number",
      confidence: 95,
      source: "pattern_analysis",
    });
    
    // Carrier detection (basic)
    const carrierPrefix = phone.substring(1, 3);
    const carrierMap: Record<string, string> = {
      "06": "Orange / SFR / Bouygues (Mobile)",
      "07": "Mobile (all carriers)",
    };
    
    if (carrierMap[carrierPrefix]) {
      patterns.push({
        pattern: carrierPrefix,
        type: "carrier",
        description: carrierMap[carrierPrefix],
        confidence: 70,
        source: "prefix_analysis",
      });
    }
  }
  
  if (phone.length === 12 && phone.startsWith("33")) {
    patterns.push({
      pattern: "International French format",
      type: "format",
      description: "French number with +33 prefix",
      confidence: 98,
      source: "pattern_analysis",
    });
  }
  
  return patterns;
}

// Generate AI summary of profiling results
async function generateProfilingSummary(
  query: string,
  type: string,
  socialAccounts: SocialAccount[],
  phonePatterns: PhonePattern[],
  footprint: DigitalFootprint,
  apiKey?: string
): Promise<string> {
  if (!apiKey) {
    return `Profiling analysis for ${query} (${type}):\n` +
           `- ${socialAccounts.length} potential social accounts identified\n` +
           `- ${phonePatterns.length} phone patterns analyzed\n` +
           `- ${footprint.emails.length} emails, ${footprint.phones.length} phones, ${footprint.domains.length} domains found`;
  }
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/NeooeN45/Osint-Master",
        "X-Title": "OSINT Master",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: [
          {
            role: "system",
            content: "You are an OSINT analysis expert. Analyze the following profiling data and provide a summary of findings, potential connections, and investigative recommendations. Respond in French."
          },
          {
            role: "user",
            content: `Target: ${query} (${type})\n` +
                     `Social accounts found: ${socialAccounts.map(s => `${s.platform}: ${s.username}`).join(", ")}\n` +
                     `Phone patterns: ${phonePatterns.map(p => p.description).join(", ")}\n` +
                     `Digital footprint: ${footprint.emails.length} emails, ${footprint.phones.length} phones, ${footprint.domains.length} domains`
          }
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "No summary available.";
  } catch (error) {
    console.error("AI summary generation failed:", error);
    return `Profiling analysis for ${query}: ${socialAccounts.length} social accounts, ${phonePatterns.length} phone patterns identified.`;
  }
}

// Calculate risk score based on findings
function calculateRiskScore(
  socialAccounts: SocialAccount[],
  phonePatterns: PhonePattern[],
  footprint: DigitalFootprint
): number {
  let score = 0;
  
  // More social accounts = higher exposure/risk
  score += Math.min(socialAccounts.length * 5, 30);
  
  // Phone pattern analysis
  score += Math.min(phonePatterns.length * 3, 15);
  
  // Digital footprint size
  score += Math.min(footprint.emails.length * 2, 10);
  score += Math.min(footprint.phones.length * 2, 10);
  score += Math.min(footprint.domains.length * 2, 10);
  score += Math.min(footprint.ips.length * 3, 15);
  
  return Math.min(score, 100);
}

// Advanced social scraping simulation
export async function scrapeSocialMedia(
  username: string,
  platform: string,
  apiKey?: string
): Promise<Partial<SocialAccount>> {
  // In production, this would use actual APIs or scraping
  // For now, return simulated structured data
  
  return {
    platform,
    username,
    url: `https://${platform.toLowerCase().replace(/\s+/g, "")}.com/${username}`,
    foundAt: new Date().toISOString(),
    confidence: 70 + Math.floor(Math.random() * 25),
    profileData: {
      followers: Math.floor(Math.random() * 10000),
      following: Math.floor(Math.random() * 5000),
      posts: Math.floor(Math.random() * 1000),
      bio: "Sample bio data",
      location: "Unknown",
    },
    posts: Array.from({ length: 5 }, (_, i) => ({
      id: `post_${i}_${Date.now()}`,
      content: `Sample post content ${i + 1}`,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      engagement: {
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50),
      },
    })),
  };
}
