// ============================================================================
// INSTAGRAM OSINT ROUTES
// POST /api/instagram/investigate  → SSE streaming (moteur complet)
// GET  /api/instagram/profile/:u   → profil rapide JSON
// POST /api/instagram/network      → analyse réseau
// POST /api/instagram/geofence     → carte GPS
// GET  /api/instagram/modules      → liste des modules
// ============================================================================

import { Router } from "express";
import express from "express";
import { instagramEngine } from "../services/instagramEngine";

export const instagramRouter = Router();
const jsonParser = express.json({ limit: "10mb" });

// ── SSE : investigation complète streaming ──────────────────────────────────
instagramRouter.post("/investigate", async (req, res) => {
  // Parse body manuellement (SSE : pas de express.json() ici)
  let body: any = req.body;
  if (!body || Object.keys(body).length === 0) {
    body = await new Promise<any>((resolve) => {
      let raw = "";
      req.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
      req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });
  }

  const { username, modules, depth } = body;
  if (!username) return res.status(400).json({ error: "username required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  if (res.socket) res.socket.setNoDelay(true);

  let closed = false;
  req.on("close", () => { closed = true; });

  try {
    for await (const event of instagramEngine.investigate(username, { modules, depth })) {
      if (closed) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (err: any) {
    if (!closed) {
      res.write(`data: ${JSON.stringify({ type: "error", data: { message: err.message } })}\n\n`);
    }
  }

  if (!closed) {
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// ── GET : profil rapide (non-streaming) ────────────────────────────────────
instagramRouter.get("/profile/:username", jsonParser, async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).json({ error: "username required" });

  try {
    const events: any[] = [];
    for await (const event of instagramEngine.investigate(username, { depth: "fast", modules: ["ig_profile", "ig_hikerapi", "ig_contact"] })) {
      events.push(event);
    }
    const complete = events.find(e => e.type === "complete");
    res.json(complete?.data || { username, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST : réseau (non-streaming) ──────────────────────────────────────────
instagramRouter.post("/network", jsonParser, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });

  try {
    const events: any[] = [];
    for await (const event of instagramEngine.investigate(username, { modules: ["ig_network"] })) {
      events.push(event);
    }
    const complete = events.find(e => e.type === "complete");
    res.json(complete?.data || { username, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST : géofencing (non-streaming) ─────────────────────────────────────
instagramRouter.post("/geofence", jsonParser, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });

  try {
    const events: any[] = [];
    for await (const event of instagramEngine.investigate(username, { modules: ["ig_geofence"] })) {
      events.push(event);
    }
    const complete = events.find(e => e.type === "complete");
    res.json(complete?.data || { username, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST : cross-platform (non-streaming) ─────────────────────────────────
instagramRouter.post("/cross-platform", jsonParser, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });

  try {
    const events: any[] = [];
    for await (const event of instagramEngine.investigate(username, { modules: ["ig_cross_platform"] })) {
      events.push(event);
    }
    const complete = events.find(e => e.type === "complete");
    res.json(complete?.data || { username, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET : liste des modules disponibles ───────────────────────────────────
instagramRouter.get("/modules", (_req, res) => {
  res.json(instagramEngine.getModules());
});
