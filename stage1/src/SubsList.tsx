import type { Model } from './data'
import { SLOT_LABEL, clock, groupLabel } from './data'
import type { DayState, Duty } from './subs'

/** Substitutions of the day (M05 pattern): tiles, then each absent teacher with their periods (amber = Need sub). */
export function SubsList({ m, st, duties, nameOf, onDuty, onTeacher, onAllPresent }: {
  m: Model; st: DayState; duties: Duty[]; nameOf: (id: string) => string; onDuty: (d: Duty) => void; onTeacher: (id: string) => void; onAllPresent: () => void
}) {
  const need = duties.filter((d) => !d.sub).length, covered = duties.length - need
  const byTeacher = [...st.absent.keys()].map((id) => ({ id, list: duties.filter((d) => d.absent === id) }))
  const slot = (id: string) => m.slots.find((s) => s.id === id)
  const where = (d: Duty) => groupLabel(m, d.lessons[0]) ?? d.lessons.map((l) => m.sections.find((s) => s.id === l.section)?.label ?? l.section).join(', ')
  return (
    <div className="s1-subs">
      <div className="s1-stats">
        <div className="dl-stat dl-tone--warning"><div className="dl-stat__label">Need sub</div><div className="dl-stat__value">{need}</div></div>
        <div className="dl-stat dl-tone--accent"><div className="dl-stat__label">Covered</div><div className="dl-stat__value">{covered}</div></div>
        <div className="dl-stat s1-tone-absent"><div className="dl-stat__label">Absent</div><div className="dl-stat__value">{st.absent.size}</div></div>
      </div>
      {!st.absent.size && <p className="dl-muted s1-pad">Everyone is present. Tap a teacher’s name in Routine to mark them absent.</p>}
      {byTeacher.map(({ id, list }) => (
        <section key={id} className="s1-subgroup" aria-label={nameOf(id)}>
          <button className="s1-subgroup__head" onClick={() => onTeacher(id)}>
            <strong>{nameOf(id)}</strong>
            <span className="dl-chip s1-chip-absent">{st.absent.get(id) === 'ALL' ? 'Absent' : 'Absent · some periods'}</span>
          </button>
          {!list.length && <p className="dl-muted s1-small">No lessons in those periods.</p>}
          <ul className="dl-list">
            {list.map((d) => (
              <li key={d.key}>
                <button className={`dl-row dl-row--btn s1-duty${d.sub ? '' : ' s1-duty--need'}`} onClick={() => onDuty(d)}>
                  <span className={`dl-row__lead ${d.sub ? 'dl-tone--accent' : 'dl-tone--warning'}`} aria-hidden>{(SLOT_LABEL[d.slot] ?? d.slot).slice(0, 3)}</span>
                  <span className="dl-row__text">
                    <span className="dl-row__title">{d.lessons[0].subject} · {where(d)}</span>
                    <span className="dl-row__meta">{slot(d.slot) ? `${clock(slot(d.slot)!.starts)}–${clock(slot(d.slot)!.ends)}` : ''}</span>
                  </span>
                  <span className="dl-row__trail">{d.sub ? <span className="s1-covered">↳ {nameOf(d.sub)}</span> : <span className="s1-need">Need sub · Assign ›</span>}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {st.absent.size > 0 && <button className="dl-btn dl-btn--quiet s1-allpresent" onClick={onAllPresent}>Mark all present</button>}
    </div>
  )
}
