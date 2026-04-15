// ============================================================================
// INDEX CENTRAL DE TOUS LES MODULES OSINT
// ============================================================================

import { OSINTModule } from "./types";
import { usernameModules } from "./username";
import { emailModules } from "./email";
import { domainModules } from "./domain";
import { webModules } from "./web";
import { freeApiModules } from "./free-apis/index.js";
import { detectTargetType } from "./utils";

// Export des types
export * from "./types";
export * from "./utils";

// Export des modules par catégorie
export { usernameModules } from "./username";
export { emailModules } from "./email";
export { domainModules } from "./domain";
export { webModules } from "./web";

// Registre complet
export const allModules: OSINTModule[] = [
  ...usernameModules,
  ...emailModules,
  ...domainModules,
  ...webModules,
  ...freeApiModules,
];

// Mappage type de cible -> modules pertinents
export const modulesByTargetType: Record<string, string[]> = {
  username: ["sherlock", "maigret", "github_search", "reddit_public"],
  email: ["gravatar", "github_search"],
  domain: ["crtsh", "hackertarget_dns", "hackertarget_subdomains", "hackertarget_pagelinks", "wayback_machine", "urlscan"],
  url: ["wayback_machine", "hackertarget_pagelinks", "urlscan"],
  ip: ["ipinfo_free", "hackertarget_geoip", "hackertarget_reverseip"],
  phone: [],
  person: ["sherlock", "maigret", "github_search"],
};

// Récupérer les modules pour une cible donnée
export function getModulesForTarget(target: string, targetType?: string): OSINTModule[] {
  const type = targetType || detectTargetType(target);
  const moduleIds = modulesByTargetType[type] || [];
  return allModules.filter(m => moduleIds.includes(m.id));
}

// Récupérer tous les modules disponibles (async pour vérifier isAvailable)
export async function getAvailableModules(): Promise<OSINTModule[]> {
  const available: OSINTModule[] = [];
  
  for (const mod of allModules) {
    try {
      if (await mod.isAvailable()) {
        available.push(mod);
      }
    } catch {
      // Module non disponible
    }
  }
  
  return available;
}

// Chargement dynamique de modules supplémentaires
export async function loadCategoryModules(category: string): Promise<OSINTModule[]> {
  try {
    const mod = await import(`./${category}`);
    return mod[`${category}Modules`] || [];
  } catch {
    return [];
  }
}
