// ModuleMarketplace — Vue pour installer / activer / gérer les modules OSINT
// Appelle /api/installer pour installer dynamiquement pip/npm packages

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package, Search, CheckCircle2, XCircle, Download, ExternalLink,
  Loader2, Zap, Shield, Globe, User, Mail, Phone, Image as ImageIcon,
  Terminal, AlertTriangle, X, Play,
} from "lucide-react";
import { cn, Badge, Input, Button, IconButton, Tooltip, EmptyState } from "../ui";

interface InstallableModule {
  id: string;
  name: string;
  description: string;
  method: "pip" | "npm" | "go" | "git";
  package: string;
  binary?: string;
  homepage?: string;
  category: string;
  targetTypes: string[];
}

interface LiveModule {
  id: string;
  name: string;
  category: string;
  targetTypes: string[];
  available: boolean;
}

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:3002/api";

const CAT_ICONS: Record<string, any> = {
  username: User, email: Mail, phone: Phone, domain: Globe,
  ip: Globe, social: User, search: Search, image: ImageIcon,
  person: User, darkweb: Shield, analysis: Zap,
};

const CAT_COLORS: Record<string, string> = {
  username: "#8b5cf6", email: "#3b82f6", phone: "#22c55e",
  domain: "#06b6d4", ip: "#f97316", social: "#ec4899",
  search: "#22d3ee", image: "#10b981", person: "#a78bfa",
  darkweb: "#ef4444", analysis: "#fbbf24",
};

