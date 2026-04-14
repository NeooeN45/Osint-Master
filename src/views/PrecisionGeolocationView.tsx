import { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe,
  MapPin,
  Satellite,
  Radio,
  Smartphone,
  Wifi,
  Crosshair,
  Layers,
  Eye,
  EyeOff,
  Navigation,
  Search,
  Target,
  AlertTriangle,
  CheckCircle,
  Signal,
  Clock,
  Database,
  Grid3X3,
  Maximize2,
  Minimize2,
  RefreshCw,
  Share2,
  Download,
  ChevronRight,
  Building2,
  TowerControl,
  Radar,
  Zap,
  Shield,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface LocationResult {
  target: string;
  targetType: 'ip' | 'phone' | 'wifi';
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  precision: 'exact' | 'building' | 'street' | 'block' | 'city' | 'region' | 'country';
  location: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    district?: string;
    zipCode?: string;
    street?: string;
  };
  network: {
    isp: string;
    organization: string;
    connectionType: string;
    proxy: boolean;
    vpn: boolean;
    tor: boolean;
    mobile: boolean;
  };
  cellInfo?: {
    mcc?: string;
    mnc?: string;
    lac?: string;
    cellId?: string;
    triangulation?: {
      towers: Array<{
        lat: number;
        lng: number;
        strength: number;
      }>;
      confidence: number;
    };
  };
  confidence: number;
  timestamp: string;
  sources: string[];
}

interface GlobePoint {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
}

// Mock precision location data
const MOCK_LOCATIONS: Record<string, LocationResult> = {
  '8.8.8.8': {
    target: '8.8.8.8',
    targetType: 'ip',
    coordinates: { latitude: 37.4192, longitude: -122.0574, accuracy: 15 },
    precision: 'building',
    location: {
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      city: 'Mountain View',
      district: 'Santa Clara County',
      zipCode: '94043',
      street: '1600 Amphitheatre Parkway',
    },
    network: {
      isp: 'Google LLC',
      organization: 'Google Public DNS',
      connectionType: 'Datacenter',
      proxy: false,
      vpn: false,
      tor: false,
      mobile: false,
    },
    confidence: 98,
    timestamp: new Date().toISOString(),
    sources: ['MaxMind GeoIP2', 'Google Geolocation', 'IPinfo.io'],
  },
  '+1-555-0100': {
    target: '+1-555-0100',
    targetType: 'phone',
    coordinates: { latitude: 40.7128, longitude: -74.0060, accuracy: 150 },
    precision: 'block',
    location: {
      country: 'United States',
      countryCode: 'US',
      region: 'New York',
      city: 'New York',
      district: 'Manhattan',
      zipCode: '10001',
    },
    network: {
      isp: 'Verizon Wireless',
      organization: 'Verizon Communications',
      connectionType: 'Mobile 5G',
      proxy: false,
      vpn: false,
      tor: false,
      mobile: true,
    },
    cellInfo: {
      mcc: '310',
      mnc: '004',
      lac: '12345',
      cellId: '678901234',
      triangulation: {
        towers: [
          { lat: 40.7130, lng: -74.0065, strength: -75 },
          { lat: 40.7125, lng: -74.0055, strength: -82 },
          { lat: 40.7135, lng: -74.0060, strength: -88 },
        ],
        confidence: 87,
      },
    },
    confidence: 87,
    timestamp: new Date().toISOString(),
    sources: ['HLR Lookup', 'OpenCellID', 'Google Geolocation API'],
  },
};

