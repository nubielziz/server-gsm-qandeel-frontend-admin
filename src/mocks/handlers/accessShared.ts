// Helpers shared by the access mock handlers: list and show handlers over a store that loads asynchronously, request
// bodies, and the 404 and 422 answers. Mocks fake answers only (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '../crud';
import { latency } from '../latency';
import { problem, type ProblemError } from '../problem';
import { guard } from '../session';

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

export function notFound(what: string, id: unknown): Response {
  return problem(404, 'NOT_FOUND', 'Not found', `No ${what} with id ${String(id)}.`);
}

/** The 422 answer the real server gives for bad input, with a message per field. */
export function invalid(errors: ProblemError[]): Response {
  return problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', errors);
}

/** What a read handler needs per request: the stored rows and how to turn one into what the API sends. */
export type ReadSource<Row, Dto> = () => Promise<{ rows: Row[]; toDto: (row: Row) => Dto }>;

/**
 * `GET <base>` (filters, sort, row range and `x-total-count`, read the way `src/lib/api` writes them) and
 * `GET <base>/:id` for rows kept in a store that loads asynchronously. Both need the mock session.
 */
export function readHandlers<Row extends { id: number }, Dto>(options: {
  base: string;
  what: string;
  source: ReadSource<Row, Dto>;
  searchFields?: string[];
}): HttpHandler[] {
  const { base, what, source, searchFields } = options;
  return [
    http.get(`*${base}`, async ({ request }) => {
      const denied = guard(request);
      if (denied) return denied;
      await latency();
      const { rows, toDto } = await source();
      const { page, total } = applyListQuery(
        rows.map(toDto),
        new URL(request.url).searchParams,
        searchFields,
      );
      return HttpResponse.json(page as object[], {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
    http.get(`*${base}/:id`, async ({ request, params }) => {
      const denied = guard(request);
      if (denied) return denied;
      await latency();
      const { rows, toDto } = await source();
      const row = rows.find((candidate) => String(candidate.id) === String(params.id));
      return row ? HttpResponse.json(toDto(row) as object) : notFound(what, params.id);
    }),
  ];
}
