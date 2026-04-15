/**
 * Image Analysis Service - Analyse d'images OSINT
 * EXIF extraction, reverse image search, object detection
 */

import { logger } from "../utils/logger";
import { opsecManager } from "./opsecManager";

// ============================================================================
// TYPES
// ============================================================================

export interface EXIFData {
  make?: string;
  model?: string;
  dateTime?: string;
  dateTimeOriginal?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  software?: string;
  orientation?: number;
  resolution?: { x: number; y: number };
  flash?: boolean;
  focalLength?: number;
  iso?: number;
  aperture?: string;
  exposureTime?: string;
  lens?: string;
  thumbnail?: string;
  userComment?: string;
  copyright?: string;
  artist?: string;
}

export interface ImageAnalysisResult {
  hash: {
    md5: string;
    sha256: string;
    perceptual?: string;
  };
  exif: EXIFData | null;
  metadata: {
    format: string;
    size: { width: number; height: number };
    sizeBytes: number;
    colorSpace?: string;
    hasAlpha?: boolean;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: string;
    source: "gps" | "estimate" | "none";
  };
  reverseSearch?: {
    google?: string[];
    yandex?: string[];
    bing?: string[];
    tineye?: string[];
    matches: Array<{
      url: string;
      source: string;
      similarity?: number;
      foundAt?: string;
    }>;
  };
  analysis?: {
    objects?: Array<{ label: string; confidence: number; bbox?: number[] }>;
    faces?: number;
    text?: string[];
    nsfw?: { safe: number; adult: number; violence: number };
    landmarks?: Array<{ name: string; confidence: number; location?: { lat: number; lng: number } }>;
  };
  intelligence?: {
    cameraFingerprint?: string;
    editingSoftware?: string[];
    manipulationScore?: number;
    uniqueIdentifier?: string;
  };
}

// ============================================================================
// EXIF EXTRACTION
// ============================================================================

export async function extractEXIF(buffer: Buffer): Promise<EXIFData | null> {
  try {
    // Utiliser exiftool ou librairie Node.js pour extraire EXIF
    // Pour l'instant, simulation de l'extraction
    logger.info("[ImageAnalysis] Extracting EXIF data...");

    // Mock EXIF data (à remplacer par vraie extraction)
    const exif: EXIFData = {
      make: detectMakeFromBuffer(buffer),
      model: "Unknown",
      dateTime: new Date().toISOString(),
      software: "Image Analysis Service"
    };

    // Try to extract GPS if present
    const gps = extractGPSFromBuffer(buffer);
    if (gps) {
      exif.gpsLatitude = gps.lat;
      exif.gpsLongitude = gps.lng;
      exif.gpsAltitude = gps.alt;
    }

    return exif;
  } catch (error: any) {
    logger.error("[ImageAnalysis] EXIF extraction error:", error.message);
    return null;
  }
}

function detectMakeFromBuffer(buffer: Buffer): string | undefined {
  // Détection simple basée sur les signatures
  const signatures: Record<string, string> = {
    "494643": "Apple",
    "FFD8FF": "JPEG Generic",
    "89504E": "PNG",
    "474946": "GIF",
    "524946": "WebP",
    "255044": "PDF"
  };

  const header = buffer.slice(0, 6).toString("hex").toUpperCase();
  return signatures[header.substring(0, 6)];
}

function extractGPSFromBuffer(buffer: Buffer): { lat: number; lng: number; alt?: number } | null {
  // Recherche de patterns GPS dans le buffer
  // C'est une implémentation simplifiée
  return null;
}

// ============================================================================
// REVERSE IMAGE SEARCH
// ============================================================================

export async function reverseImageSearch(
  imageUrl: string,
  engines: string[] = ["google", "yandex", "bing"]
): Promise<ImageAnalysisResult["reverseSearch"]> {
  const results: ImageAnalysisResult["reverseSearch"] = {
    google: [],
    yandex: [],
    bing: [],
    tineye: [],
    matches: []
  };

  try {
    logger.info(`[ImageAnalysis] Reverse search for: ${imageUrl}`);

    // Utiliser OPSEC pour les requêtes
    const opsec = await opsecManager.prepareRequest("images.google.com", "reverse-image");

    for (const engine of engines) {
      try {
        const matches = await searchEngine(engine, imageUrl, opsec);
        (results as any)[engine] = matches.urls;
        results.matches.push(...matches.results);
      } catch (error: any) {
        logger.warn(`[ImageAnalysis] ${engine} search failed:`, error.message);
      }
    }

    return results;
  } catch (error: any) {
    logger.error("[ImageAnalysis] Reverse search error:", error.message);
    return results;
  }
}

async function searchEngine(
  engine: string,
  imageUrl: string,
  opsec: any
): Promise<{ urls: string[]; results: any[] }> {
  const urls: Record<string, string> = {
    google: `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageUrl)}`,
    yandex: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`,
    bing: `https://www.bing.com/images/search?q=imgurl:${encodeURIComponent(imageUrl)}`,
    tineye: `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`
  };

  // Note: Ces sites ont des protections anti-bot
  // En pratique, il faudrait utiliser des API payantes ou des solutions comme SerpAPI
  return {
    urls: [urls[engine]],
    results: []
  };
}

// ============================================================================
// IMAGE ANALYSIS COMPLETE
// ============================================================================

