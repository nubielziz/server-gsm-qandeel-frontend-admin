// The wrapper every suppliers mock route uses: the mock session check, the dev-mode delay, the seeded tables and the request
// body on demand.
import type { PathParams } from 'msw';
import { bodyOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { guard } from '@/mocks/session';
import type { SuppliersState } from './seed';
import { suppliersState } from './store';

/** What a route body gets: the request, its path parameters, the mock tables and a reader for the JSON body. */
export type Context = {
  request: Request;
  params: PathParams;
  data: SuppliersState;
  body: () => Promise<Record<string, unknown>>;
};

/** Wraps a route body so it answers 401/403 like the real API without a session, then runs after the delay. */
export function secured(run: (context: Context) => Promise<Response> | Response) {
  return async ({ request, params }: { request: Request; params: PathParams }): Promise<Response> => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return run({ request, params, data: await suppliersState(), body: () => bodyOf(request) });
  };
}
