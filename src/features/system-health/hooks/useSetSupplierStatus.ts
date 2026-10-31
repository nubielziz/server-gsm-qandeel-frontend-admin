// Pause and Resume of a supplier from the Orders & suppliers tab. It is the suppliers feature's own `PATCH
// /admin/suppliers/:id` (decision: one code path for the supplier switch), with this page's toast and reads made stale.
import { updateSupplier } from '@/features/suppliers';
import type { Id } from '@/lib/api';
import { DASHBOARD_KEY, useApiMutation } from '@/lib/query';
import { healthKey } from './keys';
import { errorToast, supplierToast, type MutationToastOptions } from './toasts';

/**
 * Sets a supplier to `paused` (new orders go to the next supplier by priority) or back to `active`
 * (`suppliers:update`). `name` is for the toast. Besides the health reads it refreshes the Refine `suppliers`
 * resource, so the Suppliers page and its detail show the new status, and the dashboard, which lists supplier health.
 */
export function useSetSupplierStatus(options: MutationToastOptions) {
  return useApiMutation({
    mutationFn: ({ id, status }: { id: Id; name: string; status: 'paused' | 'active' }) =>
      updateSupplier(id, { status }),
    invalidates: (_supplier, { id }) => [{ resource: 'suppliers', id }],
    invalidateKeys: [healthKey('suppliers'), healthKey('health'), DASHBOARD_KEY],
    successNotification: (_supplier, { name, status }) => supplierToast(name, status),
    ...errorToast(options),
  });
}
