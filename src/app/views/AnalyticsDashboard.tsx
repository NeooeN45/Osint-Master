// AnalyticsDashboard — Vue d'ensemble avec charts et stats temps réel
// Donut types, sources, distribution confidence, top sources, platform breakdown

import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  BarChart3, PieChart as PieIcon, TrendingUp, Activity,
  Award, Target, Zap, Database, Layers, Globe,
} from "lucide-react";
import { Entity, ToolState, Correlation, ec } from "../constants";

interface Props {
  entities: Entity[];
  correlations: Correlation[];
  tools: Record<string, ToolState>;
  target: string;
  elapsed: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#E1306C", "Twitter/X": "#1DA1F2", Facebook: "#4267B2",
  LinkedIn: "#0077B5", TikTok: "#ff0050", YouTube: "#FF0000",
  Telegram: "#0088cc", Reddit: "#FF4500", GitHub: "#6e5494",
  Snapchat: "#FFFC00", Pinterest: "#E60023", WhatsApp: "#25D366",
  VKontakte: "#4a76a8", Other: "#71717a",
};

export default function AnalyticsDashboard({ entities, correlations, tools, target, elapsed }: Props) {
  // ─ Stats ───
  const typeStats = useMemo(() => {
    const m = new Map<string, number>();
    entities.forEach(e => m.set(e.type, (m.get(e.type) || 0) + 1));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ name: type, value: count, color: ec(type) }));
  }, [entities]);

  const sourceStats = useMemo(() => {
    const m = new Map<string, { entities: number; high: number }>();
    entities.forEach(e => {
      if (!m.has(e.source)) m.set(e.source, { entities: 0, high: 0 });
      const s = m.get(e.source)!;
      s.entities++;
      if (e.confidence >= 80) s.high++;
    });
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, entities: v.entities, high: v.high }))
      .sort((a, b) => b.entities - a.entities)
      .slice(0, 10);
  }, [entities]);

  const confidenceDistribution = useMemo(() => {
    const buckets = [
      { range: "0-20", count: 0, color: "#ef4444" },
      { range: "20-40", count: 0, color: "#f97316" },
      { range: "40-60", count: 0, color: "#fbbf24" },
      { range: "60-80", count: 0, color: "#84cc16" },
      { range: "80-100", count: 0, color: "#34d399" },
    ];
    entities.forEach(e => {
      const idx = Math.min(Math.floor(e.confidence / 20), 4);
      buckets[idx].count++;
    });
    return buckets;
  }, [entities]);

  const platformStats = useMemo(() => {
    const m = new Map<string, number>();
    entities.forEach(e => {
      const p = e.metadata?.platform || null;
      if (p) m.set(p, (m.get(p) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value, color: PLATFORM_COLORS[name] || PLATFORM_COLORS.Other }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [entities]);

  const avgConfidence = useMemo(() => {
    if (entities.length === 0) return 0;
    return Math.round(entities.reduce((s, e) => s + e.confidence, 0) / entities.length);
  }, [entities]);

  const highConfCount = entities.filter(e => e.confidence >= 80).length;
  const verifiedCount = entities.filter(e => e.verified).length;
  const recursiveCount = entities.filter(e => e.depth > 0).length;

  const toolList = Object.values(tools);
  const doneTools = toolList.filter(t => t.status === "done").length;
  const errorTools = toolList.filter(t => t.status === "error").length;
  const runningTools = toolList.filter(t => t.status === "running").length;

  // Top modules by productivity
  const topModules = useMemo(() => {
    return toolList
      .filter(t => t.found && t.found > 0)
      .sort((a, b) => (b.found || 0) - (a.found || 0))
      .slice(0, 8)
      .map(t => ({ name: t.name, found: t.found || 0, duration: (t.duration || 0) / 1000 }));
  }, [toolList]);

  if (entities.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#3f3f46" }}>
        <BarChart3 style={{ width: 44, height: 44, opacity: 0.15 }} />
        <div style={{ fontSize: 12, color: "#52525b" }}>Pas encore de données à analyser</div>
      </div>
    );
  }

  // KPI Card component
  const Kpi = ({ icon: Icon, label, value, sub, color }: any) => (
    <div style={{
      flex: 1, minWidth: 120,
      padding: 14, borderRadius: 10,
      background: `linear-gradient(135deg, ${color}12, transparent 70%)`,
      border: `1px solid ${color}28`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: `${color}22`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 11, height: 11, color }} />
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#71717a" }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#f4f4f5", lineHeight: 1, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: "#52525b", marginTop: 3 }}>{sub}</div>}
    </div>
  );

  const Card = ({ title, icon: Icon, children, color = "#22d3ee" }: any) => (
    <div style={{
      padding: 14, borderRadius: 10,
      background: "rgba(255,255,255,.02)",
      border: "1px solid rgba(255,255,255,.06)",
      display: "flex", flexDirection: "column", gap: 10, minHeight: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Icon style={{ width: 12, height: 12, color }} />
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#d4d4d8" }}>{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="s" style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <Kpi icon={Database} label="Entités" value={entities.length} sub={`${recursiveCount} récursives`} color="#34d399" />
        <Kpi icon={Layers} label="Corrélations" value={correlations.length} sub="liens inter-entités" color="#a78bfa" />
        <Kpi icon={Target} label="Haute conf." value={highConfCount} sub={`${Math.round((highConfCount / Math.max(entities.length, 1)) * 100)}% du total`} color="#22d3ee" />
        <Kpi icon={Award} label="Conf. moyenne" value={`${avgConfidence}%`} color="#fbbf24" />
        <Kpi icon={Activity} label="Modules" value={`${doneTools}/${toolList.length}`} sub={`${runningTools} en cours · ${errorTools} erreurs`} color="#06b6d4" />
        <Kpi icon={Zap} label="Temps" value={`${elapsed}s`} sub={elapsed > 0 ? `${(entities.length / elapsed).toFixed(1)} ent/s` : ""} color="#f97316" />
      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>

        {/* Types donut */}
        <Card title="Répartition par type" icon={PieIcon} color="#34d399">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeStats} cx="50%" cy="50%"
                  innerRadius={45} outerRadius={75}
                  paddingAngle={2} dataKey="value"
                  animationDuration={400}
                >
                  {typeStats.map((e, i) => <Cell key={i} fill={e.color} stroke="#0a0c12" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a0c12", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
            {typeStats.slice(0, 6).map(t => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: t.color }} />
                <span style={{ color: "#a1a1aa" }}>{t.name} <span style={{ color: "#52525b" }}>({t.value})</span></span>
              </div>
            ))}
          </div>
        </Card>

        {/* Confidence distribution */}
        <Card title="Distribution de confiance" icon={TrendingUp} color="#22d3ee">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceDistribution} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={{ stroke: "rgba(255,255,255,.08)" }} />
                <YAxis tick={{ fontSize: 9, fill: "#71717a" }} axisLine={{ stroke: "rgba(255,255,255,.08)" }} />
                <Tooltip contentStyle={{ background: "#0a0c12", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, fontSize: 10 }} cursor={{ fill: "rgba(255,255,255,.03)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {confidenceDistribution.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Platforms */}
        {platformStats.length > 0 && (
          <Card title="Plateformes sociales détectées" icon={Globe} color="#a78bfa">
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformStats} layout="vertical" margin={{ top: 4, right: 10, bottom: 4, left: 80 }}>
                  <CartesianGrid stroke="rgba(255,255,255,.04)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={{ stroke: "rgba(255,255,255,.08)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#a1a1aa" }} width={75} axisLine={{ stroke: "rgba(255,255,255,.08)" }} />
                  <Tooltip contentStyle={{ background: "#0a0c12", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, fontSize: 10 }} cursor={{ fill: "rgba(255,255,255,.03)" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {platformStats.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Top sources */}
        <Card title="Top sources les + productives" icon={Award} color="#fbbf24">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceStats.slice(0, 8)} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#71717a" }} axisLine={{ stroke: "rgba(255,255,255,.08)" }} angle={-35} textAnchor="end" height={55} />
                <YAxis tick={{ fontSize: 9, fill: "#71717a" }} axisLine={{ stroke: "rgba(255,255,255,.08)" }} />
                <Tooltip contentStyle={{ background: "#0a0c12", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, fontSize: 10 }} cursor={{ fill: "rgba(255,255,255,.03)" }} />
                <Bar dataKey="entities" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                <Bar dataKey="high" fill="#34d399" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top modules by findings */}
        {topModules.length > 0 && (
          <Card title="Modules les + productifs" icon={Zap} color="#34d399">
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {topModules.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 9, color: "#52525b", width: 14, fontFamily: "monospace" }}>#{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "#d4d4d8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontSize: 8, color: "#52525b" }}>{m.duration.toFixed(1)}s</div>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#34d399", fontWeight: 700 }}>+{m.found}</div>
                  <div style={{ width: 70, height: 4, background: "rgba(255,255,255,.05)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(m.found / Math.max(topModules[0].found, 1)) * 100}%`,
                      background: "linear-gradient(90deg,#34d399,#22d3ee)",
                      borderRadius: 99,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Quality gauge */}
        <Card title="Qualité d'investigation" icon={Target} color="#a78bfa">
          <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="50%" outerRadius="95%"
                data={[
                  { name: "Entités", value: Math.min((entities.length / 50) * 100, 100), fill: "#34d399" },
                  { name: "Corrélations", value: Math.min((correlations.length / 20) * 100, 100), fill: "#a78bfa" },
                  { name: "Conf. moy.", value: avgConfidence, fill: "#22d3ee" },
                  { name: "Modules", value: toolList.length > 0 ? (doneTools / toolList.length) * 100 : 0, fill: "#fbbf24" },
                ]}
                startAngle={90} endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "rgba(255,255,255,.03)" }} />
                <Tooltip contentStyle={{ background: "#0a0c12", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, fontSize: 10 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, fontSize: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: "#34d399" }} /><span style={{ color: "#a1a1aa" }}>Entités</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: "#a78bfa" }} /><span style={{ color: "#a1a1aa" }}>Corrél.</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: "#22d3ee" }} /><span style={{ color: "#a1a1aa" }}>Conf.</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: "#fbbf24" }} /><span style={{ color: "#a1a1aa" }}>Mod.</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
