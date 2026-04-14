import { useState } from "react";
import { 
  UserSearch, Play, Loader2, Trash2, Download, 
  Globe, Phone, Mail, MapPin, AlertTriangle,
  CheckCircle, X, Shield, Clock, Users
} from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";
import { runAutomatedProfiling } from "../lib/profiling";
import type { GeneratedProfile } from "../types";

const TARGET_TYPES = [
  { value: "person", label: "Personne", icon: Users },
  { value: "company", label: "Entreprise", icon: Globe },
  { value: "phone", label: "Téléphone", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "username", label: "Username", icon: UserSearch },
] as const;

export default function ProfilingView() {
  const [query, setQuery] = useState("");
  const [targetType, setTargetType] = useState<typeof TARGET_TYPES[number]["value"]>("person");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<GeneratedProfile | null>(null);
  const [progress, setProgress] = useState(0);
  
  const { 
    getActiveCase, 
    addProfile, 
    deleteProfile,
    getApiKey 
  } = useCaseStore();
  
  const activeCase = getActiveCase();
  const apiKeys = {
    openrouter: getApiKey("openrouter"),
    shodan: getApiKey("shodan"),
    hibp: getApiKey("hibp"),
  };
  
  const handleStartProfiling = async () => {
    if (!activeCase || !query.trim()) return;
    
    setIsRunning(true);
    setProgress(0);
    
    // Create initial profile
    const profileId = addProfile({
      targetQuery: query.trim(),
      targetType,
      createdAt: new Date().toISOString(),
      status: "running",
      progress: 0,
      dataSources: [],
      socialAccounts: [],
      phonePatterns: [],
      digitalFootprint: {
        emails: [],
        phones: [],
        usernames: [],
        domains: [],
        ips: [],
        locations: [],
        relatedPersons: [],
        timeline: [],
      },
      aiSummary: "Analyse en cours...",
      riskScore: 0,
      confidence: 0,
    });
    
    try {
      // Run profiling
      const result = await runAutomatedProfiling(
        query.trim(),
        targetType,
        apiKeys,
        setProgress
      );
      
      // Update profile with results
      const profile = activeCase.profiles.find(p => p.id === profileId);
      if (profile) {
        const updatedProfile = { ...profile, ...result, status: "completed" as const };
        useCaseStore.getState().updateProfile(profileId, updatedProfile);
        setSelectedProfile(updatedProfile);
      }
    } catch (error) {
      console.error("Profiling error:", error);
      const profile = activeCase.profiles.find(p => p.id === profileId);
      if (profile) {
        useCaseStore.getState().updateProfile(profileId, {
          ...profile,
          status: "failed",
          aiSummary: `Erreur: ${error}`,
        });
      }
    }
    
    setIsRunning(false);
    setProgress(100);
  };
  
  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce profil ?")) {
      deleteProfile(id);
      if (selectedProfile?.id === id) setSelectedProfile(null);
    }
  };
  
  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        <div className="text-center">
          <UserSearch className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Aucun dossier actif</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-1">
        <div className="flex items-center gap-2 mb-3">
          <UserSearch className="w-5 h-5 text-accent-cyan" />
          <span className="text-sm font-semibold text-white">Profilage OSINT Automatisé</span>
          <span className="text-xs text-slate-500 font-mono">
            {activeCase.profiles.length} profils
          </span>
        </div>
        
        {/* Query input */}
        <div className="flex gap-2">
          <div className="flex gap-1">
            {TARGET_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setTargetType(type.value)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-colors ${
                    targetType === type.value
                      ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                      : "bg-surface-2 text-slate-400 border border-border hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {type.label}
                </button>
              );
            })}
          </div>
          
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Entrez un ${TARGET_TYPES.find(t => t.value === targetType)?.label.toLowerCase()}...`}
            className="flex-1 px-3 py-2 bg-surface-2 border border-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
          />
          
          <button
            onClick={handleStartProfiling}
            disabled={!query.trim() || isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-sm hover:bg-accent-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {progress.toFixed(0)}%</>
            ) : (
              <><Play className="w-4 h-4" /> Lancer</>
            )}
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Profiles list */}
        <div className="w-80 border-r border-border bg-surface-1 overflow-y-auto p-3 space-y-2">
          {activeCase.profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedProfile?.id === profile.id 
                  ? "border-accent-cyan bg-accent-cyan/10" 
                  : "border-border hover:border-accent-cyan/50 bg-surface-2"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {profile.status === "running" && <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />}
                  {profile.status === "completed" && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {profile.status === "failed" && <X className="w-4 h-4 text-red-400" />}
                  <div>
                    <p className="text-sm text-white font-medium truncate">{profile.targetQuery}</p>
                    <p className="text-[10px] text-slate-500">
                      {TARGET_TYPES.find(t => t.value === profile.targetType)?.label} • 
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(profile.id); }}
                  className="p-1 text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {profile.status === "completed" && (
                <div className="mt-2 flex items-center gap-3 text-[10px]">
                  <span className="text-accent-cyan">
                    {profile.socialAccounts.length} comptes
                  </span>
                  <span className="text-accent-purple">
                    {profile.confidence}% confiance
                  </span>
                  <span className={profile.riskScore > 50 ? "text-red-400" : "text-green-400"}>
                    Risque: {profile.riskScore}/100
                  </span>
                </div>
              )}
              
              {profile.status === "running" && (
                <div className="mt-2">
                  <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-cyan transition-all"
                      style={{ width: `${profile.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Profile detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedProfile ? (
            <div className="space-y-6 max-w-4xl">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedProfile.targetQuery}</h2>
                  <p className="text-sm text-slate-500">
                    {TARGET_TYPES.find(t => t.value === selectedProfile.targetType)?.label} • 
                    Profil généré le {new Date(selectedProfile.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      selectedProfile.riskScore > 70 ? "text-red-400" : 
                      selectedProfile.riskScore > 40 ? "text-yellow-400" : "text-green-400"
                    }`}>
                      {selectedProfile.riskScore}
                    </div>
                    <div className="text-[10px] text-slate-500">RISQUE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent-cyan">
                      {selectedProfile.confidence}%
                    </div>
                    <div className="text-[10px] text-slate-500">CONFIANCE</div>
                  </div>
                </div>
              </div>
              
              {/* AI Summary */}
              {selectedProfile.aiSummary && (
                <div className="bg-surface-2 border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-accent-cyan" /> Résumé IA
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedProfile.aiSummary}
                  </p>
                </div>
              )}
              
              {/* Social Accounts */}
              {selectedProfile.socialAccounts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-accent-purple" /> 
                    Comptes sociaux ({selectedProfile.socialAccounts.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProfile.socialAccounts.map((account, i) => (
                      <div key={i} className="bg-surface-2 border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{account.platform}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-accent-cyan/10 text-accent-cyan rounded">
                            {account.confidence}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">@{account.username}</p>
                        <a 
                          href={account.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-accent-cyan hover:underline mt-2 inline-block"
                        >
                          Voir le profil →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Digital Footprint */}
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-accent-green" /> Empreinte digitale
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-2 border border-border rounded-lg p-3">
                    <div className="text-lg font-bold text-accent-cyan">
                      {selectedProfile.digitalFootprint.emails.length}
                    </div>
                    <div className="text-[10px] text-slate-500">Emails</div>
                  </div>
                  <div className="bg-surface-2 border border-border rounded-lg p-3">
                    <div className="text-lg font-bold text-accent-purple">
                      {selectedProfile.digitalFootprint.phones.length}
                    </div>
                    <div className="text-[10px] text-slate-500">Téléphones</div>
                  </div>
                  <div className="bg-surface-2 border border-border rounded-lg p-3">
                    <div className="text-lg font-bold text-accent-green">
                      {selectedProfile.digitalFootprint.domains.length}
                    </div>
                    <div className="text-[10px] text-slate-500">Domaines</div>
                  </div>
                </div>
                
                {selectedProfile.digitalFootprint.emails.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2">Emails trouvés:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.digitalFootprint.emails.map((email, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-surface-3 rounded text-slate-300 font-mono">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedProfile.digitalFootprint.phones.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2">Téléphones:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.digitalFootprint.phones.map((phone, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-surface-3 rounded text-slate-300 font-mono">
                          {phone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Phone Patterns */}
              {selectedProfile.phonePatterns.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <Phone className="w-4 h-4 text-accent-yellow" /> Patterns téléphone
                  </h3>
                  <div className="space-y-2">
                    {selectedProfile.phonePatterns.map((pattern, i) => (
                      <div key={i} className="bg-surface-2 border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white">{pattern.pattern}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-accent-yellow/10 text-accent-yellow rounded">
                            {pattern.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{pattern.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Data Sources */}
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-slate-400" /> Sources de données
                </h3>
                <div className="space-y-1">
                  {selectedProfile.dataSources.map((source, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between p-2 rounded ${
                        source.success ? "bg-green-500/5" : "bg-red-500/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {source.success ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span className="text-xs text-slate-300">{source.source}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(source.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-slate-600">
              <div className="text-center">
                <UserSearch className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Selectionnez un profil ou lancez une analyse</p>
                <p className="text-xs text-slate-500 mt-2">
                  Le profilage automatisé recherche sur les réseaux sociaux et analyse les patterns
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
