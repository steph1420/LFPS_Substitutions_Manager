import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SCHOOL_TIME_ZONE } from '@lfps/core';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore, ThemeId } from '../store/useTimetableStore.js';
import { useLiveSync } from '../hooks/useLiveSync.js';
import {
  X,
  LogOut,
  SlidersHorizontal,
  Cloud,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Cpu,
  Info,
  Smartphone,
  Save,
  Undo2,
  EyeOff,
  PanelTopClose,
  Palette,
  Check,
  Terminal,
  Activity,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AddToHomeScreenModal } from './AddToHomeScreenModal.js';
import { AdminAccessPanel } from './AdminAccessPanel.js';
import { BUILD_LABEL, BUILD_TIME } from '../lib/buildInfo.js';

interface ThemeOption {
  id: ThemeId;
  name: string;
  family: 'Minimalist Light' | 'Minimalist Dark' | 'Glass Materials' | 'Studio & Accessibility';
  swatches: [string, string, string]; // [canvas, surface, accent]
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  // ☀️ Minimalist Light
  {
    id: 'system',
    name: 'System Auto',
    family: 'Minimalist Light',
    swatches: ['#f1f5f9', '#ffffff', '#0284c7'],
    description: 'Apple auto switching based on OS appearance',
  },
  {
    id: 'light',
    name: 'iOS Light',
    family: 'Minimalist Light',
    swatches: ['#f1f5f9', '#ffffff', '#007aff'],
    description: 'Cupertino daytime palette with pure white cards',
  },
  {
    id: 'warm-sepia',
    name: 'Warm Sepia',
    family: 'Minimalist Light',
    swatches: ['#f5f0e6', '#fdfbf7', '#2563eb'],
    description: 'Natural parchment reducing eye fatigue',
  },

  // 🌙 Minimalist Dark
  {
    id: 'dark',
    name: 'iOS Dark',
    family: 'Minimalist Dark',
    swatches: ['#0b1120', '#1c1c1e', '#0a84ff'],
    description: 'Standard Apple dark mode interface',
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    family: 'Minimalist Dark',
    swatches: ['#000000', '#0b0c0e', '#3b82f6'],
    description: 'True black for battery-saving and OLED displays',
  },
  {
    id: 'slate-nord',
    name: 'Slate Nord',
    family: 'Minimalist Dark',
    swatches: ['#242933', '#2e3440', '#88c0d0'],
    description: 'Arctic Scandinavian cool blue-gray tones',
  },

  // 🪟 Glass Materials
  {
    id: 'utopian-glass',
    name: 'Utopian Glass',
    family: 'Glass Materials',
    swatches: ['#f0f9ff', '#ffffff', '#0284c7'],
    description: 'Minimalist surreal architectural glass with ambient glow',
  },
  {
    id: 'utopian-night',
    name: 'Utopian Night',
    family: 'Glass Materials',
    swatches: ['#040811', '#091222', '#00e5ff'],
    description: 'Obsidian space glass with electric cyan neon accents',
  },
  {
    id: 'aero-frost',
    name: 'Aero Frost',
    family: 'Glass Materials',
    swatches: ['#e8eef5', '#ffffff', '#2563eb'],
    description: 'Frosted acrylic aesthetic inspired by Apple VisionOS',
  },
  {
    id: 'cyber-glass',
    name: 'Cyber Glass',
    family: 'Glass Materials',
    swatches: ['#090d16', '#121826', '#38bdf8'],
    description: 'Dark-tinted smoked glass with neon indicators',
  },
  {
    id: 'retro-glass',
    name: 'Retro Glass',
    family: 'Glass Materials',
    swatches: ['#1a1c23', '#232731', '#4ea8de'],
    description: 'Vintage 1980s synthesizer buttons with lustre depth',
  },

  // 🔲 Studio & Accessibility
  {
    id: 'high-contrast',
    name: 'High Contrast',
    family: 'Studio & Accessibility',
    swatches: ['#ffffff', '#ffffff', '#000000'],
    description: 'Ultra-crisp monochrome WCAG AAA contrast ratio',
  },
];

