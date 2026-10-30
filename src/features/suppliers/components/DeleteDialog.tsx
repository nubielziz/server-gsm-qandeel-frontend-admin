// DeleteDialog: the review step before "Delete supplier…" (`DELETE /admin/suppliers/:id`). The demo cannot delete a supplier.
// The server refuses while orders or services still use it, and its words show in the dialog.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteSupplier } from '../hooks/useSupplierMutations';
import type { Supplier } from '../types';

export interface DeleteDialogProps {
  supplier: Supplier;
  onClose: () => void;
  /** Called once the supplier is gone, so the page can stop pointing at it. */
  onDeleted: (supplier: Supplier) => void;
}

/** Asks before deleting. The server's refusal (the supplier is in use) is shown in the dialog, which then stays open. */
export function DeleteDialog({ supplier, onClose, onDeleted }: DeleteDialogProps) {
  const remove = useDeleteSupplier();
  return (
    <ConfirmDialog
      open
      title={`Delete ${supplier.name}?`}
      confirm="Delete supplier"
      kind="danger"
      onClose={onClose}
      body={
        <>
          <p>
            This removes the connection and its stored API key. It is refused while orders or services still
            use the supplier; disable it instead if it has history.
          </p>
          <p className="mt-2">This cannot be undone.</p>
        </>
      }
      onConfirm={async () => {
        await remove.mutateAsync(supplier);
        onDeleted(supplier);
      }}
    />
  );
}
