// The address of the Data requests view: the status menu, the sort, the page and the page size as they stand in the URL
// (`?view=requests&request=any&sort=requestedAt`), read and written in one place, and how they become the question the server is asked.
// Nothing here decides which requests match; it only writes and reads the question. Every address is written by the data layer's
// `accountsListPath`, and a damaged address (an unknown status or sort, a size the footer does not offer) is read as the default.
import type { SelectOption } from '@/components/ui';
import { PENDING_REQUEST_STATUSES } from '../../hooks/useDataRequests';
import { accountsListPath, DEFAULT_PAGE_SIZE, type RequestStatusKey } from '../../lib/paths';
import type { DataRequestFilters } from '../../types';
import { PAGE_SIZES } from '../list/listAddress';

/** The columns the server can sort the data requests by. */
export const REQUEST_SORTS = ['dueAt', 'requestedAt', 'status'] as const;
export type RequestSort = (typeof REQUEST_SORTS)[number];

/** The sort an address leaves out: the legal deadline, nearest first, so an overdue request is on top. */
export const DEFAULT_REQUEST_SORT: RequestSort = 'dueAt';

/**
 * The status menu's choice. The empty value is the default, open and in progress: the requests the Data requests link counts, so the table
 * matches the number on the link. `any` shows every request, closed ones too.
 */
export type RequestMenuValue = RequestStatusKey | '';

/** The status menu, in its order. */
export const REQUEST_STATUS_OPTIONS: readonly (SelectOption & { value: RequestMenuValue })[] = [
  { value: '', label: 'Open and in progress' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Done' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'any', label: 'All statuses' },
];

/** What the address says about the Data requests view. */
export type RequestsAddress = {
  request: RequestMenuValue;
  sort: RequestSort;
  dir: 'asc' | 'desc';
  page: number;
  size: number;
};

/** The address with no filter, on the first page, at the default size and sort. */
export const EMPTY_REQUESTS_ADDRESS: RequestsAddress = {
  request: '',
  sort: DEFAULT_REQUEST_SORT,
  dir: 'asc',
  page: 1,
  size: DEFAULT_PAGE_SIZE,
};

// A positive whole number from an address, or null.
function wholeNumber(raw: string | null): number | null {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

/** Reads the view's keys from the address; anything unknown or malformed is dropped and the rest is kept. */
export function parseRequestsAddress(params: URLSearchParams): RequestsAddress {
  const request = REQUEST_STATUS_OPTIONS.find(
    (option) => option.value !== '' && option.value === params.get('request'),
  );
  const sort = REQUEST_SORTS.find((candidate) => candidate === params.get('sort'));
  const size = Number(params.get('size'));
  return {
    request: request?.value ?? '',
    sort: sort ?? DEFAULT_REQUEST_SORT,
    // The direction belongs to the sort: an address that names a sort the view does not know gets the default order.
    dir: params.get('dir') === 'desc' && (sort !== undefined || !params.has('sort')) ? 'desc' : 'asc',
    page: wholeNumber(params.get('page')) ?? 1,
    size: PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE,
  };
}

/**
 * The address of the Data requests view with these keys (the rest are the defaults). The data layer's builder leaves out the defaults (open
 * and in progress, the deadline sort, an ascending direction, page 1, a size of 50) and writes the keys in one fixed order.
 */
export function requestsLink(address: Partial<RequestsAddress> = {}): string {
  const { request, sort, dir, page, size } = { ...EMPTY_REQUESTS_ADDRESS, ...address };
  return accountsListPath({ view: 'requests', request: request || undefined, sort, dir, page, size });
}

/**
 * The filters behind the status menu: open and in progress by default, `any` is no filter, any other choice is that status.
 */
export function requestFilters(request: RequestMenuValue): DataRequestFilters {
  if (request === 'any') return {};
  return request === '' ? { status: PENDING_REQUEST_STATUSES } : { status: request };
}
