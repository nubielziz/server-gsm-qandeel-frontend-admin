// Helpers shared by the account API tests: a recording handler that answers a route itself and keeps how it was called, and the accounts
// of the mock seed by role in the tests. Import them from tests only.
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/mocks/node';

/** Accounts of the mock seed (taken from the demo; see mocks/seed.ts). A merchant keeps its number, customer `cN` is account `100 + N`. */
export const SEED = {
  /** VIP merchant, active, $1,209.75 in the wallet, $71.23 held, a $2,000 credit limit, three API keys, one session. */
  ZAIN: 1,
  /** Cairo GSM Lab, VIP, one fixed price. */
  CAIRO: 5,
  /** Algiers Service Plus, invited by staff: active at once, no password chosen yet. */
  INVITED: 18,
  /** A merchant that is suspended (a chargeback dispute). */
  SUSPENDED_MERCHANT: 19,
  /** Accra Devices, the former pending merchant, now suspended with the migration's reason: nothing in the wallet, a $300 credit limit. */
  FORMER_PENDING: 20,
  /** Daniel Whitmore, a retail account with a login, one session, 4 orders (one rejected), a $50 store balance. */
  DANIEL: 101,
  /** Sofia Alvarez, a guest who has not ordered. */
  SOFIA: 102,
  /** Mia Schneider, a guest with an open erasure request (DSR-32). */
  MIA: 116,
  /** Hannah, a retail account with a login, suspended. */
  HANNAH: 118,
  /** Jack, a guest, blocked. */
  JACK: 119,
  /** A guest with an empty name. */
  NAMELESS: 131,
} as const;

/** What a recording handler saw of one request. */
export type Seen = {
  method: string;
  path: string;
  params: URLSearchParams;
  body: unknown;
  headers: Headers;
};

type Method = 'get' | 'post' | 'patch' | 'delete';

/** Answers a route itself with `answer` and records how it was called (method, path, query, JSON body and headers). */
export function spy(method: Method, pattern: string, answer: () => Response): Seen[] {
  const seen: Seen[] = [];
  mockServer.use(
    http[method](pattern.startsWith('*') ? pattern : `*${pattern}`, async ({ request }) => {
      const url = new URL(request.url);
      const text = await request.clone().text();
      seen.push({
        method: request.method,
        path: url.pathname,
        params: url.searchParams,
        body: text ? JSON.parse(text) : undefined,
        headers: request.headers,
      });
      return answer();
    }),
  );
  return seen;
}

/** An empty list answer with a total of zero. */
export const emptyList = () => HttpResponse.json([], { headers: { 'x-total-count': '0' } });

/** A 204 with no body. */
export const noContent = () => new HttpResponse(null, { status: 204 });
