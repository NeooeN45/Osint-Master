// ============================================================================
// Intelligence Engine - Analyzes OSINT results and provides insights
// ============================================================================

import { logger } from "../utils/logger";

export interface EntityExplanation {
  entity: string;
  type: string;
  confidence: number;
  explanation: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  category: string;
  recommendations: string[];
  relatedPlatforms: string[];
}

export interface AnalysisSummary {
  target: string;
  analysisDate: string;
  totalEntities: number;
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  categories: Record<string, number>;
  keyFindings: EntityExplanation[];
  recommendations: string[];
  timeline: Array<{
    date: string;
    event: string;
    significance: string;
  }>;
}

// Platform intelligence database
const PLATFORM_INTELLIGENCE: Record<string, {
  category: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
  dataExposed: string[];
  recommendations: string[];
}> = {
  "op.gg": {
    category: "Gaming",
    riskLevel: "low",
    description: "Plateforme de statistiques League of Legends",
    dataExposed: ["Pseudo de jeu", "Région de jeu", "Historique de matchs"],
    recommendations: ["Vérifier les paramètres de confidentialité", "Ne pas partager d'informations personnelles en jeu"]
  },
  "chaturbate.com": {
    category: "Adult",
    riskLevel: "high",
    description: "Plateforme de streaming adulte",
    dataExposed: ["Identité de streaming", "Activité en ligne", "Préférences"],
    recommendations: ["Utiliser un pseudonyme différent", "Vérifier les paramètres de confidentialité", "Être conscient de l'empreinte numérique"]
  },
  "roblox.com": {
    category: "Gaming",
    riskLevel: "low",
    description: "Plateforme de jeux en ligne pour enfants/adolescents",
    dataExposed: ["Profil public", "Amis", "Créations"],
    recommendations: ["Activer la confidentialité des amis", "Surveiller les interactions"]
  },
  "kaggle.com": {
    category: "Professional",
    riskLevel: "low",
    description: "Plateforme de data science et machine learning",
    dataExposed: ["Compétences techniques", "Projets publics", "Contributions"],
    recommendations: ["Cela renforce le profil professionnel"]
  },
  "opensea.io": {
    category: "Crypto",
    riskLevel: "medium",
    description: "Marché NFT et crypto-monnaies",
    dataExposed: ["Portefeuille blockchain", "Transactions NFT", "Valeur des actifs"],
    recommendations: ["Surveiller les transactions publiques", "Utiliser des wallets dédiés"]
  },
  "redtube.com": {
    category: "Adult",
    riskLevel: "high",
    description: "Plateforme de contenu adulte",
    dataExposed: ["Préférences de visionnage", "Historique", "Interactions"],
    recommendations: ["Utiliser la navigation privée", "Ne pas utiliser d'email principal"]
  },
  "adultfriendfinder.com": {
    category: "Adult",
    riskLevel: "critical",
    description: "Site de rencontres adultes",
    dataExposed: ["Préférences intimes", "Localisation", "Photos privées", "Messages"],
    recommendations: ["Vérifier immédiatement les paramètres de confidentialité", "Utiliser un email dédié", "Activer l'authentification 2FA"]
  },
  "hashnode.com": {
    category: "Professional",
    riskLevel: "low",
    description: "Plateforme de blogging technique",
    dataExposed: ["Articles techniques", "Expertise", "Réseau professionnel"],
    recommendations: ["Positif pour la carrière", "Maintenir le contenu professionnel"]
  },
  "threads.net": {
    category: "Social",
    riskLevel: "medium",
    description: "Réseau social de Meta (Instagram)",
    dataExposed: ["Posts publics", "Connexions", "Activité sociale"],
    recommendations: ["Vérifier les paramètres de confidentialité", "Surveiller les tags et mentions"]
  },
  "picsart.com": {
    category: "Creative",
    riskLevel: "low",
    description: "Plateforme d'édition photo",
    dataExposed: ["Créations publiques", "Style artistique"],
    recommendations: ["Vérifier les droits d'auteur sur les créations"]
  },
  "mercadolivre.com.br": {
    category: "E-commerce",
    riskLevel: "medium",
    description: "Marketplace e-commerce Brésil",
    dataExposed: ["Historique d'achat", "Préférences", "Localisation"],
    recommendations: ["Vérifier les avis publics", "Surveiller les informations de livraison"]
  },
  "livemaster.ru": {
    category: "E-commerce",
    riskLevel: "low",
    description: "Marketplace artisanat russe",
    dataExposed: ["Activité de vente", "Créations"],
    recommendations: ["Positif pour les artisans"]
  },
  "techpowerup.com": {
    category: "Tech",
    riskLevel: "low",
    description: "Forum hardware/tech",
    dataExposed: ["Intérêts technologiques", "Questions techniques"],
    recommendations: ["Ne pas exposer la configuration matérielle complète"]
  },
  "omg.lol": {
    category: "Personal",
    riskLevel: "low",
    description: "Service de page personnelle",
    dataExposed: ["Liens sociaux agrégés", "Présence web"],
    recommendations: ["Contrôler quels liens sont publics"]
  }
};