export async function analyzeImage(
  imageBuffer: Buffer,
  options: {
    extractEXIF?: boolean;
    reverseSearch?: boolean;
    detectObjects?: boolean;
    detectText?: boolean;
  } = {}
): Promise<ImageAnalysisResult> {
  const result: ImageAnalysisResult = {
    hash: {
      md5: "",
      sha256: ""
    },
    exif: null,
    metadata: {
      format: "unknown",
      size: { width: 0, height: 0 },
      sizeBytes: imageBuffer.length
    }
  };

  try {
    // Calculate hashes
    const crypto = await import("crypto");
    result.hash.md5 = crypto.createHash("md5").update(imageBuffer).digest("hex");
    result.hash.sha256 = crypto.createHash("sha256").update(imageBuffer).digest("hex");

    // Detect format and dimensions
    const format = detectImageFormat(imageBuffer);
    result.metadata.format = format;

    // Extract dimensions (simplified)
    const dims = extractDimensions(imageBuffer, format);
    if (dims) {
      result.metadata.size = dims;
    }

    // Extract EXIF
    if (options.extractEXIF !== false) {
      result.exif = await extractEXIF(imageBuffer);

      // Extract location from EXIF
      if (result.exif?.gpsLatitude && result.exif?.gpsLongitude) {
        result.location = {
          latitude: result.exif.gpsLatitude,
          longitude: result.exif.gpsLongitude,
          accuracy: "GPS EXIF",
          source: "gps"
        };
      }
    }

    logger.info(`[ImageAnalysis] Image analyzed: ${result.metadata.format} ${result.metadata.size.width}x${result.metadata.size.height}`);

    return result;
  } catch (error: any) {
    logger.error("[ImageAnalysis] Analysis error:", error.message);
    return result;
  }
}

function detectImageFormat(buffer: Buffer): string {
  const signatures = [
    { sig: [0xFF, 0xD8, 0xFF], format: "JPEG" },
    { sig: [0x89, 0x50, 0x4E, 0x47], format: "PNG" },
    { sig: [0x47, 0x49, 0x46], format: "GIF" },
    { sig: [0x52, 0x49, 0x46, 0x46], format: "WebP" },
    { sig: [0x42, 0x4D], format: "BMP" },
    { sig: [0x49, 0x49, 0x2A, 0x00], format: "TIFF" },
    { sig: [0x4D, 0x4D, 0x00, 0x2A], format: "TIFF" }
  ];

  for (const { sig, format } of signatures) {
    if (buffer.slice(0, sig.length).toString("hex") === Buffer.from(sig).toString("hex")) {
      return format;
    }
  }

  return "unknown";
}

function extractDimensions(buffer: Buffer, format: string): { width: number; height: number } | null {
  try {
    if (format === "JPEG") {
      // Parse JPEG SOF markers
      let offset = 2;
      while (offset < buffer.length) {
        const marker = buffer[offset];
        const length = buffer.readUInt16BE(offset + 1);

        if (marker === 0xC0 || marker === 0xC2) {
          return {
            height: buffer.readUInt16BE(offset + 4),
            width: buffer.readUInt16BE(offset + 6)
          };
        }

        offset += 2 + length;
      }
    } else if (format === "PNG") {
      // PNG dimensions in IHDR chunk
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
      };
    }
  } catch (error) {
    // Ignore extraction errors
  }

  return null;
}

// ============================================================================
// BATCH ANALYSIS
// ============================================================================

export async function analyzeImages(
  images: Array<{ id: string; buffer: Buffer }>,
  options?: any
): Promise<Array<{ id: string; result: ImageAnalysisResult }>> {
  logger.info(`[ImageAnalysis] Batch analyzing ${images.length} images...`);

  const results = await Promise.all(
    images.map(async ({ id, buffer }) => {
      try {
        const result = await analyzeImage(buffer, options);
        return { id, result };
      } catch (error: any) {
        logger.error(`[ImageAnalysis] Failed to analyze ${id}:`, error.message);
        return {
          id,
          result: {
            hash: { md5: "", sha256: "" },
            exif: null,
            metadata: { format: "unknown", size: { width: 0, height: 0 }, sizeBytes: buffer.length }
          }
        };
      }
    })
  );

  return results;
}

// ============================================================================
// INTELLIGENCE EXTRACTION
// ============================================================================

export function extractIntelligence(result: ImageAnalysisResult): {
  devices: string[];
  locations: Array<{ lat: number; lng: number; source: string }>;
  times: string[];
  software: string[];
  uniqueIdentifiers: string[];
} {
  const intelligence = {
    devices: [] as string[],
    locations: [] as Array<{ lat: number; lng: number; source: string }>,
    times: [] as string[],
    software: [] as string[],
    uniqueIdentifiers: [] as string[]
  };

  if (result.exif) {
    // Device
    if (result.exif.make && result.exif.model) {
      intelligence.devices.push(`${result.exif.make} ${result.exif.model}`);
    }

    // Location
    if (result.exif.gpsLatitude && result.exif.gpsLongitude) {
      intelligence.locations.push({
        lat: result.exif.gpsLatitude,
        lng: result.exif.gpsLongitude,
        source: "GPS EXIF"
      });
    }

    // Time
    if (result.exif.dateTimeOriginal) {
      intelligence.times.push(result.exif.dateTimeOriginal);
    }

    // Software
    if (result.exif.software) {
      intelligence.software.push(result.exif.software);
    }

    // Unique identifiers
    if (result.hash.sha256) {
      intelligence.uniqueIdentifiers.push(`sha256:${result.hash.sha256}`);
    }
  }

  return intelligence;
}
