/**
 * Enrichment Engine - Moteur d'enrichissement en cascade
 * Départ d'une entité → découverte automatique des entités liées en profondeur
 * Ex: username → email → téléphone → IP → géolocalisation → ASN → infrastructure
 */

import crypto from "crypto";
import { logger } from "../utils/logger";
import { agentOrchestrator, DiscoveredEntity } from "./agentOrchestrator";

// ============================================================================
// TYPES
// ============================================================================

export interface EnrichmentNode {
  id: string;
  entity: DiscoveredEntity;
  depth: number;
  parentId?: string;
  children: string[];
  enrichmentData?: EnrichmentData;
  status: "pending" | "enriching" | "completed" | "failed";
  discoveredAt: string;
}

export interface EnrichmentData {
  // Email enrichments
  emailValid?: boolean;
  emailProvider?: string;
  breaches?: DataBreach[];
  alternativeEmails?: string[];

  // Phone enrichments
  phoneValid?: boolean;
  carrier?: string;
  countryCode?: string;
  lineType?: "mobile" | "landline" | "voip";
  messagingApps?: string[]; // WhatsApp, Signal, Telegram...

  // IP enrichments
  ipVersion?: 4 | 6;
  geolocation?: GeoData;
  asn?: ASNData;
  reverseDNS?: string[];
  openPorts?: number[];
  services?: string[];
  threatIntel?: ThreatIntel;

  // Domain enrichments
  whois?: WhoisData;
  subdomains?: string[];
  technologies?: string[];
  dnsRecords?: DNSRecord[];
  sslCerts?: SSLCert[];

  // Username enrichments
  platforms?: PlatformAccount[];
  activityPatterns?: ActivityPattern[];
  similarUsernames?: string[];
  profilePictures?: string[];

  // Person/Name enrichments
  possibleFullNames?: string[];
  ageEstimate?: { min: number; max: number };
  locations?: string[];
  occupations?: string[];
  socialLinks?: SocialLink[];

  // Général
  relatedEntities?: DiscoveredEntity[];
  timeline?: TimelineEvent[];
  riskIndicators?: RiskIndicator[];
}

export interface DataBreach {
  name: string;
  date: string;
  compromisedData: string[];
  source: string;
}

export interface GeoData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  zip?: string;
  coordinates: { lat: number; lng: number };
  accuracy: "exact" | "approximate" | "city" | "region" | "country";
  timezone: string;
  isp: string;
  org?: string;
}

export interface ASNData {
  number: number;
  name: string;
  org: string;
  type: "isp" | "business" | "hosting" | "education" | "government";
  peers?: number[];
}

export interface ThreatIntel {
  reputation: "clean" | "suspicious" | "malicious" | "unknown";
  categories?: string[];
  firstSeen?: string;
  lastSeen?: string;
  relatedMalware?: string[];
}

export interface WhoisData {
  registrar: string;
  created: string;
  expires: string;
  updated: string;
  nameservers: string[];
  owner?: string;
  privacyProtected: boolean;
}

export interface DNSRecord {
  type: "A" | "AAAA" | "MX" | "TXT" | "NS" | "CNAME" | "SOA";
  value: string;
  ttl: number;
}

export interface SSLCert {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  sans: string[];
  fingerprint: string;
}

export interface PlatformAccount {
  platform: string;
  url: string;
  username: string;
  status: "active" | "suspended" | "deleted" | "private" | "unknown";
  followers?: number;
  createdAt?: string;
  lastActivity?: string;
  bio?: string;
  location?: string;
  profilePicture?: string;
}

export interface ActivityPattern {
  type: "post_time" | "timezone" | "device" | "language";
  value: string;
  confidence: number;
  evidence: string[];
}

export interface SocialLink {
  platform: string;
  url: string;
  type: "personal" | "professional" | "family" | "unknown";
  strength: number;
}

