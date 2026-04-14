import { Clock, Shield, Globe, User, MapPin, Search } from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";
import type { EntityType } from "../types";

const TYPE_ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  person: User,
  email: Shield,
  phone: Shield,
  ip: Globe,
  domain: Globe,
  username: User,
  organization: Shield,
  location: MapPin,
  vehicle: Shield,
  crypto: Shield,
  social: User,
  document: Shield,
  image: Search,
  face: User,
  unknown: Search,
};

const TYPE_COLORS: Record<string, string> = {
  person: "blue",
  email: "yellow",
  ip: "red",
  domain: "purple",
  phone: "green",
  username: "cyan",
  organization: "orange",
  location: "emerald",
  crypto: "amber",
  unknown: "slate",
};

export default function TimelineView() {
  const { getActiveCase } = useCaseStore();
  const activeCase = getActiveCase();

  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Aucun dossier actif</p>
        </div>
      </div>
    );
  }

  const events = [
    ...activeCase.entities.map((e) => ({
      id: e.id,
      type: "entity" as const,
      label: e.value,
      subtype: e.type,
      source: e.source,
      timestamp: e.createdAt,
      confidence: e.confidence,
    })),
    ...activeCase.relations.map((r) => {
      const src = activeCase.entities.find((e) => e.id === r.sourceId);
      const tgt = activeCase.entities.find((e) => e.id === r.targetId);
      return {
        id: r.id,
        type: "relation" as const,
        label: `${src?.value ?? "?"} → ${tgt?.value ?? "?"}`,
        subtype: r.type,
        source: r.source,
        timestamp: r.createdAt,
        confidence: r.strength,
      };
    }),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Aucun événement — lancez des outils OSINT</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-accent-cyan" /> Timeline — {events.length} événements
      </h2>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-accent-cyan/50 via-accent-purple/30 to-transparent" />

        <div className="space-y-4 pl-14">
          {events.map((event, idx) => {
            const color = event.type === "relation" ? "purple" : (TYPE_COLORS[event.subtype] ?? "slate");
            const Icon = event.type === "relation" ? Shield : (TYPE_ICONS[event.subtype as EntityType] ?? Search);

            return (
              <div key={event.id} className="relative">
                {/* Dot */}
                <div
                  className={`absolute -left-9 w-4 h-4 rounded-full border-2 bg-surface-0 flex items-center justify-center`}
                  style={{ borderColor: color === "cyan" ? "#06b6d4" : color === "purple" ? "#8b5cf6" : "#64748b" }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full bg-${color}-400`} />
                </div>

                <div className={`bg-surface-2 border border-border rounded-xl p-3 hover:border-${color}-500/30 transition-colors`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-lg bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-3 h-3 text-${color}-400`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-mono text-white truncate">{event.label}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded bg-${color}-500/10 text-${color}-400`}>
                            {event.subtype}
                          </span>
                          <span className="text-[10px] text-slate-600">{event.source}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {new Date(event.timestamp).toLocaleDateString("fr-FR")}
                      </div>
                      <div className={`text-[10px] text-${color}-400 mt-0.5`}>{event.confidence}%</div>
                    </div>
                  </div>
                </div>

                {/* Connector label between events */}
                {idx < events.length - 1 && (
                  <div className="absolute -left-[30px] top-full mt-1 text-[9px] text-slate-700 font-mono">
                    {Math.round((new Date(event.timestamp).getTime() - new Date(events[idx + 1].timestamp).getTime()) / 60000)}m
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
