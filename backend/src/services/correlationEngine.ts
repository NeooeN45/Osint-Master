// ============================================================================
// CORRELATION ENGINE v2
// Anti-false-positive + Vortimo-style auto-correlation + deep entity linking
// ============================================================================

import type { ToolResult } from "./osintEngine";

export interface Entity {
  id: string;
  type: "person" | "email" | "phone" | "username" | "domain" | "ip" | "organization" | "location" | "social_profile" | "url" | "technology" | "service" | "unknown";
  value: string;
  source: string;
  confidence: number;
  metadata: Record<string, any>;
  discoveredAt: string;
  verified: boolean;
  falsePositive: boolean;
}

export interface Correlation {
  id: string;
  entityA: string;
  entityB: string;
  type: string;
  strength: number;
  evidence: string;
  source: string;
  autoDetected: boolean;
}

export interface InvestigationGraph {
  entities: Entity[];
  correlations: Correlation[];
  summary: {
    totalEntities: number;
    totalCorrelations: number;
    strongLinks: number;
    categories: Record<string, number>;
    falsePositivesFiltered: number;
    verifiedEntities: number;
  };
}

// ---- Anti-false-positive rules ----
const FALSE_POSITIVE_PATTERNS = [
  /^(test|example|admin|root|user|guest|default|info|support|contact|noreply|no-reply)$/i,
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|255\.255\.255\.255)$/,
  /^(test@test\.com|user@example\.com|admin@admin\.com)$/i,
  /^(example\.(com|org|net)|test\.(com|org|net))$/i,
  /^(N\/A|null|undefined|none|unknown|error|\[deleted\]|\[removed\])$/i,
  /^.{1,2}$/,
  /^[0-9]+$/,
];

const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "trashmail.com",
  "10minutemail.com", "temp-mail.org", "fakeinbox.com",
];

const COMMON_FALSE_PROFILE_URLS = [
  "facebook.com/profile.php", "twitter.com/home", "instagram.com/accounts",
  "linkedin.com/login", "github.com/login", "reddit.com/login",
];

function isFalsePositive(type: string, value: string): boolean {
  if (!value || value.trim().length === 0) return true;
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(value.trim())) return true;
  }
  if (type === "email") {
    const domain = value.split("@")[1]?.toLowerCase();
    if (domain && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) return true;
    if (!value.match(/^[\w.+-]+@[\w-]+\.[\w.]+$/)) return true;
  }
  if (type === "social_profile" || type === "url") {
    for (const fp of COMMON_FALSE_PROFILE_URLS) {
      if (value.includes(fp)) return true;
    }
  }
  if (type === "domain") {
    if (!value.match(/^[\w.-]+\.\w{2,}$/)) return true;
  }
  if (type === "ip") {
    if (!value.match(/^(\d{1,3}\.){3}\d{1,3}$/)) return true;
    const parts = value.split(".").map(Number);
    if (parts.some(p => p > 255)) return true;
  }
  if (type === "phone") {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return true;
  }
  return false;
}

function computeConfidence(type: string, value: string, source: string, parsed: any): number {
  let base = 50;
  if (source.includes(",")) base += 20; // multi-source = higher
  if (type === "email" && value.match(/^[\w.+-]+@[\w-]+\.[\w.]+$/)) base += 15;
  if (type === "social_profile" && value.startsWith("http")) base += 10;
  if (type === "domain" && value.match(/^[\w.-]+\.\w{2,}$/)) base += 10;
  if (parsed?.verified === true) base += 25;
  if (parsed?.status === "Claimed" || parsed?.status === "found") base += 15;
  return Math.min(100, base);
}

class CorrelationEngine {
  private entities: Map<string, Entity> = new Map();
  private correlations: Correlation[] = [];
  private falsePositivesFiltered = 0;

  async init() {
    console.log("  Correlation engine initialized");
  }

