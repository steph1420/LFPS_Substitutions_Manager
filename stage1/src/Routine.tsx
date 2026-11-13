import { useEffect, useRef, useState } from 'react'
import { clock, groupLabel, lessonsAt, SLOT_LABEL, SLOT_SHORT, teacherAt, type Day, type Lesson, type Model } from './data'

const nameOf = (m: Model, id: string) => m.staff.find((s) => s.id === id)?.name ?? id
const band = (slot: string) => slot === 'ASM' || slot === 'BRK'

/** Desktop: one row per class, one column per slot (Assembly and Break are slim bands). */
export function DesktopRoutine({ m, day }: { m: Model; day: Day }) {
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
          <Row key={sec.id}>
            <div className="s1-rh" role="rowheader" style={{ gridRow: r + 2, gridColumn: 1 }}><strong>{sec.label}</strong></div>
            {m.slots.map((s, c) => band(s.id)
              ? (r === 0 ? <div key={s.id} className="s1-bandcell" style={{ gridRow: `2 / span ${m.sections.length}`, gridColumn: c + 2 }} aria-label={SLOT_LABEL[s.id]} /> : null)
              : <Cell key={s.id} m={m} at={{ gridRow: r + 2, gridColumn: c + 2 }} lessons={lessonsAt(m, day, s.id, sec.id)} />)}
          </Row>
        ))}
      </div>
    </div>
  )
}
const Row = ({ children }: { children: React.ReactNode }) => <>{children}</>

function Cell({ m, lessons, at }: { m: Model; lessons: Lesson[]; at: React.CSSProperties }) {
  if (!lessons.length) return <div className="s1-cell s1-cell--blank" role="cell" style={at} />
  return (
    <div className={`s1-cell${lessons.some((l) => l.group) ? ' s1-cell--group' : ''}`} role="cell" style={at}>
      {lessons.map((l, i) => (
        <div key={i} className="s1-lesson">
          <span className="s1-subj">{l.subject}</span>
          {groupLabel(m, l) && <span className="s1-grp">{groupLabel(m, l)}</span>}
          <span className="s1-who">{l.teachers.map((t) => nameOf(m, t)).join(', ')}</span>
        </div>
      ))}
    </div>
  )
}

/** Phone (M04 layout): one row per teacher. The name column shrinks to sideways names once you scroll across. */
export function PhoneRoutine({ m, day }: { m: Model; day: Day }) {
  const slots = m.slots.filter((s) => s.id !== 'ASM')
  const ref = useRef<HTMLDivElement>(null)
  const [slim, setSlim] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const f = () => setSlim(el.scrollLeft > 24)
    el.addEventListener('scroll', f, { passive: true }); return () => el.removeEventListener('scroll', f)
  }, [])
  const secLabel = (id: string) => m.sections.find((s) => s.id === id)?.label ?? id
  return (
    <div className={`s1-phone${slim ? ' s1-phone--slim' : ''}`}>
      <div className="s1-pscroll" ref={ref} role="table" aria-label={`Routine by teacher, ${day}`}>
        <div className="s1-prow s1-prow--head">
          <div className="s1-pname s1-pname--head" role="columnheader">{slim ? '' : 'Teacher'}</div>
          {slots.map((s) => <div key={s.id} className={`s1-ph${band(s.id) ? ' s1-ph--band' : ''}`} role="columnheader"><span>{SLOT_SHORT[s.id] ?? s.id}</span><small className="dl-num">{clock(s.starts)}</small></div>)}
        </div>
        {m.staff.map((t) => (
          <div key={t.id} className="s1-prow">
            <div className="s1-pname" role="rowheader"><span className="s1-pname__n">{t.name}</span>{!slim && <small className="dl-muted">{t.role === 'Class teacher' ? `${t.section} class` : t.role}</small>}</div>
            {slots.map((s) => {
              if (band(s.id)) return <div key={s.id} className="s1-pband" aria-hidden>—</div>
              const ls = teacherAt(m, day, s.id, t.id)
              return ls.length
                ? <div key={s.id} className="s1-pcell" role="cell"><span className="s1-subj">{ls[0].subject}</span><span className="s1-who">{groupLabel(m, ls[0]) ?? ls.map((l) => secLabel(l.section)).join(', ')}</span></div>
                : <div key={s.id} className="s1-pcell s1-pcell--free" role="cell">{s.id === 'GH2' ? '' : 'Free'}</div>
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
