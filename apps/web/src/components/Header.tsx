import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { DayOfWeek } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { User, LogOut, SlidersHorizontal, FileSpreadsheet, ChevronDown, X } from 'lucide-react';
import { useLiveSync } from '../hooks/useLiveSync.js';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const Header: React.FC = () => {
  const sync = useLiveSync();
  const {
    selectedDay,
    setDay,
    loggedInTeacher,
    login,
    logout,
    directory,
    isMinimalUI,
    toggleMinimalUI,
  } = useTimetableStore();

  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = React.useState(false);
  const [isIslandExpanded, setIsIslandExpanded] = React.useState(false);

  const lastScrollYRef = React.useRef(0);
  const isDayChangingRef = React.useRef(false);
  const autoCollapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-collapse timer (3.5s of inactivity after day selection)
  const resetAutoCollapseTimer = React.useCallback(() => {
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
    }
    autoCollapseTimerRef.current = setTimeout(() => {
      setIsIslandExpanded(false);
    }, 3500);
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

  // Day selection with layout freeze guard & 3.5s auto-collapse
  const handleSelectDay = (day: DayOfWeek) => {
    triggerHaptic(30);

    // Freeze scroll event delta calculation so day height diffs don't trigger false header reveal
    isDayChangingRef.current = true;
    setDay(day);

    if (isHeaderHidden) {
      // Keep expanded and reset the 3.5s countdown
      resetAutoCollapseTimer();
    }

    setTimeout(() => {
      isDayChangingRef.current = false;
      lastScrollYRef.current = window.scrollY;
    }, 500);
  };

  // 120fps Uncapped Scroll Observer (requestAnimationFrame + near-top sensitivity)
  React.useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;

        // Ignore artificial scroll events triggered by schedule table height diffs
        if (isDayChangingRef.current) {
          lastScrollYRef.current = window.scrollY;
          return;
        }

        const currentScrollY = window.scrollY;
        const prevScrollY = lastScrollYRef.current;
        const diff = currentScrollY - prevScrollY;

        // Near top of page: instantly dock and reveal full header
        if (currentScrollY <= 70) {
          setIsHeaderHidden(false);
          setIsIslandExpanded(false);
          if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
        } else if (diff > 5) {
          // Scrolling down: smoothly morph day bar into Dynamic Island
          setIsHeaderHidden(true);
        } else if (diff < -8) {
          // Scrolling up: smoothly reveal full header console
          setIsHeaderHidden(false);
          setIsIslandExpanded(false);
          if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
        }

        lastScrollYRef.current = currentScrollY;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* Full-Screen Backdrop: Tapping ANYWHERE outside collapses the day bar instantly */}
      <AnimatePresence>
        {isHeaderHidden && isIslandExpanded && (
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

      {/* Main Elevated Header with Persistent Morphing Day Bar */}
      <header
        className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
          isHeaderHidden
            ? 'bg-transparent border-transparent shadow-none pointer-events-none py-2.5'
            : 'header-elevated px-4 py-3 sm:px-6 pointer-events-auto'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Identity (Smoothly collapses when scrolling down) */}
          <div
            className={`flex items-center justify-between w-full md:w-auto transition-all duration-300 overflow-hidden ${
              isHeaderHidden
                ? 'max-h-0 opacity-0 pointer-events-none'
                : 'max-h-24 opacity-100 pointer-events-auto'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
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

            {/* Mobile Profile Pill */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => (loggedInTeacher ? logout() : setShowLoginModal(true))}
                className="glass-pill px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 text-slate-200 active:scale-95 transition-transform"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate max-w-[90px]">{loggedInTeacher || 'Login'}</span>
              </button>
            </div>
          </div>

          {/* Persistent Morphing Day Bar (Smooth Continuous Spring Animation in BOTH directions) */}
          <div className="pointer-events-auto flex items-center justify-center">
            <motion.div
              layout
              transition={SPRING_TRANSITIONS.snappy}
              className={`flex items-center rounded-full border transition-all duration-300 will-change-transform ${
                isHeaderHidden
                  ? 'bg-slate-950/98 border-slate-700/90 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-1'
                  : 'bg-slate-900/90 border-slate-800 shadow-inner p-1'
              }`}
            >
              <AnimatePresence mode="wait">
                {isHeaderHidden && !isIslandExpanded ? (
                  // Collapsed Dynamic Island Pill Mode
                  <motion.button
                    key="collapsed-pill"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={SPRING_TRANSITIONS.snappy}
                    onClick={() => {
                      triggerHaptic(20);
                      setIsIslandExpanded(true);
                      resetAutoCollapseTimer();
                    }}
                    className="flex items-center gap-2 px-3.5 py-1 text-xs font-semibold text-white active:scale-95 transition-transform cursor-pointer group select-none"
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
                  // Full 6-Day Selector (Docked Header Mode OR Expanded Island Popover)
                  <motion.div
                    key="expanded-days"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={SPRING_TRANSITIONS.snappy}
                    className="flex items-center gap-0.5 sm:gap-1"
                  >
                    {DAYS.map((day) => {
                      const isActive = selectedDay === day;
                      return (
                        <button
                          key={day}
                          onClick={() => handleSelectDay(day)}
                          className={`relative px-3 sm:px-3.5 py-1 text-xs font-semibold rounded-full transition-all select-none ${
                            isActive
                              ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/40 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}

                    {/* Quick Close Button when Expanded in Island Mode */}
                    {isHeaderHidden && (
                      <button
                        onClick={() => {
                          setIsIslandExpanded(false);
                          if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-0.5"
                        title="Close Day Selector"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Desktop Controls (Smoothly collapses when scrolling down) */}
          <div
            className={`hidden md:flex items-center gap-2.5 transition-all duration-300 overflow-hidden ${
              isHeaderHidden
                ? 'max-h-0 opacity-0 pointer-events-none'
                : 'max-h-24 opacity-100 pointer-events-auto'
            }`}
          >
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

            {/* Export Excel Button (FEAT-25) */}
            <button
              onClick={() => sync.downloadExcel()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg glass-pill border-slate-700 hover:border-emerald-500/40 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
              title="Download Dated Excel Register (FEAT-25)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              onClick={toggleMinimalUI}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMinimalUI
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'glass-pill border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Minimal UI Mode"
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
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 glass-pill px-3 py-1.5 rounded-full text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                Staff Login
              </button>
            )}
          </div>
        </div>

        {/* Staff Login Modal */}
        {showLoginModal && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={SPRING_TRANSITIONS.bouncy}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  Select Staff Identity
                </h3>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Select your profile to view personal duty schedules and manage substitutions.
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {Object.values(directory).map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => {
                      login(teacher.abbr);
                      setShowLoginModal(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-blue-600/20 border border-slate-700/40 hover:border-blue-500/40 transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{teacher.abbr}</div>
                      <div className="text-[11px] text-slate-400">{teacher.role}</div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400">
                      {teacher.id}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </header>
    </>
  );
};
