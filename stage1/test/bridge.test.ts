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

describe('web app router', () => {
  const tabs = { _Staff: [['StaffId'], ['T01']] }
  let reads = 0
  const read = () => { reads++; return tabs }
  it('pull without a valid device key never reads the Sheet', () => {
    reads = 0
    expect(g.handle_(env, { action: 'pull', device: DEV, token: 'f'.repeat(96) }, read).error).toBe('unpaired')
    expect(reads).toBe(0)
  })
  it('old connect-link key → superseded', () => { expect(g.handle_(env, { action: 'pull', key: 'abc' }, read).error).toBe('superseded') })
  it('pair → pull returns tabs + a stable hash → unknown action refused', () => {
    const c = g.makeCode_(env)
    const p = g.handle_(env, { action: 'pair', code: c.code, device: DEV, label: 'Mac · Chrome' }, read)
    const a = g.handle_(env, { action: 'pull', device: DEV, token: p.token }, read)
    const b = g.handle_(env, { action: 'pull', device: DEV, token: p.token }, read)
    expect(a.ok && a.tabs).toEqual(tabs)
    expect(a.hash).toBe(b.hash)
    expect(g.handle_(env, { action: 'write', device: DEV, token: p.token }, read).error).toBe('unknown action')
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
    const html: string = g.devicesHtml_([{ id: DEV, label: '<x>', pairedAt: 0, lastSeen: 0 }], () => 'd')
    expect(html).toContain('&lt;x&gt;')
    expect(html).not.toContain('<x>')
  })
})
