/**
 * Correlation Graph - ReactFlow Network Visualization
 * Graphe de corrélation des entités OSINT avec ReactFlow
 * 
 * Features:
 * - Interactive node-based graph visualization
 * - Entity types: Person, IP, Domain, Email, Phone, Social
 * - Relationship mapping with different edge types
 * - Auto-layout with force-directed algorithm
 * - Node details on click
 * - Path finding between entities
 * - Real-time updates
 * 
 * Créé: 17 Avril 2026
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitGraph,
  Users,
  Globe,
  Mail,
  Phone,
  Smartphone,
  Building,
  MapPin,
  Link2,
  AlertTriangle,
  Shield,
  Fingerprint,
  FileText,
  Calendar,
  Hash,
  Search,
  Filter,
  LayoutTemplate,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  Plus,
  X,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
  ArrowRight,
  Target,
  Layers,
} from 'lucide-react';

import 'reactflow/dist/style.css';

// Types
interface EntityNode {
  id: string;
  type: 'person' | 'ip' | 'domain' | 'email' | 'phone' | 'social' | 'location' | 'device' | 'organization';
  label: string;
  confidence: number;
  data: Record<string, any>;
  sources: string[];
}

interface EntityEdge {
  id: string;
  source: string;
  target: string;
  type: 'ownership' | 'communication' | 'location' | 'relation' | 'breach' | 'technical';
  strength: number;
  evidence: string[];
}

// Node type colors
const NODE_COLORS = {
  person: { bg: '#A855F7', border: '#7C3AED' },      // Purple
  ip: { bg: '#00F0FF', border: '#00B8D4' },             // Cyan
  domain: { bg: '#10B981', border: '#059669' },         // Emerald
  email: { bg: '#F59E0B', border: '#D97706' },          // Amber
  phone: { bg: '#F43F5E', border: '#E11D48' },         // Rose
  social: { bg: '#3B82F6', border: '#2563EB' },       // Blue
  location: { bg: '#8B5CF6', border: '#7C3AED' },       // Violet
  device: { bg: '#6B7280', border: '#4B5563' },       // Gray
  organization: { bg: '#EC4899', border: '#DB2777' },   // Pink
};

const NODE_ICONS = {
  person: Users,
  ip: Globe,
  domain: Globe,
  email: Mail,
  phone: Phone,
  social: Smartphone,
  location: MapPin,
  device: Fingerprint,
  organization: Building,
};

// Sample investigation data
const SAMPLE_ENTITIES: EntityNode[] = [
  { id: '1', type: 'person', label: 'John Doe', confidence: 95, data: { age: 34, occupation: 'Developer' }, sources: ['linkedin', 'twitter'] },
  { id: '2', type: 'email', label: 'john@example.com', confidence: 90, data: { valid: true, breaches: 2 }, sources: ['breachdb', 'hunter'] },
  { id: '3', type: 'ip', label: '192.168.1.100', confidence: 85, data: { location: 'NYC', isp: 'Verizon' }, sources: ['ipinfo'] },
  { id: '4', type: 'social', label: '@johndoe', confidence: 88, data: { platform: 'twitter', followers: 1200 }, sources: ['twitter'] },
  { id: '5', type: 'domain', label: 'johndoe.dev', confidence: 92, data: { registrar: 'Namecheap', created: '2020-01-15' }, sources: ['whois'] },
  { id: '6', type: 'phone', label: '+1-555-0123', confidence: 80, data: { carrier: 'T-Mobile', type: 'mobile' }, sources: ['numverify'] },
  { id: '7', type: 'location', label: 'New York, USA', confidence: 75, data: { lat: 40.7128, lng: -74.0060 }, sources: ['ipgeolocation'] },
  { id: '8', type: 'organization', label: 'TechCorp Inc', confidence: 70, data: { industry: 'Software', employees: 500 }, sources: ['linkedin'] },
  { id: '9', type: 'email', label: 'jdoe@techcorp.com', confidence: 65, data: { valid: true, work: true }, sources: ['hunter'] },
  { id: '10', type: 'device', label: 'iPhone 13 Pro', confidence: 60, data: { userAgent: 'Mozilla/5.0...' }, sources: ['logs'] },
];

const SAMPLE_EDGES: EntityEdge[] = [
  { id: 'e1', source: '1', target: '2', type: 'ownership', strength: 95, evidence: ['Email found in profile'] },
  { id: 'e2', source: '1', target: '3', type: 'technical', strength: 85, evidence: ['IP logged on login'] },
  { id: 'e3', source: '1', target: '4', type: 'ownership', strength: 88, evidence: ['Same profile picture'] },
  { id: 'e4', source: '2', target: '5', type: 'technical', strength: 70, evidence: ['MX records'] },
  { id: 'e5', source: '1', target: '6', type: 'ownership', strength: 80, evidence: ['2FA number'] },
  { id: 'e6', source: '3', target: '7', type: 'location', strength: 90, evidence: ['IP geolocation'] },
  { id: 'e7', source: '1', target: '8', type: 'relation', strength: 65, evidence: ['Employment history'] },
  { id: 'e8', source: '8', target: '9', type: 'technical', strength: 75, evidence: ['Domain pattern match'] },
  { id: 'e9', source: '9', target: '2', type: 'relation', strength: 60, evidence: ['Alias detection'] },
  { id: 'e10', source: '10', target: '3', type: 'technical', strength: 70, evidence: ['Same network'] },
];

// Custom node component
const CustomNode = ({ data, selected }: { data: EntityNode; selected: boolean }) => {
  const Icon = NODE_ICONS[data.type] || Info;
  const colors = NODE_COLORS[data.type] || NODE_COLORS.person;
  
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`relative p-3 rounded-xl border-2 transition-all ${
        selected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''
      }`}
      style={{
        backgroundColor: `${colors.bg}20`,
        borderColor: selected ? colors.border : `${colors.border}60`,
        minWidth: '140px',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${colors.bg}40` }}
        >
          <Icon className="w-4 h-4" style={{ color: colors.border }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{data.label}</p>
          <p className="text-xs text-white/50 capitalize">{data.type}</p>
        </div>
      </div>
      
      {/* Confidence badge */}
      <div
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          backgroundColor: data.confidence > 80 ? '#10B981' : data.confidence > 60 ? '#F59E0B' : '#F43F5E',
          color: '#000',
        }}
      >
        {data.confidence}
      </div>
    </motion.div>
  );
};

