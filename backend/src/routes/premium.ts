/**
 * Routes API pour les services Premium
 * HaveIBeenPwned, Shodan, VirusTotal, Clearbit, Hunter, etc.
 */

import { Router } from "express";
import {
  checkHIBP,
  shodanHost,
  shodanSearch,
  shodanDnsResolve,
  shodanDnsReverse,
  virustotalIP,
  virustotalDomain,
  checkAbuseIPDB,
  getIPinfo,
  clearbitEnrichCompany,
  clearbitEnrichPerson,
  hunterDomainSearch,
  hunterEmailFinder,
  enrichEntity,
  getPremiumAPIStatus
} from "../services/premiumApis";
import { logger } from "../utils/logger";

export const premiumRouter = Router();

// ============================================================================
// STATUS APIs
// ============================================================================

// Vérifie quelles APIs sont configurées
premiumRouter.get("/status", async (_req, res) => {
  const status = getPremiumAPIStatus();
  res.json({
    ...status,
    message: `${status.configured.length} APIs configured, ${status.missing.length} missing`,
    envVars: {
      HIBP_API_KEY: process.env.HIBP_API_KEY ? "✓ Set" : "✗ Missing",
      SHODAN_API_KEY: process.env.SHODAN_API_KEY ? "✓ Set" : "✗ Missing",
      VT_API_KEY: process.env.VT_API_KEY ? "✓ Set" : "✗ Missing",
      ABUSEIPDB_API_KEY: process.env.ABUSEIPDB_API_KEY ? "✓ Set" : "✗ Missing",
      IPINFO_API_KEY: process.env.IPINFO_API_KEY ? "✓ Set" : "✗ Missing (optional)",
      CLEARBIT_API_KEY: process.env.CLEARBIT_API_KEY ? "✓ Set" : "✗ Missing",
      HUNTER_API_KEY: process.env.HUNTER_API_KEY ? "✓ Set" : "✗ Missing"
    }
  });
});

// ============================================================================
// HAVE I BEEN PWNED
// ============================================================================

