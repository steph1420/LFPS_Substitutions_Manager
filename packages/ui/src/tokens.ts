/**
 * Apple HIG Design System Tokens & Physics Configs
 * Shared across Project 1 and the broader school platform
 */

export const SPRING_TRANSITIONS = {
  // Snappy: micro-buttons, pill toggles, badges
  snappy: {
    type: 'spring' as const,
    stiffness: 450,
    damping: 32,
    mass: 0.8,
  },
  // Bouncy: cards appearing, toast alerts, modals
  bouncy: {
    type: 'spring' as const,
    stiffness: 320,
    damping: 24,
    mass: 1,
  },
  // Smooth: bottom sheets, drawer slides, view switches
  smooth: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 28,
    mass: 1.2,
  },
  // CSS cubic-bezier equivalent for hardware-accelerated transitions
  cssCubic: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
};

export const COLOR_ROLES = {
  classTeacher: {
    base: '#0284c7', // Sky blue
    bg: 'rgba(2, 132, 199, 0.12)',
    border: 'rgba(2, 132, 199, 0.28)',
    text: '#0369a1',
  },
  subjectTeacher: {
    base: '#007aff', // iOS blue
    bg: 'rgba(0, 122, 255, 0.10)',
    border: 'rgba(0, 122, 255, 0.24)',
    text: '#0062cc',
  },
  coordinator: {
    base: '#8b5cf6', // Royal violet
    bg: 'rgba(139, 92, 246, 0.14)',
    border: 'rgba(139, 92, 246, 0.32)',
    text: '#7c3aed',
  },
  absent: {
    base: '#ff3b30', // Apple crimson
    bg: 'rgba(255, 59, 48, 0.12)',
    border: 'rgba(255, 59, 48, 0.30)',
    text: '#d70015',
  },
  // FEAT-32: Away (Official)
  awayOfficial: {
    base: '#475569', // Slate indigo
    bg: 'rgba(71, 85, 105, 0.14)',
    border: 'rgba(71, 85, 105, 0.32)',
    text: '#334155',
  },
  // FEAT-34: Available for Sub
  availableForSub: {
    base: '#10b981', // Emerald green
    bg: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.32)',
    text: '#059669',
  },
  // FEAT-34: Free from Sub
  freeFromSub: {
    base: '#f59e0b', // Amber orange
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.32)',
    text: '#d97706',
  },
};

export const GLASS_PRESETS = {
  utopian: {
    backdropBlur: '28px',
    backgroundLight: 'rgba(255, 255, 255, 0.72)',
    backgroundDark: 'rgba(15, 23, 42, 0.78)',
    borderLight: 'rgba(255, 255, 255, 0.45)',
    borderDark: 'rgba(255, 255, 255, 0.08)',
    shadow: '0 12px 36px 0 rgba(0, 0, 0, 0.08)',
  },
};