export interface TimelineEvent {
  date: string;
  type: "account_created" | "post" | "location" | "breach" | "profile_update" | "contact";
  description: string;
  source: string;
  entities: string[];
}

export interface RiskIndicator {
  type: "breach_exposed" | "suspicious_activity" | "anonymous_service" | "high_privacy" | "data_contradiction";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string[];
}

export interface EnrichmentTree {
  rootId: string;
  nodes: Map<string, EnrichmentNode>;
  maxDepth: number;
  totalNodes: number;
  completionRate: number;
}

export interface CascadeConfig {
  maxDepth: number;
  enableEmailCascade: boolean;
  enablePhoneCascade: boolean;
  enableIPCascade: boolean;
  enableDomainCascade: boolean;
  enableUsernameCascade: boolean;
  enableGeolocation: boolean;
  enableBreaches: boolean;
  enableSocialDiscovery: boolean;
  crossReferenceThreshold: number; // nombre minimum de sources pour valider
}

// ============================================================================
// ENRICHMENT STRATEGIES
// ============================================================================

type EnrichmentStrategy = {
  name: string;
  appliesTo: string[]; // types d'entités concernées
  dependencies: string[]; // types d'enrichissements nécessaires avant
  execute: (entity: DiscoveredEntity, currentData: EnrichmentData, context: any) => Promise<Partial<EnrichmentData>>;
};

