// ============================================================================
// LOCATION MAP v2 — OSINT Master Pro
// Leaflet + MarkerCluster + Nominatim geocoding + Sidebar + Heatmap
// Sources: Instagram Engine, SpiderFoot, phone, IP, Osintgram, Telegram...
// ============================================================================

import { useEffect, useState, useRef, useCallback } from "react";
import {
  MapPin, X, Loader2, Globe, ZoomIn, ZoomOut, Layers,
  ChevronRight, ChevronLeft, Copy, ExternalLink,
  Thermometer, Navigation, Search, Filter, Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  geocoded: boolean;
  count: number; // posts/occurrences à ce lieu
}

interface LocationMapProps {
  entities: DeepEntity[];
  onClose: () => void;
}

// ─── Couleurs par source ──────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  // Instagram Engine
  ig_profile:         "#e1306c",
  ig_geofence:        "#e1306c",
  ig_tagged:          "#f472b6",
  ig_stories:         "#c026d3",
  ig_osintgram:       "#a21caf",
  ig_instaloader:     "#db2777",
  ig_hikerapi:        "#ec4899",
  instagram_post:     "#e1306c",
  instagram_public:   "#e1306c",
  instagram_near:     "#e1306c",
  ig_ai_caption:      "#be185d",
  // Twitter
  twitter_deep:       "#1da1f2",
  twitter_public:     "#1da1f2",
  // Phone
  phone_enrichment:   "#22c55e",
  veriphone:          "#16a34a",
  phone_lookup_rapidapi: "#15803d",
  numlookup:          "#4ade80",
  // IP
  ip_geo_rapidapi:    "#f97316",
  ipinfo:             "#fb923c",
  ipinfo_free:        "#f97316",
  shodan_host:        "#ef4444",
  // Social
  telegram_lookup:    "#0088cc",
  facebook_osint:     "#1877f2",
  linkedin_rapidapi:  "#0077b5",
  linkedin_deep:      "#0a66c2",
  reddit_deep:        "#ff4500",
  reddit_public:      "#ff4500",
  tiktok_rapidapi:    "#fe2c55",
  // Other
  github_deep:        "#6366f1",
  github_search:      "#818cf8",
  annuaires_fr:       "#8b5cf6",
  annuaires_fr_pro:   "#7c3aed",
  osintgram:          "#a855f7",
  default:            "#60a5fa",
};

function getColor(source: string): string {
  return SOURCE_COLORS[source] || SOURCE_COLORS.default;
}

// ─── Source → label lisible ───────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  ig_geofence: "Instagram GPS",
  ig_profile: "Instagram Profil",
  ig_tagged: "Instagram Tags",
  ig_stories: "Instagram Stories",
  ig_osintgram: "Osintgram",
  phone_enrichment: "Téléphone",
  veriphone: "Veriphone",
  ip_geo_rapidapi: "IP Géo",
  ipinfo_free: "IPInfo",
  shodan_host: "Shodan",
  telegram_lookup: "Telegram",
  facebook_osint: "Facebook",
  reddit_deep: "Reddit",
  twitter_deep: "Twitter",
  linkedin_deep: "LinkedIn",
  github_deep: "GitHub",
  annuaires_fr_pro: "Annuaires FR",
};

