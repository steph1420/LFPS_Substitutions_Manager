// Device pairing with the Stage 1 Sheet bridge (bridge/Code.gs).
// The device keeps: the bridge address (from the QR / link), its random device ID, and its own long key (from a 6-digit code).
// Nothing else about pairing is stored here; the Sheet keeps only a hash of the token.
import type { Tabs } from './data'

export interface Device { url: string; id: string; token: string; label: string; paired: number }
export interface Pulled { tabs: Tabs; hash: string; at: number }
export type BridgeErrorKind = 'unpaired' | 'revoked' | 'expired' | 'superseded' | 'bad code' | 'locked' | 'no code' | 'expired code' | 'no bridge' | 'network' | 'other'

export class BridgeError extends Error {
  constructor(public kind: BridgeErrorKind, message: string, public left?: number) { super(message) }
}

const BRIDGE_KEY = 'lfps-stage1:bridge:v2'
const DEVICE_KEY = 'lfps-stage1:device:v2'
const ID_KEY = 'lfps-stage1:device-id:v1'
const OLD_LINK_KEY = 'lfps-stage1:link:v1' // the superseded connect link (url + shared key)
export const CACHE_KEY = 'lfps-stage1:tabs:v1'

/** Only the Apps Script web-app address is accepted (plus a 127.0.0.1 fake bridge when the page itself is local). */
export function validBridgeUrl(url: string, hostname = window.location.hostname): boolean {
  if (/^https:\/\/script\.google(usercontent)?\.com\/[^\s]+$/.test(url)) return true
  return /^(localhost|127\.0\.0\.1)$/.test(hostname) && /^http:\/\/127\.0\.0\.1:\d+\/[^\s]*$/.test(url)
}

/** Reads "#pair=123456&b=<bridge url>" (from the QR) once, keeps the bridge address, cleans the address bar.
 *  An old "#connect=…" link only gives its address; its shared key is ignored (superseded). Returns the code. */
