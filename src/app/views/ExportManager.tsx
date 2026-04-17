// ExportManager — Exports professionnels
// PDF Maltego-like + MISP/STIX + GraphML + CSV

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText, Share2, Database, FileSpreadsheet, Download,
  X, Loader2, CheckCircle2, Award,
} from "lucide-react";
import { Entity, Correlation, ToolState } from "../constants";

interface Props {
  entities: Entity[];
  correlations: Correlation[];
  tools: Record<string, ToolState>;
  target: string;
  elapsed: number;
  aiAnalysis?: string;
  onClose: () => void;
}

type ExportFormat = "pdf" | "misp" | "stix" | "graphml" | "csv" | "json";

export default function ExportManager({ entities, correlations, tools, target, elapsed, aiAnalysis, onClose }: Props) {
  const [selected, setSelected] = useState<ExportFormat>("pdf");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // ─── PDF Report ───
  const exportPDF = async () => {
    const doc = new jsPDF({ format: "a4", unit: "mm" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header
    doc.setFillColor(10, 12, 20);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setFillColor(34, 211, 238);
    doc.rect(0, 28, pageW, 2, "F");
    doc.setTextColor(255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("OSINT REPORT", 15, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Cible : ${target}`, 15, 23);
    doc.setTextColor(150);
    doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, pageW - 15, 16, { align: "right" });
    doc.text(`Durée : ${elapsed}s`, pageW - 15, 22, { align: "right" });
    y = 40;

    // Executive summary
    doc.setTextColor(0);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Résumé exécutif", 15, y); y += 7;
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    const typeCounts: Record<string, number> = {};
    entities.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => `${n} ${t}`).join(", ");

    const avgConf = entities.length > 0 ? Math.round(entities.reduce((s, e) => s + e.confidence, 0) / entities.length) : 0;
    const toolList = Object.values(tools);
    const summary = [
      `Investigation menée sur la cible "${target}".`,
      `${entities.length} entités découvertes, ${correlations.length} corrélations établies.`,
      `Principaux types : ${topTypes}.`,
      `Confiance moyenne : ${avgConf}%. Modules exécutés : ${toolList.length} (${toolList.filter(t => t.status === "done").length} succès).`,
    ];
    summary.forEach(s => { doc.text(s, 15, y, { maxWidth: pageW - 30 }); y += 5; });
    y += 3;

    // KPI Box
    const kpis = [
      { l: "Entités", v: entities.length, c: [52, 211, 153] },
      { l: "Corrélations", v: correlations.length, c: [167, 139, 250] },
      { l: "Conf. moy.", v: `${avgConf}%`, c: [34, 211, 238] },
      { l: "Durée", v: `${elapsed}s`, c: [251, 191, 36] },
    ];
    const kpiW = (pageW - 30) / 4;
    kpis.forEach((k, i) => {
      const x = 15 + i * kpiW;
      doc.setFillColor(k.c[0], k.c[1], k.c[2], 0.1);
      doc.setDrawColor(k.c[0], k.c[1], k.c[2]);
      doc.roundedRect(x, y, kpiW - 3, 18, 2, 2, "FD");
      doc.setFontSize(8); doc.setTextColor(100);
      doc.text(k.l, x + 3, y + 5);
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.setTextColor(k.c[0], k.c[1], k.c[2]);
      doc.text(String(k.v), x + 3, y + 14);
      doc.setFont("helvetica", "normal");
    });
    y += 22;

    // AI Analysis
    if (aiAnalysis) {
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
      doc.text("Analyse IA", 15, y); y += 6;
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60);
      const lines = doc.splitTextToSize(aiAnalysis, pageW - 30);
      if (y + lines.length * 4 > 270) { doc.addPage(); y = 15; }
      doc.text(lines, 15, y);
      y += lines.length * 4 + 5;
    }

    // Table entités (avec pagination auto)
    if (y > 220) { doc.addPage(); y = 15; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
    doc.text(`Entités détaillées (${entities.length})`, 15, y); y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Type", "Valeur", "Source", "Conf.", "Profondeur"]],
      body: entities.slice(0, 200).map(e => [
        e.type,
        e.value.length > 60 ? e.value.slice(0, 57) + "..." : e.value,
        e.source,
        `${e.confidence}%`,
        e.depth,
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 211, 238], textColor: 255, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 22 }, 1: { cellWidth: 95 },
        2: { cellWidth: 35 }, 3: { cellWidth: 15 }, 4: { cellWidth: 18 },
      },
    });

    // Corrélations
    if (correlations.length > 0) {
      doc.addPage();
      y = 15;
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text(`Corrélations (${correlations.length})`, 15, y); y += 6;
      autoTable(doc, {
        startY: y,
        head: [["De", "Vers", "Type", "Force", "Preuve"]],
        body: correlations.slice(0, 150).map(c => {
          const from = entities.find(e => e.id === c.from)?.value.slice(0, 40) || c.from.slice(0, 10);
          const to = entities.find(e => e.id === c.to)?.value.slice(0, 40) || c.to.slice(0, 10);
          return [from, to, c.type, `${c.strength}%`, c.evidence?.slice(0, 40) || ""];
        }),
        theme: "grid",
        headStyles: { fillColor: [167, 139, 250], textColor: 255, fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 15, right: 15 },
      });
    }

    // Footer sur chaque page
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`OSINT Master — Rapport confidentiel`, 15, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Page ${i} / ${pageCount}`, pageW - 15, doc.internal.pageSize.getHeight() - 8, { align: "right" });
    }

    doc.save(`osint_${target.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.pdf`);
  };

  // ─── MISP JSON ───
  const exportMISP = () => {
    const now = new Date().toISOString();
    const event = {
      Event: {
        info: `OSINT investigation: ${target}`,
        date: now.split("T")[0],
        threat_level_id: "3",
        analysis: "1",
        distribution: "0",
        uuid: crypto.randomUUID?.() || `${Date.now()}`,
        Attribute: entities.map(e => ({
          uuid: e.id,
          type: mapToMISP(e.type),
          category: mapToMISPCat(e.type),
          value: e.value,
          to_ids: e.confidence >= 80,
          distribution: "0",
          comment: `${e.source} (${e.confidence}%)${e.metadata?.platform ? ` [${e.metadata.platform}]` : ""}`,
          Tag: [
            { name: `source:${e.source}` },
            { name: `confidence:${e.confidence}` },
            ...(e.metadata?.platform ? [{ name: `platform:${e.metadata.platform}` }] : []),
          ],
        })),
        Object: correlations.map(c => ({
          uuid: c.id,
          name: "relationship",
          ObjectReference: [
            { referenced_uuid: c.from, relationship_type: c.type },
            { referenced_uuid: c.to, relationship_type: c.type },
          ],
          comment: `${c.type} (strength=${c.strength})`,
        })),
      },
    };
    downloadBlob(JSON.stringify(event, null, 2), `misp_${target}_${Date.now()}.json`, "application/json");
  };

  // ─── STIX 2.1 ───
  const exportSTIX = () => {
    const now = new Date().toISOString();
    const bundle = {
      type: "bundle",
      id: `bundle--${crypto.randomUUID?.() || Date.now()}`,
      objects: [
        // Identity
        {
          type: "identity",
          spec_version: "2.1",
          id: `identity--${crypto.randomUUID?.() || Date.now()}`,
          created: now, modified: now,
          name: "OSINT Master",
          identity_class: "system",
        },
        // Entities as observables / indicators
        ...entities.map(e => ({
          type: mapToSTIX(e.type),
          spec_version: "2.1",
          id: `${mapToSTIX(e.type)}--${e.id.replace(/[^a-z0-9-]/gi, "")}-${Date.now()}`,
          created: now, modified: now,
          value: e.value,
          ...(e.type === "email" ? { value: e.value } : {}),
          ...(e.type === "ip" ? { value: e.value } : {}),
          ...(e.type === "domain" ? { value: e.value } : {}),
          labels: [e.source, `confidence:${e.confidence}`],
        })),
        // Relationships
        ...correlations.map(c => ({
          type: "relationship",
          spec_version: "2.1",
          id: `relationship--${c.id.replace(/[^a-z0-9-]/gi, "")}-${Date.now()}`,
          created: now, modified: now,
          relationship_type: c.type,
          source_ref: entities.find(e => e.id === c.from)?.id,
          target_ref: entities.find(e => e.id === c.to)?.id,
          description: c.evidence,
        })),
      ],
    };
    downloadBlob(JSON.stringify(bundle, null, 2), `stix_${target}_${Date.now()}.json`, "application/json");
  };

  // ─── GraphML (pour Gephi/Cytoscape) ───
  const exportGraphML = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="value" for="node" attr.name="value" attr.type="string"/>
  <key id="confidence" for="node" attr.name="confidence" attr.type="int"/>
  <key id="source" for="node" attr.name="source" attr.type="string"/>
  <key id="relationship" for="edge" attr.name="relationship" attr.type="string"/>
  <key id="strength" for="edge" attr.name="strength" attr.type="int"/>
  <graph id="G" edgedefault="directed">
${entities.map(e => `    <node id="${e.id}">
      <data key="type">${esc(e.type)}</data>
      <data key="value">${esc(e.value)}</data>
      <data key="confidence">${e.confidence}</data>
      <data key="source">${esc(e.source)}</data>
    </node>`).join("\n")}
${correlations.map(c => `    <edge source="${c.from}" target="${c.to}">
      <data key="relationship">${esc(c.type)}</data>
      <data key="strength">${c.strength}</data>
    </edge>`).join("\n")}
  </graph>
</graphml>`;
    downloadBlob(xml, `graph_${target}_${Date.now()}.graphml`, "application/xml");
  };

  // ─── CSV ───
  const exportCSV = () => {
    const header = "id,type,value,source,confidence,depth,verified,metadata\n";
    const rows = entities.map(e => [
      e.id, e.type, `"${e.value.replace(/"/g, '""')}"`,
      e.source, e.confidence, e.depth, e.verified,
      `"${JSON.stringify(e.metadata).replace(/"/g, '""')}"`,
    ].join(",")).join("\n");
    downloadBlob(header + rows, `entities_${target}_${Date.now()}.csv`, "text/csv");
  };

  // ─── JSON brut ───
  const exportJSON = () => {
    downloadBlob(
      JSON.stringify({ target, generatedAt: new Date().toISOString(), entities, correlations, tools, elapsed }, null, 2),
      `osint_${target}_${Date.now()}.json`,
      "application/json"
    );
  };

  const handleExport = async () => {
    setGenerating(true);
    try {
      if (selected === "pdf") await exportPDF();
      else if (selected === "misp") exportMISP();
      else if (selected === "stix") exportSTIX();
      else if (selected === "graphml") exportGraphML();
      else if (selected === "csv") exportCSV();
      else if (selected === "json") exportJSON();
      setDone(selected);
      setTimeout(() => setDone(null), 2500);
    } catch (e: any) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const formats = [
    { id: "pdf" as const, name: "PDF Rapport", sub: "Rapport pro paginé avec charts", icon: FileText, color: "#ef4444" },
    { id: "misp" as const, name: "MISP JSON", sub: "Threat intelligence format", icon: Share2, color: "#a78bfa" },
    { id: "stix" as const, name: "STIX 2.1", sub: "Standard threat intel", icon: Database, color: "#22d3ee" },
    { id: "graphml" as const, name: "GraphML", sub: "Pour Gephi / Cytoscape", icon: Share2, color: "#f97316" },
    { id: "csv" as const, name: "CSV", sub: "Tableur / Excel", icon: FileSpreadsheet, color: "#34d399" },
    { id: "json" as const, name: "JSON brut", sub: "Backup complet", icon: Database, color: "#71717a" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{
          width: "min(720px, 92vw)", maxHeight: "90vh",
          background: "#0a0c12", border: "1px solid rgba(255,255,255,.1)",
          borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,.6)",
        }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#22d3ee,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Download style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#f4f4f5" }}>Export professionnel</div>
            <div style={{ fontSize: 10, color: "#71717a" }}>{entities.length} entités · {correlations.length} corrélations</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer" }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Format grid */}
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, overflowY: "auto" }}>
          {formats.map(f => {
            const active = selected === f.id;
            return (
              <button key={f.id} onClick={() => setSelected(f.id)}
                style={{
                  padding: 14, borderRadius: 10, cursor: "pointer",
                  background: active ? `${f.color}14` : "rgba(255,255,255,.02)",
                  border: `1px solid ${active ? f.color : "rgba(255,255,255,.08)"}`,
                  display: "flex", gap: 10, textAlign: "left",
                  transition: "all .15s",
                }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${f.color}22`, border: `1px solid ${f.color}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <f.icon style={{ width: 16, height: 16, color: f.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? f.color : "#d4d4d8" }}>{f.name}</div>
                  <div style={{ fontSize: 9, color: "#71717a", marginTop: 2 }}>{f.sub}</div>
                </div>
                {active && <CheckCircle2 style={{ width: 14, height: 14, color: f.color, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 8, alignItems: "center", background: "rgba(0,0,0,.25)" }}>
          <div style={{ flex: 1, fontSize: 10, color: "#52525b" }}>
            {done ? <span style={{ color: "#34d399", display: "flex", alignItems: "center", gap: 5 }}><CheckCircle2 style={{ width: 11, height: 11 }} />Exporté</span> : `Format : ${selected.toUpperCase()}`}
          </div>
          <button onClick={onClose}
            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "transparent", border: "1px solid rgba(255,255,255,.1)", color: "#a1a1aa", cursor: "pointer" }}>
            Annuler
          </button>
          <button onClick={handleExport} disabled={generating || entities.length === 0}
            style={{ padding: "7px 16px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "linear-gradient(135deg,#22d3ee,#a78bfa)", border: "none", color: "#fff", cursor: "pointer", opacity: generating || entities.length === 0 ? 0.5 : 1, display: "flex", alignItems: "center", gap: 5 }}>
            {generating ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 11, height: 11 }} />}
            Exporter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───
function mapToMISP(t: string): string {
  const m: Record<string, string> = {
    email: "email-src", username: "target-user", phone: "phone-number",
    domain: "domain", ip: "ip-dst", url: "url", image: "attachment",
    location: "geo-location", social_profile: "text", person: "target-user",
  };
  return m[t] || "text";
}
function mapToMISPCat(t: string): string {
  const m: Record<string, string> = {
    email: "Network activity", ip: "Network activity", domain: "Network activity",
    phone: "Targeting data", username: "Targeting data", person: "Targeting data",
    location: "External analysis", social_profile: "Targeting data",
  };
  return m[t] || "External analysis";
}
function mapToSTIX(t: string): string {
  const m: Record<string, string> = {
    email: "email-addr", ip: "ipv4-addr", domain: "domain-name",
    url: "url", username: "user-account", person: "identity",
    image: "file", location: "location", phone: "observed-data",
  };
  return m[t] || "observed-data";
}
function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
