/**
 * Read-only view of the live sync connection for components (Bundle 35).
 *
 * This hook never opens a socket: the single connection is started once by <App>
 * (src/sync/live.ts). Before Bundle 35 every caller (Header, Settings) opened its own.
 */
import { schoolDateFor } from '@lfps/core';
import { API_BASE_URL, reconnectLiveSync } from '../sync/live.js';
import { useSyncStatus, type SyncPhase } from '../sync/status.js';

export interface LiveSyncStatus {
  phase: SyncPhase;
  isConnected: boolean;
  activeClients: number;
  pending: number;
  mode: string | null;
  sheetsState: string | null;
  lastSyncTime: number | null;
  error: string | null;
}

// Download dated Excel workbook (FEAT-25)
async function downloadExcel(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/export/excel`);
    if (!response.ok) throw new Error('Failed to download Excel');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LFPS_Daily_Substitutions_${schoolDateFor(new Date())}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  } catch (e) {
    console.error('Download error:', e);
    return false;
  }
}

export function useLiveSync() {
  const s = useSyncStatus();
  const status: LiveSyncStatus = {
    phase: s.phase,
    isConnected: s.phase === 'live',
    activeClients: s.clients,
    pending: s.pending,
    mode: s.mode,
    sheetsState: s.sheetsState,
    lastSyncTime: s.lastSyncAt,
    error: s.error,
  };
  return { status, connect: reconnectLiveSync, downloadExcel };
}
