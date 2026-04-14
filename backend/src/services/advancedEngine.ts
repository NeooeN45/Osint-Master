// ============================================================================
// ADVANCED OSINT ENGINE - Phase 1 Implementation
// Username variants, Email permutations, Advanced correlations
// ============================================================================

import axios from "axios";
import * as dns from "dns";
import { promisify } from "util";

const dnsResolveMx = promisify(dns.resolveMx);

// ============================================================================
// USERNAME INTELLIGENCE
// ============================================================================

export const UsernameIntelligence = {
  // Leet speak transformations
  leetTransforms(username: string): string[] {
    const leetMap: Record<string, string> = {
      'a': '4', 'A': '4',
      'e': '3', 'E': '3',
      'i': '1', 'I': '1',
      'o': '0', 'O': '0',
      's': '5', 'S': '5',
      't': '7', 'T': '7',
      'g': '9', 'G': '9',
      'b': '8', 'B': '8',
    };
    
    const leet2 = username
      .replace(/a/gi, '@')
      .replace(/s/gi, '$')
      .replace(/o/gi, '*')
      .replace(/i/gi, '!');
    
    const leet1 = username.split('').map(c => leetMap[c] || c).join('');
    
    return [leet1, leet2].filter(l => l !== username);
  },

  // Common suffixes/prefixes
  generateSuffixes(username: string): string[] {
    const suffixes = [
      '1', '2', '3', '123', '01', '02', '007',
      'official', '_official', 'real', '_real',
      'officiel', '_officiel', 'off', '_off',
      '2024', '2025', '2026', '24', '25', '26',
      'tv', '_tv', 'hq', '_hq', 'dev', '_dev',
      'backup', '_backup', '2', '_2', 'ii', '_ii',
      'fb', 'ig', 'tw', 'yt', 'tt', 'snap',
      'gaming', '_gaming', 'plays', '_plays',
    ];
    
    const prefixes = ['the', 'real', 'official', 'its', 'its_', 'iam', 'im_', 'mr', 'mrs', 'dr'];
    
    const variants: string[] = [];
    
    // Add suffixes
    for (const suffix of suffixes) {
      variants.push(`${username}${suffix}`);
      variants.push(`${username}_${suffix}`);
      variants.push(`${username}.${suffix}`);
    }
    
    // Add prefixes
    for (const prefix of prefixes) {
      variants.push(`${prefix}${username}`);
      variants.push(`${prefix}_${username}`);
      variants.push(`${prefix}.${username}`);
    }
    
    return variants;
  },

  // Format variations
  formatVariants(username: string): string[] {
    return [
      username.toLowerCase(),
      username.toUpperCase(),
      username.charAt(0).toUpperCase() + username.slice(1).toLowerCase(),
      username.replace(/_/g, '.').replace(/-/g, '.'),
      username.replace(/_/g, '-').replace(/\./g, '-'),
      username.replace(/-/g, '_').replace(/\./g, '_'),
      username.replace(/[^a-zA-Z0-9]/g, ''), // no separators
      username + username.slice(-2).repeat(2), // doubled ending
    ];
  },

  // Generate from real name
  fromRealName(firstName: string, lastName: string): string[] {
    const f = firstName.toLowerCase().trim();
    const l = lastName.toLowerCase().trim();
    const fInitial = f.charAt(0);
    const lInitial = l.charAt(0);
    
    return [
      `${f}.${l}`,
      `${f}_${l}`,
      `${f}${l}`,
      `${fInitial}${l}`,
      `${fInitial}.${l}`,
      `${f}${lInitial}`,
      `${l}${f}`,
      `${f}-${l}`,
      `${f}${l}123`,
      `${f}123`,
      `${l}123`,
      `${f}.${lInitial}`,
      `${f}_${lInitial}`,
      `${f}o${l}`, // French style
      `${l}.${f}`,
      `${l}_${f}`,
      `the${f}${l}`,
      `real${f}${l}`,
      `${f}${l}official`,
      `${f}_${l}_official`,
    ];
  },

  // Generate all variants (up to 150)
  generateAllVariants(username: string, realName?: string): string[] {
    const variants = new Set([username]);
    
    // Add all transformation types
    this.leetTransforms(username).forEach(v => variants.add(v));
    this.generateSuffixes(username).forEach(v => variants.add(v));
    this.formatVariants(username).forEach(v => variants.add(v));
    
    // Generate from clean base (no separators)
    const base = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (base !== username.toLowerCase()) {
      this.generateSuffixes(base).forEach(v => variants.add(v));
      this.leetTransforms(base).forEach(v => variants.add(v));
    }
    
    // From real name
    if (realName) {
      const parts = realName.split(/\s+/);
      if (parts.length >= 2) {
        this.fromRealName(parts[0], parts[parts.length - 1])
          .forEach(v => variants.add(v));
        
        // Middle name combinations
        if (parts.length >= 3) {
          this.fromRealName(parts[0], parts.slice(1).join(''))
            .forEach(v => variants.add(v));
        }
      }
    }
    
    return Array.from(variants).slice(0, 150);
  },

  // Levenshtein distance for similarity
  levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  },

  // Check if two usernames are likely variants
  isVariant(username1: string, username2: string): boolean {
    const u1 = username1.toLowerCase();
    const u2 = username2.toLowerCase();
    
    if (u1 === u2) return false;
    
    const distance = this.levenshteinDistance(u1, u2);
    const maxLen = Math.max(u1.length, u2.length);
    const similarity = 1 - distance / maxLen;
    
    // High similarity threshold
    return similarity >= 0.85 || distance <= 2;
  },
};