const ENRICHMENT_STRATEGIES: EnrichmentStrategy[] = [
  // ─── EMAIL STRATEGIES ───
  {
    name: "email_validation",
    appliesTo: ["email"],
    dependencies: [],
    execute: async (entity) => {
      // Vérifie la syntaxe et le domaine
      const email = entity.value;
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const domain = email.split("@")[1];

      const providers: Record<string, string> = {
        "gmail.com": "Google",
        "outlook.com": "Microsoft",
        "hotmail.com": "Microsoft",
        "yahoo.com": "Yahoo",
        "protonmail.com": "ProtonMail",
        "proton.me": "ProtonMail",
        "tutanota.com": "Tutanota",
        "icloud.com": "Apple"
      };

      return {
        emailValid: valid,
        emailProvider: providers[domain] || "Unknown"
      };
    }
  },
  {
    name: "breach_lookup",
    appliesTo: ["email", "username"],
    dependencies: [],
    execute: async (entity) => {
      // Simule une recherche de breaches (à remplacer par API réelle HaveIBeenPwned)
      logger.info(`[Enrichment] Looking up breaches for ${entity.value}`);

      // Mock data - à remplacer par API réelle
      const breaches: DataBreach[] = [];

      // En production: appeler HIBP API ou similar
      // const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${entity.value}`);

      return { breaches };
    }
  },
  {
    name: "email_to_username",
    appliesTo: ["email"],
    dependencies: ["email_validation"],
    execute: async (entity, data) => {
      // Extrait le username de l'email
      const localPart = entity.value.split("@")[0];
      const variations = [localPart];

      // Génère des variations communes
      if (localPart.includes(".")) {
        variations.push(localPart.replace(/\./g, ""));
        variations.push(localPart.replace(/\./g, "_"));
      }
      if (localPart.includes("_")) {
        variations.push(localPart.replace(/_/g, "."));
        variations.push(localPart.replace(/_/g, ""));
      }

      return {
        relatedEntities: variations.map(v => ({
          id: crypto.randomUUID(),
          type: "username",
          value: v,
          source: "email_extraction",
          confidence: 70,
          discoveredAt: new Date().toISOString(),
          verificationStatus: "unverified",
          metadata: { extracted_from: entity.value }
        }))
      };
    }
  },

  // ─── PHONE STRATEGIES ───
  {
    name: "phone_validation",
    appliesTo: ["phone"],
    dependencies: [],
    execute: async (entity) => {
      const phone = entity.value.replace(/\D/g, "");

      // Détecte le pays par l'indicatif
      const countryCodes: Record<string, { country: string; code: string }> = {
        "33": { country: "France", code: "FR" },
        "1": { country: "USA/Canada", code: "US" },
        "44": { country: "UK", code: "GB" },
        "49": { country: "Germany", code: "DE" },
        "39": { country: "Italy", code: "IT" },
        "34": { country: "Spain", code: "ES" },
        "41": { country: "Switzerland", code: "CH" },
        "32": { country: "Belgium", code: "BE" }
      };

      let countryCode = "";
      let country = "Unknown";

      for (const [code, info] of Object.entries(countryCodes)) {
        if (phone.startsWith(code)) {
          countryCode = code;
          country = info.country;
          break;
        }
      }

      // Détecte le type de ligne
      let lineType: "mobile" | "landline" | "voip" = "mobile";
      if (countryCode === "33") {
        const national = phone.substring(2);
        if (national.startsWith("6") || national.startsWith("7")) lineType = "mobile";
        else if (national.startsWith("1") || national.startsWith("5")) lineType = "landline";
        else lineType = "voip";
      }

      return {
        phoneValid: phone.length >= 10,
        countryCode,
        lineType,
        messagingApps: ["WhatsApp", "Signal"] // Potentiellement disponibles
      };
    }
  },
  {
    name: "phone_geolocation",
    appliesTo: ["phone"],
    dependencies: ["phone_validation"],
    execute: async (entity, data) => {
      // Géolocalisation approximative par indicatif
      if (!data?.countryCode) return {};

      const countryLocations: Record<string, { country: string; region: string; timezone: string }> = {
        "33": { country: "France", region: "Métropole", timezone: "Europe/Paris" },
        "1": { country: "United States", region: "Various", timezone: "America/New_York" },
        "44": { country: "United Kingdom", region: "England", timezone: "Europe/London" }
      };

      const loc = countryLocations[data.countryCode];
      if (!loc) return {};

      return {
        geolocation: {
          country: loc.country,
          countryCode: data.countryCode,
          region: loc.region,
          city: "Unknown",
          coordinates: { lat: 0, lng: 0 },
          accuracy: "country",
          timezone: loc.timezone,
          isp: "Unknown"
        }
      };
    }
  },

  // ─── IP STRATEGIES ───
  {
    name: "ip_geolocation",
    appliesTo: ["ip"],
    dependencies: [],
    execute: async (entity) => {
      // Appel à ipinfo.io ou similar
      try {
        // Mock - à remplacer par API réelle
        const ip = entity.value;

        // Détection basique du type
        const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|255\.)/.test(ip);
        if (isPrivate) {
          return {
            geolocation: {
              country: "Private Network",
              countryCode: "PN",
              region: "LAN",
              city: "Local",
              coordinates: { lat: 0, lng: 0 },
              accuracy: "exact",
              timezone: "UTC",
              isp: "Private"
            }
          };
        }

        // Simule une réponse ipinfo.io
        return {
          geolocation: {
            country: "Unknown",
            countryCode: "XX",
            region: "Unknown",
            city: "Unknown",
            coordinates: { lat: 0, lng: 0 },
            accuracy: "approximate",
            timezone: "UTC",
            isp: "Unknown ISP"
          },
          asn: {
            number: 0,
            name: "Unknown",
            org: "Unknown",
            type: "isp"
          }
        };
      } catch (error) {
        logger.error(`[Enrichment] IP geolocation failed:`, error);
        return {};
      }
    }
  },
  {
    name: "ip_threat_intel",
    appliesTo: ["ip"],
    dependencies: ["ip_geolocation"],
    execute: async (entity) => {
      // Vérifie les listes de menaces
      // Mock - à remplacer par API AbuseIPDB, VirusTotal, etc.

      return {
        threatIntel: {
          reputation: "unknown",
          categories: [],
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        }
      };
    }
  },

  // ─── USERNAME STRATEGIES ───
  {
    name: "username_platform_discovery",
    appliesTo: ["username"],
    dependencies: [],
    execute: async (entity) => {
      // Liste des plateformes à vérifier
      const platforms = [
        { name: "Twitter", url: `https://twitter.com/${entity.value}`, check: "social" },
        { name: "Instagram", url: `https://instagram.com/${entity.value}`, check: "social" },
        { name: "Facebook", url: `https://facebook.com/${entity.value}`, check: "social" },
        { name: "LinkedIn", url: `https://linkedin.com/in/${entity.value}`, check: "professional" },
        { name: "GitHub", url: `https://github.com/${entity.value}`, check: "dev" },
        { name: "TikTok", url: `https://tiktok.com/@${entity.value}`, check: "social" },
        { name: "Reddit", url: `https://reddit.com/user/${entity.value}`, check: "forum" },
        { name: "YouTube", url: `https://youtube.com/@${entity.value}`, check: "video" },
        { name: "Telegram", url: `https://t.me/${entity.value}`, check: "messaging" },
        { name: "Snapchat", url: `https://snapchat.com/add/${entity.value}`, check: "social" }
      ];

      // En production: faire des requêtes HEAD pour vérifier l'existence
      // Pour l'instant, on retourne les URLs à vérifier
      const platformAccounts: PlatformAccount[] = platforms.map(p => ({
        platform: p.name,
        url: p.url,
        username: entity.value,
        status: "unknown",
        followers: undefined,
        createdAt: undefined,
        lastActivity: undefined
      }));

      return { platforms: platformAccounts };
    }
  },
  {
    name: "username_variations",
    appliesTo: ["username"],
    dependencies: [],
    execute: async (entity) => {
      const username = entity.value;
      const variations: string[] = [];

      // Génère des variations communes
      if (username.includes("_")) {
        variations.push(username.replace(/_/g, ""));
        variations.push(username.replace(/_/g, "-"));
        variations.push(username.replace(/_/g, "."));
      }
      if (username.includes("-")) {
        variations.push(username.replace(/-/g, ""));
        variations.push(username.replace(/-/g, "_"));
      }
      if (username.includes(".")) {
        variations.push(username.replace(/\./g, ""));
        variations.push(username.replace(/\./g, "_"));
      }

      // Ajoute des suffixes/préfixes numériques
      for (let i = 1; i <= 5; i++) {
        variations.push(`${username}${i}`);
        variations.push(`${i}${username}`);
      }

      return {
        similarUsernames: [...new Set(variations)].slice(0, 10)
      };
    }
  },

  // ─── DOMAIN STRATEGIES ───
  {
    name: "domain_whois",
    appliesTo: ["domain"],
    dependencies: [],
    execute: async (entity) => {
      // Mock - à remplacer par whois API réelle
      return {
        whois: {
          registrar: "Unknown",
          created: new Date().toISOString(),
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated: new Date().toISOString(),
          nameservers: ["ns1.example.com", "ns2.example.com"],
          privacyProtected: false
        },
        subdomains: ["www", "mail", "ftp", "admin", "api", "blog", "shop"].map(s => `${s}.${entity.value}`),
        dnsRecords: [
          { type: "A", value: "192.0.2.1", ttl: 300 },
          { type: "MX", value: `mail.${entity.value}`, ttl: 300 }
        ]
      };
    }
  }
];

