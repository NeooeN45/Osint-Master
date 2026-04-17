// ============================================================================
// INDEX CENTRAL DE TOUS LES MODULES OSINT
// ============================================================================

import { OSINTModule } from "./types";
import { usernameModules } from "./username";
import { emailModules } from "./email";
import { domainModules } from "./domain";
import { webModules } from "./web";
import { freeApiModules } from "./free-apis/index.js";
import { dockerModules } from "./docker/index.js";
import { phoneModules } from "./phone/index.js";
import { cryptoModules } from "./crypto/index.js";
import { socialModules } from "./social/index.js";
import { webAdvancedModules } from "./web-advanced/index.js";
import { imageModules } from "./image/index.js";
import { personModules } from "./person/index.js";
import { companyModules } from "./company/index.js";
import { detectTargetType } from "./utils";

// Export des types
export * from "./types";
export * from "./utils";

// Export des modules par catégorie
export { usernameModules } from "./username";
export { emailModules } from "./email";
export { domainModules } from "./domain";
export { webModules } from "./web";
export { dockerModules } from "./docker";
export { phoneModules } from "./phone";
export { cryptoModules } from "./crypto";
export { socialModules } from "./social";
export { webAdvancedModules } from "./web-advanced";
export { imageModules } from "./image";
export { personModules } from "./person";
export { companyModules } from "./company";

// Registre complet
export const allModules: OSINTModule[] = [
  ...usernameModules,
  ...emailModules,
  ...domainModules,
  ...webModules,
  ...freeApiModules,
  ...dockerModules,
  ...phoneModules,
  ...cryptoModules,
  ...socialModules,
  ...webAdvancedModules,
  ...imageModules,
  ...personModules,
  ...companyModules,
];

// Mappage type de cible -> modules pertinents
export const modulesByTargetType: Record<string, string[]> = {
  username: [
    "sherlock", "maigret", "github_search", "reddit_public", "sherlock_docker",
    "twitter_profile", "instagram_profile", "facebook_profile", "linkedin_profile", "tiktok_profile",
    "youtube_channel", "discord_user", "snapchat_user", "pinterest_profile", "tumblr_blog",
    "twitch_channel", "spotify_profile", "soundcloud_profile", "deviantart_profile", "reddit_advanced",
    "github_advanced", "stackoverflow_user", "medium_profile", "quora_profile", "vk_profile",
    "weibo_profile", "social_aggregator", "profile_picture_search", "cross_platform_correlator"
  ],
  email: [
    "gravatar", "github_search", "holehe_docker",
    "numverify", "phoneinfoga", "truecaller_lookup", "whatsapp_checker", "telegram_checker",
    "phone_validation", "carrier_lookup", "hlr_lookup", "phone_osint_framework", "phone_reputation",
    "phone_to_social", "sim_swap_check", "phone_breach_check", "mobile_app_lookup", "phone_geolocation"
  ],
  domain: [
    "crtsh", "hackertarget_dns", "hackertarget_subdomains", "hackertarget_pagelinks", "wayback_machine", "urlscan",
    "subfinder_docker", "theharvester_docker", "amass_docker",
    "wayback_advanced", "common_crawl", "urlscan_advanced", "virustotal_url", "safe_browsing",
    "screenshot_services", "whois_advanced", "dns_deep", "ssl_analysis", "ip_geolocation",
    "shodan_search", "censys_search", "fofa_search", "subdomain_tools", "tech_detection",
    "archive_alternatives", "web_performance", "dns_history", "google_dork_generator",
    "nuclei_docker", "httpx_docker", "gau_docker", "gowitness_docker"
  ],
  url: [
    "wayback_machine", "hackertarget_pagelinks", "urlscan",
    "wayback_advanced", "urlscan_advanced", "virustotal_url", "safe_browsing",
    "screenshot_services", "tech_detection", "web_performance", "archive_alternatives"
  ],
  ip: [
    "ipinfo_free", "hackertarget_geoip", "hackertarget_reverseip",
    "ip_geolocation", "shodan_search", "censys_search", "fofa_search"
  ],
  phone: [
    "numverify", "phoneinfoga", "truecaller_lookup", "whatsapp_checker", "telegram_checker",
    "phone_validation", "carrier_lookup", "hlr_lookup", "phone_osint_framework", "phone_reputation",
    "phone_to_social", "sim_swap_check", "phone_breach_check", "mobile_app_lookup", "phone_geolocation"
  ],
  crypto_address: [
    "bitcoin_address", "ethereum_address", "monero_address", "litecoin_address", "dogecoin_address",
    "multicoin_detector", "transaction_hash", "wallet_profiler", "nft_profiler", "exchange_deposit",
    "crypto_scam_check", "smart_contract_analysis", "ens_resolver", "defi_analyzer", "bridge_tracker",
    "lightning_lookup", "tornado_cash_check", "airdrop_hunter_check", "token_approval_check", "mining_payout_check"
  ],
  person: [
    "sherlock", "maigret", "github_search", "sherlock_docker",
    "social_aggregator", "profile_picture_search", "cross_platform_correlator",
    "pipl_search", "spokeo_search", "whitepages_search", "intelius_search", "beenverified_search",
    "truthfinder_search", "fastpeoplesearch", "truepeoplesearch", "familytreenow", "ancestry_search",
    "voter_records", "court_records", "property_records", "professional_licenses", "death_records",
    "classmates_search", "radaris_search", "peekyou_search", "zabasearch", "google_people_search"
  ],
  company: [
    "linkedin_company", "crunchbase", "bloomberg_company", "sec_edgar", "opencorporates",
    "glassdoor", "indeed_company", "yelp_business", "bbb_search", "hoovers", "angellist",
    "pitchbook", "trademark_search", "patent_search", "domaintools_company", "hunter_company",
    "voilanorbert", "snov_io", "rocketreach", "apollo_io"
  ],
  image: [
    "google_reverse_image", "yandex_reverse_image", "tineye_reverse_image", "bing_visual_search",
    "pimeyes_search", "facecheck_id", "exif_extractor", "image_forensics", "ela_analysis",
    "metadata_analyzer", "image_location", "screenshot_timestamp"
  ],
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
