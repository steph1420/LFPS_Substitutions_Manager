import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Trash2, ArrowUpRight } from 'lucide-react';
import { useTimetableStore, DisplacedItem } from '../store/useTimetableStore.js';
import { usePermissions } from './PermissionGuard.js';

import styles from './LimboTray.module.css';
import { LIMBO_CHIP_MOTION, LIMBO_TRAY_REVEAL } from '../motion/tokens.js';

export const LimboTray: React.FC = () => {
  const { selectedDay, displaced, restoreDisplacedItem, clearDisplaced } = useTimetableStore();
  const { canEditSchedule } = usePermissions();
  const [shakingItemId, setShakingItemId] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const items: DisplacedItem[] = displaced[selectedDay] || [];

  const handleCardClick = (item: DisplacedItem) => {
    if (!canEditSchedule) return;
    const result = restoreDisplacedItem(item);
    if (result.success) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
      setStatusMessage(`Restored ${item.task} to ${item.ogTeacher} (${item.period})`);
      setTimeout(() => setStatusMessage(null), 2500);
    } else {
      setShakingItemId(item.id);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 50, 40]);
        } catch {}
      }
      setStatusMessage(result.reason || 'Cannot restore: slot is occupied');
      setTimeout(() => {
        setShakingItemId(null);
        setStatusMessage(null);
      }, 3000);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: DisplacedItem) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'limbo',
        item,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          key="limbo-tray"
          initial={{ opacity: 0, height: 0, y: 10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: 10 }}
          transition={LIMBO_TRAY_REVEAL}
          className={styles.motionDiv1}
        >
          <div className={styles.div1}>
            {/* Header */}
            <div className={styles.div2}>
              <div className={styles.div3}>
                <div className={styles.div4}>
                  <Layers className={styles.layers1} />
                </div>
                <div>
                  <div className={styles.div5}>
                    <span className={styles.span1}>
                      Displaced Classes (Limbo Tray)
                    </span>
                    <span className={styles.span2}>
                      {items.length}
                    </span>
                  </div>
                  <p className={styles.p1}>
                    {canEditSchedule
                      ? 'Drag onto any free cell to reallocate, or tap a card to restore to its original slot.'
                      : 'Classes moved off the routine today. Admin access is needed to reallocate them.'}
                  </p>
                </div>
              </div>

              {canEditSchedule && (
              <div className={styles.div6}>
                <button
                  type="button"
                  onClick={() => clearDisplaced(selectedDay)}
                  className={styles.button1}
                  title="Clear all displaced classes for today"
                >
                  <Trash2 className={styles.trash21} />
                  <span className={styles.span3}>Clear All</span>
                </button>
              </div>
              )}
            </div>

            {/* Status notification toast inside tray */}
            {statusMessage && (
              <div className={styles.div7}>
                {statusMessage}
              </div>
            )}

            {/* Displaced Cards Flow with fluid FLIP sliding animations */}
            <motion.div layout className={styles.motionDiv2}>
              <AnimatePresence mode="popLayout">
                {items.map((item) => {
                  const isShaking = shakingItemId === item.id;
                  return (
                    <motion.div
                      layout
                      layoutId={item.id}
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.7, y: -10 }}
                      transition={LIMBO_CHIP_MOTION}
                    >
                      <div
                        draggable={canEditSchedule}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => handleCardClick(item)}
                        className={`${styles.div8A} ${canEditSchedule ? styles.div8C : styles.div8D} ${styles.div8B} ${
                          isShaking ? `${styles.div8E} animate-shake` : ''
                        }`}
                        title={`Click to restore to ${item.ogTeacher} (${item.period}) or drag onto any grid cell`}
                      >
                        <div className={styles.div9}>
                          <div className={styles.div10}>
                            {item.task}
                          </div>
                          <div className={styles.div11}>
                            <ArrowUpRight className={styles.arrowUpRight1} />
                          </div>
                        </div>
                        <div className={styles.div12}>
                          From: <span className={styles.span4}>{item.ogTeacher}</span> ({item.period})
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
