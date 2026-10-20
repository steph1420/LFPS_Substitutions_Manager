import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Award, X, Check, Star } from 'lucide-react';

export const OfficiatingModal: React.FC = () => {
  const {
    activeOfficiatingTarget,
    closeOfficiatingModal,
    selectedDay,
    directory,
    absences,
    availabilities,
    officiatingAC,
    officiatingCT,
    assignOfficiatingAC,
    assignOfficiatingCT,
  } = useTimetableStore();

  // Standard UI Pillars: ESC key and backdrop click to dismiss
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeOfficiatingTarget) {
        closeOfficiatingModal();
      }
    };
    if (activeOfficiatingTarget) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOfficiatingTarget, closeOfficiatingModal]);

  if (!activeOfficiatingTarget) return null;

  const { type, section } = activeOfficiatingTarget;
  const isAC = type === 'AC';
  const currentAssigned = isAC
    ? officiatingAC[selectedDay]
    : section
    ? officiatingCT[selectedDay]?.[section]
    : null;

  const teachers = Object.values(directory);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        onClick={closeOfficiatingModal}
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
                <Award className="w-4 h-4 text-purple-400" />
                {isAC
                  ? 'Designate Officiating AC (Off. AC)'
                  : `Assign Officiating Class Teacher (Off. CT • ${section})`}
              </h3>
              <p className="text-[11px] text-slate-400">
                Designate temporary officiating staff for {selectedDay}. Permissions inherit automatically.
              </p>
            </div>
            <button
              onClick={closeOfficiatingModal}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Candidate Pool */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {teachers.map((teacher) => {
              const isAbsent = absences.some(
                (a) => a.teacherName === teacher.abbr && a.day === selectedDay
              );
              const avail = availabilities[teacher.abbr];
              const isFreeFromSub = avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');
              const isSelected = currentAssigned === teacher.abbr;
              const isRecommended = section && teacher.primaryClass === section;

              return (
                <button
                  key={teacher.id}
                  disabled={isAbsent}
                  onClick={() => {
                    if (isAC) {
                      assignOfficiatingAC(selectedDay, teacher.abbr);
                    } else if (section) {
                      assignOfficiatingCT(selectedDay, section, teacher.abbr);
                    }
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500/60 shadow-md shadow-purple-950/30'
                      : isAbsent
                      ? 'opacity-40 bg-slate-950/40 border-slate-800 cursor-not-allowed'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-700/60 flex items-center justify-center font-bold text-xs text-slate-200">
                      {teacher.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200">
                          {teacher.abbr}
                        </span>
                        {isRecommended && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5" /> 2nd Teacher
                          </span>
                        )}
                        {isFreeFromSub && (
                          <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-amber-500/15 text-amber-300">
                            Free from Sub
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{teacher.role}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

