// The list's tab, filters, page and sort as URL search parameters, and how they become API filters. Ports the `ui.customers`
// state (resetB2CUi in 12-state-b2c.js) and custRows of 48-p-customers.js: the demo filtered an in-memory array, the console
// asks the server (CUSTOMERS-5). Nothing here decides which customers match; it only writes and reads the question.
import type { CrudFilters } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import type { FilterValue, ListQuery } from '@/lib/api';
import type { CustomerListFilters, DataRequestFilters } from '../types';
import { PENDING_STATUSES } from './requests';

/** Rows per page of the customers table and of the data requests table. */
export const PAGE_SIZE = 25;

export type CustomerTab = 'all' | 'active' | 'flagged' | 'suspended' | 'blocked' | 'requests';

export type CustomerTabSpec = {
  id: CustomerTab;
  label: string;
  /** The permission that shows the tab; without it the tab is hidden. */
  permission?: string;
};

/** The demo's tabs, in its order, and the Data requests tab the map adds. */
export const CUSTOMER_TABS: readonly CustomerTabSpec[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'requests', label: 'Data requests', permission: 'customers:privacy' },
];

export const DEFAULT_TAB: CustomerTab = 'all';

export function isCustomerTab(value: unknown): value is CustomerTab {
  return CUSTOMER_TABS.some((tab) => tab.id === value);
}

/**
 * The status menu of the Data requests tab. The empty value is the default, "open and in progress", which are the requests the
 * tab's count counts, so the table total matches the count. `all` shows every request, closed ones included.
 */
export type RequestStatusFilter = '' | 'open' | 'in_progress' | 'completed' | 'rejected' | 'all';

export const REQUEST_STATUS_OPTIONS: readonly { value: RequestStatusFilter; label: string }[] = [
  { value: '', label: 'Open and in progress' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Done' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All statuses' },
];

/**
 * The tab, the toolbar's filters (search and country, for the customers tabs) and the status menu (for the Data requests tab).
 * `status` is only kept in the address while the Data requests tab is open.
 */
export type CustomerFilters = { tab: CustomerTab; q: string; country: string; status: RequestStatusFilter };

/** Reads the filters from the address; anything unknown or malformed is dropped. */
export function parseCustomerFilters(params: URLSearchParams): CustomerFilters {
  const tab = params.get('tab');
  const country = params.get('country');
  const status = params.get('status');
  return {
    tab: isCustomerTab(tab) ? tab : DEFAULT_TAB,
    q: params.get('q') ?? '',
    country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : '',
    status:
      REQUEST_STATUS_OPTIONS.find((option) => option.value !== '' && option.value === status)?.value ?? '',
  };
}

// ---- Page and sort ----

/** The columns the server can sort the customers by. */
export const CUSTOMER_SORT_FIELDS = [
  'name',
  'country',
  'hasAccount',
  'ordersCount',
  'totalSpent',
  'lastOrderAt',
  'riskLevel',
  'status',
] as const;

/** The columns the server can sort the data requests by. */
export const REQUEST_SORT_FIELDS = ['requestedAt', 'dueAt', 'status'] as const;

function sortFieldsOf(tab: CustomerTab): readonly string[] {
  return tab === 'requests' ? REQUEST_SORT_FIELDS : CUSTOMER_SORT_FIELDS;
}

/**
 * Where a tab starts: customers by lifetime spend, biggest first (the demo's default); requests by their deadline, nearest
 * first, so an overdue open request is on top.
 */
export function defaultSort(tab: CustomerTab): SortState {
  return tab === 'requests' ? { field: 'dueAt', order: 'asc' } : { field: 'totalSpent', order: 'desc' };
}

export function parsePage(params: URLSearchParams): number {
  const raw = params.get('page');
  const page = raw && /^\d+$/.test(raw) ? Number(raw) : 1;
  return page >= 1 ? page : 1;
}

