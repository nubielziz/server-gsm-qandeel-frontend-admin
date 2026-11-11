// Merchant account routes (`/admin/clients*`). Ports the data side of pageMerchants / pageMerchant in 42-p-merchants.js and
// setMerchantStatus / setMerchantGroup in 11-state.js. The map gives no bodies (MISMATCHES M10), so every body and answer
// here is an assumed contract.
import {
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { Client, CreateClientBody, UpdateClientBody } from '../types';

/**
 * The merchants, one page of them, with the total in `x-total-count`. Filters: `status`, `groupId` and the free-text `q`
 * (name, email, company); sort with `_sort`/`_order`. The tab counts are this call with `_start=0&_end=1`. Other features
 * use it for merchant menus and searches.
 * Assumed contract: rows carry the joined `group` and `referredBy`, and (for staff who can read wallets) the `wallet`
 * and 30-day `stats` figures the table shows.
 * @route GET /admin/clients
 */
export function listClients(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Client>> {
  return apiList<Client>('/admin/clients', query, undefined, init);
}

/**
 * One merchant, for the detail page and to refresh it after an action.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/clients/:id
 */
export function getClient(id: Id, init?: ApiInit): Promise<Client> {
  return apiGet<Client>(pathOf('/admin/clients/:id', { id }), undefined, init);
}

/**
 * Invites a merchant: the server creates the account as pending and emails a sign-up link. It answers 409 `EMAIL_TAKEN`
 * for an address that already has an account.
 * Assumed contract: body `{ name, email, country, groupId?, creditLimit?, invite: true }`, answer the new merchant.
 * @route POST /admin/clients
 */
export function createClient(body: CreateClientBody, init?: ApiInit): Promise<Client> {
  return apiPost<Client>('/admin/clients', body, init);
}

/**
 * Changes a merchant, one kind of change per call: approve or reactivate (`status: 'active'`), suspend or decline a pending
 * application (`status: 'suspended'` with a `reason`), move to another price group (`groupId`), or edit the details (`name`,
 * `company`, `phone`, `country`, `email`, `locale`, `address`, `taxId`, `internalNotes`; several at once). Mixing kinds is a
 * 422 on the first key of the second kind. Changing the email cancels open links, clears verification and mails the new address.
 * Only the fields that change are sent; the server writes the audit entry and refuses a change that is not allowed
 * (`INVALID_TRANSITION` 409, `EMAIL_TAKEN` 409, `RATE_LIMITED` 429).
 * Contract: body `{ status?, reason?, groupId? }` or the details, answer the updated merchant.
 * @route PATCH /admin/clients/:id
 */
export function updateClient(id: Id, body: UpdateClientBody, init?: ApiInit): Promise<Client> {
  return apiPatch<Client>(pathOf('/admin/clients/:id', { id }), body, init);
}
