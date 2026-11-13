// Step 1b domain rules (pure): who is absent when, which duties need a sub, who can cover, best-fit order, undo.
import type { Day, Lesson, Model } from './data'
import { fold, type Change, type Op } from './ops'

export interface DayState { date: string; absent: Map<string, 'ALL' | Set<string>>; subs: Map<string, string> /* `${slot}|${absentId}` → sub */ }

/** The state for one date from the op log. */
export function dayState(ops: Op[], date: string): DayState {
  const st: DayState = { date, absent: new Map(), subs: new Map() }
  for (const o of fold(ops).values()) {
    if (o.date !== date || !o.value) continue
    if (o.kind === 'absent') { const p = (o.value as { periods: 'ALL' | string[] }).periods; st.absent.set(o.target, p === 'ALL' ? 'ALL' : new Set(p)) }
    else st.subs.set(o.target, (o.value as { sub: string }).sub)
  }
  return st
}

export const isAbsent = (st: DayState, staff: string) => st.absent.has(staff)
export function absentAt(st: DayState, staff: string, slot: string): boolean {
  const a = st.absent.get(staff)
  return a === 'ALL' || (!!a && a.has(slot))
}
export const teachingSlots = (m: Model) => m.slots.filter((s) => s.teaching)

export function lessonsOf(m: Model, day: Day, staff: string, slot: string): Lesson[] {
  return m.lessons.filter((l) => l.day === day && l.slot === slot && l.teachers.includes(staff))
}

export interface Duty { slot: string; absent: string; lessons: Lesson[]; sub: string | null; key: string }
/** Every lesson of an absent teacher, in their absent periods, with its sub (or null = Need sub). */
export function duties(m: Model, day: Day, st: DayState): Duty[] {
  const out: Duty[] = []
  for (const [staff] of st.absent) for (const s of teachingSlots(m)) {
    if (!absentAt(st, staff, s.id)) continue
    const lessons = lessonsOf(m, day, staff, s.id)
    if (!lessons.length) continue
    const key = `${s.id}|${staff}`
    out.push({ slot: s.id, absent: staff, lessons, sub: st.subs.get(key) ?? null, key })
  }
  const order = new Map(m.slots.map((s, i) => [s.id, i]))
  return out.sort((a, b) => (order.get(a.slot)! - order.get(b.slot)!) || a.absent.localeCompare(b.absent))
}

/** The duty a teacher is covering at a slot, if any. */
export function coveringAt(st: DayState, staff: string, slot: string): string | null {
  for (const [key, sub] of st.subs) if (sub === staff && key.startsWith(slot + '|')) return key.split('|')[1]
  return null
}

export type Busy = 'absent' | 'teaching' | 'covering' | 'same' | null
/** Why a teacher can't cover slot for absentId (null = free). Blocks double-booking. */
export function busyReason(m: Model, day: Day, st: DayState, staff: string, slot: string, absentId: string): Busy {
  if (staff === absentId) return 'same'
  if (absentAt(st, staff, slot)) return 'absent'
  if (lessonsOf(m, day, staff, slot).length) return 'teaching'
  const c = coveringAt(st, staff, slot)
  if (c && c !== absentId) return 'covering'
  return null
}
export const BUSY_TEXT: Record<Exclude<Busy, null>, string> = { absent: 'is absent then', teaching: 'teaches then', covering: 'already covers another class then', same: 'is the absent teacher' }

/** Best-fit criteria, Q-44-02 (LOCKED) default order: free that period → fewest subs today → same subject/class.
 *  The order is a setting (shared Settings registry, later); Stage 1 uses the default. */
export type Criterion = 'free' | 'fewest' | 'match'
export const DEFAULT_ORDER: Criterion[] = ['free', 'fewest', 'match']
export interface Candidate { staff: string; busy: Busy; subsToday: number; match: boolean }

export function subsToday(st: DayState, staff: string) { let n = 0; for (const s of st.subs.values()) if (s === staff) n++; return n }
export function matches(m: Model, day: Day, staff: string, duty: Pick<Duty, 'lessons'>): boolean {
  const subj = new Set(duty.lessons.map((l) => l.subject)), secs = new Set(duty.lessons.map((l) => l.section))
  const me = m.staff.find((s) => s.id === staff)
  if (me && secs.has(me.section)) return true
  return m.lessons.some((l) => l.day === day && l.teachers.includes(staff) && (subj.has(l.subject) || secs.has(l.section)))
}

/** All present teachers for a duty, best fit first; busy ones last (shown, not assignable). */
export function candidates(m: Model, day: Day, st: DayState, duty: Pick<Duty, 'slot' | 'absent' | 'lessons'>, order: Criterion[] = DEFAULT_ORDER): Candidate[] {
  const list = m.staff.filter((s) => !isAbsent(st, s.id) || !absentAt(st, s.id, duty.slot)).map((s) => ({
    staff: s.id, busy: busyReason(m, day, st, s.id, duty.slot, duty.absent), subsToday: subsToday(st, s.id), match: matches(m, day, s.id, duty),
  })).filter((c) => c.busy !== 'same')
  const cmp: Record<Criterion, (a: Candidate, b: Candidate) => number> = {
    free: (a, b) => Number(!!a.busy) - Number(!!b.busy),
    fewest: (a, b) => a.subsToday - b.subsToday,
    match: (a, b) => Number(b.match) - Number(a.match),
  }
  const name = new Map(m.staff.map((s, i) => [s.id, i]))
  return list.sort((a, b) => Number(!!a.busy) - Number(!!b.busy) || order.reduce((r, k) => r || cmp[k](a, b), 0) || name.get(a.staff)! - name.get(b.staff)!)
}

// ---- Actions → changes (with their undo) ----
export interface Action { changes: Change[]; undo: Change[]; label: string }

