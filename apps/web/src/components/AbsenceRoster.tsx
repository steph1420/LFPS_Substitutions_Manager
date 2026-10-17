import React from 'react';
import { motion } from 'framer-motion';
import { SPRING_TRANSITIONS, COLOR_ROLES } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Check, Building2, UserX } from 'lucide-react';

export const AbsenceRoster: React.FC = () => {
  const {
    directory,
    selectedDay,
    absences,
    availabilities,
    toggleAbsence,
    setStaffAvailability,
  } = useTimetableStore();

  const teachers = Object.values(directory);

  return (
    <section className="w-full glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            Staff Attendance & Availability Roster
          </h2>
          <p className="text-xs text-slate-400">
            Tap avatar to toggle daily absence. Tap sub-pill to toggle substitution availability.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Class Teacher
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Coordinator
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
          </span>
        </div>
      </div>

      {/* Horizontal Scroll Roster Tray */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
        {teachers.map((teacher) => {
          const absence = absences.find(
            (a) => a.teacherName === teacher.abbr && a.day === selectedDay
          );
          const isAbsent = !!absence && absence.type !== 'AWAY_OFFICIAL';
          const isAwayOfficial = !!absence && absence.type === 'AWAY_OFFICIAL';

          const avail = availabilities[teacher.abbr];
          const isFreeFromSub = avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');

          // Determine avatar blob color
          const isCoord = teacher.role.includes('Coordinator');
          const isCT = teacher.role.includes('Class Teacher');
          const blobBorder = isAbsent
            ? COLOR_ROLES.absent.border
            : isAwayOfficial
            ? COLOR_ROLES.awayOfficial.border
            : isCoord
            ? COLOR_ROLES.coordinator.border
            : isCT
            ? COLOR_ROLES.classTeacher.border
            : COLOR_ROLES.subjectTeacher.border;

          return (
            <motion.div
              key={teacher.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_TRANSITIONS.snappy}
              className={`flex-shrink-0 w-44 rounded-xl p-3 border transition-all ${
                isAbsent
                  ? 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20'
                  : isAwayOfficial
                  ? 'bg-slate-900/80 border-slate-600/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top row: Avatar & Identity */}
              <div
                onClick={() => toggleAbsence(teacher.abbr)}
                className="cursor-pointer flex items-center gap-2.5 pb-2 border-b border-slate-800/60"
              >
                <div
                  className="relative w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-inner"
                  style={{
                    backgroundColor: isAbsent
                      ? COLOR_ROLES.absent.bg
                      : isAwayOfficial
                      ? COLOR_ROLES.awayOfficial.bg
                      : isCoord
                      ? COLOR_ROLES.coordinator.bg
                      : isCT
                      ? COLOR_ROLES.classTeacher.bg
                      : COLOR_ROLES.subjectTeacher.bg,
                    border: `1.5px solid ${blobBorder}`,
                    color: isAbsent
                      ? COLOR_ROLES.absent.text
                      : isAwayOfficial
                      ? COLOR_ROLES.awayOfficial.text
                      : isCoord
                      ? COLOR_ROLES.coordinator.text
                      : isCT
                      ? COLOR_ROLES.classTeacher.text
                      : COLOR_ROLES.subjectTeacher.text,
                  }}
                >
                  {teacher.initials}
                  {isCoord && (
                    <span className="absolute -top-1 -right-1 text-[9px] bg-purple-600 text-white font-extrabold px-1 rounded-full">
                      AC
                    </span>
                  )}
                </div>

                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {teacher.abbr}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {teacher.primaryClass ? `CT ${teacher.primaryClass}` : teacher.role.split('/')[0]}
                  </div>
                </div>
              </div>

              {/* Status Badging */}
              <div className="pt-2 flex flex-col gap-1.5">
                {isAbsent ? (
                  <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    <UserX className="w-3 h-3" /> Absent Today
                  </div>
                ) : isAwayOfficial ? (
                  <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1 bg-slate-700/40 px-2 py-0.5 rounded-full border border-slate-600/40">
                    <Building2 className="w-3 h-3 text-indigo-400" /> Away (Official)
                  </div>
                ) : (
                  <div className="text-[10px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="w-3 h-3" /> On Campus
                  </div>
                )}

                {/* Sub Availability Button with Hint (FEAT-34 & FEAT-35) */}
                <button
                  onClick={() => {
                    if (isFreeFromSub) {
                      setStaffAvailability(teacher.abbr, 'AVAILABLE');
                    } else {
                      setStaffAvailability(teacher.abbr, 'FREE_FROM_SUB', {
                        remark: 'Excused',
                      });
                    }
                  }}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors flex items-center justify-between ${
                    isFreeFromSub
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  <span>{isFreeFromSub ? '⏸ Free from Sub' : '🟢 Available'}</span>
                  <span className="text-[9px] text-slate-400">
                    {isFreeFromSub ? '• Tap to restore' : '• Tap to free'}
                  </span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

