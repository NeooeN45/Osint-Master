import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { ExternalLink, ChevronDown, Hash } from "lucide-react";
import { Entity, Correlation, ETYPE_ICONS, ec } from "./constants";

interface Props {
  entity: Entity;
  correlations: Correlation[];
  entities: Entity[];
}

export default function EntityCard({ entity, correlations, entities }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = ETYPE_ICONS[entity.type] || Hash;
  const c = ec(entity.type);
  const isUrl = entity.value.startsWith("http");
  const confC = entity.confidence >= 80 ? "#34d399" : entity.confidence >= 50 ? "#fbbf24" : "#f87171";

  const rels = useMemo(() =>
    correlations
      .filter(x => x.from === entity.id || x.to === entity.id)
      .map(x => {
        const otherId = x.from === entity.id ? x.to : x.from;
        const other = entities.find(e => e.id === otherId);
        return other ? { ...x, other } : null;
      })
      .filter(Boolean) as Array<Correlation & { other: Entity }>,
    [entity.id, correlations, entities]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        borderRadius: 10, border: "1px solid rgba(255,255,255,.06)",
        overflow: "hidden", background: `${c}06`, transition: "border-color .15s",
      }}
      onMouseOver={e => (e.currentTarget.style.borderColor = `${c}28`)}
      onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,.06)")}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 11px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ width: 25, height: 25, borderRadius: 7, background: `${c}18`, border: `1px solid ${c}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <Icon style={{ width: 11, height: 11, color: c }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "1px 5px", borderRadius: 4, background: `${c}18`, color: c }}>{entity.type}</span>
            <span style={{ fontSize: 8, fontFamily: "monospace", color: confC, fontWeight: 700 }}>{entity.confidence}%</span>
            {entity.verified && <span style={{ fontSize: 7, color: "#34d399" }}>✓</span>}
            {entity.depth > 0 && <span style={{ fontSize: 7, color: "#52525b" }}>d:{entity.depth}</span>}
            {rels.length > 0 && <span style={{ fontSize: 7, color: "#a78bfa" }}>↔{rels.length}</span>}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#e4e4e7", wordBreak: "break-all", lineHeight: 1.4 }}>
            {entity.value.length > 80 ? entity.value.slice(0, 77) + "..." : entity.value}
          </div>
          <div style={{ fontSize: 8, color: "#52525b", marginTop: 2 }}>{entity.source}</div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {isUrl && (
            <a href={entity.value} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#71717a", display: "flex" }}>
              <ExternalLink style={{ width: 9, height: 9 }} />
            </a>
          )}
          <ChevronDown style={{ width: 9, height: 9, color: "#3f3f46", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 11px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(entity.metadata || {})
            .filter(([, v]) => v != null && v !== "" && v !== false)
            .map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 6, fontSize: 9 }}>
                <span style={{ color: "#3f3f46", minWidth: 80, flexShrink: 0 }}>{k}:</span>
                <span style={{ color: "#a1a1aa", wordBreak: "break-all" }}>
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          {rels.length > 0 && (
            <div style={{ marginTop: 5, borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 5 }}>
              <div style={{ fontSize: 8, color: "#52525b", marginBottom: 3 }}>Corrélations ({rels.length})</div>
              {rels.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, marginBottom: 2 }}>
                  <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: "rgba(167,139,250,.1)", color: "#a78bfa", flexShrink: 0 }}>{r.type}</span>
                  <span style={{ color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.other.value.slice(0, 50)}</span>
                  <span style={{ fontSize: 8, color: "#52525b", fontFamily: "monospace" }}>{r.strength}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
