// ============================================================================
// Auto-Investigation Panel - One-click magical investigation UI
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  graph: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      value: string;
      confidence: number;
      color: string;
      size: number;
    }>;
    links: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }>;
  };
  insights: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    severity?: string;
  }>;
  recommendations: string[];
}

const PHASE_NAMES: Record<string, { icon: React.ReactNode; color: string }> = {
  discovery: { icon: <Search className="w-4 h-4" />, color: "blue" },
  enrichment: { icon: <Network className="w-4 h-4" />, color: "purple" },
  deep_analysis: { icon: <Brain className="w-4 h-4" />, color: "green" },
  correlation: { icon: <Globe className="w-4 h-4" />, color: "orange" },
  insights: { icon: <Sparkles className="w-4 h-4" />, color: "pink" }
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

export function AutoInvestigationPanel() {
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
          
          // If completed, fetch results
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

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          <Sparkles className="inline w-8 h-8 mr-2" />
          Investigation Magique
        </h1>
        <p className="text-gray-600">
          Un seul clic → Investigation complète automatique
        </p>
      </div>

      {/* Input Section */}
      {!investigationId && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Entrez un email, username, domaine, IP..."
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="h-12 text-lg"
                  onKeyDown={(e) => e.key === "Enter" && startInvestigation()}
                />
              </div>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="h-12 px-4 rounded-md border border-gray-200"
              >
                <option value="auto">🔍 Auto-détection</option>
                <option value="email">📧 Email</option>
                <option value="username">👤 Username</option>
                <option value="domain">🌐 Domaine</option>
                <option value="ip">🌐 IP</option>
                <option value="phone">📱 Téléphone</option>
              </select>
              <Button
                onClick={startInvestigation}
                disabled={!target || isLoading}
                className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Démarrage...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Lancer l'Investigation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress Section */}
      {investigationId && !result && status && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6 border-2 border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Investigation en cours: {status.target}
                </span>
                <Badge variant={status.status === "running" ? "default" : "secondary"}>
                  {status.status === "running" ? "🔄 En cours" : "✅ Terminé"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Overall Progress */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Progression Globale</span>
                  <span className="text-sm font-bold">{status.progress}%</span>
                </div>
                <Progress value={status.progress} className="h-3" />
              </div>

              {/* Current Phase */}
              {status.currentPhase && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="font-semibold text-blue-900">
                      Phase en cours: {status.currentPhase.description}
                    </span>
                  </div>
                  <Progress value={status.currentPhase.progress} className="h-2" />
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={<Users className="w-5 h-5" />}
                  label="Entités"
                  value={status.stats.entitiesFound}
                  color="blue"
                />
                <StatCard
                  icon={<Network className="w-5 h-5" />}
                  label="Corrélations"
                  value={status.stats.correlationsFound}
                  color="purple"
                />
                <StatCard
                  icon={<Globe className="w-5 h-5" />}
                  label="Localisations"
                  value={status.stats.geoLocationsFound}
                  color="green"
                />
                <StatCard
                  icon={<Search className="w-5 h-5" />}
                  label="Outils"
                  value={status.stats.toolsExecuted}
                  color="orange"
                />
              </div>

              {/* Phases */}
              <div className="space-y-2">
                {status.phases.map((phase) => {
                  const phaseInfo = PHASE_NAMES[phase.name] || { icon: <Sparkles />, color: "gray" };
                  return (
                    <div
                      key={phase.name}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        phase.status === "running" ? "bg-blue-50 border border-blue-200" :
                        phase.status === "completed" ? "bg-green-50" :
                        phase.status === "failed" ? "bg-red-50" :
                        "bg-gray-50"
                      }`}
                    >
                      <div className={`text-${phaseInfo.color}-600`}>
                        {phase.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : phase.status === "running" ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          phaseInfo.icon
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{phase.description}</span>
                          <span className="text-sm text-gray-500">{phase.progress}%</span>
                        </div>
                        <Progress value={phase.progress} className="h-1 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Elapsed Time */}
              <div className="mt-4 text-center text-sm text-gray-500">
                ⏱️ Temps écoulé: {Math.floor(status.elapsedTime / 60)}m {status.elapsedTime % 60}s
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Results Section */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          {/* Success Header */}
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-800">
              Investigation terminée ! {result.summary.totalEntities} entités découvertes.
            </AlertDescription>
          </Alert>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              title="Entités"
              value={result.summary.totalEntities}
              subtitle="Découvertes"
              color="blue"
            />
            <SummaryCard
              title="Corrélations"
              value={result.summary.totalCorrelations}
              subtitle="Liens identifiés"
              color="purple"
            />
            <SummaryCard
              title="Score Risque"
              value={result.summary.riskScore}
              subtitle={`/100 - ${result.summary.riskLevel}`}
              color={result.summary.riskLevel === "low" ? "green" : result.summary.riskLevel === "medium" ? "yellow" : "red"}
            />
            <SummaryCard
              title="Catégories"
              value={Object.keys(result.summary.categories).length}
              subtitle="Types d'entités"
              color="orange"
            />
          </div>

          {/* Insights */}
          {result.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Insights Intelligents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.insights.map((insight, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-lg border-l-4 ${
                        insight.severity === "critical" ? "bg-red-50 border-red-500" :
                        insight.severity === "high" ? "bg-orange-50 border-orange-500" :
                        insight.type === "discovery" ? "bg-blue-50 border-blue-500" :
                        insight.type === "pattern" ? "bg-purple-50 border-purple-500" :
                        "bg-green-50 border-green-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{insight.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        </div>
                        <Badge variant="outline">
                          {insight.confidence}% confiance
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entities Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Entités Découvertes ({result.entities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.entities.slice(0, 20).map((entity, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Badge
                      className={`${ENTITY_COLORS[entity.type] || "bg-gray-500"} text-white px-3 py-1`}
                    >
                      {entity.type}: {entity.value.substring(0, 30)}
                      {entity.value.length > 30 ? "..." : ""}
                      <span className="ml-2 opacity-75">({entity.confidence}%)</span>
                    </Badge>
                  </motion.div>
                ))}
                {result.entities.length > 20 && (
                  <Badge variant="outline">
                    +{result.entities.length - 20} autres...
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Graph Preview */}
          {result.graph.nodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Graphe de Relations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {result.graph.nodes.length}
                      </div>
                      <div className="text-sm text-gray-600">Nœuds</div>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {result.graph.links.length}
                      </div>
                      <div className="text-sm text-gray-600">Connexions</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Réseau complexe identifié avec {result.graph.links.length} corrélations 
                    entre {result.graph.nodes.length} entités.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Recommandations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Button onClick={downloadReport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Télécharger le Rapport
            </Button>
            <Button onClick={reset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Nouvelle Investigation
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  color: string;
}) {
  return (
    <div className={`p-3 rounded-lg bg-${color}-50 border border-${color}-200`}>
      <div className={`flex items-center gap-2 text-${color}-600 mb-1`}>
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold text-${color}-700`}>{value}</div>
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
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    red: "from-red-500 to-red-600",
    orange: "from-orange-500 to-orange-600"
  };

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className={`text-3xl font-bold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
          {value}
        </div>
        <div className="text-sm font-medium text-gray-900 mt-1">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

export default AutoInvestigationPanel;
