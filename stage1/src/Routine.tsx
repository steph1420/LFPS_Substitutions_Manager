import { useEffect, useRef, useState } from 'react'
import { clock, groupLabel, lessonsAt, slimName, SLOT_LABEL, SLOT_SHORT, teacherAt, type Day, type Lesson, type Model } from './data'
import { absentAt, coveringAt, type DayState, type Duty } from './subs'
import type { Payload } from './drag'

const band = (slot: string) => slot === 'ASM' || slot === 'BRK' || slot === 'GH2' // GH2 thin + blank like Break (Steve t88u)
export const SETTLE_MS = 80 // name column folds only after scrolling has been still this long (Q-44-03, LOCKED)

/** Everything the grids need for Step 1b. st = null shows the original routine (before/after compare). */
export interface Live {
  st: DayState | null
  duties: Map<string, Duty>
  nameOf: (id: string) => string
  bind: (p: Payload) => Record<string, unknown>
  over: string | null
  overOk: boolean | null
  onDuty: (d: Duty) => void
  onTeacher: (staff: string) => void
}
const dropClass = (lv: Live, key: string) => (lv.over === key ? (lv.overOk ? ' s1-drop--ok' : ' s1-drop--bad') : '')

/** Desktop: one row per class, one column per slot (Break and 2nd G. Hr. are slim bands). */
export function DesktopRoutine({ m, day, lv }: { m: Model; day: Day; lv: Live }) {
  const cols = m.slots.map((s) => (band(s.id) ? 'var(--s1-col-band)' : 'var(--s1-col)')).join(' ')
  return (
    <div className="dl-card s1-grid-card">
      <div className="s1-grid" style={{ gridTemplateColumns: `var(--s1-col-head) ${cols}` }} role="table" aria-label={`Routine, ${day}`}>
        <div className="s1-gh s1-gh--corner" role="columnheader" style={{ gridRow: 1, gridColumn: 1 }}>Class</div>
        {m.slots.map((s, c) => (
          <div key={s.id} style={{ gridRow: 1, gridColumn: c + 2 }} className={`s1-gh${band(s.id) ? ' s1-gh--band' : ''}`} role="columnheader">
            <span>{SLOT_LABEL[s.id] ?? s.id}</span><small className="dl-num">{clock(s.starts)}–{clock(s.ends)}</small>
          </div>
        ))}
        {m.sections.map((sec, r) => (
          <Frag key={sec.id}>
            <div className="s1-rh" role="rowheader" style={{ gridRow: r + 2, gridColumn: 1 }}><strong>{sec.label}</strong></div>
            {m.slots.map((s, c) => band(s.id)
              ? (r === 0 ? <div key={s.id} className="s1-bandcell" style={{ gridRow: `2 / span ${m.sections.length}`, gridColumn: c + 2 }} aria-label={SLOT_LABEL[s.id]} /> : null)
              : <Cell key={s.id} m={m} lv={lv} slot={s.id} at={{ gridRow: r + 2, gridColumn: c + 2 }} lessons={lessonsAt(m, day, s.id, sec.id)} />)}
          </Frag>
        ))}
      </div>
    </div>
  )
}
const Frag = ({ children }: { children: React.ReactNode }) => <>{children}</>

