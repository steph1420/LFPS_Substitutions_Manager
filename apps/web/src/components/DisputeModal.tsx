import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Flag, X, AlertTriangle, Send } from 'lucide-react';

const PRESET_DISPUTE_REASONS = [
  '🚌 Bus Duty scheduled',
  '👥 Parent-Teacher Meeting (PTM)',
  '📑 Exam Invigilation scheduled',
  '🔬 Lab / Practical setup',
  '🩺 Health & First Aid Duty',
];

export const DisputeModal: React.FC = () => {
  const { activeDisputeTarget, closeDisputeModal, disputeSubstitution } = useTimetableStore();
  const [reason, setReason] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDisputeModal();
    };
    if (activeDisputeTarget) {
      window.addEventListener('keydown', handleKeyDown);
      setReason('');
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDisputeTarget, closeDisputeModal]);

  if (!activeDisputeTarget) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason.trim() || 'Teacher unable to cover duty';
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch {}
    }
    disputeSubstitution(activeDisputeTarget.id, finalReason);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
        onClick={closeDisputeModal}
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={SPRING_TRANSITIONS.bouncy}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 select-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-amber-400" />
                  Dispute Substitution Duty
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Period <span className="text-blue-400 font-bold">{activeDisputeTarget.period}</span> &bull;{' '}
                <span className="text-amber-400 font-semibold">{activeDisputeTarget.className}</span> &bull;{' '}
                Sub for <span className="text-rose-400 font-semibold">{activeDisputeTarget.originalTeacher}</span>
              </p>
            </div>
            <button
              onClick={closeDisputeModal}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Context callout */}
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Disputing this assignment alerts the school coordinator immediately so an alternate substitute can be appointed.
              </span>
            </div>

            {/* Quick Reason Chips */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Reason Presets:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_DISPUTE_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      reason === preset
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Remarks / Additional Details:
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State why you are unable to take this period (e.g. Lab setup, PTM scheduled)..."
                rows={3}
                className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={closeDisputeModal}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Dispute
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
