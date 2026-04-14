// ============================================================================
// NEW OSINT MODULES - Phase 1 Advanced Features
// Username Cluster, Person Search, Advanced Dorking
// ============================================================================

import axios from "axios";
import { UsernameIntelligence, EmailIntelligence, DorkIntelligence, SearchEngines } from "./advancedEngine";

// Helper
function makeEntityId(): string {
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function tryHttp(url: string, options: any = {}): Promise<any> {
  try {
    const res = await axios.get(url, { timeout: 15000, ...options });
    return res.data;
  } catch {
    return null;
  }
}

// ============================================================================
// USERNAME CLUSTER INTELLIGENCE
// ============================================================================

export const UsernameClusterModule = {
  id: "username_cluster",
  name: "Username Cluster Intelligence",
  category: "username",
  targetTypes: ["username"],
  priority: 1,
  isAvailable: async () => true,
  
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Generating username variants for ${target}...` } });
    
    // Generate variants
    const variants = UsernameIntelligence.generateAllVariants(target);
    emit({ type: "log", data: { message: `Found ${variants.length} potential variants` } });
    
    const entities: any[] = [];
    const correlations: any[] = [];
    
    // Add original username
    entities.push({
      id: makeEntityId(),
      type: "username",
      value: target,
      source: "username_cluster",
      confidence: 95,
      metadata: { type: "original", variants_count: variants.length },
      verified: true,
      depth: 0,
    });
    
    // Add top variants as potential usernames (even without verification)
    // These are useful for further OSINT investigation
    const topVariants = variants.slice(1, 21); // Skip original, take next 20
    
    for (const variant of topVariants) {
      entities.push({
        id: makeEntityId(),
        type: "username",
        value: variant,
        source: "username_cluster",
        confidence: 35, // Low confidence as unverified
        metadata: {
          parent: target,
          type: "variant",
          pattern: detectPattern(target, variant),
        },
        verified: false,
        depth: 0,
      });
    }
    
    emit({ type: "log", data: { message: `Added ${topVariants.length} unverified variants for investigation` } });
    
    // Quick verification check on key platforms (sample 5 random variants)
    const sampleVariants = topVariants.slice(0, 5);
    let verifiedCount = 0;
    const platforms = [
      { name: "GitHub", url: (u: string) => `https://api.github.com/users/${u}`, check: (d: any) => !!d?.login },
      { name: "Twitter", url: (u: string) => `https://api.fxtwitter.com/${u}`, check: (d: any) => !!d?.user },
      { name: "Instagram", url: (u: string) => `https://www.instagram.com/api/v1/users/web_profile_info/?username=${u}`, check: (d: any) => !!d?.data?.user, headers: { "X-IG-App-ID": "936619743392459" } },
      { name: "Reddit", url: (u: string) => `https://www.reddit.com/user/${u}/about.json`, check: (d: any) => !!d?.data },
      { name: "TikTok", url: (u: string) => `https://tiktok.com/@${u}`, check: (d: any) => false, htmlCheck: (h: string) => h.includes("__NEXT_DATA__") },
    ];
    
    // Check each variant
    for (const variant of sampleVariants) {
      const checks = platforms.map(async (p) => {
        try {
          const resp = await axios.get(p.url(variant), {
            timeout: 5000,
            validateStatus: () => true,
            headers: { "User-Agent": "Mozilla/5.0", ...(p.headers || {}) },
          } as any);
          
          const found = p.htmlCheck 
            ? p.htmlCheck(resp.data as string)
            : p.check(resp.data);
          
          if (found) {
            return { platform: p.name, variant, found: true };
          }
        } catch {}
        return null;
      });
      
      const results = (await Promise.allSettled(checks))
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map(r => r.value)
        .filter(Boolean);
      
      if (results.length > 0) {
        // Found variant!
        const entityId = makeEntityId();
        entities.push({
          id: entityId,
          type: "username",
          value: variant,
          source: "username_cluster",
          confidence: 70 + results.length * 5,
          metadata: {
            platforms: results.map((r: any) => r.platform),
            parent: target,
            type: "variant",
          },
          verified: true,
          depth: 0,
        });
        
        // Add social profiles for each platform
        for (const r of results) {
          entities.push({
            id: makeEntityId(),
            type: "social_profile",
            value: r.platform === "GitHub" ? `https://github.com/${variant}` :
                   r.platform === "Twitter" ? `https://twitter.com/${variant}` :
                   r.platform === "Instagram" ? `https://instagram.com/${variant}` :
                   r.platform === "Reddit" ? `https://reddit.com/user/${variant}` :
                   r.platform === "TikTok" ? `https://tiktok.com/@${variant}` : variant,
            source: "username_cluster",
            confidence: 75,
            metadata: { platform: r.platform, username: variant, parent: target },
            verified: true,
            depth: 0,
          });
        }
      }
    }
    
    // Create correlations between variants and original
    const originalEntity = entities.find(e => e.value === target);
    const variantEntities = entities.filter(e => e.value !== target && e.type === "username");
    
    for (const variant of variantEntities) {
      correlations.push({
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        from: originalEntity?.id || target,
        to: variant.id,
        type: "username_variant",
        strength: 80,
        evidence: `Username variant detected: ${target} → ${variant.value}`,
        source: "username_cluster",
      });
    }
    
    emit({ type: "log", data: { message: `Cluster search complete: ${entities.length} entities found` } });
    
    return {
      success: true, // Always success as we generated variants
      data: { 
        variants_generated: variants.length,
        variants_added: variantEntities.length,
        verified: entities.filter(e => e.verified && e.type === "username").length,
      },
      entities,
      correlations,
    };
  },
};

