// ============================================================================
// UTILS - Fonctions utilitaires pour l'UI
// ============================================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne les classes Tailwind avec clsx et tailwind-merge
 * Permet d'éviter les conflits de classes CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate un nombre avec des séparateurs de milliers
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("fr-FR").format(num);
}

/**
 * Tronque un texte à une longueur donnée
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Génère un délai d'animation stagger
 */
export function staggerDelay(index: number, baseDelay = 0.1): number {
  return index * baseDelay;
}

/**
 * Vérifie si l'URL est valide
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Détecte le type de cible (email, username, etc.)
 */
export function detectTargetType(target: string): string {
  if (target.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return "email";
  if (target.match(/^\+?[\d\s\-\(\)]{10,}$/)) return "phone";
  if (target.match(/^(\d{1,3}\.){3}\d{1,3}$/)) return "ip";
  if (target.match(/^[\w-]+\.[\w.-]+$/)) return "domain";
  if (target.match(/^https?:\/\//)) return "url";
  return "username";
}
