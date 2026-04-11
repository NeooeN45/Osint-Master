import { Shield, Share2, Search, Clock, TrendingUp, AlertTriangle, Plus, ChevronRight } from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";
import type { AppView } from "../components/Sidebar";

interface DashboardProps {
  onViewChange: (v: AppView) => void;
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: "text-blue-400",
  email: "text-yellow-400",
  ip: "text-red-400",
  domain: "text-purple-400",
  phone: "text-green-400",
  username: "text-cyan-400",
  organization: "text-orange-400",
  location: "text-emerald-400",
  crypto: "text-amber-400",
  unknown: "text-slate-400",
};

export default function Dashboard({ onViewChange }: DashboardProps) {
  const { cases, activeCaseId, createCase, setActiveCase } = useCaseStore();
  const activeCase = cases.find((c) => c.id === activeCaseId);

  const stats = activeCase
    ? {
        entities: activeCase.entities.length,
        relations: activeCase.relations.length,
        types: [...new Set(activeCase.entities.map((e) => e.type))].length,
      }
    : { entities: 0, relations: 0, types: 0 };

  const recentEntities = activeCase?.entities.slice(-6).reverse() ?? [];

  const entityTypeCount = activeCase
    ? activeCase.entities.reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-grid">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {activeCase ? activeCase.name : "Tableau de bord"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeCase ? `Dossier actif — ${activeCase.status}` : "Aucun dossier sélectionné"}
          </p>
        </div>
        <button
          onClick={() => {
            const name = `Dossier ${new Date().toLocaleDateString("fr-FR")} — ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
            createCase(name);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg hover:bg-accent-cyan/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Nouveau dossier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Entités", value: stats.entities, icon: Shield, color: "cyan" },
          { label: "Relations", value: stats.relations, icon: Share2, color: "purple" },
          { label: "Types distincts", value: stats.types, icon: TrendingUp, color: "green" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-surface-2 border border-border rounded-xl p-4 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-lg bg-${color === "cyan" ? "cyan" : color === "purple" ? "purple" : "green"}-500/10 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 text-${color === "cyan" ? "cyan" : color === "purple" ? "purple" : "green"}-400`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent entities */}
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-cyan" /> Entités récentes
            </h2>
            <button
              onClick={() => onViewChange("graph")}
              className="text-xs text-slate-500 hover:text-accent-cyan flex items-center gap-1"
            >
              Voir graphe <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentEntities.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune entité — lancez un outil</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEntities.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded bg-surface-3 ${ENTITY_TYPE_COLORS[e.type] ?? "text-slate-400"}`}>
                    {e.type}
                  </span>
                  <span className="text-sm text-slate-300 truncate flex-1 font-mono">{e.value}</span>
                  <span className="text-xs text-slate-600">{e.confidence}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Entity type breakdown */}
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-purple" /> Répartition par type
          </h2>
          {Object.keys(entityTypeCount).length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune donnée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(entityTypeCount)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className={`text-xs w-20 font-mono ${ENTITY_TYPE_COLORS[type] ?? "text-slate-400"}`}>{type}</span>
                    <div className="flex-1 bg-surface-3 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-accent-cyan"
                        style={{ width: `${Math.round((count / stats.entities) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* All cases */}
        <div className="bg-surface-2 border border-border rounded-xl p-4 col-span-2">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-orange" /> Tous les dossiers ({cases.length})
          </h2>
          {cases.length === 0 ? (
            <div className="text-center py-6 text-slate-600 text-sm">Aucun dossier créé</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCase(c.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    c.id === activeCaseId
                      ? "border-accent-cyan/50 bg-accent-cyan/5 text-white"
                      : "border-border hover:border-border-bright text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {c.entities.length} entités · {c.relations.length} liens
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
