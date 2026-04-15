// ============================================================================
// GOOGLE DORKER PRO - OSINT Master
// Génération et exécution de Google Dorks avancés
// ============================================================================

import { logger } from "../../utils/logger.js";

export interface DorkResult {
  query: string;
  url: string;
  title: string;
  snippet: string;
  source: string;
  relevance: number;
}

export interface DorkTemplate {
  name: string;
  category: string;
  template: string;
  targetTypes: string[];
  severity: "low" | "medium" | "high" | "critical";
}

// ============================================================================
// TEMPLATES DE DORKS PAR CATÉGORIE
// ============================================================================
const DORK_TEMPLATES: DorkTemplate[] = [
  // ---- PERSON / USERNAME ----
  { name: "exact_name", category: "person", template: '"{target}"', targetTypes: ["username", "person"], severity: "low" },
  { name: "social_profiles", category: "social", template: '"{target}" site:linkedin.com OR site:twitter.com OR site:facebook.com OR site:instagram.com', targetTypes: ["username", "person"], severity: "low" },
  { name: "github_profile", category: "code", template: 'site:github.com "{target}"', targetTypes: ["username"], severity: "medium" },
  { name: "pastebin_leaks", category: "breach", template: '"{target}" site:pastebin.com OR site:paste.ee OR site:hastebin.com', targetTypes: ["username", "email", "person"], severity: "high" },
  { name: "forum_posts", category: "social", template: '"{target}" site:reddit.com OR site:forum.* OR site:community.*', targetTypes: ["username", "person"], severity: "low" },
  { name: "documents", category: "docs", template: '"{target}" filetype:pdf OR filetype:doc OR filetype:xls', targetTypes: ["person", "organization"], severity: "medium" },
  { name: "cv_resume", category: "personal", template: '"{target}" CV OR resume OR curriculum filetype:pdf', targetTypes: ["person"], severity: "high" },
  { name: "phone_search", category: "personal", template: '"{target}" tel OR phone OR contact', targetTypes: ["person"], severity: "high" },

  // ---- EMAIL ----
  { name: "email_mentions", category: "email", template: '"{target}"', targetTypes: ["email"], severity: "low" },
  { name: "email_breaches", category: "breach", template: '"{target}" leak OR breach OR dump OR password OR hacked', targetTypes: ["email"], severity: "critical" },
  { name: "email_registrations", category: "social", template: '"{target}" registered OR account OR profile', targetTypes: ["email"], severity: "medium" },
  { name: "email_docs", category: "docs", template: '"{target}" filetype:pdf OR filetype:xlsx OR filetype:csv', targetTypes: ["email"], severity: "high" },

  // ---- DOMAIN ----
  { name: "domain_subdomains", category: "domain", template: 'site:{target}', targetTypes: ["domain"], severity: "low" },
  { name: "domain_admin", category: "domain", template: 'site:{target} intitle:admin OR intitle:login OR intitle:dashboard', targetTypes: ["domain"], severity: "critical" },
  { name: "domain_config_files", category: "domain", template: 'site:{target} filetype:env OR filetype:yaml OR filetype:conf OR filetype:ini', targetTypes: ["domain"], severity: "critical" },
  { name: "domain_backup", category: "domain", template: 'site:{target} filetype:bak OR filetype:old OR filetype:backup OR inurl:backup', targetTypes: ["domain"], severity: "high" },
  { name: "domain_sql", category: "domain", template: 'site:{target} filetype:sql OR filetype:db', targetTypes: ["domain"], severity: "critical" },
  { name: "domain_logs", category: "domain", template: 'site:{target} filetype:log OR inurl:logs', targetTypes: ["domain"], severity: "high" },
  { name: "domain_exposed_dirs", category: "domain", template: 'site:{target} intitle:"Index of" OR inurl:/upload/ OR inurl:/backup/', targetTypes: ["domain"], severity: "high" },
  { name: "domain_cameras", category: "domain", template: 'site:{target} inurl:view.shtml OR intitle:"Network Camera" OR inurl:ViewerFrame', targetTypes: ["domain"], severity: "critical" },
  { name: "domain_mentions", category: "domain", template: '"{target}" -site:{target}', targetTypes: ["domain"], severity: "low" },

  // ---- IP ----
  { name: "ip_mentions", category: "ip", template: '"{target}"', targetTypes: ["ip"], severity: "low" },
  { name: "ip_abuse", category: "ip", template: '"{target}" abuse OR spam OR botnet OR attack', targetTypes: ["ip"], severity: "high" },
  { name: "ip_shodan", category: "ip", template: 'site:shodan.io "{target}"', targetTypes: ["ip"], severity: "medium" },

  // ---- PHONE ----
  { name: "phone_mentions", category: "phone", template: '"{target}"', targetTypes: ["phone"], severity: "low" },
  { name: "phone_directories", category: "phone", template: '"{target}" site:pagesjaunes.fr OR site:118712.fr OR site:pagesblanches.fr', targetTypes: ["phone"], severity: "medium" },
  { name: "phone_social", category: "phone", template: '"{target}" whatsapp OR telegram OR signal', targetTypes: ["phone"], severity: "high" },

  // ---- GENERIC HIGH VALUE ----
  { name: "cache_old", category: "intel", template: 'cache:{target}', targetTypes: ["domain", "url"], severity: "medium" },
  { name: "related_sites", category: "intel", template: 'related:{target}', targetTypes: ["domain"], severity: "low" },
  { name: "wayback_search", category: "intel", template: 'site:web.archive.org "{target}"', targetTypes: ["domain", "url"], severity: "low" },
];

