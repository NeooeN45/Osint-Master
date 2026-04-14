// Google Quality OSINT UI - Material Design 3 Inspired
// Ultra-modern, modular, autonomous research interface

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Sparkles,
  Shield,
  Globe,
  User,
  MapPin,
  Mail,
  Phone,
  Hash,
  Database,
  Activity,
  Clock,
  ChevronRight,
  Layers,
  Filter,
  Download,
  Share2,
  Settings,
  X,
  Maximize2,
  Minimize2,
  Bot,
  Zap,
  Target,
  BarChart3,
  Network,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  History,
  Bookmark,
  ExternalLink,
  Eye,
  PanelLeft,
  LayoutGrid,
  List,
  MessageSquare,
  Radar,
  Wifi,
  Server,
  Lock,
  Key,
  Camera,
  Video,
  Image as ImageIcon,
  Mic,
  Send,
  Plus,
  Trash2,
  Save,
  Copy,
  Check,
  ArrowUpRight,
  RefreshCw,
  Play,
  Pause,
  Bell,
  Sun,
  Moon,
  Monitor,
  Cpu,
  Flame,
  Map as MapIcon,
  LocateFixed,
  Navigation,
  GitBranch,
  Circle,
  Square,
  Triangle,
  Hexagon,
  PlusCircle,
  MinusCircle,
  XCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import OSINTModuleManager from "../components/OSINTModuleManager";

// ============================================================================
// TYPES
// ============================================================================

type SearchTarget = "ip" | "domain" | "email" | "username" | "phone" | "hash" | "url";
type ResultCategory = "location" | "network" | "social" | "breach" | "web" | "metadata";
type ModuleStatus = "idle" | "running" | "complete" | "error";
type SearchStatus = "planning" | "executing" | "analyzing" | "complete";

interface SearchQuery {
  id: string;
  query: string;
  target: SearchTarget;
  timestamp: string;
  status: "idle" | "searching" | "complete" | "error";
  confidence: number;
}

interface SearchResult {
  id: string;
  queryId: string;
  category: ResultCategory;
  title: string;
  value: string;
  confidence: number;
  source: string;
  timestamp: string;
  verified: boolean;
  icon?: React.ReactNode;
}

interface ResearchModule {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  results: SearchResult[];
  progress: number;
  status: ModuleStatus;
}

interface AutonomousSearch {
  id: string;
  query: string;
  modules: ResearchModule[];
  startTime: string;
  endTime?: string;
  status: SearchStatus;
  findings: number;
  confidence: number;
}

// ============================================================================
// GOOGLE QUALITY UI COMPONENT
// ============================================================================

