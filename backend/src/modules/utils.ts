// ============================================================================
// UTILITAIRES COMMUNS POUR LES MODULES OSINT
// ============================================================================

import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);

// ---- Exécution de commandes avec timeout ----
export async function tryExec(
  cmd: string,
  timeoutMs = 30000
): Promise<{ stdout: string; stderr: string } | null> {
  try {
    return await execAsync(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });
  } catch (e: any) {
    return e.stdout ? { stdout: e.stdout, stderr: e.stderr || "" } : null;
  }
}

// ---- Requêtes HTTP ----
export async function tryHttp(url: string, options: any = {}): Promise<any> {
  try {
    const res = await axios.get(url, { timeout: 15000, ...options });
    return res.data;
  } catch {
    return null;
  }
}

export async function tryHttpPost(url: string, body: any, options: any = {}): Promise<any> {
  try {
    const res = await axios.post(url, body, { timeout: 15000, ...options });
    return res.data;
  } catch {
    return null;
  }
}

// ---- Patterns de filtrage ----
export const NOISE_PATTERNS = [
  "raw.githubusercontent.com",
  "github.com/sherlock",
  "sherlock-project",
  "data.json",
  "localhost",
  "127.0.0.1",
  "example.com",
  "undefined",
  "null"
];

export const FALSE_POSITIVE_PATTERNS = [
  "op.gg/summoners/search",
  "chaturbate.com/",
  "adultfriendfinder.com",
  "forum.blu-ray.com/member.php",
  "techpowerup.com/forums/members",
  "tomsguide.com/members",
  "ixbt.com/users.cgi",
  "authorstream.com",
  "wikimapia.org/user/tools",
  "dailykos.com/user",
  "moscow.flamp.ru",
  "kinja.com",
  "mercadolivre.com.br/perfil",
  "picsart.com/u",
  "weedmaps.com/brands",
  "3ddd.ru/users",
  "pbase.com",
  "interpals.net",
  "hashnode.com",
  "kaskus.co.id",
  "artstation.com",
  "kaggle.com",
  "livemaster.ru",
  "bibsonomy.org",
  "getmyuni.com",
  "roblox.com/user.aspx",
  "apple.com/profile",
  "opensea.io/accounts"
];

// ---- Détection du type de cible ----
export function detectTargetType(target: string): string {
  if (target.match(/^[\w.+-]+@[\w-]+\.[\w.]+$/)) return "email";
  if (target.match(/^\+?[\d\s()\-]{7,}$/)) return "phone";
  if (target.match(/^(\d{1,3}\.){3}\d{1,3}$/)) return "ip";
  if (target.match(/^([0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}$/i)) return "ipv6";
  if (target.match(/^https?:\/\//)) return "url";
  if (target.match(/^[\w-]+\.[\w.]{2,}$/)) return "domain";
  if (target.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/)) return "person";
  return "username";
}

// ---- Helpers de parsing ----
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s\"'<>]+/g;
  return text.match(urlRegex) || [];
}

export function cleanUrl(url: string): string {
  return url.replace(/[,;"'`]+$/, "").trim();
}

export function isNoiseUrl(url: string): boolean {
  return NOISE_PATTERNS.some(pattern => url.toLowerCase().includes(pattern));
}

export function isFalsePositive(url: string): boolean {
  return FALSE_POSITIVE_PATTERNS.some(pattern => url.toLowerCase().includes(pattern));
}

export function extractPlatform(url: string): string {
  const match = url.replace(/https?:\/\/(www\.)?/, "").split("/")[0]?.split(".")[0];
  return match || "unknown";
}
