/**
 * Fingerprint Spoofer - Phase 1 OPSEC Foundation
 * Gestion des empreintes digitales pour anonymisation des requêtes
 * 
 * Fonctionnalités:
 * - Rotation User-Agent
 * - Accept-Language spoofing
 * - Screen resolution spoofing
 * - Timezone spoofing
 * - WebGL/Canvas fingerprint randomization
 * - TLS/JA3 fingerprint rotation
 * 
 * Créé: 17 Avril 2026 - Phase 1 OPSEC
 * Fichier: backend/src/services/opsec/fingerprintSpoofer.ts
 */

import { randomBytes } from 'crypto';

// Types
export interface BrowserFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  accept: string;
  dnt: string;
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone: string;
  platform: string;
  vendor: string;
  plugins: string[];
  fonts: string[];
  webgl: {
    vendor: string;
    renderer: string;
  };
  canvas: {
    noise: number;
  };
  tls: {
    ja3Fingerprint: string;
    tlsVersion: string;
    cipherSuites: string[];
  };
}

export interface FingerprintProfile {
  id: string;
  name: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
  device?: 'desktop' | 'mobile' | 'tablet';
}

// Pools de données réalistes
const USER_AGENTS = {
  chrome: {
    windows: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    ],
    macos: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    ],
    linux: [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    ],
  },
  firefox: {
    windows: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    ],
    macos: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    ],
    linux: [
      'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    ],
  },
  safari: {
    macos: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    ],
  },
  edge: {
    windows: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    ],
    macos: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    ],
  },
};

const LANGUAGES = [
  'en-US,en;q=0.9',
  'en-GB,en;q=0.9',
  'fr-FR,fr;q=0.9,en;q=0.8',
  'de-DE,de;q=0.9,en;q=0.8',
  'es-ES,es;q=0.9,en;q=0.8',
  'it-IT,it;q=0.9,en;q=0.8',
  'pt-BR,pt;q=0.9,en;q=0.8',
  'ja-JP,ja;q=0.9,en;q=0.8',
  'zh-CN,zh;q=0.9,en;q=0.8',
  'ru-RU,ru;q=0.9,en;q=0.8',
];

const TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
];

const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1680, height: 1050 },
  { width: 2560, height: 1600 },
];

