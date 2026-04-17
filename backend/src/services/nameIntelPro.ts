// ============================================================================
// NAME INTELLIGENCE PRO — Recherche par nom/prénom avancée
// TruePeopleSearch · FastPeopleSearch · Radaris · WhitePages · 192.com · Zabasearch
// Gravatar · GitHub commits · INSEE SIRENE · OpenCorporates
// ============================================================================

import axios from "axios";
import https from "https";
import crypto from "crypto";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

async function http(url: string, opts: any = {}): Promise<any> {
  try {
    const { headers, timeout, ...rest } = opts;
    const r = await axios.get(url, {
      timeout: timeout || 15000,
      headers: { "User-Agent": UA, "Accept": "text/html,application/json,application/xml", "Accept-Language": "en-US,en;q=0.9,fr;q=0.8", ...headers },
      httpsAgent, maxRedirects: 5,
      validateStatus: () => true,
      ...rest,
    });
    if (r.status >= 200 && r.status < 400) return r.data;
    return null;
  } catch { return null; }
}

function eid() { return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function ent(type: string, value: string, source: string, confidence: number, metadata: any = {}) {
  return { id: eid(), type, value, source, confidence, metadata, verified: confidence >= 80, depth: 0 };
}

function splitName(name: string): { first: string; last: string; full: string } {
  const parts = name.trim().split(/\s+/);
  return {
    first: parts[0] || "",
    last: parts.slice(1).join(" ") || "",
    full: name.trim(),
  };
}

// ============================================================================
// 1. TRUEPEOPLESEARCH (US) — scraping
// ============================================================================
export const TruePeopleSearchModule = {
  id: "true_people_search",
  name: "TruePeopleSearch (US records)",
  category: "person",
  targetTypes: ["person"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const { first, last } = splitName(target);
    if (!first || !last) return { success: false, data: { skipped: true, reason: "need_full_name" }, entities: [] };
    const entities: any[] = [];
    emit({ type: "log", data: { message: `TruePeopleSearch: ${first} ${last}` } });

    const html: any = await http(
      `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(`${first} ${last}`)}`,
      { timeout: 20000 }
    );

    if (typeof html === "string") {
      // Parse cards de résultats
      const cards = html.match(/<div class="card-summary[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) || [];
      let count = 0;
      for (const card of cards.slice(0, 5)) {
        const nameMatch = card.match(/class="h4"[^>]*>([^<]+)</);
        const ageMatch = card.match(/Age (\d+)/);
        const cityMatch = card.match(/Lives in <b>([^<]+)<\/b>/);
        const linkMatch = card.match(/href="(\/find\/person\/[^"]+)"/);

        if (nameMatch) {
          count++;
          entities.push(ent("person", nameMatch[1].trim(), "true_people_search", 72, {
            source: "truepeoplesearch_us",
            age: ageMatch?.[1],
            location: cityMatch?.[1],
            link: linkMatch ? `https://www.truepeoplesearch.com${linkMatch[1]}` : undefined,
            searchedFor: target,
          }));
          if (cityMatch?.[1]) {
            entities.push(ent("location", cityMatch[1], "true_people_search", 65, { personName: nameMatch[1], country: "US" }));
          }
        }
      }
      emit({ type: "log", data: { message: `TruePeopleSearch: ${count} résultats` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 2. RADARIS (US)
// ============================================================================
export const RadarisModule = {
  id: "radaris_people",
  name: "Radaris (US public records)",
  category: "person",
  targetTypes: ["person"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const { first, last } = splitName(target);
    if (!first || !last) return { success: false, data: { skipped: true }, entities: [] };
    const entities: any[] = [];

    const html: any = await http(
      `https://radaris.com/p/${encodeURIComponent(first)}/${encodeURIComponent(last)}/`,
      { timeout: 20000 }
    );
    if (typeof html === "string" && html.includes(first)) {
      // Radaris liste souvent des personnes avec âge + ville
      const items = [...html.matchAll(/<a[^>]+href="([^"]*\/p\/[^"]+)"[^>]*>([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)<\/a>[\s\S]{0,300}?Age:\s*(\d+)[\s\S]{0,200}?(?:lives in|Location[^<]*)<[^>]+>([^<]{3,60})/gi)];
      let count = 0;
      for (const m of items.slice(0, 5)) {
        count++;
        entities.push(ent("person", m[2].trim(), "radaris_people", 72, {
          link: `https://radaris.com${m[1]}`,
          age: m[3], location: m[4].trim(),
          source: "radaris_us", searchedFor: target,
        }));
      }
      emit({ type: "log", data: { message: `Radaris: ${count} résultats` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 3. 192.COM (UK people search)
// ============================================================================
export const UK192Module = {
  id: "uk_192",
  name: "192.com (UK people search)",
  category: "person",
  targetTypes: ["person"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const { full } = splitName(target);
    const entities: any[] = [];

    const html: any = await http(
      `https://www.192.com/people/search/?searchTerm=${encodeURIComponent(full)}`,
      { timeout: 20000 }
    );

    if (typeof html === "string" && !html.includes("no people results")) {
      const profiles = [...html.matchAll(/<div class="searchResult[^"]*"[\s\S]*?<h3[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]{0,400}?<span[^>]+class="town[^"]*"[^>]*>([^<]+)<\/span>/gi)];
      let count = 0;
      for (const m of profiles.slice(0, 5)) {
        count++;
        entities.push(ent("person", m[2].trim(), "uk_192", 70, {
          link: m[1].startsWith("http") ? m[1] : `https://www.192.com${m[1]}`,
          location: m[3].trim(), country: "UK",
          searchedFor: target,
        }));
      }
      emit({ type: "log", data: { message: `192.com UK: ${count} résultats` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 4. GITHUB COMMIT HARVESTER — extract emails from commits by author name
// ============================================================================
export const GitHubCommitHarvesterModule = {
  id: "github_commit_harvester",
  name: "GitHub Commits → Email Harvester (nom → email)",
  category: "person",
  targetTypes: ["person", "username"],
  priority: 3,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const entities: any[] = [];
    const isUsername = !target.includes(" ");
    const token = process.env.GITHUB_TOKEN;
    const headers: any = token ? { Authorization: `Bearer ${token}` } : {};

    emit({ type: "log", data: { message: `GitHub commits harvest: ${target}` } });

    // Méthode 1 : si c'est un username → fetch events / commits
    if (isUsername) {
      const events: any = await http(`https://api.github.com/users/${target}/events/public?per_page=100`, { headers });
      if (Array.isArray(events)) {
        const emails = new Set<string>();
        for (const e of events) {
          if (e.type === "PushEvent" && e.payload?.commits) {
            for (const c of e.payload.commits) {
              if (c.author?.email && !c.author.email.includes("noreply.github.com")) {
                emails.add(c.author.email);
                if (c.author.name) {
                  entities.push(ent("person", c.author.name, "github_commit_harvester", 82, {
                    fromCommit: true, username: target, email: c.author.email,
                  }));
                }
              }
            }
          }
        }
        emails.forEach(e => entities.push(ent("email", e, "github_commit_harvester", 88, {
          fromGitHubCommit: true, username: target, verified: true,
        })));
        emit({ type: "log", data: { message: `GitHub commits: ${emails.size} emails uniques harvest` } });
      }
    } else {
      // Méthode 2 : nom complet → recherche commits avec auteur
      const { first, last } = splitName(target);
      const q = `${first}+${last}`;
      const res: any = await http(
        `https://api.github.com/search/commits?q=author-name:"${first} ${last}"&per_page=20`,
        { headers: { ...headers, Accept: "application/vnd.github.cloak-preview" } }
      );
      if (res?.items?.length) {
        const emails = new Set<string>();
        for (const item of res.items) {
          if (item.commit?.author?.email && !item.commit.author.email.includes("noreply")) {
            emails.add(item.commit.author.email);
          }
          if (item.author?.login) {
            entities.push(ent("username", item.author.login, "github_commit_harvester", 78, {
              fromCommitName: target, platform: "GitHub",
            }));
          }
        }
        emails.forEach(e => entities.push(ent("email", e, "github_commit_harvester", 82, {
          fromGitHubCommit: true, authorName: target,
        })));
        emit({ type: "log", data: { message: `GitHub: ${emails.size} emails depuis ${res.items.length} commits` } });
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 5. GRAVATAR — email/hash lookup
// ============================================================================
export const GravatarModule = {
  id: "gravatar_profile",
  name: "Gravatar Profile (hash-based)",
  category: "person",
  targetTypes: ["email"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const email = target.trim().toLowerCase();
    if (!email.includes("@")) return { success: false, data: { skipped: true }, entities: [] };
    const entities: any[] = [];

    const hash = crypto.createHash("md5").update(email).digest("hex");
    const data: any = await http(`https://www.gravatar.com/${hash}.json`);

    if (data?.entry?.[0]) {
      const e = data.entry[0];
      entities.push(ent("social_profile", `https://www.gravatar.com/${hash}`, "gravatar_profile", 85, {
        platform: "Gravatar", displayName: e.displayName, preferredUsername: e.preferredUsername,
        hash, aboutMe: e.aboutMe, currentLocation: e.currentLocation,
        avatar: e.thumbnailUrl, email,
      }));
      if (e.displayName) entities.push(ent("person", e.displayName, "gravatar_profile", 88, { email, gravatar: true }));
      if (e.preferredUsername) entities.push(ent("username", e.preferredUsername, "gravatar_profile", 82, { email, gravatar: true }));
      if (e.thumbnailUrl) entities.push(ent("image_url", e.thumbnailUrl, "gravatar_profile", 82, { email, type: "profile_picture", platform: "Gravatar" }));

      // Comptes sociaux liés
      for (const acc of e.accounts || []) {
        entities.push(ent("social_profile", acc.url, "gravatar_profile", 85, {
          platform: acc.name, username: acc.username, shortname: acc.shortname,
          fromGravatar: email, verified: acc.verified,
        }));
        if (acc.username) entities.push(ent("username", acc.username, "gravatar_profile", 85, {
          platform: acc.name, fromGravatar: email, verified: acc.verified,
        }));
      }

      // URLs liées
      for (const url of e.urls || []) {
        entities.push(ent("url", url.value, "gravatar_profile", 80, { title: url.title, fromGravatar: email }));
      }
      emit({ type: "log", data: { message: `Gravatar ✓ ${e.displayName || email} — ${(e.accounts || []).length} comptes liés` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 6. INSEE SIRENE (FR) — entreprises + dirigeants
// ============================================================================
export const SIRENEModule = {
  id: "insee_sirene",
  name: "INSEE SIRENE (entreprises FR + dirigeants)",
  category: "person",
  targetTypes: ["person", "organization"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const entities: any[] = [];
    emit({ type: "log", data: { message: `INSEE SIRENE: ${target}` } });

    // API publique recherche-entreprises.api.gouv.fr
    const data: any = await http(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(target)}&per_page=10`,
      { timeout: 15000 }
    );

    if (data?.results?.length) {
      for (const r of data.results.slice(0, 8)) {
        entities.push(ent("organization", r.nom_complet || r.nom_raison_sociale, "insee_sirene", 88, {
          siren: r.siren, siret: r.siege?.siret,
          activity: r.activite_principale,
          naf: r.nature_juridique,
          employees: r.tranche_effectif_salarie,
          address: [r.siege?.adresse, r.siege?.code_postal, r.siege?.ville].filter(Boolean).join(", "),
          created: r.date_creation,
          country: "FR", source: "insee",
        }));

        // Dirigeants
        for (const d of r.dirigeants || []) {
          if (d.nom && d.prenoms) {
            entities.push(ent("person", `${d.prenoms} ${d.nom}`, "insee_sirene", 90, {
              role: d.qualite, company: r.nom_complet, siren: r.siren,
              birthDate: d.date_naissance, country: "FR",
            }));
          } else if (d.denomination) {
            entities.push(ent("organization", d.denomination, "insee_sirene", 85, {
              role: d.qualite, parentCompany: r.nom_complet, siren: r.siren,
            }));
          }
        }

        if (r.siege?.adresse) {
          entities.push(ent("location", `${r.siege.adresse}, ${r.siege.ville}, France`, "insee_sirene", 80, {
            company: r.nom_complet, siren: r.siren, country: "FR",
          }));
        }
      }
      emit({ type: "log", data: { message: `INSEE SIRENE: ${data.results.length} entreprises + dirigeants` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 7. COMPANIES HOUSE (UK)
// ============================================================================
export const CompaniesHouseModule = {
  id: "companies_house_uk",
  name: "Companies House (UK)",
  category: "person",
  targetTypes: ["person", "organization"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const entities: any[] = [];

    // API publique via proxy find-and-update (pas besoin de clé)
    const html: any = await http(
      `https://find-and-update.company-information.service.gov.uk/search?q=${encodeURIComponent(target)}`,
      { timeout: 15000, headers: { "Accept": "text/html" } }
    );

    if (typeof html === "string") {
      const companies = [...html.matchAll(/<a[^>]+href="\/company\/(\d+)"[^>]*>([^<]+)<\/a>[\s\S]{0,300}?(?:incorporated on|registered)[^<]*<[^>]+>([^<]+)</gi)];
      let count = 0;
      for (const m of companies.slice(0, 5)) {
        count++;
        entities.push(ent("organization", m[2].trim(), "companies_house_uk", 85, {
          companyNumber: m[1], registeredOn: m[3].trim(),
          country: "UK", source: "companies_house",
          link: `https://find-and-update.company-information.service.gov.uk/company/${m[1]}`,
        }));
      }
      emit({ type: "log", data: { message: `Companies House UK: ${count} entreprises` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 8. OPENCORPORATES — registre mondial gratuit
// ============================================================================
export const OpenCorporatesModule = {
  id: "opencorporates",
  name: "OpenCorporates (registre mondial)",
  category: "person",
  targetTypes: ["person", "organization"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const entities: any[] = [];

    const data: any = await http(
      `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(target)}&per_page=10`,
      { timeout: 15000 }
    );

    if (data?.results?.companies?.length) {
      for (const item of data.results.companies.slice(0, 8)) {
        const c = item.company;
        entities.push(ent("organization", c.name, "opencorporates", 85, {
          jurisdiction: c.jurisdiction_code,
          companyNumber: c.company_number,
          type: c.company_type,
          status: c.current_status,
          created: c.incorporation_date,
          address: c.registered_address_in_full,
          link: c.opencorporates_url,
        }));
        if (c.registered_address_in_full) {
          entities.push(ent("location", c.registered_address_in_full, "opencorporates", 72, {
            company: c.name, country: c.jurisdiction_code,
          }));
        }
      }
      emit({ type: "log", data: { message: `OpenCorporates: ${data.results.companies.length} entreprises` } });
    }

    // Recherche officiers (personnes dirigeantes)
    const officers: any = await http(
      `https://api.opencorporates.com/v0.4/officers/search?q=${encodeURIComponent(target)}&per_page=10`,
      { timeout: 15000 }
    );
    if (officers?.results?.officers?.length) {
      for (const item of officers.results.officers.slice(0, 5)) {
        const o = item.officer;
        entities.push(ent("person", o.name, "opencorporates", 82, {
          position: o.position,
          company: o.company?.name,
          jurisdiction: o.company?.jurisdiction_code,
          link: o.opencorporates_url,
        }));
      }
      emit({ type: "log", data: { message: `OpenCorporates: ${officers.results.officers.length} dirigeants` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 9. NAME → EMAIL PATTERN GENERATOR (avec vérif Hunter/MX)
// ============================================================================
export const NameToEmailModule = {
  id: "name_to_email",
  name: "Name → Email Pattern Generator",
  category: "person",
  targetTypes: ["person"],
  priority: 5,
  isAvailable: async () => true,
  execute: async (target: string, emit: any, context: any = {}) => {
    const { first, last } = splitName(target);
    if (!first || !last) return { success: false, data: { skipped: true }, entities: [] };

    const entities: any[] = [];
    const f = first.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const l = last.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const fi = f[0];
    const li = l[0];

    // Domains depuis le contexte (email/domain déjà trouvés)
    const domains = new Set<string>();
    for (const e of (context.allEntities || [])) {
      if (e.type === "email" && typeof e.value === "string") {
        const d = e.value.split("@")[1];
        if (d) domains.add(d.toLowerCase());
      }
      if (e.type === "domain") domains.add(e.value.toLowerCase());
    }

    // Patterns classiques
    const patterns = (d: string) => [
      `${f}.${l}@${d}`, `${f}${l}@${d}`, `${f}_${l}@${d}`,
      `${fi}${l}@${d}`, `${fi}.${l}@${d}`, `${f}.${li}@${d}`,
      `${f}@${d}`, `${l}@${d}`, `${fi}${li}@${d}`,
      `${l}.${f}@${d}`, `${l}${f}@${d}`,
    ];

    // Si on a des domaines → générer variantes
    if (domains.size > 0) {
      for (const d of domains) {
        for (const p of patterns(d)) {
          entities.push(ent("email", p, "name_to_email", 45, {
            generated: true, pattern: "pattern_variant", domain: d, name: target,
          }));
        }
      }
      emit({ type: "log", data: { message: `Name→Email: ${entities.length} variantes pour ${domains.size} domaines` } });
    } else {
      // Sinon : gmail, outlook, yahoo, proton
      const common = ["gmail.com", "outlook.com", "yahoo.com", "proton.me", "hotmail.com"];
      for (const d of common) {
        entities.push(ent("email", `${f}.${l}@${d}`, "name_to_email", 30, {
          generated: true, pattern: "first.last", domain: d, name: target,
        }));
      }
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// 10. GITHUB SEARCH BY NAME
// ============================================================================
export const GitHubSearchByNameModule = {
  id: "github_search_by_name",
  name: "GitHub Search (nom → usernames)",
  category: "person",
  targetTypes: ["person"],
  priority: 4,
  isAvailable: async () => true,
  execute: async (target: string, emit: any) => {
    const entities: any[] = [];
    const token = process.env.GITHUB_TOKEN;
    const headers: any = token ? { Authorization: `Bearer ${token}` } : {};

    const data: any = await http(
      `https://api.github.com/search/users?q=${encodeURIComponent(`"${target}" in:name`)}&per_page=15`,
      { headers }
    );

    if (data?.items?.length) {
      for (const u of data.items.slice(0, 10)) {
        entities.push(ent("social_profile", u.html_url, "github_search_by_name", 75, {
          platform: "GitHub", username: u.login,
          avatar: u.avatar_url, searchedFor: target,
        }));
        entities.push(ent("username", u.login, "github_search_by_name", 72, {
          platform: "GitHub", fromNameSearch: target,
        }));
      }
      emit({ type: "log", data: { message: `GitHub name search: ${data.items.length} candidats` } });
    }

    return { success: entities.length > 0, data: { found: entities.length }, entities };
  },
};

// ============================================================================
// EXPORT
// ============================================================================
export const nameIntelProModules = [
  TruePeopleSearchModule,
  RadarisModule,
  UK192Module,
  GitHubCommitHarvesterModule,
  GravatarModule,
  SIRENEModule,
  CompaniesHouseModule,
  OpenCorporatesModule,
  NameToEmailModule,
  GitHubSearchByNameModule,
];
