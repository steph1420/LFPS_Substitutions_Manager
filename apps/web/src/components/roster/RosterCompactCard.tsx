import React from 'react';
import { motion } from 'framer-motion';
import { Teacher } from '@lfps/core';
import { Check, UserX, SlidersHorizontal } from 'lucide-react';
import { TeacherNameOverlay } from '../common/TeacherNameOverlay.js';

interface RosterCompactCardProps {
  teacher: Teacher;
  isAbsent: boolean;
  isCT: boolean;
  isAC: boolean;
  isAAC: boolean;
  wasAbsentOnMount?: boolean;
  onToggleAbsence: (abbr: string) => void;
  onOpenAvailability: (abbr: string) => void;
}

export const RosterCompactCard: React.FC<RosterCompactCardProps> = ({
  teacher,
  isAbsent,
  isCT,
  isAC,
  isAAC,
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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      onViewportEnter={handleViewportEnter}
      onAnimationEnd={() => setShouldPulse(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, select, a')) return;
        onToggleAbsence(teacher.abbr);
      }}
      className={`glass-panel p-3 rounded-xl border flex flex-col justify-between gap-2.5 cursor-pointer select-none transition-all ${
        isAbsent
          ? 'card-compact-absent-illuminated text-rose-100'
          : isCT
          ? 'border-amber-500/30 bg-slate-900/80 hover:border-amber-500/50'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
      } ${shouldPulse ? 'amber-look-at-me-1x' : ''}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs flex-shrink-0 ${
            isAbsent
              ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50'
              : isAC || isAAC
              ? 'bg-purple-500/20 text-purple-300'
              : isCT
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-blue-500/20 text-blue-300'
          }`}
        >
          {teacher.initials}
        </div>
        <div className="min-w-0 flex-1">
          <TeacherNameOverlay
            abbr={teacher.abbr}
            fullName={teacher.fullName}
            className="font-bold text-white text-xs truncate"
          />
          <div className="text-[10px] text-slate-400 truncate">
            {isCT ? teacher.primaryClass : teacher.role}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAvailability(teacher.abbr);
          }}
          className="p-1 rounded-md text-slate-400 hover:text-white"
          title="Availability"
        >
          <SlidersHorizontal className="w-3 h-3" />
        </button>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleAbsence(teacher.abbr);
        }}
        className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
          isAbsent
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
            : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
        }`}
      >
        {isAbsent ? <UserX className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        <span>{isAbsent ? 'Absent' : 'Present'}</span>
      </button>
    </motion.div>
  );
};

