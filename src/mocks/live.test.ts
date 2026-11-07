// Tests for the partial mock mode helpers (decision 018): key parsing, the passthrough handlers, and that a live
// route reaches the network before any mock does. Nothing here touches the network: MSW only decides who answers.
import { getResponse, type RequestHandler } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handlers, resetMockState } from './handlers';
import { isUnbuiltMode, parseRouteKey, passthroughHandlers, withLivePassthrough } from './live';
import { LIVE_ROUTE_KEYS } from './liveRoutes.gen';

afterEach(() => {
  resetMockState();
  vi.unstubAllEnvs();
});

/** Who answers a request: the real API (a passthrough handler), a mock handler, or nobody. */
async function whoAnswers(list: RequestHandler[], method: string, url: string) {
  const response = await getResponse(list, new Request(url, { method }));
  if (!response) return 'nobody';
  return response.headers.get('x-msw-intention') === 'passthrough' ? 'real API' : 'mock';
}

const here = (path: string) => `${location.origin}${path}`;

describe('isUnbuiltMode', () => {
  it('is true only for VITE_API_MOCKS=unbuilt', () => {
    vi.stubEnv('VITE_API_MOCKS', 'unbuilt');
    expect(isUnbuiltMode()).toBe(true);
    for (const other of ['true', 'false', '']) {
      vi.stubEnv('VITE_API_MOCKS', other);
      expect(isUnbuiltMode()).toBe(false);
    }
  });
});

describe('parseRouteKey', () => {
  it('splits the method and the path and keeps :param segments', () => {
    expect(parseRouteKey('GET /health')).toEqual({ method: 'get', path: '/health' });
    expect(parseRouteKey('POST /admin/staff/:id/suspend')).toEqual({
      method: 'post',
      path: '/admin/staff/:id/suspend',
    });
    expect(parseRouteKey('DELETE /admin/ip-rules/:id').method).toBe('delete');
    expect(parseRouteKey('PATCH /admin/settings/:key').method).toBe('patch');
  });

  it('rejects a key that is not "METHOD /path"', () => {
    for (const bad of ['', '/admin/staff', 'GET admin/staff', 'FETCH /x', 'get /x', 'GET /a b']) {
      expect(() => parseRouteKey(bad)).toThrow('Bad live route key');
    }
  });

  it('understands every generated live key', () => {
    expect(LIVE_ROUTE_KEYS.length).toBeGreaterThan(0);
    for (const key of LIVE_ROUTE_KEYS) expect(() => parseRouteKey(key)).not.toThrow();
  });
});

describe('passthroughHandlers', () => {
  it('makes one handler per key, in order', () => {
    const list = passthroughHandlers(['GET /health', 'POST /admin/auth/login']);
    expect(list).toHaveLength(2);
    expect(passthroughHandlers([])).toEqual([]);
  });

  it('matches the exact method and path, with :param for any one segment', async () => {
    const list = passthroughHandlers(['POST /admin/staff/:id/suspend'], '');
    expect(await whoAnswers(list, 'POST', here('/admin/staff/7/suspend'))).toBe('real API');
    expect(await whoAnswers(list, 'POST', here('/admin/staff/7/suspend?x=1'))).toBe('real API');
    expect(await whoAnswers(list, 'GET', here('/admin/staff/7/suspend'))).toBe('nobody');
    expect(await whoAnswers(list, 'POST', here('/admin/staff/7/reactivate'))).toBe('nobody');
    expect(await whoAnswers(list, 'POST', here('/admin/staff/7'))).toBe('nobody');
  });

  it('does not let /health also catch /admin/system/health', async () => {
    const list = passthroughHandlers(['GET /health'], '');
    expect(await whoAnswers(list, 'GET', here('/health'))).toBe('real API');
    expect(await whoAnswers(list, 'GET', here('/admin/system/health'))).toBe('nobody');
  });

  it('follows the API base URL when one is set', async () => {
    const list = passthroughHandlers(['GET /admin/auth/me'], 'http://api.test');
    expect(await whoAnswers(list, 'GET', 'http://api.test/admin/auth/me')).toBe('real API');
    expect(await whoAnswers(list, 'GET', here('/admin/auth/me'))).toBe('nobody');
  });
});

describe('withLivePassthrough', () => {
  it('puts the passthrough handlers before every mock handler', () => {
    const list = withLivePassthrough(handlers, ['GET /health', 'GET /admin/auth/me'], '');
    expect(list).toHaveLength(handlers.length + 2);
    expect(list.slice(2)).toEqual(handlers);
  });

  it('sends every generated live route to the real API, never to its mock', async () => {
    vi.stubEnv('VITE_API_MOCKS', 'unbuilt');
    const list = withLivePassthrough(handlers, LIVE_ROUTE_KEYS, '');
    for (const key of LIVE_ROUTE_KEYS) {
      const { method, path } = parseRouteKey(key);
      const url = here(path.replace(/:\w+/g, '1'));
      expect(await whoAnswers(list, method.toUpperCase(), url), key).toBe('real API');
    }
  });

  it('without the passthrough handlers the same live routes are answered by a mock', async () => {
    // The ordering is what protects a live route: the mock for it exists.
    expect(await whoAnswers(handlers, 'GET', here('/admin/auth/me'))).toBe('mock');
    expect(await whoAnswers(handlers, 'POST', here('/admin/auth/login'))).toBe('mock');
  });

  it('leaves routes the backend has not built to the mocks', async () => {
    vi.stubEnv('VITE_API_MOCKS', 'unbuilt');
    // A fixed list, not the generated one: the backend keeps building routes, so any route picked from the generated
    // list as "not built" stops being an example after a merge.
    const list = withLivePassthrough(
      handlers,
      ['GET /admin/auth/me', 'POST /admin/auth/login', 'GET /health'],
      '',
    );
    expect(await whoAnswers(list, 'GET', here('/admin/staff'))).toBe('mock');
    expect(await whoAnswers(list, 'GET', here('/admin/system/health'))).toBe('mock');
    // The unbuilt mock answers a request that carries no mock session, because the real session is an HttpOnly cookie.
    const response = await getResponse(list, new Request(here('/admin/staff')));
    expect(response?.status).toBe(200);
  });
});
