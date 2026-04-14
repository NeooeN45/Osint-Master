// ============================================================================
// Result Validator - Validates OSINT results to reduce false positives
// ============================================================================

import { logger } from "../utils/logger";

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  reason: string;
  validationMethod: string;
  originalResult: any;
}

// Patterns that indicate false positives
const FALSE_POSITIVE_PATTERNS = [
  // Generic error pages
  /404|not found|page not found|error|erreur/i,
  // Rate limiting
  /rate limit|too many requests|429|blocked/i,
  // Captcha/challenge
  /captcha|challenge|verify|verification|cloudflare/i,
  // Login required
  /sign in|login|log in|authentification|connexion/i,
  // Empty/generic content
  /no results|empty|aucun résultat|no data/i,
  // Suspended/deleted
  /suspended|deleted|removed|banned|disabled/i,
];

// Indicators of a REAL profile
const REAL_PROFILE_INDICATORS = [
  // Profile-specific content
  /profile|profil|member|utilisateur|user/i,
  // Activity indicators
  /posts?|publications?|followers?|following|amis?|friends?/i,
  // Personal info present
  /joined|inscrit|depuis|member since|location|bio|about/i,
  // Content present
  /avatar|photo|image|content|contrib/i,
  // Username in content
  /username|pseudo|@|handle/i,
];

export class ResultValidator {
  
  // Main validation method
  validate(toolId: string, target: string, output: string, parsed: any): ValidationResult {
    logger.debug(`[VALIDATOR] Validating ${toolId} result for ${target}`);
    
    // Check 1: Output quality
    const qualityCheck = this.checkOutputQuality(output);
    if (!qualityCheck.isValid) {
      return {
        isValid: false,
        confidence: qualityCheck.confidence,
        reason: qualityCheck.reason,
        validationMethod: "output_quality",
        originalResult: { toolId, target, output, parsed }
      };
    }
    
    // Check 2: Parsed results validity
    const parsedCheck = this.checkParsedResults(toolId, parsed, output);
    if (!parsedCheck.isValid) {
      return {
        isValid: false,
        confidence: parsedCheck.confidence,
        reason: parsedCheck.reason,
        validationMethod: "parsed_results",
        originalResult: { toolId, target, output, parsed }
      };
    }
    
    // Check 3: URL accessibility (for URL-based results)
    if (parsed && (parsed.url || (parsed.profiles && parsed.profiles[0]))) {
      const urlCheck = this.validateUrlAccessibility(parsed.url || parsed.profiles[0]);
      if (!urlCheck.isValid) {
        return {
          isValid: false,
          confidence: urlCheck.confidence,
          reason: urlCheck.reason,
          validationMethod: "url_accessibility",
          originalResult: { toolId, target, output, parsed }
        };
      }
    }
    
    // Check 4: Content verification
    const contentCheck = this.verifyContent(toolId, output, parsed);
    
    // Calculate final confidence
    const finalConfidence = this.calculateFinalConfidence(
      qualityCheck.confidence,
      parsedCheck.confidence,
      contentCheck.confidence
    );
    
    return {
      isValid: finalConfidence >= 70, // Minimum threshold for valid results
      confidence: finalConfidence,
      reason: contentCheck.reason,
      validationMethod: "comprehensive",
      originalResult: { toolId, target, output, parsed }
    };
  }
  
  // Check 1: Output quality analysis
  private checkOutputQuality(output: string): { isValid: boolean; confidence: number; reason: string } {
    // Check for empty or too short output
    if (!output || output.length < 10) {
      return {
        isValid: false,
        confidence: 0,
        reason: "Output too short or empty"
      };
    }
    
    // Check for false positive patterns
    for (const pattern of FALSE_POSITIVE_PATTERNS) {
      if (pattern.test(output)) {
        // Check if it's a strong indicator
        const matches = output.match(new RegExp(pattern, "gi"));
        if (matches && matches.length > 2) {
          return {
            isValid: false,
            confidence: 15,
            reason: `False positive indicators detected: ${matches.slice(0, 3).join(", ")}`
          };
        }
      }
    }
    
    // Check for real profile indicators
    let realIndicators = 0;
    for (const indicator of REAL_PROFILE_INDICATORS) {
      if (indicator.test(output)) {
        realIndicators++;
      }
    }
    
    if (realIndicators >= 2) {
      return {
        isValid: true,
        confidence: 60 + (realIndicators * 5),
        reason: `${realIndicators} real profile indicators found`
      };
    }
    
    return {
      isValid: true,
      confidence: 50,
      reason: "Basic output quality check passed"
    };
  }
  