  extractEntities(results: ToolResult[]): Entity[] {
    const extracted: Entity[] = [];
    this.falsePositivesFiltered = 0;

    for (const result of results) {
      if (!result.success || !result.parsed) continue;
      const p = result.parsed;

      // Social profiles (Sherlock, Maigret, Blackbird)
      if (p.profiles && Array.isArray(p.profiles)) {
        for (const prof of p.profiles) {
          const url = typeof prof === "string" ? prof : prof.url || prof;
          if (url) extracted.push(this.makeEntity("social_profile", url, result.tool, p));
        }
      }
      if (p.found && typeof p.found === "number" && p.urls) {
        for (const url of (Array.isArray(p.urls) ? p.urls : [])) {
          extracted.push(this.makeEntity("social_profile", url, result.tool, p));
        }
      }

      // Services (Holehe, Ignorant)
      if (p.services && Array.isArray(p.services)) {
        for (const svc of p.services) {
          const name = typeof svc === "string" ? svc : svc.service || svc.name || svc;
          if (name) extracted.push(this.makeEntity("service", String(name), result.tool, { registeredWith: result.target }));
        }
      }

      // Emails
      if (p.emails && Array.isArray(p.emails)) {
        for (const email of p.emails) extracted.push(this.makeEntity("email", email, result.tool, p));
      }

      // Hosts/subdomains
      if (p.hosts && Array.isArray(p.hosts)) {
        for (const h of p.hosts) extracted.push(this.makeEntity("domain", h, result.tool, p));
      }
      if (p.subdomains && Array.isArray(p.subdomains)) {
        for (const s of p.subdomains) extracted.push(this.makeEntity("domain", s, result.tool, p));
      }

      // URLs
      if (p.urls && Array.isArray(p.urls)) {
        for (const u of p.urls.slice(0, 50)) extracted.push(this.makeEntity("url", u, result.tool, p));
      }

      // Ports
      if (p.ports && Array.isArray(p.ports)) {
        for (const port of p.ports) {
          extracted.push(this.makeEntity("service", `${result.target}:${port.port} (${port.service || "unknown"})`, result.tool, port));
        }
      }

      // Phone info
      if (p.carrier) extracted.push(this.makeEntity("organization", p.carrier, result.tool, p));
      if (p.location) extracted.push(this.makeEntity("location", p.location, result.tool, p));

      // Technologies
      if (p.technologies && Array.isArray(p.technologies)) {
        for (const t of p.technologies) extracted.push(this.makeEntity("technology", t, result.tool, p));
      }

      // WHOIS
      if (p.registrar) extracted.push(this.makeEntity("organization", p.registrar, result.tool, { type: "registrar" }));
      if (p.registrant) extracted.push(this.makeEntity("organization", p.registrant, result.tool, { type: "registrant" }));

      // DNS records
      if (p.records && Array.isArray(p.records)) {
        for (const r of p.records) {
          const ip = typeof r === "string" ? r.match(/\d+\.\d+\.\d+\.\d+/) : null;
          if (ip) extracted.push(this.makeEntity("ip", ip[0], result.tool, p));
        }
      }

      // IPInfo style
      if (p.org) extracted.push(this.makeEntity("organization", p.org, result.tool, p));
      if (p.city) extracted.push(this.makeEntity("location", `${p.city}${p.region ? ", " + p.region : ""}${p.country ? ", " + p.country : ""}`, result.tool, p));
      if (p.hostname) extracted.push(this.makeEntity("domain", p.hostname, result.tool, p));

      // Breaches (h8mail)
      if (p.breaches && Array.isArray(p.breaches)) {
        for (const b of p.breaches) extracted.push(this.makeEntity("unknown", `Breach: ${b}`, result.tool, { type: "breach" }));
      }

      // Vulnerabilities (Nuclei)
      if (p.vulnerabilities && Array.isArray(p.vulnerabilities)) {
        for (const v of p.vulnerabilities) extracted.push(this.makeEntity("unknown", `Vuln: ${v}`, result.tool, { type: "vulnerability" }));
      }

      // Generic raw data
      if (p.raw && Array.isArray(p.raw) && !p.profiles && !p.services && !p.emails) {
        for (const line of p.raw.slice(0, 20)) {
          const emails = String(line).match(/[\w.+-]+@[\w-]+\.[\w.]+/g);
          const urls = String(line).match(/https?:\/\/[^\s"'<>]+/g);
          const ips = String(line).match(/\b(\d{1,3}\.){3}\d{1,3}\b/g);
          if (emails) for (const e of emails) extracted.push(this.makeEntity("email", e, result.tool, p));
          if (urls) for (const u of urls) extracted.push(this.makeEntity("url", u, result.tool, p));
          if (ips) for (const ip of ips) extracted.push(this.makeEntity("ip", ip, result.tool, p));
        }
      }
    }

    // Filter false positives and deduplicate
    for (const entity of extracted) {
      if (entity.falsePositive) {
        this.falsePositivesFiltered++;
        continue;
      }
      const key = `${entity.type}:${entity.value.toLowerCase().trim()}`;
      if (!this.entities.has(key)) {
        this.entities.set(key, entity);
      } else {
        const existing = this.entities.get(key)!;
        existing.confidence = Math.min(100, existing.confidence + 15);
        if (!existing.source.includes(entity.source)) {
          existing.source += `, ${entity.source}`;
        }
        existing.verified = existing.confidence >= 75;
      }
    }

    return Array.from(this.entities.values());
  }

  // Vortimo-style auto-correlation: deep relationship discovery
  findCorrelations(): Correlation[] {
    const entities = Array.from(this.entities.values());
    const newCorrelations: Correlation[] = [];
    const seen = new Set<string>();

    const addCor = (aId: string, bId: string, type: string, strength: number, evidence: string, source: string) => {
      const key = [aId, bId].sort().join(":") + ":" + type;
      if (seen.has(key)) return;
      seen.add(key);
      newCorrelations.push(this.createCorrelation(aId, bId, type, strength, evidence, source, true));
    };

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i];
        const b = entities[j];

        // 1. Same tool = co-discovered
        if (a.source === b.source && a.source !== "user_input") {
          addCor(a.id, b.id, "co_discovered", 40, `Both from ${a.source}`, a.source);
        }

        // 2. Multi-source confirmation = strong link
        if (a.source.includes(",") && b.source.includes(",")) {
          const aSources = a.source.split(",").map(s => s.trim());
          const bSources = b.source.split(",").map(s => s.trim());
          const shared = aSources.filter(s => bSources.includes(s));
          if (shared.length > 0) {
            addCor(a.id, b.id, "multi_source_confirmed", 85, `Confirmed by: ${shared.join(", ")}`, "correlation_engine");
          }
        }

        // 3. Email → Domain
        if (a.type === "email" && b.type === "domain") {
          const eDomain = a.value.split("@")[1]?.toLowerCase();
          if (eDomain && b.value.toLowerCase().includes(eDomain)) {
            addCor(a.id, b.id, "email_belongs_to_domain", 92, `${a.value} → ${b.value}`, "auto");
          }
        }
        if (b.type === "email" && a.type === "domain") {
          const eDomain = b.value.split("@")[1]?.toLowerCase();
          if (eDomain && a.value.toLowerCase().includes(eDomain)) {
            addCor(b.id, a.id, "email_belongs_to_domain", 92, `${b.value} → ${a.value}`, "auto");
          }
        }

        // 4. Username in profile URL
        if (a.type === "username" && (b.type === "social_profile" || b.type === "url")) {
          if (b.value.toLowerCase().includes(a.value.toLowerCase()) && a.value.length >= 3) {
            addCor(a.id, b.id, "username_found_in_url", 88, `"${a.value}" in ${b.value}`, "auto");
          }
        }
        if (b.type === "username" && (a.type === "social_profile" || a.type === "url")) {
          if (a.value.toLowerCase().includes(b.value.toLowerCase()) && b.value.length >= 3) {
            addCor(b.id, a.id, "username_found_in_url", 88, `"${b.value}" in ${a.value}`, "auto");
          }
        }

        // 5. Same domain across profiles
        if ((a.type === "social_profile" || a.type === "url") && (b.type === "social_profile" || b.type === "url")) {
          try {
            const dA = new URL(a.value.startsWith("http") ? a.value : "https://" + a.value).hostname;
            const dB = new URL(b.value.startsWith("http") ? b.value : "https://" + b.value).hostname;
            if (dA === dB && dA !== "www.google.com") {
              addCor(a.id, b.id, "same_platform", 65, `Both on ${dA}`, "auto");
            }
          } catch {}
        }

        // 6. IP → Domain
        if (a.type === "ip" && b.type === "domain") {
          addCor(a.id, b.id, "ip_resolves_to", 70, `${a.value} ↔ ${b.value}`, "dns");
        }
        if (b.type === "ip" && a.type === "domain") {
          addCor(b.id, a.id, "ip_resolves_to", 70, `${b.value} ↔ ${a.value}`, "dns");
        }

        // 7. Organization links
        if (a.type === "organization" && b.type === "organization") {
          if (a.value.toLowerCase() === b.value.toLowerCase()) {
            addCor(a.id, b.id, "same_organization", 95, a.value, "auto");
          }
        }
        if ((a.type === "organization" && (b.type === "domain" || b.type === "email")) ||
            (b.type === "organization" && (a.type === "domain" || a.type === "email"))) {
          const org = a.type === "organization" ? a : b;
          const other = a.type === "organization" ? b : a;
          if (other.value.toLowerCase().includes(org.value.toLowerCase().split(" ")[0])) {
            addCor(org.id, other.id, "org_associated", 60, `${org.value} ↔ ${other.value}`, "auto");
          }
        }

        // 8. Location proximity (same location string)
        if (a.type === "location" && b.type === "location") {
          if (a.value.toLowerCase() === b.value.toLowerCase()) {
            addCor(a.id, b.id, "same_location", 90, a.value, "auto");
          } else {
            const aCity = a.value.split(",")[0]?.trim().toLowerCase();
            const bCity = b.value.split(",")[0]?.trim().toLowerCase();
            if (aCity && bCity && aCity === bCity) {
              addCor(a.id, b.id, "same_city", 70, `Both in ${aCity}`, "auto");
            }
          }
        }

        // 9. Service registered with email/phone (Holehe, Ignorant)
        if (a.type === "service" && (b.type === "email" || b.type === "phone")) {
          if (a.metadata?.registeredWith === b.value) {
            addCor(a.id, b.id, "registered_with", 90, `${a.value} registered with ${b.value}`, "auto");
          }
        }
        if (b.type === "service" && (a.type === "email" || a.type === "phone")) {
          if (b.metadata?.registeredWith === a.value) {
            addCor(b.id, a.id, "registered_with", 90, `${b.value} registered with ${a.value}`, "auto");
          }
        }

        // 10. Technology → Domain
        if (a.type === "technology" && b.type === "domain") {
          addCor(a.id, b.id, "tech_used_by", 55, `${b.value} uses ${a.value}`, "auto");
        }
        if (b.type === "technology" && a.type === "domain") {
          addCor(b.id, a.id, "tech_used_by", 55, `${a.value} uses ${b.value}`, "auto");
        }

        // 11. Subdomain relationship
        if (a.type === "domain" && b.type === "domain") {
          if (a.value.endsWith("." + b.value) || b.value.endsWith("." + a.value)) {
            addCor(a.id, b.id, "subdomain_of", 85, `${a.value} ↔ ${b.value}`, "auto");
          }
        }
      }
    }

