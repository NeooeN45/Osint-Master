// ============================================================================
// OSINT MASTER PRO - UI PREMIUM v5.0
// Design inspiration: Linear, Vercel, Stripe, Raycast
// Style: SaaS premium à 20K€
// ============================================================================

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { Toaster, toast } from "sonner";
const Globe3D = lazy(() => import("../components/Globe3D"));
import {
  Search, Send, Settings, ChevronRight, ChevronDown,
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  User, Mail, Phone, Globe, Wifi, Image, Database,
  Layers, Zap, Target, Shield, Activity,
  Link2, Eye, Network, Hash, MapPin,
  Copy, Download, RefreshCw, X,
  Sparkles, BrainCircuit, Radar, Cpu,
  ChevronUp, SlidersHorizontal,
  ExternalLink, GitBranch,
  Crosshair, Scan, Radio, Play, Square, Clock, MinusCircle,
  Command, ArrowRight, Terminal, FileText, TrendingUp,
  Lock, Unlock, ScanLine, Fingerprint, Binary,
  MousePointer2, Search as SearchIcon, Bell, Menu,
  Grid3X3, List, Maximize2, MoreHorizontal,
  Trash2, Save, Share2, History, Bookmark,
  Filter, SortAsc, LayoutTemplate, Plus
} from "lucide-react";

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

// ---- Utility Functions ----
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fr-FR").format(num);
}

