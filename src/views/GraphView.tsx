import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { useCaseStore } from "../store/useCaseStore";
import { Trash2, ZoomIn } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  person: "#3b82f6",
  email: "#eab308",
  ip: "#ef4444",
  domain: "#8b5cf6",
  phone: "#22c55e",
  username: "#06b6d4",
  organization: "#f97316",
  location: "#10b981",
  crypto: "#f59e0b",
  unknown: "#64748b",
};

function EntityNode({ data }: { data: { label: string; type: string; value: string; confidence: number } }) {
  const color = TYPE_COLORS[data.type] ?? "#64748b";
  return (
    <div
      className="px-3 py-2 rounded-xl border text-xs font-mono max-w-[160px]"
      style={{
        background: `${color}18`,
        borderColor: `${color}60`,
        boxShadow: `0 0 12px ${color}30`,
      }}
    >
      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color }}>
        {data.type}
      </div>
      <div className="text-white font-medium truncate">{data.value}</div>
      <div className="text-slate-500 text-[10px] mt-0.5">{data.confidence}% confiance</div>
    </div>
  );
}

const nodeTypes: NodeTypes = { entity: EntityNode };

export default function GraphView() {
  const { getActiveCase, deleteEntity, deleteRelation } = useCaseStore();
  const activeCase = getActiveCase();

  const initialNodes = useMemo(() => {
    if (!activeCase) return [];
    return activeCase.entities.map((e, i) => ({
      id: e.id,
      type: "entity",
      position: {
        x: 120 + (i % 5) * 200,
        y: 100 + Math.floor(i / 5) * 150,
      },
      data: { label: e.value, type: e.type, value: e.value, confidence: e.confidence },
    }));
  }, [activeCase]);

  const initialEdges = useMemo(() => {
    if (!activeCase) return [];
    return activeCase.relations.map((r) => ({
      id: r.id,
      source: r.sourceId,
      target: r.targetId,
      label: r.label ?? r.type,
      type: "smoothstep",
      animated: r.strength > 70,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#06b6d4" },
      style: { stroke: "#06b6d4", strokeWidth: 1.5, opacity: 0.7 },
      labelStyle: { fill: "#94a3b8", fontSize: 10 },
      labelBgStyle: { fill: "#0f0f1a" },
    }));
  }, [activeCase]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#06b6d4" } }, eds)),
    [setEdges]
  );

  if (!activeCase) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        <div className="text-center">
          <ZoomIn className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Aucun dossier actif</p>
        </div>
      </div>
    );
  }

  if (activeCase.entities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600">
        <div className="text-center">
          <ZoomIn className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Aucune entité — lancez un outil OSINT</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-surface-2/90 backdrop-blur border border-border rounded-xl px-3 py-1.5">
        <span className="text-xs text-slate-500">
          {activeCase.entities.length} entités · {activeCase.relations.length} relations
        </span>
        <div className="w-px h-4 bg-border" />
        <button
          onClick={() => {
            if (confirm("Supprimer toutes les entités ?")) {
              activeCase.entities.forEach((e) => deleteEntity(e.id));
            }
          }}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Effacer
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: "#0a0a0f" }}
        defaultEdgeOptions={{ animated: false, style: { stroke: "#06b6d4" } }}
      >
        <Background color="#1a1a35" gap={32} size={1} />
        <Controls
          style={{
            background: "#0f0f1a",
            border: "1px solid #1e1e35",
            borderRadius: "8px",
          }}
        />
        <MiniMap
          style={{ background: "#0f0f1a", border: "1px solid #1e1e35" }}
          nodeColor={(n) => TYPE_COLORS[(n.data as { type: string }).type] ?? "#64748b"}
          maskColor="#0a0a0f99"
        />
      </ReactFlow>
    </div>
  );
}
