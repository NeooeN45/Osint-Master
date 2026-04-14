import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelId = 
  | "sidebar" 
  | "navigator" 
  | "main" 
  | "inspector" 
  | "timeline" 
  | "console"
  | "history"
  | "clips";

export interface PanelConfig {
  id: PanelId;
  visible: boolean;
  size: number; // percentage or pixels
  minSize: number;
  maxSize: number;
  collapsed: boolean;
}

export interface LayoutConfig {
  panels: Record<PanelId, PanelConfig>;
  activeView: string;
  sidebarWidth: number;
  showActivityBar: boolean;
  showStatusBar: boolean;
  theme: "dark" | "darker" | "midnight";
  accentColor: "cyan" | "blue" | "purple" | "green";
}

const defaultPanels: Record<PanelId, PanelConfig> = {
  sidebar: {
    id: "sidebar",
    visible: true,
    size: 250,
    minSize: 200,
    maxSize: 400,
    collapsed: false,
  },
  navigator: {
    id: "navigator",
    visible: true,
    size: 20, // percentage of remaining space
    minSize: 15,
    maxSize: 40,
    collapsed: false,
  },
  main: {
    id: "main",
    visible: true,
    size: 50,
    minSize: 30,
    maxSize: 70,
    collapsed: false,
  },
  inspector: {
    id: "inspector",
    visible: true,
    size: 30,
    minSize: 20,
    maxSize: 50,
    collapsed: false,
  },
  timeline: {
    id: "timeline",
    visible: false,
    size: 200,
    minSize: 150,
    maxSize: 400,
    collapsed: false,
  },
  console: {
    id: "console",
    visible: false,
    size: 150,
    minSize: 100,
    maxSize: 300,
    collapsed: false,
  },
  history: {
    id: "history",
    visible: true,
    size: 25,
    minSize: 15,
    maxSize: 35,
    collapsed: false,
  },
  clips: {
    id: "clips",
    visible: false,
    size: 25,
    minSize: 15,
    maxSize: 35,
    collapsed: false,
  },
};

interface LayoutState extends LayoutConfig {
  // Actions
  togglePanel: (id: PanelId) => void;
  setPanelSize: (id: PanelId, size: number) => void;
  setPanelCollapsed: (id: PanelId, collapsed: boolean) => void;
  setActiveView: (view: string) => void;
  setSidebarWidth: (width: number) => void;
  setTheme: (theme: LayoutConfig["theme"]) => void;
  setAccentColor: (color: LayoutConfig["accentColor"]) => void;
  toggleActivityBar: () => void;
  toggleStatusBar: () => void;
  resetLayout: () => void;
  // Workspace presets
  applyPreset: (preset: "investigation" | "analysis" | "documentation" | "minimal") => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      panels: defaultPanels,
      activeView: "dashboard",
      sidebarWidth: 250,
      showActivityBar: true,
      showStatusBar: true,
      theme: "dark",
      accentColor: "cyan",

      togglePanel: (id) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [id]: {
              ...state.panels[id],
              visible: !state.panels[id].visible,
            },
          },
        })),

      setPanelSize: (id, size) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [id]: {
              ...state.panels[id],
              size: Math.max(
                state.panels[id].minSize,
                Math.min(state.panels[id].maxSize, size)
              ),
            },
          },
        })),

      setPanelCollapsed: (id, collapsed) =>
        set((state) => ({
          panels: {
            ...state.panels,
            [id]: {
              ...state.panels[id],
              collapsed,
            },
          },
        })),

      setActiveView: (view) => set({ activeView: view }),
      
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      
      setTheme: (theme) => set({ theme }),
      
      setAccentColor: (accentColor) => set({ accentColor }),

      toggleActivityBar: () =>
        set((state) => ({ showActivityBar: !state.showActivityBar })),

      toggleStatusBar: () =>
        set((state) => ({ showStatusBar: !state.showStatusBar })),

      resetLayout: () =>
        set({
          panels: defaultPanels,
          sidebarWidth: 250,
          showActivityBar: true,
          showStatusBar: true,
        }),

      applyPreset: (preset) => {
        const presets: Record<string, Partial<LayoutConfig>> = {
          investigation: {
            panels: {
              ...defaultPanels,
              sidebar: { ...defaultPanels.sidebar, visible: true },
              navigator: { ...defaultPanels.navigator, visible: true },
              main: { ...defaultPanels.main, visible: true },
              inspector: { ...defaultPanels.inspector, visible: true },
              timeline: { ...defaultPanels.timeline, visible: true },
              console: { ...defaultPanels.console, visible: true },
              history: { ...defaultPanels.history, visible: true },
              clips: { ...defaultPanels.clips, visible: true },
            },
          },
          analysis: {
            panels: {
              ...defaultPanels,
              sidebar: { ...defaultPanels.sidebar, visible: true },
              navigator: { ...defaultPanels.navigator, visible: true },
              main: { ...defaultPanels.main, visible: true, size: 60 },
              inspector: { ...defaultPanels.inspector, visible: true, size: 40 },
              timeline: { ...defaultPanels.timeline, visible: false },
              console: { ...defaultPanels.console, visible: false },
              history: { ...defaultPanels.history, visible: false },
              clips: { ...defaultPanels.clips, visible: false },
            },
          },
          documentation: {
            panels: {
              ...defaultPanels,
              sidebar: { ...defaultPanels.sidebar, visible: true },
              navigator: { ...defaultPanels.navigator, visible: false },
              main: { ...defaultPanels.main, visible: true, size: 70 },
              inspector: { ...defaultPanels.inspector, visible: true, size: 30 },
              timeline: { ...defaultPanels.timeline, visible: false },
              console: { ...defaultPanels.console, visible: false },
              history: { ...defaultPanels.history, visible: false },
              clips: { ...defaultPanels.clips, visible: true, size: 30 },
            },
          },
          minimal: {
            panels: {
              ...defaultPanels,
              sidebar: { ...defaultPanels.sidebar, visible: false },
              navigator: { ...defaultPanels.navigator, visible: false },
              main: { ...defaultPanels.main, visible: true, size: 100 },
              inspector: { ...defaultPanels.inspector, visible: false },
              timeline: { ...defaultPanels.timeline, visible: false },
              console: { ...defaultPanels.console, visible: false },
              history: { ...defaultPanels.history, visible: false },
              clips: { ...defaultPanels.clips, visible: false },
            },
          },
        };

        set(presets[preset] as Partial<LayoutState>);
      },
    }),
    {
      name: "osint-layout-storage",
      partialize: (state) => ({
        panels: state.panels,
        sidebarWidth: state.sidebarWidth,
        showActivityBar: state.showActivityBar,
        showStatusBar: state.showStatusBar,
        theme: state.theme,
        accentColor: state.accentColor,
      }),
    }
  )
);

// Selectors
export const selectVisiblePanels = (state: LayoutState) =>
  Object.values(state.panels).filter((p) => p.visible);

export const selectPanelById = (id: PanelId) => (state: LayoutState) =>
  state.panels[id];