// ============================================================================
// ENRICHMENT ENGINE
// ============================================================================

export class EnrichmentEngine {
  private trees: Map<string, EnrichmentTree> = new Map();
  private config: CascadeConfig;

  constructor(config: Partial<CascadeConfig> = {}) {
    this.config = {
      maxDepth: 5,
      enableEmailCascade: true,
      enablePhoneCascade: true,
      enableIPCascade: true,
      enableDomainCascade: true,
      enableUsernameCascade: true,
      enableGeolocation: true,
      enableBreaches: true,
      enableSocialDiscovery: true,
      crossReferenceThreshold: 2,
      ...config
    };
  }

  /**
   * Démarre un arbre d'enrichissement en cascade
   */
  async startCascade(initialEntity: DiscoveredEntity): Promise<EnrichmentTree> {
    const treeId = crypto.randomUUID();
    const rootNode: EnrichmentNode = {
      id: crypto.randomUUID(),
      entity: initialEntity,
      depth: 0,
      children: [],
      status: "pending",
      discoveredAt: new Date().toISOString()
    };

    const tree: EnrichmentTree = {
      rootId: rootNode.id,
      nodes: new Map([[rootNode.id, rootNode]]),
      maxDepth: 0,
      totalNodes: 1,
      completionRate: 0
    };

    this.trees.set(treeId, tree);

    logger.info(`[Enrichment] Starting cascade for ${initialEntity.type}:${initialEntity.value}`);

    // Démarre l'enrichissement récursif
    await this.enrichNode(treeId, rootNode.id);

    return tree;
  }

