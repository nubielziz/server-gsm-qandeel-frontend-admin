// Query-string building: generic params for any GET, and the simple-rest dialect for list endpoints
// (`_start`, `_end`, `_sort`, `_order`, field filters, `q`). Also maps Refine's list params onto it.
import type { ConditionalFilter, CrudFilter, CrudFilters, CrudSorting, Pagination } from '@refinedev/core';
import type { FilterValue, ListQuery } from './types';

/** One query-string value. Arrays repeat the key; undefined, null and empty strings are skipped. */
export type QueryValue = string | number | boolean;
export type QueryParams = Record<string, QueryValue | readonly QueryValue[] | null | undefined>;
export type QueryInput = QueryParams | URLSearchParams;

/** Adds `values` to `params`: arrays repeat the key, empty values are skipped, booleans become 'true'/'false'. */
export function appendParams(params: URLSearchParams, values: QueryParams | undefined): URLSearchParams {
  if (!values) return params;
  for (const [key, value] of Object.entries(values)) {
    const list = Array.isArray(value) ? value : [value];
    for (const item of list) {
      if (item === undefined || item === null || item === '') continue;
      params.append(key, String(item));
    }
  }
  return params;
}

/** Serialises any query input to a string without the leading "?". */
export function toQueryString(query: QueryInput | undefined): string {
  if (!query) return '';
  return (query instanceof URLSearchParams ? query : appendParams(new URLSearchParams(), query)).toString();
}

/**
 * Turns a `ListQuery` (plus extra filters the endpoint needs) into the URL params of a list request.
 * Sort fields and directions are comma-joined in the same order, as simple-rest expects.
 */
export function listQueryToParams(
  query: ListQuery = {},
  extra?: Record<string, FilterValue | FilterValue[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.start !== undefined) params.set('_start', String(query.start));
  if (query.end !== undefined) params.set('_end', String(query.end));
  if (query.sort?.length) params.set('_sort', query.sort.join(','));
  if (query.order?.length) params.set('_order', query.order.join(','));
  if (query.q) params.set('q', query.q);
  return appendParams(params, { ...query.filters, ...extra });
}

// Refine operator -> suffix on the field name. `eq` and `in` use the bare field name.
const OPERATOR_SUFFIX: Record<string, string> = {
  ne: '_ne',
  gte: '_gte',
  lte: '_lte',
  gt: '_gt',
  lt: '_lt',
  contains: '_like',
};

function filterValue(value: unknown): FilterValue {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function addFilter(filters: NonNullable<ListQuery['filters']>, key: string, values: FilterValue[]) {
  if (values.length === 0) return;
  const current = filters[key];
  const merged =
    current === undefined ? values : [...(Array.isArray(current) ? current : [current]), ...values];
  filters[key] = merged.length === 1 ? merged[0] : merged;
}

function isConditional(filter: CrudFilter): filter is ConditionalFilter {
  return filter.operator === 'or' || filter.operator === 'and';
}

// Adds one Refine filter to `filters`. A filter on the pseudo field `q` is not added: its text is returned instead.
function applyFilter(filters: NonNullable<ListQuery['filters']>, filter: CrudFilter): string | undefined {
  if (isConditional(filter)) {
    throw new Error(
      `Filter operator "${filter.operator}" is not supported: the API takes flat field filters only.`,
    );
  }
  const { field, operator, value } = filter;
  const values = (Array.isArray(value) ? value : [value])
    .filter((v) => v !== undefined && v !== null && v !== '')
    .map(filterValue);
  if (field === 'q') return values.length > 0 ? String(values[0]) : undefined;
  if (operator === 'eq' || operator === 'in') {
    addFilter(filters, field, values);
  } else if (Object.hasOwn(OPERATOR_SUFFIX, operator)) {
    addFilter(filters, `${field}${OPERATOR_SUFFIX[operator]}`, values);
  } else {
    throw new Error(`Filter operator "${operator}" on "${field}" is not supported by the API.`);
  }
  return undefined;
}

/**
 * Maps Refine's pagination, sorters and filters to a `ListQuery` (simple-rest):
 * page N of size S is `_start = (N-1)*S`, `_end = N*S`. Only server-side pagination sends a range;
 * `mode: 'off'` and `'client'` fetch everything.
 */
export function toListQuery(params: {
  pagination?: Pagination;
  sorters?: CrudSorting;
  filters?: CrudFilters;
}): ListQuery {
  const { pagination, sorters, filters } = params;
  const query: ListQuery = {};
  if ((pagination?.mode ?? 'server') === 'server') {
    const page = pagination?.currentPage ?? 1;
    const size = pagination?.pageSize ?? 10;
    query.start = (page - 1) * size;
    query.end = page * size;
  }
  if (sorters?.length) {
    query.sort = sorters.map((s) => s.field);
    query.order = sorters.map((s) => s.order);
  }
  const fieldFilters: NonNullable<ListQuery['filters']> = {};
  for (const filter of filters ?? []) {
    const q = applyFilter(fieldFilters, filter);
    if (q !== undefined) query.q = q;
  }
  if (Object.keys(fieldFilters).length > 0) query.filters = fieldFilters;
  return query;
}
