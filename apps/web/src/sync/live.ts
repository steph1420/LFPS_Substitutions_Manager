/**
 * The app's single live sync connection (BUG: two sockets per tab before Bundle 35, because
 * Header and Settings each opened one). <App> calls startLiveSync() in an effect; the
 * ref count plus a short grace period keeps React StrictMode's mount → unmount → mount
 * from opening a second socket.
 */
import { DEFAULT_MASTER_SCHEDULE } from '@lfps/core';
import { APP_VERSION } from '../lib/buildInfo.js';
import { getBrowserStorage, type KeyValueStorage } from '../store/persistence.js';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { createLiveSyncClient, type LiveSyncClient } from './client.js';
import { getDeviceId } from './engine.js';

export const WS_BASE_URL: string = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8080';

let client: LiveSyncClient | null = null;
let refs = 0;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

function sessionStore(): KeyValueStorage | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function startLiveSync(): () => void {
  refs++;
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (!client) {
    const session = sessionStore();
    client = createLiveSyncClient({
      store: useTimetableStore,
      defaults: DEFAULT_MASTER_SCHEDULE,
      url: `${WS_BASE_URL}/api/v1/ws`,
      appVersion: APP_VERSION,
      deviceId: getDeviceId(getBrowserStorage(), session),
      metaStorage: session,
      target: typeof window !== 'undefined' ? window : undefined,
    });
    client.start();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    refs = Math.max(0, refs - 1);
    if (refs === 0 && !stopTimer) {
      stopTimer = setTimeout(() => {
        stopTimer = null;
        if (refs === 0) {
          client?.stop();
          client = null;
        }
      }, 1000);
    }
  };
}

export function reconnectLiveSync(): void {
  client?.reconnect();
}
