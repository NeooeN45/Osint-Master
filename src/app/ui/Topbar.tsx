// Topbar — barre supérieure premium
// Logo, status pills, stats, actions

import { motion } from "motion/react";
import {
  Radar, Search, Command as CmdIcon, Bot, Terminal, Settings,
  Zap, Package, Loader2, AlertTriangle, XCircle, Sparkles,
  Bell, BellOff, Package2,
} from "lucide-react";
import { cn, Badge, StatusDot, IconButton, Kbd, Tooltip, Button } from "./primitives";

interface Props {
  running: boolean;
  elapsed: number;
  entities: number;
  correlations: number;
  toolsDone: number;
  toolsTotal: number;
  geoCnt: number;
  personCount: number;
  aiAvailable: boolean;
  aiModels: string[];
  selectedModel: string;
  onModelChange: (m: string) => void;
  backendOk: boolean | null;
  liveCount: number;
  catalogCount: number;
  errorCount: number;
  warnCount: number;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
  onOpenDebug: () => void;
  onOpenChat: () => void;
  onOpenMarketplace?: () => void;
  mute: boolean;
  onToggleMute: () => void;
  debugOpen: boolean;
  hasResults: boolean;
}

export default function Topbar({
  running, elapsed, entities, correlations, toolsDone, toolsTotal,
  geoCnt, personCount, aiAvailable, aiModels, selectedModel, onModelChange,
  backendOk, liveCount, catalogCount, errorCount, warnCount,
  onOpenPalette, onOpenSettings, onOpenDebug, onOpenChat, onOpenMarketplace,
  mute, onToggleMute, debugOpen, hasResults,
}: Props) {
  return (
    <header className="flex-shrink-0 relative z-50 h-12 flex items-center gap-3 px-4 border-b border-white/[0.05] panel">

      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative w-7 h-7">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-xl"
            style={{
              background: "conic-gradient(from 0deg, rgba(34,211,238,0.4), transparent 120deg, rgba(139,92,246,0.3) 240deg, transparent 360deg)",
              padding: "1px",
            }}
          >
            <div className="w-full h-full rounded-xl bg-[#07090f]" />
          </motion.div>
          <div
            className="absolute inset-[1.5px] rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.3), rgba(139,92,246,0.2))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <Radar className="w-3.5 h-3.5 text-cyan-300" strokeWidth={2} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-zinc-50 tracking-tight text-display">
            OSINT<span className="text-gradient-cyan">Master</span>
          </span>
          <Badge variant="accent" size="xs">PRO</Badge>
        </div>
      </div>

      <div className="divider-v h-6 mx-1" />

      {/* System status */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Tooltip content={aiAvailable ? "IA Ollama connectée" : "IA hors ligne"}>
          <div className={cn("chip", aiAvailable ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-zinc-600 border-zinc-700/50 bg-zinc-900/50")}>
            <StatusDot status={aiAvailable ? "online" : "offline"} pulse={aiAvailable} />
            AI
          </div>
        </Tooltip>
        <Tooltip content={backendOk ? "Backend API :3002 OK" : "Backend hors ligne"}>
          <div className={cn("chip", backendOk === true ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-red-400 border-red-500/20 bg-red-500/5")}>
            <StatusDot status={backendOk ? "online" : "offline"} pulse={!!backendOk} />
            API
          </div>
        </Tooltip>
        <Tooltip content={`${liveCount} modules actifs sur ${catalogCount}`}>
          <div className="chip text-zinc-400 cursor-default">
            <Zap className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-mono">{liveCount}</span>
            <span className="text-zinc-600">/{catalogCount}</span>
          </div>
        </Tooltip>
      </div>

      {/* Running indicator */}
      {running && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="chip text-amber-400 border-amber-500/25 bg-amber-500/10"
        >
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          <span className="text-mono">{elapsed}s</span>
        </motion.div>
      )}

      {/* Error / warn counters */}
      {errorCount > 0 && (
        <button
          onClick={onOpenDebug}
          className="chip text-red-400 border-red-500/25 bg-red-500/10 hover:bg-red-500/15 cursor-pointer press"
        >
          <XCircle className="w-2.5 h-2.5" />
          {errorCount}
        </button>
      )}
      {warnCount > 0 && (
        <button
          onClick={onOpenDebug}
          className="chip text-amber-400 border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15 cursor-pointer press"
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          {warnCount}
        </button>
      )}

      {/* Search / command palette trigger */}
      <button
        onClick={onOpenPalette}
        className="flex-1 max-w-sm mx-auto flex items-center gap-2 px-3 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors group"
      >
        <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" />
        <span className="text-xs text-zinc-500 flex-1 text-left">Rechercher, naviguer, actions...</span>
        <div className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
      </button>

      {/* Results quick stats */}
      {hasResults && (
        <div className="flex items-center gap-3 text-[10px] text-mono">
          <Stat value={entities} label="ent" color="#34d399" />
          <Stat value={correlations} label="liens" color="#a78bfa" />
          <Stat value={`${toolsDone}/${toolsTotal}`} label="mod" color="#22d3ee" />
          {geoCnt > 0 && <Stat value={geoCnt} label="geo" color="#10b981" />}
          {personCount > 0 && <Stat value={personCount} label="pers" color="#ec4899" />}
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {aiAvailable && aiModels.length > 0 && (
          <select
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
            className="h-7 px-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] text-zinc-400 outline-none hover:bg-white/[0.07] cursor-pointer"
          >
            {aiModels.map(m => <option key={m} value={m}>{m.split(":")[0]}</option>)}
          </select>
        )}
        <Tooltip content={mute ? "Réactiver les notifs" : "Désactiver les notifs"}>
          <IconButton variant="ghost" size="md" active={mute} onClick={onToggleMute}>
            {mute ? <BellOff /> : <Bell />}
          </IconButton>
        </Tooltip>
        <Tooltip content="Console debug (⌘ \\)">
          <IconButton variant="ghost" size="md" active={debugOpen} onClick={onOpenDebug}>
            <Terminal />
          </IconButton>
        </Tooltip>
        {onOpenMarketplace && (
          <Tooltip content="Module Marketplace">
            <IconButton variant="ghost" size="md" onClick={onOpenMarketplace}>
              <Package2 />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip content="Paramètres">
          <IconButton variant="ghost" size="md" onClick={onOpenSettings}>
            <Settings />
          </IconButton>
        </Tooltip>
      </div>
    </header>
  );
}

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <span className="flex items-center gap-1">
      <strong className="font-bold" style={{ color }}>{value}</strong>
      <span className="text-zinc-600">{label}</span>
    </span>
  );
}
