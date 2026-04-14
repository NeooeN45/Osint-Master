// ============================================================================
// OSINT MASTER PRO v4.0 - UNIFIED INTELLIGENCE PLATFORM
// Single search page with streaming results, live entity discovery
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import {
  Search, Send, Settings, ChevronRight, ChevronDown,
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  User, Mail, Phone, Globe, Wifi, Image, Database,
  Layers, Zap, Target,
  Link2, Eye, Network, Hash, MapPin,
  Copy, Download, RefreshCw, X,
  Sparkles, BrainCircuit, Radar, Cpu,
  Shield, Activity, ChevronUp,
  SlidersHorizontal,
  ExternalLink, GitBranch,
  Crosshair, Scan, Radio, Play, Square, Clock, MinusCircle
} from "lucide-react";
import { ai as aiAPI } from "../lib/api";
import SettingsModal from "../components/SettingsModal";
import LocationMap from "../components/LocationMap";
import MediaGallery from "../components/MediaGallery";

// ---- Types ----
const API_BASE = "http://localhost:3002/api";

interface StreamEvent {
  type: "phase" | "tool_start" | "tool_done" | "entity_found" | "correlation" | "ai_analysis" | "recursive_launch" | "progress" | "complete" | "error" | "log";
  id: string;
  timestamp: string;
  data: any;
}

interface DeepEntity {
  id: string;
  type: string;
  value: string;
  source: string;
  confidence: number;
  metadata: Record<string, any>;
  verified: boolean;
  depth: number;
}

interface DeepCorrelation {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
  evidence: string;
}

interface InvestigationConfig {
  maxDepth: number;
  maxEntities: number;
  timeoutMs: number;
  enableAI: boolean;
  enableWebSearch: boolean;
  enableRecursive: boolean;
  recursiveThreshold: number;
  selectedModules: string[];
}

