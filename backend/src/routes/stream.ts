// ============================================================================
// Stream Routes - Server-Sent Events for real-time analysis progress
// ============================================================================

import { Router } from "express";
import { streamManager } from "../services/streamManager";
import { logger } from "../utils/logger";

export const streamRouter = Router();

// SSE endpoint for real-time analysis progress
streamRouter.get("/analysis/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  
  logger.info(`[STREAM] Client connected to session ${sessionId}`);
  
  // Send initial connection message
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ sessionId, status: "connected", timestamp: new Date().toISOString() })}\n\n`);
  
  // Subscribe to session events
  const unsubscribe = streamManager.subscribe(sessionId, (event) => {
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      
      // Flush to ensure immediate delivery (compression middleware)
      const resAny = res as any;
      if (resAny.flush) {
        resAny.flush();
      }
    } catch (error) {
      logger.error(`[STREAM] Error sending event:`, error);
      unsubscribe();
    }
  });
  
  // Handle client disconnect
  req.on("close", () => {
    logger.info(`[STREAM] Client disconnected from session ${sessionId}`);
    unsubscribe();
  });
  
  req.on("error", (err) => {
    logger.error(`[STREAM] Request error for session ${sessionId}:`, err);
    unsubscribe();
  });
});

// Get session status
streamRouter.get("/status/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = streamManager.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  res.json({
    id: session.id,
    target: session.target,
    targetType: session.targetType,
    status: session.status,
    progress: session.progress,
    currentTool: session.currentTool,
    itemsFound: session.itemsFound,
    totalTools: session.tools.length,
    completedTools: session.results.length,
    startTime: session.startTime,
    elapsedTime: Date.now() - session.startTime,
    tools: session.tools
  });
});

// Get all active sessions
streamRouter.get("/active", (_req, res) => {
  const sessions = streamManager.getActiveSessions();
  res.json({
    count: sessions.length,
    sessions: sessions.map(s => ({
      id: s.id,
      target: s.target,
      targetType: s.targetType,
      progress: s.progress,
      currentTool: s.currentTool,
      itemsFound: s.itemsFound,
      elapsedTime: Date.now() - s.startTime
    }))
  });
});

// Get session history (all events)
streamRouter.get("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = streamManager.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  res.json({
    id: session.id,
    target: session.target,
    events: session.events,
    results: session.results,
    status: session.status,
    itemsFound: session.itemsFound
  });
});

// WebSocket-like HTTP polling endpoint (fallback)
streamRouter.get("/poll/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const { lastEventId } = req.query;
  
  const session = streamManager.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  // Get events after the last seen event
  let events = session.events;
  if (lastEventId && typeof lastEventId === "string") {
    const lastIndex = session.events.findIndex(e => e.timestamp === lastEventId);
    if (lastIndex >= 0) {
      events = session.events.slice(lastIndex + 1);
    }
  }
  
  res.json({
    sessionId,
    status: session.status,
    progress: session.progress,
    currentTool: session.currentTool,
    itemsFound: session.itemsFound,
    events,
    lastEventId: session.events[session.events.length - 1]?.timestamp
  });
});

export default streamRouter;
