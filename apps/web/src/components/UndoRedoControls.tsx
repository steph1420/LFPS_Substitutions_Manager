import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { useTimetableStore, ActiveTab } from '../store/useTimetableStore.js';

import styles from './UndoRedoControls.module.css';

interface UndoRedoControlsProps {
  tab?: ActiveTab;
  compact?: boolean;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({ tab, compact = false }) => {
  const { undo, redo, routineHistory, substitutionsHistory, rosterHistory, activeTab } =
    useTimetableStore();

  const targetTab = tab || activeTab;

  const canUndo =
    targetTab === 'routine'
      ? routineHistory.past.length > 0
      : targetTab === 'substitutions'
      ? substitutionsHistory.past.length > 0
      : rosterHistory.past.length > 0;

  const canRedo =
    targetTab === 'routine'
      ? routineHistory.future.length > 0
      : targetTab === 'substitutions'
      ? substitutionsHistory.future.length > 0
      : rosterHistory.future.length > 0;

  const triggerHaptic = (ms = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className={styles.div1}>
      <button
        onClick={() => {
          if (canUndo) {
            triggerHaptic(20);
            undo(targetTab);
          }
        }}
        disabled={!canUndo}
        className={`${styles.button1A} ${
          canUndo
            ? styles.button1B
            : styles.button1C
        }`}
        title={`Undo in ${targetTab} (⌘Z)`}
      >
        <Undo2 className={styles.undo21} />
        {!compact && <span className={styles.span1}>Undo</span>}
      </button>

      <button
        onClick={() => {
          if (canRedo) {
            triggerHaptic(20);
            redo(targetTab);
          }
        }}
        disabled={!canRedo}
        className={`${styles.button2A} ${
          canRedo
            ? styles.button2B
            : styles.button2C
        }`}
        title={`Redo in ${targetTab} (⌘⇧Z)`}
      >
        <Redo2 className={styles.redo21} />
        {!compact && <span className={styles.span2}>Redo</span>}
      </button>
    </div>
  );
};

