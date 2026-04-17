// CommandPalette — Cmd+K global search & actions
// Cherche entités, lance actions, navigue entre onglets

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Command as CmdIcon, ArrowRight, Hash, User, Mail, Phone, Globe, Wifi,
  MapPin, Shield, Eye, Cpu, Database, Link2, Image as ImageIcon, Fingerprint,
  Radar, Play, Square, RefreshCw, Download, Share2, BarChart3, Clock,
  Users as UsersIcon, Map as MapIcon, Crosshair, Terminal, Zap, Bot,
} from "lucide-react";
import { Entity, ETYPE_ICONS, ec, MainTab } from "../constants";
import { cn, Kbd } from "./primitives";

interface Props {
  open: boolean;
  onClose: () => void;
  entities: Entity[];
  onNavigate: (tab: MainTab) => void;
  onAction: (action: string) => void;
  onSelectEntity: (entity: Entity) => void;
  target: string;
  running: boolean;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  group: "navigation" | "actions" | "entities" | "targets";
  color?: string;
  onSelect: () => void;
}

const EXAMPLE_TARGETS = [
  { value: "elonmusk", type: "username", icon: User, color: "#8b5cf6" },
  { value: "bill.gates@microsoft.com", type: "email", icon: Mail, color: "#3b82f6" },
  { value: "+33769723999", type: "phone", icon: Phone, color: "#22c55e" },
  { value: "8.8.8.8", type: "ip", icon: Wifi, color: "#f97316" },
  { value: "github.com", type: "domain", icon: Globe, color: "#06b6d4" },
];

