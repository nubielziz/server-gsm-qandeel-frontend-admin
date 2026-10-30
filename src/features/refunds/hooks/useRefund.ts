// One refund or one dispute, read fresh when a dialog opens. The list row shows at once; the single read replaces it with the
// newer answer (another person may have decided the refund meanwhile) and, for a dispute, brings the evidence pack.
import { useOne } from '@refinedev/core';
import type { Dispute, Refund } from '../types';

/** `refund` is the list row until the single read answers; `query` carries loading and error. */
export function useRefund(row: Refund) {
  const { result, query } = useOne<Refund>({
    resource: 'refunds',
    id: row.id,
    queryOptions: { placeholderData: { data: row } },
    // The dialog shows its own state, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { refund: result ?? row, query };
}

/**
 * `dispute` is the list row until the single read answers. The list leaves the evidence pack out, so `dispute.evidence` is
 * undefined until then; `query.isPlaceholderData` says the row is still the list's, and `query.isError` that the read failed.
 */
export function useDispute(row: Dispute) {
  const { result, query } = useOne<Dispute>({
    resource: 'disputes',
    id: row.id,
    queryOptions: { placeholderData: { data: row } },
    errorNotification: false,
  });
  return { dispute: result ?? row, query };
}