// Category risk multipliers
const CATEGORY_RISK: Record<string, number> = {
  "Adult": 90,
  "Crypto": 60,
  "Social": 40,
  "Gaming": 20,
  "Professional": 10,
  "E-commerce": 30,
  "Tech": 15,
  "Creative": 10,
  "Personal": 15
};

export class IntelligenceEngine {
  
  analyzeResults(target: string, entities: any[]): AnalysisSummary {
    logger.info(`[INTELLIGENCE] Analyzing ${entities.length} entities for ${target}`);
    
    const explanations: EntityExplanation[] = [];
    const categories: Record<string, number> = {};
    let totalRiskScore = 0;
    
    for (const entity of entities) {
      const explanation = this.analyzeEntity(entity);
      explanations.push(explanation);
      
      // Count by category
      categories[explanation.category] = (categories[explanation.category] || 0) + 1;
      
      // Calculate risk (weighted by confidence)
      const riskWeight = this.getRiskWeight(explanation.riskLevel);
      totalRiskScore += riskWeight * (explanation.confidence / 100);
    }
    
    // Normalize risk score
    const avgRiskScore = entities.length > 0 ? totalRiskScore / entities.length : 0;
    const riskLevel = this.calculateRiskLevel(avgRiskScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(explanations, riskLevel);
    
    // Create timeline
    const timeline = this.generateTimeline(explanations);
    
    // Get key findings (high confidence or high risk)
    const keyFindings = explanations
      .filter(e => e.confidence >= 60 || e.riskLevel === "high" || e.riskLevel === "critical")
      .sort((a, b) => this.getRiskWeight(b.riskLevel) - this.getRiskWeight(a.riskLevel))
      .slice(0, 10);
    
    const summary: AnalysisSummary = {
      target,
      analysisDate: new Date().toISOString(),
      totalEntities: entities.length,
      riskScore: Math.round(avgRiskScore),
      riskLevel,
      categories,
      keyFindings,
      recommendations,
      timeline
    };
    
    logger.info(`[INTELLIGENCE] Analysis complete - Risk Level: ${riskLevel}, Score: ${summary.riskScore}`);
    
    return summary;
  }
  
  private analyzeEntity(entity: any): EntityExplanation {
    const type = entity.type || "unknown";
    const value = entity.value || "";
    const confidence = entity.confidence || 50;
    const source = entity.source || "unknown";
    
    // Extract platform from URL
    const platform = this.extractPlatform(value);
    const intel = PLATFORM_INTELLIGENCE[platform];
    
    if (intel) {
      return {
        entity: value,
        type,
        confidence,
        explanation: `${intel.description}. Source: ${source}. Données exposées: ${intel.dataExposed.join(", ")}.`,
        riskLevel: intel.riskLevel,
        category: intel.category,
        recommendations: intel.recommendations,
        relatedPlatforms: this.findRelatedPlatforms(intel.category, platform)
      };
    }
    
    // Default analysis for unknown platforms
    return {
      entity: value,
      type,
      confidence,
      explanation: `Profil trouvé sur ${platform || "plateforme inconnue"}. Source: ${source}.`,
      riskLevel: "medium",
      category: "Unknown",
      recommendations: ["Vérifier les paramètres de confidentialité", "Évaluer la nécessité de ce profil public"],
      relatedPlatforms: []
    };
  }
  
  private extractPlatform(url: string): string {
    try {
      const match = url.match(/https?:\/\/([^\/]+)/);
      if (match) {
        return match[1].replace(/^www\./, "").toLowerCase();
      }
    } catch (e) {
      // ignore
    }
    return "";
  }
  
  private findRelatedPlatforms(category: string, excludePlatform: string): string[] {
    const related: string[] = [];
    for (const [platform, intel] of Object.entries(PLATFORM_INTELLIGENCE)) {
      if (intel.category === category && platform !== excludePlatform) {
        related.push(platform);
      }
    }
    return related.slice(0, 3);
  }
  
  private getRiskWeight(level: string): number {
    const weights: Record<string, number> = {
      "low": 25,
      "medium": 50,
      "high": 75,
      "critical": 100
    };
    return weights[level] || 50;
  }
  
  private calculateRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
    if (score >= 75) return "critical";
    if (score >= 50) return "high";
    if (score >= 25) return "medium";
    return "low";
  }
  