export default function CommandPalette({
  open, onClose, entities, onNavigate, onAction, onSelectEntity, target, running,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build commands
  const allCommands: CommandItem[] = useMemo(() => {
    const cmds: CommandItem[] = [];

    // Navigation
    const navItems: Array<{ tab: MainTab; label: string; icon: React.ReactNode; kbd: string; color: string }> = [
      { tab: "entities", label: "Entités", icon: <Crosshair />, kbd: "g e", color: "#22d3ee" },
      { tab: "graph", label: "Graphe de relations", icon: <Share2 />, kbd: "g g", color: "#a78bfa" },
      { tab: "dashboard", label: "Dashboard analytics", icon: <BarChart3 />, kbd: "g d", color: "#34d399" },
      { tab: "timeline", label: "Timeline", icon: <Clock />, kbd: "g t", color: "#fbbf24" },
      { tab: "persons", label: "Profils unifiés", icon: <UsersIcon />, kbd: "g p", color: "#ec4899" },
      { tab: "gallery", label: "Galerie photos", icon: <ImageIcon />, kbd: "g i", color: "#10b981" },
      { tab: "map", label: "Carte géo", icon: <MapIcon />, kbd: "g m", color: "#10b981" },
    ];
    navItems.forEach(n => {
      cmds.push({
        id: `nav-${n.tab}`, label: `Aller à : ${n.label}`,
        icon: n.icon, shortcut: n.kbd, group: "navigation", color: n.color,
        onSelect: () => { onNavigate(n.tab); onClose(); },
      });
    });

    // Actions
    if (running) {
      cmds.push({
        id: "act-stop", label: "Stopper l'investigation", icon: <Square />,
        group: "actions", color: "#f87171", shortcut: "esc",
        onSelect: () => { onAction("stop"); onClose(); },
      });
    }
    if (!running && target) {
      cmds.push({
        id: "act-start", label: "Lancer l'investigation", icon: <Play />,
        group: "actions", color: "#34d399", shortcut: "⏎",
        onSelect: () => { onAction("start"); onClose(); },
      });
    }
    cmds.push(
      { id: "act-reset", label: "Réinitialiser", icon: <RefreshCw />, group: "actions", color: "#71717a",
        onSelect: () => { onAction("reset"); onClose(); } },
      { id: "act-export", label: "Exporter les résultats", icon: <Download />, group: "actions", color: "#22d3ee",
        shortcut: "⌘ e", onSelect: () => { onAction("export"); onClose(); } },
      { id: "act-ai", label: "Ouvrir assistant IA", icon: <Bot />, group: "actions", color: "#a78bfa",
        onSelect: () => { onAction("chat"); onClose(); } },
      { id: "act-debug", label: "Console debug", icon: <Terminal />, group: "actions", color: "#71717a",
        shortcut: "⌘ \\", onSelect: () => { onAction("debug"); onClose(); } },
      { id: "act-marketplace", label: "Ouvrir Module Marketplace", icon: <Zap />, group: "actions", color: "#22d3ee",
        onSelect: () => { onAction("marketplace"); onClose(); } },
      { id: "act-settings", label: "Paramètres API", icon: <Shield />, group: "actions", color: "#71717a",
        onSelect: () => { onAction("settings"); onClose(); } },
    );

    // Entities (top 30 max, filtered by query)
    entities.slice(0, 50).forEach(e => {
      const Icon = ETYPE_ICONS[e.type] || Hash;
      cmds.push({
        id: `ent-${e.id}`,
        label: e.value.length > 50 ? e.value.slice(0, 47) + "..." : e.value,
        description: `${e.type} · ${e.source} · ${e.confidence}%`,
        icon: <Icon />,
        group: "entities",
        color: ec(e.type),
        onSelect: () => { onSelectEntity(e); onClose(); },
      });
    });

    // Target examples (when empty)
    if (!target) {
      EXAMPLE_TARGETS.forEach(e => {
        const Icon = e.icon;
        cmds.push({
          id: `tgt-${e.value}`,
          label: `Tester : ${e.value}`,
          description: `Type ${e.type}`,
          icon: <Icon />,
          group: "targets",
          color: e.color,
          onSelect: () => { onAction(`target:${e.value}`); onClose(); },
        });
      });
    }

    return cmds;
  }, [entities, onNavigate, onAction, onSelectEntity, onClose, target, running]);

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  }, [query, allCommands]);

  // Group
  const grouped = useMemo(() => {
    const g: Record<string, CommandItem[]> = {};
    filtered.forEach(c => {
      if (!g[c.group]) g[c.group] = [];
      g[c.group].push(c);
    });
    return g;
  }, [filtered]);

  // Flat index for keyboard nav
  const flatList = useMemo(() => {
    const list: CommandItem[] = [];
    ["navigation", "actions", "targets", "entities"].forEach(group => {
      if (grouped[group]) list.push(...grouped[group]);
    });
    return list;
  }, [grouped]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        flatList[selectedIdx]?.onSelect();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatList, selectedIdx, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIdx]);

  const groupLabels: Record<string, string> = {
    navigation: "Navigation",
    actions: "Actions",
    entities: `Entités (${grouped.entities?.length || 0})`,
    targets: "Exemples de cibles",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl panel-bright shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
          >
            {/* Search */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
              <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher entités, actions, navigation..."
                className="flex-1 bg-transparent outline-none text-sm text-zinc-100 placeholder:text-zinc-600"
              />
              <Kbd>esc</Kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="flex-1 overflow-y-auto s-thin p-2">
              {flatList.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-xs">
                  Aucun résultat pour "<span className="text-zinc-300">{query}</span>"
                </div>
              ) : (
                <>
                  {(["navigation", "actions", "targets", "entities"] as const).map(group => {
                    if (!grouped[group]?.length) return null;
                    const startIdx = flatList.findIndex(c => c.group === group);
                    return (
                      <div key={group} className="mb-2">
                        <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          {groupLabels[group]}
                        </div>
                        {grouped[group].map((cmd, i) => {
                          const flatIdx = startIdx + i;
                          const selected = flatIdx === selectedIdx;
                          return (
                            <button
                              key={cmd.id}
                              data-idx={flatIdx}
                              onMouseEnter={() => setSelectedIdx(flatIdx)}
                              onClick={cmd.onSelect}
                              className={cn(
                                "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors group",
                                selected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                              )}
                            >
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5"
                                style={{
                                  background: `${cmd.color || "#71717a"}1a`,
                                  border: `1px solid ${cmd.color || "#71717a"}33`,
                                  color: cmd.color || "#a1a1aa",
                                }}
                              >
                                {cmd.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={cn("text-xs font-medium truncate", selected ? "text-zinc-100" : "text-zinc-300")}>
                                  {cmd.label}
                                </div>
                                {cmd.description && (
                                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{cmd.description}</div>
                                )}
                              </div>
                              {cmd.shortcut && (
                                <div className="flex gap-1">
                                  {cmd.shortcut.split(" ").map((k, j) => <Kbd key={j}>{k}</Kbd>)}
                                </div>
                              )}
                              {selected && (
                                <ArrowRight className="w-3 h-3 text-accent flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/[0.06] bg-black/20 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> naviguer</span>
              <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> sélectionner</span>
              <span className="flex items-center gap-1.5"><Kbd>esc</Kbd> fermer</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5">
                <CmdIcon className="w-3 h-3" />
                <span className="text-mono">{flatList.length} résultats</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
