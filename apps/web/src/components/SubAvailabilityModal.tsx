import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { DutyPreset } from '@lfps/core';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { X, Bus, Users, FileText, Building2, Check, Sparkles } from 'lucide-react';

import styles from './SubAvailabilityModal.module.css';

export const SubAvailabilityModal: React.FC = () => {
  const {
    activeAvailabilityTeacher,
    closeAvailabilityModal,
    availabilities,
    setStaffAvailability,
    openAwayModal,
    directory,
  } = useTimetableStore();

  const [customRemark, setCustomRemark] = useState('');

  // Standard UI Pillars: ESC key to dismiss
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeAvailabilityTeacher) {
        closeAvailabilityModal();
      }
    };
    if (activeAvailabilityTeacher) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAvailabilityTeacher, closeAvailabilityModal]);

  if (!activeAvailabilityTeacher) return null;

  const teacher = activeAvailabilityTeacher;
  const staff = directory[teacher];
  const record = availabilities[teacher];
  const isFreeFromSub = record && (!record.isAvailable || record.status === 'FREE_FROM_SUB');

  const presets: Array<{ id: DutyPreset; label: string; icon: React.ReactNode }> = [
    { id: 'BUS_DUTY', label: 'Bus Duty', icon: <Bus className={styles.bus1} /> },
    { id: 'PTM', label: 'PTM', icon: <Users className={styles.users1} /> },
    { id: 'EXAM_DUTY', label: 'Exam Duty', icon: <FileText className={styles.fileText1} /> },
    { id: 'AWAY_OFFICIAL', label: 'Away (Official)', icon: <Building2 className={styles.building21} /> },
  ];

  const handlePresetClick = (preset: DutyPreset, label: string) => {
    if (preset === 'AWAY_OFFICIAL') {
      closeAvailabilityModal();
      openAwayModal(teacher);
      return;
    }
    setStaffAvailability(teacher, 'FREE_FROM_SUB', {
      dutyPreset: preset,
      remark: label,
    });
    closeAvailabilityModal();
  };

  const handleApplyCustomRemark = () => {
    if (!customRemark.trim()) return;
    setStaffAvailability(teacher, 'FREE_FROM_SUB', {
      remark: customRemark.trim(),
    });
    setCustomRemark('');
    closeAvailabilityModal();
  };

  return (
    <AnimatePresence>
      <div
        className={styles.div1}
        onClick={closeAvailabilityModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={SPRING_TRANSITIONS.bouncy}
          onClick={(e) => e.stopPropagation()}
          className={styles.motionDiv1}
        >
          {/* Header & Dismiss */}
          <div className={styles.div2}>
            <div>
              <h3 className={styles.h31}>
                <Sparkles className={styles.sparkles1} />
                Substitution Availability & Duties
              </h3>
              <p className={styles.p1}>
                Configure special on-duty commitments or excuse staff from substitutions.
              </p>
            </div>
            <button
              onClick={closeAvailabilityModal}
              className={styles.button1}
            >
              <X className={styles.x1} />
            </button>
          </div>

          {/* Teacher Hero Card with Inline Toggle (FEAT-34 & FEAT-35) */}
          <div className={styles.div3}>
            <div className={styles.div4}>
              <div className={styles.div5}>
                {staff?.initials || 'ST'}
              </div>
              <div>
                <div className={styles.div6}>{teacher}</div>
                <div className={styles.div7}>{staff?.role || 'Teaching Staff'}</div>
              </div>
            </div>

            {/* Inline Hero Toggle Button */}
            <button
              onClick={() => {
                if (isFreeFromSub) {
                  setStaffAvailability(teacher, 'AVAILABLE');
                } else {
                  setStaffAvailability(teacher, 'FREE_FROM_SUB', { remark: 'Excused from sub' });
                }
              }}
              className={`${styles.button2A} ${
                isFreeFromSub
                  ? styles.button2B
                  : styles.button2C
              }`}
            >
              <span>{isFreeFromSub ? '⏸ Free from Sub' : '🟢 Available for Sub'}</span>
              <span className={styles.span1}>
                {isFreeFromSub ? '• Tap to restore' : '• Tap to free'}
              </span>
            </button>
          </div>

          {/* 4 Clean Single-Row Duty Presets (FEAT-35) */}
          <div className={styles.div8}>
            <div className={styles.div9}>1-Tap Duty Presets:</div>
            <div className={styles.div10}>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id, preset.label)}
                  className={styles.button3}
                >
                  {preset.icon}
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Custom Remark Input */}
          <div className={styles.div11}>
            <div className={styles.div12}>Custom Remark / Special Duty:</div>
            <div className={styles.div13}>
              <input
                type="text"
                value={customRemark}
                onChange={(e) => setCustomRemark(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomRemark()}
                placeholder="e.g. Science Lab Setup, Principal Meeting..."
                className={styles.input1}
              />
              <button
                onClick={handleApplyCustomRemark}
                className={styles.button4}
              >
                <Check className={styles.check1} />
                Apply
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

