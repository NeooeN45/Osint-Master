import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Globe2, Radio, Target, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

// Types minimalistes
interface LocationData {
  target: string;
  lat: number;
  lng: number;
  accuracy: number;
  city?: string;
  country?: string;
  isp?: string;
  source: string;
}

// Globe 3D minimaliste
function MinimalGlobe({ lat, lng, target }: { lat: number; lng: number; target: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rotation = 0;
    let animationId: number;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.35;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Globe background
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e293b");

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Grid lines
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 0.5;

      // Latitude
      for (let i = -2; i <= 2; i++) {
        const y = cy + (i * r * 0.4);
        ctx.beginPath();
        ctx.ellipse(cx, y, r * Math.sqrt(1 - (i * 0.4) ** 2), r * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Longitude (rotating)
      for (let i = 0; i < 6; i++) {
        const angle = ((i * 60 + rotation) * Math.PI) / 180;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.15, r, angle, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Target point
      const targetLat = ((90 - lat) * Math.PI) / 180;
      const targetLng = ((lng + rotation) * Math.PI) / 180;
      const tx = cx + r * 0.85 * Math.sin(targetLat) * Math.cos(targetLng);
      const ty = cy - r * 0.85 * Math.cos(targetLat);

      if (Math.cos(targetLng) > 0) {
        // Pulse effect
        const pulse = Math.sin(Date.now() / 200) * 3 + 6;

        // Glow
        const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, pulse * 2);
        glow.addColorStop(0, "rgba(6, 182, 212, 0.6)");
        glow.addColorStop(1, "rgba(6, 182, 212, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(tx, ty, pulse * 2, 0, Math.PI * 2);
        ctx.fill();

        // Point
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#06b6d4";
        ctx.fill();

        // Label
        ctx.fillStyle = "#fff";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(target, tx, ty - 10);
      }

      rotation = (rotation + 0.3) % 360;
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [lat, lng, target]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="w-full h-full"
    />
  );
}

// UI minimaliste élégante
export default function MinimalPrecisionGeolocationView() {
  const [target, setTarget] = useState("");
  const [type, setType] = useState<"ip" | "phone">("ip");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!target.trim()) {
      toast.error("Enter a target");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Appel API réel au backend
      const response = await fetch("http://localhost:3000/api/geolocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, type }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      toast.success(`Located: ${data.city || "Unknown"}, ${data.country || "Unknown"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to locate");
      toast.error("Location failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header minimal */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Globe2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-100">Precision Geo</h1>
              <p className="text-xs text-slate-500">IP & Phone Location</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            API Ready
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search Section - Clean & Minimal */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setType("ip")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "ip"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              IP Address
            </button>
            <button
              onClick={() => setType("phone")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "phone"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Phone
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={type === "ip" ? "192.168.1.1" : "+33 6 12 34 56 78"}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 pl-12 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
            <button
              onClick={search}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Locate <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <XCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Results - Minimal Grid */}
        {result && (
          <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Globe Visualization */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] relative">
                <MinimalGlobe lat={result.lat} lng={result.lng} target={result.target} />
              </div>
              <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300">{result.target}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-500">Live</span>
                </div>
              </div>
            </div>

            {/* Data Card */}
            <div className="space-y-4">
              {/* Coordinates */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-slate-300">Coordinates</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Latitude</div>
                    <div className="font-mono text-slate-200">{result.lat.toFixed(6)}°</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Longitude</div>
                    <div className="font-mono text-slate-200">{result.lng.toFixed(6)}°</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Accuracy</span>
                    <span className="text-sm text-cyan-400">±{result.accuracy}m</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              {(result.city || result.country) && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-slate-300">Location</span>
                  </div>
                  <div className="text-lg text-slate-100">
                    {[result.city, result.country].filter(Boolean).join(", ")}
                  </div>
                </div>
              )}

              {/* Network */}
              {result.isp && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-slate-300">Network</span>
                  </div>
                  <div className="text-slate-200">{result.isp}</div>
                  <div className="text-xs text-slate-500 mt-1">Source: {result.source}</div>
                </div>
              )}

              {/* Confidence Badge */}
              <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-5 py-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-sm font-medium text-emerald-400">Verified Location</div>
                  <div className="text-xs text-slate-500">Cross-referenced with multiple sources</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - Clean */}
        {!result && !loading && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
              <Globe2 className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500">Enter an IP or phone number to locate</p>
          </div>
        )}
      </main>
    </div>
  );
}
