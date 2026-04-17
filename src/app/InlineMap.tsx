import React, { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Map as MapIcon } from "lucide-react";
import { Entity, ec } from "./constants";

interface Props { entities: Entity[]; }

export default function InlineMap({ entities }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [cnt, setCnt] = useState(0);
  const [loading, setLoad] = useState(true);

  const geo = useMemo(() => entities.filter(e => {
    const m = e.metadata;
    return (e.type === "location" || e.type === "ip") &&
      (m?.lat || m?.latitude || m?.lon || m?.longitude);
  }), [entities]);

  useEffect(() => {
    if (!ref.current) return;
    let alive = true;
    (async () => {
      try {
        const L = await import("leaflet");
        // @ts-ignore
        await import("leaflet/dist/leaflet.css");
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        if (!alive || !ref.current) return;
        const map = L.map(ref.current, { zoomControl: false, attributionControl: false });
        mapRef.current = map;
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd", maxZoom: 19,
        }).addTo(map);
        L.control.zoom({ position: "topright" }).addTo(map);

        const pts: [number, number][] = [];
        for (const e of geo) {
          const m = e.metadata;
          const lat = parseFloat(m?.lat ?? m?.latitude ?? "");
          const lng = parseFloat(m?.lon ?? m?.longitude ?? m?.lng ?? "");
          if (isNaN(lat) || isNaN(lng)) continue;
          const col = ec(e.type);
          const icon = L.divIcon({
            html: `<div style="width:11px;height:11px;border-radius:50%;background:${col};border:2px solid #fff;box-shadow:0 0 8px ${col}80"></div>`,
            className: "", iconSize: [11, 11], iconAnchor: [5, 5],
          });
          const popup = `<div style="font:10px monospace;background:#111;color:#f4f4f5;padding:7px;border-radius:6px;min-width:150px">
            <b style="color:${col}">[${e.type.toUpperCase()}]</b><br/>
            ${e.value}<br/>
            <span style="color:#6b7280">📍 ${[m?.city, m?.country].filter(Boolean).join(", ") || "?"}</span><br/>
            <span style="color:#6b7280">${e.source} · ${e.confidence}%</span>
            ${m?.isp ? `<br/><span style="color:#6b7280">🔌 ${m.isp}</span>` : ""}
            ${m?.asn ? `<br/><span style="color:#6b7280">ASN: ${m.asn}</span>` : ""}
          </div>`;
          L.marker([lat, lng], { icon }).bindPopup(popup, { className: "osint-popup" }).addTo(map);
          pts.push([lat, lng]);
        }
        if (pts.length) map.fitBounds(pts, { padding: [28, 28], maxZoom: 8 });
        else map.setView([20, 0], 2);
        if (alive) { setCnt(pts.length); setLoad(false); }
      } catch (err) {
        console.error("Map error:", err);
        if (alive) setLoad(false);
      }
    })();
    return () => {
      alive = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [geo]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <style>{`
        .osint-popup .leaflet-popup-content-wrapper{background:#111827;color:#f4f4f5;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:0;box-shadow:0 8px 24px rgba(0,0,0,.5)}
        .osint-popup .leaflet-popup-tip{background:#111827}
        .osint-popup .leaflet-popup-content{margin:0}
      `}</style>
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(7,9,15,.8)", zIndex: 10, gap: 9 }}>
          <Loader2 style={{ width: 18, height: 18, color: "#22d3ee", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 11, color: "#71717a" }}>Chargement carte...</span>
        </div>
      )}
      <div style={{ padding: "5px 13px", borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(8,10,18,.8)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <MapIcon style={{ width: 11, height: 11, color: "#22d3ee" }} />
        <span style={{ fontSize: 11, color: "#71717a" }}>
          <strong style={{ color: "#34d399" }}>{cnt}</strong> points géo ·{" "}
          <strong style={{ color: "#f4f4f5" }}>{geo.length}</strong> entités géolocalisées
        </span>
        {geo.length === 0 && <span style={{ fontSize: 9, color: "#3f3f46" }}>— Lancez une investigation pour voir les localisations</span>}
      </div>
      <div ref={ref} style={{ flex: 1, background: "#0d1117" }} />
    </div>
  );
}
