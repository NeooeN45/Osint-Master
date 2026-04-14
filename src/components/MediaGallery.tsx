// ============================================================================
// MEDIA GALLERY — Display & export profile pictures + media from investigation
// ============================================================================

import { useState, useCallback } from "react";
import { X, Download, ExternalLink, Image as ImageIcon, CheckCircle2, Filter, Grid, List, ZoomIn } from "lucide-react";

interface DeepEntity {
  id: string;
  type: string;
  value: string;
  source: string;
  confidence: number;
  metadata?: Record<string, any>;
}

interface MediaGalleryProps {
  entities: DeepEntity[];
  target: string;
  onClose: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram:  "#e1306c",
  "Twitter/X": "#1da1f2",
  Telegram:   "#0088cc",
  Snapchat:   "#fffc00",
  Facebook:   "#1877f2",
  GitHub:     "#6e5494",
  Gravatar:   "#1e8cbf",
  Reddit:     "#ff4500",
  WhatsApp:   "#25d366",
  TikTok:     "#fe2c55",
  YouTube:    "#ff0000",
  Discord:    "#5865f2",
  Spotify:    "#1ed760",
  Twitch:     "#9147ff",
  default:    "#60a5fa",
};

function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS.default;
}

function getPlatformFromSource(source: string, metadata?: Record<string, any>): string {
  if (metadata?.platform) return metadata.platform;
  const s = source.toLowerCase();
  if (s.includes("instagram")) return "Instagram";
  if (s.includes("twitter")) return "Twitter/X";
  if (s.includes("telegram")) return "Telegram";
  if (s.includes("snapchat")) return "Snapchat";
  if (s.includes("facebook")) return "Facebook";
  if (s.includes("github")) return "GitHub";
  if (s.includes("gravatar")) return "Gravatar";
  if (s.includes("reddit")) return "Reddit";
  if (s.includes("whatsapp")) return "WhatsApp";
  if (s.includes("tiktok")) return "TikTok";
  if (s.includes("youtube")) return "YouTube";
  if (s.includes("discord")) return "Discord";
  if (s.includes("spotify")) return "Spotify";
  if (s.includes("twitch")) return "Twitch";
  return source.replace(/_/g, " ");
}

type ViewMode = "grid" | "list";
type TypeFilter = "all" | "profile_picture" | "banner" | "post" | "story";

