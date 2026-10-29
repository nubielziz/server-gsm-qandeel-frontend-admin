// A short-lived cache of the signed-in staff member (`GET /admin/auth/me`). The auth provider, the access-control
// provider and `useMe` share it, so one page load does not call `me` for every route check and every button.
import { getMe, type Me } from '@/features/auth';

export type MeCache = {
  /** The cached staff member, or a fresh `me` call when the cache is empty or older than the TTL.
   *  Concurrent callers share one call. */
  get(): Promise<Me>;
  /** The cached value without any request (it may be stale), or undefined. */
  peek(): Me | undefined;
  /** Forgets the value. Call it on sign-in, sign-out and 401. */
  clear(): void;
};

export const ME_CACHE_TTL_MS = 60_000;

/** Builds a cache around a fetch function; the clock is injectable for tests. */
export function createMeCache(
  fetchMe: () => Promise<Me>,
  options: { ttlMs?: number; now?: () => number } = {},
): MeCache {
  const ttlMs = options.ttlMs ?? ME_CACHE_TTL_MS;
  const now = options.now ?? Date.now;
  let value: { me: Me; at: number } | undefined;
  let pending: Promise<Me> | undefined;
  // Bumped by clear(): an answer that arrives after a sign-out must not repopulate the cache.
  let generation = 0;

  return {
    get() {
      if (value && now() - value.at < ttlMs) return Promise.resolve(value.me);
      if (pending) return pending;
      const started = generation;
      const request: Promise<Me> = fetchMe()
        .then((me) => {
          if (started === generation) value = { me, at: now() };
          return me;
        })
        .finally(() => {
          if (pending === request) pending = undefined;
        });
      pending = request;
      return request;
    },
    peek: () => value?.me,
    clear() {
      generation += 1;
      value = undefined;
      pending = undefined;
    },
  };
}

/** The app-wide cache. */
export const meCache: MeCache = createMeCache(() => getMe());
