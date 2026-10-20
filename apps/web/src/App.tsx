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
import { SettingsModal } from './components/SettingsModal.js';
import { StaffLoginModal } from './components/StaffLoginModal.js';
import { ResetPurgeContextMenu } from './components/ResetPurgeContextMenu.js';
import { AssignSubstituteModal } from './components/AssignSubstituteModal.js';
import { DisputeModal } from './components/DisputeModal.js';
import { NotificationCenterDrawer } from './components/NotificationCenterDrawer.js';
import { AwayOfficialModal } from './components/AwayOfficialModal.js';

export const App: React.FC = () => {
  const { activeTab, isFitGrid, undo, redo } = useTimetableStore();

  // Global Undo / Redo Keyboard Listener scoped to active tab (FEAT-40)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Fullscreen Workstation Mode: Render directly at root, immune to containing blocks and mobile viewport clipping (BUG-10)
  if (isFitGrid) {
    return (
      <div className="fixed inset-0 h-screen h-[100dvh] w-screen bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col p-2.5 sm:p-4 overflow-hidden z-[100] select-none transition-colors duration-200">
        <RoutineGrid isFullscreen />
        {/* Modals & Micro Context Menus remain fully interactive in Fullscreen */}
        <MicroContextMenu />
        <ResetPurgeContextMenu />
        <StaffLoginModal />
        <AssignSubstituteModal />
        <SubAvailabilityModal />
        <CoTeacherModal />
        <OfficiatingModal />
        <SettingsModal />
        <DisputeModal />
        <NotificationCenterDrawer />
        <AwayOfficialModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-blue-600 selection:text-white relative transition-colors duration-200">
      {/* Apple HIG Sticky Header with Dynamic Island */}
      <Header />

      {/* Main Content Viewport with slim mobile margins to maximize table space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-1.5 sm:px-6 py-3 sm:py-6 pb-28">
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
      <ResetPurgeContextMenu />
      <StaffLoginModal />
      <AssignSubstituteModal />
      <SubAvailabilityModal />
      <CoTeacherModal />
      <OfficiatingModal />
      <SettingsModal />
      <DisputeModal />
      <NotificationCenterDrawer />
      <AwayOfficialModal />

      {/* Footer Status Bar */}
      <footer className="w-full glass-panel border-t border-slate-800/80 px-6 py-3 text-center text-xs text-slate-500 pb-20 sm:pb-3">
        LFPS Substitutions Manager Next-Gen v2.0 • React 19 + TypeScript + Framer Motion + Go Cloud API
      </footer>
    </div>
  );
};

export default App;
