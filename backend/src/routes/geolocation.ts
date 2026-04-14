import { Router, type Request, type Response } from "express";
import { geolocationService } from "../services/geolocationService";
import { logger } from "../utils/logger";

const router = Router();

// POST /api/geolocate - Real geolocation without mock data
router.post("/geolocate", async (req: Request, res: Response) => {
  try {
    const { target, type } = req.body;

    if (!target) {
      return res.status(400).json({ error: "Target is required" });
    }

    logger.info(`Geolocating ${type}: ${target}`);

    let result;

    if (type === "ip") {
      // Real IP geolocation using available APIs
      result = await geolocationService.locateIP(target, {
        includeBuildings3d: false,
      });
    } else if (type === "phone") {
      // Real phone geolocation
      result = await geolocationService.locatePhone(target, {
        includeCellTowers: true,
        includeTriangulation: true,
      });
    } else {
      return res.status(400).json({ error: "Invalid type. Use 'ip' or 'phone'" });
    }

    // Return clean data without sensitive info
    const cleanResult = {
      target: result.target,
      lat: result.coordinates.latitude,
      lng: result.coordinates.longitude,
      accuracy: result.coordinates.accuracy,
      city: result.location.city,
      country: result.location.country,
      isp: result.network.isp,
      source: result.dataSources[0] || "Unknown",
      timestamp: result.timestamp,
    };

    res.json(cleanResult);
  } catch (error) {
    logger.error("Geolocation error:", error);
    res.status(500).json({
      error: "Geolocation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/geolocate/:ip - Quick IP lookup
router.get("/geolocate/:ip", async (req: Request, res: Response) => {
  try {
    const { ip } = req.params;
    
    logger.info(`Quick geolocate IP: ${ip}`);
    
    const result = await geolocationService.locateIP(ip);
    
    res.json({
      target: result.target,
      lat: result.coordinates.latitude,
      lng: result.coordinates.longitude,
      accuracy: result.coordinates.accuracy,
      city: result.location.city,
      country: result.location.country,
      isp: result.network.isp,
    });
  } catch (error) {
    logger.error("Quick geolocation error:", error);
    res.status(500).json({ error: "Failed to locate IP" });
  }
});

export default router;
