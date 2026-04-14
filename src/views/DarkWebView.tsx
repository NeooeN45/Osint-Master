import { useState, useEffect } from "react";
import { 
  Search, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Globe, 
  Database,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Filter,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Skull,
  Bug,
  Terminal,
  AlertOctagon,
  Activity,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { PanelSection } from "../components/ProLayout";
import type { 
  DarkWebSearchResult, 
  PastebinResult, 
  BreachRecord,
  RansomwareVictim,
  DarkWebSource 
} from "../types/darkweb";
import {
  searchAhmia,
  searchDarkSearch,
  searchPastebin,
  checkHIBP,
  searchDehashed,
  getRansomwareVictims,
  extractSensitiveData,
} from "../lib/darkweb";

interface SearchFilters {
  sources: DarkWebSource[];
  riskLevel: ("low" | "medium" | "high" | "critical")[];
  category: string;
  dateRange: string;
}

export default function DarkWebView() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"onion" | "paste" | "breach" | "ransomware">("onion");
  const [isSearching, setIsSearching] = useState(false);
  const [onionResults, setOnionResults] = useState<DarkWebSearchResult[]>([]);
  const [pasteResults, setPasteResults] = useState<PastebinResult[]>([]);
  const [breachResults, setBreachResults] = useState<BreachRecord[]>([]);
  const [ransomwareResults, setRansomwareResults] = useState<RansomwareVictim[]>([]);
  const [selectedResult, setSelectedResult] = useState<DarkWebSearchResult | PastebinResult | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    sources: ["ahmia", "darksearch", "pastebin"],
    riskLevel: ["medium", "high", "critical"],
    category: "all",
    dateRange: "all",
  });
  const [apiKeys, setApiKeys] = useState({
    hibp: "",
    dehashed: "",
    darksearch: "",
  });
  const [showApiModal, setShowApiModal] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Enter a search query");
      return;
    }

    setIsSearching(true);
    setSelectedResult(null);

    try {
      switch (searchType) {
        case "onion":
          const [ahmiaResults, darksearchResults] = await Promise.all([
            searchAhmia(query),
            searchDarkSearch(query, apiKeys.darksearch),
          ]);
          setOnionResults([...ahmiaResults, ...darksearchResults]);
          toast.success(`Found ${ahmiaResults.length + darksearchResults.length} .onion results`);
          break;

        case "paste":
          const pastes = await searchPastebin(query);
          setPasteResults(pastes);
          toast.success(`Found ${pastes.length} pastes`);
          break;

        case "breach":
          if (!apiKeys.hibp && !apiKeys.dehashed) {
            setShowApiModal(true);
            toast.error("API keys required for breach search");
          } else {
            const hibpResults = apiKeys.hibp 
              ? await checkHIBP(query, apiKeys.hibp)
              : [];
            const dehashedResults = apiKeys.dehashed
              ? await searchDehashed(query, apiKeys.dehashed, "email")
              : [];
            setBreachResults([...hibpResults, ...dehashedResults]);
            toast.success(`Found ${hibpResults.length + dehashedResults.length} breach records`);
          }
          break;

        case "ransomware":
          const victims = await getRansomwareVictims(query);
          setRansomwareResults(victims);
          toast.success(`Found ${victims.length} ransomware victims`);
          break;
      }
    } catch (error) {
      toast.error("Search failed: " + (error as Error).message);
    } finally {
      setIsSearching(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-500 bg-red-500/10 border-red-500/30";
      case "high": return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      case "medium": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
      default: return "text-green-500 bg-green-500/10 border-green-500/30";
    }
  };

  const renderOnionResults = () => (
    <div className="space-y-2">
      {onionResults.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Search the dark web using Ahmia and DarkSearch</p>
        </div>
      ) : (
        onionResults.map((result) => (
          <div
            key={result.id}
            onClick={() => setSelectedResult(result)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedResult?.id === result.id
                ? "bg-accent-cyan/5 border-accent-cyan/30"
                : "bg-surface-1 border-border hover:border-accent-cyan/20"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-medium text-slate-200">{result.title}</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] border ${getRiskColor(result.riskLevel)}`}>
                {result.riskLevel}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{result.description}</p>
            
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
              <span className="font-mono text-purple-400">{result.source}</span>
              <span>{result.category}</span>
              <span>Score: {(result.relevanceScore * 100).toFixed(0)}%</span>
            </div>

            {result.onionUrl && (
              <div className="flex items-center gap-2 mt-2 p-1.5 bg-surface-2 rounded text-[10px]">
                <Lock className="w-3 h-3 text-slate-500" />
                <code className="text-purple-300 truncate flex-1">{result.onionUrl}</code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(result.onionUrl!);
                    toast.success("Copied to clipboard");
                  }}
                  className="p-1 hover:bg-surface-3 rounded"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderPasteResults = () => (
    <div className="space-y-2">
      {pasteResults.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Monitor Pastebin, Ghostbin, and ZeroBin for leaks</p>
        </div>
      ) : (
        pasteResults.map((paste) => (
          <div
            key={paste.id}
            onClick={() => setSelectedResult(paste)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedResult?.id === paste.id
                ? "bg-accent-cyan/5 border-accent-cyan/30"
                : "bg-surface-1 border-border hover:border-accent-cyan/20"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-medium text-slate-200">{paste.title}</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] border ${getRiskColor(paste.riskLevel)}`}>
                {paste.classification}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
              <span>{paste.source}</span>
              <span>{new Date(paste.createdAt).toLocaleDateString()}</span>
              <span>{paste.views} views</span>
              {paste.author && <span>by {paste.author}</span>}
            </div>

            {/* Extracted Data Preview */}
            {Object.values(paste.extractedData).some((arr) => arr.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {paste.extractedData.emails.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px]">
                    {paste.extractedData.emails.length} emails
                  </span>
                )}
                {paste.extractedData.passwords.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px]">
                    {paste.extractedData.passwords.length} passwords
                  </span>
                )}
                {paste.extractedData.apiKeys.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[9px]">
                    {paste.extractedData.apiKeys.length} API keys
                  </span>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderBreachResults = () => (
    <div className="space-y-2">
      {breachResults.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Check Have I Been Pwned and DeHashed databases</p>
          <button
            onClick={() => setShowApiModal(true)}
            className="mt-2 text-accent-cyan hover:underline text-xs"
          >
            Configure API Keys
          </button>
        </div>
      ) : (
        breachResults.map((breach) => (
          <div
            key={breach.id}
            className="p-3 rounded-lg border bg-surface-1 border-border"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h4 className="text-sm font-medium text-slate-200">{breach.breachName}</h4>
              </div>
              {breach.verified && (
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px]">
                  Verified
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
              <span>{breach.source}</span>
              <span>{breach.breachDate}</span>
            </div>
            
            <p className="text-xs text-slate-400 mt-2">{breach.description}</p>
            
            <div className="mt-2">
              <span className="text-[10px] text-slate-500">Compromised:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {breach.compromisedData.map((data) => (
                  <span key={data} className="px-1.5 py-0.5 bg-surface-2 text-slate-400 rounded text-[9px]">
                    {data}
                  </span>
                ))}
              </div>
            </div>

            {breach.passwordHint && (
              <div className="mt-2 p-1.5 bg-red-500/10 border border-red-500/20 rounded text-[10px]">
                <span className="text-red-400">Password hint available</span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderRansomwareResults = () => (
    <div className="space-y-2">
      {ransomwareResults.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Bug className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Monitor ransomware gangs and their victims</p>
        </div>
      ) : (
        ransomwareResults.map((victim) => (
          <div
            key={victim.id}
            className="p-3 rounded-lg border bg-surface-1 border-border"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                <h4 className="text-sm font-medium text-slate-200">{victim.victimName}</h4>
              </div>
              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] font-mono">
                {victim.groupName}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
              {victim.victimCountry && <span>{victim.victimCountry}</span>}
              {victim.victimIndustry && <span>{victim.victimIndustry}</span>}
              {victim.leakPublishedAt && (
                <span>{new Date(victim.leakPublishedAt).toLocaleDateString()}</span>
              )}
            </div>
            
            <p className="text-xs text-slate-400 mt-2">{victim.description}</p>
            
            {victim.dataSize && (
              <div className="mt-2 flex items-center gap-2">
                <Database className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-400">{victim.dataSize} leaked</span>
              </div>
            )}

            {victim.darknetUrl && (
              <div className="mt-2 p-1.5 bg-surface-2 rounded text-[10px] flex items-center gap-2">
                <Lock className="w-3 h-3 text-slate-500" />
                <code className="text-purple-300 truncate flex-1">{victim.darknetUrl}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(victim.darknetUrl!);
                    toast.success("Copied");
                  }}
                  className="p-1 hover:bg-surface-3 rounded"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-1">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Dark Web Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search .onion sites, monitor pastes, track breaches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApiModal(true)}
            className="px-3 py-1.5 bg-surface-2 text-slate-400 rounded-lg text-sm hover:text-white hover:bg-surface-3 transition-colors flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            API Keys
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-border bg-surface-1">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search dark web, pastes, breaches..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-0 border border-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as typeof searchType)}
            className="px-3 py-2.5 bg-surface-0 border border-border rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="onion">.onion Sites</option>
            <option value="paste">Pastes</option>
            <option value="breach">Breach DB</option>
            <option value="ransomware">Ransomware</option>
          </select>

          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSearching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-1 mt-3">
          {[
            { id: "onion", label: ".onion", icon: Globe },
            { id: "paste", label: "Pastes", icon: FileText },
            { id: "breach", label: "Breaches", icon: Database },
            { id: "ransomware", label: "Ransomware", icon: Bug },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSearchType(type.id as typeof searchType)}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
                searchType === type.id
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                  : "text-slate-500 hover:text-slate-300 hover:bg-surface-2"
              }`}
            >
              <type.icon className="w-3.5 h-3.5" />
              {type.label}
              {type.id === "onion" && onionResults.length > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-[9px]">
                  {onionResults.length}
                </span>
              )}
              {type.id === "paste" && pasteResults.length > 0 && (
                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-[9px]">
                  {pasteResults.length}
                </span>
              )}
              {type.id === "breach" && breachResults.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[9px]">
                  {breachResults.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchType === "onion" && renderOnionResults()}
          {searchType === "paste" && renderPasteResults()}
          {searchType === "breach" && renderBreachResults()}
          {searchType === "ransomware" && renderRansomwareResults()}
        </div>

        {/* Detail Panel */}
        {selectedResult && (
          <div className="w-96 border-l border-border bg-surface-1 overflow-y-auto">
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-medium text-white">Details</h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-1 hover:bg-surface-2 rounded"
                >
                  <Trash2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {"onionUrl" in selectedResult ? (
              // Dark Web Result Detail
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-white">{selectedResult.title}</h4>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] border ${getRiskColor(selectedResult.riskLevel)}`}>
                    {selectedResult.riskLevel.toUpperCase()}
                  </span>
                </div>

                <p className="text-sm text-slate-400">{selectedResult.description}</p>

                {selectedResult.onionUrl && (
                  <div className="p-3 bg-surface-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase">Onion URL</span>
                    <code className="block mt-1 text-xs text-purple-300 break-all font-mono">
                      {selectedResult.onionUrl}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedResult.onionUrl!);
                        toast.success("Copied");
                      }}
                      className="mt-2 px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                )}

                <PanelSection title="Extracted Entities" defaultExpanded={true}>
                  <div className="space-y-2 text-xs">
                    {selectedResult.extractedEntities.emails.length > 0 && (
                      <div>
                        <span className="text-slate-500">Emails:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedResult.extractedEntities.emails.map((email) => (
                            <span key={email} className="px-1.5 py-0.5 bg-surface-2 text-slate-300 rounded text-[10px]">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedResult.extractedEntities.usernames.length > 0 && (
                      <div>
                        <span className="text-slate-500">Usernames:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedResult.extractedEntities.usernames.map((u) => (
                            <span key={u} className="px-1.5 py-0.5 bg-surface-2 text-slate-300 rounded text-[10px]">
                              @{u}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </PanelSection>
              </div>
            ) : (
              // Paste Result Detail
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-white">{selectedResult.title}</h4>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] border ${getRiskColor(selectedResult.riskLevel)}`}>
                    {"classification" in selectedResult ? selectedResult.classification.toUpperCase() : "PASTE"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{selectedResult.source}</span>
                  <span>{"createdAt" in selectedResult ? new Date(selectedResult.createdAt).toLocaleString() : ""}</span>
                </div>

                {"content" in selectedResult && (
                  <PanelSection title="Content" defaultExpanded={true}>
                    <pre className="p-3 bg-surface-2 rounded text-xs text-slate-300 overflow-x-auto max-h-60 overflow-y-auto">
                      {selectedResult.content}
                    </pre>
                  </PanelSection>
                )}

                {"extractedData" in selectedResult && (
                  <PanelSection title="Extracted Data" defaultExpanded={true}>
                    <div className="space-y-2">
                      {Object.entries(selectedResult.extractedData).map(([type, items]: [string, string[]]) => 
                        items.length > 0 ? (
                          <div key={type}>
                            <span className="text-[10px] text-slate-500 uppercase">{type}</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {items.slice(0, 5).map((item: string, i: number) => (
                                <span key={i} className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] font-mono">
                                  {item.substring(0, 30)}{item.length > 30 ? "..." : ""}
                                </span>
                              ))}
                              {items.length > 5 && (
                                <span className="px-1.5 py-0.5 bg-surface-2 text-slate-400 rounded text-[9px]">
                                  +{items.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </PanelSection>
                )}

                {selectedResult.url && (
                  <a
                    href={selectedResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-surface-2 text-slate-300 rounded-lg text-sm hover:bg-surface-3"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Original
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* API Keys Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-96 bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Dark Web API Keys</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Have I Been Pwned</label>
                <input
                  type="password"
                  value={apiKeys.hibp}
                  onChange={(e) => setApiKeys({ ...apiKeys, hibp: e.target.value })}
                  placeholder="HIBP API Key"
                  className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-500">DeHashed</label>
                <input
                  type="password"
                  value={apiKeys.dehashed}
                  onChange={(e) => setApiKeys({ ...apiKeys, dehashed: e.target.value })}
                  placeholder="DeHashed API Key"
                  className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-500">DarkSearch</label>
                <input
                  type="password"
                  value={apiKeys.darksearch}
                  onChange={(e) => setApiKeys({ ...apiKeys, darksearch: e.target.value })}
                  placeholder="DarkSearch API Key (optional)"
                  className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowApiModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowApiModal(false);
                  toast.success("API keys saved");
                }}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