// Helper to detect pattern type
function detectPattern(original: string, variant: string): string {
  if (variant.includes("4") || variant.includes("3") || variant.includes("1")) return "leet_speak";
  if (variant.includes("_") || variant.includes(".")) return "separator_change";
  if (variant.match(/\d+$/)) return "numeric_suffix";
  if (variant.toLowerCase() !== original.toLowerCase()) return "case_variant";
  return "character_change";
}

// ============================================================================
// PERSON SEARCH MODULE
// ============================================================================

export const PersonSearchModule = {
  id: "person_search",
  name: "Person Name Search",
  category: "person",
  targetTypes: ["person"],
  priority: 1,
  isAvailable: async () => true,
  
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Searching for person: ${target}` } });
    
    const entities: any[] = [];
    const parts = target.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    
    // Generate likely usernames
    const likelyUsernames = UsernameIntelligence.fromRealName(firstName, lastName);
    emit({ type: "log", data: { message: `Generated ${likelyUsernames.length} likely usernames` } });
    
    for (const username of likelyUsernames.slice(0, 10)) {
      entities.push({
        id: makeEntityId(),
        type: "username",
        value: username,
        source: "person_search",
        confidence: 45,
        metadata: {
          inferred_from: target,
          type: "derived",
          pattern: "name_to_username",
        },
        verified: false,
        depth: 0,
      });
    }
    
    // Generate likely emails
    const likelyEmails = EmailIntelligence.guessWithCommonDomains(firstName, lastName);
    emit({ type: "log", data: { message: `Generated ${likelyEmails.length} likely emails` } });
    
    for (const email of likelyEmails.slice(0, 15)) {
      entities.push({
        id: makeEntityId(),
        type: "email",
        value: email,
        source: "person_search",
        confidence: 30,
        metadata: {
          inferred_from: target,
          type: "derived",
          pattern: "name_to_email",
        },
        verified: false,
        depth: 0,
      });
    }
    
    // LinkedIn search via Google dork
    emit({ type: "log", data: { message: "Searching LinkedIn profile..." } });
    const linkedinDork = `site:linkedin.com/in/ "${firstName} ${lastName}"`;
    
    // DuckDuckGo search
    try {
      const ddgResults = await SearchEngines.duckduckgo(linkedinDork);
      for (const result of ddgResults.slice(0, 3)) {
        if (result.url.includes("linkedin.com/in/")) {
          entities.push({
            id: makeEntityId(),
            type: "social_profile",
            value: result.url,
            source: "person_search",
            confidence: 65,
            metadata: {
              platform: "LinkedIn",
              name: target,
              source_search: result.title,
            },
            verified: false,
            depth: 0,
          });
        }
      }
    } catch {}
    
    // Generic web dorks
    const personDorks = DorkIntelligence.personDorks(target);
    emit({ type: "log", data: { message: `Running ${personDorks.length} search queries...` } });
    
    // Run first 5 dorks
    for (const dork of personDorks.slice(0, 5)) {
      try {
        const results = await SearchEngines.duckduckgo(dork);
        for (const r of results.slice(0, 2)) {
          // Only add if looks relevant
          const relevance = (r.title + r.snippet).toLowerCase().includes(firstName.toLowerCase()) ? 50 : 30;
          entities.push({
            id: makeEntityId(),
            type: "url",
            value: r.url,
            source: "person_search",
            confidence: relevance,
            metadata: {
              title: r.title,
              snippet: r.snippet?.slice(0, 200),
              dork: dork.slice(0, 50),
            },
            verified: false,
            depth: 0,
          });
        }
      } catch {}
    }
    
    // GitHub search for code commits
    try {
      const ghSearch = await tryHttp(
        `https://api.github.com/search/commits?q=author-name:"${encodeURIComponent(target)}"`,
        {
          headers: {
            "Accept": "application/vnd.github.cloak-preview",
            "User-Agent": "OSINT-Master",
          },
        }
      );
      
      if (ghSearch?.items?.length > 0) {
        for (const commit of ghSearch.items.slice(0, 3)) {
          entities.push({
            id: makeEntityId(),
            type: "social_profile",
            value: `https://github.com/${commit.author?.login || commit.commit?.author?.name}`,
            source: "person_search",
            confidence: 70,
            metadata: {
              platform: "GitHub",
              name: target,
              commit_repo: commit.repository?.name,
              commit_message: commit.commit?.message?.slice(0, 100),
            },
            verified: true,
            depth: 0,
          });
        }
      }
    } catch {}
    
    return {
      success: entities.length > 0,
      data: { 
        usernames_generated: likelyUsernames.length,
        emails_generated: likelyEmails.length,
        profiles_found: entities.filter((e: any) => e.type === "social_profile").length,
      },
      entities,
    };
  },
};

