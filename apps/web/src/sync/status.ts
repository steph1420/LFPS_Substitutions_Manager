/** Live sync status for the UI (one store, fed by the single socket in client.ts). */
import { create } from 'zustand';

/**
 * connecting — opening the socket or waiting for the relay (covers a Render cold start,
 *              which can take up to a minute; local data stays usable meanwhile)
 * live       — hydrated and exchanging changes
 * offline    — several attempts failed; retrying in the background, edits queue locally
 */
export type SyncPhase = 'connecting' | 'live' | 'offline';

export interface SheetsSummary {
  fetchedAt: number;
  tabs: { name: string; rows: number }[];
  hiddenTabs: number;
}

export interface SyncStatus {
  phase: SyncPhase;
  /** Devices connected to the relay, including this one (0 when not live). */
  clients: number;
  /** Local changes the relay hasn't confirmed yet. */
  pending: number;
  /** Relay mode from HYDRATE: 'relay-only' or 'sheets'. */
  mode: string | null;
  /** Bridge state from HYDRATE when mode is 'sheets' (starting | ok | error). */
  sheetsState: string | null;
  sheets: SheetsSummary | null;
  lastSyncAt: number | null;
  error: string | null;
}

export const initialSyncStatus: SyncStatus = {
  phase: 'connecting',
  clients: 0,
  pending: 0,
  mode: null,
  sheetsState: null,
  sheets: null,
  lastSyncAt: null,
  error: null,
};

export const useSyncStatus = create<SyncStatus>(() => ({ ...initialSyncStatus }));

/** 2–4 word labels (DESIGN_PHILOSOPHY microcopy). */
export function phaseLabel(phase: SyncPhase): string {
  switch (phase) {
    case 'live':
      return 'Live';
    case 'connecting':
      return 'Connecting…';
    default:
      return 'Offline';
  }
}
