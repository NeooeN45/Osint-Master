// ============================================================================
// OSINT MODULE MANAGER COMPONENT
// Interface for managing 100+ OSINT modules
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Download,
  Play,
  Settings,
  Search,
  Filter,
  Grid,
  List,
  ChevronDown,
  ChevronRight,
  Terminal,
  Shield,
  AlertTriangle,
  Info,
  ExternalLink,
  Github,
  Key,
  Cpu,
  Layers,
  RefreshCw,
  Plus,
  Trash2,
  MoreVertical,
  ArrowRight,
  Loader2,
  Check,
  X,
  Zap,
  Globe,
  User,
  Image as ImageIcon,
  Database,
  FileText,
  Wifi,
  MapPin,
  Lock,
  Eye,
  Mail,
  Phone,
  Hash,
  MessageSquare,
  HardDrive,
  Activity,
  Radar,
  Target,
  Anchor,
  Plane,
  Ship,
  Cloud,
  Sun,
  CreditCard,
  Archive,
  Search as SearchIcon,
  FolderOpen,
  Server,
  Code,
  Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface OSINTModule {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  icon: string;
  installMethod: string;
  enabled: boolean;
  installed: boolean;
  risk: "low" | "medium" | "high" | "critical";
  requiresRoot: boolean;
  platform: string[];
  github?: string;
  website?: string;
  apiKeys?: string[];
  dependencies?: string[];
}

interface ModuleCategory {
  id: string;
  name: string;
  count: number;
}

interface ModuleStatus {
  id: string;
  installed: boolean;
  enabled: boolean;
  error?: string;
}

