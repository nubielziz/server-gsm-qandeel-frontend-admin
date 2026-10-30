// Invoice routes (`/admin/invoices*`): list, read and issue a manual invoice for a merchant. New in the console, the demo
// has no invoices page (MISMATCHES M123); the map gives no bodies (MISMATCHES M10).
import {
  apiGet,
  apiList,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { CreateInvoiceBody, Invoice } from '../types';

/**
 * Invoices, one page of them, with the total in `x-total-count`. Filters: `status`, `kind`, `clientId` and the free
 * text `q` (the invoice number or the merchant's name); sort with `_sort`/`_order` (`createdAt`, `total`, `status`).
 * Assumed contract: rows carry the merchant or customer as a `{ id, name }` join.
 * @route GET /admin/invoices
 */
export function listInvoices(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Invoice>> {
  return apiList<Invoice>('/admin/invoices', query, undefined, init);
}

/**
 * One invoice, for the drawer: it opens from a link that has no list row, and after issuing one.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/invoices/:id
 */
export function getInvoice(id: Id, init?: ApiInit): Promise<Invoice> {
  return apiGet<Invoice>(pathOf('/admin/invoices/:id', { id }), undefined, init);
}

/**
 * Issues a manual invoice for a merchant. The server checks the amount, adds tax, numbers the invoice and answers the
 * new one; its message (a merchant without a billing country, an amount out of range) is shown in the dialog.
 * Assumed contract: the body is `{ clientId, amount, description }`.
 * @route POST /admin/invoices
 */
export function createInvoice(body: CreateInvoiceBody, init?: ApiInit): Promise<Invoice> {
  return apiPost<Invoice>('/admin/invoices', body, init);
}
