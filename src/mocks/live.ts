// Partial mock mode (VITE_API_MOCKS=unbuilt, decision 018): routes the real backend has built go to the real API
// through the dev proxy, every other route stays answered by the mocks. Used by browser.ts and session.ts.
import { http, passthrough, type RequestHandler } from 'msw';
import { apiBaseUrl } from '@/lib/api/config';
import { LIVE_ROUTE_KEYS } from './liveRoutes.gen';

/** The HTTP methods a live route can have, in the lower case MSW's `http` helpers use. */
export type RouteMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

const KEY_FORMAT = /^(GET|POST|PUT|PATCH|DELETE) (\/\S*)$/;

/**
 * True when the mocks run next to the real API (`VITE_API_MOCKS=unbuilt`). Read on every call, so tests can stub it.
 * In this mode the real session is an HttpOnly cookie the mocks cannot see, so they stop checking sessions.
 */
export function isUnbuiltMode(): boolean {
  return import.meta.env.VITE_API_MOCKS === 'unbuilt';
}

/** Splits a route key such as `POST /admin/staff/:id/suspend` into its method and its path (`:param` syntax). */
export function parseRouteKey(key: string): { method: RouteMethod; path: string } {
  const match = KEY_FORMAT.exec(key);
  if (!match) throw new Error(`Bad live route key "${key}": expected "METHOD /path".`);
  return { method: match[1].toLowerCase() as RouteMethod, path: match[2] };
}

/**
 * One handler per live route that lets the request go to the network untouched. MSW uses the same `:param` syntax
 * as the keys, so a key is its own path pattern. `base` is the API base URL; empty means same origin (the dev proxy).
 * The pattern is exact (no leading wildcard): a wildcard before `/health` would also catch the mocked
 * `/admin/system/health`.
 */
export function passthroughHandlers(
  keys: readonly string[] = LIVE_ROUTE_KEYS,
  base: string = apiBaseUrl(),
): RequestHandler[] {
  return keys.map((key) => {
    const { method, path } = parseRouteKey(key);
    return http[method](`${base}${path}`, () => passthrough());
  });
}

/**
 * The handler list for the worker in unbuilt mode: the passthrough handlers first, then every mock handler.
 * MSW answers with the first handler that matches, so a live route never reaches its mock.
 */
export function withLivePassthrough(
  mocks: RequestHandler[],
  keys: readonly string[] = LIVE_ROUTE_KEYS,
  base: string = apiBaseUrl(),
): RequestHandler[] {
  return [...passthroughHandlers(keys, base), ...mocks];
}
