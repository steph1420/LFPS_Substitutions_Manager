import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Award, X, Check, Star } from 'lucide-react';

import styles from './OfficiatingModal.module.css';

export const OfficiatingModal: React.FC = () => {
  const {
    activeOfficiatingTarget,
    closeOfficiatingModal,
    selectedDay,
    directory,
    absences,
    availabilities,
    officiatingAC,
    officiatingCT,
    assignOfficiatingAC,
    assignOfficiatingCT,
  } = useTimetableStore();

  // Standard UI Pillars: ESC key and backdrop click to dismiss
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeOfficiatingTarget) {
        closeOfficiatingModal();
      }
    };
    if (activeOfficiatingTarget) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOfficiatingTarget, closeOfficiatingModal]);

  if (!activeOfficiatingTarget) return null;

  const { type, section } = activeOfficiatingTarget;
  const isAC = type === 'AC';
  const currentAssigned = isAC
    ? officiatingAC[selectedDay]
    : section
    ? officiatingCT[selectedDay]?.[section]
    : null;

  const teachers = Object.values(directory);

  return (
    <AnimatePresence>
      <div
        className={styles.div1}
        onClick={closeOfficiatingModal}
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
                <Award className={styles.award1} />
                {isAC
                  ? 'Designate Officiating AC (Off. AC)'
                  : `Assign Officiating Class Teacher (Off. CT • ${section})`}
              </h3>
              <p className={styles.p1}>
                Designate temporary officiating staff for {selectedDay}. Permissions inherit automatically.
              </p>
            </div>
            <button
              onClick={closeOfficiatingModal}
              className={styles.button1}
            >
              <X className={styles.x1} />
            </button>
          </div>

          {/* Candidate Pool */}
          <div className={`${styles.div3} scrollbar-thin`}>
            {teachers.map((teacher) => {
              const isAbsent = absences.some(
                (a) => a.teacherName === teacher.abbr && a.day === selectedDay
              );
              const avail = availabilities[teacher.abbr];
              const isFreeFromSub = avail && (!avail.isAvailable || avail.status === 'FREE_FROM_SUB');
              const isSelected = currentAssigned === teacher.abbr;
              const isRecommended = section && teacher.primaryClass === section;

              return (
                <button
                  key={teacher.id}
                  disabled={isAbsent}
                  onClick={() => {
                    if (isAC) {
                      assignOfficiatingAC(selectedDay, teacher.abbr);
                    } else if (section) {
                      assignOfficiatingCT(selectedDay, section, teacher.abbr);
                    }
                  }}
                  className={`${styles.button2A} ${
                    isSelected
                      ? styles.button2B
                      : isAbsent
                      ? styles.button2C
                      : styles.button2D
                  }`}
                >
                  <div className={styles.div4}>
                    <div className={styles.div5}>
                      {teacher.initials}
                    </div>
                    <div>
                      <div className={styles.div6}>
                        <span className={styles.span1}>
                          {teacher.abbr}
                        </span>
                        {isRecommended && (
                          <span className={styles.span2}>
                            <Star className={styles.star1} /> 2nd Teacher
                          </span>
                        )}
                        {isFreeFromSub && (
                          <span className={styles.span3}>
                            Free from Sub
                          </span>
                        )}
                      </div>
                      <div className={styles.div7}>{teacher.role}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className={styles.div8}>
                      <Check className={styles.check1} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

