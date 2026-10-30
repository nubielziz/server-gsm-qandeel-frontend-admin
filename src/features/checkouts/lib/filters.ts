// The list's filter, search, page, sort and the funnel period as URL search parameters, and how they become the API query. Ports
// the `ui.checkouts.cf` state of 11-state.js: the demo filtered an in-memory array, the console asks the server. Nothing here
// decides who may be reminded; it only writes and reads the question.
import type { SortState } from '@/components/ui';
import type { ListQuery } from '@/lib/api';
import { FUNNEL_PERIODS, type FunnelDays } from '../types';

/** Checkouts per page (the demo's `pageSize: 12`). */
export const PAGE_SIZE = 12;

/** `remind`: the ones the server says can be reminded now. `all`: every abandoned checkout. */
export type CheckoutFilter = 'remind' | 'all';

/** The filter segments, in the demo's order and words. */
export const FILTER_ITEMS: readonly { value: CheckoutFilter; label: string }[] = [
  { value: 'remind', label: 'Needs a reminder' },
  { value: 'all', label: 'All' },
];

/** The demo opens on "Needs a reminder". */
export const DEFAULT_FILTER: CheckoutFilter = 'remind';

/** The funnel looks back this far unless the address says otherwise (the dashboard's storefront funnel is 30 days too). */
export const DEFAULT_DAYS: FunnelDays = 30;

/** The filter and the search text of the toolbar. */
export type CheckoutFilters = { filter: CheckoutFilter; q: string };

export function parseFilters(params: URLSearchParams): CheckoutFilters {
  const filter = params.get('filter');
  return { filter: filter === 'all' ? 'all' : DEFAULT_FILTER, q: params.get('q') ?? '' };
}

/** The address with some filters changed. Defaults are left out, and everything else in the address is kept. */
export function writeFilters(base: URLSearchParams, patch: Partial<CheckoutFilters>): URLSearchParams {
  const merged = { ...parseFilters(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('filter', merged.filter === DEFAULT_FILTER ? '' : merged.filter);
  put('q', merged.q);
  return next;
}

/** The address of the page with the filter and the search removed, and back on page 1. */
export function clearFilters(base: URLSearchParams): URLSearchParams {
  const next = writeFilters(base, { q: '' });
  next.delete('page');
  return next;
}

// ---- Page, sort and period ----

/** The columns the server can sort by. */
export const SORT_FIELDS = ['createdAt', 'grossAmount', 'recoveryEmailedAt'] as const;

/** Newest first: who left most recently is the one most likely to still come back. */
export const DEFAULT_SORT: SortState = { field: 'createdAt', order: 'desc' };

export function parsePage(params: URLSearchParams): number {
  const text = params.get('page');
  const page = text && /^\d+$/.test(text) ? Number(text) : 1;
  return page >= 1 ? page : 1;
}

export function parseSort(params: URLSearchParams): SortState {
  const field = SORT_FIELDS.find((candidate) => candidate === params.get('sort'));
  if (!field) return DEFAULT_SORT;
  return { field, order: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

/** The funnel period in the address; anything that is not one of the offered periods gives the default. */
export function parseDays(params: URLSearchParams): FunnelDays {
  return FUNNEL_PERIODS.find((candidate) => String(candidate) === params.get('days')) ?? DEFAULT_DAYS;
}

/** The address with a page, a sort and a period; the defaults are left out. */
export function writeView(
  base: URLSearchParams,
  view: { page?: number; sort?: SortState; days?: FunnelDays },
): URLSearchParams {
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
  if (view.days !== undefined) {
    if (view.days === DEFAULT_DAYS) next.delete('days');
    else next.set('days', String(view.days));
  }
  return next;
}

// ---- To the API ----

/** What the list asks the server for: the filter, the search, one page and the sort. */
export function toListQuery(filters: CheckoutFilters, page: number, sort: SortState): ListQuery {
  const q = filters.q.trim();
  return {
    start: (page - 1) * PAGE_SIZE,
    end: page * PAGE_SIZE,
    sort: [sort.field],
    order: [sort.order],
    ...(q ? { q } : {}),
    filters: filters.filter === 'remind' ? { canRecover: true } : {},
  };
}

/** True when the search box holds text: the one filter "Clear" removes (the segment is a view, not a filter). */
export function hasSearch(filters: CheckoutFilters): boolean {
  return filters.q.trim() !== '';
}

/** The address of the page with a filter set (`{ filter: 'all' }`), for links from other pages. */
export function checkoutsListPath(patch: Partial<CheckoutFilters> = {}): string {
  const query = writeFilters(new URLSearchParams(), patch).toString();
  return query ? `/checkouts?${query}` : '/checkouts';
}
