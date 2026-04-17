// useBackendHealth — hook qui surveille la connexion backend
// Ping /health toutes les X secondes, track latence, reconnexion

import { useEffect, useState } from "react";
import { HealthStatus, onHealth, startHealthMonitor, pingHealth } from "./apiClient";
import { toast } from "sonner";

export function useBackendHealth(intervalMs = 10000) {
  const [status, setStatus] = useState<HealthStatus>({
    ok: false,
    latencyMs: null,
    uptime: null,
    lastCheck: 0,
    consecutiveFailures: 0,
  });
  const [history, setHistory] = useState<Array<{ ts: number; ok: boolean; latency: number | null }>>([]);

  useEffect(() => {
    let previousOk: boolean | null = null;
    const stopHealth = startHealthMonitor(intervalMs);

    const unsubscribe = onHealth(s => {
      setStatus(s);
      setHistory(h => [...h.slice(-59), { ts: s.lastCheck, ok: s.ok, latency: s.latencyMs }]);

      // Notif sur transitions d'état
      if (previousOk !== null && previousOk !== s.ok) {
        if (s.ok) toast.success("Backend reconnecté", { description: `Latence: ${s.latencyMs}ms`, duration: 2500 });
        else toast.error("Backend hors ligne", { description: "Tentative de reconnexion...", duration: 3500 });
      }
      previousOk = s.ok;
    });

    return () => {
      stopHealth();
      unsubscribe();
    };
  }, [intervalMs]);

  return { status, history, refresh: pingHealth };
}
