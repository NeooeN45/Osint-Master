// OSINT Master Pro — Main App v2 (refonte UI/UX premium)
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast, Toaster } from "sonner";
import {
  Search, X, Send, Filter, Sparkles, Loader2, Bot,
  Image as ImageIcon, ChevronLeft, ChevronRight, Hash,
} from "lucide-react";
import { ai as aiAPI } from "../lib/api";
import { deep as deepApi } from "../lib/apiClient";
import SettingsModal from "../components/SettingsModal";
import MediaGallery from "../components/MediaGallery";
import DebugConsoleV2 from "./DebugConsoleV2";
import { useBackendHealth } from "../lib/useBackendHealth";
import InlineMap from "./InlineMap";
import {
  RelationGraph, InvestigationTimeline, AnalyticsDashboard,
  PhotoGallery, PersonProfile, ExportManager, ModuleMarketplace,
} from "./views";
import { Package2 } from "lucide-react";
import {
  Topbar, Sidebar, Hero, ResultTabBar, EntityCardV2, CommandPalette,
  Input, IconButton, Badge, EmptyState, ProgressBar, Kbd,
  useKeyboardShortcuts, cn,
} from "./ui";
import {
  API, DFLT, ETYPE_ICONS, ec,
  detectType,
  LogLevel, MainTab, LeftTab,
  LiveModule, CatalogMod, DebugEntry, Entity, Correlation, ToolState, Cfg, ChatMsg,
} from "./constants";

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
export default function OsintApp() {
  const [target, setTarget] = useState("");
  const [cfg, setCfg] = useState<Cfg>({ ...DFLT });

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [corrs, setCorrs] = useState<Correlation[]>([]);
  const [tools, setTools] = useState<Record<string, ToolState>>({});
  const [aiAnal, setAiAnal] = useState("");

  const [liveMods, setLiveMods] = useState<LiveModule[]>([]);
  const [catalog, setCatalog] = useState<CatalogMod[]>([]);
  const [catLoading, setCatLoad] = useState(false);

  const [log, setLog] = useState<DebugEntry[]>([]);
  const [logOpen, setLogOpen] = useState(true);
  const [logH, setLogH] = useState(240);
  const [mute, setMute] = useState(false);

  const [leftTab, setLeftTab] = useState<LeftTab>("config");
  const [mainTab, setMainTab] = useState<MainTab>("entities");
  const [sideOpen, setSideOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [entSearch, setEntSearch] = useState("");
  const [modCat, setModCat] = useState("all");

  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoad, setChatLoad] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const [aiSt, setAiSt] = useState<{ available: boolean; models: string[] } | null>(null);
  const [model, setModel] = useState("");
  const [history, setHistory] = useState<{ target: string; type: string; time: number }[]>([]);

  // Backend health via hook (remplace fetch hardcodé)
  const { status: health } = useBackendHealth(10000);
  const backOk = health.ok;

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);

  // ── boot ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    aiAPI.status()
      .then((s: any) => { setAiSt({ available: !!s.available, models: s.models || [] }); if (s.models?.length) setModel(s.models[0]); })
      .catch(() => setAiSt({ available: false, models: [] }));

    try { const h = localStorage.getItem("osint_h"); if (h) setHistory(JSON.parse(h)); } catch {}

    // Load modules: real executable (V1 engine) + full catalogue
    setCatLoad(true);
    Promise.all([
      fetch(`${API}/deep/modules`).then(r => r.json()).catch(() => []),
      fetch(`${API}/modules/catalog`).then(r => r.json()).catch(() => ({ modules: [] })),
    ]).then(([liveRaw, catRaw]) => {
      const live: LiveModule[] = Array.isArray(liveRaw)
        ? liveRaw.map((m: any) => ({ id: m.id, name: m.name || m.id, category: m.category || "unknown", targetTypes: m.targetTypes || [], priority: m.priority || 99, available: m.available !== false }))
        : [];
      setLiveMods(live);
      const liveIds = new Set(live.map(m => m.id));
      const mods: CatalogMod[] = (catRaw.modules || []).map((m: any) => ({
        ...m, isLive: liveIds.has(m.id), targetTypes: live.find((l: any) => l.id === m.id)?.targetTypes,
      }));
      for (const l of live) {
        if (!mods.find(m => m.id === l.id))
          mods.push({ id: l.id, name: l.name, description: `${l.category} — moteur natif`, category: l.category, subcategory: l.category, enabled: true, installed: true, risk: "low", isLive: true, targetTypes: l.targetTypes });
      }
      setCatalog(mods);
    }).finally(() => setCatLoad(false));
  }, []);

  useEffect(() => { if (chatEnd.current) chatEnd.current.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs.length]);

  // ── push debug ─────────────────────────────────────────────────────────────
  const push = useCallback((level: LogLevel, mod: string, msg: string, payload?: any) => {
    setLog(p => [...p.slice(-2999), { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), level, module: mod, message: msg, payload }]);
  }, []);

  // ── SSE handler ────────────────────────────────────────────────────────────
  const handleEv = useCallback((ev: { type: string; data: any; id?: string }) => {
    const d = ev.data ?? {};
    // Always dump raw event payload into debug
    push("debug", "SSE", `← [${ev.type}]${ev.id ? ` #${ev.id}` : ""}`, Object.keys(d).length > 0 ? d : undefined);

    switch (ev.type) {
      case "phase":
        setPhase(d.phase || d.message || "");
        push("phase", "ENGINE", `▸ ${d.phase || d.message || "?"}${d.count ? ` (${d.count} modules)` : ""}`, d);
        break;

      case "tool_start": {
        const id = d.tool || d.toolId || "?";
        setTools(p => ({ ...p, [id]: { id, name: d.name || id, status: "running", startTs: Date.now() } }));
        if (d.progress != null) setProgress(d.progress);
        push("info", d.name || id, `▶ démarrage — cible: ${d.target || target}`);
        if (!mute) toast.info(`▶ ${d.name || id}`, { duration: 1500 });
        break;
      }

      case "tool_done": {
        const id = d.tool || d.toolId || "?";
        const st: ToolState["status"] = d.skipped ? "skipped" : d.success === false ? "error" : "done";
        const found = d.found ?? d.entitiesFound ?? 0;
        setTools(p => {
          const prev = p[id];
          const dur = d.duration ?? (prev?.startTs ? Date.now() - prev.startTs : undefined);
          return { ...p, [id]: { ...prev, id, name: d.name || prev?.name || id, status: st, duration: dur, found } };
        });
        if (d.progress != null) setProgress(d.progress);
        if (st === "skipped") push("warn", d.name || id, `⊘ ignoré — ${d.reason || "non dispo"}`, d);
        else if (st === "error") {
          push("error", d.name || id, `✗ ÉCHEC ${d.duration ? `(${(d.duration / 1000).toFixed(1)}s)` : ""} — ${d.message || ""}`, d);
          if (!mute) toast.error(d.name || id, { description: d.message });
        } else {
          push(found > 0 ? "success" : "info", d.name || id,
            `✓ ${found > 0 ? `+${found} entités` : "rien trouvé"} ${d.duration ? `· ${(d.duration / 1000).toFixed(1)}s` : ""}`, d);
          if (!mute && found > 0) toast.success(d.name || id, { description: `+${found} entités`, duration: 2000 });
        }
        break;
      }

      case "entity_found": {
        const ent = d.entity || d;
        if (ent?.type) {
          setEntities(p => {
            if (p.some(e => e.type === ent.type && e.value === ent.value)) return p;
            return [...p, { ...ent, id: ent.id || `e-${Date.now()}-${Math.random()}` }];
          });
          push("entity", ent.source || "?", `[${String(ent.type).toUpperCase()}] ${ent.value} (${ent.confidence ?? "?"}%)`, ent.metadata);
        }
        break;
      }

      case "correlation": {
        const c = d.correlation || d;
        if (c?.from) setCorrs(p => [...p, c]);
        push("info", "LINK", `↔ ${c.type} · ${c.from?.slice(0, 8)} ↔ ${c.to?.slice(0, 8)} (${c.strength}%)`, c);
        break;
      }

      case "ai_analysis":
        setAiAnal(d.analysis || "");
        push("success", "OLLAMA", `Analyse IA: ${(d.analysis || "").length} chars`);
        break;

      case "progress":
        if (d.percent != null) setProgress(d.percent);
        if (d.phase) setPhase(d.phase);
        push("debug", "PROGRESS", `${d.percent ?? 0}% — ${d.phase || ""}`, d);
        break;

      case "recursive_launch":
        push("phase", "RECURSIVE", `🔄 ${d.triggers?.length ?? 0} cibles récursives`, d);
        (d.triggers || []).forEach((t: any) => push("info", "RECURSIVE", `  → ${t.target} [${t.type}] — ${t.reason || ""}`));
        break;

      case "complete": {
        setProgress(100); setPhase("✓ Terminé");
        const n = d.summary?.entities ?? d.entities?.length ?? 0;
        const sec = ((d.duration || 0) / 1000).toFixed(1);
        push("success", "ENGINE", `✓ FIN — ${n} entités · ${d.summary?.correlations ?? 0} corrélations · ${sec}s`, d.summary);
        if (!mute) toast.success("Investigation terminée", { description: `${n} entités en ${sec}s`, duration: 8000 });
        if (d.entities?.length) setEntities(p => {
          const m = [...p];
          for (const e of d.entities)
            if (!m.some(x => x.type === e.type && x.value === e.value))
              m.push({ ...e, id: e.id || `e-${Date.now()}-${Math.random()}` });
          return m;
        });
        if (d.correlations?.length) setCorrs(d.correlations);
        break;
      }

      case "log":
        push(d.level === "error" ? "error" : d.level === "warn" ? "warn" : "debug", d.module || d.tool || "LOG", d.message || "", d);
        break;

      case "error":
        push("error", d.tool || d.module || "ENGINE", d.message || "Erreur", d);
        if (!mute) toast.error(d.message || "Erreur investigation");
        break;
    }
  }, [push, mute, target]);

  // ── start ──────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!target.trim() || running) return;
    const type = detectType(target.trim());
    setRunning(true); setDone(false); setProgress(0); setPhase("Initialisation...");
    setEntities([]); setCorrs([]); setTools({}); setAiAnal(""); setElapsed(0); setLog([]); setMainTab("entities");

    push("phase", "ENGINE", "═".repeat(48));
    push("phase", "ENGINE", `🎯 CIBLE: "${target.trim()}" [${type}]`);
    push("phase", "ENGINE", `depth=${cfg.maxDepth} max=${cfg.maxEntities} timeout=${cfg.timeoutMs / 1000}s AI=${cfg.enableAI} web=${cfg.enableWebSearch} recursive=${cfg.enableRecursive}`);
    push("phase", "ENGINE", `Modules: ${cfg.selectedModules.length ? cfg.selectedModules.join(", ") : "auto (tous disponibles)"}`);
    push("phase", "ENGINE", "═".repeat(48));

    const h = [{ target: target.trim(), type, time: Date.now() }, ...history.filter(x => x.target !== target.trim())].slice(0, 30);
    setHistory(h); try { localStorage.setItem("osint_h", JSON.stringify(h)); } catch {}

    startRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);

    const abort = new AbortController(); abortRef.current = abort;
    try {
      push("info", "HTTP", `POST /deep/stream — target="${target.trim()}"`);
      await deepApi.stream(
        target.trim(),
        { ...cfg, selectedModules: cfg.selectedModules.length ? cfg.selectedModules : [] },
        {
          signal: abort.signal,
          onStart: () => push("success", "SSE", "✓ Flux SSE connecté"),
          onEvent: (ev) => handleEv(ev),
          onDone: (count, duration) =>
            push("success", "SSE", `Flux fermé — ${count} événements en ${(duration / 1000).toFixed(1)}s`),
          onError: (err) => { throw err; },
        }
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        push("error", "ENGINE", `Connexion perdue: ${err.message}`, { stack: err.stack?.slice(0, 400) });
        toast.error(`Erreur: ${err.message}`);
      } else {
        push("warn", "ENGINE", "⏹ Investigation annulée (AbortController)");
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false); setDone(true); setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
  }, [target, running, cfg, history, handleEv, push]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false); setDone(true);
    push("warn", "ENGINE", "⏹ Stoppée manuellement par l'utilisateur");
    toast.info("Investigation stoppée");
  }, [push]);

  const reset = useCallback(() => {
    abortRef.current?.abort(); if (timerRef.current) clearInterval(timerRef.current);
    setTarget(""); setRunning(false); setDone(false); setProgress(0); setPhase("");
    setEntities([]); setCorrs([]); setTools({}); setAiAnal(""); setElapsed(0); setLog([]);
  }, []);

  // ── chat ───────────────────────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoad) return;
    const msg: ChatMsg = { id: Date.now().toString(), role: "user", content: chatInput, ts: Date.now() };
    setChatMsgs(p => [...p, msg]); setChatInput(""); setChatLoad(true);
    try {
      const ctx = entities.slice(0, 80).map(e => `[${e.type}] ${e.value} (${e.source} ${e.confidence}%)`).join("\n");
      const sys = `Tu es un analyste OSINT expert. Réponds en français, sois précis et concis.\nCible: ${target || "?"}\n${ctx ? `Entités trouvées (${entities.length} total):\n${ctx}` : "Aucune entité trouvée pour l'instant."}`;
      const msgs = [{ role: "system" as const, content: sys }, ...chatMsgs.map(m => ({ role: m.role, content: m.content })), { role: "user" as const, content: chatInput }];
      const r = await aiAPI.chat(msgs, model);
      setChatMsgs(p => [...p, { id: Date.now().toString(), role: "assistant", content: r.content, ts: Date.now() }]);
    } catch (e: any) {
      setChatMsgs(p => [...p, { id: Date.now().toString(), role: "assistant", content: `Erreur: ${e.message}`, ts: Date.now() }]);
    }
    setChatLoad(false);
  }, [chatInput, chatLoad, chatMsgs, entities, target, model]);

  // ── derived ────────────────────────────────────────────────────────────────
  const detType = useMemo(() => target ? detectType(target) : "", [target]);
  const hasRes = entities.length > 0 || running || done;
  const toolList = useMemo(() => Object.values(tools), [tools]);
  const errCnt = useMemo(() => log.filter(e => e.level === "error").length, [log]);
  const warnCnt = useMemo(() => log.filter(e => e.level === "warn").length, [log]);
  const typeCounts = useMemo(() => { const c: Record<string, number> = {}; entities.forEach(e => { c[e.type] = (c[e.type] || 0) + 1; }); return c; }, [entities]);
  const filtEnts = useMemo(() => {
    let e = entities;
    if (typeFilter) e = e.filter(x => x.type === typeFilter);
    if (entSearch) e = e.filter(x => x.value.toLowerCase().includes(entSearch.toLowerCase()) || x.source.toLowerCase().includes(entSearch.toLowerCase()));
    return e;
  }, [entities, typeFilter, entSearch]);
  const catCats = useMemo(() => { const c = new Set<string>(); catalog.forEach(m => c.add(m.category)); return ["all", ...Array.from(c).sort()]; }, [catalog]);
  const filtCat = useMemo(() => modCat === "all" ? catalog : catalog.filter(m => m.category === modCat), [catalog, modCat]);
  const liveCount = catalog.filter(m => m.isLive).length;
  const isModOn = useCallback((id: string) => cfg.selectedModules.length === 0 || cfg.selectedModules.includes(id), [cfg.selectedModules]);
  const toggleMod = useCallback((id: string) => setCfg(c => {
    const base = c.selectedModules.length === 0 ? catalog.filter(m => m.isLive).map(m => m.id) : c.selectedModules;
    return { ...c, selectedModules: base.includes(id) ? base.filter(x => x !== id) : [...base, id] };
  }), [catalog]);
  const geoCnt = useMemo(() => entities.filter(e => (e.type === "location" || e.type === "ip") && (e.metadata?.lat || e.metadata?.latitude)).length, [entities]);
  const personCount = useMemo(() => entities.filter(e => e.type === "person").length, [entities]);
  const imgCount = useMemo(() => {
    let n = 0;
    for (const e of entities) {
      if (e.type === "image" || e.type === "image_url") n++;
      else if (e.metadata?.avatar || e.metadata?.profile_pic_url || e.metadata?.thumbnail || e.metadata?.imageUrl) n++;
    }
    return n;
  }, [entities]);

  const toolsDone = useMemo(() => toolList.filter(t => t.status === "done").length, [toolList]);

  // ── keyboard shortcuts ─────────────────────────────────────────────────────
  useKeyboardShortcuts({
    onOpenPalette: () => setPaletteOpen(true),
    onEscape: () => {
      if (paletteOpen) return; // handled inside
      if (showExport) return setShowExport(false);
      if (showSettings) return setShowSettings(false);
      if (showGallery) return setShowGallery(false);
      if (chatOpen) return setChatOpen(false);
    },
    onFocusSearch: () => targetInputRef.current?.focus(),
    onSwitchTab: (t) => hasRes && setMainTab(t),
    onExport: () => hasRes && setShowExport(true),
    onToggleChat: () => aiSt?.available && setChatOpen(v => !v),
    onToggleDebug: () => setLogOpen(v => !v),
  });

  // ─────────────────────────────────── RENDER ────────────────────────────────
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative mesh-bg noise-overlay" data-accent="cyan">
      <Toaster position="top-right" theme="dark" richColors expand visibleToasts={6} toastOptions={{
        style: { background: "rgba(15,19,28,0.95)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" },
      }} />

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showGallery && <MediaGallery entities={entities} target={target} onClose={() => setShowGallery(false)} />}
      {showExport && (
        <ExportManager
          entities={entities} correlations={corrs} tools={tools}
          target={target} elapsed={elapsed} aiAnalysis={aiAnal}
          onClose={() => setShowExport(false)}
        />
      )}
      <AnimatePresence>
        {showMarketplace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowMarketplace(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-6xl h-[88vh] rounded-2xl panel-bright shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Package2 className="w-5 h-5 text-cyan-400" />
                  <span className="text-base font-bold text-zinc-100">Module Marketplace</span>
                </div>
                <IconButton variant="ghost" size="md" onClick={() => setShowMarketplace(false)}>
                  <X />
                </IconButton>
              </div>
              <div className="flex-1 overflow-hidden">
                <ModuleMarketplace />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        entities={entities}
        onNavigate={(t) => hasRes && setMainTab(t)}
        onSelectEntity={(e) => { setTypeFilter(null); setEntSearch(e.value); setMainTab("entities"); }}
        target={target}
        running={running}
        onAction={(a) => {
          if (a === "start") start();
          else if (a === "stop") stop();
          else if (a === "reset") reset();
          else if (a === "export") setShowExport(true);
          else if (a === "chat") setChatOpen(true);
          else if (a === "debug") setLogOpen(v => !v);
          else if (a === "settings") setShowSettings(true);
          else if (a === "marketplace") setShowMarketplace(true);
          else if (a.startsWith("target:")) setTarget(a.slice(7));
        }}
      />

      {/* ══ TOPBAR ══ */}
      <Topbar
        running={running} elapsed={elapsed}
        entities={entities.length} correlations={corrs.length}
        toolsDone={toolsDone} toolsTotal={toolList.length}
        geoCnt={geoCnt} personCount={personCount}
        aiAvailable={!!aiSt?.available}
        aiModels={aiSt?.models || []} selectedModel={model} onModelChange={setModel}
        backendOk={backOk} liveCount={liveCount} catalogCount={catalog.length}
        errorCount={errCnt} warnCount={warnCnt}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenDebug={() => setLogOpen(v => !v)}
        onOpenChat={() => setChatOpen(true)}
        onOpenMarketplace={() => setShowMarketplace(true)}
        mute={mute} onToggleMute={() => setMute(v => !v)}
        debugOpen={logOpen} hasResults={hasRes}
      />

      {/* ══ BODY ══ */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative z-[1]">

        {/* SIDEBAR */}
        <AnimatePresence initial={false}>
          {sideOpen && (
            <motion.div
              key="sb"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden flex-shrink-0"
            >
              <Sidebar
                target={target} setTarget={setTarget} detectedType={detType}
                cfg={cfg} setCfg={setCfg}
                running={running} onStart={start} onStop={stop} onReset={reset}
                leftTab={leftTab} setLeftTab={setLeftTab}
                catalog={catalog} liveCount={liveCount}
                selectedModules={cfg.selectedModules} toggleMod={toggleMod}
                history={history} onHistoryClick={(t) => { setTarget(t); setTimeout(start, 50); }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSideOpen(v => !v)}
          className="w-3 flex-shrink-0 panel-subtle border-r border-white/[0.05] flex items-center justify-center text-zinc-700 hover:text-zinc-400 transition-colors press"
        >
          {sideOpen ? <ChevronLeft className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
        </button>

        {/* MAIN CENTER */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <AnimatePresence mode="wait">
            {!hasRes ? (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                <Hero
                  target={target} setTarget={setTarget}
                  detectedType={detType} onStart={start}
                  onOpenPalette={() => setPaletteOpen(true)}
                  liveCount={liveCount} catalogCount={catalog.length}
                  aiAvailable={!!aiSt?.available} backendOk={backOk}
                  history={history}
                  onHistoryClick={(t) => setTarget(t)}
                />
              </motion.div>
            ) : (
              <motion.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden">

                <ResultTabBar
                  current={mainTab} onChange={setMainTab}
                  counts={{
                    entities: entities.length, graph: corrs.length, geo: geoCnt,
                    persons: personCount, gallery: imgCount,
                  }}
                  running={running} target={target} elapsed={elapsed}
                  hasImages={imgCount > 0}
                  aiAvailable={!!aiSt?.available} chatOpen={chatOpen}
                  onStop={stop} onReset={reset}
                  onOpenGallery={() => setShowGallery(true)}
                  onToggleChat={() => setChatOpen(v => !v)}
                  onExport={() => setShowExport(true)}
                />

                {/* Progress bar global */}
                {running && progress > 0 && progress < 100 && (
                  <div className="px-4 py-1 border-b border-white/[0.04] panel-subtle">
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] text-zinc-500 flex-shrink-0">{phase || "En cours"}</div>
                      <ProgressBar value={progress} variant="accent" size="sm" showValue />
                    </div>
                  </div>
                )}

                {/* CONTENT */}
                <AnimatePresence mode="wait">
                  {mainTab === "entities" && (
                    <motion.div
                      key="entities"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      {/* Filter bar */}
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.05] panel-subtle flex-wrap flex-shrink-0">
                        <button
                          onClick={() => setTypeFilter(null)}
                          className={cn(
                            "chip cursor-pointer press transition-colors",
                            !typeFilter ? "!bg-white/[0.1] !text-zinc-100 !border-white/[0.2]" : "hover:bg-white/[0.08]",
                          )}
                        >
                          <Filter className="w-2.5 h-2.5" />
                          Tout ({entities.length})
                        </button>
                        {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                          const Icon = ETYPE_ICONS[type] || Hash;
                          const active = typeFilter === type;
                          return (
                            <button
                              key={type}
                              onClick={() => setTypeFilter(active ? null : type)}
                              className="chip cursor-pointer press transition-colors"
                              style={{
                                color: active ? ec(type) : undefined,
                                background: active ? `${ec(type)}22` : undefined,
                                borderColor: active ? `${ec(type)}50` : undefined,
                              }}
                            >
                              <Icon className="w-2.5 h-2.5" />
                              {type}
                              <span className="text-mono opacity-60">({count})</span>
                            </button>
                          );
                        })}
                        <div className="flex-1 min-w-[140px]">
                          <Input
                            value={entSearch}
                            onChange={e => setEntSearch(e.target.value)}
                            placeholder="Rechercher..."
                            icon={<Search />}
                            iconRight={entSearch ? (
                              <button onClick={() => setEntSearch("")} className="text-zinc-500 hover:text-zinc-300"><X className="w-3 h-3" /></button>
                            ) : null}
                            sizeVariant="sm"
                          />
                        </div>
                      </div>

                      {/* Entity grid */}
                      <div className="flex-1 overflow-y-auto s-thin p-3">
                        {filtEnts.length === 0 && running ? (
                          <div className="h-full flex items-center justify-center flex-col gap-3 text-zinc-600">
                            <div className="ring-loader" />
                            <div className="text-xs text-zinc-500">Découverte en cours...</div>
                            <div className="text-[10px] text-zinc-600">{phase}</div>
                          </div>
                        ) : filtEnts.length === 0 ? (
                          <EmptyState
                            icon={<Hash />}
                            title="Aucune entité"
                            description={entSearch || typeFilter ? "Ajustez vos filtres pour voir plus de résultats." : "Lancez l'investigation pour découvrir des entités."}
                          />
                        ) : (
                          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                            <AnimatePresence mode="popLayout">
                              {filtEnts.map(e => (
                                <EntityCardV2 key={e.id} entity={e} correlations={corrs} entities={entities} />
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Status bar */}
                      <div className="flex items-center gap-4 px-4 py-1.5 border-t border-white/[0.05] panel-subtle text-[10px] flex-shrink-0">
                        <span className="text-zinc-500">
                          <strong className="text-emerald-400 font-bold text-mono">{entities.length}</strong> entités
                        </span>
                        <span className="text-zinc-500">
                          <strong className="text-purple-400 font-bold text-mono">{corrs.length}</strong> corrélations
                        </span>
                        <span className="text-zinc-500">
                          <strong className="text-cyan-400 font-bold text-mono">{toolsDone}</strong>/{toolList.length} modules
                        </span>
                        {(running || done) && (
                          <span className="text-zinc-500">
                            <strong className="text-amber-400 font-bold text-mono">{elapsed}s</strong>
                          </span>
                        )}
                        <div className="flex-1" />
                        <div className="flex items-center gap-1.5 text-zinc-600">
                          <Kbd>/</Kbd>
                          <span>recherche rapide</span>
                          <div className="w-1 h-1 rounded-full bg-zinc-700" />
                          <Kbd>⌘</Kbd><Kbd>K</Kbd>
                          <span>commandes</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {mainTab === "map" && (
                    <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                      <InlineMap entities={entities} />
                    </motion.div>
                  )}
                  {mainTab === "graph" && (
                    <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                      <RelationGraph entities={entities} correlations={corrs} target={target} />
                    </motion.div>
                  )}
                  {mainTab === "dashboard" && (
                    <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                      <AnalyticsDashboard entities={entities} correlations={corrs} tools={tools} target={target} elapsed={elapsed} />
                    </motion.div>
                  )}
                  {mainTab === "timeline" && (
                    <motion.div key="tl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                      <InvestigationTimeline entities={entities} tools={tools} log={log} elapsed={elapsed} running={running} />
                    </motion.div>
                  )}
                  {mainTab === "persons" && (
                    <motion.div key="ps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                      <PersonProfile entities={entities} correlations={corrs} target={target} />
                    </motion.div>
                  )}
                  {mainTab === "gallery" && (
                    <motion.div key="gl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                      <PhotoGallery entities={entities} target={target} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI CHAT PANEL */}
        <AnimatePresence initial={false}>
          {chatOpen && hasRes && (
            <motion.aside
              key="chat"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col border-l border-white/[0.05] panel flex-shrink-0 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(139,92,246,0.1))", border: "1px solid rgba(167,139,250,0.25)" }}>
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-zinc-200">Assistant IA</div>
                  <div className="text-[9px] text-zinc-500 text-mono">{model || "aucun modèle"}</div>
                </div>
                <IconButton variant="ghost" size="sm" onClick={() => setChatOpen(false)}>
                  <X />
                </IconButton>
              </div>

              <div className="flex-1 overflow-y-auto s-thin p-3 space-y-2">
                {chatMsgs.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="w-6 h-6 text-purple-400/40 mx-auto mb-3" />
                    <div className="text-[11px] text-zinc-500 mb-3">Interrogez l'IA sur les résultats</div>
                    <div className="space-y-1.5">
                      {[
                        "Résume les découvertes",
                        "Quelles sont les entités critiques ?",
                        "Identifie des liens suspects",
                        "Propose les prochaines étapes",
                      ].map(s => (
                        <button
                          key={s}
                          onClick={() => setChatInput(s)}
                          className="w-full text-[10px] px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors press text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMsgs.map(m => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-[88%] px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-purple-500/10 border border-purple-500/25 text-zinc-100"
                        : "bg-white/[0.03] border border-white/[0.06] text-zinc-300",
                    )}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {chatLoad && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex gap-1">
                      <span className="w-1 h-1 rounded-full bg-purple-400 stream-dot" />
                      <span className="w-1 h-1 rounded-full bg-purple-400 stream-dot-2" />
                      <span className="w-1 h-1 rounded-full bg-purple-400 stream-dot-3" />
                    </div>
                    <span className="text-[10px] text-zinc-500">Réflexion...</span>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>

              <div className="p-3 border-t border-white/[0.05]">
                <div className="flex gap-1.5">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    placeholder="Posez votre question..."
                    sizeVariant="sm"
                    className="flex-1"
                  />
                  <IconButton
                    variant="solid"
                    size="sm"
                    onClick={sendChat}
                    disabled={!chatInput.trim() || chatLoad}
                    className="!bg-purple-500/15 !border-purple-500/25 !text-purple-400 hover:!bg-purple-500/25"
                  >
                    <Send />
                  </IconButton>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ══ DEBUG CONSOLE ══ */}
      <AnimatePresence initial={false}>
        {logOpen && (
          <motion.div
            key="console"
            initial={{ height: 0 }}
            animate={{ height: logH }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex-shrink-0 overflow-hidden"
          >
            <DebugConsoleV2
              log={log}
              onClear={() => setLog([])}
              height={logH}
              onHeightChange={setLogH}
              onClose={() => setLogOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Analysis Toast */}
      <AnimatePresence>
        {aiAnal && done && !chatOpen && (
          <motion.div
            initial={{ y: 14, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0 }}
            className="absolute bottom-4 right-4 z-50 max-w-[300px]"
          >
            <button
              onClick={() => setChatOpen(true)}
              className="panel-bright rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/[0.05] transition-colors shadow-2xl border border-purple-500/25 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(139,92,246,0.15))", border: "1px solid rgba(167,139,250,0.4)" }}>
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-bold text-zinc-100">Analyse IA prête</div>
                <div className="text-[10px] text-zinc-400 truncate">{aiAnal.slice(0, 50)}...</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
