// Sidebar — panneau latéral premium
// Config + Modules + History avec tabs animés

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play, Square, Loader2, Sliders, Package, Clock, CheckCircle2,
  ArrowRight, Search, X, RefreshCw, Sparkles, Eye, Filter,
  User, Mail, Phone, Globe, Wifi, Hash, ChevronRight,
} from "lucide-react";
import { LeftTab, Cfg, CatalogMod, ETYPE_ICONS, ec, detectType } from "../constants";
import { cn, Badge, Button, IconButton, Label, Input, Toggle, Tooltip, Kbd } from "./primitives";

interface Props {
  target: string;
  setTarget: (v: string) => void;
  detectedType: string;
  cfg: Cfg;
  setCfg: React.Dispatch<React.SetStateAction<Cfg>>;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  leftTab: LeftTab;
  setLeftTab: (t: LeftTab) => void;
  catalog: CatalogMod[];
  liveCount: number;
  selectedModules: string[];
  toggleMod: (id: string) => void;
  history: { target: string; type: string; time: number }[];
  onHistoryClick: (target: string) => void;
}

export default function Sidebar({
  target, setTarget, detectedType, cfg, setCfg,
  running, onStart, onStop, onReset,
  leftTab, setLeftTab, catalog, liveCount, selectedModules, toggleMod,
  history, onHistoryClick,
}: Props) {

  const tabs: Array<{ id: LeftTab; label: string; icon: React.ReactNode }> = [
    { id: "config", label: "Config", icon: <Sliders className="w-3 h-3" /> },
    { id: "modules", label: "Modules", icon: <Package className="w-3 h-3" /> },
    { id: "history", label: "Historique", icon: <Clock className="w-3 h-3" /> },
  ];

  return (
    <aside className="flex flex-col h-full border-r border-white/[0.05] panel overflow-hidden flex-shrink-0" style={{ width: 300 }}>

      {/* Tab bar */}
      <div className="relative flex border-b border-white/[0.05] flex-shrink-0">
        {tabs.map(t => {
          const active = leftTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setLeftTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors press",
                active ? "text-accent" : "text-zinc-600 hover:text-zinc-400",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
        <motion.div
          className="absolute bottom-0 h-[2px] bg-accent rounded-t-full"
          animate={{
            left: `${(tabs.findIndex(t => t.id === leftTab) * 100) / tabs.length}%`,
            width: `${100 / tabs.length}%`,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ boxShadow: "0 0 10px rgb(var(--accent) / 0.6)" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto s-thin">
        <AnimatePresence mode="wait">
          {leftTab === "config" && (
            <motion.div
              key="cfg"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-5"
            >
              {/* Target input */}
              <div>
                <Label>Cible d'investigation</Label>
                <div className="relative">
                  <Input
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !running && onStart()}
                    placeholder="username · email · IP..."
                    sizeVariant="md"
                    icon={<Search />}
                    iconRight={detectedType ? <Badge variant="accent" size="xs">{detectedType}</Badge> : null}
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {[
                    { val: "elonmusk", label: "username" },
                    { val: "test@gmail.com", label: "email" },
                    { val: "8.8.8.8", label: "ip" },
                  ].map(e => (
                    <button
                      key={e.val}
                      onClick={() => setTarget(e.val)}
                      className="chip hover:bg-white/[0.08] transition-colors"
                    >
                      {e.val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start/Stop big button */}
              <div>
                {!running ? (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={!target}
                    onClick={onStart}
                    icon={<Play className="w-3.5 h-3.5" />}
                    iconRight={<Kbd>↵</Kbd>}
                  >
                    Lancer l'investigation
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    onClick={onStop}
                    icon={<Square className="w-3.5 h-3.5" />}
                  >
                    Arrêter
                  </Button>
                )}
              </div>

              {/* Sliders */}
              <div>
                <Label>Paramètres</Label>
                <div className="space-y-3">
                  {[
                    { k: "maxDepth", l: "Profondeur", mn: 0, mx: 5, st: 1, c: "#22d3ee", f: (v: number) => `${v} niv.` },
                    { k: "recursiveThreshold", l: "Seuil récursion", mn: 30, mx: 100, st: 5, c: "#a78bfa", f: (v: number) => `${v}%` },
                    { k: "maxEntities", l: "Max entités", mn: 50, mx: 2000, st: 50, c: "#fbbf24", f: (v: number) => `${v}` },
                    { k: "timeoutMs", l: "Timeout", mn: 30, mx: 600, st: 30, c: "#f472b6", f: (v: number) => `${v}s`, div: 1000 },
                  ].map((p: any) => {
                    const raw = (cfg as any)[p.k];
                    const disp = p.div ? raw / p.div : raw;
                    return (
                      <div key={p.k}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-zinc-400">{p.l}</span>
                          <span className="text-[11px] font-bold text-mono" style={{ color: p.c }}>{p.f(disp)}</span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min={p.mn} max={p.mx} step={p.st}
                            value={p.div ? disp : raw}
                            onChange={e => setCfg(c => ({ ...c, [p.k]: p.div ? +e.target.value * p.div : +e.target.value }))}
                            className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, ${p.c} 0%, ${p.c} ${((disp - p.mn) / (p.mx - p.mn)) * 100}%, rgba(255,255,255,0.06) ${((disp - p.mn) / (p.mx - p.mn)) * 100}%, rgba(255,255,255,0.06) 100%)`,
                              accentColor: p.c,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Options toggles */}
              <div>
                <Label>Options</Label>
                <div className="space-y-1">
                  <Toggle
                    checked={cfg.enableAI}
                    onChange={v => setCfg(c => ({ ...c, enableAI: v }))}
                    label="Analyse IA"
                    description="Rapport final par Ollama"
                  />
                  <Toggle
                    checked={cfg.enableWebSearch}
                    onChange={v => setCfg(c => ({ ...c, enableWebSearch: v }))}
                    label="Web Dorking"
                    description="Google dorks auto"
                  />
                  <Toggle
                    checked={cfg.enableRecursive}
                    onChange={v => setCfg(c => ({ ...c, enableRecursive: v }))}
                    label="Mode récursif"
                    description="Investigation en profondeur"
                  />
                </div>
              </div>

              {/* Reset button */}
              <button
                onClick={onReset}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Réinitialiser la session
              </button>
            </motion.div>
          )}

          {leftTab === "modules" && (
            <motion.div
              key="mods"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-3"
            >
              <ModulesPanel
                catalog={catalog}
                selectedModules={selectedModules}
                toggleMod={toggleMod}
                liveCount={liveCount}
              />
            </motion.div>
          )}

          {leftTab === "history" && (
            <motion.div
              key="hist"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-2"
            >
              <Label>Historique ({history.length})</Label>
              {history.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-600">Aucun historique</div>
              ) : (
                history.map((h, i) => {
                  const Icon = ETYPE_ICONS[h.type] || Hash;
                  return (
                    <button
                      key={i}
                      onClick={() => onHistoryClick(h.target)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all text-left group"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: `${ec(h.type)}1a`, border: `1px solid ${ec(h.type)}33`, color: ec(h.type) }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">{h.target}</div>
                        <div className="text-[10px] text-zinc-500">
                          {new Date(h.time).toLocaleTimeString()} · <span className="text-mono">{h.type}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

// ─── Modules panel ───
function ModulesPanel({ catalog, selectedModules, toggleMod, liveCount }: {
  catalog: CatalogMod[];
  selectedModules: string[];
  toggleMod: (id: string) => void;
  liveCount: number;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = catalog
    .filter(m => (cat === "all" || m.category === cat))
    .filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.id.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));

  const categories = ["all", ...Array.from(new Set(catalog.map(m => m.category))).sort()];

  return (
    <>
      <div className="flex items-center justify-between">
        <Label>Modules ({liveCount} actifs)</Label>
        <span className="text-[9px] text-zinc-600 text-mono">{catalog.length} total</span>
      </div>

      <Input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Rechercher..."
        icon={<Search />}
        iconRight={q ? <button onClick={() => setQ("")} className="text-zinc-500 hover:text-zinc-300"><X className="w-3 h-3" /></button> : null}
        sizeVariant="sm"
      />

      <div className="flex flex-wrap gap-1">
        {categories.slice(0, 10).map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "text-[9px] px-2 py-0.5 rounded-full font-semibold transition-colors press",
              cat === c ? "bg-accent/15 text-accent border border-accent/30" : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.slice(0, 100).map(m => {
          const isOn = selectedModules.length === 0 || selectedModules.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleMod(m.id)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-md border text-left press transition-colors",
                isOn
                  ? "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                  : "border-white/[0.04] bg-transparent opacity-50 hover:opacity-100",
              )}
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                m.isLive ? "bg-emerald-400" : "bg-zinc-700",
              )} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-zinc-200 truncate">{m.name}</div>
                <div className="text-[9px] text-zinc-500 truncate">{m.category} · {m.subcategory}</div>
              </div>
              {m.isLive && <Badge variant="success" size="xs">live</Badge>}
              {m.apiKeys?.length && <Tooltip content="Requiert clé API"><span className="text-amber-400 text-[9px]">🔑</span></Tooltip>}
            </button>
          );
        })}
      </div>
    </>
  );
}