export default function GoogleQualityUI() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchQuery[]>([]);
  const [activeSearch, setActiveSearch] = useState<AutonomousSearch | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<SearchTarget | "auto">("auto");
  const [isSearching, setIsSearching] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>(["location", "network", "social", "breach"]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showModuleManager, setShowModuleManager] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Detect target type from query
  const detectTargetType = (query: string): SearchTarget => {
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const domainPattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[\d\s\-\(\)]{10,20}$/;
    const hashPattern = /^[a-fA-F0-9]{32,64}$/;
    const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

    if (ipPattern.test(query)) return "ip";
    if (emailPattern.test(query)) return "email";
    if (phonePattern.test(query)) return "phone";
    if (hashPattern.test(query)) return "hash";
    if (urlPattern.test(query)) return "url";
    if (domainPattern.test(query)) return "domain";
    return "username";
  };

  // Execute autonomous search
  const executeSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Enter a search query");
      return;
    }

    setIsSearching(true);
    const target = selectedTarget === "auto" ? detectTargetType(searchQuery) : selectedTarget;
    const searchId = Date.now().toString();

    // Create new search record
    const newSearch: AutonomousSearch = {
      id: searchId,
      query: searchQuery,
      modules: activeModules.map((mod, idx) => ({
        id: `${searchId}-${mod}`,
        name: getModuleName(mod),
        description: getModuleDescription(mod),
        icon: getModuleIcon(mod),
        active: true,
        results: [],
        progress: 0,
        status: idx === 0 ? "running" : "idle",
      })),
      startTime: new Date().toISOString(),
      status: "executing",
      findings: 0,
      confidence: 0,
    };

    setActiveSearch(newSearch);
    setSearchHistory((prev) => [
      { id: searchId, query: searchQuery, target, timestamp: new Date().toISOString(), status: "searching", confidence: 0 },
      ...prev,
    ]);

    // Simulate progressive module execution
    for (let i = 0; i < activeModules.length; i++) {
      await simulateModuleExecution(newSearch, i);
    }

    // Complete search
    setActiveSearch((prev) =>
      prev
        ? {
            ...prev,
            status: "complete",
            endTime: new Date().toISOString(),
            findings: prev.modules.reduce((acc, m) => acc + m.results.length, 0),
            confidence: Math.round(
              prev.modules.reduce((acc, m) => acc + (m.results[0]?.confidence || 0), 0) / prev.modules.length
            ),
          }
        : null
    );

    setSearchHistory((prev) =>
      prev.map((h) =>
        h.id === searchId ? { ...h, status: "complete", confidence: newSearch.confidence } : h
      )
    );

    setIsSearching(false);
    toast.success(`Search complete! Found ${newSearch.findings} results.`);
  };

  const simulateModuleExecution = async (search: AutonomousSearch, moduleIndex: number) => {
    const module = search.modules[moduleIndex];

    // Update module status
    setActiveSearch((prev) => {
      if (!prev) return null;
      const newModules = [...prev.modules];
      newModules[moduleIndex] = { ...module, status: "running", progress: 0 };
      return { ...prev, modules: newModules };
    });

    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setActiveSearch((prev) => {
        if (!prev) return null;
        const newModules = [...prev.modules];
        newModules[moduleIndex] = { ...newModules[moduleIndex], progress };
        return { ...prev, modules: newModules };
      });
    }

    // Generate results based on module type
    const mockResults = generateMockResults(module.name, search.query);

    setActiveSearch((prev) => {
      if (!prev) return null;
      const newModules = [...prev.modules];
      newModules[moduleIndex] = {
        ...module,
        status: "complete",
        progress: 100,
        results: mockResults,
      };
      return { ...prev, modules: newModules };
    });

    // Add to global results
    setResults((prev) => [...prev, ...mockResults]);
  };

  const generateMockResults = (moduleName: string, query: string): SearchResult[] => {
    const baseResults: SearchResult[] = [];

    switch (moduleName) {
      case "Geolocation":
        baseResults.push(
          {
            id: `geo-${Date.now()}`,
            queryId: "",
            category: "location",
            title: "Location",
            value: "Paris, France",
            confidence: 95,
            source: "MaxMind GeoIP2",
            timestamp: new Date().toISOString(),
            verified: true,
            icon: <MapPin className="w-4 h-4" />,
          },
          {
            id: `geo-${Date.now()}-2`,
            queryId: "",
            category: "location",
            title: "Coordinates",
            value: "48.8566° N, 2.3522° E",
            confidence: 92,
            source: "IPinfo.io",
            timestamp: new Date().toISOString(),
            verified: true,
            icon: <LocateFixed className="w-4 h-4" />,
          }
        );
        break;
      case "Network Analysis":
        baseResults.push(
          {
            id: `net-${Date.now()}`,
            queryId: "",
            category: "network",
            title: "ISP",
            value: "Orange S.A.",
            confidence: 98,
            source: "WHOIS",
            timestamp: new Date().toISOString(),
            verified: true,
            icon: <Wifi className="w-4 h-4" />,
          },
          {
            id: `net-${Date.now()}-2`,
            queryId: "",
            category: "network",
            title: "ASN",
            value: "AS3215",
            confidence: 100,
            source: "RIPE",
            timestamp: new Date().toISOString(),
            verified: true,
            icon: <Server className="w-4 h-4" />,
          }
        );
        break;
      case "Social Media":
        baseResults.push(
          {
            id: `soc-${Date.now()}`,
            queryId: "",
            category: "social",
            title: "Instagram",
            value: "@username_found",
            confidence: 78,
            source: "Sherlock",
            timestamp: new Date().toISOString(),
            verified: false,
            icon: <User className="w-4 h-4" />,
          }
        );
        break;
      case "Breach Check":
        baseResults.push(
          {
            id: `breach-${Date.now()}`,
            queryId: "",
            category: "breach",
            title: "Have I Been Pwned",
            value: "0 breaches found",
            confidence: 100,
            source: "HIBP",
            timestamp: new Date().toISOString(),
            verified: true,
            icon: <Shield className="w-4 h-4" />,
          }
        );
        break;
    }

    return baseResults;
  };

  const getModuleName = (id: string): string => {
    const names: Record<string, string> = {
      location: "Geolocation",
      network: "Network Analysis",
      social: "Social Media",
      breach: "Breach Check",
      web: "Web Intelligence",
      metadata: "Metadata Analysis",
    };
    return names[id] || id;
  };

  const getModuleDescription = (id: string): string => {
    const descriptions: Record<string, string> = {
      location: "Physical location and coordinates",
      network: "ISP, ASN, and infrastructure",
      social: "Cross-platform profile discovery",
      breach: "Data breach and leak detection",
      web: "Website and domain intelligence",
      metadata: "File and content metadata",
    };
    return descriptions[id] || "";
  };

  const getModuleIcon = (id: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      location: <MapPin className="w-5 h-5" />,
      network: <Network className="w-5 h-5" />,
      social: <User className="w-5 h-5" />,
      breach: <Shield className="w-5 h-5" />,
      web: <Globe className="w-5 h-5" />,
      metadata: <FileText className="w-5 h-5" />,
    };
    return icons[id] || <Zap className="w-5 h-5" />;
  };

  const getTargetIcon = (target: SearchTarget) => {
    switch (target) {
      case "ip":
        return <Globe className="w-4 h-4" />;
      case "domain":
        return <Globe className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "username":
        return <User className="w-4 h-4" />;
      case "phone":
        return <Phone className="w-4 h-4" />;
      case "hash":
        return <Hash className="w-4 h-4" />;
      case "url":
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div className={`h-screen w-full overflow-hidden transition-colors duration-300 ${darkMode ? "bg-[#0d1117] text-white" : "bg-[#f8f9fa] text-[#202124]"}`}>
      {/* Top Navigation Bar - Google Style */}
      <header className={`h-16 flex items-center justify-between px-6 border-b ${darkMode ? "border-gray-800 bg-[#161b22]" : "border-gray-200 bg-white"}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">OSINT Master</h1>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Intelligence Platform</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModuleManager(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${darkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-sm font-medium">100+ Modules</span>
          </button>
          <div className={`w-px h-6 mx-2 ${darkMode ? "bg-gray-700" : "bg-gray-300"}`} />
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-full transition-all ${darkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className={`p-2.5 rounded-full transition-all ${darkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
            <Settings className="w-5 h-5" />
          </button>
          <div className={`w-px h-6 mx-2 ${darkMode ? "bg-gray-700" : "bg-gray-300"}`} />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <Bot className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-600">AI Active</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Modular & Collapsible */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`border-r ${darkMode ? "border-gray-800 bg-[#161b22]" : "border-gray-200 bg-white"}`}
            >
              <div className="p-4">
                {/* Search History */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                      Recent Searches
                    </h3>
                    <button
                      onClick={() => setSearchHistory([])}
                      className={`text-xs ${darkMode ? "text-gray-600 hover:text-gray-400" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {searchHistory.length === 0 ? (
                      <p className={`text-sm ${darkMode ? "text-gray-600" : "text-gray-400"} italic`}>No recent searches</p>
                    ) : (
                      searchHistory.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSearchQuery(item.query)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                            darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                          }`}
                        >
                          {getTargetIcon(item.target)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.query}</p>
                            <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                              {new Date(item.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          {item.status === "complete" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : item.status === "searching" ? (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Active Modules */}
                <div>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Research Modules
                  </h3>
                  <div className="space-y-1">
                    {["location", "network", "social", "breach", "web", "metadata"].map((module) => (
                      <button
                        key={module}
                        onClick={() =>
                          setActiveModules((prev) =>
                            prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
                          )
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                          activeModules.includes(module)
                            ? darkMode
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                            : darkMode
                            ? "hover:bg-gray-800 text-gray-400"
                            : "hover:bg-gray-100 text-gray-600"
                        }`}
                      >
                        {getModuleIcon(module)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{getModuleName(module)}</p>
                          <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>{getModuleDescription(module)}</p>
                        </div>
                        {activeModules.includes(module) && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`w-6 flex items-center justify-center border-r ${
            darkMode ? "border-gray-800 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-100"
          } transition-colors`}
        >
          <PanelLeft className={`w-4 h-4 ${darkMode ? "text-gray-600" : "text-gray-400"} ${sidebarCollapsed ? "rotate-180" : ""}`} />
        </button>

        {/* Main Center Panel */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto">
            {/* Google-Style Search Bar */}
            <div className={`sticky top-0 z-10 px-8 py-6 ${darkMode ? "bg-[#0d1117]/95" : "bg-[#f8f9fa]/95"} backdrop-blur-sm`}>
              <div
                className={`max-w-3xl mx-auto flex items-center gap-4 px-6 py-4 rounded-full shadow-lg border-2 transition-all ${
                  darkMode
                    ? "bg-[#161b22] border-gray-700 focus-within:border-blue-500"
                    : "bg-white border-gray-200 focus-within:border-blue-500"
                }`}
              >
                {getTargetIcon(detectTargetType(searchQuery))}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                  placeholder="Search IP, domain, email, username, phone..."
                  className={`flex-1 bg-transparent text-lg outline-none placeholder:text-gray-400 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                )}
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <Mic className="w-5 h-5 text-blue-500" />
                </button>
                <button
                  onClick={executeSearch}
                  disabled={isSearching || !searchQuery}
                  className={`px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
                    isSearching || !searchQuery
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {isSearching ? "Analyzing..." : "Search"}
                </button>
              </div>

              {/* Target Type Pills */}
              <div className="max-w-3xl mx-auto mt-4 flex items-center gap-2 flex-wrap">
                <span className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}>Target:</span>
                {["auto", "ip", "domain", "email", "username", "phone", "hash"].map((target) => (
                  <button
                    key={target}
                    onClick={() => setSelectedTarget(target as SearchTarget | "auto")}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      selectedTarget === target
                        ? "bg-blue-500 text-white"
                        : darkMode
                        ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {target === "auto" ? "Auto-detect" : target.charAt(0).toUpperCase() + target.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Search Progress */}
            {activeSearch && activeSearch.status !== "complete" && (
              <div className={`mx-8 mb-6 p-6 rounded-2xl border ${darkMode ? "bg-[#161b22] border-gray-800" : "bg-white border-gray-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Autonomous Research in Progress</h3>
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Analyzing {activeSearch.query} across {activeModules.length} modules
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-500">
                      {Math.round(activeSearch.modules.reduce((a, m) => a + m.progress, 0) / activeModules.length)}%
                    </span>
                    <button onClick={() => setActiveSearch(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Module Progress */}
                <div className="space-y-3">
                  {activeSearch.modules.map((module) => (
                    <div key={module.id} className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          module.status === "complete"
                            ? "bg-green-500/10 text-green-500"
                            : module.status === "running"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {module.status === "complete" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : module.status === "running" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{module.name}</span>
                          <span className="text-xs text-gray-500">{module.progress}%</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-gray-800" : "bg-gray-200"}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${module.progress}%` }}
                            className={`h-full rounded-full ${
                              module.status === "complete" ? "bg-green-500" : "bg-blue-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
              <div className="px-8 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Intelligence Results
                    <span className={`px-2 py-0.5 rounded-full text-sm ${darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                      {results.length}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-blue-500 text-white" : darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-blue-500 text-white" : darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 mx-2 bg-gray-300 dark:bg-gray-700" />
                    <button className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                      <Filter className="w-4 h-4" />
                      <span className="text-sm">Filter</span>
                    </button>
                    <button className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Export</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === null
                        ? "bg-blue-500 text-white"
                        : darkMode
                        ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    All Results
                  </button>
                  {Array.from(new Set(results.map((r) => r.category))).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all capitalize ${
                        selectedCategory === cat
                          ? "bg-blue-500 text-white"
                          : darkMode
                          ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Results Display */}
                <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-3"}>
                  {results
                    .filter((r) => !selectedCategory || r.category === selectedCategory)
                    .map((result) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                          darkMode ? "bg-[#161b22] border-gray-800 hover:border-gray-700" : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                              {result.icon}
                            </div>
                            <div>
                              <p className={`text-xs uppercase tracking-wider ${darkMode ? "text-gray-500" : "text-gray-500"}`}>{result.category}</p>
                              <h4 className="font-semibold">{result.title}</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.verified ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            )}
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                result.confidence >= 90
                                  ? "bg-green-500/10 text-green-500"
                                  : result.confidence >= 70
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                            >
                              {result.confidence}%
                            </span>
                          </div>
                        </div>
                        <p className={`mt-3 text-lg font-medium ${darkMode ? "text-gray-200" : "text-gray-900"}`}>{result.value}</p>
                        <div className={`mt-3 flex items-center gap-4 text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          <span className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {result.source}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {results.length === 0 && !activeSearch && (
              <div className="flex flex-col items-center justify-center h-96">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                  <Radar className="w-12 h-12 text-blue-500" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Start Your Investigation</h3>
                <p className={`text-center max-w-md ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Enter a target above to begin autonomous OSINT research across multiple intelligence modules.
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {["location", "network", "social", "breach"].map((m, i) => (
                      <div
                        key={m}
                        className={`w-10 h-10 rounded-full border-2 ${darkMode ? "border-[#0d1117] bg-gray-800" : "border-white bg-gray-100"} flex items-center justify-center`}
                      >
                        {getModuleIcon(m)}
                      </div>
                    ))}
                  </div>
                  <span className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}>{activeModules.length} modules ready</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel Toggle */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`w-6 flex items-center justify-center border-l ${
              darkMode ? "border-gray-800 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-100"
            } transition-colors`}
          >
            <PanelLeft className={`w-4 h-4 ${darkMode ? "text-gray-600" : "text-gray-400"} ${rightPanelOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Right Panel - Details & Visualization */}
          <AnimatePresence>
            {rightPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`border-l overflow-hidden ${darkMode ? "border-gray-800 bg-[#161b22]" : "border-gray-200 bg-white"}`}
              >
                <div className={`h-14 flex items-center justify-between px-4 border-b ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    Intelligence Dashboard
                  </h3>
                  <div className="flex items-center gap-1">
                    <button className={`p-1.5 rounded-lg ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button className={`p-1.5 rounded-lg ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-56px)]">
                  {/* Summary Card */}
                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-[#0d1117] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      Search Summary
                    </h4>
                    {activeSearch ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Target</span>
                          <span className="font-medium">{activeSearch.query}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Status</span>
                          <span className={`font-medium capitalize ${activeSearch.status === "complete" ? "text-green-500" : "text-blue-500"}`}>
                            {activeSearch.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Findings</span>
                          <span className="font-medium">{activeSearch.findings}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Confidence</span>
                          <span className="font-medium">{activeSearch.confidence}%</span>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>No active search</p>
                    )}
                  </div>

                  {/* Confidence Meter */}
                  {activeSearch && (
                    <div className={`p-4 rounded-xl border ${darkMode ? "bg-[#0d1117] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                      <h4 className="text-sm font-medium mb-3">Confidence Score</h4>
                      <div className="relative h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${activeSearch.confidence}%` }}
                          className={`absolute top-0 left-0 h-full rounded-full ${
                            activeSearch.confidence >= 80 ? "bg-green-500" : activeSearch.confidence >= 60 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Unreliable</span>
                        <span>Verified</span>
                      </div>
                    </div>
                  )}

                  {/* Data Sources */}
                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-[#0d1117] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-500" />
                      Data Sources
                    </h4>
                    <div className="space-y-2">
                      {["MaxMind GeoIP2", "IPinfo.io", "Shodan", "VirusTotal", "WHOIS", "Sherlock"].map((source, idx) => (
                        <div key={source} className="flex items-center justify-between text-sm">
                          <span className={darkMode ? "text-gray-400" : "text-gray-600"}>{source}</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${idx < 4 ? "bg-green-500" : "bg-gray-400"}`} />
                            <span className={`text-xs ${idx < 4 ? "text-green-500" : "text-gray-400"}`}>{idx < 4 ? "Active" : "Standby"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-[#0d1117] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                    <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        Export JSON
                      </button>
                      <button
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        Generate Report
                      </button>
                      <button
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <Share2 className="w-4 h-4" />
                        Share Results
                      </button>
                      <button
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <Bookmark className="w-4 h-4" />
                        Save Case
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* OSINT Module Manager Modal */}
      <AnimatePresence>
        {showModuleManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModuleManager(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d1117] rounded-2xl overflow-hidden shadow-2xl w-full max-w-7xl h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <OSINTModuleManager />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
