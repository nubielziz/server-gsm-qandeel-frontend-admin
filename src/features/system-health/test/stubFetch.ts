// Test support for the API functions and hooks of this feature: it replaces `fetch` with a recorder, so a test reads the
// method, path, query and body of the request a function sent and chooses what the server answers. Tests only.
import { afterEach, beforeEach, vi } from 'vitest';

/** One request as the server would see it. `query` holds the value of each parameter. */
export type SentRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
};

type Answer = { status: number; body: unknown; headers: Record<string, string> };

const DEFAULT_ANSWER: Answer = { status: 200, body: {}, headers: {} };

/**
 * Call once at the top of a test file. Before each test `fetch` is replaced (and the API base URL set), after each test
 * both are put back. `sent` lists the requests so far, `last()` is the latest, and `reply()` sets what the next
 * requests answer (200 with `{}` until told otherwise).
 */
export function stubFetch() {
  const sent: SentRequest[] = [];
  let answer: Answer = DEFAULT_ANSWER;

  beforeEach(() => {
    sent.length = 0;
    answer = DEFAULT_ANSWER;
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test');
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      sent.push({
        method: init?.method ?? 'GET',
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
      });
      const { status, body, headers } = answer;
      return new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  return {
    sent,
    /** What the following requests answer: a JSON body (or none, with status 204), and optional headers. */
    reply(body: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
      answer = { status: options.status ?? 200, body, headers: options.headers ?? {} };
    },
    /** The latest request; it fails the test when nothing was sent. */
    last(): SentRequest {
      const request = sent.at(-1);
      if (!request) throw new Error('No request was sent.');
      return request;
    },
  };
}
