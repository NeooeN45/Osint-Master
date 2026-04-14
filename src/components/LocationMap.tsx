// ============================================================================
// LOCATION MAP — Visualize all discovered location entities on an OSM map
// Uses Leaflet + react-leaflet + Nominatim geocoding (no API key needed)
// ============================================================================

import { useEffect, useState, useRef } from "react";
import { MapPin, X, Loader2, Globe, ZoomIn, ZoomOut, Layers } from "lucide-react";

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
  geocoded?: boolean;
}

interface LocationMapProps {
  entities: DeepEntity[];
  onClose: () => void;
}

// Nominatim geocoder — free, no key needed
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`,
      { headers: { "Accept-Language": "fr,en", "User-Agent": "OSINT-Master/4.0" } }
    );
    const data = await resp.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

// Extract lat/lng from entity metadata if already geocoded
function extractCoords(entity: DeepEntity): { lat: number; lng: number } | null {
  const m = entity.metadata;
  if (!m) return null;
  const lat = parseFloat(m.lat || m.latitude || m.lat_lng?.split(",")?.[0]);
  const lng = parseFloat(m.lng || m.longitude || m.lat_lng?.split(",")?.[1]);
  if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  return null;
}

const SOURCE_COLORS: Record<string, string> = {
  instagram_near:      "#e1306c",
  instagram_post:      "#e1306c",
  instagram_public:    "#e1306c",
  twitter_public:      "#1da1f2",
  telegram_lookup:     "#0088cc",
  tiktok_public:       "#010101",
  tiktok_rapidapi:     "#fe2c55",
  phone_lookup_rapidapi: "#22c55e",
  veriphone:           "#16a34a",
  ip_geo_rapidapi:     "#f97316",
  ipinfo:              "#f97316",
  linkedin_rapidapi:   "#0077b5",
  reddit_public:       "#ff4500",
  github_search:       "#6366f1",
  annuaires_fr:        "#8b5cf6",
  default:             "#60a5fa",
};

function getColor(source: string): string {
  return SOURCE_COLORS[source] || SOURCE_COLORS.default;
}

export default function LocationMap({ entities, onClose }: LocationMapProps) {
  const mapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GeoPoint | null>(null);
  const [mapStyle, setMapStyle] = useState<"osm" | "satellite" | "dark">("dark");
  const [geocodedCount, setGeocodedCount] = useState(0);

  const locationEntities = entities.filter(e => e.type === "location" || (e.type === "ip" && e.metadata?.latitude));

  const tileLayers = {
    osm:       { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                      attribution: "© OpenStreetMap" },
    satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri" },
    dark:      { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",           attribution: "© CARTO" },
  };

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Dynamic import of Leaflet to avoid SSR issues
    import("leaflet").then(L => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        zoomControl: false,
      });

      const layer = tileLayers[mapStyle];
      L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: 19 }).addTo(map);
      leafletMapRef.current = map;

      // Geocode all location entities
      (async () => {
        const newPoints: GeoPoint[] = [];

        for (const entity of locationEntities) {
          // Try metadata coords first
          const coords = extractCoords(entity);
          if (coords) {
            newPoints.push({ entity, ...coords, label: entity.value, geocoded: false });
            continue;
          }
          // Geocode text location
          const geo = await geocode(entity.value);
          if (geo) {
            newPoints.push({ entity, ...geo, label: entity.value, geocoded: true });
            setGeocodedCount(c => c + 1);
          }
          // Small delay to respect Nominatim rate limit (1 req/sec)
          await new Promise(r => setTimeout(r, 1100));
        }

        setPoints(newPoints);
        setLoading(false);

        // Add markers
        for (const pt of newPoints) {
          const color = getColor(pt.entity.source);
          const svgIcon = L.divIcon({
            html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
            className: "",
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          });
          const marker = L.marker([pt.lat, pt.lng], { icon: svgIcon })
            .addTo(map)
            .bindTooltip(`<b>${pt.label}</b><br><span style="color:#aaa;font-size:11px">${pt.entity.source} · ${pt.entity.confidence}%</span>`, { direction: "top", offset: [0, -28] });
          marker.on("click", () => setSelected(pt));
          markersRef.current.push(marker);
        }

        // Fit bounds if we have points
        if (newPoints.length > 0) {
          if (newPoints.length === 1) {
            map.setView([newPoints[0].lat, newPoints[0].lng], 10);
          } else {
            const bounds = L.latLngBounds(newPoints.map(p => [p.lat, p.lng] as [number, number]));
            map.fitBounds(bounds, { padding: [40, 40] });
          }
        }
      })();
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Switch tile layer
  useEffect(() => {
    if (!leafletMapRef.current) return;
    import("leaflet").then(L => {
      leafletMapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) leafletMapRef.current.removeLayer(layer);
      });
      const tl = tileLayers[mapStyle];
      L.tileLayer(tl.url, { attribution: tl.attribution, maxZoom: 19 }).addTo(leafletMapRef.current);
    });
  }, [mapStyle]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[80vh] bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Carte des localisations</h2>
              <p className="text-xs text-zinc-400">
                {locationEntities.length} entité(s) · {points.length} géolocalisée(s)
                {loading && geocodedCount > 0 && ` · geocoding ${geocodedCount}/${locationEntities.length}...`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Map style switcher */}
            <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
              {(["dark", "osm", "satellite"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setMapStyle(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${mapStyle === s ? "bg-emerald-500/30 text-emerald-300" : "text-zinc-400 hover:text-white"}`}
                >
                  {s === "dark" ? "Sombre" : s === "osm" ? "Classique" : "Satellite"}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Map container */}
        <div className="relative flex-1">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-sm text-zinc-300">
                  Géolocalisation... {geocodedCount}/{locationEntities.length}
                </p>
                <p className="text-xs text-zinc-500">Nominatim OSM (1 req/s)</p>
              </div>
            </div>
          )}

          {locationEntities.length === 0 && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">Aucune localisation trouvée dans cette investigation</p>
                <p className="text-zinc-600 text-xs mt-1">Essaie instagram_near, telegram, phone lookup...</p>
              </div>
            </div>
          )}

          <div ref={mapRef} className="w-full h-full" />

          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
            <button
              onClick={() => leafletMapRef.current?.zoomIn()}
              className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => leafletMapRef.current?.zoomOut()}
              className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 max-w-[200px]">
            <p className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Sources
            </p>
            <div className="space-y-1.5">
              {[...new Set(points.map(p => p.entity.source))].slice(0, 8).map(src => (
                <div key={src} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(src) }} />
                  <span className="text-xs text-zinc-400 truncate">{src.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected point detail */}
          {selected && (
            <div className="absolute top-3 left-3 z-[1000] bg-zinc-900/95 border border-zinc-700 rounded-xl p-4 max-w-[260px] shadow-xl">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(selected.entity.source) }} />
                  <span className="text-xs font-semibold text-white truncate">{selected.label}</span>
                </div>
                <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Source</span>
                  <span className="text-zinc-300">{selected.entity.source}</span>
                </div>
                <div className="flex justify-between">
                  <span>Confiance</span>
                  <span className="text-emerald-400">{selected.entity.confidence}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Lat/Lng</span>
                  <span className="text-zinc-300">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</span>
                </div>
                {selected.entity.metadata?.carrier && (
                  <div className="flex justify-between">
                    <span>Opérateur</span>
                    <span className="text-zinc-300">{selected.entity.metadata.carrier}</span>
                  </div>
                )}
                {selected.entity.metadata?.isp && (
                  <div className="flex justify-between">
                    <span>ISP</span>
                    <span className="text-zinc-300">{selected.entity.metadata.isp}</span>
                  </div>
                )}
              </div>
              <a
                href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs rounded-lg transition-colors"
              >
                <Globe className="w-3 h-3" /> Ouvrir dans Google Maps
              </a>
            </div>
          )}
        </div>

        {/* Footer: list */}
        {points.length > 0 && (
          <div className="border-t border-zinc-800 px-4 py-2 bg-zinc-900/80 flex-shrink-0">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {points.map((pt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelected(pt);
                    leafletMapRef.current?.setView([pt.lat, pt.lng], 10, { animate: true });
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(pt.entity.source) }} />
                  {pt.label.length > 25 ? pt.label.slice(0, 25) + "…" : pt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
