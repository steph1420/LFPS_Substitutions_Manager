// Copied from driftline-kit v0.3.0 packages/react/src/haptics.ts (only the import path changed).
// Graded haptics (KIT_GUIDE §7). Levels Off/Light/Normal/Strong — LOCKED Steve 2026-11-02 t208u (all apps).
import { HAPTICS, type HapticGrade } from './dl-tokens';

export type HapticLevel = 'off' | 'light' | 'normal' | 'strong';
let level: HapticLevel = 'normal';
export const setHapticLevel = (l: HapticLevel) => { level = l; };
export const getHapticLevel = () => level;

/** Pattern for a grade at a level. Even indexes vibrate, odd indexes are pauses. */
export function patternFor(grade: HapticGrade, l: HapticLevel = level): number[] {
  const p = [...HAPTICS[grade]];
  switch (l) {
    case 'off': return [];
    case 'light': return [Math.max(6, Math.round(p[0] / 2))];
    case 'strong': return p.map((v, i) => (i % 2 === 0 ? Math.min(80, Math.round(v * 1.5)) : v));
    default: return p;
  }
}

/** Fire a graded haptic. No-op where vibrate is missing (iOS Safari; Capacitor bridge later). */
export function haptic(grade: HapticGrade): boolean {
  const p = patternFor(grade);
  if (!p.length || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try { return navigator.vibrate(p.length === 1 ? p[0] : p); } catch { return false; }
}
