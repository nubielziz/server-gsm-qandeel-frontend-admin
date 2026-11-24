// UnblockDialog: "Unblock <name>?": the review step before a block is lifted. The account becomes active again; only what the block added
// to the blocklist is removed. The server's refusal stays in the dialog, which stays open.
import { ConfirmDialog } from '@/components/ui';
import { useUnblockAccount } from '../../hooks/useAccountPrivacy';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';

/**
 * Lifts the block of one account after a review step. Needs `clients:block`.
 *
 * @param props.account the blocked account.
 * @param props.onClose asks the host to close the dialog (done, or cancelled).
 * @see POST /admin/clients/:id/block
 */
export function UnblockDialog({ account, onClose }: AccountDialogProps) {
  const unblock = useUnblockAccount();
  return (
    <ConfirmDialog
      open
      title={dialogTitle('unblock', [account])}
      body={<p>Only what this block added to the blocklist is removed.</p>}
      confirm="Unblock"
      onClose={onClose}
      onConfirm={() => unblock.mutateAsync(account).then(() => undefined)}
    />
  );
}
