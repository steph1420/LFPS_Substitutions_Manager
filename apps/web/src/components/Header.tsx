import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { DayOfWeek, schoolDayForDate, dateForSchoolDay } from '@lfps/core';
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
import { syncDisplay } from '../sync/status.js';
import { ResetDayButton } from './ResetDayButton.js';
import { APP_VERSION, BUILD_LABEL, GIT_BRANCH, IS_PREVIEW_BUILD, PREVIEW_INDEX_HREF } from '../lib/buildInfo.js';
import { AddToHomeScreenModal } from './AddToHomeScreenModal.js';
import {
  APP_SCROLL_ID,
  readDevUiPrefs,
  writeDevUiPrefs,
  type HeaderScrollMode,
  type DevUiPrefs,
} from '../lib/devUiPrefs.js';

import styles from './Header.module.css';
import { ISLAND_BACKDROP_FADE, ISLAND_SPRING } from '../motion/tokens.js';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

type HeaderState = 'FULL' | 'PILL';

export const Header: React.FC = () => {
  const sync = useLiveSync();
  const syncPill = syncDisplay({
    phase: sync.status.phase,
    mode: sync.status.mode,
    sheetsState: sync.status.sheetsState,
    pending: sync.status.pending,
    clients: sync.status.activeClients,
    error: sync.status.error,
  });
  const {
    selectedDay,
    setDay,
    activeWeekStart,
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
  const [devUiPrefs, setDevUiPrefs] = React.useState<DevUiPrefs>(() => readDevUiPrefs());

  const todaySchoolDay = React.useMemo(() => schoolDayForDate(new Date()), [selectedDay]);

  React.useEffect(() => {
    headerStateRef.current = headerState;
  }, [headerState]);

  // Re-read Dev Options when storage changes (same tab via custom event, other tabs via storage)
  React.useEffect(() => {
    const sync = () => {
      const prefs = readDevUiPrefs();
      setHeaderScrollMode(prefs.headerScrollMode);
      setDevUiPrefs(prefs);
    };
    window.addEventListener('storage', sync);
    window.addEventListener('lfps-dev-ui-prefs', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('lfps-dev-ui-prefs', sync);
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
    // FEAT-70: remember free-pick day on this device
    if (readDevUiPrefs().dayLoadMode === 'free') {
      writeDevUiPrefs({ lastFreeDay: day });
    }

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

  // BUG-29 / UI-10 / BUG-35: scroll-active hide/show (not only after finger release / at top).
  // Bundle 41a: evaluate every rAF while scrolling; scroll-up → FULL anywhere; keep IGNORE_DELTA.
  React.useEffect(() => {
    let rafId: number | null = null;
    let viewportFreezeUntil = 0;
    // Enter PILL past ENTER_PILL on scroll-down; scroll-up expands FULL mid-page (classic).
    const ENTER_PILL = 72;
    const EXIT_FULL = 16;
    const IGNORE_DELTA = 14; // mobile chrome show/hide noise
    const ACTIVATE_DELTA = 6; // intentional direction (active scroll)
    const TRANSITION_LOCK_MS = 260;
    const VIEWPORT_FREEZE_MS = 380;

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
      }, TRANSITION_LOCK_MS);
    };

    const evaluate = () => {
      if (isDayChangingRef.current) {
        lastScrollYRef.current = readScrollY();
        return;
      }
      if (isTransitioningRef.current) return;
      if (Date.now() < viewportFreezeUntil) {
        lastScrollYRef.current = readScrollY();
        return;
      }

      const currentScrollY = readScrollY();
      const prev = lastScrollYRef.current;
      const delta = currentScrollY - prev;
      lastScrollYRef.current = currentScrollY;

      const absDelta = Math.abs(delta);
      // Both UI-10 modes: ignore tiny jumps (iOS/Android toolbar).
      if (absDelta > 0 && absDelta < IGNORE_DELTA && currentScrollY > EXIT_FULL) {
        return;
      }

      // Near top → always FULL (rubber-band / programmatic).
      if (currentScrollY <= EXIT_FULL) {
        applyState('FULL');
        return;
      }

      // Active scroll-down → PILL; active scroll-up → FULL (not only at top).
      if (delta > ACTIVATE_DELTA && currentScrollY > ENTER_PILL) {
        applyState('PILL');
      } else if (delta < -ACTIVATE_DELTA) {
        applyState('FULL');
      }
    };

    const handleScroll = () => {
      // Evaluate on the next frame while scrolling — no post-scroll debounce lag (BUG-35).
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        evaluate();
      });
    };

    // visualViewport resize/scroll (toolbar) — freeze flips; resync baseline only.
    const handleViewportNoise = () => {
      viewportFreezeUntil = Date.now() + VIEWPORT_FREEZE_MS;
      lastScrollYRef.current = readScrollY();
    };

    const scrollTarget: HTMLElement | Window =
      headerScrollMode === 'container'
        ? document.getElementById(APP_SCROLL_ID) ?? window
        : window;

    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', handleViewportNoise);
    window.visualViewport?.addEventListener('scroll', handleViewportNoise, { passive: true });
    // Initial sync
    lastScrollYRef.current = readScrollY();

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll as EventListener);
      window.visualViewport?.removeEventListener('resize', handleViewportNoise);
      window.visualViewport?.removeEventListener('scroll', handleViewportNoise);
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
          className={styles.motionButton1}
          title="Tap to change timetable day"
        >
          <span
            className={`${styles.span1} ${
              sync.status.phase === 'live'
                ? 'status-dot-live'
                : sync.status.phase === 'connecting'
                  ? 'status-dot-connecting'
                  : 'status-dot-offline'
            }`}
          />
          <span className={styles.span2}>{selectedDay}</span>
          <ChevronDown className={styles.chevronDown1} />
        </motion.button>
      ) : (
        <motion.div
          layoutId="dynamic-island-day-bar"
          key="island-expanded"
          transition={ISLAND_SPRING}
          className={styles.motionDiv1}
        >
          <div className={styles.div1}>
            {DAYS.map((day) => {
              const isActive = selectedDay === day;
              const isToday = todaySchoolDay === day;
              const dateIso = activeWeekStart ? dateForSchoolDay(activeWeekStart, day) : '';
              const dateShort = dateIso ? dateIso.slice(8) : ''; // DD
              return (
                <button
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  title={isToday ? `Today · ${dateIso}` : dateIso || day}
                  className={`${styles.button1A} ${
                    isActive
                      ? styles.button1B
                      : styles.button1C
                  } ${isToday && !isActive ? styles.button1D : ''}`}
                >
                  <span className={styles.span3}>
                    <span className={styles.span4}>
                      {day}
                      {isToday && (
                        <span className={styles.span5} aria-label="Today" />
                      )}
                    </span>
                    {devUiPrefs.dayLoadMode === 'free' && dateShort && (
                      <span className={`${styles.span6A} ${isActive ? styles.span6B : styles.span6C}`}>
                        {dateShort}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setIsIslandExpanded(false);
              if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
            }}
            className={styles.button2}
            title="Close Day Selector"
          >
            <X className={styles.x1} />
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
            transition={ISLAND_BACKDROP_FADE}
            className={styles.motionDiv2}
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
            className={styles.motionDiv3}
          >
            <div className={styles.div2}>{renderIslandContent()}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATE 1 & 4: FULL ELEVATED HEADER — Bundle 40 phone: row1 brand+actions, row2 days */}
      <motion.header
        data-testid="app-header-full"
        data-auth={loggedInTeacher ? (isAdmin ? 'admin' : 'teacher') : 'guest'}
        animate={{
          y: headerState === 'FULL' ? 0 : -220,
          opacity: headerState === 'FULL' ? 1 : 0,
        }}
        transition={SPRING_TRANSITIONS.smooth}
        className={`${styles.appHeaderFull1} header-elevated`}
      >
        <div className={styles.div3}>
          {/* Row 1 (mobile) / Brand column (desktop): logo + status + actions */}
          <div className={styles.div4}>
            <div className={styles.div5}>
              <div className={styles.div6}>
                L
              </div>
              <div className={styles.div7}>
                <h1 className={styles.h11}>
                  <span className={styles.span7}>LFPS Manager</span>
                  <span className={styles.span8}>LFPS Manager</span>
                  <span
                    className={styles.span9}
                    title={BUILD_LABEL}
                  >
                    v{APP_VERSION}
                  </span>
                  {IS_PREVIEW_BUILD && (
                    <a
                      href={PREVIEW_INDEX_HREF}
                      className={styles.a1}
                      title={`Preview · ${GIT_BRANCH}`}
                      aria-label={`Preview build ${GIT_BRANCH}`}
                    />
                  )}
                  {isAdmin && (
                    <span
                      className={styles.span10}
                      title="Signed in as admin in this tab (Log Out ends it)"
                    >
                      Admin
                    </span>
                  )}
                  {editingUnlocked && (
                    <span
                      className={styles.editingUnlockedBadge1}
                      title="Dev Options: editing allowed on this device without login (turn off in Settings)"
                      data-testid="editing-unlocked-badge"
                    >
                      Editing unlocked
                    </span>
                  )}
                  {editingUnlocked && (
                    <span
                      className={styles.editingUnlockedBadge2}
                      title="Editing unlocked on this device"
                      data-testid="editing-unlocked-badge"
                      aria-label="Editing unlocked"
                    />
                  )}
                </h1>
                <p className={styles.p1}>
                  Preparatory Timetable & Substitutions
                </p>
              </div>
            </div>

            {/* Mobile action cluster — icons only; account separate from logout */}
            <div className={styles.headerMobileActions1} data-testid="header-mobile-actions">
              <button
                type="button"
                data-testid="sync-pill-mobile"
                data-phase={sync.status.phase}
                data-tone={syncPill.tone}
                onClick={openSettings}
                className={`${styles.syncPillMobile1A} ${
                  syncPill.tone === 'live'
                    ? styles.syncPillMobile1B
                    : syncPill.tone === 'error'
                      ? styles.syncPillMobile1C
                      : syncPill.tone === 'warn'
                        ? styles.syncPillMobile1D
                        : styles.syncPillMobile1E
                }`}
                title={syncPill.title}
                aria-label={`${syncPill.label}. Open Cloud settings.`}
              >
                <span
                  className={`${styles.span11} ${
                    syncPill.tone === 'live'
                      ? 'status-dot-live'
                      : syncPill.tone === 'offline'
                        ? 'status-dot-offline'
                        : 'status-dot-connecting'
                  }`}
                />
                <span className={styles.span12}>
                  {syncPill.tone === 'live'
                    ? 'Live'
                    : syncPill.tone === 'error'
                      ? 'Err'
                      : syncPill.tone === 'offline'
                        ? 'Off'
                        : '…'}
                </span>
              </button>
              <button
                onClick={openNotificationCenter}
                className={`${styles.button3} glass-pill`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className={styles.bell1} />
                {alertBadgeCount > 0 && (
                  <span className={styles.span13}>
                    {alertBadgeCount > 9 ? '9+' : alertBadgeCount}
                  </span>
                )}
              </button>
              <button
                onClick={openSettings}
                className={`${styles.button4} glass-pill`}
                title="Console & Settings"
                aria-label="Console & Settings"
              >
                <SlidersHorizontal className={styles.slidersHorizontal1} />
              </button>
              {loggedInTeacher ? (
                <div className={`${styles.div8} glass-pill`}>
                  <span className={styles.span14} title={loggedInTeacher}>
                    {loggedInTeacher}
                  </span>
                  <button
                    onClick={logout}
                    className={styles.button5}
                    title="Log Out"
                    aria-label="Log Out"
                  >
                    <LogOut className={styles.logOut1} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={openStaffLogin}
                  className={`${styles.button6} glass-pill`}
                  aria-label="Staff Login"
                >
                  <User className={styles.user1} />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2 (mobile) / Center (desktop): Day bar — dedicated full width on phone */}
          <div
            className={`${styles.div9A} scrollbar-thin ${
              headerState === 'FULL' ? styles.div9B : styles.div9C
            }`}
            aria-hidden={headerState !== 'FULL'}
          >
            <div className={styles.div10}>
              {headerState === 'FULL' ? (
                <motion.div
                  layoutId="dynamic-island-day-bar"
                  transition={ISLAND_SPRING}
                  className={styles.motionDiv4}
                >
                  {DAYS.map((day) => {
                    const isActive = selectedDay === day;
                    const isToday = todaySchoolDay === day;
                    const dateIso = activeWeekStart ? dateForSchoolDay(activeWeekStart, day) : '';
                    const dateShort = dateIso ? dateIso.slice(8) : '';
                    return (
                      <button
                        key={day}
                        onClick={() => handleSelectDay(day)}
                        title={isToday ? `Today · ${dateIso}` : dateIso || day}
                        className={`${styles.button7A} ${
                          isActive ? styles.button7B : styles.button7C
                        } ${isToday && !isActive ? styles.button7D : ''}`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeDockedDayHighlight"
                            transition={SPRING_TRANSITIONS.snappy}
                            className={styles.motionDiv5}
                          />
                        )}
                        <span className={styles.span15}>
                          <span className={styles.span16}>
                            {day}
                            {isToday && (
                              <span className={styles.span17} aria-label="Today" />
                            )}
                          </span>
                          {devUiPrefs.dayLoadMode === 'free' && dateShort && (
                            <span className={`${styles.span18A} ${isActive ? styles.span18B : styles.span18C}`}>
                              {dateShort}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <div className={styles.div11} />
              )}
            </div>
          </div>

          {/* Desktop controls */}
          <div className={styles.div12}>
            {/* Live sync status pill (Bundle 35 + FIND-05 honesty) */}
            <button
              type="button"
              data-testid="sync-pill"
              data-phase={sync.status.phase}
              data-tone={syncPill.tone}
              onClick={openSettings}
              className={`${styles.syncPill1A} ${
                syncPill.tone === 'live'
                  ? styles.syncPill1B
                  : syncPill.tone === 'error'
                    ? styles.syncPill1C
                    : syncPill.tone === 'warn'
                      ? styles.syncPill1D
                      : styles.syncPill1E
              }`}
              title={syncPill.title}
              aria-label={`${syncPill.label}. Open Cloud settings.`}
            >
              <span
                className={`${styles.span19} ${
                  syncPill.tone === 'live'
                    ? 'status-dot-live'
                    : syncPill.tone === 'offline'
                      ? 'status-dot-offline'
                      : 'status-dot-connecting'
                }`}
              />
              <span>{syncPill.label}</span>
            </button>

            {/* Reset Day Button (FEAT-41) */}
            <ResetDayButton />

            {/* Add to Home Screen PWA Install (FEAT-59) */}
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className={`${styles.button8} glass-pill`}
              title="Add to Home Screen / Install PWA"
              aria-label="Add to Home Screen"
            >
              <Smartphone className={styles.smartphone1} />
            </button>

            {/* Export Excel Button (FEAT-25) */}
            <button
              onClick={() => sync.downloadExcel()}
              className={`${styles.button9} glass-pill`}
              title="Download Dated Excel Register"
            >
              <FileSpreadsheet className={styles.fileSpreadsheet1} />
              <span>Excel</span>
            </button>

            {/* Notification Center Bell (FEAT-50) */}
            <button
              onClick={openNotificationCenter}
              className={`${styles.button10} glass-pill`}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className={styles.bell2} />
              {alertBadgeCount > 0 && (
                <span className={styles.span20}>
                  {alertBadgeCount > 9 ? '9+' : alertBadgeCount}
                </span>
              )}
            </button>

            {/* Settings Console Button (BUG-11) */}
            <button
              onClick={openSettings}
              className={`${styles.button11} glass-pill`}
              title="Console & Settings"
              aria-label="Console & Settings"
            >
              <SlidersHorizontal className={styles.slidersHorizontal2} />
            </button>

            {loggedInTeacher ? (
              <div className={`${styles.div13} glass-pill`}>
                <span className={`${styles.span21} status-dot-live`} />
                <span className={styles.span22}>{loggedInTeacher}</span>
                <button
                  onClick={logout}
                  className={styles.button12}
                  title="Log Out"
                >
                  <LogOut className={styles.logOut2} />
                </button>
              </div>
            ) : (
              <button
                onClick={openStaffLogin}
                className={`${styles.button13} glass-pill`}
              >
                <User className={styles.user2} />
                Staff Login
              </button>
            )}
          </div>
        </div>
      </motion.header>
    </>
  );
};