// ============================================================================
// GÉNÉRATEUR DE DORKS
// ============================================================================
export class GoogleDorker {

  // Générer les dorks adaptés à une cible
  generateDorks(target: string, targetType: string, categories?: string[]): DorkTemplate[] {
    const sanitized = this.sanitizeTarget(target);

    let templates = DORK_TEMPLATES.filter((t) =>
      t.targetTypes.includes(targetType)
    );

    if (categories && categories.length > 0) {
      templates = templates.filter((t) => categories.includes(t.category));
    }

    return templates.map((t) => ({
      ...t,
      template: t.template.replace(/{target}/g, sanitized),
    }));
  }

  // Sanitize la valeur pour éviter l'injection
  private sanitizeTarget(target: string): string {
    return target.replace(/['"\\]/g, "").trim();
  }

  // Générer les URLs de recherche
  buildSearchUrls(dorks: DorkTemplate[]): { dork: DorkTemplate; urls: Record<string, string> }[] {
    return dorks.map((dork) => ({
      dork,
      urls: {
        google: `https://www.google.com/search?q=${encodeURIComponent(dork.template)}&num=20`,
        bing: `https://www.bing.com/search?q=${encodeURIComponent(dork.template)}&count=20`,
        duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(dork.template)}&ia=web`,
        yandex: `https://yandex.com/search/?text=${encodeURIComponent(dork.template)}`,
      },
    }));
  }

  // Générer un rapport de dorks
  generateDorkReport(target: string, targetType: string): {
    target: string;
    targetType: string;
    total: number;
    bySeverity: Record<string, DorkTemplate[]>;
    byCategory: Record<string, DorkTemplate[]>;
    allDorks: Array<{ query: string; urls: Record<string, string>; severity: string; category: string }>;
  } {
    const dorks = this.generateDorks(target, targetType);
    const withUrls = this.buildSearchUrls(dorks);

    const bySeverity: Record<string, DorkTemplate[]> = {};
    const byCategory: Record<string, DorkTemplate[]> = {};

    for (const d of dorks) {
      bySeverity[d.severity] = [...(bySeverity[d.severity] ?? []), d];
      byCategory[d.category] = [...(byCategory[d.category] ?? []), d];
    }

    return {
      target,
      targetType,
      total: dorks.length,
      bySeverity,
      byCategory,
      allDorks: withUrls.map(({ dork, urls }) => ({
        query: dork.template,
        urls,
        severity: dork.severity,
        category: dork.category,
      })),
    };
  }

  // Exécuter les dorks via Bing API (si clé dispo) ou scraping
  async executeDorks(
    dorks: DorkTemplate[],
    apiKey?: string
  ): Promise<DorkResult[]> {
    const results: DorkResult[] = [];

    if (!apiKey) {
      logger.info("[GoogleDorker] Pas de clé API - dorks générés seulement");
      return results;
    }

    // Exécution via Bing Search API
    for (const dork of dorks.slice(0, 10)) {
      try {
        const response = await fetch(
          `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(dork.template)}&count=10`,
          { headers: { "Ocp-Apim-Subscription-Key": apiKey } }
        );

        if (!response.ok) continue;

        const data = await response.json() as any;
        const webPages = data.webPages?.value ?? [];

        for (const page of webPages) {
          results.push({
            query: dork.template,
            url: page.url,
            title: page.name,
            snippet: page.snippet,
            source: "bing_api",
            relevance: 0.8,
          });
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 200));
      } catch (error) {
        logger.warn(`[GoogleDorker] Erreur dork "${dork.name}":`, error);
      }
    }

    return results;
  }
}

export const googleDorker = new GoogleDorker();
