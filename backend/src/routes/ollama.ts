// ============================================================================
// OLLAMA AI ROUTES
// ============================================================================

import { Router } from "express";
import { ollamaService } from "../services/ollamaService";

export const ollamaRouter = Router();

// Check Ollama status
ollamaRouter.get("/status", async (_req, res) => {
  const available = await ollamaService.isAvailable();
  const models = available ? await ollamaService.listModels() : [];
  res.json({ available, models, url: process.env.OLLAMA_URL || "http://localhost:11434" });
});

// List models
ollamaRouter.get("/models", async (_req, res) => {
  const models = await ollamaService.listModels();
  res.json({ models });
});

// Chat
ollamaRouter.post("/chat", async (req, res) => {
  const { messages, model } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }
  try {
    const result = await ollamaService.chat(messages, model);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stream chat
ollamaRouter.post("/chat/stream", async (req, res) => {
  const { messages, model } = req.body;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of ollamaService.chatStream(messages, model)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Analyze OSINT data
ollamaRouter.post("/analyze", async (req, res) => {
  const { data, context } = req.body;
  try {
    const analysis = await ollamaService.analyzeOSINT(data, context || "OSINT Investigation");
    res.json({ analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate investigation plan
ollamaRouter.post("/plan", async (req, res) => {
  const { target, targetType, knownInfo } = req.body;
  try {
    const plan = await ollamaService.generateInvestigationPlan(target, targetType, knownInfo || "");
    res.json({ plan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Correlate findings
ollamaRouter.post("/correlate", async (req, res) => {
  const { findings } = req.body;
  try {
    const correlation = await ollamaService.correlateFindings(findings);
    res.json({ correlation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pull a new model
ollamaRouter.post("/pull", async (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: "model name required" });
  try {
    const axios = (await import("axios")).default;
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    await axios.post(`${ollamaUrl}/api/pull`, { name: model, stream: false }, { timeout: 600000 });
    res.json({ success: true, message: `Model ${model} pulled successfully` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Server logs (in-memory ring buffer)
const logBuffer: { timestamp: string; level: string; message: string; data?: any }[] = [];
const MAX_LOGS = 200;
export function addLog(level: string, message: string, data?: any) {
  logBuffer.push({ timestamp: new Date().toISOString(), level, message, data });
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
}

ollamaRouter.get("/logs", (_req, res) => {
  res.json({ logs: logBuffer, count: logBuffer.length });
});
