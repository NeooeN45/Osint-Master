// ============================================================================
// Auto-Investigation Panel Simple - One-click magical investigation
// ============================================================================

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Search, 
  Loader2, 
  Globe, 
  Users, 
  MapPin, 
  Shield,
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  Brain,
  Network,
  Target,
  Clock,
  Zap,
  Activity
} from "lucide-react";

interface InvestigationStatus {
  investigationId: string;
  target: string;
  targetType: string;
  status: "running" | "completed" | "failed";
  progress: number;
  currentPhase: {
    name: string;
    description: string;
    progress: number;
  } | null;
  phases: Array<{
    name: string;
    description: string;
    status: string;
    progress: number;
  }>;
  stats: {
    entitiesFound: number;
    correlationsFound: number;
    toolsExecuted: number;
    geoLocationsFound: number;
  };
  elapsedTime: number;
}

interface InvestigationResult {
  summary: {
    totalEntities: number;
    totalCorrelations: number;
    riskScore: number;
    riskLevel: string;
    categories: Record<string, number>;
  };
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
    source: string;
  }>;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    severity?: string;
  }>;
  recommendations: string[];
}

const PHASE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  discovery: { icon: Search, color: "blue", label: "Découverte" },
  enrichment: { icon: Network, color: "purple", label: "Enrichissement" },
  deep_analysis: { icon: Brain, color: "green", label: "Analyse" },
  correlation: { icon: Globe, color: "orange", label: "Corrélation" },
  insights: { icon: Sparkles, color: "pink", label: "Insights" }
};

const ENTITY_COLORS: Record<string, string> = {
  username: "bg-violet-500",
  email: "bg-blue-500",
  phone: "bg-green-500",
  ip: "bg-orange-500",
  domain: "bg-red-500",
  url: "bg-cyan-500",
  location: "bg-lime-500",
  social: "bg-pink-500",
  crypto: "bg-amber-500",
  fullname: "bg-indigo-500"
};

