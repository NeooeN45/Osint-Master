// PersonProfile — Vue "dossier" unifié par personne
// Agrège toutes les infos trouvées sur un individu : profils, emails, phones, adresses, photos...

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  User, Mail, Phone, MapPin, Globe, Calendar, Shield, Award,
  CheckCircle2, AlertTriangle, ExternalLink, Link2, Hash,
  Eye, Target, TrendingUp, Image as ImageIcon, Users, ChevronRight, Lock, ChevronDown,
} from "lucide-react";
import { Entity, Correlation, ETYPE_ICONS, ec } from "../constants";

interface Props {
  entities: Entity[];
  correlations: Correlation[];
  target: string;
}

interface PersonDossier {
  id: string;
  name: string;
  aliases: string[];
  usernames: Entity[];
  emails: Entity[];
  phones: Entity[];
  locations: Entity[];
  socialProfiles: Entity[];
  urls: Entity[];
  avatars: string[];
  bioSnippets: string[];
  platforms: Set<string>;
  sources: Set<string>;
  confidence: number;
  breaches: Entity[];
  organizations: Entity[];
  allEntities: Entity[];
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#E1306C", "Twitter/X": "#1DA1F2", Facebook: "#4267B2",
  LinkedIn: "#0077B5", TikTok: "#ff0050", YouTube: "#FF0000",
  Telegram: "#0088cc", Reddit: "#FF4500", GitHub: "#6e5494",
  Snapchat: "#FFFC00", Pinterest: "#E60023", WhatsApp: "#25D366",
};

