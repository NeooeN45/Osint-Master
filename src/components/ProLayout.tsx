import { useState, useRef, useCallback, type ReactNode, useEffect } from "react";
import { useLayoutStore, type PanelId } from "../store/useLayoutStore";
import { 
  PanelLeft, 
  PanelRight, 
  PanelBottom, 
  LayoutGrid,
  Maximize2,
  Minimize2,
  X,
  GripVertical,
  GripHorizontal,
  ChevronRight,
  MoreVertical,
  Command
} from "lucide-react";

interface PanelConfig {
  id: PanelId;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  position: "left" | "right" | "bottom";
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

interface ProLayoutProps {
  sidebar?: ReactNode;
  activityBar?: ReactNode;
  statusBar?: ReactNode;
  panels: PanelConfig[];
  mainContent: ReactNode;
}

// Resizable Panel Hook
function useResizablePanel(
  initialSize: number,
  minSize: number,
  maxSize: number,
  direction: "horizontal" | "vertical"
) {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const stopResize = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const container = containerRef.current.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let newSize: number;

      if (direction === "horizontal") {
        newSize = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newSize = ((e.clientY - rect.top) / rect.height) * 100;
      }

      setSize(Math.max(minSize, Math.min(maxSize, newSize)));
    },
    [isDragging, direction, minSize, maxSize]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResize);
      return () => {
        window.removeEventListener("mousemove", resize);
        window.removeEventListener("mouseup", stopResize);
      };
    }
  }, [isDragging, resize, stopResize]);

  return { size, startResize, isDragging, containerRef };
}

