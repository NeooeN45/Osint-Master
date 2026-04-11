import { useState } from "react";
import {
  Globe, Server, MapPin, Eye, ShieldAlert, UserSearch,
  Navigation, Phone, Coins, Search, ExternalLink,
  Copy, CheckCircle, Plus, Loader2,
} from "lucide-react";
import { OSINT_TOOLS } from "../lib/tools";
import { useCaseStore } from "../store/useCaseStore";
import type { ToolResult, ToolCategory, EntityType } from "../types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe, Server, MapPin, Eye, ShieldAlert, UserSearch, Navigation, Phone, Coins, Search,
};

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  network: "Réseau",
  social: "Social",
  identity: "Identité",
  breach: "Fuites",
  geolocation: "Géolocalisation",
  domain: "Domaine",
  image: "Image",
  phone: "Téléphone",
  crypto: "Crypto",
  darkweb: "Dark Web",
};

const CATEGORY_COLORS: Record<ToolCategory, string> = {
  network: "red",
  social: "cyan",
  identity: "blue",
  breach: "orange",
  geolocation: "green",
  domain: "purple",
  image: "yellow",
  phone: "emerald",
  crypto: "amber",
  darkweb: "rose",
};

function inferEntityType(toolId: string): EntityType {
  const map: Record<string, EntityType> = {
    whois: "domain",
    dns_lookup: "domain",
    ip_info: "ip",
    shodan: "ip",
    hibp: "email",
    sherlock_api: "username",
    nominatim: "location",
    phone_info: "phone",
    blockchain: "crypto",
    google_dorking: "domain",
  };
  return map[toolId] ?? "unknown";
}

export default function ToolsView() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "all">("all");
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ToolResult>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [apiKeys, setApiKeyLocal] = useState<Record<string, string>>({});

  const { addEntity, getActiveCase, setApiKey, getApiKey } = useCaseStore();
  const activeCase = getActiveCase();

  const filtered = OSINT_TOOLS.filter(
    (t) => activeCategory === "all" || t.category === activeCategory
  );

  const categories = [...new Set(OSINT_TOOLS.map((t) => t.category))] as ToolCategory[];

  const handleRun = async (toolId: string) => {
    if (!query.trim()) return;
    setRunning(toolId);
    const tool = OSINT_TOOLS.find((t) => t.id === toolId);
    if (!tool) return;
    const key = apiKeys[toolId] ?? getApiKey(toolId);
    const result = await tool.run(query.trim(), key);
    setResults((prev) => ({ ...prev, [toolId]: result }));
    setRunning(null);
  };

  const handleAddToGraph = (toolId: string) => {
    const result = results[toolId];
    if (!result || !activeCase) return;
    addEntity({
      type: inferEntityType(toolId),
      value: query,
      metadata: result.data as Record<string, unknown>,
      tags: [toolId],
      confidence: result.success ? 85 : 30,
      source: toolId,
      notes: JSON.stringify(result.data, null, 2).slice(0, 200),
    });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Query bar */}
      <div className="p-4 border-b border-border bg-surface-1">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && filtered.length === 1 && handleRun(filtered[0].id)}
              placeholder="IP, email, domaine, username, numéro, adresse crypto..."
              className="w-full pl-9 pr-4 py-2.5 bg-surface-3 border border-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan transition-colors font-mono"
            />
          </div>
        </div>
        {/* Category filter */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              activeCategory === "all"
                ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                : "text-slate-500 hover:text-white border border-transparent"
            }`}
          >
            Tous ({OSINT_TOOLS.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs transition-all ${
                activeCategory === cat
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                  : "text-slate-500 hover:text-white border border-transparent"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Tools grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((tool) => {
            const Icon = ICON_MAP[tool.icon] ?? Search;
            const result = results[tool.id];
            const isRunning = running === tool.id;
            const color = CATEGORY_COLORS[tool.category];

            return (
              <div
                key={tool.id}
                className="bg-surface-2 border border-border rounded-xl overflow-hidden flex flex-col"
              >
                {/* Tool header */}
                <div className="p-3 flex items-center gap-3 border-b border-border/50">
                  <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 text-${color}-400`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{tool.name}</div>
                    <div className="text-xs text-slate-500 truncate">{tool.description}</div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                    {CATEGORY_LABELS[tool.category]}
                  </span>
                </div>

                {/* API key input if needed */}
                {tool.requiresKey && (
                  <div className="px-3 pt-2">
                    <input
                      type="password"
                      placeholder={`Clé API ${tool.name}`}
                      value={apiKeys[tool.id] ?? getApiKey(tool.id ?? "")}
                      onChange={(e) => {
                        setApiKeyLocal((prev) => ({ ...prev, [tool.id]: e.target.value }));
                        setApiKey(tool.id, e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 bg-surface-3 border border-border rounded-lg text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                )}

                {/* Result */}
                {result && (
                  <div className="px-3 pt-2 flex-1">
                    <div className={`text-xs rounded-lg p-2 font-mono max-h-36 overflow-y-auto ${
                      result.success ? "bg-green-500/5 text-green-300 border border-green-500/20" : "bg-red-500/5 text-red-400 border border-red-500/20"
                    }`}>
                      {result.success
                        ? JSON.stringify(result.data, null, 2).slice(0, 500)
                        : result.error}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-3 flex gap-2 mt-auto">
                  <button
                    onClick={() => handleRun(tool.id)}
                    disabled={!query.trim() || isRunning}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-xs hover:bg-accent-cyan/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isRunning ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Recherche...</>
                    ) : (
                      <><Search className="w-3 h-3" /> Lancer</>
                    )}
                  </button>
                  {result?.success && (
                    <>
                      <button
                        onClick={() => handleCopy(JSON.stringify(result.data, null, 2), tool.id)}
                        className="p-1.5 border border-border rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Copier"
                      >
                        {copied === tool.id ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {activeCase && (
                        <button
                          onClick={() => handleAddToGraph(tool.id)}
                          className="p-1.5 border border-accent-purple/30 bg-accent-purple/10 rounded-lg text-purple-400 hover:text-purple-300 transition-colors"
                          title="Ajouter au graphe"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                  {/* Dorks links */}
                  {tool.id === "google_dorking" && result?.success && (
                    <button
                      onClick={() => {
                        const dorks = (result.data as { dorks: { url: string; label: string }[] }).dorks;
                        dorks.slice(0, 2).forEach((d) => window.open(d.url, "_blank"));
                      }}
                      className="p-1.5 border border-border rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Ouvrir les dorks"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
