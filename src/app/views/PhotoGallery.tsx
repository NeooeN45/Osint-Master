// PhotoGallery — Galerie auto des photos/avatars trouvés
// Extrait les URLs d'images des entités et les affiche en grid
// Clustering visuel par source + preview au hover

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImageIcon, ExternalLink, X, Maximize2, Download, Grid3x3, Grid2x2 } from "lucide-react";
import { Entity, ec } from "../constants";

interface Props {
  entities: Entity[];
  target: string;
}

interface ImageItem {
  url: string;
  source: string;
  entity: Entity;
  type: "avatar" | "post" | "other";
  platform?: string;
  username?: string;
  fullName?: string;
  title?: string;
}

const IMG_EXT_RE = /\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i;
const AVATAR_HINTS = ["profile_pic", "avatar", "photo", "profile_picture", "profile_img", "profileImage"];

function isImageEntity(e: Entity): boolean {
  if (e.type === "image" || e.type === "image_url") return true;
  if (e.type === "url" && IMG_EXT_RE.test(e.value)) return true;
  return false;
}

function extractImageFromMeta(e: Entity): string | null {
  const m = e.metadata || {};
  for (const k of AVATAR_HINTS) {
    if (typeof m[k] === "string" && m[k].startsWith("http")) return m[k];
  }
  // Instagram profile_pic_url
  if (m.avatar && typeof m.avatar === "string" && m.avatar.startsWith("http")) return m.avatar;
  if (m.thumbnail && typeof m.thumbnail === "string" && m.thumbnail.startsWith("http")) return m.thumbnail;
  if (m.imageUrl && typeof m.imageUrl === "string" && m.imageUrl.startsWith("http")) return m.imageUrl;
  if (m.image && typeof m.image === "string" && m.image.startsWith("http")) return m.image;
  return null;
}

