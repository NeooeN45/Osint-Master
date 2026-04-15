// ============================================================================
// CORRELATION ENGINE v2 - Intelligence OSINT
// Corrélation automatique, anti-faux-positifs, relance récursive
// ============================================================================

import { logger } from "../../utils/logger.js";

export interface DeepEntity {
  id: string;
  type: string;
  value: string;
  source: string;
  confidence: number;
  depth: number;
  metadata: Record<string, any>;
  verified: boolean;
  falsePositiveScore: number;
}

export interface Correlation {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
  evidence: string;
  autoDiscovered: boolean;
}

export interface RecursiveTrigger {
  entityId: string;
  newTarget: string;
  targetType: string;
  reason: string;
  priority: number;
}

// ---- Patterns de faux positifs ----
const FALSE_POSITIVE_PATTERNS = [
  // Usernames trop génériques
  /^(admin|user|test|null|undefined|unknown|anonymous|default)$/i,
  // Emails génériques
  /^(noreply|no-reply|donotreply|info|contact|support|help)@/i,
  // IPs privées/loopback
  /^(127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|255\.255\.255\.255)/,
  // Domaines génériques
  /^(localhost|example\.(com|org|net)|test\.(com|org)|placeholder)/i,
  // URLs de CDN ou analytics
  /\.(doubleclick|google-analytics|facebook\.net|googletagmanager|hotjar|segment\.io)/i,
];

// ---- Détecteurs de corrélation ----
const CORRELATION_DETECTORS = [
  {
    name: "same_email_domain",
    detect: (a: DeepEntity, b: DeepEntity) =>
      a.type === "email" && b.type === "email" &&
      a.value.split("@")[1] === b.value.split("@")[1],
    strength: 0.7,
    type: "shared_email_domain",
  },
  {
    name: "email_username_match",
    detect: (a: DeepEntity, b: DeepEntity) => {
      if (a.type === "email" && b.type === "username") {
        return a.value.split("@")[0].toLowerCase() === b.value.toLowerCase();
      }
      if (b.type === "email" && a.type === "username") {
        return b.value.split("@")[0].toLowerCase() === a.value.toLowerCase();
      }
      return false;
    },
    strength: 0.9,
    type: "email_username_match",
  },
  {
    name: "ip_domain_correlation",
    detect: (a: DeepEntity, b: DeepEntity) =>
      (a.type === "ip" && b.type === "domain" &&
        a.metadata?.hostname?.includes(b.value)) ||
      (b.type === "ip" && a.type === "domain" &&
        b.metadata?.hostname?.includes(a.value)),
    strength: 0.85,
    type: "ip_domain_resolution",
  },
  {
    name: "same_name_person",
    detect: (a: DeepEntity, b: DeepEntity) =>
      a.type === "person" && b.type === "person" &&
      a.value.toLowerCase() === b.value.toLowerCase(),
    strength: 0.95,
    type: "same_person",
  },
  {
    name: "phone_country_correlation",
    detect: (a: DeepEntity, b: DeepEntity) =>
      a.type === "phone" && b.type === "location" &&
      a.metadata?.country === b.metadata?.country,
    strength: 0.5,
    type: "phone_location_country",
  },
  {
    name: "social_same_bio",
    detect: (a: DeepEntity, b: DeepEntity) =>
      a.type === "social_profile" && b.type === "social_profile" &&
      a.metadata?.bio && b.metadata?.bio &&
      a.metadata.bio.length > 20 &&
      a.metadata.bio.toLowerCase() === b.metadata.bio.toLowerCase(),
    strength: 0.92,
    type: "shared_bio",
  },
  {
    name: "same_profile_picture",
    detect: (a: DeepEntity, b: DeepEntity) =>
      a.metadata?.avatar_hash && b.metadata?.avatar_hash &&
      a.metadata.avatar_hash === b.metadata.avatar_hash,
    strength: 0.98,
    type: "shared_avatar",
  },
];

export class CorrelationEngine {

  // ---- Calculer score faux positif ----
  calculateFalsePositiveScore(entity: DeepEntity): number {
    let score = 0;

    for (const pattern of FALSE_POSITIVE_PATTERNS) {
      if (pattern.test(entity.value)) {
        score += 0.3;
      }
    }

    // Confiance trop basse = suspect
    if (entity.confidence < 30) score += 0.2;

    // Source non fiable
    const untrustedSources = ["web_scrape", "generic_search"];
    if (untrustedSources.includes(entity.source)) score += 0.15;

    // Valeur trop courte ou trop longue
    if (entity.value.length < 3 || entity.value.length > 200) score += 0.1;

    // Valeur dupliquée dans une même source = méfiance
    return Math.min(1, score);
  }

