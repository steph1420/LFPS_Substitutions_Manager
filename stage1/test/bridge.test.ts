import { describe, expect, it, beforeEach } from 'vitest'
import jsQR from 'jsqr'
import { loadBridge, memStore, sha256Hex } from './gas'

const g = loadBridge()
let seq = 0
const hex32 = () => sha256Hex(`r${seq++}`).slice(0, 32)
const DEV = 'a'.repeat(32), DEV2 = 'b'.repeat(32)
let store: ReturnType<typeof memStore>, env: { store: typeof store; now: number; hash: typeof sha256Hex; rand: () => string }
beforeEach(() => { store = memStore(); env = { store, now: 1_700_000_000_000, hash: sha256Hex, rand: hex32 } })

const pair = (code: string, device = DEV, label = 'iPhone · Safari') => g.redeemCode_(env, code, device, label)
const wrong = (c: string) => (c === '000000' ? '000001' : '000000')

describe('pairing code', () => {
  it('is 6 digits, stored salted + hashed, expires in 5 minutes', () => {
    const c = g.makeCode_(env)
    expect(c.code).toMatch(/^\d{6}$/)
    expect(c.exp - env.now).toBe(5 * 60 * 1000)
    const raw = store.get('PAIR')!
    expect(raw).not.toContain(c.code)
    const p = JSON.parse(raw)
    expect(p.h).toBe(sha256Hex(p.s + ':' + c.code))
  })
  it('a new code replaces the old one', () => {
    const a = g.makeCode_(env); env.now += 1; const b = g.makeCode_(env)
    expect(a.code).not.toBe(b.code)
    expect(pair(a.code).error).toBe('bad code')
    expect(pair(b.code).ok).toBe(true)
  })
  it('works once (single use)', () => {
    const c = g.makeCode_(env)
    expect(pair(c.code).ok).toBe(true)
    expect(pair(c.code, DEV2)).toEqual({ ok: false, error: 'no code' })
  })
  it('is refused after 5 minutes', () => {
    const c = g.makeCode_(env); env.now += 5 * 60 * 1000 + 1
    expect(pair(c.code)).toEqual({ ok: false, error: 'expired code' })
    expect(store.get('PAIR')).toBeNull()
  })
  it('5 wrong tries use the code up, even for the right code afterwards', () => {
    const c = g.makeCode_(env)
    for (let i = 1; i <= 4; i++) expect(pair(wrong(c.code))).toEqual({ ok: false, error: 'bad code', left: 5 - i })
    expect(pair(wrong(c.code))).toEqual({ ok: false, error: 'locked' })
    expect(pair(c.code)).toEqual({ ok: false, error: 'no code' })
    expect(g.codeStatus_(env, c.exp).state).toBe('locked')
  })
  it('rejects malformed codes and device IDs without counting a try', () => {
    const c = g.makeCode_(env)
    expect(pair('12345').error).toBe('bad code')
    expect(pair(c.code, 'not-an-id').error).toBe('bad device')
    expect(JSON.parse(store.get('PAIR')!).tries).toBe(0)
  })
  it('no code waiting → no pairing', () => { expect(pair('123456')).toEqual({ ok: false, error: 'no code' }) })
  it('dialog status: waiting → paired (host screen resets)', () => {
    const c = g.makeCode_(env)
    expect(g.codeStatus_(env, c.exp)).toEqual({ state: 'waiting', left: 5 })
    pair(c.code)
    expect(g.codeStatus_(env, c.exp)).toEqual({ state: 'paired', label: 'iPhone · Safari' })
  })
  it('dialog status: replaced and expired; closing cancels only its own code', () => {
    const a = g.makeCode_(env); env.now += 10; const b = g.makeCode_(env)
    expect(g.codeStatus_(env, a.exp).state).toBe('replaced')
    g.cancelCode_(env, a.exp); expect(store.get('PAIR')).not.toBeNull()
    g.cancelCode_(env, b.exp); expect(store.get('PAIR')).toBeNull()
    env.now = b.exp + 1; expect(g.codeStatus_(env, b.exp).state).toBe('expired')
  })
})

