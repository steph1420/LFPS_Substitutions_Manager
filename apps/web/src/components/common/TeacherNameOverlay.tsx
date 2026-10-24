import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
      className="relative inline-flex items-center max-w-full select-none cursor-pointer group/name"
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
      <span className={`block truncate ${className}`}>
        {abbr}
      </span>

      {/* Apple-grade Sliding Window Full Name Overlay */}
      <AnimatePresence>
        {isRevealed && hasDistinctFullName && (
          <motion.div
            initial={{ opacity: 0, x: -6, scaleX: 0.94 }}
            animate={{ opacity: 1, x: 0, scaleX: 1 }}
            exit={{ opacity: 0, x: -4, scaleX: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28, mass: 0.5 }}
            style={{ transformOrigin: 'left center' }}
            className="absolute left-0 -top-1.5 z-50 flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 rounded-xl bg-slate-900/98 border border-slate-700/90 shadow-[0_14px_34px_rgba(0,0,0,0.85)] backdrop-blur-2xl whitespace-nowrap pointer-events-auto"
          >
            {/* Sliding Window Acrylic Grip Bar Accent */}
            <span className="w-1 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 flex-shrink-0" />

            <span className="font-bold text-white text-xs sm:text-sm tracking-tight leading-none">
              {fullName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