// Vérifie les breaches d'un email
premiumRouter.get("/hibp/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const data = await checkHIBP(email);

    res.json({
      email,
      breached: data.breaches.length > 0,
      breachCount: data.breaches.length,
      pasteCount: data.pastes.length,
      exposedDataTypes: data.exposedData,
      breaches: data.breaches,
      pastes: data.pastes,
      riskLevel: data.breaches.length > 5 ? "critical" : data.breaches.length > 0 ? "high" : "low"
    });
  } catch (error: any) {
    logger.error("[API] HIBP error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SHODAN
// ============================================================================

// Récupère les infos d'un hôte par IP
premiumRouter.get("/shodan/host/:ip", async (req, res) => {
  try {
    const { ip } = req.params;
    const data = await shodanHost(ip);

    if (!data) {
      return res.status(404).json({ error: "Host not found in Shodan or API not configured" });
    }

    res.json({
      ip: data.ip,
      ports: data.ports,
      hostnames: data.hostnames,
      tags: data.tags,
      location: {
        city: data.city,
        country: data.country_name,
        coordinates: [data.latitude, data.longitude]
      },
      organization: {
        asn: data.asn,
        org: data.org,
        isp: data.isp
      },
      vulnerabilities: data.vulns || [],
      services: data.data.map(s => ({
        port: s.port,
        transport: s.transport,
        product: s.product,
        version: s.version,
        banner: s.banner?.substring(0, 500),
        ssl: s.ssl?.cert ? {
          subject: s.ssl.cert.subject,
          issuer: s.ssl.cert.issuer,
          expired: s.ssl.cert.expired
        } : null,
        http: s.http ? {
          title: s.http.title,
          server: s.http.server
        } : null
      })),
      lastUpdate: data.lastUpdate
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recherche Shodan
premiumRouter.get("/shodan/search", async (req, res) => {
  try {
    const { q, limit = "10" } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' required" });
    }

    const data = await shodanSearch(q as string, parseInt(limit as string));

    res.json({
      query: q,
      total: data.total,
      showing: data.matches.length,
      matches: data.matches.map(m => ({
        ip: m.ip,
        port: m.data[0]?.port,
        product: m.data[0]?.product,
        location: {
          city: m.city,
          country: m.country_name
        }
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DNS Resolution
premiumRouter.get("/shodan/dns/resolve", async (req, res) => {
  try {
    const { hostname } = req.query;
    if (!hostname) {
      return res.status(400).json({ error: "hostname parameter required" });
    }

    const ip = await shodanDnsResolve(hostname as string);
    res.json({ hostname, ip, resolved: !!ip });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reverse DNS
premiumRouter.get("/shodan/dns/reverse", async (req, res) => {
  try {
    const { ip } = req.query;
    if (!ip) {
      return res.status(400).json({ error: "ip parameter required" });
    }

    const hostnames = await shodanDnsReverse(ip as string);
    res.json({ ip, hostnames, count: hostnames.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// VIRUSTOTAL
// ============================================================================

// Scan IP
premiumRouter.get("/virustotal/ip/:ip", async (req, res) => {
  try {
    const { ip } = req.params;
    const data = await virustotalIP(ip);

    if (!data) {
      return res.status(404).json({ error: "IP not found or API not configured" });
    }

    const stats = data.data.attributes.last_analysis_stats;
    const malicious = stats.malicious + (stats.suspicious || 0);
    const total = stats.harmless + malicious + (stats.undetected || 0);
    const percentage = total > 0 ? Math.round((malicious / total) * 100) : 0;

    res.json({
      ip,
      reputation: data.data.attributes.reputation,
      analysis: {
        malicious: stats.malicious,
        suspicious: stats.suspicious,
        harmless: stats.harmless,
        undetected: stats.undetected,
        total,
        maliciousPercentage: percentage
      },
      network: {
        asn: data.data.attributes.asn,
        asOwner: data.data.attributes.as_owner,
        country: data.data.attributes.country,
        regionalInternetRegistry: data.data.attributes.regional_internet_registry
      },
      votes: data.data.attributes.total_votes,
      tags: data.data.attributes.tags,
      engines: Object.entries(data.data.attributes.last_analysis_results)
        .filter(([_, result]: [string, any]) => result.category !== "harmless")
        .map(([name, result]: [string, any]) => ({
          name,
          category: result.category,
          result: result.result
        }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Scan Domain
premiumRouter.get("/virustotal/domain/:domain", async (req, res) => {
  try {
    const { domain } = req.params;
    const data = await virustotalDomain(domain);

    if (!data) {
      return res.status(404).json({ error: "Domain not found or API not configured" });
    }

    const stats = data.data.attributes.last_analysis_stats;
    const malicious = stats.malicious + (stats.suspicious || 0);

    res.json({
      domain,
      reputation: data.data.attributes.reputation,
      analysis: stats,
      whois: {
        registrar: data.data.attributes.registrar,
        creationDate: data.data.attributes.creation_date,
        expirationDate: data.data.attributes.expiration_date
      },
      dns: data.data.attributes.last_dns_records,
      categories: data.data.attributes.categories,
      malicious
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ABUSE IPDB
// ============================================================================

// Check IP reputation
premiumRouter.get("/abuseipdb/:ip", async (req, res) => {
  try {
    const { ip } = req.params;
    const data = await checkAbuseIPDB(ip);

    if (!data) {
      return res.status(404).json({ error: "IP not found or API not configured" });
    }

    res.json({
      ip: data.data.ipAddress,
      isPublic: data.data.isPublic,
      abuseConfidenceScore: data.data.abuseConfidenceScore,
      riskLevel: data.data.abuseConfidenceScore > 75 ? "critical" :
                 data.data.abuseConfidenceScore > 50 ? "high" :
                 data.data.abuseConfidenceScore > 25 ? "medium" : "low",
      country: {
        code: data.data.countryCode,
        name: data.data.countryName
      },
      isp: data.data.isp,
      domain: data.data.domain,
      usageType: data.data.usageType,
      reports: {
        total: data.data.totalReports,
        distinctUsers: data.data.numDistinctUsers,
        lastReported: data.data.lastReportedAt
      },
      isWhitelisted: data.data.isWhitelisted
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// IPINFO
// ============================================================================

// Get IP geolocation and ASN
premiumRouter.get("/ipinfo/:ip", async (req, res) => {
  try {
    const { ip } = req.params;
    const data = await getIPinfo(ip);

    if (!data) {
      return res.status(404).json({ error: "Could not retrieve IP info" });
    }

    res.json({
      ip: data.ip,
      location: {
        city: data.city,
        region: data.region,
        country: data.country_name || data.country,
        coordinates: data.loc?.split(",").map(Number)
      },
      organization: {
        org: data.org,
        asn: data.asn,
        company: data.company
      },
      privacy: data.privacy,
      abuse: data.abuse,
      domains: data.domains
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CLEARBIT
// ============================================================================

// Enrich company by domain
premiumRouter.get("/clearbit/company/:domain", async (req, res) => {
  try {
    const { domain } = req.params;
    const data = await clearbitEnrichCompany(domain);

    if (!data) {
      return res.status(404).json({ error: "Company not found or API not configured" });
    }

    res.json({
      domain: data.domain,
      name: data.name,
      legalName: data.legalName,
      description: data.description,
      category: data.category,
      tags: data.tags,
      metrics: data.metrics,
      location: data.location,
      geo: data.geo,
      social: {
        facebook: data.facebook,
        linkedin: data.linkedin,
        twitter: data.twitter
      },
      site: data.site,
      foundedYear: data.foundedYear,
      emailProvider: data.emailProvider,
      type: data.type,
      ticker: data.ticker
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enrich person by email
premiumRouter.get("/clearbit/person/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const data = await clearbitEnrichPerson(email);

    if (!data) {
      return res.status(404).json({ error: "Person not found or API not configured" });
    }

    res.json({
      name: data.name,
      email: data.email,
      bio: data.bio,
      location: data.location,
      geo: data.geo,
      employment: data.employment,
      social: {
        facebook: data.facebook,
        github: data.github,
        twitter: data.twitter,
        linkedin: data.linkedin
      },
      avatar: data.avatar,
      site: data.site
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HUNTER
// ============================================================================

// Domain search for emails
premiumRouter.get("/hunter/domain/:domain", async (req, res) => {
  try {
    const { domain } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const data = await hunterDomainSearch(domain, limit);

    if (!data) {
      return res.status(404).json({ error: "Domain not found or API not configured" });
    }

    res.json({
      domain: data.domain,
      pattern: data.pattern,
      organization: data.organization,
      disposable: data.disposable,
      webmail: data.webmail,
      acceptAll: data.accept_all,
      emailCount: data.emails.length,
      emails: data.emails.map(e => ({
        value: e.value,
        type: e.type,
        confidence: e.confidence,
        firstName: e.first_name,
        lastName: e.last_name,
        position: e.position,
        seniority: e.seniority,
        department: e.department,
        linkedin: e.linkedin,
        twitter: e.twitter,
        phone: e.phone_number,
        verification: e.verification,
        sources: e.sources
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Email finder
premiumRouter.get("/hunter/find", async (req, res) => {
  try {
    const { domain, firstName, lastName } = req.query;

    if (!domain || !firstName || !lastName) {
      return res.status(400).json({
        error: "Parameters required: domain, firstName, lastName"
      });
    }

    const data = await hunterEmailFinder(
      domain as string,
      firstName as string,
      lastName as string
    );

    if (!data?.email) {
      return res.status(404).json({ error: "Email could not be found" });
    }

    res.json({
      email: data.email,
      score: data.score,
      confidence: data.score && data.score > 80 ? "high" : data.score && data.score > 50 ? "medium" : "low"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENRICHMENT COMPLET
// ============================================================================

// Enrichit une entité avec toutes les APIs disponibles
premiumRouter.post("/enrich", async (req, res) => {
  try {
    const { type, value } = req.body;

    if (!type || !value) {
      return res.status(400).json({ error: "type and value required" });
    }

    if (!["ip", "domain", "email", "company"].includes(type)) {
      return res.status(400).json({ error: "type must be: ip, domain, email, company" });
    }

    logger.info(`[API] Starting enrichment for ${type}:${value}`);

    const result = await enrichEntity(type as any, value);

    res.json(result);
  } catch (error: any) {
    logger.error("[API] Enrichment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Enrichissement batch
premiumRouter.post("/enrich/batch", async (req, res) => {
  try {
    const { entities } = req.body;

    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: "entities array required" });
    }

    logger.info(`[API] Batch enrichment for ${entities.length} entities`);

    const results = await Promise.all(
      entities.map(async (e: { type: any; value: any }) => {
        try {
          return await enrichEntity(e.type, e.value);
        } catch (err: any) {
          return { type: e.type, value: e.value, error: err.message };
        }
      })
    );

    res.json({
      total: entities.length,
      completed: results.filter((r: any) => !r.error).length,
      failed: results.filter((r: any) => r.error).length,
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