export function takePairFromHash(loc: Location = window.location): string | null {
  const h = loc.hash.replace(/^#/, '')
  if (!h) return null
  const q = new URLSearchParams(h)
  let code: string | null = null
  const b = q.get('b')
  if (b && validBridgeUrl(b, loc.hostname)) saveBridge(b)
  const c = q.get('pair')
  if (c && /^\d{6}$/.test(c)) code = c
  const old = q.get('connect')
  if (old) { try { const url = atob(old).split('|')[0]; if (validBridgeUrl(url, loc.hostname)) saveBridge(url) } catch { /* bad old link */ } }
  if (q.has('pair') || q.has('b') || old) history.replaceState(null, '', loc.pathname + loc.search)
  return code
}

function saveBridge(url: string) { localStorage.setItem(BRIDGE_KEY, url) }

/** The bridge address this device knows (also taken over from an old connect link, without its key). */
export function savedBridge(): string | null {
  const v = localStorage.getItem(BRIDGE_KEY)
  if (v) return v
  try {
    const old = JSON.parse(localStorage.getItem(OLD_LINK_KEY) || 'null')
    localStorage.removeItem(OLD_LINK_KEY)
    if (old?.url && validBridgeUrl(old.url)) { saveBridge(old.url); return old.url }
  } catch { localStorage.removeItem(OLD_LINK_KEY) }
  return null
}

export function savedDevice(): Device | null {
  try { const v = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null'); return v?.url && v?.id && v?.token ? v : null } catch { return null }
}

// ---- Device ID (Q-HARM-9): random, made on the device, kept in IndexedDB plus a localStorage copy. Not a hardware ID.
export const isDeviceId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v)
export function newDeviceId(rand: (a: Uint8Array) => Uint8Array = (a) => crypto.getRandomValues(a)): string {
  return Array.from(rand(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}
function idb<T>(run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return new Promise((ok) => {
    try {
      const open = indexedDB.open('lfps-stage1', 1)
      open.onupgradeneeded = () => open.result.createObjectStore('kv')
      open.onerror = () => ok(undefined)
      open.onsuccess = () => {
        try { const r = run(open.result.transaction('kv', 'readwrite').objectStore('kv')); r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined) } catch { ok(undefined) }
      }
    } catch { ok(undefined) }
  })
}
/** This device's ID: localStorage, else IndexedDB, else a new random one (saved to both). */
export async function deviceId(): Promise<string> {
  let id: unknown = localStorage.getItem(ID_KEY)
  if (!isDeviceId(id)) id = await idb((s) => s.get('device-id'))
  if (!isDeviceId(id)) id = newDeviceId()
  localStorage.setItem(ID_KEY, id as string)
  void idb((s) => s.put(id, 'device-id'))
  return id as string
}

/** Forget this device's pairing and its copy of the routine. The bridge address stays, so typing a new code is enough. */
export function forgetDevice() { localStorage.removeItem(DEVICE_KEY); localStorage.removeItem(CACHE_KEY); localStorage.removeItem(OLD_LINK_KEY) }

/** A short, human label for the Sheet's "Paired devices" list, e.g. "iPhone · Safari". */
export function deviceLabel(ua: string = navigator.userAgent): string {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : 'Device'
  const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : ''
  return br ? `${os} · ${br}` : os
}

/** Plain-words message for each bridge answer. */
export function errorFor(error: string | undefined, left?: number): BridgeError {
  switch (error) {
    case 'unpaired': return new BridgeError('unpaired', 'This device is not paired any more. Pair it again with a new code.')
    case 'revoked': return new BridgeError('revoked', 'This device was removed in the school Sheet. Pair it again with a new code.')
    case 'expired': return new BridgeError('expired', 'This device was not used for a long time. Pair it again with a new code.')
    case 'superseded': return new BridgeError('superseded', 'Connecting has changed: devices now pair with a code. Pair this device with a new code.')
    case 'bad code': return new BridgeError('bad code', left ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'That code is not right.', left)
    case 'locked': return new BridgeError('locked', 'Too many wrong tries. Make a new code in the Sheet: LFPS › Pair a device.')
    case 'no code': return new BridgeError('no code', 'No code is waiting. Make one in the Sheet: LFPS › Pair a device.')
    case 'expired code': return new BridgeError('expired code', 'That code has ended. Make a new one in the Sheet: LFPS › Pair a device.')
    default: return new BridgeError('other', `Sheet: ${error ?? 'no answer'}`)
  }
}

async function call(url: string, params: Record<string, string>, fetcher: typeof fetch): Promise<Record<string, unknown>> {
  let res: Response
  try { res = await fetcher(`${url}?${new URLSearchParams(params)}`, { redirect: 'follow' }) } catch { throw new BridgeError('network', 'Can’t reach the Sheet right now.') }
  if (!res.ok) throw new BridgeError('network', `The Sheet answered ${res.status}`)
  try { return (await res.json()) as Record<string, unknown> } catch { throw new BridgeError('other', 'The Sheet sent something unexpected.') }
}

/** Swap a 6-digit code for this device's own token. */
export async function pairWith(url: string | null, code: string, id: string, label = deviceLabel(), fetcher: typeof fetch = fetch, now = Date.now()): Promise<Device> {
  if (!url) throw new BridgeError('no bridge', 'This device doesn’t know the school Sheet yet. Scan the QR code from LFPS › Pair a device once, or open the link under it.')
  const j = await call(url, { action: 'pair', code, device: id, label }, fetcher)
  if (!j.ok || typeof j.token !== 'string') throw errorFor(j.error as string | undefined, j.left as number | undefined)
  const d: Device = { url, id, token: j.token, label: typeof j.label === 'string' ? j.label : label, paired: now }
  localStorage.setItem(DEVICE_KEY, JSON.stringify(d))
  return d
}

export function cached(): Pulled | null {
  try { const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return v?.tabs ? v : null } catch { return null }
}

export async function pull(d: Device, fetcher: typeof fetch = fetch): Promise<Pulled> {
  const j = await call(d.url, { action: 'pull', device: d.id, token: d.token }, fetcher)
  if (!j.ok || !j.tabs) throw errorFor(j.error as string | undefined)
  const p = { tabs: j.tabs as Tabs, hash: (j.hash as string) ?? '', at: Date.now() }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)) } catch { /* full: keep in memory */ }
  return p
}

/** "Unpair this device": tell the Sheet (best effort), then forget locally either way. */
export async function unpair(d: Device, fetcher: typeof fetch = fetch): Promise<void> {
  try { await call(d.url, { action: 'unpair', device: d.id, token: d.token }, fetcher) } catch { /* offline: the Sheet owner can still remove it */ }
  forgetDevice()
}

/** Errors that mean "this device must pair again". */
export const needsPairing = (e: unknown) => e instanceof BridgeError && (e.kind === 'unpaired' || e.kind === 'revoked' || e.kind === 'expired' || e.kind === 'superseded')
