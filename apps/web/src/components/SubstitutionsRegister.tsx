import React from 'react';
import { motion } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { autoResolveSubstitutions, PeriodId } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Sparkles, ArrowRight, Trash2 } from 'lucide-react';

export const SubstitutionsRegister: React.FC = () => {
  const {
    selectedDay,
    schedule,
    absences,
    availabilities,
    substitutions,
    assignSubstitution,
    removeSubstitution,
  } = useTimetableStore();

  const currentSchedule = schedule[selectedDay] || {};

  // Find all uncovered teaching slots from absent teachers on this day
  const uncoveredSlots = React.useMemo(() => {
    const slots: Array<{ period: PeriodId; originalTeacher: string; task: string }> = [];
    const activeAbsences = absences.filter((a) => a.day === selectedDay);

    const periods: PeriodId[] = ['G/PD', '1st', '2nd', '3rd', '4th', '5th', '6th'];

    activeAbsences.forEach((abs) => {
      periods.forEach((p) => {
        // If partial absence or away official, check if period is affected
        if (abs.periods && !abs.periods.includes(p)) return;

        const task = currentSchedule[p]?.[abs.teacherName];
        if (task && task !== 'Free' && task !== '-') {
          // Check if already covered
          const existing = substitutions.find(
            (s) => s.day === selectedDay && s.period === p && s.originalTeacher === abs.teacherName
          );
          if (!existing) {
            slots.push({ period: p, originalTeacher: abs.teacherName, task });
          }
        }
      });
    });

    return slots;
  }, [selectedDay, schedule, absences, substitutions]);

  // Handle 1-Tap Auto Resolve
  const handleAutoResolve = () => {
    if (uncoveredSlots.length === 0) return;

    const plan = autoResolveSubstitutions({
      day: selectedDay,
      uncoveredSlots,
      schedule: currentSchedule,
      absences,
      availabilities,
      strategy: 'SUBJECT_MATCH',
    });

    plan.assignments.forEach((assignment) => {
      assignSubstitution({
        day: selectedDay,
        period: assignment.period,
        originalTeacher: assignment.originalTeacher,
        substituteTeacher: assignment.substituteTeacher,
        className: assignment.className,
        subject: assignment.subject,
        status: 'COVERED',
        assignedBy: 'Auto-Resolve Engine',
      });
    });
  };

  const daySubstitutions = substitutions.filter((s) => s.day === selectedDay);

  return (
    <section className="w-full glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            Substitution Register & Coverage Engine
          </h2>
          <p className="text-xs text-slate-400">
            {uncoveredSlots.length > 0 ? (
              <span className="text-amber-400 font-semibold">
                ⚠️ {uncoveredSlots.length} periods need substitution today
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">✓ All absent classes are fully covered</span>
            )}
          </p>
        </div>

        {uncoveredSlots.length > 0 && (
          <button
            onClick={handleAutoResolve}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            Auto-Resolve ({uncoveredSlots.length})
          </button>
        )}
      </div>

      {/* Active Substitutions List */}
      {daySubstitutions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {daySubstitutions.map((sub) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING_TRANSITIONS.snappy}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {sub.period} Period
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {sub.className} • {sub.subject}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="truncate">
                  <span className="text-rose-400 line-through font-medium mr-1.5">
                    {sub.originalTeacher}
                  </span>
                  <ArrowRight className="inline w-3 h-3 text-slate-500 mr-1.5" />
                  <span className="text-emerald-400 font-bold">
                    {sub.substituteTeacher}
                  </span>
                </div>

                <button
                  onClick={() => removeSubstitution(sub.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  title="Remove Assignment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-500">
          No substitutions recorded for {selectedDay}. Mark an absence above to see available substitutes.
        </div>
      )}
    </section>
  );
};

