// Records the requests a page test cares about without changing the answer: the handler sees the request and lets the mock
// answer it (a handler that returns nothing passes the request on). Tests only.
import { http } from 'msw';
import { mockServer } from '@/mocks/node';

export interface SeenRequest {
  url: URL;
  /** The parsed JSON body of a write; undefined for a read or an empty body. */
  body: unknown;
}

/** Starts recording `method path` (for example `put`, `/admin/system/maintenance`); the list grows as requests arrive. */
export function recordRequests(method: 'get' | 'put' | 'post' | 'patch', path: string): SeenRequest[] {
  const seen: SeenRequest[] = [];
  mockServer.use(
    http[method](`*${path}`, async ({ request }) => {
      const text = method === 'get' ? '' : await request.clone().text();
      seen.push({ url: new URL(request.url), body: text ? JSON.parse(text) : undefined });
    }),
  );
  return seen;
}
