import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TRANSITIONS } from '@lfps/ui';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { Flag, X, AlertTriangle, Send } from 'lucide-react';

import styles from './DisputeModal.module.css';

const PRESET_DISPUTE_REASONS = [
  '🚌 Bus Duty scheduled',
  '👥 Parent-Teacher Meeting (PTM)',
  '📑 Exam Invigilation scheduled',
  '🔬 Lab / Practical setup',
  '🩺 Health & First Aid Duty',
];

export const DisputeModal: React.FC = () => {
  const { activeDisputeTarget, closeDisputeModal, disputeSubstitution } = useTimetableStore();
  const [reason, setReason] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDisputeModal();
    };
    if (activeDisputeTarget) {
      window.addEventListener('keydown', handleKeyDown);
      setReason('');
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDisputeTarget, closeDisputeModal]);

  if (!activeDisputeTarget) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason.trim() || 'Teacher unable to cover duty';
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch {}
    }
    disputeSubstitution(activeDisputeTarget.id, finalReason);
  };

  return (
    <AnimatePresence>
      <div
        className={styles.div1}
        onClick={closeDisputeModal}
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={SPRING_TRANSITIONS.bouncy}
          onClick={(e) => e.stopPropagation()}
          className={styles.motionDiv1}
        >
          {/* Header */}
          <div className={styles.div2}>
            <div>
              <div className={styles.div3}>
                <span className={styles.span1} />
                <h3 className={styles.h31}>
                  <Flag className={styles.flag1} />
                  Dispute Substitution Duty
                </h3>
              </div>
              <p className={styles.p1}>
                Period <span className={styles.span2}>{activeDisputeTarget.period}</span> &bull;{' '}
                <span className={styles.span3}>{activeDisputeTarget.className}</span> &bull;{' '}
                Sub for <span className={styles.span4}>{activeDisputeTarget.originalTeacher}</span>
              </p>
            </div>
            <button
              onClick={closeDisputeModal}
              className={styles.button1}
              title="Close (Esc)"
            >
              <X className={styles.x1} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form1}>
            {/* Context callout */}
            <div className={styles.div4}>
              <AlertTriangle className={styles.alertTriangle1} />
              <span>
                Disputing this assignment alerts the school coordinator immediately so an alternate substitute can be appointed.
              </span>
            </div>

            {/* Quick Reason Chips */}
            <div>
              <label className={styles.label1}>
                Quick Reason Presets:
              </label>
              <div className={styles.div5}>
                {PRESET_DISPUTE_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className={`${styles.button2A} ${
                      reason === preset
                        ? styles.button2B
                        : styles.button2C
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div>
              <label className={styles.label2}>
                Remarks / Additional Details:
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State why you are unable to take this period (e.g. Lab setup, PTM scheduled)..."
                rows={3}
                className={styles.textarea1}
              />
            </div>

            {/* Footer Actions */}
            <div className={styles.div6}>
              <button
                type="button"
                onClick={closeDisputeModal}
                className={styles.button3}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.button4}
              >
                <Send className={styles.send1} />
                Submit Dispute
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

