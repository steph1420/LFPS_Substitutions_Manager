import React from 'react';
import { motion } from 'framer-motion';
import { Teacher } from '@lfps/core';
import { Check, UserX, SlidersHorizontal } from 'lucide-react';
import { TeacherNameOverlay } from '../common/TeacherNameOverlay.js';

interface RosterCompactListRowProps {
  teacher: Teacher;
  isAbsent: boolean;
  isAwayOfficial: boolean;
  isCT: boolean;
  isAC: boolean;
  isAAC: boolean;
  isFreeFromSub?: boolean;
  wasAbsentOnMount?: boolean;
  onToggleAbsence: (abbr: string) => void;
  onOpenAvailability: (abbr: string) => void;
}

export const RosterCompactListRow: React.FC<RosterCompactListRowProps> = ({
  teacher,
  isAbsent,
  isAwayOfficial,
  isCT,
  isAC,
  isAAC,
  isFreeFromSub,
  wasAbsentOnMount,
  onToggleAbsence,
  onOpenAvailability,
}) => {
  const [hasPulsed, setHasPulsed] = React.useState(false);
  const [shouldPulse, setShouldPulse] = React.useState(false);
  const handleViewportEnter = () => {
    if (!hasPulsed && wasAbsentOnMount && isAbsent) {
      setShouldPulse(true);
      setHasPulsed(true);
    }
  };

  return (
    <motion.div
      viewport={{ once: true, amount: 0.3 }}
      onViewportEnter={handleViewportEnter}
      onAnimationEnd={() => setShouldPulse(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, select, a')) return;
        onToggleAbsence(teacher.abbr);
      }}
      className={`px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer select-none ${
        isAbsent
          ? 'row-absent-illuminated text-rose-100'
          : isAwayOfficial
          ? 'bg-indigo-950/20 border-l-4 border-l-indigo-500 hover:bg-indigo-950/30'
          : 'hover:bg-slate-800/40'
      } ${shouldPulse ? 'amber-look-at-me-1x' : ''}`}
    >
      {/* Left: Indicator, Avatar & Full Name */}
      <div className="flex items-center gap-2.5 min-w-[220px] flex-1">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isAbsent
              ? 'status-dot-absent'
              : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
          }`}
        />
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
            isAbsent
              ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {teacher.initials}
        </div>
        <div className="truncate">
          <TeacherNameOverlay
            abbr={teacher.abbr}
            fullName={teacher.fullName}
            className="font-bold text-white text-xs truncate"
          />
        </div>
      </div>

      {/* Middle: Role & Badges */}
      <div className="hidden md:flex items-center gap-2 flex-1">
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            isAbsent
              ? 'text-rose-300'
              : isCT
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : isAC || isAAC
              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
              : 'text-slate-400'
          }`}
        >
          {teacher.role}
        </span>
        {teacher.primaryClass && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-200 border border-amber-500/30 font-bold">
            {teacher.primaryClass}
          </span>
        )}
        {teacher.department && (
          <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
            {teacher.department}
          </span>
        )}
        {isFreeFromSub && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            No Subs
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAbsence(teacher.abbr);
          }}
          className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs ${
            isAbsent
              ? 'status-btn-absent'
              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {isAbsent ? <UserX className="w-3 h-3" /> : <Check className="w-3 h-3" />}
          <span>{isAbsent ? 'Absent' : 'Present'}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAvailability(teacher.abbr);
          }}
          className="p-1 rounded-md text-slate-400 hover:text-white"
          title="Availability"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
