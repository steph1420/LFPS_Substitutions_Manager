import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { parseCellSlot } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import {
  UserX,
  UserCheck,
  Coffee,
  Sparkles,
  Building2,
  MoreHorizontal,
  UserPlus,
} from 'lucide-react';

export const MicroContextMenu: React.FC = () => {
  const {
    activeContextMenu,
    closeContextMenu,
    absences,
    availabilities,
    selectedDay,
    toggleAbsence,
    setStaffAvailability,
    openAvailabilityModal,
    startAwaySelection,
    openAssignSubModal,
    schedule,
  } = useTimetableStore();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };

    if (activeContextMenu) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeContextMenu, closeContextMenu]);

  if (!activeContextMenu) return null;

  const teacher = activeContextMenu.teacher;
  const period = activeContextMenu.period;

  const currentAbsence = absences.find((a) => a.teacherName === teacher && a.day === selectedDay);
  const isAbsent = Boolean(currentAbsence && currentAbsence.type !== 'AWAY_OFFICIAL');
  const isAwayOfficial = Boolean(currentAbsence && currentAbsence.type === 'AWAY_OFFICIAL');
  const isAwayThisPeriod = Boolean(period && isAwayOfficial && currentAbsence?.periods?.includes(period));

  const avail = availabilities[teacher];
  const isFreeFromSub = avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');

  const currentTask = period ? schedule[selectedDay]?.[period]?.[teacher] : undefined;
  const isSlotAssigned = Boolean(currentTask && currentTask !== 'Free' && currentTask !== '-');

  // Clamp coordinates within screen boundaries
  const menuWidth = 205;
  const menuHeight = period ? 210 : 175;
  const clampedX = Math.min(Math.max(10, activeContextMenu.x), (typeof window !== 'undefined' ? window.innerWidth : 800) - menuWidth - 10);
  const clampedY = Math.min(Math.max(10, activeContextMenu.y), (typeof window !== 'undefined' ? window.innerHeight : 600) - menuHeight - 10);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 select-none"
        onClick={(e) => {
          e.stopPropagation();
          closeContextMenu();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeContextMenu();
        }}
      >
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.92, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -4 }}
          transition={SPRING_TRANSITIONS.snappy}
          style={{ top: clampedY, left: clampedX }}
          onClick={(e) => e.stopPropagation()}
          className="absolute w-[205px] bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-xl p-1.5 shadow-2xl shadow-black/70 flex flex-col gap-1 z-50 text-xs"
        >
          {/* Header pill with teacher & period name */}
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
            <span className="truncate max-w-[130px] text-slate-200">
              {teacher} {period ? `• ${period}` : ''}
            </span>
            <span className="text-[9px] font-mono text-indigo-400">Quick Menu</span>
          </div>

          {/* Option 1: Away on Official Duty (Select Periods Marquee) */}
          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              startAwaySelection(teacher, period ? [period] : undefined);
            }}
            className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left font-semibold transition-colors cursor-pointer ${
              isAwayOfficial || isAwayThisPeriod
                ? 'bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30'
                : 'hover:bg-slate-800 text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <div className="truncate">
              <div>{isAwayOfficial ? 'Edit Away Periods...' : 'Mark Away on Duty...'}</div>
              <div className="text-[8px] text-indigo-300/80 font-normal">
                {isAwayOfficial
                  ? `${currentAbsence?.periods?.length || 'All'} periods away`
                  : 'Select periods on grid'}
              </div>
            </div>
          </button>

          {/* Option 2: Absence Toggle */}
          <button
            type="button"
            onClick={() => {
              toggleAbsence(teacher);
              closeContextMenu();
            }}
            className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left font-semibold transition-colors cursor-pointer ${
              isAbsent
                ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                : 'hover:bg-slate-800 text-slate-200'
            }`}
          >
            {isAbsent ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Mark Present (Full Day)</span>
              </>
            ) : (
              <>
                <UserX className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>Mark Absent (Full Day)</span>
              </>
            )}
          </button>

          {/* Option 3 (When right-clicked on an instructional period): Assign Sub */}
          {period && isSlotAssigned && (
            <button
              type="button"
              onClick={() => {
                closeContextMenu();
                const task = currentTask || '';
                const parsed = parseCellSlot(task);
                openAssignSubModal({
                  period,
                  originalTeacher: teacher,
                  task,
                  className: parsed.className || 'KG',
                  subject: parsed.subject || task,
                  day: selectedDay,
                });
              }}
              className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left font-semibold hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Assign Substitute for Slot</span>
            </button>
          )}

          {/* Option 4: Substitution Availability Toggle (FEAT-34) */}
          <button
            type="button"
            onClick={() => {
              if (isFreeFromSub) {
                setStaffAvailability(teacher, 'AVAILABLE');
              } else {
                setStaffAvailability(teacher, 'FREE_FROM_SUB', { remark: 'Excused' });
              }
              closeContextMenu();
            }}
            className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left font-semibold transition-colors cursor-pointer ${
              isFreeFromSub
                ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                : 'hover:bg-slate-800 text-slate-200'
            }`}
          >
            {isFreeFromSub ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Available for Sub</span>
              </>
            ) : (
              <>
                <Coffee className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Free from Sub</span>
              </>
            )}
          </button>

          {/* Option 5: More options (Opens Hero Modal FEAT-35) */}
          <button
            type="button"
            onClick={() => {
              openAvailabilityModal(teacher);
              closeContextMenu();
            }}
            className="w-full px-2 py-1 rounded-md text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 flex items-center justify-between transition-colors pt-1 border-t border-slate-800 cursor-pointer"
          >
            <span>More duties & presets...</span>
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
