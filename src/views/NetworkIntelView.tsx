import { useState, useEffect } from "react";
import { 
  Search, 
  Globe, 
  Shield, 
  Server,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Router,
  Lock,
  Unlock,
  Terminal,
  ExternalLink,
  Copy,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  Network,
  Scan,
  Wifi,
  HardDrive,
  Cpu,
  Layers,
  GitBranch,
  AlertOctagon,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  BarChart3,
  PieChart,
  Map,
  Hash,
  FileText,
  Code
} from "lucide-react";
import { toast } from "sonner";
import { PanelSection } from "../components/ProLayout";
import type {
  NetworkScanRequest,
  NetworkScanResult,
  ShodanHost,
  CensysHost,
  CTLogEntry,
  DNSHistory,
  SubdomainDiscovery,
  ASInfo,
  IPReputation,
  PortInfo,
} from "../types/network";
import {
  runNetworkScan,
  shodanHostLookup,
  censysHostLookup,
  queryCTLogs,
  extractSubdomainsFromCT,
  getASNInfo,
  checkAbuseIPDB,
  isValidIP,
  isValidCIDR,
  getPortInfo,
  analyzeSSLConfig,
} from "../lib/networkIntel";

export default function NetworkIntelView() {
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState<"ip" | "domain" | "asn" | "cidr">("ip");
  const [scanTypes, setScanTypes] = useState<string[]>(["shodan", "censys", "reputation"]);
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<NetworkScanResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "dns" | "certs" | "threats">("overview");
  
  const [apiKeys, setApiKeys] = useState({
    shodan: "",
    censys_id: "",
    censys_secret: "",
    abuseipdb: "",
    circl_user: "",
    circl_pass: "",
  });
  const [showApiModal, setShowApiModal] = useState(false);

  // Detect target type automatically
  useEffect(() => {
    if (isValidIP(target)) {
      setTargetType("ip");
    } else if (isValidCIDR(target)) {
      setTargetType("cidr");
    } else if (target.startsWith("AS") || /^\d+$/.test(target)) {
      setTargetType("asn");
    } else if (target.includes(".")) {
      setTargetType("domain");
    }
  }, [target]);

  const handleScan = async () => {
    if (!target.trim()) {
      toast.error("Enter a target to scan");
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    const request: NetworkScanRequest = {
      id: `scan-${Date.now()}`,
      target: target.trim(),
      target_type: targetType,
      scan_types: scanTypes as NetworkScanRequest["scan_types"],
      depth,
      include_history: true,
      correlate_data: true,
      created_at: new Date().toISOString(),
      status: "running",
      progress: 0,
    };

    try {
      const result = await runNetworkScan(request, apiKeys);
      setScanResult(result);
      
      if (result.correlated_findings.length > 0) {
        const critical = result.correlated_findings.filter((f) => f.severity === "critical");
        if (critical.length > 0) {
          toast.error(`${critical.length} critical issues found!`);
        } else {
          toast.success(`Scan complete - ${result.correlated_findings.length} findings`);
        }
      } else {
        toast.success("Scan completed - no critical issues found");
      }
    } catch (error) {
      toast.error("Scan failed: " + (error as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-500 bg-red-500/10 border-red-500/30";
      case "high": return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      case "medium": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
      default: return "text-green-500 bg-green-500/10 border-green-500/30";
    }
  };

  const renderOverview = () => {
    if (!scanResult) return null;
    const { shodan, censys, reputation, ct_logs, subdomains, correlated_findings, stats } = scanResult;

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-4">
          <div className="p-4 bg-surface-1 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-500">Open Ports</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.open_ports}</div>
          </div>
          <div className="p-4 bg-surface-1 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-500">Services</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.services}</div>
          </div>
          <div className="p-4 bg-surface-1 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Network className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-500">Subdomains</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.subdomains}</div>
          </div>
          <div className="p-4 bg-surface-1 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-slate-500">Certificates</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.certificates}</div>
          </div>
          <div className="p-4 bg-surface-1 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-500">Vulns</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.vulnerabilities}</div>
          </div>
          <div className="p-4 bg-surface-1 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-500">Sources</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.data_sources}</div>
          </div>
        </div>

        {/* Critical Findings */}
        {correlated_findings.length > 0 && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              Correlated Findings ({correlated_findings.length})
            </h3>
            <div className="space-y-2">
              {correlated_findings.map((finding, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${getSeverityColor(finding.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    {finding.severity === "critical" ? (
                      <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0" />
                    ) : finding.severity === "high" ? (
                      <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    ) : (
                      <Info className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium uppercase">{finding.type.replace(/_/g, " ")}</span>
                        <span className="text-xs opacity-70">via {finding.source}</span>
                      </div>
                      <p className="text-sm">{finding.description}</p>
                      {finding.evidence !== undefined && finding.evidence !== null && (
                        <pre className="mt-2 p-2 bg-black/20 rounded text-xs font-mono overflow-x-auto">
                          {JSON.stringify(finding.evidence, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Host Information */}
        {(shodan || censys) && (
          <div className="grid grid-cols-2 gap-4">
            {shodan && (
              <div className="bg-surface-1 border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Scan className="w-4 h-4 text-cyan-400" />
                  Shodan Intelligence
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Organization</span>
                    <span className="text-slate-300">{shodan.org}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ISP</span>
                    <span className="text-slate-300">{shodan.isp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ASN</span>
                    <span className="text-slate-300">{shodan.asn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">OS</span>
                    <span className="text-slate-300">{shodan.os || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="text-slate-300">
                      {shodan.city}, {shodan.country_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Update</span>
                    <span className="text-slate-300">
                      {new Date(shodan.last_update).toLocaleDateString()}
                    </span>
                  </div>
                  {shodan.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {shodan.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {censys && (
              <div className="bg-surface-1 border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  Censys Intelligence
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="text-slate-300">
                      {censys.location.city}, {censys.location.country}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Coordinates</span>
                    <span className="text-slate-300 font-mono">
                      {censys.location.coordinates.latitude.toFixed(4)}, {censys.location.coordinates.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">AS Organization</span>
                    <span className="text-slate-300">{censys.autonomous_system.organization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">AS Number</span>
                    <span className="text-slate-300">AS{censys.autonomous_system.asn}</span>
                  </div>
                  {censys.operating_system && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">OS</span>
                      <span className="text-slate-300">
                        {censys.operating_system.product} {censys.operating_system.version}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Updated</span>
                    <span className="text-slate-300">
                      {new Date(censys.last_updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reputation */}
        {reputation && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              IP Reputation
            </h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  reputation.classification === "malicious" ? "text-red-400" :
                  reputation.classification === "suspicious" ? "text-yellow-400" : "text-green-400"
                }`}>
                  {reputation.reputation_score}%
                </div>
                <div className="text-xs text-slate-500 uppercase mt-1">Risk Score</div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(
                    reputation.classification === "malicious" ? "critical" : 
                    reputation.classification === "suspicious" ? "high" : "low"
                  )}`}>
                    {reputation.classification.toUpperCase()}
                  </span>
                  {reputation.tor && (
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">TOR</span>
                  )}
                  {reputation.vpn && (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">VPN</span>
                  )}
                  {reputation.proxy && (
                    <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs">PROXY</span>
                  )}
                </div>
                {reputation.geolocation && (
                  <div className="text-xs text-slate-400">
                    {reputation.geolocation.country} {reputation.geolocation.city && `• ${reputation.geolocation.city}`}
                    {reputation.geolocation.isp && ` • ${reputation.geolocation.isp}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderServices = () => {
    if (!scanResult?.shodan && !scanResult?.censys) {
      return (
        <div className="text-center py-12 text-slate-500">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Run a scan to discover services</p>
        </div>
      );
    }

    const shodanServices = scanResult.shodan?.data || [];
    const censysServices = scanResult.censys?.services || [];

    return (
      <div className="space-y-4">
        {/* Port Overview */}
        {scanResult.shodan && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-4">Open Ports</h3>
            <div className="flex flex-wrap gap-2">
              {scanResult.shodan.ports.map((port) => {
                const info = getPortInfo(port);
                return (
                  <div
                    key={port}
                    className={`px-3 py-2 rounded-lg border ${
                      info?.risk_level === "critical" ? "bg-red-500/10 border-red-500/30" :
                      info?.risk_level === "high" ? "bg-orange-500/10 border-orange-500/30" :
                      "bg-surface-2 border-border"
                    }`}
                  >
                    <div className="text-lg font-semibold text-white">{port}</div>
                    <div className="text-xs text-slate-500">{info?.service || "unknown"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Service Details */}
        <div className="bg-surface-1 border border-border rounded-lg">
          <h3 className="text-sm font-medium text-white p-4 border-b border-border">
            Service Details
          </h3>
          <div className="divide-y divide-border">
            {shodanServices.map((service, i) => (
              <div key={i} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded font-mono text-sm">
                      {service.port}/{service.transport}
                    </span>
                    {service.product && (
                      <span className="text-sm text-white">
                        {service.product} {service.version}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(service.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                {service.banner && (
                  <pre className="mt-2 p-2 bg-surface-2 rounded text-xs text-slate-400 font-mono overflow-x-auto">
                    {service.banner.slice(0, 200)}{service.banner.length > 200 ? "..." : ""}
                  </pre>
                )}

                {/* SSL Analysis */}
                {service.ssl && (
                  <div className="mt-3 p-3 bg-surface-2 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-white">SSL/TLS Configuration</span>
                    </div>
                    {(() => {
                      const ssl = analyzeSSLConfig(service.ssl);
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Grade:</span>
                            <span className={`px-2 py-0.5 rounded text-sm font-bold ${
                              ssl.grade.startsWith("A") ? "bg-green-500/20 text-green-400" :
                              ssl.grade === "B" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>
                              {ssl.grade}
                            </span>
                          </div>
                          {ssl.issues.length > 0 && (
                            <div className="space-y-1">
                              {ssl.issues.map((issue, j) => (
                                <div key={j} className="flex items-center gap-2 text-xs text-orange-400">
                                  <AlertTriangle className="w-3 h-3" />
                                  {issue}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {service.http && (
                  <div className="mt-3 space-y-1 text-xs">
                    {service.http.title && (
                      <div className="text-slate-300">
                        <span className="text-slate-500">Title:</span> {service.http.title}
                      </div>
                    )}
                    {service.http.status && (
                      <div className="text-slate-300">
                        <span className="text-slate-500">Status:</span> {service.http.status}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDNS = () => {
    if (!scanResult?.subdomains && !scanResult?.passive_dns) {
      return (
        <div className="text-center py-12 text-slate-500">
          <Network className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Run a domain scan to discover subdomains and DNS history</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Subdomains */}
        {scanResult.subdomains && scanResult.subdomains.length > 0 && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-4">
              Discovered Subdomains ({scanResult.subdomains.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {scanResult.subdomains.map((sub) => (
                <div
                  key={sub.subdomain}
                  className="flex items-center justify-between p-2 bg-surface-2 rounded text-xs"
                >
                  <span className="text-slate-300 font-mono">{sub.subdomain}</span>
                  <span className={`w-2 h-2 rounded-full ${sub.is_active ? "bg-green-400" : "bg-red-400"}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DNS History */}
        {scanResult.passive_dns && (
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-4">DNS History</h3>
            <div className="space-y-2">
              {scanResult.passive_dns.records.slice(0, 50).map((record, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-surface-2 rounded text-xs">
                  <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded font-mono">
                    {record.rrtype}
                  </span>
                  <span className="text-slate-300 font-mono flex-1 truncate">{record.rdata as string}</span>
                  <span className="text-slate-500">
                    {new Date(record.first_seen).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
            {scanResult.passive_dns.records.length > 50 && (
              <div className="text-center mt-2 text-xs text-slate-500">
                +{scanResult.passive_dns.records.length - 50} more records
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCerts = () => {
    if (!scanResult?.ct_logs) {
      return (
        <div className="text-center py-12 text-slate-500">
          <Lock className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Run a domain scan to query Certificate Transparency logs</p>
        </div>
      );
    }

    return (
      <div className="bg-surface-1 border border-border rounded-lg">
        <h3 className="text-sm font-medium text-white p-4 border-b border-border">
          Certificate Transparency Logs ({scanResult.ct_logs.length})
        </h3>
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {scanResult.ct_logs.map((cert) => (
            <div key={cert.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock className={`w-4 h-4 ${new Date(cert.not_after) > new Date() ? "text-green-400" : "text-red-400"}`} />
                  <span className="text-sm text-white font-mono">{cert.common_name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  new Date(cert.not_after) > new Date() 
                    ? "bg-green-500/10 text-green-400" 
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {new Date(cert.not_after) > new Date() ? "Valid" : "Expired"}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-400">
                <div>Issuer: {cert.issuer_name}</div>
                <div>Valid: {new Date(cert.not_before).toLocaleDateString()} - {new Date(cert.not_after).toLocaleDateString()}</div>
                <div>Serial: <span className="font-mono">{cert.serial_number}</span></div>
                {cert.name_value && cert.name_value !== cert.common_name && (
                  <div className="text-slate-500">SANs: {cert.name_value.split("\n").slice(0, 5).join(", ")}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-1">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-cyan-400" />
            Network Intelligence Pro
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Shodan, Censys, Passive DNS, CT Logs & Reputation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApiModal(true)}
            className="px-3 py-1.5 bg-surface-2 text-slate-400 rounded-lg text-sm hover:text-white transition-colors"
          >
            API Keys
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-border bg-surface-1">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              placeholder="Enter IP, domain, ASN (AS12345), or CIDR (192.168.0.0/24)"
              className="w-full pl-10 pr-4 py-2.5 bg-surface-0 border border-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-surface-2 text-slate-500 rounded text-[10px] uppercase">
              {targetType}
            </span>
          </div>
          
          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value as typeof depth)}
            className="px-3 py-2.5 bg-surface-0 border border-border rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="quick">Quick</option>
            <option value="standard">Standard</option>
            <option value="deep">Deep</option>
          </select>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isScanning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Scan className="w-4 h-4" />
            )}
            Scan
          </button>
        </div>

        {/* Scan Types */}
        <div className="flex gap-2 mt-3">
          {[
            { id: "shodan", label: "Shodan", color: "cyan" },
            { id: "censys", label: "Censys", color: "purple" },
            { id: "passive_dns", label: "Passive DNS", color: "green" },
            { id: "ct_logs", label: "CT Logs", color: "yellow" },
            { id: "reputation", label: "Reputation", color: "red" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => {
                const newTypes = scanTypes.includes(type.id)
                  ? scanTypes.filter((t) => t !== type.id)
                  : [...scanTypes, type.id];
                setScanTypes(newTypes);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                scanTypes.includes(type.id)
                  ? `bg-${type.color}-500/10 text-${type.color}-400 border border-${type.color}-500/30`
                  : "text-slate-500 hover:text-slate-300 hover:bg-surface-2"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      {scanResult && (
        <div className="flex border-b border-border bg-surface-1">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "services", label: "Services", icon: Server },
            { id: "dns", label: "DNS & Subdomains", icon: Network },
            { id: "certs", label: "Certificates", icon: Lock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!scanResult ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Globe className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Enter a target and click Scan to begin</p>
            <p className="text-sm mt-2">Supports IPs, domains, ASNs, and CIDR ranges</p>
          </div>
        ) : (
          <>
            {activeTab === "overview" && renderOverview()}
            {activeTab === "services" && renderServices()}
            {activeTab === "dns" && renderDNS()}
            {activeTab === "certs" && renderCerts()}
          </>
        )}
      </div>

      {/* API Keys Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-[500px] bg-surface-1 border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Network Intelligence API Keys</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Shodan API Key</label>
                <input
                  type="password"
                  value={apiKeys.shodan}
                  onChange={(e) => setApiKeys({ ...apiKeys, shodan: e.target.value })}
                  placeholder="SHODAN_API_KEY"
                  className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Censys API ID</label>
                  <input
                    type="password"
                    value={apiKeys.censys_id}
                    onChange={(e) => setApiKeys({ ...apiKeys, censys_id: e.target.value })}
                    placeholder="CENSYS_ID"
                    className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Censys Secret</label>
                  <input
                    type="password"
                    value={apiKeys.censys_secret}
                    onChange={(e) => setApiKeys({ ...apiKeys, censys_secret: e.target.value })}
                    placeholder="CENSYS_SECRET"
                    className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">AbuseIPDB API Key</label>
                <input
                  type="password"
                  value={apiKeys.abuseipdb}
                  onChange={(e) => setApiKeys({ ...apiKeys, abuseipdb: e.target.value })}
                  placeholder="ABUSEIPDB_KEY"
                  className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">CIRCL Username</label>
                  <input
                    type="text"
                    value={apiKeys.circl_user}
                    onChange={(e) => setApiKeys({ ...apiKeys, circl_user: e.target.value })}
                    placeholder="CIRCL_USER"
                    className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">CIRCL Password</label>
                  <input
                    type="password"
                    value={apiKeys.circl_pass}
                    onChange={(e) => setApiKeys({ ...apiKeys, circl_pass: e.target.value })}
                    placeholder="CIRCL_PASS"
                    className="w-full mt-1 px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowApiModal(false);
                  toast.success("API keys saved");
                }}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded text-sm hover:bg-cyan-500/30"
              >
                Save Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
