// An account's wallet reads: the live wallet, the statement page by page, and one journal behind a statement line. The server works out
// every figure; these hooks only ask. One address for both wallet kinds.
import { keepPreviousData } from '@tanstack/react-query';
import type { SortState } from '@/components/ui';
import { getLedgerTransaction } from '@/features/finance';
import { useApiQuery } from '@/lib/query';
import { getAccountWallet, listAccountStatement } from '../api';
import { rangeFilters } from '../lib/statementRange';
import type { StatementRange, StatementWallet } from '../types';
import { JOURNAL_KEY, STATEMENT_KEY, WALLET_KEY } from './keys';

/** The live wallet of one account. Pass `enabled: false` while the staff member lacks `wallet:read`. */
export function useAccountWallet(accountId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...WALLET_KEY, accountId],
    queryFn: ({ signal }) => getAccountWallet(accountId, { signal }),
    enabled,
  });
}

/** What the statement read needs: the account, the page, the page size, the sort, the date range and which wallet (the live one by default). */
export type StatementArgs = {
  accountId: number;
  page: number;
  pageSize: number;
  sort: SortState;
  range?: StatementRange;
  wallet?: StatementWallet;
  enabled?: boolean;
};

/**
 * One page of the statement, with the total for the pager. The previous page stays on screen while the next loads, so the table does
 * not flash empty; `isPlaceholderData` says when what shows is not yet the page asked for.
 */
export function useAccountStatement({
  accountId,
  page,
  pageSize,
  sort,
  range = {},
  wallet = 'live',
  enabled = true,
}: StatementArgs) {
  return useApiQuery({
    queryKey: [
      ...STATEMENT_KEY,
      accountId,
      page,
      pageSize,
      sort.field,
      sort.order,
      range.from,
      range.to,
      wallet,
    ],
    queryFn: ({ signal }) =>
      listAccountStatement(
        accountId,
        {
          start: (page - 1) * pageSize,
          end: page * pageSize,
          sort: [sort.field],
          order: [sort.order],
          // `wallet` is not a column but a parameter of the route; the live wallet is the default, so it is left out.
          filters: { ...rangeFilters(range), ...(wallet === 'live' ? {} : { wallet }) },
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