function Cell({ m, lv, slot, lessons, at }: { m: Model; lv: Live; slot: string; lessons: Lesson[]; at: React.CSSProperties }) {
  if (!lessons.length) return <div className="s1-cell s1-cell--blank" role="cell" style={at} />
  const duty = lessons.flatMap((l) => l.teachers.map((t) => lv.duties.get(`${slot}|${t}`))).find(Boolean)
  const cls = duty ? (duty.sub ? ' s1-cell--covered' : ' s1-cell--need') : lessons.some((l) => l.group) ? ' s1-cell--group' : ''
  return (
    <div className={`s1-cell${cls}${duty ? dropClass(lv, duty.key) : ''}`} role="cell" style={at} data-drop={duty?.key}
      onClick={duty ? () => lv.onDuty(duty) : undefined} tabIndex={duty ? 0 : undefined} onKeyDown={duty ? (e) => { if (e.key === 'Enter') lv.onDuty(duty) } : undefined}>
      {lessons.map((l, i) => (
        <div key={i} className="s1-lesson">
          <span className="s1-subj">{l.subject}</span>
          {groupLabel(m, l) && <span className="s1-grp">{groupLabel(m, l)}</span>}
          <span className="s1-who">{l.teachers.map((t) => {
            const d = lv.duties.get(`${slot}|${t}`)
            if (!d) return <span key={t}>{lv.nameOf(t)}</span>
            return <span key={t} className="s1-absentname">{lv.nameOf(t)}</span>
          }).reduce<React.ReactNode[]>((a, x, j) => (j ? [...a, ', ', x] : [x]), [])}</span>
          {duty && (duty.sub
            ? <span className="s1-subchip" {...lv.bind({ staff: duty.sub, fromKey: duty.key, label: lv.nameOf(duty.sub) })}>↳ {lv.nameOf(duty.sub)}</span>
            : <span className="s1-need">Need sub · Assign ›</span>)}
        </div>
      ))}
    </div>
  )
}

