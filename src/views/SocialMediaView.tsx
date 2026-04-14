import { useState, useEffect } from "react";
import { 
  Search, 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube,
  MessageCircle,
  User,
  MapPin,
  Mail,
  Phone,
  Link2,
  Calendar,
  Users,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Hash,
  Image as ImageIcon,
  Video,
  Clock,
  Activity,
  Target,
  Globe,
  ExternalLink,
  Copy,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  Verified,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Network,
  Layers,
  Camera,
  Play,
  Maximize2,
  Grid3X3,
  Map as MapIcon,
  PieChart
} from "lucide-react";
import { toast } from "sonner";
import { PanelSection } from "../components/ProLayout";
import type {
  InstagramProfile,
  InstagramPost,
  InstagramStory,
  TwitterProfile,
  FacebookProfile,
  TikTokProfile,
  SocialPlatform,
} from "../types/darkweb";
import {
  analyzeInstagramProfile,
  analyzeInstagramTimeline,
  analyzeInstagramGeolocation,
  extractInstagramEmails,
  analyzeInstagramNetwork,
  analyzeTwitterProfile,
  analyzeFacebookProfile,
  matchCrossPlatformProfiles,
  buildSocialSearchQuery,
  generateUsernameVariations,
} from "../lib/socialMediaPro";

type ViewMode = "search" | "profile" | "compare" | "timeline" | "map";

interface SearchState {
  query: string;
  type: "username" | "email" | "phone" | "fullname";
  platforms: SocialPlatform[];
  depth: "quick" | "standard" | "deep";
}

