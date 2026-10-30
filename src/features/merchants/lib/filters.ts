// The merchants page's tab, filters, page, sort and open verification request as URL search parameters, and how they become API
// filters. Ports the `ui.merchants` state of 11-state.js and merRows of 42-p-merchants.js: the demo filtered an in-memory array,
// the console asks the server (MISMATCHES M22 for orders says the same). Nothing here decides which merchants match.
import type { CrudFilters } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import type { ClientListFilters, KycSubmissionStatus } from '../types';
import { isMerchantTab, tabStatus, type MerchantTab } from './status';

/** Rows per page of the merchant table and of the verification list (the demo's PAGE). */
export const PAGE_SIZE = 25;

/** The toolbar's filters. The group id is kept as the text of a select. */
export type MerchantFilters = { q: string; group: string };

const digits = (value: string | null): string => (value && /^\d+$/.test(value) ? value : '');

/**
 * The open tab: the one named in the address when the staff member may open it, else the first they may. An unknown or
 * forbidden `?tab=` falls back quietly. `undefined` means the role may open no tab at all.
 */
export function parseMerchantTab(
  params: URLSearchParams,
  visible: readonly MerchantTab[],
): MerchantTab | undefined {
  const named = params.get('tab');
  return isMerchantTab(named) && visible.includes(named) ? named : visible[0];
}

export function parseMerchantFilters(params: URLSearchParams): MerchantFilters {
  return { q: params.get('q') ?? '', group: digits(params.get('group')) };
}

/** The address with some filters changed. Empty values are left out, and everything else in the address is kept. */
export function writeMerchantFilters(
  base: URLSearchParams,
  patch: Partial<MerchantFilters>,
): URLSearchParams {
  const merged = { ...parseMerchantFilters(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('q', merged.q);
  put('group', merged.group);
  return next;
}

/** Whether any toolbar filter is on (the tab does not count): the demo's `filtersOn`, which shows "Clear filters". */
export function hasActiveFilters(filters: MerchantFilters): boolean {
  return Boolean(filters.q.trim() || filters.group);
}

/** The same address with the toolbar filters and the page removed; the tab is kept. */
export function clearMerchantFilters(base: URLSearchParams): URLSearchParams {
  const next = writeMerchantFilters(base, { q: '', group: '' });
  next.delete('page');
  return next;
}

/** The address with another tab: the page, the open request and the other tab's own state are dropped. */
export function writeTab(base: URLSearchParams, tab: MerchantTab): URLSearchParams {
  const next = new URLSearchParams(base);
  if (tab === 'all') next.delete('tab');
  else next.set('tab', tab);
  for (const key of ['page', 'sort', 'dir', 'kyc', 'kycStatus']) next.delete(key);
  return next;
}

// ---- Page and sort ----

/** The columns the server can sort the merchant table by. The demo also sorted by spend, wallet and orders (MISMATCHES M48). */
export const MERCHANT_SORT_FIELDS = ['name', 'status'] as const;

/** Alphabetical: the one order the clients table has a column for that reads like a directory. */
export const DEFAULT_SORT: SortState = { field: 'name', order: 'asc' };

export function parsePage(params: URLSearchParams): number {
  const page = Number(digits(params.get('page')));
  return page >= 1 ? page : 1;
}

/** The sort in the address, or the default when the address names none. */
export function parseSort(params: URLSearchParams): SortState {
  const field = MERCHANT_SORT_FIELDS.find((candidate) => candidate === params.get('sort'));
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

// ---- Verification list ----

/** What the verification list filters by: one status, or every request. */
export type KycFilter = KycSubmissionStatus | 'all';

export const KYC_FILTERS: readonly KycFilter[] = ['pending', 'approved', 'rejected', 'all'];

/** Pending requests are the work to do, so the tab opens on them. */
export const DEFAULT_KYC_FILTER: KycFilter = 'pending';

export function parseKycFilter(params: URLSearchParams): KycFilter {
  const named = params.get('kycStatus');
  return KYC_FILTERS.find((candidate) => candidate === named) ?? DEFAULT_KYC_FILTER;
}

export function writeKycFilter(base: URLSearchParams, filter: KycFilter): URLSearchParams {
  const next = new URLSearchParams(base);
  if (filter === DEFAULT_KYC_FILTER) next.delete('kycStatus');
  else next.set('kycStatus', filter);
  next.delete('page');
  return next;
}

// ---- To the API ----

/** The API filters for the open tab and the toolbar. */
export function toClientFilters(tab: MerchantTab, filters: MerchantFilters): ClientListFilters {
  const status = tabStatus(tab);
  const q = filters.q.trim();
  return {
    ...(status ? { status } : {}),
    ...(filters.group ? { groupId: Number(filters.group) } : {}),
    ...(q ? { q } : {}),
  };
}

/** The same filters as Refine's list filters, which the data provider turns into the query string. */
export function toRefineFilters(filters: ClientListFilters): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined || value === '') continue;
    out.push({ field, operator: 'eq', value });
  }
  return out;
}