export default function OSINTModuleManager() {
  const [modules, setModules] = useState<OSINTModule[]>([]);
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [executing, setExecuting] = useState<Set<string>>(new Set());
  const [selectedModule, setSelectedModule] = useState<OSINTModule | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterInstalled, setFilterInstalled] = useState<boolean | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [batchInstallProgress, setBatchInstallProgress] = useState<{
    total: number;
    current: number;
    moduleName: string;
  } | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showApiModal, setShowApiModal] = useState(false);

  // Fetch modules on mount
  useEffect(() => {
    fetchModules();
    fetchCategories();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await fetch("http://localhost:3003/api/modules/catalog");
      const data = await response.json();
      setModules(data.modules);
    } catch (error) {
      toast.error("Failed to load modules");
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("http://localhost:3003/api/modules/categories");
      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      toast.error("Failed to load categories");
    }
  };

  const installModule = async (moduleId: string) => {
    setInstalling((prev) => new Set(prev).add(moduleId));

    try {
      const response = await fetch(`http://localhost:3000/api/modules/install/${moduleId}`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`${data.moduleId} installed successfully`);
        fetchModules();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Installation failed");
    } finally {
      setInstalling((prev) => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
    }
  };

  const batchInstall = async (category?: string) => {
    const modulesToInstall = category
      ? modules.filter((m) => m.category === category && !m.installed).map((m) => m.id)
      : modules.filter((m) => !m.installed).map((m) => m.id);

    if (modulesToInstall.length === 0) {
      toast.info("No modules to install");
      return;
    }

    setBatchInstallProgress({
      total: modulesToInstall.length,
      current: 0,
      moduleName: "",
    });

    for (let i = 0; i < modulesToInstall.length; i++) {
      const moduleId = modulesToInstall[i];
      const module = modules.find((m) => m.id === moduleId);

      setBatchInstallProgress({
        total: modulesToInstall.length,
        current: i + 1,
        moduleName: module?.name || moduleId,
      });

      try {
        await fetch(`http://localhost:3000/api/modules/install/${moduleId}`, {
          method: "POST",
        });
        // Small delay between installations
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to install ${moduleId}`);
      }
    }

    setBatchInstallProgress(null);
    fetchModules();
    toast.success(`Batch installation complete!`);
  };

  const toggleModule = async (moduleId: string, enable: boolean) => {
    try {
      const endpoint = enable ? "enable" : "disable";
      await fetch(`http://localhost:3000/api/modules/${endpoint}/${moduleId}`, {
        method: "POST",
      });
      fetchModules();
      toast.success(`Module ${enable ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to toggle module");
    }
  };

  const quickStart = async () => {
    toast.info("Starting quick installation of essential modules...");

    try {
      const response = await fetch("http://localhost:3000/api/modules/quickstart", {
        method: "POST",
      });
      const data = await response.json();

      if (data.successful > 0) {
        toast.success(`${data.successful} modules installed!`);
      }
      if (data.failed > 0) {
        toast.warning(`${data.failed} modules failed to install`);
      }

      fetchModules();
    } catch (error) {
      toast.error("Quick start failed");
    }
  };

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      UserSearch: <User className="w-5 h-5" />,
      UserCircle: <User className="w-5 h-5" />,
      ScanFace: <Target className="w-5 h-5" />,
      Instagram: <MessageSquare className="w-5 h-5" />,
      Phone: <Phone className="w-5 h-5" />,
      Mail: <Mail className="w-5 h-5" />,
      Chrome: <Globe className="w-5 h-5" />,
      Bot: <Bot className="w-5 h-5" />,
      Users: <User className="w-5 h-5" />,
      Fingerprint: <Target className="w-5 h-5" />,
      Globe: <Globe className="w-5 h-5" />,
      Network: <Wifi className="w-5 h-5" />,
      Search: <SearchIcon className="w-5 h-5" />,
      Globe2: <Globe className="w-5 h-5" />,
      Cloud: <Cloud className="w-5 h-5" />,
      Server: <Server className="w-5 h-5" />,
      Shuffle: <RefreshCw className="w-5 h-5" />,
      Activity: <Activity className="w-5 h-5" />,
      Hammer: <Zap className="w-5 h-5" />,
      Zap: <Zap className="w-5 h-5" />,
      Radar: <Radar className="w-5 h-5" />,
      Eye: <Eye className="w-5 h-5" />,
      Shield: <Shield className="w-5 h-5" />,
      Volume2: <Activity className="w-5 h-5" />,
      ShieldAlert: <AlertTriangle className="w-5 h-5" />,
      Fingerprint2: <Target className="w-5 h-5" />,
      Layers: <Layers className="w-5 h-5" />,
      FolderSearch: <FolderOpen className="w-5 h-5" />,
      Bug: <AlertTriangle className="w-5 h-5" />,
      Archive: <Archive className="w-5 h-5" />,
      Link: <ExternalLink className="w-5 h-5" />,
      Spider: <Bot className="w-5 h-5" />,
      Video: <ImageIcon className="w-5 h-5" />,
      Twitter: <MessageSquare className="w-5 h-5" />,
      TrendingUp: <Activity className="w-5 h-5" />,
      Linkedin: <Globe className="w-5 h-5" />,
      Youtube: <ImageIcon className="w-5 h-5" />,
      Facebook: <Globe className="w-5 h-5" />,
      MessageCircle: <MessageSquare className="w-5 h-5" />,
      Send: <MessageSquare className="w-5 h-5" />,
      MessageSquare2: <MessageSquare className="w-5 h-5" />,
      Database: <Database className="w-5 h-5" />,
      Clipboard: <FileText className="w-5 h-5" />,
      Key: <Key className="w-5 h-5" />,
      Image: <ImageIcon className="w-5 h-5" />,
      FileImage: <FileText className="w-5 h-5" />,
      HardDrive: <HardDrive className="w-5 h-5" />,
      FileText2: <FileText className="w-5 h-5" />,
      Lock: <Lock className="w-5 h-5" />,
      MapPin: <MapPin className="w-5 h-5" />,
      Hash: <Hash className="w-5 h-5" />,
      CreditCard: <CreditCard className="w-5 h-5" />,
      Plane: <Plane className="w-5 h-5" />,
      Anchor: <Anchor className="w-5 h-5" />,
      Sun: <Sun className="w-5 h-5" />,
      Code: <Code className="w-5 h-5" />,
      Cpu: <Cpu className="w-5 h-5" />,
      Terminal: <Terminal className="w-5 h-5" />,
    };

    return iconMap[iconName] || <Zap className="w-5 h-5" />;
  };

  const filteredModules = modules.filter((module) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !module.name.toLowerCase().includes(query) &&
        !module.description.toLowerCase().includes(query) &&
        !module.id.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory && module.category !== selectedCategory) {
      return false;
    }

    // Installed filter
    if (filterInstalled !== null) {
      if (module.installed !== filterInstalled) {
        return false;
      }
    }

    // Risk filter
    if (filterRisk && module.risk !== filterRisk) {
      return false;
    }

    return true;
  });

  const stats = {
    total: modules.length,
    installed: modules.filter((m) => m.installed).length,
    enabled: modules.filter((m) => m.enabled).length,
    byCategory: categories.map((c) => ({
      ...c,
      installed: modules.filter((m) => m.category === c.id && m.installed).length,
    })),
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-white">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#161b22]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">OSINT Module Manager</h1>
            <p className="text-sm text-gray-400">{stats.installed}/{stats.total} modules installed</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={quickStart}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            Quick Start
          </button>
          <button
            onClick={() => setShowApiModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            <Key className="w-4 h-4" />
            API Keys
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-3 border-b border-gray-800 bg-[#0d1117] flex items-center gap-6 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Total:</span>
          <span className="text-lg font-semibold">{stats.total}</span>
        </div>
        <div className="w-px h-6 bg-gray-700" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-gray-400">Installed:</span>
          <span className="text-lg font-semibold text-green-500">{stats.installed}</span>
        </div>
        <div className="w-px h-6 bg-gray-700" />
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-400">Enabled:</span>
          <span className="text-lg font-semibold text-yellow-500">{stats.enabled}</span>
        </div>
        <div className="w-px h-6 bg-gray-700" />
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-gray-400">High Risk:</span>
          <span className="text-lg font-semibold text-red-500">
            {modules.filter((m) => m.risk === "high" || m.risk === "critical").length}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Categories */}
        <div className="w-64 border-r border-gray-800 bg-[#161b22] flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Categories</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                selectedCategory === null ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "hover:bg-gray-800 text-gray-300"
              }`}
            >
              <span className="font-medium">All Modules</span>
              <span className="text-sm text-gray-500">{stats.total}</span>
            </button>

            {categories.map((category) => {
              const installed = stats.byCategory.find((c) => c.id === category.id)?.installed || 0;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedCategory === category.id ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "hover:bg-gray-800 text-gray-300"
                  }`}
                >
                  <span className="font-medium">{category.name}</span>
                  <div className="flex items-center gap-2">
                    {installed > 0 && <span className="text-xs text-green-500">{installed}/</span>}
                    <span className="text-sm text-gray-500">{category.count}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Category Actions */}
          {selectedCategory && (
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => batchInstall(selectedCategory)}
                disabled={batchInstallProgress !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                {batchInstallProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {batchInstallProgress.current}/{batchInstallProgress.total}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Install All
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-[#0d1117]">
            <div className="flex items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#161b22] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filters */}
              <select
                value={filterInstalled === null ? "all" : filterInstalled ? "installed" : "not-installed"}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterInstalled(val === "all" ? null : val === "installed");
                }}
                className="px-3 py-2 bg-[#161b22] border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="installed">Installed</option>
                <option value="not-installed">Not Installed</option>
              </select>

              <select
                value={filterRisk || "all"}
                onChange={(e) => setFilterRisk(e.target.value === "all" ? null : e.target.value)}
                className="px-3 py-2 bg-[#161b22] border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-[#161b22] rounded-lg border border-gray-700 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-colors ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-colors ${viewMode === "list" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Module List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredModules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p>No modules found</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredModules.map((module) => (
                  <motion.div
                    key={module.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-[#161b22] border border-gray-800 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedModule(module);
                      setShowDetails(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400">
                        {getIcon(module.icon)}
                      </div>
                      <div className="flex items-center gap-1">
                        {module.installed && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {module.risk === "high" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {module.requiresRoot && <Shield className="w-4 h-4 text-yellow-500" />}
                      </div>
                    </div>

                    <h3 className="font-semibold text-white mb-1 truncate">{module.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">{module.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                        {module.installMethod}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          module.risk === "low"
                            ? "bg-green-500/20 text-green-400"
                            : module.risk === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {module.risk}
                      </span>
                    </div>

                    {/* Install Button */}
                    {!module.installed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          installModule(module.id);
                        }}
                        disabled={installing.has(module.id)}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {installing.has(module.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Installing...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Install
                          </>
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredModules.map((module) => (
                  <motion.div
                    key={module.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-3 bg-[#161b22] border border-gray-800 rounded-lg hover:border-blue-500/50 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400">
                      {getIcon(module.icon)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{module.name}</h3>
                        {module.installed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {module.risk === "high" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{module.description}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                        {module.category}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          module.risk === "low"
                            ? "bg-green-500/20 text-green-400"
                            : module.risk === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {module.risk}
                      </span>

                      {!module.installed ? (
                        <button
                          onClick={() => installModule(module.id)}
                          disabled={installing.has(module.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {installing.has(module.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          Install
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleModule(module.id, !module.enabled)}
                            className={`p-2 rounded-lg transition-colors ${
                              module.enabled ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-400"
                            }`}
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedModule(module);
                              setShowDetails(true);
                            }}
                            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module Details Modal */}
      <AnimatePresence>
        {showDetails && selectedModule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-800 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400">
                    {getIcon(selectedModule.icon)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedModule.name}</h2>
                    <p className="text-sm text-gray-400">{selectedModule.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                <p className="text-gray-300">{selectedModule.description}</p>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0d1117] rounded-lg p-4">
                    <span className="text-sm text-gray-500">Category</span>
                    <p className="font-medium text-white capitalize">{selectedModule.category}</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-4">
                    <span className="text-sm text-gray-500">Install Method</span>
                    <p className="font-medium text-white uppercase">{selectedModule.installMethod}</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-4">
                    <span className="text-sm text-gray-500">Risk Level</span>
                    <p
                      className={`font-medium capitalize ${
                        selectedModule.risk === "low"
                          ? "text-green-400"
                          : selectedModule.risk === "medium"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {selectedModule.risk}
                    </p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-4">
                    <span className="text-sm text-gray-500">Root Required</span>
                    <p className="font-medium text-white">{selectedModule.requiresRoot ? "Yes" : "No"}</p>
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Supported Platforms
                  </h4>
                  <div className="flex items-center gap-2">
                    {selectedModule.platform.map((platform) => (
                      <span key={platform} className="px-3 py-1 rounded-full bg-gray-800 text-sm text-gray-300">
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>

                {/* API Keys */}
                {selectedModule.apiKeys && selectedModule.apiKeys.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Required API Keys
                    </h4>
                    <div className="space-y-2">
                      {selectedModule.apiKeys.map((key) => (
                        <div key={key} className="flex items-center gap-2 text-sm text-gray-300">
                          <Key className="w-4 h-4 text-yellow-500" />
                          {key}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {selectedModule.dependencies && selectedModule.dependencies.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Dependencies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedModule.dependencies.map((dep) => (
                        <span key={dep} className="px-3 py-1 rounded-full bg-gray-800 text-sm text-gray-300">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="flex items-center gap-4">
                  {selectedModule.github && (
                    <a
                      href={selectedModule.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                  )}
                  {selectedModule.website && (
                    <a
                      href={selectedModule.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {selectedModule.installed ? (
                    <>
                      <span className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        Installed
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedModule.enabled}
                          onChange={(e) => toggleModule(selectedModule.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-600"
                        />
                        <span className="text-gray-300">Enabled</span>
                      </label>
                    </>
                  ) : (
                    <span className="text-gray-500">Not installed</span>
                  )}
                </div>

                {!selectedModule.installed && (
                  <button
                    onClick={() => {
                      installModule(selectedModule.id);
                      setShowDetails(false);
                    }}
                    disabled={installing.has(selectedModule.id)}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {installing.has(selectedModule.id) ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Install Module
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Keys Modal */}
      <AnimatePresence>
        {showApiModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowApiModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-gray-800 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-white">API Keys Configuration</h2>
                <p className="text-sm text-gray-400">Configure API keys for external services</p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "shodan", label: "Shodan API Key", url: "https://account.shodan.io" },
                    { name: "virustotal", label: "VirusTotal API Key", url: "https://www.virustotal.com" },
                    { name: "hibp_api", label: "Have I Been Pwned API Key", url: "https://haveibeenpwned.com" },
                    { name: "censys_id", label: "Censys API ID", url: "https://search.censys.io" },
                    { name: "censys_secret", label: "Censys API Secret", url: "https://search.censys.io" },
                    { name: "telegram_id", label: "Telegram API ID", url: "https://my.telegram.org" },
                    { name: "telegram_hash", label: "Telegram API Hash", url: "https://my.telegram.org" },
                    { name: "zoomeye", label: "ZoomEye API Key", url: "https://www.zoomeye.org" },
                  ].map((api) => (
                    <div key={api.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300">{api.label}</label>
                        <a
                          href={api.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Get Key →
                        </a>
                      </div>
                      <input
                        type="password"
                        placeholder={`Enter ${api.label}`}
                        value={apiKeys[api.name] || ""}
                        onChange={(e) => setApiKeys((prev) => ({ ...prev, [api.name]: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowApiModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save API keys
                    localStorage.setItem("osint_api_keys", JSON.stringify(apiKeys));
                    setShowApiModal(false);
                    toast.success("API keys saved");
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Save API Keys
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Install Progress */}
      {batchInstallProgress && (
        <div className="fixed bottom-4 right-4 bg-[#161b22] border border-gray-800 rounded-xl p-4 shadow-2xl z-50">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="font-medium">Installing modules...</span>
          </div>
          <p className="text-sm text-gray-400 mb-2">
            {batchInstallProgress.moduleName} ({batchInstallProgress.current}/{batchInstallProgress.total})
          </p>
          <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${(batchInstallProgress.current / batchInstallProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