export default function SocialMediaView() {
  const [viewMode, setViewMode] = useState<ViewMode>("search");
  const [searchState, setSearchState] = useState<SearchState>({
    query: "",
    type: "username",
    platforms: ["instagram", "twitter", "facebook", "tiktok"],
    depth: "standard",
  });
  const [isSearching, setIsSearching] = useState(false);
  const [instagramProfile, setInstagramProfile] = useState<InstagramProfile | null>(null);
  const [twitterProfile, setTwitterProfile] = useState<TwitterProfile | null>(null);
  const [facebookProfile, setFacebookProfile] = useState<FacebookProfile | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("instagram");
  const [activeTab, setActiveTab] = useState<"overview" | "posts" | "stories" | "network" | "analysis">("overview");
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const handleSearch = async () => {
    if (!searchState.query.trim()) {
      toast.error("Enter a search query");
      return;
    }

    setIsSearching(true);

    try {
      // Instagram Pro Analysis
      if (searchState.platforms.includes("instagram")) {
        const igProfile = await analyzeInstagramProfile(searchState.query, {
          fetchPosts: true,
          fetchStories: true,
          fetchComments: true,
          analyzeRelationships: true,
        });
        setInstagramProfile(igProfile);
        if (igProfile) {
          toast.success(`Found Instagram: @${igProfile.username}`);
        }
      }

      // Twitter Analysis
      if (searchState.platforms.includes("twitter")) {
        const twProfile = await analyzeTwitterProfile(searchState.query);
        setTwitterProfile(twProfile);
      }

      // Facebook Analysis
      if (searchState.platforms.includes("facebook")) {
        const fbProfile = await analyzeFacebookProfile(searchState.query);
        setFacebookProfile(fbProfile);
      }

      setViewMode("profile");
    } catch (error) {
      toast.error("Search failed: " + (error as Error).message);
    } finally {
      setIsSearching(false);
    }
  };

  const renderSearchView = () => (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Instagram className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Social Media Intelligence</h1>
        <p className="text-slate-400">Advanced profile analysis with Instagram Pro reconnaissance</p>
      </div>

      <div className="bg-surface-1 border border-border rounded-xl p-6">
        {/* Search Type */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "username", label: "Username", icon: User },
            { id: "email", label: "Email", icon: Mail },
            { id: "phone", label: "Phone", icon: Phone },
            { id: "fullname", label: "Full Name", icon: User },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSearchState({ ...searchState, type: type.id as SearchState["type"] })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                searchState.type === type.id
                  ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-surface-2"
              }`}
            >
              <type.icon className="w-4 h-4" />
              {type.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchState.query}
            onChange={(e) => setSearchState({ ...searchState, query: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={`Enter ${searchState.type}...`}
            className="w-full pl-12 pr-4 py-3 bg-surface-2 border border-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
          />
        </div>

        {/* Platform Selection */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 uppercase mb-2 block">Platforms</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400" },
              { id: "twitter", label: "Twitter", icon: Twitter, color: "text-blue-400" },
              { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
              { id: "tiktok", label: "TikTok", icon: Play, color: "text-cyan-400" },
              { id: "youtube", label: "YouTube", icon: Youtube, color: "text-red-400" },
              { id: "linkedin", label: "LinkedIn", icon: User, color: "text-blue-500" },
            ].map((platform) => (
              <button
                key={platform.id}
                onClick={() => {
                  const newPlatforms = searchState.platforms.includes(platform.id as SocialPlatform)
                    ? searchState.platforms.filter((p) => p !== platform.id)
                    : [...searchState.platforms, platform.id as SocialPlatform];
                  setSearchState({ ...searchState, platforms: newPlatforms });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  searchState.platforms.includes(platform.id as SocialPlatform)
                    ? `bg-surface-2 border border-accent-cyan/30 ${platform.color}`
                    : "text-slate-500 hover:text-slate-300 hover:bg-surface-2"
                }`}
              >
                <platform.icon className="w-3.5 h-3.5" />
                {platform.label}
              </button>
            ))}
          </div>
        </div>

        {/* Depth Selection */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "quick", label: "Quick Scan", desc: "Basic profile info" },
            { id: "standard", label: "Standard", desc: "Posts + metadata" },
            { id: "deep", label: "Deep Analysis", desc: "Full reconnaissance" },
          ].map((depth) => (
            <button
              key={depth.id}
              onClick={() => setSearchState({ ...searchState, depth: depth.id as SearchState["depth"] })}
              className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                searchState.depth === depth.id
                  ? "bg-accent-cyan/5 border-accent-cyan/30"
                  : "border-border hover:border-slate-500"
              }`}
            >
              <div className={`text-sm font-medium ${searchState.depth === depth.id ? "text-accent-cyan" : "text-slate-300"}`}>
                {depth.label}
              </div>
              <div className="text-xs text-slate-500">{depth.desc}</div>
            </button>
          ))}
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSearching ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Start Investigation
            </>
          )}
        </button>

        {/* Username Variations Preview */}
        {searchState.query && searchState.type === "username" && (
          <div className="mt-6 p-4 bg-surface-2/50 rounded-lg">
            <label className="text-xs text-slate-500 uppercase mb-2 block">Username Variations</label>
            <div className="flex flex-wrap gap-1">
              {generateUsernameVariations(searchState.query).map((variation) => (
                <span
                  key={variation}
                  className="px-2 py-1 bg-surface-2 text-slate-400 rounded text-xs font-mono"
                >
                  {variation}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderInstagramProfile = () => {
    if (!instagramProfile) return null;

    const emails = extractInstagramEmails(instagramProfile);
    const geolocation = analyzeInstagramGeolocation(instagramProfile.posts);
    const timeline = analyzeInstagramTimeline(instagramProfile.posts);

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-6 p-6 border-b border-border bg-surface-1">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-surface-2 flex items-center justify-center">
                <User className="w-10 h-10 text-slate-400" />
              </div>
            </div>
            {instagramProfile.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Verified className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-semibold text-white">{instagramProfile.username}</h2>
              {instagramProfile.isBusiness && (
                <span className="px-2 py-0.5 bg-pink-500/10 text-pink-400 rounded text-xs">
                  Business
                </span>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://instagram.com/${instagramProfile.username}`);
                  toast.success("Copied to clipboard");
                }}
                className="p-1.5 hover:bg-surface-2 rounded"
              >
                <Copy className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <h3 className="text-lg text-slate-300 mb-2">{instagramProfile.displayName}</h3>
            
            <p className="text-sm text-slate-400 mb-4 whitespace-pre-line">{instagramProfile.bio}</p>

            {/* Metrics */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {instagramProfile.metrics.posts.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">posts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {instagramProfile.metrics.followers.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">followers</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {instagramProfile.metrics.following.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">following</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-pink-400">
                  {instagramProfile.contentAnalysis.engagementRate}%
                </div>
                <div className="text-xs text-slate-500">engagement</div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="w-64 space-y-2">
            {emails.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300">{emails[0]}</span>
                <span className="text-slate-500">({emails.length} found)</span>
              </div>
            )}
            {instagramProfile.businessPhone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300">{instagramProfile.businessPhone}</span>
              </div>
            )}
            {instagramProfile.website && (
              <div className="flex items-center gap-2 text-xs">
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                <a href={instagramProfile.website} target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline">
                  {instagramProfile.website}
                </a>
              </div>
            )}
            {instagramProfile.location && (
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300">{instagramProfile.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-1">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "posts", label: "Posts", icon: Grid3X3, count: instagramProfile.posts.length },
            { id: "stories", label: "Stories", icon: Play },
            { id: "network", label: "Network", icon: Network },
            { id: "analysis", label: "Analysis", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-pink-400 border-b-2 border-pink-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count && (
                <span className="px-1.5 py-0.5 bg-surface-2 text-slate-400 rounded text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-3 gap-6">
              {/* Content Analysis */}
              <div className="col-span-2 space-y-6">
                <div className="bg-surface-1 border border-border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-pink-400" />
                    Content Analysis
                  </h4>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-lg font-semibold text-white">
                        {instagramProfile.contentAnalysis.dominantColors.length}
                      </div>
                      <div className="text-xs text-slate-500">Dominant Colors</div>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-lg font-semibold text-white">
                        {instagramProfile.contentAnalysis.locationsTagged.length}
                      </div>
                      <div className="text-xs text-slate-500">Locations Tagged</div>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-lg font-semibold text-white">
                        {instagramProfile.contentAnalysis.frequentHashtags.length}
                      </div>
                      <div className="text-xs text-slate-500">Frequent Hashtags</div>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-lg font-semibold text-pink-400">
                        {instagramProfile.contentAnalysis.engagementRate}%
                      </div>
                      <div className="text-xs text-slate-500">Engagement Rate</div>
                    </div>
                  </div>

                  {/* Top Hashtags */}
                  <div className="mb-4">
                    <h5 className="text-xs text-slate-500 uppercase mb-2">Top Hashtags</h5>
                    <div className="flex flex-wrap gap-2">
                      {instagramProfile.contentAnalysis.frequentHashtags.map((tag) => (
                        <span
                          key={tag.tag}
                          className="flex items-center gap-1 px-2 py-1 bg-pink-500/10 text-pink-400 rounded text-xs"
                        >
                          <Hash className="w-3 h-3" />
                          {tag.tag}
                          <span className="text-slate-500">({tag.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Posting Schedule */}
                  <div>
                    <h5 className="text-xs text-slate-500 uppercase mb-2">Posting Schedule</h5>
                    <div className="flex gap-1">
                      {instagramProfile.contentAnalysis.postingSchedule.map((day) => (
                        <div
                          key={day.day}
                          className="flex-1 p-2 bg-surface-2 rounded text-center"
                        >
                          <div className="text-xs font-medium text-white">{day.day.slice(0, 3)}</div>
                          <div className="text-[10px] text-slate-500">{day.count} posts</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-surface-1 border border-border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-pink-400" />
                    Activity Timeline
                  </h4>
                  <div className="space-y-2">
                    {timeline.map((period) => (
                      <div key={period.period} className="flex items-center gap-3 p-2 bg-surface-2 rounded">
                        <div className="w-16 text-xs font-medium text-white">{period.period}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{period.postCount} posts</span>
                            <span>•</span>
                            <span>{period.engagementTrend.toFixed(0)} avg engagement</span>
                          </div>
                          {period.topLocations.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {period.topLocations.slice(0, 2).map((loc) => (
                                <span key={loc} className="text-[10px] text-slate-500">
                                  {loc}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-4">
                {/* Business Info */}
                {instagramProfile.isBusiness && (
                  <div className="bg-surface-1 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3">Business Info</h4>
                    {instagramProfile.businessCategory && (
                      <div className="text-xs text-slate-400 mb-2">
                        Category: <span className="text-slate-300">{instagramProfile.businessCategory}</span>
                      </div>
                    )}
                    {instagramProfile.businessAddress && (
                      <div className="flex items-start gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                        <span className="text-slate-300">
                          {instagramProfile.businessAddress.street}<br />
                          {instagramProfile.businessAddress.zip} {instagramProfile.businessAddress.city}<br />
                          {instagramProfile.businessAddress.country}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Geolocation */}
                <div className="bg-surface-1 border border-border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-pink-400" />
                    Geolocation
                  </h4>
                  {geolocation.homeLocation && (
                    <div className="mb-3 p-2 bg-pink-500/10 border border-pink-500/20 rounded">
                      <div className="text-xs text-slate-500">Predicted Home</div>
                      <div className="text-sm text-pink-400">{geolocation.homeLocation.name}</div>
                      <div className="text-[10px] text-slate-500">
                        Confidence: {geolocation.homeLocation.confidence.toFixed(0)}%
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {geolocation.frequentLocations.map((loc) => (
                      <div key={loc} className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-300">{loc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emails */}
                {emails.length > 0 && (
                  <div className="bg-surface-1 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-pink-400" />
                      Extracted Emails
                    </h4>
                    <div className="space-y-1">
                      {emails.map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between p-1.5 bg-surface-2 rounded"
                        >
                          <code className="text-xs text-slate-300">{email}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(email);
                              toast.success("Copied");
                            }}
                            className="p-1 hover:bg-surface-3 rounded"
                          >
                            <Copy className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Links */}
                {instagramProfile.externalLinks.length > 0 && (
                  <div className="bg-surface-1 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3">External Links</h4>
                    <div className="space-y-1">
                      {instagramProfile.externalLinks.map((link) => (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-1.5 bg-surface-2 rounded text-xs text-accent-cyan hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {link.replace(/^https?:\/\//, "").slice(0, 30)}...
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "posts" && (
            <div className="grid grid-cols-4 gap-4">
              {instagramProfile.posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => {
                    setSelectedPost(post);
                    setShowPostModal(true);
                  }}
                  className="aspect-square bg-surface-2 rounded-lg overflow-hidden cursor-pointer group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {post.type === "video" ? (
                      <Video className="w-8 h-8 text-white/50" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-white/50" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-3 text-white text-xs">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {post.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.comments.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {post.location && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/70">
                      <MapPin className="w-3 h-3" />
                      {post.location.name.slice(0, 20)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="grid grid-cols-2 gap-6">
              {/* Color Analysis */}
              <div className="bg-surface-1 border border-border rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-4">Dominant Colors</h4>
                <div className="flex gap-2">
                  {instagramProfile.contentAnalysis.dominantColors.map((color) => (
                    <div
                      key={color}
                      className="w-12 h-12 rounded-lg shadow-lg"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Location Heatmap Placeholder */}
              <div className="bg-surface-1 border border-border rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-4">Location Heatmap</h4>
                <div className="h-48 bg-surface-2 rounded-lg flex items-center justify-center">
                  <MapIcon className="w-12 h-12 text-slate-600" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProfileView = () => (
    <div className="h-full flex flex-col">
      {/* Platform Selector */}
      <div className="flex items-center gap-2 p-4 border-b border-border bg-surface-1">
        <button
          onClick={() => setViewMode("search")}
          className="p-2 hover:bg-surface-2 rounded-lg"
        >
          <ChevronRight className="w-5 h-5 text-slate-500 rotate-180" />
        </button>
        
        {[
          { id: "instagram", label: "Instagram", icon: Instagram, profile: instagramProfile },
          { id: "twitter", label: "Twitter", icon: Twitter, profile: twitterProfile },
          { id: "facebook", label: "Facebook", icon: Facebook, profile: facebookProfile },
        ].map((platform) => (
          platform.profile && (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id as SocialPlatform)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedPlatform === platform.id
                  ? "bg-pink-500/10 text-pink-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <platform.icon className="w-4 h-4" />
              {platform.label}
            </button>
          )
        ))}
      </div>

      {/* Platform Content */}
      <div className="flex-1 overflow-hidden">
        {selectedPlatform === "instagram" && instagramProfile && renderInstagramProfile()}
        {selectedPlatform === "twitter" && twitterProfile && (
          <div className="h-full flex items-center justify-center text-slate-500">
            <Twitter className="w-12 h-12 mb-4 opacity-20" />
            <p>Twitter analysis module (coming soon)</p>
          </div>
        )}
        {selectedPlatform === "facebook" && facebookProfile && (
          <div className="h-full flex items-center justify-center text-slate-500">
            <Facebook className="w-12 h-12 mb-4 opacity-20" />
            <p>Facebook analysis module (coming soon)</p>
          </div>
        )}
      </div>
    </div>
  );

  // Post Detail Modal
  const renderPostModal = () => {
    if (!selectedPost || !showPostModal) return null;

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl bg-surface-1 rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-medium text-white">Post Details</h3>
            <button
              onClick={() => setShowPostModal(false)}
              className="p-2 hover:bg-surface-2 rounded"
            >
              <span className="text-slate-500">✕</span>
            </button>
          </div>

          <div className="flex">
            {/* Media */}
            <div className="w-1/2 aspect-square bg-surface-2 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-slate-600" />
            </div>

            {/* Details */}
            <div className="w-1/2 p-6 space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-pink-400" />
                  {selectedPost.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  {selectedPost.comments.toLocaleString()}
                </span>
                {selectedPost.views && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Eye className="w-4 h-4" />
                    {selectedPost.views.toLocaleString()}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-300 whitespace-pre-line">
                  {selectedPost.caption}
                </p>
              </div>

              {selectedPost.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedPost.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-surface-2 text-pink-400 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {selectedPost.location && (
                <div className="flex items-start gap-2 p-3 bg-surface-2 rounded">
                  <MapPin className="w-4 h-4 text-pink-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-white">{selectedPost.location.name}</div>
                    {selectedPost.location.lat && selectedPost.location.lng && (
                      <div className="text-xs text-slate-500 font-mono">
                        {selectedPost.location.lat.toFixed(6)}, {selectedPost.location.lng.toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500">
                Posted: {new Date(selectedPost.createdAt).toLocaleString()}
              </div>

              {selectedPost.extractedEmails.length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                  <div className="text-xs text-yellow-400 mb-1">Extracted Emails</div>
                  <div className="space-y-1">
                    {selectedPost.extractedEmails.map((email) => (
                      <code key={email} className="block text-xs text-slate-300">
                        {email}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-surface-0">
      {viewMode === "search" && renderSearchView()}
      {viewMode === "profile" && renderProfileView()}
      {renderPostModal()}
    </div>
  );
}
