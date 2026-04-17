/**
 * VPN UI - Phase 8 VPN Integration
 * Composant UI pour gérer le VPN WireGuard
 * 
 * Design: Google Dark Minimalist v2
 * Features:
 * - VPN connection toggle
 * - Location selector
 * - Kill switch toggle
 * - IP info display
 * - Connection stats
 * 
 * Créé: 17 Avril 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Lock,
  Unlock,
  RefreshCw,
  MapPin,
  Server,
  Activity,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Power,
  Download,
  Upload,
} from 'lucide-react';

// Types
interface VPNStatus {
  connected: boolean;
  interface: string;
  publicIP: string;
  vpnIP?: string;
  location?: {
    country: string;
    city?: string;
    region?: string;
  };
  provider: string;
  configId: string;
  uptime: number;
  bytesReceived: number;
  bytesSent: number;
}

interface VPNStats {
  connections: number;
  disconnections: number;
  dataTransferred: number;
  avgSpeed: number;
  uptime: number;
}

interface VPNConfig {
  id: string;
  name: string;
  provider: string;
  country: string;
  city?: string;
  enabled: boolean;
}

export function VPNUI() {
  const [status, setStatus] = useState<VPNStatus | null>(null);
  const [stats, setStats] = useState<VPNStats | null>(null);
  const [configs, setConfigs] = useState<VPNConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [killSwitch, setKillSwitch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('status');

  // Fetch VPN status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/vpn/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data.status);
        setStats(data.data.stats);
        setKillSwitch(data.data.killSwitch);
      }
    } catch (err) {
      console.error('Failed to fetch VPN status:', err);
    }
  }, []);

  // Fetch VPN configs
  const fetchConfigs = useCallback(async () => {
    try {
      const response = await fetch('/api/vpn/configs');
      const data = await response.json();
      
      if (data.success) {
        setConfigs(data.data);
        if (data.data.length > 0 && !selectedConfig) {
          setSelectedConfig(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch VPN configs:', err);
    }
  }, [selectedConfig]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
    fetchConfigs();
    
    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchConfigs]);

  // Connect VPN
  const handleConnect = async () => {
    if (!selectedConfig) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/vpn/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: selectedConfig }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      } else {
        setError(data.error || 'Failed to connect');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Disconnect VPN
  const handleDisconnect = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/vpn/disconnect', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      }
    } catch (err) {
      setError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  // Rotate VPN
  const handleRotate = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/vpn/rotate', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      } else {
        setError('Rotation failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle kill switch
  const handleToggleKillSwitch = async () => {
    try {
      const response = await fetch('/api/vpn/killswitch/toggle', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setKillSwitch(data.enabled);
      }
    } catch (err) {
      console.error('Failed to toggle kill switch:', err);
    }
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isConnected = status?.connected || false;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
            <Shield className={`w-6 h-6 ${isConnected ? 'text-emerald-400' : 'text-white/50'}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              VPN WireGuard
            </h1>
            <p className="text-sm text-white/50">
              {isConnected 
                ? `Connected to ${status?.location?.country || 'Unknown'}` 
                : 'Disconnected - Your IP is exposed'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Connection Card */}
      <div className={`p-8 rounded-2xl border mb-6 ${
        isConnected 
          ? 'bg-emerald-500/5 border-emerald-500/20' 
          : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Connection Status Indicator */}
            <div className="relative">
              <motion.div
                animate={isConnected ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isConnected 
                    ? 'bg-emerald-500/20 border-2 border-emerald-400' 
                    : 'bg-white/10 border-2 border-white/20'
                }`}
              >
                {isConnected ? (
                  <ShieldCheck className="w-10 h-10 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-10 h-10 text-white/40" />
                )}
              </motion.div>
              
              {isConnected && (
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-4 border-black" />
              )}
            </div>

            {/* Status Info */}
            <div>
              <h2 className={`text-3xl font-bold ${isConnected ? 'text-emerald-400' : 'text-white/70'}`}>
                {isConnected ? 'Protected' : 'Unprotected'}
              </h2>
              <p className="text-white/50 mt-1">
                {isConnected 
                  ? `Your connection is secure via ${status?.provider || 'VPN'}`
                  : 'Enable VPN to protect your privacy'}
              </p>
              
              {isConnected && status?.uptime && (
                <div className="flex items-center gap-2 mt-2 text-sm text-emerald-400/70">
                  <Clock className="w-4 h-4" />
                  <span>Uptime: {formatUptime(status.uptime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Connect/Disconnect Button */}
          <div className="flex flex-col gap-3">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-8 py-4 rounded-xl bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30 hover:bg-rose-500/30 transition-all flex items-center gap-2"
              >
                <Power className="w-5 h-5" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading || !selectedConfig}
                className="px-8 py-4 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Power className="w-5 h-5" />
                )}
                Connect
              </button>
            )}
            
            {isConnected && (
              <button
                onClick={handleRotate}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-white/5 text-white/70 font-medium border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Rotate IP
              </button>
            )}
          </div>
        </div>

        {/* Location Selector (when disconnected) */}
        {!isConnected && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <label className="block text-sm text-white/50 mb-2">Select Server Location</label>
            <select
              value={selectedConfig}
              onChange={(e) => setSelectedConfig(e.target.value)}
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-400/50"
            >
              {configs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name} ({config.country}{config.city ? ` - ${config.city}` : ''})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2"
          >
            <XCircle className="w-5 h-5 text-rose-400" />
            <span className="text-rose-400">{error}</span>
          </motion.div>
        )}
      </div>

      {/* IP Info Card */}
      {isConnected && status && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
        >
          {/* Public IP */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Public IP</h3>
            </div>
            <p className="text-2xl font-mono text-cyan-400">{status.publicIP || 'Loading...'}</p>
            {status.location && (
              <p className="text-sm text-white/50 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {status.location.city}, {status.location.country}
              </p>
            )}
          </div>

          {/* VPN IP */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">VPN IP</h3>
            </div>
            <p className="text-2xl font-mono text-emerald-400">{status.vpnIP || 'Hidden'}</p>
            <p className="text-sm text-white/50 mt-1">Internal WireGuard address</p>
          </div>
        </motion.div>
      )}

      {/* Stats & Kill Switch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stats */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Connection Stats
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-black/30">
              <p className="text-xs text-white/50 mb-1">Download</p>
              <p className="text-lg font-semibold text-white flex items-center gap-1">
                <Download className="w-4 h-4 text-emerald-400" />
                {formatBytes(status?.bytesReceived || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-black/30">
              <p className="text-xs text-white/50 mb-1">Upload</p>
              <p className="text-lg font-semibold text-white flex items-center gap-1">
                <Upload className="w-4 h-4 text-cyan-400" />
                {formatBytes(status?.bytesSent || 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-black/30">
              <p className="text-xs text-white/50 mb-1">Connections</p>
              <p className="text-lg font-semibold text-white">{stats?.connections || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-black/30">
              <p className="text-xs text-white/50 mb-1">Total Time</p>
              <p className="text-lg font-semibold text-white">{formatUptime(stats?.uptime || 0)}</p>
            </div>
          </div>
        </div>

        {/* Kill Switch */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Kill Switch
            </h3>
            <button
              onClick={handleToggleKillSwitch}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                killSwitch ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  killSwitch ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          
          <p className="text-sm text-white/70 mb-4">
            {killSwitch 
              ? 'Kill switch is active. All traffic will be blocked if VPN disconnects unexpectedly.'
              : 'Enable kill switch to prevent IP leaks if VPN connection drops.'}
          </p>
          
          <div className={`p-3 rounded-lg ${killSwitch ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'}`}>
            <div className="flex items-center gap-2">
              {killSwitch ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">Protection active</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-amber-400">No leak protection</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Servers */}
      <div className="mt-6 p-6 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-400" />
            Available Servers
          </h3>
          <span className="text-sm text-white/50">{configs.length} locations</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {configs.map((config) => (
            <button
              key={config.id}
              onClick={() => !isConnected && setSelectedConfig(config.id)}
              disabled={isConnected}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedConfig === config.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              } ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {config.country}{config.city ? ` - ${config.city}` : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VPNUI;
