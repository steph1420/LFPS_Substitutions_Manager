import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Trash2, ArrowUpRight } from 'lucide-react';
import { useTimetableStore, DisplacedItem } from '../store/useTimetableStore.js';

export const LimboTray: React.FC = () => {
  const { selectedDay, displaced, restoreDisplacedItem, clearDisplaced } = useTimetableStore();
  const [shakingItemId, setShakingItemId] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const items: DisplacedItem[] = displaced[selectedDay] || [];

  const handleCardClick = (item: DisplacedItem) => {
    const result = restoreDisplacedItem(item);
    if (result.success) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
      setStatusMessage(`Restored ${item.task} to ${item.ogTeacher} (${item.period})`);
      setTimeout(() => setStatusMessage(null), 2500);
    } else {
      setShakingItemId(item.id);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 50, 40]);
        } catch {}
      }
      setStatusMessage(result.reason || 'Cannot restore: slot is occupied');
      setTimeout(() => {
        setShakingItemId(null);
        setStatusMessage(null);
      }, 3000);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: DisplacedItem) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'limbo',
        item,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          key="limbo-tray"
          initial={{ opacity: 0, height: 0, y: 10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: 10 }}
          transition={{ duration: 0.25, ease: [0.2, 0.9, 0.3, 1] }}
          className="w-full mt-3 overflow-hidden"
        >
          <div className="w-full rounded-xl sm:rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-950/15 p-3 sm:p-4 backdrop-blur-md shadow-lg transition-all">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-amber-300">
                      Displaced Classes (Limbo Tray)
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/25 border border-amber-500/40 text-amber-300">
                      {items.length}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-amber-200/70">
                    Drag onto any free cell to reallocate, or tap a card to restore to its original slot.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => clearDisplaced(selectedDay)}
                  className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-[10px] sm:text-xs text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Clear all displaced classes for today"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              </div>
            </div>

            {/* Status notification toast inside tray */}
            {statusMessage && (
              <div className="mt-2 text-[11px] font-medium text-amber-200 bg-amber-950/60 border border-amber-500/30 rounded-lg px-2.5 py-1">
                {statusMessage}
              </div>
            )}

            {/* Displaced Cards Flow */}
            <div className="flex flex-wrap gap-2 sm:gap-2.5 pt-3">
              {items.map((item) => {
                const isShaking = shakingItemId === item.id;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => handleCardClick(item)}
                    className={`group relative rounded-xl px-3 py-2 bg-slate-900/90 border border-amber-500/50 hover:border-amber-400 shadow-md hover:shadow-amber-500/20 transition-all cursor-grab active:cursor-grabbing select-none ${
                      isShaking ? 'animate-shake border-rose-500 bg-rose-950/40' : ''
                    }`}
                    title={`Click to restore to ${item.ogTeacher} (${item.period}) or drag onto any grid cell`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold text-xs sm:text-sm text-amber-300">
                        {item.task}
                      </div>
                      <div className="w-4 h-4 rounded-full bg-amber-500/20 group-hover:bg-amber-500/40 flex items-center justify-center text-amber-300 text-[10px] transition-colors">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5">
                      From: <span className="text-slate-300">{item.ogTeacher}</span> ({item.period})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