  // Check 2: Parsed results validity
  private checkParsedResults(toolId: string, parsed: any, output: string): { isValid: boolean; confidence: number; reason: string } {
    if (!parsed) {
      return {
        isValid: false,
        confidence: 10,
        reason: "No parsed results available"
      };
    }
    
    // Check specific tool results
    switch (toolId) {
      case "sherlock":
      case "maigret":
        return this.validateUsernameResults(parsed, output);
        
      case "holehe":
        return this.validateEmailResults(parsed, output);
        
      case "subfinder":
      case "dnsrecon":
        return this.validateDomainResults(parsed, output);
        
      case "theharvester":
        return this.validateHarvestResults(parsed, output);
        
      default:
        return this.validateGenericResults(parsed, output);
    }
  }
  
  // Validate username search results
  private validateUsernameResults(parsed: any, output: string): { isValid: boolean; confidence: number; reason: string } {
    const found = parsed.found || 0;
    const profiles = parsed.profiles || [];
    
    // If no profiles found
    if (found === 0 || profiles.length === 0) {
      return {
        isValid: false,
        confidence: 5,
        reason: "No profiles found"
      };
    }
    
    // Check for [+] markers in output (Sherlock style)
    const positiveMarkers = (output.match(/\[\+\]/g) || []).length;
    if (positiveMarkers === 0 && found > 0) {
      return {
        isValid: false,
        confidence: 20,
        reason: "Discrepancy: claimed profiles but no positive markers in output"
      };
    }
    
    // Validate URLs are not generic
    const validProfiles = profiles.filter((url: string) => {
      if (!url || typeof url !== "string") return false;
      // Filter out error pages
      if (/404|error|notfound/i.test(url)) return false;
      // Must contain username-like pattern
      return url.length > 20;
    });
    
    if (validProfiles.length === 0) {
      return {
        isValid: false,
        confidence: 15,
        reason: "All profile URLs appear to be invalid or generic"
      };
    }
    
    // Calculate confidence based on validation
    const confidence = Math.min(85, 40 + (positiveMarkers * 3) + (validProfiles.length * 5));
    
    return {
      isValid: true,
      confidence,
      reason: `${validProfiles.length} valid profiles with ${positiveMarkers} positive markers`
    };
  }
  
  // Validate email search results
  private validateEmailResults(parsed: any, output: string): { isValid: boolean; confidence: number; reason: string } {
    const lines = output.split("\n");
    
    // Count positive matches
    const positiveLines = lines.filter((line: string) => 
      line.includes("[+]") && !line.includes("[-]") && !line.includes("[!]")
    );
    
    // Check for rate limiting
    if (output.includes("Rate limit") || output.includes("429")) {
      return {
        isValid: false,
        confidence: 10,
        reason: "Rate limited - results may be incomplete"
      };
    }
    
    // Check for valid results
    if (positiveLines.length === 0) {
      return {
        isValid: false,
        confidence: 15,
        reason: "No positive matches found"
      };
    }
    
    // Validate service names are present
    const services = positiveLines.map((line: string) => {
      const match = line.match(/\[\+\]\s*(\S+)/);
      return match ? match[1] : null;
    }).filter(Boolean);
    
    if (services.length === 0) {
      return {
        isValid: false,
        confidence: 20,
        reason: "Could not extract service names from results"
      };
    }
    
    return {
      isValid: true,
      confidence: Math.min(90, 50 + (services.length * 5)),
      reason: `${services.length} verified services found`
    };
  }
  
  // Validate domain results
  private validateDomainResults(parsed: any, output: string): { isValid: boolean; confidence: number; reason: string } {
    const records = parsed.records || parsed.subdomains || parsed.hosts || [];
    
    if (!records || records.length === 0) {
      return {
        isValid: false,
        confidence: 10,
        reason: "No DNS records or subdomains found"
      };
    }
    
    // Filter out generic/wildcard records
    const validRecords = records.filter((record: any) => {
      const r = typeof record === "string" ? record : record.name || record.host || "";
      // Exclude wildcards and generic patterns
      if (r.includes("*") || r.includes("wildcard")) return false;
      // Must have actual content
      return r.length > 3 && r.includes(".");
    });
    
    if (validRecords.length === 0) {
      return {
        isValid: false,
        confidence: 15,
        reason: "Only generic or wildcard records found"
      };
    }
    
    return {
      isValid: true,
      confidence: Math.min(85, 50 + (validRecords.length * 3)),
      reason: `${validRecords.length} valid DNS records`
    };
  }
  
