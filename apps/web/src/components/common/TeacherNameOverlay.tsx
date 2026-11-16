import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import styles from './TeacherNameOverlay.module.css';
import { NAME_OVERLAY_SPRING } from '../../motion/tokens.js';

interface TeacherNameOverlayProps {
  abbr: string;
  fullName: string;
  className?: string;
}

/**
 * TeacherNameOverlay
 * Renders an abbreviated teacher name that, on desktop hover or mobile touch,
 * smoothly reveals the full name in an in-place sliding window overlay drawn
 * directly over the abbreviation with ZERO layout shift.
 */
export const TeacherNameOverlay: React.FC<TeacherNameOverlayProps> = ({
  abbr,
  fullName,
  className = '',
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasDistinctFullName = Boolean(fullName && fullName.trim() !== abbr.trim());

  // Auto-dismiss on mobile or outside click
  useEffect(() => {
    if (!isRevealed) return;

    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsRevealed(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideInteraction);
    document.addEventListener('touchstart', handleOutsideInteraction);
    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction);
      document.removeEventListener('touchstart', handleOutsideInteraction);
    };
  }, [isRevealed]);

  return (
    <div
      ref={containerRef}
      className={styles.div1}
      onMouseEnter={() => hasDistinctFullName && setIsRevealed(true)}
      onMouseLeave={() => setIsRevealed(false)}
      onClick={(e) => {
        if (!hasDistinctFullName) return;
        e.stopPropagation();
        setIsRevealed((prev) => !prev);
      }}
      title={hasDistinctFullName ? `${fullName} (Tap/Hover to view full name)` : undefined}
    >
      {/* Base Abbreviated Name: Governs DOM flow with ZERO layout shift */}
      <span className={`${styles.span1} ${className}`}>
        {abbr}
      </span>

      {/* Apple-grade Sliding Window Full Name Overlay */}
      <AnimatePresence>
        {isRevealed && hasDistinctFullName && (
          <motion.div
            initial={{ opacity: 0, x: -6, scaleX: 0.94 }}
            animate={{ opacity: 1, x: 0, scaleX: 1 }}
            exit={{ opacity: 0, x: -4, scaleX: 0.96 }}
            transition={NAME_OVERLAY_SPRING}
            style={{ transformOrigin: 'left center' }}
            className={styles.motionDiv1}
          >
            {/* Sliding Window Acrylic Grip Bar Accent */}
            <span className={styles.span2} />

            <span className={styles.span3}>
              {fullName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