interface ToolProgress {
  toolId: string;
  name: string;
  status: "running" | "done" | "error";
  duration?: number;
  entitiesFound?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

// ---- Icon Map ----
const typeIcons: Record<string, any> = {
  username: User, email: Mail, phone: Phone, domain: Globe,
  ip: Wifi, ipv6: Wifi, url: Link2, image: Image, social: User,
  person: User, organization: Database, location: MapPin,
  social_profile: Eye, technology: Cpu, service: Zap,
  breach: Shield, vulnerability: AlertTriangle, unknown: Hash,
};

const typeColors: Record<string, string> = {
  username: "text-violet-400", email: "text-blue-400", phone: "text-green-400",
  domain: "text-cyan-400", ip: "text-orange-400", url: "text-zinc-400",
  person: "text-pink-400", organization: "text-amber-400", location: "text-emerald-400",
  social_profile: "text-indigo-400", technology: "text-teal-400", service: "text-sky-400",
  breach: "text-red-400", vulnerability: "text-red-500", image: "text-purple-400",
};

const typeBgColors: Record<string, string> = {
  username: "bg-violet-500/10 border-violet-500/20", email: "bg-blue-500/10 border-blue-500/20",
  phone: "bg-green-500/10 border-green-500/20", domain: "bg-cyan-500/10 border-cyan-500/20",
  ip: "bg-orange-500/10 border-orange-500/20", url: "bg-zinc-500/10 border-zinc-500/20",
  person: "bg-pink-500/10 border-pink-500/20", organization: "bg-amber-500/10 border-amber-500/20",
  location: "bg-emerald-500/10 border-emerald-500/20", social_profile: "bg-indigo-500/10 border-indigo-500/20",
  technology: "bg-teal-500/10 border-teal-500/20", service: "bg-sky-500/10 border-sky-500/20",
  breach: "bg-red-500/10 border-red-500/20", vulnerability: "bg-red-500/10 border-red-500/20",
};

const DEFAULT_CONFIG: InvestigationConfig = {
  maxDepth: 2, maxEntities: 500, timeoutMs: 300000,
  enableAI: true, enableWebSearch: true, enableRecursive: true,
  recursiveThreshold: 70, selectedModules: [],
};

function detectType(t: string): string {
  if (t.match(/^[\w.+-]+@[\w-]+\.[\w.]+$/)) return "email";
  if (t.match(/^\+?[\d\s()-]{7,}$/)) return "phone";
  if (t.match(/^(\d{1,3}\.){3}\d{1,3}$/)) return "ip";
  if (t.match(/^https?:\/\//)) return "url";
  if (t.match(/^[\w-]+\.[\w.]{2,}$/)) return "domain";
  if (t.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/)) return "person";
  return "username";
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function OsintApp() {
  // ---- Core State ----
  const [target, setTarget] = useState("");
  const [investigating, setInvestigating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [config, setConfig] = useState<InvestigationConfig>({ ...DEFAULT_CONFIG });
  const [showConfig, setShowConfig] = useState(false);

  // ---- Streaming State ----
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [entities, setEntities] = useState<DeepEntity[]>([]);
  const [correlations, setCorrelations] = useState<DeepCorrelation[]>([]);
  const [toolMap, setToolMap] = useState<Record<string, ToolProgress>>({});
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [finalStats, setFinalStats] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);

  // ---- UI State ----
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] } | null>(null);
  const [selectedModel, setSelectedModel] = useState("dolphin-mistral:latest");
  const [searchHistory, setSearchHistory] = useState<{ target: string; type: string; time: string }[]>([]);
  const [entityFilter, setEntityFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [uiSettings, setUiSettings] = useState<{ accentColor: string }>(() => {
    try { const s = localStorage.getItem("osint_ui_v4"); return s ? JSON.parse(s) : { accentColor: "violet" }; } catch { return { accentColor: "violet" }; }
  });

  const feedRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => { localStorage.setItem("osint_ui_v4", JSON.stringify(uiSettings)); }, [uiSettings]);

  // ---- Init ----
  useEffect(() => {
    aiAPI.status().then((s: any) => {
      setOllamaStatus(s);
      if (s.available && s.models.length > 0) setSelectedModel(s.models[0]);
    }).catch(() => setOllamaStatus({ available: false, models: [] }));
  }, []);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [events]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ---- Derived Data ----
  const detectedType = target ? detectType(target) : null;
  const TypeIcon = detectedType ? typeIcons[detectedType] || Search : Search;

  const entityTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entities) { counts[e.type] = (counts[e.type] || 0) + 1; }
    return counts;
  }, [entities]);

  const filteredEntities = useMemo(() => {
    let filtered = entities;
    if (entityTypeFilter) filtered = filtered.filter(e => e.type === entityTypeFilter);
    if (entityFilter) filtered = filtered.filter(e =>
      e.value.toLowerCase().includes(entityFilter.toLowerCase()) ||
      e.source.toLowerCase().includes(entityFilter.toLowerCase())
    );
    return filtered;
  }, [entities, entityFilter, entityTypeFilter]);

  const toolList = useMemo(() => Object.values(toolMap).sort((a, b) => {
    if (a.status === "running" && b.status !== "running") return -1;
    if (b.status === "running" && a.status !== "running") return 1;
    return 0;
  }), [toolMap]);

  // ---- Investigation: SSE Streaming ----
  const startInvestigation = useCallback(async () => {
    if (!target.trim() || investigating) return;

    // Reset state
    setInvestigating(true);
    setCompleted(false);
    setEvents([]);
    setEntities([]);
    setCorrelations([]);
    setToolMap({});
    setProgress(0);
    setCurrentPhase("Initializing...");
    setAiAnalysis("");
    setFinalStats(null);
    setElapsed(0);
    startTimeRef.current = Date.now();

    // Timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 100);

    // Add to history
    const type = detectType(target);
    setSearchHistory(prev => [
      { target, type, time: new Date().toISOString() },
      ...prev.filter(h => h.target !== target).slice(0, 19)
    ]);

    // Abort controller
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const resp = await fetch(`${API_BASE}/deep/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, config }),
        signal: abort.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const event: StreamEvent = JSON.parse(payload);
              processEvent(event);
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error(`Investigation failed: ${err.message}`);
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setInvestigating(false);
    setCompleted(true);
    setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
  }, [target, investigating, config]);

  const stopInvestigation = useCallback(() => {
    abortRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
    setInvestigating(false);
    setCompleted(true);
  }, []);

  const processEvent = useCallback((event: StreamEvent) => {
    setEvents(prev => [...prev, event]);

    switch (event.type) {
      case "phase":
        setCurrentPhase(event.data.message || event.data.phase || "");
        break;

      case "tool_start":
        setToolMap(prev => ({
          ...prev,
          [event.data.toolId]: {
            toolId: event.data.toolId,
            name: event.data.name || event.data.toolId,
            status: "running",
          },
        }));
        if (event.data.progress !== undefined) setProgress(event.data.progress);
        break;

      case "tool_done":
        setToolMap(prev => ({
          ...prev,
          [event.data.toolId]: {
            ...prev[event.data.toolId],
            toolId: event.data.toolId,
            name: event.data.name || event.data.toolId,
            status: event.data.success ? "done" : "error",
            duration: event.data.duration,
            entitiesFound: event.data.entitiesFound,
          },
        }));
        if (event.data.progress !== undefined) setProgress(event.data.progress);
        break;

      case "entity_found":
        if (event.data.entity) {
          setEntities(prev => {
            const exists = prev.some(e => e.type === event.data.entity.type && e.value === event.data.entity.value);
            if (exists) return prev;
            return [...prev, event.data.entity];
          });
        }
        break;

      case "correlation":
        if (event.data.correlation) {
          setCorrelations(prev => [...prev, event.data.correlation]);
        }
        break;

      case "ai_analysis":
        setAiAnalysis(event.data.analysis || "");
        break;

      case "recursive_launch":
        toast.info(`Recursive: ${event.data.entity?.type} "${event.data.entity?.value}"`, { duration: 3000 });
        break;

      case "complete":
        setProgress(100);
        setFinalStats(event.data.stats);
        setCurrentPhase("Complete");
        toast.success(`Found ${event.data.stats?.entities || 0} entities in ${(event.data.duration / 1000).toFixed(1)}s`);
        break;

      case "error":
        toast.error(event.data.message || "Error");
        break;
    }
  }, []);

  // ---- AI Chat ----
  const handleChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: chatInput, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const entitySummary = entities.slice(0, 50).map(e => `- [${e.type}] ${e.value} (${e.source}, ${e.confidence}%)`).join("\n");
      const corrSummary = correlations.slice(0, 20).map(c => {
        const from = entities.find(e => e.id === c.from);
        const to = entities.find(e => e.id === c.to);
        return `- ${from?.value || "?"} <-> ${to?.value || "?"} (${c.type})`;
      }).join("\n");
      const systemContent = `Tu es un analyste OSINT expert. Tu analyses des donnees de renseignement et produis des analyses precises. Reponds en francais.
${entities.length > 0 ? `\n=== INVESTIGATION: ${target} ===\nEntites (${entities.length}):\n${entitySummary}\n\nCorrelations (${correlations.length}):\n${corrSummary}\n\n${aiAnalysis ? `Analyse IA:\n${aiAnalysis}` : ""}` : ""}`;
      const messages = [
        { role: "system" as const, content: systemContent },
        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: chatInput },
      ];
      const response = await aiAPI.chat(messages, selectedModel);
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: response.content, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `Erreur: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading, chatMessages, entities, correlations, aiAnalysis, target, selectedModel]);

  const resetInvestigation = () => {
    setTarget("");
    setInvestigating(false);
    setCompleted(false);
    setEvents([]);
    setEntities([]);
    setCorrelations([]);
    setToolMap({});
    setProgress(0);
    setCurrentPhase("");
    setAiAnalysis("");
    setFinalStats(null);
    setElapsed(0);
  };

  // ---- Has Results ----
  const hasResults = entities.length > 0 || investigating || completed;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="h-screen w-screen bg-[#08080a] text-zinc-100 flex flex-col overflow-hidden font-sans" data-accent={uiSettings.accentColor}>
      <Toaster position="top-right" theme="dark" richColors />

      {/* ===== TOP BAR ===== */}
      <header className="h-12 border-b border-zinc-800/40 flex items-center px-4 gap-3 flex-shrink-0 bg-[#0a0a0c]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-cyan-500 flex items-center justify-center shadow-lg shadow-accent/20">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">OSINT Master</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-bold tracking-wider">v4</span>
        </div>

        <div className="h-5 w-px bg-zinc-800/60 mx-1" />

        {/* Status indicators */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${ollamaStatus?.available ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-red-400"}`} />
            <span>AI {ollamaStatus?.available ? "ON" : "OFF"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            <span>:3002</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Live stats when investigating */}
        {hasResults && (
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {entities.length} <span className="text-zinc-600">entities</span>
            </span>
            <span className="flex items-center gap-1.5 text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {correlations.length} <span className="text-zinc-600">links</span>
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              {Object.keys(toolMap).length} <span className="text-zinc-600">tools</span>
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Clock className="w-3 h-3" />
              {elapsed}s
            </span>
          </div>
        )}

        {/* Settings */}
        <div className="flex items-center gap-1">
          {ollamaStatus?.available && (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400 outline-none"
            >
              {ollamaStatus.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <div className="flex gap-0.5 ml-2">
            {["violet", "cyan", "emerald", "rose", "blue"].map(c => (
              <button
                key={c}
                onClick={() => setUiSettings({ accentColor: c })}
                className={`w-4 h-4 rounded-full border-2 transition-all ${uiSettings.accentColor === c ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-80"}`}
                style={{ backgroundColor: { violet: "#8b5cf6", cyan: "#06b6d4", emerald: "#10b981", rose: "#f43f5e", blue: "#3b82f6" }[c] }}
              />
            ))}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            title="API Keys & Config"
            className="ml-2 p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all border border-transparent hover:border-cyan-400/20"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showMap && <LocationMap entities={entities} onClose={() => setShowMap(false)} />}
      {showGallery && <MediaGallery entities={entities} target={target} onClose={() => setShowGallery(false)} />}

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {!hasResults ? (
            // ============================================================
            // SEARCH PAGE (no results yet)
            // ============================================================
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center px-6"
            >
              {/* Logo */}
              <div className="mb-10 text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-2xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/30 via-accent/10 to-transparent border border-accent/20 flex items-center justify-center shadow-2xl">
                    <Radar className="w-10 h-10 text-accent" />
                  </div>
                </div>
                <h1 className="text-4xl font-black tracking-tight bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                  OSINT Master
                </h1>
                <div className="mt-1 text-[10px] font-bold tracking-[0.3em] uppercase text-accent/50">Deep Intelligence Platform</div>
                <p className="mt-3 text-xs text-zinc-500 max-w-lg mx-auto">
                  Enter any target — username, email, phone, IP, domain, person name — to launch a deep autonomous OSINT investigation with AI-powered correlation and recursive analysis.
                </p>
              </div>

              {/* Search Bar */}
              <div className="w-full max-w-2xl">
                <div className="relative group">
                  <div className="absolute inset-0 rounded-2xl bg-accent/10 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                  <div className="relative flex items-center bg-zinc-900/90 border border-zinc-800/80 rounded-2xl overflow-hidden focus-within:border-accent/50 focus-within:shadow-lg focus-within:shadow-accent/5 transition-all duration-300 shadow-2xl shadow-black/40">
                    <div className="pl-5 pr-2 text-zinc-500">
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <input
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && startInvestigation()}
                      placeholder="username, email@example.com, +33612345678, example.com, 8.8.8.8, John Doe..."
                      className="flex-1 bg-transparent py-4 px-2 text-sm text-white placeholder:text-zinc-600 outline-none"
                      autoFocus
                    />
                    {detectedType && (
                      <span className="px-2.5 py-1 mr-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg bg-accent/10 text-accent/80 border border-accent/20">
                        {detectedType}
                      </span>
                    )}
                    <button
                      onClick={startInvestigation}
                      disabled={!target.trim()}
                      className="m-2 px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-accent/25"
                    >
                      <Scan className="w-4 h-4" />
                      Investigate
                    </button>
                  </div>
                </div>

                {/* Quick examples */}
                <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                  {["john_doe", "test@gmail.com", "+33612345678", "example.com", "8.8.8.8", "Elon Musk"].map(ex => (
                    <button
                      key={ex}
                      onClick={() => setTarget(ex)}
                      className="px-3 py-1 text-[11px] text-zinc-500 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800/40 hover:border-zinc-700/60 rounded-lg transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                {/* Config toggle */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="flex items-center gap-2 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Advanced Configuration
                    {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Config Panel */}
                <AnimatePresence>
                  {showConfig && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-5 bg-zinc-900/60 border border-zinc-800/50 rounded-xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Max Depth</label>
                            <input type="range" min={0} max={5} value={config.maxDepth}
                              onChange={e => setConfig(c => ({ ...c, maxDepth: parseInt(e.target.value) }))}
                              className="w-full mt-1 accent-accent" />
                            <span className="text-xs text-zinc-400">{config.maxDepth} levels</span>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Recursive Threshold</label>
                            <input type="range" min={30} max={100} value={config.recursiveThreshold}
                              onChange={e => setConfig(c => ({ ...c, recursiveThreshold: parseInt(e.target.value) }))}
                              className="w-full mt-1 accent-accent" />
                            <span className="text-xs text-zinc-400">{config.recursiveThreshold}% confidence</span>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Max Entities</label>
                            <input type="number" min={50} max={5000} value={config.maxEntities}
                              onChange={e => setConfig(c => ({ ...c, maxEntities: parseInt(e.target.value) }))}
                              className="w-full mt-1 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs text-white outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Timeout (sec)</label>
                            <input type="number" min={30} max={600} value={config.timeoutMs / 1000}
                              onChange={e => setConfig(c => ({ ...c, timeoutMs: parseInt(e.target.value) * 1000 }))}
                              className="w-full mt-1 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs text-white outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          {[
                            { key: "enableAI", label: "AI Analysis" },
                            { key: "enableWebSearch", label: "Web Search" },
                            { key: "enableRecursive", label: "Recursive" },
                          ].map(opt => (
                            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={(config as any)[opt.key]}
                                onChange={e => setConfig(c => ({ ...c, [opt.key]: e.target.checked }))}
                                className="rounded accent-accent" />
                              <span className="text-xs text-zinc-400">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Recent searches */}
                {searchHistory.length > 0 && (
                  <div className="mt-6">
                    <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Recent Searches</div>
                    <div className="flex flex-wrap gap-1.5">
                      {searchHistory.slice(0, 8).map((h, i) => {
                        const Icon = typeIcons[h.type] || Search;
                        return (
                          <button
                            key={i}
                            onClick={() => setTarget(h.target)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/30 rounded-lg transition-all"
                          >
                            <Icon className="w-3 h-3" />
                            {h.target}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Feature badges */}
                <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-zinc-600">
                  <div className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" /> 25+ OSINT modules
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" /> Auto-recursive
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5" /> AI correlation
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" /> Live streaming
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            // ============================================================
            // RESULTS PAGE (streaming + completed)
            // ============================================================
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* ---- LEFT: Live Feed + Tools ---- */}
              <div className="w-80 border-r border-zinc-800/40 flex flex-col flex-shrink-0 bg-[#0a0a0c]/50">
                {/* Target header */}
                <div className="p-3 border-b border-zinc-800/40">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold truncate flex-1">{target}</span>
                    <button onClick={resetInvestigation} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-accent/10 text-accent/80">{detectedType}</span>
                    {investigating ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Running...
                      </span>
                    ) : completed ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    ) : null}
                    {investigating && (
                      <button onClick={stopInvestigation} className="ml-auto text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1">
                        <Square className="w-3 h-3" /> Stop
                      </button>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-accent to-cyan-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="mt-1 text-[9px] text-zinc-600 truncate">{currentPhase}</div>
                </div>

                {/* Tools progress */}
                <div className="flex-shrink-0 max-h-48 overflow-y-auto border-b border-zinc-800/40">
                  <div className="p-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-wider px-3">
                    Tools ({toolList.length})
                  </div>
                  {toolList.map(tool => (
                    <div key={tool.toolId} className="flex items-center gap-2 px-3 py-1 text-[11px]">
                      {tool.status === "running" ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400 flex-shrink-0" />
                      ) : tool.status === "done" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                      )}
                      <span className={`flex-1 truncate ${tool.status === "running" ? "text-zinc-200" : "text-zinc-500"}`}>
                        {tool.name}
                      </span>
                      {tool.entitiesFound !== undefined && tool.entitiesFound > 0 && (
                        <span className="text-[9px] text-emerald-400/70">+{tool.entitiesFound}</span>
                      )}
                      {tool.duration !== undefined && (
                        <span className="text-[9px] text-zinc-600">{(tool.duration / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Live event feed */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-wider px-3 flex items-center gap-1.5">
                    <Radio className="w-3 h-3" />
                    Live Feed ({events.length})
                  </div>
                  <div ref={feedRef} className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
                    {events.slice(-100).map((ev) => (
                      <EventLine key={ev.id} event={ev} />
                    ))}
                  </div>
                </div>

                {/* New search */}
                <div className="p-2 border-t border-zinc-800/40">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={target}
                      onChange={e => setTarget(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && startInvestigation()}
                      placeholder="New target..."
                      className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-zinc-600 outline-none focus:border-accent/40"
                    />
                    <button
                      onClick={investigating ? stopInvestigation : startInvestigation}
                      disabled={!target.trim() && !investigating}
                      className="px-2.5 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-30"
                    >
                      {investigating ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ---- CENTER: Entities ---- */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Entity stats bar */}
                <div className="flex-shrink-0 border-b border-zinc-800/40 bg-[#0a0a0c]/30">
                  <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
                    {entities.filter(e => e.type === "location" || e.type === "ip").length > 0 && (
                      <button
                        onClick={() => setShowMap(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all flex-shrink-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                        title="Voir les localisations sur la carte"
                      >
                        <MapPin className="w-3 h-3" />
                        Carte ({entities.filter(e => e.type === "location" || e.type === "ip").length})
                      </button>
                    )}
                    {entities.filter(e => e.type === "image" || e.type === "video").length > 0 && (
                      <button
                        onClick={() => setShowGallery(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all flex-shrink-0 bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25"
                        title="Galerie médias et photos de profil"
                      >
                        <Image className="w-3 h-3" />
                        Médias ({entities.filter(e => e.type === "image" || e.type === "video").length})
                      </button>
                    )}
                    <button
                      onClick={() => setEntityTypeFilter(null)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all flex-shrink-0 ${
                        !entityTypeFilter ? "bg-accent/15 text-accent border border-accent/30" : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                      }`}
                    >
                      All ({entities.length})
                    </button>
                    {Object.entries(entityTypeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                      const Icon = typeIcons[type] || Hash;
                      return (
                        <button
                          key={type}
                          onClick={() => setEntityTypeFilter(entityTypeFilter === type ? null : type)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all flex-shrink-0 ${
                            entityTypeFilter === type ? "bg-accent/15 text-accent border border-accent/30" : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {type} ({count})
                        </button>
                      );
                    })}
                  </div>
                  {/* Search filter */}
                  <div className="px-4 pb-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                      <input
                        value={entityFilter}
                        onChange={e => setEntityFilter(e.target.value)}
                        placeholder="Filter entities..."
                        className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg text-[11px] text-white placeholder:text-zinc-600 outline-none focus:border-accent/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Entities grid */}
                <div className="flex-1 overflow-y-auto p-4">
                  {filteredEntities.length === 0 && investigating && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <Loader2 className="w-8 h-8 animate-spin text-accent/50 mb-3" />
                      <div className="text-sm">Discovering entities...</div>
                      <div className="text-[11px] text-zinc-700 mt-1">{currentPhase}</div>
                    </div>
                  )}
                  {filteredEntities.length === 0 && !investigating && completed && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <Target className="w-8 h-8 mb-3" />
                      <div className="text-sm">No entities match your filter</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    <AnimatePresence>
                      {filteredEntities.map((entity) => (
                        <EntityCard key={entity.id} entity={entity} entities={entities} correlations={correlations} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Summary bar at bottom */}
                {(completed || entities.length > 0) && (
                  <div className="flex-shrink-0 border-t border-zinc-800/40 bg-[#0a0a0c]/50 px-4 pt-2 pb-2 flex flex-col gap-2">
                    {/* AI Analysis — visible inline when available */}
                    {aiAnalysis && completed && (
                      <AiAnalysisInline analysis={aiAnalysis} onOpenChat={() => setShowChat(true)} />
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                        <span><strong className="text-emerald-400">{entities.length}</strong> entities</span>
                        <span><strong className="text-accent">{correlations.length}</strong> correlations</span>
                        <span><strong className="text-cyan-400">{toolList.filter(t => t.status === "done").length}</strong> tools OK</span>
                        <span><strong className="text-zinc-400">{elapsed}s</strong></span>
                      </div>
                      <div className="flex-1" />
                      <button
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          showChat ? "bg-accent/15 text-accent" : "text-zinc-500 hover:text-zinc-300 bg-zinc-800/50"
                        }`}
                      >
                        <BrainCircuit className="w-3.5 h-3.5" />
                        AI Chat
                      </button>
                      <button
                        onClick={() => {
                          const data = JSON.stringify({ target, entities, correlations, aiAnalysis, stats: finalStats }, null, 2);
                          navigator.clipboard.writeText(data);
                          toast.success("Copied to clipboard");
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 rounded-lg transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <button
                        onClick={() => {
                          const data = JSON.stringify({ target, entities, correlations, aiAnalysis, stats: finalStats }, null, 2);
                          const blob = new Blob([data], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url; a.download = `osint_${target}_${Date.now()}.json`;
                          a.click(); URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 rounded-lg transition-colors"
                      >
                        <Download className="w-3 h-3" /> Export
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ---- RIGHT: AI Chat (toggleable) ---- */}
              <AnimatePresence>
                {showChat && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 360, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-l border-zinc-800/40 flex flex-col bg-[#0a0a0c]/50 flex-shrink-0 overflow-hidden"
                  >
                    <div className="p-3 border-b border-zinc-800/40 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold flex-1">AI Assistant</span>
                      <button onClick={() => setShowChat(false)} className="text-zinc-600 hover:text-zinc-300">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {chatMessages.length === 0 && (
                        <div className="text-center py-8">
                          <Sparkles className="w-8 h-8 mx-auto text-accent/30 mb-3" />
                          <div className="text-xs text-zinc-500">Ask me about the investigation results</div>
                          <div className="mt-3 space-y-1.5">
                            {["Analyse les résultats", "Quels sont les risques ?", "Résume les découvertes", "Suggère des pistes"].map(s => (
                              <button key={s} onClick={() => { setChatInput(s); }}
                                className="block w-full text-left px-3 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/30 rounded-lg transition-all"
                              >{s}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMessages.map(msg => (
                        <div key={msg.id} className={`${msg.role === "user" ? "ml-6" : "mr-6"}`}>
                          <div className={`px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                            msg.role === "user"
                              ? "bg-accent/15 text-zinc-200 border border-accent/20"
                              : "bg-zinc-800/50 text-zinc-300 border border-zinc-700/30"
                          }`}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                          <div className="text-[9px] text-zinc-700 mt-0.5 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="mr-6 flex items-center gap-2 px-3 py-2 bg-zinc-800/30 rounded-xl">
                          <Loader2 className="w-3 h-3 animate-spin text-accent" />
                          <span className="text-[11px] text-zinc-500">Thinking...</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-zinc-800/40">
                      <div className="flex items-center gap-2">
                        <input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleChat()}
                          placeholder="Ask about results..."
                          className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-zinc-600 outline-none focus:border-accent/40"
                        />
                        <button
                          onClick={handleChat}
                          disabled={!chatInput.trim() || chatLoading}
                          className="p-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors disabled:opacity-30"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== AI Analysis Overlay (when available) ===== */}
      {aiAnalysis && completed && !showChat && (
        <AiAnalysisBar analysis={aiAnalysis} onExpand={() => setShowChat(true)} />
      )}
    </div>
  );
}

// ============================================================================
// EVENT LINE (live feed item)
// ============================================================================
function EventLine({ event }: { event: StreamEvent }) {
  const getIcon = () => {
    switch (event.type) {
      case "phase": return <Layers className="w-3 h-3 text-accent" />;
      case "tool_start": return <Play className="w-3 h-3 text-amber-400" />;
      case "tool_done": return !event.data.success
        ? <XCircle className="w-3 h-3 text-red-400" />
        : (event.data.entitiesFound || 0) > 0
          ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          : <MinusCircle className="w-3 h-3 text-amber-400" />;
      case "entity_found": return <Target className="w-3 h-3 text-cyan-400" />;
      case "correlation": return <GitBranch className="w-3 h-3 text-purple-400" />;
      case "recursive_launch": return <RefreshCw className="w-3 h-3 text-orange-400" />;
      case "ai_analysis": return <BrainCircuit className="w-3 h-3 text-accent" />;
      case "error": return <AlertTriangle className="w-3 h-3 text-red-400" />;
      default: return <Radio className="w-3 h-3 text-zinc-600" />;
    }
  };

  const getMessage = () => {
    switch (event.type) {
      case "phase": return event.data.message;
      case "tool_start": return `Starting ${event.data.name || event.data.toolId}...`;
      case "tool_done": {
        const n = event.data.name || event.data.toolId;
        const t = `(${((event.data.duration || 0) / 1000).toFixed(1)}s)`;
        if (!event.data.success) return `${n}: failed ${t}`;
        const found = event.data.entitiesFound || 0;
        return `${n}: ${found > 0 ? `+${found} entities` : "not found"} ${t}`;
      }
      case "entity_found": return `Found ${event.data.entity?.type}: ${event.data.entity?.value?.slice(0, 50)}`;
      case "correlation": return `Link: ${event.data.correlation?.type}`;
      case "recursive_launch": return `Recursive → ${event.data.entity?.type}: ${event.data.entity?.value?.slice(0, 40)}`;
      case "ai_analysis": return "AI analysis complete";
      case "error": return event.data.message;
      case "log": return event.data.message;
      default: return event.data?.message || event.type;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-1.5 px-1 py-0.5 rounded text-[10px] hover:bg-zinc-800/20 transition-colors"
    >
      <span className="mt-0.5 flex-shrink-0">{getIcon()}</span>
      <span className="text-zinc-500 truncate">{getMessage()}</span>
    </motion.div>
  );
}

// ============================================================================
// ENTITY CARD
// ============================================================================
function EntityCard({ entity, entities, correlations }: { entity: DeepEntity; entities: DeepEntity[]; correlations: DeepCorrelation[] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = typeIcons[entity.type] || Hash;
  const color = typeColors[entity.type] || "text-zinc-400";
  const bgColor = typeBgColors[entity.type] || "bg-zinc-500/10 border-zinc-500/20";

  // Find related correlations
  const related = useMemo(() => {
    return correlations
      .filter(c => c.from === entity.id || c.to === entity.id)
      .map(c => {
        const otherId = c.from === entity.id ? c.to : c.from;
        const other = entities.find(e => e.id === otherId);
        return { ...c, other };
      })
      .filter(c => c.other);
  }, [entity.id, correlations, entities]);

  const isUrl = entity.value.startsWith("http");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-xl overflow-hidden card-hover ${bgColor}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-zinc-200 break-all leading-tight">
            {isUrl ? (
              <a href={entity.value} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="hover:text-accent transition-colors inline-flex items-center gap-1">
                {entity.value.replace(/https?:\/\/(www\.)?/, "").slice(0, 60)}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            ) : (
              entity.value
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-semibold uppercase ${color}`}>{entity.type}</span>
            <span className="text-[9px] text-zinc-600">{entity.source}</span>
            {entity.depth > 0 && (
              <span className="text-[9px] text-orange-400/60">depth:{entity.depth}</span>
            )}
            {entity.verified && <CheckCircle2 className="w-3 h-3 text-emerald-400/50" />}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] text-zinc-600">{entity.confidence}%</span>
          {related.length > 0 && (
            <span className="text-[9px] text-accent/60">{related.length} links</span>
          )}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800/30"
          >
            <div className="p-3 space-y-2">
              {/* Metadata */}
              {Object.keys(entity.metadata).length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] font-semibold text-zinc-600 uppercase">Metadata</div>
                  {Object.entries(entity.metadata).map(([k, v]) => (
                    <div key={k} className="flex text-[10px]">
                      <span className="text-zinc-600 w-20 flex-shrink-0">{k}</span>
                      <span className="text-zinc-400 break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Correlations */}
              {related.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] font-semibold text-zinc-600 uppercase">Linked Entities</div>
                  {related.map((rel) => {
                    const OtherIcon = typeIcons[rel.other!.type] || Hash;
                    return (
                      <div key={rel.id} className="flex items-center gap-2 text-[10px]">
                        <OtherIcon className="w-3 h-3 text-zinc-500" />
                        <span className="text-zinc-400 truncate flex-1">{rel.other!.value}</span>
                        <span className="text-[9px] text-zinc-600">{rel.type}</span>
                        <span className="text-[9px] text-zinc-600">{rel.strength}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Actions */}
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => { navigator.clipboard.writeText(entity.value); toast.success("Copied"); }}
                  className="px-2 py-1 text-[9px] text-zinc-500 hover:text-zinc-200 bg-zinc-800/40 rounded transition-colors"
                >
                  <Copy className="w-3 h-3 inline mr-1" />Copy
                </button>
                {isUrl && (
                  <a href={entity.value} target="_blank" rel="noopener noreferrer"
                    className="px-2 py-1 text-[9px] text-zinc-500 hover:text-zinc-200 bg-zinc-800/40 rounded transition-colors">
                    <ExternalLink className="w-3 h-3 inline mr-1" />Open
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// AI ANALYSIS INLINE (in summary bar)
// ============================================================================
function AiAnalysisInline({ analysis, onOpenChat }: { analysis: string; onOpenChat: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-accent/5 border border-accent/20 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/10 transition-colors text-left"
      >
        <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
        <span className="text-[11px] font-semibold text-accent flex-1">AI Analysis</span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 max-h-48 overflow-y-auto">
              <div className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {analysis}
              </div>
              <button
                onClick={onOpenChat}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 bg-accent/20 hover:bg-accent/30 text-accent text-[10px] font-semibold rounded transition-colors"
              >
                <BrainCircuit className="w-3 h-3" /> Ouvrir le Chat AI
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// AI ANALYSIS BAR (floating overlay)
// ============================================================================
function AiAnalysisBar({ analysis, onExpand }: { analysis: string; onExpand: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-40"
    >
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-accent/20 rounded-2xl shadow-2xl shadow-accent/5 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-xs font-semibold text-zinc-300 flex-1 text-left truncate">
            AI Analysis Available
          </span>
          <span className="text-[10px] text-zinc-600">{analysis.length} chars</span>
          <button onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="text-[10px] text-accent hover:text-accent-hover">
            Open Chat
          </button>
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                <div className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {analysis}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
