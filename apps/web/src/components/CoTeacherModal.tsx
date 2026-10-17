import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Users, X, UserMinus, ShieldAlert } from 'lucide-react';

export const CoTeacherModal: React.FC = () => {
  const {
    activeCoTeachSlot,
    closeCoTeachModal,
    releaseCoTeacher,
    selectedDay,
    schedule,
  } = useTimetableStore();

  if (!activeCoTeachSlot) return null;

  const { period, teacher, partnerTeacher, className, subject } = activeCoTeachSlot;
  const currentSlot = schedule[selectedDay]?.[period];

  const teachersInSlot: string[] = [teacher];
  if (partnerTeacher && !teachersInSlot.includes(partnerTeacher)) {
    teachersInSlot.push(partnerTeacher);
  }

  // Also check if any other teachers are co-assigned to this same class and subject in this period
  if (currentSlot) {
    Object.entries(currentSlot).forEach(([tName, task]) => {
      if (
        task.includes(className) &&
        task.includes(subject) &&
        !teachersInSlot.includes(tName)
      ) {
        teachersInSlot.push(tName);
      }
    });
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        onClick={closeCoTeachModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={SPRING_TRANSITIONS.bouncy}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Co-Teaching Period Inspector
              </h3>
              <p className="text-[11px] text-slate-400">
                {period} Period • {className} ({subject})
              </p>
            </div>
            <button
              onClick={closeCoTeachModal}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Operational Policy Banner (FEAT-31 Rationale) */}
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Per-Period Release (FEAT-31):</strong> Releasing a co-teacher applies strictly to this single period. Their solo classes throughout the day remain intact.
            </span>
          </div>

          {/* Teachers assigned to this slot */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400">Assigned Co-Teachers:</div>
            <div className="space-y-2">
              {teachersInSlot.map((tName) => (
                <div
                  key={tName}
                  className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                      👥
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">{tName}</div>
                      <div className="text-[10px] text-slate-400">Co-Teaching {className}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => releaseCoTeacher(period, tName)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                    title="Release this teacher from this specific period only"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Free this Period</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
