// The address parameters of the refunds views on the Money page (decision 026): the sub-filters (`status`, `method`), the page and the
// sort, kept in the address (`/money?view=refunds&status=failed&page=2`) so a link or a reload shows the same list. Ports `ui.refunds`,
// `ui.rfT`, `ui.rfD` and `ui.rfP` of 53-p-refunds.js, which kept them in memory. The view itself is the page's `view` key: nothing
// here reads it, and every write keeps it. Nothing here decides which rows match: it only writes and reads the question.
import type { SortState } from '@/components/ui';
import { moneyPath, viewOfRefundTab } from '@/features/money';
import { isPaymentMethod, isRefundStatus } from './labels';
import type { PaymentMethod, RefundStatus } from '../types';

/**
 * The three tables of these views: Refunds and Card disputes (Money back), Payments (Money in › Shop payments). The address does not name
 * one (the page's `view` key does); a table uses it to pick its own page size and sort, and a link uses it to pick the view.
 */
export type RefundTab = 'refunds' | 'disputes' | 'payments';

/** The two sub-filters: refund status (Refunds view) and payment method (Shop payments view). */
export type RefundView = { status: RefundStatus | ''; method: PaymentMethod | '' };

/** What a link to one of these views can say: the table (it picks the view) and the sub-filters. */
export type RefundLink = Partial<RefundView> & { tab?: RefundTab };

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

/** Reads the sub-filters from the address; anything unknown is dropped. */
export function parseView(params: URLSearchParams): RefundView {
  const status = params.get('status');
  const method = params.get('method');
  return {
    status: isRefundStatus(status) ? status : '',
    method: isPaymentMethod(method) ? method : '',
  };
}

/** The address with some of the sub-filters changed. Defaults are left out; everything else in the address (`view`, `order`, page, sort) stays. */
export function writeView(base: URLSearchParams, patch: Partial<RefundView>): URLSearchParams {
  const merged = { ...parseView(base), ...patch };
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  put('status', merged.status);
  put('method', merged.method);
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

/** The sort in the address, or the table's own start when the address names none (or names a column the server cannot sort by). */
export function parseSort(params: URLSearchParams, tab: RefundTab): SortState {
  const field = SORT_FIELDS[tab].find((candidate) => candidate === params.get('sort'));
  if (!field) return DEFAULT_SORT[tab];
  return { field, order: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

/** The address with a sort, back on page 1; the table's starting sort is left out. `tab` is the table the sort belongs to. */
export function writeSort(base: URLSearchParams, sort: SortState, tab: RefundTab): URLSearchParams {
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
 * The address of what was a tab of the old Refunds page, now a view of the Money page (decision 026), with its sub-filters, for links
 * from other pages (the dashboard, the audit log, an order): `refundsPath({ tab: 'refunds', status: 'requested' })`.
 */
export function refundsPath(patch: RefundLink = {}): string {
  return moneyPath(viewOfRefundTab(patch.tab ?? null), { status: patch.status, method: patch.method });
}
