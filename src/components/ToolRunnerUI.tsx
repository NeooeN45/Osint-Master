/**
 * Tool Runner UI - Phase 2 UI v2
 * Interface d'exécution des outils CLI avec animations pulse
 * 
 * Features:
 * - Animations pulse pendant exécution
 * - Progress bars avec gradient
 * - Log streaming en temps réel
 * - Résultats formatés (JSON, XML, texte)
 * - Style Google Dark Minimalist
 * 
 * Créé: 17 Avril 2026 - Phase 2 UI
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Trash2,
  RotateCcw,
  Zap,
  Shield,
  Globe,
  User,
  Mail,
  Phone,
  MapPin,
  Database,
  Search,
  FileJson,
  FileText,
  Code,
} from 'lucide-react';

// Types
interface ToolExecution {
  id: string;
  toolId: string;
  toolName: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  output: string;
  error?: string;
  exitCode?: number;
  duration?: number;
  result?: any;
}

interface ToolManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  targetTypes: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  isAvailable: boolean;
}

// Mock tools pour démonstration
const mockTools: ToolManifest[] = [
  { id: 'sherlock', name: 'Sherlock', description: 'Hunt down social media accounts', category: 'Username', targetTypes: ['username'], priority: 'critical', isAvailable: true },
  { id: 'holehe', name: 'Holehe', description: 'Check if email is used on social networks', category: 'Email', targetTypes: ['email'], priority: 'critical', isAvailable: true },
  { id: 'theharvester', name: 'theHarvester', description: 'Gather emails, subdomains, hosts', category: 'Domain', targetTypes: ['domain', 'ip'], priority: 'high', isAvailable: true },
  { id: 'phoneinfoga', name: 'PhoneInfoga', description: 'Advanced phone number OSINT', category: 'Phone', targetTypes: ['phone'], priority: 'high', isAvailable: true },
  { id: 'reconng', name: 'Recon-ng', description: 'Web reconnaissance framework', category: 'Framework', targetTypes: ['domain', 'ip', 'email'], priority: 'medium', isAvailable: true },
  { id: 'instaloader', name: 'Instaloader', description: 'Download Instagram profiles', category: 'Social', targetTypes: ['username'], priority: 'medium', isAvailable: true },
];

// Category colors (strategic accents)
const categoryColors: Record<string, { icon: any; color: string; bg: string }> = {
  Username: { icon: User, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  Email: { icon: Mail, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  Domain: { icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Phone: { icon: Phone, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  Framework: { icon: Database, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  Social: { icon: Search, color: 'text-blue-400', bg: 'bg-blue-400/10' },
};

export function ToolRunnerUI() {
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [activeTab, setActiveTab] = useState<'tools' | 'running' | 'completed'>('tools');
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executions]);

  // Simuler l'exécution d'un outil
  const runTool = async (toolId: string) => {
    if (!target.trim()) return;

    const tool = mockTools.find(t => t.id === toolId);
    if (!tool) return;

    const execution: ToolExecution = {
      id: crypto.randomUUID(),
      toolId,
      toolName: tool.name,
      target,
      status: 'running',
      startTime: new Date(),
      output: '',
    };

    setExecutions(prev => [execution, ...prev]);
    setActiveTab('running');

    // Simulation de l'exécution
    const steps = [
      `[+] Starting ${tool.name}...`,
      `[+] Target: ${target}`,
      `[+] Loading modules...`,
      `[+] Searching on platforms...`,
      `[✓] Found 12 results`,
      `[+] Analyzing data...`,
      `[✓] Done`,
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
      
      setExecutions(prev => prev.map(ex => 
        ex.id === execution.id 
          ? { ...ex, output: ex.output + steps[i] + '\n' }
          : ex
      ));
    }

    // Marquer comme complété
    setExecutions(prev => prev.map(ex => 
      ex.id === execution.id 
        ? { 
            ...ex, 
            status: 'completed', 
            endTime: new Date(),
            duration: Date.now() - (ex.startTime?.getTime() || 0),
            exitCode: 0,
            result: { found: 12, platforms: ['Twitter', 'Instagram', 'GitHub'] }
          }
        : ex
    ));
  };

  const stopExecution = (executionId: string) => {
    setExecutions(prev => prev.map(ex => 
      ex.id === executionId 
        ? { ...ex, status: 'cancelled', endTime: new Date() }
        : ex
    ));
  };

  const clearExecutions = () => {
    setExecutions([]);
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
  };

  // Filtrer les exécutions selon l'onglet
  const filteredExecutions = executions.filter(ex => {
    if (activeTab === 'running') return ex.status === 'running';
    if (activeTab === 'completed') return ex.status === 'completed' || ex.status === 'failed' || ex.status === 'cancelled';
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-950/50 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-400/10 border border-cyan-400/20">
                <Terminal className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Tool Runner</h1>
                <p className="text-sm text-white/40">Execute OSINT tools with OPSEC protection</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-xs font-medium border border-emerald-400/20">
                {executions.filter(e => e.status === 'running').length} Running
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs border border-white/10">
                {executions.length} Total
              </span>
              {executions.length > 0 && (
                <button
                  onClick={clearExecutions}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Target Input */}
        <div className="px-6 py-3 border-t border-white/5">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Enter target (username, email, domain, phone, IP)..."
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-white/5 bg-zinc-950/30">
        {(['tools', 'running', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'running' && executions.filter(e => e.status === 'running').length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-cyan-400 text-black text-xs animate-pulse">
                {executions.filter(e => e.status === 'running').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'tools' ? (
          /* Tools Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTools.map((tool) => {
              const categoryStyle = categoryColors[tool.category] || { icon: Zap, color: 'text-white', bg: 'bg-white/5' };
              const Icon = categoryStyle.icon;

              return (
                <motion.div
                  key={tool.id}
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  className="p-5 rounded-xl bg-zinc-950 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${categoryStyle.bg} ${categoryStyle.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.color}`}>
                      {tool.category}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white mb-1">{tool.name}</h3>
                  <p className="text-sm text-white/50 mb-4">{tool.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {tool.targetTypes.map((type) => (
                        <span key={type} className="px-2 py-0.5 rounded text-xs bg-white/5 text-white/40">
                          {type}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => runTool(tool.id)}
                      disabled={!target.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-400 text-black font-medium text-sm hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all group-hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                    >
                      <Play className="w-4 h-4" />
                      Run
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Executions List */
          <div className="space-y-3">
            {filteredExecutions.length === 0 ? (
              <div className="text-center py-12">
                <Terminal className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No {activeTab} executions</p>
              </div>
            ) : (
              filteredExecutions.map((execution) => (
                <motion.div
                  key={execution.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-zinc-950 border border-white/5 overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Status Indicator */}
                      <div className="relative">
                        {execution.status === 'running' ? (
                          <>
                            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                            <div className="absolute inset-0 w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                          </>
                        ) : execution.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : execution.status === 'failed' ? (
                          <XCircle className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Square className="w-5 h-5 text-amber-400" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-white">{execution.toolName}</h4>
                        <p className="text-xs text-white/40">Target: {execution.target}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {execution.status === 'running' && (
                        <button
                          onClick={() => stopExecution(execution.id)}
                          className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-rose-400 transition-colors"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      )}

                      {execution.duration && (
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {(execution.duration / 1000).toFixed(1)}s
                        </span>
                      )}

                      <button
                        onClick={() => setExpandedExecution(
                          expandedExecution === execution.id ? null : execution.id
                        )}
                        className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                      >
                        {expandedExecution === execution.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedExecution === execution.id && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="border-t border-white/5"
                      >
                        {/* Output Log */}
                        <div className="p-4 bg-black/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-white/60">Output</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => copyOutput(execution.output)}
                                className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="font-mono text-xs text-white/70 bg-zinc-950 rounded-lg p-3 max-h-48 overflow-y-auto s-thin whitespace-pre-wrap">
                            {execution.output || 'Waiting for output...'}
                            {execution.status === 'running' && (
                              <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1" />
                            )}
                            <div ref={logsEndRef} />
                          </div>
                        </div>

                        {/* Result Summary */}
                        {execution.result && (
                          <div className="px-4 pb-4">
                            <div className="p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                              <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">Execution Complete</span>
                              </div>
                              <p className="text-xs text-white/60">
                                Found {execution.result.found} results across {execution.result.platforms.length} platforms
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolRunnerUI;
