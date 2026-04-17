/**
 * Dashboard Cards - Phase 2 UI v2
 * Cartes de données avec effet "wow" (points de couleur stratégiques)
 * 
 * Features:
 * - 90% noir/blanc, 10% accents colorés
 * - Glow sur les valeurs importantes
 * - Progress bars avec gradient
 * - Animations au hover
 * - Badges de statut colorés
 * 
 * Créé: 17 Avril 2026 - Phase 2 UI
 */

import { motion } from 'framer-motion';
import {
  Target,
  Shield,
  Globe,
  Database,
  Zap,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Mail,
} from 'lucide-react';

// Types de données pour les cartes
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: React.ElementType;
  color: 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose';
  subtitle?: string;
  progress?: number;  // 0-100
}

const colorMap = {
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-400',
    border: 'border-cyan-400/30',
    glow: 'shadow-[0_0_20px_rgba(0,240,255,0.3)]',
    gradient: 'from-cyan-400 to-cyan-600',
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-400',
    border: 'border-purple-400/30',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    gradient: 'from-purple-400 to-purple-600',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-400',
    border: 'border-emerald-400/30',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    gradient: 'from-emerald-400 to-emerald-600',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-400',
    border: 'border-amber-400/30',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    gradient: 'from-amber-400 to-amber-600',
  },
  rose: {
    text: 'text-rose-400',
    bg: 'bg-rose-400',
    border: 'border-rose-400/30',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    gradient: 'from-rose-400 to-rose-600',
  },
};

// Carte de statistique principale
function StatCard({ title, value, trend, trendUp, icon: Icon, color, subtitle, progress }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      className={`
        relative p-6 rounded-xl bg-zinc-950 border border-white/5 
        hover:border-white/10 transition-all duration-300 group overflow-hidden
      `}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      {/* Subtle gradient background on hover */}
      <div className={`
        absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 
        group-hover:opacity-5 transition-opacity duration-300
      `} />

      {/* Glow border on hover */}
      <div className={`
        absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 
        transition-opacity duration-300 ${colors.glow} blur-sm -z-10
      `} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`
            p-2.5 rounded-lg bg-white/5 border ${colors.border}
            group-hover:${colors.glow} transition-all duration-300
          `}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          
          {trend && (
            <div className={`
              flex items-center gap-1 text-xs font-medium
              ${trendUp ? 'text-emerald-400' : 'text-rose-400'}
            `}>
              <TrendingUp className={`w-3 h-3 ${!trendUp && 'rotate-180'}`} />
              {trend}
            </div>
          )}
        </div>

        {/* Value - POINT DE COULEUR WOW */}
        <div className="mb-2">
          <h3 className={`text-3xl font-bold ${colors.text} tracking-tight`}>
            {value}
          </h3>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-white/40">{subtitle}</p>
        )}

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-1.5 text-xs text-white/40">{progress}% utilized</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Carte de statut système
interface StatusCardProps {
  title: string;
  status: 'operational' | 'warning' | 'error' | 'running';
  description: string;
  lastUpdate?: string;
}

