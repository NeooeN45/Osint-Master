import { useState, useEffect, useCallback } from "react";
import { 
  Bell, 
  Shield, 
  Activity,
  Plus,
  Play,
  Pause,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  AlertOctagon,
  Info,
  BarChart3,
  Target,
  Globe,
  Instagram,
  Mail,
  Server,
  Zap,
  X
} from "lucide-react";
import { toast } from "sonner";
import { PanelSection } from "../components/ProLayout";
import { useMonitorStore } from "../store/useMonitorStore";
import type { Monitor, Alert, AlertCondition, MonitoringPreset } from "../types/monitoring";
import { MONITORING_PRESETS, ALERT_TEMPLATES } from "../types/monitoring";

export default function MonitoringView() {
  const [activeTab, setActiveTab] = useState<"monitors" | "alerts" | "stats" | "logs">("monitors");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MonitoringPreset | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Alert["severity"] | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Alert["status"] | "all">("all");

  const {
    monitors,
    alerts,
    logs,
    isMonitoring,
    addMonitor,
    updateMonitor,
    deleteMonitor,
    toggleMonitor,
    acknowledgeAlert,
    resolveAlert,
    deleteAlert,
    simulateCheck,
    startMonitoring,
    stopMonitoring,
    getMonitoringStats,
    getNewAlerts,
  } = useMonitorStore();

  const stats = getMonitoringStats();
  const newAlerts = getNewAlerts();

  // Auto-check active monitors (simulation)
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const activeMonitors = monitors.filter((m) => m.status === "active");
      activeMonitors.forEach((monitor) => {
        // Check if it's time for next check
        if (!monitor.next_check || new Date() >= new Date(monitor.next_check)) {
          simulateCheck(monitor.id);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isMonitoring, monitors, simulateCheck]);

  const handleCreateMonitor = (preset: MonitoringPreset, target: string, name: string) => {
    const monitor = addMonitor({
      name: name || `${preset.name} - ${target}`,
      description: preset.description,
      target,
      target_type: preset.target_types[0],
      sources: preset.sources,
      status: "active",
      check_interval: preset.check_interval,
      alert_conditions: preset.alert_conditions.map((c) => ({
        id: `cond-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: c.type!,
        severity: c.severity!,
        enabled: c.enabled ?? true,
        threshold: c.threshold,
        cooldown_minutes: c.cooldown_minutes ?? 60,
      })),
      notify_channels: [{ id: "in-app", type: "in_app", name: "In-App", config: {}, enabled: true }],
      tags: [preset.id],
    });

    toast.success(`Monitor "${monitor.name}" created and started`);
    setShowCreateModal(false);
    setSelectedPreset(null);
  };

  const handleManualCheck = async (monitorId: string) => {
    toast.promise(
      simulateCheck(monitorId),
      {
        loading: "Running check...",
        success: "Check completed",
        error: "Check failed",
      }
    );
  };

  const renderMonitorsList = () => {
    const filtered = monitors.filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.target.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No monitors yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 text-accent-cyan hover:underline text-sm"
            >
              Create your first monitor
            </button>
          </div>
        ) : (
          filtered.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              alertCount={alerts.filter((a) => a.monitor_id === monitor.id && a.status === "new").length}
              onToggle={() => toggleMonitor(monitor.id)}
              onDelete={() => {
                if (confirm(`Delete monitor "${monitor.name}"?`)) {
                  deleteMonitor(monitor.id);
                  toast.success("Monitor deleted");
                }
              }}
              onCheck={() => handleManualCheck(monitor.id)}
            />
          ))
        )}
      </div>
    );
  };

  const renderAlertsList = () => {
    let filtered = alerts;

    if (severityFilter !== "all") {
      filtered = filtered.filter((a) => a.severity === severityFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return (
      <div className="space-y-3">
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
            className="px-3 py-1.5 bg-surface-2 border border-border rounded text-sm text-white"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-1.5 bg-surface-2 border border-border rounded text-sm text-white"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>

          {alerts.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear all alerts?")) {
                  useMonitorStore.getState().clearAllAlerts();
                  toast.success("All alerts cleared");
                }
              }}
              className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm ml-auto"
            >
              Clear All
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No alerts</p>
          </div>
        ) : (
          filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onClick={() => setSelectedAlert(alert)}
              onAcknowledge={() => {
                acknowledgeAlert(alert.id);
                toast.success("Alert acknowledged");
              }}
              onResolve={() => {
                resolveAlert(alert.id);
                toast.success("Alert resolved");
              }}
            />
          ))
        )}
      </div>
    );
  };

  const renderStats = () => {
    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={Target}
            label="Active Monitors"
            value={stats.active_monitors}
            color="cyan"
          />
          <StatCard
            icon={Bell}
            label="New Alerts"
            value={stats.new_alerts}
            color="red"
          />
          <StatCard
            icon={Activity}
            label="Checks Today"
            value={stats.checks_today}
            color="green"
          />
          <StatCard
            icon={Shield}
            label="Uptime"
            value={`${stats.uptime_percentage}%`}
            color="purple"
          />
        </div>

        {/* Alerts by Severity */}
        <div className="bg-surface-1 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-4">Alerts by Severity</h3>
          <div className="space-y-2">
            {Object.entries(stats.alerts_by_severity).map(([severity, count]) => (
              <div key={severity} className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    severity === "critical"
                      ? "bg-red-500"
                      : severity === "high"
                      ? "bg-orange-500"
                      : severity === "medium"
                      ? "bg-yellow-500"
                      : severity === "low"
                      ? "bg-green-500"
                      : "bg-slate-500"
                  }`}
                />
                <span className="w-20 text-sm text-slate-400 capitalize">{severity}</span>
                <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      severity === "critical"
                        ? "bg-red-500"
                        : severity === "high"
                        ? "bg-orange-500"
                        : severity === "medium"
                        ? "bg-yellow-500"
                        : severity === "low"
                        ? "bg-green-500"
                        : "bg-slate-500"
                    }`}
                    style={{
                      width: `${stats.total_alerts > 0 ? (count / stats.total_alerts) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-10 text-sm text-white text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monitor Status */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">{stats.active_monitors}</div>
            <div className="text-sm text-slate-500">Active</div>
          </div>
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{stats.paused_monitors}</div>
            <div className="text-sm text-slate-500">Paused</div>
          </div>
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{stats.error_monitors}</div>
            <div className="text-sm text-slate-500">Error</div>
          </div>
        </div>
      </div>
    );
  };

  const renderLogs = () => {
    const recentLogs = logs.slice(0, 100);

    return (
      <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Recent Check Logs</h3>
          <span className="text-xs text-slate-500">Last 100 entries</span>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No logs yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Monitor</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Message</th>
                  <th className="px-3 py-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLogs.map((log) => {
                  const monitor = monitors.find((m) => m.id === log.monitor_id);
                  return (
                    <tr key={log.id} className="hover:bg-surface-2/50">
                      <td className="px-3 py-2 text-slate-400 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2 text-white">
                        {monitor?.name || "Unknown"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            log.status === "success"
                              ? "bg-green-500/10 text-green-400"
                              : log.status === "error"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400">{log.message}</td>
                      <td className="px-3 py-2 text-right text-slate-400 text-xs">
                        {log.duration_ms}ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
            <Bell className="w-6 h-6 text-accent-cyan" />
            Monitoring & Alerts
            {newAlerts.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-sm">
                {newAlerts.length} new
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated surveillance and alerting system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              isMonitoring
                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
            }`}
          >
            {isMonitoring ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Monitoring
              </>
            )}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 rounded-lg text-sm hover:bg-accent-cyan/20 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Monitor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface-1">
        {[
          { id: "monitors", label: "Monitors", icon: Target, count: monitors.length },
          { id: "alerts", label: "Alerts", icon: Bell, count: newAlerts.length },
          { id: "stats", label: "Statistics", icon: BarChart3 },
          { id: "logs", label: "Logs", icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-6 py-3 text-sm transition-colors ${
              activeTab === tab.id
                ? "text-accent-cyan border-b-2 border-accent-cyan"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 bg-surface-2 text-slate-400 rounded text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-border bg-surface-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-2 bg-surface-0 border border-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "monitors" && renderMonitorsList()}
        {activeTab === "alerts" && renderAlertsList()}
        {activeTab === "stats" && renderStats()}
        {activeTab === "logs" && renderLogs()}
      </div>

      {/* Create Monitor Modal */}
      {showCreateModal && (
        <CreateMonitorModal
          onClose={() => {
            setShowCreateModal(false);
            setSelectedPreset(null);
          }}
          onCreate={handleCreateMonitor}
          selectedPreset={selectedPreset}
          onSelectPreset={setSelectedPreset}
        />
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={() => {
            acknowledgeAlert(selectedAlert.id);
            setSelectedAlert({ ...selectedAlert, status: "acknowledged" });
            toast.success("Alert acknowledged");
          }}
          onResolve={() => {
            resolveAlert(selectedAlert.id);
            setSelectedAlert(null);
            toast.success("Alert resolved");
          }}
        />
      )}
    </div>
  );
}

// Sub-components

function MonitorCard({
  monitor,
  alertCount,
  onToggle,
  onDelete,
  onCheck,
}: {
  monitor: Monitor;
  alertCount: number;
  onToggle: () => void;
  onDelete: () => void;
  onCheck: () => void;
}) {
  const getStatusIcon = () => {
    switch (monitor.status) {
      case "active":
        return <Activity className="w-4 h-4 text-green-400" />;
      case "paused":
        return <Pause className="w-4 h-4 text-yellow-400" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTargetIcon = () => {
    switch (monitor.target_type) {
      case "darkweb_keyword":
      case "darkweb_paste":
        return <Shield className="w-4 h-4" />;
      case "social_username":
      case "social_profile":
        return <Instagram className="w-4 h-4" />;
      case "network_ip":
      case "network_domain":
        return <Globe className="w-4 h-4" />;
      case "breach_email":
        return <Mail className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 bg-surface-1 border border-border rounded-lg hover:border-accent-cyan/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-surface-2 rounded-lg text-accent-cyan">
            {getTargetIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">{monitor.name}</h4>
              {alertCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px]">
                  {alertCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="font-mono">{monitor.target}</span>
              <span>•</span>
              <span>Every {monitor.check_interval}min</span>
              <span>•</span>
              <span>{monitor.check_count} checks</span>
            </div>
            {monitor.last_check && (
              <div className="text-xs text-slate-500 mt-1">
                Last check: {new Date(monitor.last_check).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onCheck}
            className="p-2 hover:bg-surface-2 rounded-lg text-slate-400 hover:text-accent-cyan"
            title="Run check now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className={`p-2 hover:bg-surface-2 rounded-lg ${
              monitor.status === "active" ? "text-green-400" : "text-yellow-400"
            }`}
            title={monitor.status === "active" ? "Pause" : "Resume"}
          >
            {monitor.status === "active" ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-surface-2 rounded-lg text-slate-400 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {getStatusIcon()}
        <span
          className={`text-xs capitalize ${
            monitor.status === "active"
              ? "text-green-400"
              : monitor.status === "error"
              ? "text-red-400"
              : "text-yellow-400"
          }`}
        >
          {monitor.status}
        </span>
        <div className="flex-1" />
        <div className="flex gap-1">
          {monitor.alert_conditions.slice(0, 3).map((cond) => (
            <span
              key={cond.id}
              className={`px-1.5 py-0.5 rounded text-[9px] ${
                cond.enabled
                  ? cond.severity === "critical"
                    ? "bg-red-500/10 text-red-400"
                    : cond.severity === "high"
                    ? "bg-orange-500/10 text-orange-400"
                    : "bg-yellow-500/10 text-yellow-400"
                  : "bg-surface-2 text-slate-500"
              }`}
            >
              {cond.type.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  onClick,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert;
  onClick: () => void;
  onAcknowledge: () => void;
  onResolve: () => void;
}) {
  const getSeverityIcon = () => {
    switch (alert.severity) {
      case "critical":
        return <AlertOctagon className="w-5 h-5 text-red-400" />;
      case "high":
        return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case "medium":
        return <Info className="w-5 h-5 text-yellow-400" />;
      default:
        return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        alert.status === "new"
          ? "bg-accent-cyan/5 border-accent-cyan/30"
          : "bg-surface-1 border-border hover:border-accent-cyan/20"
      }`}
    >
      <div className="flex items-start gap-3">
        {getSeverityIcon()}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">{alert.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{alert.description}</p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] ${
                alert.severity === "critical"
                  ? "bg-red-500/10 text-red-400"
                  : alert.severity === "high"
                  ? "bg-orange-500/10 text-orange-400"
                  : alert.severity === "medium"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-slate-500/10 text-slate-400"
              }`}
            >
              {alert.severity}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>{alert.monitor_name}</span>
            <span>•</span>
            <span>{new Date(alert.timestamp).toLocaleString()}</span>
          </div>

          {alert.status === "new" && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge();
                }}
                className="px-3 py-1 bg-surface-2 text-slate-300 rounded text-xs hover:bg-surface-3"
              >
                Acknowledge
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve();
                }}
                className="px-3 py-1 bg-green-500/10 text-green-400 rounded text-xs hover:bg-green-500/20"
              >
                Resolve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    cyan: "text-cyan-400 bg-cyan-400/10",
    red: "text-red-400 bg-red-400/10",
    green: "text-green-400 bg-green-400/10",
    purple: "text-purple-400 bg-purple-400/10",
  };

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4">
      <div className={`p-2 rounded-lg w-fit ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function CreateMonitorModal({
  onClose,
  onCreate,
  selectedPreset,
  onSelectPreset,
}: {
  onClose: () => void;
  onCreate: (preset: MonitoringPreset, target: string, name: string) => void;
  selectedPreset: MonitoringPreset | null;
  onSelectPreset: (preset: MonitoringPreset | null) => void;
}) {
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");

  if (!selectedPreset) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="w-[600px] bg-surface-1 border border-border rounded-lg p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">Create New Monitor</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-4">Select a monitoring preset:</p>

          <div className="grid grid-cols-2 gap-3">
            {MONITORING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className="p-4 bg-surface-2 border border-border rounded-lg hover:border-accent-cyan/30 text-left transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  {preset.id.includes("darkweb") && <Shield className="w-5 h-5 text-purple-400" />}
                  {preset.id.includes("social") && <Instagram className="w-5 h-5 text-pink-400" />}
                  {preset.id.includes("network") && <Globe className="w-5 h-5 text-cyan-400" />}
                  {preset.id.includes("breach") && <AlertTriangle className="w-5 h-5 text-red-400" />}
                  {preset.id.includes("brand") && <Zap className="w-5 h-5 text-yellow-400" />}
                  {preset.id.includes("threat") && <Target className="w-5 h-5 text-orange-400" />}
                  <span className="font-medium text-white">{preset.name}</span>
                </div>
                <p className="text-xs text-slate-400">{preset.description}</p>
                <div className="flex gap-1 mt-2">
                  {preset.target_types.slice(0, 2).map((t) => (
                    <span key={t} className="px-1.5 py-0.5 bg-surface-1 text-slate-500 rounded text-[9px]">
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-[500px] bg-surface-1 border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white">{selectedPreset.name}</h3>
          <button onClick={() => onSelectPreset(null)} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase mb-1 block">Target</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={`Enter ${selectedPreset.target_types[0].replace(/_/g, " ")}...`}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase mb-1 block">Monitor Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedPreset.name + " - " + target}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
            />
          </div>

          <div className="p-3 bg-surface-2 rounded-lg">
            <div className="text-xs text-slate-500 uppercase mb-2">Alert Conditions</div>
            <div className="space-y-1">
              {selectedPreset.alert_conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cond.severity === "critical"
                        ? "bg-red-400"
                        : cond.severity === "high"
                        ? "bg-orange-400"
                        : cond.severity === "medium"
                        ? "bg-yellow-400"
                        : "bg-green-400"
                    }`}
                  />
                  <span className="text-slate-300">{cond.type?.replace(/_/g, " ")}</span>
                  <span className="text-slate-500">({cond.severity})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 text-xs text-slate-400">
            <span>Interval: {selectedPreset.check_interval}min</span>
            <span>•</span>
            <span>Sources: {selectedPreset.sources.length}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => onSelectPreset(null)}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm"
          >
            Back
          </button>
          <button
            onClick={() => onCreate(selectedPreset, target, name)}
            disabled={!target.trim()}
            className="px-4 py-2 bg-accent-cyan/10 text-accent-cyan rounded text-sm hover:bg-accent-cyan/20 disabled:opacity-50"
          >
            Create Monitor
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertDetailModal({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert;
  onClose: () => void;
  onAcknowledge: () => void;
  onResolve: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-[600px] bg-surface-1 border border-border rounded-lg p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {alert.severity === "critical" ? (
              <AlertOctagon className="w-6 h-6 text-red-400" />
            ) : alert.severity === "high" ? (
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            ) : (
              <Info className="w-6 h-6 text-yellow-400" />
            )}
            <div>
              <h3 className="text-lg font-medium text-white">{alert.title}</h3>
              <p className="text-sm text-slate-400">{alert.monitor_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                alert.severity === "critical"
                  ? "bg-red-500/10 text-red-400"
                  : alert.severity === "high"
                  ? "bg-orange-500/10 text-orange-400"
                  : alert.severity === "medium"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-slate-500/10 text-slate-400"
              }`}
            >
              {alert.severity.toUpperCase()}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                alert.status === "new"
                  ? "bg-accent-cyan/10 text-accent-cyan"
                  : alert.status === "acknowledged"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : alert.status === "resolved"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-slate-500/10 text-slate-400"
              }`}
            >
              {alert.status.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(alert.timestamp).toLocaleString()}
            </span>
          </div>

          <p className="text-sm text-slate-300">{alert.description}</p>

          {alert.details && (
            <div className="p-3 bg-surface-2 rounded-lg">
              <h4 className="text-xs text-slate-500 uppercase mb-2">Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target:</span>
                  <span className="text-white font-mono">{alert.details.target}</span>
                </div>
                {alert.details.previous_value && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Previous:</span>
                    <span className="text-slate-300">{alert.details.previous_value}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Current:</span>
                  <span className="text-accent-cyan">{alert.details.current_value}</span>
                </div>
                {alert.details.confidence && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Confidence:</span>
                    <span className="text-white">{alert.details.confidence}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {alert.source_data && (
            <div className="p-3 bg-surface-2 rounded-lg">
              <h4 className="text-xs text-slate-500 uppercase mb-2">Source Data</h4>
              <pre className="text-xs text-slate-400 font-mono overflow-x-auto">
                {JSON.stringify(alert.source_data, null, 2)}
              </pre>
            </div>
          )}

          {alert.details?.evidence && alert.details.evidence.length > 0 && (
            <div className="p-3 bg-surface-2 rounded-lg">
              <h4 className="text-xs text-slate-500 uppercase mb-2">Evidence</h4>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                {alert.details.evidence.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {alert.details?.recommendations && alert.details.recommendations.length > 0 && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h4 className="text-xs text-green-400 uppercase mb-2">Recommendations</h4>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                {alert.details.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          {alert.status === "new" && (
            <button
              onClick={onAcknowledge}
              className="px-4 py-2 bg-surface-2 text-slate-300 rounded text-sm hover:bg-surface-3"
            >
              Acknowledge
            </button>
          )}
          {alert.status !== "resolved" && (
            <button
              onClick={onResolve}
              className="px-4 py-2 bg-green-500/10 text-green-400 rounded text-sm hover:bg-green-500/20"
            >
              Resolve
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent-cyan/10 text-accent-cyan rounded text-sm hover:bg-accent-cyan/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
