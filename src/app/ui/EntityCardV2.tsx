// EntityCardV2 — carte d'entité redesignée premium
// Expanding, animations, actions

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ExternalLink, ChevronDown, Copy, Check, Hash, Link2, Share2,
  Shield, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Entity, Correlation, ETYPE_ICONS, ec } from "../constants";
import { cn, Badge, IconButton, Tooltip } from "./primitives";

interface Props {
  entity: Entity;
  correlations: Correlation[];
  entities: Entity[];
  onSelect?: (e: Entity) => void;
}

export default function EntityCardV2({ entity, correlations, entities, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const Icon = ETYPE_ICONS[entity.type] || Hash;
  const color = ec(entity.type);
  const isUrl = entity.value.startsWith("http");

  const confColor = entity.confidence >= 80 ? "#34d399" : entity.confidence >= 50 ? "#fbbf24" : "#f87171";
  const confVariant = entity.confidence >= 80 ? "success" : entity.confidence >= 50 ? "warning" : "danger";

  const rels = useMemo(() =>
    correlations
      .filter(x => x.from === entity.id || x.to === entity.id)
      .map(x => {
        const otherId = x.from === entity.id ? x.to : x.from;
        const other = entities.find(e => e.id === otherId);
        return other ? { ...x, other } : null;
      })
      .filter(Boolean) as Array<Correlation & { other: Entity }>,
    [entity.id, correlations, entities]
  );

  const filledMeta = useMemo(() =>
    Object.entries(entity.metadata || {})
      .filter(([, v]) => v != null && v !== "" && v !== false),
    [entity.metadata]
  );

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entity.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="group rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.15] transition-all bg-white/[0.015] lift"
      style={{
        boxShadow: open ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${color}33` : undefined,
        background: open ? `linear-gradient(180deg, ${color}08 0%, transparent 40%)` : undefined,
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}38`,
            color: color,
            boxShadow: `inset 0 1px 0 ${color}22`,
          }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `${color}18`, color: color }}
            >
              {entity.type}
            </span>
            <Badge variant={confVariant} size="xs">{entity.confidence}%</Badge>
            {entity.verified && (
              <Tooltip content="Entité vérifiée">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              </Tooltip>
            )}
            {entity.depth > 0 && (
              <Badge variant="muted" size="xs">d:{entity.depth}</Badge>
            )}
            {rels.length > 0 && (
              <Tooltip content={`${rels.length} corrélation(s)`}>
                <span className="flex items-center gap-0.5 text-[9px] text-purple-400 font-semibold">
                  <Share2 className="w-2 h-2" />
                  {rels.length}
                </span>
              </Tooltip>
            )}
          </div>

          <div className="text-xs font-medium text-zinc-100 break-all leading-relaxed">
            {entity.value.length > 80 ? entity.value.slice(0, 77) + "…" : entity.value}
          </div>

          <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="text-mono">{entity.source}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content={copied ? "Copié !" : "Copier"}>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? <Check className="text-emerald-400" /> : <Copy />}
            </IconButton>
          </Tooltip>
          {isUrl && (
            <Tooltip content="Ouvrir">
              <a
                href={entity.value}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-6 h-6 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </Tooltip>
          )}
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="flex-shrink-0 mt-1.5"
        >
          <ChevronDown className="w-3 h-3 text-zinc-600" />
        </motion.div>
      </button>

      {/* Expanded */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04] pt-3 mt-1">
              {/* Metadata */}
              {filledMeta.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mb-1">Métadonnées</div>
                  <div className="rounded-lg bg-black/30 border border-white/[0.04] p-2 space-y-0.5">
                    {filledMeta.slice(0, 12).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[10px]">
                        <span className="text-zinc-600 min-w-[90px] flex-shrink-0 text-mono">{k}:</span>
                        <span className="text-zinc-300 break-all text-mono">
                          {typeof v === "object" ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 120)}
                        </span>
                      </div>
                    ))}
                    {filledMeta.length > 12 && (
                      <div className="text-[9px] text-zinc-600 mt-1">+ {filledMeta.length - 12} propriétés…</div>
                    )}
                  </div>
                </div>
              )}

              {/* Correlations */}
              {rels.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                    <Share2 className="w-2.5 h-2.5" />
                    Corrélations ({rels.length})
                  </div>
                  <div className="space-y-1">
                    {rels.slice(0, 8).map((r, i) => {
                      const OtherIcon = ETYPE_ICONS[r.other.type] || Hash;
                      const otherColor = ec(r.other.type);
                      return (
                        <div key={i} className="flex items-center gap-2 p-1.5 rounded-md bg-white/[0.02] border border-white/[0.04] text-[10px]">
                          <Badge variant="accent" size="xs">{r.type}</Badge>
                          <OtherIcon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: otherColor }} />
                          <span className="flex-1 text-zinc-400 truncate">{r.other.value.slice(0, 40)}</span>
                          <span className="text-zinc-600 text-mono">{r.strength}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="flex gap-1.5 pt-1">
                {isUrl && (
                  <a
                    href={entity.value}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold press transition-colors"
                    style={{ background: `${color}15`, border: `1px solid ${color}30`, color: color }}
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    Ouvrir
                  </a>
                )}
                <button
                  onClick={handleCopy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold press bg-white/[0.03] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] transition-colors"
                >
                  {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
