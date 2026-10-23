// Minimal browser shims for store/persistence tests (no DOM needed).
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const win = new EventTarget() as EventTarget & Record<string, unknown>;
const doc = new EventTarget() as EventTarget & { visibilityState: string };
doc.visibilityState = 'visible';
win.localStorage = new MemoryStorage();
win.sessionStorage = new MemoryStorage();
win.document = doc;
win.matchMedia = () => ({ matches: true });

Object.assign(globalThis, {
  window: win,
  localStorage: win.localStorage,
  sessionStorage: win.sessionStorage,
});

export { MemoryStorage };
