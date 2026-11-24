// Addresses of the Accounts page, for links from other pages (ARCHITECTURE §5.2): the only builders of an address of this page. The list
// page is `/accounts?view=…` and one account is `/accounts/:id?tab=<part>`; `tab` names the part shown on the right of the record's
// left menu.
import type { Id } from '@/lib/api';
import type { LegacyAccountType } from '../types';

/** The parts of one account's record, in the order of its left menu. */
export const ACCOUNT_TABS = [
  'overview',
  'wallet',
  'profile',
  'invoices',
  'payments',
  'api',
  'security',
  'prices',
  'orders',
  'support',
  'statement',
  'privacy',
  'audit',
] as const;

/** One part of a record: `wallet` is the Financial part, `privacy` is Privacy and risk, `audit` is the Activity Log. */
export type AccountTab = (typeof ACCOUNT_TABS)[number];

/** The part a record opens on; it leaves no `tab` in the address. */
export const DEFAULT_ACCOUNT_TAB: AccountTab = 'overview';

/** Whether a value from an address names a part. */
export function isAccountTab(value: unknown): value is AccountTab {
  return ACCOUNT_TABS.some((tab) => tab === value);
}

/**
 * The address of one account's record, optionally on a part (`/accounts/7?tab=wallet`) and with an order open in the drawer of the
 * Orders part (`?order=48100`; an address with `order` and no `tab` opens Orders). The default part needs no `tab`.
 */
export function accountPath(id: Id, tab?: AccountTab, extra: { order?: Id } = {}): string {
  const params = new URLSearchParams();
  if (tab && tab !== DEFAULT_ACCOUNT_TAB) params.set('tab', tab);
  if (extra.order !== undefined) params.set('order', String(extra.order));
  const query = params.toString();
  return query ? `/accounts/${id}?${query}` : `/accounts/${id}`;
}

/**
 * The address of a record by a number of the old model: `/accounts/<oldId>?from=customer` makes the page ask the server which
 * account that record became, then replace the entry with `accountPath`. The page never shows the account whose number equals
 * an old customer number. A merchant keeps its number, so `merchant` and `client` links work the same way.
 */
export function legacyAccountPath(type: LegacyAccountType, oldId: Id, tab?: AccountTab): string {
  const params = new URLSearchParams({ from: type });
  if (tab && tab !== DEFAULT_ACCOUNT_TAB) params.set('tab', tab);
  return `/accounts/${oldId}?${params.toString()}`;
}

/** The views of the list page. `all` is the default and leaves no `view`. */
export type AccountsViewName = 'all' | 'add' | 'ranks' | 'add-rank' | 'edit-rank' | 'requests';

/** The strip's populations. Absent means every account; the strip scopes the All view only. */
export type AccountsChip = 'retail' | 'merchants' | 'guests';

/** Which request status the Data requests view shows; absent means open and in progress. */
export type RequestStatusKey = 'open' | 'in_progress' | 'completed' | 'rejected' | 'any';

/** What an address of the list page can say. Every key is optional; defaults are left out. */
export type AccountsListState = {
  view?: AccountsViewName;
  /** The strip. `'all'` is the same as leaving it out. */
  chip?: AccountsChip | 'all';
  /** A stored status, or `invitation` for the accounts whose invitation is still unused. */
  status?: 'active' | 'suspended' | 'blocked' | 'anonymized' | 'invitation';
  /** A rank id. */
  rank?: Id | string;
  /** Two letters. */
  country?: string;
  q?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  page?: number;
  size?: number;
  /** The rank being edited. */
  id?: Id | string;
  request?: RequestStatusKey;
};

/** The page size an address leaves out. */
export const DEFAULT_PAGE_SIZE = 50;

/** The sort an address leaves out, by view (`name` on All, `dueAt` on Data requests). */
const DEFAULT_SORT: Partial<Record<AccountsViewName, string>> = { all: 'name', requests: 'dueAt' };

// The keys each view writes, so a state carried over from another view never leaves a stray key in the address.
const VIEW_KEYS: Record<AccountsViewName, readonly (keyof AccountsListState)[]> = {
  all: ['chip', 'status', 'rank', 'country', 'q', 'sort', 'dir', 'page', 'size'],
  add: [],
  ranks: ['page', 'size'],
  'add-rank': [],
  'edit-rank': ['id'],
  requests: ['request', 'sort', 'dir', 'page', 'size'],
};

/**
 * The address of the list page with some state (`{ chip: 'merchants', status: 'suspended' }`), for links from other pages such as
 * the dashboard. The keys come in a fixed order (`view`, `chip`, `status`, `rank`, `country`, `q`, `sort`, `dir`, `page`, `size`, `id`,
 * `request`) and only the keys the view uses are written; defaults are left out: `view=all`, `chip=all`, the view's default sort, an
 * ascending direction (an address with no `dir` is ascending), page 1 and a page size of 50.
 */
export function accountsListPath(state: AccountsListState = {}): string {
  const view = state.view ?? 'all';
  const used = new Set(VIEW_KEYS[view]);
  const params = new URLSearchParams();
  const put = (key: keyof AccountsListState, value: string | number | undefined) => {
    if (value !== undefined && value !== '' && used.has(key)) params.set(key, String(value));
  };
  if (view !== 'all') params.set('view', view);
  put('chip', state.chip === 'all' ? undefined : state.chip);
  put('status', state.status);
  put('rank', state.rank);
  put('country', state.country);
  put('q', state.q?.trim());
  put('sort', state.sort === DEFAULT_SORT[view] ? undefined : state.sort);
  put('dir', state.dir === 'desc' ? 'desc' : undefined);
  put('page', state.page && state.page > 1 ? state.page : undefined);
  put('size', state.size && state.size !== DEFAULT_PAGE_SIZE ? state.size : undefined);
  put('id', state.id);
  put('request', state.request);
  const query = params.toString();
  return query ? `/accounts?${query}` : '/accounts';
}

/** The address of the Ranks view. */
export function ranksPath(): string {
  return accountsListPath({ view: 'ranks' });
}
