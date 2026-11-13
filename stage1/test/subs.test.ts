import { describe, expect, it } from 'vitest'
import type { Model } from '../src/data'
import { fold, merge, toOps, type Change, type Op } from '../src/ops'
import { assign, candidates, dateFor, dayState, duties, markAllPresent, moveSub, setAbsence, unassign, type Action } from '../src/subs'

// Codename model: Fri, slots P1 P2 P3; T01 teaches KGA P1+P2, T02 KGB P1, T03 KGA P3, T04 free, T05 class teacher of KGB, free
const staff = ['T01', 'T02', 'T03', 'T04', 'T05'].map((id) => ({ id, name: `Teacher ${id}`, short: id, role: id === 'T05' ? 'Class teacher' : 'Subject teacher', section: id === 'T05' ? 'KGB' : '' }))
const m: Model = {
  staff, sections: [{ id: 'KGA', label: 'KG A', grade: 'KG' }, { id: 'KGB', label: 'KG B', grade: 'KG' }],
  slots: ['P1', 'P2', 'P3'].map((id) => ({ id, starts: '08:00', ends: '08:40', teaching: true })),
  lessons: [
    { day: 'Fri', slot: 'P1', section: 'KGA', subject: 'Maths', teachers: ['T01'], group: '' },
    { day: 'Fri', slot: 'P2', section: 'KGA', subject: 'EVS', teachers: ['T01'], group: '' },
    { day: 'Fri', slot: 'P1', section: 'KGB', subject: 'English', teachers: ['T02'], group: '' },
    { day: 'Fri', slot: 'P3', section: 'KGA', subject: 'Maths', teachers: ['T03'], group: '' },
  ],
}
const D = '2026-11-13', name = (id: string) => `Teacher ${id}`
let seq = 0
function run(ops: Op[], a: Action | string): Op[] {
  if (typeof a === 'string') throw new Error(a)
  return [...ops, ...toOps(a.changes, 'dev', () => ++seq, ops)].map((o) => ({ ...o, recvAt: o.recvAt ?? o.seq }))
}
const st = (ops: Op[]) => dayState(ops, D)

describe('absence → duties', () => {
  it('whole day: every lesson of that teacher needs a sub; some periods: only those', () => {
    let ops = run([], setAbsence(m, st([]), 'T01', 'ALL', name))
    expect(duties(m, 'Fri', st(ops)).map((d) => d.key)).toEqual(['P1|T01', 'P2|T01'])
    ops = run(ops, setAbsence(m, st(ops), 'T01', ['P2'], name))
    expect(duties(m, 'Fri', st(ops)).map((d) => d.key)).toEqual(['P2|T01'])
  })
})

describe('conflicts (no double-booking)', () => {
  const base = () => run(run([], setAbsence(m, st([]), 'T01', 'ALL', name)), setAbsence(m, st(run([], setAbsence(m, st([]), 'T01', 'ALL', name))), 'T02', 'ALL', name))
  it('a teacher who teaches then, is absent, or already covers that period is refused', () => {
    const ops = base()
    expect(assign(m, 'Fri', st(ops), { slot: 'P3', absent: 'T03' }, 'T03', name)).toMatch(/absent teacher/)
    expect(assign(m, 'Fri', st(ops), { slot: 'P1', absent: 'T01' }, 'T02', name)).toMatch(/absent then/)
    const o2 = run(ops, assign(m, 'Fri', st(ops), { slot: 'P1', absent: 'T01' }, 'T04', name))
    expect(assign(m, 'Fri', st(o2), { slot: 'P1', absent: 'T02' }, 'T04', name)).toMatch(/already covers/)
    const withT03 = run([], setAbsence(m, st([]), 'T01', 'ALL', name))
    expect(assign(m, 'Fri', st(withT03), { slot: 'P1', absent: 'T01' }, 'T02', name)).toMatch(/teaches then/)
  })
  it('move and swap keep everyone single-booked', () => {
    let ops = base()
    ops = run(ops, assign(m, 'Fri', st(ops), { slot: 'P1', absent: 'T01' }, 'T04', name))
    ops = run(ops, assign(m, 'Fri', st(ops), { slot: 'P1', absent: 'T02' }, 'T05', name))
    ops = run(ops, moveSub(m, 'Fri', st(ops), 'P1|T01', { slot: 'P1', absent: 'T02' }, name)) // swap
    expect(st(ops).subs.get('P1|T01')).toBe('T05'); expect(st(ops).subs.get('P1|T02')).toBe('T04')
    expect(moveSub(m, 'Fri', st(ops), 'P1|T01', { slot: 'P2', absent: 'T01' }, name)).not.toBeTypeOf('string') // T05 free in P2
  })
  it('marking a sub absent clears their cover; marking the absent teacher present clears their subs', () => {
    let ops = run([], setAbsence(m, st([]), 'T01', 'ALL', name))
    ops = run(ops, assign(m, 'Fri', st(ops), { slot: 'P1', absent: 'T01' }, 'T04', name))
    ops = run(ops, setAbsence(m, st(ops), 'T04', 'ALL', name))
    expect(st(ops).subs.size).toBe(0)
    ops = run(ops, assign(m, 'Fri', st(ops), { slot: 'P1', absent: 'T01' }, 'T05', name))
    ops = run(ops, setAbsence(m, st(ops), 'T01', null, name))
    expect(st(ops).subs.size).toBe(0); expect(st(ops).absent.has('T01')).toBe(false)
  })
})

