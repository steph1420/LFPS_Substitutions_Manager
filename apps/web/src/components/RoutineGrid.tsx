import React from 'react';
import {
  DEFAULT_PERIODS,
  PeriodId,
  DayOfWeek,
  parseCellSlot,
  isTeacherCoTeachingInSlot,
  compareTeachersByHierarchy,
  compareTeachersByName,
} from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Maximize2, Minimize2, Users, School, Eye, EyeOff } from 'lucide-react';
import { UndoRedoControls } from './UndoRedoControls.js';
import { TeacherNameOverlay } from './common/TeacherNameOverlay.js';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface RoutineGridProps {
  isFullscreen?: boolean;
}

function splitTeacherName(name: string): { line1: string; line2: string } {
  const parts = name.trim().split(' ');
  if (parts.length <= 1) return { line1: name, line2: '' };
  const line2 = parts[parts.length - 1];
  const line1 = parts.slice(0, parts.length - 1).join(' ');
  return { line1, line2 };
}

export const RoutineGrid: React.FC<RoutineGridProps> = ({ isFullscreen = false }) => {
  const {
    selectedDay,
    setDay,
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
    hideAbsentStaff,
    toggleHideAbsentStaff,
    isMinimalUI,
    routineSortBy,
    setRoutineSortBy,
    swapRoutineSlots,
  } = useTimetableStore();

  const [dragOverTarget, setDragOverTarget] = React.useState<{ teacher: string; period: PeriodId } | null>(null);
  const [dragSource, setDragSource] = React.useState<{ teacher: string; period: PeriodId; task: string } | null>(null);
  const [isColumnCollapsed, setIsColumnCollapsed] = React.useState(false);
  const tableWrapperRef = React.useRef<HTMLDivElement>(null);

  const isExpanded = isFitGrid || isFullscreen;
  const currentSchedule = schedule[selectedDay] || {};

  // Sort teachers by role hierarchy or alphabetical by name
  const sortedTeachers = React.useMemo(() => {
    return Object.values(directory).sort(
      routineSortBy === 'name' ? compareTeachersByName : compareTeachersByHierarchy
    );
  }, [directory, routineSortBy]);

  // Filter teachers when hideAbsentStaff is active (FEAT-55)
  const teachers = React.useMemo(() => {
    if (!hideAbsentStaff) return sortedTeachers;
    return sortedTeachers.filter((t) => {
      const abs = absences.find((a) => a.teacherName === t.abbr && a.day === selectedDay);
      return !abs || abs.type === 'AWAY_OFFICIAL';
    });
  }, [sortedTeachers, hideAbsentStaff, absences, selectedDay]);

  // List of distinct classes for Class View (LOGIC-07: Nursery removed)
  const classSections = ['KG A', 'KG B', 'PREP A', 'PREP B'];

  // Handle Horizontal Scroll for Sticky Column Collapse on Narrow Screens (FEAT-53)
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isNarrowScreen) {
      if (scrollLeft > 15 && !isColumnCollapsed) {
        setIsColumnCollapsed(true);
      } else if (scrollLeft <= 5 && isColumnCollapsed) {
        setIsColumnCollapsed(false);
      }
    } else if (isColumnCollapsed) {
      setIsColumnCollapsed(false);
    }
  };

  // Handle Escape key when Grid is expanded to Fullscreen (FEAT-09)
  React.useEffect(() => {
    if (isExpanded) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          toggleFitGrid();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isExpanded, toggleFitGrid]);

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
          {/* Sticky Corner Header with solid masking flange (BUG-05, BUG-08, FEAT-53) */}
          <th
            className={`sticky top-0 left-0 z-40 bg-slate-900 py-1.5 sm:py-2 border-r-2 border-slate-700 shadow-[3px_0_10px_rgba(0,0,0,0.5)] transition-all ${
              isColumnCollapsed
                ? 'w-[64px] min-w-[64px] max-w-[64px] px-1 text-center'
                : 'px-2 sm:px-3 min-w-[130px] sm:min-w-[155px]'
            }`}
          >
            {isColumnCollapsed ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (viewMode === 'teachers') {
                    setRoutineSortBy(routineSortBy === 'role' ? 'name' : 'role');
                  }
                }}
                className="w-full truncate text-[11px] font-bold text-slate-300 hover:text-white"
                title={
                  viewMode === 'teachers'
                    ? `Faculty (${routineSortBy === 'role' ? 'Role' : 'A-Z'}). Tap to switch.`
                    : 'Class / Sec'
                }
              >
                {viewMode === 'teachers'
                  ? routineSortBy === 'role'
                    ? 'Fac (R)'
                    : 'Fac (A)'
                  : 'Sec.'}
              </button>
            ) : viewMode === 'teachers' ? (
              <div className="flex items-center justify-between gap-1.5 w-full">
                <span className="truncate text-xs font-semibold text-slate-300">Faculty</span>
                <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[10px] font-medium flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoutineSortBy('role');
                    }}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      routineSortBy === 'role'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Sort by school role hierarchy (AC -> AAC -> CT -> 2T -> Staff)"
                  >
                    Role
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoutineSortBy('name');
                    }}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      routineSortBy === 'name'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Sort alphabetically by Name (A-Z)"
                  >
                    A-Z
                  </button>
                </div>
              </div>
            ) : (
              <span className="truncate text-xs font-semibold text-slate-300">Class / Sec</span>
            )}
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

            // Role classifications (FEAT-56)
            const isAC = teacher.abbr === 'Mrs. R. Pahwa' || (teacher.role.includes('Academic Coordinator') && !teacher.role.includes('Asst.'));
            const isAAC = teacher.abbr === 'Mrs. S. Lakra' || teacher.role.includes('Asst. Academic Coordinator');
            const isCT = teacher.role.includes('Class Teacher');

            const { line1, line2 } = splitTeacherName(teacher.abbr);

            return (
              <tr
                key={teacher.id}
                className={`transition-colors ${
                  isAbsent
                    ? 'bg-rose-950/15'
                    : isAwayOfficial
                    ? 'bg-slate-900/30'
                    : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Sticky Teacher Header Cell (FEAT-53 2-line collapse & FEAT-54 crimson highlight) */}
                <td
                  onContextMenu={(e) => handleContextMenu(e, teacher.abbr)}
                  className={`sticky left-0 z-20 transition-all cursor-context-menu select-none ${
                    isColumnCollapsed
                      ? 'w-[64px] min-w-[64px] max-w-[64px] px-1 py-1 text-center'
                      : 'px-2 sm:px-3.5 py-1.5 sm:py-2'
                  } ${
                    isAbsent
                      ? 'bg-rose-950/90 border-r-2 border-r-rose-500 text-rose-200 font-bold shadow-[3px_0_12px_rgba(244,63,94,0.35)]'
                      : 'bg-slate-900/98 font-semibold text-slate-200 border-r-2 border-slate-700 shadow-[3px_0_10px_rgba(0,0,0,0.5)]'
                  }`}
                  title={teacher.fullName}
                >
                  {isColumnCollapsed ? (
                    // 2-line collapsed split font on narrow screen horizontal scroll (FEAT-53)
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span className="text-[10px] text-slate-300 font-medium truncate max-w-full">
                        {line1}
                      </span>
                      <span
                        className={`text-[10px] font-bold truncate max-w-full ${
                          isAbsent ? 'text-rose-200' : 'text-slate-100'
                        }`}
                      >
                        {line2}
                      </span>
                    </div>
                  ) : (
                    // Normal full name display
                    <div className="flex items-center gap-1">
                      <TeacherNameOverlay
                        abbr={teacher.abbr}
                        fullName={teacher.fullName}
                        className={isAbsent ? 'text-rose-100 text-xs font-bold' : 'text-slate-100 text-xs font-bold'}
                      />
                      {isAbsent && (
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-rose-500/30 text-rose-200 border border-rose-400/40">
                          ABS
                        </span>
                      )}
                      {isAwayOfficial && (
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          AWAY
                        </span>
                      )}
                      {isAC && (
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 hidden sm:inline" title="Academic Coordinator">
                          AC
                        </span>
                      )}
                      {isAAC && (
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 hidden sm:inline" title="Asst. Academic Coordinator">
                          AAC
                        </span>
                      )}
                      {isCT && !isAbsent && (
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hidden sm:inline" title={teacher.primaryClass ? `Class Teacher • ${teacher.primaryClass}` : 'Class Teacher'}>
                          CT
                        </span>
                      )}
                    </div>
                  )}
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
                  const coTeachInfo = isTeacherCoTeachingInSlot(teacher.abbr, period.id, currentSchedule);
                  const isCoTeaching = parsed.isCoTeaching || coTeachInfo.isCoTeaching;

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

                  const isDraggable = isBusy && !covering && !sub && period.id !== 'BREAK';
                  const isDragOver = dragOverTarget?.teacher === teacher.abbr && dragOverTarget?.period === period.id;

                  return (
                    <td
                      key={period.id}
                      draggable={isDraggable}
                      onDragStart={(e) => {
                        if (!isDraggable) return;
                        setDragSource({ teacher: teacher.abbr, period: period.id, task: originalTask });
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({
                            teacher: teacher.abbr,
                            period: period.id,
                            task: originalTask,
                          })
                        );
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDragSource(null);
                        setDragOverTarget(null);
                      }}
                      onDragOver={(e) => {
                        if (period.id === 'BREAK') return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (
                          !dragOverTarget ||
                          dragOverTarget.teacher !== teacher.abbr ||
                          dragOverTarget.period !== period.id
                        ) {
                          setDragOverTarget({ teacher: teacher.abbr, period: period.id });
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        setDragOverTarget(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTarget(null);
                        setDragSource(null);
                        try {
                          const data = JSON.parse(e.dataTransfer.getData('application/json'));
                          if (data && data.teacher && data.period) {
                            if (data.teacher === teacher.abbr && data.period === period.id) return;
                            swapRoutineSlots(
                              selectedDay,
                              { teacher: data.teacher, period: data.period },
                              { teacher: teacher.abbr, period: period.id }
                            );
                            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                              try {
                                navigator.vibrate(40);
                              } catch {}
                            }
                          }
                        } catch {}
                      }}
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
                      className={`text-center border-l border-slate-800/60 transition-all select-none ${
                        isDragOver ? 'ring-2 ring-blue-400 ring-inset bg-blue-500/20' : ''
                      } ${
                        dragSource?.teacher === teacher.abbr && dragSource?.period === period.id
                          ? 'opacity-40 scale-95'
                          : ''
                      } ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:bg-slate-800/50' : ''} ${
                        isMinimalUI ? 'px-0.5 py-0.5' : 'px-1 py-1 sm:px-1.5 sm:py-1.5'
                      }`}
                      title={
                        isDraggable
                          ? `Drag to swap with another period (Undo available)`
                          : undefined
                      }
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
              <td
                className={`sticky left-0 z-20 bg-slate-900/98 font-bold text-blue-400 border-r-2 border-slate-700 shadow-[3px_0_10px_rgba(0,0,0,0.5)] truncate ${
                  isColumnCollapsed
                    ? 'w-[64px] min-w-[64px] max-w-[64px] px-1 py-1 text-center text-xs'
                    : 'px-2 sm:px-3.5 py-1.5 sm:py-2'
                }`}
              >
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
                  <td
                    key={period.id}
                    onContextMenu={(e) => {
                      if (assignedTeacher) {
                        handleContextMenu(e, assignedTeacher, period.id);
                      }
                    }}
                    className={`text-center border-l border-slate-800/60 ${
                      isMinimalUI ? 'px-0.5 py-0.5' : 'px-1 py-1 sm:px-1.5 sm:py-1.5'
                    }`}
                  >
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
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 flex-shrink-0 ${
        isMinimalUI ? 'pb-1.5' : 'pb-3'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            Master Routine Matrix ({selectedDay})
            {isExpanded && (
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

      {/* View Switcher, Hide Absent, Day Switcher & Fit Grid Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {/* Fullscreen Day Switcher Pills */}
        {isExpanded && (
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  selectedDay === d
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Dual View Toggle */}
        <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setViewMode('teachers')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'teachers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Teachers</span>
          </button>
          <button
            onClick={() => setViewMode('classes')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'classes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Classes</span>
          </button>
        </div>

        {/* Hide Absent Staff Toggle Button (FEAT-55) */}
        {viewMode === 'teachers' && (
          <button
            onClick={toggleHideAbsentStaff}
            className={`px-2.5 py-1 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold active:scale-95 ${
              hideAbsentStaff
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'glass-pill border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={hideAbsentStaff ? 'Show absent faculty rows' : 'Hide absent faculty rows from routine matrix'}
          >
            {hideAbsentStaff ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{hideAbsentStaff ? 'Absent Hidden' : 'Hide Absent'}</span>
          </button>
        )}

        {/* Routine Tab Undo / Redo Controls (FEAT-40) */}
        <UndoRedoControls tab="routine" />

        {/* Fit Grid Toggle (FEAT-09) */}
        <button
          onClick={toggleFitGrid}
          className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95 ${
            isExpanded
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/40'
              : 'glass-pill border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600'
          }`}
          title={isExpanded ? 'Exit Fullscreen (Esc)' : 'Expand Matrix to Fullscreen'}
        >
          {isExpanded ? (
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

  // When Fullscreen Workstation is active, render full-bleed flex column (BUG-10)
  if (isExpanded) {
    return (
      <section className="flex-1 w-full h-full flex flex-col min-h-0 overflow-hidden space-y-2 sm:space-y-3">
        {controlsBar}
        <div
          ref={tableWrapperRef}
          onScroll={handleTableScroll}
          className="flex-1 w-full min-h-0 overflow-auto rounded-xl border border-slate-800 bg-slate-900/60 relative scrollbar-thin"
        >
          {renderTable()}
        </div>
      </section>
    );
  }

  // Normal inline card view with compact mobile padding
  return (
    <section
      className={`w-full glass-panel rounded-xl sm:rounded-2xl border border-slate-800 shadow-xl space-y-3 ${
        isMinimalUI ? 'p-2 sm:p-3' : 'p-2 sm:p-5'
      }`}
    >
      {controlsBar}
      <div
        ref={tableWrapperRef}
        onScroll={handleTableScroll}
        className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 relative scrollbar-thin"
      >
        {renderTable()}
      </div>
    </section>
  );
};
