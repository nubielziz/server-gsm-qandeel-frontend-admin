// Generic simple-rest CRUD handlers for the dev mock layer: list with filters, sort, row range and
// `x-total-count`, plus show, create, update and delete. They read the query exactly as `src/lib/api` writes it.
// They fake responses only; business rules belong to the real server (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Collection } from './db';
import { latency } from './latency';
import { problem } from './problem';
import { guard as sessionGuard } from './session';

export type CrudOptions<T extends { id: number }> = {
  /** Path of the collection, e.g. `/admin/staff`. The handlers match any origin in front of it. */
  base: string;
  collection: Collection<T>;
  /** Which operations to serve, as letters: L(ist) S(how) C(reate) U(pdate) D(elete). Default all. */
  ops?: string;
  /** Fields the free-text `q` searches. Default: every top-level text field. */
  searchFields?: string[];
  /** Maps a stored row to what the API sends. Filtering and sorting see this shape. */
  toDto?: (row: T) => unknown;
  /** Returns a problem response to refuse a request, or null to allow it. Default: the mock session guard. */
  guard?: (request: Request) => Response | null;
};

const RESERVED = new Set(['_start', '_end', '_sort', '_order', 'q']);
// Operator suffixes of a filter key, longest first so `_gte` is not read as `_gt`.
const SUFFIXES = ['_gte', '_lte', '_ne', '_gt', '_lt', '_like'] as const;
type Operator = 'eq' | (typeof SUFFIXES)[number];

type Condition = { field: string; op: Operator; values: string[] };

/** Splits a query key such as `total_gte` into its field and operator. */
function splitKey(key: string): { field: string; op: Operator } {
  const suffix = SUFFIXES.find((s) => key.endsWith(s) && key.length > s.length);
  return suffix ? { field: key.slice(0, -suffix.length), op: suffix } : { field: key, op: 'eq' };
}

/** The filter conditions of a query: every key that is not a reserved list key; repeated keys become one condition. */
function conditionsOf(params: URLSearchParams): Condition[] {
  const byKey = new Map<string, Condition>();
  for (const [key, value] of params) {
    if (RESERVED.has(key)) continue;
    const existing = byKey.get(key);
    if (existing) existing.values.push(value);
    else byKey.set(key, { ...splitKey(key), values: [value] });
  }
  return [...byKey.values()];
}

/** Value at a dotted path (`role.id`). */
function valueAt(row: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((value, key) => (value as Record<string, unknown> | null | undefined)?.[key], row);
}

const isNumeric = (value: unknown): boolean =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));

/** Orders two values: numbers (and numeric strings such as money) numerically, everything else as text. */
function compareValues(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (isNumeric(a) && isNumeric(b)) return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/** Whether a row passes one condition. Equality is on the text form, so `true`, `12` and `"12"` all compare as the URL sends them. */
function matches(row: unknown, { field, op, values }: Condition): boolean {
  const value = valueAt(row, field);
  switch (op) {
    case 'eq':
      return values.some((v) => String(value) === v);
    case '_ne':
      return values.every((v) => String(value) !== v);
    case '_like':
      return values.some((v) =>
        String(value ?? '')
          .toLowerCase()
          .includes(v.toLowerCase()),
      );
    case '_gte':
      return values.every((v) => compareValues(value, v) >= 0);
    case '_lte':
      return values.every((v) => compareValues(value, v) <= 0);
    case '_gt':
      return values.every((v) => compareValues(value, v) > 0);
    case '_lt':
      return values.every((v) => compareValues(value, v) < 0);
  }
}

/** Free-text search: true when any searched field contains the text (case-insensitive). */
function matchesText(row: unknown, text: string, fields: string[] | undefined): boolean {
  const needle = text.toLowerCase();
  const names =
    fields ??
    Object.entries(row as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string')
      .map(([k]) => k);
  return names.some((name) =>
    String(valueAt(row, name) ?? '')
      .toLowerCase()
      .includes(needle),
  );
}

/**
 * Applies a simple-rest query to rows: filters, `q`, sort, then the row range.
 * Also returns the total as it was before the range was applied.
 */
export function applyListQuery<D>(
  rows: D[],
  params: URLSearchParams,
  searchFields?: string[],
): { page: D[]; total: number } {
  const conditions = conditionsOf(params);
  const text = params.get('q');
  let result = rows.filter((row) => conditions.every((c) => matches(row, c)));
  if (text) result = result.filter((row) => matchesText(row, text, searchFields));

  const sort = params.get('_sort')?.split(',').filter(Boolean) ?? [];
  const order = params.get('_order')?.split(',') ?? [];
  if (sort.length > 0) {
    result = [...result].sort((a, b) => {
      for (const [i, field] of sort.entries()) {
        const diff = compareValues(valueAt(a, field), valueAt(b, field));
        if (diff !== 0) return order[i]?.toLowerCase() === 'desc' ? -diff : diff;
      }
      return 0;
    });
  }

  const start = Number(params.get('_start') ?? 0);
  const end = params.has('_end') ? Number(params.get('_end')) : undefined;
  return { page: result.slice(start, end), total: result.length };
}

function notFound(id: unknown): Response {
  return problem(404, 'NOT_FOUND', 'Not found', `No record with id ${String(id)}.`);
}

/**
 * Handlers for one collection. Register special routes (`/export`, `/check`…) before these,
 * because `/:id` matches any segment.
 */
export function crudHandlers<T extends { id: number }>(options: CrudOptions<T>): HttpHandler[] {
  const {
    base,
    collection,
    ops = 'LSCUD',
    searchFields,
    toDto = (row: T) => row,
    guard = sessionGuard,
  } = options;
  const handlers: HttpHandler[] = [];

  if (ops.includes('L')) {
    handlers.push(
      http.get(`*${base}`, async ({ request }) => {
        const denied = guard(request);
        if (denied) return denied;
        await latency();
        const rows = collection.list().map(toDto);
        const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, searchFields);
        return HttpResponse.json(page, {
          headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
        });
      }),
    );
  }
  if (ops.includes('S')) {
    handlers.push(
      http.get(`*${base}/:id`, async ({ request, params }) => {
        const denied = guard(request);
        if (denied) return denied;
        await latency();
        const row = collection.find(String(params.id));
        return row ? HttpResponse.json(toDto(row) as object) : notFound(params.id);
      }),
    );
  }
  if (ops.includes('C')) {
    handlers.push(
      http.post(`*${base}`, async ({ request }) => {
        const denied = guard(request);
        if (denied) return denied;
        await latency();
        const body = (await request.json().catch(() => ({}))) as Omit<T, 'id'>;
        return HttpResponse.json(toDto(collection.insert(body)) as object, { status: 201 });
      }),
    );
  }
  if (ops.includes('U')) {
    handlers.push(
      http.patch(`*${base}/:id`, async ({ request, params }) => {
        const denied = guard(request);
        if (denied) return denied;
        await latency();
        const changes = (await request.json().catch(() => ({}))) as Partial<T>;
        const row = collection.patch(String(params.id), changes);
        return row ? HttpResponse.json(toDto(row) as object) : notFound(params.id);
      }),
    );
  }
  if (ops.includes('D')) {
    handlers.push(
      http.delete(`*${base}/:id`, async ({ request, params }) => {
        const denied = guard(request);
        if (denied) return denied;
        await latency();
        return collection.remove(String(params.id))
          ? new HttpResponse(null, { status: 204 })
          : notFound(params.id);
      }),
    );
  }
  return handlers;
}
