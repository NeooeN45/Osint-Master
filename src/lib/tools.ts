import type { OsintTool, ToolResult } from "../types";

function now() {
  return new Date().toISOString();
}

export const OSINT_TOOLS: OsintTool[] = [
  // ── DOMAIN / NETWORK ──────────────────────────────────────────────
  {
    id: "whois",
    name: "WHOIS",
    description: "Enregistrement de domaine, registrar, dates, propriétaire",
    category: "domain",
    icon: "Globe",
    run: async (query): Promise<ToolResult> => {
      try {
        const res = await fetch(`https://who-dat.as93.net/${encodeURIComponent(query)}`);
        const data = await res.json();
        return { toolId: "whois", query, data, timestamp: now(), success: true };
      } catch (e) {
        return { toolId: "whois", query, data: null, timestamp: now(), success: false, error: String(e) };
      }
    },
  },
  {
    id: "dns_lookup",
    name: "DNS Lookup",
    description: "Résolution DNS (A, MX, NS, TXT, CNAME)",
    category: "domain",
    icon: "Server",
    run: async (query): Promise<ToolResult> => {
      try {
        const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(query)}&type=ANY`);
        const data = await res.json();
        return { toolId: "dns_lookup", query, data, timestamp: now(), success: true };
      } catch (e) {
        return { toolId: "dns_lookup", query, data: null, timestamp: now(), success: false, error: String(e) };
      }
    },
  },
  {
    id: "ip_info",
    name: "IP Geolocation",
    description: "Localisation, ASN, FAI, organisation d'une IP",
    category: "network",
    icon: "MapPin",
    run: async (query): Promise<ToolResult> => {
      try {
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(query)}/json/`);
        const data = await res.json();
        return { toolId: "ip_info", query, data, timestamp: now(), success: true };
      } catch (e) {
        return { toolId: "ip_info", query, data: null, timestamp: now(), success: false, error: String(e) };
      }
    },
  },
  {
    id: "shodan",
    name: "Shodan",
    description: "Ports ouverts, services exposés, CVEs sur une IP",
    category: "network",
    icon: "Eye",
    requiresKey: true,
    keyName: "shodan",
    run: async (query, apiKey): Promise<ToolResult> => {
      if (!apiKey) return { toolId: "shodan", query, data: null, timestamp: now(), success: false, error: "Clé API Shodan requise" };
      try {
        const res = await fetch(`https://api.shodan.io/shodan/host/${encodeURIComponent(query)}?key=${apiKey}`);
        const data = await res.json();
        return { toolId: "shodan", query, data, timestamp: now(), success: true };
      } catch (e) {
        return { toolId: "shodan", query, data: null, timestamp: now(), success: false, error: String(e) };
      }
    },
  },

  // ── BREACH / EMAIL ────────────────────────────────────────────────
  {
    id: "hibp",
    name: "HaveIBeenPwned",
    description: "Vérifie si un email apparaît dans des fuites de données",
    category: "breach",
    icon: "ShieldAlert",
    requiresKey: true,
    keyName: "hibp",
    run: async (query, apiKey): Promise<ToolResult> => {
      if (!apiKey) return { toolId: "hibp", query, data: null, timestamp: now(), success: false, error: "Clé API HIBP requise" };
      try {
        const res = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(query)}`, {
          headers: { "hibp-api-key": apiKey, "User-Agent": "OSINT-Master" },
        });
        if (res.status === 404) return { toolId: "hibp", query, data: { breaches: [] }, timestamp: now(), success: true };
        const data = await res.json();
        return { toolId: "hibp", query, data, timestamp: now(), success: true };
      } catch (e) {
        return { toolId: "hibp", query, data: null, timestamp: now(), success: false, error: String(e) };
      }
    },
  },

  // ── SOCIAL / USERNAME ─────────────────────────────────────────────
  {
    id: "sherlock_api",
    name: "Username Search",
    description: "Recherche un username sur ~300 plateformes (via API publique)",
    category: "social",
    icon: "UserSearch",
    run: async (query): Promise<ToolResult> => {
      const platforms = [
        { name: "GitHub", url: `https://github.com/${query}` },
        { name: "Twitter/X", url: `https://x.com/${query}` },
        { name: "Instagram", url: `https://instagram.com/${query}` },
        { name: "Reddit", url: `https://reddit.com/user/${query}` },
        { name: "TikTok", url: `https://tiktok.com/@${query}` },
        { name: "LinkedIn", url: `https://linkedin.com/in/${query}` },
        { name: "YouTube", url: `https://youtube.com/@${query}` },
        { name: "Twitch", url: `https://twitch.tv/${query}` },
        { name: "Pinterest", url: `https://pinterest.com/${query}` },
        { name: "Telegram", url: `https://t.me/${query}` },
      ];
      return {
        toolId: "sherlock_api",
        query,
        data: { username: query, platforms, note: "Vérification manuelle requise — ouvre les liens" },
        timestamp: now(),
        success: true,
      };
    },
  },

  // ── GEOLOCATION ───────────────────────────────────────────────────
  {
    id: "nominatim",
    name: "Nominatim Geocoder",
    description: "Géocode une adresse ou un lieu (OpenStreetMap)",
    category: "geolocation",
    icon: "Navigation",
    run: async (query): Promise<ToolResult> => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
          { headers: { "User-Agent": "OSINT-Master/1.0" } }
        );
        const data = await res.json();
        return { toolId: "nominatim", query, data, timestamp: now(), success: true };
      } catch (e) {
        return { toolId: "nominatim", query, data: null, timestamp: now(), success: false, error: String(e) };
      }
    },
  },

  // ── PHONE ─────────────────────────────────────────────────────────
  {
    id: "phone_info",
    name: "Phone Lookup",
    description: "Opérateur, pays, type de ligne d'un numéro",
    category: "phone",
    icon: "Phone",
    run: async (query): Promise<ToolResult> => {
      try {
        const res = await fetch(`https://phonevalidation.abstractapi.com/v1/?api_key=demo&phone=${encodeURIComponent(query)}`);
        const data = await res.json();
        return { toolId: "phone_info", query, data, timestamp: now(), success: true };
      } catch (e) {
        return { toolId: "phone_info", query, data: null, timestamp: now(), success: false, error: String(e) };
      }
    },
  },

  // ── CRYPTO ────────────────────────────────────────────────────────
  {
    id: "blockchain",
    name: "Blockchain Explorer",
    description: "Transactions, solde et historique d'une adresse crypto",
    category: "crypto",
    icon: "Coins",
    run: async (query): Promise<ToolResult> => {
      try {
        const res = await fetch(`https://blockchain.info/rawaddr/${encodeURIComponent(query)}?limit=10`);
        const data = await res.json();
        return { toolId: "blockchain", query, data, timestamp: now(), success: true };
      } catch (e) {
        return { toolId: "blockchain", query, data: null, timestamp: now(), success: false, error: String(e) };
      }
    },
  },

  // ── IDENTITY ──────────────────────────────────────────────────────
  {
    id: "google_dorking",
    name: "Google Dorking",
    description: "Génère des requêtes Google Dork avancées",
    category: "identity",
    icon: "Search",
    run: async (query): Promise<ToolResult> => {
      const dorks = [
        { label: "Site spécifique", query: `site:${query}`, url: `https://www.google.com/search?q=site:${encodeURIComponent(query)}` },
        { label: "Fichiers exposés", query: `site:${query} filetype:pdf OR filetype:xlsx OR filetype:docx`, url: `https://www.google.com/search?q=site:${encodeURIComponent(query)}+filetype:pdf+OR+filetype:xlsx` },
        { label: "Pages de login", query: `site:${query} inurl:login OR inurl:admin OR inurl:dashboard`, url: `https://www.google.com/search?q=site:${encodeURIComponent(query)}+inurl:login` },
        { label: "Infos personnelles", query: `"${query}" email OR phone OR address`, url: `https://www.google.com/search?q="${encodeURIComponent(query)}"+email+OR+phone` },
        { label: "Réseaux sociaux", query: `"${query}" site:linkedin.com OR site:twitter.com OR site:facebook.com`, url: `https://www.google.com/search?q="${encodeURIComponent(query)}"+site:linkedin.com` },
      ];
      return { toolId: "google_dorking", query, data: { dorks }, timestamp: now(), success: true };
    },
  },
];

export function getToolsByCategory(category: string) {
  return OSINT_TOOLS.filter((t) => t.category === category);
}

export function getToolById(id: string) {
  return OSINT_TOOLS.find((t) => t.id === id);
}
