// ============================================================================
// OSINT MASTER PRO - MAIN SERVER
// Professional OSINT Intelligence Platform with Ollama AI
// ============================================================================

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ollamaRouter } from "./routes/ollama";
import { osintRouter } from "./routes/osint";
import { investigationRouter } from "./routes/investigation";
import { webSearchRouter } from "./routes/websearch";
import { correlationEngine } from "./services/correlationEngine";
import { osintEngine } from "./services/osintEngine";
import { orchestratorRouter } from "./routes/orchestrator";
import { premiumRouter } from "./routes/premium";
import imageRouter from "./routes/imageAnalysis";
import toolsRouter from "./routes/tools";
import { streamRouter } from "./routes/stream";
import { intelligenceRouter } from "./routes/intelligence";
import { autoInvestigationRouter } from "./routes/autoInvestigation";
import { deepInvestigationRouter } from "./routes/deepInvestigation";
import { deepEngine } from "./services/deepEngine";
import { deepInvestigationV2Router } from "./routes/deepInvestigationV2";
import { deepEngineV2 } from "./services/DeepEngineV2";
import { configRouter } from "./routes/config";
import { dorksRouter } from "./routes/dorks";
import { instagramRouter } from "./routes/instagram";
import modulesRouter from "./routes/modules";
import { debugRouter, recordRequest, recordError } from "./routes/debug";
import { moduleInstallerRouter } from "./routes/moduleInstaller";

const PORT = process.env.PORT || 3002;
const app = express();

// Request tracking middleware (skip SSE streams to avoid double-counting)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (!req.path.includes("/stream") && !req.path.includes("/investigate")) {
      recordRequest(req.method, req.path, res.statusCode, Date.now() - start);
    }
  });
  next();
});

// Register SSE streaming routes BEFORE helmet/json middleware to prevent buffering
// Only cors is applied; JSON body is parsed inside the route handler
app.use("/api/deep", cors({ origin: true, credentials: true }), deepInvestigationRouter);
app.use("/api/deep-v2", cors({ origin: true, credentials: true }), deepInvestigationV2Router);
app.use("/api/instagram", cors({ origin: true, credentials: true }), instagramRouter);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));

// ---- Root & Health ----
app.get("/", (_req, res) => {
  res.json({
    name: "OSINT Master Pro API",
    version: "3.0.0",
    status: "running",
    ollama: process.env.OLLAMA_URL || "http://localhost:11434",
    modules: {
      ai: true,
      osint: true,
      correlation: true,
      investigation: true,
      streaming: true,
      deepV2: true,
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

// ---- Routes ----
app.use("/api/ai", ollamaRouter);
app.use("/api/osint", osintRouter);
app.use("/api/investigation", investigationRouter);
app.use("/api/websearch", webSearchRouter);
app.use("/api/orchestrator", orchestratorRouter);
app.use("/api/premium", premiumRouter);
app.use("/api/image", imageRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/stream", streamRouter);
app.use("/api/intelligence", intelligenceRouter);
app.use("/api/auto-investigation", autoInvestigationRouter);
// deep routes registered above middleware
// deepInvestigationV2Router already mounted above (SSE-safe, before helmet)
app.use("/api/config", configRouter);
app.use("/api/dorks", dorksRouter);
app.use("/api/modules", modulesRouter);
app.use("/api/debug", debugRouter);
app.use("/api/installer", moduleInstallerRouter);

// ---- Error handling ----
app.use((err: any, req: any, res: any, _next: any) => {
  console.error("[ERROR]", err.message);
  recordError(err.message, err.stack, req.path, { method: req.method, body: req.body });
  res.status(500).json({ error: err.message });
});

// ---- Start ----
app.listen(PORT, async () => {
  console.log(`\n  OSINT Master Pro API`);
  console.log(`  http://localhost:${PORT}\n`);
  correlationEngine.init();
  await osintEngine.init();
  await deepEngine.init();
  await deepEngineV2.init();
});
