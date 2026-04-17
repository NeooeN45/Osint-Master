/**
 * UI Bridge - Connect Old UI to New UI v2
 * Pont entre l'ancienne UI et la nouvelle UI Google Dark Minimalist v2
 * 
 * Features:
 * - Wrapper components with v2 styling
 * - Style adapters for legacy components
 * - Theme bridge (old colors → new palette)
 * - Migration helpers
 * 
 * Créé: 17 Avril 2026
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

// ═════════════════════════════════════════════════════════════════════════════
// STYLE ADAPTERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Map old color names to new v2 palette
 */
export const colorBridge: Record<string, string> = {
  // Old → New
  'text-zinc-100': 'text-white',
  'text-zinc-200': 'text-white/90',
  'text-zinc-300': 'text-white/70',
  'text-zinc-400': 'text-white/50',
  'text-zinc-500': 'text-white/40',
  'text-zinc-600': 'text-white/30',
  
  'bg-zinc-900': 'bg-black',
  'bg-zinc-800': 'bg-zinc-950',
  'bg-zinc-700': 'bg-white/5',
  'bg-zinc-600': 'bg-white/10',
  
  'border-zinc-700': 'border-white/10',
  'border-zinc-600': 'border-white/5',
  
  // Accent colors → Cyan/Purple system
  'text-blue-400': 'text-cyan-400',
  'text-indigo-400': 'text-purple-400',
  'text-purple-400': 'text-purple-400',
  'text-green-400': 'text-emerald-400',
  'text-red-400': 'text-rose-400',
  'text-yellow-400': 'text-amber-400',
  
  'bg-blue-500/20': 'bg-cyan-400/10',
  'bg-indigo-500/20': 'bg-purple-400/10',
  'bg-purple-500/20': 'bg-purple-400/10',
  'bg-green-500/20': 'bg-emerald-400/10',
  'bg-red-500/20': 'bg-rose-400/10',
};

/**
 * Convert old className to v2 className
 */
export function bridgeClasses(className: string): string {
  let result = className;
  
  Object.entries(colorBridge).forEach(([old, newClass]) => {
    result = result.replace(new RegExp(`\\b${old}\\b`, 'g'), newClass);
  });
  
  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
// WRAPPER COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

interface BridgeWrapperProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

/**
 * Card Bridge - Wrap old cards with v2 styling
 */
export function CardBridge({ children, className = '', animate = true }: BridgeWrapperProps) {
  const baseClasses = 'p-6 rounded-2xl bg-white/5 border border-white/10';
  const finalClasses = bridgeClasses(`${baseClasses} ${className}`);
  
  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={finalClasses}
      >
        {children}
      </motion.div>
    );
  }
  
  return <div className={finalClasses}>{children}</div>;
}

/**
 * Button Bridge - Wrap old buttons with v2 styling
 */
export function ButtonBridge({ 
  children, 
  className = '', 
  variant = 'primary',
  onClick 
}: BridgeWrapperProps & { variant?: 'primary' | 'secondary' | 'ghost'; onClick?: () => void }) {
  const variants = {
    primary: 'px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-semibold hover:opacity-90 transition-opacity',
    secondary: 'px-6 py-3 rounded-xl bg-white/10 text-white font-medium border border-white/20 hover:bg-white/20 transition-colors',
    ghost: 'px-6 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors',
  };
  
  const finalClasses = `${variants[variant]} ${className}`;
  
  return (
    <button onClick={onClick} className={finalClasses}>
      {children}
    </button>
  );
}

/**
 * Input Bridge - Wrap old inputs with v2 styling
 */
export function InputBridge({ 
  className = '', 
  placeholder,
  value,
  onChange,
  type = 'text'
}: BridgeWrapperProps & { 
  placeholder?: string; 
  value?: string; 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  const baseClasses = 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors';
  const finalClasses = bridgeClasses(`${baseClasses} ${className}`);
  
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={finalClasses}
    />
  );
}

/**
 * Badge Bridge - Wrap old badges with v2 styling
 */
