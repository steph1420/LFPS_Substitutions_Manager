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

import styles from './MicroContextMenu.module.css';

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
        className={styles.div1}
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
          className={styles.motionDiv1}
        >
          {/* Header pill with teacher & period name */}
          <div className={styles.div2}>
            <span className={styles.span1}>
              {teacher} {period ? `• ${period}` : ''}
            </span>
            <span className={styles.span2}>Quick Menu</span>
          </div>

          {/* Option 1: Away on Official Duty (Select Periods Marquee) */}
          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              startAwaySelection(teacher, period ? [period] : undefined);
            }}
            className={`${styles.button1A} ${
              isAwayOfficial || isAwayThisPeriod
                ? styles.button1B
                : styles.button1C
            }`}
          >
            <Building2 className={styles.building21} />
            <div className={styles.div3}>
              <div>{isAwayOfficial ? 'Edit Away Periods...' : 'Mark Away on Duty...'}</div>
              <div className={styles.div4}>
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
            className={`${styles.button2A} ${
              isAbsent
                ? styles.button2B
                : styles.button2C
            }`}
          >
            {isAbsent ? (
              <>
                <UserCheck className={styles.userCheck1} />
                <span>Mark Present (Full Day)</span>
              </>
            ) : (
              <>
                <UserX className={styles.userX1} />
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
              className={styles.button3}
            >
              <UserPlus className={styles.userPlus1} />
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
            className={`${styles.button4A} ${
              isFreeFromSub
                ? styles.button4B
                : styles.button4C
            }`}
          >
            {isFreeFromSub ? (
              <>
                <Sparkles className={styles.sparkles1} />
                <span>Available for Sub</span>
              </>
            ) : (
              <>
                <Coffee className={styles.coffee1} />
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
            className={styles.button5}
          >
            <span>More duties & presets...</span>
            <MoreHorizontal className={styles.moreHorizontal1} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