describe('device key', () => {
  it('is ≥ 32 random bytes; only its hash is stored, with the registry fields', () => {
    const r = pair(g.makeCode_(env).code)
    expect(r.token).toMatch(/^[0-9a-f]{96}$/)
    const d = JSON.parse(store.get('DEV_' + DEV)!)
    expect(JSON.stringify(d)).not.toContain(r.token)
    expect(d).toMatchObject({ h: sha256Hex('token:' + r.token), label: 'iPhone · Safari', caps: ['read'], pairedAt: env.now, lastSeen: env.now, revoked: 0 })
  })
  it('reads need the right device + key', () => {
    const { token } = pair(g.makeCode_(env).code)
    expect(g.checkToken_(env, DEV, token).ok).toBe(true)
    expect(g.checkToken_(env, DEV2, token).error).toBe('unpaired')
    expect(g.checkToken_(env, DEV, token.replace(/.$/, (c: string) => (c === '0' ? '1' : '0'))).error).toBe('unpaired')
    expect(g.checkToken_(env, DEV, '').error).toBe('unpaired')
  })
  it('revoke → "revoked", and the key never works again', () => {
    const { token } = pair(g.makeCode_(env).code)
    expect(g.revokeDevice_(env, DEV)).toBe(true)
    expect(g.checkToken_(env, DEV, token).error).toBe('revoked')
    expect(g.handle_(env, { action: 'pull', device: DEV, token }, () => { throw new Error('must not read') }).error).toBe('revoked')
    expect(g.listDevices_(env)).toEqual([])
    expect(g.revokeDevice_(env, 'zz')).toBe(false)
  })
  it('a revoked device can pair again with a new code', () => {
    pair(g.makeCode_(env).code); g.revokeDevice_(env, DEV)
    const r = pair(g.makeCode_(env).code)
    expect(g.checkToken_(env, DEV, r.token).ok).toBe(true)
  })
  it('re-pairing the same device replaces its entry (no leftovers)', () => {
    pair(g.makeCode_(env).code); pair(g.makeCode_(env).code)
    expect(g.listDevices_(env)).toHaveLength(1)
  })
  it('unused for 90 days → expired and removed; last seen saved at most every 15 min', () => {
    const { token } = pair(g.makeCode_(env).code)
    env.now += 10 * 60 * 1000; g.checkToken_(env, DEV, token)
    expect(JSON.parse(store.get('DEV_' + DEV)!).lastSeen).toBe(env.now - 10 * 60 * 1000)
    env.now += 6 * 60 * 1000; g.checkToken_(env, DEV, token)
    expect(JSON.parse(store.get('DEV_' + DEV)!).lastSeen).toBe(env.now)
    env.now += 90 * 24 * 3600 * 1000 + 1
    expect(g.checkToken_(env, DEV, token).error).toBe('expired')
    expect(store.get('DEV_' + DEV)).toBeNull()
  })
  it('remove all devices', () => {
    pair(g.makeCode_(env).code); pair(g.makeCode_(env).code, DEV2); g.makeCode_(env)
    expect(g.revokeAll_(env)).toBe(2)
    expect(g.listDevices_(env)).toEqual([])
    expect(store.get('PAIR')).toBeNull()
  })
  it('unpair from the device itself removes its entry', () => {
    const { token } = pair(g.makeCode_(env).code)
    expect(g.unpairSelf_(env, DEV, token)).toEqual({ ok: true })
    expect(store.get('DEV_' + DEV)).toBeNull()
  })
  it('labels are cleaned and capped', () => {
    expect(g.cleanLabel_('<b>x</b>  y')).toBe('bx/b y')
    expect(g.cleanLabel_('')).toBe('Device')
    expect(g.cleanLabel_('a'.repeat(99))).toHaveLength(40)
  })
})

// ---- Step 1b: writes ----
const TT = { _Timetable: [['Day', 'Period', 'Section', 'Teacher(s)', 'Override staff'], ['Fri', 'P3', 'KGA', 'T01', ''], ['Fri', 'P3', 'KGB', 'T02', ''], ['Fri', 'P4', 'KGA', 'T03', '']] }
const FRI = '2026-11-13'
function fakeIo(tabs: Record<string, string[][]> = TT) {
  const io = { reads: 0, opsTab: [] as unknown[], views: null as null | Record<string, string[][]>, today: FRI, fmt: (t: number) => String(t),
    readTabs: () => { io.reads++; return tabs }, readOps: () => io.opsTab.slice(), appendOps: (o: unknown[]) => { io.opsTab.push(...o) }, writeViews: (v: Record<string, string[][]>) => { io.views = v } }
  return io
}
let seqN = 0
const op = (kind: string, target: string, value: unknown, extra: Record<string, unknown> = {}) => { seqN++; return { opId: `${DEV}:${seqN}`, device: DEV, seq: seqN, lamport: seqN, wallAt: 1, kind, date: FRI, target, value, ...extra } }
function paired() { const c = g.makeCode_(env); return pair(c.code).token as string }

