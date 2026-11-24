// The address of the All view: the strip's population, the Quick Search filters, the sort, the page and the page size as they stand in the
// URL (`?chip=merchants&status=suspended&q=zain`), read and written in one place, and how they become the question the server is asked.
// Nothing here decides which accounts match; it only writes and reads the question. Every address is written by the data layer's
// `accountsListPath`, so a link inside the app never takes a redirect, and a damaged address (an unknown chip, status, sort or size, an
// old key of a retired tab) is read as the plain list with the rest of the address kept.
import { accountsListPath, DEFAULT_PAGE_SIZE, type AccountsChip } from '../../lib/paths';
import { isListStatus, type ListStatus } from '../../lib/status';
import type { AccountListFilters } from '../../types';

/** The page sizes the footer offers. */
export const PAGE_SIZES: readonly number[] = [25, 50, 100, 200];

/** The columns the server can sort the list by (the Spent column has no sort: the server offers none). */
export const LIST_SORTS = ['name', 'rank', 'status', 'balance', 'ordersCount', 'lastOrderAt'] as const;
export type ListSort = (typeof LIST_SORTS)[number];

/** The sort an address leaves out: Account, A to Z. */
export const DEFAULT_LIST_SORT: ListSort = 'name';

/** The tabs of the strip that scope the list: every account, or one population. */
export const STRIP_KEYS = ['all', 'retail', 'merchants', 'guests'] as const;
export type StripKey = (typeof STRIP_KEYS)[number];

/** What the address says about the list. */
export type ListAddress = {
  /** The strip's population; null is every account. */
  chip: AccountsChip | null;
  /** A stored status, or `invitation` (the invitation pending). */
  status: ListStatus | null;
  /** A rank id. */
  rank: number | null;
  /** Two upper-case letters, or '' for any country. */
  country: string;
  q: string;
  sort: ListSort;
  dir: 'asc' | 'desc';
  page: number;
  size: number;
};

/** The address with no filter, on the first page, at the default size and sort. */
export const EMPTY_LIST_ADDRESS: ListAddress = {
  chip: null,
  status: null,
  rank: null,
  country: '',
  q: '',
  sort: DEFAULT_LIST_SORT,
  dir: 'asc',
  page: 1,
  size: DEFAULT_PAGE_SIZE,
};

const CHIPS: readonly AccountsChip[] = ['retail', 'merchants', 'guests'];

/** The strip tab a chip raises (no chip is the All accounts tab). */
export function stripKeyOf(chip: AccountsChip | null): StripKey {
  return chip ?? 'all';
}

// A positive whole number from an address, or null.
function wholeNumber(raw: string | null): number | null {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * The words a pre-redesign address used in `chip`, which still open the page (the shell's redirects send them): `suspended` and
 * `blocked` became the status filter, `requests` became the Data requests view. Null for anything else.
 */
export function legacyChipOf(params: URLSearchParams): 'suspended' | 'blocked' | 'requests' | null {
  const chip = params.get('chip');
  return chip === 'suspended' || chip === 'blocked' || chip === 'requests' ? chip : null;
}

/** Reads the list's keys from the address; anything unknown or malformed is dropped and the rest is kept. */
export function parseListAddress(params: URLSearchParams): ListAddress {
  const chip = params.get('chip');
  const legacy = legacyChipOf(params);
  const status = params.get('status');
  const country = params.get('country');
  const sort = LIST_SORTS.find((candidate) => candidate === params.get('sort'));
  const size = Number(params.get('size'));
  return {
    chip: CHIPS.find((candidate) => candidate === chip) ?? null,
    // An old `chip=suspended` is the same filter as `status=suspended`; a status the address names itself wins.
    status: isListStatus(status) ? status : legacy === 'suspended' || legacy === 'blocked' ? legacy : null,
    rank: wholeNumber(params.get('rank')),
    country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : '',
    q: params.get('q') ?? '',
    sort: sort ?? DEFAULT_LIST_SORT,
    // The direction belongs to the sort: an address that names a sort the page does not know (a retired one) gets the default order.
    dir: params.get('dir') === 'desc' && (sort !== undefined || !params.has('sort')) ? 'desc' : 'asc',
    page: wholeNumber(params.get('page')) ?? 1,
    size: PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE,
  };
}

/**
 * The address of the All view with these keys (the rest are the defaults). The data layer's builder leaves out the defaults (the plain strip, the
 * name sort, an ascending direction, page 1, a size of 50) and writes the keys in one fixed order.
 */
export function listLink(address: Partial<ListAddress> = {}): string {
  const { chip, status, rank, country, q, sort, dir, page, size } = { ...EMPTY_LIST_ADDRESS, ...address };
  return accountsListPath({
    chip: chip ?? undefined,
    status: status ?? undefined,
    rank: rank ?? undefined,
    country: country || undefined,
    q: q.trim() || undefined,
    sort,
    dir,
    page,
    size,
  });
}

/** Whether the search or a filter is on (the strip's population, the page, the sort and the size are not filters). */
export function hasFilters(address: ListAddress): boolean {
  return (
    address.q.trim() !== '' || address.status !== null || address.rank !== null || address.country !== ''
  );
}

/** What the staff member may sort by beyond the plain columns: the balance needs `wallet:read` (else the default sort). */
export function usableSort(sort: ListSort, access: { wallet: boolean }): ListSort {
  return sort === 'balance' && !access.wallet ? DEFAULT_LIST_SORT : sort;
}

/**
 * The list filters behind an address, for `GET /admin/clients`: the strip's population (All accounts is no filter; Retail and
 * Merchants are the rank kind, Guests are the accounts with no login), then the status, the rank, the country and the search.
 */
export function listFilters(address: ListAddress): AccountListFilters {
  const q = address.q.trim();
  return {
    ...(address.chip === 'retail' ? { rankKind: 'retail' as const } : {}),
    ...(address.chip === 'merchants' ? { rankKind: 'merchant' as const } : {}),
    ...(address.chip === 'guests' ? { hasAccount: false } : {}),
    // "Invitation pending" is not a stored status: the list route takes it as its own flag.
    ...(address.status === 'invitation' ? { invitationPending: true } : {}),
    ...(address.status && address.status !== 'invitation' ? { status: address.status } : {}),
    ...(address.rank !== null ? { rankId: address.rank } : {}),
    ...(address.country ? { country: address.country } : {}),
    ...(q ? { q } : {}),
  };
}

const STATUS_WORD: Record<ListStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  blocked: 'Blocked',
  anonymized: 'Anonymized',
  invitation: 'Invitation pending',
};

/** The search and the filters that are on, in words, for "No account matches": `"ann", Suspended, rank VIP, country DE`. */
export function filterWords(address: ListAddress, rankName?: string): string {
  const q = address.q.trim();
  return [
    q ? `“${q}”` : '',
    address.status ? STATUS_WORD[address.status] : '',
    address.rank !== null ? `rank ${rankName ?? `#${address.rank}`}` : '',
    address.country ? `country ${address.country}` : '',
  ]
    .filter(Boolean)
    .join(', ');
}
