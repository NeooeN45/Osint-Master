import { config as dotenvConfig } from "dotenv";
import path from "path";
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });
import axios from "axios";
import https from "https";

const ag = new https.Agent({ rejectUnauthorized: false });
const key = process.env.RAPIDAPI_KEY!;
const phone = "+33769723999";
const phone0 = "0769723999";

async function test(label: string, url: string, headers: any = {}) {
  try {
    const r = await axios.get(url, { headers, httpsAgent: ag, validateStatus: () => true, timeout: 10000 } as any);
    console.log(`\n[${label}] HTTP ${r.status}`);
    const data = typeof r.data === "string" ? r.data.slice(0, 400) : JSON.stringify(r.data).slice(0, 400);
    console.log(data);
  } catch (e: any) { console.log(`\n[${label}] ERREUR: ${e.message}`); }
}

async function main() {
  console.log("RAPIDAPI_KEY:", key ? key.slice(0,8)+"..."+key.slice(-4) : "MANQUANTE");
  console.log("Phone:", phone);

  // Veriphone
  await test("Veriphone", `https://veriphone.p.rapidapi.com/verify?phone=${encodeURIComponent(phone)}`,
    { "x-rapidapi-key": key, "x-rapidapi-host": "veriphone.p.rapidapi.com" });

  // NumVerify (sans clé)
  await test("NumVerify_free", `http://apilayer.net/api/validate?number=${encodeURIComponent(phone)}&format=1&country_code=FR`);

  // Phone Lookup RapidAPI - plusieurs hosts possibles
  await test("PhoneLookup_v1", `https://phone-number-lookup-free.p.rapidapi.com/lookup?phone=${encodeURIComponent(phone)}`,
    { "x-rapidapi-key": key, "x-rapidapi-host": "phone-number-lookup-free.p.rapidapi.com" });

  await test("PhoneLookup_v2", `https://phone-number-tracker3.p.rapidapi.com/?number=${encodeURIComponent(phone)}`,
    { "x-rapidapi-key": key, "x-rapidapi-host": "phone-number-tracker3.p.rapidapi.com" });

  // WhatsApp check
  await test("WhatsApp_v1", `https://whatsapp-data1.p.rapidapi.com/number/${phone.replace("+","")}`,
    { "x-rapidapi-key": key, "x-rapidapi-host": "whatsapp-data1.p.rapidapi.com" });

  // Virtual phone detector
  await test("VirtualPhone", `https://virtual-number-detector.p.rapidapi.com/?phone=${encodeURIComponent(phone)}`,
    { "x-rapidapi-key": key, "x-rapidapi-host": "virtual-number-detector.p.rapidapi.com" });

  // PagesJaunes (avec SSL bypass)
  await test("PagesJaunes", `https://www.pagesjaunes.fr/annuaireinverse/recherche?quoiqui=${phone0}`,
    { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124", "Accept-Language": "fr-FR,fr;q=0.9", "Accept": "text/html" });

  // Pages Blanches
  await test("PagesBlanches", `https://www.pagesblanches.fr/annuaireinverse/recherche?quoiqui=${phone0}`,
    { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124", "Accept-Language": "fr-FR,fr;q=0.9" });

  // Numlookup.com
  await test("NumLookup_API", `https://api.numlookupapi.com/v1/validate/${encodeURIComponent(phone)}`);

  // AbstractAPI phone
  await test("Abstract_Phone", `https://phonevalidation.abstractapi.com/v1/?api_key=${key}&phone=${encodeURIComponent(phone)}`);
}

main().catch(console.error);
