import React from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

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
  } = useTimetableStore();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'present' | 'absent' | 'free_from_sub'>('all');

  // Hierarchy Sorting: AC -> AAC -> CT -> ST (FEAT-36)
  const getHierarchyRank = (t: Teacher): number => {
    if (t.abbr === 'Mrs. R. Pahwa' || (t.role.includes('Academic Coordinator') && !t.role.includes('Asst.'))) return 1;
    if (t.abbr === 'Mrs. S. Lakra' || t.role.includes('Asst. Academic Coordinator')) return 2;
    if (t.role.includes('Class Teacher')) return 3;
    return 4;
  };

  const allTeachers = Object.values(directory).sort((a, b) => {
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
    return avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');
  }).length;

  // Filter staff by search and status tab
  const filteredTeachers = allTeachers.filter((teacher) => {
    const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
    const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
    const isAway = !!absence && absence.type === 'AWAY_OFFICIAL';
    const isPresent = !isAbsent && !isAway;

    const avail = availabilities[teacher.abbr];
    const isFree = avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');

    if (statusFilter === 'present' && !isPresent) return false;
    if (statusFilter === 'absent' && !isAbsent && !isAway) return false;
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
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Top Header & KPI Summary Bar */}
      <section className="w-full glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              Staff Attendance & Availability Roster ({selectedDay})
            </h2>
            <p className="text-xs text-slate-400">
              Dedicated vertical staff workstation. Hierarchy sorted: AC → AAC → Class Teachers → Subject Specialists.
            </p>
          </div>

          {absentCount + awayCount > 0 && (
            <button
              onClick={handleMarkAllPresent}
              className="w-fit px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Present
            </button>
          )}
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Present Today</span>
              <div className="text-lg font-bold text-emerald-400">{presentCount}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Marked Absent</span>
              <div className="text-lg font-bold text-rose-400">{absentCount}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Free from Sub</span>
              <div className="text-lg font-bold text-amber-400">{freeFromSubCount}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Away (Official)</span>
              <div className="text-lg font-bold text-indigo-300">{awayCount}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-300">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faculty by name, class, subject..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
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

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All Staff' },
                { id: 'present', label: `Present (${presentCount})` },
                { id: 'absent', label: `Absent (${absentCount})` },
                { id: 'free_from_sub', label: `Free (${freeFromSubCount})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Vertical Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const absence = activeAbsences.find((a) => a.teacherName === teacher.abbr);
          const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
          const isAwayOfficial = !!absence && absence.type === 'AWAY_OFFICIAL';

          const avail = availabilities[teacher.abbr];
          const isFreeFromSub = avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');

          // Role Badging
          const isAC = teacher.abbr === 'Mrs. R. Pahwa' || (teacher.role.includes('Academic Coordinator') && !teacher.role.includes('Asst.'));
          const isAAC = teacher.abbr === 'Mrs. S. Lakra' || teacher.role.includes('Asst. Academic Coordinator');
          const isCT = !isAC && !isAAC && teacher.role.includes('Class Teacher');

          const blobBorder = isAbsent
            ? COLOR_ROLES.absent.border
            : isAwayOfficial
            ? COLOR_ROLES.awayOfficial.border
            : isAC || isAAC
            ? COLOR_ROLES.coordinator.border
            : isCT
            ? COLOR_ROLES.classTeacher.border
            : COLOR_ROLES.subjectTeacher.border;

          // Compute teaching schedule load for today
          const daySchedule = schedule[selectedDay] || {};
          const periodsToday = Object.entries(daySchedule).filter(
            ([_, slotMap]) => slotMap[teacher.abbr] && slotMap[teacher.abbr] !== 'Free' && slotMap[teacher.abbr] !== '-'
          );

          // Officiating Status
          const offAC = officiatingAC[selectedDay];
          const offCTSection = teacher.primaryClass ? officiatingCT[selectedDay]?.[teacher.primaryClass] : null;

          return (
            <motion.div
              key={teacher.id}
              whileHover={{ y: -2 }}
              transition={SPRING_TRANSITIONS.snappy}
              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3.5 shadow-lg ${
                isAbsent
                  ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/20'
                  : isAwayOfficial
                  ? 'bg-slate-900/80 border-slate-600/50'
                  : 'glass-panel border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header: Avatar, Name, Full Role */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
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
                      {isCT && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
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
                    <span className="ml-1 font-bold text-purple-300">
                      {offCTSection || 'Not Assigned'}
                    </span>
                  </div>
                  <button
                    onClick={() => openOfficiatingModal({ type: 'CT', section: teacher.primaryClass })}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
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

      {filteredTeachers.length === 0 && (
        <div className="p-12 text-center text-slate-500 text-xs">
          No faculty members match "{searchQuery}".
        </div>
      )}
    </div>
  );
};
