// Vérification approfondie des profils trouvés par ig_cross_platform
// Pour chaque URL, on fait un GET complet et on analyse le contenu HTML

import axios from "axios";
import https from "https";

const NO_SSL_AGENT = new https.Agent({ rejectUnauthorized: false });
const axget = (url: string, cfg: any = {}) =>
  axios.get(url, { httpsAgent: NO_SSL_AGENT, validateStatus: () => true, timeout: 10000, ...cfg } as any);

const USERNAME = "camille_perraudeau";

const PLATFORMS = [
  {
    name: "Twitter/X",
    url: `https://twitter.com/${USERNAME}`,
    // Twitter redirige vers login ou affiche "This account doesn't exist"
    confirmedPatterns: [`@${USERNAME}`, `"screen_name":"${USERNAME}"`],
    notFoundPatterns: ["this account doesn't exist", "account doesn't exist", "Sorry, that page doesn't exist"],
  },
  {
    name: "TikTok",
    url: `https://www.tiktok.com/@${USERNAME}`,
    confirmedPatterns: [`@${USERNAME}`, `"uniqueId":"${USERNAME}"`],
    notFoundPatterns: ["couldn't find this account", "Page not found", "404"],
  },
  {
    name: "LinkedIn",
    url: `https://www.linkedin.com/in/${USERNAME}`,
    confirmedPatterns: [`${USERNAME}`, "profileSection"],
    notFoundPatterns: ["Page not found", "profile doesn't exist", "This LinkedIn Page isn't available"],
  },
  {
    name: "Reddit",
    url: `https://www.reddit.com/user/${USERNAME}/about.json`,
    confirmedPatterns: [`"name":"${USERNAME}"`, `"name": "${USERNAME}"`],
    notFoundPatterns: ["NOT_FOUND", "User Not Found", "\"error\": 404"],
  },
  {
    name: "GitHub",
    url: `https://github.com/${USERNAME}`,
    confirmedPatterns: [`${USERNAME}`, "contribution", "repositories"],
    notFoundPatterns: ["Not Found", "404", "This is not the web page you are looking for"],
  },
  {
    name: "Steam",
    url: `https://steamcommunity.com/id/${USERNAME}`,
    confirmedPatterns: ["profile_header", "persona_name", USERNAME],
    notFoundPatterns: ["The specified profile could not be found"],
  },
  {
    name: "Telegram",
    url: `https://t.me/${USERNAME}`,
    confirmedPatterns: ["tgme_page_title", "tgme_page"],
    notFoundPatterns: ["tgme_page_not_found", "If you have Telegram, you can contact"],
  },
  {
    name: "Facebook",
    url: `https://www.facebook.com/${USERNAME}`,
    confirmedPatterns: ["timeline", "profile.php", USERNAME],
    notFoundPatterns: ["Page Not Found", "This page isn't available", "content-unavailable"],
  },
  {
    name: "Pinterest",
    url: `https://www.pinterest.fr/${USERNAME}/`,
    confirmedPatterns: [USERNAME, "PinterestApp"],
    notFoundPatterns: ["Sorry!", "404", "couldn't find"],
  },
  {
    name: "Mastodon",
    url: `https://mastodon.social/@${USERNAME}`,
    confirmedPatterns: [`@${USERNAME}`, "actor"],
    notFoundPatterns: ["404", "Record not found"],
  },
];

const ANSI = { green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m", bold: "\x1b[1m", reset: "\x1b[0m" };
const c = (col: keyof typeof ANSI, s: string) => `${ANSI[col]}${s}${ANSI.reset}`;

async function main() {
  console.log(c("bold", `\n╔══════════════════════════════════════════════════════════╗`));
  console.log(c("bold", `║  Vérification approfondie : @${USERNAME.padEnd(30)}║`));
  console.log(c("bold", `╚══════════════════════════════════════════════════════════╝\n`));

  const results: { name: string; verdict: string; status: number; detail: string }[] = [];

  for (const p of PLATFORMS) {
    process.stdout.write(`Vérification ${c("cyan", p.name.padEnd(14))}... `);
    try {
      const r = await axget(p.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
        maxRedirects: 5,
      });

      const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      const bodyLow = body.toLowerCase();
      const status = r.status;

      // Check not-found patterns first
      const isNotFound = status === 404 || status === 410 ||
        p.notFoundPatterns.some(pat => bodyLow.includes(pat.toLowerCase()));

      // Check confirmed patterns
      const isConfirmed = !isNotFound &&
        status < 400 &&
        p.confirmedPatterns.some(pat => body.toLowerCase().includes(pat.toLowerCase()));

      let verdict: string;
      let detail: string;

      if (isConfirmed) {
        verdict = "CONFIRMED";
        // Try to extract display name from og:title
        const ogTitle = body.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]
          || body.match(/<title>([^<|–\-]+)/i)?.[1]?.trim()
          || "";
        detail = ogTitle.slice(0, 60).trim();
      } else if (isNotFound) {
        verdict = "NOT_FOUND";
        detail = `HTTP ${status}`;
      } else {
        verdict = "AMBIGUOUS";
        detail = `HTTP ${status} — no confirm/notfound pattern matched`;
      }

      const icon = verdict === "CONFIRMED" ? c("green", "✓ TROUVÉ    ") :
                   verdict === "NOT_FOUND"  ? c("red",   "✗ INEXISTANT") :
                                              c("yellow","? AMBIGU    ");

      console.log(`${icon}  ${c("gray", detail)}`);
      results.push({ name: p.name, verdict, status, detail });

    } catch (e: any) {
      console.log(c("yellow", `? ERREUR     `) + c("gray", e.message?.slice(0, 50)));
      results.push({ name: p.name, verdict: "ERROR", status: 0, detail: e.message });
    }

    await new Promise(r => setTimeout(r, 500)); // anti rate-limit
  }

  // Summary
  console.log(c("bold", "\n\n═══ VERDICT FINAL ════════════════════════════════════════\n"));
  const confirmed  = results.filter(r => r.verdict === "CONFIRMED");
  const notFound   = results.filter(r => r.verdict === "NOT_FOUND");
  const ambiguous  = results.filter(r => r.verdict === "AMBIGUOUS" || r.verdict === "ERROR");

  if (confirmed.length > 0) {
    console.log(c("green", `✓ Comptes RÉELS trouvés (${confirmed.length}):`));
    for (const r of confirmed) {
      console.log(`   ${c("cyan", r.name.padEnd(14))} ${c("gray", r.detail)}`);
    }
  }
  if (notFound.length > 0) {
    console.log(c("red", `\n✗ Comptes INEXISTANTS / Faux positifs (${notFound.length}):`));
    for (const r of notFound) console.log(`   ${c("cyan", r.name)}`);
  }
  if (ambiguous.length > 0) {
    console.log(c("yellow", `\n? Ambigus (${ambiguous.length}) :`));
    for (const r of ambiguous) console.log(`   ${c("cyan", r.name.padEnd(14))} ${c("gray", r.detail.slice(0,60))}`);
  }

  console.log(c("bold", `\nConclusion: sur ${PLATFORMS.length} plateformes testées → ${confirmed.length} comptes réels confirmés\n`));
}

main().catch(console.error);
