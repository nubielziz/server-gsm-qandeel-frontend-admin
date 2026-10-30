// Small helpers for the merchants mock routes: one wrapper that adds the session check and the latency every route needs, the list
// answer with `x-total-count`, request bodies, and the 404 and 422 answers. Mocks fake answers only (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { latency } from '@/mocks/latency';
import { problem, type ProblemError } from '@/mocks/problem';
import { guard } from '@/mocks/session';

type Params = Record<string, string | readonly string[] | undefined>;

/** What a route handler receives: the request and its `:name` parameters. */
export type Call = { request: Request; params: Params };

/** A route that needs the mock session (401 and CSRF checks) and answers after the dev layer's small delay. */
export function route(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  handle: (call: Call) => Response | Promise<Response>,
): HttpHandler {
  return http[method](`*${path}`, async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return handle({ request, params });
  });
}

/** The numeric `:id` (or another named parameter) of a route. */
export function idOf(call: Call, name = 'id'): number {
  return Number(call.params[name]);
}

/** The JSON body of a request as an object; an empty or unreadable body gives `{}`. */
export async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** A body field as trimmed text; empty when it is not a string. */
export function textOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** One page of rows (filters, `q`, sort and range read the way `src/lib/api` writes them) with the total in `x-total-count`. */
export function listResponse<T>(rows: readonly T[], request: Request, searchFields?: string[]): Response {
  const { page, total } = applyListQuery([...rows], new URL(request.url).searchParams, searchFields);
  return HttpResponse.json(page as object[], {
    headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
  });
}

export function notFound(what: string, id: unknown): Response {
  return problem(404, 'NOT_FOUND', 'Not found', `No ${what} with id ${String(id)}.`);
}

/** The 422 answer the real server gives for bad input, with a message per field. */
export function invalid(errors: ProblemError[]): Response {
  return problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', errors);
}

/** A 204 with no body, the answer to a delete. */
export function noContent(): Response {
  return new HttpResponse(null, { status: 204 });
}
