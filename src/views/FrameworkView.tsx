import { useState, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Globe,
  Mail,
  Phone,
  Image,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  FileText,
  Search,
  Layers,
  Target,
  Zap,
} from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";
import { runOrchestratedPipeline, verifyUrlExists, EXTERNAL_TOOLS } from "../lib/externalTools";
import type { PipelineConfig, PipelineResult, PipelineStep, ExternalTool } from "../types/external";

const INPUT_TYPES = [
  { id: "username", label: "Username", icon: User, placeholder: "ex: johndoe" },
  { id: "email", label: "Email", icon: Mail, placeholder: "ex: john@example.com" },
  { id: "phone", label: "Téléphone", icon: Phone, placeholder: "ex: +33612345678" },
  { id: "image_url", label: "Image URL", icon: Image, placeholder: "https://..." },
  { id: "domain", label: "Domaine", icon: Globe, placeholder: "ex: example.com" },
] as const;

const TOOL_CATEGORIES = [
  { id: "social", label: "Réseaux Sociaux", icon: Globe, color: "blue" },
  { id: "email", label: "Emails", icon: Mail, color: "green" },
  { id: "phone", label: "Téléphones", icon: Phone, color: "yellow" },
  { id: "image", label: "Images", icon: Image, color: "purple" },
  { id: "framework", label: "Frameworks", icon: Layers, color: "cyan" },
] as const;

