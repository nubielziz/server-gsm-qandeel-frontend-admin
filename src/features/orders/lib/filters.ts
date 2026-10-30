// The list's tab, filters, page and sort as URL search parameters, and how they become API filters. Ports the `ui.orders`
// state of 11-state.js and ordersFiltered of 41-p-orders.js: the demo filtered an in-memory array, the console asks the
// server (MISMATCHES M22). Nothing here decides which orders match; it only writes and reads the question.
import type { CrudFilters } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import type { FilterValue, ListQuery } from '@/lib/api';
import type { OrderChannel, OrderListFilters, ServiceType } from '../types';
import { DEFAULT_TAB, isOrderTab, QUEUE_TABS, SERVICE_TYPES, tabFilters, type OrderTab } from './status';

/** Orders per page of the main table (the demo's PAGE). */
export const PAGE_SIZE = 25;

/** The tab and the toolbar's filters. Ids are kept as the text of a select; the API call turns them into numbers. */
export type OrderFilters = {
  tab: OrderTab;
  q: string;
  type: ServiceType | '';
  supplierId: string;
  clientId: string;
  channel: OrderChannel | '';
  pastSla: boolean;
};

const digits = (value: string | null): string => (value && /^\d+$/.test(value) ? value : '');

/** Reads the filters from the address; anything unknown or malformed is dropped. */
export function parseOrderFilters(params: URLSearchParams): OrderFilters {
  const tab = params.get('tab');
  const type = params.get('type');
  const channel = params.get('channel');
  return {
    tab: isOrderTab(tab) ? tab : DEFAULT_TAB,
    q: params.get('q') ?? '',
    type: SERVICE_TYPES.find((candidate) => candidate === type) ?? '',
    supplierId: digits(params.get('supplierId')),
    clientId: digits(params.get('clientId')),
    channel: channel === 'b2b' || channel === 'b2c' ? channel : '',
    pastSla: params.get('pastSla') === 'true',
  };
}

/**
 * The address with some filters changed. Defaults are left out (a clean address means "all orders, no filter"), and
 * everything else in the address (the open drawer's `order`, the page) is kept as it is.
 */
export function writeOrderFilters(base: URLSearchParams, patch: Partial<OrderFilters>): URLSearchParams {
  const merged = { ...parseOrderFilters(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('tab', merged.tab === DEFAULT_TAB ? '' : merged.tab);
  put('q', merged.q);
  put('type', merged.type);
  put('supplierId', merged.supplierId);
  put('clientId', merged.clientId);
  put('channel', merged.channel);
  put('pastSla', merged.pastSla ? 'true' : '');
  return next;
}

/** Whether any toolbar filter is on (the tab does not count): the demo's `filtersOn`, which shows "Clear filters". */
export function hasActiveFilters(filters: OrderFilters): boolean {
  return Boolean(
    filters.q.trim() ||
    filters.type ||
    filters.supplierId ||
    filters.clientId ||
    filters.channel ||
    filters.pastSla,
  );
}

/** The same address with the toolbar filters removed and the tab kept (the demo's `orders-clear`). */
export function clearOrderFilters(base: URLSearchParams): URLSearchParams {
  const next = writeOrderFilters(base, {
    q: '',
    type: '',
    supplierId: '',
    clientId: '',
    channel: '',
    pastSla: false,
  });
  next.delete('page');
  return next;
}

// ---- Page and sort ----

/** The columns the server can sort by (plain order fields); the demo's other sorts were in-memory maths. */
export const ORDER_SORT_FIELDS = ['createdAt', 'totalPrice', 'status'] as const;

/** Newest first: the way finished orders and the lists inside other pages read. */
export const NEWEST_FIRST: SortState = { field: 'createdAt', order: 'desc' };

/**
 * Where a tab starts. The demo opens on Open sorted by SLA urgency (age divided by the service's target); the server cannot
 * sort by that, so the tabs that list the queue start with the oldest order, the one waiting longest, and the others with
 * the newest (MISMATCHES M22).
 */
export function defaultSort(tab: OrderTab): SortState {
  return QUEUE_TABS.includes(tab) ? { field: 'createdAt', order: 'asc' } : NEWEST_FIRST;
}

export function parsePage(params: URLSearchParams): number {
  const page = Number(digits(params.get('page')));
  return page >= 1 ? page : 1;
}

/** The sort in the address, or the open tab's own default when the address names none. */
export function parseSort(params: URLSearchParams, tab: OrderTab = parseOrderFilters(params).tab): SortState {
  const field = ORDER_SORT_FIELDS.find((candidate) => candidate === params.get('sort'));
  if (!field) return defaultSort(tab);
  return { field, order: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

/** The address with a page and sort; the default page and the tab's default sort are left out. */
export function writeView(base: URLSearchParams, view: { page?: number; sort?: SortState }): URLSearchParams {
  const next = new URLSearchParams(base);
  if (view.page !== undefined) {
    if (view.page > 1) next.set('page', String(view.page));
    else next.delete('page');
  }
  if (view.sort) {
    const standard = defaultSort(parseOrderFilters(base).tab);
    if (view.sort.field === standard.field && view.sort.order === standard.order) {
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

/**
 * People type "ORD-48100", "SF-20490" or "#48100"; the API's id is the number, so the prefix is dropped. Any other
 * text is sent as it is, trimmed.
 */
export function normalizeSearch(text: string): string {
  const trimmed = text.trim();
  const id = /^(?:#|ord-|sf-)\s*(\d+)$/i.exec(trimmed);
  return id ? id[1] : trimmed;
}

/** The API filters for the tab and the toolbar. `fixed` filters (a merchant's page) always apply and win. */
export function toListFilters(filters: OrderFilters, fixed: OrderListFilters = {}): OrderListFilters {
  const q = normalizeSearch(filters.q);
  return {
    ...tabFilters(filters.tab),
    ...(q ? { q } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.supplierId ? { supplierId: Number(filters.supplierId) } : {}),
    ...(filters.clientId ? { clientId: Number(filters.clientId) } : {}),
    ...(filters.channel ? { channel: filters.channel } : {}),
    ...(filters.pastSla ? { pastSla: true } : {}),
    ...fixed,
  };
}

/** The same filters as Refine's list filters, which the data provider turns into the query string. */
export function toRefineFilters(list: OrderListFilters): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(list) as [string, FilterValue | FilterValue[] | undefined][]) {
    if (value === undefined || (Array.isArray(value) && value.length === 0)) continue;
    if (field === 'q') out.push({ field, operator: 'eq', value });
    else out.push({ field, operator: Array.isArray(value) ? 'in' : 'eq', value });
  }
  return out;
}

/** The same filters as a `ListQuery`, for the calls that do not go through Refine (the counts and the export). */
export function toListQuery(list: OrderListFilters, extra: Omit<ListQuery, 'filters' | 'q'> = {}): ListQuery {
  const { q, ...rest } = list;
  return { ...extra, ...(q ? { q } : {}), filters: rest as NonNullable<ListQuery['filters']> };
}

/**
 * The address of the Orders page with some filters set (`{ tab: 'review' }`, `{ type: 'imei', channel: 'b2c' }`), for
 * links from other pages such as the dashboard. Defaults are left out, as on the page itself.
 */
export function ordersListPath(patch: Partial<OrderFilters>): string {
  const query = writeOrderFilters(new URLSearchParams(), patch).toString();
  return query ? `/orders?${query}` : '/orders';
}