  // ---- Filtrer les faux positifs ----
  filterFalsePositives(entities: DeepEntity[], threshold = 0.5): {
    valid: DeepEntity[];
    rejected: DeepEntity[];
  } {
    const valid: DeepEntity[] = [];
    const rejected: DeepEntity[] = [];

    for (const entity of entities) {
      const score = this.calculateFalsePositiveScore(entity);
      entity.falsePositiveScore = score;

      if (score >= threshold) {
        rejected.push(entity);
        logger.debug(`[CorrelationEngine] FP rejeté: ${entity.value} (score=${score.toFixed(2)})`);
      } else {
        valid.push(entity);
      }
    }

    logger.info(`[CorrelationEngine] ${valid.length} valides, ${rejected.length} faux positifs rejetés`);
    return { valid, rejected };
  }

  // ---- Détecter les corrélations ----
  findCorrelations(entities: DeepEntity[]): Correlation[] {
    const correlations: Correlation[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i];
        const b = entities[j];

        for (const detector of CORRELATION_DETECTORS) {
          try {
            if (detector.detect(a, b)) {
              const key = `${a.id}:${b.id}:${detector.type}`;
              if (seen.has(key)) continue;
              seen.add(key);

              correlations.push({
                id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                from: a.id,
                to: b.id,
                type: detector.type,
                strength: detector.strength,
                evidence: `Détecté par: ${detector.name}`,
                autoDiscovered: true,
              });
            }
          } catch {
            // Ignorer les erreurs de détection
          }
        }
      }
    }

    logger.info(`[CorrelationEngine] ${correlations.length} corrélations trouvées`);
    return correlations;
  }

  // ---- Générer des déclencheurs de relance récursive ----
  generateRecursiveTriggers(
    entities: DeepEntity[],
    alreadySearched: Set<string>,
    currentDepth: number,
    maxDepth: number
  ): RecursiveTrigger[] {
    if (currentDepth >= maxDepth) return [];

    const triggers: RecursiveTrigger[] = [];

    for (const entity of entities) {
      const key = `${entity.type}:${entity.value}`;
      if (alreadySearched.has(key)) continue;
      if (entity.confidence < 60) continue;
      if (entity.falsePositiveScore > 0.4) continue;

      // Email → username + domaine
      if (entity.type === "email") {
        const [local, domain] = entity.value.split("@");
        triggers.push({
          entityId: entity.id,
          newTarget: local,
          targetType: "username",
          reason: `Extrait de l'email ${entity.value}`,
          priority: entity.confidence,
        });
        if (!alreadySearched.has(`domain:${domain}`)) {
          triggers.push({
            entityId: entity.id,
            newTarget: domain,
            targetType: "domain",
            reason: `Domaine extrait de l'email ${entity.value}`,
            priority: entity.confidence * 0.8,
          });
        }
      }

      // Username → recherche multi-réseau
      if (entity.type === "username" && entity.source !== "sherlock") {
        triggers.push({
          entityId: entity.id,
          newTarget: entity.value,
          targetType: "username",
          reason: `Nouveau username à investiguer: ${entity.value}`,
          priority: entity.confidence * 0.9,
        });
      }

      // IP → WHOIS + GeoIP + reverse DNS
      if (entity.type === "ip" && !entity.metadata?.whois) {
        triggers.push({
          entityId: entity.id,
          newTarget: entity.value,
          targetType: "ip",
          reason: `IP sans enrichissement: ${entity.value}`,
          priority: entity.confidence * 0.85,
        });
      }

      // Domaine → sous-domaines + certificats
      if (entity.type === "domain" && !entity.metadata?.subdomains) {
        triggers.push({
          entityId: entity.id,
          newTarget: entity.value,
          targetType: "domain",
          reason: `Domaine à énumérer: ${entity.value}`,
          priority: entity.confidence * 0.75,
        });
      }

      // Profil social → informations supplémentaires
      if (entity.type === "social_profile" && entity.metadata?.username) {
        const profileUsername = entity.metadata.username;
        if (!alreadySearched.has(`username:${profileUsername}`)) {
          triggers.push({
            entityId: entity.id,
            newTarget: profileUsername,
            targetType: "username",
            reason: `Profil social trouvé: ${profileUsername} sur ${entity.source}`,
            priority: entity.confidence * 0.9,
          });
        }
      }

      alreadySearched.add(key);
    }

    // Dédupliquer et trier par priorité
    const deduped = triggers.filter(
      (t, i, arr) =>
        arr.findIndex((x) => x.newTarget === t.newTarget && x.targetType === t.targetType) === i
    );

    return deduped.sort((a, b) => b.priority - a.priority).slice(0, 20);
  }

  // ---- Score de confiance global d'un profil ----
  computeProfileScore(entities: DeepEntity[], correlations: Correlation[]): number {
    if (entities.length === 0) return 0;

    const avgConfidence = entities.reduce((s, e) => s + e.confidence, 0) / entities.length;
    const correlationBonus = Math.min(correlations.length * 5, 30);
    const diversityBonus = new Set(entities.map((e) => e.source)).size * 2;

    return Math.min(100, avgConfidence + correlationBonus + diversityBonus);
  }
}

export const correlationEngine = new CorrelationEngine();