function StatusCard({ title, status, description, lastUpdate }: StatusCardProps) {
  const statusConfig = {
    operational: { color: 'emerald', icon: CheckCircle2, text: 'Operational' },
    warning: { color: 'amber', icon: AlertCircle, text: 'Warning' },
    error: { color: 'rose', icon: XCircle, text: 'Error' },
    running: { color: 'cyan', icon: Activity, text: 'Running' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const colors = colorMap[config.color as keyof typeof colorMap];

  return (
    <motion.div
      className="p-4 rounded-xl bg-zinc-950 border border-white/5 hover:border-white/10 transition-all"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center gap-3">
        <div className={`
          relative p-2 rounded-lg bg-white/5
          ${status === 'running' && 'animate-pulse'}
        `}>
          <StatusIcon className={`w-5 h-5 ${colors.text}`} />
          
          {/* Pulse dot for running status */}
          {status === 'running' && (
            <span className={`
              absolute top-1 right-1 w-2 h-2 rounded-full ${colors.bg} 
              animate-ping
            `} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white/80">{title}</h4>
          <p className="text-xs text-white/40 truncate">{description}</p>
        </div>
        
        <div className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${colors.bg}/10 ${colors.text} border ${colors.border}
        `}>
          {config.text}
        </div>
      </div>
      
      {lastUpdate && (
        <p className="mt-2 text-xs text-white/30 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastUpdate}
        </p>
      )}
    </motion.div>
  );
}

// Carte d'activité récente
interface ActivityItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  time: string;
  tool?: string;
}

interface ActivityCardProps {
  activities: ActivityItem[];
}

function ActivityCard({ activities }: ActivityCardProps) {
  const typeColors = {
    success: 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30',
    info: 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30',
    warning: 'bg-amber-400/20 text-amber-400 border-amber-400/30',
    error: 'bg-rose-400/20 text-rose-400 border-rose-400/30',
  };

  const typeIcons = {
    success: CheckCircle2,
    info: Activity,
    warning: AlertCircle,
    error: XCircle,
  };

  return (
    <div className="p-6 rounded-xl bg-zinc-950 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">Recent Activity</h3>
        <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
          View all
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = typeIcons[activity.type];
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className={`
                p-1.5 rounded-lg border ${typeColors[activity.type]}
              `}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{activity.message}</p>
                {activity.tool && (
                  <p className="text-xs text-white/40 mt-0.5">via {activity.tool}</p>
                )}
              </div>
              
              <span className="text-xs text-white/30 whitespace-nowrap">
                {activity.time}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Dashboard complet
export function DashboardCards() {
  const activities: ActivityItem[] = [
    { id: '1', type: 'success', message: 'Sherlock scan completed', tool: 'Sherlock', time: '2m ago' },
    { id: '2', type: 'info', message: 'New proxy rotated', tool: 'OPSEC', time: '5m ago' },
    { id: '3', type: 'warning', message: 'Rate limit detected on Twitter', tool: 'Twitter API', time: '12m ago' },
    { id: '4', type: 'success', message: '3 new findings discovered', tool: 'Deep Engine', time: '15m ago' },
  ];

  return (
    <div className="p-6 space-y-6 bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-white/40">Overview of your investigations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
            OPSEC Active
          </span>
          <span className="px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20">
            3 Running
          </span>
        </div>
      </div>

      {/* Stats Grid - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Targets Analyzed"
          value="128"
          trend="+12%"
          trendUp={true}
          icon={Target}
          color="cyan"
          subtitle="Last 24 hours"
        />
        <StatCard
          title="Findings"
          value="1,847"
          trend="+8%"
          trendUp={true}
          icon={Database}
          color="purple"
          subtitle="Data points collected"
        />
        <StatCard
          title="Tools Active"
          value="47"
          trend="+3"
          trendUp={true}
          icon={Zap}
          color="amber"
          subtitle="Of 1000+ available"
          progress={4.7}
        />
        <StatCard
          title="Success Rate"
          value="94.2%"
          trend="-2%"
          trendUp={false}
          icon={Shield}
          color="emerald"
          subtitle="Average completion"
          progress={94.2}
        />
      </div>

      {/* Middle section - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/80 mb-4">System Status</h3>
          <StatusCard
            title="Tor Network"
            status="running"
            description="Exit node: Netherlands"
            lastUpdate="Rotated 5m ago"
          />
          <StatusCard
            title="Proxy Pool"
            status="operational"
            description="47 proxies available"
            lastUpdate="Health check: 1m ago"
          />
          <StatusCard
            title="Data Vault"
            status="operational"
            description="AES-256-GCM encryption active"
            lastUpdate="12 investigations stored"
          />
        </div>

        {/* Activity feed */}
        <ActivityCard activities={activities} />
      </div>

      {/* Bottom section - Tools grid */}
      <div>
        <h3 className="text-sm font-semibold text-white/80 mb-4">Quick Tools</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { name: 'Sherlock', icon: User, color: 'cyan', status: 'ready' },
            { name: 'TheHarvester', icon: Globe, color: 'purple', status: 'ready' },
            { name: 'Holehe', icon: Mail, color: 'amber', status: 'running' },
            { name: 'PhoneInfoga', icon: Phone, color: 'rose', status: 'ready' },
            { name: 'Recon-ng', icon: Database, color: 'emerald', status: 'ready' },
            { name: 'Instaloader', icon: Camera, color: 'cyan', status: 'ready' },
          ].map((tool) => (
            <motion.button
              key={tool.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                p-4 rounded-xl bg-zinc-950 border border-white/5 
                hover:border-white/10 transition-all text-left group
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-3
                group-hover:bg-${tool.color}-400/10 transition-colors
              `}>
                <tool.icon className={`w-5 h-5 text-${tool.color}-400`} />
              </div>
              <p className="text-sm font-medium text-white/80">{tool.name}</p>
              <p className={`
                text-xs mt-1 flex items-center gap-1
                ${tool.status === 'running' ? 'text-cyan-400' : 'text-white/40'}
              `}>
                {tool.status === 'running' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                )}
                {tool.status}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Icons manquants
function User({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function Phone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function Camera({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default DashboardCards;
