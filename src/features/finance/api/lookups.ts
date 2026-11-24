// Two read-only helpers that borrow routes other features own: the issue-invoice dialog's merchant picker (the accounts list) and the link
// to a stored file. They stay private and carry no route tag, so the coverage count is not claimed twice.
import { listAccounts } from '@/features/accounts';
import { apiUrl, pathOf, type ApiInit, type Id, type ListResult } from '@/lib/api';
import { accountLabel } from '@/lib/format';
import type { MerchantOption } from '../types';

/** Most names the picker loads. A longer list would need a search box; the demo's pickers were plain selects too. */
export const LOOKUP_CAP = 200;

/**
 * The accounts of a merchant rank (id, name) by name, for choosing who to bill: a manual invoice is for a merchant only, so the list
 * asks for `rankKind=merchant` (a retail account is refused by the server with `not_merchant`). Needs `clients:read`. An account with
 * no name shows its email, and a removed one "Deleted account".
 * Assumed contract: the accounts list rows carry `id`, `name`, `email` and `status`.
 */
export async function listMerchantOptions(init?: ApiInit): Promise<ListResult<MerchantOption>> {
  const { data, total } = await listAccounts(
    { start: 0, end: LOOKUP_CAP, sort: ['name'], order: ['asc'], filters: { rankKind: 'merchant' } },
    init,
  );
  return { data: data.map((account) => ({ id: account.id, name: accountLabel(account) })), total };
}

/**
 * The link that downloads a stored file (an invoice's PDF copy, a deposit's proof of payment). The files route belongs to
 * the orders feature; the server answers with a redirect to a short-lived signed link and the browser follows it, so
 * the console builds a plain link and makes no request itself. Needs `files:read`.
 */
export function fileDownloadUrl(fileId: Id): string {
  return apiUrl(pathOf('/admin/files/:id', { id: fileId }));
}
