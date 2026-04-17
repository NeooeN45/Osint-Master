import axios from "axios";

const SEARX = [
  "https://searx.be",
  "https://search.inetol.net",
  "https://searx.tiekoetter.com",
  "https://opnxng.com",
  "https://searx.work",
];

async function main() {
  const query = "nasa site:github.com";

  console.log("\n=== Testing SearX instances ===");
  for (const base of SEARX) {
    try {
      const r = await axios.get(`${base}/search`, {
        params: { q: query, format: "json", language: "en" },
        timeout: 8000,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      } as any);
      const ct = r.headers["content-type"] || "";
      const isJson = ct.includes("json");
      const results = isJson ? (r.data as any)?.results?.length ?? 0 : 0;
      console.log(`[${r.status}] ${base} — ${ct.slice(0,30)} — ${results} results`);
      if (isJson && results > 0) {
        const first = (r.data as any).results[0];
        console.log(`   → ${first.url}`);
      }
    } catch (e: any) {
      console.log(`[ERR] ${base} — ${e.message}`);
    }
  }

  console.log("\n=== Testing DDG JSON API ===");
  try {
    const r = await axios.get("https://api.duckduckgo.com/", {
      params: { q: "nasa space", format: "json", no_html: 1 },
      timeout: 8000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    } as any);
    const d = r.data as any;
    console.log(`Status: ${r.status}, AbstractURL: ${d?.AbstractURL || "none"}, RelatedTopics: ${d?.RelatedTopics?.length || 0}`);
  } catch (e: any) { console.log("DDG Error:", e.message); }

  console.log("\n=== Testing ig_cross_platform HEAD ===");
  const platforms = [
    "https://github.com/nasa",
    "https://twitter.com/nasa",
    "https://reddit.com/user/nasa",
  ];
  for (const url of platforms) {
    try {
      const r = await (axios as any).request({ method: "HEAD", url, timeout: 5000, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0" } });
      console.log(`[${r.status}] HEAD ${url}`);
    } catch (e: any) { console.log(`[ERR] ${url} — ${e.message}`); }
  }
}

main().catch(console.error);
