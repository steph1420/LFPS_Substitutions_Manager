import React, { useState, useRef, useEffect } from 'react';

interface TeacherNameOverlayProps {
  abbr: string;
  fullName: string;
  className?: string;
  roleSubtitle?: string;
}

/**
 * TeacherNameOverlay
 * Renders an abbreviated teacher name that, on desktop hover or mobile touch,
 * instantly displays the full name in an in-place overlay drawn directly over
 * the abbreviation with ZERO layout shift.
 */
export const TeacherNameOverlay: React.FC<TeacherNameOverlayProps> = ({
  abbr,
  fullName,
  className = '',
  roleSubtitle,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasDistinctFullName = Boolean(fullName && fullName.trim() !== abbr.trim());

  // Auto-dismiss on mobile when user taps anywhere outside
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

      {/* Floating Full Name Overlay Panel: Positioned exactly over the abbreviation */}
      {isRevealed && hasDistinctFullName && (
        <span
          className="absolute left-0 -top-1 z-40 px-2.5 py-1 rounded-xl bg-slate-900/98 border border-slate-700/80 shadow-[0_12px_28px_rgba(0,0,0,0.85)] backdrop-blur-xl whitespace-nowrap text-white font-bold text-sm tracking-tight animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
          style={{ transformOrigin: 'left center' }}
        >
          <span>{fullName}</span>
          {roleSubtitle && (
            <span className="text-[10px] text-slate-400 font-normal tracking-normal">
              {roleSubtitle}
            </span>
          )}
        </span>
      )}
    </div>
  );
};
