// ============================================================================
// GLOBE 3D INTERACTIF - OSINT Master Pro
// Three.js globe with dark theme, location markers, buffer zones
// Inspired by: globe.gl, cesium, windy.com, earth.nullschool.net
// ============================================================================

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  MapPin, Layers, ZoomIn, ZoomOut, RotateCcw, X,
  Globe, SatelliteDish, Map, Eye, EyeOff, Menu,
  Loader2, Search, ChevronLeft, ChevronRight,
  Settings2, Radio
} from "lucide-react";

// ---- Types ----
interface DeepEntity {
  id: string;
  type: string;
  value: string;
  source: string;
  confidence: number;
  metadata?: Record<string, any>;
}

interface GeoPoint {
  entity: DeepEntity;
  lat: number;
  lng: number;
  label: string;
}

interface Globe3DProps {
  entities: DeepEntity[];
  onClose: () => void;
}

// ---- Country borders GeoJSON (simplifié) ----
const LAT_LNG_TO_VEC3 = (lat: number, lng: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

// ---- Tile Layer URLs ----
const TILE_LAYERS = {
  dark: {
    label: "Sombre",
    icon: "🌑",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    color: 0x0a0a14,
  },
  light: {
    label: "Clair",
    icon: "☀️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    color: 0x1a1a2e,
  },
  satellite: {
    label: "Satellite",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    color: 0x0a0f0a,
  },
  topo: {
    label: "Topo",
    icon: "🗺️",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    color: 0x0f1a0a,
  },
};

// Source → color
const SOURCE_HEX: Record<string, number> = {
  instagram_public: 0xe1306c,
  twitter_public: 0x1da1f2,
  telegram_lookup: 0x0088cc,
  tiktok_public: 0xfe2c55,
  phone_lookup_rapidapi: 0x22c55e,
  ip_geo_rapidapi: 0xf97316,
  ipinfo: 0xf97316,
  linkedin_rapidapi: 0x0077b5,
  github_search: 0x6366f1,
  annuaires_fr: 0x8b5cf6,
};
const DEFAULT_HEX = 0x06b6d4;

function getHex(source: string) {
  return SOURCE_HEX[source] ?? DEFAULT_HEX;
}

// ---- Geocoder ----
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "User-Agent": "OSINT-Master/5.0" } }
    );
    const d = await r.json();
    if (d?.[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch {}
  return null;
}

function extractCoords(entity: DeepEntity): { lat: number; lng: number } | null {
  const m = entity.metadata;
  if (!m) return null;
  const lat = parseFloat(m.lat ?? m.latitude ?? m.lat_lng?.split(",")?.[0]);
  const lng = parseFloat(m.lng ?? m.longitude ?? m.lat_lng?.split(",")?.[1]);
  if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  return null;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================
export default function Globe3D({ entities, onClose }: Globe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0, vx: 0, vy: 0.0005 });

  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const [selected, setSelected] = useState<GeoPoint | null>(null);
  const [activeLayer, setActiveLayer] = useState<keyof typeof TILE_LAYERS>("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showBuffers, setShowBuffers] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoom, setZoom] = useState(2.5);

  const locationEntities = entities.filter(
    (e) => e.type === "location" || e.type === "ip" || e.type === "phone"
  );

  // ---- Init Three.js ----
  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04040a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = zoom;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // ---- Globe sphere ----
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);

    // Texture de la Terre (dark)
    const textureLoader = new THREE.TextureLoader();

    // Fond sombre avec continents lumineux
    const canvas2D = document.createElement("canvas");
    canvas2D.width = 2048;
    canvas2D.height = 1024;
    const ctx = canvas2D.getContext("2d")!;

    // Fond ocean profond
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    oceanGrad.addColorStop(0, "#040a14");
    oceanGrad.addColorStop(1, "#020710");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Grille de longitude/latitude
    ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
    ctx.lineWidth = 0.5;
    for (let lon = -180; lon <= 180; lon += 15) {
      const x = ((lon + 180) / 360) * 2048;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 15) {
      const y = ((90 - lat) / 180) * 1024;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }

    const globeTexture = new THREE.CanvasTexture(canvas2D);

    // Charge la texture naturelle depuis une URL publique
    textureLoader.load(
      "https://unpkg.com/three@0.150.0/examples/textures/land_ocean_ice_cloud_2048.jpg",
      (tex) => {
        if (globeGroupRef.current) {
          const mesh = globeGroupRef.current.children[0] as THREE.Mesh;
          if (mesh?.material) {
            (mesh.material as THREE.MeshPhongMaterial).map = tex;
            (mesh.material as THREE.MeshPhongMaterial).needsUpdate = true;
          }
        }
      },
      undefined,
      () => {} // fallback silencieux
    );

    const globeMat = new THREE.MeshPhongMaterial({
      map: globeTexture,
      specular: new THREE.Color(0x111122),
      shininess: 15,
      emissive: new THREE.Color(0x020408),
      emissiveIntensity: 0.1,
    });

    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    // ---- Atmosphere glow ----
    const atmGeo = new THREE.SphereGeometry(1.02, 64, 64);
    const atmMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      uniforms: {
        glowColor: { value: new THREE.Color(0x0088ff) },
        viewVector: { value: camera.position },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.85 - dot(vNormal, vNormel), 3.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.5);
        }
      `,
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    globeGroup.add(atmosphere);

    // ---- Stars background ----
    const starsGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(6000);
    for (let i = 0; i < 6000; i++) {
      starPositions[i] = (Math.random() - 0.5) * 500;
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true });
    scene.add(new THREE.Points(starsGeo, starsMat));

    // ---- Éclairage ----
    const ambientLight = new THREE.AmbientLight(0x111122, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x4488ff, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x002244, 0.4);
    rimLight.position.set(-5, -3, -5);
    scene.add(rimLight);

    // ---- Markers group ----
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // ---- Rotation initiale ----
    globeGroup.rotation.x = rotationRef.current.x;

    // ---- Animation loop ----
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (!isDraggingRef.current && autoRotate) {
        rotationRef.current.vy = 0.0008;
      }

      rotationRef.current.x += rotationRef.current.vx;
      rotationRef.current.y += rotationRef.current.vy;
      rotationRef.current.vx *= 0.95;
      if (!autoRotate) rotationRef.current.vy *= 0.95;

      if (globeGroupRef.current) {
        globeGroupRef.current.rotation.x = rotationRef.current.x;
        globeGroupRef.current.rotation.y = rotationRef.current.y;
      }
      if (markersGroupRef.current) {
        markersGroupRef.current.rotation.x = rotationRef.current.x;
        markersGroupRef.current.rotation.y = rotationRef.current.y;
      }

      // Update atmosphere
      if (atmMat.uniforms) {
        atmMat.uniforms.viewVector.value = camera.position;
      }

      renderer.render(scene, camera);
    };
    animate();

    // ---- Resize ----
    const handleResize = () => {
      if (!canvasRef.current || !renderer || !camera) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
    };
  }, []);

  // ---- Zoom ----
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = zoom;
    }
  }, [zoom]);

  // ---- Geocoding ----
  useEffect(() => {
    (async () => {
      const newPoints: GeoPoint[] = [];

      for (const entity of locationEntities) {
        const coords = extractCoords(entity);
        if (coords) {
          newPoints.push({ entity, ...coords, label: entity.value });
          continue;
        }
        const geo = await geocode(entity.value);
        if (geo) {
          newPoints.push({ entity, ...geo, label: entity.value });
          setGeocodedCount((c) => c + 1);
        }
        await new Promise((r) => setTimeout(r, 1100));
      }

      setPoints(newPoints);
      setLoading(false);
    })();
  }, [entities]);

  // ---- Add markers to globe ----
  useEffect(() => {
    if (!markersGroupRef.current || points.length === 0) return;

    // Clear previous
    while (markersGroupRef.current.children.length > 0) {
      markersGroupRef.current.remove(markersGroupRef.current.children[0]);
    }

    points.forEach((pt) => {
      const color = getHex(pt.entity.source);
      const pos = LAT_LNG_TO_VEC3(pt.lat, pt.lng, 1.01);

      // ---- Spike marker ----
      const spikeHeight = 0.04 + (pt.entity.confidence / 100) * 0.06;
      const spikeGeo = new THREE.CylinderGeometry(0, 0.008, spikeHeight, 8);
      const spikeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);

      // Position & orient towards surface normal
      spike.position.copy(pos);
      spike.lookAt(new THREE.Vector3(0, 0, 0));
      spike.rotateX(Math.PI / 2);
      spike.translateY(spikeHeight / 2);

      markersGroupRef.current!.add(spike);

      // ---- Pulsing ring (buffer) ----
      if (showBuffers) {
        const ringGeo = new THREE.RingGeometry(0.02, 0.04, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        markersGroupRef.current!.add(ring);
      }

      // ---- Point glow ----
      const dotGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      dot.userData = { point: pt };
      markersGroupRef.current!.add(dot);
    });
  }, [points, showBuffers]);

  // ---- Mouse drag to rotate ----
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    rotationRef.current.vy += dx * 0.003;
    rotationRef.current.vx += dy * 0.003;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // ---- Wheel zoom ----
  const handleWheel = useCallback((e: React.WheelEvent) => {
    setZoom((z) => Math.max(1.2, Math.min(8, z + e.deltaY * 0.002)));
  }, []);

  // ---- Click to select ----
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current || !markersGroupRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(markersGroupRef.current.children);
      if (intersects.length > 0) {
        const pt = intersects[0].object.userData.point as GeoPoint;
        if (pt) setSelected(pt);
      }
    },
    []
  );

  // ---- Focus on point ----
  const focusOnPoint = (pt: GeoPoint) => {
    setSelected(pt);
    setAutoRotate(false);
    const targetY = (pt.lng / 180) * Math.PI;
    const targetX = -(pt.lat / 90) * (Math.PI / 4);
    rotationRef.current.vy = (targetY - rotationRef.current.y) * 0.02;
    rotationRef.current.vx = (targetX - rotationRef.current.x) * 0.02;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#04040a] flex overflow-hidden">

      {/* ---- LEFT SIDEBAR ---- */}
      <div
        className={`relative flex-shrink-0 flex flex-col transition-all duration-300 z-20 ${
          sidebarOpen ? "w-64" : "w-10"
        }`}
        style={{ background: "rgba(4, 8, 20, 0.95)", borderRight: "1px solid rgba(6,182,212,0.12)" }}
      >
        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-6 z-30 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-cyan-400 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {sidebarOpen && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Globe OSINT</p>
                  <p className="text-[10px] text-zinc-500">
                    {loading
                      ? `Géolocalisation... ${geocodedCount}/${locationEntities.length}`
                      : `${points.length} points tracés`}
                  </p>
                </div>
              </div>
            </div>

            {/* Layers */}
            <div className="px-3 py-3 border-b border-white/5">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Fond de carte
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                  <button
                    key={key}
                    onClick={() => setActiveLayer(key as any)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeLayer === key
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-zinc-800/60 text-zinc-400 border border-transparent hover:border-zinc-600"
                    }`}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="px-3 py-3 border-b border-white/5">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Affichage
              </p>
              {[
                { label: "Zones tampon", state: showBuffers, set: setShowBuffers },
                { label: "Rotation auto", state: autoRotate, set: setAutoRotate },
                { label: "Labels", state: showLabels, set: setShowLabels },
              ].map(({ label, state, set }) => (
                <button
                  key={label}
                  onClick={() => set(!state)}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors mb-1"
                >
                  <span className="text-xs text-zinc-400">{label}</span>
                  <div
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      state ? "bg-cyan-500" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                        state ? "left-4" : "left-0.5"
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Points list */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Localisations ({points.length})
              </p>

              {loading && (
                <div className="flex items-center gap-2 py-3 text-zinc-500">
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                  <span className="text-xs">Géolocalisation...</span>
                </div>
              )}

              <div className="space-y-1">
                {points.map((pt, i) => (
                  <button
                    key={i}
                    onClick={() => focusOnPoint(pt)}
                    className={`w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left transition-all ${
                      selected?.entity.id === pt.entity.id
                        ? "bg-cyan-500/15 border border-cyan-500/30"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: `#${getHex(pt.entity.source).toString(16).padStart(6, "0")}` }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-200 truncate">{pt.label}</p>
                      <p className="text-[10px] text-zinc-500">{pt.entity.source}</p>
                    </div>
                    <span className="text-[10px] text-cyan-400 flex-shrink-0">{pt.entity.confidence}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- GLOBE CANVAS ---- */}
      <div className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: isDraggingRef.current ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleClick}
        />

        {/* ---- CONTROLS (top-right) ---- */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          {/* Close */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="h-px bg-zinc-800" />

          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.max(1.2, z - 0.3))}
            className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-cyan-400 transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(8, z + 0.3))}
            className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-cyan-400 transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="h-px bg-zinc-800" />

          {/* Reset */}
          <button
            onClick={() => {
              rotationRef.current = { x: 0.3, y: 0, vx: 0, vy: 0.0005 };
              setZoom(2.5);
              setAutoRotate(true);
            }}
            className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-cyan-400 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* ---- SELECTED POINT INFO ---- */}
        {selected && (
          <div className="absolute bottom-6 right-4 w-64 z-20">
            <div
              className="rounded-2xl p-4 border backdrop-blur-xl"
              style={{
                background: "rgba(4, 8, 20, 0.95)",
                borderColor: `#${getHex(selected.entity.source).toString(16).padStart(6, "0")}44`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `#${getHex(selected.entity.source).toString(16).padStart(6, "0")}` }}
                  />
                  <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                    {selected.label}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="text-zinc-600 hover:text-zinc-300">
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Source</span>
                  <span className="text-zinc-300">{selected.entity.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Type</span>
                  <span className="text-zinc-300 capitalize">{selected.entity.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Confiance</span>
                  <span
                    className="font-medium"
                    style={{ color: selected.entity.confidence > 80 ? "#34d399" : "#f59e0b" }}
                  >
                    {selected.entity.confidence}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Lat/Lng</span>
                  <span className="text-zinc-400 font-mono text-[10px]">
                    {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                  </span>
                </div>
                {selected.entity.metadata?.country && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Pays</span>
                    <span className="text-zinc-300">{selected.entity.metadata.country}</span>
                  </div>
                )}
                {selected.entity.metadata?.isp && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ISP</span>
                    <span className="text-zinc-300 truncate max-w-[120px]">{selected.entity.metadata.isp}</span>
                  </div>
                )}
              </div>

              <a
                href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: `#${getHex(selected.entity.source).toString(16).padStart(6, "0")}22`,
                  color: `#${getHex(selected.entity.source).toString(16).padStart(6, "0")}`,
                }}
              >
                <Globe className="w-3 h-3" />
                Ouvrir dans Google Maps
              </a>
            </div>
          </div>
        )}

        {/* ---- STATUS BAR ---- */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/5 backdrop-blur-xl"
            style={{ background: "rgba(4, 8, 20, 0.8)" }}>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
              <span className="text-[10px] text-zinc-500">
                {loading ? `Géocodage ${geocodedCount}/${locationEntities.length}...` : `${points.length} localisations tracées`}
              </span>
            </div>
            <div className="w-px h-3 bg-zinc-700" />
            <span className="text-[10px] text-zinc-600 font-mono">
              zoom {zoom.toFixed(1)}x
            </span>
            <div className="w-px h-3 bg-zinc-700" />
            <span className="text-[10px] text-zinc-600 capitalize">{activeLayer}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
