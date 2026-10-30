// One deposit for the review dialog. The list row shows at once; the single read replaces it with the fresher answer and is
// refreshed after a decision. A link (`?payment=1048`) has no row, so the dialog waits for the read.
import { useOne } from '@refinedev/core';
import type { Payment } from '../types';

/** `payment` is the list row first and the single read once it answers; undefined while a deep link loads. */
export function usePayment(id: number, row?: Payment) {
  const { result, query } = useOne<Payment>({
    resource: 'payments',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    // The dialog shows its own error state, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { payment: result ?? row, query };
}
