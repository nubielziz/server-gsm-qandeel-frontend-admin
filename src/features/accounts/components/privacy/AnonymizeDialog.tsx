// AnonymizeDialog: "Anonymize <name>?": the warning before an account's personal data is removed for good. Orders and payments stay for
// accounting. The server's refusals (a merchant rank, an open checkout, a pending payment) stay in the dialog, which stays open.
import { ConfirmDialog } from '@/components/ui';
import { useAnonymizeAccount } from '../../hooks/useAccountPrivacy';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';

/**
 * Anonymizes one account of the retail rank after a warning. The orders are read again (their IMEIs are cut and the buyer is replaced) and
 * an open erasure request of the account is marked done. Needs `customers:privacy`.
 *
 * @param props.account the account to anonymize.
 * @param props.onClose asks the host to close the dialog (done, or cancelled).
 * @see POST /admin/clients/:id/anonymize
 */
export function AnonymizeDialog({ account, onClose }: AccountDialogProps) {
  const anonymize = useAnonymizeAccount();
  return (
    <ConfirmDialog
      open
      title={dialogTitle('anonymize', [account])}
      body={
        <>
          <p>
            Name, email, notes and the IMEIs of their orders are removed for good. Orders and payments stay
            for accounting. A guest record with the same proven email is erased too.
          </p>
          <p className="mt-2 font-medium text-ink">This can’t be undone.</p>
        </>
      }
      confirm="Anonymize"
      kind="danger"
      onClose={onClose}
      onConfirm={() => anonymize.mutateAsync(account).then(() => undefined)}
    />
  );
}
