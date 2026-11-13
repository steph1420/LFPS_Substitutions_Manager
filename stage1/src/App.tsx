import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildModel, DAYS, syncOutcome, todayIST, type Day, type Model } from './data'
import { cached, deviceId, forgetDevice, needsPairing, nextSeq, pairWith, pull, savedBridge, savedDevice, savedPending, savePending, takePairFromHash, unpair, write, type Device, type Pulled } from './bridge'
import { SyncMark, type SyncState } from './SyncMark'
import { DesktopRoutine, PhoneRoutine, StaffRail, type Live } from './Routine'
import { merge, toOps, type Op } from './ops'
import { assign, dateFor, dayState, duties as dutiesOf, markAllPresent, moveSub, setAbsence, unassign, type Action, type Duty } from './subs'
import { useDragAssign, type Payload } from './drag'
import { AssignSheet, TeacherSheet } from './Sheets'
import { SubsList } from './SubsList'
import { haptic } from './dl-haptics'
import { EnterCode } from './EnterCode'
import { HoldToConfirm } from './HoldToConfirm'

const PULL_EVERY_MS = 60_000
const DAY_NAME: Record<Day, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' }
const longDate = (d: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(d + 'T12:00:00Z'))
const TOAST_MS = 5000 // Undo toast stays ~5 s (Q-45-04 pattern)
const REJECT_TEXT: Record<string, string> = { 'conflict: sub busy': 'already covers another class then', 'conflict: sub teaching': 'teaches then', 'conflict: sub absent': 'is absent then', 'conflict: same teacher': 'is the absent teacher' }
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
  const [tab, setTab] = useState<'routine' | 'subs'>('routine')
  const [pending, setPendingState] = useState<Op[]>(() => savedPending())
  const pendingRef = useRef<Op[]>(pending)
  const setPending = (ops: Op[]) => { pendingRef.current = ops; savePending(ops); setPendingState(ops) }
  const [sheet, setSheet] = useState<{ kind: 'assign'; key: string } | { kind: 'teacher'; staff: string } | null>(null)
  const [toast, setToast] = useState<{ text: string; undo?: Action; bad?: boolean; n: number } | null>(null)
  const [compare, setCompare] = useState<'off' | 'held' | 'sticky'>('off')
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
      const p = pendingRef.current.length ? await sendPending(device) : await pull(device)
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

  const refreshRef = useRef(refresh); refreshRef.current = refresh
  useEffect(() => { void refresh() }, [device]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Sends this device's waiting ops; refused ones are dropped with a message. */
  const sendPending = useCallback(async (d: Device) => {
    const sent = pendingRef.current
    const w = await write(d, sent)
    const done = new Set([...w.accepted, ...w.rejected.map((r) => r.opId)])
    setPending(pendingRef.current.filter((o) => !done.has(o.opId)))
    if (w.rejected.length) {
      const r = w.rejected[0], o = sent.find((x) => x.opId === r.opId)
      const who = o && o.value && 'sub' in o.value ? nameRef.current(o.value.sub) : 'That change'
      haptic('error'); setToast({ text: `Not saved: ${who} ${REJECT_TEXT[r.error] ?? `(${r.error})`}.`, bad: true, n: Date.now() })
    }
    return w
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
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

  const date = dateFor(day)
  const allOps = useMemo(() => merge(data?.ops ?? [], pending), [data, pending])
  const st = useMemo(() => dayState(allOps, date), [allOps, date])
  const dutyList = useMemo(() => (model ? dutiesOf(model, day, st) : []), [model, day, st])
  const dutyMap = useMemo(() => new Map(dutyList.map((d) => [d.key, d])), [dutyList])
  const nameOf = useCallback((id: string) => model?.staff.find((s) => s.id === id)?.name ?? id, [model])
  const nameRef = useRef(nameOf); nameRef.current = nameOf

  /** Every change: shown at once, saved to the Sheet, with an Undo toast. */
  const apply = useCallback((a: Action, undoable = true) => {
    if (!device) return
    const ops = toOps(a.changes, device.id, nextSeq, merge(data?.ops ?? [], pendingRef.current))
    setPending([...pendingRef.current, ...ops])
    setToast({ text: a.label, undo: undoable ? a : undefined, n: Date.now() })
    void (async () => {
      if (busy.current) { setTimeout(() => void refreshRef.current(), 1200); return } // after the running refresh
      busy.current = true
      try {
        const w = await sendPending(device)
        hashRef.current = w.hash; setData(w); setSync('synced'); setError(null)
        setTimeout(() => setSync((s) => (s === 'synced' ? 'idle' : s)), 2600)
      } catch (e) {
        if (needsPairing(e)) { backToCode((e as Error).message); return }
        setSync(navigator.onLine ? 'idle' : 'offline') // kept on this device; sent at the next refresh
      } finally { busy.current = false }
    })()
  }, [device, data, sendPending, backToCode])

  const undo = (a: Action) => apply({ changes: a.undo, undo: a.changes, label: 'Undone' }, false)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), TOAST_MS); return () => clearTimeout(t) }, [toast])

  const judge = useCallback((p: Payload, target: string | null) => {
    if (!model) return null
    if (!target) return p.fromKey ? { ok: true as const, hint: 'Drop here to remove the sub' } : null
    const d = dutyMap.get(target); if (!d) return null
    const r = p.fromKey ? moveSub(model, day, st, p.fromKey, d, nameOf) : assign(model, day, st, d, p.staff, nameOf)
    return typeof r === 'string' ? { ok: false as const, hint: r } : { ok: true as const, hint: `Drop: covers ${nameOf(d.absent)}` }
  }, [model, day, st, dutyMap, nameOf])
  const onDrop = useCallback((p: Payload, target: string | null) => {
    if (!model) return false
    if (!target) { if (!p.fromKey) return false; const a = unassign(st, p.fromKey, nameOf); if (a) apply(a); return !!a }
    const d = dutyMap.get(target); if (!d) return false
    const r = p.fromKey ? moveSub(model, day, st, p.fromKey, d, nameOf) : assign(model, day, st, d, p.staff, nameOf)
    if (typeof r === 'string') { setToast({ text: r, bad: true, n: Date.now() }); return false }
    apply(r); return true
  }, [model, day, st, dutyMap, nameOf, apply])
  const dnd = useDragAssign({ judge, onDrop })

  const lv: Live = {
    st: compare === 'off' ? st : null, duties: compare === 'off' ? dutyMap : new Map(), nameOf, bind: compare === 'off' ? dnd.bind : () => ({}),
    over: dnd.over, overOk: dnd.verdict ? dnd.verdict.ok : null,
    onDuty: (d: Duty) => setSheet({ kind: 'assign', key: d.key }), onTeacher: (staff: string) => setSheet({ kind: 'teacher', staff }),
  }
  const pressAt = useRef(0)
  const need = dutyList.filter((d) => !d.sub).length
  const sheetDuty = sheet?.kind === 'assign' ? dutyMap.get(sheet.key) ?? null : null

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
              <div>
                <h1 className="dl-title1">{tab === 'routine' ? 'Routine' : 'Substitutions'}</h1>
                <p className="dl-muted s1-sub">{DAY_NAME[day]} {longDate(date)} · {pending.length ? 'saving…' : 'from the school Sheet'}</p>
              </div>
              {tab === 'routine' && st.absent.size > 0 && (
                <button className={`dl-chip dl-chip--btn dl-tone--neutral s1-compare${compare !== 'off' ? ' is-on' : ''}`} aria-pressed={compare !== 'off'}
                  onPointerDown={() => { pressAt.current = Date.now(); setCompare('held') }}
                  onPointerUp={() => setCompare(Date.now() - pressAt.current < 250 ? 'sticky' : 'off')}
                  onPointerLeave={() => setCompare((c) => (c === 'held' ? 'off' : c))}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCompare((c) => (c === 'off' ? 'sticky' : 'off')) } }}>
                  Before / after
                </button>
              )}
            </div>
            {compare !== 'off' && <button className="dl-chip dl-chip--btn dl-tone--special s1-origchip" onClick={() => setCompare('off')}>{compare === 'sticky' ? 'Original · tap to exit' : 'Original · let go to return'}</button>}
            {tab === 'routine'
              ? (wide
                ? <div className="s1-desk"><DesktopRoutine m={model} day={day} lv={lv} />{compare === 'off' && <StaffRail m={model} lv={lv} />}</div>
                : <PhoneRoutine m={model} day={day} lv={lv} />)
              : <SubsList m={model} st={st} duties={dutyList} nameOf={nameOf} onDuty={lv.onDuty} onTeacher={lv.onTeacher}
                  onAllPresent={() => { const a = markAllPresent(st); if (a) apply(a) }} />}
            <footer className="s1-device dl-muted">
              <span>This device: {device.label} · paired {shortDate(device.paired)}</span>
              <HoldToConfirm label="Hold to unpair this device" doneLabel="Unpaired" onConfirm={() => void onUnpair()} />
            </footer>
            <nav className="dl-dock" aria-label="Sections">
              {(['routine', 'subs'] as const).map((k) => (
                <button key={k} className={`dl-dock__tab${tab === k ? ' is-on' : ''}`} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
                  {tab === k && <span className="dl-dock__pill" aria-hidden />}
                  <span>{k === 'routine' ? 'Routine' : 'Substitutions'}</span>
                  {k === 'subs' && need > 0 && <span className="dl-chip dl-tone--warning s1-badge" aria-label={`${need} need a sub`}>{need}</span>}
                </button>
              ))}
            </nav>
            {sheetDuty && <AssignSheet m={model} day={day} st={st} duty={sheetDuty} nameOf={nameOf} onClose={() => setSheet(null)}
              onPick={(staff) => { const r = assign(model, day, st, sheetDuty, staff, nameOf); if (typeof r === 'string') setToast({ text: r, bad: true, n: Date.now() }); else { apply(r); setSheet(null) } }}
              onRemove={() => { const a = unassign(st, sheetDuty.key, nameOf); if (a) apply(a); setSheet(null) }} />}
            {sheet?.kind === 'teacher' && <TeacherSheet key={sheet.staff} m={model} st={st} staff={sheet.staff} nameOf={nameOf} onClose={() => setSheet(null)}
              onSave={(periods) => { apply(setAbsence(model, st, sheet.staff, periods, nameOf)); setSheet(null) }} />}
            {dnd.ghost}
            {toast && (
              <div className="dl-toast-region" role="status" aria-live="polite">
                <div className={`dl-toast ${toast.bad ? 'dl-tone--danger' : 'dl-tone--positive'}`} key={toast.n}>
                  <span className="dl-toast__dot" aria-hidden /><span>{toast.text}</span>
                  {toast.undo && <button className="dl-toast__action" onClick={() => { const a = toast.undo!; setToast(null); undo(a) }}>Undo</button>}
                </div>
              </div>
            )}
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
