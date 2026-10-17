import React from 'react';
import { motion } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { autoResolveSubstitutions, PeriodId } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import {
  Sparkles,
  ArrowRight,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Search,
} from 'lucide-react';

export const SubstitutionsRegister: React.FC = () => {
  const {
    selectedDay,
    schedule,
    absences,
    availabilities,
    substitutions,
    assignSubstitution,
    removeSubstitution,
    loggedInTeacher,
    officiatingAC,
    officiatingCT,
  } = useTimetableStore();

  const [filterMode, setFilterMode] = React.useState<'all' | 'uncovered' | 'covered' | 'my'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

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

  // Filtered lists
  const filteredSubstitutions = daySubstitutions.filter((sub) => {
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

  const offAC = officiatingAC[selectedDay];
  const offCTMap = officiatingCT[selectedDay] || {};

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Header & KPI Summary Panel */}
      <section className="w-full glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              Substitution Register & Coverage Engine ({selectedDay})
            </h2>
            <p className="text-xs text-slate-400">
              Live audit ledger, automatic candidate affinity ranking, and automated 1-tap solver.
            </p>
          </div>

          {uncoveredSlots.length > 0 && (
            <button
              onClick={handleAutoResolve}
              className="w-fit flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-blue-200 animate-spin" style={{ animationDuration: '3s' }} />
              Auto-Resolve ({uncoveredSlots.length} Slots)
            </button>
          )}
        </div>

        {/* KPI Statistics Strip (1st: Covered [Green], 2nd: Uncovered [Red], 3rd: Officiating Staff) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Card 1: Covered (Green border) */}
          <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-emerald-400 font-medium">Covered Substitutions</span>
              <div className="text-lg font-bold text-emerald-300">{daySubstitutions.length}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Uncovered (Red border) */}
          <div
            className={`border rounded-xl p-3 flex items-center justify-between shadow-sm ${
              uncoveredSlots.length > 0
                ? 'bg-rose-950/20 border-rose-500/50'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Uncovered Slots</span>
              <div
                className={`text-lg font-bold ${
                  uncoveredSlots.length > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {uncoveredSlots.length > 0 ? `${uncoveredSlots.length} Need Sub` : '0 (Fully Covered)'}
              </div>
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                uncoveredSlots.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Officiating Staff */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Officiating Staff</span>
              <div className="text-lg font-bold text-purple-300">
                {(offAC ? 1 : 0) + Object.keys(offCTMap).length} Active
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search substitutions by teacher, class, period..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                filterMode === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Records ({daySubstitutions.length + uncoveredSlots.length})
            </button>

            <button
              onClick={() => setFilterMode('uncovered')}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                filterMode === 'uncovered'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Uncovered ({uncoveredSlots.length})
            </button>

            <button
              onClick={() => setFilterMode('covered')}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                filterMode === 'covered' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Covered ({daySubstitutions.length})
            </button>

            {loggedInTeacher && (
              <button
                onClick={() => setFilterMode('my')}
                className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  filterMode === 'my' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Subs
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Uncovered Slots Warning Cards (Rendered when in 'all' or 'uncovered' filter) */}
      {(filterMode === 'all' || filterMode === 'uncovered') && uncoveredSlots.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Action Required: Uncovered Teaching Slots ({uncoveredSlots.length})
            </h3>
            <button
              onClick={handleAutoResolve}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Resolve All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {uncoveredSlots.map((slot, idx) => (
              <div
                key={`${slot.period}-${slot.originalTeacher}-${idx}`}
                className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {slot.period} Period
                  </span>
                  <span className="text-xs font-semibold text-slate-300">{slot.task}</span>
                </div>

                <div className="text-xs">
                  <div className="text-[11px] text-slate-400">Absent Teacher:</div>
                  <div className="font-bold text-rose-300">{slot.originalTeacher}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-medium flex items-center justify-between">
                  <span>Coverage Needed</span>
                  <span className="text-[10px] opacity-75">Click Auto-Resolve above</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Substitutions Ledger Cards */}
      {(filterMode === 'all' || filterMode === 'covered' || filterMode === 'my') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Active Covered Substitutions ({filteredSubstitutions.length})
            </h3>
          </div>

          {filteredSubstitutions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSubstitutions.map((sub) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={SPRING_TRANSITIONS.snappy}
                  className="glass-panel border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {sub.period} Period
                    </span>
                    <span className="text-xs font-bold text-white">
                      {sub.className} • {sub.subject}
                    </span>
                  </div>

                  {/* Teacher Transfer Row */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Absent</div>
                      <div className="font-semibold text-rose-300 line-through truncate max-w-[110px]">
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

                  {/* Footer details & remove button */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 truncate">
                      By {sub.assignedBy || 'Coordinator'}
                    </span>

                    <button
                      onClick={() => removeSubstitution(sub.id)}
                      className="px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Release this substitution assignment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Release Sub</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 text-xs">
              {filterMode === 'my'
                ? `No substitution duties assigned to ${loggedInTeacher || 'you'} today.`
                : `No covered substitutions recorded for ${selectedDay}.`}
            </div>
          )}
        </section>
      )}

      {/* Officiating Leadership Overview (Section 3) */}
      {(offAC || Object.keys(offCTMap).length > 0) && (
        <section className="glass-panel rounded-2xl p-4 sm:p-5 border border-purple-500/30 bg-purple-950/10 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            Temporary Leadership Officiating Designations ({selectedDay})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {offAC && (
              <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase">Officiating AC</span>
                  <div className="font-bold text-white text-sm">{offAC}</div>
                  <div className="text-[10px] text-slate-400">Acting Academic Coordinator</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                  ★
                </div>
              </div>
            )}

            {Object.entries(offCTMap).map(([section, teacherName]) => (
              <div
                key={section}
                className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase">Off. CT • {section}</span>
                  <div className="font-bold text-white text-sm">{teacherName}</div>
                  <div className="text-[10px] text-slate-400">Class Teacher Responsibilities</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                  🏫
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