// Simple Globe Component using Canvas
function GlobeVisualization({ target, coordinates, showTriangulation }: {
  target: string;
  coordinates: { latitude: number; longitude: number };
  showTriangulation?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState<number>(0);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Draw globe sphere
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw latitude/longitude grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;

      // Latitude lines
      for (let lat = -80; lat <= 80; lat += 20) {
        const y = centerY - (lat / 90) * radius * 0.9;
        ctx.beginPath();
        ctx.ellipse(centerX, y, radius * Math.cos((lat * Math.PI) / 180), 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Longitude lines
      const rot = (rotation * Math.PI) / 180;
      for (let lng = 0; lng < 360; lng += 30) {
        const lngRad = ((lng + rotation) * Math.PI) / 180;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius * Math.cos(lngRad - rot) * 0.3, radius, rot, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw continents (simplified dots)
      const continentPoints = [
        // North America
        { lat: 45, lng: -100 }, { lat: 40, lng: -95 }, { lat: 35, lng: -90 },
        { lat: 50, lng: -110 }, { lat: 30, lng: -85 },
        // Europe
        { lat: 50, lng: 10 }, { lat: 45, lng: 5 }, { lat: 55, lng: 15 },
        // Asia
        { lat: 35, lng: 105 }, { lat: 25, lng: 80 }, { lat: 40, lng: 120 },
        // Africa
        { lat: 0, lng: 20 }, { lat: -20, lng: 25 }, { lat: 10, lng: 10 },
      ];

      continentPoints.forEach(point => {
        const phi = ((90 - point.lat) * Math.PI) / 180;
        const theta = ((point.lng + rotation) * Math.PI) / 180;
        const x = centerX + radius * 0.85 * Math.sin(phi) * Math.cos(theta);
        const y = centerY - radius * 0.85 * Math.cos(phi);

        // Only draw if on front side of globe
        if (Math.cos(theta) > 0) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#475569';
          ctx.fill();
        }
      });

      // Draw target location
      const targetPhi = ((90 - coordinates.latitude) * Math.PI) / 180;
      const targetTheta = ((coordinates.longitude + rotation) * Math.PI) / 180;
      const targetX = centerX + radius * 0.85 * Math.sin(targetPhi) * Math.cos(targetTheta);
      const targetY = centerY - radius * 0.85 * Math.cos(targetPhi);

      if (Math.cos(targetTheta) > 0) {
        // Pulsing effect
        const pulse = Math.sin(Date.now() / 300) * 5 + 8;

        // Outer glow
        const gradient = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, pulse * 2);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.beginPath();
        ctx.arc(targetX, targetY, pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Center point
        ctx.beginPath();
        ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(target, targetX, targetY - 15);
      }

      setRotation(r => (r + 0.1) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [coordinates, target, rotation]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="w-full h-full rounded-lg"
    />
  );
}

// Map Component
function PrecisionMap({ result, showSatellite, showStreetView, zoom }: {
  result: LocationResult;
  showSatellite: boolean;
  showStreetView: boolean;
  zoom: number;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Generate map URL based on settings
  const getMapUrl = () => {
    const { latitude, longitude } = result.coordinates;
    const mapType = showSatellite ? 'satellite' : 'roadmap';
    const zoomLevel = zoom;

    // Using Google Maps Static API (in production, use proper API key)
    return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d500!2d${longitude}!3d${latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e${showSatellite ? '1' : '0'}!3m2!1sen!2sus!4v1`;
  };

  return (
    <div ref={mapContainerRef} className="relative w-full h-full bg-surface-2 rounded-lg overflow-hidden">
      <iframe
        src={getMapUrl()}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="grayscale hover:grayscale-0 transition-all duration-500"
      />

      {/* Overlay with precision info */}
      <div className="absolute top-4 left-4 bg-surface-1/90 backdrop-blur p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-accent-cyan" />
          <span className="text-sm font-medium text-white">Target: {result.target}</span>
        </div>
        <div className="text-xs text-slate-400 space-y-1">
          <div>Lat: {result.coordinates.latitude.toFixed(6)}</div>
          <div>Lng: {result.coordinates.longitude.toFixed(6)}</div>
          <div>Accuracy: ±{result.coordinates.accuracy}m</div>
          <div className="flex items-center gap-1">
            Precision:
            <span className={`
              ${result.precision === 'exact' || result.precision === 'building' ? 'text-green-400' :
                result.precision === 'street' ? 'text-accent-cyan' :
                result.precision === 'block' ? 'text-yellow-400' : 'text-slate-400'}
            `}>
              {result.precision.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Cell towers for phone location */}
      {result.targetType === 'phone' && result.cellInfo?.triangulation && (
        <div className="absolute bottom-4 left-4 bg-surface-1/90 backdrop-blur p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TowerControl className="w-4 h-4 text-accent-cyan" />
            <span className="text-sm font-medium text-white">Cell Triangulation</span>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <div>Towers: {result.cellInfo.triangulation.towers.length}</div>
            <div>Confidence: {result.cellInfo.triangulation.confidence}%</div>
            <div>MCC: {result.cellInfo.mcc} | MNC: {result.cellInfo.mnc}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export default function PrecisionGeolocationView() {
  const [target, setTarget] = useState('');
  const [targetType, setTargetType] = useState<'ip' | 'phone' | 'wifi'>('ip');
  const [result, setResult] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'globe' | 'map'>('globe');
  const [showSatellite, setShowSatellite] = useState(true);
  const [showStreetView, setShowStreetView] = useState(false);
  const [zoom, setZoom] = useState(18);
  const [showTriangulation, setShowTriangulation] = useState(true);
  const [history, setHistory] = useState<LocationResult[]>([]);

  const performLookup = useCallback(async () => {
    if (!target) {
      toast.error('Please enter a target');
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Use mock data or generate realistic data
      const mockResult = MOCK_LOCATIONS[target] || {
        target,
        targetType,
        coordinates: {
          latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
          longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
          accuracy: targetType === 'ip' ? 50 : 200,
        },
        precision: targetType === 'ip' ? 'street' : 'block',
        location: {
          country: 'France',
          countryCode: 'FR',
          region: 'Île-de-France',
          city: 'Paris',
          district: '75001',
        },
        network: {
          isp: targetType === 'ip' ? 'Orange' : 'Free Mobile',
          organization: 'Orange S.A.',
          connectionType: targetType === 'ip' ? 'Fiber' : '4G LTE',
          proxy: false,
          vpn: false,
          tor: false,
          mobile: targetType === 'phone',
        },
        confidence: targetType === 'ip' ? 92 : 78,
        timestamp: new Date().toISOString(),
        sources: targetType === 'ip'
          ? ['MaxMind GeoIP2', 'IPinfo.io', 'IP-API.com']
          : ['HLR Lookup', 'OpenCellID', 'Google Geolocation'],
      };

      setResult(mockResult);
      setHistory(prev => [mockResult, ...prev].slice(0, 10));
      toast.success(`Located ${target} with ${mockResult.confidence}% confidence`);

    } catch (error) {
      toast.error('Location lookup failed');
    } finally {
      setLoading(false);
    }
  }, [target, targetType]);

  const getPrecisionColor = (precision: string) => {
    switch (precision) {
      case 'exact': return 'text-green-400';
      case 'building': return 'text-accent-cyan';
      case 'street': return 'text-blue-400';
      case 'block': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getPrecisionIcon = (precision: string) => {
    switch (precision) {
      case 'exact': return Crosshair;
      case 'building': return Building2;
      case 'street': return MapPin;
      case 'block': return Grid3X3;
      default: return Target;
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-1 text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-cyan/10">
            <Globe className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="font-semibold text-white">Precision Geolocation</h1>
            <p className="text-xs text-slate-500">CIA-level location intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Target Input */}
          <div className="flex items-center gap-2">
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
              className="px-3 py-2 bg-surface-3 border border-border rounded text-sm text-white"
            >
              <option value="ip">IP Address</option>
              <option value="phone">Phone Number</option>
              <option value="wifi">WiFi MAC</option>
            </select>

            <div className="relative">
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={
                  targetType === 'ip' ? '8.8.8.8' :
                  targetType === 'phone' ? '+1-555-0100' :
                  'AA:BB:CC:DD:EE:FF'
                }
                className="w-64 pl-9 pr-3 py-2 bg-surface-3 border border-border rounded text-sm text-white placeholder-slate-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>

            <button
              onClick={performLookup}
              disabled={loading || !target}
              className="flex items-center gap-2 px-4 py-2 bg-accent-cyan text-surface-1 rounded font-medium text-sm hover:bg-accent-cyan/90 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {loading ? 'Locating...' : 'Locate'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Controls & Info */}
        <div className="w-80 bg-surface-2 border-r border-border flex flex-col overflow-y-auto">
          {/* View Controls */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 p-1 bg-surface-3 rounded-lg">
              <button
                onClick={() => setViewMode('globe')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm ${
                  viewMode === 'globe' ? 'bg-accent-cyan text-white' : 'text-slate-400'
                }`}
              >
                <Globe className="w-4 h-4" />
                Globe 3D
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm ${
                  viewMode === 'map' ? 'bg-accent-cyan text-white' : 'text-slate-400'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Map
              </button>
            </div>
          </div>

          {/* Map Controls */}
          {viewMode === 'map' && (
            <div className="p-4 border-b border-border space-y-3">
              <h3 className="text-xs font-medium text-slate-400 uppercase">Map Options</h3>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">Satellite View</span>
                <button
                  onClick={() => setShowSatellite(!showSatellite)}
                  className={`p-1.5 rounded ${showSatellite ? 'bg-accent-cyan text-white' : 'text-slate-500'}`}
                >
                  <Satellite className="w-4 h-4" />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">Street View</span>
                <button
                  onClick={() => setShowStreetView(!showStreetView)}
                  className={`p-1.5 rounded ${showStreetView ? 'bg-accent-cyan text-white' : 'text-slate-500'}`}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Zoom Level</span>
                  <span className="text-xs text-accent-cyan">{zoom}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="22"
                  value={zoom}
                  onChange={(e) => setZoom(parseInt(e.target.value))}
                  className="w-full accent-accent-cyan"
                />
              </div>
            </div>
          )}

          {/* Globe Controls */}
          {viewMode === 'globe' && (
            <div className="p-4 border-b border-border space-y-3">
              <h3 className="text-xs font-medium text-slate-400 uppercase">Globe Options</h3>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">Show Triangulation</span>
                <button
                  onClick={() => setShowTriangulation(!showTriangulation)}
                  className={`p-1.5 rounded ${showTriangulation ? 'bg-accent-cyan text-white' : 'text-slate-500'}`}
                >
                  <Activity className="w-4 h-4" />
                </button>
              </label>
            </div>
          )}

          {/* Result Info */}
          {result && (
            <div className="p-4 border-b border-border space-y-4">
              <h3 className="text-xs font-medium text-slate-400 uppercase">Location Details</h3>

              {/* Confidence Score */}
              <div className="p-3 rounded-lg bg-surface-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Confidence</span>
                  <span className={`text-lg font-bold ${
                    result.confidence >= 90 ? 'text-green-400' :
                    result.confidence >= 70 ? 'text-accent-cyan' : 'text-yellow-400'
                  }`}>
                    {result.confidence}%
                  </span>
                </div>
                <div className="h-2 bg-surface-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.confidence >= 90 ? 'bg-green-400' :
                      result.confidence >= 70 ? 'bg-accent-cyan' : 'bg-yellow-400'
                    }`}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </div>

              {/* Precision */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-3">
                <div className={`p-2 rounded ${getPrecisionColor(result.precision)} bg-surface-1`}>
                  {(() => {
                    const Icon = getPrecisionIcon(result.precision);
                    return <Icon className="w-4 h-4" />;
                  })()}
                </div>
                <div>
                  <div className="text-xs text-slate-500">Precision</div>
                  <div className={`font-medium ${getPrecisionColor(result.precision)}`}>
                    {result.precision.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-3">
                <div className="p-2 rounded text-accent-cyan bg-surface-1">
                  <Crosshair className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Accuracy Radius</div>
                  <div className="font-medium text-white">
                    ±{result.coordinates.accuracy} meters
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">{result.location.city}, {result.location.country}</span>
                </div>
                {result.location.street && (
                  <div className="text-xs text-slate-500 pl-6">
                    {result.location.street}
                  </div>
                )}
                <div className="text-xs text-slate-500 pl-6">
                  {result.location.region} {result.location.zipCode}
                </div>
              </div>

              {/* Network Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">{result.network.isp}</span>
                </div>
                <div className="text-xs text-slate-500 pl-6">
                  {result.network.connectionType}
                </div>
              </div>

              {/* Sources */}
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase">Data Sources</div>
                <div className="flex flex-wrap gap-1">
                  {result.sources.map(source => (
                    <span key={source} className="px-2 py-1 bg-accent-cyan/10 text-accent-cyan text-xs rounded">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* History */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Recent Lookups</h3>
            <div className="space-y-2">
              {history.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setResult(item)}
                  className="w-full text-left p-2 rounded bg-surface-3 hover:bg-surface-1 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{item.target}</span>
                    <span className={`text-xs ${
                      item.confidence >= 90 ? 'text-green-400' :
                      item.confidence >= 70 ? 'text-accent-cyan' : 'text-yellow-400'
                    }`}>
                      {item.confidence}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.location.city}, {item.location.country}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Visualization Area */}
        <div className="flex-1 p-4 bg-surface-1">
          {!result ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Globe className="w-16 h-16 mb-4 text-slate-600" />
              <p className="text-lg mb-2">Enter a target to begin geolocation</p>
              <p className="text-sm text-slate-600">IP addresses, phone numbers, or WiFi MAC addresses</p>

              <div className="mt-8 grid grid-cols-3 gap-4">
                {['8.8.8.8', '+1-555-0100', '192.168.1.1'].map(example => (
                  <button
                    key={example}
                    onClick={() => {
                      setTarget(example);
                      if (example.includes('+')) setTargetType('phone');
                      else setTargetType('ip');
                    }}
                    className="px-4 py-2 bg-surface-2 border border-border rounded text-sm text-slate-400 hover:text-white hover:border-accent-cyan"
                  >
                    Try: {example}
                  </button>
                ))}
              </div>
            </div>
          ) : viewMode === 'globe' ? (
            <div className="h-full rounded-lg overflow-hidden border border-border">
              <GlobeVisualization
                target={result.target}
                coordinates={{
                  latitude: result.coordinates.latitude,
                  longitude: result.coordinates.longitude,
                }}
                showTriangulation={showTriangulation}
              />
            </div>
          ) : (
            <PrecisionMap
              result={result}
              showSatellite={showSatellite}
              showStreetView={showStreetView}
              zoom={zoom}
            />
          )}
        </div>

        {/* Right Panel - Technical Details */}
        {result && (
          <div className="w-72 bg-surface-2 border-l border-border p-4 overflow-y-auto">
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-4">Technical Data</h3>

            {/* Coordinates */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-4 h-4 text-accent-cyan" />
                <span className="text-sm font-medium text-white">Coordinates</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Latitude</span>
                  <span className="text-slate-300 font-mono">{result.coordinates.latitude.toFixed(6)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Longitude</span>
                  <span className="text-slate-300 font-mono">{result.coordinates.longitude.toFixed(6)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Accuracy</span>
                  <span className="text-accent-cyan font-mono">±{result.coordinates.accuracy}m</span>
                </div>
              </div>
            </div>

            {/* Network Details */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-4 h-4 text-accent-cyan" />
                <span className="text-sm font-medium text-white">Network</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">ISP</span>
                  <span className="text-slate-300">{result.network.isp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Org</span>
                  <span className="text-slate-300">{result.network.organization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-300">{result.network.connectionType}</span>
                </div>
              </div>

              {/* Security Indicators */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: 'Proxy', value: result.network.proxy, icon: Shield },
                  { label: 'VPN', value: result.network.vpn, icon: EyeOff },
                  { label: 'Tor', value: result.network.tor, icon: Zap },
                  { label: 'Mobile', value: result.network.mobile, icon: Smartphone },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 p-2 rounded ${
                      value ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="text-xs">{label}: {value ? 'Yes' : 'No'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cell Tower Info (Phone only) */}
            {result.targetType === 'phone' && result.cellInfo && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TowerControl className="w-4 h-4 text-accent-cyan" />
                  <span className="text-sm font-medium text-white">Cell Towers</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">MCC</span>
                    <span className="text-slate-300 font-mono">{result.cellInfo.mcc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MNC</span>
                    <span className="text-slate-300 font-mono">{result.cellInfo.mnc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">LAC</span>
                    <span className="text-slate-300 font-mono">{result.cellInfo.lac}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cell ID</span>
                    <span className="text-slate-300 font-mono">{result.cellInfo.cellId}</span>
                  </div>
                  {result.cellInfo.triangulation && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Towers</span>
                        <span className="text-slate-300">{result.cellInfo.triangulation.towers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Confidence</span>
                        <span className="text-accent-cyan">{result.cellInfo.triangulation.confidence}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-accent-cyan" />
                <span className="text-sm font-medium text-white">Metadata</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp</span>
                  <span className="text-slate-300">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sources</span>
                  <span className="text-slate-300">{result.sources.length}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <button
                onClick={() => {
                  const data = JSON.stringify(result, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `location_${result.target}.json`;
                  a.click();
                  toast.success('Location data exported');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-cyan/10 text-accent-cyan rounded text-sm hover:bg-accent-cyan/20"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${result.coordinates.latitude}, ${result.coordinates.longitude}`);
                  toast.success('Coordinates copied to clipboard');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-surface-3 text-slate-300 rounded text-sm hover:bg-surface-1"
              >
                <Share2 className="w-4 h-4" />
                Copy Coordinates
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
