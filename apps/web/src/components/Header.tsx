import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { DayOfWeek } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { usePermissions } from './PermissionGuard.js';
import {
  User,
  LogOut,
  SlidersHorizontal,
  FileSpreadsheet,
  ChevronDown,
  X,
  Smartphone,
  Bell,
} from 'lucide-react';
import { useLiveSync } from '../hooks/useLiveSync.js';
import { phaseLabel } from '../sync/status.js';
import { ResetDayButton } from './ResetDayButton.js';
import { APP_VERSION, BUILD_LABEL } from '../lib/buildInfo.js';
import { AddToHomeScreenModal } from './AddToHomeScreenModal.js';
import {
  APP_SCROLL_ID,
  readDevUiPrefs,
  type HeaderScrollMode,
} from '../lib/devUiPrefs.js';

// Perfectly symmetrical Apple-grade spring physics (timed equally for expand and collapse)
const ISLAND_SPRING = {
  type: 'spring' as const,
  duration: 0.55,
  bounce: 0.12,
};

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

type HeaderState = 'FULL' | 'PILL';

export const Header: React.FC = () => {
  const sync = useLiveSync();
  const {
    selectedDay,
    setDay,
    loggedInTeacher,
    logout,
    openSettings,
    openStaffLogin,
    notifications,
    substitutions,
    openNotificationCenter,
  } = useTimetableStore();
  const { isAdmin, editingUnlocked } = usePermissions();

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;
  const disputedSubCount = substitutions.filter(
    (s) => s.day === selectedDay && s.status === 'DISPUTED'
  ).length;
  const alertBadgeCount = unreadNotifCount + disputedSubCount;

  const [headerState, setHeaderState] = React.useState<HeaderState>('FULL');
  const [isIslandExpanded, setIsIslandExpanded] = React.useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  const lastScrollYRef = React.useRef(0);
  const isTransitioningRef = React.useRef(false);
  const isDayChangingRef = React.useRef(false);
  const autoCollapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerStateRef = React.useRef<HeaderState>('FULL');
  const [headerScrollMode, setHeaderScrollMode] = React.useState<HeaderScrollMode>(
    () => readDevUiPrefs().headerScrollMode
  );

  React.useEffect(() => {
    headerStateRef.current = headerState;
  }, [headerState]);

  // Re-read Dev Options header mode when storage changes (same tab via custom event, other tabs via storage)
  React.useEffect(() => {
    const sync = () => setHeaderScrollMode(readDevUiPrefs().headerScrollMode);
    const onCustom = () => sync();
    window.addEventListener('storage', sync);
    window.addEventListener('lfps-dev-ui-prefs', onCustom);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('lfps-dev-ui-prefs', onCustom);
    };
  }, []);

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
      const el =
        headerScrollMode === 'container' ? document.getElementById(APP_SCROLL_ID) : null;
      lastScrollYRef.current = el ? el.scrollTop : window.scrollY;
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

  // BUG-29 / UI-10: scroll observer with hysteresis; container vs thresholds mode (FEAT-69)
  React.useEffect(() => {
    let rafId: number | null = null;
    // Enter PILL above ENTER_PILL; return FULL only below EXIT_FULL (hysteresis).
    const ENTER_PILL = 72;
    const EXIT_FULL = 28;

    const readScrollY = (): number => {
      if (headerScrollMode === 'container') {
        const el = document.getElementById(APP_SCROLL_ID);
        return el ? el.scrollTop : 0;
      }
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const applyState = (next: HeaderState) => {
      if (headerStateRef.current === next) return;
      headerStateRef.current = next;
      setHeaderState(next);
      if (next === 'FULL') {
        setIsIslandExpanded(false);
        if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
      }
      isTransitioningRef.current = true;
      window.setTimeout(() => {
        isTransitioningRef.current = false;
      }, 220);
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (isDayChangingRef.current) {
          lastScrollYRef.current = readScrollY();
          return;
        }
        if (isTransitioningRef.current) return;

        const currentScrollY = readScrollY();
        const prev = lastScrollYRef.current;
        lastScrollYRef.current = currentScrollY;

        // Thresholds mode: ignore tiny jumps typical of mobile toolbar show/hide.
        if (headerScrollMode === 'thresholds') {
          const delta = Math.abs(currentScrollY - prev);
          if (delta > 0 && delta < 8 && currentScrollY > EXIT_FULL) {
            return;
          }
        }

        const state = headerStateRef.current;
        if (state === 'FULL' && currentScrollY > ENTER_PILL) {
          applyState('PILL');
        } else if (state === 'PILL' && currentScrollY < EXIT_FULL) {
          applyState('FULL');
        }
      });
    };

    // visualViewport resize (toolbar) — resync baseline; do not flip state from the jump alone
    const handleViewportResize = () => {
      lastScrollYRef.current = readScrollY();
    };

    const scrollTarget: HTMLElement | Window =
      headerScrollMode === 'container'
        ? document.getElementById(APP_SCROLL_ID) ?? window
        : window;

    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', handleViewportResize);
    // Initial sync
    lastScrollYRef.current = readScrollY();

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll as EventListener);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, [headerScrollMode]);

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
              sync.status.phase === 'live'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : sync.status.phase === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
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

      {/* FLOATING DAY BAR PILL: Floats at top-3 when scrolled away from top (Only Pill or Full) */}
      <AnimatePresence>
        {headerState === 'PILL' && (
          <motion.div
            key="floating-day-pill-container"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={ISLAND_SPRING}
            className="fixed top-3 left-0 right-0 z-50 flex justify-center pointer-events-none will-change-transform"
          >
            <div className="pointer-events-auto">{renderIslandContent()}</div>
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
        className="sticky top-0 z-40 w-full header-elevated px-4 py-3 sm:px-6 pointer-events-auto will-change-transform border-b border-slate-800/80 select-none min-h-[4.5rem]"
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
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    title={BUILD_LABEL}
                  >
                    v{APP_VERSION}
                  </span>
                  {isAdmin && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      title="Signed in as admin in this tab (Log Out ends it)"
                    >
                      Admin
                    </span>
                  )}
                  {editingUnlocked && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 whitespace-nowrap"
                      title="Dev Options: editing allowed on this device without login (turn off in Settings)"
                      data-testid="editing-unlocked-badge"
                    >
                      Editing unlocked
                    </span>
                  )}
                </h1>
                <p className="text-[11px] text-slate-400 hidden xs:block">
                  Preparatory Timetable & Substitutions
                </p>
              </div>
            </div>

            {/* Mobile Actions: Reset Button, Notifications, Settings & Profile Pill */}
            <div className="md:hidden flex items-center gap-1.5">
              <ResetDayButton compact />
              <button
                onClick={openNotificationCenter}
                className="relative p-1.5 rounded-full glass-pill border-slate-800 text-slate-300 hover:text-white transition-colors active:scale-95 cursor-pointer"
                title="Notification Center & Live Alerts (FEAT-50)"
              >
                <Bell className="w-3.5 h-3.5 text-purple-400" />
                {alertBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                    {alertBadgeCount > 9 ? '9+' : alertBadgeCount}
                  </span>
                )}
              </button>
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

          {/* Center: Docked Day Bar — always mounted at fixed height (BUG-29: no layout shift) */}
          <div
            className={`flex items-center bg-slate-900/90 p-1 rounded-full border border-slate-800 shadow-inner min-h-[34px] ${
              headerState === 'FULL' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={headerState !== 'FULL'}
          >
            {headerState === 'FULL' ? (
              <motion.div
                layoutId="dynamic-island-day-bar"
                transition={ISLAND_SPRING}
                className="flex items-center will-change-transform"
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
            ) : (
              <div className="h-[26px] w-[220px]" />
            )}
          </div>

          {/* Right: Desktop Controls, Cloud Sync, Excel, Settings & Login */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Live sync status pill (Bundle 35): Live / Connecting… / Offline */}
            <div
              data-testid="sync-pill"
              data-phase={sync.status.phase}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors duration-200 ${
                sync.status.phase === 'live'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-[var(--accent-green)]'
                  : sync.status.phase === 'connecting'
                    ? 'bg-amber-500/10 border-amber-500/30 text-[var(--accent-amber)]'
                    : 'bg-slate-800/60 border-slate-700/40 text-slate-400'
              }`}
              title={
                sync.status.phase === 'live'
                  ? `Live · ${sync.status.activeClients} device${sync.status.activeClients === 1 ? '' : 's'}${
                      sync.status.pending ? ` · ${sync.status.pending} pending` : ''
                    }`
                  : sync.status.phase === 'connecting'
                    ? sync.status.pending
                      ? `Reconnecting — ${sync.status.pending} change${sync.status.pending === 1 ? '' : 's'} queued`
                      : 'Waking the server — local data stays usable'
                    : `Offline — ${sync.status.pending} change${sync.status.pending === 1 ? '' : 's'} queued`
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  sync.status.phase === 'live'
                    ? 'bg-emerald-400 animate-pulse'
                    : sync.status.phase === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                }`}
              />
              <span>{phaseLabel(sync.status.phase)}</span>
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

            {/* Notification Center Bell (FEAT-50) */}
            <button
              onClick={openNotificationCenter}
              className="relative p-1.5 rounded-lg border glass-pill border-slate-700 hover:border-purple-500/40 text-slate-300 hover:text-purple-400 transition-colors active:scale-95 cursor-pointer"
              title="Universal Notification Center (FEAT-50)"
            >
              <Bell className="w-4 h-4 text-purple-400" />
              {alertBadgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {alertBadgeCount > 9 ? '9+' : alertBadgeCount}
                </span>
              )}
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
