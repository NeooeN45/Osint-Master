/**
 * InstagramPrivSnifferUI - Phase 7 Component
 * Composant UI pour visualiser les profils Instagram privés
 * 
 * Design: Google Dark Minimalist v2
 * Features:
 * - Gradient accents cyan/purple
 * - Risk exposure indicator
 * - Exposed content gallery
 * - Mutual friends network
 * - Shadow followers list
 * 
 * Créé: 17 Avril 2026
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Image,
  Film,
  Archive,
  Globe,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  RefreshCw,
  Instagram,
} from 'lucide-react';

// Types
interface ExposedContent {
  type: 'cached_post' | 'archive' | 'tagged' | 'reel' | 'story_highlight' | 'comment';
  url: string;
  source: string;
  timestamp?: string;
  content?: string;
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

interface SniffResult {
  profile: {
    username: string;
    fullName: string;
    biography: string;
    profilePicUrl: string;
    followers: number;
    following: number;
    isPrivate: boolean;
    postsCount: number;
    externalUrl?: string;
    isBusinessAccount: boolean;
    businessCategory?: string;
  };
  exposedContent: ExposedContent[];
  shadowFollowers: string[];
  mutualFriends: string[];
  metadata: {
    searchTimestamp: string;
    cacheHit: boolean;
    sourcesChecked: string[];
    exposureRisk: 'low' | 'medium' | 'high' | 'critical';
  };
}

const riskConfig = {
  low: {
    color: 'emerald',
    icon: ShieldCheck,
    label: 'Low Risk',
    description: 'Minimal data exposure',
  },
  medium: {
    color: 'amber',
    icon: Shield,
    label: 'Medium Risk',
    description: 'Some content exposed',
  },
  high: {
    color: 'orange',
    icon: ShieldAlert,
    label: 'High Risk',
    description: 'Significant data leak',
  },
  critical: {
    color: 'rose',
    icon: AlertTriangle,
    label: 'Critical Risk',
    description: 'Major privacy breach',
  },
};

const contentTypeIcons = {
  cached_post: Image,
  archive: Archive,
  tagged: Users,
  reel: Film,
  story_highlight: Eye,
  comment: Globe,
};

const contentTypeLabels = {
  cached_post: 'Cached Post',
  archive: 'Archive.org',
  tagged: 'Tagged Photo',
  reel: 'Reel',
  story_highlight: 'Story Highlight',
  comment: 'Comment',
};

export function InstagramPrivSnifferUI() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SniffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('content');
  const [sessionId, setSessionId] = useState('');

  const handleSniff = async () => {
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/instagram-priv/sniff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), sessionId: sessionId || undefined }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Failed to sniff profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const risk = result ? riskConfig[result.metadata.exposureRisk] : null;
  const RiskIcon = risk?.icon || Shield;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Instagram PrivSniffer
            </h1>
            <p className="text-sm text-white/50">Visualize private Instagram profiles</p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="max-w-2xl mb-8">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Instagram username..."
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 transition-colors text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSniff()}
            />
          </div>
          <button
            onClick={handleSniff}
            disabled={loading || !username.trim()}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Sniffing...
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                Sniff
              </>
            )}
          </button>
        </div>

        {/* Optional Session ID */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setExpandedSection(expandedSection === 'settings' ? null : 'settings')}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            {expandedSection === 'settings' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced Settings
          </button>
        </div>

        <AnimatePresence>
          {expandedSection === 'settings' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                <label className="block text-sm text-white/70 mb-2">Instagram Session ID (optional)</label>
                <input
                  type="password"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="sessionid cookie for enhanced access..."
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50"
                />
                <p className="text-xs text-white/40 mt-2">
                  Provides access to mutual friends and more data. Optional but recommended.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3"
          >
            <XCircle className="w-5 h-5 text-rose-400" />
            <p className="text-rose-400">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Profile Card */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                {result.profile.profilePicUrl ? (
                  <img
                    src={result.profile.profilePicUrl}
                    alt={result.profile.username}
                    className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border-2 border-white/10">
                    <Instagram className="w-10 h-10 text-white/40" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-black border border-white/10">
                  {result.profile.isPrivate ? (
                    <Lock className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white">{result.profile.fullName || result.profile.username}</h2>
                  {result.profile.isBusinessAccount && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                      Business
                    </span>
                  )}
                </div>
                <p className="text-lg text-white/50 mb-2">@{result.profile.username}</p>
                
                {result.profile.biography && (
                  <p className="text-white/70 mb-4 max-w-xl">{result.profile.biography}</p>
                )}

                {/* Stats */}
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{result.profile.postsCount.toLocaleString()}</p>
                    <p className="text-xs text-white/50">posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{result.profile.followers.toLocaleString()}</p>
                    <p className="text-xs text-white/50">followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{result.profile.following.toLocaleString()}</p>
                    <p className="text-xs text-white/50">following</p>
                  </div>
                </div>

                {result.profile.externalUrl && (
                  <a
                    href={result.profile.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {result.profile.externalUrl}
                  </a>
                )}
              </div>

              {/* Risk Badge */}
              <div className={`p-4 rounded-xl bg-${risk?.color}-500/10 border border-${risk?.color}-500/20 text-center`}>
                <RiskIcon className={`w-8 h-8 text-${risk?.color}-400 mx-auto mb-2`} />
                <p className={`text-sm font-semibold text-${risk?.color}-400`}>{risk?.label}</p>
                <p className="text-xs text-white/50 mt-1">{risk?.description}</p>
              </div>
            </div>
          </div>

          {/* Exposed Content */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-400" />
                Exposed Content
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                  {result.exposedContent.length}
                </span>
              </h3>
              <button
                onClick={() => setExpandedSection(expandedSection === 'content' ? null : 'content')}
                className="text-white/50 hover:text-white transition-colors"
              >
                {expandedSection === 'content' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            <AnimatePresence>
              {expandedSection === 'content' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  {result.exposedContent.length === 0 ? (
                    <p className="text-white/50 text-center py-8">No exposed content found</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {result.exposedContent.map((content, index) => {
                        const Icon = contentTypeIcons[content.type];
                        return (
                          <motion.a
                            key={index}
                            href={content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                                  {contentTypeLabels[content.type]}
                                </p>
                                <p className="text-xs text-white/40 mt-1">{content.source}</p>
                                {content.timestamp && (
                                  <p className="text-xs text-white/30 mt-1">{content.timestamp}</p>
                                )}
                              </div>
                              <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-white/60" />
                            </div>
                          </motion.a>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Shadow Followers & Mutual Friends */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shadow Followers */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-cyan-400" />
                Shadow Followers
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
                  {result.shadowFollowers.length}
                </span>
              </h3>
              
              {result.shadowFollowers.length === 0 ? (
                <p className="text-white/50 text-center py-4">No shadow followers found</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {result.shadowFollowers.map((follower, index) => (
                    <a
                      key={index}
                      href={`https://instagram.com/${follower}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-white/5 text-white/70 text-sm hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
                    >
                      @{follower}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Mutual Friends */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-pink-400" />
                Mutual Friends
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-sm">
                  {result.mutualFriends.length}
                </span>
              </h3>
              
              {result.mutualFriends.length === 0 ? (
                <p className="text-white/50 text-center py-4">
                  {result.metadata.sourcesChecked.includes('mutual_friends')
                    ? 'No mutual friends (requires session)'
                    : 'Login required for mutual friends'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {result.mutualFriends.map((friend, index) => (
                    <a
                      key={index}
                      href={`https://instagram.com/${friend}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-white/5 text-white/70 text-sm hover:bg-pink-500/20 hover:text-pink-400 transition-colors"
                    >
                      @{friend}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sources & Metadata */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-white/50">Sources checked:</span>
              {result.metadata.sourcesChecked.map((source) => (
                <span key={source} className="px-2 py-1 rounded-full bg-white/5 text-white/70">
                  {source}
                </span>
              ))}
              <span className="text-white/30 ml-auto flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(result.metadata.searchTimestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default InstagramPrivSnifferUI;
