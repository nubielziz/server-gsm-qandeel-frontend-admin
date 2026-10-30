// One invoice for the drawer. The list row shows at once; a link (`?invoice=7`) or a freshly issued invoice has no row, so
// the single read fills it in.
import { useOne } from '@refinedev/core';
import type { Invoice } from '../types';

/** `invoice` is the list row first and the single read once it answers; undefined while a deep link loads. */
export function useInvoice(id: number, row?: Invoice) {
  const { result, query } = useOne<Invoice>({
    resource: 'invoices',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    // The drawer shows its own error state, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { invoice: result ?? row, query };
}
