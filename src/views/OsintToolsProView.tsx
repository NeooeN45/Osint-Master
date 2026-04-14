import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Grid,
  List,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Settings,
  Zap,
  Shield,
  Database,
  Globe,
  User,
  Mail,
  Phone,
  FileText,
  Image,
  MapPin,
  Bitcoin,
  Skull,
  ShieldAlert,
  Car,
  Plane,
  Ship,
  Cloud,
  Archive,
  Building2,
  Network,
  Tag,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckSquare,
  Square,
  AlertCircle,
  Layers,
  Workflow,
  Target,
  Fingerprint,
  Eye,
  EyeOff,
  Download,
  Share2,
  Trash2,
  Plus,
  Minus,
  Maximize2,
  Terminal,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

// Tool categories with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  person: { icon: User, color: "text-blue-400", label: "Person Search" },
  email: { icon: Mail, color: "text-yellow-400", label: "Email Intelligence" },
  domain: { icon: Globe, color: "text-green-400", label: "Domain Intelligence" },
  ip_network: { icon: Network, color: "text-cyan-400", label: "Network & Infrastructure" },
  dark_web: { icon: Skull, color: "text-purple-400", label: "Dark Web" },
  social_media: { icon: Share2, color: "text-pink-400", label: "Social Media" },
  crypto: { icon: Bitcoin, color: "text-orange-400", label: "Cryptocurrency" },
  image_video: { icon: Image, color: "text-rose-400", label: "Image & Video" },
  geolocation: { icon: MapPin, color: "text-emerald-400", label: "Geolocation" },
  breach_leak: { icon: ShieldAlert, color: "text-red-400", label: "Breach & Leaks" },
  document: { icon: FileText, color: "text-slate-400", label: "Documents" },
  metadata: { icon: Tag, color: "text-teal-400", label: "Metadata" },
  archives: { icon: Archive, color: "text-amber-400", label: "Archives" },
  business: { icon: Building2, color: "text-indigo-400", label: "Business" },
  vehicle: { icon: Car, color: "text-lime-400", label: "Vehicles" },
  flight: { icon: Plane, color: "text-sky-400", label: "Aviation" },
  maritime: { icon: Ship, color: "text-blue-500", label: "Maritime" },
  weather: { icon: Cloud, color: "text-cyan-300", label: "Weather" },
  malware: { icon: Shield, color: "text-red-500", label: "Threat Intel" },
};

interface OsintTool {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  url: string;
  requiresApiKey: boolean;
  rateLimit: { requests: number; window: number };
  reliability: number;
  falsePositiveRate: number;
  verificationMethods: string[];
  inputTypes: string[];
  outputTypes: string[];
  automationLevel: 'full' | 'partial' | 'manual';
  enabled: boolean;
  tags: string[];
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  targetType: string;
  tools: string[];
  verificationRequired: boolean;
  timeout: number;
  priority: 'high' | 'medium' | 'low';
}