// ============================================================================
// EMAIL INTELLIGENCE
// ============================================================================

export const EmailIntelligence = {
  // Generate email permutations from name
  generatePermutations(firstName: string, lastName: string, domain: string): string[] {
    const f = firstName.toLowerCase().trim();
    const l = lastName.toLowerCase().trim();
    const fInitial = f.charAt(0);
    const lInitial = l.charAt(0);
    
    const patterns = [
      `${f}@${domain}`,
      `${l}@${domain}`,
      `${f}.${l}@${domain}`,
      `${f}_${l}@${domain}`,
      `${f}${l}@${domain}`,
      `${fInitial}${l}@${domain}`,
      `${fInitial}.${l}@${domain}`,
      `${f}${lInitial}@${domain}`,
      `${l}.${f}@${domain}`,
      `${l}_${f}@${domain}`,
      `${f}-${l}@${domain}`,
      `${f}${l}123@${domain}`,
      `${f}123@${domain}`,
      `${f}.${lInitial}@${domain}`,
      `${f}_${lInitial}@${domain}`,
      `${f}${l.slice(0, 2)}@${domain}`,
      `${f.slice(0, 3)}${l}@${domain}`,
      `${f}.${l}123@${domain}`,
      `${fInitial}${lInitial}@${domain}`,
      `${f}${l}dev@${domain}`,
      `${f}o${l}@${domain}`, // French style
    ];
    
    // Add normalized versions (no accents)
    const normalized = patterns.map(e => 
      e.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );
    
    return [...new Set([...patterns, ...normalized])];
  },

  // Common domains for email guessing
  COMMON_DOMAINS: [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'protonmail.com',
    'yandex.com',
    'mail.com',
    'live.com',
    'qq.com',
    '163.com',
    'foxmail.com',
    'me.com',
    'mac.com',
  ],

  // Guess emails with common domains
  guessWithCommonDomains(firstName: string, lastName: string): string[] {
    const emails: string[] = [];
    
    for (const domain of this.COMMON_DOMAINS) {
      const perms = this.generatePermutations(firstName, lastName, domain);
      emails.push(...perms.slice(0, 5)); // Limit per domain
    }
    
    return [...new Set(emails)].slice(0, 50);
  },

  // Verify email via MX lookup
  async verifyMX(email: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const domain = email.split('@')[1];
      if (!domain) return { valid: false, reason: 'Invalid format' };
      
      const mx = await dnsResolveMx(domain);
      if (mx.length === 0) return { valid: false, reason: 'No MX records' };
      
      return { valid: true };
    } catch (e: any) {
      return { valid: false, reason: e.message };
    }
  },

  // Pattern matching for likely aliases
  findAliases(emails: string[]): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();
    
    for (const email of emails) {
      if (processed.has(email)) continue;
      
      const [local, domain] = email.split('@');
      const variants = emails.filter(e => {
        if (e === email) return false;
        const [l, d] = e.split('@');
        // Same domain, similar local part
        if (d !== domain) return false;
        
        // Check similarity
        const dist = UsernameIntelligence.levenshteinDistance(local, l);
        return dist <= 2 || l.includes(local) || local.includes(l);
      });
      
      if (variants.length > 0) {
        groups.push([email, ...variants]);
        processed.add(email);
        variants.forEach(v => processed.add(v));
      }
    }
    
    return groups;
  },
};

