/**
 * Globe Visualization - Three.js Interactive Globe
 * Visualisation 3D des données OSINT sur un globe terrestre interactif
 * 
 * Features:
 * - Interactive 3D globe with Three.js
 * - Data points for IP locations, breaches, social profiles
 * - Connection arcs between related entities
 * - Real-time animation and interactions
 * - Zoom, rotate, pan controls
 * - Heat map overlay for data density
 * 
 * Créé: 17 Avril 2026
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Globe,
  MapPin,
  Target,
  Users,
  Server,
  Shield,
  AlertTriangle,
  Activity,
  Maximize2,
  Minimize2,
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  Info,
  X,
} from 'lucide-react';

// Types
interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  type: 'ip' | 'breach' | 'social' | 'server' | 'target' | 'vpn';
  label: string;
  value?: number;
  metadata?: Record<string, any>;
}

interface ConnectionArc {
  from: GeoPoint;
  to: GeoPoint;
  strength: number;
  type: 'connection' | 'attack' | 'dataflow';
}

interface GlobeData {
  points: GeoPoint[];
  connections: ConnectionArc[];
}

const POINT_COLORS = {
  ip: '#00F0FF',      // Cyan
  breach: '#F43F5E',  // Rose
  social: '#A855F7',  // Purple
  server: '#10B981',  // Emerald
  target: '#F59E0B',  // Amber
  vpn: '#3B82F6',     // Blue
};

const POINT_ICONS = {
  ip: MapPin,
  breach: AlertTriangle,
  social: Users,
  server: Server,
  target: Target,
  vpn: Shield,
};

// Sample data for demo
const SAMPLE_DATA: GlobeData = {
  points: [
    { id: '1', lat: 40.7128, lng: -74.0060, type: 'target', label: 'Target NYC', value: 100 },
    { id: '2', lat: 51.5074, lng: -0.1278, type: 'ip', label: 'IP London', value: 75 },
    { id: '3', lat: 48.8566, lng: 2.3522, type: 'breach', label: 'Breach Paris', value: 50 },
    { id: '4', lat: 35.6762, lng: 139.6503, type: 'server', label: 'Server Tokyo', value: 80 },
    { id: '5', lat: -33.8688, lng: 151.2093, type: 'social', label: 'Profile Sydney', value: 60 },
    { id: '6', lat: 55.7558, lng: 37.6173, type: 'ip', label: 'IP Moscow', value: 40 },
    { id: '7', lat: 1.3521, lng: 103.8198, type: 'vpn', label: 'VPN Singapore', value: 90 },
    { id: '8', lat: 52.5200, lng: 13.4050, type: 'breach', label: 'Breach Berlin', value: 65 },
    { id: '9', lat: 37.7749, lng: -122.4194, type: 'server', label: 'Server SF', value: 85 },
    { id: '10', lat: 19.4326, lng: -99.1332, type: 'social', label: 'Profile Mexico', value: 45 },
  ],
  connections: [
    { from: { id: '1', lat: 40.7128, lng: -74.0060, type: 'target', label: 'NYC' }, to: { id: '2', lat: 51.5074, lng: -0.1278, type: 'ip', label: 'London' }, strength: 0.8, type: 'connection' },
    { from: { id: '2', lat: 51.5074, lng: -0.1278, type: 'ip', label: 'London' }, to: { id: '4', lat: 35.6762, lng: 139.6503, type: 'server', label: 'Tokyo' }, strength: 0.6, type: 'dataflow' },
    { from: { id: '1', lat: 40.7128, lng: -74.0060, type: 'target', label: 'NYC' }, to: { id: '7', lat: 1.3521, lng: 103.8198, type: 'vpn', label: 'Singapore' }, strength: 0.9, type: 'connection' },
    { from: { id: '7', lat: 1.3521, lng: 103.8198, type: 'vpn', label: 'Singapore' }, to: { id: '4', lat: 35.6762, lng: 139.6503, type: 'server', label: 'Tokyo' }, strength: 0.7, type: 'connection' },
    { from: { id: '3', lat: 48.8566, lng: 2.3522, type: 'breach', label: 'Paris' }, to: { id: '8', lat: 52.5200, lng: 13.4050, type: 'breach', label: 'Berlin' }, strength: 0.5, type: 'attack' },
  ],
};

export function GlobeVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    globe: THREE.Mesh;
    controls: OrbitControls;
    pointsGroup: THREE.Group;
    connectionsGroup: THREE.Group;
    atmosphere: THREE.Mesh;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(Object.keys(POINT_COLORS)));
  const [showConnections, setShowConnections] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [data, setData] = useState<GlobeData>(SAMPLE_DATA);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 3.5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Globe
    const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Create earth texture using canvas (gradient to simulate earth)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a3a');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    
    // Add some "continents" (random shapes)
    ctx.fillStyle = '#2a2a4a';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * 512,
        Math.random() * 256,
        Math.random() * 40 + 20,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    
    const earthTexture = new THREE.CanvasTexture(canvas);
    
    const globeMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      emissive: new THREE.Color(0x112244),
      emissiveIntensity: 0.1,
      shininess: 10,
    });
    
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(1.1, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 3, 5);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x00F0FF, 0.5);
    pointLight2.position.set(-5, -3, -5);
    scene.add(pointLight2);

    // Groups for points and connections
    const pointsGroup = new THREE.Group();
    const connectionsGroup = new THREE.Group();
    globe.add(pointsGroup);
    globe.add(connectionsGroup);

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      globe,
      controls,
      pointsGroup,
      connectionsGroup,
      atmosphere,
    };

    // Render data points
    renderDataPoints();
    renderConnections();

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    setIsLoading(false);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Render data points on globe
  const renderDataPoints = useCallback(() => {
    if (!sceneRef.current) return;

    const { pointsGroup, globe } = sceneRef.current;
    pointsGroup.clear();

    data.points
      .filter(point => visibleTypes.has(point.type))
      .forEach(point => {
        // Convert lat/lng to 3D position
        const phi = (90 - point.lat) * (Math.PI / 180);
        const theta = (point.lng + 180) * (Math.PI / 180);
        
        const radius = 1.02; // Slightly above globe surface
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);

        // Point geometry
        const geometry = new THREE.SphereGeometry(0.03 + (point.value || 50) / 2000, 16, 16);
        const material = new THREE.MeshBasicMaterial({
          color: POINT_COLORS[point.type],
          transparent: true,
          opacity: 0.9,
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.userData = { point };
        
        // Glow effect
        const glowGeometry = new THREE.SphereGeometry(0.06 + (point.value || 50) / 1500, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: POINT_COLORS[point.type],
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(x, y, z);
        
        pointsGroup.add(mesh);
        pointsGroup.add(glow);

        // Animation
        const animatePulse = () => {
          const scale = 1 + Math.sin(Date.now() * 0.003 + point.lat) * 0.2;
          glow.scale.setScalar(scale);
          requestAnimationFrame(animatePulse);
        };
        animatePulse();
      });
  }, [data.points, visibleTypes]);

  // Render connection arcs
  const renderConnections = useCallback(() => {
    if (!sceneRef.current || !showConnections) {
      if (sceneRef.current) {
        sceneRef.current.connectionsGroup.clear();
      }
      return;
    }

    const { connectionsGroup } = sceneRef.current;
    connectionsGroup.clear();

    data.connections.forEach(connection => {
      const { from, to, strength, type } = connection;
      
      // Convert lat/lng to 3D
      const getPosition = (lat: number, lng: number, radius: number) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(
          -(radius * Math.sin(phi) * Math.cos(theta)),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        );
      };

      const start = getPosition(from.lat, from.lng, 1.02);
      const end = getPosition(to.lat, to.lng, 1.02);

      // Create arc
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(1.5); // Arc height

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const color = type === 'attack' ? 0xF43F5E : type === 'dataflow' ? 0x00F0FF : 0xA855F7;
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: strength * 0.6,
        linewidth: strength * 2,
      });

      const line = new THREE.Line(geometry, material);
      connectionsGroup.add(line);

      // Animate line drawing
      let drawRange = 0;
      const animateLine = () => {
        drawRange += 0.5;
        if (drawRange <= 50) {
          geometry.setDrawRange(0, drawRange);
          requestAnimationFrame(animateLine);
        }
      };
      animateLine();
    });
  }, [data.connections, showConnections]);

  // Update when data changes
  useEffect(() => {
    renderDataPoints();
  }, [renderDataPoints]);

  useEffect(() => {
    renderConnections();
  }, [renderConnections]);

  // Toggle point type visibility
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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (sceneRef.current && containerRef.current) {
        const { camera, renderer } = sceneRef.current;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    }, 100);
  };

  // Reset view
  const resetView = () => {
    if (sceneRef.current) {
      const { camera, controls } = sceneRef.current;
      camera.position.set(0, 0, 3.5);
      controls.reset();
    }
  };

  // Toggle auto-rotate
  const toggleAutoRotate = () => {
    if (sceneRef.current) {
      sceneRef.current.controls.autoRotate = !autoRotate;
      setAutoRotate(!autoRotate);
    }
  };

  // Handle point click
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!sceneRef.current) return;
    
    const { camera, renderer, pointsGroup } = sceneRef.current;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(pointsGroup.children);
    if (intersects.length > 0) {
      const point = intersects[0].object.userData.point;
      setSelectedPoint(point);
    } else {
      setSelectedPoint(null);
    }
  };

  return (
    <div className={`bg-black text-white ${isFullscreen ? 'fixed inset-0 z-50' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold">Global OSINT Visualization</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoRotate}
            className={`p-2 rounded-lg transition-colors ${autoRotate ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/50'}`}
          >
            <RotateCcw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Type filters */}
        {Object.entries(POINT_COLORS).map(([type, color]) => {
          const Icon = POINT_ICONS[type as keyof typeof POINT_ICONS] || MapPin;
          const isVisible = visibleTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                isVisible
                  ? 'bg-white/5 border-white/20'
                  : 'bg-transparent border-white/5 opacity-50'
              }`}
            >
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-sm capitalize">{type}</span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isVisible ? color : 'transparent' }}
              />
            </button>
          );
        })}

        {/* Connection toggle */}
        <button
          onClick={() => setShowConnections(!showConnections)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
            showConnections ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/20'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm">Connections</span>
          {showConnections ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
      </div>

      {/* Globe Container */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-zinc-900 to-black border border-white/10"
        style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '500px' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-3 text-white/50">
              <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <span>Initializing 3D Globe...</span>
            </div>
          </div>
        )}

        {/* Stats overlay */}
        <div className="absolute top-4 left-4 p-4 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <span className="text-white/50">Total Points</span>
            <span className="text-cyan-400 font-mono">{data.points.length}</span>
            <span className="text-white/50">Connections</span>
            <span className="text-purple-400 font-mono">{data.connections.length}</span>
            <span className="text-white/50">Active Types</span>
            <span className="text-emerald-400 font-mono">{visibleTypes.size}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10">
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-white/70">Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-white/70">Attack/Breach</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-white/70">Data Flow</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Point Info */}
      <AnimatePresence>
        {selectedPoint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 p-6 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl z-50 max-w-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${POINT_COLORS[selectedPoint.type]}20` }}
                >
                  {(() => {
                    const Icon = POINT_ICONS[selectedPoint.type] || MapPin;
                    return <Icon className="w-5 h-5" style={{ color: POINT_COLORS[selectedPoint.type] }} />;
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{selectedPoint.label}</h3>
                  <p className="text-sm text-white/50 capitalize">{selectedPoint.type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Latitude</span>
                <span className="font-mono text-cyan-400">{selectedPoint.lat.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Longitude</span>
                <span className="font-mono text-cyan-400">{selectedPoint.lng.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Significance</span>
                <span className="font-mono text-purple-400">{selectedPoint.value}%</span>
              </div>
            </div>

            {selectedPoint.metadata && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-white/70 mb-2">Metadata</h4>
                <pre className="text-xs text-white/50 bg-black/30 p-2 rounded-lg overflow-auto max-h-32">
                  {JSON.stringify(selectedPoint.metadata, null, 2)}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-start gap-2 text-sm text-white/50">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Click on data points to view details. Drag to rotate, scroll to zoom. 
            Use filters to show/hide specific data types. Connections show relationships between entities.
          </p>
        </div>
      </div>
    </div>
  );
}

export default GlobeVisualization;