  // Validate theHarvester results
  private validateHarvestResults(parsed: any, output: string): { isValid: boolean; confidence: number; reason: string } {
    const emails = parsed.emails || [];
    const hosts = parsed.hosts || [];
    
    if (emails.length === 0 && hosts.length === 0) {
      return {
        isValid: false,
        confidence: 10,
        reason: "No emails or hosts found"
      };
    }
    
    // Validate email format
    const validEmails = emails.filter((email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });
    
    // Validate host format
    const validHosts = hosts.filter((host: string) => {
      return host.includes(".") && host.length > 4;
    });
    
    return {
      isValid: true,
      confidence: Math.min(80, 45 + (validEmails.length * 5) + (validHosts.length * 3)),
      reason: `${validEmails.length} emails, ${validHosts.length} hosts found`
    };
  }
  
  // Generic results validation
  private validateGenericResults(parsed: any, output: string): { isValid: boolean; confidence: number; reason: string } {
    // Check if parsed has meaningful data
    const hasData = Object.keys(parsed).length > 0 && 
                    Object.values(parsed).some(v => v && (typeof v !== "object" || Object.keys(v).length > 0));
    
    if (!hasData) {
      return {
        isValid: false,
        confidence: 15,
        reason: "No meaningful data in parsed results"
      };
    }
    
    return {
      isValid: true,
      confidence: 55,
      reason: "Generic validation passed"
    };
  }
  
  // Check 3: URL accessibility validation (simplified - would need HTTP checks in production)
  private validateUrlAccessibility(url: string): { isValid: boolean; confidence: number; reason: string } {
    if (!url || typeof url !== "string") {
      return {
        isValid: false,
        confidence: 0,
        reason: "Invalid URL"
      };
    }
    
    // Basic URL format validation
    if (!url.match(/^https?:\/\/.+/)) {
      return {
        isValid: false,
        confidence: 5,
        reason: "URL format invalid"
      };
    }
    
    // Check for error indicators in URL
    if (/404|error|notfound|404\.html/i.test(url)) {
      return {
        isValid: false,
        confidence: 10,
        reason: "URL appears to be an error page"
      };
    }
    
    return {
      isValid: true,
      confidence: 70,
      reason: "URL format valid"
    };
  }
  
  // Check 4: Content verification
  private verifyContent(toolId: string, output: string, parsed: any): { isValid: boolean; confidence: number; reason: string } {
    // Check for tool-specific success patterns
    const toolPatterns: Record<string, RegExp[]> = {
      "sherlock": [/\[\+\].*http/, /Found.*profile/i, /username.*exists/i],
      "maigret": [/\[\+\].*http/, /Found.*site/i, /exists.*yes/i],
      "holehe": [/\[\+\].*:/, /registered.*yes/i, /found.*account/i],
      "subfinder": [/discovered.*subdomain/i, /found.*host/i],
      "theharvester": [/\[\*\].*email/i, /\[\*\].*host/i]
    };
    
    const patterns = toolPatterns[toolId] || [];
    let matches = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(output)) {
        matches++;
      }
    }
    
    if (matches === 0 && patterns.length > 0) {
      return {
        isValid: false,
        confidence: 25,
        reason: `No success patterns found for ${toolId}`
      };
    }
    
    return {
      isValid: true,
      confidence: 50 + (matches * 10),
      reason: `${matches} success patterns matched`
    };
  }
  
  // Calculate final confidence score
  private calculateFinalConfidence(...scores: number[]): number {
    // Weighted average with minimum threshold
    const weights = [0.3, 0.3, 0.4]; // output, parsed, content
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < scores.length && i < weights.length; i++) {
      weightedSum += scores[i] * weights[i];
      totalWeight += weights[i];
    }
    
    const final = Math.round(weightedSum / totalWeight);
    return Math.min(100, Math.max(0, final));
  }
  
  // Batch validate multiple results
  validateBatch(results: Array<{ toolId: string; target: string; output: string; parsed: any }>): ValidationResult[] {
    return results.map(r => this.validate(r.toolId, r.target, r.output, r.parsed));
  }
}

export const resultValidator = new ResultValidator();