  private generateRecommendations(explanations: EntityExplanation[], overallRisk: string): string[] {
    const recommendations: string[] = [];
    
    // Overall recommendations based on risk
    if (overallRisk === "critical" || overallRisk === "high") {
      recommendations.push("⚠️ URGENT: Forte exposition numérique détectée. Audit de confidentialité recommandé.");
      recommendations.push("🔒 Envisager la suppression ou le renforcement de la confidentialité des profils à risque.");
      recommendations.push("📧 Utiliser des emails dédiés pour les différentes catégories de services.");
    }
    
    if (overallRisk === "medium") {
      recommendations.push("⚡ Opportunité d'amélioration: Réviser les paramètres de confidentialité.");
    }
    
    // Specific recommendations from entities
    const criticalPlatforms = explanations.filter(e => e.riskLevel === "critical");
    if (criticalPlatforms.length > 0) {
      recommendations.push(`🚨 Attention particulière requise pour: ${criticalPlatforms.map(e => this.extractPlatform(e.entity)).join(", ")}`);
    }
    
    // Category-based recommendations
    const categories = new Set(explanations.map(e => e.category));
    if (categories.has("Adult")) {
      recommendations.push("🔞 Contenu adulte détecté: Utiliser des pseudonymes uniques et navigation privée.");
    }
    if (categories.has("Crypto")) {
      recommendations.push("₿ Exposition crypto: Surveiller les transactions publiques et utiliser des wallets dédiés.");
    }
    
    // Positive recommendations
    const professional = explanations.filter(e => e.category === "Professional");
    if (professional.length > 0) {
      recommendations.push("✅ Profils professionnels actifs: Opportunité de renforcer la présence en ligne positive.");
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }
  
  private generateTimeline(explanations: EntityExplanation[]): Array<{date: string; event: string; significance: string}> {
    const timeline: Array<{date: string; event: string; significance: string}> = [];
    
    // Sort by confidence (higher confidence = likely older/more established)
    const sorted = [...explanations].sort((a, b) => b.confidence - a.confidence);
    
    for (let i = 0; i < Math.min(sorted.length, 5); i++) {
      const entity = sorted[i];
      const platform = this.extractPlatform(entity.entity);
      
      timeline.push({
        date: "Date inconnue",
        event: `Profil créé sur ${platform}`,
        significance: entity.confidence > 80 ? "Profil établi et actif" : "Profil récent ou peu actif"
      });
    }
    
    return timeline;
  }
  
  // Generate human-readable report
  generateReport(summary: AnalysisSummary): string {
    const sections: string[] = [];
    
    // Header
    sections.push(`# Rapport d'Analyse OSINT`);
    sections.push(`**Cible**: ${summary.target}`);
    sections.push(`**Date**: ${new Date(summary.analysisDate).toLocaleString()}`);
    sections.push(`**Entités trouvées**: ${summary.totalEntities}`);
    sections.push("");
    
    // Risk Assessment
    const riskEmoji = {
      "low": "🟢",
      "medium": "🟡", 
      "high": "🟠",
      "critical": "🔴"
    };
    
    sections.push(`## Évaluation des Risques`);
    sections.push(`${riskEmoji[summary.riskLevel]} **Niveau**: ${summary.riskLevel.toUpperCase()}`);
    sections.push(`📊 **Score**: ${summary.riskScore}/100`);
    sections.push("");
    
    // Categories
    sections.push(`## Répartition par Catégorie`);
    for (const [category, count] of Object.entries(summary.categories)) {
      sections.push(`- ${category}: ${count} profil(s)`);
    }
    sections.push("");
    
    // Key Findings
    sections.push(`## Découvertes Clés`);
    for (const finding of summary.keyFindings) {
      const riskIcon = {
        "low": "✅",
        "medium": "⚡",
        "high": "⚠️",
        "critical": "🚨"
      };
      
      sections.push(`### ${riskIcon[finding.riskLevel]} ${this.extractPlatform(finding.entity)}`);
      sections.push(`- **Type**: ${finding.category}`);
      sections.push(`- **Confiance**: ${finding.confidence}%`);
      sections.push(`- **Risque**: ${finding.riskLevel}`);
      sections.push(`- **Explication**: ${finding.explanation}`);
      
      if (finding.recommendations.length > 0) {
        sections.push(`- **Recommandations**:`);
        for (const rec of finding.recommendations) {
          sections.push(`  - ${rec}`);
        }
      }
      sections.push("");
    }
    
    // Recommendations
    sections.push(`## Recommandations Prioritaires`);
    for (const rec of summary.recommendations) {
      sections.push(`- ${rec}`);
    }
    sections.push("");
    
    // Footer
    sections.push(`---`);
    sections.push(`*Rapport généré par OSINT Master Pro*`);
    
    return sections.join("\n");
  }
}

export const intelligenceEngine = new IntelligenceEngine();
