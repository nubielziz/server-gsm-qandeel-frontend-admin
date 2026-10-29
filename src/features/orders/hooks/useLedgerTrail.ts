// The ledger entries posted for one order: its money trail. Ports showJournals('order', id) of 20-ui.js; the entries are
// read from the finance feature's ledger route.
import { listLedgerTransactions } from '@/features/finance';
import { useApiQuery } from '@/lib/query';
import { ORDER_LEDGER_KEY } from './keys';

/** The entries of the order, oldest first. Pass `enabled: false` while the staff member lacks `ledger:read`. */
export function useLedgerTrail(orderId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...ORDER_LEDGER_KEY, orderId],
    queryFn: ({ signal }) =>
      listLedgerTransactions(
        { filters: { refType: 'order', refId: orderId }, sort: ['createdAt'], order: ['asc'] },
        { signal },
      ),
    select: (result) => result.data,
    enabled,
  });
}
