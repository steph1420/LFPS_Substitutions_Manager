import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS, COLOR_ROLES } from '@lfps/ui';
import { Teacher } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import {
  Check,
  Building2,
  UserX,
  SlidersHorizontal,
  Search,
  X,
  GraduationCap,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react';
import { UndoRedoControls } from './UndoRedoControls.js';

export const AbsenceRoster: React.FC = () => {
  const {
    directory,
    schedule,
    selectedDay,
    absences,
    availabilities,
    toggleAbsence,
    setStaffAvailability,
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
      return a.abbr.localeCompare(b.abbr);
    }
    // Default: 'role' hierarchy
    const rankDiff = getHierarchyRank(a) - getHierarchyRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.abbr.localeCompare(b.abbr);
  });

  // KPI Calculations for today
  const activeAbsences = absences.filter((a) => a.day === selectedDay);
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
    activeAbsences.forEach((a) => {
      toggleAbsence(a.teacherName);
    });
  };

  return (
    <div className={`w-full animate-in fade-in duration-200 ${isMinimalUI ? 'space-y-3' : 'space-y-5'}`}>
      {/* Top Header & KPI Summary Bar */}
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
              Staff Attendance & Availability Roster ({selectedDay})
            </h2>
            <p className="text-xs text-slate-400">
              Dedicated staff workstation. Hierarchy sorted: AC → AAC → Class Teachers → Subject Specialists.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end w-full md:w-auto">
            {/* Staff Roster Tab Undo / Redo Controls (FEAT-40) */}
            <UndoRedoControls tab="roster" />

            {absentCount + awayCount > 0 && (
              <button
                onClick={handleMarkAllPresent}
                className="w-fit px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
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

        {/* Collapsible Overview: KPI Strip (BUG-16: 120fps GPU Spring Easing) */}
        <AnimatePresence initial={false}>
          {!isOverviewCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_TRANSITIONS.snappy}
              className="overflow-hidden will-change-[height,opacity]"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs pt-1 pb-1">
                {/* Present Card */}
                <div
                  onClick={() => setStatusFilter('present')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    statusFilter === 'present'
                      ? 'bg-emerald-500/20 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-medium text-[11px]">Present Today</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">{presentCount}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Faculty on-campus</div>
                </div>

                {/* Absent Card */}
                <div
                  onClick={() => setStatusFilter('absent')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    statusFilter === 'absent'
                      ? 'bg-rose-500/20 border-rose-500/50 shadow-md shadow-rose-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-medium text-[11px]">Absent Staff</span>
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">{absentCount}</div>
                  <div className="text-[10px] text-rose-400 mt-0.5">Coverage required</div>
                </div>

                {/* Away (Official) Card */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-medium text-[11px]">Away (Official)</span>
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">{awayCount}</div>
                  <div className="text-[10px] text-indigo-300 mt-0.5">On deputation / off-duty</div>
                </div>

                {/* Free from Sub Card (LOGIC-01: Away counted under Free) */}
                <div
                  onClick={() => setStatusFilter('free_from_sub')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    statusFilter === 'free_from_sub'
                      ? 'bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-medium text-[11px]">Free / Excused</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">{freeFromSubCount}</div>
                  <div className="text-[10px] text-amber-300 mt-0.5">Bus, PTM or Away</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar: Search, Filters, Sorting & Grid/List View Toggle (FEAT-58) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by teacher name, class (e.g. KG A), role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Toolbar Controls: Status filter, Sorting, View Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Status Pills */}
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
                Free ({freeFromSubCount})
              </button>
            </div>

            {/* Sorting Selector (FEAT-58) */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setRosterSortBy('role')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  rosterSortBy === 'role' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort by leadership hierarchy rank (AC -> AAC -> CT -> ST)"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="hidden sm:inline">Role</span>
              </button>
              <button
                onClick={() => setRosterSortBy('name')}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  rosterSortBy === 'name' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sort alphabetically A-Z"
              >
                A-Z
              </button>
            </div>

            {/* View Mode Toggle: Grid vs List (FEAT-58) */}
            <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setRosterViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  rosterViewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setRosterViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  rosterViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Compact List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Staff Roster: GRID or LIST Mode (FEAT-58) */}
      {rosterViewMode === 'grid' ? (
        /* --- GRID CARD VIEW --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTeachers.map((teacher) => {
            const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
            const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
            const isAwayOfficial = !!absence && absence.type === 'AWAY_OFFICIAL';

            const avail = availabilities[teacher.abbr];
            const isFreeFromSub = (avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB')) || isAwayOfficial;

            // Role classifications (FEAT-56)
            const isAC = teacher.abbr === 'Mrs. R. Pahwa' || (teacher.role.includes('Academic Coordinator') && !teacher.role.includes('Asst.'));
            const isAAC = teacher.abbr === 'Mrs. S. Lakra' || teacher.role.includes('Asst. Academic Coordinator');
            const isCT = teacher.role.includes('Class Teacher') && !isAC && !isAAC;

            // Load today
            const periodsToday = Object.entries(schedule[selectedDay] || {}).filter(
              ([, row]) => row[teacher.abbr] && row[teacher.abbr] !== 'Free' && row[teacher.abbr] !== '-'
            );

            const offCTSection = teacher.primaryClass ? officiatingCT[selectedDay]?.[teacher.primaryClass] : null;
            const offAC = officiatingAC[selectedDay];

            const blobBorder = isAbsent
              ? COLOR_ROLES.absent.border
              : isAwayOfficial
              ? COLOR_ROLES.awayOfficial.border
              : isAC || isAAC
              ? COLOR_ROLES.coordinator.border
              : isCT
              ? COLOR_ROLES.classTeacher.border
              : COLOR_ROLES.subjectTeacher.border;

            return (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING_TRANSITIONS.snappy}
                className={`glass-panel rounded-2xl border transition-all flex flex-col justify-between shadow-lg ${
                  isMinimalUI ? 'p-3 space-y-2.5' : 'p-4 sm:p-5 space-y-3.5'
                } ${
                  isAbsent
                    ? 'border-rose-500/40 bg-rose-950/15'
                    : isAwayOfficial
                    ? 'border-indigo-500/40 bg-indigo-950/15'
                    : isCT
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header: Teacher Avatar, Role Badge & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Role Avatar Blob */}
                    <div
                      className="relative w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0"
                      style={{
                        backgroundColor: isAbsent
                          ? COLOR_ROLES.absent.bg
                          : isAwayOfficial
                          ? COLOR_ROLES.awayOfficial.bg
                          : isAC || isAAC
                          ? COLOR_ROLES.coordinator.bg
                          : isCT
                          ? COLOR_ROLES.classTeacher.bg
                          : COLOR_ROLES.subjectTeacher.bg,
                        border: `1.5px solid ${blobBorder}`,
                        color: isAbsent
                          ? COLOR_ROLES.absent.text
                          : isAwayOfficial
                          ? COLOR_ROLES.awayOfficial.text
                          : isAC || isAAC
                          ? COLOR_ROLES.coordinator.text
                          : isCT
                          ? COLOR_ROLES.classTeacher.text
                          : COLOR_ROLES.subjectTeacher.text,
                      }}
                    >
                      {teacher.initials}
                      {isAC && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-purple-600 text-white font-extrabold px-1.5 py-0.2 rounded-full shadow-sm">
                          AC
                        </span>
                      )}
                      {isAAC && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-purple-600 text-white font-extrabold px-1.5 py-0.2 rounded-full shadow-sm">
                          AAC
                        </span>
                      )}
                    </div>

                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">{teacher.abbr}</span>
                        {/* Class Teacher Golden Badge (FEAT-56) */}
                        {isCT && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {teacher.primaryClass}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{teacher.fullName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{teacher.department || teacher.role}</div>
                    </div>
                  </div>

                  {/* Duty / Availability Settings shortcut button */}
                  <button
                    onClick={() => openAvailabilityModal(teacher.abbr)}
                    className="p-1.5 rounded-xl border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Configure Duties & Availability Remarks"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Teaching Load Summary */}
                <div className="text-xs rounded-xl bg-slate-900/70 border border-slate-800/80 px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    Today's Load:
                  </span>
                  <span className="font-semibold text-slate-200">
                    {periodsToday.length > 0 ? `${periodsToday.length} Periods Scheduled` : 'Free Day / No Solo Classes'}
                  </span>
                </div>

                {/* Action 1: Large Attendance Toggle */}
                <div className="space-y-2">
                  <button
                    onClick={() => toggleAbsence(teacher.abbr)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all active:scale-95 shadow-sm ${
                      isAbsent
                        ? 'bg-rose-600 text-white border-rose-500 shadow-rose-950/40'
                        : isAwayOfficial
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isAbsent ? <UserX className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      {isAbsent ? 'Marked Absent Today' : isAwayOfficial ? 'Away on Official Duty' : 'Present'}
                    </span>
                    <span className="text-[10px] font-normal opacity-80">
                      {isAbsent ? '• Tap to set Present' : '• Tap to mark Absent'}
                    </span>
                  </button>

                  {/* Action 2: Substitution Availability */}
                  <button
                    onClick={() => {
                      if (isFreeFromSub) {
                        setStaffAvailability(teacher.abbr, 'AVAILABLE');
                      } else {
                        setStaffAvailability(teacher.abbr, 'FREE_FROM_SUB', { remark: 'Excused' });
                      }
                    }}
                    className={`w-full py-1.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
                      isFreeFromSub
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {isFreeFromSub ? 'Excused from Substitution' : 'Available for Substitution'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isFreeFromSub ? 'Tap to enable' : 'Tap to excuse'}
                    </span>
                  </button>
                </div>

                {/* Leadership & Officiating Shortcuts (When absent) */}
                {isAbsent && isCT && teacher.primaryClass && (
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400">
                      Off. CT ({teacher.primaryClass}):
                      <span className="ml-1 font-bold text-amber-300">
                        {offCTSection || 'Not Assigned'}
                      </span>
                    </div>
                    <button
                      onClick={() => openOfficiatingModal({ type: 'CT', section: teacher.primaryClass })}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                    >
                      <span>{offCTSection ? 'Change' : 'Assign'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {isAbsent && isAC && (
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400">
                      Off. AC:
                      <span className="ml-1 font-bold text-purple-300">
                        {offAC || 'Not Assigned'}
                      </span>
                    </div>
                    <button
                      onClick={() => openOfficiatingModal({ type: 'AC' })}
                      className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                    >
                      <span>{offAC ? 'Change' : 'Designate'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* --- HIGH-DENSITY COMPACT LIST VIEW (FEAT-58) --- */
        <div className="space-y-2">
          {filteredTeachers.map((teacher) => {
            const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
            const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
            const isAwayOfficial = !!absence && absence.type === 'AWAY_OFFICIAL';

            const avail = availabilities[teacher.abbr];
            const isFreeFromSub = (avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB')) || isAwayOfficial;

            const isAC = teacher.abbr === 'Mrs. R. Pahwa' || (teacher.role.includes('Academic Coordinator') && !teacher.role.includes('Asst.'));
            const isAAC = teacher.abbr === 'Mrs. S. Lakra' || teacher.role.includes('Asst. Academic Coordinator');
            const isCT = teacher.role.includes('Class Teacher') && !isAC && !isAAC;

            return (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING_TRANSITIONS.snappy}
                className={`glass-panel px-3 sm:px-4 py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm transition-all ${
                  isAbsent
                    ? 'border-rose-500/40 bg-rose-950/20'
                    : isAwayOfficial
                    ? 'border-indigo-500/40 bg-indigo-950/20'
                    : isCT
                    ? 'border-amber-500/30 bg-amber-950/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Left: Name, Badges & Role */}
                <div className="flex items-center gap-2.5 min-w-[200px]">
                  <div
                    className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs flex-shrink-0 ${
                      isAbsent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isAC || isAAC
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : isCT
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {teacher.initials}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{teacher.abbr}</span>
                      {isAC && (
                        <span className="text-[9px] bg-purple-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                          AC
                        </span>
                      )}
                      {isAAC && (
                        <span className="text-[9px] bg-purple-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                          AAC
                        </span>
                      )}
                      {isCT && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {teacher.primaryClass}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">{teacher.fullName}</div>
                  </div>
                </div>

                {/* Right: Quick Attendance & Availability Toggles */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => toggleAbsence(teacher.abbr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 ${
                      isAbsent
                        ? 'bg-rose-600 text-white border border-rose-500'
                        : isAwayOfficial
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                    }`}
                  >
                    {isAbsent ? <UserX className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    <span>{isAbsent ? 'Absent' : isAwayOfficial ? 'Away' : 'Present'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (isFreeFromSub) {
                        setStaffAvailability(teacher.abbr, 'AVAILABLE');
                      } else {
                        setStaffAvailability(teacher.abbr, 'FREE_FROM_SUB', { remark: 'Excused' });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      isFreeFromSub
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <Clock className="w-3 h-3 inline text-amber-400 mr-1" />
                    <span>{isFreeFromSub ? 'Excused' : 'Available'}</span>
                  </button>

                  <button
                    onClick={() => openAvailabilityModal(teacher.abbr)}
                    className="p-1 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
                    title="More duty options"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {filteredTeachers.length === 0 && (
        <div className="p-12 text-center text-slate-500 text-xs">
          No faculty members match "{searchQuery}".
        </div>
      )}
    </div>
  );
};
