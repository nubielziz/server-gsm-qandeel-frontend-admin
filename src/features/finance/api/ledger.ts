// Ledger routes (`/admin/ledger/transactions*`): the Ledger tab of the Finance page and the order drawer's money trail (the
// demo's ledgerTab, journal / journalTable / showJournals). The map gives no bodies, so the shapes are assumed contracts
// (MISMATCHES M10).
import { apiGet, apiList, pathOf, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type { LedgerTransaction } from '../types';

/**
 * Journal entries with their lines, one page of them, with the total in `x-total-count`. Filter by `refType` and
 * `refId` to get everything posted for one record: the order drawer asks for `refType=order&refId=<order id>`. The
 * Ledger tab adds `kind`, `accountKind` (entries with a line on that kind of account) and the free text `q`. The server
 * owns every sum; the console only shows the lines.
 * Assumed contract: each row carries its `entries` with the account joined.
 * @route GET /admin/ledger/transactions
 */
export function listLedgerTransactions(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<LedgerTransaction>> {
  return apiList<LedgerTransaction>('/admin/ledger/transactions', query, undefined, init);
}

/**
 * One journal entry with its lines, for the Ledger tab's drawer when it opens from a link that has no list row.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/ledger/transactions/:id
 */
export function getLedgerTransaction(id: Id, init?: ApiInit): Promise<LedgerTransaction> {
  return apiGet<LedgerTransaction>(pathOf('/admin/ledger/transactions/:id', { id }), undefined, init);
}
