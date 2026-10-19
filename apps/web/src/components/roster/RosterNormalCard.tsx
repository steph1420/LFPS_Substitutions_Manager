import React from 'react';
import { motion } from 'framer-motion';
import { Teacher, EffectiveOfficiatingACResult } from '@lfps/core';
import { COLOR_ROLES } from '@lfps/ui';
import {
  Check,
  UserX,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface RosterNormalCardProps {
  teacher: Teacher;
  isAbsent: boolean;
  isAwayOfficial: boolean;
  isCT: boolean;
  isAC: boolean;
  isAAC: boolean;
  offCTSection?: string;
  offACResult: EffectiveOfficiatingACResult;
  isFreeFromSub?: boolean;
  wasAbsentOnMount?: boolean;
  onToggleAbsence: (abbr: string) => void;
  onOpenAvailability: (abbr: string) => void;
  onOpenOfficiatingCT: (section?: string) => void;
  onOpenOfficiatingAC: () => void;
}

export const RosterNormalCard: React.FC<RosterNormalCardProps> = ({
  teacher,
  isAbsent,
  isAwayOfficial,
  isCT,
  isAC,
  isAAC,
  offCTSection,
  offACResult,
  isFreeFromSub,
  wasAbsentOnMount,
  onToggleAbsence,
  onOpenAvailability,
  onOpenOfficiatingCT,
  onOpenOfficiatingAC,
}) => {
  const [hasPulsed, setHasPulsed] = React.useState(false);
  const [shouldPulse, setShouldPulse] = React.useState(false);

  // UI-07: Strictly pulse amber 3 times WHEN card is in view, and only for unassigned CT/AC that were absent on mount
  const isUnassignedOfficiatingTarget =
    Boolean(wasAbsentOnMount) &&
    ((isAC && isAbsent && offACResult.needsAppointment) ||
     (isCT && isAbsent && !offCTSection));

  const handleViewportEnter = () => {
    if (!hasPulsed && isUnassignedOfficiatingTarget) {
      setShouldPulse(true);
      setHasPulsed(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      onViewportEnter={handleViewportEnter}
      onAnimationEnd={() => setShouldPulse(false)}
      onClick={(e) => {
        // Whole card free space tap toggles absence
        if ((e.target as HTMLElement).closest('button, input, select, a')) return;
        onToggleAbsence(teacher.abbr);
      }}
      className={`glass-panel p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 cursor-pointer select-none group relative overflow-hidden ${
        isAbsent
          ? 'card-absent-illuminated text-rose-100'
          : isAwayOfficial
          ? 'border-indigo-500/50 bg-indigo-950/20'
          : isCT
          ? 'border-amber-500/40 bg-slate-900/80 hover:border-amber-500/60'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
      } ${shouldPulse ? 'amber-look-at-me-3x' : ''}`}
    >
      {/* Top Header: Avatar, Full Name & Duties button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          {/* Role Avatar Blob */}
          <div
            className="relative w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0"
            style={{
              backgroundColor: isAbsent
                ? 'rgba(244, 63, 94, 0.25)'
                : isAwayOfficial
                ? COLOR_ROLES.awayOfficial.bg
                : isAC || isAAC
                ? COLOR_ROLES.coordinator.bg
                : isCT
                ? COLOR_ROLES.classTeacher.bg
                : COLOR_ROLES.subjectTeacher.bg,
              border: `1.5px solid ${
                isAbsent
                  ? 'rgba(244, 63, 94, 0.6)'
                  : isCT
                  ? COLOR_ROLES.classTeacher.border
                  : 'rgba(255,255,255,0.1)'
              }`,
              color: isAbsent
                ? '#fda4af'
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
            {isAbsent && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-slate-950 flex items-center justify-center">
                <UserX className="w-2 h-2 text-white" />
              </span>
            )}
          </div>

          {/* Teacher Identity & Badges */}
          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-sm truncate" title={teacher.fullName}>
                <span className="hidden sm:inline">{teacher.fullName}</span>
                <span className="sm:hidden">{teacher.abbr}</span>
              </h3>
              {teacher.fullName !== teacher.abbr && (
                <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">
                  ({teacher.abbr})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 text-xs">
              <span
                className={`font-medium truncate ${
                  isAbsent
                    ? 'text-rose-300'
                    : isCT
                    ? 'text-amber-400'
                    : isAC || isAAC
                    ? 'text-purple-300'
                    : 'text-slate-400'
                }`}
              >
                {teacher.role}
              </span>
              {teacher.primaryClass && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold flex-shrink-0">
                  {teacher.primaryClass}
                </span>
              )}
              {isFreeFromSub && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium flex-shrink-0">
                  No Subs
                </span>
              )}
            </div>

            {/* Department info (retained as-is from teacher data without modification) */}
            {teacher.department && (
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                <span>{teacher.department}</span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Settings / Availability button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAvailability(teacher.abbr);
          }}
          className="p-1.5 rounded-xl glass-pill border-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
          title="Configure Availability, Deputations & Free-From-Sub"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Attendance Toggle Button */}
      <div className="space-y-2 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAbsence(teacher.abbr);
          }}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-[0.99] ${
            isAbsent
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
              : isAwayOfficial
              ? 'bg-gradient-to-r from-indigo-600/40 to-indigo-700/40 text-indigo-200 border border-indigo-500/60'
              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/60'
          }`}
        >
          <span className="flex items-center gap-2">
            {isAbsent ? (
              <UserX className="w-4 h-4 text-white" />
            ) : (
              <Check className="w-4 h-4 text-emerald-300" />
            )}
            <span>
              {isAbsent
                ? 'Marked Absent Today'
                : isAwayOfficial
                ? 'Away on Official Duty'
                : 'Present on Duty'}
            </span>
          </span>
          <span className="text-[10px] font-medium opacity-80 bg-black/20 px-2 py-0.5 rounded-md">
            {isAbsent ? 'Tap to Mark Present' : 'Tap to Mark Absent'}
          </span>
        </button>

        {/* Stable Action Slot (UI-05 & UI-07: Non-shifting container, Assign/Reassign) */}
        <div className="min-h-[28px] flex items-center">
          {/* Class Teacher Officiating Assignment */}
          {isCT && isAbsent && (
            <div className="w-full flex items-center justify-between text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[10px] font-bold text-amber-300 uppercase">Off. CT:</span>
                <span className="text-white font-medium truncate">
                  {offCTSection ? offCTSection : 'None Appointed'}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOfficiatingCT(teacher.primaryClass);
                }}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer ml-2 flex-shrink-0"
              >
                <span>{offCTSection ? 'Reassign' : 'Assign'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Academic Coordinator Succession & Appointment */}
          {isAC && isAbsent && (
            <div
              className={`w-full flex items-center justify-between text-xs px-2.5 py-1 rounded-lg border ${
                offACResult.needsAppointment
                  ? 'bg-amber-950/40 border-amber-500/60 attention-pulse'
                  : 'bg-purple-500/10 border-purple-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[10px] font-bold text-purple-300 uppercase">Off. AC:</span>
                <span className="text-white font-medium truncate">
                  {offACResult.effectiveAC
                    ? offACResult.isAutoOfficiating
                      ? `${offACResult.effectiveAC} (Acting)`
                      : offACResult.effectiveAC
                    : 'Needs Appointment'}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOfficiatingAC();
                }}
                className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5 cursor-pointer ml-2 flex-shrink-0"
              >
                <span>{offACResult.isManuallyAssigned ? 'Reassign' : 'Assign'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Assistant Academic Coordinator Acting status */}
          {isAAC && offACResult.isAutoOfficiating && (
            <div className="w-full flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="text-[11px] font-medium truncate">
                Acting for Mrs. R. Pahwa today
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

