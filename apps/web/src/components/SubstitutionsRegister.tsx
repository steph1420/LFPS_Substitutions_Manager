import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { autoResolveSubstitutions, PeriodId, parseCellSlot, getEffectiveOfficiatingAC } from '@lfps/core';
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
} from 'lucide-react';
import { UndoRedoControls } from './UndoRedoControls.js';
import { AutoResolveBrainModal } from './AutoResolveBrainModal.js';

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

  const currentSchedule = schedule[selectedDay] || {};

  // Find all uncovered teaching slots from absent teachers on this day
  const uncoveredSlots = React.useMemo(() => {
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

  // Uncovered slots strictly for absent Class Teachers (LOGIC-05)
  const ctUncoveredSlots = React.useMemo(() => {
    return uncoveredSlots.filter((slot) => isClassTeacher(slot.originalTeacher));
  }, [uncoveredSlots, directory]);

  // Handle 1-Tap Auto Resolve for All Slots
  const handleAutoResolve = () => {
    if (uncoveredSlots.length === 0) return;

    const plan = autoResolveSubstitutions({
      day: selectedDay,
      uncoveredSlots,
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

  // Handle 1-Tap Dedicated Auto Resolve for Class Teachers (LOGIC-05)
  const handleAutoResolveCT = () => {
    if (ctUncoveredSlots.length === 0) return;

    const plan = autoResolveSubstitutions({
      day: selectedDay,
      uncoveredSlots: ctUncoveredSlots,
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
      return list.sort((a, b) => a.originalTeacher.localeCompare(b.originalTeacher));
    }
    if (substitutionsSortBy === 'role') {
      return list.sort((a, b) => {
        const roleA = directory[a.originalTeacher]?.role || '';
        const roleB = directory[b.originalTeacher]?.role || '';
        return roleA.localeCompare(roleB);
      });
    }
    // Default: 'period'
    const periodOrder: Record<string, number> = {
      'G/PD': 0,
      '1st': 1,
      '2nd': 2,
      '3rd': 3,
      '4th': 4,
      '5th': 5,
      '6th': 6,
    };
    return list.sort((a, b) => (periodOrder[a.period] ?? 99) - (periodOrder[b.period] ?? 99));
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

            {/* Stable Off. AC Prompt (UI-05: Non-shifting action in toolbar) */}
            {offACResult.needsAppointment && (
              <button
                onClick={() => openOfficiatingModal({ type: 'AC' })}
                className="w-fit flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm attention-pulse"
                title="Both AC and AAC are absent today — designate Officiating AC"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Appoint Off. AC</span>
              </button>
            )}

            {/* Dedicated CT Classes Auto-Resolve Button (LOGIC-05) */}
            {ctUncoveredSlots.length > 0 && (
              <button
                onClick={handleAutoResolveCT}
                className="w-fit flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer"
                title="Auto-resolve subject substitutions for classes with absent Class Teachers"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: '4s' }} />
                <span>⚡ Auto-Resolve CT Classes ({ctUncoveredSlots.length})</span>
              </button>
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
                      ? 'bg-rose-500/20 border-rose-500/60 shadow-md shadow-rose-500/10'
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
                <div
                  className={`p-3 sm:p-4 rounded-xl transition-all ${
                    offACResult.needsAppointment
                      ? 'bg-amber-950/30 border border-amber-500/70 ring-1 ring-amber-500/30 attention-pulse'
                      : 'bg-slate-900/60 border border-purple-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-xs text-purple-300">Officiating Staff</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40">
                      ROLE
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {(offACResult.isManuallyAssigned ? 1 : 0) + Object.keys(offCTMap).length}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className={offACResult.needsAppointment ? 'text-amber-300 font-semibold' : 'text-purple-400'}>
                      {offACResult.needsAppointment
                        ? 'AC: Needs Appointment'
                        : offACResult.isManuallyAssigned
                        ? `Off. AC: ${effectiveAC}`
                        : Object.keys(offCTMap).length > 0
                        ? `${Object.keys(offCTMap).length} Off. CT Assigned`
                        : 'No temporary roles assigned'}
                    </span>
                    {offACResult.needsAppointment && (
                      <button
                        onClick={() => openOfficiatingModal({ type: 'AC' })}
                        className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] active:scale-95 transition-all cursor-pointer shadow-sm"
                      >
                        Appoint
                      </button>
                    )}
                  </div>
                </div>
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
                onClick={() => setSubstitutionsSortBy('period')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  substitutionsSortBy === 'period' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort by period order"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="hidden sm:inline">Period</span>
              </button>
              <button
                onClick={() => setSubstitutionsSortBy('name')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  substitutionsSortBy === 'name' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort by teacher name A-Z"
              >
                Name
              </button>
              <button
                onClick={() => setSubstitutionsSortBy('role')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  substitutionsSortBy === 'role' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort by role hierarchy"
              >
                Role
              </button>
            </div>

            {/* View Mode Toggle: Grid vs List (FEAT-58) */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setSubstitutionsViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  substitutionsViewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSubstitutionsViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  substitutionsViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {uncoveredSlots.map((slot, idx) => {
              const parsed = parseCellSlot(slot.task);
              const isCT = isClassTeacher(slot.originalTeacher);

              return (
                <div
                  key={`${slot.period}-${slot.originalTeacher}-${idx}`}
                  className={`glass-panel border rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg transition-all group ${
                    isCT
                      ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500/60'
                      : 'border-rose-500/30 hover:border-rose-500/50 bg-rose-950/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isCT
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {slot.period} Period {isCT && '• CT'}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {parsed.className || 'KG'} • {parsed.subject || slot.task}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Absent Teacher</div>
                      <div
                        className={`font-bold truncate max-w-[130px] ${
                          isCT ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        {slot.originalTeacher}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-rose-400 font-semibold">Status</div>
                      <div className="font-bold text-rose-400 animate-pulse">Needs Sub!</div>
                    </div>
                  </div>

                  <button
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
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer group-hover:bg-blue-500"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Assign Substitute</span>
                  </button>
                </div>
              );
            })}
          </div>
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
      {(offACResult.isManuallyAssigned || offACResult.needsAppointment || Object.keys(offCTMap).length > 0) && (
        <section className="glass-panel rounded-2xl p-4 sm:p-5 border border-purple-500/30 bg-purple-950/10 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            Officiating Staff ({selectedDay})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {offACResult.needsAppointment && (
              <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3 flex items-center justify-between attention-pulse">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] text-amber-400 font-bold uppercase">Officiating AC</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                      Required
                    </span>
                  </div>
                  <div className="font-bold text-amber-200 text-sm">Appointment Needed</div>
                  <div className="text-[10px] text-slate-300">Both AC & AAC absent today</div>
                </div>
                <button
                  onClick={() => openOfficiatingModal({ type: 'AC' })}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Appoint
                </button>
              </div>
            )}

            {offACResult.isManuallyAssigned && effectiveAC && (
              <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 flex items-center justify-between">
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
                  onClick={() => openOfficiatingModal({ type: 'AC' })}
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
                className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Off. CT • {section}</span>
                  <div className="font-bold text-white text-sm">{teacherName}</div>
                  <div className="text-[10px] text-slate-400">Class Teacher Responsibilities</div>
                </div>
                <button
                  onClick={() => openOfficiatingModal({ type: 'CT', section })}
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