export default function FrameworkView() {
  const [inputType, setInputType] = useState<string>("username");
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<PipelineStep | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showToolDetails, setShowToolDetails] = useState<ExternalTool | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { getApiKey, getActiveCase, addEntity } = useCaseStore();
  const activeCase = getActiveCase();
  
  const apiKeys = {
    hunter: getApiKey("hunter"),
    clearbit: getApiKey("clearbit"),
    numverify: getApiKey("numverify"),
    twilio: getApiKey("twilio"),
    tineye: getApiKey("tineye"),
    geospy: getApiKey("geospy"),
    truecaller: getApiKey("truecaller"),
    fotoforensics: getApiKey("fotoforensics"),
    maltego: getApiKey("maltego"),
  };

  const handleStartPipeline = async () => {
    if (!input.trim() || !activeCase) return;
    
    setIsRunning(true);
    setProgress(0);
    setResult(null);
    
    const config: PipelineConfig = {
      inputType: inputType as PipelineConfig["inputType"],
      input: input.trim(),
      enableSocial: ["username", "email"].includes(inputType),
      enableEmail: inputType === "email",
      enablePhone: inputType === "phone",
      enableImage: ["image_url", "image_file"].includes(inputType),
      enableBreach: inputType === "email",
      verifyResults: true,
      parallel: true,
      maxConcurrency: 3,
    };
    
    try {
      const pipelineResult = await runOrchestratedPipeline(
        config,
        apiKeys,
        (prog, step) => {
          setProgress(prog);
          setCurrentStep(step);
        }
      );
      
      setResult(pipelineResult);
      
      // Add discovered entities to case
      if (pipelineResult.socialResult) {
        pipelineResult.socialResult.platforms
          .filter(p => p.exists)
          .forEach(p => {
            addEntity({
              type: "social",
              value: `${p.platform}: ${p.username}`,
              metadata: { url: p.url, ...p.profileData },
              tags: ["framework", "social_scan"],
              confidence: p.confidence,
              source: "maigret",
            });
          });
      }
      
    } catch (error) {
      console.error("Pipeline error:", error);
    }
    
    setIsRunning(false);
    setCurrentStep(null);
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepStatusIcon = (status: PipelineStep["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "running": return <Loader2 className="w-5 h-5 text-accent-cyan animate-spin" />;
      case "failed": return <X className="w-5 h-5 text-red-400" />;
      case "pending": return <Clock className="w-5 h-5 text-slate-500" />;
      case "skipped": return <ChevronRight className="w-5 h-5 text-slate-500" />;
      default: return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const filteredTools = selectedCategory
    ? EXTERNAL_TOOLS.filter(t => t.category === selectedCategory)
    : EXTERNAL_TOOLS;

  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        <div className="text-center">
          <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Aucun dossier actif</p>
          <p className="text-sm text-slate-500 mt-2">Créez un dossier pour utiliser le Framework OSINT</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">OSINT Framework</h1>
            <p className="text-xs text-slate-500">Pipeline orchestré multi-sources</p>
          </div>
        </div>

        {/* Input Section */}
        <div className="flex flex-col gap-3">
          {/* Input Type Selector */}
          <div className="flex gap-2">
            {INPUT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setInputType(type.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    inputType === type.id
                      ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                      : "bg-surface-2 text-slate-400 border border-border hover:border-accent-cyan/30"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* Input Field */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              {inputType === "image_file" ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-slate-400 cursor-pointer hover:border-accent-cyan/50 transition-colors flex items-center gap-2"
                >
                  <Image className="w-4 h-4" />
                  Cliquez pour uploader une image
                </div>
              ) : (
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={INPUT_TYPES.find(t => t.id === inputType)?.placeholder}
                  className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan transition-colors"
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setInput(file.name);
                }}
              />
            </div>

            <button
              onClick={handleStartPipeline}
              disabled={!input.trim() || isRunning}
              className="flex items-center gap-2 px-6 py-3 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-sm font-medium hover:bg-accent-cyan/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {progress}%</>
              ) : (
                <><Play className="w-4 h-4" /> Lancer</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tools Sidebar */}
        <div className="w-72 border-r border-border bg-surface-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-cyan" />
              Arsenal OSINT
            </h3>

            {/* Category Filter */}
            <div className="space-y-1 mb-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  !selectedCategory ? "bg-accent-cyan/10 text-accent-cyan" : "text-slate-400 hover:bg-surface-2"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Tous les outils ({EXTERNAL_TOOLS.length})
              </button>
              {TOOL_CATEGORIES.map((cat) => {
                const count = EXTERNAL_TOOLS.filter(t => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                      selectedCategory === cat.id ? "bg-accent-cyan/10 text-accent-cyan" : "text-slate-400 hover:bg-surface-2"
                    }`}
                  >
                    <cat.icon className={`w-3.5 h-3.5 text-${cat.color}-400`} />
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Tool List */}
            <div className="space-y-2">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => setShowToolDetails(tool)}
                  className="p-3 bg-surface-2 rounded-lg border border-border hover:border-accent-cyan/30 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate group-hover:text-accent-cyan transition-colors">
                        {tool.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                        {tool.description}
                      </p>
                    </div>
                    {tool.requiresApiKey && (
                      <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {tool.githubUrl && (
                      <a
                        href={tool.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" /> GitHub
                      </a>
                    )}
                    {tool.webUrl && (
                      <a
                        href={tool.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Web
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result && !isRunning ? (
            <div className="h-full flex items-center justify-center text-slate-600">
              <div className="text-center">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Prêt à analyser</p>
                <p className="text-sm text-slate-500 mt-2 max-w-md">
                  Sélectionnez un type d'input, entrez votre cible et lancez le pipeline. 
                  Le Framework orchestrera automatiquement les outils OSINT appropriés.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Progress Overview */}
              {isRunning && (
                <div className="bg-surface-2 border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />
                      Analyse en cours
                    </h3>
                    <span className="text-2xl font-bold text-accent-cyan">{progress}%</span>
                  </div>
                  <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-cyan transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {currentStep && (
                    <p className="text-xs text-slate-500 mt-2">
                      Étape active: <span className="text-accent-cyan">{currentStep.name}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Pipeline Steps */}
              {result?.steps && result.steps.length > 0 && (
                <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent-purple" />
                      Pipeline d'analyse ({result.steps.length} étapes)
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {result.steps.map((step, index) => (
                      <div key={step.id} className="p-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => toggleStepExpansion(step.id)}
                        >
                          <span className="text-xs text-slate-500 w-6">{index + 1}</span>
                          {getStepStatusIcon(step.status)}
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">{step.name}</h4>
                            <p className="text-xs text-slate-500">{step.tool}</p>
                          </div>
                          {step.duration && (
                            <span className="text-xs text-slate-500">
                              {Math.round(step.duration / 1000)}s
                            </span>
                          )}
                          <ChevronDown
                            className={`w-4 h-4 text-slate-500 transition-transform ${
                              expandedSteps.has(step.id) ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                        
                        {expandedSteps.has(step.id) && step.result ? (
                          <div className="mt-3 pl-12">
                            <pre className="bg-surface-0 p-3 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto max-h-48 overflow-y-auto">
                              {JSON.stringify(step.result, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                        
                        {step.error && (
                          <div className="mt-2 pl-12">
                            <p className="text-xs text-red-400">{step.error}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Results */}
              {result?.socialResult && (
                <div className="bg-surface-2 border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Résultats Réseaux Sociaux ({result.socialResult.totalFound} trouvés)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {result.socialResult.platforms
                      .filter(p => p.exists)
                      .map((platform) => (
                        <div
                          key={platform.platform}
                          className="bg-surface-3 rounded-lg p-3 border border-border hover:border-blue-400/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-white">{platform.platform}</h4>
                            <span className="text-xs px-2 py-0.5 bg-blue-400/10 text-blue-400 rounded">
                              {platform.confidence}%
                            </span>
                          </div>
                          <a
                            href={platform.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline mt-1 block truncate"
                          >
                            @{platform.username}
                          </a>
                          {platform.profileData && (
                            <div className="mt-2 text-[10px] text-slate-500">
                              {platform.profileData.followers !== undefined && (
                                <span>{platform.profileData.followers.toLocaleString()} followers • </span>
                              )}
                              {platform.profileData.posts !== undefined && (
                                <span>{platform.profileData.posts} posts</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Summary & Confidence */}
              {result && (
                <div className="bg-surface-2 border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Score de confiance global</h3>
                      <p className="text-xs text-slate-500">
                        Basé sur {result.steps.filter(s => s.status === "completed").length}/{result.steps.length} sources vérifiées
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-3xl font-bold ${
                          result.confidence >= 80
                            ? "text-green-400"
                            : result.confidence >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {result.confidence}%
                      </div>
                      <div className="text-xs text-slate-500">
                        {result.duration ? `${Math.round(result.duration / 1000)}s` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tool Details Modal */}
      {showToolDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-2 border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{showToolDetails.name}</h3>
                  <span className="text-xs text-accent-cyan uppercase">{showToolDetails.category}</span>
                </div>
                <button
                  onClick={() => setShowToolDetails(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-300">{showToolDetails.description}</p>
              
              {showToolDetails.features.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white mb-2">Fonctionnalités</h4>
                  <div className="flex flex-wrap gap-2">
                    {showToolDetails.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-[10px] px-2 py-1 bg-surface-3 text-slate-400 rounded"
                      >
                        {feature.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {showToolDetails.platforms && showToolDetails.platforms.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white mb-2">Plateformes</h4>
                  <div className="flex flex-wrap gap-2">
                    {showToolDetails.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="text-[10px] px-2 py-1 bg-surface-3 text-slate-400 rounded"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                {showToolDetails.webUrl && (
                  <a
                    href={showToolDetails.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-sm hover:bg-accent-cyan/20 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" /> Site Web
                  </a>
                )}
                {showToolDetails.githubUrl && (
                  <a
                    href={showToolDetails.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 border border-border text-slate-400 rounded-lg text-sm hover:text-white transition-all"
                  >
                    <Globe className="w-4 h-4" /> GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
