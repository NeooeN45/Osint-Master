// ResultTabBar — barre d'onglets résultats avec indicateur glissant
// Navigation keyboard + animations

import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Crosshair, Share2, BarChart3, Clock, Users as UsersIcon,
  Image as ImageIcon, Map as MapIcon, Loader2, CheckCircle2, Square, X,
  Bot, Download,
} from "lucide-react";
import { MainTab } from "../constants";
import { cn, IconButton, Tooltip, Kbd, Button } from "./primitives";

interface Tab {
  id: MainTab;
  label: string;
  count?: number;
  icon: React.ReactNode;
  color: string;
  shortcut?: string;
}

interface Props {
  current: MainTab;
  onChange: (t: MainTab) => void;
  counts: { entities: number; graph: number; geo: number; persons: number; gallery: number };
  running: boolean;
  target: string;
  elapsed: number;
  hasImages: boolean;
  aiAvailable: boolean;
  chatOpen: boolean;
  onStop: () => void;
  onReset: () => void;
  onOpenGallery: () => void;
  onToggleChat: () => void;
  onExport: () => void;
}

export default function ResultTabBar({
  current, onChange, counts, running, target, elapsed, hasImages,
  aiAvailable, chatOpen, onStop, onReset, onOpenGallery, onToggleChat, onExport,
}: Props) {
  const tabs: Tab[] = [
    { id: "entities", label: "Entités", count: counts.entities, icon: <Crosshair />, color: "#22d3ee", shortcut: "1" },
    { id: "graph", label: "Graphe", count: counts.graph, icon: <Share2 />, color: "#a78bfa", shortcut: "2" },
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 />, color: "#34d399", shortcut: "3" },
    { id: "timeline", label: "Timeline", icon: <Clock />, color: "#fbbf24", shortcut: "4" },
    { id: "persons", label: "Personnes", count: counts.persons, icon: <UsersIcon />, color: "#ec4899", shortcut: "5" },
    { id: "gallery", label: "Galerie", count: counts.gallery, icon: <ImageIcon />, color: "#10b981", shortcut: "6" },
    { id: "map", label: "Carte", count: counts.geo, icon: <MapIcon />, color: "#10b981", shortcut: "7" },
  ];

  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number; color: string }>({ x: 0, w: 0, color: "#22d3ee" });

  // Move indicator on current change
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeBtn = tabsRef.current.querySelector(`[data-tab="${current}"]`) as HTMLElement;
    if (!activeBtn) return;
    const tabColor = tabs.find(t => t.id === current)?.color || "#22d3ee";
    setIndicator({
      x: activeBtn.offsetLeft,
      w: activeBtn.offsetWidth,
      color: tabColor,
    });
  }, [current]);

  return (
    <div className="flex items-center gap-0 pl-2 pr-3 border-b border-white/[0.05] panel-subtle h-10 flex-shrink-0 relative">

      {/* Tabs */}
      <div ref={tabsRef} className="flex items-center relative overflow-x-auto s-thin flex-shrink flex-grow-0">
        {tabs.map(t => {
          const active = current === t.id;
          return (
            <Tooltip key={t.id} content={<span className="flex items-center gap-1.5">{t.label} <Kbd>{t.shortcut}</Kbd></span>}>
              <button
                data-tab={t.id}
                onClick={() => onChange(t.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 h-10 text-xs font-semibold whitespace-nowrap transition-colors press",
                  active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
                )}
                style={active ? { color: t.color } : undefined}
              >
                <span className="[&>svg]:w-3 [&>svg]:h-3">{t.icon}</span>
                <span>{t.label}</span>
                {t.count != null && t.count > 0 && (
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full text-mono transition-colors",
                      active ? "text-zinc-100" : "text-zinc-500",
                    )}
                    style={active ? { background: `${t.color}25` } : { background: "rgba(255,255,255,0.05)" }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}

        {/* Sliding indicator */}
        <motion.div
          className="absolute bottom-0 h-[2px] rounded-t-full pointer-events-none"
          animate={{ x: indicator.x, width: indicator.w, backgroundColor: indicator.color }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          style={{ boxShadow: `0 0 12px ${indicator.color}70` }}
        />
      </div>

      <div className="flex-1" />

      {/* Target pill */}
      <div className={cn(
        "chip mr-2 whitespace-nowrap",
        running ? "text-amber-400 border-amber-500/25 bg-amber-500/10" : "text-emerald-400 border-emerald-500/25 bg-emerald-500/10",
      )}>
        {running ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
        <span className="text-mono max-w-[160px] truncate">{target}</span>
        {running && <span className="text-mono">{elapsed}s</span>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {running && (
          <Button variant="danger" size="xs" onClick={onStop} icon={<Square className="w-2.5 h-2.5" />}>
            Stop
          </Button>
        )}
        {hasImages && (
          <Tooltip content="Galerie médias">
            <IconButton variant="ghost" size="sm" onClick={onOpenGallery}>
              <ImageIcon />
            </IconButton>
          </Tooltip>
        )}
        {aiAvailable && (
          <Tooltip content="Assistant IA">
            <IconButton variant="ghost" size="sm" active={chatOpen} onClick={onToggleChat}>
              <Bot />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip content="Exporter (⌘E)">
          <Button variant="accent" size="xs" onClick={onExport} icon={<Download className="w-2.5 h-2.5" />}>
            Export
          </Button>
        </Tooltip>
        <Tooltip content="Nouvelle recherche">
          <IconButton variant="ghost" size="sm" onClick={onReset}>
            <X />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
