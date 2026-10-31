// SupplierStatusDialog: the confirm step of Pause and Resume on the Suppliers card. It states the effect before the confirm
// button and shows the server's refusal inside the dialog. `PATCH /admin/suppliers/:id` with `status` paused or active.
import { ConfirmDialog } from '@/components/ui';
import { useSetSupplierStatus } from '../../hooks';
import { statusDialogWords, type StatusChange } from './suppliersModel';

export interface SupplierStatusDialogProps {
  /** The supplier and the status the staff member asked for. */
  change: StatusChange;
  /** Called after a success, Cancel and Escape. */
  onClose: () => void;
}

/**
 * The change is kept as it was when the button was clicked, so the words stay right even if a refresh changes the row under
 * the dialog. The hook is told not to toast a refusal: the dialog shows it, so the message is not said twice. Success is a toast.
 * There is no reason field: the body of the call is only the status.
 */
export function SupplierStatusDialog({ change, onClose }: SupplierStatusDialogProps) {
  const setStatus = useSetSupplierStatus({ toastErrors: false });
  const words = statusDialogWords(change);
  return (
    <ConfirmDialog
      open
      title={words.title}
      body={<p>{words.effect}</p>}
      confirm={words.confirm}
      onClose={onClose}
      onConfirm={() => setStatus.mutateAsync(change).then(() => undefined)}
    />
  );
}