    this.correlations.push(...newCorrelations);
    return newCorrelations;
  }

  buildGraph(): InvestigationGraph {
    const entities = Array.from(this.entities.values());
    const categories: Record<string, number> = {};
    let verified = 0;

    for (const e of entities) {
      categories[e.type] = (categories[e.type] || 0) + 1;
      if (e.verified) verified++;
    }

    return {
      entities,
      correlations: this.correlations,
      summary: {
        totalEntities: entities.length,
        totalCorrelations: this.correlations.length,
        strongLinks: this.correlations.filter(c => c.strength >= 75).length,
        categories,
        falsePositivesFiltered: this.falsePositivesFiltered,
        verifiedEntities: verified,
      },
    };
  }

  reset() {
    this.entities.clear();
    this.correlations = [];
    this.falsePositivesFiltered = 0;
  }

  addEntity(type: Entity["type"], value: string, source: string, confidence: number = 50) {
    const entity = this.makeEntity(type, value, source, {}, confidence);
    const key = `${type}:${value.toLowerCase().trim()}`;
    this.entities.set(key, entity);
    return entity;
  }

  private makeEntity(type: Entity["type"], value: string, source: string, metadata: any = {}, overrideConf?: number): Entity {
    const fp = isFalsePositive(type, value);
    const confidence = overrideConf ?? computeConfidence(type, value, source, metadata);
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      value: value.trim(),
      source,
      confidence: fp ? 0 : confidence,
      metadata,
      discoveredAt: new Date().toISOString(),
      verified: confidence >= 75 && !fp,
      falsePositive: fp,
    };
  }

  private createCorrelation(entityA: string, entityB: string, type: string, strength: number, evidence: string, source: string, autoDetected: boolean = false): Correlation {
    return {
      id: `cor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      entityA, entityB, type, strength, evidence, source, autoDetected,
    };
  }
}

export const correlationEngine = new CorrelationEngine();