function detectTargetType(target: string): string {
  if (target.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return "email";
  if (target.match(/^\+?[\d\s\-\(\)]{10,}$/)) return "phone";
  if (target.match(/^(\d{1,3}\.){3}\d{1,3}$/)) return "ip";
  if (target.match(/^[\w-]+\.[\w.-]+$/)) return "domain";
  if (target.match(/^https?:\/\//)) return "url";
  return "username";
}

// ============================================================================
// COMPOSANTS UI PREMIUM
// ============================================================================

// ---- Aurora Background ----
function AuroraBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0f]">
      {/* Animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]"
        />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Noise texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ---- Glass Card ----
function GlassCard({ 
  children, 
  className, 
  hover = true,
  glow = false 
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
  glow?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-white/[0.03] backdrop-blur-xl",
        "border border-white/[0.08]",
        "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]",
        hover && "hover:border-white/[0.15] hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]",
        glow && "shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// ---- Magnetic Button ----
function MagneticButton({ 
  children, 
  onClick, 
  variant = "primary",
  size = "md",
  className 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40",
    secondary: "bg-white/[0.05] text-zinc-200 border border-white/10 hover:bg-white/[0.08] hover:border-white/20",
    ghost: "bg-transparent text-zinc-400 hover:text-zinc-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative overflow-hidden rounded-xl font-medium transition-all duration-300",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
        initial={{ x: "-200%" }}
        whileHover={{ x: "200%" }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

// ---- Spotlight Card ----
function SpotlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(6,182,212,0.15), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// ---- Animated Counter ----
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="tabular-nums">
      {formatNumber(displayValue)}{suffix}
    </span>
  );
}

// ---- Typewriter Text ----
function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    
    let index = 0;
    const timer = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [started, text]);

  return (
    <span>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-[2px] h-[1em] bg-cyan-400 ml-0.5 align-middle"
      />
    </span>
  );
}

// ---- Status Badge ----
function StatusBadge({ status, text }: { status: "idle" | "running" | "success" | "error"; text: string }) {
  const colors = {
    idle: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    running: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", colors[status])}>
      {text}
    </span>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function OsintAppPremium() {
  // ---- State ----
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"idle" | "running" | "complete">("idle");
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [entities, setEntities] = useState<DeepEntity[]>([]);
  const [config, setConfig] = useState<InvestigationConfig>({
    maxDepth: 2,
    maxEntities: 500,
    timeoutMs: 300000,
    enableAI: true,
    enableWebSearch: true,
    enableRecursive: true,
    recursiveThreshold: 70,
    selectedModules: [],
  });
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "entities" | "timeline" | "network">("overview");
  const [showGlobe, setShowGlobe] = useState(false);

  const locationEntities = entities.filter(
    (e) => e.type === "location" || e.type === "ip" || e.type === "phone"
  );

  // ---- Type Icons ----
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

  // ---- Search Handler ----
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchStatus("running");
    setEvents([]);
    setEntities([]);

    try {
      const response = await fetch(`${API_BASE}/deep-v2/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: searchQuery,
          config,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event: StreamEvent = JSON.parse(data);
              setEvents((prev) => [...prev, event]);

              if (event.type === "entity_found" && event.data) {
                setEntities((prev) => [...prev, event.data]);
              }

              if (event.type === "complete") {
                setSearchStatus("complete");
                setIsSearching(false);
                toast.success(`Investigation terminée - ${event.data?.summary?.entities || 0} entités trouvées`);
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      toast.error("Erreur lors de l'investigation");
      setSearchStatus("idle");
      setIsSearching(false);
    }
  };

  // ---- Detect Target Type ----
  const targetType = detectTargetType(searchQuery);

  // ---- Group entities by type ----
  const entitiesByType = entities.reduce((acc, entity) => {
    acc[entity.type] = (acc[entity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ---- Render ----
  return (
    <AuroraBackground>
      {/* Globe 3D Modal */}
      {showGlobe && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-[#04040a] flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>}>
          <Globe3D entities={entities} onClose={() => setShowGlobe(false)} />
        </Suspense>
      )}

      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: "rgba(9, 9, 11, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
          },
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-[#0a0a0f]/80 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"
            >
              <Radar className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">OSINT Master</h1>
              <p className="text-xs text-zinc-500">Pro Intelligence Platform</p>
            </div>
          </div>

          {/* Center - Quick Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Deep Engine V2</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Zap className="w-4 h-4 text-violet-400" />
              <span>35+ Modules</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {locationEntities.length > 0 && (
              <MagneticButton variant="secondary" size="sm" onClick={() => setShowGlobe(true)}>
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span className="text-xs">{locationEntities.length} lieux</span>
              </MagneticButton>
            )}
            <MagneticButton variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              <SlidersHorizontal className="w-4 h-4" />
            </MagneticButton>
            <MagneticButton variant="secondary" size="sm">
              <Bell className="w-4 h-4" />
            </MagneticButton>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pt-24 pb-8 px-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Search Section */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <GlassCard className="p-8" glow={isSearching}>
              <div className="text-center mb-8">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl md:text-4xl font-bold text-white mb-3"
                >
                  Intelligence Investigation
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-zinc-400 text-lg"
                >
                  Recherchez sur <span className="text-cyan-400">email</span>,{" "}
                  <span className="text-violet-400">username</span>,{" "}
                  <span className="text-emerald-400">domaine</span>,{" "}
                  <span className="text-orange-400">IP</span>,{" "}
                  <span className="text-pink-400">téléphone</span>...
                </motion.p>
              </div>

              {/* Search Input */}
              <div className="max-w-2xl mx-auto">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex items-center bg-zinc-900/80 border border-zinc-700/50 rounded-2xl overflow-hidden backdrop-blur-sm focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all duration-300">
                    <div className="pl-5">
                      {targetType === "email" && <Mail className="w-5 h-5 text-blue-400" />}
                      {targetType === "username" && <User className="w-5 h-5 text-violet-400" />}
                      {targetType === "domain" && <Globe className="w-5 h-5 text-cyan-400" />}
                      {targetType === "ip" && <Wifi className="w-5 h-5 text-orange-400" />}
                      {targetType === "phone" && <Phone className="w-5 h-5 text-green-400" />}
                      {!searchQuery && <SearchIcon className="w-5 h-5 text-zinc-500" />}
                    </div>
                    
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Entrez une cible à investiguer..."
                      className="flex-1 bg-transparent px-4 py-4 text-white placeholder-zinc-500 outline-none text-lg"
                    />

                    {searchQuery && (
                      <div className="pr-2">
                        <button
                          onClick={() => setSearchQuery("")}
                          className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="pr-3">
                      <MagneticButton
                        onClick={handleSearch}
                        variant="primary"
                        size="md"
                        className={cn(!searchQuery && "opacity-50 cursor-not-allowed")}
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Scan className="w-4 h-4" />
                            <span>Investiguer</span>
                          </>
                        )}
                      </MagneticButton>
                    </div>
                  </div>
                </div>

                {/* Type Detection */}
                {searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 mt-4"
                  >
                    <span className="text-xs text-zinc-500">Type détecté:</span>
                    <StatusBadge status="idle" text={targetType} />
                  </motion.div>
                )}
              </div>
            </GlassCard>
          </motion.section>

          {/* Results Section */}
          {entities.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <Database className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        <AnimatedCounter value={entities.length} />
                      </p>
                      <p className="text-xs text-zinc-500">Entités trouvées</p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        <AnimatedCounter value={Object.keys(entitiesByType).length} />
                      </p>
                      <p className="text-xs text-zinc-500">Types de données</p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        <AnimatedCounter value={entities.filter(e => e.verified).length} />
                      </p>
                      <p className="text-xs text-zinc-500">Vérifiées</p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {Math.round(entities.reduce((acc, e) => acc + e.confidence, 0) / entities.length || 0)}%
                      </p>
                      <p className="text-xs text-zinc-500">Confiance moyenne</p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
                {[
                  { id: "overview", label: "Vue d'ensemble", icon: Grid3X3 },
                  { id: "entities", label: "Entités", icon: List },
                  { id: "timeline", label: "Timeline", icon: Clock },
                  { id: "network", label: "Réseau", icon: Network },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      activeTab === tab.id
                        ? "bg-white/[0.08] text-white"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Entities Grid */}
              {activeTab === "entities" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entities.map((entity, index) => {
                    const Icon = typeIcons[entity.type] || Hash;
                    const colorClass = typeColors[entity.type] || "text-zinc-400";
                    
                    return (
                      <motion.div
                        key={entity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <SpotlightCard className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/5", colorClass)}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white truncate">
                                  {entity.value}
                                </span>
                                {entity.verified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-zinc-500 capitalize">{entity.type}</span>
                                <span className="text-zinc-600">•</span>
                                <span className="text-zinc-500">{entity.source}</span>
                                <span className="text-zinc-600">•</span>
                                <span className={cn(
                                  entity.confidence > 80 ? "text-emerald-400" :
                                  entity.confidence > 60 ? "text-amber-400" : "text-orange-400"
                                )}>
                                  {entity.confidence}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </SpotlightCard>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Overview - Distribution by Type */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Distribution par type</h3>
                    <div className="space-y-3">
                      {Object.entries(entitiesByType)
                        .sort(([,a], [,b]) => b - a)
                        .map(([type, count]) => {
                          const Icon = typeIcons[type] || Hash;
                          const percentage = (count / entities.length) * 100;
                          
                          return (
                            <div key={type} className="flex items-center gap-3">
                              <Icon className={cn("w-4 h-4", typeColors[type])} />
                              <span className="text-sm text-zinc-400 w-24 capitalize">{type}</span>
                              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.5, delay: 0.2 }}
                                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                />
                              </div>
                              <span className="text-sm font-medium text-white w-8 text-right">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Sources de données</h3>
                    <div className="space-y-2">
                      {Array.from(new Set(entities.map(e => e.source))).map((source) => {
                        const count = entities.filter(e => e.source === source).length;
                        return (
                          <div key={source} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                            <span className="text-sm text-zinc-400">{source}</span>
                            <span className="text-sm font-medium text-white">{count} entités</span>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>
              )}
            </motion.section>
          )}

          {/* Empty State */}
          {!entities.length && !isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                <Radar className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-xl font-medium text-zinc-400 mb-2">
                Prêt à investiguer
              </h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                Entrez une cible ci-dessus pour lancer une investigation avec le Deep Engine V2
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </AuroraBackground>
  );
}
