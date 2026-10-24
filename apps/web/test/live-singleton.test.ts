import { describe, it, expect, vi, afterEach } from 'vitest';

// The double socket (Header + Settings each calling useLiveSync) is gone: one ref-counted
// connection per tab, surviving React StrictMode's mount → unmount → mount.
describe('startLiveSync singleton', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens exactly one socket across StrictMode remounts and closes it after the last release', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const opened: { closed: boolean }[] = [];
    class CountingSocket {
      readyState = 0;
      onopen = null;
      onmessage = null;
      onclose: (() => void) | null = null;
      onerror = null;
      closed = false;
      constructor() {
        opened.push(this);
      }
      send() {}
      close() {
        this.closed = true;
      }
    }
    vi.stubGlobal('WebSocket', CountingSocket);
    vi.resetModules();
    const { startLiveSync } = await import('../src/sync/live.js');

    const release1 = startLiveSync(); // StrictMode: mount
    release1(); //                       unmount
    const release2 = startLiveSync(); // mount again
    const release3 = startLiveSync(); // a second consumer
    await vi.advanceTimersByTimeAsync(2000);
    expect(opened).toHaveLength(1);

    release2();
    release3();
    release3(); // double release is ignored
    await vi.advanceTimersByTimeAsync(2000);
    expect(opened[0].closed).toBe(true);
    expect(opened).toHaveLength(1);
  });
});
