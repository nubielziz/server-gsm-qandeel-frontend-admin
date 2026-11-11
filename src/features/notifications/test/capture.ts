// A one-route server for the API tests: answers one method and path with a fixed response and records what it was sent, so a test can check the method, the
// path, the query and the body of an API function. Import from tests only.
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/mocks/node';

export type Seen = { method: string; path: string; query: Record<string, string[]>; body: unknown };

/** Serves `path` (any origin) for `method` with `answer` (JSON, status and headers) and returns the list the requests are recorded in. */
export function capture(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  answer: { json?: unknown; status?: number; headers?: Record<string, string> } = {},
): Seen[] {
  const seen: Seen[] = [];
  mockServer.use(
    http[method](`*${path}`, async ({ request }) => {
      const url = new URL(request.url);
      const query: Record<string, string[]> = {};
      for (const [key, value] of url.searchParams) (query[key] ??= []).push(value);
      const text = await request.text();
      seen.push({
        method: request.method,
        path: url.pathname,
        query,
        body: text ? JSON.parse(text) : undefined,
      });
      if (answer.status === 204) return new HttpResponse(null, { status: 204 });
      return HttpResponse.json(answer.json ?? {}, { status: answer.status ?? 200, headers: answer.headers });
    }),
  );
  return seen;
}