// ============================================================================
// ADVANCED DORK QUERIES
// ============================================================================

export const DorkIntelligence = {
  // Generate Google dorks for different target types
  generateDorks(target: string, targetType: string): string[] {
    switch (targetType) {
      case 'username':
        return this.usernameDorks(target);
      case 'email':
        return this.emailDorks(target);
      case 'phone':
        return this.phoneDorks(target);
      case 'person':
        return this.personDorks(target);
      default:
        return [`"${target}"`];
    }
  },

  usernameDorks(username: string): string[] {
    const clean = username.replace(/"/g, '');
    return [
      `"${clean}" site:pastebin.com`,
      `"${clean}" site:github.com`,
      `"${clean}" site:gitlab.com`,
      `"${clean}" site:bitbucket.org`,
      `"${clean}" site:twitter.com`,
      `"${clean}" site:x.com`,
      `"${clean}" site:instagram.com`,
      `"${clean}" site:reddit.com`,
      `"${clean}" site:discord.com`,
      `"${clean}" site:t.me`,
      `"${clean}" site:facebook.com`,
      `"${clean}" site:linkedin.com`,
      `"${clean}" site:tiktok.com`,
      `"${clean}" site:snapchat.com`,
      `"${clean}" site:vk.com`,
      `"${clean}" site:threads.net`,
      `"${clean}" site:pinterest.com`,
      `"${clean}" site:tumblr.com`,
      `"${clean}" inurl:"${clean}"`,
      `"${clean}" intitle:"${clean}"`,
      `"${clean}" "password"`,
      `"${clean}" "email"`,
      `"${clean}" "phone"`,
      `"${clean}" "signup"`,
      `"${clean}" "login"`,
      `"${clean}" "registered"`,
      `"${clean}" "@gmail.com"`,
      `"${clean}" filetype:pdf`,
      `"${clean}" filetype:doc`,
      `"${clean}" filetype:xls`,
      `"${clean}" filetype:txt`,
      `"${clean}" filetype:sql`,
      `"${clean}" cache:`,
    ];
  },

  emailDorks(email: string): string[] {
    const [local, domain] = email.split('@');
    return [
      `"${email}"`,
      `"${email}" "password"`,
      `"${email}" "login"`,
      `"${email}" "signup"`,
      `"${email}" "registered"`,
      `"${email}" site:pastebin.com`,
      `"${email}" site:haveibeenpwned.com`,
      `"${local}" "@${domain}"`,
      `"${email}" filetype:pdf`,
      `"${email}" "data breach"`,
      `"${email}" "leaked"`,
      `"${email}" "database"`,
      `site:breachdirectory.org "${email}"`,
    ];
  },

  phoneDorks(phone: string): string[] {
    const clean = phone.replace(/\D/g, '');
    const formatted = clean.replace(/(\d{2})(?=[\d])/g, '$1 ');
    return [
      `"${phone}"`,
      `"${clean}"`,
      `"${clean.slice(-10)}"`,
      `"${formatted}"`,
      `"${phone}" site:facebook.com`,
      `"${phone}" site:vk.com`,
      `"${phone}" site:truecaller.com`,
      `"${phone}" "whatsapp"`,
      `"${phone}" "telegram"`,
    ];
  },

  personDorks(name: string): string[] {
    return [
      `"${name}"`,
      `"${name}" site:linkedin.com`,
      `"${name}" site:facebook.com`,
      `"${name}" site:twitter.com`,
      `"${name}" "contact"`,
      `"${name}" "email"`,
      `"${name}" "phone"`,
      `"${name}" "address"`,
      `"${name}" filetype:pdf`,
      `"${name}" site:pdf.com`,
      `"${name}" site:slideshare.net`,
      `"${name}" "resume" OR "CV"`,
      `"${name}" "profile"`,
    ];
  },
};

// ============================================================================
// ADVANCED CORRELATION ENGINE
// ============================================================================

export interface CorrelationRule {
  id: string;
  type: string;
  match: (a: any, b: any) => boolean;
  strength: number;
  evidence: string | ((a: any, b: any) => string);
}

export const AdvancedCorrelations: CorrelationRule[] = [
  // Username similarity
  {
    id: "username_variant",
    type: "similarity",
    match: (a, b) => {
      if (a.type !== "username" || b.type !== "username") return false;
      const dist = UsernameIntelligence.levenshteinDistance(a.value, b.value);
      return dist <= 2 && a.value !== b.value;
    },
    strength: 75,
    evidence: (a, b) => `Username variant: ${a.value} ~ ${b.value}`,
  },
  
  // Same email domain pattern
  {
    id: "same_email_pattern",
    type: "pattern",
    match: (a, b) => {
      if (a.type !== "email" || b.type !== "email") return false;
      const [la, da] = a.value.split('@');
      const [lb, db] = b.value.split('@');
      return da === db && la.slice(0, 3) === lb.slice(0, 3) && a.value !== b.value;
    },
    strength: 65,
    evidence: "Similar email naming pattern",
  },
  
  // Location proximity (within 100m)
  {
    id: "location_proximity",
    type: "geospatial",
    match: (a, b) => {
      if (a.type !== "location" || b.type !== "location") return false;
      if (!a.metadata?.lat || !b.metadata?.lat) return false;
      
      const R = 6371e3; // Earth radius in meters
      const lat1 = a.metadata.lat * Math.PI / 180;
      const lat2 = b.metadata.lat * Math.PI / 180;
      const deltaLat = (b.metadata.lat - a.metadata.lat) * Math.PI / 180;
      const deltaLon = (b.metadata.lng - a.metadata.lng) * Math.PI / 180;
      
      const a1 = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                 Math.cos(lat1) * Math.cos(lat2) *
                 Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1-a1));
      const distance = R * c;
      
      return distance < 100 && distance > 0;
    },
    strength: 70,
    evidence: "Locations within 100 meters",
  },
  
  // Temporal correlation (within 1 hour)
  {
    id: "temporal_proximity",
    type: "temporal",
    match: (a, b) => {
      const ta = a.metadata?.timestamp || a.metadata?.date || a.metadata?.created;
      const tb = b.metadata?.timestamp || b.metadata?.date || b.metadata?.created;
      if (!ta || !tb) return false;
      
      const diff = Math.abs(new Date(ta).getTime() - new Date(tb).getTime());
      return diff < 3600000 && diff > 0; // 1 hour
    },
    strength: 60,
    evidence: "Events within 1 hour",
  },
  
  // Same device/browser signature
  {
    id: "shared_device",
    type: "technical",
    match: (a, b) => {
      const ua1 = a.metadata?.userAgent || a.metadata?.ua;
      const ua2 = b.metadata?.userAgent || b.metadata?.ua;
      return ua1 && ua2 && ua1 === ua2;
    },
    strength: 85,
    evidence: "Same device/browser fingerprint",
  },
  
  // Same IP address
  {
    id: "shared_ip",
    type: "technical",
    match: (a, b) => {
      const ip1 = a.type === "ip" ? a.value : a.metadata?.ip;
      const ip2 = b.type === "ip" ? b.value : b.metadata?.ip;
      return ip1 && ip2 && ip1 === ip2 && a.id !== b.id;
    },
    strength: 90,
    evidence: "Shared IP address",
  },
];

