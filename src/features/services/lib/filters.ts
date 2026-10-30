// The Services tab's filters, page and sort as URL search parameters, and how they become API filters. Ports `ui.services` of
// 11-state.js and svcRows of 43-p-services.js: the demo filtered an in-memory array, the console asks the server (MISMATCHES
// M22 has the same reasoning for orders). Nothing here decides which services match; it only writes and reads the question.
import type { CrudFilters } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import type { FilterValue, ListQuery } from '@/lib/api';
import type { ServiceListFilters, ServiceType } from '../types';
import { SERVICE_TYPES } from './status';

/** Services per page (the demo's PAGE, as on the Orders page). */
export const PAGE_SIZE = 25;

/** Codes per page of the code stock. */
export const INVENTORY_PAGE_SIZE = 25;

/** The toolbar's filters: search text, type, the "Below floor" chip and the "Disabled" chip. */
export type ServiceFilters = {
  q: string;
  type: ServiceType | '';
  belowFloor: boolean;
  status: '' | 'disabled';
};

const digits = (value: string | null): string => (value && /^\d+$/.test(value) ? value : '');

/** Reads the filters from the address; anything unknown or malformed is dropped. */
export function parseServiceFilters(params: URLSearchParams): ServiceFilters {
  const type = params.get('type');
  return {
    q: params.get('q') ?? '',
    type: SERVICE_TYPES.find((candidate) => candidate === type) ?? '',
    belowFloor: params.get('belowFloor') === 'true',
    status: params.get('status') === 'disabled' ? 'disabled' : '',
  };
}

/** The address with some filters changed. Defaults are left out; everything else in the address (the tab) is kept. */
export function writeServiceFilters(base: URLSearchParams, patch: Partial<ServiceFilters>): URLSearchParams {
  const merged = { ...parseServiceFilters(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('q', merged.q);
  put('type', merged.type);
  put('belowFloor', merged.belowFloor ? 'true' : '');
  put('status', merged.status);
  return next;
}

/** Whether any filter is on: the demo's `filtersOn`, which shows "Clear filters". */
export function hasActiveFilters(filters: ServiceFilters): boolean {
  return Boolean(filters.q.trim() || filters.type || filters.belowFloor || filters.status);
}

/** The same address with the filters (and the page) removed: the demo's `svc-clear`. */
export function clearServiceFilters(base: URLSearchParams): URLSearchParams {
  const next = writeServiceFilters(base, { q: '', type: '', belowFloor: false, status: '' });
  next.delete('page');
  return next;
}

// ---- Page and sort ----

/** The columns the server can sort by (plain service columns); the joined and computed columns are not offered. */
export const SORT_FIELDS = ['name', 'type', 'cost', 'basePrice'] as const;

/** Alphabetical: the way a catalog is easiest to scan. The demo listed services in the order they were seeded. */
export const DEFAULT_SORT: SortState = { field: 'name', order: 'asc' };

/** The page in the address, 1 when it is missing or not a number. */
export function parsePage(params: URLSearchParams): number {
  const page = Number(digits(params.get('page')));
  return page >= 1 ? page : 1;
}

/** The sort in the address, or the default when the address names none. */
export function parseSort(params: URLSearchParams): SortState {
  const field = SORT_FIELDS.find((candidate) => candidate === params.get('sort'));
  if (!field) return DEFAULT_SORT;
  return { field, order: params.get('dir') === 'desc' ? 'desc' : 'asc' };
}

/** The address with a page and sort; the first page and the default sort are left out. */
export function writeView(base: URLSearchParams, view: { page?: number; sort?: SortState }): URLSearchParams {
  const next = new URLSearchParams(base);
  if (view.page !== undefined) {
    if (view.page > 1) next.set('page', String(view.page));
    else next.delete('page');
  }
  if (view.sort) {
    if (view.sort.field === DEFAULT_SORT.field && view.sort.order === DEFAULT_SORT.order) {
      next.delete('sort');
      next.delete('dir');
    } else {
      next.set('sort', view.sort.field);
      next.set('dir', view.sort.order);
    }
  }
  return next;
}

// ---- To the API ----

/** The API filters for the toolbar. */
export function toListFilters(filters: ServiceFilters): ServiceListFilters {
  const q = filters.q.trim();
  return {
    ...(q ? { q } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.belowFloor ? { belowFloor: true } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}

/** The same filters as Refine's list filters, which the data provider turns into the query string. */
export function toRefineFilters(list: ServiceListFilters): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(list) as [string, FilterValue | undefined][]) {
    if (value === undefined) continue;
    out.push({ field, operator: 'eq', value });
  }
  return out;
}

/** The same filters as a `ListQuery`, for the calls that do not go through Refine (the counts and the pickers). */
export function toListQuery(
  list: ServiceListFilters,
  extra: Omit<ListQuery, 'filters' | 'q'> = {},
): ListQuery {
  const { q, ...rest } = list;
  return { ...extra, ...(q ? { q } : {}), filters: rest as NonNullable<ListQuery['filters']> };
}
