import { useEffect, useRef, useState, useCallback } from 'react';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { AbsenceRecord, SubstitutionAssignment, schoolDateFor } from '@lfps/core';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export interface LiveSyncStatus {
  isConnected: boolean;
  activeClients: number;
  lastSyncTime: number | null;
  error: string | null;
}

export function useLiveSync() {
  const [status, setStatus] = useState<LiveSyncStatus>({
    isConnected: false,
    activeClients: 0,
    lastSyncTime: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const {
    toggleAbsence,
    assignSubstitution,
  } = useTimetableStore();

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(`${WS_BASE_URL}/api/v1/ws`);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus((prev) => ({ ...prev, isConnected: true, error: null }));
      };

      socket.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.type === 'CONNECT_ACK') {
            setStatus((prev) => ({
              ...prev,
              activeClients: packet.payload?.clients || 1,
              lastSyncTime: packet.timestamp,
            }));
          } else if (packet.type === 'STATE_MUTATION') {
            setStatus((prev) => ({ ...prev, lastSyncTime: packet.timestamp }));
            // Live broadcast sync from server
            const state = packet.payload;
            if (state) {
              // Synchronize state if needed
            }
          }
        } catch {
          // ignore parsing error
        }
      };

      socket.onclose = () => {
        setStatus((prev) => ({ ...prev, isConnected: false }));
        // Retry connection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        setStatus((prev) => ({ ...prev, error: 'Connection failed' }));
      };
    } catch (err: any) {
      setStatus((prev) => ({ ...prev, isConnected: false, error: err.message }));
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [toggleAbsence, assignSubstitution]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Download dated Excel workbook (FEAT-25)
  const downloadExcel = async () => {
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
  };

  // Sync Absence to Server
  const pushAbsence = async (record: AbsenceRecord) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/absence/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (e) {
      console.warn('Offline mode: Absence saved locally', e);
    }
  };

  // Sync Substitution to Server
  const pushSubstitution = async (sub: SubstitutionAssignment) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/substitutions/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
    } catch (e) {
      console.warn('Offline mode: Substitution saved locally', e);
    }
  };

  return {
    status,
    connect,
    downloadExcel,
    pushAbsence,
    pushSubstitution,
  };
}