// ============================================================================
// ADVANCED DORKING MODULE
// ============================================================================

export const AdvancedDorkModule = {
  id: "advanced_dork",
  name: "Advanced Web Dorking",
  category: "search",
  targetTypes: ["username", "email", "phone", "person"],
  priority: 5,
  isAvailable: async () => true,
  
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Executing advanced dorking for ${target}...` } });
    
    const entities: any[] = [];
    
    // Detect target type for dork generation
    const targetType = target.includes('@') ? 'email' : 
                      target.match(/^\d/) ? 'phone' : 
                      target.includes(' ') ? 'person' : 'username';
    
    // Generate dorks based on target type
    const dorks = DorkIntelligence.generateDorks(target, targetType);
    emit({ type: "log", data: { message: `${dorks.length} dork queries generated` } });
    
    // Execute dorks with rate limiting - use multiple engines
    let executed = 0;
    for (const dork of dorks) {
      if (executed >= 20) break; // Limit to 20 dorks
      
      try {
        emit({ type: "log", data: { message: `Searching: ${dork.slice(0, 60)}...` } });
        
        // Try multiple search strategies
        let results: any[] = [];
        
        // 1. Try DuckDuckGo HTML
        try {
          results = await SearchEngines.duckduckgo(dork);
        } catch {}
        
        // 2. If no results, try alternative search methods
        if (results.length === 0) {
          // Direct site search via https://r.jina.ai/http://... (extracts article content)
          if (dork.includes("site:")) {
            const siteMatch = dork.match(/site:([^\s]+)/);
            const termMatch = dork.match(/"([^"]+)"/);
            if (siteMatch && termMatch) {
              try {
                const jinaResp = await axios.get(
                  `https://r.jina.ai/http://${siteMatch[1]}/search?q=${encodeURIComponent(termMatch[1])}`,
                  { timeout: 8000, validateStatus: () => true } as any
                );
                if (jinaResp.data && typeof jinaResp.data === 'string' && jinaResp.data.length > 100) {
                  results.push({
                    url: `https://${siteMatch[1]}/search?q=${encodeURIComponent(termMatch[1])}`,
                    title: `Search on ${siteMatch[1]}`,
                    snippet: jinaResp.data.slice(0, 200),
                  });
                }
              } catch {}
            }
          }
        }
        
        executed++;
        
        for (const result of results.slice(0, 3)) {
          // Categorize result
          let type = "url";
          let confidence = 50;
          
          if (result.url.includes("pastebin.com")) {
            type = "leak";
            confidence = 75;
          } else if (result.url.includes("github.com")) {
            type = "repository";
            confidence = 70;
          } else if (result.url.match(/\.(pdf|doc|docx|xls|xlsx)$/)) {
            type = "document";
            confidence = 65;
          } else if (result.url.match(/\.(sql|db|json|csv)$/)) {
            type = "database";
            confidence = 80;
          }
          
          entities.push({
            id: makeEntityId(),
            type,
            value: result.url,
            source: "advanced_dork",
            confidence,
            metadata: {
              title: result.title,
              snippet: result.snippet?.slice(0, 300),
              dork: dork.slice(0, 100),
              search_engine: "duckduckgo",
            },
            verified: false,
            depth: 0,
          });
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
        
      } catch (e: any) {
        emit({ type: "log", data: { message: `Dork failed: ${e.message}` } });
      }
    }
    
    // Remove duplicates by URL
    const seen = new Set<string>();
    const unique = entities.filter(e => {
      if (seen.has(e.value)) return false;
      seen.add(e.value);
      return true;
    });
    
    emit({ type: "log", data: { message: `Dorking complete: ${unique.length} unique results` } });
    
    // Always return success if we attempted searches
    // (No results doesn't mean failure - target may just not be indexed)
    return {
      success: executed > 0,
      data: { dorks_executed: executed, results_found: unique.length, target_searched: target },
      entities: unique,
    };
  },
};

