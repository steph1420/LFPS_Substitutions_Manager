import { useState } from 'react'
import type { Day, Model } from './data'
import { SLOT_LABEL, groupLabel } from './data'
import { BUSY_TEXT, candidates, type DayState, type Duty } from './subs'

function Sheet({ title, sub, onClose, children, foot }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <>
      <div className="dl-scrim s1-scrim" onClick={onClose} aria-hidden />
      <section className="dl-sheet s1-sheet" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <button className="s1-grabbtn" onClick={onClose} aria-label="Close"><span className="dl-sheet__grab" /></button>
        <div className="dl-sheet__head"><div><h2>{title}</h2>{sub && <p className="dl-muted s1-small">{sub}</p>}</div></div>
        <div className="dl-sheet__body">{children}</div>
        {foot && <div className="dl-sheet__foot">{foot}</div>}
      </section>
    </>
  )
}

/** M04: tap a Need-sub cell → free teachers for that period, best fit first; busy ones shown with the reason. */
export function AssignSheet({ m, day, st, duty, nameOf, onPick, onRemove, onClose }: {
  m: Model; day: Day; st: DayState; duty: Duty; nameOf: (id: string) => string
  onPick: (staff: string) => void; onRemove: () => void; onClose: () => void
}) {
  const list = candidates(m, day, st, duty)
  const l = duty.lessons[0], where = groupLabel(m, l) ?? duty.lessons.map((x) => m.sections.find((s) => s.id === x.section)?.label ?? x.section).join(', ')
  return (
    <Sheet title={`${SLOT_LABEL[duty.slot] ?? duty.slot} · ${l.subject} · ${where}`} sub={`For ${nameOf(duty.absent)} (absent)${duty.sub ? ` · now ${nameOf(duty.sub)}` : ''}`} onClose={onClose}
      foot={duty.sub
        ? <><button className="dl-btn dl-btn--secondary" onClick={onRemove}>Remove {nameOf(duty.sub)}</button><button className="dl-btn dl-btn--quiet" onClick={onClose}>Done</button></>
        : <button className="dl-btn dl-btn--quiet" onClick={onClose}>Skip for now</button>}>
      <ul className="dl-list s1-cands" aria-label="Teachers, best fit first">
        {list.map((c, i) => (
          <li key={c.staff}>
            <button className="dl-row dl-row--btn s1-cand" disabled={!!c.busy || c.staff === duty.sub} onClick={() => onPick(c.staff)}>
              <span className={`dl-row__lead ${c.busy ? 'dl-tone--neutral' : i === 0 ? 'dl-tone--positive' : 'dl-tone--accent'}`} aria-hidden>{c.busy ? '–' : i + 1}</span>
              <span className="dl-row__text">
                <span className="dl-row__title">{nameOf(c.staff)}</span>
                <span className="dl-row__meta">{c.busy ? `Busy · ${BUSY_TEXT[c.busy].replace(/^is /, '')}` : [ 'Free', `${c.subsToday} sub${c.subsToday === 1 ? '' : 's'} today`, c.match ? 'knows the class/subject' : '' ].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="dl-row__trail">{c.staff === duty.sub ? 'Covering' : c.busy ? '' : <span className="dl-btn dl-btn--primary s1-assignbtn">Assign</span>}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/** Mark a teacher absent (whole day or some periods) or present (M03 sheet). */
export function TeacherSheet({ m, st, staff, nameOf, onSave, onClose }: {
  m: Model; st: DayState; staff: string; nameOf: (id: string) => string; onSave: (periods: 'ALL' | string[] | null) => void; onClose: () => void
}) {
  const now = st.absent.get(staff)
  const teach = m.slots.filter((s) => s.teaching)
  const [some, setSome] = useState<Set<string>>(() => new Set(now && now !== 'ALL' ? now : []))
  const [mode, setMode] = useState<'ALL' | 'SOME'>(now && now !== 'ALL' ? 'SOME' : 'ALL')
  return (
    <Sheet title={nameOf(staff)} sub={now ? (now === 'ALL' ? 'Absent all day' : `Absent · ${now.size} period${now.size === 1 ? '' : 's'}`) : 'Present'} onClose={onClose}
      foot={<>
        {now && <button className="dl-btn dl-btn--secondary" onClick={() => onSave(null)}>Mark present</button>}
        <button className="dl-btn dl-btn--primary" disabled={mode === 'SOME' && !some.size} onClick={() => onSave(mode === 'ALL' ? 'ALL' : teach.map((s) => s.id).filter((id) => some.has(id)))}>{now ? 'Save' : 'Mark absent'}</button>
      </>}>
      <div className="dl-seg s1-seg" role="radiogroup" aria-label="Absent for">
        {(['ALL', 'SOME'] as const).map((k) => (
          <button key={k} role="radio" aria-checked={mode === k} className={`dl-seg__item${mode === k ? ' is-on' : ''}`} onClick={() => setMode(k)}>{mode === k && <span className="dl-seg__pill" aria-hidden />}<span className="dl-seg__label">{k === 'ALL' ? 'Whole day' : 'Some periods'}</span></button>
        ))}
      </div>
      {mode === 'SOME' && (
        <div className="s1-periods" role="group" aria-label="Periods">
          {teach.map((s) => (
            <button key={s.id} className={`dl-chip dl-chip--btn dl-tone--neutral${some.has(s.id) ? ' is-on' : ''}`} aria-pressed={some.has(s.id)}
              onClick={() => setSome((x) => { const n = new Set(x); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n })}>{SLOT_LABEL[s.id] ?? s.id}</button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
