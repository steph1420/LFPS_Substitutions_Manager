import { describe, expect, it } from 'vitest';
import { checkRelayTarget, isLocalRelay, isProductionRelay } from '../src/sync/relayGuard.js';

const PROD_WS = 'wss://example-relay.onrender.com';
const PROD_API = 'https://example-relay.onrender.com';
const LOCAL_WS = 'ws://127.0.0.1:8080';
const LOCAL_API = 'http://localhost:8080';

describe('relay guard (Bundle 35a)', () => {
  it('classifies hosts', () => {
    expect(isProductionRelay(PROD_WS)).toBe(true);
    expect(isProductionRelay('https://onrender.com.evil.test')).toBe(false);
    expect(isProductionRelay(LOCAL_WS)).toBe(false);
    expect(isProductionRelay('not a url')).toBe(false);
    for (const u of [LOCAL_WS, LOCAL_API, 'ws://[::1]:8080', 'http://relay.localhost:9000']) expect(isLocalRelay(u)).toBe(true);
    for (const u of [PROD_WS, 'http://192.168.1.5:8080', 'http://localhost.evil.test']) expect(isLocalRelay(u)).toBe(false);
  });

  it('production builds may use the production relay', () => {
    expect(checkRelayTarget({ wsUrl: PROD_WS, apiUrl: PROD_API, production: true })).toBeNull();
  });

  it('dev/test builds refuse the production relay unless explicitly allowed', () => {
    expect(checkRelayTarget({ wsUrl: PROD_WS, apiUrl: LOCAL_API, production: false })).toMatch(/production relay/);
    expect(checkRelayTarget({ wsUrl: LOCAL_WS, apiUrl: PROD_API, production: false })).toMatch(/production relay/);
    expect(checkRelayTarget({ wsUrl: PROD_WS, apiUrl: PROD_API, production: false, allowProd: '1' })).toBeNull();
    expect(checkRelayTarget({ wsUrl: LOCAL_WS, apiUrl: LOCAL_API, production: false })).toBeNull();
  });

  it('VITE_RELAY_TARGET=local demands loopback, even in a production-mode build and with the override', () => {
    expect(checkRelayTarget({ wsUrl: LOCAL_WS, apiUrl: LOCAL_API, production: true, target: 'local' })).toBeNull();
    expect(checkRelayTarget({ wsUrl: PROD_WS, apiUrl: LOCAL_API, production: true, target: 'local', allowProd: '1' })).toMatch(/not local/);
    expect(checkRelayTarget({ wsUrl: LOCAL_WS, apiUrl: 'http://192.168.1.5:8080', production: false, target: 'local' })).toMatch(/not local/);
  });
});
