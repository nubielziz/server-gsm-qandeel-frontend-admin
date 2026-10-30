// The Invoices tab's search, status and kind filters and sort as address parameters, and how they become API filters. New
// in the console (MISMATCHES M123). Nothing here decides which invoices match; it only writes and reads the question.
import type { SortState } from '@/components/ui';
import type { InvoiceKind, InvoiceStatus } from '../types';
import type { ListFilters } from './refineFilters';
import { withParams } from './url';

export const INVOICE_STATUSES: readonly InvoiceStatus[] = ['open', 'paid', 'void'];
export const INVOICE_KINDS: readonly InvoiceKind[] = ['topup', 'manual', 'receipt', 'statement'];

/** Search text, one status and one kind. Empty means "no filter". */
export type InvoiceListState = { q: string; status: InvoiceStatus | ''; kind: InvoiceKind | '' };

/** The columns the server sorts invoices by: Issued, Total and Status. */
export const INVOICE_SORT_FIELDS = ['createdAt', 'total', 'status'] as const;

export const INVOICE_DEFAULT_SORT: SortState = { field: 'createdAt', order: 'desc' };

/** Reads the filters from the address; an unknown status or kind is dropped. */
export function parseInvoiceFilters(params: URLSearchParams): InvoiceListState {
  return {
    q: params.get('q') ?? '',
    status: INVOICE_STATUSES.find((status) => status === params.get('status')) ?? '',
    kind: INVOICE_KINDS.find((kind) => kind === params.get('kind')) ?? '',
  };
}

export function writeInvoiceFilters(
  base: URLSearchParams,
  patch: Partial<InvoiceListState>,
): URLSearchParams {
  const merged = { ...parseInvoiceFilters(base), ...patch };
  return withParams(base, { q: merged.q, status: merged.status, kind: merged.kind });
}

export function hasInvoiceFilters(filters: InvoiceListState): boolean {
  return Boolean(filters.q.trim() || filters.status || filters.kind);
}

export function clearInvoiceFilters(base: URLSearchParams): URLSearchParams {
  return withParams(base, { q: undefined, status: undefined, kind: undefined, page: undefined });
}

/** The API filters for the toolbar. */
export function toInvoiceListFilters(filters: InvoiceListState): ListFilters {
  const q = filters.q.trim();
  return {
    ...(q ? { q } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
  };
}
