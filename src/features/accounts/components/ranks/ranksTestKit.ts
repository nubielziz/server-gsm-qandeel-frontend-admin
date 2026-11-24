// Helpers shared by the tests of the ranks area: a rank with no account in it (the seed has none, and only such a rank can be deleted) and a
// recorder of the requests the API client sends while the mock API still answers them. Import it from tests only.
import { vi } from 'vitest';
import { signInAs } from '@/test/renderApp';
import { createRank } from '../../api';

/** Makes a merchant rank with no account in it through the API (the staff member is signed in first). */
export async function makeRank(name: string) {
  await signInAs();
  return createRank({
    name,
    discountPercent: '6',
    depositLimit: '50000.0000',
    overdraftAllowed: true,
    isDefault: false,
  });
}

/** One request the client sent: its address and its JSON body. */
export type Sent = { url: string; body: unknown };

/**
 * Starts recording the requests of one method (the spy calls through to the real `fetch`; `vi.restoreAllMocks()` ends it). Call the result
 * to read what was sent so far.
 */
export function sentRequests(method: string): () => Sent[] {
  const spy = vi.spyOn(globalThis, 'fetch');
  return () =>
    spy.mock.calls
      .filter(([, init]) => (init?.method ?? 'GET').toUpperCase() === method)
      .map(([input, init]) => ({
        url: typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
      }));
}
