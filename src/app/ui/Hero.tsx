// Hero — écran d'accueil spectaculaire
// Logo animé, search bar géante, exemples, stats live

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Radar, Search, Sparkles, Zap, Package, Shield, Bot,
  User, Mail, Phone, Globe, Wifi, Hash, ArrowRight, Command as CmdIcon,
  Activity,
} from "lucide-react";
import { cn, Badge, Kbd, Button } from "./primitives";

interface Props {
  target: string;
  setTarget: (v: string) => void;
  detectedType: string;
  onStart: () => void;
  onOpenPalette: () => void;
  liveCount: number;
  catalogCount: number;
  aiAvailable: boolean;
  backendOk: boolean | null;
  history: { target: string; type: string; time: number }[];
  onHistoryClick: (target: string) => void;
}

const EXAMPLES = [
  { val: "elonmusk", icon: User, color: "#8b5cf6", label: "Username", sub: "Sherlock + 300 sites" },
  { val: "contact@openai.com", icon: Mail, color: "#3b82f6", label: "Email", sub: "HIBP + Holehe + GHunt" },
  { val: "+33769723999", icon: Phone, color: "#22c55e", label: "Téléphone", sub: "Ignorant + Instagram" },
  { val: "github.com", icon: Globe, color: "#06b6d4", label: "Domaine", sub: "crt.sh + theHarvester" },
  { val: "8.8.8.8", icon: Wifi, color: "#f97316", label: "IP", sub: "GeoIP + Shodan" },
  { val: "Jean Dupont", icon: Hash, color: "#ec4899", label: "Nom", sub: "LinkedIn + Wikidata" },
];

const TRUST_POINTS = [
  { label: "150+ modules OSINT", icon: Package },
  { label: "Temps réel SSE", icon: Zap },
  { label: "IA locale Ollama", icon: Bot },
  { label: "100% local", icon: Shield },
];

export default function Hero({
  target, setTarget, detectedType, onStart, onOpenPalette,
  liveCount, catalogCount, aiAvailable, backendOk, history, onHistoryClick,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto s-thin flex flex-col relative">

      {/* Animated mesh background */}
      <div className="absolute inset-0 mesh-bg pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[20%] w-[400px] h-[400px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.25) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)" }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative flex-1 flex flex-col items-center justify-center px-8 py-12 max-w-3xl mx-auto w-full">

        {/* Logo animé */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6"
        >
          <div className="relative w-20 h-20 mx-auto">
            {/* Outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-3xl"
              style={{
                background: "conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.6) 90deg, transparent 180deg, rgba(139,92,246,0.4) 270deg, transparent 360deg)",
                padding: "2px",
              }}
            >
              <div className="w-full h-full rounded-3xl bg-[#07090f]" />
            </motion.div>

            {/* Core */}
            <div
              className="absolute inset-[3px] rounded-3xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.15))",
                backdropFilter: "blur(10px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 32px rgba(34,211,238,0.3)",
              }}
            >
              <Radar className="w-9 h-9 text-cyan-400" strokeWidth={1.5} />
            </div>

            {/* Pulse dots */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl border-2 border-cyan-400/40"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-2"
        >
          <h1 className="text-5xl font-black tracking-tight text-zinc-50 text-display leading-none">
            OSINT<span className="text-gradient-cyan">Master</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
            Moteur d'investigation autonome. Entrez un <span className="text-zinc-300">username, email, IP, téléphone ou domaine</span> — les 150+ modules se lancent en parallèle.
          </p>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-8 text-[10px] text-zinc-500"
        >
          {TRUST_POINTS.map(p => (
            <div key={p.label} className="flex items-center gap-1.5">
              <p.icon className="w-3 h-3 text-cyan-400/70" />
              <span>{p.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-2xl relative"
        >
          <div
            className={cn(
              "relative rounded-2xl transition-all",
              focused
                ? "bg-white/[0.06] ring-2 ring-cyan-400/40 shadow-[0_0_60px_rgba(34,211,238,0.2)]"
                : "bg-white/[0.03] ring-1 ring-white/[0.08] hover:ring-white/[0.15]",
            )}
          >
            <div className="flex items-center gap-3 px-5 py-4">
              <Search className={cn("w-5 h-5 transition-colors", focused ? "text-cyan-400" : "text-zinc-500")} />
              <input
                value={target}
                onChange={e => setTarget(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => e.key === "Enter" && target && onStart()}
                placeholder="username · email · IP · téléphone · domaine..."
                className="flex-1 bg-transparent outline-none text-base text-zinc-100 placeholder:text-zinc-600"
                autoFocus
              />
              {detectedType && (
                <Badge variant="accent" size="sm">
                  {detectedType}
                </Badge>
              )}
              <Button
                variant="primary"
                size="md"
                disabled={!target}
                onClick={onStart}
                iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Lancer
              </Button>
            </div>

            {/* Footer inside search */}
            <div className="flex items-center justify-between px-5 pb-3 text-[10px] text-zinc-500 border-t border-white/[0.04] pt-2.5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <Kbd>↵</Kbd> lancer
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>⌘</Kbd><Kbd>K</Kbd> commandes
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", backendOk ? "bg-emerald-400" : "bg-red-400")} />
                  <span>API {backendOk ? "en ligne" : "hors ligne"}</span>
                </div>
                {aiAvailable && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>IA dispo</span>
                  </div>
                )}
                <span className="text-mono">{liveCount}/{catalogCount} modules</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Examples grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full mt-8"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-3 text-center">
            Essayer avec
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {EXAMPLES.map((ex, i) => {
              const Icon = ex.icon;
              return (
                <motion.button
                  key={ex.val}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  onClick={() => setTarget(ex.val)}
                  className="group relative rounded-xl p-3 text-left border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.15] transition-all lift"
                >
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: `radial-gradient(circle at 0% 0%, ${ex.color}22 0%, transparent 60%)` }}
                  />
                  <div className="relative flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${ex.color}1a`, border: `1px solid ${ex.color}33`, color: ex.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-zinc-200 truncate">{ex.val}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{ex.sub}</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Recent history */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full mt-6"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Récents
            </div>
            <div className="flex flex-wrap gap-1.5">
              {history.slice(0, 6).map((h, i) => (
                <button
                  key={i}
                  onClick={() => onHistoryClick(h.target)}
                  className="chip hover:bg-white/[0.08] hover:border-white/[0.15] transition-colors"
                >
                  <span className="text-zinc-300">{h.target.length > 28 ? h.target.slice(0, 26) + "…" : h.target}</span>
                  <span className="text-zinc-600">· {h.type}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
