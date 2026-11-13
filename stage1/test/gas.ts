// Loads bridge/Code.gs + bridge/Qr.gs into a sandbox like Apps Script's global scope (for tests and the local fake bridge).
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'

export type Store = { get(k: string): string | null; set(k: string, v: string): void; del(k: string): void; keys(): string[] }
export function memStore(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v), del: (k) => void data.delete(k), keys: () => [...data.keys()] }
}
export const sha256Hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

export function loadBridge(globals: Record<string, unknown> = {}) {
  const ctx = vm.createContext({ ...globals })
  const dir = new URL('../bridge/', import.meta.url)
  vm.runInContext(readFileSync(new URL('Qr.gs', dir), 'utf8'), ctx, { filename: 'Qr.gs' })
  vm.runInContext(readFileSync(new URL('Code.gs', dir), 'utf8'), ctx, { filename: 'Code.gs' })
  return ctx as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
}
