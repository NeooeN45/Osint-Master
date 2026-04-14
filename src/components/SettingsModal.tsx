import { useState, useEffect, useRef } from "react";
import { X, Key, Save, ExternalLink, CheckCircle2, Eye, EyeOff, RefreshCw, ChevronDown, ChevronRight, Instagram, Globe, Shield, Search, Phone } from "lucide-react";

const API_BASE = "http://localhost:3002/api";

interface ApiKeyDef {
  id: string;
  label: string;
  description: string;
  url: string;
  free: boolean;
  set?: boolean;
  value?: string;
}

const GROUPS: { label: string; icon: React.ReactNode; color: string; ids: string[] }[] = [
  {
    label: "Réseaux Sociaux",
    icon: <Instagram className="w-4 h-4" />,
    color: "text-pink-400",
    ids: ["INSTAGRAM_SESSION", "RAPIDAPI_KEY", "GITHUB_TOKEN"],
  },
  {
    label: "IP & Réseau",
    icon: <Globe className="w-4 h-4" />,
    color: "text-cyan-400",
    ids: ["SHODAN_API_KEY", "IPINFO_TOKEN", "ABUSEIPDB_API_KEY", "CENSYS_API_ID", "CENSYS_API_SECRET", "VIRUSTOTAL_API_KEY"],
  },
  {
    label: "Email & Breach",
    icon: <Shield className="w-4 h-4" />,
    color: "text-violet-400",
    ids: ["HIBP_API_KEY", "HUNTER_API_KEY"],
  },
  {
    label: "Téléphone",
    icon: <Phone className="w-4 h-4" />,
    color: "text-emerald-400",
    ids: ["NUMVERIFY_API_KEY"],
  },
  {
    label: "Web Search",
    icon: <Search className="w-4 h-4" />,
    color: "text-amber-400",
    ids: ["BING_SEARCH_KEY"],
  },
];

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [defs, setDefs] = useState<ApiKeyDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/config`)
      .then(r => r.json())
      .then((data: ApiKeyDef[]) => {
        setDefs(data);
        const v: Record<string, string> = {};
        const og: Record<string, boolean> = {};
        for (const d of data) {
          v[d.id] = d.value || "";
        }
        // Open groups that have at least one key set
        for (const g of GROUPS) {
          og[g.label] = g.ids.some(id => data.find(d => d.id === id)?.set);
        }
        // Always open Social group
        og["Réseaux Sociaux"] = true;
        setValues(v);
        setOpenGroups(og);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const countSet = (ids: string[]) =>
    ids.filter(id => values[id]?.trim()).length;

  const defMap = Object.fromEntries(defs.map(d => [d.id, d]));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            Clés API & Sources OSINT
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Chargement...
            </div>
          ) : (
            GROUPS.map(group => {
              const set = countSet(group.ids);
              const total = group.ids.length;
              const open = openGroups[group.label];
              return (
                <div key={group.label} className="border border-white/8 rounded-xl overflow-hidden">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/6 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={group.color}>{group.icon}</span>
                      <span className="text-sm font-medium text-slate-200">{group.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${set > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500"}`}>
                        {set}/{total}
                      </span>
                    </div>
                    {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  {/* Group keys */}
                  {open && (
                    <div className="px-4 pb-4 pt-2 space-y-3 bg-white/1">
                      {group.ids.map(id => {
                        const def = defMap[id];
                        if (!def) return null;
                        const val = values[id] || "";
                        const isSet = !!val.trim();
                        return (
                          <div key={id}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                {isSet
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  : <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                                }
                                <span className="text-sm font-medium text-slate-200">{def.label}</span>
                                {def.free && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full">gratuit</span>}
                              </div>
                              {def.url && (
                                <a href={def.url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-1 transition-colors">
                                  Obtenir <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mb-1.5 ml-5">{def.description}</p>
                            {/* Special note for Instagram */}
                            {id === "INSTAGRAM_SESSION" && (
                              <p className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded px-2 py-1 mb-1.5 ml-5">
                                Facultatif. Requis uniquement pour les profils privés. Obtenir via DevTools → Application → Cookies → sessionid
                              </p>
                            )}
                            <div className="relative ml-5">
                              <input
                                ref={el => { inputRefs.current[id] = el; }}
                                type={visible[id] ? "text" : "password"}
                                value={val}
                                onChange={e => setValues(prev => ({ ...prev, [id]: e.target.value }))}
                                placeholder={isSet ? "••••••••••••••••" : `Entrez votre ${def.label} key...`}
                                className="w-full pr-8 pl-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setVisible(prev => ({ ...prev, [id]: !prev[id] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                {visible[id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Instagram usage note */}
          {!loading && (
            <div className="mt-2 p-3 bg-pink-500/5 border border-pink-500/20 rounded-xl text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-pink-400 font-medium mb-1">
                <Instagram className="w-3.5 h-3.5" /> Instagram — sans clé
              </div>
              <p>Les profils <strong className="text-white">publics</strong> sont analysés sans aucune authentification (username, bio, followers, localisation des posts).</p>
              <p>Pour les profils <strong className="text-white">privés</strong>, ajouter le cookie <code className="bg-white/10 px-1 rounded">sessionid</code> ci-dessus.</p>
              <p className="text-slate-500">Installer Instaloader pour plus de données : <code className="bg-white/10 px-1 rounded">pip install instaloader</code></p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all text-sm font-medium disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {saved ? "Sauvegardé !" : saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-white/10 text-slate-400 rounded-xl hover:text-white hover:border-white/20 transition-colors text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
