import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { Teacher, getEffectiveOfficiatingAC } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import {
  Check,
  UserX,
  Search,
  X,
  GraduationCap,
  Clock,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Grid3X3,
  List,
  AlignJustify,
  ArrowUpDown,
} from 'lucide-react';
import { UndoRedoControls } from './UndoRedoControls.js';
import { RosterNormalCard } from './roster/RosterNormalCard.js';
import { RosterCompactCard } from './roster/RosterCompactCard.js';
import { RosterNormalListRow } from './roster/RosterNormalListRow.js';
import { RosterCompactListRow } from './roster/RosterCompactListRow.js';

export const AbsenceRoster: React.FC = () => {
  const {
    directory,
    selectedDay,
    absences,
    availabilities,
    toggleAbsence,
    markAllPresent,
    openAvailabilityModal,
    openOfficiatingModal,
    officiatingAC,
    officiatingCT,
    rosterViewMode,
    setRosterViewMode,
    rosterSortBy,
    setRosterSortBy,
    hideOverviewsByDefault,
    isMinimalUI,
  } = useTimetableStore();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'present' | 'absent' | 'free_from_sub'>('all');
  const [isOverviewCollapsed, setIsOverviewCollapsed] = React.useState(hideOverviewsByDefault);

  // Hierarchy Sorting: AC -> AAC -> CT -> ST (FEAT-36)
  const getHierarchyRank = (t: Teacher): number => {
    if (t.abbr === 'Mrs. R. Pahwa' || (t.role.includes('Academic Coordinator') && !t.role.includes('Asst.'))) return 1;
    if (t.abbr === 'Mrs. S. Lakra' || t.role.includes('Asst. Academic Coordinator')) return 2;
    if (t.role.includes('Class Teacher')) return 3;
    return 4;
  };

  const allTeachers = Object.values(directory).sort((a, b) => {
    if (rosterSortBy === 'name') {
      return a.fullName.localeCompare(b.fullName);
    }
    // Default: 'role' hierarchy
    const rankDiff = getHierarchyRank(a) - getHierarchyRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.fullName.localeCompare(b.fullName);
  });

  // KPI Calculations for today
  const activeAbsences = absences.filter((a) => a.day === selectedDay);

  // Academic Coordinator Succession Logic (LOGIC-04 & BUG-19)
  const offACResult = React.useMemo(() => {
    return getEffectiveOfficiatingAC({
      day: selectedDay,
      absences,
      officiatingACMap: officiatingAC,
    });
  }, [selectedDay, absences, officiatingAC]);

  const absentCount = activeAbsences.filter((a) => a.type !== 'AWAY_OFFICIAL').length;
  const awayCount = activeAbsences.filter((a) => a.type === 'AWAY_OFFICIAL').length;
  const presentCount = allTeachers.length - absentCount - awayCount;
  const freeFromSubCount = allTeachers.filter((t) => {
    const avail = availabilities[t.abbr];
    const isFreeExplicit = avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');
    const isAway = activeAbsences.some((a) => a.teacherName === t.abbr && a.type === 'AWAY_OFFICIAL');
    return isFreeExplicit || isAway;
  }).length;

  // Filter staff by search and status tab
  const filteredTeachers = allTeachers.filter((teacher) => {
    const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
    const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
    const isAway = !!absence && absence.type === 'AWAY_OFFICIAL';
    const isPresent = !isAbsent && !isAway;

    const avail = availabilities[teacher.abbr];
    const isFree = (avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB')) || isAway;

    if (statusFilter === 'present' && !isPresent) return false;
    if (statusFilter === 'absent' && !isAbsent) return false;
    if (statusFilter === 'free_from_sub' && !isFree) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = teacher.fullName.toLowerCase().includes(q) || teacher.abbr.toLowerCase().includes(q);
      const matchRole = teacher.role.toLowerCase().includes(q);
      const matchClass = teacher.primaryClass?.toLowerCase().includes(q);
      const matchDept = teacher.department?.toLowerCase().includes(q);
      return matchName || matchRole || matchClass || matchDept;
    }

    return true;
  });

  const handleMarkAllPresent = () => {
    markAllPresent(selectedDay);
  };

  // UI-09: Normal & Compact Mode Flags (Fully backwards-compatible)
  const isNormalGrid = rosterViewMode === 'normal-grid' || rosterViewMode === 'comfort-grid' || rosterViewMode === 'grid';
  const isCompactGrid = rosterViewMode === 'compact-grid';
  const isNormalList = rosterViewMode === 'normal-list' || rosterViewMode === 'detailed-list';
  const isCompactList = rosterViewMode === 'compact-list' || rosterViewMode === 'list';

  return (
    <div className={`w-full animate-in fade-in duration-200 ${isMinimalUI ? 'space-y-3' : 'space-y-5'}`}>
      {/* Top Header & KPI Summary Bar (UI-01) */}
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
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              Staff Roster Overview ({selectedDay})
            </h2>
            <p className="text-xs text-slate-400">
              Dedicated staff workstation. Sorted: AC → AAC → Class Teachers → Subject Teachers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end w-full md:w-auto">
            {/* Staff Roster Tab Undo / Redo Controls (FEAT-40) */}
            <UndoRedoControls tab="roster" />

            {absentCount + awayCount > 0 && (
              <button
                onClick={handleMarkAllPresent}
                className="w-fit px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Mark All Present
              </button>
            )}

            {/* Rightmost Aligned Collapse Icon Button (FEAT-44) */}
            <button
              onClick={() => setIsOverviewCollapsed((prev) => !prev)}
              className="p-1.5 rounded-xl glass-pill border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center active:scale-95 transition-all cursor-pointer ml-auto md:ml-0"
              title={isOverviewCollapsed ? 'Show Overview & Attendance KPI Summary' : 'Collapse Overview'}
              aria-label={isOverviewCollapsed ? 'Expand Overview' : 'Collapse Overview'}
            >
              {isOverviewCollapsed ? (
                <ChevronDown className="w-4 h-4 text-blue-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible KPI Metric Cards Section */}
        <AnimatePresence initial={false}>
          {!isOverviewCollapsed && (
            <motion.div
              key="roster-overview-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_TRANSITIONS.snappy}
              className="overflow-hidden will-change-[height,opacity]"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                {/* Total Present */}
                <div className="bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-xs text-slate-300">Present</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{presentCount}</div>
                  <div className="text-[11px] text-emerald-400/90 mt-1">On duty at front desk</div>
                </div>

                {/* Total Absent */}
                <div
                  className={`p-3 sm:p-4 rounded-xl border transition-all ${
                    absentCount > 0
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">Absent Today</span>
                    <UserX className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{absentCount}</div>
                  <div className="text-[11px] text-rose-400/90 mt-1">Requires substitute coverage</div>
                </div>

                {/* Away (Official) */}
                <div className="bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-xs text-slate-300">Away (Official)</span>
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{awayCount}</div>
                  <div className="text-[11px] text-indigo-300/80 mt-1">Deputations & official events</div>
                </div>

                {/* Free From Subs */}
                <div className="bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold text-xs text-slate-300">Exempt from Subs</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{freeFromSubCount}</div>
                  <div className="text-[11px] text-amber-300/80 mt-1">Excluded by policy / duties</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar: Search, Attendance Filters, Sorting & 4-Mode View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by full name, abbr, role..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Status Filters, Sorting & 4-Mode View Switcher */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
            {/* Status Segmented Filter */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({allTeachers.length})
              </button>
              <button
                onClick={() => setStatusFilter('present')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'present' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                onClick={() => setStatusFilter('absent')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'absent' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Absent ({absentCount})
              </button>
              <button
                onClick={() => setStatusFilter('free_from_sub')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'free_from_sub' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                No Subs ({freeFromSubCount})
              </button>
            </div>

            {/* Sorting Selector */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setRosterSortBy('role')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  rosterSortBy === 'role' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort by role hierarchy (AC -> AAC -> CT -> ST)"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="hidden sm:inline">Role</span>
              </button>
              <button
                onClick={() => setRosterSortBy('name')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  rosterSortBy === 'name' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort alphabetically by Name"
              >
                A-Z
              </button>
            </div>

            {/* 4-Mode View Switcher (UI-09: Normal Grid, Compact Grid, Normal List, Compact List) */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase px-1.5 hidden lg:inline">Grid:</span>
              <button
                onClick={() => setRosterViewMode('normal-grid')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  isNormalGrid ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Normal Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Normal</span>
              </button>
              <button
                onClick={() => setRosterViewMode('compact-grid')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  isCompactGrid ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Compact Grid"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compact</span>
              </button>

              <span className="text-slate-700 mx-0.5">|</span>

              <span className="text-[10px] text-slate-500 font-bold uppercase px-1.5 hidden lg:inline">List:</span>
              <button
                onClick={() => setRosterViewMode('normal-list')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  isNormalList ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Normal List"
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Normal</span>
              </button>
              <button
                onClick={() => setRosterViewMode('compact-list')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  isCompactList ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Compact List (Single-line 50+ staff table)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compact</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Staff Roster: Modular View Renderers */}
      {isNormalGrid && (
        /* --- MODE 1: NORMAL GRID (Spacious, tactile, non-shifting cards) --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTeachers.map((teacher) => {
            const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
            const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
            const isAwayOfficial = !!absence && absence.type === 'AWAY_OFFICIAL';

            const avail = availabilities[teacher.abbr];
            const isFreeFromSub = (avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB')) || isAwayOfficial;

            const isCT = teacher.role.includes('Class Teacher');
            const isAC = teacher.abbr === 'Mrs. R. Pahwa';
            const isAAC = teacher.abbr === 'Mrs. S. Lakra';
            const offCTSection = teacher.primaryClass ? officiatingCT[selectedDay]?.[teacher.primaryClass] : undefined;

            return (
              <RosterNormalCard
                key={teacher.id}
                teacher={teacher}
                isAbsent={isAbsent}
                isAwayOfficial={isAwayOfficial}
                isCT={isCT}
                isAC={isAC}
                isAAC={isAAC}
                offCTSection={offCTSection}
                offACResult={offACResult}
                isFreeFromSub={isFreeFromSub}
                onToggleAbsence={toggleAbsence}
                onOpenAvailability={openAvailabilityModal}
                onOpenOfficiatingCT={(section) => openOfficiatingModal({ type: 'CT', section })}
                onOpenOfficiatingAC={() => openOfficiatingModal({ type: 'AC' })}
              />
            );
          })}
        </div>
      )}

      {isCompactGrid && (
        /* --- MODE 2: COMPACT GRID (High-density space-efficient cards) --- */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {filteredTeachers.map((teacher) => {
            const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
            const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
            const isCT = teacher.role.includes('Class Teacher');
            const isAC = teacher.abbr === 'Mrs. R. Pahwa';
            const isAAC = teacher.abbr === 'Mrs. S. Lakra';

            return (
              <RosterCompactCard
                key={teacher.id}
                teacher={teacher}
                isAbsent={isAbsent}
                isCT={isCT}
                isAC={isAC}
                isAAC={isAAC}
                onToggleAbsence={toggleAbsence}
                onOpenAvailability={openAvailabilityModal}
              />
            );
          })}
        </div>
      )}

      {isCompactList && (
        /* --- MODE 3: COMPACT LIST (Single-line high-velocity table for 50+ staff) --- */
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
          {filteredTeachers.map((teacher) => {
            const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
            const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
            const isAwayOfficial = !!absence && absence.type === 'AWAY_OFFICIAL';

            const avail = availabilities[teacher.abbr];
            const isFreeFromSub = (avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB')) || isAwayOfficial;

            const isCT = teacher.role.includes('Class Teacher');
            const isAC = teacher.abbr === 'Mrs. R. Pahwa';
            const isAAC = teacher.abbr === 'Mrs. S. Lakra';

            return (
              <RosterCompactListRow
                key={teacher.id}
                teacher={teacher}
                isAbsent={isAbsent}
                isAwayOfficial={isAwayOfficial}
                isCT={isCT}
                isAC={isAC}
                isAAC={isAAC}
                isFreeFromSub={isFreeFromSub}
                onToggleAbsence={toggleAbsence}
                onOpenAvailability={openAvailabilityModal}
              />
            );
          })}
        </div>
      )}

      {isNormalList && (
        /* --- MODE 4: NORMAL LIST (Expanded rows with officiating controls) --- */
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
          {filteredTeachers.map((teacher) => {
            const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
            const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
            const isAwayOfficial = !!absence && absence.type === 'AWAY_OFFICIAL';

            const avail = availabilities[teacher.abbr];
            const isFreeFromSub = (avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB')) || isAwayOfficial;

            const isCT = teacher.role.includes('Class Teacher');
            const isAC = teacher.abbr === 'Mrs. R. Pahwa';
            const isAAC = teacher.abbr === 'Mrs. S. Lakra';
            const offCTSection = teacher.primaryClass ? officiatingCT[selectedDay]?.[teacher.primaryClass] : undefined;

            return (
              <RosterNormalListRow
                key={teacher.id}
                teacher={teacher}
                isAbsent={isAbsent}
                isAwayOfficial={isAwayOfficial}
                isCT={isCT}
                isAC={isAC}
                isAAC={isAAC}
                offCTSection={offCTSection}
                offACResult={offACResult}
                isFreeFromSub={isFreeFromSub}
                onToggleAbsence={toggleAbsence}
                onOpenAvailability={openAvailabilityModal}
                onOpenOfficiatingCT={(section) => openOfficiatingModal({ type: 'CT', section })}
                onOpenOfficiatingAC={() => openOfficiatingModal({ type: 'AC' })}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredTeachers.length === 0 && (
        <div className="glass-panel rounded-2xl p-10 text-center text-slate-500 text-xs">
          No staff matching &ldquo;{searchQuery}&rdquo; under the &ldquo;{statusFilter}&rdquo; filter.
        </div>
      )}
    </div>
  );
};