describe('web app router', () => {
  it('pull/write without a valid device key never touch the Sheet', () => {
    const io = fakeIo()
    expect(g.handle_(env, { action: 'pull', device: DEV, token: 'f'.repeat(96) }, io).error).toBe('unpaired')
    expect(g.handle_(env, { action: 'write', device: DEV, token: 'f'.repeat(96), ops: [op('absent', 'T01', { periods: 'ALL' })] }, io).error).toBe('unpaired')
    expect(io.reads).toBe(0); expect(io.opsTab).toEqual([])
  })
  it('old connect-link key → superseded', () => { expect(g.handle_(env, { action: 'pull', key: 'abc' }, fakeIo()).error).toBe('superseded') })
  it('pull returns tabs + ops + a hash that changes only when data changes', () => {
    const token = paired(), io = fakeIo()
    const a = g.handle_(env, { action: 'pull', device: DEV, token }, io), b = g.handle_(env, { action: 'pull', device: DEV, token }, io)
    expect(a.tabs).toEqual(TT); expect(a.ops).toEqual([]); expect(a.hash).toBe(b.hash)
    g.handle_(env, { action: 'write', device: DEV, token, ops: [op('absent', 'T01', { periods: 'ALL' })] }, io)
    expect(g.handle_(env, { action: 'pull', device: DEV, token }, io).hash).not.toBe(a.hash)
    expect(g.handle_(env, { action: 'delete', device: DEV, token }, io).error).toBe('unknown action')
  })
  it('a revoked device cannot write', () => {
    const token = paired(), io = fakeIo(); g.revokeDevice_(env, DEV)
    expect(g.handle_(env, { action: 'write', device: DEV, token, ops: [op('absent', 'T01', { periods: 'ALL' })] }, io).error).toBe('revoked')
    expect(io.opsTab).toEqual([])
  })
})

describe('write action (S1_ tabs only)', () => {
  it('only the bridge’s own S1_ tabs are writable', () => {
    for (const t of ['S1_Ops', 'S1_Absences', 'S1_Subs']) expect(g.writableTab_(t)).toBe(t)
    for (const t of ['_Staff', '_Timetable', '_Sections', '_TimingSlots', 'Subs', 'App_Meta', '_DB_Helper', 'Daily_Ledger', 's1_ops', '']) expect(() => g.writableTab_(t)).toThrow(/never writes/)
  })
  it('appends ops, stamps receive time, writes the S1_Absences / S1_Subs views with tombstones', () => {
    const token = paired(), io = fakeIo()
    const r = g.handle_(env, { action: 'write', device: DEV, token, ops: JSON.stringify([op('absent', 'T01', { periods: 'ALL' }), op('sub', 'P3|T01', { sub: 'T03' })]) }, io)
    expect(r.ok).toBe(true); expect(r.accepted).toHaveLength(2); expect(r.rejected).toEqual([])
    expect(io.opsTab.every((o) => typeof (o as { recvAt: number }).recvAt === 'number')).toBe(true)
    expect(io.views!.S1_Absences[1]).toEqual([1, FRI, 'Fri', 'T01', 'ALL', 'active', expect.any(String), expect.any(String)])
    expect(io.views!.S1_Subs[1].slice(0, 7)).toEqual([1, FRI, 'Fri', 'P3', 'T01', 'T03', 'active'])
    g.handle_(env, { action: 'write', device: DEV, token, ops: [op('sub', 'P3|T01', null)] }, io)
    expect(io.views!.S1_Subs[1][6]).toBe('deleted') // tombstone, not a deleted row
    expect(io.opsTab).toHaveLength(3) // append-only
  })
  it('a resent op (same op ID) is ignored', () => {
    const token = paired(), io = fakeIo(), o = op('absent', 'T01', { periods: 'ALL' })
    g.handle_(env, { action: 'write', device: DEV, token, ops: [o] }, io)
    const r = g.handle_(env, { action: 'write', device: DEV, token, ops: [o] }, io)
    expect(r.accepted).toEqual([]); expect(io.opsTab).toHaveLength(1)
  })
  it('rejects ops of another device, bad dates, weekends, bad kinds and values', () => {
    const token = paired(), io = fakeIo()
    const bad = [op('absent', 'T01', { periods: 'ALL' }, { device: DEV2, opId: `${DEV2}:1` }), op('absent', 'T01', { periods: 'ALL' }, { date: '2026-11-14' }), op('absent', 'T01', { periods: 'ALL' }, { date: '13/11/2026' }),
      op('note', 'T01', 'x'), op('absent', 'T01', { periods: [] }), op('sub', 'P3', { sub: 'T03' }), op('sub', 'P3|T01', { sub: '<x>' })]
    const r = g.handle_(env, { action: 'write', device: DEV, token, ops: bad }, io)
    expect(r.accepted).toEqual([]); expect(r.rejected.map((x: { error: string }) => x.error)).toEqual(['bad op id', 'bad date', 'bad date', 'bad kind', 'bad value', 'bad target', 'bad value'])
    expect(g.handle_(env, { action: 'write', device: DEV, token, ops: '{nope' }, io).error).toBe('bad ops')
  })
  it('blocks double-booking: a sub who teaches, covers another class, is absent, or is the absent teacher', () => {
    const token = paired(), io = fakeIo()
    g.handle_(env, { action: 'write', device: DEV, token, ops: [op('absent', 'T01', { periods: 'ALL' }), op('absent', 'T02', { periods: ['P3'] }), op('sub', 'P3|T01', { sub: 'T03' })] }, io)
    const r = g.handle_(env, { action: 'write', device: DEV, token, ops: [op('sub', 'P3|T02', { sub: 'T03' }), op('sub', 'P4|T01', { sub: 'T03' }), op('sub', 'P3|T01', { sub: 'T02' }), op('sub', 'P3|T01', { sub: 'T01' })] }, io)
    expect(r.rejected.map((x: { error: string }) => x.error)).toEqual(['conflict: sub busy', 'conflict: sub teaching', 'conflict: sub absent', 'conflict: same teacher'])
  })
  it('a swap in one batch passes (ops apply in order)', () => {
    const token = paired(), io = fakeIo()
    g.handle_(env, { action: 'write', device: DEV, token, ops: [op('absent', 'T01', { periods: 'ALL' }), op('absent', 'T02', { periods: 'ALL' }), op('sub', 'P3|T01', { sub: 'T03' }), op('sub', 'P3|T02', { sub: 'T04' })] }, io)
    const r = g.handle_(env, { action: 'write', device: DEV, token, ops: [op('sub', 'P3|T01', null), op('sub', 'P3|T02', { sub: 'T03' }), op('sub', 'P3|T01', { sub: 'T04' })] }, io)
    expect(r.rejected).toEqual([])
    const st = g.fold_(io.opsTab)
    expect(st['sub|' + FRI + '|P3|T01'].value).toEqual({ sub: 'T04' }); expect(st['sub|' + FRI + '|P3|T02'].value).toEqual({ sub: 'T03' })
  })
  it('later op wins by Lamport, then receive time (another device’s older op does not overwrite)', () => {
    const a = { opId: 'a:1', lamport: 5, recvAt: 1, kind: 'absent', date: FRI, target: 'T01', value: { periods: 'ALL' } }
    const b = { opId: 'b:1', lamport: 4, recvAt: 9, kind: 'absent', date: FRI, target: 'T01', value: null }
    expect(g.fold_([a, b])['absent|' + FRI + '|T01'].opId).toBe('a:1')
    expect(g.fold_([b, { ...a, lamport: 4, recvAt: 10 }])['absent|' + FRI + '|T01'].opId).toBe('a:1')
  })
  it('pull sends only recent ops (21 days)', () => {
    const old = { opId: 'x:1', date: '2026-10-01', kind: 'absent', target: 'T01', value: null }, now = { ...old, opId: 'x:2', date: FRI }
    expect(g.recentOps_([old, now], FRI).map((o: { opId: string }) => o.opId)).toEqual(['x:2'])
  })
  it('restore after Remove (Undo) brings the device back', () => {
    const token = paired(); g.revokeDevice_(env, DEV)
    expect(g.restoreDevice_(env, DEV)).toBe(true)
    expect(g.checkToken_(env, DEV, token).ok).toBe(true)
    expect(g.restoreDevice_(env, DEV)).toBe(false)
  })
})