/** Desktop helper: every teacher as a draggable chip; tap one to mark absent/present. */
export function StaffRail({ m, lv }: { m: Model; lv: Live }) {
  return (
    <aside className="dl-card s1-rail" aria-label="Teachers">
      <p className="dl-eyebrow">Teachers · drag onto a Need-sub cell</p>
      <ul className="s1-rail__list">
        {m.staff.map((t) => {
          const away = lv.st?.absent.get(t.id)
          return (
            <li key={t.id} className={`s1-rail__item${away ? ' s1-rail__item--absent' : ''}`}>
              <span className="s1-railchip" {...lv.bind({ staff: t.id, label: t.name })} aria-label={`Drag ${t.name}`}>{t.name}</span>
              {away && <span className="dl-chip s1-chip-absent">{away === 'ALL' ? 'Absent' : `Absent · ${away.size}`}</span>}
              <button className="dl-btn dl-btn--quiet s1-rail__btn" onClick={() => lv.onTeacher(t.id)}>{away ? 'Edit' : 'Absent…'}</button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

/** Phone (M04 layout): one row per teacher. The name column folds to sideways names only after scrolling has
 *  settled (80 ms, or scrollend) and opens again only at the exact left edge. Tap the strip to peek. */
export function PhoneRoutine({ m, day, lv }: { m: Model; day: Day; lv: Live }) {
  const slots = m.slots.filter((s) => s.id !== 'ASM')
  const ref = useRef<HTMLDivElement>(null)
  const [slim, setSlim] = useState(false)
  const [peek, setPeek] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    let t: ReturnType<typeof setTimeout> | null = null
    const settle = () => { if (t) clearTimeout(t); t = null; setSlim(el.scrollLeft > 0.5) }
    const f = () => { setPeek(false); if (t) clearTimeout(t); t = setTimeout(settle, SETTLE_MS) }
    el.addEventListener('scroll', f, { passive: true }); el.addEventListener('scrollend', settle)
    return () => { el.removeEventListener('scroll', f); el.removeEventListener('scrollend', settle); if (t) clearTimeout(t) }
  }, [])
  useEffect(() => {
    if (!peek) return
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.s1-pname')) setPeek(false) }
    window.addEventListener('pointerdown', close); return () => window.removeEventListener('pointerdown', close)
  }, [peek])
  const secLabel = (id: string) => m.sections.find((s) => s.id === id)?.label ?? id
  const st = lv.st
  return (
    <div className={`s1-phone${slim ? ' s1-phone--slim' : ''}${peek ? ' s1-phone--peek' : ''}`}>
      <div className="s1-pscroll" ref={ref} role="table" aria-label={`Routine by teacher, ${day}`}>
        <div className="s1-prow s1-prow--head">
          <div className="s1-pname s1-pname--head" role="columnheader">{slim && !peek ? '' : 'Teacher'}</div>
          {slots.map((s) => <div key={s.id} className={`s1-ph${band(s.id) ? ' s1-ph--band' : ''}${s.id === 'GH2' ? ' s1-ph--gh2' : ''}`} role="columnheader"><span>{SLOT_SHORT[s.id] ?? s.id}</span><small className="dl-num">{clock(s.starts)}</small></div>)}
        </div>
        {m.staff.map((t) => {
          const away = st?.absent.get(t.id)
          return (
            <div key={t.id} className={`s1-prow${away ? ' s1-prow--absent' : ''}`}>
              <div className="s1-pname" role="rowheader" {...lv.bind({ staff: t.id, label: t.name })}
                onClick={() => { if (slim && !peek) setPeek(true); else { setPeek(false); lv.onTeacher(t.id) } }}>
                <span className="s1-pname__n" title={t.name}>{slim && !peek ? slimName(t.name) : t.name}</span>
                {(!slim || peek) && (away
                  ? <small className="s1-absentnote">{away === 'ALL' ? 'Absent' : `Absent · ${away.size} period${away.size === 1 ? '' : 's'}`}</small>
                  : <small className="dl-muted">{t.role === 'Class teacher' ? `${t.section} class` : t.role}</small>)}
              </div>
              {slots.map((s) => {
                if (band(s.id)) return <div key={s.id} className={`s1-pband${s.id === 'GH2' ? ' s1-pband--gh2' : ''}`} aria-hidden>—</div>
                const ls = teacherAt(m, day, s.id, t.id)
                const duty = lv.duties.get(`${s.id}|${t.id}`)
                if (duty) {
                  return (
                    <div key={s.id} role="cell" tabIndex={0} data-drop={duty.key}
                      className={`s1-pcell ${duty.sub ? 's1-pcell--covered' : 's1-pcell--need'}${dropClass(lv, duty.key)}`}
                      onClick={() => lv.onDuty(duty)} onKeyDown={(e) => { if (e.key === 'Enter') lv.onDuty(duty) }}>
                      <span className="s1-subj">{ls[0]?.subject}</span>
                      {duty.sub
                        ? <span className="s1-subchip" {...lv.bind({ staff: duty.sub, fromKey: duty.key, label: lv.nameOf(duty.sub) })}>↳ {lv.nameOf(duty.sub)}</span>
                        : <span className="s1-need">Need sub</span>}
                    </div>
                  )
                }
                if (st && absentAt(st, t.id, s.id)) return <div key={s.id} className="s1-pcell s1-pcell--free s1-pcell--off" role="cell">Absent</div>
                const covering = st ? coveringAt(st, t.id, s.id) : null
                if (covering) {
                  const d = lv.duties.get(`${s.id}|${covering}`)
                  return (
                    <div key={s.id} className="s1-pcell s1-pcell--subbing" role="cell" {...lv.bind({ staff: t.id, fromKey: `${s.id}|${covering}`, label: t.name })}>
                      <span className="s1-subj">{d?.lessons[0]?.subject ?? 'Sub'}</span>
                      <span className="s1-who">Sub · {d ? (groupLabel(m, d.lessons[0]) ?? d.lessons.map((l) => secLabel(l.section)).join(', ')) : ''}</span>
                    </div>
                  )
                }
                return ls.length
                  ? <div key={s.id} className="s1-pcell" role="cell"><span className="s1-subj">{ls[0].subject}</span><span className="s1-who">{groupLabel(m, ls[0]) ?? ls.map((l) => secLabel(l.section)).join(', ')}</span></div>
                  : s.id === 'GH2'
                    ? <div key={s.id} className="s1-pcell s1-pcell--free" role="cell" />
                    : <div key={s.id} className="s1-pcell s1-pcell--free s1-pcell--drag" role="cell" {...(st ? lv.bind({ staff: t.id, label: t.name }) : {})}>Free</div>
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