export default function PhotoGallery({ entities, target }: Props) {
  const [selected, setSelected] = useState<ImageItem | null>(null);
  const [groupBy, setGroupBy] = useState<"source" | "platform" | "none">("source");
  const [gridSize, setGridSize] = useState<"lg" | "md" | "sm">("md");

  // Collecte toutes les images
  const items: ImageItem[] = useMemo(() => {
    const seen = new Set<string>();
    const out: ImageItem[] = [];

    for (const e of entities) {
      // Entité directe de type image/image_url
      if (isImageEntity(e)) {
        const url = e.value;
        if (seen.has(url)) continue;
        seen.add(url);
        const hint = AVATAR_HINTS.some(h => url.includes(h)) || e.metadata?.type === "profile_picture";
        out.push({
          url, source: e.source, entity: e,
          type: hint ? "avatar" : "post",
          platform: e.metadata?.platform,
          username: e.metadata?.username,
          fullName: e.metadata?.fullName || e.metadata?.displayName,
        });
      } else {
        // Extraire une image depuis les metadata de n'importe quelle entité
        const imgUrl = extractImageFromMeta(e);
        if (imgUrl && !seen.has(imgUrl)) {
          seen.add(imgUrl);
          out.push({
            url: imgUrl, source: e.source, entity: e,
            type: "avatar",
            platform: e.metadata?.platform || e.type,
            username: e.value.startsWith("http") ? undefined : e.value,
            fullName: e.metadata?.fullName || e.metadata?.displayName,
            title: e.value,
          });
        }
      }
    }
    return out;
  }, [entities]);

  // Group
  const grouped = useMemo(() => {
    if (groupBy === "none") return { "Tout": items };
    const m: Record<string, ImageItem[]> = {};
    items.forEach(it => {
      const key = groupBy === "source" ? (it.source || "inconnu") : (it.platform || "inconnu");
      if (!m[key]) m[key] = [];
      m[key].push(it);
    });
    return m;
  }, [items, groupBy]);

  if (items.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#3f3f46" }}>
        <ImageIcon style={{ width: 44, height: 44, opacity: 0.15 }} />
        <div style={{ fontSize: 12, color: "#52525b" }}>Aucune image détectée</div>
        <div style={{ fontSize: 9, color: "#3f3f46", maxWidth: 340, textAlign: "center" }}>
          Les photos de profil et images apparaîtront ici automatiquement dès qu'elles seront trouvées par les modules (ig_profile, reverse_image_search, gravatar...)
        </div>
      </div>
    );
  }

  const tileSize = gridSize === "lg" ? 160 : gridSize === "md" ? 120 : 80;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "6px 14px",
        borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(8,10,18,.7)",
        flexShrink: 0,
      }}>
        <ImageIcon style={{ width: 11, height: 11, color: "#10b981" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#d4d4d8" }}>Galerie — {items.length} images</span>
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,.08)" }} />
        <span style={{ fontSize: 9, color: "#71717a" }}>Grouper:</span>
        <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
          {(["source", "platform", "none"] as const).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              style={{ padding: "3px 8px", fontSize: 9, fontWeight: 700, borderRadius: 4,
                cursor: "pointer", background: groupBy === g ? "rgba(34,211,238,.15)" : "transparent",
                border: "none", color: groupBy === g ? "#22d3ee" : "#71717a" }}>{g}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
          <button onClick={() => setGridSize("sm")}
            style={{ padding: 4, borderRadius: 4, background: gridSize === "sm" ? "rgba(34,211,238,.15)" : "transparent", border: "none", color: gridSize === "sm" ? "#22d3ee" : "#71717a", cursor: "pointer" }}>
            <Grid3x3 style={{ width: 10, height: 10 }} />
          </button>
          <button onClick={() => setGridSize("md")}
            style={{ padding: 4, borderRadius: 4, background: gridSize === "md" ? "rgba(34,211,238,.15)" : "transparent", border: "none", color: gridSize === "md" ? "#22d3ee" : "#71717a", cursor: "pointer" }}>
            <Grid2x2 style={{ width: 10, height: 10 }} />
          </button>
          <button onClick={() => setGridSize("lg")}
            style={{ padding: 4, borderRadius: 4, background: gridSize === "lg" ? "rgba(34,211,238,.15)" : "transparent", border: "none", color: gridSize === "lg" ? "#22d3ee" : "#71717a", cursor: "pointer" }}>
            <Maximize2 style={{ width: 10, height: 10 }} />
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="s" style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {Object.entries(grouped).map(([groupName, groupItems]) => (
          <div key={groupName} style={{ marginBottom: 18 }}>
            {groupBy !== "none" && (
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5,
                color: "#71717a", marginBottom: 8, paddingBottom: 5,
                borderBottom: "1px solid rgba(255,255,255,.05)",
              }}>
                {groupName} <span style={{ color: "#52525b", fontWeight: 400 }}>({groupItems.length})</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))`, gap: 8 }}>
              <AnimatePresence>
                {groupItems.map((it, idx) => (
                  <motion.div
                    key={it.url + idx}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setSelected(it)}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8, overflow: "hidden", cursor: "pointer",
                      border: "1px solid rgba(255,255,255,.08)",
                      background: "rgba(255,255,255,.03)",
                      position: "relative",
                      transition: "transform .15s, border-color .15s",
                    }}
                    whileHover={{ scale: 1.04 }}
                    onMouseOver={e => e.currentTarget.style.borderColor = "rgba(34,211,238,.4)"}
                    onMouseOut={e => e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"}
                  >
                    <img
                      src={it.url}
                      alt={it.username || it.title || "image"}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLDivElement).style.display = "flex"; }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                    <div style={{
                      position: "absolute", inset: 0, display: "none",
                      alignItems: "center", justifyContent: "center", flexDirection: "column",
                      background: "rgba(10,12,20,.9)", color: "#52525b", fontSize: 9, gap: 4,
                    }}>
                      <ImageIcon style={{ width: 16, height: 16 }} />
                      <span>blocked</span>
                    </div>

                    {/* Overlay */}
                    <div style={{
                      position: "absolute", left: 0, right: 0, bottom: 0,
                      padding: "16px 6px 4px",
                      background: "linear-gradient(to top, rgba(0,0,0,.95) 0%, rgba(0,0,0,.7) 50%, transparent 100%)",
                      color: "#f4f4f5",
                    }}>
                      {it.platform && (
                        <div style={{
                          fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2,
                          padding: "1px 5px", borderRadius: 3,
                          background: "rgba(255,255,255,.15)",
                          display: "inline-block", marginBottom: 2,
                        }}>{it.platform}</div>
                      )}
                      {(it.username || it.fullName) && (
                        <div style={{ fontSize: 9, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {it.fullName || it.username}
                        </div>
                      )}
                    </div>

                    {/* Type badge */}
                    <div style={{
                      position: "absolute", top: 4, left: 4,
                      fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                      background: it.type === "avatar" ? "rgba(34,211,238,.8)" : "rgba(139,92,246,.8)",
                      color: "#0a0c12",
                    }}>{it.type === "avatar" ? "AVATAR" : "IMG"}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,.92)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 40,
            }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              style={{
                display: "flex", gap: 20, maxWidth: "90vw", maxHeight: "90vh",
                borderRadius: 12, overflow: "hidden",
              }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selected.url} alt=""
                style={{ maxWidth: "70vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
              <div style={{
                width: 280, padding: 18,
                background: "rgba(10,12,20,.95)", borderRadius: 8,
                border: "1px solid rgba(255,255,255,.1)",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    {selected.platform && (
                      <div style={{
                        fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5,
                        padding: "2px 7px", borderRadius: 4, display: "inline-block",
                        background: "rgba(255,255,255,.08)", color: "#d4d4d8",
                      }}>{selected.platform}</div>
                    )}
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer" }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                {selected.fullName && <div style={{ fontSize: 14, fontWeight: 700, color: "#f4f4f5" }}>{selected.fullName}</div>}
                {selected.username && <div style={{ fontSize: 11, fontFamily: "monospace", color: "#22d3ee" }}>@{selected.username}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10 }}>
                  <div><span style={{ color: "#52525b" }}>source:</span> <span style={{ color: "#a1a1aa", fontFamily: "monospace" }}>{selected.source}</span></div>
                  <div><span style={{ color: "#52525b" }}>type:</span> <span style={{ color: "#a1a1aa" }}>{selected.type}</span></div>
                  <div><span style={{ color: "#52525b" }}>conf:</span> <span style={{ color: selected.entity.confidence >= 80 ? "#34d399" : "#fbbf24" }}>{selected.entity.confidence}%</span></div>
                </div>
                <div style={{ fontSize: 8, fontFamily: "monospace", color: "#3f3f46", wordBreak: "break-all", padding: 6, borderRadius: 5, background: "rgba(0,0,0,.3)" }}>
                  {selected.url}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <a href={selected.url} target="_blank" rel="noreferrer"
                    style={{ flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                      background: "rgba(34,211,238,.15)", border: "1px solid rgba(34,211,238,.35)",
                      color: "#22d3ee", textDecoration: "none", textAlign: "center",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <ExternalLink style={{ width: 10, height: 10 }} />Ouvrir
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(selected.url)}
                    style={{ flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                      background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)",
                      color: "#a1a1aa", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Download style={{ width: 10, height: 10 }} />Copier URL
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
