// Social Media API Routes — connecté aux vrais moteurs
import { Router, type Request, type Response } from "express";
import { logger } from "../utils/logger";
import { instagramEngine } from "../services/instagramEngine";

const router = Router();

// POST /api/social/instagram/profile
router.post("/instagram/profile", async (req: Request, res: Response) => {
  try {
    const { username, fetchPosts, fetchStories } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    logger.info(`Instagram profile lookup: ${username}`);
    const modules = ["ig_profile", "ig_hikerapi", "ig_contact"];
    if (fetchPosts) modules.push("ig_geofence", "ig_hashtag");
    if (fetchStories) modules.push("ig_stories");

    const events: any[] = [];
    for await (const event of instagramEngine.investigate(username, { depth: "fast", modules })) {
      events.push(event);
    }
    const complete = events.find(e => e.type === "complete");
    res.json(complete?.data || { username, events });
  } catch (error) {
    logger.error("Instagram profile error:", error);
    res.status(500).json({ error: "Instagram lookup failed" });
  }
});

// GET /api/social/instagram/post/:shortcode
router.get("/instagram/post/:shortcode", async (req: Request, res: Response) => {
  try {
    const { shortcode } = req.params;
    logger.info(`Instagram post lookup: ${shortcode}`);
    
    res.status(503).json({
      error: "Instagram API not configured",
      message: "Instagram scraping service required"
    });
  } catch (error) {
    logger.error("Instagram post error:", error);
    res.status(500).json({ error: "Post lookup failed" });
  }
});

// GET /api/social/instagram/stories/:username
router.get("/instagram/stories/:username", async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    logger.info(`Instagram stories lookup: ${username}`);
    
    res.status(503).json({
      error: "Stories API not configured",
      message: "Real-time story monitoring requires Apify or similar service"
    });
  } catch (error) {
    logger.error("Instagram stories error:", error);
    res.status(500).json({ error: "Stories lookup failed" });
  }
});

// POST /api/social/twitter/profile
router.post("/twitter/profile", async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    logger.info(`Twitter profile lookup: ${username}`);

    // Would use Twitter API v2 or Nitter
    res.status(503).json({
      error: "Twitter API not configured",
      message: "Please configure Twitter API v2 or Nitter instance",
      requiredConfig: [
        "TWITTER_BEARER_TOKEN - for Twitter API v2",
        "NITTER_INSTANCE - for Nitter scraping"
      ]
    });
  } catch (error) {
    logger.error("Twitter profile error:", error);
    res.status(500).json({ error: "Twitter lookup failed" });
  }
});

// POST /api/social/facebook/profile
router.post("/facebook/profile", async (req: Request, res: Response) => {
  try {
    const { profileUrl } = req.body;
    
    if (!profileUrl) {
      return res.status(400).json({ error: "Profile URL required" });
    }

    logger.info(`Facebook profile lookup: ${profileUrl}`);

    res.status(503).json({
      error: "Facebook API not configured",
      message: "Facebook scraping requires specialized services",
      requiredConfig: [
        "FACEBOOK_GRAPH_TOKEN - for official Graph API (limited)",
        "APIFY_TOKEN - for Apify Facebook Scraper"
      ]
    });
  } catch (error) {
    logger.error("Facebook profile error:", error);
    res.status(500).json({ error: "Facebook lookup failed" });
  }
});

// POST /api/social/tiktok/profile
router.post("/tiktok/profile", async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    logger.info(`TikTok profile lookup: ${username}`);

    res.status(503).json({
      error: "TikTok API not configured",
      message: "TikTok scraping requires unofficial APIs or proxies",
      requiredConfig: [
        "TIKTOK_API_KEY - for unofficial TikTok API",
        "APIFY_TOKEN - for Apify TikTok Scraper"
      ]
    });
  } catch (error) {
    logger.error("TikTok profile error:", error);
    res.status(500).json({ error: "TikTok lookup failed" });
  }
});

// POST /api/social/cross-platform
router.post("/cross-platform", async (req: Request, res: Response) => {
  try {
    const { identifier, platforms } = req.body;
    
    if (!identifier || !platforms) {
      return res.status(400).json({ error: "Identifier and platforms required" });
    }

    logger.info(`Cross-platform search: ${identifier} on ${platforms.join(", ")}`);

    // Would run parallel searches and correlate results
    res.status(503).json({
      error: "Cross-platform service not configured",
      message: "Cross-platform matching requires all individual platform APIs"
    });
  } catch (error) {
    logger.error("Cross-platform error:", error);
    res.status(500).json({ error: "Cross-platform search failed" });
  }
});

// GET /api/social/status
router.get("/status", async (_req: Request, res: Response) => {
  // Return API availability status
  res.json({
    instagram: !!process.env.APIFY_TOKEN || !!process.env.SCRAPINGBEE_API_KEY,
    twitter: !!process.env.TWITTER_BEARER_TOKEN,
    facebook: !!process.env.FACEBOOK_GRAPH_TOKEN,
    tiktok: !!process.env.TIKTOK_API_KEY,
    timestamp: new Date().toISOString()
  });
});

export default router;
