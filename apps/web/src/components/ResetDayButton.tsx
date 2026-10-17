import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useTimetableStore } from '../store/useTimetableStore.js';

interface ResetDayButtonProps {
  compact?: boolean;
}

export const ResetDayButton: React.FC<ResetDayButtonProps> = ({ compact = false }) => {
  const { selectedDay, resetDay, purgeHistory, routineHistory, substitutionsHistory, rosterHistory } =
    useTimetableStore();

  const [showPurgeMenu, setShowPurgeMenu] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const totalSnapshots =
    routineHistory.past.length +
    routineHistory.future.length +
    substitutionsHistory.past.length +
    substitutionsHistory.future.length +
    rosterHistory.past.length +
    rosterHistory.future.length;

  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  // Handle right-click (desktop)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(40);
    setShowPurgeMenu(true);
  };

  // Handle touch long-press (mobile)
  const handleTouchStart = () => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      triggerHaptic(40);
      setShowPurgeMenu(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      return;
    }
    triggerHaptic(20);
    if (window.confirm(`Reset timetable and substitutions for ${selectedDay} to baseline? (This can be undone with ⌘Z)`)) {
      resetDay(selectedDay);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        className={`flex items-center gap-1.5 rounded-lg border transition-all text-xs font-semibold select-none active:scale-95 ${
          compact
            ? 'p-1.5 glass-pill border-slate-700/60 text-slate-300 hover:text-amber-400 hover:border-amber-500/40'
            : 'px-2.5 py-1 glass-pill border-slate-700/60 text-slate-300 hover:text-amber-400 hover:border-amber-500/40'
        }`}
        title={`Reset ${selectedDay} to baseline (Long press or right-click to purge history)`}
      >
        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
        {!compact && <span className="hidden sm:inline">Reset Day</span>}
      </button>

      {/* Floating Micro Context Menu for History Purge */}
      <AnimatePresence>
        {showPurgeMenu && (
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setShowPurgeMenu(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 6 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-3 max-w-xs w-full space-y-2.5 text-xs select-none"
            >
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Trash2 className="w-4 h-4" />
                <span>Purge Action History</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Permanently clear all undo & redo buffers across Routine, Substitutions, and Staff Roster ({totalSnapshots} snapshots).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowPurgeMenu(false)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    purgeHistory();
                    setShowPurgeMenu(false);
                    triggerHaptic(50);
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/30 transition-colors"
                >
                  Purge All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
