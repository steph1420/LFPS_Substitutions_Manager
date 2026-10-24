import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { autoResolveSubstitutions, PeriodId, parseCellSlot, getEffectiveOfficiatingAC, Teacher, compareTeachersByHierarchy } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import {
  Sparkles,
  Brain,
  ArrowRight,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronUp,
  UserCheck,
  LayoutGrid,
  List,
  ArrowUpDown,
  Check,
  Flag,
  School,
} from 'lucide-react';
import { UndoRedoControls } from './UndoRedoControls.js';
import { AutoResolveBrainModal } from './AutoResolveBrainModal.js';

const PERIOD_ORDER: Record<string, number> = {
  'G/PD': 0,
  '1st': 1,
  '2nd': 2,
  '3rd': 3,
  '4th': 4,
  '5th': 5,
  '6th': 6,
};

export const SubstitutionsRegister: React.FC = () => {
  const {
    selectedDay,
    schedule,
    absences,
    availabilities,
    substitutions,
    directory,
    assignSubstitution,
    removeSubstitution,
    acceptSubstitution,
    openDisputeModal,
    openAssignSubModal,
    openOfficiatingModal,
    loggedInTeacher,
    officiatingAC,
    officiatingCT,
    substitutionsViewMode,
    setSubstitutionsViewMode,
    substitutionsSortBy,
    setSubstitutionsSortBy,
    hideOverviewsByDefault,
    isMinimalUI,
    autoResolvePolicy,
  } = useTimetableStore();

  const [filterMode, setFilterMode] = React.useState<'all' | 'uncovered' | 'covered' | 'my'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isOverviewCollapsed, setIsOverviewCollapsed] = React.useState(hideOverviewsByDefault);
  const [isBrainModalOpen, setIsBrainModalOpen] = React.useState(false);
  const [isAppointDropdownOpen, setIsAppointDropdownOpen] = React.useState(false);
  const appointDropdownRef = React.useRef<HTMLDivElement>(null);

  // Auto-dismiss appoint dropdown on outside interaction
  React.useEffect(() => {
    if (!isAppointDropdownOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (appointDropdownRef.current && !appointDropdownRef.current.contains(e.target as Node)) {
        setIsAppointDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isAppointDropdownOpen]);

  const currentSchedule = schedule[selectedDay] || {};

  // Find all uncovered teaching slots from absent teachers on this day
  const rawUncoveredSlots = React.useMemo(() => {
    const slots: Array<{ period: PeriodId; originalTeacher: string; task: string }> = [];
    const activeAbsences = absences.filter((a) => a.day === selectedDay);
    const periods: PeriodId[] = ['G/PD', '1st', '2nd', '3rd', '4th', '5th', '6th'];

    activeAbsences.forEach((abs) => {
      periods.forEach((p) => {
        if (abs.periods && !abs.periods.includes(p)) return;

        const task = currentSchedule[p]?.[abs.teacherName];
        if (task && task !== 'Free' && task !== '-') {
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

  // Sort uncovered slots by period, teacher name, or role hierarchy (FEAT-58)
  const sortedUncoveredSlots = React.useMemo(() => {
    const list = [...rawUncoveredSlots];
    if (substitutionsSortBy === 'name') {
      return list.sort((a, b) => {
        const nameCmp = a.originalTeacher.localeCompare(b.originalTeacher);
        if (nameCmp !== 0) return nameCmp;
        return (PERIOD_ORDER[a.period] ?? 99) - (PERIOD_ORDER[b.period] ?? 99);
      });
    }
    if (substitutionsSortBy === 'role') {
      return list.sort((a, b) => {
        const tA = directory[a.originalTeacher];
        const tB = directory[b.originalTeacher];
        if (tA && tB) {
          const roleCmp = compareTeachersByHierarchy(tA, tB);
          if (roleCmp !== 0) return roleCmp;
        }
        return (PERIOD_ORDER[a.period] ?? 99) - (PERIOD_ORDER[b.period] ?? 99);
      });
    }
    // Default: 'period'
    return list.sort((a, b) => {
      const pCmp = (PERIOD_ORDER[a.period] ?? 99) - (PERIOD_ORDER[b.period] ?? 99);
      if (pCmp !== 0) return pCmp;
      return a.originalTeacher.localeCompare(b.originalTeacher);
    });
  }, [rawUncoveredSlots, substitutionsSortBy, directory]);

  // Filter uncovered slots by search query
  const uncoveredSlots = React.useMemo(() => {
    if (!searchQuery.trim()) return sortedUncoveredSlots;
    const q = searchQuery.toLowerCase();
    return sortedUncoveredSlots.filter((slot) => {
      const parsed = parseCellSlot(slot.task);
      return (
        slot.originalTeacher.toLowerCase().includes(q) ||
        slot.period.toLowerCase().includes(q) ||
        (parsed.className && parsed.className.toLowerCase().includes(q)) ||
        (parsed.subject && parsed.subject.toLowerCase().includes(q)) ||
        slot.task.toLowerCase().includes(q)
      );
    });
  }, [sortedUncoveredSlots, searchQuery]);

  // Check if a teacher is a Class Teacher (LOGIC-05, FEAT-56)
  const isClassTeacher = (teacherName: string): boolean => {
    const teacher = directory[teacherName];
    if (!teacher) return false;
    return teacher.role.includes('Class Teacher');
  };

  // Evaluate Academic Coordinator Succession Logic (LOGIC-04)
  const offACResult = React.useMemo(() => {
    return getEffectiveOfficiatingAC({
      day: selectedDay,
      absences,
      officiatingACMap: officiatingAC,
    });
  }, [selectedDay, absences, officiatingAC]);

  const effectiveAC = offACResult.effectiveAC;

  // Absent Class Teachers whose sections have not been appointed an Officiating CT yet
  const unappointedCTs = React.useMemo(() => {
    const activeAbsences = absences.filter(
      (a) => a.day === selectedDay && a.type !== 'AWAY_OFFICIAL'
    );
    const result: Array<{ teacher: Teacher; section: string }> = [];
    const appointedSections = officiatingCT[selectedDay] || {};

    activeAbsences.forEach((abs) => {
      const teacher = directory[abs.teacherName];
      if (teacher && teacher.role.includes('Class Teacher') && teacher.primaryClass) {
        const section = teacher.primaryClass;
        if (!appointedSections[section] && !result.some((r) => r.section === section)) {
          result.push({ teacher, section });
        }
      }
    });

    return result;
  }, [absences, selectedDay, directory, officiatingCT]);

  const pendingAppointmentsCount = (offACResult.needsAppointment ? 1 : 0) + unappointedCTs.length;

  // Handle 1-Tap Auto Resolve for All Slots
  const handleAutoResolve = () => {
    if (rawUncoveredSlots.length === 0) return;

    const plan = autoResolveSubstitutions({
      day: selectedDay,
      uncoveredSlots: rawUncoveredSlots,
      schedule: currentSchedule,
      absences,
      availabilities,
      strategy: 'SUBJECT_MATCH',
      officiatingCT,
      policyConfig: autoResolvePolicy,
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

  // Sorting helper for covered substitutions (FEAT-58)
  const sortedSubstitutions = React.useMemo(() => {
    const list = [...daySubstitutions];
    if (substitutionsSortBy === 'name') {
      return list.sort((a, b) => {
        const nameCmp = a.originalTeacher.localeCompare(b.originalTeacher);
        if (nameCmp !== 0) return nameCmp;
        return (PERIOD_ORDER[a.period] ?? 99) - (PERIOD_ORDER[b.period] ?? 99);
      });
    }
    if (substitutionsSortBy === 'role') {
      return list.sort((a, b) => {
        const tA = directory[a.originalTeacher];
        const tB = directory[b.originalTeacher];
        if (tA && tB) {
          const roleCmp = compareTeachersByHierarchy(tA, tB);
          if (roleCmp !== 0) return roleCmp;
        }
        return (PERIOD_ORDER[a.period] ?? 99) - (PERIOD_ORDER[b.period] ?? 99);
      });
    }
    // Default: 'period'
    return list.sort((a, b) => {
      const pCmp = (PERIOD_ORDER[a.period] ?? 99) - (PERIOD_ORDER[b.period] ?? 99);
      if (pCmp !== 0) return pCmp;
      return a.originalTeacher.localeCompare(b.originalTeacher);
    });
  }, [daySubstitutions, substitutionsSortBy, directory]);

  // Filtered lists
  const filteredSubstitutions = sortedSubstitutions.filter((sub) => {
    if (filterMode === 'uncovered') return false;
    if (filterMode === 'my' && loggedInTeacher) {
      return sub.substituteTeacher === loggedInTeacher || sub.originalTeacher === loggedInTeacher;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sub.originalTeacher.toLowerCase().includes(q) ||
        (sub.substituteTeacher && sub.substituteTeacher.toLowerCase().includes(q)) ||
        sub.className.toLowerCase().includes(q) ||
        sub.subject.toLowerCase().includes(q) ||
        sub.period.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const offCTMap = officiatingCT[selectedDay] || {};

  return (
    <div className={`w-full animate-in fade-in duration-200 ${isMinimalUI ? 'space-y-3' : 'space-y-5'}`}>
      {/* Header & KPI Summary Panel */}
      <section
        className={`w-full glass-panel rounded-2xl border border-slate-800 shadow-xl ${
          isMinimalUI ? 'p-3 sm:p-4 space-y-3' : 'p-4 sm:p-5 space-y-4'
        }`}
      >
        <div
          onClick={(e) => {
            // Tapping header in free space triggers collapse/expand (FEAT-44)
            if ((e.target as HTMLElement).closest('button, input, select, a')) return;
            setIsOverviewCollapsed((prev) => !prev);
          }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5 cursor-pointer select-none"
        >
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              Substitutions Overview ({selectedDay})
            </h2>
            <p className="text-xs text-slate-400">
              Live substitution ledger, staff coverage, and 1-tap automated resolution.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end w-full md:w-auto">
            {/* Substitutions Tab Undo / Redo Controls (FEAT-40) */}
            <UndoRedoControls tab="substitutions" />

            {/* Clubbed Officiating Appointments Prompt (Dropdown when >1, single pill when 1) */}
            {pendingAppointmentsCount === 1 && offACResult.needsAppointment && (
              <button
                onClick={() => openOfficiatingModal({ type: 'AC' })}
                className="w-fit flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm attention-pulse"
                title="Both AC and AAC are absent today — designate Officiating AC"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                <span>Appoint Off. AC</span>
              </button>
            )}

            {pendingAppointmentsCount === 1 && unappointedCTs.length === 1 && (
              <button
                onClick={() => openOfficiatingModal({ type: 'CT', section: unappointedCTs[0].section })}
                className="w-fit flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm attention-pulse"
                title={`Class Teacher ${unappointedCTs[0].teacher.abbr} is absent today — appoint Officiating CT for ${unappointedCTs[0].section}`}
              >
                <School className="w-3.5 h-3.5 text-amber-400" />
                <span>Appoint Off. CT ({unappointedCTs[0].section})</span>
              </button>
            )}

            {pendingAppointmentsCount > 1 && (
              <div className="relative" ref={appointDropdownRef}>
                <button
                  onClick={() => setIsAppointDropdownOpen((prev) => !prev)}
                  className="w-fit flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-purple-500/20 via-amber-500/20 to-purple-500/20 hover:from-purple-500/30 hover:to-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm attention-pulse"
                  title="Multiple officiating appointments required today — tap to select"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Appoint Staff ({pendingAppointmentsCount})</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${
                      isAppointDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isAppointDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                      transition={SPRING_TRANSITIONS.snappy}
                      className="absolute right-0 top-full mt-2 z-50 w-64 p-2 rounded-2xl bg-slate-900/98 border border-slate-700 shadow-2xl backdrop-blur-2xl space-y-1.5"
                    >
                      <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider">
                        Required Appointments ({pendingAppointmentsCount})
                      </div>

                      {offACResult.needsAppointment && (
                        <button
                          onClick={() => {
                            setIsAppointDropdownOpen(false);
                            openOfficiatingModal({ type: 'AC' });
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                            <div>
                              <div className="font-bold text-purple-200">Officiating AC</div>
                              <div className="text-[10px] text-slate-400">Both AC & AAC absent</div>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-600 group-hover:bg-purple-500 text-white font-bold shadow-sm">
                            Appoint
                          </span>
                        </button>
                      )}

                      {unappointedCTs.map(({ teacher, section }) => (
                        <button
                          key={section}
                          onClick={() => {
                            setIsAppointDropdownOpen(false);
                            openOfficiatingModal({ type: 'CT', section });
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2">
                            <School className="w-3.5 h-3.5 text-amber-400" />
                            <div>
                              <div className="font-bold text-amber-200">Off. CT • {section}</div>
                              <div className="text-[10px] text-slate-400">{teacher.abbr} absent</div>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold shadow-sm">
                            Appoint
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {uncoveredSlots.length > 0 && (
              <button
                onClick={handleAutoResolve}
                className="w-fit flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-200 animate-spin" style={{ animationDuration: '3s' }} />
                Auto-Resolve ({uncoveredSlots.length} Slots)
              </button>
            )}

            {/* Brain Studio Config Button (FEAT-61) */}
            <button
              onClick={() => setIsBrainModalOpen(true)}
              className="w-fit flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 hover:border-purple-400 text-purple-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-sm group"
              title="Configure Auto-Resolve Strategy & Heuristic Weights"
            >
              <Brain className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform duration-200" />
              <span className="hidden sm:inline">Brain Studio</span>
            </button>

            {/* Rightmost Aligned Collapse Icon Button (FEAT-44) */}
            <button
              onClick={() => setIsOverviewCollapsed((prev) => !prev)}
              className="p-1.5 rounded-xl glass-pill border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center active:scale-95 transition-all cursor-pointer ml-auto md:ml-0"
              title={isOverviewCollapsed ? 'Show Overview & KPI Summary' : 'Collapse Overview'}
              aria-label={isOverviewCollapsed ? 'Expand Overview' : 'Collapse Overview'}
            >
              {isOverviewCollapsed ? (
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Overview: KPI Cards Strip (FEAT-43) */}
        <AnimatePresence initial={false}>
          {!isOverviewCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_TRANSITIONS.snappy}
              className="overflow-hidden will-change-[height,opacity]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 pb-1">
                {/* 1st Card: Covered Substitutions */}
                <div
                  onClick={() => setFilterMode('covered')}
                  className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                    filterMode === 'covered'
                      ? 'bg-emerald-500/20 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-emerald-500/50 hover:border-emerald-500/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-xs text-emerald-300">Covered Duties</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{daySubstitutions.length}</div>
                  <div className="text-[11px] text-emerald-400 mt-1">Assignments resolved</div>
                </div>

                {/* 2nd Card: Uncovered Needs */}
                <div
                  onClick={() => setFilterMode('uncovered')}
                  className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                    filterMode === 'uncovered'
                      ? 'bg-rose-500/20 border-rose-500/60 '
                      : 'bg-slate-900/60 border-rose-500/60 hover:border-rose-500/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-xs text-rose-300">Uncovered Needs</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      {uncoveredSlots.length > 0 ? 'ALERT' : 'CLEAR'}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{uncoveredSlots.length}</div>
                  <div className="text-[11px] text-rose-400 mt-1">Pending substitution coverage</div>
                </div>

                {/* 3rd Card: Officiating Staff */}
                {(() => {
                  const hasPending = offACResult.needsAppointment || unappointedCTs.length > 0;
                  const assignedCount = (offACResult.isManuallyAssigned ? 1 : 0) + Object.keys(offCTMap).length;
                  const pendingCount = (offACResult.needsAppointment ? 1 : 0) + unappointedCTs.length;

                  return (
                    <div
                      className={`p-3 sm:p-4 rounded-xl transition-all ${
                        hasPending
                          ? 'bg-amber-950/30 border border-amber-500/70 ring-1 ring-amber-500/30 attention-pulse'
                          : 'bg-slate-900/60 border border-purple-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className={`font-semibold text-xs ${hasPending ? 'text-amber-300' : 'text-purple-300'}`}>
                          Officiating Staff
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                            hasPending
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                          }`}
                        >
                          {hasPending ? 'ALERT' : 'ROLE'}
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">
                        {assignedCount}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] gap-2">
                        <span className={hasPending ? 'text-amber-300 font-semibold truncate' : 'text-purple-400 truncate'}>
                          {hasPending
                            ? `${pendingCount} Appointment${pendingCount > 1 ? 's' : ''} Needed`
                            : offACResult.isManuallyAssigned
                            ? `Off. AC: ${effectiveAC}`
                            : Object.keys(offCTMap).length > 0
                            ? `${Object.keys(offCTMap).length} Off. CT Assigned`
                            : 'No temporary roles assigned'}
                        </span>
                        {hasPending && (
                          <button
                            onClick={() => {
                              if (offACResult.needsAppointment) {
                                openOfficiatingModal({ type: 'AC' });
                              } else if (unappointedCTs.length > 0) {
                                openOfficiatingModal({ type: 'CT', section: unappointedCTs[0].section });
                              }
                            }}
                            className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] active:scale-95 transition-all cursor-pointer shadow-sm flex-shrink-0"
                          >
                            Appoint
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar: Filters, Search, Sorting & List/Grid View Mode (FEAT-58) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by teacher, sub, class (e.g. Prep A)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Right Toolbar Controls: Filter pills, Sorting pills, View Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterMode === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('uncovered')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  filterMode === 'uncovered' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Uncovered</span>
                {uncoveredSlots.length > 0 && (
                  <span className="text-[10px] px-1 rounded-full bg-rose-950 text-rose-200">
                    {uncoveredSlots.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterMode('covered')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterMode === 'covered' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Covered
              </button>
              {loggedInTeacher && (
                <button
                  onClick={() => setFilterMode('my')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filterMode === 'my' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  My Duties
                </button>
              )}
            </div>

            {/* Sorting Selector (FEAT-58) */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSubstitutionsSortBy('period')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                  substitutionsSortBy === 'period' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort by period order"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="hidden sm:inline">Period</span>
              </button>
              <button
                type="button"
                onClick={() => setSubstitutionsSortBy('name')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer select-none active:scale-95 ${
                  substitutionsSortBy === 'name' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort by teacher name A-Z"
              >
                Name
              </button>
              <button
                type="button"
                onClick={() => setSubstitutionsSortBy('role')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer select-none active:scale-95 ${
                  substitutionsSortBy === 'role' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort by role hierarchy"
              >
                Role
              </button>
            </div>

            {/* View Mode Toggle: Grid vs List (FEAT-58) */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSubstitutionsViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer select-none active:scale-95 ${
                  substitutionsViewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSubstitutionsViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer select-none active:scale-95 ${
                  substitutionsViewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Compact List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Uncovered Needs Section */}
      {(filterMode === 'all' || filterMode === 'uncovered') && uncoveredSlots.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Uncovered Substitution Duties ({uncoveredSlots.length})
            </h3>
          </div>

          {substitutionsViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {uncoveredSlots.map((slot, idx) => {
                const parsed = parseCellSlot(slot.task);
                const absenceRecord = absences.find(
                  (a) => a.day === selectedDay && a.teacherName === slot.originalTeacher
                );
                const isAwayDuty = absenceRecord?.type === 'AWAY_OFFICIAL';

                return (
                  <div
                    key={`${slot.period}-${slot.originalTeacher}-${idx}`}
                    onClick={() => {
                      openAssignSubModal({
                        day: selectedDay,
                        period: slot.period,
                        originalTeacher: slot.originalTeacher,
                        className: parsed.className || 'KG',
                        subject: parsed.subject || slot.task,
                        task: slot.task,
                      });
                    }}
                    className={`glass-panel border rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg transition-all group cursor-pointer select-none active:scale-[0.99] ${
                      isAwayDuty
                        ? 'border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-950/15 hover:bg-indigo-950/25'
                        : 'border-rose-500/30 hover:border-rose-500/60 bg-rose-950/10 hover:bg-rose-950/20'
                    }`}
                    title={`Tap anywhere to assign substitute for Period ${slot.period} (${parsed.className || 'KG'})`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isAwayDuty
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {slot.period} Period
                      </span>
                      <span className="text-xs font-bold text-white">
                        {parsed.className || 'KG'} • {parsed.subject || slot.task}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div
                          className={`text-[10px] ${
                            isAwayDuty ? 'text-indigo-400 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {isAwayDuty
                            ? absenceRecord?.venue
                              ? `📍 Duty: ${absenceRecord.venue}`
                              : '📍 On Official Duty'
                            : 'Absent Teacher'}
                        </div>
                        <div className="font-bold truncate max-w-[130px] text-slate-200">
                          {slot.originalTeacher}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-[10px] font-semibold ${
                            isAwayDuty ? 'text-indigo-400' : 'text-rose-400'
                          }`}
                        >
                          Status
                        </div>
                        <div
                          className={`font-bold ${
                            isAwayDuty ? 'text-indigo-400' : 'text-rose-400'
                          } animate-pulse`}
                        >
                          Needs Sub!
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignSubModal({
                          day: selectedDay,
                          period: slot.period,
                          originalTeacher: slot.originalTeacher,
                          className: parsed.className || 'KG',
                          subject: parsed.subject || slot.task,
                          task: slot.task,
                        });
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 group-hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign Substitute</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {uncoveredSlots.map((slot, idx) => {
                const parsed = parseCellSlot(slot.task);
                const isCT = isClassTeacher(slot.originalTeacher);
                const absenceRecord = absences.find(
                  (a) => a.day === selectedDay && a.teacherName === slot.originalTeacher
                );
                const isAwayDuty = absenceRecord?.type === 'AWAY_OFFICIAL';

                return (
                  <motion.div
                    key={`${slot.period}-${slot.originalTeacher}-${idx}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING_TRANSITIONS.snappy}
                    onClick={() => {
                      openAssignSubModal({
                        day: selectedDay,
                        period: slot.period,
                        originalTeacher: slot.originalTeacher,
                        className: parsed.className || 'KG',
                        subject: parsed.subject || slot.task,
                        task: slot.task,
                      });
                    }}
                    className={`glass-panel px-3 sm:px-4 py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm transition-all cursor-pointer select-none active:scale-[0.99] group ${
                      isAwayDuty
                        ? 'border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-950/15 hover:bg-indigo-950/25'
                        : 'border-rose-500/30 hover:border-rose-500/60 bg-rose-950/10 hover:bg-rose-950/20'
                    }`}
                    title={`Tap anywhere to assign substitute for Period ${slot.period} (${parsed.className || 'KG'})`}
                  >
                    {/* Left: Period & Class */}
                    <div className="flex items-center gap-2.5 min-w-[160px]">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isAwayDuty
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {slot.period}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">{parsed.className || 'KG'}</div>
                        <div className="text-[10px] text-slate-400">{parsed.subject || slot.task}</div>
                      </div>
                    </div>

                    {/* Middle: Absent / Away Teacher & Needs Sub badge */}
                    <div className="flex items-center gap-2 sm:gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] ${isAwayDuty ? 'text-indigo-400' : 'text-slate-400'}`}>
                          {isAwayDuty ? 'On Duty:' : 'Absent:'}
                        </span>
                        <span className={`font-bold ${isAwayDuty ? 'text-indigo-300' : 'text-rose-300'}`}>
                          {slot.originalTeacher}
                          {isAwayDuty && absenceRecord?.venue && (
                            <span className="text-[10px] text-indigo-400/90 font-normal ml-1">
                              ({absenceRecord.venue})
                            </span>
                          )}
                          {isCT && <span className="text-[10px] text-amber-400/80 font-normal ml-1">(CT)</span>}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border animate-pulse ${
                          isAwayDuty
                            ? 'bg-indigo-500/25 text-indigo-200 border-indigo-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        Needs Sub!
                      </span>
                    </div>

                    {/* Right: Assign Button */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignSubModal({
                            day: selectedDay,
                            period: slot.period,
                            originalTeacher: slot.originalTeacher,
                            className: parsed.className || 'KG',
                            subject: parsed.subject || slot.task,
                            task: slot.task,
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 group-hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Active Covered Substitutions: GRID or LIST Mode (FEAT-58) */}
      {(filterMode === 'all' || filterMode === 'covered' || filterMode === 'my') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Active Covered Substitutions ({filteredSubstitutions.length})
            </h3>
          </div>

          {filteredSubstitutions.length > 0 ? (
            substitutionsViewMode === 'grid' ? (
              /* --- GRID CARD VIEW --- */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredSubstitutions.map((sub) => {
                  const isCT = isClassTeacher(sub.originalTeacher);
                  const isCurrentTeacherDuty = Boolean(
                    loggedInTeacher && loggedInTeacher === sub.substituteTeacher
                  );
                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={SPRING_TRANSITIONS.snappy}
                      className="glass-panel border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                          {sub.period} Period
                        </span>
                        <span className="text-xs font-bold text-white">
                          {sub.className} • {sub.subject}
                        </span>
                      </div>

                      {/* Teacher Transfer Row */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">
                            Absent {isCT && <span className="text-amber-400/90 font-medium">(Class Teacher)</span>}
                          </div>
                          <div className="font-semibold line-through truncate max-w-[110px] text-rose-300">
                            {sub.originalTeacher}
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />

                        <div className="text-right">
                          <div className="text-[10px] text-emerald-400 font-semibold">Sub Assigned</div>
                          <div className="font-bold text-emerald-300 truncate max-w-[120px]">
                            {sub.substituteTeacher}
                          </div>
                        </div>
                      </div>

                      {/* Status Badges or Teacher Self-Service Actions (FEAT-49) */}
                      {sub.status === 'ACCEPTED' ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          <span>Accepted by {sub.substituteTeacher}</span>
                        </div>
                      ) : sub.status === 'DISPUTED' ? (
                        <div className="space-y-1 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                          <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                            <Flag className="w-3.5 h-3.5" />
                            <span>Disputed by {sub.substituteTeacher}</span>
                          </div>
                          {sub.disputeRemark && (
                            <div className="text-[10px] text-rose-200/90 italic pl-5">
                              "{sub.disputeRemark}"
                            </div>
                          )}
                        </div>
                      ) : isCurrentTeacherDuty ? (
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            onClick={() => acceptSubstitution(sub.id)}
                            className="flex-1 py-1 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                            title="Accept this substitution duty"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => openDisputeModal(sub)}
                            className="py-1 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                            title="Dispute or decline this assignment"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            <span>Dispute</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-300 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span>Assigned to {sub.substituteTeacher}</span>
                        </div>
                      )}

                      {/* Footer details & remove button */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-500 truncate">
                          By {sub.assignedBy || 'Coordinator'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {sub.status === 'DISPUTED' && (
                            <button
                              onClick={() =>
                                openAssignSubModal({
                                  day: selectedDay,
                                  period: sub.period,
                                  originalTeacher: sub.originalTeacher,
                                  className: sub.className,
                                  subject: sub.subject,
                                  task: `${sub.className} ${sub.subject}`,
                                })
                              }
                              className="px-2 py-0.5 rounded-lg text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
                              title="Reassign another substitute"
                            >
                              Reassign
                            </button>
                          )}
                          <button
                            onClick={() => removeSubstitution(sub.id)}
                            className="px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Release this substitution assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Release Sub</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* --- HIGH-DENSITY COMPACT LIST VIEW (FEAT-58) --- */
              <div className="space-y-2">
                {filteredSubstitutions.map((sub) => {
                  const isCT = isClassTeacher(sub.originalTeacher);
                  const isCurrentTeacherDuty = Boolean(
                    loggedInTeacher && loggedInTeacher === sub.substituteTeacher
                  );
                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING_TRANSITIONS.snappy}
                      className="glass-panel px-3 sm:px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm transition-all"
                    >
                      {/* Left: Period & Class */}
                      <div className="flex items-center gap-2.5 min-w-[160px]">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          {sub.period}
                        </span>
                        <div>
                          <div className="font-bold text-white text-xs">{sub.className}</div>
                          <div className="text-[10px] text-slate-400">{sub.subject}</div>
                        </div>
                      </div>

                      {/* Middle: Transfer */}
                      <div className="flex items-center gap-2 sm:gap-3 text-xs">
                        <span className="font-semibold line-through text-xs text-rose-300">
                          {sub.originalTeacher}
                          {isCT && <span className="text-[10px] text-amber-400/80 font-normal ml-1">(CT)</span>}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="font-bold text-xs text-emerald-300">
                          {sub.substituteTeacher}
                        </span>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                        {sub.status === 'ACCEPTED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            <span>Accepted</span>
                          </span>
                        ) : sub.status === 'DISPUTED' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full" title={sub.disputeRemark}>
                              <Flag className="w-3 h-3" />
                              <span>Disputed</span>
                            </span>
                            <button
                              onClick={() =>
                                openAssignSubModal({
                                  day: selectedDay,
                                  period: sub.period,
                                  originalTeacher: sub.originalTeacher,
                                  className: sub.className,
                                  subject: sub.subject,
                                  task: `${sub.className} ${sub.subject}`,
                                })
                              }
                              className="px-2 py-0.5 rounded-lg text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Reassign
                            </button>
                          </div>
                        ) : isCurrentTeacherDuty ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => acceptSubstitution(sub.id)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                              title="Accept this substitution"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => openDisputeModal(sub)}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                              title="Dispute this substitution"
                            >
                              <Flag className="w-3 h-3" />
                              <span>Dispute</span>
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                            Assigned
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 hidden md:inline ml-1">
                          By {sub.assignedBy || 'Coordinator'}
                        </span>
                        <button
                          onClick={() => removeSubstitution(sub.id)}
                          className="px-2 py-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Release sub"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Release</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 text-xs">
              {filterMode === 'my'
                ? `No substitution duties assigned to ${loggedInTeacher || 'you'} today.`
                : `No covered substitutions recorded for ${selectedDay}.`}
            </div>
          )}
        </section>
      )}

      {/* Officiating Staff Overview (Section 3 - UI-03) */}
      {(offACResult.isManuallyAssigned || offACResult.needsAppointment || Object.keys(offCTMap).length > 0 || unappointedCTs.length > 0) && (
        <section className="glass-panel rounded-2xl p-4 sm:p-5 border border-purple-500/30 bg-purple-950/10 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            Officiating Staff ({selectedDay})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Pending AC Appointment Card (In Coordinator Purple) */}
            {offACResult.needsAppointment && (
              <div
                onClick={() => openOfficiatingModal({ type: 'AC' })}
                className="bg-purple-950/40 border border-purple-500/60 hover:border-purple-400 rounded-xl p-3 flex items-center justify-between purple-attention-pulse cursor-pointer select-none active:scale-[0.99] transition-all group"
                title="Tap anywhere to designate Officiating AC"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Officiating AC</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                      Required
                    </span>
                  </div>
                  <div className="font-bold text-purple-200 text-sm">Both AC & AAC absent today</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openOfficiatingModal({ type: 'AC' });
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600 group-hover:bg-purple-500 text-white font-bold text-xs active:scale-95 transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  Appoint
                </button>
              </div>
            )}

            {/* Pending CT Appointment Card: Single Card if 1, Clubbed Card if >1 */}
            {unappointedCTs.length === 1 && (
              <div
                key={`unappointed-${unappointedCTs[0].section}`}
                onClick={() => openOfficiatingModal({ type: 'CT', section: unappointedCTs[0].section })}
                className="bg-amber-950/40 border border-amber-500/60 hover:border-amber-400 rounded-xl p-3 flex items-center justify-between attention-pulse cursor-pointer select-none active:scale-[0.99] transition-all group"
                title={`Tap anywhere to appoint Officiating CT for ${unappointedCTs[0].section}`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] text-amber-400 font-bold uppercase">Officiating CT • {unappointedCTs[0].section}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                      Required
                    </span>
                  </div>
                  <div className="font-bold text-amber-200 text-sm">Appointment Needed</div>
                  <div className="text-[10px] text-slate-300">
                    CT {unappointedCTs[0].teacher.abbr} absent today
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openOfficiatingModal({ type: 'CT', section: unappointedCTs[0].section });
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold text-xs active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Appoint
                </button>
              </div>
            )}

            {unappointedCTs.length > 1 && (
              <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 attention-pulse sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      Officiating Class Teachers
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                      {unappointedCTs.length} Classes Required
                    </span>
                  </div>
                  <div className="text-xs font-bold text-amber-200">Appointments Needed</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 border-t border-amber-500/20">
                  {unappointedCTs.map(({ teacher, section }) => (
                    <div
                      key={section}
                      onClick={() => openOfficiatingModal({ type: 'CT', section })}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400 text-xs cursor-pointer select-none active:scale-95 transition-all group"
                      title={`Tap to appoint Officiating CT for ${section}`}
                    >
                      <div className="truncate mr-1.5">
                        <div className="font-bold text-amber-300 text-xs">{section}</div>
                        <div className="text-[10px] text-slate-400 truncate">{teacher.abbr}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOfficiatingModal({ type: 'CT', section });
                        }}
                        className="px-2 py-1 rounded-md bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold text-[10px] active:scale-95 transition-all shadow-sm cursor-pointer flex-shrink-0"
                      >
                        Appoint
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {offACResult.isManuallyAssigned && effectiveAC && (
              <div
                onClick={() => openOfficiatingModal({ type: 'AC' })}
                className="bg-slate-900/90 hover:bg-slate-800 border border-purple-500/40 hover:border-purple-400 rounded-xl p-3 flex items-center justify-between cursor-pointer select-none active:scale-[0.99] transition-all group"
                title="Tap anywhere to reassign Officiating AC"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] text-purple-400 font-bold uppercase">Officiating AC</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                      Designated
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">{effectiveAC}</div>
                  <div className="text-[10px] text-slate-400">
                    Officiating Academic Coordinator
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openOfficiatingModal({ type: 'AC' });
                  }}
                  className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold transition-colors cursor-pointer"
                  title="Reassign Officiating AC"
                >
                  ★
                </button>
              </div>
            )}

            {Object.entries(offCTMap).map(([section, teacherName]) => (
              <div
                key={section}
                onClick={() => openOfficiatingModal({ type: 'CT', section })}
                className="bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 rounded-xl p-3 flex items-center justify-between cursor-pointer select-none active:scale-[0.99] transition-all group"
                title={`Tap anywhere to change Officiating CT for ${section}`}
              >
                <div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Off. CT • {section}</span>
                  <div className="font-bold text-white text-sm">{teacherName}</div>
                  <div className="text-[10px] text-slate-400">Class Teacher Responsibilities</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openOfficiatingModal({ type: 'CT', section });
                  }}
                  className="w-8 h-8 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold transition-colors cursor-pointer"
                  title={`Change Officiating CT for ${section}`}
                >
                  🏫
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Auto-Resolve Brain Studio Modal (FEAT-61) */}
      <AutoResolveBrainModal
        isOpen={isBrainModalOpen}
        onClose={() => setIsBrainModalOpen(false)}
      />
    </div>
  );
};
