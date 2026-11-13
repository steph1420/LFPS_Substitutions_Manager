import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildModel, cached, DAYS, forgetLink, pull, takeLinkFromHash, todayIST, type Day, type Link, type Model, type Pulled } from './data'
import { SyncMark, type SyncState } from './SyncMark'
import { DesktopRoutine, PhoneRoutine } from './Routine'

const PULL_EVERY_MS = 60_000
const DAY_NAME: Record<Day, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' }

function useWide() {
  const q = '(min-width: 900px)'
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => { const m = window.matchMedia(q); const f = () => setWide(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return wide
}

export function App() {
  const [link, setLink] = useState<Link | null>(() => takeLinkFromHash())
  const [data, setData] = useState<Pulled | null>(() => cached())
  const [sync, setSync] = useState<SyncState>(navigator.onLine ? 'idle' : 'offline')
  const [error, setError] = useState<string | null>(null)
  const [day, setDay] = useState<Day>(() => todayIST())
  const wide = useWide()
  const busy = useRef(false)
  const hashRef = useRef<string | null>(data?.hash ?? null)

  const refresh = useCallback(async () => {
    if (!link || busy.current) return
    if (!navigator.onLine) { setSync('offline'); return }
    busy.current = true
    try {
      setSync('syncing')
      const p = await pull(link)
      setError(null)
      if (p.hash !== hashRef.current) { hashRef.current = p.hash; setData(p) }
      setSync('synced')
    } catch (e) {
      setSync(navigator.onLine ? 'idle' : 'offline')
      setError((e as Error).message)
    } finally { busy.current = false }
  }, [link])

  useEffect(() => { void refresh() }, [link]) // eslint-disable-line react-hooks/exhaustive-deps
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

  return (
    <div className="s1-app">
      <header className="s1-header">
        <div className="s1-header__row">
          <span className="dl-logo" aria-hidden>L</span>
          <span className="s1-brand">LFPS <span className="dl-muted">· Subs</span></span>
          <SyncMark state={sync} />
          <span className="s1-chip-preview dl-chip dl-tone--special">Preview</span>
        </div>
        {model && <nav className="s1-days" aria-label="Day">{DAYS.map((d) => (
          <button key={d} className={`s1-day${d === day ? ' s1-on' : ''}`} aria-pressed={d === day} onClick={() => setDay(d)}>{d}</button>
        ))}</nav>}
      </header>
      <main className="s1-main">
        {!link && <Connect />}
        {link && !model && !error && <p className="dl-muted s1-pad">Opening the routine…</p>}
        {link && error && !model && <ErrorCard msg={error} onReset={() => { forgetLink(); setLink(null); setData(null) }} />}
        {model && (
          <>
            <div className="s1-title">
              <h1 className="dl-title1">Routine</h1>
              <p className="dl-muted s1-sub">{DAY_NAME[day]} · from the school Sheet</p>
            </div>
            {wide ? <DesktopRoutine m={model} day={day} /> : <PhoneRoutine m={model} day={day} />}
          </>
        )}
      </main>
    </div>
  )
}

function Connect() {
  return (
    <section className="dl-card s1-card">
      <p className="dl-eyebrow">Stage 1 preview</p>
      <h2 className="dl-title2">Connect this device</h2>
      <p className="dl-muted">Open the link from the school Sheet once on this device. After that the routine opens here by itself.</p>
    </section>
  )
}
function ErrorCard({ msg, onReset }: { msg: string; onReset: () => void }) {
  return (
    <section className="dl-card s1-card">
      <h2 className="dl-title2">Can’t open the routine</h2>
      <p className="dl-muted">{msg}</p>
      <button className="dl-btn dl-btn--secondary" onClick={onReset}>Connect again</button>
    </section>
  )
}
