// useKeyboardShortcuts — hook de raccourcis clavier global
// Gère Cmd+K, Esc, / (focus search), G+x (tab nav), 1-7 (quick tabs)

import { useEffect, useRef } from "react";
import { MainTab } from "../constants";

interface Shortcuts {
  onOpenPalette?: () => void;
  onEscape?: () => void;
  onFocusSearch?: () => void;
  onSwitchTab?: (tab: MainTab) => void;
  onStart?: () => void;
  onStop?: () => void;
  onExport?: () => void;
  onToggleChat?: () => void;
  onToggleDebug?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(s: Shortcuts) {
  const gPressedRef = useRef<number>(0);

  useEffect(() => {
    if (s.enabled === false) return;

    const handler = (e: KeyboardEvent) => {
      // Ignore si on tape dans un input (sauf certains shortcuts)
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Escape — toujours
      if (e.key === "Escape") {
        s.onEscape?.();
        return;
      }

      // Cmd+K / Ctrl+K — palette (même dans input)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.onOpenPalette?.();
        return;
      }

      // Cmd+E — export
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e" && !inInput) {
        e.preventDefault();
        s.onExport?.();
        return;
      }

      // Cmd+\ — toggle debug
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        s.onToggleDebug?.();
        return;
      }

      // Cmd+/ — toggle chat
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        s.onToggleChat?.();
        return;
      }

      if (inInput) return;

      // / — focus search
      if (e.key === "/") {
        e.preventDefault();
        s.onFocusSearch?.();
        return;
      }

      // G+x for tab navigation
      const now = Date.now();
      if (e.key.toLowerCase() === "g") {
        gPressedRef.current = now;
        return;
      }
      if (now - gPressedRef.current < 1000) {
        const tabMap: Record<string, MainTab> = {
          e: "entities",
          g: "graph",
          d: "dashboard",
          t: "timeline",
          p: "persons",
          i: "gallery",
          m: "map",
        };
        const tab = tabMap[e.key.toLowerCase()];
        if (tab) {
          e.preventDefault();
          s.onSwitchTab?.(tab);
          gPressedRef.current = 0;
          return;
        }
      }

      // Number keys 1-7 for quick tab switch
      const tabs: MainTab[] = ["entities", "graph", "dashboard", "timeline", "persons", "gallery", "map"];
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < tabs.length) {
        e.preventDefault();
        s.onSwitchTab?.(tabs[idx]);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [s]);
}
