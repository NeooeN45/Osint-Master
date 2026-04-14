// ============================================================================
// DEEP INVESTIGATION ROUTES - SSE Streaming
// ============================================================================

import { Router } from "express";
import express from "express";
import { deepEngine, detectTargetType } from "../services/deepEngine";

export const deepInvestigationRouter = Router();
const jsonParser = express.json({ limit: "50mb" });

// POST-based SSE test endpoint (debug)
deepInvestigationRouter.post("/stream-test", (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  if (res.socket) res.socket.setNoDelay(true);

  let i = 0;
  const iv = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "ping", id: `p${i}`, data: { n: i } })}\n\n`);
    i++;
    if (i >= 3) { clearInterval(iv); res.write("data: [DONE]\n\n"); res.end(); }
  }, 300);
  _req.on("close", () => clearInterval(iv));
});

// Quick SSE test endpoint (debug)
deepInvestigationRouter.get("/stream-test", (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let i = 0;
  const iv = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "ping", id: `t${i}`, timestamp: new Date().toISOString(), data: { n: i } })}\n\n`);
    i++;
    if (i >= 5) { clearInterval(iv); res.write("data: [DONE]\n\n"); res.end(); }
  }, 200);
  _req.on("close", () => clearInterval(iv));
});

// SSE Streaming investigation — NO express.json() middleware to avoid buffering
deepInvestigationRouter.post("/stream", async (req, res) => {
  // Manually parse JSON body since we skip express.json() for SSE
  let body: any = req.body;
  if (!body || Object.keys(body).length === 0) {
    body = await new Promise<any>((resolve) => {
      let raw = "";
      req.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
      req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });
  }
  const { target, config } = body;
  if (!target) return res.status(400).json({ error: "target required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Disable Nagle's algorithm to prevent buffering small SSE chunks
  if (res.socket) res.socket.setNoDelay(true);

  let closed = false;
  req.on("close", () => { closed = true; });

  try {
    for await (const event of deepEngine.investigate(target, config || {})) {
      if (closed) break;
      const chunk = `data: ${JSON.stringify(event)}\n\n`;
      res.write(chunk);
    }
  } catch (err: any) {
    if (!closed) {
      res.write(`data: ${JSON.stringify({ type: "error", id: "err", timestamp: new Date().toISOString(), data: { message: err.message } })}\n\n`);
    }
  }

  if (!closed) {
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// Non-streaming investigation (returns full result)
deepInvestigationRouter.post("/run", jsonParser, async (req, res) => {
  const { target, config } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });

  const events: any[] = [];
  let finalEvent: any = null;

  try {
    for await (const event of deepEngine.investigate(target, config || {})) {
      events.push(event);
      if (event.type === "complete") finalEvent = event;
    }
    res.json(finalEvent?.data || { events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get available modules
deepInvestigationRouter.get("/modules", (_req, res) => {
  res.json(deepEngine.getAvailableModules());
});

// Detect target type
deepInvestigationRouter.post("/detect", jsonParser, (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: "target required" });
  res.json({ target, type: detectTargetType(target) });
});