// ============================================================================
// HUNTER.IO EMAIL FINDER
// ============================================================================

export const HunterModule = {
  id: "hunter_email",
  name: "Hunter.io Email Finder",
  category: "email",
  targetTypes: ["domain", "person"],
  priority: 3,
  isAvailable: async () => !!process.env.HUNTER_API_KEY,
  
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Searching Hunter.io for ${target}...` } });
    
    const entities: any[] = [];
    const key = process.env.HUNTER_API_KEY;
    
    // Infer target type from target value
    const targetType = target.includes("@") ? "email" : target.includes(" ") ? "person" : "domain";
    
    try {
      if (targetType === "domain" || target.includes("@")) {
        // Domain search
        const domain = target.includes("@") ? target.split("@")[1] : target;
        const resp = await axios.get(
          `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${key}`,
          { timeout: 15000 }
        );
        
        const emails = (resp.data as any)?.data?.emails || [];
        emit({ type: "log", data: { message: `Found ${emails.length} emails on Hunter.io` } });
        
        for (const email of emails) {
          entities.push({
            id: makeEntityId(),
            type: "email",
            value: email.value,
            source: "hunter_email",
            confidence: email.confidence || 70,
            metadata: {
              first_name: email.first_name,
              last_name: email.last_name,
              position: email.position,
              domain,
              source: "hunter.io",
            },
            verified: email.verification?.status === "valid",
            depth: 0,
          });
          
          // Add person entity if name available
          if (email.first_name && email.last_name) {
            entities.push({
              id: makeEntityId(),
              type: "person",
              value: `${email.first_name} ${email.last_name}`,
              source: "hunter_email",
              confidence: 75,
              metadata: {
                email: email.value,
                position: email.position,
              },
              verified: false,
              depth: 0,
            });
          }
        }
      }
      
      // Email finder by name
      if (targetType === "person" || target.includes(" ")) {
        const parts = target.split(/\s+/);
        if (parts.length >= 2) {
          // Try to find associated domain from existing entities
          const domains: string[] = []; // Would come from context
          
          for (const domain of domains.slice(0, 3)) {
            try {
              const resp = await axios.get(
                `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${parts[0]}&last_name=${parts[parts.length-1]}&api_key=${key}`,
                { timeout: 10000 }
              );
              
              const respData = resp.data as any;
          if (respData?.data?.email) {
                entities.push({
                  id: makeEntityId(),
                  type: "email",
                  value: respData.data.email,
                  source: "hunter_email",
                  confidence: 85,
                  metadata: {
                    domain,
                    first_name: parts[0],
                    last_name: parts[parts.length-1],
                  },
                  verified: true,
                  depth: 0,
                });
              }
            } catch {}
          }
        }
      }
      
    } catch (e: any) {
      emit({ type: "log", data: { message: `Hunter.io error: ${e.message}` } });
    }
    
    return {
      success: entities.length > 0,
      data: { emails_found: entities.filter((e: any) => e.type === "email").length },
      entities,
    };
  },
};

// ============================================================================
// INTELX (INTELLIGENCE X) MODULE
// ============================================================================

export const IntelXModule = {
  id: "intelx_search",
  name: "Intelligence X Search",
  category: "search",
  targetTypes: ["email", "username", "phone", "domain"],
  priority: 2,
  isAvailable: async () => !!process.env.INTELX_API_KEY,
  
  execute: async (target: string, emit: any) => {
    emit({ type: "log", data: { message: `Searching Intelligence X for ${target}...` } });
    
    const entities: any[] = [];
    const key = process.env.INTELX_API_KEY || "";
    
    if (!key) {
      return { success: false, data: { error: "No API key" }, entities: [] };
    }
    
    try {
      // Start search
      const searchResp = await axios.post(
        "https://2.intelx.io/intelligent/search",
        {
          term: target,
          maxresults: 100,
          media: 0,
          target: 0,
          terminate: [],
        },
        {
          headers: { "X-Key": key },
          timeout: 30000,
        }
      );
      
      const searchData = searchResp.data as any;
    const id: string = searchData?.id;
      if (!id) return { success: false, data: {}, entities: [] };
      
      // Wait for results
      await new Promise(r => setTimeout(r, 3000));
      
      // Get results
      const resultResp = await axios.get<any>(
        `https://2.intelx.io/intelligent/search/result?id=${id}&limit=100`,
        {
          headers: { "X-Key": key as string },
          timeout: 30000,
        }
      );
      
      const records = (resultResp.data as any)?.records || [];
      emit({ type: "log", data: { message: `Intelligence X found ${records.length} records` } });
      
      for (const record of records) {
        // Categorize by type
        if (record.systemid === "leaks.public.combolist") {
          entities.push({
            id: makeEntityId(),
            type: "leak",
            value: record.name || "Combolist entry",
            source: "intelx_search",
            confidence: 80,
            metadata: {
              bucket: record.bucket,
              date: record.date,
              type: "breach",
              system_id: record.systemid,
            },
            verified: true,
            depth: 0,
          });
        } else if (record.systemid === "passwords.public.breached") {
          entities.push({
            id: makeEntityId(),
            type: "leak",
            value: "Password breach record",
            source: "intelx_search",
            confidence: 85,
            metadata: {
              bucket: record.bucket,
              date: record.date,
              type: "password_breach",
            },
            verified: true,
            depth: 0,
          });
        } else if (record.systemid?.includes("pastes")) {
          entities.push({
            id: makeEntityId(),
            type: "url",
            value: `https://pastebin.com/${record.name || record.bucket}`,
            source: "intelx_search",
            confidence: 75,
            metadata: {
              type: "paste",
              date: record.date,
            },
            verified: true,
            depth: 0,
          });
        }
      }
      
    } catch (e: any) {
      emit({ type: "log", data: { message: `IntelX error: ${e.message}` } });
    }
    
    return {
      success: entities.length > 0,
      data: { records_found: entities.length },
      entities,
    };
  },
};

// Export all modules
export const NewModules = [
  UsernameClusterModule,
  PersonSearchModule,
  AdvancedDorkModule,
  HunterModule,
  IntelXModule,
];

export default NewModules;