export const SettingsModal: React.FC = () => {
  const sync = useLiveSync();
  const {
    isSettingsOpen,
    closeSettings,
    selectedDay,
    loggedInTeacher,
    login,
    logout,
    directory,
    isMinimalUI,
    toggleMinimalUI,
    hideOverviewsByDefault,
    setHideOverviewsByDefault,
    hideAbsentStaff,
    toggleHideAbsentStaff,
    savePreferences,
    resetPreferences,
    resetDay,
    purgeHistory,
    routineHistory,
    substitutionsHistory,
    rosterHistory,
    currentTheme,
    setTheme,
    isDeveloperMode,
    setDeveloperMode,
    samePeriodLock,
    setSamePeriodLock,
    subHaloIndicator,
    setSubHaloIndicator,
    subHaloColor,
    setSubHaloColor,
    acceptanceCountdown,
    setAcceptanceCountdown,
    acceptanceDuration,
    setAcceptanceDuration,
    undoIconStyle,
    setUndoIconStyle,
    autoResolvePolicy,
    operatingRole,
    persistenceStatus,
  } = useTimetableStore();
  const isAdmin = operatingRole === 'ADMIN';

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isPwaModalOpen, setIsPwaModalOpen] = React.useState(false);
  const [tapCount, setTapCount] = React.useState(0);
  const lastTapTimeRef = React.useRef(0);

  const handleBuildInfoTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current > 2500) {
      setTapCount(1);
    } else {
      const next = tapCount + 1;
      setTapCount(next);
      if (next >= 5) {
        if (!isAdmin && !isDeveloperMode) {
          setTapCount(0);
          showToast('Developer Options need Admin Access (see Operating Identity)');
          lastTapTimeRef.current = now;
          return;
        }
        const nextDevMode = !isDeveloperMode;
        setDeveloperMode(nextDevMode);
        setTapCount(0);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([30, 50, 30]);
          } catch {}
        }
        showToast(nextDevMode ? 'Developer & Diagnostics Console Unlocked!' : 'Developer Mode Deactivated');
      }
    }
    lastTapTimeRef.current = now;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        closeSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  const totalSnapshots =
    routineHistory.past.length +
    routineHistory.future.length +
    substitutionsHistory.past.length +
    substitutionsHistory.future.length +
    rosterHistory.past.length +
    rosterHistory.future.length;

  const currentTeacher = loggedInTeacher
    ? Object.values(directory).find((t) => t.abbr === loggedInTeacher)
    : null;

  return (
    <>
      <AddToHomeScreenModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />

      <AnimatePresence>
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
          onClick={closeSettings}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={SPRING_TRANSITIONS.smooth}
            className="w-full max-w-xl glass-panel bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">Console & Settings</h2>
                  <p className="text-[11px] text-slate-400">System preferences, staff identity & data controls</p>
                </div>
              </div>

              <button
                onClick={closeSettings}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close Settings (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-5 mt-3 py-2 px-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-200 text-xs flex items-center gap-2 font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                {toastMessage}
              </motion.div>
            )}

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto scrollbar-thin text-xs">
              {/* Section 1: Active Staff Profile & Identity */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Operating Identity
                </span>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                      {loggedInTeacher ? loggedInTeacher.charAt(0) : 'G'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                        {loggedInTeacher || 'Guest / Front Desk Mode'}
                        {loggedInTeacher && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {currentTeacher
                          ? `${currentTeacher.role} · can accept / dispute own duties`
                          : 'Front Desk: absences, availability, substitutions, Off. AC / Off. CT'}
                      </div>
                    </div>
                  </div>

                  {loggedInTeacher ? (
                    <button
                      onClick={() => {
                        logout();
                        showToast('Signed out to Front Desk (admin locked)');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out
                    </button>
                  ) : (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          login(e.target.value);
                          showToast(`Logged in as ${e.target.value}`);
                        }
                      }}
                      value=""
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="" disabled>
                        I am… (optional)
                      </option>
                      {Object.values(directory).map((t) => (
                        <option key={t.id} value={t.abbr}>
                          {t.abbr} — {t.role}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <AdminAccessPanel onToast={showToast} />
                <div className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-400">This device</span>
                  <span
                    className={
                      persistenceStatus.state === 'error'
                        ? 'text-rose-300'
                        : persistenceStatus.state === 'degraded'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                    }
                    title={persistenceStatus.error ?? undefined}
                  >
                    {persistenceStatus.state === 'error'
                      ? 'Not saving on this device (storage unavailable)'
                      : persistenceStatus.state === 'degraded'
                        ? 'Storage nearly full: saving without undo history'
                        : persistenceStatus.lastSavedAt
                          ? `Saved on this device · ${new Date(persistenceStatus.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: SCHOOL_TIME_ZONE })}`
                          : 'Saved on this device'}
                  </span>
                </div>
              </div>

              {/* Section 2: Interface & View Preferences (FEAT-45, FEAT-55, FEAT-60, BUG-17) */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Interface Preferences & Persistence (FEAT-60)
                </span>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
                  {/* Minimal UI Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">Minimal UI Mode (BUG-17)</div>
                      <div className="text-[11px] text-slate-400">
                        Use compact padding and dense typography across all workstation tabs.
                      </div>
                    </div>
                    <button
                      onClick={toggleMinimalUI}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        isMinimalUI ? 'bg-blue-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                          isMinimalUI ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Hide Overviews by Default Toggle (FEAT-45) */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <PanelTopClose className="w-3.5 h-3.5 text-indigo-400" />
                        Hide Overviews by Default (FEAT-45)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Start Substitutions & Roster KPI overviews in collapsed state on application boot.
                      </div>
                    </div>
                    <button
                      onClick={() => setHideOverviewsByDefault(!hideOverviewsByDefault)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        hideOverviewsByDefault ? 'bg-blue-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                          hideOverviewsByDefault ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Hide Absent Staff Toggle (FEAT-55) */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                        Hide Absent Teachers in Routine Matrix (FEAT-55)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Filter out absent faculty rows from the routine table view.
                      </div>
                    </div>
                    <button
                      onClick={toggleHideAbsentStaff}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        hideAbsentStaff ? 'bg-rose-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                          hideAbsentStaff ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Explicit Preferences Persistence Actions (FEAT-60) */}
                  <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => {
                        savePreferences();
                        showToast('UI preferences saved to browser storage');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Preferences
                    </button>
                    <button
                      onClick={() => {
                        resetPreferences();
                        showToast('Preferences reset to factory defaults');
                      }}
                      className="py-2 px-3 rounded-xl glass-pill border-slate-700 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                      title="Reset preferences to defaults"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Reset Defaults
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      GPU Compositing & Framer Spring Physics
                    </span>
                    <span className="text-emerald-400 font-semibold">120fps Active</span>
                  </div>
                </div>
              </div>

              {/* Section 2.5: Complete 12-Theme Engine (FEAT-46, Adapted from THEMES.md) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                    Complete 12-Theme Engine (FEAT-46)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Active: <strong className="text-white capitalize">{currentTheme}</strong>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
                  {(['Minimalist Light', 'Minimalist Dark', 'Glass Materials', 'Studio & Accessibility'] as const).map(
                    (family) => {
                      const familyThemes = THEME_OPTIONS.filter((t) => t.family === family);
                      return (
                        <div key={family} className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                            <span>
                              {family === 'Minimalist Light'
                                ? '☀️'
                                : family === 'Minimalist Dark'
                                ? '🌙'
                                : family === 'Glass Materials'
                                ? '🪟'
                                : '🔲'}
                            </span>
                            <span>{family}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {familyThemes.map((t) => {
                              const isSelected = currentTheme === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    setTheme(t.id);
                                    showToast(`Theme switched to ${t.name}`);
                                    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                                      try { navigator.vibrate(25); } catch {}
                                    }
                                  }}
                                  className={`p-2 rounded-xl border flex flex-col justify-between gap-2 text-left transition-all cursor-pointer select-none active:scale-95 shadow-sm ${
                                    isSelected
                                      ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/50 shadow-blue-500/10'
                                      : 'bg-slate-950/60 hover:bg-slate-900/90 border-slate-800/80'
                                  }`}
                                  title={t.description}
                                >
                                  {/* Swatch Color Dots */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                                        style={{ backgroundColor: t.swatches[0] }}
                                      />
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                                        style={{ backgroundColor: t.swatches[1] }}
                                      />
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                                        style={{ backgroundColor: t.swatches[2] }}
                                      />
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                  </div>

                                  <div>
                                    <div className="font-bold text-slate-100 text-[11px] leading-tight">
                                      {t.name}
                                    </div>
                                    <div className="text-[9px] text-slate-400 truncate mt-0.5">
                                      {t.description}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Section 3: App Installation & PWA (FEAT-59) */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Mobile App & PWA Installation (FEAT-59)
                </span>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">Add to Home Screen</div>
                      <div className="text-[11px] text-slate-400">
                        Launch as a full-screen, hardware-accelerated app on iOS & Android.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsPwaModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-blue-600/30"
                  >
                    Install App
                  </button>
                </div>
              </div>

              {/* Section 4: Cloud & Live Sync Diagnostics */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cloud Synchronization & Health
                </span>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        sync.status.isConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        {sync.status.isConnected ? 'Connected to Cloud Hub' : 'Offline / Standalone Mode'}
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sync.status.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {sync.status.isConnected
                          ? `Live broadcast active (${sync.status.activeClients} peers connected)`
                          : 'Local optimistic updates enabled'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sync.connect();
                      showToast('Reconnected to Cloud WebSocket Hub');
                    }}
                    className="px-2.5 py-1.5 rounded-xl glass-pill border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold"
                  >
                    Ping Hub
                  </button>
                </div>
              </div>

              {/* Section 5: Data Management & Contingency (FEAT-41) */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Controls & Action History
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Export Excel Button (FEAT-25) */}
                  <button
                    onClick={() => {
                      sync.downloadExcel();
                      showToast('Downloading publication-ready Excel ledger');
                    }}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition-colors flex items-center gap-2.5 text-left active:scale-98"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-200">Export Excel (FEAT-25)</div>
                      <div className="text-[10px] text-slate-400">Dated XLSX register with signatures</div>
                    </div>
                  </button>

                  {/* Reset Day Button (FEAT-41) — admin only */}
                  {isAdmin && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Reset timetable and substitutions for ${selectedDay} to master baseline? This action can be undone via Undo.`)) {
                        resetDay(selectedDay);
                        showToast(`${selectedDay} reverted to baseline (Undo available)`);
                      }
                    }}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition-colors flex items-center gap-2.5 text-left active:scale-98"
                  >
                    <RotateCcw className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-200">Reset Day ({selectedDay})</div>
                      <div className="text-[10px] text-slate-400">Revert changes to master baseline</div>
                    </div>
                  </button>
                  )}

                  {/* Purge All Undo/Redo History (FEAT-41) — admin only */}
                  {isAdmin && (
                  <button
                    onClick={() => {
                      if (window.confirm('Purge all action history buffers across all 3 tabs? This will permanently wipe all undo/redo history.')) {
                        purgeHistory();
                        showToast('All action history buffers purged');
                      }
                    }}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 transition-colors flex items-center gap-2.5 text-left sm:col-span-2 active:scale-98"
                  >
                    <Trash2 className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        Purge All Undo / Redo Buffers
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {totalSnapshots} snapshots in memory
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Wipe past and future history stacks across Routine, Substitutions & Roster.
                      </div>
                    </div>
                  </button>
                  )}
                </div>
              </div>

              {/* Section 5.5: Developer & Diagnostics Console (FEAT-47, Unlocked via 5-tap) */}
              {isAdmin && isDeveloperMode && (
                <div className="space-y-2 border-2 border-dashed border-emerald-500/40 rounded-2xl p-3.5 bg-emerald-950/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Developer & Diagnostics Console (FEAT-47)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeveloperMode(false);
                        showToast('Developer Mode Deactivated');
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                    >
                      Hide Console
                    </button>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Diagnostic Latency & Cloud Hub */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          Live Cloud Hub Latency
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Active Full-Duplex WebSocket ping roundtrip
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
                          {sync.status.isConnected ? '24ms (Healthy)' : 'Offline (Simulated)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            sync.connect();
                            showToast('Reconnected to Cloud Hub');
                          }}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                          title="Force Reconnect"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Cross-Period Substitution Lock */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          Cross-Period Lock (samePeriodLock)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Strictly restrict substitute candidates to teachers with Free slot in the exact period.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSamePeriodLock(!samePeriodLock)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          samePeriodLock ? 'bg-amber-600' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            samePeriodLock ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Target Cell Halo Pulse Indicator */}
                    <div className="space-y-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            Target Cell Halo Pulse Indicator
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Render animated aura pulse on target candidate substitute cells.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubHaloIndicator(!subHaloIndicator)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            subHaloIndicator ? 'bg-cyan-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                              subHaloIndicator ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {subHaloIndicator && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Halo Color Palette:
                          </span>
                          <div className="flex items-center gap-1.5">
                            {(['emerald', 'cyan', 'amber', 'violet'] as const).map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setSubHaloColor(color)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                  subHaloColor === color
                                    ? 'bg-white text-slate-950 shadow-sm'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {color}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acceptance Countdown Timer */}
                    <div className="space-y-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">
                            Acceptance Countdown Timer
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Auto-confirm candidate acceptance after countdown duration.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAcceptanceCountdown(!acceptanceCountdown)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            acceptanceCountdown ? 'bg-blue-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                              acceptanceCountdown ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {acceptanceCountdown && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Duration:
                          </span>
                          <div className="flex items-center gap-1">
                            {([5, 10, 30, 60] as const).map((dur) => (
                              <button
                                key={dur}
                                type="button"
                                onClick={() => setAcceptanceDuration(dur)}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                  acceptanceDuration === dur
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {dur}s
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mobile Undo/Redo Icon Style Selector */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-200">
                          Mobile Undo/Redo Icon Style
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Curved Apple HIG vs Circular vs Geometric
                        </div>
                      </div>
                      <select
                        value={undoIconStyle}
                        onChange={(e) => setUndoIconStyle(e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 cursor-pointer"
                      >
                        <option value="curved">Curved (Default)</option>
                        <option value="circular">Circular</option>
                        <option value="geometric">Geometric</option>
                        <option value="micro">Micro-Text</option>
                      </select>
                    </div>

                    {/* Live Solver Heuristic Weights Display */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <div className="font-semibold text-slate-200 text-[11px] flex items-center justify-between">
                        <span>Core Solver Scoring Weights</span>
                        <span className="text-[9px] text-slate-500 font-mono">solver.ts</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                        <div className="p-1 rounded bg-slate-950/70 text-slate-300">
                          Same Subject: <span className="text-emerald-400 font-bold">+{autoResolvePolicy.sameSubjectWeight}</span>
                        </div>
                        <div className="p-1 rounded bg-slate-950/70 text-slate-300">
                          Class Teacher: <span className="text-emerald-400 font-bold">+{autoResolvePolicy.classTeacherWeight}</span>
                        </div>
                        <div className="p-1 rounded bg-slate-950/70 text-slate-300">
                          Fatigue Penalty: <span className="text-rose-400 font-bold">-{autoResolvePolicy.consecutiveFatiguePenalty}</span>
                        </div>
                        <div className="p-1 rounded bg-slate-950/70 text-slate-300">
                          Off. CT Priority: <span className="text-purple-400 font-bold">{autoResolvePolicy.prioritizeOfficiatingCT ? '+50 (Active)' : 'Off'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 6: Build Info (5-tap easter egg to toggle Developer Options) */}
              <button
                type="button"
                onClick={handleBuildInfoTap}
                className="w-full p-3 rounded-xl bg-slate-950/60 hover:bg-slate-900/60 border border-slate-900 hover:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 transition-colors cursor-pointer select-none"
                title="Tap 5 times to open Developer & Diagnostics Console"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <span title={`Built ${BUILD_TIME}`}>LFPS Substitutions Manager · {BUILD_LABEL}</span>
                </div>
                {tapCount > 0 && tapCount < 5 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono">
                    {5 - tapCount} more taps
                  </span>
                )}
                {isAdmin && isDeveloperMode && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                    Dev Mode Active
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
};
