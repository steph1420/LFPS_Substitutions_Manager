import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimetableStore } from './store/useTimetableStore.js';
import { Header } from './components/Header.js';
import { AbsenceRoster } from './components/AbsenceRoster.js';
import { SubstitutionsRegister } from './components/SubstitutionsRegister.js';
import { RoutineGrid } from './components/RoutineGrid.js';
import { TabBar } from './components/TabBar.js';
import { MicroContextMenu } from './components/MicroContextMenu.js';
import { SubAvailabilityModal } from './components/SubAvailabilityModal.js';
import { CoTeacherModal } from './components/CoTeacherModal.js';
import { OfficiatingModal } from './components/OfficiatingModal.js';

export const App: React.FC = () => {
  const { activeTab } = useTimetableStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative">
      {/* Apple HIG Sticky Header with Dynamic Island */}
      <Header />

      {/* Main Content Viewport with generous bottom padding for TabBar dock */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {activeTab === 'routine' && <RoutineGrid />}
            {activeTab === 'substitutions' && <SubstitutionsRegister />}
            {activeTab === 'roster' && <AbsenceRoster />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Apple-Grade Navigation Dock */}
      <TabBar />

      {/* Interactive Modals & Micro Context Menus */}
      <MicroContextMenu />
      <SubAvailabilityModal />
      <CoTeacherModal />
      <OfficiatingModal />

      {/* Footer Status Bar */}
      <footer className="w-full glass-panel border-t border-slate-800/80 px-6 py-3 text-center text-xs text-slate-500 pb-20 sm:pb-3">
        LFPS Substitutions Manager Next-Gen v2.0 • React 19 + TypeScript + Framer Motion + Go Cloud API
      </footer>
    </div>
  );
};

export default App;