export default function ModuleMarketplace() {
  const [installable, setInstallable] = useState<InstallableModule[]>([]);
  const [live, setLive] = useState<LiveModule[]>([]);
  const [installStatus, setInstallStatus] = useState<Record<string, "checking" | "installed" | "missing">>({});
  const [installing, setInstalling] = useState<string | null>(null);
  const [installLog, setInstallLog] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    Promise.all([
      fetch(`${API}/installer/installable`).then(r => r.json()).catch(() => ({ modules: [] })),
      fetch(`${API}/debug/modules-status`).then(r => r.json()).catch(() => ({ modules: [] })),
    ]).then(([inst, mods]) => {
      setInstallable(inst.modules || []);
      setLive(mods.modules || []);
      setLoading(false);
      // Start checking install status in background
      (inst.modules || []).forEach((m: InstallableModule) => {
        setInstallStatus(prev => ({ ...prev, [m.id]: "checking" }));
        fetch(`${API}/installer/check/${m.id}`).then(r => r.json()).then(data => {
          setInstallStatus(prev => ({ ...prev, [m.id]: data.installed ? "installed" : "missing" }));
        }).catch(() => setInstallStatus(prev => ({ ...prev, [m.id]: "missing" })));
      });
    });
  }, []);

  // Categories from both live + installable
  const categories = useMemo(() => {
    const cats = new Set<string>();
    live.forEach(m => cats.add(m.category));
    installable.forEach(m => cats.add(m.category));
    return ["all", ...Array.from(cats).sort()];
  }, [live, installable]);

  // Stats
  const stats = useMemo(() => ({
    liveTotal: live.length,
    liveAvailable: live.filter(m => m.available).length,
    installable: installable.length,
    installed: Object.values(installStatus).filter(s => s === "installed").length,
    notInstalled: Object.values(installStatus).filter(s => s === "missing").length,
  }), [live, installable, installStatus]);

  // Filter
  const filteredInstallable = useMemo(() => {
    return installable.filter(m => {
      if (category !== "all" && m.category !== category) return false;
      if (query && !(m.name.toLowerCase().includes(query.toLowerCase()) || m.description.toLowerCase().includes(query.toLowerCase()) || m.id.includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [installable, category, query]);

  const filteredLive = useMemo(() => {
    return live.filter(m => {
      if (category !== "all" && m.category !== category) return false;
      if (query && !(m.name.toLowerCase().includes(query.toLowerCase()) || m.id.includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [live, category, query]);

  // Install via SSE
  const install = (id: string) => {
    setInstalling(id);
    setInstallLog(prev => ({ ...prev, [id]: [] }));

    fetch(`${API}/installer/install/${id}`, { method: "POST" }).then(async (resp) => {
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { setInstalling(null); break; }
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "stdout" || ev.type === "stderr") {
              setInstallLog(prev => ({
                ...prev,
                [id]: [...(prev[id] || []), `[${ev.type}] ${ev.data.trim()}`],
              }));
            } else if (ev.type === "done") {
              setInstallStatus(prev => ({ ...prev, [id]: ev.success ? "installed" : "missing" }));
              setInstallLog(prev => ({ ...prev, [id]: [...(prev[id] || []), `--- exit code ${ev.code} ---`] }));
            }
          } catch {}
        }
      }
      setInstalling(null);
    }).catch(err => {
      setInstallLog(prev => ({ ...prev, [id]: [...(prev[id] || []), `ERROR: ${err.message}`] }));
      setInstalling(null);
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-3">
        <div className="ring-loader" />
        <div className="text-xs text-zinc-500">Chargement des modules...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header stats */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] panel-subtle flex-shrink-0 flex-wrap">
        <Package className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-bold text-zinc-100">Marketplace de modules</span>
        <div className="h-5 w-px bg-white/[0.08] mx-1" />
        <div className="flex gap-2 flex-wrap">
          <Badge variant="success" size="sm" dot>{stats.liveAvailable}/{stats.liveTotal} actifs</Badge>
          <Badge variant="accent" size="sm">{stats.installable} installables</Badge>
          {stats.installed > 0 && <Badge variant="info" size="sm">{stats.installed} déjà installés</Badge>}
        </div>
        <div className="flex-1" />
        <div className="min-w-[220px]">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher..."
            icon={<Search />}
            sizeVariant="sm"
          />
        </div>
      </div>

      {/* Categories filter */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/[0.04] flex-wrap flex-shrink-0 overflow-x-auto s-thin">
        {categories.map(c => {
          const active = category === c;
          const count = c === "all" ? stats.liveTotal : live.filter(m => m.category === c).length;
          const Icon = CAT_ICONS[c] || Package;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border whitespace-nowrap press",
                active
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.05] hover:border-white/[0.12]",
              )}
            >
              <Icon className="w-2.5 h-2.5" />
              {c}
              <span className="text-mono opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto s-thin p-4 space-y-6">

        {/* Installable modules */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Modules installables</h3>
            <span className="text-[10px] text-zinc-500 text-mono">({filteredInstallable.length})</span>
          </div>
          {filteredInstallable.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-600">Aucun résultat</div>
          ) : (
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
              <AnimatePresence>
                {filteredInstallable.map(m => {
                  const status = installStatus[m.id] || "checking";
                  const color = CAT_COLORS[m.category] || "#71717a";
                  const Icon = CAT_ICONS[m.category] || Package;
                  const isInstalling = installing === m.id;
                  return (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}18`, border: `1px solid ${color}33`, color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-bold text-zinc-100">{m.name}</span>
                            <Badge variant="muted" size="xs">{m.method}</Badge>
                            {status === "installed" && <Badge variant="success" size="xs" dot>installé</Badge>}
                            {status === "missing" && <Badge variant="muted" size="xs">non installé</Badge>}
                            {status === "checking" && <Loader2 className="w-2.5 h-2.5 animate-spin text-zinc-500" />}
                          </div>
                          <div className="text-[10px] text-zinc-400 leading-relaxed mb-1">{m.description}</div>
                          <div className="text-[9px] text-mono text-zinc-600">
                            {m.id} · {m.package}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {status === "missing" && !isInstalling && (
                            <Button
                              variant="primary" size="xs"
                              onClick={() => install(m.id)}
                              icon={<Download className="w-2.5 h-2.5" />}
                            >
                              Install
                            </Button>
                          )}
                          {isInstalling && (
                            <Button variant="accent" size="xs" disabled icon={<Loader2 className="w-2.5 h-2.5 animate-spin" />}>
                              En cours…
                            </Button>
                          )}
                          {status === "installed" && (
                            <Badge variant="success" size="xs" icon={<CheckCircle2 className="w-2 h-2" />}>
                              OK
                            </Badge>
                          )}
                          {m.homepage && (
                            <a href={m.homepage} target="_blank" rel="noreferrer" className="text-[9px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5">
                              <ExternalLink className="w-2 h-2" /> source
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Install log */}
                      {installLog[m.id]?.length > 0 && (
                        <div className="mt-2 p-2 rounded bg-black/40 border border-white/[0.04] text-[9px] font-mono text-zinc-500 max-h-[120px] overflow-y-auto s-thin">
                          {installLog[m.id].slice(-12).map((line, i) => (
                            <div key={i} className={cn(
                              line.startsWith("[stderr]") ? "text-amber-400" : "",
                              line.startsWith("ERROR") ? "text-red-400" : "",
                              line.includes("exit code 0") ? "text-emerald-400 font-bold" : "",
                              line.includes("exit code") && !line.includes("0") ? "text-red-400 font-bold" : "",
                            )}>{line}</div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Live modules */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Modules actifs</h3>
            <span className="text-[10px] text-zinc-500 text-mono">({filteredLive.length})</span>
          </div>
          <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {filteredLive.map(m => {
              const color = CAT_COLORS[m.category] || "#71717a";
              const Icon = CAT_ICONS[m.category] || Package;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[10px]",
                    m.available
                      ? "bg-white/[0.015] border-white/[0.05]"
                      : "bg-red-500/5 border-red-500/15 opacity-60",
                  )}
                >
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", m.available ? "bg-emerald-400 blink-dot" : "bg-red-400")}
                  />
                  <Icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color }} />
                  <span className="text-zinc-200 font-medium truncate flex-1">{m.name}</span>
                  <span className="text-mono text-zinc-600 text-[9px]">{m.category}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
