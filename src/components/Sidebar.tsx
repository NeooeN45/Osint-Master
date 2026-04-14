import { useState } from "react";
import {
  LayoutDashboard,
  Share2,
  MessageSquare,
  Wrench,
  Clock,
  FolderOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
  Target,
  Settings,
  ScanFace,
  FileSearch,
  UserSearch,
  FileText,
  Zap,
  Shield,
  Instagram,
  Globe,
  Bell,
  Bot,
} from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";

export type AppView = "dashboard" | "graph" | "chat" | "tools" | "timeline" | "images" | "documents" | "profiling" | "reports" | "framework" | "darkweb" | "social" | "network" | "monitoring" | "geolocation" | "ai" | "google" | "cases";

interface SidebarProps {
  activeView: AppView;
  onViewChange: (v: AppView) => void;
  onOpenSettings: () => void;
}

const NAV = [
  { id: "google", label: "Google UI", icon: Globe },
  { id: "ai", label: "AI Orchestrator", icon: Bot },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "framework", label: "Framework OSINT", icon: Zap },
  { id: "social", label: "Social Media Pro", icon: Instagram },
  { id: "darkweb", label: "Dark Web Intel", icon: Shield },
  { id: "network", label: "Network Intel", icon: Globe },
  { id: "geolocation", label: "Precision Geo", icon: Globe },
  { id: "monitoring", label: "Monitoring & Alerts", icon: Bell },
  { id: "graph", label: "Relation Graph", icon: Share2 },
  { id: "chat", label: "AI Assistant", icon: MessageSquare },
  { id: "images", label: "Image Analysis", icon: ScanFace },
  { id: "documents", label: "Documents", icon: FileSearch },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "profiling", label: "Profiling", icon: UserSearch },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "cases", label: "Cases", icon: FolderOpen },
] as const;

export default function Sidebar({ activeView, onViewChange, onOpenSettings }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { cases, activeCaseId, setActiveCase, createCase } = useCaseStore();

  const handleNewCase = () => {
    const name = `Dossier ${new Date().toLocaleDateString("fr-FR")}`;
    createCase(name);
  };

  return (
    <aside
      className={`flex flex-col bg-surface-1 border-r border-border transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0 glow-cyan">
          <Target className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white tracking-wide">OSINT</div>
            <div className="text-xs text-accent-cyan font-mono text-glow-cyan">MASTER</div>
          </div>
        )}
      </div>

      {/* Active case badge */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border">
          <div className="text-xs text-slate-500 mb-1">Dossier actif</div>
          {activeCaseId ? (
            <div className="text-xs text-accent-cyan font-mono truncate">
              {cases.find((c) => c.id === activeCaseId)?.name ?? "—"}
            </div>
          ) : (
            <button
              onClick={handleNewCase}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-accent-cyan transition-colors"
            >
              <Plus className="w-3 h-3" /> Nouveau dossier
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all ${
              activeView === id
                ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30"
                : "text-slate-400 hover:text-white hover:bg-surface-3"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Cases list */}
      {!collapsed && cases.length > 0 && (
        <div className="px-3 py-2 border-t border-border max-h-40 overflow-y-auto">
          <div className="text-xs text-slate-500 mb-2">Dossiers récents</div>
          {cases.slice(-5).reverse().map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCase(c.id)}
              className={`w-full text-left text-xs py-1 px-2 rounded truncate transition-colors ${
                c.id === activeCaseId
                  ? "text-accent-cyan bg-accent-cyan/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div className="p-2 border-t border-border flex flex-col gap-1">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-3 transition-all"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Paramètres</span>}
        </button>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-center py-1 text-slate-600 hover:text-slate-400 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