const subChange = (date: string, key: string, value: string | null): Change => {
  const [slot, absent] = key.split('|')
  return { kind: 'sub', date, slot, absent, value: value ? { sub: value } : null }
}
const absentValue = (st: DayState, staff: string) => { const a = st.absent.get(staff); return a ? { periods: a === 'ALL' ? 'ALL' as const : [...a] } : null }

/** Assign (or move) a sub. Returns an error text instead when it would double-book. */
export function assign(m: Model, day: Day, st: DayState, duty: Pick<Duty, 'slot' | 'absent'>, staff: string, nameOf: (id: string) => string): Action | string {
  const busy = busyReason(m, day, st, staff, duty.slot, duty.absent)
  if (busy) return `${nameOf(staff)} ${BUSY_TEXT[busy]}.`
  const key = `${duty.slot}|${duty.absent}`, prev = st.subs.get(key) ?? null
  if (prev === staff) return `${nameOf(staff)} already covers this.`
  const changes = [subChange(st.date, key, staff)], undo = [subChange(st.date, key, prev)]
  return { changes, undo, label: `${nameOf(staff)} covers ${nameOf(duty.absent)}` }
}

/** Drag a sub from one duty to another. Same period: a move (or a swap when the target is covered). */
export function moveSub(m: Model, day: Day, st: DayState, fromKey: string, to: Pick<Duty, 'slot' | 'absent'>, nameOf: (id: string) => string): Action | string {
  const sub = st.subs.get(fromKey)
  const toKey = `${to.slot}|${to.absent}`
  if (!sub || fromKey === toKey) return 'Nothing to move.'
  const other = st.subs.get(toKey) ?? null
  const without = new Map(st.subs); without.delete(fromKey); if (other) without.delete(toKey)
  const st2: DayState = { ...st, subs: without }
  const busy = busyReason(m, day, st2, sub, to.slot, to.absent)
  if (busy) return `${nameOf(sub)} ${BUSY_TEXT[busy]}.`
  const [fromSlot, fromAbsent] = fromKey.split('|')
  if (other) {
    const b2 = busyReason(m, day, { ...st2, subs: new Map([...without, [toKey, sub]]) }, other, fromSlot, fromAbsent)
    if (b2) return `Can't swap: ${nameOf(other)} ${BUSY_TEXT[b2]}.`
  }
  const changes = [subChange(st.date, fromKey, null), subChange(st.date, toKey, sub), ...(other ? [subChange(st.date, fromKey, other)] : [])]
  const undo = [subChange(st.date, toKey, null), subChange(st.date, fromKey, sub), ...(other ? [subChange(st.date, toKey, other)] : [])]
  return { changes, undo, label: other ? `${nameOf(sub)} and ${nameOf(other)} swapped` : `${nameOf(sub)} moved to ${nameOf(to.absent)}’s class` }
}

export function unassign(st: DayState, key: string, nameOf: (id: string) => string): Action | null {
  const prev = st.subs.get(key)
  if (!prev) return null
  return { changes: [subChange(st.date, key, null)], undo: [subChange(st.date, key, prev)], label: `${nameOf(prev)} removed` }
}

/** Mark absent (whole day or some periods) or present. Their own sub duties in those periods are cleared,
 *  and when they come back their duties' subs are cleared too (LOG-D04). */
export function setAbsence(m: Model, st: DayState, staff: string, periods: 'ALL' | string[] | null, nameOf: (id: string) => string): Action {
  const changes: Change[] = [], undo: Change[] = []
  const now = absentValue(st, staff)
  changes.push({ kind: 'absent', date: st.date, staff, value: periods ? { periods } : null })
  undo.push({ kind: 'absent', date: st.date, staff, value: now })
  const covers = (slot: string) => periods === 'ALL' || (!!periods && periods.includes(slot))
  for (const [key, sub] of st.subs) {
    const [slot, absent] = key.split('|')
    const dropOwnCover = sub === staff && covers(slot) // they can't cover while absent
    const dropTheirDuty = absent === staff && !covers(slot) // that duty no longer needs a sub
    if (dropOwnCover || dropTheirDuty) { changes.push(subChange(st.date, key, null)); undo.push(subChange(st.date, key, sub)) }
  }
  const label = periods ? `${nameOf(staff)} marked absent${periods === 'ALL' ? '' : ` (${periods.length} period${periods.length === 1 ? '' : 's'})`}` : `${nameOf(staff)} marked present`
  void m
  return { changes, undo, label }
}

export function markAllPresent(st: DayState): Action | null {
  if (!st.absent.size) return null
  const changes: Change[] = [], undo: Change[] = []
  for (const [staff, a] of st.absent) { changes.push({ kind: 'absent', date: st.date, staff, value: null }); undo.push({ kind: 'absent', date: st.date, staff, value: { periods: a === 'ALL' ? 'ALL' : [...a] } }) }
  for (const [key, sub] of st.subs) { changes.push(subChange(st.date, key, null)); undo.push(subChange(st.date, key, sub)) }
  return { changes, undo, label: 'Everyone marked present' }
}

// ---- Dates (IST). The day picker shows this school week; on Sat/Sun it shows next week. ----
const DAY_INDEX: Record<Day, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 }
export function istDate(now: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now) }
export function dateFor(day: Day, now = new Date()): string {
  const today = new Date(istDate(now) + 'T12:00:00Z'), wd = today.getUTCDay() // 0 Sun … 6 Sat
  const monday = new Date(today.getTime() - ((wd + 6) % 7) * 86400000 + (wd === 6 || wd === 0 ? 7 * 86400000 : 0))
  return new Date(monday.getTime() + DAY_INDEX[day] * 86400000).toISOString().slice(0, 10)
}
