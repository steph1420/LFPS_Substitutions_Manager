import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTimetableStore } from './store/useTimetableStore.js';
import { Header } from './components/Header.js';
import { AbsenceRoster } from './components/AbsenceRoster.js';
import { SubstitutionsRegister } from './components/SubstitutionsRegister.js';
import { RoutineGrid } from './components/RoutineGrid.js';
import { TabBar } from './components/TabBar.js';
import { BUILD_LABEL, BUILD_TIME, GIT_BRANCH, IS_PREVIEW_BUILD, PREVIEW_INDEX_HREF } from './lib/buildInfo.js';
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
import { startLiveSync } from './sync/live.js';
import { schoolDayForDate } from '@lfps/core';
import { APP_SCROLL_ID, readDevUiPrefs, type HeaderScrollMode } from './lib/devUiPrefs.js';

export const App: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const { activeTab, isFitGrid, undo, redo, setDay } = useTimetableStore();
  const [headerScrollMode, setHeaderScrollMode] = React.useState<HeaderScrollMode>(
    () => readDevUiPrefs().headerScrollMode
  );

  React.useEffect(() => {
    const sync = () => setHeaderScrollMode(readDevUiPrefs().headerScrollMode);
    window.addEventListener('storage', sync);
    window.addEventListener('lfps-dev-ui-prefs', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('lfps-dev-ui-prefs', sync);
    };
  }, []);

  // FEAT-70: day load mode — free pick restores last day; follow snaps on load + visibility
  React.useEffect(() => {
    const prefs = readDevUiPrefs();
    if (prefs.dayLoadMode === 'free' && prefs.lastFreeDay) {
      setDay(prefs.lastFreeDay);
    } else if (prefs.dayLoadMode === 'follow') {
      setDay(schoolDayForDate(new Date()) ?? 'MON');
    }
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (readDevUiPrefs().dayLoadMode !== 'follow') return;
      setDay(schoolDayForDate(new Date()) ?? 'MON');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [setDay]);

  // Bundle 35: the one live sync socket for this tab (ref-counted, StrictMode-safe).
  React.useEffect(() => startLiveSync(), []);

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

  const useContainerScroll = headerScrollMode === 'container';

  return (
    <div
      className={`${
        useContainerScroll
          ? 'h-[100dvh] max-h-[100dvh] overflow-hidden'
          : 'min-h-screen min-h-[100dvh]'
      } bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-blue-600 selection:text-white relative transition-colors duration-200`}
    >
      {/* UI-10(a): scroll lives inside #lfps-app-scroll so the browser toolbar stays put.
          UI-10(b): document scrolls as before; Header uses thresholds + hysteresis. */}
      <div
        id={APP_SCROLL_ID}
        className={`flex flex-col flex-1 min-h-0 ${
          useContainerScroll ? 'overflow-y-auto overscroll-y-contain' : ''
        }`}
      >
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-1.5 sm:px-6 py-3 sm:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            >
              {activeTab === 'routine' && <RoutineGrid />}
              {activeTab === 'substitutions' && <SubstitutionsRegister />}
              {activeTab === 'roster' && <AbsenceRoster />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer Status Bar — inside scroll so it does not steal height from the shell */}
        <footer className="w-full border-t border-[color-mix(in_srgb,var(--text-primary)_12%,transparent)] bg-[color-mix(in_srgb,var(--surface-opaque)_88%,transparent)] px-6 pt-3 pb-[calc(7.25rem+env(safe-area-inset-bottom))] text-center text-xs text-[color-mix(in_srgb,var(--text-primary)_55%,transparent)]">
          <span className="inline-flex flex-wrap items-center justify-center gap-2">
            {IS_PREVIEW_BUILD && (
              <a
                href={PREVIEW_INDEX_HREF}
                className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 transition-transform duration-150 hover:scale-[1.03]"
                title="Preview build — open the preview list"
              >
                Preview · {GIT_BRANCH}
              </a>
            )}
            <span title={`Built ${BUILD_TIME}`}>LFPS Substitutions Manager · {BUILD_LABEL}</span>
          </span>
        </footer>
      </div>

      {/* Floating Apple-Grade Navigation Dock (outside scroll) */}
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
    </div>
  );
};

export default App;