const VIEWPORT_SIZES = [
  { width: 1920, height: 969 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1329 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
];

const PLATFORMS: Record<string, string> = {
  windows: 'Win32',
  macos: 'MacIntel',
  linux: 'Linux x86_64',
  ios: 'iPhone',
  android: 'Linux armv8l',
};

const VENDORS = {
  chrome: 'Google Inc.',
  firefox: '',
  safari: 'Apple Computer, Inc.',
  edge: 'Microsoft Corporation',
};

const WEBGL_VENDORS = [
  'Google Inc. (NVIDIA)',
  'Google Inc. (AMD)',
  'Google Inc. (Intel)',
  'Apple Inc.',
  'NVIDIA Corporation',
  'Intel Inc.',
  'ATI Technologies Inc.',
];

const WEBGL_RENDERERS = [
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'Apple M1',
  'Apple M2',
  'Intel Iris OpenGL Engine',
  'AMD Radeon Pro',
];

const JA3Fingerprints = {
  chrome: [
    '769,47-53-5-10-49161-49162-49171-49172-50-56-19-4,0-10-11,23-24-25,0',
    '771,49195-49199-49196-49200-52393-52392-49161-49171-49162-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24-25',
  ],
  firefox: [
    '771,49195-49199-52393-52392-49161-49171-49162-49172-156-157-47-53,0-23-65281-10-11-35-16-5-51-43-13-45-28,29-23-24-25',
  ],
  safari: [
    '771,49195-49199-52393-52392-49161-49171-49162-49172-156-157-47-53,65281-0-23-35-13-5-18-16-30032-11-10,29-23-24',
  ],
};

// État actuel
let currentFingerprint: BrowserFingerprint | null = null;
let rotationMode: 'static' | 'random' | 'session' = 'session';
let lastRotation: Date = new Date();

/**
 * Générer un fingerprint aléatoire complet
 */
export function generateFingerprint(profile?: Partial<FingerprintProfile>): BrowserFingerprint {
  const browser = profile?.browser || getRandomBrowser();
  const os = profile?.os || getRandomOS();
  const device = profile?.device || 'desktop';
  
  const userAgent = getRandomUserAgent(browser, os);
  const screen = getRandomScreenResolution();
  const viewport = getRandomViewport();
  
  const fingerprint: BrowserFingerprint = {
    userAgent,
    acceptLanguage: getRandomLanguage(),
    acceptEncoding: 'gzip, deflate, br',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    dnt: '1',
    viewport,
    screen,
    timezone: getRandomTimezone(),
    platform: PLATFORMS[os],
    vendor: VENDORS[browser],
    plugins: getBrowserPlugins(browser),
    fonts: getCommonFonts(),
    webgl: {
      vendor: getRandomWebGLVendor(),
      renderer: getRandomWebGLRenderer(),
    },
    canvas: {
      noise: Math.random() * 0.02,
    },
    tls: {
      ja3Fingerprint: getRandomJA3(browser),
      tlsVersion: 'TLSv1.3',
      cipherSuites: getCipherSuites(browser),
    },
  };
  
  currentFingerprint = fingerprint;
  lastRotation = new Date();
  
  return fingerprint;
}

/**
 * Obtenir le fingerprint actuel
 */
export function getCurrentFingerprint(): BrowserFingerprint {
  if (!currentFingerprint) {
    return generateFingerprint();
  }
  
  // Vérifier si rotation nécessaire
  if (rotationMode === 'random') {
    const timeSinceLastRotation = Date.now() - lastRotation.getTime();
    if (timeSinceLastRotation > 600000) {  // 10 minutes
      return generateFingerprint();
    }
  }
  
  return currentFingerprint;
}

/**
 * Faire tourner le fingerprint (nouvelle identité)
 */
export function rotateFingerprint(): BrowserFingerprint {
  console.log('[FingerprintSpoofer] Rotating fingerprint...');
  return generateFingerprint();
}

/**
 * Obtenir les headers HTTP spoofés
 */
export function getSpoofedHeaders(): Record<string, string> {
  const fp = getCurrentFingerprint();
  
  return {
    'User-Agent': fp.userAgent,
    'Accept': fp.accept,
    'Accept-Language': fp.acceptLanguage,
    'Accept-Encoding': fp.acceptEncoding,
    'DNT': fp.dnt,
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };
}

/**
 * Obtenir la configuration axios avec fingerprint
 */
export function getAxiosConfig(): {
  headers: Record<string, string>;
  decompress: boolean;
  timeout: number;
} {
  return {
    headers: getSpoofedHeaders(),
    decompress: true,
    timeout: 30000,
  };
}

// Fonctions utilitaires privées

function getRandomBrowser(): FingerprintProfile['browser'] {
  const browsers: FingerprintProfile['browser'][] = ['chrome', 'firefox', 'safari', 'edge'];
  return browsers[Math.floor(Math.random() * browsers.length)];
}

function getRandomOS(): FingerprintProfile['os'] {
  const oses: FingerprintProfile['os'][] = ['windows', 'macos', 'linux', 'ios', 'android'];
  return oses[Math.floor(Math.random() * oses.length)];
}

function getRandomUserAgent(browser: string, os: string): string {
  const pool = (USER_AGENTS as any)[browser]?.[os] || USER_AGENTS.chrome.windows;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRandomLanguage(): string {
  return LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
}

function getRandomTimezone(): string {
  return TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];
}

function getRandomScreenResolution() {
  const res = SCREEN_RESOLUTIONS[Math.floor(Math.random() * SCREEN_RESOLUTIONS.length)];
  return {
    ...res,
    colorDepth: 24,
    pixelRatio: 1,
  };
}

function getRandomViewport() {
  return VIEWPORT_SIZES[Math.floor(Math.random() * VIEWPORT_SIZES.length)];
}

function getRandomWebGLVendor(): string {
  return WEBGL_VENDORS[Math.floor(Math.random() * WEBGL_VENDORS.length)];
}

function getRandomWebGLRenderer(): string {
  return WEBGL_RENDERERS[Math.floor(Math.random() * WEBGL_RENDERERS.length)];
}

function getRandomJA3(browser: string): string {
  const pool = (JA3Fingerprints as Record<string, string[]>)[browser] || JA3Fingerprints.chrome;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getBrowserPlugins(browser: string): string[] {
  const commonPlugins: Record<string, string[]> = {
    chrome: [
      'Chrome PDF Plugin',
      'Chrome PDF Viewer',
      'Native Client',
      'Widevine Content Decryption Module',
    ],
    firefox: [
      'OpenH264 Video Codec',
      'Widevine Content Decryption Module',
    ],
    safari: [
      'WebKit-built-in PDF',
    ],
    edge: [
      'Edge PDF Plugin',
      'Edge PDF Viewer',
      'Widevine Content Decryption Module',
    ],
  };
  
  return commonPlugins[browser] || commonPlugins.chrome;
}

function getCommonFonts(): string[] {
  return [
    'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Cambria Math',
    'Comic Sans MS', 'Consolas', 'Courier', 'Courier New', 'Georgia', 'Helvetica',
    'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
    'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times', 'Times New Roman',
    'Trebuchet MS', 'Verdana', 'Wingdings',
  ];
}

function getCipherSuites(browser: string): string[] {
  const suites: Record<string, string[]> = {
    chrome: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
    ],
    firefox: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
    ],
    safari: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
    ],
    edge: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
    ],
  };
  
  return suites[browser] || suites.chrome;
}

