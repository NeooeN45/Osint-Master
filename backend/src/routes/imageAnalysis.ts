/**
 * Image Analysis API Routes
 * Routes pour l'analyse d'images OSINT (EXIF, reverse search, métadonnées)
 */

import { Router, Request, Response } from "express";
import * as imageAnalysis from "../services/imageAnalysis";
import { logger } from "../utils/logger";
import { opsecManager } from "../services/opsecManager";

const router = Router();

// ============================================================================
// UPLOAD AND ANALYZE IMAGE
// ============================================================================

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { imageData, options = {} } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Decode base64 image
    const buffer = Buffer.from(imageData, "base64");

    logger.info(`[ImageAPI] Analyzing image (${buffer.length} bytes)`);

    // Analyze with OPSEC context
    const result = await imageAnalysis.analyzeImage(buffer, {
      extractEXIF: options.extractEXIF !== false,
      reverseSearch: options.reverseSearch || false,
      detectObjects: options.detectObjects || false,
      detectText: options.detectText || false
    });

    // Extract intelligence
    const intelligence = imageAnalysis.extractIntelligence(result);

    res.json({
      success: true,
      analysis: result,
      intelligence,
      summary: {
        hasLocation: !!result.location,
        hasEXIF: !!result.exif,
        hasGPS: !!(result.exif?.gpsLatitude && result.exif?.gpsLongitude),
        devicesFound: intelligence.devices.length,
        locationsFound: intelligence.locations.length,
        uniqueIdentifiers: intelligence.uniqueIdentifiers.length
      }
    });
  } catch (error: any) {
    logger.error("[ImageAPI] Analysis error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BATCH ANALYZE
// ============================================================================

router.post("/batch", async (req: Request, res: Response) => {
  try {
    const { images, options = {} } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    logger.info(`[ImageAPI] Batch analyzing ${images.length} images`);

    const imageBuffers = images.map((img: { id: string; data: string }) => ({
      id: img.id,
      buffer: Buffer.from(img.data, "base64")
    }));

    const results = await imageAnalysis.analyzeImages(imageBuffers, options);

    // Aggregate intelligence
    const allIntelligence = results
      .map((r) => imageAnalysis.extractIntelligence(r.result))
      .reduce(
        (acc, intel) => ({
          devices: [...acc.devices, ...intel.devices],
          locations: [...acc.locations, ...intel.locations],
          times: [...acc.times, ...intel.times],
          software: [...acc.software, ...intel.software],
          uniqueIdentifiers: [...acc.uniqueIdentifiers, ...intel.uniqueIdentifiers]
        }),
        {
          devices: [] as string[],
          locations: [] as Array<{ lat: number; lng: number; source: string }>,
          times: [] as string[],
          software: [] as string[],
          uniqueIdentifiers: [] as string[]
        }
      );

    res.json({
      success: true,
      results,
      aggregated: allIntelligence,
      stats: {
        total: results.length,
        withGPS: results.filter((r) => r.result.location).length,
        withEXIF: results.filter((r) => r.result.exif).length,
        uniqueLocations: new Set(allIntelligence.locations.map((l) => `${l.lat},${l.lng}`)).size
      }
    });
  } catch (error: any) {
    logger.error("[ImageAPI] Batch analysis error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// REVERSE IMAGE SEARCH
// ============================================================================

router.post("/reverse-search", async (req: Request, res: Response) => {
  try {
    const { imageUrl, engines = ["google", "yandex", "bing"] } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "No image URL provided" });
    }

    logger.info(`[ImageAPI] Reverse search for: ${imageUrl}`);

    // Enable OPSEC for search
    await opsecManager.setTorEnabled(true);

    const results = await imageAnalysis.reverseImageSearch(imageUrl, engines);

    res.json({
      success: true,
      results,
      matches: results.matches,
      enginesChecked: engines
    });
  } catch (error: any) {
    logger.error("[ImageAPI] Reverse search error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// EXTRACT EXIF ONLY
// ============================================================================

router.post("/exif", async (req: Request, res: Response) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const buffer = Buffer.from(imageData, "base64");
    const exif = await imageAnalysis.extractEXIF(buffer);

    if (!exif) {
      return res.json({ success: true, exif: null, message: "No EXIF data found" });
    }

    res.json({
      success: true,
      exif,
      hasGPS: !!(exif.gpsLatitude && exif.gpsLongitude),
      location: exif.gpsLatitude && exif.gpsLongitude
        ? {
            latitude: exif.gpsLatitude,
            longitude: exif.gpsLongitude,
            altitude: exif.gpsAltitude
          }
        : null
    });
  } catch (error: any) {
    logger.error("[ImageAPI] EXIF extraction error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMPARE IMAGES
// ============================================================================

router.post("/compare", async (req: Request, res: Response) => {
  try {
    const { imageData1, imageData2 } = req.body;

    if (!imageData1 || !imageData2) {
      return res.status(400).json({ error: "Two images required for comparison" });
    }

    const buffer1 = Buffer.from(imageData1, "base64");
    const buffer2 = Buffer.from(imageData2, "base64");

    const analysis1 = await imageAnalysis.analyzeImage(buffer1);
    const analysis2 = await imageAnalysis.analyzeImage(buffer2);

    // Calculate hash similarity
    const crypto = await import("crypto");
    const hash1 = crypto.createHash("sha256").update(buffer1).digest("hex");
    const hash2 = crypto.createHash("sha256").update(buffer2).digest("hex");
    const identical = hash1 === hash2;

    // Compare EXIF
    const sameDevice =
      analysis1.exif?.make === analysis2.exif?.make &&
      analysis1.exif?.model === analysis2.exif?.model;

    const sameLocation =
      analysis1.exif?.gpsLatitude === analysis2.exif?.gpsLatitude &&
      analysis1.exif?.gpsLongitude === analysis2.exif?.gpsLongitude;

    res.json({
      success: true,
      comparison: {
        identical,
        sameDevice,
        sameLocation,
        hash1: analysis1.hash.sha256,
        hash2: analysis2.hash.sha256,
        sizeDiff: Math.abs(buffer1.length - buffer2.length)
      },
      analysis1,
      analysis2
    });
  } catch (error: any) {
    logger.error("[ImageAPI] Comparison error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// STATUS
// ============================================================================

router.get("/status", (req: Request, res: Response) => {
  res.json({
    available: true,
    features: {
      exif: true,
      reverseSearch: true,
      hashCalculation: true,
      batchAnalysis: true,
      comparison: true
    },
    supportedFormats: ["JPEG", "PNG", "GIF", "WebP", "TIFF", "BMP"]
  });
});

export default router;
