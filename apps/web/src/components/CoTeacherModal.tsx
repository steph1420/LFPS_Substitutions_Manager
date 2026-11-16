import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Users, X, UserMinus, ShieldAlert } from 'lucide-react';

import styles from './CoTeacherModal.module.css';

export const CoTeacherModal: React.FC = () => {
  const {
    activeCoTeachSlot,
    closeCoTeachModal,
    releaseCoTeacher,
    selectedDay,
    schedule,
  } = useTimetableStore();

  // Standard UI Pillars: ESC key to dismiss
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeCoTeachSlot) {
        closeCoTeachModal();
      }
    };
    if (activeCoTeachSlot) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCoTeachSlot, closeCoTeachModal]);

  if (!activeCoTeachSlot) return null;

  const { period, teacher, partnerTeacher, className, subject } = activeCoTeachSlot;
  const currentSlot = schedule[selectedDay]?.[period];

  const teachersInSlot: string[] = [teacher];
  if (partnerTeacher && !teachersInSlot.includes(partnerTeacher)) {
    teachersInSlot.push(partnerTeacher);
  }

  // Also check if any other teachers are co-assigned to this same class and subject in this period
  if (currentSlot) {
    Object.entries(currentSlot).forEach(([tName, task]) => {
      if (
        task.includes(className) &&
        task.includes(subject) &&
        !teachersInSlot.includes(tName)
      ) {
        teachersInSlot.push(tName);
      }
    });
  }

  return (
    <AnimatePresence>
      <div
        className={styles.div1}
        onClick={closeCoTeachModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={SPRING_TRANSITIONS.bouncy}
          onClick={(e) => e.stopPropagation()}
          className={styles.motionDiv1}
        >
          {/* Header */}
          <div className={styles.div2}>
            <div>
              <h3 className={styles.h31}>
                <Users className={styles.users1} />
                Co-Teaching Period Inspector
              </h3>
              <p className={styles.p1}>
                {period} Period • {className} ({subject})
              </p>
            </div>
            <button
              onClick={closeCoTeachModal}
              className={styles.button1}
            >
              <X className={styles.x1} />
            </button>
          </div>

          {/* Operational Policy Banner (FEAT-31 Rationale) */}
          <div className={styles.div3}>
            <ShieldAlert className={styles.shieldAlert1} />
            <span>
              <strong>Per-Period Release (FEAT-31):</strong> Releasing a co-teacher applies strictly to this single period. Their solo classes throughout the day remain intact.
            </span>
          </div>

          {/* Teachers assigned to this slot */}
          <div className={styles.div4}>
            <div className={styles.div5}>Assigned Co-Teachers:</div>
            <div className={styles.div6}>
              {teachersInSlot.map((tName) => (
                <div
                  key={tName}
                  className={styles.div7}
                >
                  <div className={styles.div8}>
                    <div className={styles.div9}>
                      👥
                    </div>
                    <div>
                      <div className={styles.div10}>{tName}</div>
                      <div className={styles.div11}>Co-Teaching {className}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => releaseCoTeacher(period, tName)}
                    className={styles.button2}
                    title="Release this teacher from this specific period only"
                  >
                    <UserMinus className={styles.userMinus1} />
                    <span>Free this Period</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

