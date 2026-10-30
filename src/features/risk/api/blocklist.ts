// The blocklist (`/admin/blocklist`): list, one entry, add and remove. Ports the data side of `tabBlock`, `bl-add` and
// `bl-remove` in 54-p-risk.js. Entries stop a customer from ordering; IP addresses are not here, they live in `ip-rules`.
import {
  apiDelete,
  apiGet,
  apiList,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { BlocklistEntry, CreateBlocklistBody } from '../types';

/**
 * One page of the blocklist with the total in `x-total-count`. Filter by `kind`; sort with `_sort`/`_order`.
 * Assumed contract: rows are `BlocklistEntry`.
 * @route GET /admin/blocklist
 */
export function listBlocklist(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<BlocklistEntry>> {
  return apiList<BlocklistEntry>('/admin/blocklist', query, undefined, init);
}

/**
 * One entry, for Refine's `useOne` and links that have no list row.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/blocklist/:id
 */
export function getBlocklistEntry(id: Id, init?: ApiInit): Promise<BlocklistEntry> {
  return apiGet<BlocklistEntry>(pathOf('/admin/blocklist/:id', { id }), undefined, init);
}

/**
 * Adds an email, a domain, an IMEI or a card to the blocklist. From then on the order is refused at checkout and the
 * customer sees a neutral message. A duplicate or a bad value comes back as a problem the dialog shows.
 * Assumed contract: body `{ kind, value, reason }`; the answer is the new entry.
 * @route POST /admin/blocklist
 */
export function createBlocklistEntry(body: CreateBlocklistBody, init?: ApiInit): Promise<BlocklistEntry> {
  return apiPost<BlocklistEntry>('/admin/blocklist', body, init);
}

/**
 * Removes an entry: whatever it blocked can order again.
 * Assumed contract: the answer is empty (204).
 * @route DELETE /admin/blocklist/:id
 */
export function deleteBlocklistEntry(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/blocklist/:id', { id }), undefined, init);
}
