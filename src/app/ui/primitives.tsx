// UI Primitives — composants atomiques réutilisables
// Tailwind + motion/react, dark-first

import React, { forwardRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Check, X, AlertCircle } from "lucide-react";

type CC = { className?: string; children?: React.ReactNode };

// ═══════════════════════════════════════════════════════════════════════════
// cn — classname merger
// ═══════════════════════════════════════════════════════════════════════════
export function cn(...parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ═══════════════════════════════════════════════════════════════════════════
// Button — variants premium
// ═══════════════════════════════════════════════════════════════════════════
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "accent";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:brightness-110 shadow-lg shadow-cyan-500/20",
    secondary: "bg-white/[0.04] text-zinc-200 border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.12]",
    ghost: "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
    danger: "bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/15 hover:border-red-500/40",
    outline: "border border-white/[0.1] text-zinc-300 hover:bg-white/[0.04] hover:border-white/[0.2]",
    accent: "bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25",
  };
  const sizes: Record<ButtonSize, string> = {
    xs: "text-[10px] px-2 py-1 gap-1 h-6",
    sm: "text-[11px] px-2.5 py-1.5 gap-1.5 h-7",
    md: "text-xs px-3 py-2 gap-2 h-8",
    lg: "text-sm px-4 py-2.5 gap-2 h-10",
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-md press focus-ring",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});
Button.displayName = "Button";

// ═══════════════════════════════════════════════════════════════════════════
// IconButton — carré, icône seule
// ═══════════════════════════════════════════════════════════════════════════
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "solid" | "outline";
  size?: "sm" | "md" | "lg";
  active?: boolean;
  tooltip?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  variant = "ghost",
  size = "md",
  active,
  tooltip,
  className,
  children,
  ...props
}, ref) => {
  const sizes = {
    sm: "w-6 h-6 [&>svg]:w-3 [&>svg]:h-3",
    md: "w-8 h-8 [&>svg]:w-3.5 [&>svg]:h-3.5",
    lg: "w-10 h-10 [&>svg]:w-4 [&>svg]:h-4",
  };
  const variants = {
    ghost: active
      ? "bg-accent/15 text-accent border border-accent/30"
      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]",
    solid: "bg-white/[0.06] text-zinc-200 border border-white/[0.08] hover:bg-white/[0.1]",
    outline: "border border-white/[0.1] text-zinc-400 hover:border-white/[0.2] hover:text-zinc-200",
  };
  return (
    <button
      ref={ref}
      title={tooltip}
      className={cn(
        "inline-flex items-center justify-center rounded-md press focus-ring transition-colors",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
IconButton.displayName = "IconButton";

// ═══════════════════════════════════════════════════════════════════════════
// Badge — semantic colors
// ═══════════════════════════════════════════════════════════════════════════
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "accent" | "muted";

interface BadgeProps extends CC {
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: React.ReactNode;
  size?: "xs" | "sm";
}

export function Badge({ variant = "default", dot, icon, size = "sm", children, className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-white/[0.04] text-zinc-400 border-white/[0.08]",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    danger: "bg-red-500/10 text-red-400 border-red-500/25",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/25",
    accent: "bg-accent/10 text-accent border-accent/25",
    muted: "bg-zinc-800/50 text-zinc-500 border-zinc-700/50",
  };
  const dotColors: Record<BadgeVariant, string> = {
    default: "bg-zinc-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-red-400",
    info: "bg-blue-400",
    accent: "bg-accent",
    muted: "bg-zinc-500",
  };
  const sizes = {
    xs: "text-[9px] px-1.5 py-0.5 gap-1",
    sm: "text-[10px] px-2 py-0.5 gap-1.5",
  };
  return (
    <span className={cn(
      "inline-flex items-center font-semibold rounded-full border tracking-wide",
      variants[variant],
      sizes[size],
      className,
    )}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant], variant === "success" && "blink-dot")} />}
      {icon}
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// StatusDot — petit indicateur d'état
// ═══════════════════════════════════════════════════════════════════════════
export function StatusDot({ status, pulse = false }: { status: "online" | "offline" | "warning" | "loading"; pulse?: boolean }) {
  const colors = {
    online: "bg-emerald-400 shadow-emerald-400/50",
    offline: "bg-red-400 shadow-red-400/50",
    warning: "bg-amber-400 shadow-amber-400/50",
    loading: "bg-cyan-400 shadow-cyan-400/50",
  };
  return (
    <span className="relative inline-flex">
      <span className={cn("w-1.5 h-1.5 rounded-full", colors[status], pulse && "animate-pulse")} />
      {pulse && <span className={cn("absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping opacity-50", colors[status])} />}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Input — moderne
// ═══════════════════════════════════════════════════════════════════════════
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: "default" | "ghost";
  sizeVariant?: "sm" | "md" | "lg";
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  icon, iconRight, variant = "default", sizeVariant = "md", error, className, ...props
}, ref) => {
  const sizes = {
    sm: "h-7 text-xs px-2.5",
    md: "h-9 text-sm px-3",
    lg: "h-11 text-base px-4",
  };
  const hasIcon = !!icon;
  const hasIconR = !!iconRight;
  return (
    <div className={cn("relative group", className)}>
      {icon && (
        <span className={cn(
          "absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-accent transition-colors pointer-events-none",
          "[&>svg]:w-3.5 [&>svg]:h-3.5",
        )}>{icon}</span>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg bg-white/[0.03] border text-zinc-100 outline-none transition-all",
          "placeholder:text-zinc-600",
          "focus:bg-white/[0.05] focus:border-accent/40",
          error ? "border-red-500/40" : "border-white/[0.08] hover:border-white/[0.12]",
          sizes[sizeVariant],
          hasIcon && "pl-8",
          hasIconR && "pr-8",
          variant === "ghost" && "bg-transparent border-transparent focus:bg-white/[0.04]",
        )}
        {...props}
      />
      {iconRight && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 [&>svg]:w-3.5 [&>svg]:h-3.5">
          {iconRight}
        </span>
      )}
    </div>
  );
});
Input.displayName = "Input";

