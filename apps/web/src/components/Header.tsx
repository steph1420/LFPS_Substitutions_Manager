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

  // Apple-grade direction-aware scroll observer
  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = lastScrollYRef.current;
      const diff = currentScrollY - prevScrollY;

      if (currentScrollY <= 50) {
        // At the top: header always visible, island docked
        setIsHeaderHidden(false);
        setIsIslandExpanded(false);
      } else if (diff > 10) {
        // Scrolling down: collapse header and show floating Dynamic Island
        setIsHeaderHidden(true);
      } else if (diff < -14) {
        // Scrolling up: reveal header smoothly
        setIsHeaderHidden(false);
        setIsIslandExpanded(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore vibration failures
      }
    }
  };

  return (
    <>
      {/* Dynamic Island Floating Day Capsule (Active on Scroll Down) */}
      <AnimatePresence>
        {isHeaderHidden && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            {!isIslandExpanded ? (
              // Collapsed Dynamic Island Pill
              <motion.button
                key="island-pill"
                initial={{ opacity: 0, scale: 0.8, y: -24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -24 }}
                transition={SPRING_TRANSITIONS.snappy}
                onClick={() => {
                  triggerHaptic();
                  setIsIslandExpanded(true);
                }}
                className="bg-slate-950/95 border border-slate-700/80 shadow-[0_12px_28px_rgba(0,0,0,0.8)] backdrop-blur-xl px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold text-white active:scale-95 transition-transform cursor-pointer group"
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
              // Expanded Dynamic Island Horizontal Day Selector (Zero Layout Shift)
              <>
                {/* Backdrop Click Dismiss */}
                <div
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                  onClick={() => setIsIslandExpanded(false)}
                />

                <motion.div
                  key="island-expanded"
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={SPRING_TRANSITIONS.bouncy}
                  className="relative z-50 bg-slate-950/98 border border-slate-700/90 shadow-[0_20px_48px_rgba(0,0,0,0.9)] rounded-2xl p-1.5 flex items-center gap-1 backdrop-blur-2xl"
                >
                  <div className="flex items-center gap-1">
                    {DAYS.map((day) => {
                      const isActive = selectedDay === day;
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            triggerHaptic();
                            setDay(day);
                            setIsIslandExpanded(false);
                          }}
                          className={`relative px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeIslandDay"
                              transition={SPRING_TRANSITIONS.snappy}
                              className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/40 -z-10"
                            />
                          )}
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setIsIslandExpanded(false)}
                    className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              </>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Main Elevated Header (Smoothly slides up on scroll down) */}
      <header
        className={`sticky top-0 z-40 w-full header-elevated px-4 py-3 sm:px-6 transition-transform duration-300 ease-out ${
          isHeaderHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Identity */}
          <div className="flex items-center justify-between w-full md:w-auto">
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

          {/* Apple HIG Fluid Day Bar (Desktop & Top View) */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-full border border-slate-800 shadow-inner">
            {DAYS.map((day) => {
              const isActive = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setDay(day)}
                  className={`relative px-3.5 py-1 text-xs font-semibold rounded-full transition-colors z-10 ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDay"
                      transition={SPRING_TRANSITIONS.snappy}
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/30 -z-10"
                    />
                  )}
                  {day}
                </button>
              );
            })}
          </div>

          {/* Desktop Controls, Cloud Sync & Login Pill */}
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

        {/* Login Modal Dropdown */}
        {showLoginModal && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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
