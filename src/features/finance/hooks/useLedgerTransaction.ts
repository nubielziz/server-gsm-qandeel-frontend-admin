// One journal entry for the drawer. The list row shows at once; a link to an entry that is not on the page (`?journal=25`)
// has no row, so the single-entry read fills it in.
import { useOne } from '@refinedev/core';
import type { LedgerTransaction } from '../types';

/** `entry` is the list row first and the fresher single read once it answers; undefined while a deep link loads. */
export function useLedgerTransaction(id: number, row?: LedgerTransaction) {
  const { result, query } = useOne<LedgerTransaction>({
    resource: 'ledger/transactions',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    // The drawer shows its own error state, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { entry: result ?? row, query };
}
