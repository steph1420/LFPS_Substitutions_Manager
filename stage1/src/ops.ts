// Step 1b changes as an append-only op log (same rules as bridge/Code.gs): one op per change, the later
// op per key wins by Lamport counter, then server receive time, then op ID. Nothing is ever overwritten.
export type AbsentValue = { periods: 'ALL' | string[] } | null
export type SubValue = { sub: string } | null
export interface Op {
  opId: string; device: string; seq: number; lamport: number; wallAt: number; recvAt?: number
  kind: 'absent' | 'sub'; date: string; target: string; value: AbsentValue | SubValue
}
export type Change = { kind: 'absent'; date: string; staff: string; value: AbsentValue } | { kind: 'sub'; date: string; slot: string; absent: string; value: SubValue }

export const opKey = (o: Pick<Op, 'kind' | 'date' | 'target'>) => `${o.kind}|${o.date}|${o.target}`
export function newer(a: Op, b: Op): boolean {
  if (a.lamport !== b.lamport) return a.lamport > b.lamport
  const ra = a.recvAt ?? Number.MAX_SAFE_INTEGER, rb = b.recvAt ?? Number.MAX_SAFE_INTEGER // not yet sent = newest
  if (ra !== rb) return ra > rb
  return a.opId > b.opId
}
export function fold(ops: Op[]): Map<string, Op> {
  const w = new Map<string, Op>()
  for (const o of ops) { const k = opKey(o), cur = w.get(k); if (!cur || newer(o, cur)) w.set(k, o) }
  return w
}
export const maxLamport = (ops: Op[]) => ops.reduce((m, o) => Math.max(m, o.lamport), 0)

/** Turns changes into ops for this device, in order (each gets the next Lamport tick, so later ones win). */
export function toOps(changes: Change[], device: string, nextSeq: () => number, known: Op[], now = Date.now()): Op[] {
  const base = maxLamport(known) + 1
  return changes.map((c, i) => {
    const lamport = base + i
    const seq = nextSeq()
    const target = c.kind === 'absent' ? c.staff : `${c.slot}|${c.absent}`
    return { opId: `${device}:${seq}`, device, seq, lamport, wallAt: now, kind: c.kind, date: c.date, target, value: c.value }
  })
}

/** Merge server ops with this device's not-yet-confirmed ones (dropping those the server now has). */
export function merge(server: Op[], pending: Op[]): Op[] {
  const have = new Set(server.map((o) => o.opId))
  return [...server, ...pending.filter((o) => !have.has(o.opId))]
}