/**
 * Générer un profil cohérent (pas random)
 * Utile pour maintenir une identité stable sur une investigation
 */
export function generateConsistentProfile(seed: string): FingerprintProfile {
  // Utiliser le seed pour générer un profil déterministe
  const hash = parseInt(seed.slice(0, 8), 16);
  
  const browsers: FingerprintProfile['browser'][] = ['chrome', 'firefox', 'safari', 'edge'];
  const oses: FingerprintProfile['os'][] = ['windows', 'macos', 'linux'];
  
  return {
    id: `profile-${seed.slice(0, 8)}`,
    name: `Investigation Profile ${seed.slice(0, 8)}`,
    browser: browsers[hash % browsers.length],
    os: oses[(hash >> 8) % oses.length],
    device: 'desktop',
  };
}

/**
 * Activer le mode "paranoid" (rotation agressive)
 */
export function setParanoidMode(enabled: boolean): void {
  if (enabled) {
    rotationMode = 'random';
    console.log('[FingerprintSpoofer] Paranoid mode enabled - aggressive rotation');
  } else {
    rotationMode = 'session';
    console.log('[FingerprintSpoofer] Paranoid mode disabled');
  }
}

/**
 * Vérifier si le fingerprint est cohérent
 * (anti-détection)
 */
export function validateFingerprint(fp: BrowserFingerprint): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Vérifier la cohérence User-Agent / Platform
  if (fp.userAgent.includes('Windows') && fp.platform !== 'Win32') {
    issues.push('User-Agent says Windows but platform is not Win32');
  }
  if (fp.userAgent.includes('Mac') && fp.platform !== 'MacIntel') {
    issues.push('User-Agent says Mac but platform is not MacIntel');
  }
  if (fp.userAgent.includes('Linux') && !fp.platform.includes('Linux')) {
    issues.push('User-Agent says Linux but platform does not include Linux');
  }
  
  // Vérifier WebGL vendor cohérent avec OS
  if (fp.platform === 'MacIntel' && !fp.webgl.vendor.includes('Apple')) {
    // Pas forcément une erreur, mais suspect
  }
  
  // Vérifier viewport < screen
  if (fp.viewport.width > fp.screen.width || fp.viewport.height > fp.screen.height) {
    issues.push('Viewport larger than screen resolution');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

// Export par défaut
export default {
  generateFingerprint,
  getCurrentFingerprint,
  rotateFingerprint,
  getSpoofedHeaders,
  getAxiosConfig,
  generateConsistentProfile,
  setParanoidMode,
  validateFingerprint,
};
