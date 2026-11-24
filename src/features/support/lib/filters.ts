// The support page's filter, who, search, account, open thread, page and view as URL search parameters, and how they become
// API filters. Ports the `ui.support` state and ticketRows() of 49-p-support.js: the demo filtered an in-memory array, the
// console asks the server. Nothing here decides which tickets match; it only writes and reads the question.
import type { CrudFilters } from '@refinedev/core';
import type { FilterValue, ListQuery } from '@/lib/api';
import type { TicketListFilters } from '../types';

/** Tickets per page of the inbox. */
export const PAGE_SIZE = 25;

export type TicketFilter = 'open' | 'late' | 'mine' | 'resolved' | 'all';

/** The demo's five filters, in its order. `late` is called Overdue on the screen. */
export const FILTER_ITEMS: readonly { value: TicketFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'late', label: 'Overdue' },
  { value: 'mine', label: 'Mine' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

export type WhoFilter = 'all' | 'retail' | 'merchants';

/** Who wrote: everyone, accounts of a retail rank (the shop's buyers, guests too) or accounts of a merchant rank. */
export const WHO_ITEMS: readonly { value: WhoFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'retail', label: 'Retail' },
  { value: 'merchants', label: 'Merchants' },
];

export type SupportView = 'inbox' | 'templates';

/** The inbox filters kept in the address; the open thread, the page and the view have their own parameters. */
export type SupportFilters = { filter: TicketFilter; who: WhoFilter; q: string; accountId: number | null };

const isId = (raw: string | null): raw is string => raw !== null && /^\d+$/.test(raw) && Number(raw) > 0;

/**
 * The filter a bare `/support` opens on: Open (the demo's default). One account's tickets open on All, because the link
 * says "N tickets from this account" and the count includes the resolved ones.
 */
export function defaultFilter(accountId: number | null): TicketFilter {
  return accountId === null ? 'open' : 'all';
}

// The word an address written before the merge used for the retail side of the Who control.
const LEGACY_WHO: Readonly<Record<string, WhoFilter>> = { customers: 'retail' };

/**
 * Reads the filters from the address; anything unknown or malformed is dropped. `accountId` names the account. An address written
 * before the merge may carry `customerId`: it is ignored, because an old customer number names another account now (the number
 * space moved), and the first change of a filter writes the address without it.
 */
export function parseSupportFilters(params: URLSearchParams): SupportFilters {
  const rawAccount = params.get('accountId');
  const accountId = isId(rawAccount) ? Number(rawAccount) : null;
  const rawWho = params.get('who') ?? '';
  return {
    accountId,
    filter:
      FILTER_ITEMS.find((item) => item.value === params.get('filter'))?.value ?? defaultFilter(accountId),
    who: WHO_ITEMS.find((item) => item.value === (LEGACY_WHO[rawWho] ?? rawWho))?.value ?? 'all',
    q: params.get('q') ?? '',
  };
}

/**
 * The address with some filters changed. Defaults are left out (a clean address means "open tickets, everyone"). Changing a
 * filter drops the open thread and the page, so the list starts again and shows its first ticket (the demo did the same).
 */
export function writeSupportFilters(base: URLSearchParams, patch: Partial<SupportFilters>): URLSearchParams {
  const current = parseSupportFilters(base);
  const merged = { ...current, ...patch };
  // A filter nobody chose follows the default of the account in the address (a link to an account's tickets opens on All).
  const chosen = patch.filter ?? (base.has('filter') ? current.filter : undefined);
  const filter = chosen ?? defaultFilter(merged.accountId);
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('filter', filter === defaultFilter(merged.accountId) ? '' : filter);
  put('who', merged.who === 'all' ? '' : merged.who);
  put('q', merged.q);
  put('accountId', merged.accountId === null ? '' : String(merged.accountId));
  // The key of the old model is never written back.
  next.delete('customerId');
  next.delete('ticket');
  next.delete('page');
  return next;
}

/** The open thread (`?ticket=<id>`), or null. */
export function parseTicketId(params: URLSearchParams): number | null {
  const raw = params.get('ticket');
  return isId(raw) ? Number(raw) : null;
}

/** The address with a thread open (or closed with null); every other parameter stays. */
export function writeTicket(base: URLSearchParams, id: number | null): URLSearchParams {
  const next = new URLSearchParams(base);
  if (id === null) next.delete('ticket');
  else next.set('ticket', String(id));
  return next;
}