/** The sort in the address, or the tab's default when the address names none or names one the tab does not offer. */
export function parseSort(
  params: URLSearchParams,
  tab: CustomerTab = parseCustomerFilters(params).tab,
): SortState {
  const field = sortFieldsOf(tab).find((candidate) => candidate === params.get('sort'));
  if (!field) return defaultSort(tab);
  return { field, order: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

/**
 * The address with some filters changed. Defaults are left out (a clean address means "all customers, no filter"), and
 * everything else in the address (the page) is kept. A sort the new tab does not offer is dropped, and so is the status
 * menu once the Data requests tab is left.
 */
export function writeCustomerFilters(
  base: URLSearchParams,
  patch: Partial<CustomerFilters>,
): URLSearchParams {
  const merged = { ...parseCustomerFilters(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('tab', merged.tab === DEFAULT_TAB ? '' : merged.tab);
  put('q', merged.q);
  put('country', merged.country);
  put('status', merged.tab === 'requests' ? merged.status : '');
  if (!sortFieldsOf(merged.tab).includes(next.get('sort') ?? '')) {
    next.delete('sort');
    next.delete('dir');
  }
  return next;
}

/** The address with a page and sort; the default page and the tab's default sort are left out. */
export function writeView(base: URLSearchParams, view: { page?: number; sort?: SortState }): URLSearchParams {
  const next = new URLSearchParams(base);
  if (view.page !== undefined) {
    if (view.page > 1) next.set('page', String(view.page));
    else next.delete('page');
  }
  if (view.sort) {
    const standard = defaultSort(parseCustomerFilters(base).tab);
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

/** Whether any toolbar filter is on (the tab does not count): the demo's `filtersOn`, which shows "Clear filters". */
export function hasActiveFilters(filters: CustomerFilters): boolean {
  return Boolean(filters.q.trim() || filters.country);
}

/** The same address with the toolbar filters removed and the tab kept (the demo's `cu-clear`). */
export function clearCustomerFilters(base: URLSearchParams): URLSearchParams {
  const next = writeCustomerFilters(base, { q: '', country: '' });
  next.delete('page');
  return next;
}

/** The address of the Customers page with some filters set (`{ tab: 'flagged' }`), for links from other pages. */
export function customersListPath(patch: Partial<CustomerFilters> = {}): string {
  const query = writeCustomerFilters(new URLSearchParams(), patch).toString();
  return query ? `/customers?${query}` : '/customers';
}

// ---- To the API ----

/** The API filters behind a tab (the demo's tab tests): Flagged is every risk level above low. */
export function tabFilters(tab: CustomerTab): CustomerListFilters {
  switch (tab) {
    case 'active':
      return { status: 'active' };
    case 'flagged':
      return { riskLevel: ['medium', 'high'] };
    case 'suspended':
      return { status: 'suspended' };
    case 'blocked':
      return { status: 'blocked' };
    case 'all':
    case 'requests':
      return {};
  }
}

/** The API filters for the tab and the toolbar. */
export function toListFilters(filters: CustomerFilters): CustomerListFilters {
  const q = filters.q.trim();
  return {
    ...tabFilters(filters.tab),
    ...(q ? { q } : {}),
    ...(filters.country ? { country: filters.country } : {}),
  };
}

/** The API filters behind the status menu of the Data requests tab: the default is open plus in progress, `all` is no filter. */
export function requestFilters(status: RequestStatusFilter): DataRequestFilters {
  if (status === 'all') return {};
  return status === '' ? { status: PENDING_STATUSES } : { status };
}

type FilterMap = Record<string, FilterValue | readonly FilterValue[] | undefined>;

/** The same filters as Refine's list filters, which the data provider turns into the query string. */
export function toRefineFilters(list: CustomerListFilters | DataRequestFilters): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(list as FilterMap)) {
    if (value === undefined || (Array.isArray(value) && value.length === 0)) continue;
    if (field === 'q') out.push({ field, operator: 'eq', value });
    else out.push({ field, operator: Array.isArray(value) ? 'in' : 'eq', value });
  }
  return out;
}

/** The same filters as a `ListQuery`, for the calls that do not go through Refine (the counts). */
export function toListQuery(
  list: CustomerListFilters | DataRequestFilters,
  extra: Omit<ListQuery, 'filters' | 'q'> = {},
): ListQuery {
  const { q, ...rest } = list as CustomerListFilters;
  return { ...extra, ...(q ? { q } : {}), filters: rest as NonNullable<ListQuery['filters']> };
}
