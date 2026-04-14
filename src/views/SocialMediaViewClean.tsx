import { useState } from "react";
import { Search, Instagram, Twitter, Facebook, User, Globe, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { SocialPlatform } from "../types/darkweb";
import {
  analyzeInstagramProfile,
  analyzeTwitterProfile,
  analyzeFacebookProfile,
  matchCrossPlatformProfiles,
  checkSocialAPIStatus,
} from "../lib/socialMediaProReal";

interface SearchResult {
  platform: SocialPlatform;
  status: "idle" | "loading" | "success" | "error";
  data?: { username?: string; url?: string; confidence?: number } | null;
  error?: string;
}

export default function SocialMediaViewClean() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"username" | "email">("username");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["instagram", "twitter", "facebook"]);
  const [results, setResults] = useState<Record<SocialPlatform, SearchResult>>({
    instagram: { platform: "instagram", status: "idle" },
    twitter: { platform: "twitter", status: "idle" },
    facebook: { platform: "facebook", status: "idle" },
    tiktok: { platform: "tiktok", status: "idle" },
    linkedin: { platform: "linkedin", status: "idle" },
    reddit: { platform: "reddit", status: "idle" },
    youtube: { platform: "youtube", status: "idle" },
    telegram: { platform: "telegram", status: "idle" },
    snapchat: { platform: "snapchat", status: "idle" },
    discord: { platform: "discord", status: "idle" },
    pinterest: { platform: "pinterest", status: "idle" },
    tumblr: { platform: "tumblr", status: "idle" },
    soundcloud: { platform: "soundcloud", status: "idle" },
    spotify: { platform: "spotify", status: "idle" },
    twitch: { platform: "twitch", status: "idle" },
  });
  const [isSearching, setIsSearching] = useState(false);
  const [apiStatus, setApiStatus] = useState<Record<string, boolean> | null>(null);

  // Check API status on mount
  const checkStatus = async () => {
    const status = await checkSocialAPIStatus();
    setApiStatus(status);
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a username or email");
      return;
    }

    setIsSearching(true);

    // Reset results
    const newResults: Record<SocialPlatform, SearchResult> = {
      instagram: { platform: "instagram", status: "idle" },
      twitter: { platform: "twitter", status: "idle" },
      facebook: { platform: "facebook", status: "idle" },
      tiktok: { platform: "tiktok", status: "idle" },
      linkedin: { platform: "linkedin", status: "idle" },
      reddit: { platform: "reddit", status: "idle" },
      youtube: { platform: "youtube", status: "idle" },
      telegram: { platform: "telegram", status: "idle" },
      snapchat: { platform: "snapchat", status: "idle" },
      discord: { platform: "discord", status: "idle" },
      pinterest: { platform: "pinterest", status: "idle" },
      tumblr: { platform: "tumblr", status: "idle" },
      soundcloud: { platform: "soundcloud", status: "idle" },
      spotify: { platform: "spotify", status: "idle" },
      twitch: { platform: "twitch", status: "idle" },
    };

    // Mark selected platforms as loading
    platforms.forEach((p) => {
      newResults[p] = { platform: p, status: "loading" };
    });
    setResults(newResults);

    // Execute searches in parallel
    const promises = platforms.map(async (platform) => {
      try {
        let result;
        switch (platform) {
          case "instagram":
            result = await analyzeInstagramProfile(query);
            break;
          case "twitter":
            result = await analyzeTwitterProfile(query);
            break;
          case "facebook":
            result = await analyzeFacebookProfile(`https://facebook.com/${query}`);
            break;
          default:
            result = { success: false, error: "Platform not yet implemented" };
        }

        setResults((prev) => ({
          ...prev,
          [platform]: {
            platform,
            status: result.success ? "success" : "error",
            data: result.data,
            error: result.error,
          },
        }));
      } catch (error) {
        setResults((prev) => ({
          ...prev,
          [platform]: {
            platform,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        }));
      }
    });

    await Promise.all(promises);
    setIsSearching(false);

    const successCount = platforms.filter((p) => results[p]?.status === "success").length;
    if (successCount > 0) {
      toast.success(`Found data on ${successCount} platform(s)`);
    }
  };

  const handleCrossPlatform = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    toast.info("Searching across platforms...");

    const result = await matchCrossPlatformProfiles(query, platforms);

    if (result.success && result.matches) {
      toast.success(`Found ${result.matches.length} potential matches`);
      // Update results with matches
      result.matches.forEach((match) => {
        setResults((prev) => ({
          ...prev,
          [match.platform]: {
            platform: match.platform,
            status: "success",
            data: { username: match.username, url: match.url, confidence: match.confidence },
          },
        }));
      });
    } else {
      toast.error(result.error || "No matches found");
    }

    setIsSearching(false);
  };

  return (
    <div className="h-full bg-slate-950 text-slate-200 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Social Media Intelligence</h1>
          <p className="text-slate-500">
            Search across multiple platforms using real APIs
          </p>
        </div>

        {/* API Status */}
        {apiStatus && (
          <div className="flex gap-4 mb-6">
            {Object.entries(apiStatus).map(([platform, available]) => (
              <div
                key={platform}
                className={`flex items-center gap-2 text-sm ${
                  available ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {available ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </div>
            ))}
            <button
              onClick={checkStatus}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              <RefreshCw className="w-3 h-3 inline" /> Refresh
            </button>
          </div>
        )}

        {/* Search Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setType("username")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "username"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Username
            </button>
            <button
              onClick={() => setType("email")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "email"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Email
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={type === "username" ? "Enter username..." : "Enter email..."}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isSearching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>

          {/* Platform Selection */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: "instagram", icon: Instagram, label: "Instagram" },
              { id: "twitter", icon: Twitter, label: "Twitter" },
              { id: "facebook", icon: Facebook, label: "Facebook" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() =>
                  setPlatforms((prev) =>
                    prev.includes(id as SocialPlatform)
                      ? prev.filter((p) => p !== id)
                      : [...prev, id as SocialPlatform]
                  )
                }
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  platforms.includes(id as SocialPlatform)
                    ? "bg-slate-800 text-slate-200 border border-slate-700"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Cross-platform button */}
          <button
            onClick={handleCrossPlatform}
            disabled={isSearching || platforms.length < 2}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Cross-Platform Matching
          </button>
        </div>

        {/* Results */}
        <div className="grid gap-4">
          {platforms.map((platform) => {
            const result = results[platform];
            if (result.status === "idle") return null;

            return (
              <div
                key={platform}
                className={`bg-slate-900 border rounded-xl p-4 ${
                  result.status === "success"
                    ? "border-emerald-500/30"
                    : result.status === "error"
                    ? "border-red-500/30"
                    : "border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {platform === "instagram" && <Instagram className="w-5 h-5 text-pink-500" />}
                    {platform === "twitter" && <Twitter className="w-5 h-5 text-blue-500" />}
                    {platform === "facebook" && <Facebook className="w-5 h-5 text-blue-600" />}
                    <span className="font-medium text-slate-200 capitalize">{platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.status === "loading" && (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    )}
                    {result.status === "success" && (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    )}
                    {result.status === "error" && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>

                {result.status === "success" && result.data && (
                  <div className="text-sm text-slate-400">
                    {typeof result.data === "object" && result.data && "username" in result.data ? (
                      <div className="space-y-1">
                        <p className="text-slate-200">
                          @{String((result.data as { username: string }).username)}
                        </p>
                        {"confidence" in result.data && (
                          <p>Confidence: {(result.data as { confidence: number }).confidence}%</p>
                        )}
                        {"url" in result.data && (
                          <a
                            href={String((result.data as { url: string }).url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            View Profile →
                          </a>
                        )}
                      </div>
                    ) : (
                      <p>Profile found (data available)</p>
                    )}
                  </div>
                )}

                {result.status === "error" && result.error && (
                  <p className="text-sm text-red-400">{result.error}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {platforms.every((p) => results[p].status === "idle") && (
          <div className="text-center py-12 text-slate-500">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Search for a username to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}