// Panel Header Component
function PanelHeader({ 
  title, 
  icon, 
  actions, 
  onClose, 
  onCollapse,
  collapsed,
  onMaximize 
}: { 
  title: string; 
  icon?: ReactNode; 
  actions?: ReactNode;
  onClose?: () => void;
  onCollapse?: () => void;
  collapsed?: boolean;
  onMaximize?: () => void;
}) {
  return (
    <div className="h-8 flex items-center justify-between px-2 bg-surface-2 border-b border-border select-none">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        {actions}
        {onMaximize && (
          <button
            onClick={onMaximize}
            className="p-1 rounded hover:bg-surface-3 text-slate-500 hover:text-slate-300"
            title="Maximize"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1 rounded hover:bg-surface-3 text-slate-500 hover:text-slate-300"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-3 text-slate-500 hover:text-red-400"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Collapsible Section
export function PanelSection({ 
  title, 
  children, 
  defaultExpanded = true,
  badge
}: { 
  title: string; 
  children: ReactNode; 
  defaultExpanded?: boolean;
  badge?: number;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-2/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-accent-cyan/20 text-accent-cyan rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

// Main Layout Component
export default function ProLayout({
  sidebar,
  activityBar,
  statusBar,
  panels,
  mainContent,
}: ProLayoutProps) {
  const { 
    panels: panelStates, 
    sidebarWidth, 
    showActivityBar, 
    showStatusBar,
    togglePanel,
    setSidebarWidth,
    applyPreset,
  } = useLayoutStore();

  // Sidebar resize
  const sidebarResize = useResizablePanel(20, 10, 40, "horizontal");
  
  // Panel resize states
  const [leftPanelWidth, setLeftPanelWidth] = useState(25);
  const [rightPanelWidth, setRightPanelWidth] = useState(30);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(25);
  
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);

  // Filter visible panels
  const visiblePanels = panels.filter(p => panelStates[p.id]?.visible);
  const leftPanels = visiblePanels.filter(p => p.position === "left");
  const rightPanels = visiblePanels.filter(p => p.position === "right");
  const bottomPanels = visiblePanels.filter(p => p.position === "bottom");

  // Resize handlers
  const handleLeftResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);
  }, []);

  const handleRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
  }, []);

  const handleBottomResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingBottom(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById("pro-layout-container");
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      
      if (isDraggingLeft) {
        const newWidth = ((e.clientX - rect.left - (showActivityBar ? 48 : 0) - sidebarWidth) / rect.width) * 100;
        setLeftPanelWidth(Math.max(15, Math.min(40, newWidth)));
      }
      
      if (isDraggingRight) {
        const newWidth = ((rect.right - e.clientX) / rect.width) * 100;
        setRightPanelWidth(Math.max(20, Math.min(50, newWidth)));
      }
      
      if (isDraggingBottom) {
        const newHeight = ((rect.bottom - e.clientY) / rect.height) * 100;
        setBottomPanelHeight(Math.max(15, Math.min(50, newHeight)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
      setIsDraggingBottom(false);
    };

    if (isDraggingLeft || isDraggingRight || isDraggingBottom) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingLeft, isDraggingRight, isDraggingBottom, showActivityBar, sidebarWidth]);

  return (
    <div id="pro-layout-container" className="flex flex-col h-screen bg-surface-0 overflow-hidden font-sans">
      {/* Top Bar - Command Palette Style */}
      <div className="h-11 flex items-center gap-2 px-3 bg-surface-2 border-b border-border">
        {/* Logo */}
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
            <Command className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white hidden md:block">OSINT Master Pro</span>
        </div>

        {/* Command Bar */}
        <div className="flex-1 flex items-center justify-center">
          <button 
            className="flex items-center gap-2 px-4 py-1.5 bg-surface-1 border border-border rounded-md text-xs text-slate-500 hover:text-slate-300 hover:border-accent-cyan/30 transition-all"
            onClick={() => {}}
          >
            <Command className="w-3 h-3" />
            <span>Command Palette</span>
            <span className="px-1.5 py-0.5 bg-surface-2 rounded text-[10px]">⌘K</span>
          </button>
        </div>

        {/* Layout Controls */}
        <div className="flex items-center gap-1 pl-4 border-l border-border">
          <button 
            onClick={() => applyPreset("investigation")}
            className="p-2 rounded hover:bg-surface-1 text-slate-500 hover:text-accent-cyan transition-colors"
            title="Investigation Layout"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => togglePanel("navigator")}
            className={`p-2 rounded transition-colors ${panelStates.navigator?.visible ? "bg-accent-cyan/10 text-accent-cyan" : "hover:bg-surface-1 text-slate-500 hover:text-slate-300"}`}
            title="Toggle Left Panel"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => togglePanel("inspector")}
            className={`p-2 rounded transition-colors ${panelStates.inspector?.visible ? "bg-accent-cyan/10 text-accent-cyan" : "hover:bg-surface-1 text-slate-500 hover:text-slate-300"}`}
            title="Toggle Right Panel"
          >
            <PanelRight className="w-4 h-4" />
          </button>
          <button 
            onClick={() => togglePanel("timeline")}
            className={`p-2 rounded transition-colors ${panelStates.timeline?.visible ? "bg-accent-cyan/10 text-accent-cyan" : "hover:bg-surface-1 text-slate-500 hover:text-slate-300"}`}
            title="Toggle Bottom Panel"
          >
            <PanelBottom className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        {showActivityBar && activityBar && (
          <div className="w-12 flex-shrink-0 bg-surface-2 border-r border-border flex flex-col items-center py-2">
            {activityBar}
          </div>
        )}

        {/* Sidebar */}
        {sidebar && (
          <div 
            className="flex-shrink-0 bg-surface-1 border-r border-border flex flex-col transition-all"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </div>
        )}

        {/* Resizable Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel */}
            {leftPanels.length > 0 && panelStates.navigator?.visible && (
              <>
                <div 
                  className="flex-shrink-0 bg-surface-1 border-r border-border flex flex-col"
                  style={{ width: `${leftPanelWidth}%` }}
                >
                  {leftPanels.map((panel) => (
                    <div key={panel.id} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                      <PanelHeader
                        title={panel.title}
                        icon={panel.icon}
                        actions={panel.actions}
                        onClose={() => togglePanel(panel.id)}
                      />
                      <div className="flex-1 overflow-auto">
                        {panel.children}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className={`w-1 flex-shrink-0 cursor-col-resize relative group ${isDraggingLeft ? "bg-accent-cyan" : ""}`}
                  onMouseDown={handleLeftResize}
                >
                  <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors ${isDraggingLeft ? "bg-accent-cyan" : "bg-border group-hover:bg-accent-cyan/50"}`} />
                </div>
              </>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-surface-0 overflow-hidden">
              {mainContent}
            </div>

            {/* Right Panel */}
            {rightPanels.length > 0 && panelStates.inspector?.visible && (
              <>
                <div
                  className={`w-1 flex-shrink-0 cursor-col-resize relative group ${isDraggingRight ? "bg-accent-cyan" : ""}`}
                  onMouseDown={handleRightResize}
                >
                  <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors ${isDraggingRight ? "bg-accent-cyan" : "bg-border group-hover:bg-accent-cyan/50"}`} />
                </div>
                <div 
                  className="flex-shrink-0 bg-surface-1 border-l border-border flex flex-col"
                  style={{ width: `${rightPanelWidth}%` }}
                >
                  {rightPanels.length > 1 ? (
                    // Tabbed interface for multiple panels
                    <div className="flex flex-col h-full">
                      <div className="flex border-b border-border bg-surface-2">
                        {rightPanels.map((panel) => (
                          <button
                            key={panel.id}
                            onClick={() => {}}
                            className="flex-1 px-3 py-2 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-surface-3 transition-colors flex items-center justify-center gap-1.5 border-r border-border last:border-0"
                          >
                            {panel.icon}
                            {panel.title}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1 overflow-auto">
                        {rightPanels[0]?.children}
                      </div>
                    </div>
                  ) : (
                    rightPanels.map((panel) => (
                      <div key={panel.id} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <PanelHeader
                          title={panel.title}
                          icon={panel.icon}
                          actions={panel.actions}
                          onClose={() => togglePanel(panel.id)}
                        />
                        <div className="flex-1 overflow-auto">
                          {panel.children}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom Panel */}
          {bottomPanels.length > 0 && panelStates.timeline?.visible && (
            <>
              <div
                className={`h-1 flex-shrink-0 cursor-row-resize relative group ${isDraggingBottom ? "bg-accent-cyan" : ""}`}
                onMouseDown={handleBottomResize}
              >
                <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 transition-colors ${isDraggingBottom ? "bg-accent-cyan" : "bg-border group-hover:bg-accent-cyan/50"}`} />
              </div>
              <div 
                className="flex-shrink-0 bg-surface-1 border-t border-border flex flex-col"
                style={{ height: `${bottomPanelHeight}%` }}
              >
                {bottomPanels.map((panel) => (
                  <div key={panel.id} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <PanelHeader
                      title={panel.title}
                      icon={panel.icon}
                      actions={panel.actions}
                      onClose={() => togglePanel(panel.id)}
                    />
                    <div className="flex-1 overflow-auto">
                      {panel.children}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {showStatusBar && statusBar && (
        <div className="h-6 flex items-center justify-between px-3 bg-surface-2 border-t border-border text-[10px]">
          {statusBar}
        </div>
      )}
    </div>
  );
}

// Activity Bar Button
export function ActivityBarButton({
  icon,
  label,
  active,
  onClick,
  badge
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
        active 
          ? "bg-accent-cyan/10 text-accent-cyan" 
          : "text-slate-500 hover:text-slate-300 hover:bg-surface-1"
      }`}
      title={label}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-accent-cyan text-white text-[9px] font-bold rounded-full">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

// Status Bar Section
export function StatusBarItem({
  children,
  onClick
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-surface-3 text-slate-400 hover:text-slate-300 transition-colors"
    >
      {children}
    </button>
  );
}
