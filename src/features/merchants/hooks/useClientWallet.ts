// A merchant's wallet reads: the three balances, the statement page by page, and one journal behind a statement line. Ports the
// data side of merWalletTab in 42-p-merchants.js (the demo summed the merchant's journals in the browser; the server now does).
import { keepPreviousData } from '@tanstack/react-query';
import { getLedgerTransaction } from '@/features/finance';
import { useApiQuery } from '@/lib/query';
import type { SortState } from '@/components/ui';
import { getClientWallet, listClientStatement } from '../api';
import { JOURNAL_KEY, STATEMENT_KEY, WALLET_KEY } from './keys';

/** The balances of one merchant. Pass `enabled: false` while the staff member lacks `wallet:read`. */
export function useClientWallet(clientId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...WALLET_KEY, clientId],
    queryFn: ({ signal }) => getClientWallet(clientId, { signal }),
    enabled,
  });
}

/** What the statement read needs: the merchant, the page, the page size and the sort. */
export type StatementArgs = {
  clientId: number;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/**
 * One page of the statement, with the total for the pager. The previous page stays on screen while the next loads, so the
 * table does not flash empty; `isPlaceholderData` says when what shows is not yet the page asked for.
 */
export function useClientStatement({ clientId, page, pageSize, sort, enabled = true }: StatementArgs) {
  return useApiQuery({
    queryKey: [...STATEMENT_KEY, clientId, page, pageSize, sort.field, sort.order],
    queryFn: ({ signal }) =>
      listClientStatement(
        clientId,
        {
          start: (page - 1) * pageSize,
          end: page * pageSize,
          sort: [sort.field],
          order: [sort.order],
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** One journal entry with its lines, for the dialog behind a statement line. Needs `ledger:read`. */
export function useJournal(transactionId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...JOURNAL_KEY, transactionId],
    queryFn: ({ signal }) => getLedgerTransaction(transactionId, { signal }),
    enabled,
  });
}
