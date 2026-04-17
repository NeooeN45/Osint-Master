// RelationGraph — Graphe de relations force-directed entre entités OSINT
// Utilise ReactFlow avec disposition en cercles concentriques par type

import { useMemo, useCallback, useState, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
  type Edge,
  Handle,
  Position,
  MarkerType,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Entity, Correlation, ETYPE_ICONS, ec } from "../constants";
import { Hash, Lock, Search, X, ZoomIn, ZoomOut, Maximize2, Filter } from "lucide-react";

interface Props {
  entities: Entity[];
  correlations: Correlation[];
  target: string;
}

// ─── Custom Node ──────────────────────────────────────────────────────────────
function EntityNode({ data }: { data: any }) {
  const Icon = ETYPE_ICONS[data.type] || Hash;
  const color = ec(data.type);
  const isRoot = data.isRoot;
  const size = isRoot ? 68 : 52;
  const iconSize = isRoot ? 18 : 14;
  const confColor = data.confidence >= 80 ? "#34d399" : data.confidence >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}35 0%, ${color}08 70%)`,
        border: `2px solid ${isRoot ? "#22d3ee" : `${color}80`}`,
        boxShadow: isRoot
          ? `0 0 24px rgba(34,211,238,.6), 0 0 40px rgba(34,211,238,.25)`
          : `0 0 16px ${color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 1,
        position: "relative",
        cursor: "pointer",
        transition: "transform .2s",
      }}
      className="hover:scale-110"
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />

      <Icon style={{ width: iconSize, height: iconSize, color }} />
      {isRoot && (
        <div style={{ fontSize: 7, fontWeight: 900, color: "#22d3ee", letterSpacing: 1 }}>CIBLE</div>
      )}

      {/* Label below node */}
      <div style={{
        position: "absolute", top: size + 4, left: "50%", transform: "translateX(-50%)",
        fontSize: 9, color: "#e4e4e7", fontFamily: "monospace",
        whiteSpace: "nowrap", textAlign: "center", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis",
        pointerEvents: "none",
        textShadow: "0 1px 2px rgba(0,0,0,.9)"
      }}>
        {data.label.length > 24 ? data.label.slice(0, 22) + "…" : data.label}
      </div>

      {/* Confidence badge */}
      <div style={{
        position: "absolute", top: -4, right: -4,
        fontSize: 7, fontWeight: 800, padding: "1px 4px",
        borderRadius: 99, background: "#0a0c12",
        border: `1px solid ${confColor}`,
        color: confColor,
      }}>{data.confidence}</div>

      {/* Depth badge */}
      {data.depth > 0 && (
        <div style={{
          position: "absolute", bottom: -4, left: -4,
          fontSize: 7, fontWeight: 800, padding: "1px 4px",
          borderRadius: 99, background: "#0a0c12",
          border: `1px solid #71717a`,
          color: "#a1a1aa",
        }}>d{data.depth}</div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { entity: EntityNode };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RelationGraph({ entities, correlations, target }: Props) {
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<"radial" | "grid" | "clustered">("radial");

  // Détermine si entité est "racine" (la cible initiale)
  const isRootEntity = useCallback((e: Entity) => {
    const t = target.toLowerCase().replace(/^@/, "");
    return e.value.toLowerCase() === t || e.value.toLowerCase().includes(t);
  }, [target]);

  // Compute layout positions
  const { initialNodes, initialEdges } = useMemo(() => {
    if (entities.length === 0) return { initialNodes: [], initialEdges: [] };

    const filtered = typeFilter ? entities.filter(e => e.type === typeFilter) : entities;

    // Group by type for radial layout
    const byType = new Map<string, Entity[]>();
    filtered.forEach(e => {
      if (!byType.has(e.type)) byType.set(e.type, []);
      byType.get(e.type)!.push(e);
    });

    const types = Array.from(byType.keys());
    const cx = 0, cy = 0;
    const nodes: Node[] = [];

    if (layoutMode === "radial") {
      // Root at center
      const roots = filtered.filter(isRootEntity);
      roots.forEach((e, i) => {
        nodes.push({
          id: e.id, type: "entity",
          position: { x: cx - 35 + i * 80, y: cy - 35 },
          data: { label: e.value, type: e.type, confidence: e.confidence, depth: e.depth, isRoot: true, entity: e },
          draggable: true,
        });
      });

      // Other types arranged in concentric rings
      let ringIdx = 0;
      types.forEach(type => {
        const items = byType.get(type)!.filter(e => !isRootEntity(e));
        if (items.length === 0) return;
        const radius = 180 + ringIdx * 110;
        const angleStep = (Math.PI * 2) / Math.max(items.length, 1);
        const typeOffset = types.indexOf(type) * 0.3;
        items.forEach((e, i) => {
          const angle = angleStep * i + typeOffset;
          nodes.push({
            id: e.id, type: "entity",
            position: { x: cx + Math.cos(angle) * radius - 26, y: cy + Math.sin(angle) * radius - 26 },
            data: { label: e.value, type: e.type, confidence: e.confidence, depth: e.depth, isRoot: false, entity: e },
            draggable: true,
          });
        });
        ringIdx++;
      });
    } else if (layoutMode === "clustered") {
      // Cluster by type in separated groups
      const cols = Math.ceil(Math.sqrt(types.length));
      const clusterSize = 340;
      types.forEach((type, ti) => {
        const items = byType.get(type)!;
        const col = ti % cols, row = Math.floor(ti / cols);
        const ccx = col * clusterSize - (cols - 1) * clusterSize / 2;
        const ccy = row * clusterSize - Math.floor(types.length / cols) * clusterSize / 2;
        items.forEach((e, i) => {
          const angle = (Math.PI * 2 * i) / Math.max(items.length, 1);
          const r = Math.min(40 + items.length * 6, 130);
          nodes.push({
            id: e.id, type: "entity",
            position: { x: ccx + Math.cos(angle) * r - 26, y: ccy + Math.sin(angle) * r - 26 },
            data: { label: e.value, type: e.type, confidence: e.confidence, depth: e.depth, isRoot: isRootEntity(e), entity: e },
            draggable: true,
          });
        });
      });
    } else {
      // Grid layout
      filtered.forEach((e, i) => {
        const cols = 8;
        nodes.push({
          id: e.id, type: "entity",
          position: { x: (i % cols) * 130 - cols * 65, y: Math.floor(i / cols) * 130 },
          data: { label: e.value, type: e.type, confidence: e.confidence, depth: e.depth, isRoot: isRootEntity(e), entity: e },
          draggable: true,
        });
      });
    }

    // Build edges from correlations
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges: Edge[] = [];
    correlations.forEach((c, i) => {
      if (!nodeIds.has(c.from) || !nodeIds.has(c.to)) return;
      const strong = c.strength >= 80;
      edges.push({
        id: c.id || `e${i}`,
        source: c.from, target: c.to,
        type: "straight",
        animated: strong,
        style: {
          stroke: strong ? "#22d3ee" : "#52525b",
          strokeWidth: Math.max(1, c.strength / 40),
          opacity: 0.55,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: strong ? "#22d3ee" : "#52525b", width: 12, height: 12 },
      });
    });

    // Auto-connect root → children if no explicit correlations
    if (edges.length === 0) {
      const roots = nodes.filter(n => n.data.isRoot);
      if (roots.length > 0) {
        const root = roots[0];
        nodes.forEach(n => {
          if (n.id === root.id) return;
          if (n.data.confidence < 50) return;
          edges.push({
            id: `auto-${n.id}`,
            source: root.id, target: n.id,
            type: "straight",
            style: { stroke: `${ec(n.data.type)}50`, strokeWidth: 1, opacity: 0.3 },
          });
        });
      }
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [entities, correlations, target, typeFilter, layoutMode, isRootEntity]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Re-apply layout when deps change
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.data.entity);
  }, []);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    entities.forEach(e => { m[e.type] = (m[e.type] || 0) + 1; });
    return m;
  }, [entities]);

  if (entities.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#3f3f46" }}>
        <ZoomIn style={{ width: 44, height: 44, opacity: 0.15 }} />
        <div style={{ fontSize: 12, color: "#52525b" }}>Aucune entité — lancez une investigation</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
        borderBottom: "1px solid rgba(255,255,255,.05)",
        background: "rgba(8,10,18,.7)", backdropFilter: "blur(12px)",
        flexShrink: 0,
      }}>
        <Filter style={{ width: 11, height: 11, color: "#71717a" }} />
        <button onClick={() => setTypeFilter(null)}
          style={{ padding: "3px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700,
            cursor: "pointer", background: !typeFilter ? "rgba(255,255,255,.1)" : "transparent",
            border: `1px solid ${!typeFilter ? "rgba(255,255,255,.2)" : "transparent"}`,
            color: !typeFilter ? "#f4f4f5" : "#71717a" }}>
          Tout ({entities.length})
        </button>
        {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, n]) => {
          const Icon = ETYPE_ICONS[t] || Hash;
          const active = typeFilter === t;
          return (
            <button key={t} onClick={() => setTypeFilter(active ? null : t)}
              style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 7px",
                borderRadius: 5, fontSize: 9, fontWeight: 700, cursor: "pointer",
                background: active ? `${ec(t)}22` : "transparent",
                border: `1px solid ${active ? `${ec(t)}50` : "transparent"}`,
                color: active ? ec(t) : "#71717a" }}>
              <Icon style={{ width: 8, height: 8 }} />{t}({n})
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
          {(["radial", "clustered", "grid"] as const).map(m => (
            <button key={m} onClick={() => setLayoutMode(m)}
              style={{ padding: "3px 8px", fontSize: 9, fontWeight: 700, borderRadius: 4,
                cursor: "pointer", background: layoutMode === m ? "rgba(34,211,238,.15)" : "transparent",
                border: "none", color: layoutMode === m ? "#22d3ee" : "#71717a",
                textTransform: "capitalize" }}>{m}</button>
          ))}
        </div>
        <div style={{ fontSize: 9, color: "#52525b", fontFamily: "monospace" }}>
          {nodes.length} nœuds · {edges.length} liens
        </div>
      </div>

      {/* Graph */}
      <div style={{ flex: 1, background: "radial-gradient(circle at center, #0f1520 0%, #07090f 100%)", position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, minZoom: 0.2, maxZoom: 1.8 }}
          minZoom={0.15}
          maxZoom={3}
          connectionLineType={ConnectionLineType.Straight}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        >
          <Background color="#1a2030" gap={40} size={1} />
          <Controls
            style={{
              background: "rgba(8,10,18,.9)", border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 8, overflow: "hidden",
            }}
            showInteractive={false}
          />
          <MiniMap
            style={{
              background: "rgba(8,10,18,.9)", border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 8, width: 160, height: 100,
            }}
            nodeColor={(n: any) => ec(n.data.type)}
            maskColor="rgba(0,0,0,.6)"
            pannable zoomable
          />
        </ReactFlow>

        {/* Selected node details panel */}
        {selectedNode && (
          <div style={{
            position: "absolute", top: 12, right: 12, width: 280,
            background: "rgba(10,12,20,.96)", backdropFilter: "blur(20px)",
            border: `1px solid ${ec(selectedNode.type)}50`, borderRadius: 10,
            padding: 12, zIndex: 10,
            boxShadow: `0 8px 32px rgba(0,0,0,.6), 0 0 24px ${ec(selectedNode.type)}20`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${ec(selectedNode.type)}20`, border: `1px solid ${ec(selectedNode.type)}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {(() => { const I = ETYPE_ICONS[selectedNode.type] || Hash; return <I style={{ width: 15, height: 15, color: ec(selectedNode.type) }} />; })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: ec(selectedNode.type) }}>{selectedNode.type}</div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: "#e4e4e7", wordBreak: "break-all" }}>{selectedNode.value}</div>
              </div>
              <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", padding: 2 }}>
                <X style={{ width: 11, height: 11 }} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 9 }}>
              <span style={{ color: "#71717a" }}>source: <strong style={{ color: "#a1a1aa" }}>{selectedNode.source}</strong></span>
              <span style={{ color: "#71717a" }}>conf: <strong style={{ color: selectedNode.confidence >= 80 ? "#34d399" : selectedNode.confidence >= 50 ? "#fbbf24" : "#f87171" }}>{selectedNode.confidence}%</strong></span>
              {selectedNode.depth > 0 && <span style={{ color: "#71717a" }}>d:{selectedNode.depth}</span>}
            </div>
            {Object.entries(selectedNode.metadata || {}).filter(([, v]) => v != null && v !== "" && v !== false).slice(0, 8).map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 6, fontSize: 9, marginBottom: 2 }}>
                <span style={{ color: "#3f3f46", minWidth: 70, flexShrink: 0 }}>{k}:</span>
                <span style={{ color: "#a1a1aa", wordBreak: "break-all" }}>
                  {typeof v === "object" ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80)}
                </span>
              </div>
            ))}
            {selectedNode.value.startsWith("http") && (
              <a href={selectedNode.value} target="_blank" rel="noreferrer"
                style={{ display: "inline-block", marginTop: 8, padding: "4px 10px", borderRadius: 6,
                  background: `${ec(selectedNode.type)}18`, border: `1px solid ${ec(selectedNode.type)}40`,
                  color: ec(selectedNode.type), fontSize: 9, fontWeight: 700, textDecoration: "none" }}>
                Ouvrir ↗
              </a>
            )}
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: 12, left: 12,
          background: "rgba(8,10,18,.85)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,.08)", borderRadius: 8,
          padding: "7px 10px", zIndex: 10,
          maxWidth: 260,
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#71717a", marginBottom: 5 }}>Légende</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 9 }}>
            {Object.entries(typeCounts).slice(0, 6).map(([t, n]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: ec(t), boxShadow: `0 0 4px ${ec(t)}` }} />
                <span style={{ color: "#a1a1aa" }}>{t} <span style={{ color: "#52525b" }}>({n})</span></span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 8, fontSize: 8, color: "#52525b" }}>
            <span><span style={{ color: "#22d3ee" }}>━</span> fort (≥80%)</span>
            <span><span style={{ color: "#52525b" }}>━</span> faible</span>
          </div>
        </div>
      </div>
    </div>
  );
}