export function AutoInvestigationPanelSimple() {
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState("auto");
  const [investigationId, setInvestigationId] = useState<string | null>(null);
  const [status, setStatus] = useState<InvestigationStatus | null>(null);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Start investigation
  const startInvestigation = async () => {
    if (!target) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch("/api/auto-investigation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          target, 
          targetType: targetType === "auto" ? undefined : targetType 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setInvestigationId(data.investigationId);
      } else {
        setError(data.error || "Failed to start investigation");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for status
  useEffect(() => {
    if (!investigationId || result) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auto-investigation/status/${investigationId}`);
        const data = await response.json();
        
        if (response.ok) {
          setStatus(data);
          
          if (data.status === "completed") {
            clearInterval(pollInterval);
            fetchResults();
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [investigationId, result]);

  // Fetch final results
  const fetchResults = async () => {
    if (!investigationId) return;
    
    try {
      const response = await fetch(`/api/auto-investigation/result/${investigationId}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      }
    } catch (err) {
      console.error("Failed to fetch results:", err);
    }
  };

  // Download report
  const downloadReport = async () => {
    if (!investigationId) return;
    
    try {
      const response = await fetch(`/api/auto-investigation/report/${investigationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "html" })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `investigation-${investigationId}.html`;
        a.click();
      }
    } catch (err) {
      console.error("Failed to download report:", err);
    }
  };

  // Reset
  const reset = () => {
    setInvestigationId(null);
    setStatus(null);
    setResult(null);
    setError(null);
    setTarget("");
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
          <Sparkles className="inline w-8 h-8 mr-2" />
          Investigation Magique
        </h1>
        <p className="text-zinc-400">
          Un seul clic → Investigation complète automatique
        </p>
      </div>

      {/* Input Section */}
      {!investigationId && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Entrez un email, username, domaine, IP..."
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                onKeyDown={(e) => e.key === "Enter" && startInvestigation()}
              />
            </div>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            >
              <option value="auto">🔍 Auto-détection</option>
              <option value="email">📧 Email</option>
              <option value="username">👤 Username</option>
              <option value="domain">🌐 Domaine</option>
              <option value="ip">🌐 IP</option>
              <option value="phone">📱 Téléphone</option>
            </select>
            <button
              onClick={startInvestigation}
              disabled={!target || isLoading}
              className="h-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Démarrage...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Lancer l'Investigation
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Progress Section */}
      {investigationId && !result && status && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-bold">Investigation en cours: {status.target}</h2>
                <p className="text-sm text-zinc-500">ID: {status.investigationId}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              status.status === "running" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
            }`}>
              {status.status === "running" ? "🔄 En cours" : "✅ Terminé"}
            </span>
          </div>

          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-zinc-400">Progression Globale</span>
              <span className="text-sm font-bold text-purple-400">{status.progress}%</span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>

          {/* Current Phase */}
          {status.currentPhase && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="font-semibold text-blue-300">
                  Phase en cours: {status.currentPhase.description}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${status.currentPhase.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Users} label="Entités" value={status.stats.entitiesFound} color="blue" />
            <StatCard icon={Network} label="Corrélations" value={status.stats.correlationsFound} color="purple" />
            <StatCard icon={MapPin} label="Localisations" value={status.stats.geoLocationsFound} color="green" />
            <StatCard icon={Zap} label="Outils" value={status.stats.toolsExecuted} color="orange" />
          </div>

          {/* Phases */}
          <div className="space-y-2">
            {status.phases.map((phase) => {
              const config = PHASE_CONFIG[phase.name] || { icon: Sparkles, color: "gray", label: phase.name };
              const Icon = config.icon;
              return (
                <div
                  key={phase.name}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    phase.status === "running" ? "bg-blue-500/10 border border-blue-500/20" :
                    phase.status === "completed" ? "bg-green-500/10" :
                    phase.status === "failed" ? "bg-red-500/10" :
                    "bg-zinc-800/50"
                  }`}
                >
                  <div className={`text-${config.color}-400`}>
                    {phase.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : phase.status === "running" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-sm text-zinc-500">{phase.progress}%</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full mt-1">
                      <div 
                        className={`h-full bg-${config.color}-500 rounded-full transition-all`}
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Elapsed Time */}
          <div className="mt-4 text-center text-sm text-zinc-500">
            <Clock className="inline w-4 h-4 mr-1" />
            Temps écoulé: {formatTime(status.elapsedTime)}
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Success Header */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <div>
              <span className="text-green-400 font-medium">Investigation terminée !</span>
              <span className="text-zinc-400 ml-2">{result.summary.totalEntities} entités découvertes</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard title="Entités" value={result.summary.totalEntities} subtitle="Découvertes" color="blue" />
            <SummaryCard title="Corrélations" value={result.summary.totalCorrelations} subtitle="Liens" color="purple" />
            <SummaryCard 
              title="Score Risque" 
              value={result.summary.riskScore} 
              subtitle={`/100 - ${result.summary.riskLevel}`}
              color={result.summary.riskLevel === "low" ? "green" : result.summary.riskLevel === "medium" ? "yellow" : "red"}
            />
            <SummaryCard title="Catégories" value={Object.keys(result.summary.categories).length} subtitle="Types" color="orange" />
          </div>

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-purple-400" />
                Insights Intelligents
              </h3>
              <div className="space-y-3">
                {result.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.severity === "critical" ? "bg-red-500/10 border-red-500" :
                      insight.severity === "high" ? "bg-orange-500/10 border-orange-500" :
                      insight.type === "discovery" ? "bg-blue-500/10 border-blue-500" :
                      insight.type === "pattern" ? "bg-purple-500/10 border-purple-500" :
                      "bg-green-500/10 border-green-500"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{insight.title}</h4>
                        <p className="text-sm text-zinc-400 mt-1">{insight.description}</p>
                      </div>
                      <span className="text-xs bg-zinc-800 px-2 py-1 rounded">
                        {insight.confidence}% confiance
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-400" />
              Entités Découvertes ({result.entities.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.entities.slice(0, 30).map((entity, idx) => (
                <span
                  key={idx}
                  className={`${ENTITY_COLORS[entity.type] || "bg-gray-500"} text-white px-3 py-1 rounded-full text-sm`}
                >
                  {entity.type}: {entity.value.substring(0, 25)}
                  {entity.value.length > 25 ? "..." : ""}
                  <span className="ml-2 opacity-75">({entity.confidence}%)</span>
                </span>
              ))}
              {result.entities.length > 30 && (
                <span className="bg-zinc-700 text-zinc-300 px-3 py-1 rounded-full text-sm">
                  +{result.entities.length - 30} autres...
                </span>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-400" />
                Recommandations
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-zinc-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={downloadReport}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Télécharger le Rapport
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Nouvelle Investigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }: { 
  icon: any;
  label: string; 
  value: number;
  color: string;
}) {
  return (
    <div className={`p-4 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
      <div className={`flex items-center gap-2 text-${color}-400 mb-1`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold text-${color}-300`}>{value}</div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ title, value, subtitle, color }: {
  title: string;
  value: number;
  subtitle: string;
  color: string;
}) {
  const gradients: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    red: "from-red-500 to-red-600",
    orange: "from-orange-500 to-orange-600"
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
      <div className={`text-3xl font-bold bg-gradient-to-r ${gradients[color]} bg-clip-text text-transparent`}>
        {value}
      </div>
      <div className="text-sm font-medium text-zinc-300 mt-1">{title}</div>
      <div className="text-xs text-zinc-500">{subtitle}</div>
    </div>
  );
}

export default AutoInvestigationPanelSimple;
