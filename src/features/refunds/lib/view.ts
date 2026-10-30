// The page's tab, filters, page and sort as URL search parameters (`?tab=disputes`, `?tab=refunds&status=failed&page=2`), so a
// link or a reload shows the same list. Ports `ui.refunds`, `ui.rfT`, `ui.rfD` and `ui.rfP` of 53-p-refunds.js, which kept
// them in memory. Nothing here decides which rows match: it only writes and reads the question.
import type { SortState } from '@/components/ui';
import { isPaymentMethod, isRefundStatus } from './labels';
import type { PaymentMethod, RefundStatus } from '../types';

export type RefundTab = 'refunds' | 'disputes' | 'payments';

/** The tabs in the demo's order, with the permission that opens each one. */
export const REFUND_TABS: readonly { id: RefundTab; label: string; permission: string }[] = [
  { id: 'refunds', label: 'Refunds', permission: 'refunds:read' },
  { id: 'disputes', label: 'Card disputes', permission: 'disputes:read' },
  { id: 'payments', label: 'Payments', permission: 'reports:finance' },
];

/** The demo opens on Refunds. */
export const DEFAULT_TAB: RefundTab = 'refunds';

/** The tab and the two sub-filters (refund status on Refunds, payment method on Payments). */
export type RefundView = { tab: RefundTab; status: RefundStatus | ''; method: PaymentMethod | '' };

/** Rows per page of each table (the demo's page sizes). */
export const PAGE_SIZE: Readonly<Record<RefundTab, number>> = { refunds: 12, disputes: 25, payments: 12 };

/** The columns each server list can sort by: the demo's sortable columns. */
export const SORT_FIELDS: Readonly<Record<RefundTab, readonly string[]>> = {
  refunds: ['id', 'amount', 'status', 'createdAt'],
  disputes: ['id', 'amount', 'evidenceDueAt', 'status'],
  payments: ['orderId', 'method', 'amount', 'feeAmount', 'status', 'createdAt'],
};

/** Where each table starts: newest refunds and payments first, disputes by the soonest deadline (as the demo does). */
export const DEFAULT_SORT: Readonly<Record<RefundTab, SortState>> = {
  refunds: { field: 'createdAt', order: 'desc' },
  disputes: { field: 'evidenceDueAt', order: 'asc' },
  payments: { field: 'createdAt', order: 'desc' },
};

export function isRefundTab(value: unknown): value is RefundTab {
  return REFUND_TABS.some((tab) => tab.id === value);
}

/** Reads the tab and sub-filters from the address; anything unknown is dropped. */
export function parseView(params: URLSearchParams): RefundView {
  const tab = params.get('tab');
  const status = params.get('status');
  const method = params.get('method');
  return {
    tab: isRefundTab(tab) ? tab : DEFAULT_TAB,
    status: isRefundStatus(status) ? status : '',
    method: isPaymentMethod(method) ? method : '',
  };
}

/** The address with some of the view changed. Defaults are left out; everything else in the address (`order`, page) stays. */
export function writeView(base: URLSearchParams, patch: Partial<RefundView>): URLSearchParams {
  const merged = { ...parseView(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('tab', merged.tab === DEFAULT_TAB ? '' : merged.tab);
  put('status', merged.status);
  put('method', merged.method);
  return next;
}

/** A new tab starts on its first page with its own sort; the sub-filters are kept, as the demo kept them. */
export function writeTab(base: URLSearchParams, tab: RefundTab): URLSearchParams {
  const next = writeView(base, { tab });
  next.delete('page');
  next.delete('sort');
  next.delete('dir');
  return next;
}

export function parsePage(params: URLSearchParams): number {
  const raw = params.get('page');
  const page = raw !== null && /^\d+$/.test(raw) ? Number(raw) : 1;
  return page >= 1 ? page : 1;
}

/** The address on another page; page 1 is the default and is left out. */
export function writePage(base: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(base);
  if (page > 1) next.set('page', String(page));
  else next.delete('page');
  return next;
}

/** The sort in the address, or the tab's own start when the address names none (or names a column the server cannot sort by). */
export function parseSort(params: URLSearchParams, tab: RefundTab = parseView(params).tab): SortState {
  const field = SORT_FIELDS[tab].find((candidate) => candidate === params.get('sort'));
  if (!field) return DEFAULT_SORT[tab];
  return { field, order: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

/**
 * The address with a sort, back on page 1; the tab's starting sort is left out. `tab` is the tab the table belongs to (it
 * can differ from the address when the address names a tab the staff member may not open).
 */
export function writeSort(
  base: URLSearchParams,
  sort: SortState,
  tab: RefundTab = parseView(base).tab,
): URLSearchParams {
  const next = new URLSearchParams(base);
  const start = DEFAULT_SORT[tab];
  if (sort.field === start.field && sort.order === start.order) {
    next.delete('sort');
    next.delete('dir');
  } else {
    next.set('sort', sort.field);
    next.set('dir', sort.order);
  }
  next.delete('page');
  return next;
}

/**
 * The address of the page with a tab and sub-filters set, for links from other pages (the dashboard, a customer's page):
 * `refundsPath({ tab: 'refunds', status: 'requested' })`. The page honours the long forms too.
 */
export function refundsPath(patch: Partial<RefundView> = {}): string {
  const query = writeView(new URLSearchParams(), patch).toString();
  return query ? `/refunds?${query}` : '/refunds';
}