export default function MediaGallery({ entities, target, onClose }: MediaGalleryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<DeepEntity | null>(null);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const mediaEntities = entities.filter(e => e.type === "image" || e.type === "video");

  const filtered = mediaEntities.filter(e => {
    if (typeFilter === "all") return true;
    return (e.metadata?.type || "") === typeFilter;
  });

  // Group by platform for stats
  const byPlatform = mediaEntities.reduce<Record<string, number>>((acc, e) => {
    const p = getPlatformFromSource(e.source, e.metadata);
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  // Download all images as a zip (via individual downloads)
  const downloadAll = useCallback(async () => {
    for (const entity of filtered) {
      try {
        const a = document.createElement("a");
        a.href = entity.value;
        a.download = `${target}_${getPlatformFromSource(entity.source, entity.metadata)}_${entity.metadata?.type || "image"}.jpg`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        await new Promise(r => setTimeout(r, 300));
      } catch {}
    }
  }, [filtered, target]);

  const downloadSingle = (entity: DeepEntity) => {
    const platform = getPlatformFromSource(entity.source, entity.metadata);
    const a = document.createElement("a");
    a.href = entity.value;
    a.download = `${target}_${platform}_${entity.metadata?.type || "image"}.jpg`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const typeCounts: Record<string, number> = {};
  for (const e of mediaEntities) {
    const t = e.metadata?.type || "other";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Galerie Médias</h2>
              <p className="text-xs text-zinc-400">
                {mediaEntities.length} médias · {Object.keys(byPlatform).length} plateformes · cible: <span className="text-violet-300">{target}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode */}
            <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-violet-500/30 text-violet-300" : "text-zinc-400 hover:text-white"}`}>
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-violet-500/30 text-violet-300" : "text-zinc-400 hover:text-white"}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Download all */}
            {filtered.length > 0 && (
              <button
                onClick={downloadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Tout télécharger ({filtered.length})
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Platform stats bar */}
        {Object.keys(byPlatform).length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-zinc-800/50 overflow-x-auto flex-shrink-0">
            <Filter className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all flex-shrink-0 ${typeFilter === "all" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-zinc-500 hover:text-zinc-300 border border-transparent"}`}
            >
              Tous ({mediaEntities.length})
            </button>
            {Object.entries(typeCounts).map(([t, n]) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t as TypeFilter)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all flex-shrink-0 ${typeFilter === t ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-zinc-500 hover:text-zinc-300 border border-transparent"}`}
              >
                {t.replace(/_/g, " ")} ({n})
              </button>
            ))}
            <div className="w-px h-4 bg-zinc-700 mx-1 flex-shrink-0" />
            {Object.entries(byPlatform).map(([p, n]) => (
              <div key={p} className="flex items-center gap-1 flex-shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getPlatformColor(p) }} />
                <span className="text-[10px] text-zinc-400">{p} ({n})</span>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">Aucun média trouvé</p>
                <p className="text-zinc-600 text-xs mt-1">Lance l'investigation avec Instagram, Twitter, Snapchat...</p>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((entity) => {
                const platform = getPlatformFromSource(entity.source, entity.metadata);
                const color = getPlatformColor(platform);
                const isErr = errors.has(entity.id);
                return (
                  <div
                    key={entity.id}
                    className="relative group rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/50 hover:border-zinc-500 transition-all cursor-pointer aspect-square"
                    onClick={() => setSelected(entity)}
                  >
                    {isErr ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                        <ImageIcon className="w-6 h-6 text-zinc-600" />
                        <p className="text-[9px] text-zinc-500 text-center break-all">{entity.value.slice(0, 40)}...</p>
                      </div>
                    ) : (
                      <img
                        src={entity.value}
                        alt={`${platform} ${entity.metadata?.type || "image"}`}
                        className={`w-full h-full object-cover transition-all ${loaded.has(entity.id) ? "opacity-100" : "opacity-0"}`}
                        onLoad={() => setLoaded(prev => new Set(prev).add(entity.id))}
                        onError={() => setErrors(prev => new Set(prev).add(entity.id))}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                    {/* Platform badge */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: color + "cc", color: "white" }}>
                      {platform.split(" ")[0].slice(0, 8)}
                    </div>
                    {/* Type badge */}
                    {entity.metadata?.type && (
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[8px] text-zinc-300 text-center truncate">
                        {entity.metadata.type.replace(/_/g, " ")}
                      </div>
                    )}
                    {/* Confidence */}
                    {entity.confidence >= 90 && (
                      <div className="absolute top-1.5 right-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // List view
            <div className="space-y-2">
              {filtered.map((entity) => {
                const platform = getPlatformFromSource(entity.source, entity.metadata);
                const color = getPlatformColor(platform);
                const isErr = errors.has(entity.id);
                return (
                  <div key={entity.id} className="flex items-center gap-3 p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-all">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
                      {isErr ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-zinc-500" />
                        </div>
                      ) : (
                        <img
                          src={entity.value} alt={platform}
                          className="w-full h-full object-cover"
                          onError={() => setErrors(prev => new Set(prev).add(entity.id))}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-semibold text-white">{platform}</span>
                        <span className="text-[10px] text-zinc-500">{entity.metadata?.type?.replace(/_/g, " ") || entity.type}</span>
                        {entity.confidence >= 90 && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{entity.value}</p>
                      {entity.metadata?.displayName && (
                        <p className="text-[10px] text-zinc-500 mt-0.5">Nom: {entity.metadata.displayName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-emerald-400 font-medium">{entity.confidence}%</span>
                      <button onClick={() => window.open(entity.value, "_blank")} className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => downloadSingle(entity)} className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-8"
          onClick={() => setSelected(null)}
        >
          <div className="relative max-w-2xl max-h-[80vh] w-full" onClick={e => e.stopPropagation()}>
            <img
              src={selected.value}
              alt="preview"
              className="w-full h-auto max-h-[70vh] object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-semibold text-white">{getPlatformFromSource(selected.source, selected.metadata)}</p>
                <p className="text-xs text-zinc-400">{selected.metadata?.type?.replace(/_/g, " ")} · {selected.confidence}% confidence</p>
                {selected.metadata?.displayName && <p className="text-xs text-zinc-500">Nom: {selected.metadata.displayName}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.open(selected.value, "_blank")} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs border border-zinc-700">
                  <ExternalLink className="w-3 h-3" /> Ouvrir
                </button>
                <button onClick={() => downloadSingle(selected)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg text-xs border border-violet-500/30">
                  <Download className="w-3 h-3" /> Télécharger
                </button>
                <button onClick={() => setSelected(null)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg border border-zinc-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
