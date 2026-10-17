import React from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_PERIODS, PeriodId, parseCellSlot } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Maximize2, Minimize2, Users, School } from 'lucide-react';

export const RoutineGrid: React.FC = () => {
  const {
    selectedDay,
    schedule,
    directory,
    absences,
    substitutions,
    viewMode,
    setViewMode,
    isFitGrid,
    toggleFitGrid,
    openContextMenu,
    openCoTeachModal,
  } = useTimetableStore();

  const currentSchedule = schedule[selectedDay] || {};
  const teachers = Object.values(directory);

  // List of distinct classes for Class View
  const classSections = ['KG A', 'KG B', 'PREP A', 'PREP B', 'NUR A', 'NUR B'];

  // Handle body scroll lock & Escape key when Grid is expanded to Fullscreen (FEAT-09)
  React.useEffect(() => {
    if (isFitGrid) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          toggleFitGrid();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isFitGrid, toggleFitGrid]);

  // Handle right-click or long-press for micro context menu (FEAT-29)
  const handleContextMenu = (e: React.MouseEvent, teacherName: string, period?: PeriodId) => {
    e.preventDefault();
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      teacher: teacherName,
      period,
    });
  };

  // Render Table Header and Body (High-Density Multi-Axial Sticky Architecture)
  const renderTable = () => (
    <table className="w-full text-left border-collapse select-none">
      <thead className="sticky top-0 z-30 bg-slate-900 shadow-sm">
        <tr className="border-b border-slate-800 text-slate-300 font-semibold text-xs">
          {/* Sticky Corner Header with solid masking flange (BUG-05, BUG-08) */}
          <th className="sticky top-0 left-0 z-40 bg-slate-900 px-2 sm:px-3.5 py-2 sm:py-2.5 min-w-[80px] sm:min-w-[130px] border-r-2 border-slate-700 shadow-[3px_0_10px_rgba(0,0,0,0.5)]">
            <span className="truncate">{viewMode === 'teachers' ? 'Faculty' : 'Class / Sec'}</span>
          </th>

          {DEFAULT_PERIODS.map((period) => (
            <th
              key={period.id}
              className={`sticky top-0 z-30 bg-slate-900 px-1 sm:px-2 py-1.5 sm:py-2 min-w-[78px] sm:min-w-[105px] text-center border-l border-slate-800/80 ${
                period.id === 'BREAK' ? 'bg-slate-950/90 text-slate-500' : ''
              }`}
            >
              <div className="text-[10px] sm:text-[11px] font-bold">{period.name}</div>
              <div className="text-[8px] sm:text-[9px] font-normal text-slate-400">{period.timing}</div>
            </th>
          ))}
        </tr>
      </thead>

      <tbody className="divide-y divide-slate-800/50 text-xs">
        {viewMode === 'teachers' ? (
          // --- TEACHERS VIEW ---
          teachers.map((teacher) => {
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
                    : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Sticky Teacher Header Cell (BUG-05 & BUG-08) */}
                <td
                  onContextMenu={(e) => handleContextMenu(e, teacher.abbr)}
                  className="sticky left-0 z-20 bg-slate-900/98 px-2 sm:px-3.5 py-1.5 sm:py-2 font-semibold text-slate-200 border-r-2 border-slate-700 shadow-[3px_0_10px_rgba(0,0,0,0.5)] truncate cursor-context-menu"
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs font-bold">{teacher.abbr}</span>
                    {isAbsent && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        ABS
                      </span>
                    )}
                    {isAwayOfficial && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
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
                        className="px-1 py-1 sm:px-2 sm:py-1.5 text-center text-slate-600 bg-slate-950/50 border-l border-slate-800/60"
                      >
                        —
                      </td>
                    );
                  }

                  const originalTask = currentSchedule[period.id]?.[teacher.abbr] || 'Free';
                  const parsed = parseCellSlot(originalTask);
                  const isBusy = !parsed.isFree && !parsed.isBreak;
                  const isCoTeaching = parsed.isCoTeaching;

                  // Sub coverage checks
                  const sub = substitutions.find(
                    (s) =>
                      s.day === selectedDay &&
                      s.period === period.id &&
                      s.originalTeacher === teacher.abbr
                  );

                  const covering = substitutions.find(
                    (s) =>
                      s.day === selectedDay &&
                      s.period === period.id &&
                      s.substituteTeacher === teacher.abbr
                  );

                  return (
                    <td
                      key={period.id}
                      onContextMenu={(e) => handleContextMenu(e, teacher.abbr, period.id)}
                      onClick={() => {
                        if (isCoTeaching) {
                          openCoTeachModal({
                            period: period.id,
                            teacher: teacher.abbr,
                            className: parsed.className || 'KG',
                            subject: parsed.subject || originalTask,
                          });
                        }
                      }}
                      className="px-1 py-1 sm:px-1.5 sm:py-1.5 text-center border-l border-slate-800/60"
                    >
                      {covering ? (
                        <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-1 text-[11px] font-semibold text-emerald-300 shadow-sm">
                          <div className="truncate font-bold text-[10px] sm:text-xs">{covering.className}</div>
                          <div className="text-[8px] sm:text-[9px] text-emerald-400/80 truncate">
                            Sub for {covering.originalTeacher}
                          </div>
                        </div>
                      ) : sub ? (
                        <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-1 text-[11px] font-medium text-amber-300 shadow-sm">
                          <div className="line-through text-slate-400 text-[9px] sm:text-[10px] truncate">
                            {parsed.className || originalTask}
                          </div>
                          <div className="text-[9px] sm:text-[10px] font-bold text-emerald-400 truncate">
                            ✓ {sub.substituteTeacher}
                          </div>
                        </div>
                      ) : isAbsent && isBusy ? (
                        <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-1 text-[11px] font-semibold text-rose-300 shadow-sm animate-pulse">
                          <div className="truncate font-bold text-[10px] sm:text-xs">
                            {parsed.className || originalTask}
                          </div>
                          <div className="text-[8px] sm:text-[9px] font-bold text-rose-400">Need Sub!</div>
                        </div>
                      ) : isBusy ? (
                        <div
                          className={`rounded-lg p-1 text-[11px] font-medium transition-all ${
                            isCoTeaching
                              ? 'bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 hover:border-indigo-400 cursor-pointer'
                              : 'bg-slate-800/70 border border-slate-700/50 text-slate-200'
                          }`}
                        >
                          <div className="font-bold text-slate-100 text-[10px] sm:text-xs leading-tight truncate">
                            {parsed.className || originalTask}
                          </div>
                          {parsed.subject && (
                            <div className="text-[8px] sm:text-[9px] text-slate-400 leading-tight truncate">
                              {parsed.subject}
                            </div>
                          )}
                          {isCoTeaching && (
                            <div className="text-[8px] text-indigo-400 font-bold mt-0.5">👥 Co-Teach</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px] sm:text-[11px]">Free</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })
        ) : (
          // --- CLASSES VIEW ---
          classSections.map((sec) => (
            <tr key={sec} className="hover:bg-slate-900/40 transition-colors">
              <td className="sticky left-0 z-20 bg-slate-900/98 px-2 sm:px-3.5 py-1.5 sm:py-2 font-bold text-blue-400 border-r-2 border-slate-700 shadow-[3px_0_10px_rgba(0,0,0,0.5)] truncate">
                {sec}
              </td>

              {DEFAULT_PERIODS.map((period) => {
                if (period.id === 'BREAK') {
                  return (
                    <td
                      key={period.id}
                      className="px-1 py-1 sm:px-2 sm:py-1.5 text-center text-slate-600 bg-slate-950/50 border-l border-slate-800/60"
                    >
                      —
                    </td>
                  );
                }

                // Find which teacher is teaching this section in this period
                let assignedTeacher: string | null = null;
                let taskString: string | null = null;

                Object.entries(currentSchedule[period.id] || {}).forEach(([tName, task]) => {
                  if (task.includes(sec)) {
                    assignedTeacher = tName;
                    taskString = task;
                  }
                });

                // Check if substituted
                const sub = assignedTeacher
                  ? substitutions.find(
                      (s) =>
                        s.day === selectedDay &&
                        s.period === period.id &&
                        s.originalTeacher === assignedTeacher
                    )
                  : null;

                const parsed = taskString ? parseCellSlot(taskString) : null;

                return (
                  <td key={period.id} className="px-1 py-1 sm:px-1.5 sm:py-1.5 text-center border-l border-slate-800/60">
                    {sub ? (
                      <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-1 text-[11px] font-semibold text-emerald-300">
                        <div className="text-[9px] text-slate-400 line-through truncate">{assignedTeacher}</div>
                        <div className="text-emerald-400 font-bold text-[10px] sm:text-xs truncate">{sub.substituteTeacher}</div>
                      </div>
                    ) : assignedTeacher ? (
                      <div className="rounded-lg bg-slate-800/70 border border-slate-700/50 p-1 text-[11px]">
                        <div className="font-semibold text-slate-200 text-[10px] sm:text-xs truncate">{assignedTeacher}</div>
                        <div className="text-[8px] sm:text-[9px] text-slate-400 truncate">{parsed?.subject || taskString}</div>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-[10px] sm:text-[11px]">Free</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const controlsBar = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            Master Routine Matrix ({selectedDay})
            {isFitGrid && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Fullscreen Workstation
              </span>
            )}
          </h2>
          <p className="text-[10px] sm:text-[11px] text-slate-400">
            Interactive high-density spreadsheet with sticky staff headers and live sub states.
          </p>
        </div>
      </div>

      {/* View Switcher & Fit Grid Controls */}
      <div className="flex items-center gap-2">
        {/* Dual View Toggle */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setViewMode('teachers')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'teachers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teachers</span>
          </button>
          <button
            onClick={() => setViewMode('classes')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'classes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Classes</span>
          </button>
        </div>

        {/* Fit Grid Toggle (FEAT-09) */}
        <button
          onClick={toggleFitGrid}
          className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95 ${
            isFitGrid
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/40'
              : 'glass-pill border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600'
          }`}
          title={isFitGrid ? 'Exit Fullscreen (Esc)' : 'Expand Matrix to Fullscreen'}
        >
          {isFitGrid ? (
            <>
              <Minimize2 className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
              <kbd className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-blue-700 text-blue-100 font-mono">
                Esc
              </kbd>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Expand Grid</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // When Fullscreen Workstation is active, render via Portal to document.body (immune to transform clipping)
  if (isFitGrid && typeof document !== 'undefined') {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col p-2.5 sm:p-5 overflow-hidden animate-in fade-in duration-150">
        {controlsBar}
        <div className="flex-1 w-full overflow-auto rounded-xl border border-slate-800 bg-slate-900/60 relative scrollbar-thin">
          {renderTable()}
        </div>
      </div>,
      document.body
    );
  }

  // Normal inline card view with compact mobile padding
  return (
    <section className="w-full glass-panel rounded-xl sm:rounded-2xl p-2 sm:p-5 border border-slate-800 shadow-xl space-y-3">
      {controlsBar}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 relative scrollbar-thin">
        {renderTable()}
      </div>
    </section>
  );
};
