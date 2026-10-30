// VoidCodesDialog: "Void N codes?" (`POST /admin/inventory-codes/void`): takes the ticked unsold codes out of stock for good, after a
// review step. The server skips any code that is not unsold and says how many; the dialog shows a refusal.
import { ConfirmDialog } from '@/components/ui';
import { useVoidCodes } from '../hooks/useInventory';
import { codesText } from '../lib/codes';

export interface VoidCodesDialogProps {
  ids: readonly number[];
  onClose: () => void;
  /** Called after the codes were voided, so the page can untick them. */
  onDone: () => void;
}

/** The review step before codes are voided. */
export function VoidCodesDialog({ ids, onClose, onDone }: VoidCodesDialogProps) {
  const voided = useVoidCodes();
  return (
    <ConfirmDialog
      open
      title={`Void ${codesText(ids.length)}?`}
      body={
        <p>
          Voided codes are taken out of stock for good and can never be sold. Codes that are already sold are
          not touched.
        </p>
      }
      confirm="Void codes"
      kind="danger"
      onClose={onClose}
      onConfirm={async () => {
        await voided.mutateAsync([...ids]);
        onDone();
      }}
    />
  );
}
