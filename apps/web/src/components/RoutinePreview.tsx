import { DEFAULT_PERIODS } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';

export const RoutinePreview: React.FC = () => {
  const { selectedDay, schedule, directory, absences, substitutions } = useTimetableStore();
  const currentSchedule = schedule[selectedDay] || {};
  const teachers = Object.values(directory);

  return (
    <section className="w-full glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
            Master Routine Grid ({selectedDay})
          </h2>
          <p className="text-xs text-slate-400">
            Real-time interactive matrix with sticky staff headers and live coverage updates.
          </p>
        </div>
      </div>

      {/* Grid Table Container */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold">
              <th className="sticky left-0 z-20 bg-slate-900 px-3.5 py-2.5 min-w-[120px] shadow-[2px_0_6px_rgba(0,0,0,0.4)]">
                Teacher
              </th>
              {DEFAULT_PERIODS.map((period) => (
                <th
                  key={period.id}
                  className={`px-3 py-2.5 min-w-[100px] text-center border-l border-slate-800/60 ${
                    period.id === 'BREAK' ? 'bg-slate-950/60 text-slate-600' : ''
                  }`}
                >
                  <div>{period.name}</div>
                  <div className="text-[10px] font-normal text-slate-500">{period.timing}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {teachers.map((teacher) => {
              const absence = absences.find(
                (a) => a.teacherName === teacher.abbr && a.day === selectedDay
              );
              const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
              const isAwayOfficial = !!absence && absence.type === 'AWAY_OFFICIAL';

              return (
                <tr
                  key={teacher.id}
                  className={`transition-colors ${
                    isAbsent
                      ? 'bg-rose-950/10'
                      : isAwayOfficial
                      ? 'bg-slate-900/30'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  {/* Sticky Teacher Header Cell */}
                  <td className="sticky left-0 z-10 bg-slate-900/95 px-3.5 py-2.5 font-semibold text-slate-200 border-r border-slate-800 shadow-[2px_0_6px_rgba(0,0,0,0.4)] truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{teacher.abbr}</span>
                      {isAbsent && (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-400">
                          ABS
                        </span>
                      )}
                      {isAwayOfficial && (
                        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                          AWAY
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Period Cells */}
                  {DEFAULT_PERIODS.map((period) => {
                    if (period.id === 'BREAK') {
                      return (
                        <td
                          key={period.id}
                          className="px-2 py-2 text-center text-slate-600 bg-slate-950/40 border-l border-slate-800/40"
                        >
                          —
                        </td>
                      );
                    }

                    const originalTask = currentSchedule[period.id]?.[teacher.abbr] || 'Free';
                    const isBusy = originalTask !== 'Free' && originalTask !== '-';

                    // Check if substituted
                    const sub = substitutions.find(
                      (s) =>
                        s.day === selectedDay &&
                        s.period === period.id &&
                        s.originalTeacher === teacher.abbr
                    );

                    // Check if this teacher is covering someone else in this period
                    const covering = substitutions.find(
                      (s) =>
                        s.day === selectedDay &&
                        s.period === period.id &&
                        s.substituteTeacher === teacher.abbr
                    );

                    return (
                      <td
                        key={period.id}
                        className="px-2 py-2 text-center border-l border-slate-800/40"
                      >
                        {covering ? (
                          <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-1 text-[11px] font-semibold text-emerald-300 shadow-sm">
                            <div className="truncate">Sub: {covering.className}</div>
                            <div className="text-[9px] text-emerald-400/80">for {covering.originalTeacher}</div>
                          </div>
                        ) : sub ? (
                          <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-1 text-[11px] font-medium text-amber-300 shadow-sm">
                            <div className="line-through text-slate-400 text-[10px]">{originalTask}</div>
                            <div className="text-[10px] font-bold text-emerald-400">Covered by {sub.substituteTeacher}</div>
                          </div>
                        ) : isAbsent && isBusy ? (
                          <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-1 text-[11px] font-semibold text-rose-300 shadow-sm animate-pulse">
                            <div>{originalTask}</div>
                            <div className="text-[9px] text-rose-400">Need Sub!</div>
                          </div>
                        ) : isBusy ? (
                          <div className="rounded-lg bg-slate-800/70 border border-slate-700/50 p-1 text-[11px] font-medium text-slate-200">
                            {originalTask}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Free</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

