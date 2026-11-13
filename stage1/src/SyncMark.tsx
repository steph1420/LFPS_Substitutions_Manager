import { useEffect, useState } from 'react'
/** Status, the SOW way (LOCKED v0.45 auto-save icon, in Driftline tokens): nothing at rest when online ·
 *  a ring while syncing (shown ≥ ~0.7 s) → a tick that draws and fades · a cloud with a slash when offline. */
export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline'
export function SyncMark({ state }: { state: SyncState }) {
  const [shown, setShown] = useState<SyncState>(state)
  useEffect(() => {
    if (state === 'synced' && shown === 'syncing') { const t = setTimeout(() => setShown('synced'), 700); return () => clearTimeout(t) }
    setShown(state)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (shown === 'synced') { const t = setTimeout(() => setShown('idle'), 1600); return () => clearTimeout(t) } }, [shown])
  if (shown === 'idle') return <span className="s1-sync s1-sync--rest" aria-hidden />
  if (shown === 'syncing') return <span className="s1-sync" role="status" aria-label="Syncing"><svg viewBox="0 0 18 18"><circle className="trk" cx="9" cy="9" r="7.5" /><circle className="ring" cx="9" cy="9" r="7.5" /></svg></span>
  if (shown === 'synced') return <span className="s1-sync s1-sync--done" role="status" aria-label="Synced"><svg viewBox="0 0 18 18"><circle className="trk" cx="9" cy="9" r="7.5" /><path className="tk" d="M5.3 9.3 L8 11.8 L12.8 6.4" /></svg></span>
  return <span className="s1-sync s1-sync--off" role="status" aria-label="Offline · showing the last copy on this device" title="Offline"><svg viewBox="0 0 18 18"><path d="M5 13.5h8.2a3 3 0 0 0 .3-6 4.2 4.2 0 0 0-8-.6A3.3 3.3 0 0 0 5 13.5z" /><path d="M3 3 L15 15" /></svg></span>
}
