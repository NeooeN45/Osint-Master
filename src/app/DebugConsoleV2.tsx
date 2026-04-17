// DebugConsoleV2 — Console debug avec 5 onglets : Logs · Network · SSE · Modules · Health
// Affiche tout ce qui se passe côté frontend + backend en temps réel

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  Terminal, Search, X, ChevronDown, Play, Pause, Trash2,
  Activity, Network, Radio, Package, HeartPulse, Download,
  CheckCircle2, XCircle, AlertTriangle, Clock, Zap,
  Copy, Check,
} from "lucide-react";
import { DebugEntry, LogLevel, LC, LI, fmtTs } from "./constants";
import {
  NetworkEntry, onNetworkEvent, getNetworkLog, clearNetworkLog,
  debug as debugApi, pingHealth, HealthStatus, onHealth,
} from "../lib/apiClient";
import { cn, Badge, IconButton, Kbd, Input, Tooltip, ProgressBar, KPI } from "./ui";

type Tab = "logs" | "network" | "sse" | "modules" | "health";

interface Props {
  log: DebugEntry[];
  onClear: () => void;
  height: number;
  onHeightChange: (h: number) => void;
  onClose: () => void;
}

export default function DebugConsoleV2({ log, onClear, height, onHeightChange, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("logs");
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState("");
  const resizeRef = useRef<{ startY: number; startH: number } | null>(null);

  // Resize handle
  const startResize = useCallback((e: React.MouseEvent) => {
    resizeRef.current = { startY: e.clientY, startH: height };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dy = resizeRef.current.startY - ev.clientY;
      onHeightChange(Math.min(600, Math.max(100, resizeRef.current.startH + dy)));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [height, onHeightChange]);

  const errCount = useMemo(() => log.filter(e => e.level === "error").length, [log]);
  const warnCount = useMemo(() => log.filter(e => e.level === "warn").length, [log]);

  const tabs: Array<{ id: Tab; label: string; icon: any; color: string; count?: number }> = [
    { id: "logs", label: "Logs", icon: Terminal, color: "#22d3ee", count: log.length },
    { id: "network", label: "Network", icon: Network, color: "#a78bfa" },
    { id: "sse", label: "SSE Stream", icon: Radio, color: "#ec4899" },
    { id: "modules", label: "Modules", icon: Package, color: "#fbbf24" },
    { id: "health", label: "Health", icon: HeartPulse, color: "#34d399" },
  ];

  return (
    <div
      className="flex flex-col panel border-t border-white/[0.06] relative overflow-hidden"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-accent/40 transition-colors z-10"
      />

      {/* Header with tabs */}
      <div className="flex items-center gap-0 h-9 border-b border-white/[0.05] flex-shrink-0 relative">
        {tabs.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 h-9 text-[11px] font-semibold transition-colors press",
                active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
              )}
              style={active ? { color: t.color } : undefined}
            >
              <Icon className="w-3 h-3" />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-mono"
                  style={active ? { background: `${t.color}25`, color: t.color } : { background: "rgba(255,255,255,0.05)", color: "#71717a" }}
                >
                  {t.count}
                </span>
              )}
              {active && (
                <motion.div
                  layoutId="debug-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                  style={{ background: t.color, boxShadow: `0 0 10px ${t.color}` }}
                />
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Counters */}
        {errCount > 0 && (
          <div className="chip !bg-red-500/10 !border-red-500/25 !text-red-400">
            <XCircle className="w-2.5 h-2.5" />{errCount}
          </div>
        )}
        {warnCount > 0 && (
          <div className="chip !bg-amber-500/10 !border-amber-500/25 !text-amber-400">
            <AlertTriangle className="w-2.5 h-2.5" />{warnCount}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pr-2">
          <Tooltip content={paused ? "Reprendre" : "Pauser"}>
            <IconButton variant="ghost" size="sm" active={paused} onClick={() => setPaused(v => !v)}>
              {paused ? <Play /> : <Pause />}
            </IconButton>
          </Tooltip>
          <Tooltip content="Vider">
            <IconButton variant="ghost" size="sm" onClick={() => {
              if (tab === "logs") onClear();
              else if (tab === "network") clearNetworkLog();
            }}>
              <Trash2 />
            </IconButton>
          </Tooltip>
          <Tooltip content="Exporter debug dump">
            <IconButton variant="ghost" size="sm" onClick={() => exportDebugDump(log)}>
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip content="Fermer (⌘\\)">
            <IconButton variant="ghost" size="sm" onClick={onClose}>
              <X />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === "logs" && <LogsTab log={log} paused={paused} search={search} setSearch={setSearch} />}
        {tab === "network" && <NetworkTab search={search} setSearch={setSearch} />}
        {tab === "sse" && <SSETab log={log} paused={paused} />}
        {tab === "modules" && <ModulesTab />}
        {tab === "health" && <HealthTab />}
      </div>
    </div>
  );
}

// ─── LOGS TAB ────────────────────────────────────────────────────────────────
function LogsTab({ log, paused, search, setSearch }: { log: DebugEntry[]; paused: boolean; search: string; setSearch: (s: string) => void }) {
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const endRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let l = log;
    if (filter !== "all") l = l.filter(e => e.level === filter);
    if (search) {
      const s = search.toLowerCase();
      l = l.filter(e => e.message.toLowerCase().includes(s) || e.module.toLowerCase().includes(s));
    }
    return l;
  }, [log, filter, search]);

  useEffect(() => {
    if (!paused && endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [log.length, paused]);

  const levels: LogLevel[] = ["info", "success", "warn", "error", "debug", "entity", "phase"];

  return (
    <div className="h-full flex flex-col">
      {/* Sub-toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04] flex-shrink-0 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={cn("chip press cursor-pointer", filter === "all" && "!bg-white/[0.1] !text-zinc-100 !border-white/[0.2]")}
        >
          Tout ({log.length})
        </button>
        {levels.map(l => {
          const count = log.filter(x => x.level === l).length;
          const active = filter === l;
          return (
            <button
              key={l}
              onClick={() => setFilter(active ? "all" : l)}
              className="chip press cursor-pointer"
              style={active ? { color: LC[l], background: `${LC[l]}22`, borderColor: `${LC[l]}50` } : undefined}
            >
              {l} ({count})
            </button>
          );
        })}
        <div className="flex-1 min-w-[120px] max-w-[280px]">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer logs..."
            sizeVariant="sm"
            icon={<Search />}
            iconRight={search ? <button onClick={() => setSearch("")}><X className="w-3 h-3" /></button> : null}
          />
        </div>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto s-thin font-mono text-[10px]">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
            Aucun log {search || filter !== "all" ? "pour ce filtre" : ""}
          </div>
        ) : (
          filtered.slice(-500).map(entry => <LogLine key={entry.id} entry={entry} />)
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function LogLine({ entry }: { entry: DebugEntry }) {
  const [open, setOpen] = useState(false);
  const Icon = LI[entry.level];
  const has = !!(entry.payload && Object.keys(entry.payload).length > 0);
  const color = LC[entry.level];
  const dark = entry.level === "debug";

  return (
    <div
      className="border-b border-white/[0.015] border-l-2"
      style={{
        borderLeftColor: entry.level === "error" ? "rgba(248,113,113,0.4)" : entry.level === "warn" ? "rgba(251,191,36,0.35)" : entry.level === "entity" ? "rgba(103,232,249,0.35)" : entry.level === "phase" ? "rgba(167,139,250,0.35)" : entry.level === "success" ? "rgba(52,211,153,0.3)" : "transparent",
        background: dark ? "transparent" : `${color}04`,
      }}
    >
      <div
        onClick={() => has && setOpen(v => !v)}
        className={cn("flex items-start gap-2 px-3 py-0.5", has && "cursor-pointer hover:bg-white/[0.02]")}
        style={{ opacity: dark ? 0.5 : 1 }}
      >
        <span className="text-zinc-700 flex-shrink-0 w-[70px] pt-[1px]">{fmtTs(entry.ts)}</span>
        <Icon className="w-2.5 h-2.5 mt-[3px] flex-shrink-0" style={{ color }} />
        <span className="text-zinc-600 flex-shrink-0 w-[60px] truncate pt-[1px]">[{entry.module}]</span>
        <span className="flex-1 break-all leading-relaxed" style={{ color }}>{entry.message}</span>
        {has && <ChevronDown className="w-2.5 h-2.5 flex-shrink-0 transition-transform" style={{ color: "#3f3f46", transform: open ? "rotate(180deg)" : "none" }} />}
      </div>
      {open && has && (
        <div className="pl-[140px] pr-3 pb-1.5">
          <pre className="text-[9px] text-zinc-500 bg-black/40 border border-white/[0.04] rounded p-2 overflow-x-auto max-h-[180px] m-0 font-mono">
            {JSON.stringify(entry.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── NETWORK TAB ─────────────────────────────────────────────────────────────
function NetworkTab({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  const [entries, setEntries] = useState<NetworkEntry[]>(getNetworkLog());
  const [selected, setSelected] = useState<NetworkEntry | null>(null);

  useEffect(() => {
    const unsub = onNetworkEvent(entry => setEntries(prev => [...prev.slice(-499), entry]));
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!search) return entries;
    const s = search.toLowerCase();
    return entries.filter(e => e.url.toLowerCase().includes(s) || e.method.toLowerCase().includes(s));
  }, [entries, search]);

  const stats = useMemo(() => {
    const ok = entries.filter(e => e.status && e.status < 400).length;
    const errors = entries.filter(e => e.error || (e.status && e.status >= 400)).length;
    const avgLatency = entries.filter(e => e.duration).reduce((s, e) => s + (e.duration || 0), 0) / Math.max(entries.filter(e => e.duration).length, 1);
    return { total: entries.length, ok, errors, avgLatency: Math.round(avgLatency) };
  }, [entries]);

  return (
    <div className="h-full flex flex-col">
      {/* Stats row */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-white/[0.04] text-[10px] flex-shrink-0">
        <span className="text-zinc-500">Total: <strong className="text-zinc-200 font-bold text-mono">{stats.total}</strong></span>
        <span className="text-zinc-500">OK: <strong className="text-emerald-400 font-bold text-mono">{stats.ok}</strong></span>
        <span className="text-zinc-500">Erreurs: <strong className="text-red-400 font-bold text-mono">{stats.errors}</strong></span>
        <span className="text-zinc-500">Latence moy: <strong className="text-amber-400 font-bold text-mono">{stats.avgLatency}ms</strong></span>
        <div className="flex-1 max-w-[280px]">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer URL..." sizeVariant="sm" icon={<Search />} />
        </div>
      </div>

      {/* Split: list / details */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto s-thin">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
              Aucune requête HTTP enregistrée
            </div>
          ) : (
            <table className="w-full text-[10px] font-mono">
              <thead className="sticky top-0 bg-[#0a0d15] border-b border-white/[0.06] z-10">
                <tr className="text-zinc-500">
                  <th className="text-left px-2 py-1 font-semibold">Method</th>
                  <th className="text-left px-2 py-1 font-semibold">URL</th>
                  <th className="text-right px-2 py-1 font-semibold">Status</th>
                  <th className="text-right px-2 py-1 font-semibold">Time</th>
                  <th className="text-right px-2 py-1 font-semibold">Size</th>
                </tr>
              </thead>
              <tbody>
                {[...filtered].reverse().slice(0, 200).map(e => {
                  const statusColor = e.error ? "#f87171" : e.status && e.status < 300 ? "#34d399" : e.status && e.status < 400 ? "#fbbf24" : "#f87171";
                  const methodColors: Record<string, string> = { GET: "#22d3ee", POST: "#a78bfa", PUT: "#fbbf24", DELETE: "#f87171" };
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelected(e)}
                      className={cn("border-b border-white/[0.02] cursor-pointer hover:bg-white/[0.03] transition-colors", selected?.id === e.id && "bg-white/[0.05]")}
                    >
                      <td className="px-2 py-1 font-bold" style={{ color: methodColors[e.method] || "#71717a" }}>{e.method}</td>
                      <td className="px-2 py-1 text-zinc-300 truncate max-w-[400px]">{e.url.replace(/^https?:\/\/[^/]+/, "")}</td>
                      <td className="px-2 py-1 text-right font-bold" style={{ color: statusColor }}>{e.status || "ERR"}</td>
                      <td className="px-2 py-1 text-right text-zinc-400">{e.duration ? `${e.duration}ms` : "-"}</td>
                      <td className="px-2 py-1 text-right text-zinc-500">{e.responseSize ? formatBytes(e.responseSize) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Details panel */}
        {selected && (
          <div className="w-[320px] border-l border-white/[0.06] overflow-y-auto s-thin bg-black/20">
            <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
              <Badge variant="accent" size="xs">{selected.method}</Badge>
              <Badge variant={selected.error || (selected.status && selected.status >= 400) ? "danger" : "success"} size="xs">
                {selected.status || "ERR"}
              </Badge>
              <button onClick={() => setSelected(null)} className="ml-auto text-zinc-500 hover:text-zinc-300">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="p-3 space-y-3 text-[10px] font-mono">
              <div>
                <div className="text-zinc-500 mb-1">URL</div>
                <div className="text-zinc-300 break-all">{selected.url}</div>
              </div>
              <div>
                <div className="text-zinc-500 mb-1">Timing</div>
                <div className="text-zinc-300">{selected.duration ? `${selected.duration}ms` : "-"}</div>
                {selected.retries !== undefined && selected.retries > 0 && (
                  <div className="text-amber-400">Retries: {selected.retries}</div>
                )}
              </div>
              {selected.requestBody && (
                <div>
                  <div className="text-zinc-500 mb-1">Request Body</div>
                  <pre className="text-[9px] bg-black/40 border border-white/[0.04] rounded p-2 overflow-x-auto max-h-[120px]">
                    {JSON.stringify(selected.requestBody, null, 2)}
                  </pre>
                </div>
              )}
              {selected.error && (
                <div>
                  <div className="text-red-400 mb-1">Error</div>
                  <div className="text-red-300">{selected.error}</div>
                </div>
              )}
              {selected.responseSize !== undefined && (
                <div>
                  <div className="text-zinc-500 mb-1">Response Size</div>
                  <div className="text-zinc-300">{formatBytes(selected.responseSize)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SSE TAB ─────────────────────────────────────────────────────────────────
function SSETab({ log, paused }: { log: DebugEntry[]; paused: boolean }) {
  const sseEvents = useMemo(() => log.filter(e => e.module === "SSE" || e.payload?.type), [log]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paused && endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [sseEvents.length, paused]);

  // Event type counts
  const eventTypes = useMemo(() => {
    const m: Record<string, number> = {};
    log.forEach(e => {
      const type = e.payload?.type || (e.message.match(/\[(\w+)\]/)?.[1]);
      if (type) m[type] = (m[type] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [log]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] flex-wrap flex-shrink-0">
        <span className="text-[10px] text-zinc-500">Types d'événements :</span>
        {eventTypes.slice(0, 12).map(([type, count]) => (
          <span key={type} className="chip text-[9px]">
            <span className="text-zinc-300">{type}</span>
            <span className="text-zinc-600">({count})</span>
          </span>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto s-thin font-mono text-[10px]">
        {sseEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
            Aucun événement SSE — lancez une investigation
          </div>
        ) : (
          sseEvents.slice(-300).map(e => <LogLine key={e.id} entry={e} />)
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── MODULES TAB ─────────────────────────────────────────────────────────────
function ModulesTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await debugApi.modulesStatus();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="h-full flex items-center justify-center text-zinc-500 text-xs">Chargement...</div>;
  if (error) return <div className="h-full flex items-center justify-center text-red-400 text-xs">{error}</div>;
  if (!data) return null;

  return (
    <div className="h-full overflow-y-auto s-thin p-3 space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="panel-subtle rounded-lg p-2">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Total</div>
          <div className="text-xl font-bold text-zinc-100 text-mono">{data.total}</div>
        </div>
        <div className="panel-subtle rounded-lg p-2">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Available</div>
          <div className="text-xl font-bold text-emerald-400 text-mono">{data.available}</div>
        </div>
        <div className="panel-subtle rounded-lg p-2">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Unavailable</div>
          <div className="text-xl font-bold text-red-400 text-mono">{data.unavailable}</div>
        </div>
        <div className="panel-subtle rounded-lg p-2">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Rate</div>
          <div className="text-xl font-bold text-cyan-400 text-mono">{Math.round((data.available / data.total) * 100)}%</div>
        </div>
      </div>

      {/* By category */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Par catégorie</div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(data.byCategory || {}).map(([cat, counts]: [string, any]) => (
            <div key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
              <div className="flex-1">
                <div className="text-[10px] text-zinc-300 font-semibold">{cat}</div>
                <div className="text-[9px] text-zinc-600 text-mono">{counts.available}/{counts.total}</div>
              </div>
              <div className="w-16">
                <ProgressBar value={counts.available} max={counts.total} variant={counts.available === counts.total ? "success" : counts.available > 0 ? "accent" : "danger"} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module list */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Modules ({data.modules.length})</div>
        <div className="space-y-0.5">
          {data.modules.map((m: any) => (
            <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded text-[10px] hover:bg-white/[0.02]">
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", m.available ? "bg-emerald-400" : "bg-red-400")} />
              <span className="text-zinc-300 text-mono flex-1 truncate">{m.id}</span>
              <span className="text-zinc-500">{m.category}</span>
              <span className="text-zinc-600 text-[9px]">[{m.targetTypes?.join(",") || "any"}]</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={fetchData} className="w-full py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 border border-white/[0.06] rounded-md transition-colors">
        Rafraîchir
      </button>
    </div>
  );
}

// ─── HEALTH TAB ──────────────────────────────────────────────────────────────
function HealthTab() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [backendHealth, setBackendHealth] = useState<any>(null);
  const [system, setSystem] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [env, setEnv] = useState<any>(null);
  const [history, setHistory] = useState<Array<{ ts: number; latency: number | null }>>([]);

  useEffect(() => {
    const unsub = onHealth(s => {
      setHealth(s);
      setHistory(h => [...h.slice(-59), { ts: s.lastCheck, latency: s.latencyMs }]);
    });
    // Initial load
    Promise.all([
      debugApi.health().catch(() => null),
      debugApi.system().catch(() => null),
      debugApi.stats().catch(() => null),
      (debugApi as any).system && fetch("http://localhost:3002/api/debug/env").then(r => r.json()).catch(() => null),
    ]).then(([bh, sys, st, e]) => {
      setBackendHealth(bh); setSystem(sys); setStats(st); setEnv(e);
    });
    const timer = setInterval(() => {
      Promise.all([
        debugApi.health().catch(() => null),
        debugApi.stats().catch(() => null),
      ]).then(([bh, st]) => { if (bh) setBackendHealth(bh); if (st) setStats(st); });
    }, 5000);
    return () => { unsub(); clearInterval(timer); };
  }, []);

  const maxLatency = Math.max(...history.map(h => h.latency || 0), 100);

  return (
    <div className="h-full overflow-y-auto s-thin p-3 space-y-3">
      {/* Connection status */}
      <div className="grid grid-cols-4 gap-2">
        <KPI
          icon={<HeartPulse className="w-3.5 h-3.5" />}
          label="Backend"
          value={health?.ok ? "OK" : "OFF"}
          sub={health?.latencyMs != null ? `${health.latencyMs}ms` : "-"}
          color={health?.ok ? "#34d399" : "#f87171"}
        />
        <KPI
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Uptime"
          value={backendHealth?.uptime ? formatUptime(backendHealth.uptime) : "-"}
          color="#22d3ee"
        />
        <KPI
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Requests"
          value={stats?.requests ?? "-"}
          sub={stats?.errors ? `${stats.errors} errors` : "OK"}
          color="#a78bfa"
        />
        <KPI
          icon={<Zap className="w-3.5 h-3.5" />}
          label="Memory"
          value={backendHealth?.memory ? `${Math.round(backendHealth.memory.heapUsed / 1024 / 1024)}M` : "-"}
          sub={backendHealth?.memory ? `${Math.round(backendHealth.memory.heapTotal / 1024 / 1024)}M total` : ""}
          color="#fbbf24"
        />
      </div>

      {/* Latency graph */}
      <div className="panel-subtle rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Latence backend (60 dernières sondes)
        </div>
        <div className="h-16 flex items-end gap-[2px]">
          {Array.from({ length: 60 }).map((_, i) => {
            const h = history[history.length - 60 + i];
            const pct = h?.latency ? Math.min(100, (h.latency / maxLatency) * 100) : 0;
            const color = !h ? "rgba(255,255,255,0.03)" : h.latency === null ? "#f8717199" : h.latency > 200 ? "#fbbf24" : "#34d399";
            return (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(pct, 2)}%`, background: color }} />
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
          <span>il y a 10 min</span>
          <span>{history[history.length - 1]?.latency ? `${history[history.length - 1].latency}ms` : "..."}</span>
        </div>
      </div>

      {/* System info */}
      {system && (
        <div className="panel-subtle rounded-lg p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Système</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <Row label="Hostname" value={system.hostname} />
            <Row label="Platform" value={`${system.platform} ${system.arch}`} />
            <Row label="Node" value={system.nodeVersion} />
            <Row label="CPUs" value={`${system.cpus}× ${system.cpuModel?.slice(0, 25)}`} />
            <Row label="Load avg" value={system.loadAverage?.map((n: number) => n.toFixed(2)).join(" / ")} />
            <Row label="Total RAM" value={formatBytes(system.totalMemory)} />
            <Row label="Free RAM" value={formatBytes(system.freeMemory)} />
            <Row label="OS Uptime" value={formatUptime(system.uptime)} />
          </div>
        </div>
      )}

      {/* Ollama status */}
      {backendHealth?.ollama && (
        <div className="panel-subtle rounded-lg p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Ollama AI</div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("w-1.5 h-1.5 rounded-full", backendHealth.ollama.available ? "bg-emerald-400 blink-dot" : "bg-red-400")} />
            <span className="text-[11px] text-zinc-300">{backendHealth.ollama.available ? "Connecté" : "Hors ligne"}</span>
            <span className="text-[10px] text-zinc-600 text-mono">{backendHealth.ollama.url}</span>
          </div>
          {backendHealth.ollama.models?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {backendHealth.ollama.models.map((m: string) => (
                <span key={m} className="chip text-[9px]">{m}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* API Keys status */}
      {env && (
        <div className="panel-subtle rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Clés API</div>
            <Badge variant={env.keysSet > 0 ? "success" : "muted"} size="xs">
              {env.keysSet} / {env.keysTotal}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[9px]">
            {Object.entries(env.keys || {}).map(([name, info]: [string, any]) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className={cn("w-1 h-1 rounded-full", info.set ? "bg-emerald-400" : "bg-zinc-700")} />
                <span className="text-mono" style={{ color: info.set ? "#a1a1aa" : "#3f3f46" }}>
                  {name.replace(/_(API_)?KEY|_TOKEN/g, "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-600 w-20 flex-shrink-0">{label}:</span>
      <span className="text-zinc-300 text-mono truncate">{value}</span>
    </div>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

function formatUptime(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h${Math.round((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

function exportDebugDump(log: DebugEntry[]) {
  const dump = {
    generatedAt: new Date().toISOString(),
    logs: log,
    network: getNetworkLog(),
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `debug-dump-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
