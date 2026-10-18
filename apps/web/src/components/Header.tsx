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

export const Header: React.FC = () => {
  const sync = useLiveSync();
  const {
    selectedDay,
    setDay,
    loggedInTeacher,
    logout,
    openSettings,
    openStaffLogin,
    isMinimalUI,
  } = useTimetableStore();

  const [isPeekMode, setIsPeekMode] = React.useState(false);
  const [isIslandExpanded, setIsIslandExpanded] = React.useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  const lastScrollYRef = React.useRef(0);
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

    if (isPeekMode) {
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

  // 120fps Directional Scroll Observer with Hysteresis & Peek Header Transition (FEAT-52 & FEAT-57)
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
        lastScrollYRef.current = currentScrollY;

        // Top Zone: Always firmly anchored in Full Header Console mode
        if (currentScrollY <= 50) {
          if (isPeekMode) {
            setIsPeekMode(false);
            setIsIslandExpanded(false);
            if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
          }
          return;
        }

        // When scrolled past top zone, transition cleanly into Peek Console mode
        if (currentScrollY > 75 && !isPeekMode) {
          setIsPeekMode(true);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, [isPeekMode]);

  return (
    <>
      {/* Full-Screen Backdrop: Tapping ANYWHERE outside collapses the island day bar instantly */}
      <AnimatePresence>
        {isPeekMode && isIslandExpanded && (
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

      {/* Main Header Container with Peek Navigation Console (FEAT-52, FEAT-57) */}
      <motion.header
        className={`sticky top-0 z-40 w-full header-elevated backdrop-blur-xl border-b border-slate-800/80 transition-all select-none ${
          isMinimalUI ? 'px-3 py-1.5' : isPeekMode ? 'px-3 py-1.5 sm:px-5' : 'px-4 py-3 sm:px-6'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Identity in Full Mode, or Reset Day in Peek Mode */}
          <div className="flex items-center gap-2">
            {!isPeekMode ? (
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
                  <p className="text-[11px] text-slate-400 hidden xs:block">
                    Preparatory Timetable & Substitutions
                  </p>
                </div>
              </div>
            ) : (
              /* Peek Mode Left Action: Fast Reset Access (FEAT-52) */
              <div className="flex items-center gap-1.5">
                <ResetDayButton compact />
              </div>
            )}
          </div>

          {/* Center: Dynamic Day Bar (Docked when full, Floating Island Capsule when peeking) */}
          <div className="flex justify-center">
            {!isPeekMode ? (
              <motion.div
                layoutId="dynamic-island-day-bar"
                transition={ISLAND_SPRING}
                className="flex items-center bg-slate-900/90 p-1 rounded-full border border-slate-800 shadow-inner"
              >
                {DAYS.map((day) => {
                  const isActive = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => handleSelectDay(day)}
                      className={`relative px-2.5 sm:px-3.5 py-1 text-xs font-semibold rounded-full transition-colors z-10 select-none ${
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
            ) : (
              /* Peek Mode Center: Floating Island Day Capsule */
              <div className="relative">
                {!isIslandExpanded ? (
                  <motion.button
                    layoutId="dynamic-island-day-bar"
                    transition={ISLAND_SPRING}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      triggerHaptic(20);
                      setIsIslandExpanded(true);
                      resetAutoCollapseTimer();
                    }}
                    className="bg-slate-950/98 border border-slate-700/80 shadow-[0_8px_24px_rgba(0,0,0,0.7)] px-3 py-1 rounded-full flex items-center gap-2 text-xs font-semibold text-white cursor-pointer group active:scale-95"
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
                    transition={ISLAND_SPRING}
                    className="bg-slate-950/98 border border-slate-700/90 shadow-[0_20px_48px_rgba(0,0,0,0.9)] rounded-full p-1 flex items-center gap-1 backdrop-blur-2xl"
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
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Settings, PWA, Excel, Reset (Full mode), Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop Cloud WebSocket Status Pill */}
            {!isPeekMode && (
              <div
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  sync.status.isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800/60 border-slate-700/40 text-slate-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    sync.status.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span>{sync.status.isConnected ? 'Cloud Live' : 'Offline'}</span>
              </div>
            )}

            {/* In Full mode on desktop, show Reset button here */}
            {!isPeekMode && (
              <div className="hidden md:block">
                <ResetDayButton />
              </div>
            )}

            {/* Install App / Add to Home Screen (FEAT-59) */}
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="p-1.5 rounded-xl glass-pill border-slate-700/60 text-slate-300 hover:text-blue-400 hover:border-blue-500/40 transition-colors active:scale-95"
              title="Add to Home Screen / Install PWA (FEAT-59)"
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            </button>

            {/* Export Excel Button (FEAT-25) */}
            <button
              onClick={() => sync.downloadExcel()}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl glass-pill border-slate-700 hover:border-emerald-500/40 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors active:scale-95"
              title="Download Dated Excel Register (FEAT-25)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Excel</span>
            </button>

            {/* Settings Console Button (BUG-11) */}
            <button
              onClick={openSettings}
              className="p-1.5 rounded-xl glass-pill border-slate-700 hover:border-blue-500/40 text-slate-300 hover:text-blue-400 transition-colors active:scale-95"
              title="Console & Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Staff Login / Profile Pill */}
            {loggedInTeacher ? (
              <div className="flex items-center gap-1.5 glass-pill px-2.5 py-1 rounded-full border border-slate-700/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate max-w-[85px] sm:max-w-[120px]">
                  {loggedInTeacher}
                </span>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-rose-400 transition-colors ml-0.5"
                  title="Log Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={openStaffLogin}
                className="flex items-center gap-1.5 glass-pill px-2.5 py-1 rounded-full text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors active:scale-95"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Staff Login</span>
              </button>
            )}
          </div>
        </div>
      </motion.header>
    </>
  );
};
