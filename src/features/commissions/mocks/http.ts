// Small helpers the commissions mock handlers share: the session guard with latency, request bodies, list answers and the 404, 409 and
// 422 answers of the real server. Mocks fake answers only (decision 014).
import { HttpResponse } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { latency } from '@/mocks/latency';
import { problem, type ProblemError } from '@/mocks/problem';
import { guard } from '@/mocks/session';

/** Runs `handle` for a signed-in request (401 and 403 CSRF answers come from the guard), after the mock latency. */
export async function signedIn(
  request: Request,
  handle: () => Promise<Response> | Response,
): Promise<Response> {
  const denied = guard(request);
  if (denied) return denied;
  await latency();
  return handle();
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

/** A whole-number id in a body (`5` or `"5"`), or null. */
export function idOf(value: unknown): number | null {
  const id = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}

/** The 404 answer for a record that does not exist. */
export function notFound(what: string, id: unknown): Response {
  return problem(404, 'NOT_FOUND', 'Not found', `No ${what} with id ${String(id)}.`);
}

/** The 422 answer for bad input, with a message per field. */
export function invalid(errors: ProblemError[]): Response {
  return problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', errors);
}

/** The 409 answer for a request that conflicts with the current data. */
export function conflict(code: string, title: string, detail: string): Response {
  return problem(409, code, title, detail);
}

/** A list answer: filters, `q`, sort and range read the way `src/lib/api` writes them, with `x-total-count`. */
export function listAnswer<T>(rows: T[], request: Request, searchFields: string[]): Response {
  const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, searchFields);
  return HttpResponse.json(page as object[], {
    headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
  });
}

/** A 204 with no body, the answer to a delete. */
export function noContent(): Response {
  return new HttpResponse(null, { status: 204 });
}
