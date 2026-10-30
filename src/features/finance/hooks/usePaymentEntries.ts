// The ledger entries posted for one deposit, for the deposit dialog's "View ledger entries". Ports showJournals('payment', id)
// of 20-ui.js; the entries come from the ledger route, filtered by what they are about.
import { useApiQuery } from '@/lib/query';
import { listLedgerTransactions } from '../api';
import { PAYMENT_ENTRIES_KEY } from './keys';

/** The entries of the deposit, oldest first. Pass `enabled: false` while the staff member lacks `ledger:read`. */
export function usePaymentEntries(paymentId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...PAYMENT_ENTRIES_KEY, paymentId],
    queryFn: ({ signal }) =>
      listLedgerTransactions(
        { filters: { refType: 'payment', refId: paymentId }, sort: ['createdAt'], order: ['asc'] },
        { signal },
      ),
    select: (result) => result.data,
    enabled,
  });
}
