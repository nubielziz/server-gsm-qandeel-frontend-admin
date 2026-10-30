// Two read-only helpers that borrow routes other features own: the issue-invoice dialog's merchant picker and the link to a
// stored file. They stay private and carry no route tag, so the coverage count is not claimed twice.
import { apiList, apiUrl, pathOf, type ApiInit, type Id, type ListResult } from '@/lib/api';
import type { MerchantOption } from '../types';

/** Most names the picker loads. A longer list would need a search box; the demo's pickers were plain selects too. */
export const LOOKUP_CAP = 200;

/**
 * The merchants (id, name) by name, for choosing who to bill. Needs `clients:read`.
 * Assumed contract: rows carry `id` and `name`.
 */
export function listMerchantOptions(init?: ApiInit): Promise<ListResult<MerchantOption>> {
  return apiList<MerchantOption>(
    '/admin/clients',
    { start: 0, end: LOOKUP_CAP, sort: ['name'], order: ['asc'] },
    undefined,
    init,
  );
}

/**
 * The link that downloads a stored file (an invoice's PDF copy, a deposit's proof of payment). The files route belongs to
 * the orders feature; the server answers with a redirect to a short-lived signed link and the browser follows it, so
 * the console builds a plain link and makes no request itself. Needs `files:read`.
 */
export function fileDownloadUrl(fileId: Id): string {
  return apiUrl(pathOf('/admin/files/:id', { id: fileId }));
}
