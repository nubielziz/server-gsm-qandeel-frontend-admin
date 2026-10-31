// What every System health mock route shares: the session check, the dev-mode delay, the scenario's refusals (a write
// of a read-only staff member answers 403, a failing read answers its error), list answers in the simple-rest dialect,
// and the readers of the query and of the signed-in staff member.
import { HttpResponse, type PathParams } from 'msw';
import { suppliersState } from '@/features/suppliers/mocks';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import type { StaffRef, TimeRange } from '../types';
import { isRange } from './clock';
import type { SupplierSource } from './facts';
import { gateAnswer, type GateKey } from './profile';
import { settleRuns } from './runs';
import { healthState, type HealthState } from './state';

/** What a route body gets: the request, its path and query, the mock state, the clock and a reader for the JSON body. */
export type Context = {
  request: Request;
  url: URL;
  params: PathParams;
  state: HealthState;
  now: number;
  body: () => Promise<Record<string, unknown>>;
};

/**
 * `write`: the permission a write needs, so a read-only staff member (scenario `readonly`) is answered 403 FORBIDDEN
 * naming it. `gate`: a read that fails in some scenarios (see profile.ts).
 */
export type RouteOptions = { write?: string; gate?: GateKey };

/** Wraps a route body so it answers 401/403 like the real API without a session, then applies the scenario. */
export function route(options: RouteOptions, run: (context: Context) => Response | Promise<Response>) {
  return async ({ request, params }: { request: Request; params: PathParams }): Promise<Response> => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = healthState();
    const now = Date.now();
    // Whoever asks, a run whose time has come is over (it may have closed an alert the answer shows).
    settleRuns(state, now);
    if (options.write && state.profile.readOnly) {
      return problem(403, 'FORBIDDEN', 'Forbidden', `You need the ${options.write} permission.`);
    }
    const failed = options.gate ? gateAnswer(state.profile, options.gate) : null;
    if (failed) return failed;
    return run({
      request,
      url: new URL(request.url),
      params,
      state,
      now,
      body: () => bodyOf(request),
    });
  };
}

/** The supplier rows of the suppliers mock, read per request so a pause or a rename made elsewhere shows here. */
export async function supplierRows(): Promise<SupplierSource[]> {
  return (await suppliersState()).suppliers.list();
}

/** The signed-in staff member as a record names them, or null. */
export async function staffRef(): Promise<StaffRef | null> {
  const staff = await currentStaff();
  return staff ? { id: staff.id, name: staff.name } : null;
}

/** `?range=` (default 24h), or the 422 answer for a value that is not a range. */
export function rangeOf(url: URL): TimeRange | Response {
  const value = url.searchParams.get('range') ?? '24h';
  return isRange(value) ? value : invalid([{ field: 'range', message: 'Use one of 1h, 6h, 24h or 7d.' }]);
}

/** A list answer: filters, `q`, sort and row range as the real server reads them, the total in `x-total-count`. */
export function listAnswer<T extends object>(
  rows: T[],
  url: URL,
  options: { search?: string[]; sort: string; order: 'asc' | 'desc' },
): Response {
  const params = new URLSearchParams(url.searchParams);
  if (!params.has('_sort')) {
    params.set('_sort', options.sort);
    params.set('_order', options.order);
  }
  const { page, total } = applyListQuery(rows, params, options.search);
  return HttpResponse.json(page, {
    headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
  });
}

/** A body field as a finite number, or undefined. */
export const numberOf = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** A body field as a date in the future (ms), or undefined when it is missing, not a date or not in the future. */
export function futureDate(value: unknown, now: number): number | undefined {
  if (typeof value !== 'string') return undefined;
  const at = Date.parse(value);
  return Number.isFinite(at) && at > now ? at : undefined;
}