function normalizeName(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

// Construit les dossiers en clustering les entités autour des "persons"
function buildDossiers(entities: Entity[], target: string): PersonDossier[] {
  // Clé : nom de personne ou username ancrage
  const dossiers = new Map<string, PersonDossier>();

  const ensureDossier = (id: string, name: string): PersonDossier => {
    if (!dossiers.has(id)) {
      dossiers.set(id, {
        id, name, aliases: [],
        usernames: [], emails: [], phones: [], locations: [],
        socialProfiles: [], urls: [], avatars: [], bioSnippets: [],
        platforms: new Set(), sources: new Set(),
        confidence: 0, breaches: [], organizations: [],
        allEntities: [],
      });
    }
    return dossiers.get(id)!;
  };

  // 1) Créer un dossier pour chaque "person"
  const persons = entities.filter(e => e.type === "person");
  persons.forEach(p => ensureDossier(normalizeName(p.value), p.value));

  // Si aucune personne trouvée, créer un dossier basé sur la cible
  if (persons.length === 0 && target) {
    ensureDossier(normalizeName(target), target);
  }

  // 2) Dispatcher les entités vers les dossiers selon les metadata ou proximité
  const assignToDossier = (e: Entity) => {
    // Chercher dossier via metadata
    const meta = e.metadata || {};
    const candidates: string[] = [];
    if (meta.fullName) candidates.push(normalizeName(meta.fullName));
    if (meta.displayName) candidates.push(normalizeName(meta.displayName));
    if (meta.person) candidates.push(normalizeName(meta.person));
    if (meta.username) candidates.push(normalizeName(meta.username));
    // Target lui-même
    if (target) candidates.push(normalizeName(target));

    // Trouver le premier dossier qui matche
    for (const c of candidates) {
      if (dossiers.has(c)) return dossiers.get(c)!;
    }
    // Si on ne trouve pas, on crée un dossier orphelin au besoin
    return null;
  };

  for (const e of entities) {
    let dossier = assignToDossier(e);
    if (!dossier) {
      // Si c'est un username/email/phone de haute conf, créer un nouveau dossier
      if (["username", "email", "phone"].includes(e.type) && e.confidence >= 70) {
        dossier = ensureDossier(normalizeName(e.value), e.value);
      } else {
        // Rattacher au dossier "target" par défaut si existant
        const targetKey = normalizeName(target || "");
        dossier = dossiers.get(targetKey) || null;
      }
      if (!dossier) continue;
    }

    dossier.allEntities.push(e);
    dossier.sources.add(e.source);
    if (e.metadata?.platform) dossier.platforms.add(e.metadata.platform);

    switch (e.type) {
      case "username": dossier.usernames.push(e); break;
      case "email": dossier.emails.push(e); break;
      case "phone": dossier.phones.push(e); break;
      case "location": dossier.locations.push(e); break;
      case "social_profile": dossier.socialProfiles.push(e); break;
      case "url": dossier.urls.push(e); break;
      case "organization": dossier.organizations.push(e); break;
      case "breach": dossier.breaches.push(e); break;
      case "image_url":
      case "image":
        if (e.value.startsWith("http")) dossier.avatars.push(e.value);
        break;
    }
    // Extraire avatar depuis metadata
    const avatar = e.metadata?.avatar || e.metadata?.profile_pic_url || e.metadata?.thumbnail;
    if (avatar && typeof avatar === "string" && avatar.startsWith("http")) {
      if (!dossier.avatars.includes(avatar)) dossier.avatars.push(avatar);
    }
    // Bio snippets
    const bio = e.metadata?.bio || e.metadata?.biography;
    if (bio && typeof bio === "string" && bio.length > 5) {
      if (!dossier.bioSnippets.includes(bio)) dossier.bioSnippets.push(bio);
    }
    // Aliases (full names alternatifs)
    const fullName = e.metadata?.fullName || e.metadata?.displayName;
    if (fullName && typeof fullName === "string" && fullName !== dossier.name && !dossier.aliases.includes(fullName)) {
      dossier.aliases.push(fullName);
    }
  }

  // Calc confidence
  for (const d of dossiers.values()) {
    if (d.allEntities.length === 0) { d.confidence = 0; continue; }
    const avg = d.allEntities.reduce((s, e) => s + e.confidence, 0) / d.allEntities.length;
    // Bonus par diversité de sources
    const diversityBonus = Math.min(d.sources.size * 2, 15);
    d.confidence = Math.min(100, Math.round(avg + diversityBonus));
  }

  return Array.from(dossiers.values())
    .filter(d => d.allEntities.length > 0)
    .sort((a, b) => b.allEntities.length - a.allEntities.length);
}

export default function PersonProfile({ entities, correlations, target }: Props) {
  const dossiers = useMemo(() => buildDossiers(entities, target), [entities, target]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>("social");

  const selected = useMemo(() => dossiers.find(d => d.id === selectedId) || dossiers[0] || null, [dossiers, selectedId]);

  if (dossiers.length === 0 || !selected) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#3f3f46" }}>
        <User style={{ width: 44, height: 44, opacity: 0.15 }} />
        <div style={{ fontSize: 12, color: "#52525b" }}>Aucun profil à afficher</div>
        <div style={{ fontSize: 9, color: "#3f3f46", maxWidth: 340, textAlign: "center" }}>
          Les dossiers sont créés automatiquement quand des entités "person" sont détectées.
        </div>
      </div>
    );
  }

  const primaryAvatar = selected.avatars[0];
  const riskScore = Math.min(100, selected.breaches.length * 20 + selected.emails.length * 5);

  // Section helper
  const Section = ({ id, title, icon: Icon, count, color = "#22d3ee", children }: any) => {
    const isOpen = expandedSection === id;
    return (
      <div style={{
        borderRadius: 10, overflow: "hidden",
        border: "1px solid rgba(255,255,255,.06)",
        background: "rgba(255,255,255,.015)",
      }}>
        <button onClick={() => setExpandedSection(isOpen ? "" : id)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
            background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
          }}>
          <Icon style={{ width: 13, height: 13, color }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#d4d4d8" }}>{title}</span>
          {count != null && <span style={{ fontSize: 9, color: "#71717a", fontFamily: "monospace" }}>({count})</span>}
          <div style={{ flex: 1 }} />
          <ChevronDown style={{ width: 11, height: 11, color: "#52525b", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        {isOpen && (
          <div style={{ padding: "0 14px 12px" }}>{children}</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left: dossiers list */}
      {dossiers.length > 1 && (
        <div className="s" style={{
          width: 220, borderRight: "1px solid rgba(255,255,255,.05)",
          background: "rgba(8,10,18,.5)", overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{ padding: "10px 14px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#71717a", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
            Dossiers ({dossiers.length})
          </div>
          {dossiers.map(d => {
            const active = d.id === selected.id;
            return (
              <button key={d.id} onClick={() => setSelectedId(d.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                  background: active ? "rgba(34,211,238,.08)" : "transparent",
                  border: "none", borderLeft: `2px solid ${active ? "#22d3ee" : "transparent"}`,
                  cursor: "pointer", textAlign: "left",
                }}>
                {d.avatars[0] ? (
                  <img src={d.avatars[0]} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer"
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${active ? "#22d3ee" : "rgba(255,255,255,.1)"}` }}
                    onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User style={{ width: 13, height: 13, color: "#71717a" }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: active ? "#f4f4f5" : "#d4d4d8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontSize: 8, color: "#52525b" }}>{d.allEntities.length} éléments · {d.platforms.size} plat.</div>
                </div>
                <ChevronRight style={{ width: 10, height: 10, color: active ? "#22d3ee" : "#3f3f46" }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Right: selected dossier */}
      <div className="s" style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        {/* Header card */}
        <div style={{
          display: "flex", gap: 18, padding: 18, borderRadius: 14,
          background: "linear-gradient(135deg, rgba(34,211,238,.06), rgba(139,92,246,.04))",
          border: "1px solid rgba(34,211,238,.2)",
          marginBottom: 14,
          position: "relative", overflow: "hidden",
        }}>
          {/* Accent gradient */}
          <div style={{
            position: "absolute", top: -40, right: -40, width: 200, height: 200,
            borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,.15), transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {primaryAvatar ? (
              <img src={primaryAvatar} alt={selected.name} crossOrigin="anonymous" referrerPolicy="no-referrer"
                style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "3px solid #22d3ee", boxShadow: "0 0 24px rgba(34,211,238,.4)" }}
                onError={e => (e.target as HTMLImageElement).style.display = "none"} />
            ) : (
              <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,.05)", border: "2px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User style={{ width: 40, height: 40, color: "#52525b" }} />
              </div>
            )}
            {selected.avatars.length > 1 && (
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: "#0a0c12", border: "1px solid rgba(34,211,238,.5)",
                color: "#22d3ee",
              }}>+{selected.avatars.length - 1}</div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f4f4f5", margin: 0, letterSpacing: -0.5 }}>{selected.name}</h1>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: selected.confidence >= 80 ? "rgba(52,211,153,.15)" : "rgba(251,191,36,.15)",
                border: `1px solid ${selected.confidence >= 80 ? "rgba(52,211,153,.4)" : "rgba(251,191,36,.4)"}`,
                color: selected.confidence >= 80 ? "#34d399" : "#fbbf24",
                letterSpacing: 1,
              }}>{selected.confidence}% CONFIANCE</span>
            </div>
            {selected.aliases.length > 0 && (
              <div style={{ fontSize: 10, color: "#71717a", marginBottom: 6 }}>
                alias: {selected.aliases.slice(0, 3).join(" · ")}
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              {[
                { I: User, n: selected.usernames.length, l: "usernames", c: "#8b5cf6" },
                { I: Mail, n: selected.emails.length, l: "emails", c: "#3b82f6" },
                { I: Phone, n: selected.phones.length, l: "phones", c: "#22c55e" },
                { I: Globe, n: selected.socialProfiles.length, l: "profils", c: "#06b6d4" },
                { I: MapPin, n: selected.locations.length, l: "lieux", c: "#10b981" },
                { I: ImageIcon, n: selected.avatars.length, l: "photos", c: "#ec4899" },
                { I: Shield, n: selected.breaches.length, l: "breaches", c: "#ef4444" },
                { I: Users, n: selected.platforms.size, l: "plateformes", c: "#a78bfa" },
              ].filter(s => s.n > 0).map(s => (
                <div key={s.l} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "3px 8px", borderRadius: 6,
                  background: `${s.c}15`, border: `1px solid ${s.c}30`,
                }}>
                  <s.I style={{ width: 10, height: 10, color: s.c }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#e4e4e7" }}>{s.n}</span>
                  <span style={{ fontSize: 9, color: "#a1a1aa" }}>{s.l}</span>
                </div>
              ))}
            </div>

            {/* Bio */}
            {selected.bioSnippets.length > 0 && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#52525b", marginBottom: 4 }}>BIO</div>
                <div style={{ fontSize: 10, color: "#d4d4d8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {selected.bioSnippets[0].slice(0, 300)}
                  {selected.bioSnippets[0].length > 300 && "…"}
                </div>
              </div>
            )}
          </div>

          {/* Risk score */}
          <div style={{ textAlign: "center", flexShrink: 0, position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#71717a", marginBottom: 3 }}>Risque</div>
            <div style={{
              width: 58, height: 58, borderRadius: "50%",
              background: `conic-gradient(${riskScore > 60 ? "#ef4444" : riskScore > 30 ? "#fbbf24" : "#34d399"} ${riskScore * 3.6}deg, rgba(255,255,255,.05) 0deg)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              <div style={{
                position: "absolute", inset: 4, borderRadius: "50%", background: "#0a0c12",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: riskScore > 60 ? "#ef4444" : riskScore > 30 ? "#fbbf24" : "#34d399" }}>{riskScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Social profiles */}
          {selected.socialProfiles.length > 0 && (
            <Section id="social" title="Profils sociaux" icon={Globe} count={selected.socialProfiles.length} color="#06b6d4">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 6 }}>
                {selected.socialProfiles.map(p => {
                  const platform = p.metadata?.platform || "Other";
                  const col = PLATFORM_COLORS[platform] || "#71717a";
                  return (
                    <a key={p.id} href={p.value} target="_blank" rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: 8,
                        borderRadius: 7, background: `${col}0a`, border: `1px solid ${col}28`,
                        textDecoration: "none", cursor: "pointer", transition: "all .15s",
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = `${col}18`; e.currentTarget.style.borderColor = `${col}55`; }}
                      onMouseOut={e => { e.currentTarget.style.background = `${col}0a`; e.currentTarget.style.borderColor = `${col}28`; }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: `${col}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Globe style={{ width: 11, height: 11, color: col }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: col }}>{platform}</div>
                        <div style={{ fontSize: 9, color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.metadata?.username || p.value.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
                      </div>
                      <ExternalLink style={{ width: 10, height: 10, color: col, flexShrink: 0 }} />
                    </a>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Emails */}
          {selected.emails.length > 0 && (
            <Section id="emails" title="Emails" icon={Mail} count={selected.emails.length} color="#3b82f6">
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {selected.emails.map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.15)" }}>
                    <Mail style={{ width: 11, height: 11, color: "#3b82f6", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e4e4e7", flex: 1 }}>{e.value}</span>
                    {e.metadata?.masked && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(251,191,36,.15)", color: "#fbbf24" }}>masked</span>}
                    <span style={{ fontSize: 8, fontFamily: "monospace", color: "#71717a" }}>{e.source} · {e.confidence}%</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Phones */}
          {selected.phones.length > 0 && (
            <Section id="phones" title="Téléphones" icon={Phone} count={selected.phones.length} color="#22c55e">
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {selected.phones.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.15)" }}>
                    <Phone style={{ width: 11, height: 11, color: "#22c55e", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e4e4e7", flex: 1 }}>{p.value}</span>
                    {p.metadata?.masked && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(251,191,36,.15)", color: "#fbbf24" }}>masked</span>}
                    {p.metadata?.country && <span style={{ fontSize: 9, color: "#71717a" }}>{p.metadata.country}</span>}
                    <span style={{ fontSize: 8, fontFamily: "monospace", color: "#71717a" }}>{p.source}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Usernames */}
          {selected.usernames.length > 0 && (
            <Section id="usernames" title="Usernames" icon={User} count={selected.usernames.length} color="#8b5cf6">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {selected.usernames.map(u => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 6, background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.25)" }}>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#a78bfa", fontWeight: 700 }}>@{u.value}</span>
                    {u.metadata?.platform && <span style={{ fontSize: 8, color: "#71717a" }}>{u.metadata.platform}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Locations */}
          {selected.locations.length > 0 && (
            <Section id="locations" title="Localisations" icon={MapPin} count={selected.locations.length} color="#10b981">
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {selected.locations.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.15)" }}>
                    <MapPin style={{ width: 11, height: 11, color: "#10b981", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#e4e4e7", flex: 1 }}>{l.value}</span>
                    {(l.metadata?.lat || l.metadata?.latitude) && <span style={{ fontSize: 8, fontFamily: "monospace", color: "#71717a" }}>{(l.metadata.lat || l.metadata.latitude).toFixed?.(3) || l.metadata.lat || l.metadata.latitude}, {(l.metadata.lon || l.metadata.longitude)?.toFixed?.(3) || l.metadata.lon || l.metadata.longitude}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Breaches */}
          {selected.breaches.length > 0 && (
            <Section id="breaches" title="Fuites de données" icon={AlertTriangle} count={selected.breaches.length} color="#ef4444">
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {selected.breaches.map(b => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)" }}>
                    <Shield style={{ width: 11, height: 11, color: "#ef4444", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#e4e4e7", flex: 1 }}>{b.value}</span>
                    {b.metadata?.date && <span style={{ fontSize: 9, color: "#71717a" }}>{b.metadata.date}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Photos */}
          {selected.avatars.length > 0 && (
            <Section id="photos" title="Photos trouvées" icon={ImageIcon} count={selected.avatars.length} color="#ec4899">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 6 }}>
                {selected.avatars.slice(0, 20).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    style={{ aspectRatio: "1", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", cursor: "pointer" }}>
                    <img src={url} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* URLs */}
          {selected.urls.length > 0 && (
            <Section id="urls" title="URLs / liens" icon={Link2} count={selected.urls.length} color="#64748b">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {selected.urls.slice(0, 15).map(u => (
                  <a key={u.id} href={u.value} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 5, background: "rgba(100,116,139,.06)", textDecoration: "none", fontSize: 9, fontFamily: "monospace", color: "#94a3b8" }}>
                    <ExternalLink style={{ width: 9, height: 9, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.value}</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Data sources */}
          <Section id="sources" title="Sources de données" icon={Target} count={selected.sources.size} color="#71717a">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Array.from(selected.sources).sort().map(s => (
                <span key={s} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#a1a1aa", fontFamily: "monospace" }}>{s}</span>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
