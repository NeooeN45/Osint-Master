/**
 * DashboardV2 - Phase 2 UI v2 Integration
 * Intégration des nouveaux composants Google Dark Minimalist
 * 
 * Features:
 * - Hero Section avec gradient et particules
 * - Dark Sidebar avec accents cyan
 * - Dashboard Cards avec effet wow
 * - Responsive layout
 * 
 * Créé: 17 Avril 2026 - Phase 2 UI Integration
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSection } from '../../components/HeroSection';
import { Sidebar } from '../../components/Sidebar';
import { DashboardCards } from '../../components/DashboardCards';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function DashboardV2() {
  const [showHero, setShowHero] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('dashboard');

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <Sidebar
        activeItem={activeNavItem}
        onItemClick={setActiveNavItem}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toggle Hero Button */}
        <motion.button
          onClick={() => setShowHero(!showHero)}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {showHero ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span className="text-sm">Masquer Hero</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span className="text-sm">Afficher Hero</span>
            </>
          )}
        </motion.button>

        {/* Hero Section (collapsible) */}
        <AnimatePresence>
          {showHero && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex-shrink-0"
            >
              <HeroSection />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          <DashboardCards />
        </div>
      </div>
    </div>
  );
}

// Version avec navigation conditionnelle
export function DashboardV2WithNav() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'hero' | 'combined'>('combined');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'hero':
        return <HeroSection />;
      case 'dashboard':
        return <DashboardCards />;
      case 'combined':
      default:
        return (
          <div className="flex flex-col">
            <HeroSection />
            <DashboardCards />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar
        activeItem={activeNavItem}
        onItemClick={(id) => {
          setActiveNavItem(id);
          // Navigation logique ici
          if (id === 'dashboard') setCurrentView('combined');
          if (id === 'investigation') setCurrentView('dashboard');
        }}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}

export default DashboardV2;