export function parsePage(params: URLSearchParams): number {
  const raw = params.get('page');
  return isId(raw) ? Number(raw) : 1;
}

/** The address with a page; page 1 is left out. */
export function writePage(base: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(base);
  if (page > 1) next.set('page', String(page));
  else next.delete('page');
  return next;
}

export function parseView(params: URLSearchParams): SupportView {
  return params.get('view') === 'templates' ? 'templates' : 'inbox';
}

/** The address with the inbox or the Templates view; the open thread and the page belong to the inbox, so they go. */
export function writeView(base: URLSearchParams, view: SupportView): URLSearchParams {
  const next = new URLSearchParams(base);
  if (view === 'templates') next.set('view', 'templates');
  else next.delete('view');
  next.delete('ticket');
  next.delete('page');
  return next;
}

/** Whether the inbox differs from what a clean address shows: the demo's "Show open tickets" only appears then. */
export function hasActiveFilters(filters: SupportFilters): boolean {
  return (
    filters.filter !== defaultFilter(filters.accountId) || filters.who !== 'all' || filters.q.trim() !== ''
  );
}

// ---- To other pages ----

/** The address of the Support page with some filters set (`{ filter: 'late' }`), for links from other pages. */
export function supportListPath(patch: Partial<SupportFilters> = {}): string {
  const query = writeSupportFilters(new URLSearchParams(), patch).toString();
  return query ? `/support?${query}` : '/support';
}

/** The address that opens one ticket's thread on the Support page. */
export function supportTicketPath(id: number, filter?: TicketFilter): string {
  const params = new URLSearchParams({ ticket: String(id) });
  if (filter) params.set('filter', filter);
  return `/support?${params.toString()}`;
}

// ---- To the API ----

/** The tickets that still need work: everything but resolved. */
export const UNRESOLVED = ['new', 'open', 'pending'] as const;

/**
 * The API filters for the inbox. `meId` is the signed-in staff member, for Mine (the page waits for it before it asks).
 * An account in the address means that account's tickets whatever the Who control says; the server takes the account id alone.
 */
export function toListFilters(filters: SupportFilters, meId?: number): TicketListFilters {
  const q = filters.q.trim();
  const out: TicketListFilters = {};
  if (filters.filter === 'open') out.status = [...UNRESOLVED];
  if (filters.filter === 'late') out.late = true;
  if (filters.filter === 'mine' && meId !== undefined) out.assigneeId = meId;
  if (filters.filter === 'resolved') out.status = 'resolved';
  if (filters.who !== 'all') out.rankKind = filters.who === 'retail' ? 'retail' : 'merchant';
  if (filters.accountId !== null) {
    delete out.rankKind;
    out.requesterId = filters.accountId;
  }
  if (q) out.q = q;
  return out;
}

/**
 * How the inbox is sorted: tickets past their reply target first, then the most recently active (the demo's order). The
 * Resolved filter has no late tickets, so it only sorts by activity.
 */
export function inboxSort(filter: TicketFilter): { field: string; order: 'asc' | 'desc' }[] {
  const byActivity = { field: 'updatedAt', order: 'desc' } as const;
  return filter === 'resolved' ? [byActivity] : [{ field: 'late', order: 'desc' }, byActivity];
}

type FilterMap = Record<string, FilterValue | readonly FilterValue[] | undefined>;

/** The same filters as Refine's list filters, which the data provider turns into the query string. */
export function toRefineFilters(list: TicketListFilters): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(list as FilterMap)) {
    if (value === undefined || (Array.isArray(value) && value.length === 0)) continue;
    if (field === 'q') out.push({ field, operator: 'eq', value });
    else out.push({ field, operator: Array.isArray(value) ? 'in' : 'eq', value });
  }
  return out;
}

/** The same filters as a `ListQuery`, for the calls that do not go through Refine (the counts, the palette). */
export function toListQuery(
  list: TicketListFilters,
  extra: Omit<ListQuery, 'filters' | 'q'> = {},
): ListQuery {
  const { q, ...rest } = list;
  return { ...extra, ...(q ? { q } : {}), filters: rest as NonNullable<ListQuery['filters']> };
}
