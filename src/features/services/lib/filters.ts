// The Catalog table's filters, chip, page and sort as URL search parameters, and how they become API filters. Ports `ui.services`
// of 11-state.js and svcRows of 43-p-services.js: the demo filtered an in-memory array, the console asks the server (MISMATCHES
// M22 has the same reasoning for orders). Nothing here decides which services match; it only writes and reads the question.
import type { SortState } from '@/components/ui';
import type { ListQuery } from '@/lib/api';
import { SERVICE_SORT_FIELDS, type ServiceListFilters, type ServiceType } from '../types';
import { SERVICE_TYPES } from './status';

/** Services per page (the demo's PAGE, as on the Orders page). */
export const PAGE_SIZE = 25;

/** Codes per page of the code stock. */
export const INVENTORY_PAGE_SIZE = 25;

/**
 * The list a chip above the table shows (`?chip=`): every service (no parameter), the ones that need a person, the active ones
 * that are not on the shop and nothing blocks, and the switched-off ones.
 */
export const CATALOG_CHIPS = ['attention', 'notonshop', 'off'] as const;
export type CatalogChip = (typeof CATALOG_CHIPS)[number] | '';

/** What each chip asks the server for; the server decides which services those are. */
export const CHIP_FILTERS: Record<Exclude<CatalogChip, ''>, ServiceListFilters> = {
  attention: { needsAttention: true },
  notonshop: { notOnShop: true },
  off: { status: 'disabled' },
};

/**
 * The table's filters: the chip, the search text, the type, the category and supplier menus, and the two filters an address can
 * bring (`belowFloor=true` from the header's sentence and the dashboard, `shop=on` from a finished publish run). Ids stay text
 * (`''` is "any") because they come from the address and go back into it.
 */
export type ServiceFilters = {
  chip: CatalogChip;
  q: string;
  type: ServiceType | '';
  categoryId: string;
  supplierId: string;
  belowFloor: boolean;
  shop: boolean;
};

/** What the staff member may filter by beyond `catalog:read`: the shop filters need `storefront:read` (the server answers 403). */
export type FilterAccess = { storefront: boolean };

const digits = (value: string | null): string => (value && /^[1-9]\d*$/.test(value) ? value : '');

/**
 * Reads the filters from the address; anything unknown or malformed is dropped. An old `status=disabled` (the former "Disabled"
 * chip) reads as the Switched off chip, so it never filters out of sight.
 */
export function parseServiceFilters(params: URLSearchParams): ServiceFilters {
  const type = params.get('type');
  const chip = CATALOG_CHIPS.find((candidate) => candidate === params.get('chip'));
  return {
    chip: chip ?? (params.get('status') === 'disabled' ? 'off' : ''),
    q: params.get('q') ?? '',
    type: SERVICE_TYPES.find((candidate) => candidate === type) ?? '',
    categoryId: digits(params.get('categoryId')),
    supplierId: digits(params.get('supplierId')),
    belowFloor: params.get('belowFloor') === 'true',
    shop: params.get('shop') === 'on',
  };
}

/**
 * The address with some filters changed. Defaults are left out, the old `status` parameter is replaced by `chip`, and everything
 * else in the address (the page, the sort, the open service) is kept.
 */
export function writeServiceFilters(base: URLSearchParams, patch: Partial<ServiceFilters>): URLSearchParams {
  const merged = { ...parseServiceFilters(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('chip', merged.chip);
  put('q', merged.q);
  put('type', merged.type);
  put('categoryId', merged.categoryId);
  put('supplierId', merged.supplierId);
  put('belowFloor', merged.belowFloor ? 'true' : '');
  put('shop', merged.shop ? 'on' : '');
  next.delete('status');
  return next;
}

/** Whether any toolbar filter is on (the chip is a list of its own, not a filter): shows "Clear filters". */
export function hasActiveFilters(filters: ServiceFilters): boolean {
  return Boolean(
    filters.q.trim() ||
    filters.type ||
    filters.categoryId ||
    filters.supplierId ||
    filters.belowFloor ||
    filters.shop,
  );
}

/** The same address with the toolbar filters (and the page) removed: the demo's `svc-clear`. The chip and the sort stay. */
export function clearServiceFilters(base: URLSearchParams): URLSearchParams {
  const next = writeServiceFilters(base, {
    q: '',
    type: '',
    categoryId: '',
    supplierId: '',
    belowFloor: false,
    shop: false,
  });
  next.delete('page');
  return next;
}

/**
 * The filters this staff member may use. Without `storefront:read` the "Not on the shop" chip and `shop=on` are dropped (they
 * would be refused with 403), so an old link shows every service rather than an error.
 */
export function usableFilters(filters: ServiceFilters, access: FilterAccess): ServiceFilters {
  if (access.storefront) return filters;
  return { ...filters, chip: filters.chip === 'notonshop' ? '' : filters.chip, shop: false };
}

// ---- Page and sort ----

/** The columns the server can sort by; `retailPrice` is the shop price, with the services that have none last. */
export const SORT_FIELDS = SERVICE_SORT_FIELDS;

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

/** The API filters for the chip and the toolbar. Pass the result of `usableFilters`, so no filter the role lacks is sent. */
export function toListFilters(filters: ServiceFilters): ServiceListFilters {
  const q = filters.q.trim();
  return {
    ...(filters.chip ? CHIP_FILTERS[filters.chip] : {}),
    ...(q ? { q } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.categoryId ? { categoryId: Number(filters.categoryId) } : {}),
    ...(filters.supplierId ? { supplierId: Number(filters.supplierId) } : {}),
    ...(filters.belowFloor ? { belowFloor: true } : {}),
    ...(filters.shop ? { isListed: true } : {}),
  };
}

/** The same filters as a `ListQuery` (the search apart from the field filters), for the list, the counts and the pickers. */
export function toListQuery(
  list: ServiceListFilters,
  extra: Omit<ListQuery, 'filters' | 'q'> = {},
): ListQuery {
  const { q, ...rest } = list;
  return { ...extra, ...(q ? { q } : {}), filters: rest as NonNullable<ListQuery['filters']> };
}
