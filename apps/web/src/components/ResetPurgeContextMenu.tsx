import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Trash2 } from 'lucide-react';

export const ResetPurgeContextMenu: React.FC = () => {
  const {
    activeResetPurgeMenu,
    closeResetPurgeMenu,
    purgeHistory,
    routineHistory,
    substitutionsHistory,
    rosterHistory,
  } = useTimetableStore();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape key (LOGIC-02)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeResetPurgeMenu();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeResetPurgeMenu();
      }
    };

    if (activeResetPurgeMenu) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeResetPurgeMenu, closeResetPurgeMenu]);

  if (!activeResetPurgeMenu) return null;

  const totalSnapshots =
    routineHistory.past.length +
    routineHistory.future.length +
    substitutionsHistory.past.length +
    substitutionsHistory.future.length +
    rosterHistory.past.length +
    rosterHistory.future.length;

  const menuWidth = 240;
  const menuHeight = 135;
  const clampedX = Math.min(Math.max(12, activeResetPurgeMenu.x), window.innerWidth - menuWidth - 12);
  const clampedY = Math.min(Math.max(12, activeResetPurgeMenu.y), window.innerHeight - menuHeight - 12);

  const triggerHaptic = (ms = 40) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-auto">
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={SPRING_TRANSITIONS.snappy}
          style={{ top: clampedY, left: clampedX }}
          className="absolute w-[240px] bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-3 shadow-2xl shadow-black/80 flex flex-col gap-2 z-50 text-xs select-none"
        >
          <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-slate-800 pb-1.5">
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span>Purge Action History</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-tight">
            Permanently clear all undo & redo buffers across Routine, Substitutions, and Staff Roster ({totalSnapshots} snapshots).
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={closeResetPurgeMenu}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                purgeHistory();
                triggerHaptic(50);
                closeResetPurgeMenu();
              }}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/30 transition-colors text-center cursor-pointer"
            >
              Purge All
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
