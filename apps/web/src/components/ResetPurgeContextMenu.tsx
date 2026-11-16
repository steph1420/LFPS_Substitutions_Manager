import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Trash2 } from 'lucide-react';

import styles from './ResetPurgeContextMenu.module.css';

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
      <div className={styles.div1}>
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={SPRING_TRANSITIONS.snappy}
          style={{ top: clampedY, left: clampedX }}
          className={styles.motionDiv1}
        >
          <div className={styles.div2}>
            <Trash2 className={styles.trash21} />
            <span>Purge Action History</span>
          </div>

          <p className={styles.p1}>
            Permanently clear all undo & redo buffers across Routine, Substitutions, and Staff Roster ({totalSnapshots} snapshots).
          </p>

          <div className={styles.div3}>
            <button
              onClick={closeResetPurgeMenu}
              className={styles.button1}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                purgeHistory();
                triggerHaptic(50);
                closeResetPurgeMenu();
              }}
              className={styles.button2}
            >
              Purge All
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