// ═══════════════════════════════════════════════════════════════════════════
// Card
// ═══════════════════════════════════════════════════════════════════════════
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white/[0.015] border border-white/[0.06] backdrop-blur-sm",
        "hover:border-white/[0.1] transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Kbd — keyboard hint
// ═══════════════════════════════════════════════════════════════════════════
export function Kbd({ children, className }: CC) {
  return <kbd className={cn("kbd", className)}>{children}</kbd>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SegmentedControl — ex pill segmented
// ═══════════════════════════════════════════════════════════════════════════
interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedControl<T extends string>({ value, onChange, options, size = "md", className }: SegmentedProps<T>) {
  return (
    <div className={cn(
      "inline-flex items-center gap-0.5 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg",
      className,
    )}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 font-semibold rounded-md press transition-colors",
              size === "sm" ? "text-[10px] px-2 py-1 h-6" : "text-xs px-3 py-1.5 h-7",
              active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${options[0].value}`}
                className="absolute inset-0 bg-accent/15 border border-accent/30 rounded-md"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Toggle (switch moderne)
// ═══════════════════════════════════════════════════════════════════════════
export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-lg press focus-ring transition-colors",
        "border border-transparent",
        checked ? "bg-accent/[0.04] hover:bg-accent/[0.08]" : "hover:bg-white/[0.03]",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <div className="flex-1 text-left">
        {label && <div className={cn("text-xs font-semibold", checked ? "text-zinc-100" : "text-zinc-400")}>{label}</div>}
        {description && <div className="text-[10px] text-zinc-500 mt-0.5">{description}</div>}
      </div>
      <div className={cn(
        "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
        checked ? "bg-accent" : "bg-white/[0.08]",
      )}>
        <motion.div
          animate={{ x: checked ? 17 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton loaders
// ═══════════════════════════════════════════════════════════════════════════
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/[0.06] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded-lg" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-2.5 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tooltip (simple)
// ═══════════════════════════════════════════════════════════════════════════
export function Tooltip({ children, content, side = "top" }: { children: React.ReactNode; content: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  const [show, setShow] = useState(false);
  const placements: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute z-50 px-2 py-1 rounded-md text-[10px] font-medium",
              "bg-zinc-900/95 text-zinc-200 border border-white/[0.1] shadow-xl",
              "whitespace-nowrap pointer-events-none backdrop-blur-sm",
              placements[side],
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Label (section headers)
// ═══════════════════════════════════════════════════════════════════════════
export function Label({ children, className }: CC) {
  return (
    <div className={cn(
      "text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600 mb-2",
      className,
    )}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI card (for stats display)
// ═══════════════════════════════════════════════════════════════════════════
export function KPI({ icon, label, value, sub, color = "#22d3ee", trend }: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl p-3.5 border border-white/[0.06] bg-white/[0.015] overflow-hidden group lift"
    >
      <div
        className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle at 30% 0%, ${color}, transparent 60%)` }}
      />
      <div className="relative flex items-center gap-2 mb-2">
        {icon && (
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
               style={{ background: `${color}22`, border: `1px solid ${color}40` }}>
            {icon}
          </div>
        )}
        <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 truncate">{label}</div>
      </div>
      <div className="text-2xl font-black text-zinc-100 leading-none text-mono">{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-1.5">{sub}</div>}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ProgressBar
// ═══════════════════════════════════════════════════════════════════════════
export function ProgressBar({ value, max = 100, variant = "accent", size = "sm", showValue = false }: {
  value: number; max?: number; variant?: "accent" | "success" | "warning" | "danger"; size?: "sm" | "md"; showValue?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colors = {
    accent: "bg-gradient-to-r from-cyan-400 to-blue-500",
    success: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    warning: "bg-gradient-to-r from-amber-400 to-orange-500",
    danger: "bg-gradient-to-r from-red-400 to-red-500",
  };
  return (
    <div className="flex items-center gap-2 w-full">
      <div className={cn("flex-1 rounded-full overflow-hidden bg-white/[0.06]", size === "sm" ? "h-1" : "h-1.5")}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full", colors[variant])}
        />
      </div>
      {showValue && <span className="text-[10px] font-mono text-zinc-500 min-w-[28px] text-right">{Math.round(pct)}%</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EmptyState
// ═══════════════════════════════════════════════════════════════════════════
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center px-6 py-12">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-2">
          <div className="text-zinc-600 [&>svg]:w-6 [&>svg]:h-6">{icon}</div>
        </div>
      )}
      <div className="text-sm font-semibold text-zinc-300">{title}</div>
      {description && <div className="text-xs text-zinc-500 max-w-sm leading-relaxed">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
