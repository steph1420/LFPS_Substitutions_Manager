import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { useTimetableStore, ActiveTab } from '../store/useTimetableStore.js';

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
    <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 text-xs font-semibold">
      <button
        onClick={() => {
          if (canUndo) {
            triggerHaptic(20);
            undo(targetTab);
          }
        }}
        disabled={!canUndo}
        className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95 ${
          canUndo
            ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer'
            : 'text-slate-600 cursor-not-allowed opacity-40'
        }`}
        title={`Undo in ${targetTab} (⌘Z)`}
      >
        <Undo2 className="w-3.5 h-3.5 text-blue-400" />
        {!compact && <span className="hidden sm:inline">Undo</span>}
      </button>

      <button
        onClick={() => {
          if (canRedo) {
            triggerHaptic(20);
            redo(targetTab);
          }
        }}
        disabled={!canRedo}
        className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95 ${
          canRedo
            ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer'
            : 'text-slate-600 cursor-not-allowed opacity-40'
        }`}
        title={`Redo in ${targetTab} (⌘⇧Z)`}
      >
        <Redo2 className="w-3.5 h-3.5 text-blue-400" />
        {!compact && <span className="hidden sm:inline">Redo</span>}
      </button>
    </div>
  );
};