describe('QR (made inside Apps Script, no outside service)', () => {
  it('encodes the pairing link exactly', () => {
    const link = g.pairLink_('https://example.github.io/preview/', 'https://script.google.com/macros/s/AKfyc' + 'x'.repeat(70) + '/exec', '042917')
    expect(link).toContain('#pair=042917&b=https%3A%2F%2Fscript.google.com')
    const svg: string = g.qrSvg_(link)
    const vb = Number(/viewBox="0 0 (\d+)/.exec(svg)![1]), scale = 4, w = vb * scale
    const px = new Uint8ClampedArray(w * w * 4).fill(255)
    for (const m of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
      const x0 = Number(m[1]) * scale, y0 = Number(m[2]) * scale
      for (let y = y0; y < y0 + scale; y++) for (let x = x0; x < x0 + scale; x++) { const i = (y * w + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0 }
    }
    expect(jsQR(px, w, w)?.data).toBe(link)
  })
  it('dialog HTML escapes text and never includes anything but the code + link', () => {
    const pd: string = g.pairDialogHtml_({ code: '042917', exp: 1, ttl: 300, link: 'https://x/#pair=042917&b=y', svg: '<svg></svg>' })
    expect(pd).toContain('Code used and blocked') // Q-45-03: chip + fresh code, no full-screen hold
    expect(pd).not.toMatch(/<\/script>[^]*<script>/) // one inline script
    const html: string = g.devicesHtml_([{ id: DEV, label: '<x>', pairedAt: 0, lastSeen: 0 }], () => 'd')
    expect(html).toContain('&lt;x&gt;')
    expect(html).not.toContain('<x>')
  })
})