// Mock data - in production this would come from the backend
const MOCK_TOOLS: OsintTool[] = [
  {
    id: 'shodan',
    name: 'Shodan',
    description: 'Search engine for Internet-connected devices',
    category: 'ip_network',
    subcategory: 'device_search',
    url: 'https://shodan.io',
    requiresApiKey: true,
    rateLimit: { requests: 1000, window: 60000 },
    reliability: 98,
    falsePositiveRate: 2,
    verificationMethods: ['direct_scan', 'source_reputation'],
    inputTypes: ['ip', 'domain'],
    outputTypes: ['ip_info', 'ports', 'vulnerabilities'],
    automationLevel: 'full',
    enabled: true,
    tags: ['critical_infra', 'iot', 'cybersecurity'],
  },
  {
    id: 'hibp',
    name: 'Have I Been Pwned',
    description: 'Check if email has been compromised in data breaches',
    category: 'breach_leak',
    subcategory: 'breach_notification',
    url: 'https://haveibeenpwned.com',
    requiresApiKey: true,
    rateLimit: { requests: 150, window: 60000 },
    reliability: 98,
    falsePositiveRate: 2,
    verificationMethods: ['verified_breaches', 'source_reputation'],
    inputTypes: ['email', 'username'],
    outputTypes: ['breach_data'],
    automationLevel: 'full',
    enabled: true,
    tags: ['free', 'trusted', 'breach'],
  },
  {
    id: 'pipl',
    name: 'Pipl',
    description: 'Identity resolution engine',
    category: 'person',
    subcategory: 'identity_resolution',
    url: 'https://pipl.com',
    requiresApiKey: true,
    rateLimit: { requests: 100, window: 60000 },
    reliability: 92,
    falsePositiveRate: 8,
    verificationMethods: ['cross_reference', 'confidence_score'],
    inputTypes: ['email', 'phone', 'username'],
    outputTypes: ['profile', 'social_accounts', 'contact_info'],
    automationLevel: 'full',
    enabled: true,
    tags: ['premium', 'identity'],
  },
  {
    id: 'google_lens',
    name: 'Google Lens',
    description: 'Reverse image search and visual analysis',
    category: 'image_video',
    subcategory: 'reverse_image',
    url: 'https://lens.google.com',
    requiresApiKey: true,
    rateLimit: { requests: 100, window: 60000 },
    reliability: 94,
    falsePositiveRate: 6,
    verificationMethods: ['visual_similarity', 'pattern_matching'],
    inputTypes: ['image', 'url'],
    outputTypes: ['similar_images', 'location'],
    automationLevel: 'full',
    enabled: true,
    tags: ['google', 'reverse_image'],
  },
];

const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'deep_person_investigation',
    name: 'Deep Person Investigation',
    description: 'Comprehensive person search across all sources',
    targetType: 'email',
    tools: ['pipl', 'hibp', 'shodan'],
    verificationRequired: true,
    timeout: 300,
    priority: 'high',
  },
  {
    id: 'domain_reconnaissance',
    name: 'Domain Reconnaissance',
    description: 'Full domain intelligence gathering',
    targetType: 'domain',
    tools: ['shodan'],
    verificationRequired: true,
    timeout: 180,
    priority: 'high',
  },
];

