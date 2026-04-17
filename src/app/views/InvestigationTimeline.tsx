// InvestigationTimeline — frise chronologique des découvertes
// Groupe par module, avec barres de durée et points d'entités

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Clock, Hash, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Entity, ToolState, DebugEntry, ETYPE_ICONS, ec } from "../constants";

interface Props {
  entities: Entity[];
  tools: Record<string, ToolState>;
  log: DebugEntry[];
  elapsed: number;
  running: boolean;
}

type TimelineEvent =
  | { kind: "entity"; ts: number; entity: Entity }
  | { kind: "tool_start"; ts: number; tool: ToolState }
  | { kind: "tool_done"; ts: number; tool: ToolState }
  | { kind: "phase"; ts: number; phase: string };

export default function InvestigationTimeline({ entities, tools, log, elapsed, running }: Props) {
  const [filter, setFilter] = useState<"all" | "entities" | "tools" | "phases">("all");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const toolList = Object.values(tools);

  // Collecte tous les événements
  const events: TimelineEvent[] = useMemo(() => {
    const all: TimelineEvent[] = [];
    // Entités (timestamp synthétique basé sur ordre)
    const firstTs = log.length > 0 ? log[0].ts : Date.now() - elapsed * 1000;
    entities.forEach((e, i) => {
      // Approx timestamp : chercher dans les logs un event d'entité
      const entityLog = log.find(l => l.level === "entity" && l.message.includes(e.value.slice(0, 20)));
      all.push({ kind: "entity", ts: entityLog?.ts || (firstTs + i * 50), entity: e });
    });
    toolList.forEach(t => {
      if (t.startTs) all.push({ kind: "tool_start", ts: t.startTs, tool: t });
      if (t.startTs && t.duration) all.push({ kind: "tool_done", ts: t.startTs + t.duration, tool: t });
    });
    log.filter(l => l.level === "phase").forEach(l => {
      all.push({ kind: "phase", ts: l.ts, phase: l.message });
    });

    return all.sort((a, b) => a.ts - b.ts);
  }, [entities, toolList, log, elapsed]);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    if (filter === "entities") return events.filter(e => e.kind === "entity");
    if (filter === "tools") return events.filter(e => e.kind === "tool_start" || e.kind === "tool_done");
    if (filter === "phases") return events.filter(e => e.kind === "phase");
    return events;
  }, [events, filter]);

  if (events.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#3f3f46" }}>
        <Clock style={{ width: 44, height: 44, opacity: 0.15 }} />
        <div style={{ fontSize: 12, color: "#52525b" }}>Pas encore d'événements</div>
      </div>
    );
  }

  const startTime = events[0]?.ts || Date.now();
  const endTime = events[events.length - 1]?.ts || Date.now();
  const duration = Math.max(endTime - startTime, 1000);

  // Time buckets for stats
  const buckets = 40;
  const bucketMs = duration / buckets;
  const bucketsArr = Array.from({ length: buckets }, (_, i) => ({
    start: startTime + i * bucketMs,
    entities: 0, tools: 0,
  }));
  events.forEach(e => {
    const b = Math.min(Math.floor((e.ts - startTime) / bucketMs), buckets - 1);
    if (b < 0) return;
    if (e.kind === "entity") bucketsArr[b].entities++;
    if (e.kind === "tool_start") bucketsArr[b].tools++;
  });
  const maxBucket = Math.max(...bucketsArr.map(b => b.entities + b.tools), 1);

  const fmtTime = (ts: number) => {
    const delta = (ts - startTime) / 1000;
    if (delta < 60) return `${delta.toFixed(1)}s`;
    return `${Math.floor(delta / 60)}m${Math.floor(delta % 60)}s`;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "6px 14px",
        borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(8,10,18,.7)",
        flexShrink: 0,
      }}>
        <Clock style={{ width: 11, height: 11, color: "#22d3ee" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#d4d4d8" }}>Timeline</span>
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,.08)" }} />
        <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
          {(["all", "entities", "tools", "phases"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "3px 10px", fontSize: 9, fontWeight: 700, borderRadius: 4,
                cursor: "pointer", background: filter === f ? "rgba(34,211,238,.15)" : "transparent",
                border: "none", color: filter === f ? "#22d3ee" : "#71717a",
                textTransform: "capitalize" }}>{f === "all" ? "Tout" : f}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 14, fontSize: 9, fontFamily: "monospace", color: "#71717a" }}>
          <span><strong style={{ color: "#34d399" }}>{entities.length}</strong> entités</span>
          <span><strong style={{ color: "#22d3ee" }}>{toolList.length}</strong> modules</span>
          <span><strong style={{ color: "#fbbf24" }}>{elapsed}s</strong> écoulées</span>
        </div>
      </div>

      {/* Histogram bar */}
      <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.04)", background: "rgba(8,10,18,.5)", flexShrink: 0 }}>
        <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#52525b", marginBottom: 4 }}>
          Densité d'activité ({fmtTime(startTime)} → {fmtTime(endTime)})
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 38 }}>
          {bucketsArr.map((b, i) => {
            const h = ((b.entities + b.tools) / maxBucket) * 100;
            return (
              <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative" }}>
                <div style={{
                  height: `${h}%`,
                  background: `linear-gradient(to top, ${b.entities > 0 ? "#34d39999" : "transparent"}, ${b.tools > 0 ? "#22d3ee99" : "transparent"})`,
                  borderRadius: 1,
                  minHeight: h > 0 ? 2 : 0,
                }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Main timeline */}
      <div className="s" style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px", position: "relative" }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute", left: 80, top: 14, bottom: 14,
          width: 1, background: "linear-gradient(to bottom, rgba(34,211,238,.5), rgba(139,92,246,.3), transparent)",
        }} />

        {filtered.map((ev, idx) => {
          const timeOffset = ev.ts - startTime;
          let Icon: any = Hash;
          let color = "#71717a";
          let label = "";
          let sub = "";
          let content: Entity | null = null;

          if (ev.kind === "entity") {
            const e = ev.entity;
            Icon = ETYPE_ICONS[e.type] || Hash;
            color = ec(e.type);
            label = e.value.length > 50 ? e.value.slice(0, 48) + "…" : e.value;
            sub = `${e.type} · ${e.source} · ${e.confidence}%`;
            content = e;
          } else if (ev.kind === "tool_start") {
            Icon = Loader2;
            color = "#22d3ee";
            label = `▶ ${ev.tool.name}`;
            sub = "démarrage";
          } else if (ev.kind === "tool_done") {
            Icon = ev.tool.status === "error" ? XCircle : CheckCircle2;
            color = ev.tool.status === "error" ? "#f87171" : ev.tool.status === "skipped" ? "#71717a" : "#34d399";
            label = `${ev.tool.name}`;
            sub = `terminé · ${ev.tool.duration ? (ev.tool.duration / 1000).toFixed(1) + "s" : "?"} · ${ev.tool.found || 0} trouvés`;
          } else if (ev.kind === "phase") {
            Icon = AlertTriangle;
            color = "#a78bfa";
            label = ev.phase;
            sub = "phase";
          }

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(idx * 0.01, 0.3) }}
              style={{
                position: "relative", marginBottom: 6,
                paddingLeft: 104,
                cursor: ev.kind === "entity" ? "pointer" : "default",
              }}
              onClick={() => ev.kind === "entity" && setSelectedEvent(content)}
            >
              {/* Time column */}
              <div style={{
                position: "absolute", left: 0, top: 4,
                fontSize: 9, fontFamily: "monospace", color: "#52525b", width: 76, textAlign: "right",
              }}>
                {fmtTime(ev.ts)}
              </div>

              {/* Dot */}
              <div style={{
                position: "absolute", left: 72, top: 6,
                width: 16, height: 16, borderRadius: "50%",
                background: "#0a0c12",
                border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 2,
                boxShadow: `0 0 6px ${color}80`,
              }}>
                <Icon style={{ width: 7, height: 7, color, animation: (ev.kind === "tool_start" && running) ? "spin 1s linear infinite" : undefined }} />
              </div>

              {/* Card */}
              <div style={{
                padding: "5px 10px", borderRadius: 7,
                background: `${color}0c`,
                border: `1px solid ${color}28`,
                transition: "all .15s",
              }}
                onMouseOver={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}50`; }}
                onMouseOut={e => { e.currentTarget.style.background = `${color}0c`; e.currentTarget.style.borderColor = `${color}28`; }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {label}
                </div>
                <div style={{ fontSize: 8, color: "#71717a", marginTop: 1 }}>{sub}</div>
              </div>
            </motion.div>
          );
        })}

        {running && (
          <div style={{ paddingLeft: 104, marginTop: 8, fontSize: 9, color: "#52525b", display: "flex", alignItems: "center", gap: 6 }}>
            <Loader2 style={{ width: 10, height: 10, color: "#22d3ee", animation: "spin 1s linear infinite" }} />
            Investigation en cours...
          </div>
        )}
      </div>

      {/* Selected entity preview */}
      {selectedEvent && (
        <div style={{
          position: "absolute", bottom: 12, right: 12, width: 280,
          background: "rgba(10,12,20,.96)", backdropFilter: "blur(20px)",
          border: `1px solid ${ec(selectedEvent.type)}50`, borderRadius: 10,
          padding: 12, zIndex: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,.6)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${ec(selectedEvent.type)}20`, border: `1px solid ${ec(selectedEvent.type)}50`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {(() => { const I = ETYPE_ICONS[selectedEvent.type] || Hash; return <I style={{ width: 13, height: 13, color: ec(selectedEvent.type) }} />; })()}
            </div>
            <div style={{ flex: 1, fontSize: 10, fontFamily: "monospace", color: "#e4e4e7", wordBreak: "break-all" }}>{selectedEvent.value}</div>
            <button onClick={() => setSelectedEvent(null)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ fontSize: 9, color: "#71717a" }}>source: {selectedEvent.source} · confiance: {selectedEvent.confidence}%</div>
        </div>
      )}
    </div>
  );
}