  /**
   * Enrichit un nœud et crée les enfants
   */
  private async enrichNode(treeId: string, nodeId: string): Promise<void> {
    const tree = this.trees.get(treeId);
    if (!tree) return;

    const node = tree.nodes.get(nodeId);
    if (!node) return;

    if (node.depth >= this.config.maxDepth) {
      node.status = "completed";
      return;
    }

    node.status = "enriching";

    try {
      // Exécute les stratégies applicables
      const enrichmentData = await this.executeStrategies(node.entity);
      node.enrichmentData = enrichmentData;

      // Crée les nœuds enfants à partir des entités liées
      if (enrichmentData.relatedEntities) {
        for (const related of enrichmentData.relatedEntities) {
          if (this.shouldCreateChild(tree, related)) {
            const childNode: EnrichmentNode = {
              id: crypto.randomUUID(),
              entity: related,
              depth: node.depth + 1,
              parentId: nodeId,
              children: [],
              status: "pending",
              discoveredAt: new Date().toISOString()
            };

            tree.nodes.set(childNode.id, childNode);
            node.children.push(childNode.id);
            tree.totalNodes++;
            tree.maxDepth = Math.max(tree.maxDepth, childNode.depth);

            // Enrichissement récursif (avec limite de profondeur)
            if (childNode.depth < this.config.maxDepth) {
              await this.enrichNode(treeId, childNode.id);
            }
          }
        }
      }

      // Enrichissement spécifique selon le type
      await this.typeSpecificCascade(treeId, node, enrichmentData);

      node.status = "completed";
      this.updateCompletionRate(tree);

    } catch (error) {
      logger.error(`[Enrichment] Failed to enrich node ${nodeId}:`, error);
      node.status = "failed";
    }
  }

  /**
   * Exécute les stratégies d'enrichissement pour une entité
   */
  private async executeStrategies(entity: DiscoveredEntity): Promise<EnrichmentData> {
    const applicableStrategies = ENRICHMENT_STRATEGIES.filter(s =>
      s.appliesTo.includes(entity.type)
    );

    const results: EnrichmentData[] = [];

    for (const strategy of applicableStrategies) {
      try {
        const partialData = await strategy.execute(entity, this.mergeResults(results), {});
        results.push(partialData);
      } catch (error) {
        logger.warn(`[Enrichment] Strategy ${strategy.name} failed:`, error);
      }
    }

    return this.mergeResults(results);
  }

  /**
   * Cascade spécifique au type
   */
  private async typeSpecificCascade(treeId: string, node: EnrichmentNode, data: EnrichmentData): Promise<void> {
    switch (node.entity.type) {
      case "username":
        await this.usernameCascade(treeId, node, data);
        break;
      case "email":
        await this.emailCascade(treeId, node, data);
        break;
      case "phone":
        await this.phoneCascade(treeId, node, data);
        break;
      case "ip":
        await this.ipCascade(treeId, node, data);
        break;
      case "domain":
        await this.domainCascade(treeId, node, data);
        break;
    }
  }

