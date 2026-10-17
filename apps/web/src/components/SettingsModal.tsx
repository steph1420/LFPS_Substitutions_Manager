import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
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
} from 'lucide-react';

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
    resetDay,
    purgeHistory,
    routineHistory,
    substitutionsHistory,
    rosterHistory,
  } = useTimetableStore();

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pointer-events-auto">
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
                      {currentTeacher ? currentTeacher.role : 'Read & administrative front-desk access'}
                    </div>
                  </div>
                </div>

                {loggedInTeacher ? (
                  <button
                    onClick={() => {
                      logout();
                      showToast('Logged out to Front Desk mode');
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
                      Select Teacher Login...
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

            {/* Section 2: Interface Preferences */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Interface & Performance
              </span>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Minimal UI Mode</div>
                    <div className="text-[11px] text-slate-400">
                      Use ultra-compact micro-menus and high-density cards for maximum velocity.
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

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    GPU Compositing & Framer Spring Physics
                  </span>
                  <span className="text-emerald-400 font-semibold">120fps Active</span>
                </div>
              </div>
            </div>

            {/* Section 3: Cloud & Live Sync Diagnostics */}
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

            {/* Section 4: Data Management & Contingency (FEAT-41) */}
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

                {/* Reset Day Button (FEAT-41) */}
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

                {/* Purge All Undo/Redo History (FEAT-41) */}
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
              </div>
            </div>

            {/* Section 5: Build Info */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-900 flex items-center gap-2 text-[10px] text-slate-500">
              <Info className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <span>LFPS Substitutions Manager Next-Gen v2.0-alpha.1 • React 19 + TypeScript + Go Cloud API</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
