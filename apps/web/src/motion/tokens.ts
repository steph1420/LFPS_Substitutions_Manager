/**
 * Motion tokens (06 rule 3: no inline springs or timings). Bundle 47a moved the inline values
 * of the converted components here unchanged; shared springs still live in @lfps/ui
 * SPRING_TRANSITIONS. Values are the exact numbers the components used before.
 */

/** Shared ease curve (same as SPRING_TRANSITIONS.cssCubic, as a framer-motion array). */
export const EASE_SPRING_OUT = [0.2, 0.9, 0.3, 1] as const;

/** Header dynamic island: symmetrical expand/collapse spring. */
export const ISLAND_SPRING = {
  type: 'spring' as const,
  duration: 0.55,
  bounce: 0.12,
};

/** Header island backdrop fade. */
export const ISLAND_BACKDROP_FADE = { duration: 0.15 };

/** Limbo tray open/close. */
export const LIMBO_TRAY_REVEAL = { duration: 0.25, ease: EASE_SPRING_OUT };

/** Limbo tray chip: layout move, fade and scale. */
export const LIMBO_CHIP_MOTION = {
  layout: { duration: 0.28, ease: EASE_SPRING_OUT },
  opacity: { duration: 0.18 },
  scale: { duration: 0.2 },
};

/** Teacher full-name overlay slide-in spring. */
export const NAME_OVERLAY_SPRING = { type: 'spring' as const, stiffness: 450, damping: 28, mass: 0.5 };
