import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Monitor, Alert, MonitorLog, AlertCondition, NotificationChannel, MonitoringStats } from "../types/monitoring";
import { ALERT_TEMPLATES } from "../types/monitoring";

interface MonitorState {
  monitors: Monitor[];
  alerts: Alert[];
  logs: MonitorLog[];
  isMonitoring: boolean;
  
  // Actions
  addMonitor: (monitor: Omit<Monitor, "id" | "created_at" | "updated_at" | "check_count" | "alert_count">) => Monitor;
  updateMonitor: (id: string, updates: Partial<Monitor>) => void;
  deleteMonitor: (id: string) => void;
  toggleMonitor: (id: string) => void;
  
  addAlert: (alert: Omit<Alert, "id" | "timestamp">) => Alert;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  acknowledgeAlert: (id: string, user?: string) => void;
  resolveAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  clearAllAlerts: () => void;
  
  addLog: (log: Omit<MonitorLog, "id" | "timestamp">) => void;
  clearOldLogs: (days: number) => void;
  
  getMonitorById: (id: string) => Monitor | undefined;
  getAlertsByMonitor: (monitorId: string) => Alert[];
  getNewAlerts: () => Alert[];
  getAlertsBySeverity: (severity: Alert["severity"]) => Alert[];
  getMonitoringStats: () => MonitoringStats;
  