  /**
   * Cascade Username: username → email → phone → localisation
   */
  private async usernameCascade(treeId: string, node: EnrichmentNode, data: EnrichmentData): Promise<void> {
    if (!this.config.enableUsernameCascade) return;

    const tree = this.trees.get(treeId)!;

    // Depuis les plateformes, extraire les emails/phones si disponibles
    if (data.platforms) {
      for (const platform of data.platforms) {
        // En production: scraper les profils publics pour extraire bio, location, liens
        if (platform.location && this.config.enableGeolocation) {
          const locationEntity: DiscoveredEntity = {
            id: crypto.randomUUID(),
            type: "location",
            value: platform.location,
            source: `platform_${platform.platform}`,
            confidence: 60,
            discoveredAt: new Date().toISOString(),
            verificationStatus: "unverified"
          };

          const locationNode: EnrichmentNode = {
            id: crypto.randomUUID(),
            entity: locationEntity,
            depth: node.depth + 1,
            parentId: node.id,
            children: [],
            status: "pending",
            discoveredAt: new Date().toISOString()
          };

          tree.nodes.set(locationNode.id, locationNode);
          node.children.push(locationNode.id);
          tree.totalNodes++;
        }
      }
    }

    // Variations du username
    if (data.similarUsernames && this.config.enableSocialDiscovery) {
      for (const variation of data.similarUsernames.slice(0, 3)) {
        const varEntity: DiscoveredEntity = {
          id: crypto.randomUUID(),
          type: "username",
          value: variation,
          source: "username_variation",
          confidence: 40,
          discoveredAt: new Date().toISOString(),
          verificationStatus: "unverified"
        };

        const varNode: EnrichmentNode = {
          id: crypto.randomUUID(),
          entity: varEntity,
          depth: node.depth + 1,
          parentId: node.id,
          children: [],
          status: "pending",
          discoveredAt: new Date().toISOString()
        };

        tree.nodes.set(varNode.id, varNode);
        node.children.push(varNode.id);
        tree.totalNodes++;
      }
    }
  }

  /**
   * Cascade Email: email → username → plateformes → personne
   */
  private async emailCascade(treeId: string, node: EnrichmentNode, data: EnrichmentData): Promise<void> {
    if (!this.config.enableEmailCascade) return;

    const tree = this.trees.get(treeId)!;

    // Extrait les usernames possibles
    if (data.relatedEntities) {
      for (const related of data.relatedEntities.filter(e => e.type === "username")) {
        const userNodeId = this.addChildNode(tree, node.id, related);

        // Enrichit le username découvert
        await this.enrichNode(treeId, userNodeId);
      }
    }

    // Breaches exposent souvent d'autres emails associés
    if (data.breaches && this.config.enableBreaches) {
      // Analyse les breaches pour trouver des patterns
      for (const breach of data.breaches) {
        if (breach.compromisedData.includes("passwords")) {
          // Potentiellement: hash cracking pour patterns dans les mots de passe
        }
      }
    }
  }

  /**
   * Cascade Phone: phone → localisation → timezone → patterns
   */
  private async phoneCascade(treeId: string, node: EnrichmentNode, data: EnrichmentData): Promise<void> {
    if (!this.config.enablePhoneCascade) return;

    // La géolocalisation est déjà faite par la stratégie phone_geolocation
    if (data.geolocation && this.config.enableGeolocation) {
      // Crée un nœud de localisation précise
      const locationEntity: DiscoveredEntity = {
        id: crypto.randomUUID(),
        type: "location",
        value: `${data.geolocation.city}, ${data.geolocation.country}`,
        source: "phone_geolocation",
        confidence: data.geolocation.accuracy === "exact" ? 80 : 50,
        discoveredAt: new Date().toISOString(),
        verificationStatus: "unverified",
        metadata: {
          coordinates: data.geolocation.coordinates,
          timezone: data.geolocation.timezone
        }
      };

      const tree = this.trees.get(treeId)!;
      this.addChildNode(tree, node.id, locationEntity);
    }
  }

