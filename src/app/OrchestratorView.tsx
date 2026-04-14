/**
 * Orchestrator View - Interface d'investigation multi-agents avancée
 * Visualisation temps réel des agents, graphe d'enrichissement, panneau OPSEC
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Network,
  Shield,
  FileText,
  Play,
  Pause,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Globe,
  Lock,
  Server,
  Zap,
  Activity,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  Filter,
  X
} from "lucide-react";
import { orchestrator, premium } from "../lib/api";

// ============================================================================
// TYPES
// ============================================================================

interface AgentTask {
  id: string;
  type: "discovery" | "enrichment" | "correlation" | "geolocation" | "verification" | "synthesis";
  target: string;
  status: "pending" | "running" | "completed" | "failed";
  depth: number;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  result?: {
    entities?: number;
    correlations?: number;
    confidence?: number;
  };
}

interface InvestigationSession {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "failed";
  createdAt: string;
  tasks: AgentTask[];
  entities: any[];
  correlations: any[];
  summary?: {
    totalEntities: number;
    totalCorrelations: number;
    confidenceDistribution: { high: number; medium: number; low: number };
    keyFindings: string[];
  };
}

interface OPSECStatus {
  level: "standard" | "cautious" | "paranoid";
  torEnabled: boolean;
  torWorking: boolean;
  proxyCount: number;
  currentProxy?: string;
  totalRequests: number;
  blockedDetections: number;
}

interface EnrichmentNode {
  id: string;
  type: string;
  value: string;
  depth: number;
  status: string;
  confidence: number;
  children: string[];
  parentId?: string;
}

// ============================================================================
// ORCHESTRATOR VIEW COMPONENT
// ============================================================================

export function OrchestratorView() {
  const [sessions, setSessions] = useState<InvestigationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<InvestigationSession | null>(null);
  const [opsecStatus, setOpsecStatus] = useState<OPSECStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newInvestigation, setNewInvestigation] = useState({
    target: "",
    targetType: "username",
    name: "",
    depth: 3,
    opsecLevel: "cautious"
  });
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"agents" | "graph" | "opsec" | "export">("agents");
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    loadOPSECStatus();

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  // Auto-refresh active session
  useEffect(() => {
    if (activeSessionId && activeSession?.status === "active") {
      refreshInterval.current = setInterval(() => {
        loadSession(activeSessionId);
      }, 3000);
    } else if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [activeSessionId, activeSession?.status]);

  const loadSessions = async () => {
    try {
      const data = await orchestrator.getSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const loadSession = async (id: string) => {
    try {
      const data = await orchestrator.getSession(id);
      setActiveSession(data);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const loadOPSECStatus = async () => {
    try {
      const data = await orchestrator.getOPSECReport();
      setOpsecStatus(data.report);
    } catch (error) {
      console.error("Failed to load OPSEC status:", error);
    }
  };

  const startInvestigation = async () => {
    if (!newInvestigation.target) return;

    setIsLoading(true);
    try {
      // Set OPSEC level first
      await orchestrator.setOPSECLevel(newInvestigation.opsecLevel as any);

      const result = await orchestrator.investigate(
        newInvestigation.target,
        newInvestigation.targetType,
        {
          name: newInvestigation.name || `Investigation-${newInvestigation.target}`,
          depth: newInvestigation.depth,
          enableAI: true,
          enableEnrichment: true
        }
      );

      setActiveSessionId(result.investigationId);
      await loadSession(result.investigationId);
      await loadSessions();
      setShowNewForm(false);
    } catch (error: any) {
      alert(`Failed to start investigation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const pauseSession = async () => {
    if (!activeSessionId) return;
    await orchestrator.pauseSession(activeSessionId);
    await loadSession(activeSessionId);
  };

  const resumeSession = async () => {
    if (!activeSessionId) return;
    await orchestrator.resumeSession(activeSessionId);
    await loadSession(activeSessionId);
  };

  const exportSession = async () => {
    if (!activeSessionId) return;
    try {
      const data = await orchestrator.exportSession(activeSessionId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `investigation-${activeSessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to export session");
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-200">Agent Orchestrator</h1>
            <p className="text-xs text-zinc-500">Multi-agent OSINT investigation system</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeSession && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <StatusBadge status={activeSession.status} />
              <span className="text-xs text-zinc-400">
                {activeSession.entities?.length || 0} entities
              </span>
            </div>
          )}

          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all"
          >
            <Play className="w-4 h-4" />
            New Investigation
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Sessions List */}
        <aside className="w-72 border-r border-zinc-800/50 bg-zinc-900/20 flex flex-col">
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Sessions</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  loadSession(session.id);
                }}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  activeSessionId === session.id
                    ? "bg-accent/10 border border-accent/30"
                    : "bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-zinc-300 truncate">{session.name}</span>
                  <StatusBadge status={session.status} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                  {session.summary && (
                    <span>• {session.summary.totalEntities} entities</span>
                  )}
                </div>
              </button>
            ))}

            {sessions.length === 0 && (
              <div className="text-center py-8 text-zinc-600">
                <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active sessions</p>
                <p className="text-xs mt-1">Start a new investigation</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/20">
            {[
              { id: "agents", label: "Agents", icon: Activity },
              { id: "graph", label: "Graph", icon: Network },
              { id: "opsec", label: "OPSEC", icon: Shield },
              { id: "export", label: "Export", icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            {activeSession && (
              <div className="ml-auto flex items-center gap-2">
                {activeSession.status === "active" ? (
                  <button
                    onClick={pauseSession}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm hover:bg-amber-500/20"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                ) : activeSession.status === "paused" ? (
                  <button
                    onClick={resumeSession}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm hover:bg-emerald-500/20"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                ) : null}

                <button
                  onClick={exportSession}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-sm hover:bg-zinc-700"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "agents" && (
              <AgentsTab session={activeSession} />
            )}
            {activeTab === "graph" && (
              <GraphTab session={activeSession} />
            )}
            {activeTab === "opsec" && (
              <OPSECTab status={opsecStatus} onRefresh={loadOPSECStatus} />
            )}
            {activeTab === "export" && (
              <ExportTab session={activeSession} />
            )}
          </div>
        </main>
      </div>

      {/* New Investigation Modal */}
      <AnimatePresence>
        {showNewForm && (
          <NewInvestigationModal
            data={newInvestigation}
            onChange={setNewInvestigation}
            onStart={startInvestigation}
            onClose={() => setShowNewForm(false)}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// AGENTS TAB
// ============================================================================

function AgentsTab({ session }: { session: InvestigationSession | null }) {
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500">Select a session to view agents</p>
        </div>
      </div>
    );
  }

  const tasks = session.tasks || [];

  // Group tasks by status
  const grouped = {
    running: tasks.filter((t) => t.status === "running"),
    pending: tasks.filter((t) => t.status === "pending"),
    completed: tasks.filter((t) => t.status === "completed"),
    failed: tasks.filter((t) => t.status === "failed")
  };

  const agentColors: Record<string, string> = {
    discovery: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    enrichment: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    geolocation: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    correlation: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    verification: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    synthesis: "text-rose-400 bg-rose-400/10 border-rose-400/20"
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Progress Overview */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent" />
            <span className="text-xs text-zinc-500 uppercase">Running</span>
          </div>
          <p className="text-2xl font-bold text-zinc-200">{grouped.running.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-zinc-500 uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold text-zinc-200">{grouped.pending.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-zinc-500 uppercase">Completed</span>
          </div>
          <p className="text-2xl font-bold text-zinc-200">{grouped.completed.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-zinc-500 uppercase">Failed</span>
          </div>
          <p className="text-2xl font-bold text-zinc-200">{grouped.failed.length}</p>
        </div>
      </div>

      {/* Running Agents */}
      {grouped.running.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent animate-pulse" />
            Currently Running
          </h3>
          <div className="space-y-2">
            {grouped.running.map((task) => (
              <AgentCard key={task.id} task={task} colorClass={agentColors[task.type]} />
            ))}
          </div>
        </div>
      )}

      {/* Task Lists */}
      <div className="grid grid-cols-2 gap-6">
        {/* Completed */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Completed ({grouped.completed.length})
          </h3>
          <div className="space-y-2">
            {grouped.completed.slice(0, 10).map((task) => (
              <AgentCard key={task.id} task={task} colorClass={agentColors[task.type]} compact />
            ))}
          </div>
        </div>

        {/* Pending */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending ({grouped.pending.length})
          </h3>
          <div className="space-y-2">
            {grouped.pending.slice(0, 10).map((task) => (
              <AgentCard key={task.id} task={task} colorClass={agentColors[task.type]} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentCard({
  task,
  colorClass,
  compact = false
}: {
  task: AgentTask;
  colorClass: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className={`p-2 rounded-lg border ${colorClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium capitalize">{task.type}</span>
          <span className="text-xs opacity-70 truncate max-w-[150px]">{task.target}</span>
        </div>
        <span className="text-xs opacity-50">Depth {task.depth}</span>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center">
            <AgentIcon type={task.type} className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-medium capitalize">{task.type} Agent</h4>
            <p className="text-xs opacity-70">Target: {task.target}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-white/10"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {task.status === "running" && (
        <div className="mb-3">
          <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
            <div className="h-full bg-current animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {task.result && (
        <div className="flex items-center gap-4 text-xs">
          <span>{task.result.entities} entities</span>
          <span>{task.result.correlations} correlations</span>
          <span>Confidence: {task.result.confidence}%</span>
        </div>
      )}

      {expanded && task.result && (
        <div className="mt-3 pt-3 border-t border-current/20 text-xs space-y-1">
          <p><strong>Started:</strong> {task.startedAt ? new Date(task.startedAt).toLocaleString() : "N/A"}</p>
          <p><strong>Completed:</strong> {task.completedAt ? new Date(task.completedAt).toLocaleString() : "N/A"}</p>
          <p><strong>Depth:</strong> {task.depth}</p>
        </div>
      )}
    </div>
  );
}

function AgentIcon({ type, className }: { type: string; className?: string }) {
  const icons: Record<string, any> = {
    discovery: Search,
    enrichment: Zap,
    geolocation: Globe,
    correlation: Network,
    verification: CheckCircle2,
    synthesis: FileText
  };
  const Icon = icons[type] || Activity;
  return <Icon className={className} />;
}

// ============================================================================
// GRAPH TAB
// ============================================================================

function GraphTab({ session }: { session: InvestigationSession | null }) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (session?.entities && session?.correlations) {
      // Convert entities to nodes
      const entityNodes = session.entities.map((e: any, i: number) => ({
        id: e.id || `entity-${i}`,
        label: e.value,
        type: e.type,
        x: Math.random() * 600,
        y: Math.random() * 400,
        confidence: e.confidence,
        color: getNodeColor(e.type)
      }));

      // Convert correlations to edges
      const correlationEdges = session.correlations.map((c: any, i: number) => ({
        id: `edge-${i}`,
        source: c.sourceEntityId,
        target: c.targetEntityId,
        label: c.type,
        strength: c.strength
      }));

      setNodes(entityNodes);
      setEdges(correlationEdges);
    }
  }, [session]);

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Network className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500">Select a session to view graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Graph Canvas */}
      <div className="flex-1 relative bg-zinc-950">
        <svg className="w-full h-full" viewBox="0 0 800 600">
          {/* Edges */}
          {edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="currentColor"
                strokeWidth={edge.strength * 3}
                strokeOpacity={0.3}
                className="text-zinc-500"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => setSelectedNode(node)}
            >
              <circle
                r={20}
                fill={node.color}
                stroke="currentColor"
                strokeWidth={selectedNode?.id === node.id ? 3 : 1}
                className="text-zinc-700"
                opacity={0.8}
              />
              <text
                y={35}
                textAnchor="middle"
                className="text-xs fill-zinc-400"
              >
                {node.label.length > 20 ? node.label.substring(0, 20) + "..." : node.label}
              </text>
              <text
                y={-30}
                textAnchor="middle"
                className="text-[10px] fill-zinc-500 uppercase"
              >
                {node.type}
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-zinc-900/90 border border-zinc-800">
          <p className="text-xs font-medium text-zinc-400 mb-2">Entity Types</p>
          <div className="space-y-1">
            {[
              { type: "username", color: "#3b82f6" },
              { type: "email", color: "#10b981" },
              { type: "phone", color: "#f59e0b" },
              { type: "ip", color: "#ef4444" },
              { type: "domain", color: "#8b5cf6" },
              { type: "location", color: "#ec4899" }
            ].map((t) => (
              <div key={t.type} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-zinc-500 capitalize">{t.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="w-80 border-l border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-zinc-200">Node Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded hover:bg-zinc-800"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 uppercase">Type</p>
              <p className="text-sm text-zinc-300 capitalize">{selectedNode.type}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Value</p>
              <p className="text-sm text-zinc-300 font-mono break-all">{selectedNode.label}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${selectedNode.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400">{selectedNode.confidence}%</span>
              </div>
            </div>

            <button className="w-full mt-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/20 text-sm hover:bg-accent/20">
              <Search className="w-4 h-4 inline mr-2" />
              Enrich this entity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    username: "#3b82f6",
    email: "#10b981",
    phone: "#f59e0b",
    ip: "#ef4444",
    domain: "#8b5cf6",
    location: "#ec4899",
    company: "#14b8a6",
    person: "#f97316"
  };
  return colors[type] || "#6b7280";
}

// ============================================================================
// OPSEC TAB
// ============================================================================

function OPSECTab({ status, onRefresh }: { status: OPSECStatus | null; onRefresh: () => void }) {
  const [level, setLevel] = useState<"standard" | "cautious" | "paranoid">("cautious");
  const [torEnabled, setTorEnabled] = useState(false);

  const applySettings = async () => {
    try {
      await orchestrator.setOPSECLevel(level);
      await orchestrator.enableTor(torEnabled);
      onRefresh();
    } catch (error) {
      alert("Failed to apply OPSEC settings");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* OPSEC Level */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Security Level
          </h3>

          <div className="grid grid-cols-3 gap-4">
            {[
              { id: "standard", label: "Standard", desc: "Direct requests, minimal protection", color: "text-zinc-400" },
              { id: "cautious", label: "Cautious", desc: "Proxy rotation, rate limiting", color: "text-amber-400" },
              { id: "paranoid", label: "Paranoid", desc: "Tor + aggressive anti-detection", color: "text-red-400" }
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id as any)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  level === l.id
                    ? "border-accent bg-accent/10"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className={`font-medium ${l.color} mb-1`}>{l.label}</div>
                <div className="text-xs text-zinc-500">{l.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tor Settings */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            Tor Network
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Enable Tor routing</p>
              <p className="text-xs text-zinc-500">Routes all requests through Tor network for anonymity</p>
            </div>
            <button
              onClick={() => setTorEnabled(!torEnabled)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                torEnabled ? "bg-accent" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  torEnabled ? "left-8" : "left-1"
                }`}
              />
            </button>
          </div>

          {status?.torWorking && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Tor is working correctly
            </div>
          )}
        </div>

        {/* Stats */}
        {status && (
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-lg font-medium text-zinc-200 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              Request Statistics
            </h3>

            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase">Total Requests</p>
                <p className="text-xl font-bold text-zinc-200">{status.totalRequests}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase">Proxy Rotations</p>
                <p className="text-xl font-bold text-zinc-200">{status.proxyCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase">Blocked Detections</p>
                <p className="text-xl font-bold text-amber-400">{status.blockedDetections}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase">Current Level</p>
                <p className="text-xl font-bold text-accent capitalize">{status.level}</p>
              </div>
            </div>
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={applySettings}
          className="w-full py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-all"
        >
          Apply OPSEC Settings
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT TAB
// ============================================================================

function ExportTab({ session }: { session: InvestigationSession | null }) {
  const [format, setFormat] = useState<"json" | "csv" | "pdf" | "stix">("json");
  const [includeRaw, setIncludeRaw] = useState(true);
  const [includeAI, setIncludeAI] = useState(true);

  const exportData = async () => {
    if (!session) return;

    try {
      const data = await orchestrator.exportSession(session.id);

      // Filter based on options
      const exportPayload = {
        ...data,
        includeRawData: includeRaw,
        includeAIAnalysis: includeAI,
        exportFormat: format,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: format === "json" ? "application/json" : "text/plain"
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `investigation-${session.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Export failed");
    }
  };

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500">Select a session to export</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-zinc-200 mb-6">Export Investigation</h2>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-zinc-400 mb-3 block">Export Format</label>
          <div className="grid grid-cols-4 gap-3">
            {[
              { id: "json", label: "JSON", desc: "Complete data" },
              { id: "csv", label: "CSV", desc: "Spreadsheet" },
              { id: "pdf", label: "PDF", desc: "Report" },
              { id: "stix", label: "STIX2", desc: "Threat intel" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id as any)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  format === f.id
                    ? "border-accent bg-accent/10"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="font-medium text-zinc-300">{f.label}</div>
                <div className="text-xs text-zinc-500">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 mb-6">
          <label className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
            <div>
              <p className="font-medium text-zinc-300">Include raw data</p>
              <p className="text-xs text-zinc-500">Original tool outputs and API responses</p>
            </div>
            <input
              type="checkbox"
              checked={includeRaw}
              onChange={(e) => setIncludeRaw(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-accent"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer">
            <div>
              <p className="font-medium text-zinc-300">Include AI analysis</p>
              <p className="text-xs text-zinc-500">Generated insights and recommendations</p>
            </div>
            <input
              type="checkbox"
              checked={includeAI}
              onChange={(e) => setIncludeAI(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-accent"
            />
          </label>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 mb-6">
          <h4 className="font-medium text-zinc-300 mb-2">Export Summary</h4>
          <ul className="text-sm text-zinc-500 space-y-1">
            <li>• {session.entities?.length || 0} entities</li>
            <li>• {session.correlations?.length || 0} correlations</li>
            <li>• {session.tasks?.length || 0} tasks</li>
            <li>• Format: {format.toUpperCase()}</li>
          </ul>
        </div>

        {/* Export Button */}
        <button
          onClick={exportData}
          className="w-full py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export Investigation
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    running: "bg-accent/10 text-accent border-accent/20 animate-pulse",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    paused: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20"
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span className={`rounded-full border ${styles[status] || styles.pending} ${sizeClasses} font-medium capitalize`}>
      {status}
    </span>
  );
}

function NewInvestigationModal({
  data,
  onChange,
  onStart,
  onClose,
  isLoading
}: {
  data: any;
  onChange: (d: any) => void;
  onStart: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-lg p-6 rounded-2xl bg-zinc-900 border border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-zinc-200 mb-6">New Investigation</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-400 mb-1 block">Target</label>
            <input
              type="text"
              value={data.target}
              onChange={(e) => onChange({ ...data, target: e.target.value })}
              placeholder="Enter username, email, domain..."
              className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:border-accent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-400 mb-1 block">Type</label>
              <select
                value={data.targetType}
                onChange={(e) => onChange({ ...data, targetType: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 outline-none"
              >
                <option value="username">Username</option>
                <option value="email">Email</option>
                <option value="domain">Domain</option>
                <option value="ip">IP Address</option>
                <option value="phone">Phone</option>
                <option value="fullname">Full Name</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-400 mb-1 block">Depth</label>
              <select
                value={data.depth}
                onChange={(e) => onChange({ ...data, depth: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 outline-none"
              >
                <option value={2}>Shallow (2)</option>
                <option value={3}>Standard (3)</option>
                <option value={4}>Deep (4)</option>
                <option value={5}>Maximum (5)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-400 mb-1 block">Name (optional)</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              placeholder="Investigation name"
              className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-400 mb-1 block">OPSEC Level</label>
            <div className="grid grid-cols-3 gap-2">
              {["standard", "cautious", "paranoid"].map((level) => (
                <button
                  key={level}
                  onClick={() => onChange({ ...data, opsecLevel: level })}
                  className={`py-2 rounded-lg border text-sm capitalize transition-all ${
                    data.opsecLevel === level
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            disabled={!data.target || isLoading}
            className="flex-1 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Investigation
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
