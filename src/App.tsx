import { useState } from "react";
import { Toaster } from "sonner";
import Sidebar, { type AppView } from "./components/Sidebar";
import Dashboard from "./views/Dashboard";
import GraphView from "./views/GraphView";
import ChatView from "./views/ChatView";
import ToolsView from "./views/ToolsView";
import TimelineView from "./views/TimelineView";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [showSettings, setShowSettings] = useState(false);

  const renderView = () => {
    switch (view) {
      case "dashboard": return <Dashboard onViewChange={setView} />;
      case "graph":     return <GraphView />;
      case "chat":      return <ChatView />;
      case "tools":     return <ToolsView />;
      case "timeline":  return <TimelineView />;
      case "cases":     return <Dashboard onViewChange={setView} />;
      default:          return <Dashboard onViewChange={setView} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0 text-white">
      <Toaster position="top-right" theme="dark" richColors />
      <Sidebar
        activeView={view}
        onViewChange={setView}
        onOpenSettings={() => setShowSettings(true)}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
      </main>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
