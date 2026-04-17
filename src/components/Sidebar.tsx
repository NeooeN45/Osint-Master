/**
 * Dark Sidebar - Phase 2 UI v2
 * Navigation latérale avec accents cyan (style Google Dark Minimalist)
 * 
 * Features:
 * - Fond noir pur (#000000)
 * - Accents cyan sur éléments actifs
 * - Glow subtil sur hover
 * - Indicateurs de statut colorés
 * - Icons Lucide
 * 
 * Créé: 17 Avril 2026 - Phase 2 UI
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Shield,
  Globe,
  User,
  Mail,
  Phone,
  MapPin,
  Database,
  Settings,
  Activity,
  Terminal,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  status?: 'running' | 'idle' | 'error';
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'investigation', label: 'Investigation', icon: Search, status: 'running' },
  { id: 'targets', label: 'Targets', icon: User },
  { id: 'email', label: 'Email OSINT', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'domain', label: 'Domain/IP', icon: Globe },
  { id: 'geolocation', label: 'Geolocation', icon: MapPin },
  { id: 'darkweb', label: 'Dark Web', icon: Database, badge: 'PRO', badgeColor: 'bg-purple-500' },
];

const systemNavItems: NavItem[] = [
  { id: 'tools', label: 'Tools Runner', icon: Terminal, badge: '1000+', badgeColor: 'bg-cyan-500' },
  { id: 'opsec', label: 'OPSEC', icon: Shield, status: 'running' },
  { id: 'vault', label: 'Data Vault', icon: Lock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (id: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ 
  activeItem = 'dashboard', 
  onItemClick,
  collapsed = false,
  onToggle 
}: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleClick = (id: string) => {
    onItemClick?.(id);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = activeItem === item.id;
    const isHovered = hoveredItem === item.id;
    const Icon = item.icon;

    return (
      <motion.button
        key={item.id}
        onClick={() => handleClick(item.id)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative overflow-hidden
          ${isActive 
            ? 'bg-white/5 text-cyan-400 border-l-2 border-cyan-400' 
            : 'text-white/60 hover:text-white hover:bg-white/5'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Glow effect on hover/active */}
        {(isActive || isHovered) && (
          <motion.div
            layoutId={`glow-${item.id}`}
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}

        {/* Icon */}
        <div className={`
          relative z-10 flex items-center justify-center w-5 h-5
          ${isActive ? 'text-cyan-400' : 'text-white/50'}
        `}>
          <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
          
          {/* Status indicator */}
          {item.status === 'running' && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          )}
          {item.status === 'error' && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </div>

        {/* Label - hidden when collapsed */}
        {!collapsed && (
          <span className="relative z-10 text-sm font-medium flex-1 text-left">
            {item.label}
          </span>
        )}

        {/* Badge - hidden when collapsed */}
        {!collapsed && item.badge && (
          <span className={`
            relative z-10 px-2 py-0.5 text-xs font-semibold rounded-full
            ${item.badgeColor || 'bg-white/10'} text-white
          `}>
            {item.badge}
          </span>
        )}

        {/* Active indicator dot */}
        {isActive && !collapsed && (
          <motion.div
            layoutId="active-dot"
            className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)]"
          />
        )}
      </motion.button>
    );
  };

  return (
    <motion.aside
      className="h-screen bg-black border-r border-white/5 flex flex-col relative"
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Logo section */}
      <div className="p-4 border-b border-white/5">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {/* Logo icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Search className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          
          {/* Logo text - hidden when collapsed */}
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                OSINT
              </h1>
              <p className="text-xs text-white/40">Master Pro</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-zinc-800 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-zinc-700 transition-colors z-50"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Main navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {/* Section label */}
        {!collapsed && (
          <p className="px-4 py-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
            Investigation
          </p>
        )}
        
        {mainNavItems.map(renderNavItem)}

        {/* Divider */}
        <div className="my-4 border-t border-white/5" />

        {/* System section */}
        {!collapsed && (
          <p className="px-4 py-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
            System
          </p>
        )}
        
        {systemNavItems.map(renderNavItem)}
      </nav>

      {/* OPSEC Status Footer */}
      <div className="p-4 border-t border-white/5">
        <div className={`
          flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20
          ${collapsed ? 'justify-center' : ''}
        `}>
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-400">OPSEC Active</p>
              <p className="text-xs text-white/40 truncate">Tor + VPN + Proxy</p>
            </div>
          )}
        </div>

        {/* Stats mini - hidden when collapsed */}
        {!collapsed && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-cyan-400 font-semibold">3</p>
              <p className="text-xs text-white/40">Running</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-purple-400 font-semibold">47</p>
              <p className="text-xs text-white/40">Findings</p>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

export default Sidebar;
