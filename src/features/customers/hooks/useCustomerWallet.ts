// A customer's wallet reads: the figures, the statement page by page, and one journal behind a statement line. The server
// works out every figure; these hooks only ask. Mirrors the merchants' wallet reads (`useClientWallet`).
import { keepPreviousData } from '@tanstack/react-query';
import type { SortState } from '@/components/ui';
import { getLedgerTransaction } from '@/features/finance';
import { useApiQuery } from '@/lib/query';
import { getCustomerWallet, listCustomerWalletStatement } from '../api';
import { rangeFilters, type DateRange } from '../lib/walletStatement';
import { CUSTOMER_JOURNAL_KEY, CUSTOMER_STATEMENT_KEY, CUSTOMER_WALLET_KEY } from './keys';

/** The figures of one customer's balance. Pass `enabled: false` while the staff member lacks `wallet:read`. */
export function useCustomerWallet(customerId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...CUSTOMER_WALLET_KEY, customerId],
    queryFn: ({ signal }) => getCustomerWallet(customerId, { signal }),
    enabled,
  });
}

/** What the statement read needs: the customer, the page, the page size, the sort and the date range. */
export type WalletStatementArgs = {
  customerId: number;
  page: number;
  pageSize: number;
  sort: SortState;
  range: DateRange;
  enabled?: boolean;
};

/**
 * One page of the statement, with the total for the pager. The previous page stays on screen while the next loads, so the
 * table does not flash empty; `isPlaceholderData` says when what shows is not yet the page asked for.
 */
export function useCustomerWalletStatement({
  customerId,
  page,
  pageSize,
  sort,
  range,
  enabled = true,
}: WalletStatementArgs) {
  return useApiQuery({
    queryKey: [
      ...CUSTOMER_STATEMENT_KEY,
      customerId,
      page,
      pageSize,
      sort.field,
      sort.order,
      range.from,
      range.to,
    ],
    queryFn: ({ signal }) =>
      listCustomerWalletStatement(
        customerId,
        {
          start: (page - 1) * pageSize,
          end: page * pageSize,
          sort: [sort.field],
          order: [sort.order],
          filters: rangeFilters(range),
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** One journal entry with its lines, for the dialog behind a statement line. Needs `ledger:read`. */
export function useCustomerJournal(transactionId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...CUSTOMER_JOURNAL_KEY, transactionId],
    queryFn: ({ signal }) => getLedgerTransaction(transactionId, { signal }),
    enabled,
  });
}
