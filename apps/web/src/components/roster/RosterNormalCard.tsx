import React from 'react';
import { motion } from 'framer-motion';
import { Teacher, EffectiveOfficiatingACResult } from '@lfps/core';
import { COLOR_ROLES } from '@lfps/ui';
import {
  Check,
  UserX,
  SlidersHorizontal,
  ShieldAlert,
  ShieldCheck,
  School,
  MapPin,
  Plus,
} from 'lucide-react';
import { TeacherNameOverlay } from '../common/TeacherNameOverlay.js';

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
      className={`glass-panel p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 min-h-[210px] cursor-pointer select-none group relative ${
        isAbsent
          ? 'card-absent-illuminated text-rose-100'
          : isAwayOfficial
          ? 'border-indigo-500/50 bg-indigo-950/20'
          : isCT
          ? 'border-amber-500/40 bg-slate-900/80 hover:border-amber-500/60'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
      } ${shouldPulse ? 'amber-look-at-me-1x' : ''}`}
    >
      {/* Top Header: Avatar, Full Name & Duties button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Role Avatar Blob */}
          <div
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0"
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
          <div className="min-w-0 flex-1">
            <TeacherNameOverlay
              abbr={teacher.abbr}
              fullName={teacher.fullName}
              className="font-bold text-white text-base tracking-tight"
            />

            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span
                className={`font-semibold truncate ${
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
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold flex-shrink-0">
                  {teacher.primaryClass}
                </span>
              )}
              {isFreeFromSub && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium flex-shrink-0">
                  No Subs
                </span>
              )}
            </div>

            {/* Department info */}
            {teacher.department && (
              <div className="text-[11px] text-slate-400 truncate mt-1">
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

      {/* Bottom Action Squircle Row (Left-aligned presence, side-by-side appointment cards) */}
      <div className="flex items-center gap-2 pt-2 w-full">
        {/* 1. Absence / Presence Squircle Card (Left-aligned) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleAbsence(teacher.abbr);
          }}
          className={`h-[54px] min-w-[76px] sm:min-w-[82px] px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer select-none active:scale-95 shadow-sm ${
            isAbsent
              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-rose-900/40'
              : isAwayOfficial
              ? 'bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border-indigo-500/50'
              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
          }`}
          title={isAbsent ? 'Currently Absent — Tap to Mark Present' : 'Currently Present — Tap to Mark Absent'}
        >
          {isAbsent ? (
            <UserX className="w-4 h-4 text-white" />
          ) : isAwayOfficial ? (
            <MapPin className="w-4 h-4 text-indigo-300" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-[11px] font-bold tracking-tight leading-none mt-0.5">
            {isAbsent ? 'Absent' : isAwayOfficial ? 'Away' : 'Present'}
          </span>
        </button>

        {/* 2. Officiating CT Squircle Card (Fully tappable anywhere, zero pass-thru) */}
        {isCT && isAbsent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenOfficiatingCT(teacher.primaryClass);
            }}
            className={`h-[54px] min-w-[80px] flex-1 max-w-[125px] px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer select-none active:scale-95 shadow-sm text-center ${
              offCTSection
                ? 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-900/30 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/60 hover:bg-amber-900/50 text-amber-300 attention-pulse'
            }`}
            title={
              offCTSection
                ? `Officiating Class Teacher assigned to ${offCTSection} — Tap to reassign`
                : `Officiating Class Teacher (${teacher.primaryClass || 'Section'}) vacant — Tap to Appoint`
            }
          >
            <div className="flex items-center gap-1">
              <School className={`w-3.5 h-3.5 flex-shrink-0 ${offCTSection ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-tight ${offCTSection ? 'text-emerald-400' : 'text-amber-400'}`}>
                Off. CT
              </span>
            </div>
            {offCTSection ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 truncate max-w-full leading-none mt-0.5">
                <Check className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{offCTSection}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-200 truncate max-w-full leading-none mt-0.5">
                <Plus className="w-3 h-3 text-amber-300 flex-shrink-0" />
                <span>Appoint</span>
              </span>
            )}
          </button>
        )}

        {/* 3. Officiating AC Squircle Card (Fully tappable anywhere, zero pass-thru) */}
        {isAC && isAbsent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenOfficiatingAC();
            }}
            className={`h-[54px] min-w-[80px] flex-1 max-w-[125px] px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer select-none active:scale-95 shadow-sm text-center ${
              offACResult.needsAppointment
                ? 'bg-purple-950/40 border-purple-500/60 hover:bg-purple-900/50 text-purple-200 purple-attention-pulse'
                : 'bg-purple-950/20 border-purple-500/30 hover:bg-purple-900/30 text-purple-200'
            }`}
            title={
              offACResult.needsAppointment
                ? 'Officiating Academic Coordinator vacant — Tap to Appoint'
                : `Officiating AC Covered (${offACResult.isAutoOfficiating ? 'SL Acting' : offACResult.effectiveAC}) — Tap to reassign`
            }
          >
            <div className="flex items-center gap-1">
              {offACResult.needsAppointment ? (
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
              )}
              <span className={`text-[10px] font-bold uppercase tracking-tight ${offACResult.needsAppointment ? 'text-purple-400' : 'text-purple-300'}`}>
                Off. AC
              </span>
            </div>
            {offACResult.needsAppointment ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-purple-200 truncate max-w-full leading-none mt-0.5">
                <Plus className="w-3 h-3 text-purple-300 flex-shrink-0" />
                <span>Appoint</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-200/90 truncate max-w-full leading-none mt-0.5">
                <Check className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{offACResult.isAutoOfficiating ? 'SL Acting' : offACResult.effectiveAC}</span>
              </span>
            )}
          </button>
        )}

        {/* 4. Acting AC Badge Squircle (when AAC is acting for AC) */}
        {isAAC && offACResult.isAutoOfficiating && (
          <div
            className="h-[54px] min-w-[80px] flex-1 max-w-[125px] px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-purple-500/30 bg-purple-950/20 text-purple-300 shadow-sm text-center"
            title="Currently acting as Academic Coordinator for Mrs. R. Pahwa"
          >
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-tight">Acting AC</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold leading-none mt-0.5">
              <Check className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
              <span>On Duty</span>
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