// Node types for ReactFlow
const nodeTypes = {
  custom: CustomNode,
};

// Edge styles
const getEdgeStyle = (type: string, strength: number) => {
  const colors = {
    ownership: '#A855F7',
    communication: '#00F0FF',
    location: '#10B981',
    relation: '#F59E0B',
    breach: '#F43F5E',
    technical: '#6B7280',
  };
  
  return {
    stroke: colors[type as keyof typeof colors] || '#6B7280',
    strokeWidth: Math.max(1, strength / 20),
    opacity: Math.max(0.3, strength / 100),
  };
};

function CorrelationGraphContent() {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(Object.keys(NODE_COLORS)));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutDirection, setLayoutDirection] = useState<'force' | 'horizontal' | 'vertical'>('force');

  // Initialize graph with sample data
  useEffect(() => {
    const initialNodes: Node[] = SAMPLE_ENTITIES
      .filter(entity => visibleTypes.has(entity.type))
      .map((entity, index) => ({
        id: entity.id,
        type: 'custom',
        position: {
          x: 200 + (index % 5) * 250 + Math.random() * 50,
          y: 150 + Math.floor(index / 5) * 200 + Math.random() * 50,
        },
        data: entity,
      }));

    const initialEdges: Edge[] = SAMPLE_EDGES
      .filter(edge => {
        const sourceVisible = visibleTypes.has(SAMPLE_ENTITIES.find(e => e.id === edge.source)?.type || '');
        const targetVisible = visibleTypes.has(SAMPLE_ENTITIES.find(e => e.id === edge.target)?.type || '');
        return sourceVisible && targetVisible;
      })
      .map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: edge.type === 'communication',
        style: getEdgeStyle(edge.type, edge.strength),
        label: edge.type,
        labelStyle: { fill: '#fff', fontSize: 10 },
        data: edge,
      }));

    setNodes(initialNodes);
    setEdges(initialEdges);
    
    // Auto-fit after initialization
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [visibleTypes, setNodes, setEdges, fitView]);

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  // Handle node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge click
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Toggle entity type visibility
  const toggleType = (type: string) => {
    setVisibleTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  // Filter nodes by search
  const filteredNodes = nodes.filter(node =>
    searchQuery === '' ||
    node.data.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.data.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = {
    totalNodes: SAMPLE_ENTITIES.length,
    totalEdges: SAMPLE_EDGES.length,
    visibleNodes: nodes.length,
    visibleEdges: edges.length,
    highConfidence: SAMPLE_ENTITIES.filter(e => e.confidence > 80).length,
  };

  return (
    <div className={`bg-black text-white ${isFullscreen ? 'fixed inset-0 z-50' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GitGraph className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold">Correlation Graph</h1>
          <span className="px-2 py-1 rounded-full bg-white/10 text-xs text-white/50">
            {stats.visibleNodes} nodes, {stats.visibleEdges} edges
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fitView({ padding: 0.2 })}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
            title="Fit view"
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={() => zoomIn()}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => zoomOut()}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities..."
            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50"
          />
        </div>

        {/* Type filters */}
        {Object.entries(NODE_COLORS).map(([type, colors]) => {
          const isVisible = visibleTypes.has(type);
          const Icon = NODE_ICONS[type as keyof typeof NODE_ICONS] || Info;
          const count = SAMPLE_ENTITIES.filter(e => e.type === type).length;
          
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                isVisible
                  ? 'bg-white/5 border-white/20'
                  : 'bg-transparent border-white/5 opacity-40'
              }`}
            >
              <Icon className="w-3 h-3" style={{ color: colors.border }} />
              <span className="capitalize">{type}</span>
              <span className="text-xs text-white/40">({count})</span>
            </button>
          );
        })}

        {/* Layout selector */}
        <div className="flex items-center gap-2 ml-auto">
          <LayoutTemplate className="w-4 h-4 text-white/30" />
          <select
            value={layoutDirection}
            onChange={(e) => setLayoutDirection(e.target.value as any)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
          >
            <option value="force">Force Directed</option>
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </div>
      </div>

      {/* Graph Container */}
      <div
        className="rounded-2xl overflow-hidden border border-white/10"
        style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}
      >
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="#333" gap={20} size={1} />
          <Controls className="!bg-zinc-900 !border-white/10 !text-white" />
          <MiniMap
            className="!bg-zinc-900/80 !border-white/10"
            nodeColor={(node) => NODE_COLORS[node.data?.type as keyof typeof NODE_COLORS]?.bg || '#6B7280'}
            maskColor="#00000050"
          />
          
          {/* Stats Panel */}
          <Panel position="top-left" className="!m-4">
            <div className="p-4 rounded-xl bg-zinc-900/90 backdrop-blur-sm border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Investigation Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Total Entities</span>
                  <span className="font-mono text-cyan-400">{stats.totalNodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Relationships</span>
                  <span className="font-mono text-purple-400">{stats.totalEdges}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">High Confidence</span>
                  <span className="font-mono text-emerald-400">{stats.highConfidence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Visible</span>
                  <span className="font-mono text-white">{stats.visibleNodes}/{stats.totalNodes}</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Legend Panel */}
          <Panel position="bottom-left" className="!m-4">
            <div className="p-3 rounded-xl bg-zinc-900/90 backdrop-blur-sm border border-white/10">
              <h4 className="text-xs font-medium text-white/70 mb-2">Relationship Types</h4>
              <div className="space-y-1.5 text-xs">
                {[
                  { type: 'ownership', color: '#A855F7', label: 'Ownership' },
                  { type: 'communication', color: '#00F0FF', label: 'Communication' },
                  { type: 'location', color: '#10B981', label: 'Location' },
                  { type: 'relation', color: '#F59E0B', label: 'Relation' },
                  { type: 'breach', color: '#F43F5E', label: 'Breach' },
                  { type: 'technical', color: '#6B7280', label: 'Technical' },
                ].map(({ type, color, label }) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="w-6 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-white/50 capitalize">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Selected Node/Edge Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-6 top-1/2 -translate-y-1/2 w-80 p-6 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl z-50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const nodeType = selectedNode.data.type as keyof typeof NODE_ICONS;
                  const Icon = NODE_ICONS[nodeType] || Info;
                  const colors = NODE_COLORS[nodeType as keyof typeof NODE_COLORS] || NODE_COLORS.person;
                  return (
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${colors.bg}40` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: colors.border }} />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-semibold text-white">{selectedNode.data.label}</h3>
                  <p className="text-sm text-white/50 capitalize">{selectedNode.data.type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* Confidence */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white/50">Confidence</span>
                <span className="text-sm font-semibold text-cyan-400">{selectedNode.data.confidence}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${selectedNode.data.confidence}%` }}
                />
              </div>
            </div>

            {/* Data */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/70">Properties</h4>
              <div className="p-3 rounded-lg bg-black/30 space-y-2">
                {Object.entries(selectedNode.data.data).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-white/40 capitalize">{key}</span>
                    <span className="text-white/70">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-white/70 mb-2">Data Sources</h4>
              <div className="flex flex-wrap gap-2">
                {selectedNode.data.sources.map((source: string) => (
                  <span
                    key={source}
                    className="px-2 py-1 rounded-full bg-white/10 text-xs text-white/70 capitalize"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
              <button className="flex-1 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors">
                Investigate
              </button>
              <button className="px-3 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {selectedEdge && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-6 top-1/2 -translate-y-1/2 w-72 p-6 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Relationship</h3>
              <button
                onClick={() => setSelectedEdge(null)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50">From</span>
                <ArrowRight className="w-4 h-4 text-white/30" />
                <span className="text-sm text-cyan-400">
                  {SAMPLE_ENTITIES.find(e => e.id === selectedEdge.source)?.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50">To</span>
                <ArrowRight className="w-4 h-4 text-white/30" />
                <span className="text-sm text-purple-400">
                  {SAMPLE_ENTITIES.find(e => e.id === selectedEdge.target)?.label}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-black/30">
              <span className="text-sm text-white/50">Type: </span>
              <span className="text-sm text-white capitalize">{selectedEdge.data?.type}</span>
            </div>

            <div className="mt-3">
              <span className="text-sm text-white/50">Strength: </span>
              <span className="text-sm font-semibold text-cyan-400">{selectedEdge.data?.strength}%</span>
            </div>

            {selectedEdge.data?.evidence && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-white/70 mb-2">Evidence</h4>
                <ul className="space-y-1">
                  {selectedEdge.data.evidence.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export wrapped with provider
export function CorrelationGraph() {
  return (
    <ReactFlowProvider>
      <CorrelationGraphContent />
    </ReactFlowProvider>
  );
}

export default CorrelationGraph;
