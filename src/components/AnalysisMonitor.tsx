// ============================================================================
// Analysis Monitor - Real-time progress visualization with beautiful UI
// ============================================================================

import { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Globe, 
  Mail, 
  User, 
  Server,
  Shield,
  AlertTriangle,
  Clock,
  Zap,
  Database,
  FileSearch,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProgressEvent {
  type: "start" | "progress" | "find" | "complete" | "error";
  toolId: string;
  target: string;
  message: string;
  progress: number;
  details?: {
    currentStep?: string;
    totalSteps?: number;
    currentStepNumber?: number;
    itemsFound?: number;
    currentItem?: string;
    eta?: number;
    toolResults?: number;
    duration?: number;
  };
  timestamp: string;
  data?: any;
}

interface AnalysisMonitorProps {
  sessionId: string;
  streamUrl: string;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
}

export function AnalysisMonitor({ sessionId, streamUrl, onComplete, onError }: AnalysisMonitorProps) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<"running" | "completed" | "error">("running");
  const [progress, setProgress] = useState(0);
  const [itemsFound, setItemsFound] = useState(0);
  const [currentTool, setCurrentTool] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Elapsed time timer
  useEffect(() => {
    if (status === "running") {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // SSE Connection
  useEffect(() => {
    const fullUrl = streamUrl.startsWith("http") ? streamUrl : `http://localhost:3002${streamUrl}`;
    
    console.log(`[AnalysisMonitor] Connecting to ${fullUrl}`);
    
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[AnalysisMonitor] SSE Connected");
      setIsConnected(true);
      addLog("🔗 Connected to analysis stream");
    };

    eventSource.onerror = (error) => {
      console.error("[AnalysisMonitor] SSE Error:", error);
      setIsConnected(false);
      addLog("❌ Connection error - retrying...");
    };

    eventSource.addEventListener("connected", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      addLog(`✅ Session ${data.sessionId} ready`);
    });

    eventSource.addEventListener("start", (e: MessageEvent) => {
      const data: ProgressEvent = JSON.parse(e.data);
      setEvents(prev => [...prev, data]);
      setProgress(data.progress);
      addLog(`🚀 ${data.message}`);
    });

    eventSource.addEventListener("progress", (e: MessageEvent) => {
      const data: ProgressEvent = JSON.parse(e.data);
      setEvents(prev => [...prev, data]);
      setProgress(data.progress);
      setCurrentTool(data.toolId);
      
      if (data.details?.currentStep) {
        addLog(`⏳ ${data.details.currentStep} (${data.progress}%)`);
      }
      
      if (data.details?.itemsFound && data.details.itemsFound > itemsFound) {
        setItemsFound(data.details.itemsFound);
      }
    });

    eventSource.addEventListener("find", (e: MessageEvent) => {
      const data: ProgressEvent = JSON.parse(e.data);
      setEvents(prev => [...prev, data]);
      setItemsFound(prev => prev + 1);
      
      if (data.data) {
        const { type, value, confidence } = data.data;
        addLog(`🔍 Found [${type}] ${value} (conf: ${confidence})`);
      }
    });

    eventSource.addEventListener("complete", (e: MessageEvent) => {
      const data: ProgressEvent = JSON.parse(e.data);
      setEvents(prev => [...prev, data]);
      setStatus("completed");
      setProgress(100);
      setIsConnected(false);
      addLog(`🎉 ${data.message}`);
      eventSource.close();
      onComplete?.(data.data);
    });

    eventSource.addEventListener("error", (e: MessageEvent) => {
      const data: ProgressEvent = JSON.parse(e.data);
      setEvents(prev => [...prev, data]);
      setStatus("error");
      setIsConnected(false);
      addLog(`❌ Error: ${data.message}`);
      eventSource.close();
      onError?.(data.message);
    });

    return () => {
      eventSource.close();
    };
  }, [sessionId, streamUrl]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-100), `[${timestamp}] ${message}`]); // Keep last 100 logs
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case "error":
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
    }
  };

  const getToolIcon = (toolId: string) => {
    if (toolId.includes("sherlock") || toolId.includes("maigret")) return <User className="w-4 h-4" />;
    if (toolId.includes("holehe") || toolId.includes("h8mail")) return <Mail className="w-4 h-4" />;
    if (toolId.includes("subfinder") || toolId.includes("dns")) return <Server className="w-4 h-4" />;
    if (toolId.includes("shodan") || toolId.includes("censys")) return <Shield className="w-4 h-4" />;
    if (toolId.includes("nuclei") || toolId.includes("scan")) return <AlertTriangle className="w-4 h-4" />;
    return <Search className="w-4 h-4" />;
  };

  const recentFinds = events
    .filter(e => e.type === "find")
    .slice(-10)
    .reverse();

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 mb-4 shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Analysis in Progress
              </h2>
              <p className="text-slate-400 text-sm">
                Session: <code className="bg-slate-700 px-2 py-0.5 rounded">{sessionId}</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-sm text-slate-400">
              {isConnected ? "Live" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300">Progress</span>
            <span className="text-blue-400 font-mono">{progress}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard 
            icon={<Clock className="w-4 h-4" />} 
            label="Elapsed" 
            value={formatTime(elapsedTime)} 
            color="blue"
          />
          <StatCard 
            icon={<Database className="w-4 h-4" />} 
            label="Items Found" 
            value={itemsFound.toString()} 
            color="green"
          />
          <StatCard 
            icon={<Zap className="w-4 h-4" />} 
            label="Current Tool" 
            value={currentTool || "Starting..."} 
            color="purple"
          />
          <StatCard 
            icon={<FileSearch className="w-4 h-4" />} 
            label="Events" 
            value={events.length.toString()} 
            color="orange"
          />
        </div>
      </div>

      {/* Recent Finds */}
      <AnimatePresence>
        {recentFinds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-700"
          >
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-green-400" />
              Recent Discoveries
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentFinds.map((find, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg"
                >
                  {getToolIcon(find.toolId)}
                  <span className="text-slate-300 text-sm flex-1">{find.message}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(find.timestamp).toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Logs */}
      <div className="bg-black rounded-xl p-4 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          Live Logs
          <span className="ml-auto text-xs bg-slate-800 px-2 py-1 rounded text-slate-500">
            {logs.length} entries
          </span>
        </h3>
        <div className="h-64 overflow-y-auto font-mono text-xs space-y-1 bg-slate-950/50 rounded-lg p-3">
          {logs.map((log, idx) => (
            <div 
              key={idx} 
              className={`${
                log.includes("❌") ? "text-red-400" :
                log.includes("✅") || log.includes("🎉") ? "text-green-400" :
                log.includes("🔍") ? "text-yellow-400" :
                log.includes("🔗") ? "text-blue-400" :
                "text-slate-400"
              }`}
            >
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs opacity-70">{label}</span>
      </div>
      <div className="text-lg font-bold truncate">{value}</div>
    </div>
  );
}

export default AnalysisMonitor;
