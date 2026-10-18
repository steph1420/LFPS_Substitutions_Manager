import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { DayOfWeek } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import {
  User,
  LogOut,
  SlidersHorizontal,
  FileSpreadsheet,
  ChevronDown,
  X,
  Smartphone,
} from 'lucide-react';
import { useLiveSync } from '../hooks/useLiveSync.js';
import { ResetDayButton } from './ResetDayButton.js';
import { AddToHomeScreenModal } from './AddToHomeScreenModal.js';

// Perfectly symmetrical Apple-grade spring physics (timed equally for expand and collapse)
const ISLAND_SPRING = {
  type: 'spring' as const,
  duration: 0.55,
  bounce: 0.12,
};

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

type HeaderState = 'FULL' | 'HIDDEN' | 'PEEK';

export const Header: React.FC = () => {
  const sync = useLiveSync();
  const {
    selectedDay,
    setDay,
    loggedInTeacher,
    logout,
    openSettings,
    openStaffLogin,
  } = useTimetableStore();

  const [headerState, setHeaderState] = React.useState<HeaderState>('FULL');
  const [isIslandExpanded, setIsIslandExpanded] = React.useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  const lastScrollYRef = React.useRef(0);
  const scrollDeltaAccumulatorRef = React.useRef(0);
  const isDayChangingRef = React.useRef(false);
  const isViewportResizingRef = React.useRef(false);
  const autoCollapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-collapse timer for floating day bar
  const resetAutoCollapseTimer = React.useCallback(() => {
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
    }
    autoCollapseTimerRef.current = setTimeout(() => {
      setIsIslandExpanded(false);
    }, 4800);
  }, []);

  const triggerHaptic = (ms = 25) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore vibration failures
      }
    }
  };

  // Day selection with layout freeze guard & auto-collapse reset
  const handleSelectDay = (day: DayOfWeek) => {
    triggerHaptic(30);

    // Freeze scroll delta calculations so day height diffs don't trigger false header reveal
    isDayChangingRef.current = true;
    setDay(day);

    if (headerState !== 'FULL') {
      resetAutoCollapseTimer();
    }

    setTimeout(() => {
      isDayChangingRef.current = false;
      lastScrollYRef.current = window.scrollY;
    }, 450);
  };

  // PWA beforeinstallprompt listener (FEAT-59)
  React.useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Mobile Browser URL Bar Sync with visualViewport (FEAT-57)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleViewportResize = () => {
      isViewportResizingRef.current = true;
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        isViewportResizingRef.current = false;
        lastScrollYRef.current = window.scrollY;
      }, 250);
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  // 120fps Directional Scroll Observer with Strict 4-State Cycle
  React.useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;

        // Ignore artificial scroll events triggered by schedule table height diffs or URL bar resizing
        if (isDayChangingRef.current || isViewportResizingRef.current) {
          lastScrollYRef.current = window.scrollY;
          return;
        }

        const currentScrollY = window.scrollY;
        const diff = currentScrollY - lastScrollYRef.current;
        lastScrollYRef.current = currentScrollY;

        // State 1: TOP OF PAGE (scrollY <= 50) -> Full Header Console
        if (currentScrollY <= 50) {
          scrollDeltaAccumulatorRef.current = 0;
          setHeaderState((prev) => (prev !== 'FULL' ? 'FULL' : prev));
          setIsIslandExpanded(false);
          if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
          return;
        }

        // Accumulate directional scroll delta
        if (diff > 0) {
          scrollDeltaAccumulatorRef.current = Math.max(0, scrollDeltaAccumulatorRef.current) + diff;
        } else if (diff < 0) {
          scrollDeltaAccumulatorRef.current = Math.min(0, scrollDeltaAccumulatorRef.current) + diff;
        }

        // State 2: SCROLLING DOWN (scrollY > 50 and delta > 25) -> Header Completely Gone, only lone pill
        if (scrollDeltaAccumulatorRef.current > 25) {
          scrollDeltaAccumulatorRef.current = 0;
          setHeaderState((prev) => (prev !== 'HIDDEN' ? 'HIDDEN' : prev));
        }
        // State 3: SCROLLING UP WHILE DOWN (scrollY > 50 and delta < -30) -> Slim Peek Strip (Not full header)
        else if (scrollDeltaAccumulatorRef.current < -30) {
          scrollDeltaAccumulatorRef.current = 0;
          setHeaderState((prev) => (prev !== 'PEEK' ? 'PEEK' : prev));
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, []);

  // Shared Floating Island Capsule / Expanded Day Selector Component
  const renderIslandContent = () => (
    <>
      {!isIslandExpanded ? (
        <motion.button
          layoutId="dynamic-island-day-bar"
          key="island-pill"
          transition={ISLAND_SPRING}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            triggerHaptic(20);
            setIsIslandExpanded(true);
            resetAutoCollapseTimer();
          }}
          className="bg-slate-950/98 border border-slate-700/80 shadow-[0_12px_28px_rgba(0,0,0,0.85)] px-3 py-1 rounded-full flex items-center gap-2 text-xs font-semibold text-white cursor-pointer group active:scale-95 will-change-transform"
          title="Tap to change timetable day"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              sync.status.isConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-slate-500'
            }`}
          />
          <span className="font-bold tracking-wider">{selectedDay}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
        </motion.button>
      ) : (
        <motion.div
          layoutId="dynamic-island-day-bar"
          key="island-expanded"
          transition={ISLAND_SPRING}
          className="bg-slate-950/98 border border-slate-700/90 shadow-[0_20px_48px_rgba(0,0,0,0.9)] rounded-full p-1 flex items-center gap-1 backdrop-blur-2xl will-change-transform"
        >
          <div className="flex items-center gap-0.5 sm:gap-1">
            {DAYS.map((day) => {
              const isActive = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`relative px-2.5 sm:px-3 py-0.5 text-xs font-bold rounded-full transition-colors select-none ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setIsIslandExpanded(false);
              if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Day Selector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </>
  );

  return (
    <>
      {/* Full-Screen Backdrop: Tapping ANYWHERE outside collapses the island day bar instantly */}
      <AnimatePresence>
        {headerState !== 'FULL' && isIslandExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => {
              setIsIslandExpanded(false);
              if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
            }}
          />
        )}
      </AnimatePresence>

      {/* PWA Install Guidance Modal */}
      <AddToHomeScreenModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />

      {/* STATE 2: LONE FLOATING ISLAND CAPSULE (When scrolling down, header completely gone) */}
      <AnimatePresence>
        {headerState === 'HIDDEN' && (
          <div className="fixed top-3 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">{renderIslandContent()}</div>
          </div>
        )}
      </AnimatePresence>

      {/* STATE 3: SLIM PEEK STRIP (When far down and scrolling UP, day bar stays as pill) */}
      <AnimatePresence>
        {headerState === 'PEEK' && (
          <motion.div
            key="peek-strip"
            initial={{ y: -65, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -65, opacity: 0 }}
            transition={SPRING_TRANSITIONS.snappy}
            className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 h-11 sm:h-12 px-3 sm:px-6 flex items-center justify-between shadow-[0_8px_24px_rgba(0,0,0,0.7)] select-none will-change-transform"
          >
            {/* Left: Compact Reset Day Button */}
            <div className="flex items-center">
              <ResetDayButton compact />
            </div>

            {/* Center: Day Bar Pill Capsule (Stays like a pill as requested) */}
            <div className="flex items-center justify-center">
              {renderIslandContent()}
            </div>

            {/* Right: Quick Utilities (Settings, PWA, Profile) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsPwaModalOpen(true)}
                className="p-1.5 rounded-xl glass-pill border-slate-700/60 text-slate-300 hover:text-blue-400 hover:border-blue-500/40 transition-colors active:scale-95"
                title="Install PWA"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                onClick={openSettings}
                className="p-1.5 rounded-xl glass-pill border-slate-700 hover:border-blue-500/40 text-slate-300 hover:text-blue-400 transition-colors active:scale-95"
                title="Console & Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => (loggedInTeacher ? logout() : openStaffLogin())}
                className="glass-pill px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 text-slate-200 active:scale-95 transition-transform"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate max-w-[80px]">{loggedInTeacher || 'Login'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATE 1 & 4: FULL ELEVATED HEADER CONSOLE (At top of page scrollY <= 50) */}
      <motion.header
        animate={{
          y: headerState === 'FULL' ? 0 : -140,
          opacity: headerState === 'FULL' ? 1 : 0,
        }}
        transition={SPRING_TRANSITIONS.smooth}
        className="sticky top-0 z-40 w-full header-elevated px-4 py-3 sm:px-6 pointer-events-auto will-change-transform border-b border-slate-800/80 backdrop-blur-xl select-none"
      >
        {/* Uncluttered Multi-Row/Column Architecture: Day bar has dedicated breathing room and NEVER pushes icons off-screen */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Identity */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
                L
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  LFPS Manager
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    v2.0
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">Preparatory Timetable & Substitutions</p>
              </div>
            </div>

            {/* Mobile Actions: Reset Button, Settings & Profile Pill */}
            <div className="md:hidden flex items-center gap-1.5">
              <ResetDayButton compact />
              <button
                onClick={openSettings}
                className="p-1.5 rounded-full glass-pill border-slate-800 text-slate-300 hover:text-white transition-colors active:scale-95"
                title="Console & Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                onClick={() => (loggedInTeacher ? logout() : openStaffLogin())}
                className="glass-pill px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 text-slate-200 active:scale-95 transition-transform"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate max-w-[80px]">{loggedInTeacher || 'Login'}</span>
              </button>
            </div>
          </div>

          {/* Center: Full Docked Day Bar inside Header (Joined back inside header when at top) */}
          {headerState === 'FULL' && (
            <motion.div
              layoutId="dynamic-island-day-bar"
              transition={ISLAND_SPRING}
              className="flex items-center bg-slate-900/90 p-1 rounded-full border border-slate-800 shadow-inner will-change-transform"
            >
              {DAYS.map((day) => {
                const isActive = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => handleSelectDay(day)}
                    className={`relative px-3.5 py-1 text-xs font-semibold rounded-full transition-colors z-10 select-none ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDockedDayHighlight"
                        transition={SPRING_TRANSITIONS.snappy}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/30 -z-10"
                      />
                    )}
                    {day}
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Right: Desktop Controls, Cloud Sync, Excel, Settings & Login */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Cloud WebSocket Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                sync.status.isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-400'
              }`}
              title={
                sync.status.isConnected
                  ? `Connected (${sync.status.activeClients} peers)`
                  : 'Disconnected / Reconnecting'
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  sync.status.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{sync.status.isConnected ? 'Cloud Live' : 'Offline'}</span>
            </div>

            {/* Reset Day Button (FEAT-41) */}
            <ResetDayButton />

            {/* Add to Home Screen PWA Install (FEAT-59) */}
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="p-1.5 rounded-lg border glass-pill border-slate-700 hover:border-blue-500/40 text-slate-300 hover:text-blue-400 transition-colors active:scale-95"
              title="Add to Home Screen / Install PWA (FEAT-59)"
            >
              <Smartphone className="w-4 h-4 text-blue-400" />
            </button>

            {/* Export Excel Button (FEAT-25) */}
            <button
              onClick={() => sync.downloadExcel()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg glass-pill border-slate-700 hover:border-emerald-500/40 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
              title="Download Dated Excel Register (FEAT-25)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>

            {/* Settings Console Button (BUG-11) */}
            <button
              onClick={openSettings}
              className="p-1.5 rounded-lg border glass-pill border-slate-700 hover:border-blue-500/40 text-slate-300 hover:text-blue-400 transition-colors active:scale-95"
              title="Console & Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {loggedInTeacher ? (
              <div className="flex items-center gap-2 glass-pill px-3 py-1.5 rounded-full border border-slate-700/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-slate-200">{loggedInTeacher}</span>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-rose-400 transition-colors ml-1"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={openStaffLogin}
                className="flex items-center gap-1.5 glass-pill px-3 py-1.5 rounded-full text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                Staff Login
              </button>
            )}
          </div>
        </div>
      </motion.header>
    </>
  );
};
