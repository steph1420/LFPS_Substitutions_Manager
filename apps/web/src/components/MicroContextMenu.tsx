import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { UserX, UserCheck, Coffee, Sparkles, MoreHorizontal } from 'lucide-react';

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
  } = useTimetableStore();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    if (activeContextMenu) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeContextMenu, closeContextMenu]);

  if (!activeContextMenu) return null;

  const teacher = activeContextMenu.teacher;
  const isAbsent = absences.some((a) => a.teacherName === teacher && a.day === selectedDay);
  const avail = availabilities[teacher];
  const isFreeFromSub = avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');

  // Clamp coordinates within screen boundaries
  const menuWidth = 170;
  const menuHeight = 105;
  const clampedX = Math.min(Math.max(10, activeContextMenu.x), window.innerWidth - menuWidth - 10);
  const clampedY = Math.min(Math.max(10, activeContextMenu.y), window.innerHeight - menuHeight - 10);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-auto">
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={SPRING_TRANSITIONS.snappy}
          style={{ top: clampedY, left: clampedX }}
          className="absolute w-[170px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl p-1.5 shadow-2xl shadow-black/60 flex flex-col gap-1 z-50 text-xs select-none"
        >
          {/* Header pill with teacher name */}
          <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
            <span className="truncate">{teacher}</span>
            <span className="text-[9px] text-blue-400">Quick Menu</span>
          </div>

          {/* Button 1: Absence Toggle */}
          <button
            onClick={() => {
              toggleAbsence(teacher);
              closeContextMenu();
            }}
            className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left font-semibold transition-colors ${
              isAbsent
                ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                : 'hover:bg-slate-800 text-slate-200'
            }`}
          >
            {isAbsent ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark Present</span>
              </>
            ) : (
              <>
                <UserX className="w-3.5 h-3.5 text-rose-400" />
                <span>Mark Absent</span>
              </>
            )}
          </button>

          {/* Button 2: Substitution Availability Toggle (FEAT-34) */}
          <button
            onClick={() => {
              if (isFreeFromSub) {
                setStaffAvailability(teacher, 'AVAILABLE');
              } else {
                setStaffAvailability(teacher, 'FREE_FROM_SUB', { remark: 'Excused' });
              }
              closeContextMenu();
            }}
            className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left font-semibold transition-colors ${
              isFreeFromSub
                ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                : 'hover:bg-slate-800 text-slate-200'
            }`}
          >
            {isFreeFromSub ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Available for Sub</span>
              </>
            ) : (
              <>
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span>Free from Sub</span>
              </>
            )}
          </button>

          {/* Button 3: More options (Opens Hero Modal FEAT-35) */}
          <button
            onClick={() => {
              openAvailabilityModal(teacher);
              closeContextMenu();
            }}
            className="w-full px-2 py-1 rounded-md text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 flex items-center justify-between transition-colors pt-0.5 border-t border-slate-800/80"
          >
            <span>More duties & presets...</span>
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