// Apply all correlation rules
export function findAdvancedCorrelations(entities: any[]): Array<{
  from: string;
  to: string;
  type: string;
  strength: number;
  evidence: string;
}> {
  const correlations: Array<{
    from: string;
    to: string;
    type: string;
    strength: number;
    evidence: string;
  }> = [];
  
  const seen = new Set<string>();
  
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      
      // Skip if already correlated
      const key = [a.id, b.id].sort().join(':');
      if (seen.has(key)) continue;
      
      // Check all rules
      for (const rule of AdvancedCorrelations) {
        try {
          if (rule.match(a, b)) {
            seen.add(key);
            correlations.push({
              from: a.id,
              to: b.id,
              type: rule.type,
              strength: rule.strength,
              evidence: typeof rule.evidence === 'function' 
                ? rule.evidence(a, b) 
                : rule.evidence,
            });
            break; // Only strongest correlation per pair
          }
        } catch (e) {
          // Skip on error
        }
      }
    }
  }
  
  return correlations.sort((a, b) => b.strength - a.strength);
}

// ============================================================================
// SEARCH ENGINE INTEGRATION
// ============================================================================

export const SearchEngines = {
  // DuckDuckGo HTML scraping
  async duckduckgo(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    try {
      const resp = await axios.get(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 15000,
        }
      );
      
      const html = resp.data as string;
      const results: Array<{ title: string; url: string; snippet: string }> = [];
      
      // Parse DDG results (simplified)
      const resultBlocks = html.match(/<a[^>]*class="result__a"[^>]*>.*?<\/a>/g) || [];
      
      for (const block of resultBlocks.slice(0, 10)) {
        const titleMatch = block.match(/>([^<]+)</);
        const urlMatch = block.match(/href="([^"]+)"/);
        
        if (titleMatch && urlMatch) {
          results.push({
            title: titleMatch[1].trim(),
            url: decodeURIComponent(urlMatch[1].replace(/\+/g, ' ')),
            snippet: "",
          });
        }
      }
      
      return results;
    } catch (e) {
      return [];
    }
  },
  
  // Bing API
  async bing(query: string, apiKey: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    try {
      const resp = await axios.get(
        `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=20`,
        {
          headers: { "Ocp-Apim-Subscription-Key": apiKey },
          timeout: 15000,
        }
      );
      
      const data = resp.data as any;
      return (data?.webPages?.value || []).map((p: any) => ({
        title: p.name,
        url: p.url,
        snippet: p.snippet,
      }));
    } catch (e) {
      return [];
    }
  },
  
  // Google Custom Search
  async google(query: string, apiKey: string, cx: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    try {
      const resp = await axios.get(
        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`,
        { timeout: 15000 }
      );
      
      const data = resp.data as any;
      return (data?.items || []).map((p: any) => ({
        title: p.title,
        url: p.link,
        snippet: p.snippet,
      }));
    } catch (e) {
      return [];
    }
  },
};

// ============================================================================
// CACHE & RATE LIMITING
// ============================================================================

// Simple in-memory cache (replace with Redis in production)
const cache = new Map<string, { value: any; expiry: number }>();

export const Cache = {
  async get<T>(key: string): Promise<T | null> {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    return item.value as T;
  },
  
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    cache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
  },
  
  async delete(key: string): Promise<void> {
    cache.delete(key);
  },
};

// Rate limiter
export class RateLimiter {
  private buckets: Map<string, { tokens: number; lastUpdate: number }> = new Map();
  
  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {}
  
  async acquire(key: string): Promise<boolean> {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = { tokens: this.maxTokens - 1, lastUpdate: now };
      this.buckets.set(key, bucket);
      return true;
    }
    
    const elapsed = (now - bucket.lastUpdate) / 1000;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsed * this.refillRate);
    bucket.lastUpdate = now;
    
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    
    return false;
  }
}

// Export all
export default {
  UsernameIntelligence,
  EmailIntelligence,
  DorkIntelligence,
  AdvancedCorrelations,
  findAdvancedCorrelations,
  SearchEngines,
  Cache,
  RateLimiter,
};