  /**
   * Cascade IP: IP → géoloc → ASN → infrastructure → domaines
   */
  private async ipCascade(treeId: string, node: EnrichmentNode, data: EnrichmentData): Promise<void> {
    if (!this.config.enableIPCascade) return;

    const tree = this.trees.get(treeId)!;

    // ASN découvert → infrastructure
    if (data.asn) {
      const infraEntity: DiscoveredEntity = {
        id: crypto.randomUUID(),
        type: "infrastructure",
        value: `AS${data.asn.number} - ${data.asn.name}`,
        source: "ip_asn_lookup",
        confidence: 90,
        discoveredAt: new Date().toISOString(),
        verificationStatus: "verified",
        metadata: {
          asn: data.asn,
          type: data.asn.type
        }
      };

      this.addChildNode(tree, node.id, infraEntity);
    }

    // Reverse DNS → domaines
    if (data.reverseDNS) {
      for (const domain of data.reverseDNS.slice(0, 3)) {
        const domainEntity: DiscoveredEntity = {
          id: crypto.randomUUID(),
          type: "domain",
          value: domain,
          source: "reverse_dns",
          confidence: 75,
          discoveredAt: new Date().toISOString(),
          verificationStatus: "unverified"
        };

        const domainNodeId = this.addChildNode(tree, node.id, domainEntity);
        await this.enrichNode(treeId, domainNodeId);
      }
    }

    // Services sur ports → technologies
    if (data.services) {
      for (const service of data.services) {
        const serviceEntity: DiscoveredEntity = {
          id: crypto.randomUUID(),
          type: "service",
          value: service,
          source: "port_scan",
          confidence: 85,
          discoveredAt: new Date().toISOString(),
          verificationStatus: "verified"
        };

        this.addChildNode(tree, node.id, serviceEntity);
      }
    }
  }

  /**
   * Cascade Domain: domain → subdomains → IPs → infrastructure
   */
  private async domainCascade(treeId: string, node: EnrichmentNode, data: EnrichmentData): Promise<void> {
    if (!this.config.enableDomainCascade) return;

    const tree = this.trees.get(treeId)!;

    // Subdomains découverts
    if (data.subdomains) {
      for (const subdomain of data.subdomains.slice(0, 5)) {
        const subEntity: DiscoveredEntity = {
          id: crypto.randomUUID(),
          type: "subdomain",
          value: subdomain,
          source: "domain_enum",
          confidence: 70,
          discoveredAt: new Date().toISOString(),
          verificationStatus: "unverified"
        };

        this.addChildNode(tree, node.id, subEntity);
      }
    }

    // DNS records → IPs
    if (data.dnsRecords) {
      for (const record of data.dnsRecords.filter(r => r.type === "A")) {
        const ipEntity: DiscoveredEntity = {
          id: crypto.randomUUID(),
          type: "ip",
          value: record.value,
          source: "dns_resolution",
          confidence: 90,
          discoveredAt: new Date().toISOString(),
          verificationStatus: "verified"
        };

        const ipNodeId = this.addChildNode(tree, node.id, ipEntity);
        await this.enrichNode(treeId, ipNodeId);
      }
    }
  }

  /**
   * Ajoute un nœud enfant
   */
  private addChildNode(tree: EnrichmentTree, parentId: string, entity: DiscoveredEntity): string {
    const node: EnrichmentNode = {
      id: crypto.randomUUID(),
      entity,
      depth: tree.nodes.get(parentId)!.depth + 1,
      parentId,
      children: [],
      status: "pending",
      discoveredAt: new Date().toISOString()
    };

    tree.nodes.set(node.id, node);
    tree.nodes.get(parentId)!.children.push(node.id);
    tree.totalNodes++;
    tree.maxDepth = Math.max(tree.maxDepth, node.depth);

    return node.id;
  }