export function BadgeBridge({ 
  children, 
  className = '', 
  color = 'cyan'
}: BridgeWrapperProps & { color?: 'cyan' | 'purple' | 'emerald' | 'rose' | 'amber' }) {
  const colors = {
    cyan: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    purple: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    emerald: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    rose: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
    amber: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  };
  
  const finalClasses = `px-2 py-1 rounded-full text-xs font-medium border ${colors[color]} ${className}`;
  
  return <span className={finalClasses}>{children}</span>;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION BRIDGE
// ═════════════════════════════════════════════════════════════════════════════

interface SectionBridgeProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

/**
 * Section Bridge - Wrap old sections with v2 styling
 */
export function SectionBridge({ 
  title, 
  children, 
  icon, 
  className = ''
}: SectionBridgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl bg-white/5 border border-white/10 ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        {icon && <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400">{icon}</div>}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTAINER BRIDGE
// ═════════════════════════════════════════════════════════════════════════════

interface ContainerBridgeProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Container Bridge - Wrap content with v2 container
 */
export function ContainerBridge({ 
  children, 
  className = '',
  size = 'xl'
}: ContainerBridgeProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-none',
  };
  
  return (
    <div className={`min-h-screen bg-black text-white p-6 ${sizes[size]} mx-auto ${className}`}>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// GRID BRIDGE
// ═════════════════════════════════════════════════════════════════════════════

interface GridBridgeProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * Grid Bridge - Wrap content with v2 grid
 */
export function GridBridge({ 
  children, 
  className = '',
  cols = 3,
  gap = 'md'
}: GridBridgeProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };
  
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };
  
  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HEADER BRIDGE
// ═════════════════════════════════════════════════════════════════════════════

interface HeaderBridgeProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  gradient?: boolean;
}

/**
 * Header Bridge - Wrap headers with v2 styling
 */
export function HeaderBridge({ 
  title, 
  subtitle, 
  icon, 
  className = '',
  gradient = false
}: HeaderBridgeProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        {icon && (
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500">
            {icon}
          </div>
        )}
        <h1 className={`text-2xl font-bold ${gradient ? 'bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent' : 'text-white'}`}>
          {title}
        </h1>
      </div>
      {subtitle && <p className="text-white/50">{subtitle}</p>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STATS BRIDGE
// ═════════════════════════════════════════════════════════════════════════════

interface StatBridgeProps {
  value: string | number;
  label: string;
  color?: 'cyan' | 'purple' | 'emerald' | 'rose' | 'amber';
  className?: string;
}

/**
 * Stat Bridge - Individual stat item
 */
export function StatBridge({ 
  value, 
  label, 
  color = 'cyan',
  className = ''
}: StatBridgeProps) {
  const colors = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400',
  };
  
  return (
    <div className={`text-center ${className}`}>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LOADING BRIDGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Loading Bridge - Loading state with v2 styling
 */
export function LoadingBridge({ 
  className = '',
  text = 'Loading...'
}: { className?: string; text?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-white/50 ${className}`}>
      <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      <span>{text}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ERROR BRIDGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Error Bridge - Error state with v2 styling
 */
export function ErrorBridge({ 
  message,
  onRetry 
}: { 
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
      <span className="text-rose-400">{message}</span>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-400 text-sm hover:bg-rose-500/30 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MIGRATION HELPER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Migration guide for common patterns
 */
export const migrationGuide = {
  // Old pattern → New pattern
  'panel card': 'bg-white/5 border border-white/10 rounded-2xl',
  'panel bright': 'bg-white/10 border border-white/20 rounded-xl',
  'btn primary': 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black',
  'btn secondary': 'bg-white/10 text-white border border-white/20',
  'text primary': 'text-white',
  'text secondary': 'text-white/70',
  'text muted': 'text-white/50',
  'accent cyan': 'text-cyan-400',
  'accent purple': 'text-purple-400',
  'accent green': 'text-emerald-400',
  'accent red': 'text-rose-400',
};

// ═════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═════════════════════════════════════════════════════════════════════════════

const UIBridge = {
  Card: CardBridge,
  Button: ButtonBridge,
  Input: InputBridge,
  Badge: BadgeBridge,
  Section: SectionBridge,
  Container: ContainerBridge,
  Grid: GridBridge,
  Header: HeaderBridge,
  Stat: StatBridge,
  Loading: LoadingBridge,
  Error: ErrorBridge,
  bridgeClasses,
  migrationGuide,
};

export default UIBridge;
