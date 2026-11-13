import { describe, expect, it, beforeEach } from 'vitest'
import { slimName, syncOutcome } from '../src/data'

// tiny browser shims for bridge.ts
const mem = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) },
  window: { location: { hostname: 'steph1420.github.io' } },
})
const B = await import('../src/bridge')
const URL_OK = 'https://script.google.com/macros/s/AKfyc_x/exec'
beforeEach(() => mem.clear())
const answer = (j: unknown) => (async () => ({ ok: true, status: 200, json: async () => j })) as unknown as typeof fetch

describe('slim sideways names drop titles', () => {
  it.each([
    ['Mrs. Teacher A', 'Teacher A'], ['Ms Teacher B', 'Teacher B'], ['MR. Teacher C', 'Teacher C'], ['Miss Teacher D', 'Teacher D'],
    ['Dr. Teacher E', 'Teacher E'], ['Sr. Teacher F', 'Teacher F'], ['Teacher G', 'Teacher G'], ['Mrs.', 'Mrs.'], ['Brinda', 'Brinda'], ['Msafiri', 'Msafiri'],
  ])('%s → %s', (a, b) => expect(slimName(a)).toBe(b))
})

describe('sync tick only on a real change', () => {
  it('first data counts as a change', () => expect(syncOutcome(null, 'h1')).toBe('changed'))
  it('same hash → quiet', () => expect(syncOutcome('h1', 'h1')).toBe('same'))
  it('new hash → tick', () => expect(syncOutcome('h1', 'h2')).toBe('changed'))
})

describe('client pairing', () => {
  it('accepts only Apps Script bridge addresses (plus 127.0.0.1 when local)', () => {
    expect(B.validBridgeUrl(URL_OK, 'steph1420.github.io')).toBe(true)
    expect(B.validBridgeUrl('https://evil.example/exec', 'steph1420.github.io')).toBe(false)
    expect(B.validBridgeUrl('http://127.0.0.1:8787/exec', 'steph1420.github.io')).toBe(false)
    expect(B.validBridgeUrl('http://127.0.0.1:8787/exec', 'localhost')).toBe(true)
  })
  it('device IDs are random 32-hex', () => {
    const a = B.newDeviceId(), b = B.newDeviceId()
    expect(B.isDeviceId(a) && B.isDeviceId(b) && a !== b).toBe(true)
  })
  it('labels the device in plain words', () => {
    expect(B.deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile/15E148 Safari/604.1')).toBe('iPhone · Safari')
    expect(B.deviceLabel('Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/120 Mobile Safari/537.36')).toBe('Android · Chrome')
    expect(B.deviceLabel('Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/120 Safari/537.36 Edg/120')).toBe('Windows · Edge')
  })
  it('pairWith stores the device; wrong code → tries left; no bridge → scan first', async () => {
    const d = await B.pairWith(URL_OK, '123456', 'a'.repeat(32), 'Mac · Safari', answer({ ok: true, token: 'f'.repeat(96), label: 'Mac · Safari' }), 5)
    expect(B.savedDevice()).toEqual(d)
    await expect(B.pairWith(URL_OK, '123456', 'a'.repeat(32), 'x', answer({ ok: false, error: 'bad code', left: 3 }))).rejects.toMatchObject({ kind: 'bad code', left: 3 })
    await expect(B.pairWith(null, '123456', 'a'.repeat(32))).rejects.toMatchObject({ kind: 'no bridge' })
  })
  it('revoked / expired / superseded all send the device back to Enter code', async () => {
    for (const error of ['revoked', 'unpaired', 'expired', 'superseded']) {
      const e = await B.pull({ url: URL_OK, id: 'a'.repeat(32), token: 't', label: '', paired: 0 }, answer({ ok: false, error })).catch((x) => x)
      expect(B.needsPairing(e)).toBe(true)
    }
    const net = await B.pull({ url: URL_OK, id: 'a'.repeat(32), token: 't', label: '', paired: 0 }, (async () => { throw new Error('x') }) as unknown as typeof fetch).catch((x) => x)
    expect(B.needsPairing(net)).toBe(false)
  })
  it('unpair forgets the device and its copy of the routine, keeps the bridge address', async () => {
    mem.set('lfps-stage1:bridge:v2', URL_OK); mem.set('lfps-stage1:tabs:v1', '{}')
    await B.pairWith(URL_OK, '123456', 'a'.repeat(32), 'x', answer({ ok: true, token: 'f'.repeat(96) }))
    await B.unpair(B.savedDevice()!, answer({ ok: true }))
    expect(B.savedDevice()).toBeNull()
    expect(mem.has('lfps-stage1:tabs:v1')).toBe(false)
    expect(B.savedBridge()).toBe(URL_OK)
  })
  it('an old connect link is migrated to its address only (key dropped)', () => {
    mem.set('lfps-stage1:link:v1', JSON.stringify({ url: URL_OK, key: 'secret' }))
    expect(B.savedBridge()).toBe(URL_OK)
    expect(mem.has('lfps-stage1:link:v1')).toBe(false)
  })
})