  /**
   * Vérifie si on doit créer un nœud enfant (dédoublonnage)
   */
  private shouldCreateChild(tree: EnrichmentTree, entity: DiscoveredEntity): boolean {
    // Vérifie si une entité identique existe déjà
    for (const node of tree.nodes.values()) {
      if (node.entity.type === entity.type &&
          node.entity.value.toLowerCase() === entity.value.toLowerCase()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Fusionne les résultats de plusieurs stratégies
   */
  private mergeResults(results: Partial<EnrichmentData>[]): EnrichmentData {
    const merged: EnrichmentData = {};

    for (const result of results) {
      Object.assign(merged, result);
    }

    return merged;
  }

  /**
   * Met à jour le taux de complétion
   */
  private updateCompletionRate(tree: EnrichmentTree): void {
    const completed = Array.from(tree.nodes.values()).filter(n => n.status === "completed").length;
    tree.completionRate = completed / tree.totalNodes;
  }

  // ============================================================================
  // API PUBLIQUE
  // ============================================================================

  getTree(treeId: string): EnrichmentTree | undefined {
    return this.trees.get(treeId);
  }

  getTreeStatus(treeId: string): { total: number; completed: number; failed: number; progress: number } | null {
    const tree = this.trees.get(treeId);
    if (!tree) return null;

    const nodes = Array.from(tree.nodes.values());
    return {
      total: nodes.length,
      completed: nodes.filter(n => n.status === "completed").length,
      failed: nodes.filter(n => n.status === "failed").length,
      progress: tree.completionRate
    };
  }

  /**
   * Exporte l'arbre au format graph (nodes + edges)
   */
  exportGraph(treeId: string): { nodes: any[]; edges: any[] } | null {
    const tree = this.trees.get(treeId);
    if (!tree) return null;

    const nodes = Array.from(tree.nodes.values()).map(n => ({
      id: n.id,
      type: n.entity.type,
      value: n.entity.value,
      depth: n.depth,
      confidence: n.entity.confidence,
      status: n.status,
      enrichment: n.enrichmentData ? Object.keys(n.enrichmentData) : []
    }));

    const edges: any[] = [];
    for (const node of tree.nodes.values()) {
      if (node.parentId) {
        edges.push({
          source: node.parentId,
          target: node.id,
          type: "discovered_from"
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Trouve tous les chemins entre deux entités
   */
  findPaths(treeId: string, fromId: string, toId: string): string[][] {
    const tree = this.trees.get(treeId);
    if (!tree) return [];

    const paths: string[][] = [];

    const dfs = (current: string, target: string, path: string[], visited: Set<string>) => {
      if (current === target) {
        paths.push([...path]);
        return;
      }

      const node = tree.nodes.get(current);
      if (!node) return;

      for (const childId of node.children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          dfs(childId, target, [...path, childId], visited);
          visited.delete(childId);
        }
      }
    };

    dfs(fromId, toId, [fromId], new Set([fromId]));
    return paths;
  }

  /**
   * Trouve les clusters d'entités liées
   */
  findClusters(treeId: string): { id: string; entities: string[]; type: string }[] {
    const tree = this.trees.get(treeId);
    if (!tree) return [];

    // Clustering simple par type
    const byType: Record<string, string[]> = {};

    for (const [nodeId, node] of tree.nodes) {
      const type = node.entity.type;
      if (!byType[type]) byType[type] = [];
      byType[type].push(nodeId);
    }

    return Object.entries(byType).map(([type, entities]) => ({
      id: crypto.randomUUID(),
      entities,
      type
    }));
  }
}

// Singleton
export const enrichmentEngine = new EnrichmentEngine();