  simulateCheck: (monitorId: string) => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set, get) => ({
      monitors: [],
      alerts: [],
      logs: [],
      isMonitoring: false,

      addMonitor: (monitorData) => {
        const monitor: Monitor = {
          ...monitorData,
          id: `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          check_count: 0,
          alert_count: 0,
        };
        
        set((state) => ({
          monitors: [...state.monitors, monitor],
        }));
        
        return monitor;
      },

      updateMonitor: (id, updates) => {
        set((state) => ({
          monitors: state.monitors.map((m) =>
            m.id === id
              ? { ...m, ...updates, updated_at: new Date().toISOString() }
              : m
          ),
        }));
      },

      deleteMonitor: (id) => {
        set((state) => ({
          monitors: state.monitors.filter((m) => m.id !== id),
          alerts: state.alerts.filter((a) => a.monitor_id !== id),
        }));
      },

      toggleMonitor: (id) => {
        const monitor = get().getMonitorById(id);
        if (monitor) {
          const newStatus = monitor.status === "active" ? "paused" : "active";
          get().updateMonitor(id, { status: newStatus });
        }
      },

      addAlert: (alertData) => {
        const alert: Alert = {
          ...alertData,
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        
        set((state) => ({
          alerts: [alert, ...state.alerts],
        }));
        
        // Update monitor alert count
        const monitor = get().getMonitorById(alert.monitor_id);
        if (monitor) {
          get().updateMonitor(monitor.id, {
            alert_count: monitor.alert_count + 1,
          });
        }
        
        return alert;
      },

      updateAlert: (id, updates) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));
      },

      acknowledgeAlert: (id, user) => {
        get().updateAlert(id, {
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user || "user",
        });
      },

      resolveAlert: (id) => {
        get().updateAlert(id, {
          status: "resolved",
          resolved_at: new Date().toISOString(),
        });
      },

      deleteAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
      },

      clearAllAlerts: () => {
        set({ alerts: [] });
      },

      addLog: (logData) => {
        const log: MonitorLog = {
          ...logData,
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        
        set((state) => ({
          logs: [log, ...state.logs].slice(0, 1000), // Keep last 1000 logs
        }));
      },

      clearOldLogs: (days) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        set((state) => ({
          logs: state.logs.filter((l) => new Date(l.timestamp) > cutoff),
        }));
      },

      getMonitorById: (id) => {
        return get().monitors.find((m) => m.id === id);
      },

      getAlertsByMonitor: (monitorId) => {
        return get().alerts.filter((a) => a.monitor_id === monitorId);
      },

      getNewAlerts: () => {
        return get().alerts.filter((a) => a.status === "new");
      },

      getAlertsBySeverity: (severity) => {
        return get().alerts.filter((a) => a.severity === severity);
      },

      getMonitoringStats: () => {
        const { monitors, alerts, logs } = get();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const alertsBySeverity: Record<Alert["severity"], number> = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        };

        const alertsByStatus: Record<Alert["status"], number> = {
          new: 0,
          acknowledged: 0,
          investigating: 0,
          resolved: 0,
          false_positive: 0,
        };

        alerts.forEach((a) => {
          alertsBySeverity[a.severity]++;
          alertsByStatus[a.status]++;
        });

        const todayLogs = logs.filter((l) => new Date(l.timestamp) >= today);
        const weekLogs = logs.filter((l) => new Date(l.timestamp) >= weekAgo);

        const avgDuration = logs.length > 0
          ? logs.reduce((sum, l) => sum + l.duration_ms, 0) / logs.length
          : 0;

        const successLogs = logs.filter((l) => l.status === "success");
        const uptime = logs.length > 0
          ? (successLogs.length / logs.length) * 100
          : 100;

        return {
          total_monitors: monitors.length,
          active_monitors: monitors.filter((m) => m.status === "active").length,
          paused_monitors: monitors.filter((m) => m.status === "paused").length,
          error_monitors: monitors.filter((m) => m.status === "error").length,
          total_alerts: alerts.length,
          new_alerts: alerts.filter((a) => a.status === "new").length,
          alerts_by_severity: alertsBySeverity,
          alerts_by_status: alertsByStatus,
          checks_today: todayLogs.length,
          checks_this_week: weekLogs.length,
          avg_check_duration: Math.round(avgDuration),
          uptime_percentage: Math.round(uptime * 100) / 100,
        };
      },

      simulateCheck: async (monitorId) => {
        const monitor = get().getMonitorById(monitorId);
        if (!monitor || monitor.status !== "active") return;

        const startTime = Date.now();
        
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));
        
        const duration = Date.now() - startTime;
        
        // Simulate random findings (10% chance)
        const foundSomething = Math.random() < 0.1;
        const hasError = Math.random() < 0.05;
        
        // Add log
        get().addLog({
          monitor_id: monitorId,
          status: hasError ? "error" : "success",
          message: hasError
            ? "Connection timeout while checking target"
            : foundSomething
            ? `Found ${Math.floor(Math.random() * 5) + 1} new items`
            : "No changes detected",
          duration_ms: duration,
          items_checked: Math.floor(Math.random() * 50) + 10,
          items_found: foundSomething ? Math.floor(Math.random() * 3) + 1 : 0,
          error_details: hasError ? "ETIMEDOUT: Connection timeout" : undefined,
        });

        // Update monitor
        get().updateMonitor(monitorId, {
          last_check: new Date().toISOString(),
          next_check: new Date(Date.now() + monitor.check_interval * 60000).toISOString(),
          check_count: monitor.check_count + 1,
          status: hasError ? "error" : "active",
        });

        // Simulate alert generation
        if (foundSomething && monitor.alert_conditions.length > 0) {
          const condition = monitor.alert_conditions[0];
          const template = ALERT_TEMPLATES[condition.type];
          
          get().addAlert({
            monitor_id: monitorId,
            monitor_name: monitor.name,
            alert_type: condition.type,
            severity: condition.severity,
            status: "new",
            title: template.title,
            description: `${template.description} for target "${monitor.target}"`,
            details: {
              target: monitor.target,
              current_value: `New ${condition.type.replace(/_/g, " ")} detected`,
              confidence: Math.floor(Math.random() * 30) + 70,
              evidence: ["Source: " + monitor.sources[0]],
            },
            source_data: {
              monitor_type: monitor.target_type,
              sources_checked: monitor.sources,
            },
            related_entities: [monitor.target],
          });
        }
      },

      startMonitoring: () => {
        set({ isMonitoring: true });
        
        // In a real app, this would set up intervals for each active monitor
        // For simulation, we'll just mark it as started
        console.log("Monitoring started");
      },

      stopMonitoring: () => {
        set({ isMonitoring: false });
        console.log("Monitoring stopped");
      },
    }),
    {
      name: "osint-monitor-store",
      partialize: (state) => ({
        monitors: state.monitors,
        alerts: state.alerts,
        logs: state.logs.slice(0, 100), // Only persist last 100 logs
      }),
    }
  )
);