function srcLabel(source: string) {
  return SOURCE_LABELS[source] || source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Geocoder Nominatim ───────────────────────────────────────────────────────
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = query.toLowerCase().trim();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`,
      { headers: { "Accept-Language": "fr,en", "User-Agent": "OSINT-Master/4.0" } }
    );
    const data = await r.json();
    const result = data?.[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    geocodeCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

function extractCoords(entity: DeepEntity): { lat: number; lng: number } | null {
  const m = entity.metadata;
  if (!m) return null;
  const lat = parseFloat(m.lat ?? m.latitude ?? (typeof m.lat_lng === "string" ? m.lat_lng.split(",")[0] : undefined));
  const lng = parseFloat(m.lng ?? m.longitude ?? (typeof m.lat_lng === "string" ? m.lat_lng.split(",")[1] : undefined));
  if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  return null;
}

// ─── Tile layers ─────────────────────────────────────────────────────────────
const TILES = {
  dark:      { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",  attr: "© CARTO" },
  osm:       { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",             attr: "© OpenStreetMap" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "© Esri" },
  topo:      { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",               attr: "© OpenTopoMap" },
};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function LocationMap({ entities, onClose }: LocationMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  const [points,        setPoints]        = useState<GeoPoint[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const [selected,      setSelected]      = useState<GeoPoint | null>(null);
  const [mapStyle,      setMapStyle]      = useState<keyof typeof TILES>("dark");
  const [showSidebar,   setShowSidebar]   = useState(true);
  const [showHeatmap,   setShowHeatmap]   = useState(false);
  const [filterSource,  setFilterSource]  = useState<string>("all");
  const [searchTerm,    setSearchTerm]    = useState("");
  const heatLayerRef = useRef<any>(null);

  // Entités localisables
  const locationEntities = entities.filter(e =>
    e.type === "location" ||
    (e.type === "ip" && (e.metadata?.latitude || e.metadata?.lat)) ||
    (e.type === "social_profile" && e.metadata?.lat)
  );

  // ── Initialisation Leaflet ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    import("leaflet").then(async L => {
      await import("leaflet.markercluster");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Injecter CSS cluster
      if (!document.getElementById("mc-css")) {
        const link = document.createElement("link");
        link.id = "mc-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
        document.head.appendChild(link);
        const link2 = document.createElement("link");
        link2.rel = "stylesheet";
        link2.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
        document.head.appendChild(link2);
      }

      const map = L.map(mapRef.current!, { center: [20, 0], zoom: 2, zoomControl: false });
      const tile = TILES[mapStyle];
      L.tileLayer(tile.url, { attribution: tile.attr, maxZoom: 19 }).addTo(map);
      leafletRef.current = map;

      // Cluster group
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (c: any) => {
          const count = c.getChildCount();
          const size = count > 50 ? 44 : count > 10 ? 36 : 28;
          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(16,185,129,0.85);border:2px solid rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:white;box-shadow:0 0 12px rgba(16,185,129,0.5)">${count}</div>`,
            className: "",
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      });
      clusterRef.current = cluster;
      map.addLayer(cluster);

      // Geocoder tous les points
      const newPoints: GeoPoint[] = [];
      const dedupKeys = new Set<string>();

      for (const entity of locationEntities) {
        const coords = extractCoords(entity);
        if (coords) {
          const key = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
          const existing = newPoints.find(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` === key);
          if (existing) { existing.count++; continue; }
          newPoints.push({ entity, ...coords, label: entity.value, geocoded: false, count: entity.metadata?.postCount || 1 });
          continue;
        }
        // Skip doublon texte
        const textKey = entity.value.toLowerCase().trim();
        if (dedupKeys.has(textKey)) continue;
        dedupKeys.add(textKey);

        const geo = await geocode(entity.value);
        if (geo) {
          newPoints.push({ entity, ...geo, label: entity.value, geocoded: true, count: entity.metadata?.postCount || 1 });
          setGeocodedCount(c => c + 1);
        }
        await new Promise(r => setTimeout(r, 1050));
      }

      setPoints(newPoints);
      setLoading(false);
      buildMarkers(L, cluster, newPoints, setSelected);

      // Fit bounds
      if (newPoints.length > 0) {
        if (newPoints.length === 1) {
          map.setView([newPoints[0].lat, newPoints[0].lng], 10);
        } else {
          const bounds = L.latLngBounds(newPoints.map(p => [p.lat, p.lng] as [number, number]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    });

    return () => {
      leafletRef.current?.remove();
      leafletRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  // ── Switch tile layer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current) return;
    import("leaflet").then(L => {
      leafletRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) leafletRef.current.removeLayer(layer);
      });
      const t = TILES[mapStyle];
      L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(leafletRef.current);
    });
  }, [mapStyle]);

  // ── Heatmap canvas overlay ─────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current || points.length === 0) return;
    import("leaflet").then(L => {
      if (heatLayerRef.current) {
        leafletRef.current.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      if (!showHeatmap) return;
      // Heatmap custom canvas layer
      const HeatLayer = L.Layer.extend({
        onAdd(map: any) {
          this._map = map;
          const canvas = document.createElement("canvas");
          const size = map.getSize();
          canvas.width = size.x; canvas.height = size.y;
          canvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:400;opacity:0.7;mix-blend-mode:screen";
          map.getPanes().overlayPane.appendChild(canvas);
          this._canvas = canvas;
          map.on("moveend zoomend", this._draw, this);
          this._draw();
        },
        onRemove(map: any) {
          this._canvas.remove();
          map.off("moveend zoomend", this._draw, this);
        },
        _draw() {
          const map = this._map;
          const canvas = this._canvas;
          const size = map.getSize();
          canvas.width = size.x; canvas.height = size.y;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, size.x, size.y);
          for (const pt of points) {
            const px = map.latLngToContainerPoint([pt.lat, pt.lng]);
            const r = Math.min(80, 20 + pt.count * 8);
            const g = ctx.createRadialGradient(px.x, px.y, 0, px.x, px.y, r);
            const color = getColor(pt.entity.source);
            g.addColorStop(0, color + "cc");
            g.addColorStop(0.4, color + "55");
            g.addColorStop(1, "transparent");
            ctx.beginPath();
            ctx.arc(px.x, px.y, r, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
          }
        },
      });
      const hl = new (HeatLayer as any)();
      leafletRef.current.addLayer(hl);
      heatLayerRef.current = hl;
    });
  }, [showHeatmap, points]);

  // ── Flyto on sidebar click ─────────────────────────────────────────────────
  const flyTo = useCallback((pt: GeoPoint) => {
    setSelected(pt);
    leafletRef.current?.flyTo([pt.lat, pt.lng], 13, { animate: true, duration: 0.8 });
  }, []);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = ["label,lat,lng,source,confidence,count",
      ...points.map(p => `"${p.label}",${p.lat},${p.lng},${p.entity.source},${p.entity.confidence},${p.count}`)
    ].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows);
    a.download = "osint_locations.csv";
    a.click();
  };

  // ── Points filtrés ────────────────────────────────────────────────────────
  const filteredPoints = points.filter(p => {
    if (filterSource !== "all" && p.entity.source !== filterSource) return false;
    if (searchTerm && !p.label.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const uniqueSources = [...new Set(points.map(p => p.entity.source))];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-[1400px] h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">Carte Intelligence OSINT</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {locationEntities.length} entité(s) · {points.length} géolocalisée(s)
                {loading && locationEntities.length > 0 && ` · geocoding ${geocodedCount}/${locationEntities.length}…`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Tile switcher */}
            <div className="flex gap-0.5 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              {(Object.keys(TILES) as Array<keyof typeof TILES>).map(s => (
                <button key={s} onClick={() => setMapStyle(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${mapStyle === s ? "bg-emerald-500/25 text-emerald-300" : "text-zinc-500 hover:text-white"}`}
                >
                  {s === "dark" ? "Sombre" : s === "osm" ? "OSM" : s === "satellite" ? "Satellite" : "Topo"}
                </button>
              ))}
            </div>

            {/* Heatmap toggle */}
            <button
              onClick={() => setShowHeatmap(h => !h)}
              title="Heatmap"
              className={`p-1.5 rounded-lg border transition-colors ${showHeatmap ? "bg-orange-500/20 text-orange-300 border-orange-500/30" : "text-zinc-500 hover:text-white border-zinc-800 hover:bg-zinc-800"}`}
            >
              <Thermometer className="w-3.5 h-3.5" />
            </button>

            {/* Export CSV */}
            <button onClick={exportCSV} title="Export CSV"
              className="p-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Sidebar toggle */}
            <button onClick={() => setShowSidebar(s => !s)}
              className="p-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              {showSidebar ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors border border-zinc-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Map */}
          <div className="relative flex-1">
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  </div>
                  <p className="text-sm text-zinc-200 font-medium">Géolocalisation en cours…</p>
                  <p className="text-xs text-zinc-500">{geocodedCount}/{locationEntities.length} · Nominatim OSM (1 req/s)</p>
                  <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: locationEntities.length ? `${(geocodedCount / locationEntities.length) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {locationEntities.length === 0 && !loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-7 h-7 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 text-sm font-medium">Aucune localisation trouvée</p>
                  <p className="text-zinc-600 text-xs mt-1 max-w-xs">Lance une investigation Instagram, téléphone ou IP pour voir des points apparaître ici</p>
                </div>
              </div>
            )}

            <div ref={mapRef} className="w-full h-full" />

            {/* Zoom controls */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
              <button onClick={() => leafletRef.current?.zoomIn()}
                className="w-8 h-8 bg-zinc-950/90 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => leafletRef.current?.zoomOut()}
                className="w-8 h-8 bg-zinc-950/90 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { if (points.length > 0) { const b = (window as any).L?.latLngBounds?.(points.map((p:GeoPoint) => [p.lat, p.lng])); if (b) leafletRef.current?.fitBounds(b, { padding: [50, 50] }); }}}
                title="Tout afficher"
                className="w-8 h-8 bg-zinc-950/90 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg">
                <Navigation className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Legend */}
            {uniqueSources.length > 0 && (
              <div className="absolute bottom-3 right-3 z-[1000] bg-zinc-950/92 border border-zinc-800 rounded-xl p-3 max-w-[180px] shadow-xl">
                <p className="text-[10px] font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Sources
                </p>
                <div className="space-y-1">
                  {uniqueSources.slice(0, 8).map(src => (
                    <button key={src}
                      onClick={() => setFilterSource(filterSource === src ? "all" : src)}
                      className={`w-full flex items-center gap-2 px-1.5 py-0.5 rounded transition-colors ${filterSource === src ? "bg-zinc-800" : "hover:bg-zinc-900"}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(src) }} />
                      <span className="text-[10px] text-zinc-400 truncate">{srcLabel(src)}</span>
                    </button>
                  ))}
                  {uniqueSources.length > 8 && <p className="text-[9px] text-zinc-600 pl-1">+{uniqueSources.length - 8} autres</p>}
                </div>
              </div>
            )}

            {/* Selected popup */}
            {selected && (
              <div className="absolute top-3 left-3 z-[1000] bg-zinc-950/96 border border-zinc-700 rounded-xl p-4 w-[280px] shadow-2xl">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(selected.entity.source) }} />
                    <span className="text-xs font-semibold text-white truncate">{selected.label}</span>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-zinc-600 hover:text-white flex-shrink-0 p-0.5 rounded hover:bg-zinc-800">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Source</span>
                    <span className="text-zinc-300 font-medium">{srcLabel(selected.entity.source)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Confiance</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${selected.entity.confidence}%` }} />
                      </div>
                      <span className="text-emerald-400 font-medium">{selected.entity.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Coordonnées</span>
                    <button
                      onClick={() => navigator.clipboard?.writeText(`${selected.lat},${selected.lng}`)}
                      className="flex items-center gap-1 text-zinc-300 hover:text-white"
                    >
                      {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                      <Copy className="w-2.5 h-2.5 text-zinc-600" />
                    </button>
                  </div>
                  {selected.count > 1 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Fréquence</span>
                      <span className="text-amber-400 font-medium">{selected.count} posts</span>
                    </div>
                  )}
                  {selected.entity.metadata?.carrier && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Opérateur</span>
                      <span className="text-zinc-300">{selected.entity.metadata.carrier}</span>
                    </div>
                  )}
                  {selected.entity.metadata?.isp && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">ISP</span>
                      <span className="text-zinc-300">{selected.entity.metadata.isp}</span>
                    </div>
                  )}
                  {selected.entity.metadata?.inferred_from && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Via</span>
                      <span className="text-zinc-400">{selected.entity.metadata.inferred_from}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <a href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] rounded-lg transition-colors border border-emerald-500/20">
                    <Globe className="w-3 h-3" /> Google Maps
                  </a>
                  <a href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lng}#map=14/${selected.lat}/${selected.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[10px] rounded-lg transition-colors border border-blue-500/20">
                    <ExternalLink className="w-3 h-3" /> OSM
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar liste ─────────────────────────────────────────────── */}
          {showSidebar && (
            <div className="w-72 flex-shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col">
              {/* Sidebar header */}
              <div className="px-3 py-2.5 border-b border-zinc-800 flex-shrink-0">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Filtrer les lieux…"
                    className="w-full pl-7 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">{filteredPoints.length} lieu(x)</span>
                  <div className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-zinc-600" />
                    <select
                      value={filterSource}
                      onChange={e => setFilterSource(e.target.value)}
                      className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400 outline-none"
                    >
                      <option value="all">Toutes sources</option>
                      {uniqueSources.map(s => <option key={s} value={s}>{srcLabel(s)}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sidebar list */}
              <div className="flex-1 overflow-y-auto">
                {filteredPoints.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <MapPin className="w-6 h-6 text-zinc-700 mb-2" />
                    <p className="text-xs text-zinc-600">Aucun lieu trouvé</p>
                  </div>
                )}
                {filteredPoints.map((pt, i) => (
                  <button
                    key={i}
                    onClick={() => flyTo(pt)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 border-b border-zinc-900 hover:bg-zinc-900/60 transition-colors text-left group ${selected === pt ? "bg-zinc-900" : ""}`}
                  >
                    {/* Marker pin */}
                    <div className="flex-shrink-0 mt-0.5 relative">
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-900"
                        style={{ backgroundColor: getColor(pt.entity.source) }} />
                      {pt.count > 1 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-zinc-900">{pt.count}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 group-hover:text-white truncate font-medium">
                        {pt.label.length > 35 ? pt.label.slice(0, 35) + "…" : pt.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-600">{srcLabel(pt.entity.source)}</span>
                        <span className="text-[10px] text-zinc-700">·</span>
                        <span className={`text-[10px] font-medium ${pt.entity.confidence >= 80 ? "text-emerald-500" : pt.entity.confidence >= 60 ? "text-amber-500" : "text-zinc-500"}`}>
                          {pt.entity.confidence}%
                        </span>
                        {pt.geocoded && <span className="text-[9px] text-zinc-700 italic">geocodé</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 mt-1 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Sidebar stats */}
              {points.length > 0 && (
                <div className="border-t border-zinc-800 px-3 py-2 flex-shrink-0 grid grid-cols-3 gap-2">
                  {[
                    { label: "Lieux", value: points.length },
                    { label: "Sources", value: uniqueSources.length },
                    { label: "Geocodés", value: points.filter(p => p.geocoded).length },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <p className="text-sm font-bold text-white">{stat.value}</p>
                      <p className="text-[10px] text-zinc-600">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers markers (hors composant pour éviter re-render) ───────────────────
function buildMarkers(L: any, cluster: any, points: GeoPoint[], setSelected: (p: GeoPoint) => void) {
  cluster.clearLayers();
  for (const pt of points) {
    const color = getColor(pt.entity.source);
    const size = pt.count > 5 ? 34 : pt.count > 1 ? 28 : 22;
    const icon = L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;position:relative">
        <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${color};border:2.5px solid rgba(255,255,255,0.8);transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.6);transition:all 0.15s"></div>
        ${pt.count > 1 ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:#f59e0b;border:1.5px solid #1a1a1a;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#1a1a1a">${pt.count}</div>` : ""}
      </div>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size],
    });

    const marker = L.marker([pt.lat, pt.lng], { icon })
      .bindTooltip(
        `<div style="font-family:system-ui;font-size:12px;line-height:1.4">
          <b style="color:#fff">${pt.label.length > 40 ? pt.label.slice(0, 40) + "…" : pt.label}</b><br>
          <span style="color:#888">${srcLabel(pt.entity.source)} · ${pt.entity.confidence}%</span>
          ${pt.count > 1 ? `<br><span style="color:#f59e0b">${pt.count} posts</span>` : ""}
        </div>`,
        { direction: "top", offset: [0, -size], className: "osint-tooltip" }
      );
    marker.on("click", () => setSelected(pt));
    cluster.addLayer(marker);
  }
}
