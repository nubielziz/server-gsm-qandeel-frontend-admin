// Ledger routes (`/admin/ledger/transactions*`). Built early for the order drawer's money trail (the demo's journal /
// journalTable / showJournals in 20-ui.js); the finance page adds its own functions next to these. The map gives no
// bodies, so the shapes are assumed contracts (MISMATCHES M10).
import { apiGet, apiList, pathOf, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type { LedgerTransaction } from '../types';

/**
 * Journal entries with their lines, one page of them, with the total in `x-total-count`. Filter by `refType` and
 * `refId` to get everything posted for one record: the order drawer asks for `refType=order&refId=<order id>`, and
 * the ledger tab will add `kind` and `q`. The server owns every sum; the console only shows the lines.
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
 * One journal entry with its lines, for the entry dialog of the ledger tab.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/ledger/transactions/:id
 */
export function getLedgerTransaction(id: Id, init?: ApiInit): Promise<LedgerTransaction> {
  return apiGet<LedgerTransaction>(pathOf('/admin/ledger/transactions/:id', { id }), undefined, init);
}
