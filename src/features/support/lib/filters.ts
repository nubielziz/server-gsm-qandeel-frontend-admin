// The support page's filter, who, search, customer, open thread, page and view as URL search parameters, and how they become
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

export type WhoFilter = 'all' | 'customers' | 'merchants';

/** Who wrote: everyone, storefront customers (`b2c` in the demo) or merchants (`b2b`). */
export const WHO_ITEMS: readonly { value: WhoFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'customers', label: 'Customers' },
  { value: 'merchants', label: 'Merchants' },
];

export type SupportView = 'inbox' | 'templates';

/** The inbox filters kept in the address; the open thread, the page and the view have their own parameters. */
export type SupportFilters = { filter: TicketFilter; who: WhoFilter; q: string; customerId: number | null };

const isId = (raw: string | null): raw is string => raw !== null && /^\d+$/.test(raw) && Number(raw) > 0;

/**
 * The filter a bare `/support` opens on: Open (the demo's default). One customer's tickets open on All, because the link
 * says "N tickets from this customer" and the count includes the resolved ones.
 */
export function defaultFilter(customerId: number | null): TicketFilter {
  return customerId === null ? 'open' : 'all';
}

/** Reads the filters from the address; anything unknown or malformed is dropped. */
export function parseSupportFilters(params: URLSearchParams): SupportFilters {
  const rawCustomer = params.get('customerId');
  const customerId = isId(rawCustomer) ? Number(rawCustomer) : null;
  return {
    customerId,
    filter:
      FILTER_ITEMS.find((item) => item.value === params.get('filter'))?.value ?? defaultFilter(customerId),
    who: WHO_ITEMS.find((item) => item.value === params.get('who'))?.value ?? 'all',
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
  // A filter nobody chose follows the default of the customer in the address (a link to a customer's tickets opens on All).
  const chosen = patch.filter ?? (base.has('filter') ? current.filter : undefined);
  const filter = chosen ?? defaultFilter(merged.customerId);
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('filter', filter === defaultFilter(merged.customerId) ? '' : filter);
  put('who', merged.who === 'all' ? '' : merged.who);
  put('q', merged.q);
  put('customerId', merged.customerId === null ? '' : String(merged.customerId));
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
    filters.filter !== defaultFilter(filters.customerId) || filters.who !== 'all' || filters.q.trim() !== ''
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
 * A customer in the address means that customer's tickets whatever the Who control says.
 */
export function toListFilters(filters: SupportFilters, meId?: number): TicketListFilters {
  const q = filters.q.trim();
  const out: TicketListFilters = {};
  if (filters.filter === 'open') out.status = [...UNRESOLVED];
  if (filters.filter === 'late') out.late = true;
  if (filters.filter === 'mine' && meId !== undefined) out.assigneeId = meId;
  if (filters.filter === 'resolved') out.status = 'resolved';
  if (filters.who !== 'all') out.requesterType = filters.who === 'customers' ? 'customer' : 'client';
  if (filters.customerId !== null) {
    out.requesterType = 'customer';
    out.requesterId = filters.customerId;
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