describe('best-fit ranking (Q-44-02: free → fewest subs today → same subject/class)', () => {
  it('free first, then fewest subs, then class/subject match; busy last', () => {
    let ops = run(run([], setAbsence(m, st([]), 'T01', 'ALL', name)), setAbsence(m, st(run([], setAbsence(m, st([]), 'T01', 'ALL', name))), 'T02', ['P1'], name))
    const p1 = duties(m, 'Fri', st(ops)).find((d) => d.key === 'P1|T01')!
    let c = candidates(m, 'Fri', st(ops), p1)
    expect(c.map((x) => x.staff)).toEqual(['T03', 'T04', 'T05']) // all free, 0 subs; T03 teaches KG A (match) first, then roster order
    ops = run(ops, assign(m, 'Fri', st(ops), { slot: 'P2', absent: 'T01' }, 'T03', name)) // T03 now has 1 sub today
    c = candidates(m, 'Fri', st(ops), p1)
    expect(c[c.length - 1].staff).toBe('T03'); expect(c[0].staff).toBe('T04')
    const p2 = duties(m, 'Fri', st(ops)).find((d) => d.key === 'P2|T01')!
    expect(candidates(m, 'Fri', st(ops), p2).find((x) => x.staff === 'T02')?.busy).toBeNull() // T02 only absent in P1
  })
  it('the order is configurable', () => {
    const ops = run([], setAbsence(m, st([]), 'T01', 'ALL', name))
    const p1 = duties(m, 'Fri', st(ops))[0]
    expect(candidates(m, 'Fri', st(ops), p1, ['match', 'fewest', 'free'])[0].match).toBe(true)
  })
})

describe('undo', () => {
  it('assign → undo restores the previous sub (or none); unassign → undo brings it back', () => {
    let ops = run([], setAbsence(m, st([]), 'T01', 'ALL', name))
    const a = assign(m, 'Fri', st(ops), { slot: 'P1', absent: 'T01' }, 'T04', name) as Action
    ops = run(ops, a)
    ops = run(ops, { changes: a.undo, undo: a.changes, label: '' })
    expect(st(ops).subs.has('P1|T01')).toBe(false)
    ops = run(ops, a)
    const u = unassign(st(ops), 'P1|T01', name)!
    ops = run(ops, u); expect(st(ops).subs.size).toBe(0)
    ops = run(ops, { changes: u.undo, undo: u.changes, label: '' }); expect(st(ops).subs.get('P1|T01')).toBe('T04')
  })
  it('mark all present → undo restores absences and subs', () => {
    let ops = run([], setAbsence(m, st([]), 'T01', 'ALL', name))
    ops = run(ops, assign(m, 'Fri', st(ops), { slot: 'P1', absent: 'T01' }, 'T04', name))
    const a = markAllPresent(st(ops))!
    ops = run(ops, a); expect(st(ops).absent.size + st(ops).subs.size).toBe(0)
    ops = run(ops, { changes: a.undo, undo: a.changes, label: '' })
    expect(st(ops).absent.get('T01')).toBe('ALL'); expect(st(ops).subs.get('P1|T01')).toBe('T04')
  })
})

describe('op log', () => {
  it('later Lamport wins; unsent local ops win ties; merge drops confirmed pending', () => {
    const c: Change = { kind: 'absent', date: D, staff: 'T01', value: { periods: 'ALL' } }
    const [a] = toOps([c], 'a', () => 1, [])
    const b = { ...a, opId: 'b:1', device: 'b', value: null, recvAt: 5 }
    expect(fold([b, a]).get('absent|' + D + '|T01')!.opId).toBe('a:1')
    expect(merge([{ ...a, recvAt: 3 }], [a, b])).toHaveLength(2)
  })
  it('ops in one action get rising Lamport ticks', () => {
    const ops = toOps([{ kind: 'sub', date: D, slot: 'P1', absent: 'T01', value: null }, { kind: 'sub', date: D, slot: 'P1', absent: 'T01', value: { sub: 'T04' } }], 'a', (() => { let n = 0; return () => ++n })(), [])
    expect(ops.map((o) => o.lamport)).toEqual([1, 2])
  })
})

describe('dates (IST school week)', () => {
  it('weekday → this week; on Sat/Sun → next week', () => {
    expect(dateFor('Fri', new Date('2026-11-13T05:00:00Z'))).toBe('2026-11-13')
    expect(dateFor('Mon', new Date('2026-11-13T05:00:00Z'))).toBe('2026-11-09')
    expect(dateFor('Mon', new Date('2026-11-14T05:00:00Z'))).toBe('2026-11-16')
    expect(dateFor('Mon', new Date('2026-11-15T20:00:00Z'))).toBe('2026-11-16') // Mon 01:30 IST
  })
})
