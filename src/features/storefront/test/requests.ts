// A test helper that records the requests the API client sends (method, address, JSON body) while still letting the dev mock API
// answer them, so a test can check the route, the query and the body of an API function. Import it from tests only.
import { vi } from 'vitest';

/** One request the client sent. */
export type SentRequest = { method: string; url: URL; body: unknown };

/** Starts recording. The spy calls through to the real `fetch`; `vi.restoreAllMocks()` (or `stop`) ends it. */
export function recordRequests() {
  const spy = vi.spyOn(globalThis, 'fetch');
  const sent = (): SentRequest[] =>
    spy.mock.calls.map(([input, init]) => ({
      method: (init?.method ?? 'GET').toUpperCase(),
      url: new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    }));
  return {
    sent,
    /** The most recent request. */
    last: (): SentRequest => {
      const all = sent();
      if (all.length === 0) throw new Error('No request was sent.');
      return all[all.length - 1];
    },
    stop: () => spy.mockRestore(),
  };
}
