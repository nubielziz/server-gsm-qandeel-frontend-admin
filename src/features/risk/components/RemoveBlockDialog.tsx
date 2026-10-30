// RemoveBlockDialog: "Remove from the blocklist?" (the demo's `bl-remove`): whatever the entry blocked can order again. A
// refusal from the server shows in the dialog's error slot.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteBlock } from '../hooks/useBlocklistMutations';
import type { BlocklistEntry } from '../types';

export function RemoveBlockDialog({ entry, onClose }: { entry: BlocklistEntry; onClose: () => void }) {
  const remove = useDeleteBlock();
  return (
    <ConfirmDialog
      open
      title="Remove from the blocklist?"
      body={
        <p>
          <span className="mono">{entry.display}</span> will be able to order again.
        </p>
      }
      confirm="Remove"
      onClose={onClose}
      onConfirm={async () => {
        await remove.mutateAsync(entry);
      }}
    />
  );
}
