import { describe, it, expect } from 'vitest';
import { syncDisplay, phaseLabel } from '../src/sync/status.js';

const base = {
  phase: 'live' as const,
  mode: 'sheets' as string | null,
  sheetsState: 'ok' as string | null,
  pending: 0,
  clients: 2,
  error: null as string | null,
};

describe('syncDisplay (FIND-05)', () => {
  it('keeps Live when sheets are ok', () => {
    const d = syncDisplay(base);
    expect(d.label).toBe('Live');
    expect(d.tone).toBe('live');
  });

  it('surfaces Sheets error while phase is live', () => {
    const d = syncDisplay({ ...base, sheetsState: 'error' });
    expect(d.label).toBe('Sheets error');
    expect(d.tone).toBe('error');
  });

  it('surfaces Loading sheet… while hydrating / starting', () => {
    expect(syncDisplay({ ...base, sheetsState: 'hydrating' }).label).toBe('Loading sheet…');
    expect(syncDisplay({ ...base, sheetsState: 'starting' }).tone).toBe('warn');
  });

  it('keeps Connecting… / Offline phase labels', () => {
    expect(syncDisplay({ ...base, phase: 'connecting' }).label).toBe('Connecting…');
    expect(syncDisplay({ ...base, phase: 'offline', pending: 1 }).label).toBe('Offline');
    expect(phaseLabel('live')).toBe('Live');
  });

  it('ignores sheets state when not in sheets mode', () => {
    const d = syncDisplay({ ...base, mode: 'relay-only', sheetsState: 'error' });
    expect(d.label).toBe('Live');
  });
});
