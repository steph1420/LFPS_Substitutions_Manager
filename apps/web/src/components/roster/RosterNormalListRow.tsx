import React from 'react';
import { motion } from 'framer-motion';
import { Teacher, EffectiveOfficiatingACResult } from '@lfps/core';
import { Check, UserX, SlidersHorizontal, ChevronRight, ShieldAlert } from 'lucide-react';

interface RosterNormalListRowProps {
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

export const RosterNormalListRow: React.FC<RosterNormalListRowProps> = ({
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

  // UI-07: Strictly pulse amber 3 times WHEN row is in view, and only for unassigned CT/AC that were absent on mount
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      onViewportEnter={handleViewportEnter}
      onAnimationEnd={() => setShouldPulse(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, select, a')) return;
        onToggleAbsence(teacher.abbr);
      }}
      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors cursor-pointer select-none ${
        isAbsent
          ? 'row-absent-illuminated text-rose-100'
          : isAwayOfficial
          ? 'bg-indigo-950/20 border-l-4 border-l-indigo-500 hover:bg-indigo-950/30'
          : 'hover:bg-slate-800/40'
      } ${shouldPulse ? 'amber-look-at-me-3x' : ''}`}
    >
      {/* Left: Avatar & Identity Details */}
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs flex-shrink-0 ${
            isAbsent
              ? 'bg-rose-500/25 text-rose-200 border border-rose-500/50'
              : isAC || isAAC
              ? 'bg-purple-500/20 text-purple-300'
              : isCT
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-blue-500/20 text-blue-300'
          }`}
        >
          {teacher.initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm cursor-help" title={teacher.fullName}>
              {teacher.abbr}
            </span>
            {teacher.primaryClass && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-200 border border-amber-500/30 font-bold">
                {teacher.primaryClass}
              </span>
            )}
          </div>
          <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-2">
            <span>{teacher.role}</span>
            {teacher.department && (
              <>
                <span>•</span>
                <span>{teacher.department}</span>
              </>
            )}
            {isFreeFromSub && (
              <>
                <span>•</span>
                <span className="text-amber-400">Exempt from Subs</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Officiating and Attendance Actions */}
      <div className="flex items-center gap-2 justify-between sm:justify-end">
        {/* Class Teacher Officiating Quick Trigger */}
        {isCT && isAbsent && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenOfficiatingCT(teacher.primaryClass);
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Off. CT: {offCTSection || 'None'}</span>
            <span className="font-bold underline text-amber-400 ml-1">
              {offCTSection ? 'Reassign' : 'Assign'}
            </span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        {/* Academic Coordinator Officiating Trigger */}
        {isAC && isAbsent && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenOfficiatingAC();
            }}
            className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <ShieldAlert className="w-3 h-3 text-purple-400" />
            <span>Off. AC: {offACResult.effectiveAC || 'None'}</span>
            <span className="font-bold underline text-purple-400 ml-1">
              {offACResult.isManuallyAssigned ? 'Reassign' : 'Assign'}
            </span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        {/* Attendance Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAbsence(teacher.abbr);
          }}
          className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
            isAbsent
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
              : isAwayOfficial
              ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
          }`}
        >
          {isAbsent ? <UserX className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          <span>{isAbsent ? 'Absent' : isAwayOfficial ? 'Away' : 'Present'}</span>
        </button>

        {/* Availability Settings Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAvailability(teacher.abbr);
          }}
          className="p-1.5 rounded-xl glass-pill text-slate-400 hover:text-white"
          title="Availability"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

