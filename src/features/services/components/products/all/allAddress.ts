// The address of the All view: its filters, page and page size as they stand in the URL (`?view=all&type=server&group=3&q=chimera`),
// read and written in one place, and how they become the question the server is asked. Nothing here decides which services match; it
// only writes and reads the question. Every address is written by `productsPath`.
import type { SelectOption } from '@/components/ui';
import type { FilterValue, Id, ListQuery } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { parseRecordId, productsPath } from '../../../lib/productsPath';

/** The page sizes the footer offers. */
export const PAGE_SIZES: readonly number[] = [25, 50, 100, 200];

/** The server's sort key of the stored order (group position, then the service's position, then the name). */
export const LIST_SORT = 'sort';

/** Services per page when the address names no size. */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * The quick filter of the list (`show=`): the services that need a person, the active ones that are not on the shop and nothing
 * blocks, and the switched-off ones. The server decides which services those are.
 */
export const ALL_SHOWS = ['attention', 'offshop', 'disabled'] as const;
export type AllShow = (typeof ALL_SHOWS)[number];

/** What the address says about the list. `group` and `api` are ids (the group and the primary supplier connection). */
export type AllAddress = {
  q: string;
  group: Id | null;
  api: Id | null;
  show: AllShow | null;
  page: number;
  size: number;
};

/** What the staff member may filter by beyond `catalog:read`: "Not on the shop" needs `storefront:read` (the server answers 403). */
export type FilterAccess = { storefront: boolean };

/** The address with no filter, on the first page, at the default size. */
export const EMPTY_ADDRESS: AllAddress = {
  q: '',
  group: null,
  api: null,
  show: null,
  page: 1,
  size: DEFAULT_PAGE_SIZE,
};

/** Reads the list's keys from the address; anything unknown or malformed is dropped. */
export function parseAllAddress(params: URLSearchParams): AllAddress {
  const page = Number(params.get('page'));
  const size = Number(params.get('size'));
  return {
    q: params.get('q') ?? '',
    group: parseRecordId(params.get('group')),
    api: parseRecordId(params.get('api')),
    show: ALL_SHOWS.find((show) => show === params.get('show')) ?? null,
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
    size: PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE,
  };
}

/** The address of the list of a kind with these keys: the first page and the default size are left out, an empty search too. */
export function allLink(type: ServiceType, address: Partial<AllAddress> = {}): string {
  const { q = '', group = null, api = null, show = null, page = 1, size = DEFAULT_PAGE_SIZE } = address;
  return productsPath({
    view: 'all',
    type,
    group: group ?? undefined,
    q: q.trim() || undefined,
    api: api ?? undefined,
    show: show ?? undefined,
    page,
    size: size === DEFAULT_PAGE_SIZE ? undefined : size,
  });
}

/** Whether the search, the group, the API or the quick filter is on (the page and the size are not filters). */
export function hasFilters(address: AllAddress): boolean {
  return address.q.trim() !== '' || address.group !== null || address.api !== null || address.show !== null;
}

/** The quick filter a role may use: without `storefront:read` "Not on the shop" is dropped, so an old link lists every service. */
export function usableShow(show: AllShow | null, access: FilterAccess): AllShow | null {
  return show === 'offshop' && !access.storefront ? null : show;
}

/** The options of the Show menu; "Not on the shop" needs `storefront:read`, so a role without it is not offered it. */
export function showOptions(access: FilterAccess): SelectOption[] {
  return [
    { value: '', label: 'Show: All services' },
    { value: 'attention', label: 'Show: Needs attention' },
    ...(access.storefront ? [{ value: 'offshop', label: 'Show: Not on the shop' }] : []),
    { value: 'disabled', label: 'Show: Switched off' },
  ];
}

/** What each quick filter asks the server for. */
const SHOW_FILTERS: Record<AllShow, Record<string, FilterValue>> = {
  attention: { needsAttention: true },
  offshop: { notOnShop: true },
  disabled: { status: 'disabled' },
};

/**
 * The list request for a kind and an address: the kind, the group (`categoryId`), the API (`supplierId`, the primary connection) and the
 * quick filter as field filters, the search as `q`, the rows of the page. The rows come in the stored order, the one merchants see (the
 * server's sort key `sort`: the group's position, then the service's own position, then the name), so the order saved with Set Order
 * shows here as it is, and the price grid and this list agree.
 */
export function listQueryOf(type: ServiceType, address: AllAddress, access: FilterAccess): ListQuery {
  const show = usableShow(address.show, access);
  const q = address.q.trim();
  const filters: Record<string, FilterValue> = {
    type,
    ...(address.group !== null ? { categoryId: address.group } : {}),
    ...(address.api !== null ? { supplierId: address.api } : {}),
    ...(show ? SHOW_FILTERS[show] : {}),
  };
  return {
    start: (address.page - 1) * address.size,
    end: address.page * address.size,
    sort: [LIST_SORT],
    order: ['asc'],
    ...(q ? { q } : {}),
    filters,
  };
}
