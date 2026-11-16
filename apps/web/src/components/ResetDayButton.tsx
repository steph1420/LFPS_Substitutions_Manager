import React, { useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { usePermissions } from './PermissionGuard.js';

import styles from './ResetDayButton.module.css';

interface ResetDayButtonProps {
  compact?: boolean;
}

export const ResetDayButton: React.FC<ResetDayButtonProps> = ({ compact = false }) => {
  const { selectedDay, resetDay, openResetPurgeMenu } = useTimetableStore();
  const { canResetDay } = usePermissions();

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const touchCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore
      }
    }
  };

  // Handle right-click (desktop)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(40);
    openResetPurgeMenu({ x: e.clientX, y: e.clientY });
  };

  // Handle touch long-press (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    isLongPressRef.current = false;
    if (e.touches[0]) {
      touchCoordsRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      triggerHaptic(40);
      const rect = buttonRef.current?.getBoundingClientRect();
      const x = touchCoordsRef.current.x || (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
      const y = touchCoordsRef.current.y || (rect ? rect.bottom + 8 : 100);
      openResetPurgeMenu({ x, y });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      return;
    }
    triggerHaptic(20);
    if (window.confirm(`Reset timetable and substitutions for ${selectedDay} to baseline? (This can be undone with ⌘Z)`)) {
      resetDay(selectedDay);
    }
  };

  // Admin-only (Reset Day / Purge History). Hidden rather than disabled for the front desk.
  if (!canResetDay) return null;

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`${styles.button1A} ${
        compact
          ? `${styles.button1B} glass-pill`
          : `${styles.button1C} glass-pill`
      }`}
      title={`Reset ${selectedDay} to baseline (Long press or right-click to purge history)`}
    >
      <RotateCcw className={styles.rotateCcw1} />
      {!compact && <span className={styles.span1}>Reset Day</span>}
    </button>
  );
};
