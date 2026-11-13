import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildModel, DAYS, syncOutcome, todayIST, type Day, type Model } from './data'
import { cached, deviceId, forgetDevice, needsPairing, pairWith, pull, savedBridge, savedDevice, takePairFromHash, unpair, type Device, type Pulled } from './bridge'
import { SyncMark, type SyncState } from './SyncMark'
import { DesktopRoutine, PhoneRoutine } from './Routine'
import { EnterCode } from './EnterCode'
import { HoldToConfirm } from './HoldToConfirm'

const PULL_EVERY_MS = 60_000
const DAY_NAME: Record<Day, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' }
const shortDate = (t: number) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(t)

function useWide() {
  const q = '(min-width: 900px)'
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const m = window.matchMedia(q); const f = () => setWide(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return wide
}

export function App() {
  // The QR / link (#pair=…&b=…) is read first, so the bridge address it carries is known below.
  const [start] = useState(() => { const code = takePairFromHash(); return { code, bridge: savedBridge() } })
  const [bridge, setBridge] = useState<string | null>(start.bridge)
  const [device, setDevice] = useState<Device | null>(() => (start.code ? null : savedDevice()))
  const [data, setData] = useState<Pulled | null>(() => (savedDevice() ? cached() : null))
  const [sync, setSync] = useState<SyncState>(navigator.onLine ? 'idle' : 'offline')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pairing, setPairing] = useState(false)
  const [pairError, setPairError] = useState<string | null>(null)
  const [day, setDay] = useState<Day>(() => todayIST())
  const wide = useWide()
  const busy = useRef(false)
  const hashRef = useRef<string | null>(data?.hash ?? null)

  const backToCode = useCallback((msg: string | null) => {
    forgetDevice(); setDevice(null); setData(null); setError(null); hashRef.current = null; setNotice(msg); setSync('idle')
  }, [])

  const doPair = useCallback(async (code: string) => {
    setPairing(true); setPairError(null)
    const old = savedDevice() // set when an already-paired device scans a new QR (same device ID: the Sheet replaces its entry)
    try {
      const d = await pairWith(bridge ?? savedBridge(), code, await deviceId())
      setBridge(d.url); setNotice(null); setData(null); hashRef.current = null; setDevice(d)
    } catch (e) {
      if (old) { setDevice(old); setData(cached()); hashRef.current = cached()?.hash ?? null } // keep working as before
      else setPairError((e as Error).message)
    } finally { setPairing(false) }
  }, [bridge])

  useEffect(() => { if (start.code) void doPair(start.code) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    if (!device || busy.current) return
    if (!navigator.onLine) { setSync('offline'); return }
    busy.current = true
    try {
      const p = await pull(device)
      setError(null)
      // The tick plays only when the Sheet really changed (t69u); a quiet refresh shows nothing.
      if (syncOutcome(hashRef.current, p.hash) === 'changed') {
        hashRef.current = p.hash; setData(p); setSync('synced')
        setTimeout(() => setSync((s) => (s === 'synced' ? 'idle' : s)), 2600)
      } else setSync('idle')
    } catch (e) {
      if (needsPairing(e)) { backToCode((e as Error).message); return }
      setSync(navigator.onLine ? 'idle' : 'offline')
      setError((e as Error).message)
    } finally { busy.current = false }
  }, [device, backToCode])

  useEffect(() => { void refresh() }, [device]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, PULL_EVERY_MS)
    const on = () => { setSync('idle'); void refresh() }, off = () => setSync('offline')
    const vis = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('online', on); window.addEventListener('offline', off); document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); window.removeEventListener('online', on); window.removeEventListener('offline', off); document.removeEventListener('visibilitychange', vis) }
  }, [refresh])

  const model = useMemo<Model | null>(() => {
    if (!data) return null
    try { return buildModel(data.tabs) } catch (e) { setError((e as Error).message); return null }
  }, [data])

  const onUnpair = async () => { // HoldToConfirm is the confirmation (destructive standard)
    if (!device) return
    await unpair(device); backToCode('This device is unpaired. Pair it again any time with a new code.')
  }

  return (
    <div className="s1-app">
      <header className="s1-header">
        <div className="s1-header__row">
          <span className="dl-logo" aria-hidden>L</span>
          <span className="s1-brand">LFPS <span className="dl-muted">· Subs</span></span>
          <SyncMark state={sync} />
          <span className="s1-chip-preview dl-chip dl-tone--special">Preview</span>
        </div>
        {device && model && <nav className="s1-days" aria-label="Day">{DAYS.map((d) => (
          <button key={d} className={`s1-day${d === day ? ' s1-on' : ''}`} aria-pressed={d === day} onClick={() => setDay(d)}>{d}</button>
        ))}</nav>}
      </header>
      <main className="s1-main">
        {!device && <EnterCode key={notice ?? 'code'} prefill={start.code} knowsSheet={!!bridge} busy={pairing} error={pairError} notice={notice} onCode={(c) => void doPair(c)} />}
        {device && !model && !error && <p className="dl-muted s1-pad">Opening the routine…</p>}
        {device && error && !model && <ErrorCard msg={error} onRetry={() => void refresh()} onUnpair={() => void onUnpair()} />}
        {device && model && (
          <>
            <div className="s1-title">
              <h1 className="dl-title1">Routine</h1>
              <p className="dl-muted s1-sub">{DAY_NAME[day]} · from the school Sheet</p>
            </div>
            {wide ? <DesktopRoutine m={model} day={day} /> : <PhoneRoutine m={model} day={day} />}
            <footer className="s1-device dl-muted">
              <span>This device: {device.label} · paired {shortDate(device.paired)}</span>
              <HoldToConfirm label="Hold to unpair this device" doneLabel="Unpaired" onConfirm={() => void onUnpair()} />
            </footer>
          </>
        )}
      </main>
    </div>
  )
}

function ErrorCard({ msg, onRetry, onUnpair }: { msg: string; onRetry: () => void; onUnpair: () => void }) {
  return (
    <section className="dl-card s1-card">
      <h2 className="dl-title2">Can’t open the routine</h2>
      <p className="dl-muted">{msg}</p>
      <div className="s1-row">
        <button className="dl-btn dl-btn--secondary" onClick={onRetry}>Try again</button>
        <HoldToConfirm label="Hold to unpair this device" doneLabel="Unpaired" onConfirm={onUnpair} />
      </div>
    </section>
  )
}