export default function OsintToolsProView() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [runningWorkflows, setRunningWorkflows] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState('');
  const [targetType, setTargetType] = useState('email');
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'workflows' | 'results'>('tools');
  const [results, setResults] = useState<unknown[]>([]);

  // Filter tools based on category and search
  const filteredTools = useMemo(() => {
    let filtered = MOCK_TOOLS;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [selectedCategory, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const enabled = MOCK_TOOLS.filter(t => t.enabled).length;
    const avgReliability = MOCK_TOOLS.reduce((sum, t) => sum + t.reliability, 0) / MOCK_TOOLS.length;
    const fullAuto = MOCK_TOOLS.filter(t => t.automationLevel === 'full').length;
    const apiTools = MOCK_TOOLS.filter(t => t.requiresApiKey).length;

    return {
      total: MOCK_TOOLS.length,
      enabled,
      avgReliability: Math.round(avgReliability),
      fullAuto,
      apiTools,
    };
  }, []);

  const toggleToolSelection = (toolId: string) => {
    const newSelection = new Set(selectedTools);
    if (newSelection.has(toolId)) {
      newSelection.delete(toolId);
    } else {
      newSelection.add(toolId);
    }
    setSelectedTools(newSelection);
  };

  const runWorkflow = async (workflowId: string) => {
    if (!target) {
      toast.error('Please enter a target first');
      return;
    }

    setRunningWorkflows(prev => new Set(prev).add(workflowId));
    toast.info(`Starting workflow: ${workflowId}`);

    // Simulate workflow execution
    setTimeout(() => {
      setRunningWorkflows(prev => {
        const newSet = new Set(prev);
        newSet.delete(workflowId);
        return newSet;
      });
      
      setResults(prev => [...prev, {
        workflowId,
        target,
        timestamp: new Date().toISOString(),
        status: 'completed',
        findings: Math.floor(Math.random() * 10) + 1,
        confidence: Math.floor(Math.random() * 30) + 70,
      }]);
      
      toast.success(`Workflow completed: ${workflowId}`);
    }, 3000);
  };

  const runSelectedTools = async () => {
    if (selectedTools.size === 0) {
      toast.error('Please select at least one tool');
      return;
    }
    if (!target) {
      toast.error('Please enter a target first');
      return;
    }

    toast.info(`Running ${selectedTools.size} tools on ${target}`);
    
    // Simulate execution
    setTimeout(() => {
      toast.success(`Completed ${selectedTools.size} tool executions`);
      setResults(prev => [...prev, {
        tools: Array.from(selectedTools),
        target,
        timestamp: new Date().toISOString(),
        status: 'completed',
      }]);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-surface-1 text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-accent-cyan" />
            <span className="font-semibold text-white">OSINT Tools Pro</span>
            <span className="text-xs px-2 py-0.5 bg-accent-cyan/20 text-accent-cyan rounded">
              {stats.total} Tools
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 ml-6">
            {(['tools', 'workflows', 'results'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-accent-cyan/20 text-accent-cyan'
                    : 'text-slate-400 hover:text-white hover:bg-surface-3'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Target Input */}
          <div className="flex items-center gap-2">
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="px-3 py-1.5 bg-surface-3 border border-border rounded text-sm text-white"
            >
              <option value="email">Email</option>
              <option value="username">Username</option>
              <option value="domain">Domain</option>
              <option value="ip">IP Address</option>
              <option value="phone">Phone</option>
              <option value="crypto_address">Crypto</option>
            </select>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={`Enter ${targetType}...`}
              className="w-64 px-3 py-1.5 bg-surface-3 border border-border rounded text-sm text-white placeholder-slate-500"
            />
          </div>

          <button
            onClick={runSelectedTools}
            disabled={selectedTools.size === 0 || !target}
            className="flex items-center gap-2 px-4 py-1.5 bg-accent-cyan text-surface-1 rounded font-medium text-sm hover:bg-accent-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Run Selected ({selectedTools.size})
          </button>

          <button
            onClick={() => setShowVerificationPanel(!showVerificationPanel)}
            className={`p-1.5 rounded ${showVerificationPanel ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-slate-400 hover:text-white'}`}
          >
            <Shield className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-2 bg-surface-3 border-b border-border text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          <span className="text-slate-400">Enabled:</span>
          <span className="text-white font-medium">{stats.enabled}/{stats.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-slate-400">Avg Reliability:</span>
          <span className="text-white font-medium">{stats.avgReliability}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-slate-400">Full Auto:</span>
          <span className="text-white font-medium">{stats.fullAuto}</span>
        </div>
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-400">API Required:</span>
          <span className="text-white font-medium">{stats.apiTools}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-surface-2 border-r border-border flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-9 pr-3 py-2 bg-surface-3 border border-border rounded text-sm text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex-1 overflow-y-auto py-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-accent-cyan/10 text-accent-cyan border-r-2 border-accent-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-surface-3'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="flex-1 text-left">All Categories</span>
              <span className="text-xs text-slate-500">{MOCK_TOOLS.length}</span>
            </button>

            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = MOCK_TOOLS.filter(t => t.category === key).length;
              if (count === 0) return null;

              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    selectedCategory === key
                      ? 'bg-accent-cyan/10 text-accent-cyan border-r-2 border-accent-cyan'
                      : 'text-slate-400 hover:text-white hover:bg-surface-3'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="flex-1 text-left">{config.label}</span>
                  <span className="text-xs text-slate-500">{count}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 p-1 bg-surface-3 rounded">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs ${
                  viewMode === 'grid' ? 'bg-accent-cyan text-white' : 'text-slate-400'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs ${
                  viewMode === 'list' ? 'bg-accent-cyan text-white' : 'text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'tools' && (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTools.map(tool => {
                    const category = CATEGORY_CONFIG[tool.category];
                    const Icon = category?.icon || Database;
                    const isSelected = selectedTools.has(tool.id);
                    const isRunning = runningWorkflows.has(tool.id);

                    return (
                      <div
                        key={tool.id}
                        className={`relative group p-4 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent-cyan bg-accent-cyan/5'
                            : 'border-border bg-surface-2 hover:border-accent-cyan/50'
                        }`}
                        onClick={() => toggleToolSelection(tool.id)}
                      >
                        {/* Selection checkbox */}
                        <div className="absolute top-3 right-3">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-accent-cyan" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg bg-surface-3 ${category?.color || 'text-slate-400'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 pr-8">
                            <h3 className="font-medium text-white text-sm">{tool.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{tool.subcategory}</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{tool.description}</p>

                        {/* Reliability & FP Rate */}
                        <div className="flex items-center gap-4 mb-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-400 rounded-full"
                                style={{ width: `${tool.reliability}%` }}
                              />
                            </div>
                            <span className="text-slate-400">{tool.reliability}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-yellow-400" />
                            <span className="text-slate-400">FP: {tool.falsePositiveRate}%</span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {tool.requiresApiKey && (
                            <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded">
                              API Key
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                            tool.automationLevel === 'full'
                              ? 'bg-green-500/10 text-green-400'
                              : tool.automationLevel === 'partial'
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}>
                            {tool.automationLevel}
                          </span>
                          {tool.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-surface-3 text-slate-400 text-[10px] rounded">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-white bg-surface-3 rounded"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTools.map(tool => {
                    const category = CATEGORY_CONFIG[tool.category];
                    const Icon = category?.icon || Database;
                    const isSelected = selectedTools.has(tool.id);

                    return (
                      <div
                        key={tool.id}
                        onClick={() => toggleToolSelection(tool.id)}
                        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-accent-cyan bg-accent-cyan/5'
                            : 'border-border bg-surface-2 hover:border-accent-cyan/50'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-accent-cyan" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-600" />
                        )}

                        <div className={`p-2 rounded bg-surface-3 ${category?.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white text-sm">{tool.name}</h3>
                            {tool.requiresApiKey && (
                              <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded">
                                API
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{tool.description}</p>
                        </div>

                        <div className="flex items-center gap-6 text-xs">
                          <div className="text-center">
                            <div className="text-slate-400">Reliability</div>
                            <div className="text-green-400 font-medium">{tool.reliability}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-400">FP Rate</div>
                            <div className={`font-medium ${tool.falsePositiveRate < 10 ? 'text-green-400' : tool.falsePositiveRate < 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {tool.falsePositiveRate}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-400">Level</div>
                            <div className={`font-medium ${
                              tool.automationLevel === 'full' ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              {tool.automationLevel}
                            </div>
                          </div>
                        </div>

                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-slate-400 hover:text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'workflows' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Automated Workflows</h2>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-accent-cyan/20 text-accent-cyan rounded text-sm hover:bg-accent-cyan/30">
                  <Plus className="w-4 h-4" />
                  Create Workflow
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MOCK_WORKFLOWS.map(workflow => (
                  <div
                    key={workflow.id}
                    className="p-4 rounded-lg border border-border bg-surface-2"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-cyan/10">
                          <Workflow className="w-5 h-5 text-accent-cyan" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{workflow.name}</h3>
                          <p className="text-xs text-slate-500">{workflow.tools.length} tools</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        workflow.priority === 'high'
                          ? 'bg-red-500/10 text-red-400'
                          : workflow.priority === 'medium'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}>
                        {workflow.priority}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mb-4">{workflow.description}</p>

                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {workflow.tools.map(toolId => {
                        const tool = MOCK_TOOLS.find(t => t.id === toolId);
                        return tool ? (
                          <span
                            key={toolId}
                            className="px-2 py-1 bg-surface-3 text-slate-400 text-xs rounded"
                          >
                            {tool.name}
                          </span>
                        ) : null;
                      })}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" />
                          {workflow.targetType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {workflow.timeout}s timeout
                        </span>
                        {workflow.verificationRequired && (
                          <span className="flex items-center gap-1 text-accent-cyan">
                            <Shield className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => runWorkflow(workflow.id)}
                        disabled={runningWorkflows.has(workflow.id) || !target}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent-cyan text-surface-1 rounded text-sm font-medium hover:bg-accent-cyan/90 disabled:opacity-50"
                      >
                        {runningWorkflows.has(workflow.id) ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {runningWorkflows.has(workflow.id) ? 'Running...' : 'Run'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Execution Results</h2>
                <button
                  onClick={() => setResults([])}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              </div>

              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Database className="w-12 h-12 mb-4" />
                  <p>No results yet. Run some tools or workflows to see results here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-border bg-surface-2"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-green-500/10">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </div>
                          <span className="font-medium text-white">
                            {'workflowId' in (result as object) ? (result as {workflowId: string}).workflowId : 'Custom Execution'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date((result as {timestamp: string}).timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-slate-400">
                        {'target' in (result as object) && (
                          <span>Target: <span className="text-white">{(result as {target: string}).target}</span></span>
                        )}
                        {'findings' in (result as object) && (
                          <span>Findings: <span className="text-accent-cyan">{(result as {findings: number}).findings}</span></span>
                        )}
                        {'confidence' in (result as object) && (
                          <span>Confidence: <span className="text-green-400">{(result as {confidence: number}).confidence}%</span></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification Panel */}
        {showVerificationPanel && (
          <div className="w-80 bg-surface-2 border-l border-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent-cyan" />
                <span className="font-medium text-white">Verification</span>
              </div>
              <button
                onClick={() => setShowVerificationPanel(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Verification Rules */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase mb-3">Active Rules</h4>
                <div className="space-y-2">
                  {[
                    { id: 'cross_ref', name: 'Cross-Reference (2+ sources)', status: 'active', fp: 40 },
                    { id: 'freshness', name: 'Data Freshness (30 days)', status: 'active', fp: 25 },
                    { id: 'confidence', name: 'Confidence Threshold (70%)', status: 'active', fp: 35 },
                    { id: 'pattern', name: 'Pattern Validation', status: 'active', fp: 20 },
                    { id: 'source', name: 'Source Reputation (>80%)', status: 'active', fp: 30 },
                  ].map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-2 rounded bg-surface-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-slate-300">{rule.name}</span>
                      </div>
                      <span className="text-xs text-green-400">-{rule.fp}% FP</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase mb-3">Impact</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-400">False Positive Reduction</span>
                      <span className="text-green-400 font-medium">~75%</span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-green-400 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-400">Confidence Boost</span>
                      <span className="text-accent-cyan font-medium">+15-50%</span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full w-1/2 bg-accent-cyan rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Tools Verification */}
              {selectedTools.size > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 uppercase mb-3">
                    Selected Tools ({selectedTools.size})
                  </h4>
                  <div className="space-y-2">
                    {Array.from(selectedTools).map(toolId => {
                      const tool = MOCK_TOOLS.find(t => t.id === toolId);
                      if (!tool) return null;
                      return (
                        <div key={toolId} className="p-2 rounded bg-surface-3 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white">{tool.name}</span>
                            <span className={`${tool.reliability >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {tool.reliability}%
                            </span>
                          </div>
                          <div className="text-slate-500">
                            FP Risk: {tool.falsePositiveRate}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
